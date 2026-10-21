"""PreToolUse hook: 고객사 경계·원본·버전 보존 실수 방지 장치.

*** 보안 경계가 아니다. *** 우회 가능: 임의 셸 명령, 스크립트 내부 파일 접근, MCP 도구,
심볼릭 링크/정션을 거치는 간접 접근 등. 강한 격리는 별도 작업공간 + OS/컨테이너 권한이 필요하다.

입력: stdin JSON (tool_name, tool_input, cwd ...). 차단: exit 2 + stderr.
확인 요청: exit 0 + hookSpecificOutput.permissionDecision = "ask".
fail-closed: 처리 중 예외가 나면 exit 2.
"""
import json
import os
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import common  # noqa: E402

PATH_TOOLS = {"Read": "file_path", "Write": "file_path", "Edit": "file_path",
              "NotebookEdit": "notebook_path", "Glob": "path", "Grep": "path"}
WRITE_TOOLS = {"Write", "Edit", "NotebookEdit"}
ASK_PREFIXES = (".claude", "scripts", "CLAUDE.md")
BASH_CLIENT_RE = re.compile(r"clients[/\\]+([^\s/\\\"'`;|&)]+)")
WRITEY_RE = re.compile(r"(\brm\b|\bmv\b|\bdel\b|Remove-Item|Move-Item|\bsed\s+-i|\btruncate\b|>>?|\btee\b)")


def _norm(p: Path) -> str:
    return os.path.normcase(str(p))


def _resolve(raw: str, cwd: str) -> Path:
    p = Path(raw)
    if not p.is_absolute():
        p = Path(cwd or os.getcwd()) / p
    return p.resolve()  # 심볼릭 링크·정션·'..' 해소


def _rel(p: Path, base: Path):
    try:
        return Path(os.path.relpath(_norm(p), _norm(base)))
    except ValueError:  # 다른 드라이브
        return None


def check(tool_name, tool_input, cwd, active=None):
    """('allow'|'deny'|'ask', 사유)를 반환."""
    r = common.root()
    clients = r / "clients"
    if active is None:
        active = common.get_active()

    if tool_name == "Bash":
        return _check_bash(tool_input.get("command", ""), active)

    key = PATH_TOOLS.get(tool_name)
    if not key:
        return "allow", ""
    raw = tool_input.get(key) or (cwd if tool_name in ("Glob", "Grep") else "")
    if not raw:
        return "allow", ""
    p = _resolve(raw, cwd)
    rel = _rel(p, r)
    if rel is None or rel.parts[:1] == ("..",):
        return "allow", ""  # 프로젝트 밖 경로는 이 hook의 관할이 아님(일반 권한 흐름)

    parts = rel.parts
    if parts and parts[0] == "clients":
        if len(parts) == 1:
            if tool_name in ("Glob", "Grep"):
                return "deny", "clients/ 전체 검색은 여러 고객사 자료를 한꺼번에 읽게 됩니다. clients/<활성 client_id>/ 아래로 범위를 좁히세요."
            return "allow", ""
        cid = parts[1]
        if not common.ID_RE.match(cid):
            return "deny", f"'{cid}'는 유효한 client_id가 아닙니다."
        if active is None:
            return "deny", f"활성 고객사가 없습니다. `python scripts/session.py set {cid}` 로 먼저 고객사를 지정하세요."
        if cid != active:
            return "deny", f"활성 고객사는 '{active}'입니다. 다른 고객사('{cid}') 자료는 읽거나 쓸 수 없습니다. 고객사를 바꾸려면 새 세션에서 시작하세요."
        sub = parts[2:]
        if tool_name in WRITE_TOOLS:
            if sub[:2] == ("data", "raw"):
                return "deny", "data/raw/ 원본 데이터는 읽기 전용입니다. 가공본은 data/processed/ 에 저장하세요."
            if sub and sub[0] == "projects" and len(sub) >= 4 and sub[2] in common.VERSIONED_DIRS and p.exists():
                return "deny", "기존 산출물은 덮어쓰거나 수정하지 않습니다. `python scripts/save_version.py next ...` 로 다음 버전 경로를 받아 새 파일로 저장하세요."
        return "allow", ""

    if parts == () and tool_name in ("Glob", "Grep"):
        if tool_name == "Glob":
            segs = tool_input.get("pattern", "").replace("\\", "/").split("/")
            if len(segs) > 1 and (re.search(r"[*?\[{]", segs[0]) or segs[0] == "clients"):
                return "deny", "루트에서 `**` 같은 와일드카드로 시작하는 검색은 clients/ 의 여러 고객사 자료를 포함합니다. agency/, docs/ 처럼 폴더를 명시하거나 clients/<활성 client_id>/ 로 좁히세요."
        else:
            g = tool_input.get("glob", "").replace("\\", "/")
            if not g or g.startswith(("**", "*/", "clients")) or re.match(r"^[*?\[{]", g):
                return "deny", "루트 전체 내용 검색은 clients/ 의 여러 고객사 자료를 포함합니다. path 를 agency/ 또는 clients/<활성 client_id>/ 로 지정하세요."

    if tool_name in WRITE_TOOLS and parts and (parts[0] in (".claude", "scripts") or parts[0] == "CLAUDE.md"):
        return "ask", "에이전트·권한·hook·스크립트 정의를 바꾸려는 시도입니다. 직접 확인 후 승인하세요."
    return "allow", ""


def _check_bash(cmd, active):
    ids = set(BASH_CLIENT_RE.findall(cmd))
    for cid in ids:
        if not common.ID_RE.match(cid):
            return "deny", f"명령에 유효하지 않은 client 경로('{cid}')가 있습니다."
        if active is None:
            return "deny", "활성 고객사가 없는 상태에서 clients/ 경로를 사용할 수 없습니다. 먼저 session.py set 을 실행하세요."
        if cid != active:
            return "deny", f"활성 고객사는 '{active}'입니다. 다른 고객사('{cid}') 경로는 명령에 쓸 수 없습니다."
    if "clients" in cmd and re.search(r"(^|[/\\\s\"'])\.\.([/\\\s\"']|$)", cmd):
        return "deny", "clients/ 경로가 포함된 명령에서 상위 경로 이동('..')은 허용하지 않습니다."
    if re.search(r"session\.py\s+clear", cmd):
        return "deny", "활성 고객사 해제는 사람이 터미널에서 직접 실행해야 합니다."
    if "data/raw" in cmd.replace("\\", "/") and WRITEY_RE.search(cmd):
        return "deny", "data/raw/ 원본은 읽기 전용입니다(수정·삭제·이동·리다이렉션 의심 명령)."
    return "allow", ""


def main():
    try:
        data = json.load(sys.stdin)
        decision, reason = check(data.get("tool_name", ""), data.get("tool_input") or {}, data.get("cwd", ""))
    except Exception as e:  # fail-closed
        print(f"guard_paths 오류로 안전하게 차단합니다: {e}", file=sys.stderr)
        return 2
    if decision == "deny":
        print(f"[고객사 경계 장치] {reason}", file=sys.stderr)
        return 2
    if decision == "ask":
        print(json.dumps({"hookSpecificOutput": {"hookEventName": "PreToolUse",
                                                  "permissionDecision": "ask",
                                                  "permissionDecisionReason": reason}}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
