"""브라우저에서 /명령을 입력하고 결과를 보는 로컬 웹앱. 표준 라이브러리만 사용한다.

  py -3 scripts/webapp.py            # http://127.0.0.1:8765 (이 PC 안에서만 접속 가능)
  py -3 scripts/webapp.py --port 9000 --no-open

동작: 폼 입력 → `claude -p`(헤드리스)로 같은 /명령 실행 → 진행 로그·결과를 화면에 표시.
외부 발송·게시·광고 집행은 하지 않는다. 승인/피드백 확정은 화면에서 사용자가 이름을 적고 직접 누른다.
고객사 경계는 CLAUDE.md·hook 과 같은 '실수 방지 장치'이며 보안 경계가 아니다(docs/limitations.md).
"""
import argparse
import datetime
import json
import mimetypes
import re
import secrets
import shutil
import subprocess
import sys
import threading
import time
import webbrowser
from decimal import Decimal
from types import SimpleNamespace
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

sys.path.insert(0, str(Path(__file__).resolve().parent))
import common  # noqa: E402
import feedback  # noqa: E402
import ad_report  # noqa: E402
import scaffold  # noqa: E402
import status  # noqa: E402
from common import AgencyError  # noqa: E402

ROOT = common.root()
WEB = ROOT / "web"
TOKEN = secrets.token_urlsafe(24)
PORT = 8765
AREAS = ("deliverables", "review", "research", "production")
READABLE_EXT = {".md", ".csv", ".json", ".txt"}
ALLOWED_TOOLS = ["Bash(py -3 scripts/*)", "Bash(python scripts/*)", "Bash(python3 scripts/*)"]
DENIED_TOOLS = ["Bash(curl *)", "Bash(wget *)", "Bash(git push *)", "Read(.env)", "Read(**/.env)"]

# 명령 정의: 필드 이름 → (필수 여부, 검증 정규식). 값 검증은 서버에서도 한다.
RE_CHANNEL = re.compile(r"^[a-z0-9][a-z0-9-]{1,40}$")
RE_PERIOD = re.compile(r"^\d{4}-\d{2}(-\d{2})?(~\d{4}-\d{2}-\d{2})?$")
RE_SELECT = re.compile(r"^([A-Za-z]|위임)$")
RE_FILE = re.compile(r"^[\w가-힣./ -]{1,120}$")
COMMANDS = {
    "new-client": [("name", False)],
    "copy": [("client", True), ("channel", True), ("project", False)],
    "report": [("client", True), ("period", True), ("project", False)],
    "meeting": [("client", True), ("project", True), ("file", False)],
    "video": [("client", True), ("project", True), ("selection", False)],
    "shoot-plan": [("client", True), ("project", True)],
    "onset": [("client", True), ("project", True), ("situation", True)],
}


def clean_text(v, limit):
    v = re.sub(r"[\x00-\x1f\x7f]+", " ", str(v or "")).replace('"', "'").strip()
    return v[:limit]


def check_field(name, value, client):
    if name in ("client", "project"):
        return common.validate_id(value, name + "_id")
    if name == "channel":
        if not RE_CHANNEL.match(value):
            raise AgencyError("채널 값은 영문 소문자·숫자·하이픈이어야 합니다(예: instagram-feed).")
    elif name == "period":
        if not RE_PERIOD.match(value):
            raise AgencyError("기간은 2026-09 또는 2026-09-01~2026-09-14 형식이어야 합니다.")
    elif name == "selection":
        if not RE_SELECT.match(value):
            raise AgencyError("컨셉 선택은 A/B/C 같은 한 글자 또는 '위임' 이어야 합니다.")
    elif name == "file":
        p = Path(value)
        if not RE_FILE.match(value) or p.is_absolute() or ".." in p.parts or ":" in value:
            raise AgencyError("회의록 파일은 고객사 폴더 안의 상대 경로여야 합니다(예: inbox/meeting.md).")
        target = (common.client_dir(client) / p).resolve()
        if common.client_dir(client).resolve() not in target.parents or not target.is_file():
            raise AgencyError(f"회의록 파일을 찾을 수 없습니다: {value}")
    return value


def build_prompt(cmd, fields):
    spec = COMMANDS.get(cmd)
    if spec is None:
        raise AgencyError(f"알 수 없는 명령 '{cmd}'.")
    client = clean_text(fields.get("client"), 40)
    parts = []
    for name, required in spec:
        raw = fields.get(name)
        if name in ("situation", "name"):
            v = clean_text(raw, 500 if name == "situation" else 60)
        else:
            v = clean_text(raw, 120)
        if not v:
            if required:
                raise AgencyError(f"'{name}' 항목을 입력하세요.")
            continue
        check_field(name, v, client)
        parts.append(f'"{v}"' if name in ("situation", "name", "file") and " " in v else v)
    return "/" + cmd + (" " + " ".join(parts) if parts else ""), client


# ---------- 작업(헤드리스 Claude Code 실행) ----------

class Job:
    def __init__(self, label, client):
        self.id = secrets.token_hex(4)
        self.label, self.client = label, client
        self.session_id = None
        self.events, self.lock = [], threading.Lock()
        self.state = "running"  # running | done | error | cancelled
        self.proc = None
        self.role_ids = {}

    def push(self, **ev):
        with self.lock:
            ev["i"] = len(self.events)
            self.events.append(ev)


JOB = None
JOB_LOCK = threading.Lock()


def tool_summary(name, inp):
    if name == "Bash":
        return clean_text(inp.get("command"), 140)
    if name in ("Read", "Write", "Edit"):
        return clean_text(inp.get("file_path"), 140)
    if name in ("Glob", "Grep"):
        return clean_text(inp.get("pattern"), 100)
    return ""


