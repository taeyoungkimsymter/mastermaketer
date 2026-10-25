# 마스터마케터 리디자인 설계서

이 문서는 디자인 시안(`docs/mockups/`)을 코드로 옮기기 위한 설계서다.
기능 로직(세션 고정, AI 검수, 피드백 규칙, data/raw 분석 등)은 바꾸지 않고 **화면 구조·디자인·용어만** 바꾼다.

## 0. 원칙

- 기존 기능은 지우지 않는다. 메뉴 위치만 옮긴다.
- 숫자는 실제 상태 파일·데이터에서 계산한 값만 쓴다. 값이 없으면 `—`와 "연동 필요" 같은 안내를 쓴다. 예시 숫자를 하드코딩하지 않는다.
- "한 세션에 한 고객사(어카운트)" 규칙과 전환 확인창은 그대로 둔다.
- 단계별로 작업하고, 단계마다 브라우저(127.0.0.1:8765)에서 확인한다.

## 1. 디자인 토큰 (CSS 변수)

`:root`에 라이트 값, `[data-theme="dark"]`에 다크 값을 둔다. 다크 모드는 토글로 전환하고 선택은 localStorage에 저장한다(try/catch).

| 토큰 | 라이트 | 다크 | 용도 |
|---|---|---|---|
| --bg | #F4F5F9 | #0E0F1C | 페이지 배경 |
| --surface | #FFFFFF | #171829 | 카드 |
| --surface-2 | #F1F2F7 | #1F2136 | 카드 안 작은 칸, 표 헤더 |
| --border | #E2E3EC | #2B2D45 | 테두리 |
| --text | #15172B | #ECEDF5 | 본문 |
| --muted | #5B5F73 | #A3A6BC | 보조 글자 |
| --accent | #3533A8 | #A9A6FF | 선택된 탭, 링크, 포인트 글자 |
| --accent-soft | #ECEBFA | #25244D | 선택된 항목 배경, 코드 칩 |
| --btn | #3533A8 | #4B48D0 | 주요 버튼 배경 (글자 흰색) |
| --rail | #1B1A4B | #0A0A18 | 맨 왼쪽 아이콘 레일 |
| --ok / --ok-soft | #13784F / #E3F4EC | #5FD3A2 / #16332A | On Track |
| --warn / --warn-soft | #8A5300 / #FDF1DC | #F2B45A / #3A2C14 | At Risk |
| --late / --late-soft | #B42318 / #FDE8E6 | #FF8A80 / #3B1D1F | Delayed, 딜레이 |

- 글꼴: 본문 Noto Sans KR(또는 Pretendard), 영문 제목·숫자·코드 Inter.
- 모서리: 카드 14~16px, 버튼 10px, 칩 원형(높이의 절반).
- 크기: 본문 13~14px, 탭 14px, 페이지 제목 20px(메인은 28px), KPI 숫자 26~28px.
- 그림자·그라데이션은 쓰지 않는다. 경계는 1px 테두리로만.

## 2. 화면 흐름

```
All Accounts (메인)  →  어카운트 클릭  →  Overview (그 어카운트 팀 화면)  →  팀 탭 6개
```

- 맨 왼쪽 아이콘 레일: 로고, All Accounts, Calendar, Team, Reports, (아래) 다크 모드 토글.
- 어카운트 화면에서만 두 번째 칸(어카운트 목록: 검색, Pinned, Active, + New Account)이 보인다.

## 3. 메인 · All Accounts

- 헤더: 작은 라벨 `MASTER MARKETER`, 제목 `All Accounts`, 설명 "운영 중인 어카운트와 팀 현황을 한눈에 봅니다.", 오른쪽에 검색창·다크 모드 버튼·`+ New Account`.
- KPI 카드 5개 (영문 라벨 + 한글 라벨 + 숫자 + 보조문): ACTIVE ACCOUNTS 운영 어카운트 / PENDING CONFIRM 컨펌 대기 / OVERDUE 딜레이 / POSTING 이번 주 포스팅(완료/예정) / AD SPEND 이번 달 집행 금액.
- 필터 칩: All · On Track · At Risk · Onboarding (개수 포함).
- 어카운트 카드 (그리드, 카드 전체가 링크):
  - 이니셜 모노그램, 어카운트명, 메타(데모 여부 · Retainer/Project), 상태 칩(On Track / At Risk / Delayed / Onboarding)
  - Phase 진행 바: Brief → Concept → Production → Review → Confirm → Report (6단계, 예: "Concept 2 / 6")
  - 숫자 3칸: 컨펌 대기 · 딜레이 · 이번 주 포스팅
  - Team: AE AP CW AD PD MP 코드 칩. 배정된 역할은 채운 칩, 없는 역할은 점선 칩.
  - Next: 가장 가까운 일정 한 줄, 오른쪽 `Open ›`
  - 마지막에 점선 `+ New Account` 카드
