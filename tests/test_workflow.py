"""검증 사례 6·7·8·9·10·12: 피드백 승인·범위, 영상 컨셉 게이트, 컷/일정 점검, 확정 근거, 버전 보존."""
import json
import subprocess
import sys
import unittest
from datetime import date

from helpers import AgencyTestCase, REPO, common

import feedback
import production_check as pc
import scaffold
import status


class TestFeedback(AgencyTestCase):
    def setUp(self):
        super().setUp()
        self.activate("demo-cafe")

    def test_candidate_is_never_active(self):
        fid = feedback.add("demo-cafe", "이번 영상은 유머를 줄이자", "회의 10/20", "project", "spring-video", "선호", "humor")
        self.assertEqual(feedback.load("demo-cafe")["items"][0]["status"], "후보")
        self.assertEqual(feedback.active("demo-cafe", project="spring-video"), [])
        feedback.approve("demo-cafe", fid, "김팀장")
        self.assertEqual([i["id"] for i in feedback.active("demo-cafe", project="spring-video")], [fid])

    def test_rejected_candidate_never_active(self):
        fid = feedback.add("demo-cafe", "x", "m", "client", None, "선호")
        feedback.reject("demo-cafe", fid)
        self.assertEqual(feedback.active("demo-cafe"), [])
        with self.assertRaises(common.AgencyError):
            feedback.approve("demo-cafe", fid, "김팀장")

    def test_approval_requires_named_approver(self):
        fid = feedback.add("demo-cafe", "x", "m", "client", None, "금지사항")
        for by in (None, "", "  "):
            with self.assertRaises(common.AgencyError):
                feedback.approve("demo-cafe", fid, by)

    def test_project_feedback_does_not_spread(self):
        fid = feedback.add("demo-cafe", "이번 영상은 유머를 줄이자", "회의", "project", "spring-video", "선호")
        feedback.approve("demo-cafe", fid, "김팀장")
        self.assertEqual(feedback.active("demo-cafe", project="general"), [])
        self.assertEqual(feedback.active("demo-cafe"), [])
        self.assertEqual(feedback.active("demo-cafe", channel="instagram-feed"), [])

    def test_channel_and_deliverable_scope(self):
        a = feedback.add("demo-cafe", "해시태그 3개 이내", "회의", "channel", "instagram-feed", "선호")
        b = feedback.add("demo-cafe", "2번 컷 자막 수정", "회의", "deliverable", "copy-20261021-v1.md", "일회성 수정")
        feedback.approve("demo-cafe", a, "김팀장")
        feedback.approve("demo-cafe", b, "김팀장")
        self.assertEqual([i["id"] for i in feedback.active("demo-cafe", channel="instagram-feed")], [a])
        self.assertEqual([i["id"] for i in feedback.active("demo-cafe", deliverable="copy-20261021-v1.md")], [b])
        self.assertEqual(feedback.active("demo-cafe", channel="meta-ads"), [])

    def test_one_off_cannot_be_client_wide(self):
        with self.assertRaises(common.AgencyError):
            feedback.add("demo-cafe", "이번만 이렇게", "회의", "client", None, "일회성 수정")

    def test_scope_ref_validation(self):
        with self.assertRaises(common.AgencyError):
            feedback.add("demo-cafe", "x", "m", "project", None, "선호")
        with self.assertRaises(common.AgencyError):
            feedback.add("demo-cafe", "x", "m", "client", "p", "선호")

    def test_expired_rule_not_active(self):
        fid = feedback.add("demo-cafe", "x", "m", "client", None, "선호")
        feedback.approve("demo-cafe", fid, "김팀장", expires="2026-10-31")
        self.assertEqual(len(feedback.active("demo-cafe", today=date(2026, 10, 31))), 1)
        self.assertEqual(feedback.active("demo-cafe", today=date(2026, 11, 1)), [])

    def test_conflict_is_not_silently_overwritten(self):
        old = feedback.add("demo-cafe", "유머 적극 사용", "회의", "client", None, "선호", "humor")
        feedback.approve("demo-cafe", old, "김팀장")
        new = feedback.add("demo-cafe", "유머 줄이기", "회의", "project", "spring-video", "선호", "humor")
        with self.assertRaises(common.AgencyError) as cm:
            feedback.approve("demo-cafe", new, "김팀장")
        self.assertIn(old, str(cm.exception))
        items = {i["id"]: i for i in feedback.load("demo-cafe")["items"]}
        self.assertEqual(items[old]["status"], "승인")   # 기존 규칙 유지
        self.assertEqual(items[new]["status"], "후보")   # 신규는 결정 대기
        feedback.approve("demo-cafe", new, "김팀장", supersede=[old])
        items = {i["id"]: i for i in feedback.load("demo-cafe")["items"]}
        self.assertEqual(items[old]["status"], "대체됨")
        self.assertEqual(items[old]["replaced_by"], new)

    def test_markdown_view_is_rendered(self):
        feedback.add("demo-cafe", "텍스트", "회의", "client", None, "선호")
        md = (self.tmp / "clients" / "demo-cafe" / "feedback-log.md").read_text(encoding="utf-8")
        self.assertIn("FB-001", md)
        self.assertIn("후보", md)

    def test_requires_active_client(self):
        common.clear_active()
        with self.assertRaises(common.AgencyError):
            feedback.add("demo-cafe", "x", "m", "client", None, "선호")