def pump(job, proc):
    """stream-json 한 줄씩 읽어 화면용 이벤트로 바꾼다."""
    try:
        for raw in proc.stdout:
            line = raw.decode("utf-8", "replace").strip()
            if not line.startswith("{"):
                continue
            try:
                m = json.loads(line)
            except ValueError:
                continue
            t = m.get("type")
            if m.get("session_id"):
                job.session_id = m["session_id"]
            sub = bool(m.get("parent_tool_use_id"))
            if t == "assistant" and not sub:
                for b in (m.get("message") or {}).get("content") or []:
                    if b.get("type") == "text" and b.get("text", "").strip():
                        job.push(k="text", text=b["text"])
                    elif b.get("type") == "tool_use":
                        inp = b.get("input") or {}
                        if b.get("name") in ("Agent", "Task"):
                            job.role_ids[b["id"]] = inp.get("subagent_type") or "agent"
                            job.push(k="role", id=b["id"], role=inp.get("subagent_type") or "agent",
                                     desc=clean_text(inp.get("description"), 80))
                        else:
                            job.push(k="tool", name=b.get("name"), detail=tool_summary(b.get("name"), inp))
            elif t == "user" and not sub:
                content = (m.get("message") or {}).get("content")
                for b in content if isinstance(content, list) else []:
                    if b.get("type") == "tool_result" and b.get("tool_use_id") in job.role_ids:
                        job.push(k="role_done", id=b["tool_use_id"], error=bool(b.get("is_error")))
            elif t == "result":
                denials = [d.get("tool_name") for d in m.get("permission_denials") or []]
                job.push(k="result", text=m.get("result") or "", error=bool(m.get("is_error")),
                         cost=m.get("total_cost_usd"), turns=m.get("num_turns"), denials=denials)
                job.state = "error" if m.get("is_error") else "done"
        proc.wait()
        err = proc.stderr.read().decode("utf-8", "replace").strip() if proc.stderr else ""
        if job.state == "running":
            job.state = "cancelled" if getattr(job, "cancelled", False) else "error"
            job.push(k="result", text=err or "작업이 결과 없이 종료되었습니다.", error=job.state == "error",
                     cost=None, turns=None, denials=[])
        elif err and "not been trusted" in err:
            job.push(k="notice", text="이 폴더가 아직 신뢰(trust)되지 않아 일부 허용 규칙이 무시되었습니다. README의 '처음 시작'을 확인하세요.")
    except Exception as e:  # 화면에 사유를 남기고 종료
        job.state = "error"
        job.push(k="result", text=f"실행 중 오류: {e}", error=True, cost=None, turns=None, denials=[])


def start_job(prompt, label, client, session_id=None):
    global JOB
    exe = shutil.which("claude")
    if not exe:
        raise AgencyError("claude 명령을 찾을 수 없습니다. Claude Code 를 설치하고 터미널에서 `claude` 가 실행되는지 확인하세요.")
    with JOB_LOCK:
        if JOB and JOB.state == "running":
            raise AgencyError("다른 작업이 진행 중입니다. 끝나길 기다리거나 '중단'을 누르세요.")
        job = Job(label, client)
        job.session_id = session_id
        job.push(k="user", text=prompt)
        cmd = [exe, "-p", "--output-format", "stream-json", "--verbose", "--permission-mode", "acceptEdits"]
        if session_id:
            cmd += ["--resume", session_id]
        cmd += ["--disallowedTools", *DENIED_TOOLS, "--allowedTools", *ALLOWED_TOOLS]
        job.proc = subprocess.Popen(cmd, cwd=str(ROOT), stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                                    stderr=subprocess.PIPE)
        job.proc.stdin.write(prompt.encode("utf-8"))
        job.proc.stdin.close()
        threading.Thread(target=pump, args=(job, job.proc), daemon=True).start()
        JOB = job
        return job


# ---------- 파일 조회 ----------

def need_active():
    c = common.get_active()
    if not c:
        raise AgencyError("먼저 고객사를 선택하세요.")
    return c


def list_clients():
    out = []
    root = common.clients_root()
    if root.is_dir():
        for d in sorted(root.iterdir()):
            if d.is_dir() and common.ID_RE.match(d.name):
                name = common.display_name(common.read_brand(d.name)) or d.name
                out.append({"id": d.name, "name": name})
    return out


def list_projects(client):
    out = []
    base = common.client_dir(client) / "projects"
    if base.is_dir():
        for d in sorted(base.iterdir()):
            if not d.is_dir() or not common.ID_RE.match(d.name):
                continue
            st = {}
            f = d / "status.json"
            if f.exists():
                try:
                    st = json.loads(f.read_text(encoding="utf-8"))
                except ValueError:
                    pass
            out.append({"id": d.name, "name": st.get("name") or d.name, "stage": st.get("stage"),
                        "selected": (st.get("selected_concept") or {}).get("id")})
    return out


def list_inputs(client):
    out = {"raw": [], "inbox": []}
    for key, sub in (("raw", "data/raw"), ("inbox", "inbox")):
        d = common.client_dir(client) / sub
        if d.is_dir():
            out[key] = sorted(p.name if key == "raw" else f"inbox/{p.name}" for p in d.iterdir() if p.is_file())
    return out


def list_deliverables(client, project):
    pdir = common.project_dir(client, project)
    states = {}
    f = pdir / "status.json"
    if f.exists():
        states = json.loads(f.read_text(encoding="utf-8")).get("deliverables", {})
    items = []
    for area in AREAS:
        d = pdir / area
        if not d.is_dir():
            continue
        for p in d.iterdir():
            if p.is_file() and p.suffix in READABLE_EXT:
                s = states.get(p.name) or {}
                items.append({"area": area, "name": p.name, "state": s.get("state"), "by": s.get("by"), "at": s.get("at"), "note": s.get("note"),
                              "mtime": int(p.stat().st_mtime)})
    items.sort(key=lambda x: -x["mtime"])
    return items


def read_file(client, project, area, name):
    if area not in AREAS or "/" in name or "\\" in name or Path(name).suffix not in READABLE_EXT:
        raise AgencyError("열 수 없는 파일입니다.")
    p = (common.project_dir(client, project) / area / name).resolve()
    if p.parent != (common.project_dir(client, project) / area).resolve() or not p.is_file():
        raise AgencyError("파일을 찾을 수 없습니다.")
    return p.read_text(encoding="utf-8", errors="replace")


def channels():
    f = ROOT / "agency" / "knowledge" / "channel-specs.json"
    try:
        return [{"id": s["channel"], "verified": s.get("status") == "verified"}
                for s in json.loads(f.read_text(encoding="utf-8")).get("specs", [])]
    except (OSError, ValueError):
        return []


# ---------- 고객사 라이브러리 (레퍼런스·경쟁사·검색 키워드) ----------
# 사용자가 직접 모으는 참고 자료. clients/{id}/library/library.json 한 곳에만 저장한다.
# 외부 서비스에서 자동으로 가져오지 않으며, 수치(검색량·CPC 등)는 저장하지 않는다.
LIB_KINDS = {
    "references": {"title": (80, True), "url": (300, False), "brand": (60, False), "board": (40, False), "note": (300, False)},
    "competitors": {"brand": (60, True), "url": (300, False), "channel": (40, False), "note": (300, False)},
    "keywords": {"keyword": (60, True), "type": (10, False), "note": (200, False)},
    "events": {"date": (10, True), "title": (80, True), "type": (10, False), "channel": (40, False), "note": (200, False),
               "role": (2, False), "link": (300, False)},
    "requests": {"title": (100, True), "channel": (10, False), "role": (2, False), "due": (10, False),
                 "priority": (10, False), "received": (10, False)},
    "issues": {"date": (10, True), "type": (20, True), "content": (200, True), "action": (200, False)},
}
REQ_CHANNELS = ("메일", "카톡", "미팅", "기타")
REQ_STATUS = ("배정", "진행 중", "클로즈")
ISSUE_TYPES = ("일정 딜레이", "소재 리젝", "성과 이상", "매체 정책·계정", "클라이언트 클레임")
ISSUE_STATUS = ("해결", "조치 중", "미해결")
UPDATABLE = {"requests": ("status", "role", "due", "priority"), "issues": ("status", "action"), "events": ("link", "role", "wait")}
EVENT_TYPES = ("콘텐츠", "기획", "촬영", "회의", "기타")
KEYWORD_TYPES = ("브랜드", "경쟁사", "일반")
LIB_MAX = 300
LIB_LOCK = threading.Lock()


