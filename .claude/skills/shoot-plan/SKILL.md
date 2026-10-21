---
name: shoot-plan
description: 선택된 콘티로 촬영 일정·컷 우선순위·소품/장비/출연자 목록·콜시트·리스크 표를 만든다. 미확인 예약·허가는 확정으로 표시하지 않는다.
disable-model-invocation: true
argument-hint: "<client_id> <project_id>"
arguments: [client_id, project_id]
allowed-tools: Bash(py -3 scripts/*)
---

# /shoot-plan — 촬영 계획

입력 예: `/shoot-plan mocanaru spring-video`
인자: client_id=$client_id, project_id=$project_id

## 0. 선행 조건
1. `py -3 scripts/session.py set $client_id`
2. `py -3 scripts/status.py require --client $client_id --project $project_id --stage shoot_plan` — 실패(컨셉 미선택)하면 중단하고 `/video` 먼저 안내.
3. `production/` 에서 최신 `storyboard` 파일을 찾는다(없으면 `/video` 안내). 컷 길이 합계가 목표와 맞는지 `production_check.py cuts` 로 재확인.

## 1. 필요한 정보 질문(묶어서, 모르면 미확인)
촬영 후보일·가능 시간대, 장소 후보와 **예약/허가 상태**, 출연자·스태프 규모, 보유 장비, 예산 상한, 이동 수단·거리. 답이 없는 값은 `미확인` 으로 남기고 확정 표시를 하지 않는다.

## 2. 작성 (pd, 필요 시 reviewer)
- `shoot-schedule.csv`: 준비·이동·세팅·촬영·철수·휴식을 **별도 행**으로. `confirm_status`(확정/미확인/요청중)와 `evidence`. 근거 없는 확정 금지.
- 컷 우선순위(필수/선택), 소품·장비·출연자 목록.
- `risk-table.csv`: 위험, 가능성, 영향, 근거, 사전 조치, 대체안, 담당자, 판단 시점, 추가 비용, 확인 상태.
- 콜시트: 내부용(`callsheet-internal`)과 외부 공유용(`callsheet-external`) 분리, 비상 대응 정보 포함.
- 검증: `production_check.py schedule`, `production_check.py risk` 를 실행하고 오류를 해결(또는 사용자에게 쟁점으로 전달). 재작업 최대 2회.
- 사진·주소 기반 장소 판단은 관찰 / 추정 / 현장 확인 필요로 구분.

## 사용자에게 보고
일정 요약 · 검증 결과 · **미확인 예약·허가·연락처 목록** · 리스크 상위 항목 · 사용자 결정 필요 · 다음 행동. 모든 파일은 `production/` 새 버전. 실제 예약·연락·발송은 하지 않았음을 명시.

## 완료 기준
일정·리스크·콜시트(내/외부)·목록이 저장되고 production_check 결과가 반영되며, 미확인 항목이 확정으로 표기되지 않음.