class TestVideoGate(AgencyTestCase):
    def setUp(self):
        super().setUp()
        self.activate("demo-cafe")
        self.c, self.p = "demo-cafe", "spring-video"

    def test_cannot_enter_detail_stages_without_concept(self):
        for stage in ("script", "storyboard", "shoot_plan"):
            with self.assertRaises(common.AgencyError, msg=stage):
                status.set_stage(self.c, self.p, stage)
            with self.assertRaises(common.AgencyError):
                status.require(self.c, self.p, stage)
        self.assertEqual(status.load(self.c, self.p)["stage"], "brief")

    def test_concept_then_detail_allowed(self):
        status.set_stage(self.c, self.p, "concepts")
        status.select_concept(self.c, self.p, "B", "김팀장")
        st = status.set_stage(self.c, self.p, "script")
        self.assertEqual(st["stage"], "script")
        self.assertEqual(st["selected_concept"]["id"], "B")

    def test_delegated_selection_is_recorded(self):
        status.set_stage(self.c, self.p, "concepts")
        st = status.select_concept(self.c, self.p, "A", "사용자 위임(추천안 A)", delegated=True)
        self.assertTrue(st["selected_concept"]["delegated"])

    def test_selection_requires_selector(self):
        with self.assertRaises(common.AgencyError):
            status.select_concept(self.c, self.p, "A", " ")

    def test_stage_cannot_go_backwards(self):
        status.select_concept(self.c, self.p, "A", "김팀장")
        status.set_stage(self.c, self.p, "storyboard")
        with self.assertRaises(common.AgencyError):
            status.set_stage(self.c, self.p, "concepts")

    def test_cli_exit_codes(self):
        env = {"AGENCY_ROOT": str(self.tmp), "PYTHONUTF8": "1", "PATH": __import__("os").environ["PATH"], "SYSTEMROOT": __import__("os").environ.get("SYSTEMROOT", "")}
        r = subprocess.run([sys.executable, str(REPO / "scripts" / "status.py"), "require", "--client", self.c, "--project", self.p, "--stage", "script"],
                           capture_output=True, env=env)
        self.assertEqual(r.returncode, 1)
        self.assertIn("STOP", r.stderr.decode("utf-8", "replace"))

    def test_deliverable_state_machine(self):
        status.set_deliverable(self.c, self.p, "f-v1.md", "draft")
        status.set_deliverable(self.c, self.p, "f-v1.md", "review_passed")
        with self.assertRaises(common.AgencyError):  # AI 검수 통과만으로 승인 불가
            status.set_deliverable(self.c, self.p, "f-v1.md", "approved")
        st = status.set_deliverable(self.c, self.p, "f-v1.md", "approved", "김팀장")
        self.assertEqual(st["deliverables"]["f-v1.md"]["by"], "김팀장")
        with self.assertRaises(common.AgencyError):
            status.set_deliverable(self.c, self.p, "f-v1.md", "draft")
        with self.assertRaises(common.AgencyError):
            status.set_deliverable(self.c, self.p, "g-v1.md", "approved", "김팀장")  # draft 등록 없이 불가


