"""프로젝트 status.json 관리. 갱신 책임자: 디렉터(메인 세션)만. 서브에이전트는 호출하지 않는다.

필드: client_id, project_id, name, stage, selected_concept, deliverables{파일: {state, by, at}}, updated_at, updated_by
stage 순서: brief -> concepts -> selected -> script -> storyboard -> shoot_plan
상세 제작 단계(script 이후)는 selected_concept 없이는 진입할 수 없다.
산출물 state: draft -> review_passed | needs_revision -> approved(사용자) -> archived
"""
import argparse
import json
import sys

import common
from common import AgencyError

STAGES = ["brief", "concepts", "selected", "script", "storyboard", "shoot_plan"]
DETAIL_STAGES = {"script", "storyboard", "shoot_plan"}
TRANSITIONS = {
    "draft": {"review_passed", "needs_revision"},
    "needs_revision": {"draft", "review_passed"},
    "review_passed": {"approved", "needs_revision"},
    "approved": {"archived"},
    "archived": set(),
}


def _file(client, project):
    common.require_active(client)
    return common.project_dir(client, project) / "status.json"


def load(client, project):
    f = _file(client, project)
    if not f.exists():
        raise AgencyError("status.json 이 없습니다. scaffold.py project 로 프로젝트를 먼저 만드세요.")
    return json.loads(f.read_text(encoding="utf-8"))


def save(client, project, st, by="director"):
    st["updated_at"] = common.now_kst().isoformat()
    st["updated_by"] = by
    _file(client, project).write_text(json.dumps(st, ensure_ascii=False, indent=2), encoding="utf-8")


def select_concept(client, project, concept_id, by, delegated=False):
    st = load(client, project)
    if STAGES.index(st["stage"]) > STAGES.index("selected"):
        raise AgencyError("이미 상세 제작 단계입니다. 컨셉 변경은 새 버전 브리프로 처리하세요.")
    if not by.strip():
        raise AgencyError("선택자(--by)가 필요합니다. 위임이면 'delegated' 와 추천안을 명시하세요.")
    st["selected_concept"] = {"id": concept_id, "by": by, "delegated": bool(delegated), "at": common.now_kst().isoformat()}
    st["stage"] = "selected"
    save(client, project, st)
    return st


def set_stage(client, project, stage):
    if stage not in STAGES:
        raise AgencyError(f"알 수 없는 단계 '{stage}'. 가능: {', '.join(STAGES)}")
    st = load(client, project)
    if stage in DETAIL_STAGES and not st.get("selected_concept"):
        raise AgencyError("컨셉이 선택되지 않았습니다. 컨셉 3안 제시 → 사용자 선택(또는 위임) 후 상세 제작으로 진행하세요.")
    if STAGES.index(stage) < STAGES.index(st["stage"]):
        raise AgencyError(f"단계를 되돌릴 수 없습니다({st['stage']} -> {stage}). 재작업은 새 버전으로 만드세요.")
    st["stage"] = stage
    save(client, project, st)
    return st


def require(client, project, min_stage):
    st = load(client, project)
    if min_stage in DETAIL_STAGES and not st.get("selected_concept"):
        raise AgencyError("STOP: 컨셉 선택 전에는 구성·스크립트·콘티·촬영 계획을 만들 수 없습니다.")
    return st


def set_deliverable(client, project, filename, state, by=None, note=None):
    if state not in TRANSITIONS:
        raise AgencyError(f"알 수 없는 상태 '{state}'.")
    st = load(client, project)
    cur = st["deliverables"].get(filename, {}).get("state")
    if cur is None:
        if state != "draft":
            raise AgencyError("새 산출물은 draft 로 먼저 등록해야 합니다.")
    elif state not in TRANSITIONS[cur]:
        raise AgencyError(f"'{cur}' -> '{state}' 전환은 허용되지 않습니다.")
    if state == "approved" and not (by and by.strip()):
        raise AgencyError("approved 는 사용자(승인 담당자) 이름이 필요합니다. AI 검수 통과는 승인이 아닙니다.")
    st["deliverables"][filename] = {"state": state, "by": by or "ai-review", "at": common.now_kst().isoformat()}
    if note:
        st["deliverables"][filename]["note"] = note
    save(client, project, st)
    return st


def main(argv):
    ap = argparse.ArgumentParser()
    ap.add_argument("action", choices=["show", "select-concept", "set-stage", "require", "deliverable"])
    ap.add_argument("--client", required=True)
    ap.add_argument("--project", required=True)
    ap.add_argument("--id")
    ap.add_argument("--by")
    ap.add_argument("--delegated", action="store_true")
    ap.add_argument("--stage")
    ap.add_argument("--file")
    ap.add_argument("--state")
    a = ap.parse_args(argv)
    try:
        if a.action == "show":
            out = load(a.client, a.project)
        elif a.action == "select-concept":
            out = select_concept(a.client, a.project, a.id, a.by or "", a.delegated)
        elif a.action == "set-stage":
            out = set_stage(a.client, a.project, a.stage)
        elif a.action == "require":
            out = require(a.client, a.project, a.stage)
        else:
            out = set_deliverable(a.client, a.project, a.file, a.state, a.by)
        common.emit(out)
    except AgencyError as e:
        print(f"오류: {e}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
