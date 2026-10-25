"""공용 헬퍼: ID 검증, 경로 해석, 활성 고객사 잠금, 버전 저장, brand.md 파서.

표준 라이브러리만 사용한다. 테스트에서는 환경변수 AGENCY_ROOT로 루트를 바꾼다.
"""
import json
import os
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path

import sys

for _s in (sys.stdin, sys.stdout, sys.stderr):  # Windows 기본 코드페이지(cp949)와 무관하게 UTF-8 입출력
    try:
        _s.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):
        pass

KST = timezone(timedelta(hours=9))
ID_RE = re.compile(r"^[a-z0-9][a-z0-9-]{1,31}$")
VERSIONED_DIRS = ("deliverables", "review", "research", "production")


class AgencyError(Exception):
    """사용자에게 그대로 보여줄 수 있는 업무 오류."""


def root() -> Path:
    env = os.environ.get("AGENCY_ROOT")
    return Path(env).resolve() if env else Path(__file__).resolve().parent.parent


def now_kst() -> datetime:
    return datetime.now(KST)


def today_kst():
    return now_kst().date()


def validate_id(value, kind="ID"):
    if not isinstance(value, str) or not ID_RE.match(value):
        raise AgencyError(
            f"{kind} '{value}'는 사용할 수 없습니다. 영문 소문자·숫자·하이픈, 2~32자, 숫자/영문으로 시작해야 합니다 "
            "(경로 이동 문자 '..', '/', '\\' 불가)."
        )
    return value


def clients_root() -> Path:
    return root() / "clients"


def client_dir(client_id, must_exist=True) -> Path:
    validate_id(client_id, "client_id")
    p = clients_root() / client_id
    if p.exists() and p.resolve().parent != clients_root().resolve():
        raise AgencyError(f"client_id '{client_id}' 경로가 clients/ 밖을 가리킵니다(심볼릭 링크 의심).")
    if must_exist and not p.is_dir():
        raise AgencyError(f"고객사 '{client_id}'가 없습니다. /new-client 로 먼저 등록하세요.")
    return p


def project_dir(client_id, project_id, must_exist=True) -> Path:
    validate_id(project_id, "project_id")
    p = client_dir(client_id) / "projects" / project_id
    if must_exist and not p.is_dir():
        raise AgencyError(
            f"프로젝트 '{project_id}'가 없습니다. 새 프로젝트를 만들거나 공통 업무용 'general'을 사용하세요."
        )
    return p


# ---------- 활성 고객사 잠금 (실수 방지 장치, 보안 경계 아님) ----------

def _state_file() -> Path:
    return root() / ".agency-state" / "active-client.json"


def get_active():
    f = _state_file()
    if not f.exists():
        return None
    try:
        return json.loads(f.read_text(encoding="utf-8")).get("client_id")
    except (ValueError, OSError):
        return None


def set_active(client_id):
    client_dir(client_id)  # 존재·형식 검증
    cur = get_active()
    if cur and cur != client_id:
        raise AgencyError(
            f"이미 '{cur}' 고객사로 작업 중입니다. 고객사를 바꾸려면 현재 세션을 종료하고, 터미널에서 "
            "`python scripts/session.py clear` 를 직접 실행한 뒤 새 세션에서 시작하세요."
        )
    f = _state_file()
    f.parent.mkdir(parents=True, exist_ok=True)
    f.write_text(json.dumps({"client_id": client_id, "set_at": now_kst().isoformat()}), encoding="utf-8")


def clear_active():
    f = _state_file()
    if f.exists():
        f.unlink()


def require_active(client_id):
    validate_id(client_id, "client_id")
    cur = get_active()
    if cur != client_id:
        raise AgencyError(
            f"활성 고객사가 '{cur}'입니다. '{client_id}' 작업은 `python scripts/session.py set {client_id}` 후 "
            "새 세션에서 진행하세요." if cur else
            f"활성 고객사가 없습니다. 먼저 `python scripts/session.py set {client_id}` 를 실행하세요."
        )


# ---------- 파일 쓰기 ----------

def write_versioned(directory: Path, stem: str, ext: str, content: str) -> Path:
    """{stem}-v{N}{ext}로 저장. 기존 파일은 절대 덮어쓰지 않는다('x' 모드)."""
    directory.mkdir(parents=True, exist_ok=True)
    n = 1
    while True:
        p = directory / f"{stem}-v{n}{ext}"
        try:
            with open(p, "x", encoding="utf-8", newline="\n") as f:
                f.write(content)
            return p
        except FileExistsError:
            n += 1


