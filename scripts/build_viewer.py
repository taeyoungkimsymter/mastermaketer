"""샘플 실행 결과를 브라우저에서 볼 수 있는 단일 HTML(docs/viewer.html)로 만든다. 로컬 전용, 외부 전송 없음.

  py -3 scripts/build_viewer.py
"""
import html
import json
import re
from pathlib import Path

import common

ROOT = common.root()
SRC = ROOT / "examples" / "outputs" / "demo-cafe-report-2026-09"
OUT = ROOT / "docs" / "viewer.html"


def inline(s):
    s = html.escape(s)
    s = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", s)
    return re.sub(r"`(.+?)`", r"<code>\1</code>", s)


def md_to_html(text):
    out, lines, i = [], text.splitlines(), 0
    while i < len(lines):
        ln = lines[i]
        if ln.startswith("|"):
            rows = []
            while i < len(lines) and lines[i].startswith("|"):
                rows.append([c.strip() for c in lines[i].strip().strip("|").split("|")])
                i += 1
            head, body = rows[0], [r for r in rows[2:]]
            out.append("<div class='tw'><table><thead><tr>" + "".join(f"<th>{inline(c)}</th>" for c in head) + "</tr></thead><tbody>"
                       + "".join("<tr>" + "".join(f"<td>{inline(c)}</td>" for c in r) + "</tr>" for r in body) + "</tbody></table></div>")
            continue
        m = re.match(r"^(#{1,3}) (.*)", ln)
        if m:
            out.append(f"<h{len(m.group(1)) + 1}>{inline(m.group(2))}</h{len(m.group(1)) + 1}>")
        elif re.match(r"^\s*[-*] ", ln):
            items = []
            while i < len(lines) and re.match(r"^\s*[-*] ", lines[i]):
                items.append(f"<li>{inline(re.sub(r'^\s*[-*] ', '', lines[i]))}</li>")
                i += 1
            out.append("<ul>" + "".join(items) + "</ul>")
            continue
        elif re.match(r"^\d+\. ", ln):
            items = []
            while i < len(lines) and re.match(r"^\d+\. ", lines[i]):
                items.append(f"<li>{inline(re.sub(r'^\d+\. ', '', lines[i]))}</li>")
                i += 1
            out.append("<ol>" + "".join(items) + "</ol>")
            continue
        elif ln.startswith(">"):
            out.append(f"<blockquote>{inline(ln.lstrip('> '))}</blockquote>")
        elif ln.strip():
            out.append(f"<p>{inline(ln)}</p>")
        i += 1
    return "\n".join(out)


def kpis():
    d = json.loads((SRC / "analysis-2026-09-01_2026-09-30-v1.json").read_text(encoding="utf-8"))["current"]["metrics"]
    names = [("ctr", "CTR %"), ("cpc", "CPC 원"), ("cpm", "CPM 원"), ("cvr", "CVR % (분모=클릭)"), ("cpa", "CPA 원"), ("roas", "ROAS %")]
    return "".join(f"<div class='k'><span>{n}</span><b>{float(d[k]):,.2f}</b></div>" for k, n in names)


OVERVIEW = """
<h2>이 화면은 무엇인가요</h2>
<p>대행사 마케터용 AI 주니어 팀의 <b>가상 샘플 실행 결과</b>입니다. 실제 고객사 데이터가 아니며, AI가 만든 초안을 사람이 검토하지 않았습니다.</p>
<h3>명령 7개 (Claude Code 안에서 실행)</h3>
<div class='tw'><table><thead><tr><th>명령</th><th>하는 일</th><th>이 화면의 예시</th></tr></thead><tbody>
<tr><td><code>/new-client</code></td><td>고객사 등록 인터뷰</td><td>—</td></tr>
<tr><td><code>/copy</code></td><td>카피 3안 + 검수</td><td>—</td></tr>
<tr><td><code>/report</code></td><td>성과 계산·해석·리포트</td><td><b>실행됨 (리포트·검수 탭)</b></td></tr>
<tr><td><code>/meeting</code></td><td>회의록·피드백 후보</td><td>—</td></tr>
<tr><td><code>/video</code></td><td>컨셉 3안 → 선택 → 콘티</td><td>—</td></tr>
<tr><td><code>/shoot-plan</code></td><td>촬영 일정·콜시트·리스크</td><td>—</td></tr>
<tr><td><code>/onset</code></td><td>현장 대응</td><td>—</td></tr></tbody></table></div>
<h3>역할</h3><p>디렉터(메인 세션) · 리서처 · 전략 기획자 · 카피라이터 · PD · 퍼포먼스 분석가 · 리포트 작성자 · 커뮤니케이션 비서 · 독립 검수자</p>
<h3>꼭 알아둘 점</h3><ul>
<li>고객사 격리는 실수 방지 장치이며 보안 경계가 아닙니다 (docs/limitations.md).</li>
<li>채널 글자 수 규격은 전부 미검증 상태입니다.</li>
<li>AI 검수 통과 ≠ 사용자 승인 ≠ 법적 적합성 확정.</li></ul>
"""

