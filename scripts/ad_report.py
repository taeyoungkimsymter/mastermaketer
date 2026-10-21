"""광고 성과 데이터 검증 + 지표 계산 (재현 가능한 계산, Decimal 사용).

입력 열(영문 또는 한글 별칭): date(날짜) channel(채널) campaign(캠페인) impressions(노출)
  clicks(클릭) cost(광고비) conversions(전환) [revenue(매출)]

원칙
- 전체 비율은 원시 분자·분모의 합으로 계산한다(행별 비율 평균 금지).
- 분모 0 -> None(N/A) + 사유. 전기간 0 -> 증감률 N/A.
- 비율(CTR/CVR/ROAS)의 변화는 %p, 금액·수량·단가(CPC/CPM/CPA)의 변화는 %.
- 제외된 행, 경고, 비교 제한 사유를 결과에 모두 남긴다.
- CVR 분모는 클릭(세션 데이터가 없으므로)이라고 명시한다.

  python scripts/ad_report.py --client A --project general --file data/raw/ads.csv \
      --start 2026-09-01 --end 2026-09-30 --prev-start 2026-08-01 --prev-end 2026-08-31 \
      --tax unknown --finalized yes
"""
import argparse
import csv
import io
import re
import sys
import zipfile
from datetime import date, datetime, timedelta
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from xml.etree import ElementTree as ET

import common
from common import AgencyError

ALIASES = {"날짜": "date", "일자": "date", "채널": "channel", "매체": "channel", "캠페인": "campaign",
           "노출": "impressions", "노출수": "impressions", "클릭": "clicks", "클릭수": "clicks",
           "광고비": "cost", "비용": "cost", "전환": "conversions", "전환수": "conversions", "매출": "revenue"}
REQUIRED = ["date", "channel", "campaign", "impressions", "clicks", "cost", "conversions"]
NUMERIC = ["impressions", "clicks", "cost", "conversions", "revenue"]
RATE_METRICS = {"ctr", "cvr", "roas"}  # 변화는 %p
D0 = Decimal(0)


# ---------- 입력 읽기 ----------

def _read_xlsx(data: bytes):
    z = zipfile.ZipFile(io.BytesIO(data))
    ns = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
    shared = []
    if "xl/sharedStrings.xml" in z.namelist():
        for si in ET.fromstring(z.read("xl/sharedStrings.xml")).findall("m:si", ns):
            shared.append("".join(t.text or "" for t in si.iter("{%s}t" % ns["m"])))
    sheets = sorted(n for n in z.namelist() if re.match(r"xl/worksheets/sheet\d+\.xml$", n))
    if not sheets:
        raise AgencyError("엑셀에서 시트를 찾을 수 없습니다.")
    rows = []
    for r in ET.fromstring(z.read(sheets[0])).iter("{%s}row" % ns["m"]):
        cells = {}
        for c in r.findall("m:c", ns):
            col = re.match(r"[A-Z]+", c.get("r")).group(0)
            idx = 0
            for ch in col:
                idx = idx * 26 + ord(ch) - 64
            t, v = c.get("t"), c.find("m:v", ns)
            if t == "inlineStr":
                val = "".join(x.text or "" for x in c.iter("{%s}t" % ns["m"]))
            elif v is None:
                val = ""
            elif t == "s":
                val = shared[int(v.text)]
            else:
                val = v.text
            cells[idx - 1] = val
        if cells:
            rows.append([cells.get(i, "") for i in range(max(cells) + 1)])
    return rows


def read_table(path):
    data = path.read_bytes()
    if path.suffix.lower() in (".xlsx", ".xlsm"):
        grid = _read_xlsx(data)
    else:
        for enc in ("utf-8-sig", "cp949"):
            try:
                text = data.decode(enc)
                break
            except UnicodeDecodeError:
                text = None
        if text is None:
            raise AgencyError("CSV 인코딩을 읽을 수 없습니다(UTF-8 또는 CP949 필요).")
        grid = list(csv.reader(io.StringIO(text)))
    if not grid:
        raise AgencyError("빈 파일입니다.")
    header = [ALIASES.get(h.strip(), h.strip().lower()) for h in grid[0]]
    missing = [c for c in REQUIRED if c not in header]
    if missing:
        raise AgencyError("필수 열이 없습니다: " + ", ".join(missing) + f" (현재 열: {', '.join(header)})")
    return [dict(zip(header, [str(x).strip() for x in r] + [""] * (len(header) - len(r)))) for r in grid[1:] if any(str(x).strip() for x in r)]


