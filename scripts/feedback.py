"""피드백 후보 → 승인 → 활성 규칙. ("학습" = 승인된 규칙의 저장과 재참조)

데이터: clients/{id}/feedback-log.json (원본), feedback-log.md (사람용 보기, 자동 생성)
상태: 후보 -> 승인 | 폐기,  승인 -> 대체됨
활성 규칙 = 승인 + 유효기간 내 + 적용 범위 일치. 후보/폐기/대체됨/만료는 절대 활성 아님.

  feedback.py add --client A --text "..." --source "회의 10/20" --scope project --scope-ref spring-video --kind 선호 [--topic humor]
  feedback.py approve --client A --id FB-001 --by 김팀장 [--expires 2026-12-31] [--supersede FB-000]
  feedback.py reject  --client A --id FB-001
  feedback.py active  --client A [--project P] [--channel C] [--deliverable F]
  feedback.py list    --client A [--status 후보]
"""
import argparse
import json
import sys
from datetime import date

import common
from common import AgencyError

SCOPES = ("client", "project", "channel", "deliverable")
KINDS = ("금지사항", "선호", "일회성 수정", "사실 정정")
STATUSES = ("후보", "승인", "폐기", "대체됨")


def _paths(client):
    common.require_active(client)
    d = common.client_dir(client)
    return d / "feedback-log.json", d / "feedback-log.md"


def load(client):
    jf, _ = _paths(client)
    if not jf.exists():
        return {"items": []}
    return json.loads(jf.read_text(encoding="utf-8"))


def _save(client, data):
    jf, mf = _paths(client)
    jf.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    lines = ["# 피드백 로그 (자동 생성 — feedback.py 로만 수정)", "",
             "| ID | 상태 | 범위 | 종류 | 내용 | 출처/일자 | 승인자 | 유효기간 | 관계 |", "|---|---|---|---|---|---|---|---|---|"]
    for i in data["items"]:
        rel = []
        if i.get("supersedes"):
            rel.append("대체: " + ",".join(i["supersedes"]))
        if i.get("replaced_by"):
            rel.append("대체됨 by " + i["replaced_by"])
        scope = i["scope"] + (f":{i['scope_ref']}" if i.get("scope_ref") else "")
        lines.append(f"| {i['id']} | {i['status']} | {scope} | {i['kind']} | {i['text'].replace('|', '/')} | "
                     f"{i['source']} {i['date']} | {i.get('approved_by') or '-'} | {i.get('expires') or '-'} | {'; '.join(rel) or '-'} |")
    mf.write_text("\n".join(lines) + "\n", encoding="utf-8")


def _find(data, fid):
    for i in data["items"]:
        if i["id"] == fid:
            return i
    raise AgencyError(f"피드백 {fid} 를 찾을 수 없습니다.")


def add(client, text, source, scope, scope_ref=None, kind="선호", topic=None, on=None):
    if not text.strip():
        raise AgencyError("피드백 원문이 비어 있습니다.")
    if scope not in SCOPES:
        raise AgencyError(f"적용 범위는 {SCOPES} 중 하나여야 합니다.")
    if kind not in KINDS:
        raise AgencyError(f"종류는 {KINDS} 중 하나여야 합니다.")
    if scope == "client" and scope_ref:
        raise AgencyError("client 범위에는 scope_ref 를 쓰지 않습니다.")
    if scope != "client" and not scope_ref:
        raise AgencyError(f"{scope} 범위에는 scope_ref(프로젝트ID/채널/산출물 파일명)가 필요합니다.")
    if kind == "일회성 수정" and scope in ("client", "channel"):
        raise AgencyError("일회성 수정은 고객사 전체·채널 규칙이 될 수 없습니다. project 또는 deliverable 범위로 기록하세요.")
    data = load(client)
    fid = f"FB-{len(data['items']) + 1:03d}"
    data["items"].append({"id": fid, "text": text.strip(), "source": source, "date": on or common.today_kst().isoformat(),
                          "scope": scope, "scope_ref": scope_ref, "kind": kind, "topic": topic, "status": "후보",
                          "expires": None, "approved_by": None, "supersedes": [], "replaced_by": None})
    _save(client, data)
    return fid