def lib_file(client):
    return common.client_dir(client) / "library" / "library.json"


def lib_load(client):
    out = {k: [] for k in LIB_KINDS}
    try:
        data = json.loads(lib_file(client).read_text(encoding="utf-8"))
        for k in out:
            if isinstance(data.get(k), list):
                out[k] = data[k]
    except (OSError, ValueError):
        pass
    return out


def lib_change(client, kind, op, item, item_id):
    if kind not in LIB_KINDS:
        raise AgencyError("알 수 없는 자료 종류입니다.")
    with LIB_LOCK:
        data = lib_load(client)
        rows = data[kind]
        if op == "delete":
            data[kind] = [r for r in rows if r.get("id") != item_id]
        elif op == "add":
            if len(rows) >= LIB_MAX:
                raise AgencyError(f"한 종류에 최대 {LIB_MAX}개까지 저장할 수 있습니다.")
            row = {}
            for name, (limit, required) in LIB_KINDS[kind].items():
                v = clean_text((item or {}).get(name), limit)
                if required and not v:
                    raise AgencyError("필수 항목을 입력하세요.")
                if name in ("url", "link") and v and not re.match(r"^https?://\S+$", v):
                    raise AgencyError("링크는 http:// 또는 https:// 로 시작해야 합니다.")
                if name == "type" and kind == "keywords":
                    v = v or "일반"
                    if v not in KEYWORD_TYPES:
                        raise AgencyError("키워드 유형은 브랜드/경쟁사/일반 중 하나입니다.")
                if name == "type" and kind == "events":
                    v = v or "기타"
                    if v not in EVENT_TYPES:
                        raise AgencyError("일정 유형은 콘텐츠/기획/촬영/회의/기타 중 하나입니다.")
                if kind == "requests":
                    if name == "channel":
                        v = v or "기타"
                        if v not in REQ_CHANNELS:
                            raise AgencyError("채널은 메일/카톡/미팅/기타 중 하나입니다.")
                    if name == "priority":
                        v = v or "Normal"
                        if v not in ("High", "Normal"):
                            raise AgencyError("우선순위는 High 또는 Normal 입니다.")
                    if name == "received":
                        v = v or common.today_kst().isoformat()
                if kind == "issues" and name == "type" and v not in ISSUE_TYPES:
                    raise AgencyError("이슈 유형이 올바르지 않습니다.")
                if name == "role" and v and v not in ROLE_CODES:
                    raise AgencyError("역할 코드는 AE/AP/CW/AD/PD/MP 중 하나입니다.")
                if name in ("date", "due", "received") and v:
                    try:
                        datetime.date.fromisoformat(v)
                    except ValueError:
                        raise AgencyError("날짜는 2026-10-23 형식이어야 합니다.")
                row[name] = v
            if kind == "keywords" and any(r.get("keyword", "").lower() == row["keyword"].lower() for r in rows):
                raise AgencyError("이미 등록된 키워드입니다.")
            row["id"] = secrets.token_hex(4)
            row["added"] = common.today_kst().isoformat()
            if kind == "events":
                row["done"] = False
            if kind == "requests":
                row["status"] = "배정"
            if kind == "issues":
                row["status"] = "미해결"
            rows.append(row)
        elif op == "update" and kind in UPDATABLE:
            hit = next((r for r in rows if r.get("id") == item_id), None)
            if not hit:
                raise AgencyError("항목을 찾을 수 없습니다.")
            today_s = common.today_kst().isoformat()
            for k, v in (item or {}).items():
                if k not in UPDATABLE[kind]:
                    raise AgencyError("바꿀 수 없는 항목입니다.")
                if k == "wait":
                    hit["wait"] = bool(v)
                    continue
                v = clean_text(v, 300 if k == "link" else 200)
                if k == "status":
                    if v not in (REQ_STATUS if kind == "requests" else ISSUE_STATUS):
                        raise AgencyError("상태 값이 올바르지 않습니다.")
                    if kind == "requests":
                        hit["closed_at"] = today_s if v == "클로즈" else ""
                elif k == "role" and v and v not in ROLE_CODES:
                    raise AgencyError("역할 코드는 AE/AP/CW/AD/PD/MP 중 하나입니다.")
                elif k == "priority" and v not in ("High", "Normal"):
                    raise AgencyError("우선순위는 High 또는 Normal 입니다.")
                elif k == "due" and v:
                    try:
                        datetime.date.fromisoformat(v)
                    except ValueError:
                        raise AgencyError("날짜는 2026-10-23 형식이어야 합니다.")
                elif k == "link" and v and not re.match(r"^https?://\S+$", v):
                    raise AgencyError("링크는 http:// 또는 https:// 로 시작해야 합니다.")
                hit[k] = v
                if kind == "events" and k == "link" and v and not hit.get("done"):
                    hit["done"], hit["done_at"] = True, today_s  # 링크를 등록했다 = 포스팅 확인
        elif op == "toggle" and kind == "events":
            hit = next((r for r in rows if r.get("id") == item_id), None)
            if not hit:
                raise AgencyError("일정을 찾을 수 없습니다.")
            hit["done"] = not hit.get("done")
            hit["done_at"] = common.today_kst().isoformat() if hit["done"] else ""
        else:
            raise AgencyError("알 수 없는 요청입니다.")
        f = lib_file(client)
        f.parent.mkdir(parents=True, exist_ok=True)
        tmp = f.with_suffix(".tmp")
        tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        tmp.replace(f)
        return data


ROLE_CODES = ("AE", "AP", "CW", "AD", "PD", "MP")
# 일정 유형 -> 담당 역할 코드(배정 정보가 따로 없으므로 유형으로 추정해 표시한다)
EVENT_ROLE = {"콘텐츠": "AE", "기획": "AP", "촬영": "PD", "회의": "AE"}
PHASES = ("Brief", "Concept", "Production", "Review", "Confirm", "Report")
STAGE_PHASE = {"brief": 1, "concepts": 2, "selected": 2, "script": 3, "storyboard": 3, "shoot_plan": 3}