class TestProduction(AgencyTestCase):
    def test_cut_sum_matches_target(self):
        rows = [{"cut": str(i), "duration_sec": d} for i, d in enumerate(["3", "5", "7", "10", "5"], 1)]
        self.assertTrue(pc.check_cuts(rows, 30)["ok"])
        r = pc.check_cuts(rows, 35)
        self.assertFalse(r["ok"])
        self.assertEqual(r["diff_sec"], -5)
        self.assertIn("≠ 목표", r["errors"][0])

    def test_cut_tolerance_and_bad_values(self):
        self.assertTrue(pc.check_cuts([{"duration_sec": "29.8"}, {"duration_sec": "0.5"}], 30, 0.5)["ok"])
        for bad in ("", "-3", "abc", "0"):
            self.assertFalse(pc.check_cuts([{"duration_sec": "10"}, {"duration_sec": bad}], 10)["ok"], bad)

    def base_schedule(self):
        return [
            {"start": "08:00", "end": "08:30", "activity": "장비 준비", "type": "prep", "location": "사무실", "confirm_status": "확정", "evidence": "내부 일정표"},
            {"start": "08:30", "end": "09:00", "activity": "이동", "type": "travel", "location": "", "confirm_status": "미확인", "evidence": ""},
            {"start": "09:00", "end": "09:30", "activity": "세팅", "type": "setup", "location": "본점", "confirm_status": "미확인", "evidence": ""},
            {"start": "09:30", "end": "12:00", "activity": "촬영", "type": "shoot", "location": "본점", "confirm_status": "미확인", "evidence": ""},
            {"start": "12:00", "end": "12:30", "activity": "철수", "type": "teardown", "location": "본점", "confirm_status": "미확인", "evidence": ""},
        ]

    def test_valid_schedule(self):
        r = pc.check_schedule(self.base_schedule())
        self.assertTrue(r["ok"], r)

    def test_overlap_detected(self):
        rows = self.base_schedule()
        rows[3]["start"] = "09:15"
        r = pc.check_schedule(rows)
        self.assertFalse(r["ok"])
        self.assertTrue(any("충돌" in e for e in r["errors"]))

    def test_missing_setup_teardown_travel(self):
        rows = [r for r in self.base_schedule() if r["type"] not in ("setup", "teardown")]
        errs = " ".join(pc.check_schedule(rows)["errors"])
        self.assertIn("세팅", errs)
        self.assertIn("철수", errs)
        rows = self.base_schedule()
        rows.insert(4, {"start": "12:00", "end": "13:00", "activity": "야외 촬영", "type": "shoot", "location": "공원", "confirm_status": "미확인", "evidence": ""})
        rows[5]["start"], rows[5]["end"] = "13:00", "13:30"
        rows = [r for r in rows if r["type"] != "travel"]
        self.assertIn("이동", " ".join(pc.check_schedule(rows)["errors"]))

    def test_permit_booking_confirmed_without_evidence_is_error(self):
        rows = self.base_schedule()
        rows.append({"start": "13:00", "end": "13:10", "activity": "본점 촬영 허가", "type": "permit", "location": "본점", "confirm_status": "확정", "evidence": ""})
        r = pc.check_schedule(rows)
        self.assertFalse(r["ok"])
        self.assertTrue(any("근거" in e and "허가" in e for e in r["errors"]))
        rows[-1]["evidence"] = "담당자 메일 2026-10-20 회신(첨부 파일 경로)"
        self.assertTrue(pc.check_schedule(rows)["ok"])

    def test_bad_times(self):
        rows = self.base_schedule()
        rows[0]["start"] = "25:00"
        rows[1]["end"] = "08:00"
        self.assertEqual(len(pc.check_schedule(rows)["errors"]), 2)

    def test_risk_table_columns(self):
        self.assertFalse(pc.check_risk([{"위험": "비"}])["ok"])
        full = {c: "x" for c in pc.RISK_COLS}
        full["담당자"] = "미정"
        r = pc.check_risk([full])
        self.assertTrue(r["ok"])
        self.assertTrue(r["warnings"])

    def test_templates_have_required_headers(self):
        t = self.tmp / "agency" / "templates"
        self.assertEqual((t / "risk-table.csv").read_text(encoding="utf-8").strip().split(","), pc.RISK_COLS)
        self.assertIn("evidence", (t / "shoot-schedule.csv").read_text(encoding="utf-8"))


