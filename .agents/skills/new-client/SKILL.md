---
name: new-client
description: 새 고객사를 짧은 인터뷰로 등록하고 brand.md·contract-scope.md를 만든다.
disable-model-invocation: true
argument-hint: "[표시명(선택)]"
allowed-tools: Bash(py -3 scripts/*)
---

# /new-client — 고객사 등록

입력 예: `/new-client 모카나루`  (표시명 생략 가능)

## 절차
1. 이미 다른 고객사가 활성이면(`py -3 scripts/session.py get`) 여기서 중단하고 안내한다: "고객사를 바꾸려면 현재 세션을 끝내고, 터미널에서 `py -3 scripts/session.py clear` 를 직접 실행한 뒤 새 세션에서 `/new-client` 를 실행하세요." 에이전트가 직접 clear 하지 않는다.
2. 인터뷰(한 번에 묶어서 질문, 모르는 항목은 "미정"으로 두라고 안내):
   - 표시명, 업종, 제품·서비스, 타깃, 핵심 메시지
   - 톤앤매너, 금지 표현, 필수 문구, 이 고객사만 쓰는 전용 문구(슬로건 등)
   - 계약 수행 범위, 범위 밖 업무, 수정 횟수, KPI 정의(전환 정의 포함), 보고 주기, 승인 담당자
   - 연락처·계약 금액·계약서 원문은 묻지도 적지도 않는다(필요하면 사용자가 별도 비공개 보관).
3. client_id 제안: 영문 소문자·숫자·하이픈 2~32자(예: `mocanaru`). 사용자 확인 후 확정. 이미 존재하면 덮어쓰지 말고 다른 ID를 묻는다.
4. 실행:
   - `py -3 scripts/scaffold.py client --id {client_id} --name "{표시명}"`  (기존 파일은 유지됨)
   - `py -3 scripts/session.py set {client_id}`
5. `clients/{client_id}/brand.md` 와 `contract-scope.md` 를 인터뷰 내용으로 채운다. 템플릿 구조와 `## 금지 표현` `## 필수 문구` `## 전용 문구` 제목을 바꾸지 말고, 목록은 한 줄에 하나씩 쓴다(검수 스크립트가 읽는다). 모르는 항목은 `- 미정`.
6. 완료 보고: 생성된 파일, 미정 항목 목록, 다음 행동(`/copy {client_id} {채널}` 등), "이 세션은 {client_id} 전용입니다. 다른 고객사는 새 세션에서."

## 완료 기준
brand.md / contract-scope.md / projects/general 이 존재하고, 미정 항목이 사용자에게 보고되었으며, 활성 고객사가 설정됨.