- 하단 2칸: `This Week`(전 어카운트 일정 리스트: 날짜 · 역할 코드 · 내용 · 어카운트명), `Team Workload`(역할 코드별 진행 중 작업 수 막대).

## 4. 어카운트 화면 공통

- 헤더: `‹ All Accounts › 어카운트명` + 상태 칩, 아래 메타 줄(Retainer · Phase · 세션 ID · Memo ✎).
- 헤더 오른쪽: `컨펌 대기 N` 버튼(주요 버튼), 다크 모드 버튼, ⋯ 메뉴(피드백 룰, 담당자 배정, 어카운트 정보).
- 가로 탭 (밑줄 방식, 선택 탭은 --accent 굵게):
  `Overview · Account · Strategy · Copy · Art · Film · Performance`
- 각 팀 탭 안은 같은 틀: 제목(영문) + "코드 · 한 줄 설명" → 칩 줄(세부 메뉴) → 내용.
- 팀 탭 공통 요소: My Tasks(배정된 리퀘스트), 작업물 목록(버전·상태), 컨펌 요청 버튼.

## 5. Overview (대표 화면)

- KPI 4개: 컨펌 대기(역할별 내역) · 딜레이(내역) · 이번 주 포스팅(진행 바) · 이번 주 집행 금액.
- `Team Status`: 역할 카드 6장 (3×2 그리드)
  - 코드 칩(AE 등) + 직무명(Account Executive) + "한글 롤 · 담당 이름"
  - 상태 칩: On Track / At Risk / Delayed / Setup
  - 핵심 숫자 3칸, `다음` 한 줄
  - 하단: `컨펌 N건` 버튼 → 오른쪽 패널(400px)에서 컨펌 / 수정 요청. 없으면 "컨펌 대기 없음". 오른쪽 `Open ›` → 해당 탭.
  - 컨펌 패널 하단 문구: "AI 검수 통과 ≠ 대표 컨펌 ≠ 법적 적합성 확정"
- `This Week`: 7일 칸 그리드, 칸마다 역할 코드 + 일정.

| 카드 | 코드 | 직무명 | 핵심 숫자 |
|---|---|---|---|
| 어카운트 | AE | Account Executive | 오픈 리퀘스트 · 이번 주 포스팅 · 오픈 이슈 |
| 전략 | AP | Account Planner | 컨셉 상태 · 경쟁사 신규 소재 · 레퍼런스 |
| 카피 | CW | Copywriter | 작성 중 · 컨펌 요청 · 픽스 |
| 아트 | AD | Art Director | 시안 · 리사이징 · 리젝 |
| 필름 | PD | Producer | 슈팅 D-day · 콘티 · 편집 |
| 퍼포먼스 | MP | Media & Performance | 집행 금액 · CTR · ROAS |

## 6. 팀 탭과 기존 메뉴 매핑

| 탭 | 칩(세부 메뉴) | 기존 메뉴에서 옮겨올 것 |
|---|---|---|
| Overview | — | 스케줄·보고서·기획·제작·광고의 "전체보기" 5개를 통합 |
| Account (AE) | Brief · Content Calendar · Client Request · Issue Log · Meeting Note · Monthly Report | 스케줄 › 캘린더(업로드 확인 포함), 보고서 › 회의록 정리 |
| Strategy (AP) | Reference Board · Competitor Watch · Keyword Insight · Concept | 기획 › 레퍼런스 보드, 브랜드 아카이브, 광고 › 검색 키워드(인사이트용) |
| Copy (CW) | Copy Options · Detail Page · Script | 기획 › 카피 3안, 제작 › 상세페이지 |
| Art (AD) | Key Visual · Ad Creative · Resizing · Brand Guide | 제작 › AI 광고 제작 |
| Film (PD) | Storyboard · Shooting Plan · On-set · Post-production | 기획 › 영상 기획, 제작 › 촬영 계획, 현장 대응 |
| Performance (MP) | Media Report · Search Keyword · Content Performance · Performance Report | 광고 › 전체 요약, Google Ads, GA, Meta, 보고서 › 성과 리포트 |
| ⋯ 메뉴 | — | 제작 › 피드백 규칙, 결과물(컨펌은 Overview 패널로) |

- "바로 가기" 카드는 모두 삭제한다(탭이 대신함).

