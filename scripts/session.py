"""활성 고객사 설정/조회/해제.

  python scripts/session.py set <client_id>
  python scripts/session.py get
  python scripts/session.py clear      # 사람이 터미널에서 직접 실행 (hook이 에이전트의 실행을 막음)
"""
import sys

import common
from common import AgencyError


def main(argv):
    if not argv or argv[0] not in ("set", "get", "clear"):
        print(__doc__)
        return 2
    try:
        if argv[0] == "set":
            if len(argv) != 2:
                raise AgencyError("사용법: session.py set <client_id>")
            common.set_active(argv[1])
            print(f"활성 고객사: {argv[1]}")
        elif argv[0] == "get":
            print(common.get_active() or "(없음)")
        else:
            common.clear_active()
            print("활성 고객사를 해제했습니다. 새 세션에서 작업을 시작하세요.")
    except AgencyError as e:
        print(f"오류: {e}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
