"""검증 사례 4·5: 전환 0, 클릭 0, 중복 행, 결측치, 전월 누락, 지표 합산·증감 정답 대조."""
import argparse
import unittest
from decimal import Decimal

from helpers import AgencyTestCase

import ad_report

H = "date,channel,campaign,impressions,clicks,cost,conversions,revenue\n"


def ns(**kw):
    d = dict(start="2026-09-01", end="2026-09-30", prev_start=None, prev_end=None, currency="KRW", tax="included", tz="Asia/Seoul",
             attribution="7d-click", conversion_def="purchase", finalized="yes", as_of="2026-10-21", dups="exclude")
    d.update(kw)
    return argparse.Namespace(**d)


def run(csv_text, **kw):
    import csv, io
    raw = list(csv.DictReader(io.StringIO(csv_text)))
    raw = [{k.strip(): v for k, v in r.items()} for r in raw]
    rows, issues, has_rev = ad_report.clean(raw, kw.pop("dups", "exclude"))
    return ad_report.build(rows, has_rev, issues, ns(**kw)), issues


CUR = (H + "2026-09-01,naver,c1,1000,50,10000,5,50000\n"
           "2026-09-02,naver,c1,3000,30,20000,0,0\n"
           "2026-09-01,meta,c2,2000,0,5000,0,0\n")
PREV = "2026-08-01,naver,c1,5000,100,20000,10,100000\n"


class TestMetrics(AgencyTestCase):
    def test_totals_and_ratios_use_summed_numerators_and_denominators(self):
        res, _ = run(CUR)
        m = res["current"]["metrics"]
        # 정답: 합계 노출 6000 클릭 80 광고비 35000 전환 5 매출 50000
        self.assertEqual(m["ctr"], "1.33")            # 80/6000*100 (행별 CTR 평균이면 2.00 이 됨)
        self.assertEqual(m["cpc"], "437.50")
        self.assertEqual(m["cpm"], "5833.33")
        self.assertEqual(m["cpa"], "7000.00")
        self.assertEqual(m["cvr"], "6.25")            # 분모 = 클릭
        self.assertEqual(m["roas"], "142.86")
        self.assertEqual(res["meta"]["cvr_denominator"], "클릭")

    def test_zero_clicks_and_zero_conversions_are_na_with_reason(self):
        res, _ = run(CUR)
        meta = res["by_channel"]["meta"]
        self.assertIsNone(meta["metrics"]["cpc"])
        self.assertEqual(meta["na_reasons"]["cpc"], "클릭 0")
        self.assertIsNone(meta["metrics"]["cvr"])
        self.assertIsNone(meta["metrics"]["cpa"])
        self.assertEqual(meta["na_reasons"]["cpa"], "전환 0")
        self.assertEqual(meta["metrics"]["ctr"], "0.00")  # 노출>0, 클릭 0 은 0% (N/A 아님)

    def test_zero_conversions_total(self):
        res, _ = run(H + "2026-09-01,naver,c1,1000,50,10000,0,0\n")
        self.assertIsNone(res["current"]["metrics"]["cpa"])
        self.assertEqual(res["current"]["na_reasons"]["cpa"], "전환 0")
        self.assertEqual(res["current"]["metrics"]["roas"], "0.00")

    def test_delta_units_and_values(self):
        res, _ = run(CUR + PREV, prev_start="2026-08-01", prev_end="2026-08-31")
        d = res["comparison"]["deltas"]
        self.assertEqual((d["ctr"]["unit"], d["ctr"]["value"]), ("%p", "-0.67"))     # 1.3333-2.0
        self.assertEqual((d["cost"]["unit"], d["cost"]["value"]), ("%", "75.00"))    # 35000 vs 20000
        self.assertEqual((d["cpc"]["unit"], d["cpc"]["value"]), ("%", "118.75"))     # 437.5 vs 200
        self.assertEqual((d["roas"]["unit"], d["roas"]["value"]), ("%p", "-357.14"))  # 142.857-500
        self.assertEqual(d["cvr"]["value"], "-3.75")                                 # 6.25-10

    def test_channel_level_comparison_and_daily_average(self):
        res, _ = run(CUR + PREV, prev_start="2026-08-01", prev_end="2026-08-31")
        nv = res["by_channel"]["naver"]
        # naver 9월: 노출 4000 클릭 80 광고비 30000 전환 5 / 8월: CTR 2.00 CPC 200
        self.assertEqual(nv["prev_metrics"]["ctr"], "2.00")
        self.assertEqual(nv["deltas"]["ctr"], {"unit": "%p", "value": "0.00", "note": None})  # 80/4000=2.00 → 변화 0
        self.assertEqual(nv["deltas"]["cpc"]["value"], "87.50")  # 375 vs 200
        self.assertEqual(res["by_channel"]["meta"].get("comparison_note"), "비교 기간에 이 채널 데이터 없음")
        da = res["comparison"]["daily_avg"]
        # 9월 데이터 2일 → 35000/2=17500, 8월 1일 → 20000 : -12.50 %
        self.assertEqual(da["cost_pct"]["value"], "-12.50")

    def test_prev_zero_gives_no_growth_rate(self):
        prev0 = "2026-08-01,naver,c1,5000,100,20000,0,0\n"
        res, _ = run(CUR + prev0, prev_start="2026-08-01", prev_end="2026-08-31")
        d = res["comparison"]["deltas"]["conversions"]
        self.assertIsNone(d["value"])
        self.assertIn("전기간 0", d["note"])
        self.assertIsNone(res["comparison"]["deltas"]["cpa"]["value"])  # 전기간 CPA N/A

    def test_prev_period_missing(self):
        res, _ = run(CUR, prev_start="2026-08-01", prev_end="2026-08-31")
        self.assertIsNone(res["comparison"])
        self.assertTrue(any("비교 기간" in s and "데이터 없음" in s for s in res["limitations"]))

    def test_period_length_mismatch_is_flagged(self):
        res, _ = run(CUR + PREV, prev_start="2026-08-01", prev_end="2026-08-31")
        self.assertTrue(any("기간 길이 불일치" in s for s in res["limitations"]))

    def test_in_progress_month_blocks_decline_claim(self):
        res, _ = run(CUR + PREV, prev_start="2026-08-01", prev_end="2026-08-31", end="2026-09-30", as_of="2026-09-15")
        self.assertTrue(res["in_progress"])
        self.assertTrue(any("진행 중" in s and "단정 금지" in s for s in res["limitations"]))

    def test_unknown_meta_warnings(self):
        res, _ = run(CUR, tax="unknown", attribution="unknown", conversion_def="unknown", finalized="unknown", tz="UTC")
        w = " ".join(res["warnings"])
        for key in ("VAT", "어트리뷰션", "전환 정의", "확정", "UTC"):
            self.assertIn(key, w)

    def test_cross_channel_overlap_warning(self):
        res, _ = run(CUR)
        self.assertTrue(any("채널 간 전환" in s for s in res["warnings"]))


