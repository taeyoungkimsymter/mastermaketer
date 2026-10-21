---
name: report
description: 광고 CSV·엑셀을 검증·계산하고 주요 지표, 비교, 해석, 다음 행동이 담긴 성과 리포트를 만든다.
disable-model-invocation: true
argument-hint: "<client_id> <기간 예: 2026-09 | 2026-09-01~2026-09-30> [project_id]"
arguments: [client_id, period, project_id]
allowed-tools: Bash(py -3 scripts/*)
---

# /report — 성과 리포트

입력 예: `/report mocanaru 2026-09` · `/report mocanaru "2026-09-01~2026-09-14"`
인자: client_id=$client_id, 기간=$period, project_id=$project_id (생략 시 `general`)

## 0. 입력 확인
- client_id 누락·모호 시 질문(고객사 자료 읽기 전). `py -3 scripts/session.py set $client_id`.
- 기간 해석: `YYYY-MM` → 그 달 1일~말일, 비교 기간 기본값은 직전 달 전체. `시작~종료` → 사용자가 비교 기간을 지정하지 않으면 직전 동일 길이 기간을 제안하고 확인(또는 비교 없음).
- 데이터: `clients/$client_id/data/raw/` 의 CSV/XLSX(Glob). 여러 개면 어떤 파일인지 질문. **원본은 수정하지 않는다.**
- 아래 메타를 질문(모르면 unknown으로 두고 한계로 보고): 광고비 VAT 포함 여부, 전환 정의, 어트리뷰션 기준, 데이터 확정 여부(진행 중 월인지), 데이터 시간대(기본 Asia/Seoul), 통화.
- 데이터가 없으면: 필요한 입력(열: date,channel,campaign,impressions,clicks,cost,conversions[,revenue])을 안내하고, "분석 제한 보고서"(무엇을 못 하는지, 필요한 입력, 다음 단계)를 만든다. 수치를 지어내지 않는다.

## 1. 분석 → 편집 → 검수
1. 작업 ID: `py -3 scripts/taskid.py report`. 전달서를 채워 **performance-analyst** 호출 → `ad_report.py ... --save` 실행, `research/` 에 분석 메모 새 버전.
2. 외부 조사(시즌·경쟁사)는 사용자가 요청했거나 가설 검증에 꼭 필요할 때만 **researcher**.
3. **report-writer** 호출 → `deliverables/` 에 `agency/templates/report.md` 구조의 리포트 새 버전. 새 수치 금지.
4. **reviewer** 호출(분석 JSON과 리포트 대조). REVISE 이면 재작업 **최대 2회**. 남는 쟁점은 사용자에게.
5. 상태 기록(`status.py deliverable ... draft` → `review_passed`/`needs_revision`), tasks.md 갱신.

## 2. 사용자에게 보고
요약 3줄 · 핵심 수치(스크립트 계산) · 데이터 한계/비교 제한(진행 중 기간, 기간 길이 불일치, VAT/전환 정의 미확인 등) · 가설(가설임을 표시) · 권장 액션 · 사용자 결정 필요 · 저장 경로. 3안 원칙은 적용하지 않는다.

## 완료 기준
ad_report 실행 결과(JSON/MD)와 리포트가 새 버전으로 저장되고, 모든 경고·제한이 리포트에 노출되며, 검수 결과가 기록됨.