## 7. Account 탭 상세

### Client Request
- 상단 KPI 3개: 오픈 리퀘스트 · 딜레이 · 이번 주 클로즈.
- 배너: "Meeting Note에서 뽑은 리퀘스트 후보 N건" + `후보 보기` + `+ 리퀘스트 등록`. (기존 회의록 정리의 액션아이템 후보를 재사용)
- 표 열: 접수 · 리퀘스트 · 채널(메일/카톡/미팅) · 담당(역할 코드) · 데드라인 · 우선순위(High/Normal) · 상태(배정 → 진행 중 → 클로즈, 데드라인 지나면 딜레이).
- 담당을 지정하면 그 팀 탭의 My Tasks에 올라가고, 데드라인이 지나면 Overview 딜레이에 합산.

### Issue Log
- 월 선택(‹ 2026년 10월 ›) + 유형 칩: All · 일정 딜레이 · 소재 리젝 · 성과 이상 · 매체 정책·계정 · 클라이언트 클레임 + `+ 이슈 로그`.
- 표 열: 발생 · 유형 · 내용·영향 · 조치·재발 방지 · 상태(해결 / 조치 중 / 미해결).
- 하단 카드 2개: "피드백 룰 후보"(같은 사유의 리젝이 반복되면 제안, `룰로 컨펌`/`보류` — 기존 피드백 규칙 승인 흐름 재사용), "Monthly Report 연동"(이번 달 이슈가 리포트 Issue 섹션에 들어감).

### Content Calendar (포스팅 관리)
- 보기 토글: 캘린더 / 리스트(포스팅 관리).
- 채널 칩(All · 인스타그램 · 블로그 · 유튜브 …), 상태 칩(컨펌 대기 · 딜레이) + `+ 포스팅 일정`.
- 표 열: 포스팅일 · 채널 · 콘텐츠 · 제작(역할 코드) · 상태(포스팅 예정 → 컨펌 대기 → 포스팅 완료) · 포스팅 링크.
- 포스팅일이 지났는데 링크가 없으면 딜레이. 링크를 등록하면 Performance 탭 Content Performance 수집 대상.

## 8. Performance 탭 상세

- 조건 바(카드 1개, 두 줄): 1줄 칩(Media Report · Search Keyword · Content Performance · Performance Report, 오른쪽 초기화) / 2줄 기간 표시 + 세그먼트(최근 7일 · 1개월 · 3개월 · 6개월) + 매체 토글(Google Ads · GA · Meta, 미연동은 OFF) + `CSV 불러오기`.
- KPI 5개: 노출 · 클릭 · CTR · 전환 · 집행 금액 (데이터 없으면 `—`).
- `Daily Trend` 차트 카드: 일별/주별/월별 세그먼트, 데이터 없으면 빈 상태 문구 "플랫폼에서 내려받은 CSV·XLSX를 data/raw에 넣으면 추이가 표시됩니다."
- 매체 카드 3개(Google Ads · Google Analytics · Meta 광고): 연동 상태 칩, 설명, `상세 보기 ›`.
- 하단 문구 유지: "수치는 스크립트 계산값만 씁니다. 이 화면은 광고 집행·예산 변경을 하지 않습니다."
- 오른쪽 끝 세로 손잡이 `‹ 상세 보기` → 상세 패널.

## 9. 용어 (UI 문구 전체에 적용)

| 기존 | 변경 |
|---|---|
| 고객사 | Account / 어카운트 |
| 광고주 | 클라이언트 |
| 홈 / 전체보기 | Overview |
| 승인 | 컨펌 |
| 지연 | 딜레이 |
| 업로드·게시 | 포스팅 |
| 광고주 요청 | Client Request (리퀘스트) |
| 운영 이슈 | Issue Log |
| 회의록 | Meeting Note |
| 월간 보고 | Monthly Report |
| 반려 | 리젝 |
| 확정 | 픽스 |
| 촬영 | 슈팅 |
| 광고비 | 집행 금액 |
| 정상/주의/지연/연동 필요 | On Track / At Risk / Delayed / Setup |

## 10. 작업 순서 제안

1. 디자인 토큰 + 라이트/다크 토글 (전체 색이 한 번에 바뀌는지 확인)
2. 아이콘 레일 + All Accounts 메인
3. 어카운트 헤더 + 가로 탭 + 기존 화면 재배치 (기능 그대로, 위치만 이동)
4. Overview (Team Status 카드 + 컨펌 패널)
5. Account 탭 (Client Request · Issue Log · Content Calendar)
6. Performance 탭
7. 용어 일괄 정리