class TestCleaning(AgencyTestCase):
    def test_exact_duplicate_row_excluded_by_default(self):
        res, issues = run(CUR + "2026-09-01,naver,c1,1000,50,10000,5,50000\n")
        self.assertTrue(any(i["type"] == "duplicate_row" for i in issues))
        self.assertEqual(res["current"]["totals"]["clicks"], "80.00")  # 중복 제외 후 합계 동일

    def test_duplicate_kept_when_requested(self):
        res, issues = run(CUR + "2026-09-01,naver,c1,1000,50,10000,5,50000\n", dups="keep")
        self.assertEqual(res["current"]["totals"]["clicks"], "130.00")
        self.assertTrue(any(i["type"] == "duplicate_row" for i in issues))

    def test_same_key_different_values_flagged_but_kept(self):
        _, issues = run(CUR + "2026-09-01,naver,c1,999,40,9000,4,40000\n")
        self.assertTrue(any(i["type"] == "duplicate_key" for i in issues))

    def test_missing_negative_anomaly_rows_excluded(self):
        bad = ("2026-09-03,naver,c1,1000,50,10000,,0\n"
               "2026-09-04,naver,c1,1000,-5,10000,1,0\n"
               "2026-09-05,naver,c1,100,500,10000,1,0\n"
               "not-a-date,naver,c1,1,1,1,1,1\n"
               "2026-09-06,naver,c1,abc,1,1,1,1\n")
        res, issues = run(CUR + bad)
        kinds = sorted(i["type"] for i in issues)
        self.assertEqual(kinds, sorted(["missing_value", "negative_value", "clicks_gt_impressions", "invalid_date", "invalid_number"]))
        self.assertEqual(res["current"]["totals"]["clicks"], "80.00")

    def test_missing_revenue_column_makes_roas_na(self):
        res, _ = run("date,channel,campaign,impressions,clicks,cost,conversions\n2026-09-01,naver,c1,1000,50,10000,5\n")
        self.assertIsNone(res["current"]["metrics"]["roas"])
        self.assertTrue(any("매출" in s for s in res["warnings"]))

    def test_blank_revenue_cell_makes_roas_na_not_zero(self):
        res, _ = run(H + "2026-09-01,naver,c1,1000,50,10000,5,\n2026-09-02,naver,c1,1000,50,10000,5,50000\n")
        self.assertIsNone(res["current"]["metrics"]["roas"])

    def test_no_data_in_period_yields_limitation_report(self):
        res, _ = run(CUR, start="2026-12-01", end="2026-12-31")
        self.assertTrue(any("유효한 데이터가 없습니다" in s for s in res["limitations"]))

    def test_missing_required_column_raises(self):
        import tempfile, pathlib
        p = pathlib.Path(tempfile.mkdtemp()) / "x.csv"
        p.write_text("date,channel\n2026-09-01,a\n", encoding="utf-8")
        with self.assertRaises(ad_report.AgencyError):
            ad_report.read_table(p)

    def test_korean_headers_and_thousand_separators(self):
        import tempfile, pathlib
        p = pathlib.Path(tempfile.mkdtemp()) / "k.csv"
        p.write_text('날짜,채널,캠페인,노출,클릭,광고비,전환,매출\n2026-09-01,naver,c1,"1,000",50,"10,000",5,"50,000"\n', encoding="utf-8")
        rows, issues, _ = ad_report.clean(ad_report.read_table(p))
        self.assertEqual(issues, [])
        self.assertEqual(rows[0]["impressions"], Decimal(1000))

    def test_xlsx_reader(self):
        import tempfile, pathlib, zipfile
        p = pathlib.Path(tempfile.mkdtemp()) / "a.xlsx"
        sheet = ('<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>'
                 '<row r="1"><c r="A1" t="inlineStr"><is><t>date</t></is></c><c r="B1" t="inlineStr"><is><t>channel</t></is></c>'
                 '<c r="C1" t="inlineStr"><is><t>campaign</t></is></c><c r="D1" t="inlineStr"><is><t>impressions</t></is></c>'
                 '<c r="E1" t="inlineStr"><is><t>clicks</t></is></c><c r="F1" t="inlineStr"><is><t>cost</t></is></c>'
                 '<c r="G1" t="inlineStr"><is><t>conversions</t></is></c></row>'
                 '<row r="2"><c r="A2"><v>46266</v></c><c r="B2" t="inlineStr"><is><t>naver</t></is></c><c r="C2" t="inlineStr"><is><t>c1</t></is></c>'
                 '<c r="D2"><v>1000</v></c><c r="E2"><v>50</v></c><c r="F2"><v>10000</v></c><c r="G2"><v>5</v></c></row>'
                 '</sheetData></worksheet>')
        with zipfile.ZipFile(p, "w") as z:
            z.writestr("xl/worksheets/sheet1.xml", sheet)
        rows, issues, _ = ad_report.clean(ad_report.read_table(p))
        self.assertEqual(issues, [])
        self.assertEqual(str(rows[0]["date"]), "2026-09-01")  # 엑셀 일련번호 46266


