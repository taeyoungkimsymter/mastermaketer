#!/bin/bash
# 마스터마케터 실행: 서버(webapp.py) → 바탕화면 버디(buddy.py, 띄울 캐릭터가 있을 때만) → 앱(브라우저) 순서로 켠다.
# 서버나 버디가 이미 켜져 있으면 다시 켜지 않는다. 더블클릭해서 실행한다.
cd "$(dirname "$0")" || exit 1
PORT=8765
URL="http://127.0.0.1:$PORT"
LOGDIR=".agency-state"
mkdir -p "$LOGDIR"

up() { curl -s -o /dev/null --max-time 1.5 "$URL/buddy"; }

if up; then
  echo "서버가 이미 켜져 있어요."
else
  echo "서버를 켭니다…"
  nohup python3 scripts/webapp.py --port "$PORT" --no-open >> "$LOGDIR/server.log" 2>&1 &
  disown
  for _ in $(seq 1 30); do up && break; sleep 0.5; done
  if ! up; then
    echo "서버를 켜지 못했어요. 로그: $LOGDIR/server.log"
    read -r -p "엔터를 누르면 닫혀요" _
    exit 1
  fi
fi

# 바탕화면에 띄울 캐릭터(어카운트의 캐릭터 설정에서 '바탕화면에 표시'를 켠 것)가 있을 때만 버디를 띄운다
if pgrep -f "scripts/buddy.py" > /dev/null; then
  echo "버디가 이미 떠 있어요."
elif python3 scripts/buddy.py --check --port "$PORT" > /dev/null 2>&1; then
  echo "바탕화면에 버디를 띄웁니다…"
  nohup python3 scripts/buddy.py --desktop-only --port "$PORT" >> "$LOGDIR/buddy.log" 2>&1 &
  disown
  sleep 1.5
  pgrep -f "scripts/buddy.py" > /dev/null || echo "버디 창을 띄우지 못했어요(앱은 계속 쓸 수 있어요). 로그: $LOGDIR/buddy.log"
else
  echo "바탕화면에 띄울 캐릭터가 없어요. (어카운트의 캐릭터 설정에서 켜면 다음부터 뜹니다)"
fi

open "$URL/"
echo "준비됐어요. 이 창은 닫아도 돼요."
