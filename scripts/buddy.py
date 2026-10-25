"""데스크톱 버디: 바탕화면 오른쪽 아래에 테두리 없는 투명 창(항상 위)으로 /buddy 페이지를 띄운다. (docs/buddy-spec.md §5)

  python3 scripts/buddy.py            # 마스터마케터 서버(python3 scripts/webapp.py)가 켜져 있을 때
  python3 scripts/buddy.py --browser  # pywebview 없이 일반 브라우저 창으로 연다

창 닫기·숨기기: 캐릭터 위로 마우스를 올리면 오른쪽 위에 [–](30분 숨기기) [✕](닫기)가 나온다.
터미널에서는 Ctrl+C, 안 닫히면 `pkill -f scripts/buddy.py`.

pywebview 는 프로젝트 안 가상환경(.venv)에 설치돼 있다. 시스템 python3 로 실행해도 .venv 가 있으면 자동으로 그쪽으로 다시 실행한다.
띄울 캐릭터(어카운트의 캐릭터 설정에서 '바탕화면에 표시'를 켠 것)가 없으면 창을 띄우지 않는다. 서버가 꺼져 있어도 띄우지 않는다.
"""
import argparse
import json
import os
import re
import signal
import sys
import threading
import time
import urllib.request
import webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WEB = ROOT / "web"


def server_up(base):
    try:
        with urllib.request.urlopen(base + "/buddy", timeout=1.5) as r:
            return r.status == 200
    except Exception:  # noqa: BLE001
        return False


def reexec_in_venv():
    py = ROOT / ".venv" / "bin" / "python"
    in_venv = Path(sys.prefix).resolve() == (ROOT / ".venv").resolve()  # .venv/bin/python 은 시스템 python 의 링크라 경로 비교로는 구분이 안 된다
    if py.is_file() and not in_venv and not os.environ.get("MM_BUDDY_REEXEC"):
        os.environ["MM_BUDDY_REEXEC"] = "1"
        os.execv(str(py), [str(py)] + sys.argv)


def desktop_count(base):
    """바탕화면에 띄울 캐릭터가 있는 어카운트 수. 서버에 연결하지 못하면 None."""
    try:
        with urllib.request.urlopen(base + "/buddy", timeout=2) as r:
            token = re.search(r'name="token" content="([^"]+)"', r.read().decode()).group(1)
        req = urllib.request.Request(base + "/api/buddy", headers={"X-Token": token})
        with urllib.request.urlopen(req, timeout=4) as r:
            return int(json.load(r).get("desktop_count", 0))
    except Exception:  # noqa: BLE001
        return None


NO_CHAR_MSG = "바탕화면에 띄울 캐릭터가 없어요. 어카운트의 캐릭터 설정에서 켜 주세요."


class Api:
    """페이지(buddy.js)가 부르는 창 제어. 창 객체는 _ 로 시작하는 이름에 둔다(pywebview 가 공개 속성을 훑기 때문)."""

    def __init__(self, screen, right, bottom):
        self._window = None
        self._screen = screen          # () -> (가로, 세로)
        self._right, self._bottom = right, bottom
        self._rects = []               # 눌러도 되는 영역(창 왼쪽 위 기준 x, y, w, h)
        self._size = (240, 240)

    def layout(self, w, h, rects):
        """창을 캐릭터·말풍선에 딱 맞게 줄여 화면 오른쪽 아래에 붙이고, 눌러도 되는 영역을 저장한다."""
        if not self._window:
            return
        w, h = max(80, min(int(w), 1600)), max(80, min(int(h), 900))
        sw, sh = self._screen()
        if (w, h) != self._size:
            self._window.resize(w, h)
            self._window.move(sw - w - self._right, sh - h - self._bottom)
            self._size = (w, h)
        # 좌표는 오른쪽 아래 기준(음수)으로 받아 창 크기가 바뀌어도 맞는다
        self._rects = [(w + l, h + t, rw, rh) for l, t, rw, rh in rects]

    def hide(self, minutes=30):
        if not self._window:
            return
        self._window.hide()
        threading.Timer(max(1, int(minutes)) * 60, self._window.show).start()

    def quit(self):
        if self._window:
            self._window.destroy()