class TestSampleData(AgencyTestCase):
    def test_sample_cafe_sept_vs_aug_runs_and_reconciles(self):
        import csv
        self.activate("demo-cafe")
        path = ad_report.resolve_input("demo-cafe", "data/raw/ads-2026-08_10.csv")
        raw = ad_report.read_table(path)
        rows, issues, has_rev = ad_report.clean(raw)
        self.assertEqual(issues, [])
        res = ad_report.build(rows, has_rev, issues, ns(prev_start="2026-08-01", prev_end="2026-08-31"))
        # 독립 대조: csv 를 직접 합산
        with open(path, encoding="utf-8") as f:
            sep = [r for r in csv.DictReader(f) if r["date"].startswith("2026-09")]
        self.assertEqual(Decimal(res["current"]["totals"]["clicks"]), sum(Decimal(r["clicks"]) for r in sep))
        self.assertEqual(Decimal(res["current"]["totals"]["cost"]), sum(Decimal(r["cost"]) for r in sep))

    def test_sample_skin_has_no_revenue_and_no_prev(self):
        self.activate("demo-skin")
        raw = ad_report.read_table(ad_report.resolve_input("demo-skin", "data/raw/ads-2026-09.csv"))
        rows, issues, has_rev = ad_report.clean(raw)
        res = ad_report.build(rows, has_rev, issues, ns(prev_start="2026-08-01", prev_end="2026-08-31"))
        self.assertIsNone(res["comparison"])
        self.assertIsNone(res["current"]["metrics"]["roas"])


if __name__ == "__main__":
    unittest.main()