def _overlaps(a, b):
    """두 규칙의 적용 범위가 겹치는가(한쪽이 client 전체이거나 동일 범위)."""
    if a["scope"] == "client" or b["scope"] == "client":
        return True
    return a["scope"] == b["scope"] and a["scope_ref"] == b["scope_ref"]


def _is_live(i, today):
    if i["status"] != "승인":
        return False
    exp = i.get("expires")
    return not exp or date.fromisoformat(exp) >= today


def approve(client, fid, by, expires=None, supersede=(), today=None):
    today = today or common.today_kst()
    if not by or not by.strip():
        raise AgencyError("승인자(--by)가 필요합니다. AI는 피드백을 스스로 승인할 수 없습니다.")
    if expires:
        date.fromisoformat(expires)
    data = load(client)
    item = _find(data, fid)
    if item["status"] != "후보":
        raise AgencyError(f"{fid} 는 '{item['status']}' 상태라 승인할 수 없습니다(후보만 승인 가능).")
    conflicts = [i for i in data["items"] if i is not item and item.get("topic") and i.get("topic") == item["topic"]
                 and _is_live(i, today) and _overlaps(i, item)]
    unresolved = [c["id"] for c in conflicts if c["id"] not in supersede]
    if unresolved:
        raise AgencyError("기존 활성 규칙과 충돌합니다: " + ", ".join(unresolved) +
                          " → 사용자가 '대체(--supersede)' 또는 '병존(범위 조정)'을 결정해야 합니다. 임의로 덮어쓰지 않았습니다.")
    for c in conflicts:
        c["status"], c["replaced_by"] = "대체됨", fid
    item.update(status="승인", approved_by=by.strip(), expires=expires, supersedes=list(supersede))
    _save(client, data)
    return item


def reject(client, fid):
    data = load(client)
    item = _find(data, fid)
    if item["status"] != "후보":
        raise AgencyError("후보만 폐기할 수 있습니다.")
    item["status"] = "폐기"
    _save(client, data)
    return item


def active(client, project=None, channel=None, deliverable=None, today=None):
    today = today or common.today_kst()
    out = []
    for i in load(client)["items"]:
        if not _is_live(i, today):
            continue
        s, ref = i["scope"], i["scope_ref"]
        if s == "client" or (s == "project" and ref == project) or (s == "channel" and ref == channel) \
                or (s == "deliverable" and ref == deliverable):
            out.append(i)
    return out


def main(argv):
    ap = argparse.ArgumentParser()
    ap.add_argument("action", choices=["add", "approve", "reject", "active", "list"])
    ap.add_argument("--client", required=True)
    ap.add_argument("--text")
    ap.add_argument("--source", default="미상")
    ap.add_argument("--scope")
    ap.add_argument("--scope-ref")
    ap.add_argument("--kind", default="선호")
    ap.add_argument("--topic")
    ap.add_argument("--id")
    ap.add_argument("--by")
    ap.add_argument("--expires")
    ap.add_argument("--supersede", action="append", default=[])
    ap.add_argument("--project")
    ap.add_argument("--channel")
    ap.add_argument("--deliverable")
    ap.add_argument("--status")
    a = ap.parse_args(argv)
    try:
        if a.action == "add":
            out = {"id": add(a.client, a.text or "", a.source, a.scope or "", a.scope_ref, a.kind, a.topic), "status": "후보"}
        elif a.action == "approve":
            out = approve(a.client, a.id, a.by, a.expires, a.supersede)
        elif a.action == "reject":
            out = reject(a.client, a.id)
        elif a.action == "active":
            out = active(a.client, a.project, a.channel, a.deliverable)
        else:
            out = [i for i in load(a.client)["items"] if not a.status or i["status"] == a.status]
        common.emit(out)
    except AgencyError as e:
        print(f"오류: {e}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