SETTINGS_FILE = common.root() / ".agency-state" / "settings.json"


def read_settings():
    try:
        d = json.loads(SETTINGS_FILE.read_text(encoding="utf-8"))
        return d if isinstance(d, dict) else {}
    except (OSError, ValueError):
        return {}


BUDDY_SIZES = ("small", "normal", "large")


def buddy_size():
    v = read_settings().get("buddy_size")
    return v if v in BUDDY_SIZES else "small"


def write_settings(rep_name=None, size=None):
    """대표 이름(컨펌·수정 요청자)·버디 크기. .agency-state/ 는 버전 관리에서 제외된다."""
    d = read_settings()
    if rep_name is not None:
        d["rep_name"] = clean_text(rep_name, 40)
    if size is not None:
        if size not in BUDDY_SIZES:
            raise AgencyError("버디 크기는 작게/보통/크게 중 하나입니다.")
        d["buddy_size"] = size
    SETTINGS_FILE.parent.mkdir(parents=True, exist_ok=True)
    tmp = SETTINGS_FILE.with_suffix(".tmp")
    tmp.write_text(json.dumps(d, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp.replace(SETTINGS_FILE)
    return d


def write_team(client, team):
    if not isinstance(team, dict):
        raise AgencyError("담당자 형식이 올바르지 않습니다.")
    out = {}
    for code in ROLE_CODES:
        v = clean_text(team.get(code), 40)
        if v:
            out[code] = v
    f = common.client_dir(client) / "team.json"
    tmp = f.with_suffix(".tmp")
    tmp.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp.replace(f)
    return out


def all_events():
    """메인 화면용 통합 일정(읽기 전용). 일정 표시에 필요한 항목만 내보내고 메모는 제외한다."""
    out = []
    for c in list_clients():
        for e in lib_load(c["id"])["events"]:
            if not e.get("date") or not e.get("title"):
                continue
            out.append({"client": c["id"], "brand": c["name"], "id": e.get("id"), "date": e["date"], "title": e["title"],
                        "type": e.get("type") or "기타", "channel": e.get("channel") or "", "done": bool(e.get("done")),
                        "role": e.get("role") or EVENT_ROLE.get(e.get("type") or "기타", ""), "sample": bool(e.get("sample")),
                        "link": e.get("link") or ""})
    return out


BRIEF_FIELDS = ("목적", "타깃", "제품·서비스", "핵심 메시지", "채널", "일정(마감)", "예산", "필수 문구", "금지 표현", "KPI 정의")


def brief_file(client):
    return common.project_dir(client, "general") / "brief.md"


def read_brief(client):
    """projects/general/brief.md 의 '- 항목: 값' 줄을 읽는다. 미정이면 빈 문자열."""
    try:
        text = brief_file(client).read_text(encoding="utf-8")
    except OSError:
        return {k: "" for k in BRIEF_FIELDS}
    out = {}
    for k in BRIEF_FIELDS:
        m = re.search(r"^- " + re.escape(k) + r":[ \t]*(.*)$", text, re.M)
        v = m.group(1).strip() if m else ""
        out[k] = "" if v in ("", "미정") else v
    return out


def write_brief(client, fields):
    f = brief_file(client)
    text = f.read_text(encoding="utf-8")
    for k in BRIEF_FIELDS:
        v = clean_text((fields or {}).get(k), 200).replace("\n", " ") or "미정"
        text = re.sub(r"^(- " + re.escape(k) + r":)[ \t]*.*$", lambda m, v=v: f"{m.group(1)} {v}", text, count=1, flags=re.M)
    tmp = f.with_suffix(".tmp")
    tmp.write_text(text, encoding="utf-8")
    tmp.replace(f)
    return read_brief(client)


def new_account(account_id, name):
    """새 어카운트 폴더를 만든다(scaffold). 이미 열린 어카운트가 없을 때만 바로 세션에 연다."""
    account_id = clean_text(account_id, 32).lower()
    common.validate_id(account_id, "client_id")
    name = clean_text(name, 40)
    if not name:
        raise AgencyError("표시명을 입력하세요.")
    if (common.clients_root() / account_id).exists():
        raise AgencyError("이미 있는 어카운트 ID입니다. 다른 ID를 쓰세요.")
    scaffold.make_client(account_id, name)
    opened = False
    if not common.get_active():
        common.set_active(account_id)
        opened = True
    return {"id": account_id, "opened": opened}


BUDDY_CHARS = ("leo", "luna", "momo", "doyun", "haru", "jun")


def read_buddy(client, index=0):
    """clients/{id}/buddy.json -> {"char": "momo"}. 지정이 없으면 어카운트 순서대로 기본 캐릭터."""
    try:
        d = json.loads((common.client_dir(client) / "buddy.json").read_text(encoding="utf-8"))
        if isinstance(d, dict) and d.get("char") in BUDDY_CHARS:
            return d["char"], True
    except (OSError, ValueError):
        pass
    return BUDDY_CHARS[index % len(BUDDY_CHARS)], False


def write_buddy(client, char):
    if char not in BUDDY_CHARS:
        raise AgencyError("알 수 없는 캐릭터입니다.")
    f = common.client_dir(client) / "buddy.json"
    tmp = f.with_suffix(".tmp")
    tmp.write_text(json.dumps({"char": char}, ensure_ascii=False), encoding="utf-8")
    tmp.replace(f)
    return char


def read_team(client):
    """clients/{id}/team.json ({"AE": "이름", ...}). 파일이 없으면 모두 미배정."""
    try:
        data = json.loads((common.client_dir(client) / "team.json").read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}
    return {k: str(v)[:40] for k, v in data.items() if k in ROLE_CODES and v} if isinstance(data, dict) else {}


def account_summary(c, today):
    """어카운트 카드용 요약. 상태 파일·일정에서 계산한 값만 쓰고, 근거가 없으면 None."""
    cid = c["id"]
    name, _, note = c["name"].partition(" (")
    projects, pending, stale, active_work, report_done, stage_no, n_deliv = 0, 0, 0, 0, False, 1, 0
    pdir = common.client_dir(cid) / "projects"
    if pdir.is_dir():
        for d in sorted(pdir.iterdir()):
            f = d / "status.json"
            if not f.is_file():
                continue
            try:
                st = json.loads(f.read_text(encoding="utf-8"))
            except ValueError:
                continue
            projects += 1
            stage_no = max(stage_no, STAGE_PHASE.get(st.get("stage"), 1))
            for fname, ds in (st.get("deliverables") or {}).items():
                n_deliv += 1
                state = (ds or {}).get("state")
                if state == "review_passed":
                    pending += 1
                    at = str((ds or {}).get("at") or "")[:10]
                    if at and at < (today - datetime.timedelta(days=2)).isoformat():
                        stale += 1
                elif state in ("draft", "needs_revision"):
                    active_work += 1
                elif state == "approved" and fname.lower().startswith("report"):
                    report_done = True
    phase_no = 6 if report_done else 5 if pending else 4 if active_work else stage_no
    lib = lib_load(cid)
    evs = [e for e in lib["events"] if e.get("date") and e.get("title")]
    t = today.isoformat()
    mon = today - datetime.timedelta(days=today.weekday())
    wk = (mon.isoformat(), (mon + datetime.timedelta(days=6)).isoformat())
    posts = [e for e in evs if e.get("type") == "콘텐츠" and wk[0] <= e["date"] <= wk[1]]
    overdue = [e for e in evs if e.get("type") == "콘텐츠" and not e.get("done") and e["date"] < t]
    req_late = [r for r in lib["requests"] if r.get("status") != "클로즈" and r.get("due") and r["due"] < t]
    nxt = sorted((e for e in evs if not e.get("done") and e["date"] >= t), key=lambda e: (e["date"], e["title"]))
    # 상태 규칙: Delayed(딜레이 1건 이상) > At Risk(2일 넘게 컨펌 대기) > On Track. Onboarding 은 일정도 결과물도 하나도 없을 때만.
    if not evs and not n_deliv and not lib["requests"] and not lib["issues"]:
        status = "Onboarding"
    elif overdue or req_late:
        status = "Delayed"
    elif stale:
        status = "At Risk"
    else:
        status = "On Track"
    month_cost = None
    try:
        mrows = [r for r in perf_load(cid)[0] if r["date"].strftime("%Y-%m") == today.strftime("%Y-%m")]
        if mrows:
            month_cost = _f(sum((r["cost"] for r in mrows), Decimal(0)))
    except (AgencyError, OSError):
        pass
    return {"id": cid, "name": name, "note": note.rstrip(")"), "month_cost": month_cost, "status": status, "phase": PHASES[phase_no - 1],
            "phase_no": phase_no, "pending": pending, "overdue": len(overdue) + len(req_late),
            "overdue_posts": len(overdue), "overdue_req": len(req_late),
            "post_done": sum(1 for e in posts if e.get("done")), "post_total": len(posts), "projects": projects,
            "team": read_team(cid), "next": ({"date": nxt[0]["date"], "title": nxt[0]["title"]} if nxt else None)}


def accounts_overview():
    today = common.today_kst()
    mon = today - datetime.timedelta(days=today.weekday())
    return {"today": today.isoformat(), "week": [mon.isoformat(), (mon + datetime.timedelta(days=6)).isoformat()],
            "accounts": [dict(account_summary(c, today), **dict(zip(("char", "char_set"), read_buddy(c["id"], i))))
                         for i, c in enumerate(list_clients())], "events": all_events()}



# ---------- Performance (data/raw 의 CSV·XLSX 를 ad_report 의 함수로 계산한다. 새 계산식을 만들지 않는다) ----------

RAW_EXT = (".csv", ".xlsx", ".xlsm")
MEDIA_LABEL = {"google-ads": "Google Ads", "google-analytics": "Google Analytics", "meta": "Meta 광고"}


def platform_of(channel):
    c = (channel or "").lower()
    if "google" in c or "구글" in c:
        return "google-ads"
    if any(k in c for k in ("meta", "facebook", "instagram", "페이스북", "메타", "인스타")):
        return "meta"
    return "other"


def perf_load(client):
    rawdir = common.client_dir(client) / "data" / "raw"
    rows, issues, has_rev, errors, files = [], [], False, [], []
    if rawdir.is_dir():
        for f in sorted(rawdir.iterdir()):
            if not f.is_file() or f.suffix.lower() not in RAW_EXT:
                continue
            try:
                good, iss, h = ad_report.clean(ad_report.read_table(f))
            except AgencyError as e:
                errors.append({"file": f.name, "error": str(e)})
                continue
            files.append(f.name)
            rows += good
            issues += [dict(i, file=f.name) for i in iss]
            has_rev = has_rev or h
    return rows, issues, has_rev, errors, files


def _f(v):
    return float(v) if v is not None else None


def _tot(rows, has_rev):
    t = ad_report.aggregate(rows, has_rev)
    m, na = ad_report.metrics(t, has_rev)
    return ({k: (_f(v) if isinstance(v, Decimal) else v) for k, v in t.items()}, {k: ad_report.q(v) for k, v in m.items()}, na)


def performance(client, start, end, off=()):
    rows, issues, has_rev, errors, files = perf_load(client)
    for r in rows:
        r["media"] = platform_of(r["channel"])
    present = sorted({r["media"] for r in rows})
    rows = [r for r in rows if r["media"] not in off]
    days = (end - start).days + 1
    pe = start - datetime.timedelta(days=1)
    ps = pe - datetime.timedelta(days=days - 1)
    a = SimpleNamespace(start=start.isoformat(), end=end.isoformat(), prev_start=ps.isoformat(), prev_end=pe.isoformat(),
                        currency="KRW", tax="unknown", tz="Asia/Seoul", attribution="unknown", conversion_def="unknown",
                        finalized="unknown", as_of=None)
    res = ad_report.build(rows, has_rev, issues, a)
    cur = ad_report.period_rows(rows, start, end)
    cur_media = {}
    for r in cur:
        cur_media.setdefault(r["media"], []).append(r)

    def group(kind):
        def key(d):
            if kind == "day":
                return d.isoformat()
            if kind == "week":
                return (d - datetime.timedelta(days=d.weekday())).isoformat()
            return d.strftime("%Y-%m")
        keys, by = set(), {}
        for m, rs in cur_media.items():
            buckets = {}
            for r in rs:
                buckets.setdefault(key(r["date"]), []).append(r)
            by[m] = {}
            for k, b in buckets.items():
                t = ad_report.aggregate(b, has_rev)
                by[m][k] = {n: _f(t[n]) for n in ("impressions", "clicks", "cost", "conversions")}
                keys.add(k)
        return {"keys": sorted(keys), "by": by}
    camp = {}
    for r in cur:
        camp.setdefault((r["media"], r["channel"], r["campaign"]), []).append(r)
    campaigns = []
    for (m, ch, cp), rs in sorted(camp.items()):
        t, mt, _ = _tot(rs, has_rev)
        campaigns.append({"media": m, "channel": ch, "campaign": cp, "totals": t, "metrics": mt})
    media = []
    for m in sorted(set(present) | set(MEDIA_LABEL)):
        rs = [r for r in rows if r["media"] == m and start <= r["date"] <= end]
        media.append({"id": m, "label": MEDIA_LABEL.get(m, "기타 채널"), "present": m in present,
                      "cost": _f(sum((r["cost"] for r in rs), Decimal(0))) if rs else None,
                      "clicks": _f(sum((r["clicks"] for r in rs), Decimal(0))) if rs else None})
    dates = [r["date"] for r in rows]
    comp = res.get("comparison")
    return {"period": res["period"], "files": files, "errors": errors, "has_files": bool(files),
            "data_range": [min(dates).isoformat(), max(dates).isoformat()] if dates else None,
            "has_rows": bool(cur), "totals": res["current"]["totals"], "metrics": res["current"]["metrics"],
            "na": res["current"]["na_reasons"], "deltas": (comp or {}).get("deltas"),
            "prev": ({"start": ps.isoformat(), "end": pe.isoformat()} if comp else None),
            "series": {g: group(g) for g in ("day", "week", "month")}, "campaigns": campaigns, "media": media,
            "warnings": res["warnings"], "limitations": res["limitations"],
            "excluded": issues[:20], "excluded_count": len(issues)}


def save_raw(client, name, b64):
    import base64
    import binascii
    name = re.sub(r"[^A-Za-z0-9._\-가-힣]", "_", Path(str(name or "")).name)[:60]
    if Path(name).suffix.lower() not in RAW_EXT:
        raise AgencyError("CSV 또는 XLSX 파일만 불러올 수 있습니다.")
    try:
        data = base64.b64decode(b64 or "", validate=True)
    except (binascii.Error, ValueError):
        raise AgencyError("파일 내용을 읽을 수 없습니다.")
    if not data or len(data) > 4_000_000:
        raise AgencyError("파일이 비었거나 4MB 보다 큽니다.")
    d = common.client_dir(client) / "data" / "raw"
    d.mkdir(parents=True, exist_ok=True)
    p, n = d / name, 1
    while p.exists():  # 원본은 덮어쓰지 않는다
        n += 1
        p = d / f"{Path(name).stem}-{n}{Path(name).suffix}"
    p.write_bytes(data)
    try:
        good, iss, _ = ad_report.clean(ad_report.read_table(p))
    except AgencyError:
        p.unlink()
        raise
    return {"name": p.name, "rows": len(good), "excluded": len(iss)}



# ---------- 버디 (docs/buddy-spec.md §4). 새 계산 없이 기존 데이터에서 알림 근거만 모은다. 근거가 없으면 알림도 없다. ----------

ROLE_TAB = {"AE": "account", "AP": "strategy", "CW": "copy", "AD": "art", "PD": "film", "MP": "performance"}
ISSUE_ROLE = {"성과 이상": "MP", "소재 리젝": "AD", "매체 정책·계정": "MP"}
LEVEL_ORDER = {"urgent": 0, "check": 1, "confirm": 2}


def role_of_file(name, area, stage):
    """결과물 파일 이름으로 역할을 추정한다(web/app.js 의 roleOfFile 과 같은 규칙)."""
    n = name.lower()
    if re.match(r"(copy|pdp)", n):
        return "CW"
    if n.startswith("report"):
        return "MP"
    if n.startswith("meeting"):
        return "AE"
    if re.match(r"(shoot|onset|storyboard|script)", n):
        return "PD"
    if re.match(r"(ad|kv|creative)", n):
        return "AD"
    if re.match(r"(video|concept|proposal|brief)", n) or area == "research":
        return "PD" if stage in ("script", "storyboard", "shoot_plan") else "AP"
    return ""


DOC_KIND = (("copy", "카피"), ("pdp", "상세페이지 카피"), ("report", "리포트"), ("meeting", "회의록"), ("video", "영상 기획안"),
            ("shoot", "촬영 계획"), ("onset", "현장 대응 기록"), ("storyboard", "콘티"), ("script", "스크립트"),
            ("concept", "컨셉안"), ("proposal", "제안서"), ("brief", "브리프"))


def human_doc(name):
    """파일 이름 대신 말풍선에 쓸 이름: report-20261025-v1.md -> 리포트 결과물."""
    n = name.lower()
    for k, v in DOC_KIND:
        if n.startswith(k):
            return f"{v} 결과물"
    return "결과물"


def _short(x, n=28):
    x = re.sub(r"\s+", " ", str(x or "")).strip().rstrip(".")
    return x if len(x) <= n else x[:n - 1] + "…"


def _quoted(x):
    return f"'{_short(x)}'"


def buddy_alerts(client, today):
    """말풍선 알림. text 는 캐릭터 말투 앞뒤에 붙일 한 문장(서술어까지), tag 는 말풍선 윗줄에만 쓰는 분류 라벨이다."""
    t = today.isoformat()
    tomorrow = (today + datetime.timedelta(days=1)).isoformat()
    lib = lib_load(client)
    out = []

    def add(level, kind, key, role, tag, text, tab, sub, sample=False, when=""):
        out.append({"id": f"{kind}:{key}", "level": level, "kind": kind, "role": role, "tag": tag, "text": text,
                    "tab": tab or ROLE_TAB.get(role, "overview"), "sub": sub, "sample": bool(sample), "when": when})

    for r in lib["requests"]:
        if r.get("status") == "클로즈":
            continue
        role, ttl = r.get("role") or "AE", _quoted(r.get("title"))
        if r.get("due") and r["due"] < t:
            add("urgent", "req-late", r.get("id"), role, "클라이언트 리퀘스트", f"{ttl} 리퀘스트 데드라인이 지났어요", "account", "req", r.get("sample"), r["due"])
        elif r.get("due") == tomorrow and r.get("status") == "진행 중":
            add("check", "req-soon", r.get("id"), role, "클라이언트 리퀘스트", f"{ttl} 리퀘스트 마감이 내일이에요", "account", "req", r.get("sample"), r["due"])
        if r.get("status") == "배정" and str(r.get("received") or "") >= (today - datetime.timedelta(days=1)).isoformat():
            add("confirm", "req-new", r.get("id"), role, "클라이언트 리퀘스트", f"{ttl} 요청이 새로 들어왔어요", "account", "req", r.get("sample"), r.get("received"))
    for e in lib["events"]:
        if e.get("type") != "콘텐츠" or e.get("done") or not e.get("date"):
            continue
        role, ttl = e.get("role") or EVENT_ROLE.get("콘텐츠", "AE"), _quoted(e.get("title"))
        if e["date"] < t:
            add("urgent", "post-late", e.get("id"), role, "포스팅", f"{ttl} 포스팅일이 지났는데 아직 올린 기록이 없어요", "account", "cal", e.get("sample"), e["date"])
        elif e["date"] == tomorrow and not e.get("wait"):
            add("check", "post-eve", e.get("id"), role, "포스팅", f"내일 올릴 {ttl}, 컨펌 표시가 아직이에요", "account", "cal", e.get("sample"), e["date"])
    for i in lib["issues"]:
        if i.get("status") == "미해결" and i.get("type") in ISSUE_ROLE:
            c = _short(i.get("content"), 40)
            # 문장으로 쓴 이슈(…해요/…이에요)는 그대로, 명사구로 쓴 이슈는 따옴표로 감싸 문장을 만든다
            text = c if re.search(r"(요|다|죠|네요)$", c) else f"'{c}' 건이 아직 해결되지 않았어요"
            add("urgent", "issue", i.get("id"), ISSUE_ROLE[i["type"]], f"이슈 · {i['type']}", text, "account", "issue", i.get("sample"), i.get("date"))
    # 컨펌 대기 결과물
    pend, stale = [], []
    pdir = common.client_dir(client) / "projects"
    if pdir.is_dir():
        for d in sorted(pdir.iterdir()):
            f = d / "status.json"
            if not f.is_file():
                continue
            try:
                st = json.loads(f.read_text(encoding="utf-8"))
            except ValueError:
                continue
            for name, ds in (st.get("deliverables") or {}).items():
                if (ds or {}).get("state") != "review_passed":
                    continue
                area = next((a for a in AREAS if (d / a / name).is_file()), "deliverables")
                item = {"name": name, "role": role_of_file(name, area, st.get("stage")) or "AE", "at": str((ds or {}).get("at") or "")[:10]}
                (stale if item["at"] and item["at"] < (today - datetime.timedelta(days=2)).isoformat() else pend).append(item)
    for it in stale:
        days = (today - datetime.date.fromisoformat(it["at"])).days
        add("check", "confirm-stale", it["name"], it["role"], "컨펌 대기", f"{human_doc(it['name'])} 컨펌이 {days}일째 기다리고 있어요", None, "", False, it["at"])
    if pend:
        first = pend[0]
        text = f"{human_doc(first['name'])} 컨펌이 기다리고 있어요" if len(pend) == 1 else f"컨펌을 기다리는 결과물이 {len(pend)}건 있어요"
        add("confirm", "confirm-new", "all", first["role"], "컨펌 대기", text, None, "", False, first["at"])
    out.sort(key=lambda a: (LEVEL_ORDER[a["level"]], a["when"] or "9999", a["id"]))
    return out


def buddy_state():
    today = common.today_kst()
    accounts = []
    for i, c in enumerate(list_clients()):
        char, char_set = read_buddy(c["id"], i)
        alerts = buddy_alerts(c["id"], today)
        state = "urgent" if any(a["level"] == "urgent" for a in alerts) else "alert" if alerts else "work"
        accounts.append({"id": c["id"], "name": c["name"].split(" (")[0], "char": char, "state": state, "alerts": alerts})
    return {"now": common.now_kst().isoformat(), "today": today.isoformat(), "size": buddy_size(), "accounts": accounts}


def buddy_running():
    try:
        return subprocess.run(["pgrep", "-f", "scripts/buddy.py"], capture_output=True).returncode == 0
    except OSError:
        return False


def launch_buddy():
    """바탕화면 버디 창(scripts/buddy.py)을 따로 띄운다. 이미 떠 있으면 다시 띄우지 않는다."""
    if buddy_running():
        return {"running": True, "started": False}
    log = common.root() / ".agency-state" / "buddy.log"
    log.parent.mkdir(parents=True, exist_ok=True)
    with open(log, "ab") as lf:
        proc = subprocess.Popen([sys.executable, str(common.root() / "scripts" / "buddy.py"), "--desktop-only", "--port", str(PORT)],
                                cwd=str(common.root()), stdout=lf, stderr=lf, start_new_session=True)
    time.sleep(1.5)
    if proc.poll() not in (None, 0):
        raise AgencyError("버디 창을 띄우지 못했어요. pywebview 설치를 확인하세요(.venv). 자세한 내용: .agency-state/buddy.log")
    return {"running": True, "started": True}


# ---------- HTTP ----------

class Handler(BaseHTTPRequestHandler):
    server_version = "AgencyWeb"

    def log_message(self, *a):
        pass

    def _send(self, code, body, ctype="application/json; charset=utf-8"):
        data = body if isinstance(body, bytes) else json.dumps(body, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(data)

    def _host_ok(self):
        port = self.server.server_address[1]
        return self.headers.get("Host", "") in (f"127.0.0.1:{port}", f"localhost:{port}")

    def _body(self, limit=100_000):
        n = int(self.headers.get("Content-Length") or 0)
        if n > limit:
            raise AgencyError("요청이 너무 큽니다.")
        return json.loads(self.rfile.read(n) or b"{}")

    def do_GET(self):
        u = urlparse(self.path)
        if not self._host_ok():
            return self._send(403, {"error": "허용되지 않은 호스트입니다."})
        if not u.path.startswith("/api/"):
            return self._static(u.path)
        self._api("GET", u)

    def do_POST(self):
        u = urlparse(self.path)
        if not self._host_ok():
            return self._send(403, {"error": "허용되지 않은 호스트입니다."})
        self._api("POST", u)

    def _static(self, path):
        rel = "index.html" if path in ("/", "") else "buddy.html" if path == "/buddy" else path.lstrip("/")
        f = (WEB / rel).resolve()
        if WEB.resolve() not in f.parents or not f.is_file():
            return self._send(404, {"error": "not found"})
        data = f.read_bytes()
        if rel in ("index.html", "buddy.html"):
            data = data.replace(b"__TOKEN__", TOKEN.encode())
        ctype = mimetypes.guess_type(f.name)[0] or "application/octet-stream"
        if f.suffix in (".html", ".js", ".css"):
            ctype += "; charset=utf-8"
        self._send(200, data, ctype)

    def _api(self, method, u):
        if self.headers.get("X-Token") != TOKEN:
            return self._send(403, {"error": "인증 토큰이 맞지 않습니다. 페이지를 새로 고침하세요."})
        q = {k: v[0] for k, v in parse_qs(u.query).items()}
        try:
            body = self._body(6_000_000 if u.path == "/api/raw-upload" else 100_000) if method == "POST" else {}
            self._send(200, self.route(method, u.path, q, body))
        except AgencyError as e:
            self._send(400, {"error": str(e)})
        except (ValueError, KeyError) as e:
            self._send(400, {"error": f"요청 형식 오류: {e}"})
        except Exception as e:  # noqa: BLE001
            self._send(500, {"error": f"서버 오류: {e}"})

    def route(self, method, path, q, b):
        global JOB
        running = bool(JOB and JOB.state == "running")
        if path == "/api/state":
            return {"active": common.get_active(), "clients": list_clients(), "claude": bool(shutil.which("claude")),
                    "running": running, "channels": channels(), "today": common.today_kst().isoformat(),
                    "rep": read_settings().get("rep_name", ""), "buddy_size": buddy_size()}
        if path == "/api/session" and method == "POST":
            common.set_active(common.validate_id(b.get("client"), "client_id"))
            return {"active": common.get_active()}
        if path == "/api/session/clear" and method == "POST":
            if running:
                raise AgencyError("작업이 진행 중입니다. 먼저 끝내거나 중단하세요.")
            common.clear_active()
            return {"active": None}
        if path == "/api/workspace":
            c = need_active()
            return {"client": c, "projects": list_projects(c), "inputs": list_inputs(c)}
        if path == "/api/deliverables":
            c = need_active()
            return {"items": list_deliverables(c, common.validate_id(q.get("project"), "project_id"))}
        if path == "/api/file":
            c = need_active()
            return {"text": read_file(c, common.validate_id(q.get("project"), "project_id"), q.get("area", ""), q.get("name", ""))}
        if path == "/api/run" and method == "POST":
            cmd = b.get("cmd")
            fields = dict(b.get("fields") or {})
            if cmd != "new-client":
                active = need_active()
                fields["client"] = active
            prompt, _ = build_prompt(cmd, fields)
            job = start_job(prompt, cmd, fields.get("client"))
            return {"job": job.id}
        if path == "/api/reply" and method == "POST":
            if not JOB or not JOB.session_id:
                raise AgencyError("이어갈 작업이 없습니다. 명령을 먼저 실행하세요.")
            text = clean_text(b.get("text"), 2000)
            if not text:
                raise AgencyError("내용을 입력하세요.")
            job = start_job(text, JOB.label, JOB.client, JOB.session_id)
            return {"job": job.id}
        if path == "/api/cancel" and method == "POST":
            if JOB and JOB.state == "running" and JOB.proc:
                JOB.cancelled = True
                JOB.proc.terminate()
            return {"ok": True}
        if path == "/api/job":
            if not JOB:
                return {"id": None, "state": "idle", "events": []}
            since = int(q.get("since") or 0)
            with JOB.lock:
                return {"id": JOB.id, "label": JOB.label, "state": JOB.state, "events": JOB.events[since:]}
        if path == "/api/approve" and method == "POST":
            c = need_active()
            by = clean_text(b.get("by"), 40)
            st = status.set_deliverable(c, common.validate_id(b.get("project"), "project_id"), clean_text(b.get("file"), 120),
                                        "approved", by)
            return {"state": st["deliverables"][b["file"]]}
        if path == "/api/revise" and method == "POST":
            c = need_active()
            by = clean_text(b.get("by"), 40)
            if not by:
                raise AgencyError("요청자 이름을 입력하세요.")
            st = status.set_deliverable(c, common.validate_id(b.get("project"), "project_id"), clean_text(b.get("file"), 120),
                                        "needs_revision", by, clean_text(b.get("note"), 300) or None)
            return {"state": st["deliverables"][b["file"]]}
        if path == "/api/feedback":
            c = need_active()
            return {"items": feedback.load(c)["items"]}
        if path == "/api/feedback/approve" and method == "POST":
            c = need_active()
            exp = clean_text(b.get("expires"), 10) or None
            return {"item": feedback.approve(c, clean_text(b.get("id"), 20), clean_text(b.get("by"), 40), exp,
                                            [clean_text(x, 20) for x in b.get("supersede") or []])}
        if path == "/api/feedback/reject" and method == "POST":
            c = need_active()
            return {"item": feedback.reject(c, clean_text(b.get("id"), 20))}
        if path == "/api/settings" and method == "POST":
            d = write_settings(b.get("rep_name") if "rep_name" in b else None, b.get("buddy_size"))
            return {"rep": d.get("rep_name", ""), "buddy_size": buddy_size()}
        if path == "/api/buddy":
            return buddy_state()
        if path == "/api/buddy-launch" and method == "POST":
            return launch_buddy()
        if path == "/api/new-account" and method == "POST":
            return new_account(b.get("id"), b.get("name"))
        if path == "/api/brief":
            c = need_active()
            if method == "POST":
                return {"fields": write_brief(c, b.get("fields"))}
            return {"fields": read_brief(c), "labels": list(BRIEF_FIELDS)}
        if path == "/api/buddy-char" and method == "POST":
            return {"char": write_buddy(need_active(), clean_text(b.get("char"), 10))}
        if path == "/api/team" and method == "POST":
            return {"team": write_team(need_active(), b.get("team"))}
        if path == "/api/performance":
            c = need_active()
            today = common.today_kst()
            try:
                end = datetime.date.fromisoformat(q["end"]) if q.get("end") else today
                start = datetime.date.fromisoformat(q["start"]) if q.get("start") else end - datetime.timedelta(days=max(1, min(int(q.get("days") or 7), 366)) - 1)
            except ValueError:
                raise AgencyError("날짜 형식이 올바르지 않습니다.")
            if end < start or (end - start).days > 366:
                raise AgencyError("기간이 올바르지 않습니다.")
            return performance(c, start, end, set(x for x in (q.get("off") or "").split(",") if x))
        if path == "/api/raw-upload" and method == "POST":
            c = need_active()
            return save_raw(c, b.get("name"), b.get("data"))
        if path == "/api/calendar":
            return {"events": all_events()}
        if path == "/api/accounts":
            return accounts_overview()
        if path == "/api/library":
            c = need_active()
            if method == "POST":
                return lib_change(c, b.get("kind"), b.get("op"), b.get("item"), clean_text(b.get("id"), 20))
            return lib_load(c)
        raise AgencyError("알 수 없는 요청입니다.")


def main():
    ap = argparse.ArgumentParser(description="마케터 AI 주니어 팀 웹 화면 (로컬 전용)")
    ap.add_argument("--port", type=int, default=8765)
    ap.add_argument("--no-open", action="store_true")
    a = ap.parse_args()
    global PORT
    PORT = a.port
    srv = ThreadingHTTPServer(("127.0.0.1", a.port), Handler)
    url = f"http://127.0.0.1:{a.port}/"
    print(f"Team 화면: {url}  (이 PC에서만 열립니다. 종료: Ctrl+C)")
    if not a.no_open:
        threading.Timer(0.6, lambda: webbrowser.open(url)).start()
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("\n종료합니다.")
    finally:
        if JOB and JOB.proc and JOB.state == "running":
            JOB.proc.terminate()


if __name__ == "__main__":
    main()
