# 아키텍처

## 구성
```
사용자 ── /명령(스킬) ──▶ 메인 세션 = 디렉터
                             │ 요청 분류 · 입력 확인 · 전달서 작성 · 상태/규칙 갱신
                             ├─▶ 서브에이전트(필요한 역할만): researcher · strategist · copywriter · pd ·
                             │                                performance-analyst · report-writer · comms-assistant
                             └─▶ reviewer(독립 검수)
                    scripts/*.py (계산·검증·상태)  ◀── 에이전트가 Bash 로 호출
                    hook(guard_paths.py)           ◀── 모든 파일/검색/Bash 호출 전 검사
```
- **디렉터 = 메인 세션**: 별도 프로세스를 두지 않는다. 서브에이전트는 `tools` 에서 `Agent` 를 뺐고 `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH=1` 로 재위임을 막는다.
- **공통 규칙 전달**: 서브에이전트는 CLAUDE.md 를 자동으로 읽고, `skills: [handoff-rules]` 로 공통 작업 규칙을 시작 시 받는다. 고객사별 맥락은 디렉터가 **전달서**(`agency/templates/handoff.md`)로 넘긴다.
- **에이전트 메모리(`memory:`) 미사용**: 공통 위치에 고객사 정보가 쌓이는 것을 피하기 위함.

## 업무별 호출 경로
| 업무 | 경로 |
|---|---|
| 카피 | copywriter → reviewer |
| 리포트 | performance-analyst → report-writer → reviewer (researcher 는 필요 시) |
| 제안(후속) | researcher → strategist → 제작 역할 → reviewer |
| 영상 | strategist(+pd, copywriter) → **사용자 선택** → pd(+copywriter) → reviewer |
| 회의록 | comms-assistant → 필요한 항목만 reviewer |
| 현장 | 디렉터가 pd 원칙으로 직접, 짧게 |

## 데이터 흐름과 상태 책임
- 원본: `clients/{id}/data/raw/` (읽기 전용) → 가공/계산 결과 `data/processed/` → 산출물 `projects/{pid}/deliverables|research|review|production/` (모두 `-v{N}` 새 버전).
- `status.json` 필드: client_id, project_id, name, stage, selected_concept, deliverables{파일:{state,by,at}}, updated_at, updated_by. **갱신 책임자: 디렉터**(`status.py` 경유, 서브에이전트는 호출하지 않음).
- 피드백: `feedback-log.json`(원본) + `feedback-log.md`(자동 생성 보기). 상태 후보→승인|폐기, 승인→대체됨.
- 활성 고객사: `.agency-state/active-client.json` (git 제외). 스크립트와 hook 이 공통으로 참조.

## 스크립트 (표준 라이브러리만)
| 파일 | 역할 |
|---|---|
| common.py | ID 검증, 경로 해석, 활성 고객사 잠금, 버전 저장, brand.md 파서, 혼입 탐지 |
| session.py | 활성 고객사 set/get/clear |
| guard_paths.py | PreToolUse hook (fail-closed) |
| scaffold.py | 고객사·프로젝트 폴더 생성(덮어쓰기 없음) |
| save_version.py / taskid.py | 다음 버전 경로·작업 ID |
| status.py | 단계·컨셉 선택 게이트·산출물 상태 |
| feedback.py | 후보/승인/폐기/활성 규칙, 충돌 처리 |
| ad_report.py | 입력 검증 + 지표/증감 계산(Decimal) |
| copy_check.py | 글자 수(검증된 규격만 판정)·금지어·필수 문구·위험 표현·혼입 |
| production_check.py | 컷 합계, 일정 충돌, 근거 없는 확정, 리스크 표 열 |
| scan_inputs.py | 입력 문서 속 지시문 의심 문장 탐지(최선 노력) |
| install_samples.py | 가상 샘플 설치 |

## 공식 문서로 확인한 형식 (Claude Code 2.1.285, 2026-10-21 확인)
- 에이전트: `.claude/agents/*.md`, frontmatter `name`·`description` 필수, `tools`(허용 목록), `disallowedTools`, `skills`(전체 내용 시작 시 주입), `maxTurns`, `memory` 등. 서브에이전트도 기본적으로 Agent 도구로 재위임 가능 → 제한 필요.
- 스킬: `.claude/skills/{이름}/SKILL.md`, `.claude/commands/` 와 병합되어 둘 다 `/이름` 을 만든다 → **중복 정의하지 않고 skills 만 사용**. 인자: `$ARGUMENTS`, `$0`/`$1`, `arguments:` 로 선언한 `$이름`. `disable-model-invocation: true` 로 사용자 호출 전용(단, 서브에이전트 preload 불가 → 공용 규칙 스킬은 false + `user-invocable: false`).
- hook: `settings.json` 의 `hooks.PreToolUse[].matcher/hooks[].type=command`, stdin JSON(`tool_name`, `tool_input`, `cwd` …), 차단은 exit 2(+stderr) 또는 exit 0 + `hookSpecificOutput.permissionDecision`. `${CLAUDE_PROJECT_DIR}` 사용 가능.
- 권한: `permissions.allow/deny`, `Read()/Edit()` 는 gitignore 패턴(`//` 절대, `~/`, `/`, `./`).
- 도구별 `tool_input` 필드명(Read/Write/Edit=`file_path`, Glob/Grep=`path`, Bash=`command`)은 이 세션의 도구 스키마와 실제 hook 호출로 확인했다. 문서 페이지에는 일부 필드가 나와 있지 않았다.
