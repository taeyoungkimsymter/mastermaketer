"""작업 ID 생성: python scripts/taskid.py copy  ->  copy-20261021 (Asia/Seoul 기준 날짜)."""
import re
import sys

import common

if len(sys.argv) != 2 or not re.fullmatch(r"[a-z][a-z-]{1,20}", sys.argv[1]):
    print("사용법: taskid.py <유형(영문 소문자)>", file=sys.stderr)
    sys.exit(1)
print(f"{sys.argv[1]}-{common.today_kst():%Y%m%d}")
