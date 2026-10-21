# 대행사 마케터용 AI 주니어 팀 (Claude Code 프로젝트 템플릿)

종합·디지털 대행사에서 고객사 3~6곳을 맡는 AE·기획자·퍼포먼스 마케터가 반복 업무(카피 초안, 성과 리포트, 회의록, 영상 기획, 촬영 준비)를 AI 주니어에게 맡기고 판단과 고객 커뮤니케이션에 집중하도록 만든 **파일 기반** 템플릿입니다. 서버·DB 없음. 입력은 로컬 CSV·엑셀·문서, 출력은 Markdown·CSV.

> 모든 샘플 고객사(모카나루, 라온스킨)와 데이터는 **가상**입니다. 외부 발송·게시·예약·광고 집행·예산 변경은 이 프로젝트에 포함되어 있지 않습니다.

## 준비물
- Claude Code (확인한 버전: 2.1.285), Python 3.9+ (확인: 3.14). Windows는 `py -3`, macOS/Linux는 `python3` 로 바꿔 입력하세요.
- 이 폴더를 Claude Code 프로젝트로 열고 **신뢰(trust) 대화상자를 수락**하세요. 수락 전에는 `.claude/settings.json` 의 allow 규칙이 무시됩니다(hook은 동작).

## 처음 시작 (비개발자용)
1. 터미널에서 이 폴더로 이동 → `claude` 실행 → 신뢰 수락.
2. 샘플로 연습하려면 터미널에서 한 번: `py -3 scripts/install_samples.py` (가상 고객사 2곳이 `clients/` 에 복사됩니다).
3. **한 세션 = 한 고객사.** 첫 명령이 그 세션의 고객사를 고정합니다. 고객사를 바꾸려면 세션을 끝내고 터미널에서 `py -3 scripts/session.py clear` 를 직접 실행한 뒤 새 세션을 여세요.
4. 아래 명령을 입력합니다. 부족한 정보는 AI가 묶어서 질문하고, 모르는 항목은 "미정"으로 남깁니다.

## 명령
| 명령 | 하는 일 | 결과 위치 |
|---|---|---|
| `/new-client` | 인터뷰로 brand.md·contract-scope.md 생성 | `clients/{id}/` |
| `/copy {client_id} {채널} [project_id]` | 카피 3안 + 소구 의도 + 기계 검수 | `projects/{pid}/deliverables/` |
| `/report {client_id} {기간} [project_id]` | 데이터 검증·계산·해석·다음 행동 | `deliverables/`, `data/processed/` |
| `/meeting {client_id} {project_id} [파일]` | 결정·미결·액션·피드백 후보 | `deliverables/` |
| `/video {client_id} {project_id} [선택]` | 컨셉 3안 → (선택 후) 구성·스크립트·콘티 | `deliverables/` |
| `/shoot-plan {client_id} {project_id}` | 일정·콜시트·리스크 표 | `production/` |
| `/onset {client_id} {project_id} "상황"` | 현장 대응 5단계 | 화면 + `production/` |

### 복사해서 쓰는 예시 5개 (샘플 고객사 `demo-cafe`)
```
/new-client 모카나루
/copy demo-cafe instagram-feed
/report demo-cafe 2026-09
/meeting demo-cafe spring-video inbox/meeting-2026-10-20.md
/video demo-cafe spring-video
```
이어서: `/video demo-cafe spring-video B` → `/shoot-plan demo-cafe spring-video` → `/onset demo-cafe spring-video "야외 장소에 비가 내림"`

## 결과물 상태
초안 → 검수 통과 / 수정 필요 → **사용자 승인** → 보관. "AI 검수 통과"는 사용자 승인도, 법적 적합성 확정도 아닙니다.

## 피드백이 쌓이는 방식
모델이 재학습되지 않습니다. 회의 등에서 나온 피드백은 **후보**로 저장 → 사용자가 승인자 이름과 함께 승인 → **활성 규칙**이 되어 이후 작업에 재참조됩니다. 범위(고객사/프로젝트/채널/산출물)와 유효기간이 있고, 충돌하면 임의로 덮어쓰지 않고 사용자 결정으로 남깁니다.

## 테스트 실행
```
py -3 -m unittest discover -s tests
```
자동 테스트는 계산·경로·상태 처리를 검증합니다. 창작 품질·업무 적합성·"AI가 외부 문서의 지시를 따르지 않는가"는 `tests/eval/checklist.md` 로 사람이 평가합니다.

## 구조
`CLAUDE.md`(디렉터 규칙) · `.claude/agents/`(8개 역할 중 7개 + 검수) · `.claude/skills/`(명령 7개 + 공용 규칙) · `.claude/settings.json`(권한·hook) · `agency/`(스타일·템플릿·지식) · `clients/`(고객사별, git 제외) · `scripts/`(계산·검증·hook) · `tests/` · `examples/`(가상 샘플) · `docs/`

문서: [architecture](docs/architecture.md) · [decisions](docs/decisions.md) · [**limitations**](docs/limitations.md) · [roadmap](docs/roadmap.md) · [rollout-plan](docs/rollout-plan.md)