def next_version_path(directory: Path, stem: str, ext: str) -> Path:
    n = 1
    while (directory / f"{stem}-v{n}{ext}").exists():
        n += 1
    return directory / f"{stem}-v{n}{ext}"


# ---------- brand.md 파서 ----------

def section_bullets(text: str, heading: str):
    """'## {heading}...' 아래의 글머리표 항목. '미정'과 '(예: ...)' 자리표시자는 제외."""
    out, on = [], False
    for line in text.splitlines():
        if line.startswith("## "):
            on = line[3:].strip().startswith(heading)
            continue
        if on:
            m = re.match(r"^\s*[-*]\s+(.*\S)\s*$", line)
            if m:
                v = m.group(1).strip()
                if v and v != "미정" and not v.startswith("("):
                    out.append(v)
    return out


# ---------- Playbook (clients/{id}/playbook/playbook-v{N}.json) ----------

def playbook_latest(client_id):
    """가장 높은 버전의 Playbook -> (번호, dict). 없으면 (None, None)."""
    d = client_dir(client_id) / "playbook"
    best = 0
    if d.is_dir():
        for f in d.glob("playbook-v*.json"):
            m = re.fullmatch(r"playbook-v(\d+)\.json", f.name)
            if m:
                best = max(best, int(m.group(1)))
    if not best:
        return None, None
    try:
        return best, json.loads((d / f"playbook-v{best}.json").read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None, None


def playbook_bans(client_id):
    """Playbook '금지·주의'의 금지어 목록(없으면 빈 리스트)."""
    _, d = playbook_latest(client_id)
    return [w for w in ((d or {}).get("rules") or {}).get("banned", []) if w]


def channels_current(client_id):
    """clients/{id}/channels.json 의 운영 채널 카드 목록(다른 화면이 읽는 현재 값). 없으면 빈 리스트."""
    try:
        d = json.loads((client_dir(client_id) / "channels.json").read_text(encoding="utf-8"))
        return d.get("channels", []) if isinstance(d, dict) else []
    except (OSError, ValueError):
        return []


def playbook_complete(d):
    """필수 5섹션(브랜드 기본·타깃·운영 컨셉·운영 채널·톤앤매너)이 모두 채워졌는지와 섹션별 결과."""
    d = d or {}
    b, t, k, tn = d.get("brand") or {}, d.get("target") or {}, d.get("concept") or {}, d.get("tone") or {}
    core = (t.get("core") or [{}])[0] if t.get("core") else {}
    sec = {
        "brand": all(b.get(x) for x in ("name", "category", "tagline", "products")),
        "target": all(core.get(x) for x in ("age", "situation", "pain")),
        "concept": bool(k.get("line")) and sum(1 for p in (k.get("pillars") or []) if p.get("name")) >= 3,
        "channels": bool(d.get("channels")) and all(x.get("role") for x in d["channels"]),
        "tone": sum(1 for w in (tn.get("keywords") or []) if w) >= 3 and bool(tn.get("speech")) and bool(tn.get("emoji"))
        and sum(1 for w in (tn.get("do") or []) if w) >= 2 and sum(1 for w in (tn.get("dont") or []) if w) >= 2,
    }
    return all(sec.values()), sec


def read_brand(client_id) -> str:
    f = client_dir(client_id) / "brand.md"
    return f.read_text(encoding="utf-8") if f.exists() else ""


def display_name(brand_text: str):
    m = re.search(r"^-\s*표시명:\s*(.+?)\s*$", brand_text, re.M)
    return m.group(1) if m and m.group(1) != "미정" else None


def other_client_markers(client_id):
    """다른 고객사의 표시명·전용 문구. 혼입 검사 전용(출력 시 마스킹할 것)."""
    markers = []
    if not clients_root().is_dir():
        return markers
    for d in sorted(clients_root().iterdir()):
        if d.name == client_id or not d.is_dir() or not ID_RE.match(d.name):
            continue
        f = d / "brand.md"
        if not f.exists():
            continue
        t = f.read_text(encoding="utf-8")
        name = display_name(t)
        if name:
            markers.append(name)
        markers.extend(section_bullets(t, "전용 문구"))
    return markers


def find_leaks(text: str, client_id):
    """다른 고객사 마커가 text에 있으면 (마스킹된 마커, 위치) 목록 반환."""
    hits = []
    for m in other_client_markers(client_id):
        idx = text.find(m)
        while idx != -1:
            masked = m[0] + "*" * (len(m) - 1)
            hits.append({"marker": masked, "offset": idx, "line": text.count("\n", 0, idx) + 1})
            idx = text.find(m, idx + 1)
    return hits


def emit(obj):
    print(json.dumps(obj, ensure_ascii=False, indent=2))