def start_click_through(api):
    """캐릭터·말풍선이 아닌 투명한 곳은 마우스를 통과시켜 뒤쪽 창이 눌리게 한다(macOS).
    창이 이벤트를 무시하면 안쪽에서는 마우스 위치를 알 수 없어서, 별도 스레드가 마우스 위치를 읽어 영역 안/밖으로 전환한다."""
    try:
        import AppKit
        from PyObjCTools import AppHelper
    except ImportError:
        print("투명 영역 통과를 쓰지 못해요(AppKit 없음). 창 크기를 맞추는 것으로 대신합니다.")
        return

    def loop():
        ignoring = None
        while True:
            time.sleep(0.04)
            win = api._window
            nsw = getattr(win, "native", None) if win else None
            if nsw is None or not api._rects:
                continue
            try:
                m, f = AppKit.NSEvent.mouseLocation(), nsw.frame()
                x, y = m.x - f.origin.x, f.size.height - (m.y - f.origin.y)   # 창 왼쪽 위 기준
                inside = any(rx - 3 <= x <= rx + rw + 3 and ry - 3 <= y <= ry + rh + 3 for rx, ry, rw, rh in api._rects)
                want = not inside
                if want != ignoring:
                    ignoring = want
                    AppHelper.callAfter(nsw.setIgnoresMouseEvents_, want)
            except Exception:  # noqa: BLE001
                time.sleep(0.5)

    threading.Thread(target=loop, daemon=True).start()


def main():
    ap = argparse.ArgumentParser(description="마스터마케터 데스크톱 버디")
    ap.add_argument("--port", type=int, default=8765)
    ap.add_argument("--browser", action="store_true", help="pywebview 대신 일반 브라우저로 열기")
    ap.add_argument("--bottom", type=int, default=70, help="화면 아래 여백(독 높이만큼, px)")
    ap.add_argument("--right", type=int, default=8, help="화면 오른쪽 여백(px)")
    ap.add_argument("--desktop-only", action="store_true", help="pywebview 가 없으면 브라우저로 대신하지 않고 오류로 끝낸다")
    ap.add_argument("--check", action="store_true", help="띄울 캐릭터가 있으면 종료 코드 0, 없으면 3, 서버가 꺼져 있으면 4")
    ap.add_argument("--smoke", type=int, default=0, help="창을 띄우고 N초 뒤 스스로 닫는다(동작 확인용)")
    ap.add_argument("--dry-run", action="store_true", help="창을 띄우지 않고 상태만 출력")
    a = ap.parse_args()
    base = f"http://127.0.0.1:{a.port}"
    url = base + "/buddy"
    up = server_up(base)

    if a.check:
        n = desktop_count(base)
        print("서버가 꺼져 있어요." if n is None else f"바탕화면에 띄울 어카운트 {n}개" if n else NO_CHAR_MSG)
        sys.exit(4 if n is None else 0 if n else 3)
    if a.dry_run:
        print(f"서버: {'켜짐' if up else '꺼짐'} ({base})")
        print("창 크기는 캐릭터·말풍선에 맞춰 페이지가 정합니다.")
        return
    n = desktop_count(base) if not (a.browser or a.dry_run) else None
    if not (a.browser or a.dry_run):
        if n is None:
            print("서버가 꺼져 있어요. 먼저 python3 scripts/webapp.py 를 실행하세요.", file=sys.stderr)
            sys.exit(4)
        if n == 0:
            print(NO_CHAR_MSG)
            sys.exit(3)
    if a.browser:
        print("브라우저 창으로 엽니다:", url)
        if not up:
            print("서버가 꺼져 있어요. 먼저 python3 scripts/webapp.py 를 실행하세요.")
        webbrowser.open(url)
        return
    try:
        import webview  # noqa: PLC0415
    except ImportError:
        reexec_in_venv()
        msg = "pywebview 가 없어요. 설치: python3 -m venv .venv && .venv/bin/pip install pywebview"
        if a.desktop_only:
            print(msg, file=sys.stderr)
            sys.exit(2)
        print(msg + " — 브라우저 창으로 대신 엽니다.")
        webbrowser.open(url)
        return

    def screen():
        try:
            scr = webview.screens[0]
            return scr.width, scr.height
        except Exception:  # noqa: BLE001
            return 1440, 900

    api = Api(screen, a.right, a.bottom)
    sw, sh = screen()
    w, h = 240, 240   # 처음 크기. 페이지가 내용에 맞게 바로 줄여 준다
    kw = dict(width=w, height=h, x=sw - w - a.right, y=sh - h - a.bottom, frameless=True, transparent=True, on_top=True, easy_drag=False, resizable=False, js_api=api)
    html_arg, target = {}, url
    while True:  # 일부 pywebview 버전에 없는 옵션은 빼고 다시 시도
        try:
            win = webview.create_window("마스터마케터 버디", target, **html_arg, **kw)
            break
        except TypeError as e:
            bad = next((k for k in list(kw) if k in str(e)), None)
            if not bad:
                raise
            kw.pop(bad)
    api._window = win

    def stop_later():
        time.sleep(a.smoke)
        win.destroy()

    if a.smoke:
        threading.Thread(target=stop_later, daemon=True).start()
    start_click_through(api)
    signal.signal(signal.SIGINT, lambda *_: os._exit(0))
    print("버디를 띄웠어요. 닫기: 캐릭터 위에 마우스를 올리고 ✕ / 터미널 Ctrl+C / pkill -f scripts/buddy.py")
    webview.start()


if __name__ == "__main__":
    main()