def _num(s):
    s = re.sub(r"[,\s₩원$]", "", s or "")
    if s == "":
        return None
    try:
        return Decimal(s)
    except InvalidOperation:
        raise ValueError(s)


def _date(s):
    s = (s or "").strip()
    if re.fullmatch(r"\d{5}(\.0+)?", s) and 20000 < float(s) < 80000:  # 엑셀 일련번호
        return date(1899, 12, 30) + timedelta(days=int(float(s)))
    for fmt in ("%Y-%m-%d", "%Y/%m/%d", "%Y.%m.%d", "%Y%m%d"):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            pass
    raise ValueError(s)


# ---------- 정제 ----------

def clean(raw_rows, dups="exclude"):
    good, issues, seen = [], [], {}
    has_rev = any("revenue" in r for r in raw_rows)
    for n, r in enumerate(raw_rows, start=2):  # 헤더가 1행
        def bad(kind, detail):
            issues.append({"row": n, "type": kind, "detail": detail})
        try:
            d = _date(r["date"])
        except ValueError:
            bad("invalid_date", f"날짜 해석 불가: '{r['date']}'")
            continue
        vals, ok = {}, True
        for k in NUMERIC:
            if k not in r and k == "revenue":
                continue
            try:
                vals[k] = _num(r.get(k))
            except ValueError:
                bad("invalid_number", f"{k} 숫자 아님: '{r.get(k)}'")
                ok = False
        if not ok:
            continue
        miss = [k for k in REQUIRED[3:] if vals.get(k) is None]
        if miss:
            bad("missing_value", "결측: " + ", ".join(miss) + " → 행 제외")
            continue
        if any(v is not None and v < 0 for v in vals.values()):
            bad("negative_value", "음수 값 → 행 제외")
            continue
        if vals["clicks"] > vals["impressions"]:
            bad("clicks_gt_impressions", "클릭 > 노출 이상값 → 행 제외")
            continue
        row = {"date": d, "channel": r["channel"], "campaign": r["campaign"], **vals}
        if not has_rev:
            row["revenue"] = None
        sig = (d, r["channel"], r["campaign"], tuple(vals.get(k) for k in NUMERIC))
        key = (d, r["channel"], r["campaign"])
        if sig in seen:
            if dups == "exclude":
                bad("duplicate_row", f"{seen[sig]}행과 완전히 동일한 중복 행 → 제외")
                continue
            bad("duplicate_row", f"{seen[sig]}행과 완전히 동일한 중복 행 → 포함(--dups keep)")
        else:
            seen[sig] = n
            if key in seen:
                bad("duplicate_key", f"같은 날짜·채널·캠페인이 값이 다르게 반복됨({seen[key]}행) → 포함, 확인 필요")
            seen[key] = n
        good.append(row)
    return good, issues, has_rev


# ---------- 지표 ----------

def aggregate(rows, has_rev):
    t = {k: sum((r[k] for r in rows), D0) for k in ("impressions", "clicks", "cost", "conversions")}
    if has_rev and rows:
        revs = [r["revenue"] for r in rows]
        t["revenue"] = None if any(v is None for v in revs) else sum(revs, D0)
    else:
        t["revenue"] = None
    t["rows"], t["days"] = len(rows), len({r["date"] for r in rows})
    return t


def metrics(t, has_rev=True):
    na = {}

    def div(name, num, den, mult, why):
        if num is None:
            na[name] = "매출 데이터 없음/결측"
            return None
        if den == 0:
            na[name] = why
            return None
        return num / den * mult

    m = {
        "ctr": div("ctr", t["clicks"], t["impressions"], 100, "노출 0"),
        "cpc": div("cpc", t["cost"], t["clicks"], 1, "클릭 0"),
        "cpm": div("cpm", t["cost"], t["impressions"], 1000, "노출 0"),
        "cpa": div("cpa", t["cost"], t["conversions"], 1, "전환 0"),
        "cvr": div("cvr", t["conversions"], t["clicks"], 100, "클릭 0"),
        "roas": div("roas", t["revenue"], t["cost"], 100, "광고비 0"),
    }
    return m, na


