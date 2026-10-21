"""검증 사례 1·2·3·11: 고객사 혼입, ID/경로 처리, hook 차단·비차단 범위, 문서 속 지시문."""
import os
import unittest

from helpers import AgencyTestCase, common

import copy_check
import scan_inputs
import ad_report


class TestLeak(AgencyTestCase):
    """사례 1: 고객사 A 카피에 B의 전용 문구가 섞이지 않는지."""

    def rows(self, *texts):
        return [{"option": "A안", "field": "headline", "text": t} for t in texts]

    def test_other_client_exclusive_phrase_is_detected_and_masked(self):
        self.activate("demo-cafe")
        res = copy_check.check("demo-cafe", self.rows("차분히 살피는 하루, 모카나루와 함께"), "naver-search")
        msgs = " ".join(i["msg"] for it in res["items"] for i in it["issues"])
        self.assertIn("혼입", msgs)
        self.assertFalse(res["summary"]["passed_mechanical"])
        self.assertNotIn("차분히 살피는 하루", msgs)  # 출력에서 마스킹

    def test_other_client_display_name_is_detected(self):
        self.activate("demo-cafe")
        res = copy_check.check("demo-cafe", self.rows("라온스킨 모닝 쉼표"), "naver-search")
        self.assertFalse(res["summary"]["passed_mechanical"])

    def test_own_phrase_is_not_flagged(self):
        self.activate("demo-cafe")
        res = copy_check.check("demo-cafe", self.rows("쉼표 한 모금, 오늘도 모카나루"), "naver-search")
        self.assertTrue(res["summary"]["passed_mechanical"])

    def test_banned_expression_fails(self):
        self.activate("demo-cafe")
        res = copy_check.check("demo-cafe", self.rows("지금 최저가로 만나요"), "naver-search")
        self.assertFalse(res["summary"]["passed_mechanical"])

    def test_unverified_spec_never_fails_on_length(self):
        self.activate("demo-cafe")
        res = copy_check.check("demo-cafe", self.rows("가" * 200), "naver-search")
        levels = [i["level"] for it in res["items"] for i in it["issues"]]
        self.assertNotIn("FAIL", levels)
        self.assertIn("INFO", levels)

    def test_verified_spec_counts_length(self):
        self.activate("demo-cafe")
        spec = {"channel": "x", "ad_format": "y", "fields": {"headline": {"max": 10}}, "count": "len",
                "status": "verified", "source": "test", "checked_at": "2026-10-21"}
        res = copy_check.check("demo-cafe", self.rows("가" * 11), "x", spec=spec)
        self.assertFalse(res["summary"]["passed_mechanical"])
        res = copy_check.check("demo-cafe", self.rows("가" * 10), "x", spec=spec)
        self.assertTrue(res["summary"]["passed_mechanical"])

    def test_cjk2_counting(self):
        self.assertEqual(copy_check.width("가a", "cjk2"), 3)
        self.assertEqual(copy_check.width("가a", "len"), 2)

    def test_unknown_channel_reports_missing_spec(self):
        self.activate("demo-cafe")
        res = copy_check.check("demo-cafe", self.rows("안녕"), "tiktok")
        self.assertIn("spec_note", res)


class TestIds(AgencyTestCase):
    """사례 2: ID 누락·잘못된 ID·상위 경로 이동."""

    def test_invalid_ids_rejected(self):
        for bad in ("", None, "../demo-skin", "a/b", "A_B", "demo cafe", "-x", "x" * 40, "a"):
            with self.assertRaises(common.AgencyError, msg=repr(bad)):
                common.validate_id(bad)

    def test_unknown_client_rejected(self):
        with self.assertRaises(common.AgencyError):
            common.set_active("no-such-client")

    def test_missing_active_blocks_scripts(self):
        with self.assertRaises(common.AgencyError):
            common.require_active("demo-cafe")

    def test_cannot_switch_client_in_place(self):
        self.activate("demo-cafe")
        with self.assertRaises(common.AgencyError) as cm:
            common.set_active("demo-skin")
        self.assertIn("새 세션", str(cm.exception))
        self.assertEqual(common.get_active(), "demo-cafe")

    def test_report_input_traversal_blocked(self):
        self.activate("demo-cafe")
        with self.assertRaises(common.AgencyError):
            ad_report.resolve_input("demo-cafe", "../demo-skin/data/raw/ads-2026-09.csv")
        with self.assertRaises(common.AgencyError):
            ad_report.resolve_input("demo-cafe", str(self.root / "clients" / "demo-skin" / "data" / "raw" / "ads-2026-09.csv"))
        self.assertTrue(ad_report.resolve_input("demo-cafe", "data/raw/ads-2026-08_10.csv").is_file())


