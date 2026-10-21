"""고객사/프로젝트 폴더 생성. 기존 파일은 덮어쓰지 않는다.

  python scripts/scaffold.py client --id acme --name "에이스미(가상)"
  python scripts/scaffold.py project --client acme --id spring-video --name "봄 영상"
"""
import argparse
import json
import sys

import common
from common import AgencyError

CLIENT_DIRS = ["rules", "inbox", "data/raw", "data/processed", "references", "projects"]
PROJECT_DIRS = ["research", "deliverables", "review", "production", "logs"]


def _fill(template_name, **kw):
    f = common.root() / "agency" / "templates" / template_name
    text = f.read_text(encoding="utf-8")
    for k, v in kw.items():
        text = text.replace("{{" + k + "}}", v)
    return text


def _write_new(path, text, created, skipped):
    if path.exists():
        skipped.append(str(path.relative_to(common.root())))
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8", newline="\n")
    created.append(str(path.relative_to(common.root())))


def make_client(client_id, name):
    common.validate_id(client_id, "client_id")
    base = common.client_dir(client_id, must_exist=False)
    created, skipped = [], []
    for d in CLIENT_DIRS:
        (base / d).mkdir(parents=True, exist_ok=True)
    kw = dict(client_id=client_id, client_name=name)
    _write_new(base / "brand.md", _fill("brand.md", **kw), created, skipped)
    _write_new(base / "contract-scope.md", _fill("contract-scope.md", **kw), created, skipped)
    _write_new(base / "feedback-log.md", "# 피드백 로그 (자동 생성 — 직접 수정 금지)\n\n(기록 없음)\n", created, skipped)
    _write_new(base / "feedback-log.json", json.dumps({"items": []}, ensure_ascii=False, indent=2), created, skipped)
    make_project(client_id, "general", "공통 업무(프로젝트 없음)", _created=created, _skipped=skipped)
    return {"client_id": client_id, "created": created, "skipped_existing": skipped}


def make_project(client_id, project_id, name, _created=None, _skipped=None):
    common.validate_id(project_id, "project_id")
    cbase = common.client_dir(client_id)
    base = cbase / "projects" / project_id
    created = _created if _created is not None else []
    skipped = _skipped if _skipped is not None else []
    for d in PROJECT_DIRS:
        (base / d).mkdir(parents=True, exist_ok=True)
    kw = dict(client_id=client_id, project_id=project_id, project_name=name)
    _write_new(base / "brief.md", _fill("brief.md", **kw), created, skipped)
    _write_new(base / "tasks.md", _fill("tasks.md", **kw), created, skipped)
    status = {"client_id": client_id, "project_id": project_id, "name": name, "stage": "brief",
              "selected_concept": None, "deliverables": {}, "updated_at": common.now_kst().isoformat(),
              "updated_by": "director"}
    _write_new(base / "status.json", json.dumps(status, ensure_ascii=False, indent=2), created, skipped)
    return {"client_id": client_id, "project_id": project_id, "created": created, "skipped_existing": skipped}


def main(argv):
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    c = sub.add_parser("client")
    c.add_argument("--id", required=True)
    c.add_argument("--name", required=True)
    p = sub.add_parser("project")
    p.add_argument("--client", required=True)
    p.add_argument("--id", required=True)
    p.add_argument("--name", required=True)
    a = ap.parse_args(argv)
    try:
        if a.cmd == "client":
            common.emit(make_client(a.id, a.name))
        else:
            common.require_active(a.client)
            common.emit(make_project(a.client, a.id, a.name))
    except AgencyError as e:
        print(f"오류: {e}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