def delta(name, cur, prev):
    """('pct'|'pp', 값 or None, 사유)."""
    kind = "pp" if name in RATE_METRICS else "pct"
    if cur is None or prev is None:
        return kind, None, "산출 불가 값 포함"
    if kind == "pp":
        return kind, cur - prev, None
    if prev == 0:
        return kind, None, "전기간 0 → 증감률 정의 불가"
    return kind, (cur - prev) / prev * 100, None


def q(v, places=2):
    if v is None:
        return None
    return str(Decimal(v).quantize(Decimal(1).scaleb(-places), rounding=ROUND_HALF_UP))


def block(rows, has_rev):
    t = aggregate(rows, has_rev)
    m, na = metrics(t, has_rev)
    return t, m, na


def period_rows(rows, start, end):
    return [r for r in rows if start <= r["date"] <= end]


def build(rows, has_rev, issues, a):
    start, end = date.fromisoformat(a.start), date.fromisoformat(a.end)
    if end < start:
        raise AgencyError("기간 종료일이 시작일보다 빠릅니다.")
    as_of = date.fromisoformat(a.as_of) if a.as_of else common.today_kst()
    warns, limits = [], []
    cur_rows = period_rows(rows, start, end)
    t, m, na = block(cur_rows, has_rev)
    days = (end - start).days + 1
    res = {"period": {"start": a.start, "end": end.isoformat(), "days": days},
           "meta": {"currency": a.currency, "tax": a.tax, "tz": a.tz, "attribution": a.attribution,
                    "conversion_def": a.conversion_def, "finalized": a.finalized, "as_of": as_of.isoformat(),
                    "cvr_denominator": "클릭"},
           "excluded_or_flagged_rows": issues}
    if not cur_rows:
        limits.append("분석 기간에 유효한 데이터가 없습니다 → 분석 제한 보고서만 작성 가능")
    else:
        last = max(r["date"] for r in cur_rows)
        missing_days = days - t["days"]
        if missing_days > 0:
            warns.append(f"기간 내 데이터가 없는 날짜 {missing_days}일 (마지막 데이터 일자 {last})")
        res["period"]["data_days"] = t["days"]
    in_progress = end >= as_of or a.finalized == "no"
    res["in_progress"] = in_progress
    if end >= as_of:
        warns.append(f"분석 종료일({end})이 기준일({as_of}) 이후/당일 → 진행 중 기간, 마감 후 수치가 달라질 수 있음")
    if a.finalized != "yes":
        warns.append(f"데이터 확정 여부: {a.finalized} → 사후 보정 가능성")
    if a.tax == "unknown":
        warns.append("광고비 VAT 포함 여부 미확인 → 광고비 기반 지표(CPC/CPM/CPA/ROAS)의 절대 수준 해석 주의")
    if a.attribution == "unknown":
        warns.append("어트리뷰션 기준 미확인")
    if a.conversion_def == "unknown":
        warns.append("전환 정의 미확인 → CPA/CVR 해석 주의")
    if a.tz != "Asia/Seoul":
        warns.append(f"원본 데이터 시간대 {a.tz} ≠ Asia/Seoul → 일 경계가 어긋날 수 있음")
    chans = sorted({r["channel"] for r in cur_rows})
    if len(chans) > 1:
        warns.append("채널 간 전환·매출 중복 가능성: 각 매체가 자체 기준으로 집계한 전환/매출을 합산하면 실제보다 클 수 있음")
    if not has_rev:
        warns.append("매출 열 없음 → ROAS 산출 불가")
    elif t["revenue"] is None and cur_rows:
        warns.append("매출 결측이 있어 ROAS 산출 불가")
    res["current"] = {"totals": {k: (q(v, 2) if isinstance(v, Decimal) else v) for k, v in t.items()},
                      "metrics": {k: q(v) for k, v in m.items()}, "na_reasons": na}
    res["by_channel"] = {}
    for ch in chans:
        ct, cm, cna = block([r for r in cur_rows if r["channel"] == ch], has_rev)
        res["by_channel"][ch] = {"totals": {k: (q(v) if isinstance(v, Decimal) else v) for k, v in ct.items()},
                                 "metrics": {k: q(v) for k, v in cm.items()}, "na_reasons": cna}
    # 비교
    if a.prev_start and a.prev_end:
        ps, pe = date.fromisoformat(a.prev_start), date.fromisoformat(a.prev_end)
        prows = period_rows(rows, ps, pe)
        pdays = (pe - ps).days + 1
        if not prows:
            limits.append(f"비교 기간({ps}~{pe}) 데이터 없음 → 증감 비교 불가")
            res["comparison"] = None
        else:
            pt, pm, pna = block(prows, has_rev)
            comp = {"prev_period": {"start": a.prev_start, "end": a.prev_end, "days": pdays, "data_days": pt["days"]},
                    "prev_totals": {k: (q(v) if isinstance(v, Decimal) else v) for k, v in pt.items()},
                    "prev_metrics": {k: q(v) for k, v in pm.items()}, "prev_na_reasons": pna, "deltas": {}}
            if pdays != days:
                limits.append(f"기간 길이 불일치({days}일 vs {pdays}일): 총량(광고비·전환 등) 증감은 비교 근거로 쓰지 말고 일평균·비율 지표만 참고")
            if pt["days"] < pdays:
                warns.append(f"비교 기간 데이터 일수 부족({pt['days']}/{pdays}일)")
            if in_progress:
                limits.append("분석 기간이 진행 중/미확정이므로 '하락·상승' 단정 금지 (동일 경과일수 기준 재비교 필요)")
            pairs = {k: (Decimal(t[k]) if k in t and t[k] is not None else None, pt.get(k)) for k in ("impressions", "clicks", "cost", "conversions", "revenue")}
            for k, (c, p) in pairs.items():
                kind, v, why = delta(k, c, Decimal(p) if p is not None else None)
                comp["deltas"][k] = {"unit": "%" if kind == "pct" else "%p", "value": q(v), "note": why}
            for k in m:
                kind, v, why = delta(k, m[k], pm[k])
                comp["deltas"][k] = {"unit": "%p" if kind == "pp" else "%", "value": q(v), "note": why}
            cur_d, prev_d = max(t["days"], 1), max(pt["days"], 1)
            comp["daily_avg"] = {"cur_cost": q(t["cost"] / cur_d), "prev_cost": q(pt["cost"] / prev_d),
                                 "cur_conversions": q(t["conversions"] / cur_d), "prev_conversions": q(pt["conversions"] / prev_d)}
            for name, c_v, p_v in (("cost_pct", t["cost"] / cur_d, pt["cost"] / prev_d),
                                   ("conversions_pct", t["conversions"] / cur_d, pt["conversions"] / prev_d)):
                _, v, why = delta("x", c_v, p_v)
                comp["daily_avg"][name] = {"unit": "%", "value": q(v), "note": why}
            # 채널별 비교 (기간 길이가 다르면 비율·단가 지표 위주로 해석)
            for ch in chans:
                if ch not in res["by_channel"]:
                    continue
                prow = [r for r in prows if r["channel"] == ch]
                if not prow:
                    res["by_channel"][ch]["comparison_note"] = "비교 기간에 이 채널 데이터 없음"
                    continue
                _, cm2, _ = block([r for r in cur_rows if r["channel"] == ch], has_rev)
                _, pm2, _ = block(prow, has_rev)
                res["by_channel"][ch]["prev_metrics"] = {k: q(v) for k, v in pm2.items()}
                res["by_channel"][ch]["deltas"] = {}
                for k in cm2:
                    kind, v, why = delta(k, cm2[k], pm2[k])
                    res["by_channel"][ch]["deltas"][k] = {"unit": "%p" if kind == "pp" else "%", "value": q(v), "note": why}
            gone = sorted({r["channel"] for r in prows} - set(chans))
            if gone:
                warns.append("비교 기간에만 있고 분석 기간에는 없는 채널: " + ", ".join(gone))
            res["comparison"] = comp
    else:
        res["comparison"] = None
        limits.append("비교 기간 미지정 → 단일 기간 보고")
    res["warnings"], res["limitations"] = warns, limits
    return res


