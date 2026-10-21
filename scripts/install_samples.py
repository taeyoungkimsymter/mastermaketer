"""examples/clients/* (가상 고객사) 를 clients/ 로 복사. 기존 파일은 덮어쓰지 않는다.

  python scripts/install_samples.py
"""
import shutil
import sys

import common


def main():
    src = common.root() / "examples" / "clients"
    copied, skipped = 0, 0
    for f in src.rglob("*"):
        if f.is_file():
            dst = common.clients_root() / f.relative_to(src)
            if dst.exists():
                skipped += 1
                continue
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(f, dst)
            copied += 1
    print(f"가상 샘플 고객사 복사 완료: 새 파일 {copied}개, 기존 파일 유지 {skipped}개 (모든 샘플은 가상 데이터)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
