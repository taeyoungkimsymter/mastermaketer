"""카피 후보 기계 검수: 글자 수(확인된 규격만 판정), 금지 표현, 필수 문구, 위험 표현, 타 고객사 혼입.

입력 CSV 열: option,field,text   (예: A안,headline,"하루를 깨우는 한 잔")
규격: agency/knowledge/channel-specs.json
  status == "verified"   -> 초과 시 FAIL
  status == "unverified" -> 참고값으로만 표시(판정하지 않음). 최신 기준이라고 단정하지 않는다.

이 검수는 법적 승인·심의 통과가 아니다. 위험 표현은 '검토 필요' 표시만 한다.
"""
import argparse
import csv
import io
import json
import re
import sys
import unicodedata

import common
from common import AgencyError

RISK_PATTERNS = [
    (r"최고|최상|최초|유일|1위|넘버\s?원|국내\s?최|세계\s?최", "근거 없는 최상급·순위 표현 가능성"),
    (r"100\s?%|완벽|무조건|반드시 효과|보장", "단정·보장 표현 가능성"),
    (r"완치|치료|질병|부작용\s?없|효과\s?입증|임상", "효능·의학적 주장 가능성(업종별 규정 검토 필요)"),
    (r"\bAD\b|광고|협찬|제공받", None),  # 광고 표기 여부 확인용(아래에서 별도 처리)
]


def width(text, mode):
    if mode == "cjk2":  # 한글·한자·전각 2, 그 외 1
        return sum(2 if unicodedata.east_asian_width(c) in ("W", "F") else 1 for c in text)
    return len(unicodedata.normalize("NFC", text))


def load_spec(channel, ad_format=None):
    f = common.root() / "agency" / "knowledge" / "channel-specs.json"
    specs = json.loads(f.read_text(encoding="utf-8"))["specs"]
    cand = [s for s in specs if s["channel"] == channel and (ad_format is None or s["ad_format"] == ad_format)]
    return cand[0] if cand else None


def check(client, rows, channel, ad_format=None, extra_ban=(), spec=None):
    brand = common.read_brand(client)
    bans = common.section_bullets(brand, "금지 표현") + list(extra_ban)
    musts = common.section_bullets(brand, "필수 문구")
    spec = spec or load_spec(channel, ad_format)
    out = {"channel": channel, "ad_format": (spec or {}).get("ad_format", ad_format), "spec": None, "items": [], "summary": {}}
    if spec:
        out["spec"] = {"status": spec["status"], "source": spec.get("source"), "checked_at": spec.get("checked_at"),
                       "count": spec.get("count", "len")}
    else:
        out["spec_note"] = f"채널 '{channel}' 규격이 channel-specs.json 에 없음 → 글자 수 판정 불가(규격 확인 필요)"
    fails = warns = 0
    by_option = {}
    for r in rows:
        opt, field, text = r["option"], r["field"], r["text"]
        by_option.setdefault(opt, []).append(text)
        item = {"option": opt, "field": field, "issues": []}
        if spec and field in spec["fields"]:
            lim = spec["fields"][field]
            n = width(text, spec.get("count", "len"))
            item["length"], item["limit"] = n, lim["max"]
            if n > lim["max"]:
                if spec["status"] == "verified":
                    item["issues"].append({"level": "FAIL", "msg": f"글자 수 초과 {n}/{lim['max']}"}); fails += 1
                else:
                    item["issues"].append({"level": "INFO", "msg": f"참고 규격(미검증) {lim['max']} 대비 {n} — 공식 규격 확인 전 판정 보류"}); warns += 1
        elif spec:
            item["issues"].append({"level": "INFO", "msg": f"규격에 없는 필드 '{field}' → 길이 판정 안 함"})
        for b in bans:
            if b in text:
                item["issues"].append({"level": "FAIL", "msg": f"금지 표현 포함: '{b}'"}); fails += 1
        for pat, why in RISK_PATTERNS:
            if why and re.search(pat, text):
                item["issues"].append({"level": "REVIEW", "msg": why + " (검토 필요, 법적 판단 아님)"}); warns += 1
        leaks = common.find_leaks(text, client)
        if leaks:
            item["issues"].append({"level": "FAIL", "msg": f"다른 고객사 정보 혼입 의심 {len(leaks)}건: " + ", ".join(l["marker"] for l in leaks)}); fails += 1
        out["items"].append(item)
    for opt, texts in by_option.items():
        joined = " ".join(texts)
        for mph in musts:
            if mph not in joined:
                out["items"].append({"option": opt, "field": "*", "issues": [{"level": "REVIEW", "msg": f"필수 문구 누락 가능: '{mph}' (채널·형식상 불필요하면 무시)"}]}); warns += 1
    out["summary"] = {"fail": fails, "review_or_info": warns, "passed_mechanical": fails == 0,
                      "note": "기계 검수 결과이며 사용자 승인·법적 적합성 확정이 아닙니다."}
    return out


def read_rows(path):
    text = path.read_text(encoding="utf-8-sig")
    rows = list(csv.DictReader(io.StringIO(text)))
    if not rows or not {"option", "field", "text"} <= set(rows[0]):
        raise AgencyError("CSV 열은 option,field,text 여야 합니다.")
    return rows


def main(argv):
    ap = argparse.ArgumentParser()
    ap.add_argument("--client", required=True)
    ap.add_argument("--channel", required=True)
    ap.add_argument("--ad-format")
    ap.add_argument("--file", required=True, help="고객사 폴더 기준 상대경로")
    ap.add_argument("--ban", action="append", default=[])
    a = ap.parse_args(argv)
    try:
        common.require_active(a.client)
        base = common.client_dir(a.client).resolve()
        p = (base / a.file).resolve()
        p.relative_to(base)
        res = check(a.client, read_rows(p), a.channel, a.ad_format, a.ban)
        common.emit(res)
        return 0 if res["summary"]["passed_mechanical"] else 1
    except ValueError:
        print("오류: 입력 파일이 고객사 폴더 밖입니다.", file=sys.stderr)
        return 1
    except AgencyError as e:
        print(f"오류: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