def render_md(res):
    c = res["current"]
    L = [f"# 성과 계산 결과 ({res['period']['start']} ~ {res['period']['end']}, {res['period']['days']}일)", "",
         "> 스크립트 계산 결과입니다. 해석·원인 가설은 별도 구분하여 작성하세요. CVR 분모 = 클릭.", "",
         "## 합계", "| 항목 | 값 |", "|---|---|"]
    for k, v in c["totals"].items():
        L.append(f"| {k} | {v} |")
    L += ["", "## 지표", "| 지표 | 값 | 비고 |", "|---|---|---|"]
    for k, v in c["metrics"].items():
        L.append(f"| {k.upper()} | {v if v is not None else 'N/A'} | {c['na_reasons'].get(k, '')} |")
    if res["comparison"]:
        cp = res["comparison"]
        L += ["", f"## 전기간 비교 ({cp['prev_period']['start']} ~ {cp['prev_period']['end']}, {cp['prev_period']['days']}일)",
              "| 항목 | 증감 | 단위 | 비고 |", "|---|---|---|---|"]
        for k, d in cp["deltas"].items():
            L.append(f"| {k} | {d['value'] if d['value'] is not None else 'N/A'} | {d['unit']} | {d['note'] or ''} |")
    if res["by_channel"]:
        L += ["", "## 채널별", "| 채널 | 광고비 | 클릭 | 전환 | CTR | CPC | CPA | ROAS |", "|---|---|---|---|---|---|---|---|"]
        for ch, d in res["by_channel"].items():
            mm, tt = d["metrics"], d["totals"]
            f = lambda x: x if x is not None else "N/A"  # noqa: E731
            L.append(f"| {ch} | {tt['cost']} | {tt['clicks']} | {tt['conversions']} | {f(mm['ctr'])} | {f(mm['cpc'])} | {f(mm['cpa'])} | {f(mm['roas'])} |")
    for title, key in (("경고", "warnings"), ("분석 제한", "limitations")):
        if res[key]:
            L += ["", f"## {title}"] + [f"- {w}" for w in res[key]]
    if res["excluded_or_flagged_rows"]:
        L += ["", "## 제외·표시된 행"] + [f"- {i['row']}행 [{i['type']}] {i['detail']}" for i in res["excluded_or_flagged_rows"]]
    return "\n".join(L) + "\n"


