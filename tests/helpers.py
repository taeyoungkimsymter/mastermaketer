"""테스트 공용: 임시 AGENCY_ROOT 에 agency/·examples/ 를 복사하고 샘플 고객사를 설치한다.
실제 clients/ 는 건드리지 않는다.
"""
import contextlib
import io
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO / "scripts"))

import common  # noqa: E402
import install_samples  # noqa: E402


class AgencyTestCase(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp(prefix="agency-test-"))
        shutil.copytree(REPO / "agency", self.tmp / "agency")
        shutil.copytree(REPO / "examples", self.tmp / "examples")
        (self.tmp / "clients").mkdir()
        self._old = os.environ.get("AGENCY_ROOT")
        os.environ["AGENCY_ROOT"] = str(self.tmp)
        with contextlib.redirect_stdout(io.StringIO()):
            install_samples.main()
        self.root = self.tmp

    def tearDown(self):
        if self._old is None:
            os.environ.pop("AGENCY_ROOT", None)
        else:
            os.environ["AGENCY_ROOT"] = self._old
        shutil.rmtree(self.tmp, ignore_errors=True)

    def activate(self, cid="demo-cafe"):
        common.set_active(cid)

    def run_hook(self, tool_name, tool_input, cwd=None):
        payload = json.dumps({"tool_name": tool_name, "tool_input": tool_input, "cwd": str(cwd or self.tmp)})
        p = subprocess.run([sys.executable, "-I", str(REPO / "scripts" / "guard_paths.py")], input=payload.encode("utf-8"),
                           capture_output=True, env={**os.environ, "AGENCY_ROOT": str(self.tmp), "PYTHONUTF8": "1"})
        return p.returncode, p.stdout.decode("utf-8", "replace"), p.stderr.decode("utf-8", "replace")

    def cpath(self, *parts):
        return str(self.tmp.joinpath("clients", *parts))