PAGE = """<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>AI 주니어 팀 샘플 뷰어</title><style>
:root{--bg:#f7f7f5;--fg:#1d1d1b;--mut:#6b6b66;--card:#fff;--line:#e3e3de;--acc:#1f5eff}
@media(prefers-color-scheme:dark){:root{--bg:#161614;--fg:#ececea;--mut:#9a9a94;--card:#201f1d;--line:#34332f;--acc:#7da2ff}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.65 system-ui,'Malgun Gothic',sans-serif}
header{padding:20px 16px 0;max-width:980px;margin:auto}h1{font-size:1.35rem;margin:0 0 4px}.sub{color:var(--mut);font-size:.9rem}
.tabs{display:flex;gap:4px;margin-top:16px;border-bottom:1px solid var(--line);overflow-x:auto}
.tabs button{background:none;border:0;padding:10px 14px;color:var(--mut);font:inherit;cursor:pointer;border-bottom:2px solid transparent;white-space:nowrap}
.tabs button.on{color:var(--fg);border-color:var(--acc);font-weight:600}
main{max-width:980px;margin:auto;padding:8px 16px 64px}section{display:none}section.on{display:block}
h2{font-size:1.25rem;margin:1.6em 0 .4em}h3{font-size:1.05rem;margin:1.4em 0 .3em}h4{font-size:.95rem}
.tw{overflow-x:auto;margin:.6em 0}table{border-collapse:collapse;width:100%;font-size:.9rem;background:var(--card)}
th,td{border:1px solid var(--line);padding:6px 10px;text-align:left;vertical-align:top}th{background:var(--bg);font-weight:600}
code{background:var(--card);border:1px solid var(--line);border-radius:4px;padding:0 4px;font-size:.9em}
blockquote{margin:.6em 0;padding:4px 12px;border-left:3px solid var(--acc);color:var(--mut)}
.kp{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin:16px 0}
.k{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:10px 12px}.k span{display:block;color:var(--mut);font-size:.78rem}.k b{font-size:1.3rem}
.warn{background:var(--card);border:1px solid var(--line);border-left:3px solid #d98e00;padding:8px 12px;border-radius:6px;font-size:.9rem}
</style></head><body><header><h1>대행사 AI 주니어 팀 — 샘플 뷰어</h1>
<div class="sub">가상 데이터 · AI 초안(사람 미검토) · 로컬 파일</div>
<div class="tabs"><button class="on" data-t="a">개요</button><button data-t="b">리포트 예시</button><button data-t="c">검수 결과</button></div></header>
<main><section id="a" class="on">%OVERVIEW%</section>
<section id="b"><div class="kp">%KPI%</div><div class="warn">2026-09 (30일) 지표, 가상 샘플 데이터. 어트리뷰션·채널 간 중복은 미확인입니다.</div>%REPORT%</section>
<section id="c">%REVIEW%</section></main>
<script>document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tabs button,section').forEach(e=>e.classList.remove('on'));b.classList.add('on');document.getElementById(b.dataset.t).classList.add('on')})</script>
</body></html>"""

if __name__ == "__main__":
    rep = (SRC / "report-2026-09-v1.md").read_text(encoding="utf-8")
    rev = (SRC / "review-report-2026-09-v1.md").read_text(encoding="utf-8")
    OUT.write_text(PAGE.replace("%OVERVIEW%", OVERVIEW).replace("%KPI%", kpis())
                   .replace("%REPORT%", md_to_html(rep)).replace("%REVIEW%", md_to_html(rev)), encoding="utf-8")
    print(f"생성: {OUT}")