def resolve_input(client, file):
    base = common.client_dir(client).resolve()
    p = (base / file).resolve()  # 절대경로를 주면 base 무시됨 -> 아래 범위 검사가 차단
    try:
        p.relative_to(base)
    except ValueError:
        raise AgencyError("입력 파일이 해당 고객사 폴더 밖입니다. 다른 고객사·상위 경로 파일은 사용할 수 없습니다.")
    if not p.is_file():
        raise AgencyError(f"입력 파일이 없습니다: {file}")
    return p


def main(argv):
    ap = argparse.ArgumentParser()
    ap.add_argument("--client", required=True)
    ap.add_argument("--file", required=True, help="고객사 폴더 기준 상대경로 (예: data/raw/ads.csv)")
    ap.add_argument("--start", required=True)
    ap.add_argument("--end", required=True)
    ap.add_argument("--prev-start")
    ap.add_argument("--prev-end")
    ap.add_argument("--currency", default="KRW")
    ap.add_argument("--tax", choices=["included", "excluded", "unknown"], default="unknown")
    ap.add_argument("--tz", default="Asia/Seoul")
    ap.add_argument("--attribution", default="unknown")
    ap.add_argument("--conversion-def", default="unknown")
    ap.add_argument("--finalized", choices=["yes", "no", "unknown"], default="unknown")
    ap.add_argument("--as-of")
    ap.add_argument("--dups", choices=["exclude", "keep"], default="exclude")
    ap.add_argument("--save", action="store_true", help="data/processed 에 버전별 JSON·MD 저장")
    a = ap.parse_args(argv)
    try:
        common.require_active(a.client)
        raw = read_table(resolve_input(a.client, a.file))
        rows, issues, has_rev = clean(raw, a.dups)
        res = build(rows, has_rev, issues, a)
        res["source_file"] = a.file
        if a.save:
            out = common.client_dir(a.client) / "data" / "processed"
            stem = f"analysis-{a.start}_{a.end}"
            pj = common.write_versioned(out, stem, ".json", __import__("json").dumps(res, ensure_ascii=False, indent=2))
            pm = common.write_versioned(out, stem, ".md", render_md(res))
            res["saved"] = [str(pj), str(pm)]
        common.emit(res)
    except AgencyError as e:
        print(f"오류: {e}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