class TestHook(AgencyTestCase):
    """사례 3: hook이 막는 것과 못 막는 것."""

    def test_no_active_client_blocks_client_files(self):
        code, _, err = self.run_hook("Read", {"file_path": self.cpath("demo-cafe", "brand.md")})
        self.assertEqual(code, 2, err)

    def test_own_client_allowed(self):
        self.activate("demo-cafe")
        code, _, err = self.run_hook("Read", {"file_path": self.cpath("demo-cafe", "brand.md")})
        self.assertEqual(code, 0, err)

    def test_other_client_blocked_for_read_write_edit(self):
        self.activate("demo-cafe")
        for tool in ("Read", "Write", "Edit"):
            code, _, _ = self.run_hook(tool, {"file_path": self.cpath("demo-skin", "brand.md")})
            self.assertEqual(code, 2, tool)

    def test_relative_and_dotdot_paths_blocked(self):
        self.activate("demo-cafe")
        code, _, _ = self.run_hook("Read", {"file_path": "clients/demo-cafe/../demo-skin/brand.md"})
        self.assertEqual(code, 2)
        code, _, _ = self.run_hook("Read", {"file_path": "../demo-skin/brand.md"}, cwd=self.tmp / "clients" / "demo-cafe")
        self.assertEqual(code, 2)

    def test_search_across_clients_blocked(self):
        self.activate("demo-cafe")
        for tool, inp in (("Grep", {"pattern": "x", "path": self.cpath()}), ("Glob", {"pattern": "**/*.md", "path": str(self.tmp)}),
                          ("Grep", {"pattern": "x"})):
            code, _, _ = self.run_hook(tool, inp)
            self.assertEqual(code, 2, (tool, inp))
        code, _, err = self.run_hook("Grep", {"pattern": "x", "path": self.cpath("demo-cafe")})
        self.assertEqual(code, 0, err)
        # 루트에서도 폴더를 명시한 검색은 허용(과차단 방지)
        for tool, inp in (("Glob", {"pattern": ".claude/skills/report/SKILL.md"}), ("Glob", {"pattern": "agency/**/*.md"}),
                          ("Glob", {"pattern": "*.md"}), ("Grep", {"pattern": "x", "glob": "docs/**"})):
            code, _, err = self.run_hook(tool, inp)
            self.assertEqual(code, 0, (tool, inp, err))
        self.assertEqual(self.run_hook("Glob", {"pattern": "clients/**/brand.md"})[0], 2)

    def test_raw_data_write_blocked(self):
        self.activate("demo-cafe")
        p = self.cpath("demo-cafe", "data", "raw", "ads-2026-08_10.csv")
        self.assertEqual(self.run_hook("Write", {"file_path": p})[0], 2)
        self.assertEqual(self.run_hook("Edit", {"file_path": p})[0], 2)
        self.assertEqual(self.run_hook("Read", {"file_path": p})[0], 0)

    def test_bash_other_client_path_blocked(self):
        self.activate("demo-cafe")
        for cmd in ("cat clients/demo-skin/brand.md", "type clients\\demo-skin\\brand.md",
                    "cat clients/demo-cafe/../demo-skin/brand.md", "py -3 scripts/session.py clear",
                    "rm clients/demo-cafe/data/raw/ads-2026-08_10.csv", "echo x > clients/demo-cafe/data/raw/a.csv"):
            self.assertEqual(self.run_hook("Bash", {"command": cmd})[0], 2, cmd)
        self.assertEqual(self.run_hook("Bash", {"command": "cat clients/demo-cafe/brand.md"})[0], 0)

    def test_settings_and_scripts_edit_asks(self):
        self.activate("demo-cafe")
        code, out, _ = self.run_hook("Edit", {"file_path": str(self.tmp / ".claude" / "settings.json")})
        self.assertEqual(code, 0)
        self.assertIn('"ask"', out)

    def test_fail_closed_on_garbage_input(self):
        import subprocess, sys
        from helpers import REPO
        p = subprocess.run([sys.executable, str(REPO / "scripts" / "guard_paths.py")], input=b"not json",
                           capture_output=True, env={**os.environ, "AGENCY_ROOT": str(self.tmp)})
        self.assertEqual(p.returncode, 2)

    def test_KNOWN_GAPS_hook_does_not_stop_indirect_access(self):
        """한계 문서화: 아래는 hook이 못 막는 경로다. 이 테스트는 '막힌다'가 아니라 '못 막는다'를 고정한다."""
        self.activate("demo-cafe")
        # 경로를 쪼갠 셸 접근(clients/ 뒤에 슬래시 없음)
        self.assertEqual(self.run_hook("Bash", {"command": "cd clients; cat demo-skin/brand.md"})[0], 0)
        # 스크립트 내부에서 만든 경로
        self.assertEqual(self.run_hook("Bash", {"command": "py -3 -c \"open('cli'+'ents/demo-skin/brand.md')\""})[0], 0)
        # MCP 도구는 이 hook(matcher)의 대상이 아니다 — settings.json matcher 에 없음
        self.assertEqual(self.run_hook("mcp__anything__read", {"path": "clients/demo-skin/brand.md"})[0], 0)

    def test_symlink_escape_is_resolved(self):
        self.activate("demo-cafe")
        link = self.tmp / "clients" / "demo-cafe" / "references" / "link-to-skin"
        try:
            os.symlink(self.tmp / "clients" / "demo-skin", link, target_is_directory=True)
        except (OSError, NotImplementedError):
            self.skipTest("이 환경에서는 심볼릭 링크를 만들 수 없음(Windows 권한) — 미검증")
        code, _, _ = self.run_hook("Read", {"file_path": str(link / "brand.md")})
        self.assertEqual(code, 2)


class TestInjection(AgencyTestCase):
    """사례 11: 외부 문서 속 지시문."""

    def test_scanner_flags_instruction_in_meeting_notes(self):
        text = (self.tmp / "clients" / "demo-cafe" / "inbox" / "meeting-2026-10-20.md").read_text(encoding="utf-8")
        hits = scan_inputs.scan(text)
        self.assertTrue(any("clients" in h["text"] for h in hits))

    def test_even_if_followed_the_hook_stops_cross_client_read(self):
        self.activate("demo-cafe")
        code, _, _ = self.run_hook("Read", {"file_path": self.cpath("demo-skin", "brand.md")})
        self.assertEqual(code, 2)
    # 주의: '모델이 지시문을 따르지 않는다'는 자동 테스트로 입증할 수 없다 -> tests/eval/checklist.md 의 수동 평가 항목.


if __name__ == "__main__":
    unittest.main()
