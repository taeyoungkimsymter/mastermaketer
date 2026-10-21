---
name: video
description: 영상 기획. 브리프 → 컨셉 3안 → 사용자 선택 → 구성·스크립트·텍스트 콘티. 선택 전에는 상세 제작으로 넘어가지 않는다.
disable-model-invocation: true
argument-hint: "<client_id> <project_id> [선택: 컨셉 ID 예 B | 위임]"
arguments: [client_id, project_id, selection]
allowed-tools: Bash(py -3 scripts/*)
---

# /video — 영상 기획

입력 예: `/video mocanaru spring-video` (컨셉 3안까지) → 이어서 `/video mocanaru spring-video B` (B안 선택 후 상세)
인자: client_id=$client_id, project_id=$project_id, selection=$selection

## 0. 준비
- 누락 시 질문. 프로젝트가 없으면 `py -3 scripts/scaffold.py project --client $client_id --id {새 ID} --name "{이름}"` 로 새로 만든다. `py -3 scripts/session.py set $client_id`.
- `py -3 scripts/status.py show --client $client_id --project $project_id` 로 현재 단계 확인. brief.md·brand.md·활성 규칙(`feedback.py active --client .. --project ..`)을 읽는다. 핵심 정보 누락은 묶어서 질문, 가능한 것은 가정 표시.

## 1단계: 컨셉 3안 (stage가 brief/concepts이고 selection이 없을 때)
1. **strategist**(방향·소구) + 필요 시 **pd**(제작 가능성·난이도)·**copywriter**(대표 카피 한 줄) 협업. 독립적인 작업만 병렬. 같은 파일을 동시에 쓰지 않는다(각자 다른 새 버전 파일 → 디렉터가 하나로 통합해 `video-concepts` 새 버전 저장).
2. 3안은 소구·전략·연출 방식이 달라야 한다. 안마다: 한 줄 콘셉트, 소구 의도, 연출, 제작 난이도·비용 영향, 리스크. 추천안과 이유.
3. `py -3 scripts/status.py set-stage --client .. --project .. --stage concepts`
4. **여기서 멈춘다.** 사용자에게 선택을 요청한다("A/B/C 중 선택 또는 '위임'"). 상세 제작 금지.

## 2단계: 선택 후 (selection 이 있거나 사용자가 답했을 때)
1. 선택: `py -3 scripts/status.py select-concept --client .. --project .. --id {A|B|C} --by "{선택자}"`. 사용자가 **위임**했으면 추천안을 명시하고 `--delegated --by "사용자 위임(추천안 {id})"` 로 기록한 뒤 진행.
2. `py -3 scripts/status.py set-stage ... --stage script` (컨셉 미선택이면 오류로 막힌다 — 우회 금지).
3. **pd** 로 구성(타임라인) → 스크립트 → 텍스트 콘티(`storyboard.csv`), **copywriter** 로 대사·자막. 컷 길이 합계를 `production_check.py cuts --target {목표 초}` 로 확인. 영상 파일을 직접 볼 수 없는 참고 영상은 자막·타임코드·대표 프레임을 요청한다.
4. **reviewer** 검수(재작업 최대 2회). `set-stage storyboard`, 산출물 상태 기록, tasks.md 갱신.

## 사용자에게 보고
요약 · 산출물 · 컷 길이 합계 검증 결과 · 가정/미확인 · 검수 결과(AI 검수 ≠ 승인) · 사용자 결정 필요 · 다음 행동(`/shoot-plan`).

## 완료 기준
1단계: 컨셉 3안 저장 + 선택 요청에서 정지. 2단계: 선택(또는 위임) 기록 + 구성·스크립트·콘티 저장 + 컷 합계 검증.
