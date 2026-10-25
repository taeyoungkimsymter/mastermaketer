---
name: copy
description: 고객사 브리프와 승인된 규칙에 맞춰 채널별 카피 3안과 소구 의도를 작성하고 검수한다.
disable-model-invocation: true
argument-hint: "<client_id> <채널> [project_id]"
arguments: [client_id, channel, project_id]
allowed-tools: Bash(py -3 scripts/*)
---

# /copy — 카피 3안

입력 예: `/copy mocanaru instagram-feed` · `/copy mocanaru meta-ads spring-video`
인자: client_id=$client_id, 채널=$channel, project_id=$project_id (생략 시 `general`)

## 0. 입력 확인
- client_id 가 비었거나 모호하면 **고객사 자료를 읽기 전에** 질문한다. 형식이 틀리면(`py -3 scripts/session.py set` 이 거부) 사유를 그대로 전달하고 중단.
- 채널이 비었으면 질문. 채널 값은 `agency/knowledge/channel-specs.json` 의 channel 키와 맞추면 길이 검수가 된다(없으면 길이 검수 불가를 알린다).

## 1. 준비
1. `py -3 scripts/session.py set $client_id` (다른 고객사가 활성이면 중단·새 세션 안내)
2. `clients/$client_id/brand.md`, `projects/{project_id}/brief.md` 를 읽는다. 또 `clients/$client_id/playbook/` 에서 **가장 높은 버전의 `playbook-vN.md`** 를 읽는다(톤앤매너·콘텐츠 기둥·금지어·법적 주의). 없으면 "Playbook 없음"을 가정·미확인에 적고, 있어도 비어 있는 항목(미정)은 지어내지 않는다. Playbook의 톤·금지어는 브랜드 규칙과 함께 전달서의 "적용할 브랜드·피드백 규칙"에 넣는다.
3. 활성 규칙: `py -3 scripts/feedback.py active --client $client_id --project {project_id} --channel $channel` (승인된 규칙만 나온다. 후보는 쓰지 않는다.)
4. 진행을 막는 핵심 정보(목적·제품·핵심 메시지·형식/분량)가 없으면 필요한 것만 묶어 질문. 임시 가정으로 진행 가능한 것은 가정으로 표시하고 초안 작성. 수치·근거 자료를 지어내지 않는다.
5. 작업 ID: `py -3 scripts/taskid.py copy`

## 2. 작성 → 검수 (필요한 역할만)
1. 전달서(`agency/templates/handoff.md` 항목 전부)를 채워 **copywriter** 에이전트 호출. 결과 경로는 `py -3 scripts/save_version.py next --client $client_id --project {project_id} --area deliverables --stem {작업ID} --ext .md` 로 받은 경로.
2. **reviewer** 호출(전달서에 카피 파일·CSV·활성 규칙 ID 포함). REVISE 이면 copywriter 로 되돌려 재작업(새 버전). **재작업 최대 2회.** 그래도 남는 쟁점은 쟁점·선택지로 사용자에게 전달.
3. 상태 기록: `py -3 scripts/status.py deliverable --client $client_id --project {project_id} --file {파일명} --state draft` 후 검수 결과에 따라 `review_passed` / `needs_revision`. (`approved` 는 사용자가 승인했을 때만, `--by 승인자`)
4. `tasks.md` 에 작업 한 줄 추가.

사용자가 "1안만" 요청하면 1안만. 3안은 어휘 변형이 아니라 소구·전략이 달라야 한다.

## 3. 사용자에게 보고
결과 요약 · 카피 3안(소구 의도) · 글자 수 검증 결과(규격이 unverified면 "참고값, 공식 규격 확인 필요") · 출처/입력 파일 · 가정·미확인 · 검수 결과("AI 검수 통과 — 사용자 승인·법적 적합성 아님") · 사용자 결정 필요 · 다음 행동 · 저장 경로.

## 완료 기준
카피 파일(+CSV)이 새 버전으로 저장, copy_check 실행 결과 반영, 검수 결과와 상태 기록, 승인 대기 상태로 보고.
