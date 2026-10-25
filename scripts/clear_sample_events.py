"""예시 데이터(sample)만 지운다. 직접 입력한 데이터는 건드리지 않는다.

지우는 것
- 모든 고객사 library.json 의 events·requests·issues 중 `sample: true` 행
- 고객사 폴더의 `sample-manifest.json` 에 적힌 파일(예시 결과물·회의록·광고 CSV)과 그 상태 기록
- team.json 이 아직 `_sample` 표시를 갖고 있을 때(사용자가 담당자를 직접 고쳤다면 남긴다)

사용: python3 scripts/clear_sample_events.py [--dry-run]
"""
import argparse
import json
import sys

sys.path.insert(0, __file__.rsplit("/", 1)[0])
import common  # noqa: E402

KINDS = ("events", "requests", "issues")


def _dump(f, data):
    tmp = f.with_suffix(".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp.replace(f)


def clear_client(d, dry):
    out = []
    f = d / "library" / "library.json"
    if f.is_file():
        data = json.loads(f.read_text(encoding="utf-8"))
        changed = False
        for k in KINDS:
            rows = data.get(k, [])
            keep = [r for r in rows if not r.get("sample")]
            if len(keep) != len(rows):
                out.append(f"{k} {len(rows) - len(keep)}개")
                data[k] = keep
                changed = True
        if changed and not dry:
            _dump(f, data)
    man = d / "sample-manifest.json"
    if man.is_file():
        m = json.loads(man.read_text(encoding="utf-8"))
        files = [d / p for p in m.get("files", [])]
        out.append(f"파일 {sum(1 for p in files if p.is_file())}개")
        for item in m.get("deliverables", []):
            sf = d / "projects" / item["project"] / "status.json"
            if sf.is_file():
                st = json.loads(sf.read_text(encoding="utf-8"))
                if item["name"] in st.get("deliverables", {}):
                    out.append(f"상태 기록 {item['name']}")
                    if not dry:
                        del st["deliverables"][item["name"]]
                        _dump(sf, st)
        if not dry:
            for p in files:
                if p.is_file() and d.resolve() in p.resolve().parents:
                    p.unlink()
            man.unlink()
    team = d / "team.json"
    if team.is_file():
        try:
            t = json.loads(team.read_text(encoding="utf-8"))
        except ValueError:
            t = {}
        if t.get("_sample"):
            out.append("team.json")
            if not dry:
                team.unlink()
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    any_ = False
    for d in sorted(common.clients_root().iterdir()):
        if not d.is_dir() or not common.ID_RE.match(d.name):
            continue
        out = clear_client(d, a.dry_run)
        if out:
            any_ = True
            print(f"{d.name}: " + ", ".join(out) + (" (삭제 안 함)" if a.dry_run else " 삭제"))
    if not any_:
        print("지울 예시 데이터가 없습니다.")


if __name__ == "__main__":
    main()
