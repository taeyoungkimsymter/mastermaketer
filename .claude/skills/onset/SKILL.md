---
name: onset
description: 촬영 현장 돌발 상황에 짧고 빠르게 대응한다(즉시 조치, 필수 컷 유지 대체 순서, 영향, 확인 사항, 고객사 보고 문구).
disable-model-invocation: true
argument-hint: "<client_id> <project_id> \"상황\""
arguments: [client_id, project_id, situation]
allowed-tools: Bash(py -3 scripts/*)
---

# /onset — 현장 대응

입력 예: `/onset mocanaru spring-video "야외 장소에 비가 오기 시작했고 출연자 도착이 40분 늦음"`
인자: client_id=$client_id, project_id=$project_id, 상황=$situation

## 속도 우선 절차 (서브에이전트 호출 없이 메인 세션이 직접, 읽기는 최소한)
1. 누락 시 한 줄 질문. `py -3 scripts/session.py set $client_id`.
2. 최소 문맥만 읽는다: 해당 프로젝트의 최신 `production/` 촬영 일정, 콘티(필수 컷 표시), 리스크 표. 필요 이상으로 읽지 않는다.
3. **고위험 판별 먼저**: 부상, 감전, 구조물 이상, 군중 위험, 악천후 경보, 화재 등 → **촬영 지속 대신 중지와 현장 책임자 확인**을 1번 항목으로 쓴다(비상 연락처가 문서에 있으면 인용, 없으면 "미확인").
4. 아래 5개를 이 순서로 **짧게** 답한다:
   1. 즉시 조치
   2. 필수 컷을 유지하는 대체 촬영 순서(컷 번호 기준)
   3. 시간·비용·품질 영향 — **계산 가정을 함께** 적는다(예: "이동 20분 가정"). 근거 없는 금액은 "미정".
   4. 현장 책임자에게 확인할 사항
   5. 고객사 보고 문구 초안(발송 전 사용자 검토)
5. 실제 연락·예약·비용 승인·발송을 **했다고 쓰지 않는다**. 권한 확인이 필요한 일은 "확인 필요".
6. 기록: `py -3 scripts/save_version.py next --client $client_id --project $project_id --area production --stem onset-{YYYYMMDD}` 경로에 `agency/templates/onset-response.md` 형식으로 저장(실패해도 현장 답변은 먼저 제공).

## 완료 기준
5개 항목이 순서대로 제공되고, 고위험이면 중지·확인이 최우선이며, 가정·미확인이 표시됨.
