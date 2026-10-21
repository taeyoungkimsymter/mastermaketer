"""버전 파일 경로 안내/저장. 기존 산출물을 덮어쓰지 않는다.

  python scripts/save_version.py next --client A --project P --area deliverables --stem copy-20261021 --ext .md
      -> 다음 버전 경로 출력(생성하지 않음). 에이전트는 이 경로에 Write 로 저장한다.
  ... | python scripts/save_version.py save --client A --project P --area deliverables --stem ... --ext .md
      -> stdin 내용을 다음 버전으로 저장하고 경로 출력.
"""
import argparse
import sys

import common
from common import AgencyError


def main(argv):
    ap = argparse.ArgumentParser()
    ap.add_argument("action", choices=["next", "save"])
    ap.add_argument("--client", required=True)
    ap.add_argument("--project", default="general")
    ap.add_argument("--area", required=True, choices=list(common.VERSIONED_DIRS))
    ap.add_argument("--stem", required=True)
    ap.add_argument("--ext", default=".md")
    a = ap.parse_args(argv)
    try:
        common.require_active(a.client)
        common.validate_id(a.stem.lower().replace("_", "-").replace(".", "-"), "stem")
        d = common.project_dir(a.client, a.project) / a.area
        if a.action == "next":
            print(common.next_version_path(d, a.stem, a.ext))
        else:
            print(common.write_versioned(d, a.stem, a.ext, sys.stdin.read()))
    except AgencyError as e:
        print(f"오류: {e}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
