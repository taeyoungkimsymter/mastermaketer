"""제작 점검: 컷 길이 합계, 촬영 일정 충돌·누락, 근거 없는 '확정' 표시, 리스크 표 열.

  production_check.py cuts     --file storyboard.csv --target 30 [--tolerance 0.5]
      열: cut,duration_sec,(기타 자유)
  production_check.py schedule --file schedule.csv
      열: start,end,activity,type,location,confirm_status,evidence
      type: prep|travel|setup|shoot|teardown|break|permit|booking
      confirm_status: 확정|미확인|요청중   (확정은 evidence 필수 — 허가·예약은 특히)
  production_check.py risk     --file risk.csv
"""
import argparse
import csv
import io
import re
import sys

import common
from common import AgencyError

RISK_COLS = ["위험", "가능성", "영향", "근거", "사전 조치", "대체안", "담당자", "판단 시점", "추가 비용", "확인 상태"]


def _rows(path):
    return list(csv.DictReader(io.StringIO(path.read_text(encoding="utf-8-sig"))))


def _minutes(s):
    m = re.fullmatch(r"(\d{1,2}):(\d{2})", (s or "").strip())
    if not m or int(m.group(1)) > 23 or int(m.group(2)) > 59:
        raise ValueError(s)
    return int(m.group(1)) * 60 + int(m.group(2))


def check_cuts(rows, target, tolerance=0.5):
    errors, total = [], 0.0
    for i, r in enumerate(rows, start=2):
        try:
            d = float(r.get("duration_sec", ""))
            if d <= 0:
                raise ValueError
            total += d
        except ValueError:
            errors.append(f"{i}행: duration_sec 가 비었거나 양수가 아님 ('{r.get('duration_sec')}')")
    diff = round(total - target, 3)
    if not errors and abs(diff) > tolerance:
        errors.append(f"컷 길이 합계 {total:g}초 ≠ 목표 {target:g}초 (차이 {diff:+g}초, 허용 ±{tolerance:g})")
    return {"total_sec": round(total, 3), "target_sec": target, "diff_sec": diff, "errors": errors, "ok": not errors}


def check_schedule(rows):
    errors, warns, spans = [], [], []
    types = {(r.get("type") or "").strip() for r in rows}
    for i, r in enumerate(rows, start=2):
        try:
            s, e = _minutes(r["start"]), _minutes(r["end"])
        except (ValueError, KeyError):
            errors.append(f"{i}행: 시간 형식 오류 (HH:MM) — start='{r.get('start')}' end='{r.get('end')}'")
            continue
        if e <= s:
            errors.append(f"{i}행: 종료가 시작보다 빠르거나 같음 ({r['start']}~{r['end']})")
            continue
        spans.append((s, e, i, r.get("activity", "")))
        status, evid = (r.get("confirm_status") or "").strip(), (r.get("evidence") or "").strip()
        if status == "확정" and not evid:
            kind = "허가·예약" if (r.get("type") or "").strip() in ("permit", "booking") else "항목"
            errors.append(f"{i}행: '{r.get('activity')}' {kind}이(가) 근거(evidence) 없이 '확정'으로 표시됨 → 미확인으로 변경하거나 근거 기입")
        if (r.get("type") or "").strip() in ("permit", "booking") and status not in ("확정", "미확인", "요청중"):
            warns.append(f"{i}행: permit/booking 의 confirm_status 는 확정|미확인|요청중 중 하나여야 함")
    spans.sort()
    for (s1, e1, i1, a1), (s2, e2, i2, a2) in zip(spans, spans[1:]):
        if s2 < e1:
            errors.append(f"일정 충돌: {i1}행 '{a1}' 와 {i2}행 '{a2}' 가 겹침")
    for need, label in (("setup", "세팅"), ("teardown", "철수")):
        if need not in types:
            errors.append(f"{label}({need}) 시간이 일정에 없음")
    locs = {(r.get("location") or "").strip() for r in rows if (r.get("type") or "").strip() == "shoot"}
    if len(locs) > 1 and "travel" not in types:
        errors.append("촬영 장소가 2곳 이상인데 이동(travel) 시간이 없음")
    return {"errors": errors, "warnings": warns, "ok": not errors}


def check_risk(rows):
    if not rows:
        return {"errors": ["리스크 표가 비어 있음"], "warnings": [], "ok": False}
    missing = [c for c in RISK_COLS if c not in rows[0]]
    errors = [f"필수 열 누락: {', '.join(missing)}"] if missing else []
    warns = [f"{i}행: 담당자 미정" for i, r in enumerate(rows, start=2) if not missing and (r["담당자"].strip() in ("", "미정"))]
    return {"errors": errors, "warnings": warns, "ok": not errors}


def main(argv):
    ap = argparse.ArgumentParser()
    ap.add_argument("action", choices=["cuts", "schedule", "risk"])
    ap.add_argument("--client", required=True)
    ap.add_argument("--file", required=True)
    ap.add_argument("--target", type=float)
    ap.add_argument("--tolerance", type=float, default=0.5)
    a = ap.parse_args(argv)
    try:
        common.require_active(a.client)
        base = common.client_dir(a.client).resolve()
        p = (base / a.file).resolve()
        p.relative_to(base)
        rows = _rows(p)
        if a.action == "cuts":
            if a.target is None:
                raise AgencyError("--target(목표 초) 필요")
            res = check_cuts(rows, a.target, a.tolerance)
        elif a.action == "schedule":
            res = check_schedule(rows)
        else:
            res = check_risk(rows)
        common.emit(res)
        return 0 if res["ok"] else 1
    except ValueError:
        print("오류: 파일이 고객사 폴더 밖이거나 형식이 잘못되었습니다.", file=sys.stderr)
        return 1
    except (AgencyError, OSError) as e:
        print(f"오류: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