class TestVersioning(AgencyTestCase):
    def test_write_versioned_never_overwrites(self):
        d = self.tmp / "out"
        a = common.write_versioned(d, "copy-20261021", ".md", "first")
        b = common.write_versioned(d, "copy-20261021", ".md", "second")
        self.assertEqual((a.name, b.name), ("copy-20261021-v1.md", "copy-20261021-v2.md"))
        self.assertEqual(a.read_text(encoding="utf-8"), "first")

    def test_next_version_path_does_not_create(self):
        d = self.tmp / "out2"
        p = common.next_version_path(d, "x-1", ".md")
        self.assertEqual(p.name, "x-1-v1.md")
        self.assertFalse(p.exists())

    def test_rerun_report_keeps_raw_and_previous_outputs(self):
        self.activate("demo-cafe")
        raw = self.tmp / "clients" / "demo-cafe" / "data" / "raw" / "ads-2026-08_10.csv"
        before = raw.read_bytes()
        env = {"AGENCY_ROOT": str(self.tmp), "PYTHONUTF8": "1", "PATH": __import__("os").environ["PATH"], "SYSTEMROOT": __import__("os").environ.get("SYSTEMROOT", "")}
        cmd = [sys.executable, str(REPO / "scripts" / "ad_report.py"), "--client", "demo-cafe", "--file", "data/raw/ads-2026-08_10.csv",
               "--start", "2026-09-01", "--end", "2026-09-30", "--finalized", "yes", "--save"]
        outs = []
        for _ in range(2):
            r = subprocess.run(cmd, capture_output=True, env=env)
            self.assertEqual(r.returncode, 0, r.stderr.decode("utf-8", "replace"))
            outs.append(json.loads(r.stdout.decode("utf-8"))["saved"])
        self.assertNotEqual(outs[0], outs[1])
        self.assertTrue(all(__import__("pathlib").Path(p).exists() for pair in outs for p in pair))
        self.assertEqual(raw.read_bytes(), before)

    def test_scaffold_does_not_overwrite_existing_files(self):
        brand = self.tmp / "clients" / "demo-cafe" / "brand.md"
        brand.write_text("사용자가 수정한 내용", encoding="utf-8")
        res = scaffold.make_client("demo-cafe", "모카나루")
        self.assertEqual(brand.read_text(encoding="utf-8"), "사용자가 수정한 내용")
        self.assertIn("clients\\demo-cafe\\brand.md".replace("\\", "/"), [s.replace("\\", "/") for s in res["skipped_existing"]])

    def test_hook_blocks_overwrite_of_existing_deliverable(self):
        self.activate("demo-cafe")
        d = self.tmp / "clients" / "demo-cafe" / "projects" / "general" / "deliverables"
        d.mkdir(parents=True, exist_ok=True)
        f = d / "copy-20261021-v1.md"
        f.write_text("v1", encoding="utf-8")
        self.assertEqual(self.run_hook("Write", {"file_path": str(f)})[0], 2)
        self.assertEqual(self.run_hook("Edit", {"file_path": str(f)})[0], 2)
        self.assertEqual(self.run_hook("Write", {"file_path": str(d / "copy-20261021-v2.md")})[0], 0)

    def test_new_client_scaffold_and_bad_ids(self):
        res = scaffold.make_client("brand-new", "신규(가상)")
        self.assertTrue((self.tmp / "clients" / "brand-new" / "projects" / "general" / "status.json").exists())
        self.assertTrue(res["created"])
        for bad in ("../x", "A B", ""):
            with self.assertRaises(common.AgencyError):
                scaffold.make_client(bad, "x")
        brand = (self.tmp / "clients" / "brand-new" / "brand.md").read_text(encoding="utf-8")
        self.assertEqual(common.section_bullets(brand, "금지 표현"), [])  # '미정' 은 규칙으로 취급되지 않음


if __name__ == "__main__":
    unittest.main()
