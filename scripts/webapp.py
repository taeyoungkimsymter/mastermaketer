"""브라우저에서 /명령을 입력하고 결과를 보는 로컬 웹앱. 표준 라이브러리만 사용한다.

  py -3 scripts/webapp.py            # http://127.0.0.1:8765 (이 PC 안에서만 접속 가능)
  py -3 scripts/webapp.py --port 9000 --no-open

동작: 폼 입력 → `claude -p`(헤드리스)로 같은 /명령 실행 → 진행 로그·결과를 화면에 표시.
외부 발송·게시·광고 집행은 하지 않는다. 승인/피드백 확정은 화면에서 사용자가 이름을 적고 직접 누른다.
고객사 경계는 CLAUDE.md·hook 과 같은 '실수 방지 장치'이며 보안 경계가 아니다(docs/limitations.md).
"""
import argparse
import json
import mimetypes
import re
import secrets
import shutil
import subprocess
import sys
import threading
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

sys.path.insert(0, str(Path(__file__).resolve().parent))
import common  # noqa: E402
import feedback  # noqa: E402
import status  # noqa: E402
from common import AgencyError  # noqa: E402

ROOT = common.root()
WEB = ROOT / "web"
TOKEN = secrets.token_urlsafe(24)
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
                items.append({"area": area, "name": p.name, "state": s.get("state"), "by": s.get("by"),
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

    def _body(self):
        n = int(self.headers.get("Content-Length") or 0)
        if n > 100_000:
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
        rel = "index.html" if path in ("/", "") else path.lstrip("/")
        f = (WEB / rel).resolve()
        if WEB.resolve() not in f.parents or not f.is_file():
            return self._send(404, {"error": "not found"})
        data = f.read_bytes()
        if rel == "index.html":
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
            body = self._body() if method == "POST" else {}
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
                    "running": running, "channels": channels(), "today": common.today_kst().isoformat()}
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
        raise AgencyError("알 수 없는 요청입니다.")


def main():
    ap = argparse.ArgumentParser(description="마케터 AI 주니어 팀 웹 화면 (로컬 전용)")
    ap.add_argument("--port", type=int, default=8765)
    ap.add_argument("--no-open", action="store_true")
    a = ap.parse_args()
    srv = ThreadingHTTPServer(("127.0.0.1", a.port), Handler)
    url = f"http://127.0.0.1:{a.port}/"
    print(f"AI 주니어 팀 화면: {url}  (이 PC에서만 열립니다. 종료: Ctrl+C)")
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
