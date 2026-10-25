/* Team — 로컬 웹 화면. 외부 라이브러리·외부 통신 없음. */
(() => {
'use strict';

const $ = (s, r = document) => r.querySelector(s);
const TOKEN = $('meta[name=token]').content;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const store = {
  get(k, d = '') { try { return localStorage.getItem(k) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* 저장 불가 환경 */ } },
};

/* ---------- 아이콘 ---------- */
const ic = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ICONS = {
  copy: ic('<path d="M4 20l4.5-1 10-10a2.1 2.1 0 00-3-3l-10 10L4 20z"/><path d="M14 7l3 3"/>'),
  report: ic('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
  meeting: ic('<rect x="4" y="3" width="16" height="18" rx="2.5"/><path d="M8 8h8M8 12h8M8 16h5"/>'),
  video: ic('<rect x="3" y="5" width="13" height="14" rx="2.5"/><path d="M16 10l5-3v10l-5-3"/>'),
  shoot: ic('<path d="M4 8h16v11H4zM4 8l2-4h12l2 4M9 13h6"/>'),
  onset: ic('<path d="M13 3L5 14h6l-1 7 8-11h-6l1-7z"/>'),
  folder: ic('<path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/>'),
  rule: ic('<path d="M12 3l8 3v6c0 4.5-3.2 7.6-8 9-4.8-1.4-8-4.5-8-9V6l8-3z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>'),
  back: ic('<path d="M15 6l-6 6 6 6"/>'),
  sun: ic('<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>'),
  moon: ic('<path d="M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z"/>'),
  buddy: ic('<rect x="4" y="5" width="16" height="14" rx="4"/><path d="M9 11v1M15 11v1M10 15.5c1.2.8 2.8.8 4 0"/>'),
  team: ic('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.8c1.8.7 3 2.4 3.5 5.2"/>'),
  sliders: ic('<path d="M4 7h9M19 7h1M4 17h1M11 17h9"/><circle cx="16" cy="7" r="2.2"/><circle cx="8" cy="17" r="2.2"/>'),
  grid: ic('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'),
  ring: ic('<circle cx="12" cy="12" r="7"/>'),
  plus: ic('<path d="M12 5v14M5 12h14"/>'),
  check: ic('<path d="M5 12.5l4.5 4.5L19 7"/>'),
  x: ic('<path d="M6 6l12 12M18 6L6 18"/>'),
  lock: ic('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>'),
  send: ic('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  board: ic('<rect x="3.5" y="4" width="7" height="9" rx="1.8"/><rect x="13.5" y="4" width="7" height="5" rx="1.8"/><rect x="13.5" y="12" width="7" height="8" rx="1.8"/><rect x="3.5" y="16" width="7" height="4" rx="1.8"/>'),
  archive: ic('<rect x="3" y="4" width="18" height="5" rx="1.5"/><path d="M5 9v9a2 2 0 002 2h10a2 2 0 002-2V9M10 13h4"/>'),
  key: ic('<circle cx="8" cy="15" r="3.5"/><path d="M10.5 12.5L19 4M15 8l3 3"/>'),
  magic: ic('<path d="M5 19L15 9M14 5l1-2 1 2 2 1-2 1-1 2-1-2-2-1 2-1zM18 13l.7-1.4L20 11l-1.3-.6L18 9l-.7 1.4L16 11l1.3.6L18 13z"/>'),
  page: ic('<rect x="5" y="3" width="14" height="18" rx="2.5"/><path d="M8.5 8h7M8.5 12h7M8.5 16h4"/>'),
  calendar: ic('<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>'),
  plan: ic('<path d="M12 3a6 6 0 00-3.5 10.9V16h7v-2.1A6 6 0 0012 3z"/><path d="M9.5 20h5"/>'),
  build: ic('<path d="M14.5 6.5a4 4 0 005 5L10 21l-4-4 9.5-9.5z"/><path d="M13 5l6 6"/>'),
  ads: ic('<path d="M4 10v4l11 5V5L4 10z"/><path d="M18.5 9a4 4 0 010 6M7 14.5l1.2 4.5"/>'),
};

/* ---------- 명령 정의 ---------- */
const CMDS = {
  'new-client': { title: '새 어카운트 등록', icon: 'plus', group: null,
    desc: '짧은 인터뷰로 브랜드 정보와 계약 범위를 정리합니다. 모르는 항목은 "미정"으로 남습니다.' },
  copy: { title: '카피 3안', icon: 'copy', group: '업무',
    desc: '소구와 전략이 서로 다른 카피 3안을 쓰고, 글자 수·금지어·위험 표현을 기계 검수한 뒤 독립 검수까지 마칩니다.' },
  report: { title: '성과 리포트', icon: 'report', group: '업무',
    desc: '광고 CSV·엑셀을 검증하고 스크립트로 지표를 계산해, 해석과 다음 행동이 담긴 리포트를 만듭니다.' },
  meeting: { title: '회의록 정리', icon: 'meeting', group: '업무',
    desc: '결정사항·미결사항·액션아이템을 뽑고 피드백은 "후보"로만 저장합니다. 컨펌 전에는 규칙이 되지 않습니다.' },
  video: { title: '영상 기획', icon: 'video', group: '영상·슈팅',
    desc: '컨셉 3안을 제시하고 멈춥니다. 직접 고르거나 위임한 뒤에야 구성·스크립트·콘티가 만들어집니다.' },
  'shoot-plan': { title: '슈팅 계획', icon: 'shoot', group: '영상·슈팅',
    desc: '선택된 콘티로 일정·콜시트·준비물·리스크 표를 만듭니다. 확인되지 않은 허가·예약은 픽스로 쓰지 않습니다.' },
  onset: { title: '현장 대응', icon: 'onset', group: '영상·슈팅',
    desc: '슈팅 중 돌발 상황에 즉시 조치, 대체 순서, 클라이언트 보고 문구를 짧게 답합니다.' },
};
const ROLES = {
  researcher: '리서처', strategist: '전략 기획자', copywriter: '카피라이터', pd: 'PD',
  'performance-analyst': '퍼포먼스 분석가', 'report-writer': '리포트 작성자',
  'comms-assistant': '커뮤니케이션 비서', reviewer: '독립 검수자', agent: '담당자',
};
const STATES = {
  draft: ['초안', ''], review_passed: ['AI 검수 통과', 'ok'], needs_revision: ['수정 필요', 'warn'],
  approved: ['컨펌됨', 'acc'], archived: ['보관', ''],
};
const AREA = { deliverables: '산출물', review: '검수', research: '조사·분석', production: '제작' };

const ROLE_CODES = ['AE', 'AP', 'CW', 'AD', 'PD', 'MP'];
/* ---------- 상태 ---------- */
const S = {
  st: null, ws: null, view: 'welcome', tab: null, sub: null, ov: [], lib: { references: [], competitors: [], keywords: [], events: [], requests: [], issues: [], campaigns: [] }, form: {}, mode: 'month',
  run: null, // {cmd, fields, start, steps:[], logs:[], items:[], notices:[], running}
  jobId: null, since: 0, timer: null,
  res: { project: '', items: [], sel: null, text: '' },
  fb: [],
};

async function api(path, body) {
  const r = await fetch(path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'X-Token': TOKEN, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({ error: '응답을 읽을 수 없습니다.' }));
  if (!r.ok) throw new Error(j.error || '요청에 실패했습니다.');
  return j;
}

function toast(msg, kind = '') {
  const t = document.createElement('div');
  t.className = 'toast ' + kind; t.textContent = msg;
  $('#toasts').append(t);
  setTimeout(() => t.remove(), kind === 'bad' ? 7000 : 3500);
}
const guard = fn => async (...a) => { try { return await fn(...a); } catch (e) { toast(e.message, 'bad'); } };

function modal(html, onMount) {
  $('#modal').innerHTML = html; $('#modal').hidden = false; $('#scrim').hidden = false;
  const first = $('#modal input,#modal textarea,#modal button.pri'); first && first.focus();
  onMount && onMount($('#modal'));
}
function closeModal() { $('#modal').hidden = true; $('#scrim').hidden = true; }
$('#scrim').onclick = closeModal;
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

/* ---------- 마크다운 ---------- */
function inline(s) {
  s = esc(s);
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<i>$2</i>');
  return s.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
}
function mdList(lines, i) {
  const base = lines[i].match(/^(\s*)/)[1].length, ordered = /^\s*\d+[.)]\s/.test(lines[i]);
  const tag = ordered ? 'ol' : 'ul'; let out = `<${tag}>`;
  const re = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
  while (i < lines.length) {
    const m = lines[i].match(re);
    if (!m) break;
    const ind = m[1].length;
    if (ind < base) break;
    if (ind > base) { const [h, n] = mdList(lines, i); out = out.replace(/<\/li>$/, '') + h + '</li>'; i = n; continue; }
    out += `<li>${inline(m[3])}</li>`; i++;
  }
  return [out + `</${tag}>`, i];
}
function md(src) {
  const lines = String(src || '').replace(/\r/g, '').split('\n'); const out = []; let i = 0;
  while (i < lines.length) {
    const ln = lines[i];
    if (/^```/.test(ln)) {
      const buf = []; i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i++; out.push(`<pre><code>${esc(buf.join('\n'))}</code></pre>`); continue;
    }
    if (/^\s*\|/.test(ln) && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|/.test(lines[i + 1])) {
      const cells = l => l.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
      const head = cells(ln); i += 2; const rows = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) rows.push(cells(lines[i++]));
      out.push(`<div class="tw"><table><thead><tr>${head.map(c => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
      continue;
    }
    const hm = ln.match(/^(#{1,4})\s+(.*)/);
    if (hm) { out.push(`<h${hm[1].length}>${inline(hm[2])}</h${hm[1].length}>`); i++; continue; }
    if (/^\s*([-*_])\s*\1\s*\1[\s\-*_]*$/.test(ln)) { out.push('<hr>'); i++; continue; }
    if (/^\s*([-*+]|\d+[.)])\s+/.test(ln)) { const [h, n] = mdList(lines, i); out.push(h); i = n; continue; }
    if (/^>/.test(ln)) {
      const buf = []; while (i < lines.length && /^>/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ''));
      out.push(`<blockquote>${md(buf.join('\n'))}</blockquote>`); continue;
    }
    if (!ln.trim()) { i++; continue; }
    const buf = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|```|>|\s*\||\s*([-*+]|\d+[.)])\s)/.test(lines[i])) buf.push(lines[i++]);
    if (!buf.length) { buf.push(lines[i++]); }
    out.push(`<p>${buf.map(inline).join('<br>')}</p>`);
  }
  return out.join('\n');
}
function csvTable(text) {
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n') { row.push(cur.replace(/\r$/, '')); rows.push(row); row = []; cur = ''; }
    else cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  if (!rows.length) return '<p class="muted">빈 파일입니다.</p>';
  const [h, ...b] = rows;
  return `<div class="tw csv"><table><thead><tr>${h.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${b.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function renderFile(name, text) {
  if (name.endsWith('.csv')) return csvTable(text);
  if (name.endsWith('.json')) { try { return `<pre><code>${esc(JSON.stringify(JSON.parse(text), null, 2))}</code></pre>`; } catch { /* 원문 표시 */ } }
  if (name.endsWith('.md')) return `<div class="md">${md(text)}</div>`;
  return `<pre><code>${esc(text)}</code></pre>`;
}

/* ---------- 탭 구성 ---------- */
/* 하위 탭: [키, 이름, 화면]. 화면은 CMDS 명령 / results / feedback / overview / ads-overview / ads-platform */
const PLATFORMS = [
  { id: 'google-ads', label: 'Google Ads', mark: 'G',
    metrics: ['노출', '클릭', 'CTR', 'CPC', '전환', '비용'],
    about: '검색·디스플레이·유튜브 캠페인의 광고 성과' },
  { id: 'google-analytics', label: 'Google Analytics', mark: 'GA',
    metrics: ['세션', '사용자', '참여율', '전환 이벤트', '유입 채널'],
    about: '사이트·앱 방문 후 행동과 유입 경로' },
  { id: 'meta', label: 'Meta 광고', mark: 'M',
    metrics: ['도달', '노출', '클릭', 'CPC', '전환', '비용'],
    about: '인스타그램·페이스북 캠페인의 광고 성과' },
];
/* 어카운트 화면의 가로 탭(설계서 §4·§6). 칩 = 세부 메뉴 = 기존 화면. 아직 없는 메뉴(Brief·Client Request 등)는 해당 단계에서 추가한다. */
const TABS = [
  { id: 'overview', label: 'Overview', en: 'Overview', code: '', desc: '어카운트 팀의 진행 상황을 한눈에 봅니다.', subs: [] },
  { id: 'account', label: 'Account', en: 'Account', code: 'AE', desc: '클라이언트 리퀘스트를 팀에 배정하고, 포스팅과 이슈를 챙깁니다.',
    subs: [['playbook', 'Playbook', 'playbook'], ['cal', 'Content Calendar', 'cal'], ['req', 'Client Request', 'requests'], ['issue', 'Issue Log', 'issues'], ['meeting', 'Meeting Note', 'meeting']] },
  { id: 'strategy', label: 'Strategy', en: 'Strategy', code: 'AP', desc: '레퍼런스·경쟁사·키워드를 모아 방향을 잡습니다.',
    subs: [['references', 'Reference Board', 'lib-references'], ['competitors', 'Competitor Watch', 'lib-competitors'], ['keywords', 'Keyword Insight', 'lib-keywords']] },
  { id: 'copy', label: 'Copy', en: 'Copy', code: 'CW', desc: '카피 3안과 상세페이지 카피를 씁니다.',
    subs: [['copy', 'Copy Options', 'copy'], ['pdp', 'Detail Page', 'pdp']] },
  { id: 'art', label: 'Art', en: 'Art', code: 'AD', desc: '레퍼런스를 고르고 광고 소재 제작으로 이어갑니다.',
    subs: [['adstudio', 'Ad Creative', 'adstudio']] },
  { id: 'film', label: 'Film', en: 'Film', code: 'PD', desc: '영상 기획부터 슈팅 계획, 현장 대응까지 맡습니다. 컨셉은 3안을 제시하고 선택을 기다립니다.',
    subs: [['video', 'Storyboard', 'video'], ['shoot-plan', 'Shooting Plan', 'shoot-plan'], ['onset', 'On-set', 'onset']] },
  { id: 'performance', label: 'Performance', en: 'Performance', code: 'MP', desc: '매체 성과를 조회·분석합니다. AE가 링크를 등록한 콘텐츠의 성과도 여기서 모읍니다. 예산 변경이나 집행은 하지 않습니다.',
    subs: [['media', 'Media Report', 'ads-overview'], ['kw', 'Search Keyword', 'lib-keywords'], ['content', 'Content Performance', 'content-perf'], ['report', 'Performance Report', 'report']] },
];
/* ⋯ 메뉴로 옮긴 화면 */
const MORE = [['results', '결과물', 'results', SUBDESC_RESULTS()], ['feedback', '피드백 규칙', 'feedback', SUBDESC_FEEDBACK()]];
function SUBDESC_RESULTS() { return 'AI가 만든 초안을 확인하고 컨펌합니다. 모든 파일은 새 버전(-v숫자)으로 쌓입니다.'; }
function SUBDESC_FEEDBACK() { return '대표가 컨펌한 규칙만 이후 작업에 적용됩니다. 후보는 컨펌 전까지 쓰이지 않습니다.'; }
const SUBDESC = {
  'ads-overview': '광고 플랫폼별 성과를 한곳에서 봅니다. 조회·분석만 하며 예산 변경이나 집행은 하지 않습니다.',
  cal: '클라이언트와 협의한 콘텐츠·기획 일정을 캘린더에 정리하고, 포스팅 여부를 확인해 체크합니다.',
  'lib-references': '참고할 광고·영상·페이지 레퍼런스를 보드별로 모으고 기획하면서 함께 봅니다.',
  'lib-competitors': '경쟁사·벤치마크 브랜드를 모아 두고 기획과 제작 중에 꺼내 봅니다.',
  adstudio: '레퍼런스를 고르고 브랜드 정보를 확인한 뒤 카피·영상 제작으로 이어갑니다.',
  pdp: '상세페이지용 카피를 만듭니다. 레퍼런스와 경쟁사를 함께 보면서 씁니다.',
  results: 'AI가 만든 초안을 확인하고 컨펌합니다. 모든 파일은 새 버전(-v숫자)으로 쌓입니다.',
  feedback: '대표가 컨펌한 규칙만 이후 작업에 적용됩니다. 후보는 컨펌 전까지 쓰이지 않습니다.',
};
const locate = v => { for (const t of TABS) for (const s of t.subs) if (s[2] === v) return [t.id, s[0]]; return null; };
const moreOf = v => MORE.find(m => m[2] === v);
const KEYWORD_TYPES = ['브랜드', '경쟁사', '일반'];
const platform = id => PLATFORMS.find(p => p.id === id);
const fmtDate = ts => new Date(ts * 1000).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric' });

/* ---------- 상단 헤더 / 탭 ---------- */
function toggleTheme() {
  const n = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = n; store.set('theme', n); renderSide();
  if (['welcome', 'calendar', 'team', 'reports'].includes(S.view)) render();
}
/* ---------- 역할 탭 외곽선 아이콘 (24px, 선 1.8, 색은 currentColor — docs 시안 side-tabs-v2) ---------- */
const OUTLINE = {
  overview: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  account: 'M5 7h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2zM8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18',
  strategy: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z',
  copy: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
  art: 'M12 3a9 9 0 1 0 0 18c1 0 1.5-.7 1.5-1.5 0-.9-.8-1.3-.8-2.2 0-.8.7-1.5 1.5-1.5H16a5 5 0 0 0 5-5c0-4.4-4-7.8-9-7.8zM7.5 11.5h.01M9.5 7.5h.01M14.5 7.5h.01',
  film: 'M3 10h18v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 10l1.2-4.2 15.6 2.1L19 10M8.5 6.4 9.8 10M13.6 7.1 14.8 10',
  performance: 'M4 20V11M10 20V5M16 20v-6M21 20H3',
};
const outlineIcon = (id, size = 20) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${OUTLINE[id] || ''}"/></svg>`;
/* 왕관 M 로고 (web/assets/logo.svg 와 같은 도형). 레일용은 #4B48D0 배경 */
const logoSvg = (size, bg, stroke, gem) => `<svg width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="16" fill="${bg}"/><polyline points="14,46 14,22 25,33 32,17 39,33 50,22 50,46" fill="none" stroke="#FFFFFF" stroke-width="${stroke}" stroke-linejoin="round" stroke-linecap="round"/><circle cx="32" cy="10.5" r="${gem}" fill="#FFC93C"/></svg>`;
/* 탭 신호: 빨간 점 = 그 역할에 딜레이, 숫자 = 그 역할의 컨펌 대기 */
function roleSignals() {
  const out = {};
  ROLE_CARDS.forEach(r => {
    out[r.tab] = {
      pend: S.ov.filter(f => f.state === 'review_passed' && roleOfFile(f) === r.code).length,
      late: S.lib.events.some(e => evRole(e) === r.code && !e.done && e.type === '콘텐츠' && e.date < S.st.today) || S.lib.requests.some(q => q.role === r.code && reqLate(q)),
    };
  });
  return out;
}
const accOf = id => ((S.acc && S.acc.accounts) || []).find(x => x.id === id);
const shortName = c => c.name.split(' (')[0];
function renderSide() {
  const a = S.st.active, cl = S.st.clients;
  const home = ['welcome', 'calendar', 'team', 'reports'].includes(S.view) || !a;
  const run = S.st.running || (S.run && S.run.running);
  const dark = document.documentElement.dataset.theme === 'dark';
  const connTxt = !S.st.claude ? 'Claude Code 를 찾을 수 없음' : run ? '작업 중' : '연결됨';
  const on = { cal: S.view === 'calendar', team: S.view === 'team', rep: S.view === 'reports' };
  const onAcc = !on.cal && !on.team && !on.rep;
  $('#rail').innerHTML = `<span class="r-logo" role="img" aria-label="마스터마케터">${logoSvg(40, '#4B48D0', 6, 3.5)}</span>
    <button class="r-btn ${onAcc ? 'on' : ''}" data-home data-tip="All Accounts" aria-label="All Accounts" ${onAcc ? 'aria-current="page"' : ''}>${ICONS.grid}</button>
    <button class="r-btn ${on.cal ? 'on' : ''}" data-cal data-tip="Calendar" aria-label="Calendar" ${on.cal ? 'aria-current="page"' : ''}>${ICONS.calendar}</button>
    <button class="r-btn ${on.team ? 'on' : ''}" data-team data-tip="Team" aria-label="Team" ${on.team ? 'aria-current="page"' : ''}>${ICONS.team}</button>
    <span class="spacer"></span>
    <button class="r-btn" data-buddy data-tip="버디 띄우기" aria-label="버디 띄우기">${ICONS.buddy}</button>
    <button class="r-btn" data-settings data-tip="설정" aria-label="설정">${ICONS.sliders}</button>
    <button class="r-btn theme" data-theme-toggle data-tip="${dark ? '라이트 모드' : '다크 모드'}" aria-label="${dark ? '라이트 모드로 전환' : '다크 모드로 전환'}">${dark ? ICONS.sun : ICONS.moon}</button>
    <span class="r-conn" data-tip="${connTxt}"><span class="dot ${!S.st.claude ? 'bad' : run ? 'run' : 'ok'}"></span></span>`;
  $('#rail').querySelector('[data-home]').onclick = () => go('welcome');
  $('#rail').querySelector('[data-cal]').onclick = () => go('calendar');
  $('#rail').querySelector('[data-team]').onclick = () => go('team');
  $('#rail').querySelector('[data-theme-toggle]').onclick = toggleTheme;
  $('#rail').querySelector('[data-settings]').onclick = settingsModal;
  $('#rail').querySelector('[data-buddy]').onclick = guard(async () => {
    await launchBuddyToast();
  });

  /* 두 번째 칸: 어카운트 화면에서만 보인다. 맨 위 어카운트 전환 드롭다운, 아래로 역할 탭. */
  $('#app').classList.toggle('nopanel', home);
  if (home) { $('#acctList').innerHTML = ''; return; }
  const cur = cl.find(c => c.id === a), acc = accOf(a) || {}, sig = roleSignals();
  const stColor = { 'On Track': 'ok', 'At Risk': 'warn', Delayed: 'late', Onboarding: 'info' };
  const meta = { overview: '대표 · 한눈에 보기' };
  ROLE_CARDS.forEach(r => { meta[r.tab] = `${r.code} · ${r.ko}`; });
  $('#acctList').innerHTML = `<div class="sw-wrap"><button class="switcher" id="swBtn" aria-haspopup="listbox" aria-expanded="false"><span class="mono sm" style="background:#8E8BF0;color:#1B1A4B">${esc(cur ? shortName(cur)[0] : '?')}</span>
      <span class="sw-t"><b>${esc(cur ? shortName(cur) : a)}</b><small>${esc(acc.status || '—')}</small></span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#B9B8E8" stroke-width="2" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button>
    <div class="sw-menu" id="swMenu" role="listbox" hidden>${cl.map(c => { const o = accOf(c.id) || {}; return `<button role="option" class="sw-i ${c.id === a ? 'on' : ''}" aria-selected="${c.id === a}" data-open="${esc(c.id)}"><span class="mono sm" style="background:#8E8BF0;color:#1B1A4B">${esc(shortName(c)[0])}</span><span class="nm">${esc(shortName(c))}</span><small>${esc(o.status || '')}</small></button>`; }).join('')}
      <button class="sw-i add" id="swNew">+ New Account</button></div></div>
    <p class="al-lbl team">TEAM</p>
    <nav class="stabs" aria-label="어카운트 탭">${TABS.map(t => { const on = t.id === S.tab, g = sig[t.id] || {};
      return `<button class="stab ${on ? 'on' : ''}" data-t="${t.id}" ${on ? 'aria-current="page"' : ''}>${on ? '<span class="bar-i"></span>' : ''}${outlineIcon(t.id, 20)}
        <span class="st-t"><b>${t.label}</b><small>${esc(meta[t.id] || '')}</small></span>
        ${g.late ? '<span class="dotr" title="딜레이" role="img" aria-label="딜레이"></span>' : ''}${g.pend ? `<span class="bdg" title="컨펌 대기 ${g.pend}건">${g.pend}</span>` : ''}</button>`; }).join('')}</nav>
    <span class="spacer"></span><small class="legend-n">빨간 점 = 딜레이 · 숫자 = 컨펌 대기<br>표시할 게 없으면 아무것도 안 붙어요.</small>`;
  const sb = $('#swBtn'), sm = $('#swMenu');
  const closeSw = () => { sm.hidden = true; sb.setAttribute('aria-expanded', 'false'); document.removeEventListener('click', outsideSw); };
  const outsideSw = e => { if (!$('#acctList .sw-wrap').contains(e.target)) closeSw(); };
  sb.onclick = e => { e.stopPropagation(); if (sm.hidden) { sm.hidden = false; sb.setAttribute('aria-expanded', 'true'); document.addEventListener('click', outsideSw); } else closeSw(); };
  $('#acctList').querySelectorAll('[data-open]').forEach(b => b.onclick = () => { closeSw(); chooseClient(b.dataset.open); });
  $('#swNew').onclick = () => { closeSw(); newAccountModal(); };
  $('#acctList').querySelectorAll('[data-t]').forEach(b => b.onclick = () => { const t = TABS.find(x => x.id === b.dataset.t); goSub(t.id, t.subs.length ? t.subs[0][0] : ''); });
}
const chipCount = k => ({ playbook: S.pbLatest && S.pbLatest.count ? `v${S.pbLatest.versions[S.pbLatest.versions.length - 1].n}` : '', cal: S.lib.events.length, req: S.lib.requests.length, issue: S.lib.issues.length }[k] ?? '');
/* My Tasks: 이 역할에 배정된 열린 리퀘스트 (설계서 §4) */
function myTasksHtml(code) {
  const mine = S.lib.requests.filter(r => r.role === code && r.status !== '클로즈').sort((a, b) => (a.due || '9').localeCompare(b.due || '9'));
  return `<div class="mytasks"><b>My Tasks</b><span class="chip">${mine.length}</span>${mine.length ? mine.slice(0, 4).map(r => `<span class="mt ${reqLate(r) ? 'late' : ''}">${esc(r.title)}${r.due ? ` · ${mdShort(r.due)}` : ''}</span>`).join('') + (mine.length > 4 ? `<span class="muted">+${mine.length - 4}</span>` : '') : '<span class="muted">배정된 리퀘스트 없음</span>'}</div>`;
}
/* 어카운트 헤더 · 가로 탭 · 탭 제목과 칩(세부 메뉴) */
function renderAcctHead() {
  const el = $('#acctHead'), a = S.st.active;
  const show = a && !['welcome', 'calendar', 'team', 'reports', 'new-client'].includes(S.view);
  if (!show) { el.innerHTML = ''; return; }
  const cl = S.st.clients.find(c => c.id === a), acc = accOf(a) || {}, tab = TABS.find(t => t.id === S.tab), more = moreOf(S.view);
  const pend = S.ov.filter(i => i.state === 'review_passed').length, cand = S.fb.filter(f => f.status === '후보').length;
  const nm = (cl ? shortName(cl) : a);
  const desc = tab ? `${tab.code ? tab.code + ' · ' : ''}${tab.desc}` : more ? more[3] : '';
  el.innerHTML = `<header class="ah"><div class="ah-l"><div class="crumb"><button class="lnk" data-back>‹ All Accounts</button><b class="ttl">${esc(nm)} · ${esc(tab ? tab.label : more ? more[1] : '')}</b>
      ${acc.status ? `<span class="stchip ${STATUS_CLS[acc.status]}"><i></i>${esc(acc.status)}</span>` : ''}${acc.note ? `<span class="tag">${esc(acc.note)}</span>` : ''}</div>
      <div class="meta"><span>${ICONS.lock.replace('<svg', '<svg width="11" height="11"')} 세션 고정 · ${esc(a)}</span></div>
      ${acc.phase ? `<div class="hd-phase"><div class="a-phase"><span>Phase · <b>${esc(acc.phase)}</b></span><span>${acc.phase_no} / 6</span></div><div class="bar"><div style="width:${Math.round(acc.phase_no / 6 * 100)}%"></div></div>
        <ol class="steps">${PHASES.map((x, i) => `<li ${i + 1 === acc.phase_no ? 'aria-current="step"' : ''} class="${i + 1 <= acc.phase_no ? 'done' : ''}">${x}</li>`).join('')}</ol></div>` : ''}</div>
    <div class="ah-r"><button class="btn pri" data-pend>컨펌 대기 ${pend}</button>
      <button class="btn" data-theme-toggle2>${document.documentElement.dataset.theme === 'dark' ? '라이트 모드' : '다크 모드'}</button>
      <div class="more"><button class="btn icon" data-more aria-haspopup="menu" aria-expanded="false" aria-label="더보기 (피드백 규칙·결과물)">⋯</button>
        <div class="menu" role="menu" hidden><button role="menuitem" data-act="team">담당자 배정</button><button role="menuitem" data-act="buddy">캐릭터 설정</button><button role="menuitem" data-act="settings">설정 · 대표 이름</button><hr>${MORE.map(m => `<button role="menuitem" data-m="${m[2]}">${esc(m[1])}${m[0] === 'feedback' && cand ? `<span class="cnt">${cand}</span>` : ''}</button>`).join('')}</div></div></div></header>
    ${desc ? `<div class="th"><span class="muted">${esc(desc)}</span>${tab && ['strategy', 'copy', 'art'].includes(tab.id) ? `<button class="lnk acc" data-brief>${S.pbLatest && S.pbLatest.count ? `Playbook 보기 (v${S.pbLatest.versions[S.pbLatest.versions.length - 1].n}) ›` : 'Playbook 작성하기 ›'}</button>` : ''}</div>` : ''}
    ${tab && tab.subs.length ? `<div class="chips">${tab.subs.map(([k, l]) => { const n = chipCount(k); return `<button class="fchip" data-c="${k}" aria-pressed="${k === S.sub}">${esc(l)}${n === '' ? '' : ` <span class="n">${n}</span>`}</button>`; }).join('')}</div>` : ''}
    ${tab && ['copy', 'art'].includes(tab.id) ? pbSummaryHtml(tab.id) : ''}
    ${tab && tab.code ? myTasksHtml(tab.code) : ''}`;
  el.querySelector('[data-back]').onclick = () => go('welcome');
  el.querySelector('[data-pend]').onclick = () => openDrawer('ALL');
  const bl = el.querySelector('[data-brief]'); if (bl) bl.onclick = () => goSub('account', 'playbook');
  el.querySelector('[data-theme-toggle2]').onclick = toggleTheme;
  const mb = el.querySelector('[data-more]'), mn = el.querySelector('.menu');
  const closeMenu = () => { mn.hidden = true; mb.setAttribute('aria-expanded', 'false'); document.removeEventListener('click', outside); };
  const outside = e => { if (!el.querySelector('.more').contains(e.target)) closeMenu(); };
  mb.onclick = e => { e.stopPropagation(); if (mn.hidden) { mn.hidden = false; mb.setAttribute('aria-expanded', 'true'); document.addEventListener('click', outside); } else closeMenu(); };
  el.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { closeMenu(); go(b.dataset.m); });
  el.querySelectorAll('[data-act]').forEach(b => b.onclick = () => { closeMenu(); ({ team: teamModal, buddy: buddyModal, settings: settingsModal })[b.dataset.act](); });
  el.querySelectorAll('[data-c]').forEach(b => b.onclick = () => goSub(S.tab, b.dataset.c));
}
function renderTop() {
  $('#topR').innerHTML = (S.run && S.run.running) ? '<span class="chip acc"><span class="spin"></span> 작업 중</span>' : '';
}

function switchClientModal(to) {
  const busy = S.run && S.run.running;
  modal(`<h3>${to ? esc((S.st.clients.find(c => c.id === to) || {}).name || to) + '(으)로 바꾸시겠어요?' : '어카운트를 바꾸시겠어요?'}</h3>
    <p class="muted">어카운트 정보가 섞이지 않도록 한 번에 한 어카운트만 작업합니다. 전환하면 현재 어카운트 세션이 해제되고 대화 내용도 비워집니다. 저장된 결과물은 그대로 남습니다.</p>
    ${busy ? '<div class="note bad">작업이 진행 중입니다. 끝나거나 중단한 뒤에 전환할 수 있습니다.</div>' : ''}
    <div class="row end"><button class="btn" id="m-no">취소</button><button class="btn pri" id="m-ok" ${busy ? 'disabled' : ''}>세션 해제하고 전환</button></div>`,
  m => {
    $('#m-no', m).onclick = closeModal;
    $('#m-ok', m).onclick = guard(async () => {
      await api('/api/session/clear', {}); closeModal();
      S.run = null; S.jobId = null; S.ws = null; S.fb = []; S.form = {};
      await refresh();
      if (to) await pickClient(to, () => goSub('overview')); else go('welcome');
    });
  });
}
function chooseClient(id) {
  const a = S.st.active;
  if (a === id) return goSub('overview');
  if (a) return switchClientModal(id);
  guard(() => pickClient(id, () => goSub('overview')))();
}

/* ---------- 라우팅 ---------- */
async function refresh() {
  S.st = await api('/api/state');
  if (S.st.active) {
    S.ws = await api('/api/workspace');
    try { S.fb = (await api('/api/feedback')).items; } catch { S.fb = []; }
    try { S.lib = await api('/api/library'); } catch { S.lib = { references: [], competitors: [], keywords: [], events: [], requests: [], issues: [], campaigns: [] }; }
  } else { S.ws = null; S.fb = []; S.lib = { references: [], competitors: [], keywords: [], events: [], requests: [], issues: [], campaigns: [] }; }
}
function goSub(tab, sub) {
  if (tab === 'overview' || !sub) return go('overview', 'overview', '');
  const m = MORE.find(x => x[0] === sub); if (m) return go(m[2]);
  const t = TABS.find(x => x.id === tab && x.subs.some(y => y[0] === sub)) || TABS.find(x => x.subs.some(y => y[0] === sub));
  return go(t.subs.find(y => y[0] === sub)[2], t.id, sub);
}
async function go(v, tab, sub) {
  if (!S.st.active && !['welcome', 'calendar', 'team', 'reports', 'new-client'].includes(v)) v = 'welcome';
  S.view = v;
  const loc = tab ? [tab, sub] : locate(v);
  if (loc && S.st.active) [S.tab, S.sub] = loc; else S.tab = S.sub = null;
  if (S.detail) { S.detail = null; renderDetail(); }
  if (S.st.active && !['welcome', 'calendar', 'team', 'reports', 'new-client'].includes(v)) await Promise.all([loadAccounts(), loadOverview(), loadPlaybookState()]);
  if (v === 'overview') await loadPerfWeek();
  if (v === 'results') await loadResults();
  if (v === 'feedback') { try { S.fb = (await api('/api/feedback')).items; } catch (e) { toast(e.message, 'bad'); } }
  render(); window.scrollTo(0, 0);
}
function render() {
  renderSide(); renderAcctHead(); renderTop();
  const v = S.view;
  if (v === 'welcome') return viewAccounts();
  if (v === 'calendar') return viewCalendarHome();
  if (v === 'team') return viewTeam();
  if (v === 'results') return viewResults();
  if (v === 'feedback') return viewFeedback();
  if (v === 'overview') return viewAcctOverview();
  if (v === 'ads-overview') return viewMedia();
  if (v === 'content-perf') return viewContentPerf();
  if (v === 'cal') return viewCal();
  if (v === 'requests') return viewRequests();
  if (v === 'playbook') return viewPlaybook();
  if (v === 'issues') return viewIssues();
  if (v === 'adstudio') return viewAdStudio();
  if (v === 'pdp') return viewPdp();
  if (v.startsWith('lib-')) return viewLib(v.slice(4));
  return viewCommand(v);
}

/* ---------- 탭별 전체보기 ---------- */
function upcomingHtml() {
  const up = S.lib.events.filter(e => !e.done && (e.date >= S.st.today || overdue(e))).sort(evSort).slice(0, 6);
  return `<div class="sec-t">다가오는 일정 · 확인 필요</div><div class="card tl">${up.length ? up.map(e => `<button class="tl-r link" data-ev="${esc(e.date)}"><b>${esc(e.title)}</b><span class="chip" data-t="${esc(e.type)}">${esc(typeLabel(e.type))}</span><span class="spacer"></span>${overdue(e) ? '<span class="chip bad">딜레이</span>' : ''}<small>${esc(e.date.slice(5))}</small></button>`).join('')
    : '<div class="empty"><b>예정된 일정이 없어요</b>캘린더에서 클라이언트와 협의한 일정을 추가하세요.</div>'}</div>`;
}
async function loadOverview() {
  const ps = S.ws.projects.map(p => p.id); if (!ps.includes('general')) ps.push('general');
  const all = await Promise.all(ps.map(id => api(`/api/deliverables?project=${encodeURIComponent(id)}`)
    .then(r => r.items.map(i => ({ ...i, project: id }))).catch(() => [])));
  S.ov = all.flat().sort((a, b) => b.mtime - a.mtime);
}
const heroHtml = (icon, title, desc) => `<div class="sub-h"><h2>${esc(title)}</h2><p>${esc(desc)}</p></div>`;
const statHtml = (l, v, hint) => `<div class="stat card"><small>${esc(l)}</small><b>${esc(v)}</b>${hint ? `<span class="muted">${esc(hint)}</span>` : ''}</div>`;
/* ---------- 새 어카운트 · 브리프 · 처음 시작하기 ---------- */
function newAccountModal() {
  const slug = t => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32);
  const W = { step: 'info', name: '', id: '', idTouched: false, char: null, desktop: false };
  modal(`<div id="naBody"></div>`, m => {
    const body = () => $('#naBody', m);
    const create = guard(async () => {
      const r = await api('/api/new-account', { id: W.id, name: W.name, char: W.char || '', desktop: W.desktop });
      closeModal(); await refresh();
      if (r.opened) { toast('어카운트를 만들고 열었어요.', 'ok'); await goSub('overview'); }
      else { toast('어카운트를 만들었어요. 왼쪽에서 전환하면 시작할 수 있어요.', 'ok'); go('welcome'); }
      if (W.char && W.desktop) await launchBuddyToast();
    });
    const draw = () => {
      const el = body();
      if (W.step === 'info') {
        el.innerHTML = `<h3>새 어카운트</h3><p class="muted">이름과 ID만 정하면 폴더가 만들어집니다. 브랜드 정보는 Overview의 "처음 시작하기"에서 채워요.</p>
          <form id="naf" class="form" autocomplete="off">
            <label class="field"><span class="lbl">표시명<span class="req">*</span></span><input class="in" name="name" maxlength="40" placeholder="예: 모카나루" value="${esc(W.name)}" required></label>
            <label class="field"><span class="lbl">어카운트 ID<span class="req">*</span></span><input class="in" name="id" maxlength="32" pattern="[a-z0-9][a-z0-9\-]{1,31}" placeholder="예: mocanaru" value="${esc(W.id)}" required><span class="hint">영문 소문자·숫자·하이픈 2~32자. 폴더 이름이라 나중에 바꾸기 어려워요.</span></label>
            <div class="row end"><button class="btn" type="button" id="m-no">취소</button><button class="btn pri" type="submit">다음</button></div></form>
          <p class="muted" style="margin:12px 0 0;font-size:12.5px">AI 인터뷰로 브랜드 정보까지 한 번에 채우고 싶다면 <button type="button" class="lnk acc" id="toInterview" style="padding:0;height:auto">AI 인터뷰로 등록하기</button></p>`;
        const f = $('#naf', m);
        f.elements.id.oninput = () => { W.idTouched = true; };
        f.elements.name.oninput = e => { if (!W.idTouched) f.elements.id.value = slug(e.target.value); };
        $('#m-no', m).onclick = closeModal;
        $('#toInterview', m).onclick = () => { closeModal(); go('new-client'); };
        f.onsubmit = e => { e.preventDefault(); W.name = f.elements.name.value.trim(); W.id = f.elements.id.value.trim(); W.step = 'ask'; draw(); };
        setTimeout(() => f.elements.name.focus(), 0);
      } else if (W.step === 'ask') {
        el.innerHTML = `<h3>이 어카운트에 캐릭터를 붙일까요?</h3><p class="muted">캐릭터(버디)는 확인할 일이 생기면 말풍선으로 알려 줘요. 안 붙여도 앱 안 알림은 똑같이 보여요. 나중에 어카운트의 ⋯ 메뉴 → 캐릭터 설정에서 바꿀 수 있어요.</p>
          <div class="row end"><button class="btn" id="back">이전</button><button class="btn" id="later">나중에</button><button class="btn pri" id="yes">예</button></div>`;
        $('#back', m).onclick = () => { W.step = 'info'; draw(); };
        $('#later', m).onclick = () => { W.char = null; W.desktop = false; create(); };
        $('#yes', m).onclick = () => { W.step = 'pick'; draw(); };
      } else if (W.step === 'pick') {
        el.innerHTML = `<h3>캐릭터를 골라 주세요</h3><div class="bd-grid" id="bdGrid"></div><div class="bd-prev" id="bdPrev"></div>
          <div class="row end" style="margin-top:14px"><button class="btn" id="back">이전</button><button class="btn pri" id="next" ${W.char ? '' : 'disabled'}>다음</button></div>`;
        charPicker(m, W, false, () => { $('#next', m).disabled = !W.char; });
        $('#back', m).onclick = () => { W.step = 'ask'; draw(); };
        $('#next', m).onclick = () => { W.step = 'desk'; draw(); };
      } else {
        el.innerHTML = `<h3>바탕화면에 띄울까요?</h3><p class="muted">띄우면 화면 오른쪽 아래에 캐릭터가 앉아서 확인할 일을 말풍선으로 알려 줘요. "앱 안에서만"을 고르면 바탕화면에는 나오지 않아요.</p>
          <div class="row end"><button class="btn" id="back">이전</button><button class="btn" id="inapp">앱 안에서만</button><button class="btn pri" id="desk">띄우기</button></div>`;
        $('#back', m).onclick = () => { W.step = 'pick'; draw(); };
        $('#inapp', m).onclick = () => { W.desktop = false; create(); };
        $('#desk', m).onclick = () => { W.desktop = true; create(); };
      }
    };
    draw();
  });
}
async function loadPlaybookState() { try { S.pbLatest = await api('/api/playbook'); } catch { S.pbLatest = { count: 0, versions: [], data: null }; } }
function checklistSteps() {
  const acc = accOf(S.st.active) || {}, a = S.st.active;
  return [
    { title: '담당자 배정', desc: 'AE · AP · CW · AD · PD · MP에 팀원 이름을 넣어요', cta: '배정하기', done: Object.keys(acc.team || {}).length > 0, act: teamModal },
    { title: '버디 캐릭터 붙이기', desc: '이 어카운트를 지켜볼 캐릭터를 골라요. 안 붙여도 앱 안 알림은 똑같이 보여요.', cta: '고르기', done: false, optional: true, hide: !!acc.char, act: buddyModal },
    { title: 'Playbook 작성', desc: '브랜드 기본·타깃·운영 컨셉·톤앤매너를 채우면 체크돼요. Phase가 Concept로 넘어가요', cta: '작성하기', done: !!(S.pbLatest && S.pbLatest.latest_complete), act: () => goSub('account', 'playbook') },
    { title: '첫 포스팅 일정 추가', desc: 'Account › Content Calendar에서 일정을 넣어요', cta: '일정 추가', done: S.lib.events.some(e => e.type === '콘텐츠'), act: async () => { S.calMode = 'list'; await goSub('account', 'cal'); postModal(); } },
    { title: '광고 데이터 연결', desc: '매체 CSV를 data/raw에 넣으면 Performance가 채워져요', cta: '방법 보기', done: (S.ws.inputs.raw || []).some(f => /\.(csv|xlsx|xlsm)$/i.test(f)), act: () => goSub('performance', 'media') },
  ].filter(x => !x.hide).map((x, i) => ({ ...x, no: i + 1, a }));
}
const clHidden = a => store.get('cl-hide:' + a, '') === '1';
function checklistHtml(steps) {
  const left = steps.filter(x => !x.done && !x.optional).length;
  return `<section class="card firstrun"><div class="fr-h"><div><h2>처음 시작하기</h2><span class="muted">${left ? '아직 데이터가 없어요. 아래 순서대로 채우면 Overview와 팀 탭이 하나씩 살아나요.' : '모두 마쳤어요. 이제 팀 탭에서 일을 시작하세요.'}</span></div>
      ${left ? '' : '<button class="btn" id="clHide">닫기</button>'}</div>
    ${steps.map(x => `<div class="fr-r ${x.done ? 'done' : ''}"><span class="fr-n">${x.done ? '✓' : x.no}</span><span class="fr-t"><b>${esc(x.title)}${x.optional ? ' <span class="pill-s">선택 사항</span>' : ''}</b><small>${esc(x.desc)}</small></span>
      ${x.done ? '<span class="pill-s ok">완료</span>' : `<button class="btn" data-step="${x.no - 1}">${esc(x.cta)}</button>`}</div>`).join('')}</section>`;
}
function bindChecklist(steps) {
  $('#view').querySelectorAll('[data-step]').forEach(b => b.onclick = guard(async () => { await steps[+b.dataset.step].act(); }));
  const h = $('#clHide'); if (h) h.onclick = () => { store.set('cl-hide:' + S.st.active, '1'); viewAcctOverview(); };
}

/* ---------- Overview: KPI · Team Status · This Week · 컨펌 패널 (설계서 §5) ---------- */
/* 숫자는 상태 파일·일정·자료실에서 계산한 값만 쓴다. 근거가 없으면 '—'. 담당 배정 정보가 없으므로 결과물은 파일 이름·프로젝트 단계로 역할을 나눈다. */
const ROLE_CARDS = [
  { code: 'AE', name: 'Account Executive', ko: '어카운트', tab: 'account' },
  { code: 'AP', name: 'Account Planner', ko: '전략', tab: 'strategy' },
  { code: 'CW', name: 'Copywriter', ko: '카피', tab: 'copy' },
  { code: 'AD', name: 'Art Director', ko: '아트', tab: 'art' },
  { code: 'PD', name: 'Producer', ko: '필름', tab: 'film' },
  { code: 'MP', name: 'Media & Performance', ko: '퍼포먼스', tab: 'performance' },
];
const EVENT_ROLE = { 콘텐츠: 'AE', 기획: 'AP', 촬영: 'PD', 회의: 'AE' };
function roleOfFile(it) {
  const n = it.name.toLowerCase();
  if (/^(copy|pdp)/.test(n)) return 'CW';
  if (/^report/.test(n)) return 'MP';
  if (/^meeting/.test(n)) return 'AE';
  if (/^(shoot|onset|storyboard|script)/.test(n)) return 'PD';
  if (/^(ad|kv|creative)/.test(n)) return 'AD';
  if (/^(video|concept|proposal|brief)/.test(n) || it.area === 'research') {
    const p = (S.ws.projects || []).find(x => x.id === it.project);
    return p && ['script', 'storyboard', 'shoot_plan'].includes(p.stage) ? 'PD' : 'AP';
  }
  return '';
}
const mdShort = iso => `${iso.slice(5, 7)}.${iso.slice(8, 10)}`;
function overviewModel() {
  const today = S.st.today, acc = accOf(S.st.active) || {}, team = acc.team || {};
  const [w0, w1] = (S.acc && S.acc.week) || [today, today];
  const evs = S.lib.events, reqs = S.lib.requests, issues = S.lib.issues, files = S.ov.map(i => ({ ...i, role: roleOfFile(i) }));
  const pendAll = files.filter(f => f.state === 'review_passed');
  const late = e => !e.done && e.type === '콘텐츠' && e.date < today;
  const posts = evs.filter(e => e.type === '콘텐츠' && e.date >= w0 && e.date <= w1);
  const cards = ROLE_CARDS.map(r => {
    const mine = files.filter(f => f.role === r.code), pend = mine.filter(f => f.state === 'review_passed');
    const ev = evs.filter(e => evRole(e) === r.code), myReq = reqs.filter(q => q.role === r.code), over = ev.filter(late).concat(myReq.filter(reqLate));
    const stale = pend.filter(f => f.at && f.at.slice(0, 10) < isoAdd(today, -2));
    const nextEv = ev.filter(e => !e.done && e.date >= today).sort(evSort)[0];
    const has = mine.length || ev.length || myReq.length || (r.code === 'AE' && (reqs.length || issues.length));
    let status = !has ? 'Setup' : over.length ? 'Delayed' : stale.length ? 'At Risk' : 'On Track';
    let metrics, next = '—';
    const n = st => mine.filter(f => st.includes(f.state)).length;
    if (r.code === 'AE') {
      metrics = [['오픈 리퀘스트', reqs.length ? reqs.filter(q => q.status !== '클로즈').length : '—'], ['이번 주 포스팅', posts.length ? `${posts.filter(e => e.done).length}/${posts.length}` : '—'], ['오픈 이슈', issues.length ? issues.filter(q => q.status !== '해결').length : '—']];
      next = nextEv ? `${mdShort(nextEv.date)} ${nextEv.title}` : '예정된 일정 없음';
    } else if (r.code === 'AP') {
      const ps = S.ws.projects;
      metrics = [['컨셉 선택', ps.length ? `${ps.filter(p => p.selected).length}/${ps.length}` : '—'], ['경쟁사 신규 소재', '—'], ['레퍼런스', `${S.lib.references.length}`]];
      const open = ps.find(p => !p.selected && p.stage === 'concepts');
      next = open ? `${open.name}: 컨셉 3안 중 선택 필요` : nextEv ? `${mdShort(nextEv.date)} ${nextEv.title}` : '—';
      if (!has && (ps.length || S.lib.references.length)) status = 'On Track';
    } else if (r.code === 'CW') {
      metrics = [['작성 중', has ? n(['draft', 'needs_revision']) : '—'], ['컨펌 요청', has ? pend.length : '—'], ['픽스', has ? n(['approved']) : '—']];
      next = pend.length ? `컨펌 대기 ${pend.length}건 확인` : '—';
    } else if (r.code === 'AD') {
      metrics = [['시안', '—'], ['리사이징', '—'], ['리젝', '—']]; next = '아트 작업물 기록이 아직 없어요';
    } else if (r.code === 'PD') {
      const sh = ev.filter(e => !e.done && e.type === '촬영' && e.date >= today).sort(evSort)[0], d = sh ? dayDiff(sh.date, today) : null;
      const stg = S.ws.projects.some(p => ['storyboard', 'shoot_plan'].includes(p.stage));
      metrics = [['슈팅', sh ? (d === 0 ? '오늘' : `D-${d}`) : '—'], ['콘티', stg ? '작성됨' : '—'], ['편집', '—']];
      next = sh ? `${mdShort(sh.date)} ${sh.title}` : '예정된 슈팅 없음';
      if (!has && stg) status = 'On Track';
    } else {
      const W = S.perfWk, ok = W && W.has_rows;
      metrics = [['집행 금액', ok ? fmtMoney(W.totals.cost) : '—'], ['CTR', ok ? fmtPct(W.metrics.ctr) : '—'], ['ROAS', ok && W.metrics.roas != null ? `${Number(W.metrics.roas).toFixed(0)}%` : '—']];
      next = ok ? `이번 주 데이터 ${W.totals.days}일 · 매체 성과는 Performance 탭에서` : S.ws.inputs.raw.length ? `data/raw 파일 ${S.ws.inputs.raw.length}개 · 이번 주 데이터 없음` : '매체 연동 또는 리포트 CSV 업로드';
      if (ok && !has) status = 'On Track';
    }
    return { ...r, status, metrics, next, pend, who: team[r.code] };
  });
  const byRole = ROLE_CARDS.map(r => [r.code, pendAll.filter(f => roleOfFile(f) === r.code).length]).filter(x => x[1]);
  const other = pendAll.filter(f => !roleOfFile(f)).length;
  const overdue = evs.filter(late), reqOver = reqs.filter(reqLate);
  const week = []; for (let i = 0; i < 7; i++) { const d = isoAdd(w0, i); week.push({ d, items: evs.filter(e => e.date === d).sort(evSort) }); }
  return { cards, pendAll, byRole, other, overdue, reqOver, posts, week, today };
}
function viewAcctOverview() {
  const M = S.model = overviewModel(), pd = M.posts.filter(e => e.done).length;
  const evs = S.lib.events, reqs = S.lib.requests, hasDeliv = S.ov.length > 0;
  const fresh = !evs.length && !reqs.length && !S.lib.issues.length && !hasDeliv;
  const late = M.overdue.length + M.reqOver.length, steps = checklistSteps(), showCl = steps.some(x => !x.done) || !clHidden(S.st.active);
  const kpi = (ko, v, sub, cls, bar) => `<div class="kpi k4"><span class="ko">${ko}</span><b class="${cls || ''}${v === '—' ? ' dash' : ''}">${esc(v)}</b>${bar === undefined ? '' : `<div class="bar"><div style="width:${bar}%"></div></div>`}<small>${esc(sub)}</small></div>`;
  const brk = M.byRole.map(([c, n]) => `${c} ${n}`).concat(M.other ? [`기타 ${M.other}`] : []).join(' · ');
  const wk = S.perfWk && S.perfWk.has_rows;
  $('#view').innerHTML = `<div class="ov">
    <div class="kpis">${kpi('컨펌 대기', hasDeliv ? `${M.pendAll.length}건` : '—', hasDeliv ? (brk || '컨펌 대기 없음') : '아직 결과물이 없어요', M.pendAll.length ? 'acc' : '')}
      ${kpi('딜레이', evs.length || reqs.length ? `${late}건` : '—', evs.length || reqs.length ? (late ? `클라이언트 리퀘스트 ${M.reqOver.length} · 포스팅 ${M.overdue.length}` : '딜레이 없음') : '일정이 등록되면 계산돼요', late ? 'late' : '')}
      ${kpi('이번 주 포스팅', M.posts.length ? `${pd} / ${M.posts.length}` : '—', M.posts.length ? '포스팅 완료 / 예정' : evs.length ? '이번 주 예정 없음' : '포스팅 일정을 추가해 주세요', '', M.posts.length ? Math.round(pd / M.posts.length * 100) : undefined)}
      ${kpi('이번 주 집행 금액', wk ? fmtMoney(S.perfWk.totals.cost) : '—', wk ? `이번 주 ${S.perfWk.totals.days}일치 데이터` : '매체 연동 또는 CSV 필요')}</div>
    ${showCl ? checklistHtml(steps) : ''}
    ${fresh ? '' : `<div class="sec-h"><h2>Team Status</h2><span class="muted">카드를 열면 해당 팀 탭으로, 컨펌 버튼을 누르면 오른쪽 패널에서 바로 컨펌합니다.</span></div>
    <div class="rgrid">${M.cards.map(r => `<section class="rcard"><div class="rc-h"><span class="oi">${outlineIcon(r.tab, 24)}</span>
        <div class="rc-n"><b>${r.name}</b><small>${r.code} · ${r.ko} · ${r.who ? `담당 ${esc(r.who)}` : '담당 미배정'}</small></div>
        <span class="stchip ${{ 'On Track': 'ok', 'At Risk': 'warn', Delayed: 'late' }[r.status] || ''}">${r.status}</span></div>
      <div class="a-met">${r.metrics.map(([l, v]) => `<div><small>${l}</small><b>${esc(v)}</b></div>`).join('')}</div>
      <div class="rc-x"><small>다음</small><span>${esc(r.next)}</span></div>
      <div class="rc-f">${r.pend.length ? `<button class="btn pri sm" data-drawer="${r.code}">컨펌 ${r.pend.length}건</button>` : '<small>컨펌 대기 없음</small>'}<span class="spacer"></span><button class="lnk acc" data-tab="${r.tab}">Open ›</button></div></section>`).join('')}</div>
    <section class="panel3"><div class="p3h"><h2>This Week</h2><small>${mdShort(M.week[0].d)} ~ ${mdShort(M.week[6].d)}</small></div>
      <div class="wk-scroll"><div class="wk">${M.week.map(w => `<div class="wk-d ${w.d === M.today ? 'today' : ''}"><b>${dayLabel(w.d)}</b>${w.items.map(e => `<div class="wk-i"><span class="rcode s">${evRole(e) || '—'}</span><span>${e.done ? '✓ ' : ''}${esc(e.title)}${e.sample ? ' <span class="tag">예시</span>' : ''}</span></div>`).join('')}</div>`).join('')}</div></div></section>`}
  </div>`;
  bindChecklist(steps);
  $('#view').querySelectorAll('[data-drawer]').forEach(b => b.onclick = () => openDrawer(b.dataset.drawer));
  $('#view').querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { const t = TABS.find(x => x.id === b.dataset.tab); goSub(t.id, t.subs[0][0]); });
}
/* ---------- 대표 이름 · 담당자 배정 ---------- */
/* 컨펌·수정 요청·승인은 항상 대표가 한다. 이름은 서버(.agency-state/settings.json)에 한 번 저장하고 이후 자동으로 채운다. */
const repField = label => S.st.rep
  ? `<div class="field"><span class="lbl">${label}</span><div class="repline"><b>${esc(S.st.rep)}</b><button type="button" class="lnk acc" data-rep-edit>설정에서 변경</button></div><input type="hidden" id="by" value="${esc(S.st.rep)}"></div>`
  : `<div class="field"><label class="lbl" for="by">${label}</label><input class="in" id="by" placeholder="대표 이름" maxlength="40"><span class="hint">입력하면 대표 이름으로 저장되어 다음부터 자동으로 채워집니다.</span></div>`;
async function saveRep(by) { if (by && by !== S.st.rep) S.st.rep = (await api('/api/settings', { rep_name: by })).rep; }
function bindRep(m) { const b = m.querySelector('[data-rep-edit]'); if (b) b.onclick = () => { closeModal(); settingsModal(); }; }
function settingsModal() {
  modal(`<h3>설정</h3>
    <div class="field"><label class="lbl" for="rep">대표 이름</label><input class="in" id="rep" value="${esc(S.st.rep)}" maxlength="40" placeholder="예: 김대표"><span class="hint">컨펌·수정 요청·피드백 규칙 컨펌에 자동으로 쓰입니다. 이 PC의 .agency-state/ 에만 저장됩니다.</span></div>
    <div class="field" style="margin-top:12px"><span class="lbl">버디 크기</span><div class="seg" role="radiogroup" aria-label="버디 크기">${[['small', '작게'], ['normal', '보통'], ['large', '크게']].map(([k, l]) => `<button type="button" class="seg-b" role="radio" data-bs="${k}" aria-checked="${(S.st.buddy_size || 'small') === k}" aria-pressed="${(S.st.buddy_size || 'small') === k}">${l}</button>`).join('')}</div><span class="hint">바탕화면 버디의 크기예요. 저장하면 30초 안에 바뀌어요.</span></div>
    <div class="field" style="margin-top:12px"><span class="lbl">버디 방해 금지</span>
      <label class="pick"><input type="checkbox" id="dndOn" ${(S.st.dnd || {}).enabled ? 'checked' : ''}><span>이 시간에는 버디가 쉬어요 (긴급만 작은 배지로 남아요)</span></label>
      <div class="row" style="margin-top:8px"><input class="in" type="time" id="dndS" value="${esc((S.st.dnd || {}).start || '19:00')}" aria-label="시작 시간" style="width:130px"><span>~</span><input class="in" type="time" id="dndE" value="${esc((S.st.dnd || {}).end || '09:00')}" aria-label="끝 시간" style="width:130px"></div></div>
    <div class="row end"><button class="btn" id="m-no">닫기</button><button class="btn pri" id="m-ok">저장</button></div>`,
  m => {
    $('#m-no', m).onclick = closeModal;
    let bs = S.st.buddy_size || 'small';
    m.querySelectorAll('[data-bs]').forEach(b => b.onclick = () => { bs = b.dataset.bs; m.querySelectorAll('[data-bs]').forEach(x => { const on = x.dataset.bs === bs; x.setAttribute('aria-pressed', on); x.setAttribute('aria-checked', on); }); });
    $('#m-ok', m).onclick = guard(async () => {
      const r = await api('/api/settings', { rep_name: $('#rep', m).value.trim(), buddy_size: bs, dnd: { enabled: $('#dndOn', m).checked, start: $('#dndS', m).value, end: $('#dndE', m).value } });
      S.st.rep = r.rep; S.st.buddy_size = r.buddy_size; S.st.dnd = r.dnd;
      closeModal(); toast('설정을 저장했습니다.', 'ok');
    });
  });
  setTimeout(() => { const i = $('#rep'); if (i) i.focus(); }, 0);
}
/* ---------- 버디 캐릭터 설정 (docs/buddy-spec.md §3) ---------- */
/* 캐릭터는 자동 배정하지 않는다. 어카운트마다 붙일지(char), 바탕화면에 띄울지(desktop)를 직접 고른다. */
function charPicker(m, st, allowNone, onChange) {
  const B = window.BuddySprite;
  const paint = () => {
    const ch = st.char ? B.CHARS.find(c => c.id === st.char) : null;
    m.querySelector('#bdGrid').innerHTML = (allowNone ? `<button type="button" class="bd-c ${!st.char ? 'on' : ''}" data-ch="" aria-pressed="${!st.char}"><span class="bd-p" style="background:var(--surface-2);color:var(--muted);font-size:12px;align-items:center">없음</span><b>캐릭터 없음</b><small>붙이지 않음</small></button>` : '') +
      B.CHARS.map(c => `<button type="button" class="bd-c ${c.id === st.char ? 'on' : ''}" data-ch="${c.id}" aria-pressed="${c.id === st.char}"><span class="bd-p" style="background:${c.tag}">${B.render(c.id, 'idle', { portrait: true, size: 64 })}</span><b>${esc(c.name)}</b><small>${esc(c.concept)}</small></button>`).join('');
    m.querySelector('#bdPrev').innerHTML = ch ? `<span class="bd-p big" style="background:${ch.tag}">${B.render(ch.id, 'alert', { portrait: true, size: 72 })}</span><div><b>${esc(ch.name)} · ${esc(ch.concept)}</b><p>${esc(ch.desc)}</p><div class="bd-say">${esc(ch.line)}</div></div>`
      : `<span class="muted">${allowNone ? '캐릭터 없이 앱 안에서만 알림을 봐요.' : '캐릭터를 고르면 말투를 미리 볼 수 있어요.'}</span>`;
    m.querySelectorAll('[data-ch]').forEach(b => b.onclick = () => { st.char = b.dataset.ch || null; if (!st.char) st.desktop = false; paint(); onChange && onChange(); });
  };
  paint();
}
async function launchBuddyToast() {
  const r = await api('/api/buddy-launch', {});
  toast(r.none ? r.message : r.started ? '바탕화면에 버디를 띄웠어요.' : '이미 실행 중이에요.', r.started ? 'ok' : '');
}
function buddyModal() {
  const a = S.st.active, acc = accOf(a) || {}, nm = (S.st.clients.find(c => c.id === a) || {}).name || a;
  const st = { char: acc.char || null, desktop: !!acc.desktop };
  modal(`<h3>${esc(shortName({ name: nm }))} 캐릭터 설정</h3><p class="muted">이 어카운트에 버디를 붙일지, 붙인다면 누구로 할지 고르세요. 말투도 캐릭터를 따라갑니다. 앱 안 알림은 캐릭터와 상관없이 항상 보여요.</p>
    <div class="bd-grid" id="bdGrid"></div><div class="bd-prev" id="bdPrev"></div>
    <label class="pick" style="margin-top:12px"><input type="checkbox" id="bdDesk"><span>바탕화면에 표시</span></label><small class="muted" id="bdHint"></small>
    <div class="row end" style="margin-top:14px"><button class="btn" id="m-no">취소</button><button class="btn pri" id="m-ok">저장</button></div>`,
  m => {
    const sync = () => { const d = $('#bdDesk', m); d.disabled = !st.char; d.checked = !!st.char && st.desktop; $('#bdHint', m).textContent = st.char ? '' : '캐릭터를 붙이면 바탕화면 표시를 켤 수 있어요.'; };
    charPicker(m, st, true, sync); sync();
    $('#bdDesk', m).onchange = e => { st.desktop = e.target.checked; };
    $('#m-no', m).onclick = closeModal;
    $('#m-ok', m).onclick = guard(async () => {
      await api('/api/buddy-char', { char: st.char, desktop: st.desktop });
      closeModal(); toast('캐릭터 설정을 저장했습니다.', 'ok'); await loadAccounts(); renderSide(); if (S.view === 'overview') viewAcctOverview();
      if (st.char && st.desktop) await launchBuddyToast();
    });
  });
}
function teamModal() {
  const team = (accOf(S.st.active) || {}).team || {};
  modal(`<h3>담당자 배정</h3>
    <p class="muted">역할별 담당자 이름을 적으면 역할 카드와 All Accounts의 Team 칩에 반영됩니다. 비우면 미배정입니다.</p>
    ${ROLE_CARDS.map(r => `<div class="field" style="margin-top:10px"><label class="lbl" for="tm-${r.code}">${r.code} · ${r.name}</label><input class="in" id="tm-${r.code}" value="${esc(team[r.code] || '')}" maxlength="40" placeholder="담당자 이름"></div>`).join('')}
    <div class="row end" style="margin-top:16px"><button class="btn" id="m-no">취소</button><button class="btn pri" id="m-ok">저장</button></div>`,
  m => {
    $('#m-no', m).onclick = closeModal;
    $('#m-ok', m).onclick = guard(async () => {
      const t = {}; ROLE_CARDS.forEach(r => { t[r.code] = $(`#tm-${r.code}`, m).value.trim(); });
      await api('/api/team', { team: t });
      closeModal(); toast('담당자를 저장했습니다.', 'ok'); await loadAccounts(); render();
    });
  });
}

/* 컨펌 패널: 컨펌 = 기존 승인 흐름(/api/approve, 승인자 이름 필수), 수정 요청 = needs_revision 으로 되돌리고 사유를 기록한다. */
function openDrawer(role) { S.drawer = role; S.drawerPrev = document.activeElement; renderDrawer(); const c = $('#drawer .close'); if (c) c.focus(); }
function closeDrawer() { S.drawer = null; renderDrawer(); if (S.drawerPrev && S.drawerPrev.focus && document.contains(S.drawerPrev)) S.drawerPrev.focus(); }
async function afterDrawerAction() {
  await Promise.all([loadOverview(), loadAccounts()]);
  if (S.view === 'overview') viewAcctOverview();
  renderAcctHead(); renderSide(); renderDrawer();
}
function renderDrawer() {
  const el = $('#drawer'), role = S.drawer;
  if (!role) { el.hidden = true; el.innerHTML = ''; return; }
  const items = S.ov.filter(i => i.state === 'review_passed' && (role === 'ALL' || roleOfFile(i) === role));
  const rc = ROLE_CARDS.find(r => r.code === role);
  el.hidden = false;
  el.innerHTML = `<div class="dr-h"><b id="drTitle">${role === 'ALL' ? '전체' : esc(rc.name)} · 컨펌 대기</b><button class="btn icon close" aria-label="패널 닫기">✕</button></div>
    <div class="dr-b">${items.length ? items.map((it, i) => `<div class="dr-i"><b>${esc(it.name)}</b><small>${esc(roleOfFile(it) || '기타')} · ${esc(it.project)} · ${fmtDate(it.mtime)} · AI 검수 통과</small>
      <pre class="pv" data-pv="${i}">미리보기를 불러오는 중…</pre>
      <div class="row"><button class="btn pri" data-ok="${i}">컨펌</button><button class="btn" data-rev="${i}">수정 요청</button><button class="btn ghost" data-view="${i}">전체 보기</button></div></div>`).join('')
      : '<div class="empty"><b>컨펌 대기 없음</b>AI 검수를 통과한 결과물이 여기에 올라옵니다.</div>'}</div>
    <small class="muted">AI 검수 통과 ≠ 대표 컨펌 ≠ 법적 적합성 확정</small>`;
  el.querySelector('.close').onclick = closeDrawer;
  items.forEach(async (it, i) => {
    try { const t = (await api(`/api/file?project=${encodeURIComponent(it.project)}&area=${it.area}&name=${encodeURIComponent(it.name)}`)).text; const pv = el.querySelector(`[data-pv="${i}"]`); if (pv) pv.textContent = t.trim().split('\n').slice(0, 8).join('\n').slice(0, 480) || '(내용 없음)'; }
    catch { const pv = el.querySelector(`[data-pv="${i}"]`); if (pv) pv.textContent = '미리보기를 불러오지 못했어요.'; }
  });
  el.querySelectorAll('[data-ok]').forEach(b => b.onclick = () => confirmModal(items[+b.dataset.ok]));
  el.querySelectorAll('[data-rev]').forEach(b => b.onclick = () => reviseModal(items[+b.dataset.rev]));
  el.querySelectorAll('[data-view]').forEach(b => b.onclick = () => { const it = items[+b.dataset.view]; S.res.project = it.project; S.res.pick = it.name; closeDrawer(); goSub('', 'results'); });
}
function confirmModal(it) {
  modal(`<h3>이 결과물을 컨펌하시겠어요?</h3>
    <p class="muted"><b>${esc(it.name)}</b><br>AI 검수 통과는 컨펌도, 법적 적합성 확정도 아닙니다. 내용을 직접 확인한 대표가 컨펌합니다.</p>
    ${repField('컨펌자 (대표)')}
    <div class="row end"><button class="btn" id="m-no">취소</button><button class="btn pri" id="m-ok">컨펌</button></div>`,
  m => {
    $('#m-no', m).onclick = closeModal; bindRep(m);
    $('#m-ok', m).onclick = guard(async () => {
      const by = $('#by', m).value.trim(); if (!by) return toast('대표 이름을 입력하세요.', 'bad');
      await saveRep(by);
      await api('/api/approve', { project: it.project, file: it.name, by });
      closeModal(); toast('컨펌했습니다.', 'ok'); await afterDrawerAction();
    });
  });
}
function reviseModal(it) {
  modal(`<h3>수정을 요청할까요?</h3>
    <p class="muted"><b>${esc(it.name)}</b><br>상태가 "수정 필요"로 바뀌고, 사유가 기록됩니다. 재작업은 새 버전(-v숫자)으로 만들어집니다.</p>
    ${repField('요청자 (대표)')}
    <div class="field"><label class="lbl" for="note">수정 사유</label><textarea class="in" id="note" maxlength="300" placeholder="예: 헤드라인이 너무 길어요. 혜택을 앞에 두세요."></textarea></div>
    <div class="row end"><button class="btn" id="m-no">취소</button><button class="btn pri" id="m-ok">수정 요청</button></div>`,
  m => {
    $('#m-no', m).onclick = closeModal; bindRep(m);
    $('#m-ok', m).onclick = guard(async () => {
      const by = $('#by', m).value.trim(), note = $('#note', m).value.trim();
      if (!by) return toast('대표 이름을 입력하세요.', 'bad');
      if (!note) return toast('수정 사유를 적어 주세요.', 'bad');
      await saveRep(by);
      await api('/api/revise', { project: it.project, file: it.name, by, note });
      closeModal(); toast('수정을 요청했습니다.', 'ok'); await afterDrawerAction();
    });
  });
}
document.addEventListener('keydown', e => { if (e.key === 'Escape' && S.drawer && $('#modal').hidden) closeDrawer(); });

/* ---------- Playbook (Account › Playbook): 팀과 AI가 콘텐츠를 만들 때마다 기준으로 삼는 운영 가이드. 저장할 때마다 v1, v2… 로 쌓인다 ---------- */
const bannedWords = () => (((S.pbLatest || {}).data || {}).rules || {}).banned || [];
const bannedHits = text => bannedWords().filter(w => w && text.includes(w));
const pbBlank = () => ({ brand: {}, target: { core: [{}], secondary: '' }, concept: { line: '', pillars: [{}, {}, {}] }, tone: { keywords: ['', '', ''], speech: '', emoji: '', do: ['', ''], dont: ['', ''] },
  positioning: { competitors: ['', '', ''] }, visual: { links: [] }, channels: { rows: [] }, kpi: { rows: [], cycle: '' }, rules: { banned: [] } });
function pbSummaryHtml(tabId) {
  const d = S.pbLatest && S.pbLatest.data;
  const go = '<button class="lnk acc" data-brief>Playbook 열기 ›</button>';
  if (!d) return `<div class="pbsum"><span class="muted">Playbook이 아직 없어요. 팀이 같은 기준으로 일하도록 먼저 작성해 주세요.</span>${go}</div>`;
  if (tabId === 'copy') {
    const t = d.tone || {}, ban = (d.rules || {}).banned || [];
    return `<div class="pbsum"><b>톤앤매너</b>${(t.keywords || []).filter(Boolean).map(k => `<span class="chip acc">${esc(k)}</span>`).join('') || '<span class="muted">키워드 미정</span>'}
      <span class="muted">${esc([t.speech, t.emoji ? `이모지 ${t.emoji}` : ''].filter(Boolean).join(' · ') || '말투 미정')}</span>
      <b style="margin-left:6px">금지어</b>${ban.length ? ban.slice(0, 8).map(w => `<span class="chip bad">${esc(w)}</span>`).join('') + (ban.length > 8 ? `<span class="muted">+${ban.length - 8}</span>` : '') : '<span class="muted">없음</span>'}</div>`;
  }
  const v = d.visual || {}, hex = (v.color || '').match(/#[0-9a-fA-F]{3,8}\b/);
  return `<div class="pbsum"><b>비주얼 가이드</b>${v.color ? `<span class="chip">${hex ? `<i class="cswatch" style="background:${esc(hex[0])}"></i>` : ''}${esc(v.color)}</span>` : '<span class="muted">메인 컬러 미정</span>'}
    ${v.mood ? `<span class="chip acc">${esc(v.mood)}</span>` : '<span class="muted">무드 미정</span>'}${v.avoid ? `<span class="muted">피해야 할 표현: ${esc(v.avoid)}</span>` : ''}</div>`;
}
const hasAny = o => o && typeof o === 'object' ? Object.values(o).some(hasAny) : Array.isArray(o) ? o.some(hasAny) : !!o || o === 0;
function campaignModal(c) {
  const e = c || {};
  modal(`<h3>${c ? '캠페인 수정' : '캠페인 추가'}</h3><form id="cf" class="form" autocomplete="off">
    <label class="field"><span class="lbl">캠페인명<span class="req">*</span></span><input class="in" name="name" maxlength="80" value="${esc(e.name || '')}" required placeholder="예: 가을 신제품 런칭"></label>
    <div class="grid2"><label class="field"><span class="lbl">기간 시작</span><input class="in" type="date" name="start" value="${esc(e.start || '')}"></label><label class="field"><span class="lbl">기간 끝</span><input class="in" type="date" name="end" value="${esc(e.end || '')}"></label></div>
    <label class="field"><span class="lbl">목표</span><textarea class="in" name="goal" maxlength="300">${esc(e.goal || '')}</textarea></label>
    <label class="field"><span class="lbl">핵심 메시지</span><textarea class="in" name="message" maxlength="300">${esc(e.message || '')}</textarea></label>
    <label class="field"><span class="lbl">산출물</span><textarea class="in" name="deliverables" maxlength="400" placeholder="한 줄에 하나씩">${esc(e.deliverables || '')}</textarea></label>
    <div class="row end"><button class="btn" type="button" id="m-no">취소</button><button class="btn pri" type="submit">${c ? '저장' : '추가'}</button></div></form>`,
  m => {
    $('#m-no', m).onclick = closeModal;
    $('#cf', m).onsubmit = guard(async ev => {
      ev.preventDefault(); const f = ev.target.elements, item = {};
      ['name', 'start', 'end', 'goal', 'message', 'deliverables'].forEach(k => { item[k] = f[k].value.trim(); });
      if (c) { for (const k of Object.keys(item)) await libSet('campaigns', 'update', { id: c.id, item: { [k]: item[k] } }); }
      else await libSet('campaigns', 'add', { item });
      closeModal(); toast('캠페인을 저장했습니다.', 'ok'); viewPlaybook();
    });
  });
}
async function viewPlaybook() {
  const P = await api('/api/playbook' + (S.pbSel ? `?v=${S.pbSel}` : ''));
  if (S.view !== 'playbook') return;
  const latest = P.versions.length ? P.versions[P.versions.length - 1].n : 0, viewing = P.n || 0;
  if (viewing === latest) S.pbLatest = P;
  const d = Object.assign(pbBlank(), P.data || {});
  const sec = P.sections || {}, inp = (path, val, ph, extra = '') => `<input class="in" data-f="${path}" value="${esc(val ?? '')}" placeholder="${esc(ph)}" ${extra}>`;
  const ta = (path, val, ph, n = 300) => `<textarea class="in" data-f="${path}" maxlength="${n}" placeholder="${esc(ph)}">${esc(val ?? '')}</textarea>`;
  const fld = (label, html, hint, req) => `<div class="field"><span class="lbl">${label}${req ? '<span class="req">*</span>' : ''}</span>${html}${hint ? `<span class="hint">${hint}</span>` : ''}</div>`;
  const rowsHtml = (name, rows, mk, max, addLabel) => `<div class="rows" data-list="${name}" data-max="${max}">${rows.map(mk).join('')}</div><button type="button" class="btn sm" data-add="${name}">${addLabel}</button>`;
  const del = '<button type="button" class="lnk" data-del aria-label="줄 삭제">✕</button>';
  const reqSec = (key, title, desc, body) => `<section class="card pad pbs"><div class="pbh"><h2>${title}</h2><span class="pill-s ${sec[key] ? 'ok' : ''}">${sec[key] ? '채워짐' : '필수'}</span></div><p class="muted">${desc}</p>${body}</section>`;
  const optSec = (title, desc, data, body) => `<details class="card pad pbs pbopt" ${hasAny(data) ? 'open' : ''}><summary><h2>${title}</h2><span class="pill-s">${hasAny(data) ? '작성됨' : '선택 · 나중에 채우기'}</span></summary><p class="muted">${desc}</p>${body}</details>`;
  const pers = (d.target.core.length ? d.target.core : [{}]);
  const pillars = (d.concept.pillars.length >= 3 ? d.concept.pillars : [...d.concept.pillars, {}, {}, {}].slice(0, 3));
  const opt = (arr, cur) => arr.map(x => `<option ${x === cur ? 'selected' : ''}>${x}</option>`).join('');
  const kw = [...d.tone.keywords, '', '', ''].slice(0, 3), dos = [...d.tone.do, '', ''].slice(0, 2), donts = [...d.tone.dont, '', ''].slice(0, 2), comps = [...d.positioning.competitors, '', '', ''].slice(0, 3);
  $('#view').innerHTML = `<div class="stack playbook">
    <div class="fbar"><b class="mth">${latest ? `Playbook v${viewing}` : '새 Playbook'}</b>${latest ? `<select class="in sm" id="pVer" style="width:auto" aria-label="버전 선택">${P.versions.slice().reverse().map(x => `<option value="${x.n}" ${x.n === viewing ? 'selected' : ''}>v${x.n}${x.n === latest ? ' (최신)' : ''} · ${esc((x.saved_at || '').slice(5, 16).replace('T', ' '))}</option>`).join('')}</select>` : '<span class="muted">팀과 AI가 콘텐츠를 만들 때마다 기준으로 삼는 문서예요. 아는 만큼 적고 저장하세요.</span>'}
      <span class="spacer"></span><button class="btn pri" id="pSave">${latest ? `새 버전(v${latest + 1})으로 저장` : 'Playbook 저장 (v1)'}</button></div>
    <div class="row" style="gap:8px;flex-wrap:wrap">${[['brand', '브랜드 기본'], ['target', '타깃'], ['concept', '운영 컨셉'], ['tone', '톤앤매너']].map(([k, l]) => `<span class="pill-s ${sec[k] ? 'ok' : ''}">${sec[k] ? '✓' : '○'} ${l}</span>`).join('')}<span class="muted" style="font-size:12.5px">필수 4섹션이 채워지면 Phase가 Concept로 넘어가요.</span></div>
    ${latest && viewing !== latest ? `<div class="note info">v${viewing}을 보고 있어요. 저장하면 이 내용을 바탕으로 v${latest + 1}이 새로 쌓여요(기존 버전은 그대로).</div>` : ''}
    <form id="pForm" class="stack" autocomplete="off">
    ${reqSec('brand', '브랜드 기본', '브랜드가 누구이고 무엇을 파는지.', `<div class="grid2">${fld('브랜드명', inp('brand.name', d.brand.name, '예: 모카나루', 'maxlength="40"'), '', true)}${fld('카테고리', inp('brand.category', d.brand.category, '예: 스페셜티 카페', 'maxlength="40"'))}</div>
      ${fld('한 줄 소개', inp('brand.tagline', d.brand.tagline, '브랜드를 한 문장으로', 'maxlength="100"'))}${fld('핵심 제품·서비스', inp('brand.products', d.brand.products, '주력 제품·서비스', 'maxlength="200"'))}`)}
    ${reqSec('target', '타깃', '누구에게 말하는지. 핵심 페르소나는 최대 3명.', `${rowsHtml('persona', pers, r => `<div class="lrow k3"><input class="in" value="${esc(r.age || '')}" placeholder="나이대 (예: 20대 후반)" maxlength="30"><input class="in" value="${esc(r.situation || '')}" placeholder="상황 (예: 출근길 카페 이용)" maxlength="120"><input class="in" value="${esc(r.pain || '')}" placeholder="고민 (예: 원두 고르기 어려움)" maxlength="160">${del}</div>`, 3, '+ 페르소나 추가')}
      ${fld('보조 타깃', ta('target.secondary', d.target.secondary, '핵심은 아니지만 함께 고려할 타깃', 200))}`)}
    ${reqSec('concept', '운영 컨셉', '계정을 어떤 컨셉으로 운영하는지, 콘텐츠를 어떤 기둥으로 채우는지(3~4개).', `${fld('컨셉 한 줄', inp('concept.line', d.concept.line, '예: 하루를 깨우는 한 잔의 이야기', 'maxlength="120"'))}
      <div class="field"><span class="lbl">콘텐츠 기둥 <small class="muted" id="pillarSum"></small></span>${rowsHtml('pillar', pillars, r => `<div class="lrow k3p"><input class="in" value="${esc(r.name || '')}" placeholder="기둥 이름" maxlength="40"><input class="in" value="${esc(r.desc || '')}" placeholder="설명" maxlength="160"><input class="in w" type="number" min="0" max="100" value="${esc(r.weight ?? '')}" placeholder="비중%">${del}</div>`, 4, '+ 기둥 추가')}</div>`)}
    ${reqSec('tone', '톤앤매너', '글을 어떻게 쓰는지. AI 카피 명령도 이 내용을 따릅니다.', `<div class="field"><span class="lbl">성격 키워드 3개</span><div class="row">${kw.map(k => `<input class="in" data-kw value="${esc(k)}" placeholder="예: 다정한" maxlength="20">`).join('')}</div></div>
      <div class="grid2">${fld('말투', `<select class="in" data-f="tone.speech"><option value="">선택</option>${opt(['존댓말', '반말'], d.tone.speech)}</select>`)}${fld('이모지', `<select class="in" data-f="tone.emoji"><option value="">선택</option>${opt(['사용', '가끔', '미사용'], d.tone.emoji)}</select>`)}</div>
      <div class="field"><span class="lbl">이렇게 쓴다 (예문 2개)</span>${dos.map(x => `<input class="in" data-do value="${esc(x)}" placeholder="예: 오늘은 천천히 시작해요" maxlength="160" style="margin-bottom:6px">`).join('')}</div>
      <div class="field"><span class="lbl">이렇게 안 쓴다 (예문 2개)</span>${donts.map(x => `<input class="in" data-dont value="${esc(x)}" placeholder="예: 지금 안 사면 후회합니다!!" maxlength="160" style="margin-bottom:6px">`).join('')}</div>`)}
    ${optSec('포지셔닝', '경쟁 브랜드 대비 어디에 서 있는지.', d.positioning, `<div class="field"><span class="lbl">경쟁 브랜드 (2~3개)</span><div class="row">${comps.map(x => `<input class="in" data-comp value="${esc(x)}" placeholder="브랜드명" maxlength="40">`).join('')}</div></div>${fld('차별점', ta('positioning.diff', d.positioning.diff, '', 200))}${fld('브랜드 약속 한 문장', inp('positioning.promise', d.positioning.promise, '', 'maxlength="160"'))}`)}
    ${optSec('비주얼 가이드', '색·무드·레퍼런스. Art 탭 상단에 요약돼요.', d.visual, `<div class="grid2">${fld('메인 컬러', inp('visual.color', d.visual.color, '예: #1B1A4B 네이비', 'maxlength="60"'))}${fld('무드 키워드', inp('visual.mood', d.visual.mood, '예: 차분한, 따뜻한, 미니멀', 'maxlength="100"'))}</div>
      <div class="field"><span class="lbl">레퍼런스 링크</span>${rowsHtml('vlink', d.visual.links.length ? d.visual.links : [''], v => `<div class="lrow"><input class="in" value="${esc(v)}" placeholder="https://" maxlength="300">${del}</div>`, 10, '+ 링크 추가')}</div>${fld('피해야 할 표현', ta('visual.avoid', d.visual.avoid, '쓰지 않는 색·이미지·연출', 200))}`)}
    ${optSec('채널 운영', '채널마다 역할과 업로드 계획. 주간 업로드 횟수는 이후 Content Calendar 알림에 쓰여요.', d.channels, rowsHtml('chan', d.channels.rows.length ? d.channels.rows : [{}], r => `<div class="lrow k4"><input class="in" value="${esc(r.channel || '')}" placeholder="채널 (예: 인스타그램)" maxlength="30"><input class="in" value="${esc(r.role || '')}" placeholder="역할" maxlength="100"><input class="in w" type="number" min="0" max="50" value="${esc(r.weekly ?? '')}" placeholder="주 N회"><input class="in" value="${esc(r.format || '')}" placeholder="주력 포맷" maxlength="60">${del}</div>`, 8, '+ 채널 추가'))}
    ${optSec('목표·KPI', '채널별 지표와 목표치. 목표치를 모르면 비워 두세요(지어내지 않아요).', d.kpi, `${rowsHtml('kpi', d.kpi.rows.length ? d.kpi.rows : [{}], r => `<div class="lrow k3"><input class="in" value="${esc(r.channel || '')}" placeholder="채널" maxlength="30"><input class="in" value="${esc(r.metric || '')}" placeholder="지표 (예: 도달)" maxlength="40"><input class="in" value="${esc(r.target || '')}" placeholder="목표치 (예: 월 5만)" maxlength="40">${del}</div>`, 10, '+ 지표 추가')}${fld('점검 주기', `<select class="in" data-f="kpi.cycle" style="max-width:160px"><option value="">선택</option>${opt(['주간', '격주', '월간'], d.kpi.cycle)}</select>`)}`)}
    ${optSec('금지·주의', '금지어는 AI 카피 검수에 바로 쓰이고, 결과물에 들어 있으면 경고해요.', d.rules, `${fld('금지어', ta('rules.banned', (d.rules.banned || []).join(', '), '쉼표나 줄바꿈으로 구분 (예: 최고, 무조건)', 600), '카피에 이 단어가 있으면 경고가 떠요.')}${fld('법적·심의 주의사항', ta('rules.legal', d.rules.legal, '', 300))}${fld('경쟁사 언급 규칙', inp('rules.competitor_rule', d.rules.competitor_rule, '예: 경쟁사 이름은 직접 쓰지 않는다', 'maxlength="200"'))}`)}
    </form>
    <section class="card pad pbs"><div class="pbh"><h2>캠페인</h2><button class="btn sm pri" id="cAdd">+ 캠페인 추가</button></div><p class="muted">Playbook 기준 아래에서 진행하는 캠페인을 여러 개 쌓아 둘 수 있어요. 추가·수정하면 바로 저장돼요.</p>
      <div class="evlist">${S.lib.campaigns.length ? S.lib.campaigns.map(c => `<div class="evrow"><div class="row"><b>${esc(c.name)}</b><span class="spacer"></span><small class="muted">${c.start || c.end ? `${esc(c.start ? mdShort(c.start) : '')} ~ ${esc(c.end ? mdShort(c.end) : '')}` : '기간 미정'}</small><button class="btn sm" data-ce="${esc(c.id)}">수정</button><button class="btn sm danger" data-cd="${esc(c.id)}">삭제</button></div>
        ${c.goal ? `<p class="muted">목표: ${esc(c.goal)}</p>` : ''}${c.message ? `<p class="muted">핵심 메시지: ${esc(c.message)}</p>` : ''}${c.deliverables ? `<p class="muted">산출물: ${esc(c.deliverables).replace(/\n/g, ' · ')}</p>` : ''}</div>`).join('') : '<span class="muted">아직 캠페인이 없어요.</span>'}</div></section>
    <small class="muted">파일은 어카운트 폴더의 playbook/ 에 playbook-v1, v2… 로 쌓이고, 같은 이름의 .md는 AI 팀이 읽는 사본이에요.</small></div>`;
  const v = $('#view'), form = $('#pForm');
  const rowsOf = n => [...v.querySelectorAll(`[data-list="${n}"] .lrow`)];
  const bindDel = () => v.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { const host = b.closest('.rows'); if (host.children.length > 1) b.closest('.lrow').remove(); else b.closest('.lrow').querySelectorAll('input').forEach(i => { i.value = ''; }); sumP(); });
  v.querySelectorAll('[data-add]').forEach(b => b.onclick = () => {
    const host = v.querySelector(`[data-list="${b.dataset.add}"]`);
    if (host.children.length >= +host.dataset.max) return toast(`최대 ${host.dataset.max}개까지 추가할 수 있어요.`, 'bad');
    const proto = host.lastElementChild.cloneNode(true); proto.querySelectorAll('input').forEach(i => { i.value = ''; }); host.appendChild(proto); bindDel(); proto.querySelector('input').focus();
  });
  bindDel();
  const sumP = () => { const t = rowsOf('pillar').reduce((n, r) => n + (+r.querySelector('.w').value || 0), 0); $('#pillarSum').textContent = t ? `· 비중 합계 ${t}%${t > 100 ? ' (100% 이하로 맞춰 주세요)' : ''}` : ''; };
  v.addEventListener('input', e => { if (e.target.closest('[data-list="pillar"]')) sumP(); }); sumP();
  const ver = $('#pVer'); if (ver) ver.onchange = () => { S.pbSel = +ver.value; viewPlaybook(); };
  $('#cAdd').onclick = () => campaignModal();
  v.querySelectorAll('[data-ce]').forEach(b => b.onclick = () => campaignModal(S.lib.campaigns.find(c => c.id === b.dataset.ce)));
  v.querySelectorAll('[data-cd]').forEach(b => b.onclick = guard(async () => { await libSet('campaigns', 'delete', { id: b.dataset.cd }); viewPlaybook(); }));
  $('#pSave').onclick = guard(async () => {
    const f = {}, setp = (path, val) => { const ks = path.split('.'); let o = f; ks.slice(0, -1).forEach(k => { o = o[k] = o[k] || {}; }); o[ks[ks.length - 1]] = val; };
    form.querySelectorAll('[data-f]').forEach(el => setp(el.dataset.f, el.value.trim()));
    const q = (n, i) => rowsOf(n).map(r => [...r.querySelectorAll('input')].map(x => x.value.trim()));
    setp('target.core', q('persona').map(([age, situation, pain]) => ({ age, situation, pain })));
    setp('concept.pillars', q('pillar').map(([name, desc, weight]) => ({ name, desc, weight })));
    setp('tone.keywords', [...form.querySelectorAll('[data-kw]')].map(x => x.value.trim()));
    setp('tone.do', [...form.querySelectorAll('[data-do]')].map(x => x.value.trim()));
    setp('tone.dont', [...form.querySelectorAll('[data-dont]')].map(x => x.value.trim()));
    setp('positioning.competitors', [...form.querySelectorAll('[data-comp]')].map(x => x.value.trim()));
    setp('visual.links', q('vlink').map(r => r[0]));
    setp('channels.rows', q('chan').map(([channel, role, weekly, format]) => ({ channel, role, weekly, format })));
    setp('kpi.rows', q('kpi').map(([channel, metric, target]) => ({ channel, metric, target })));
    const r = await api('/api/playbook', { fields: f });
    S.pbSel = null; S.pbLatest = r; toast(`Playbook v${r.saved}을(를) 저장했습니다.`, 'ok');
    await loadAccounts(); renderSide(); renderAcctHead(); viewPlaybook();
  });
}

/* ---------- 스케줄 캘린더 ---------- */
/* 광고주와 협의한 일정을 직접 적고, 콘텐츠 업로드 여부를 사람이 확인해 체크한다. 이 화면은 업로드·게시를 하지 않는다. */
const EVENT_TYPES = ['콘텐츠', '기획', '촬영', '회의', '기타'];
const typeLabel = t => t === '촬영' ? '슈팅' : t;   // 저장된 값은 '촬영' 그대로, 화면 표시만 '슈팅'
const doneLabel = e => e.type === '콘텐츠' ? '포스팅 완료' : '완료';
const overdue = e => !e.done && e.type === '콘텐츠' && e.date < S.st.today;
const reqLate = r => r.status !== '클로즈' && r.due && r.due < S.st.today;
const evRole = e => e.role || EVENT_ROLE[e.type] || '';
const evSort = (a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title);
async function evChange(op, extra) { S.lib = await api('/api/library', { kind: 'events', op, ...extra }); }
function evRow(e) {
  return `<div class="evrow ${e.done ? 'done' : ''}"><label class="pick"><input type="checkbox" data-tg="${esc(e.id)}" ${e.done ? 'checked' : ''}><span><b>${esc(e.title)}</b>${e.sample ? ' <span class="tag">예시</span>' : ''}</span></label>
    <div class="row"><span class="chip" data-t="${esc(e.type)}">${esc(typeLabel(e.type))}</span>${e.channel ? `<span class="chip">${esc(e.channel)}</span>` : ''}
      <span class="chip ${e.done ? 'ok' : overdue(e) ? 'bad' : ''}">${e.done ? `${doneLabel(e)}${e.done_at ? ' · ' + esc(e.done_at.slice(5)) : ''}` : overdue(e) ? '딜레이 · 포스팅 미확인' : '예정'}</span>
      <span class="spacer"></span><button class="btn sm danger" data-rm="${esc(e.id)}">삭제</button></div>${e.note ? `<p class="muted">${esc(e.note)}</p>` : ''}</div>`;
}
const calToggle = () => `<div class="seg" role="group" aria-label="보기"><button class="seg-b" data-mode="cal" aria-pressed="${S.calMode !== 'list'}">캘린더</button><button class="seg-b" data-mode="list" aria-pressed="${S.calMode === 'list'}">리스트 (포스팅 관리)</button></div>`;
function bindCalToggle() { $('#view').querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { S.calMode = b.dataset.mode; viewCal(); }); }
function viewCal() { return S.calMode === 'list' ? viewPosts() : viewCalGrid(); }
function viewCalGrid() {
  const today = S.st.today;
  const C = S.cal = S.cal || { y: +today.slice(0, 4), m: +today.slice(5, 7), sel: today };
  const pad = n => String(n).padStart(2, '0'), key = d => `${C.y}-${pad(C.m)}-${pad(d)}`;
  const lead = new Date(C.y, C.m - 1, 1).getDay(), days = new Date(C.y, C.m, 0).getDate();
  const by = {}; S.lib.events.forEach(e => (by[e.date] = by[e.date] || []).push(e));
  const month = S.lib.events.filter(e => e.date.startsWith(`${C.y}-${pad(C.m)}`));
  const cont = month.filter(e => e.type === '콘텐츠');
  let cells = '<span class="cal-d off"></span>'.repeat(lead);
  for (let d = 1; d <= days; d++) {
    const k = key(d), evs = (by[k] || []).slice().sort(evSort);
    cells += `<button class="cal-d ${k === today ? 'today' : ''} ${k === C.sel ? 'sel' : ''}" data-d="${k}"><span class="dn">${d}</span>${evs.slice(0, 3).map(e => `<span class="ev ${overdue(e) ? 'late' : ''}" data-t="${esc(e.type)}" ${e.done ? 'data-done' : ''}>${e.done ? '✓ ' : ''}${esc(e.title)}</span>`).join('')}${evs.length > 3 ? `<span class="more">+${evs.length - 3}</span>` : ''}</button>`;
  }
  const dayEvs = (by[C.sel] || []).slice().sort(evSort);
  $('#view').innerHTML = `${calToggle()}
    <div class="stats">${statHtml('이번 달 일정', `${month.length}개`)}${statHtml('콘텐츠 포스팅', `${cont.filter(e => e.done).length}/${cont.length}`, '확인 완료/전체')}${statHtml('딜레이', `${S.lib.events.filter(overdue).length}개`, '포스팅 미확인')}</div>
    <div class="cal-head"><button class="btn sm" id="cPrev" aria-label="이전 달">←</button><b>${C.y}년 ${C.m}월</b><button class="btn sm" id="cNext" aria-label="다음 달">→</button><button class="btn sm" id="cToday">오늘</button>
      <span class="spacer"></span>${EVENT_TYPES.map(t => `<span class="chip" data-t="${t}">${typeLabel(t)}</span>`).join('')}</div>
    <div class="cal card"><div class="cal-w">${['일', '월', '화', '수', '목', '금', '토'].map(w => `<span>${w}</span>`).join('')}</div><div class="cal-g">${cells}</div></div>
    <div class="grid2" style="margin-top:18px;align-items:start">
      <div class="card pad"><div class="sec-t" style="margin:0 0 10px">${esc(C.sel)} 일정 <span class="chip">${dayEvs.length}</span></div>
        <div class="evlist">${dayEvs.length ? dayEvs.map(evRow).join('') : '<span class="muted">이 날짜에 일정이 없어요.</span>'}</div>
        <p class="hint muted" style="font-size:12.5px;margin:12px 0 0">체크는 담당자가 직접 확인한 뒤 남기는 기록입니다. 이 화면은 포스팅을 실행하지 않습니다.</p></div>
      <form class="card pad form" id="evform" autocomplete="off"><div class="sec-t" style="margin:0">일정 추가</div>
        <label class="field"><span class="lbl">날짜<span class="req">*</span></span><input class="in" type="date" name="date" value="${esc(C.sel)}" required></label>
        <label class="field"><span class="lbl">제목<span class="req">*</span></span><input class="in" name="title" maxlength="80" placeholder="예: 10월 인스타 릴스 포스팅" required></label>
        <div class="grid2"><label class="field"><span class="lbl">유형</span><select class="in" name="type">${EVENT_TYPES.map(t => `<option value="${t}">${typeLabel(t)}</option>`).join('')}</select></label>
          <label class="field"><span class="lbl">채널</span><input class="in" name="channel" maxlength="40" placeholder="예: 인스타그램"></label></div>
        <label class="field"><span class="lbl">제작 역할 (선택)</span><select class="in" name="role"><option value="">자동(유형 기준)</option>${ROLE_CODES.map(c => `<option>${c}</option>`).join('')}</select></label>
        <label class="field"><span class="lbl">메모 (클라이언트와 협의한 내용)</span><input class="in" name="note" maxlength="200"></label>
        <button class="btn pri" type="submit">일정 추가</button></form>
    </div>`;
  bindCalToggle();
  const nav = d => { C.m += d; if (C.m < 1) { C.m = 12; C.y--; } if (C.m > 12) { C.m = 1; C.y++; } viewCal(); };
  $('#cPrev').onclick = () => nav(-1); $('#cNext').onclick = () => nav(1);
  $('#cToday').onclick = () => { S.cal = null; viewCal(); };
  $('#view').querySelectorAll('[data-d]').forEach(b => b.onclick = () => { C.sel = b.dataset.d; viewCal(); });
  $('#view').querySelectorAll('[data-tg]').forEach(c => c.onchange = guard(async () => { await evChange('toggle', { id: c.dataset.tg }); viewCal(); }));
  $('#view').querySelectorAll('[data-rm]').forEach(b => b.onclick = guard(async () => { await evChange('delete', { id: b.dataset.rm }); viewCal(); }));
  $('#evform').onsubmit = guard(async e => {
    e.preventDefault();
    const item = {}; ['date', 'title', 'type', 'channel', 'role', 'note'].forEach(k => { item[k] = e.target.querySelector(`[name=${k}]`).value; });
    await evChange('add', { item });
    C.y = +item.date.slice(0, 4); C.m = +item.date.slice(5, 7); C.sel = item.date;
    toast('일정을 추가했습니다.', 'ok'); viewCal();
  });
}

/* ---------- Content Calendar 리스트(포스팅 관리) · Client Request · Issue Log (설계서 §7) ---------- */
/* 이 화면은 포스팅·발송을 실행하지 않는다. 담당자가 직접 확인한 결과를 기록한다. */
const libSet = async (kind, op, extra) => { S.lib = await api('/api/library', { kind, op, ...extra }); };
const sel = (name, opts, cur, attrs = '') => `<select class="in sm" ${attrs} name="${name}">${opts.map(o => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}" ${v === cur ? 'selected' : ''}>${esc(l)}</option>`; }).join('')}</select>`;
const roleOpts = [['', '—'], ...ROLE_CODES.map(c => [c, c])];
const stPill = (label, kind) => `<span class="pill-s ${kind}">${esc(label)}</span>`;
const refreshAcct = async () => { await loadAccounts(); renderAcctHead(); };
const wd = iso => `${mdShort(iso).replace('.', '.')} (${WEEKDAY[new Date(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)).getDay()]})`;

function postStatus(e) { return e.done ? ['포스팅 완료', 'ok'] : e.wait ? ['컨펌 대기', 'warn'] : e.date < S.st.today ? ['딜레이', 'late'] : ['포스팅 예정', 'gray']; }
function postModal() {
  modal(`<h3>포스팅 일정 추가</h3>
    <form id="pf" class="form" autocomplete="off">
      <label class="field"><span class="lbl">포스팅일<span class="req">*</span></span><input class="in" type="date" name="date" value="${esc(S.st.today)}" required></label>
      <label class="field"><span class="lbl">콘텐츠<span class="req">*</span></span><input class="in" name="title" maxlength="80" placeholder="예: 카드뉴스 포스팅" required></label>
      <div class="grid2"><label class="field"><span class="lbl">채널</span><input class="in" name="channel" maxlength="40" placeholder="예: 인스타그램"></label>
        <label class="field"><span class="lbl">제작 역할</span>${sel('role', roleOpts, '')}</label></div>
      <div class="row end"><button class="btn" type="button" id="m-no">취소</button><button class="btn pri" type="submit">추가</button></div></form>`,
  m => {
    $('#m-no', m).onclick = closeModal;
    $('#pf', m).onsubmit = guard(async e => {
      e.preventDefault(); const f = e.target, item = { type: '콘텐츠' };
      ['date', 'title', 'channel', 'role'].forEach(k => { item[k] = f.elements[k].value; });
      await libSet('events', 'add', { item }); closeModal(); toast('포스팅 일정을 추가했습니다.', 'ok'); viewPosts(); refreshAcct();
    });
  });
}
function linkModal(e) {
  modal(`<h3>포스팅 링크 등록</h3><p class="muted"><b>${esc(e.title)}</b><br>담당자가 실제 포스팅을 확인한 뒤 링크를 적으세요. 등록하면 포스팅 완료로 기록되고 Performance의 콘텐츠 성과 수집 대상이 됩니다.</p>
    <div class="field"><label class="lbl" for="lk">포스팅 링크</label><input class="in" id="lk" value="${esc(e.link || '')}" placeholder="https://" maxlength="300"></div>
    <div class="row end"><button class="btn" id="m-no">취소</button><button class="btn pri" id="m-ok">저장</button></div>`,
  m => {
    $('#m-no', m).onclick = closeModal;
    $('#m-ok', m).onclick = guard(async () => { await libSet('events', 'update', { id: e.id, item: { link: $('#lk', m).value.trim() } }); closeModal(); viewPosts(); refreshAcct(); });
  });
}
function viewPosts() {
  const F = S.postF = S.postF || { ch: 'All', st: '' }, today = S.st.today;
  const all = S.lib.events.filter(e => e.type === '콘텐츠').sort(evSort);
  const chans = ['All', ...new Set(all.map(e => e.channel).filter(Boolean))];
  const st = e => postStatus(e)[0];
  const rows = all.filter(e => (F.ch === 'All' || e.channel === F.ch) && (!F.st || st(e) === F.st));
  const nWait = all.filter(e => st(e) === '컨펌 대기').length, nLate = all.filter(e => st(e) === '딜레이').length;
  $('#view').innerHTML = `<div class="stack">
    <div class="fbar">${calToggle()}<span class="vsep"></span>${chans.map(c => `<button class="fchip" data-ch="${esc(c)}" aria-pressed="${F.ch === c}">${esc(c)}</button>`).join('')}<span class="vsep"></span>
      <button class="fchip" data-stf="컨펌 대기" aria-pressed="${F.st === '컨펌 대기'}">컨펌 대기 ${nWait}</button><button class="fchip ${nLate ? 'late' : ''}" data-stf="딜레이" aria-pressed="${F.st === '딜레이'}">딜레이 ${nLate}</button>
      <span class="spacer"></span><button class="btn pri" id="addPost">+ 포스팅 일정</button></div>
    <div class="tbl"><div class="tbl-in" style="min-width:900px"><div class="tr th" style="grid-template-columns:100px 100px 1fr 90px 220px 130px 40px"><span>포스팅일</span><span>채널</span><span>콘텐츠</span><span>제작</span><span>상태</span><span>포스팅 링크</span><span></span></div>
      ${rows.length ? rows.map(e => { const [l, k] = postStatus(e); return `<div class="tr" style="grid-template-columns:100px 100px 1fr 90px 220px 130px 40px"><span class="muted">${wd(e.date)}</span><span>${esc(e.channel || '—')}</span><b>${esc(e.title)}${e.sample ? ' <span class="tag">예시</span>' : ''}</b>
        <span>${sel('role', roleOpts, evRole(e), `data-role="${esc(e.id)}"`)}</span>
        <span class="row">${stPill(l, k)}${e.done ? '' : `<button class="btn sm" data-wait="${esc(e.id)}">${e.wait ? '대기 해제' : '컨펌 대기'}</button><button class="btn sm" data-done="${esc(e.id)}">포스팅 확인</button>`}</span>
        <span>${e.link ? `<a href="${esc(e.link)}" target="_blank" rel="noopener noreferrer" class="ok-t">링크 등록됨</a> <button class="lnk" data-link="${esc(e.id)}" aria-label="링크 수정">✎</button>` : `<button class="btn sm" data-link="${esc(e.id)}">링크 등록</button>`}</span>
        <button class="lnk" data-rm="${esc(e.id)}" aria-label="삭제">✕</button></div>`; }).join('')
        : '<div class="empty"><b>포스팅 일정이 없어요</b>+ 포스팅 일정으로 클라이언트와 협의한 일정을 추가하세요.</div>'}</div></div>
    <small class="muted">링크를 등록하면 Performance 탭의 콘텐츠 성과 수집 대상에 들어갑니다. 포스팅일이 지났는데 링크도 확인 기록도 없으면 딜레이로 표시됩니다. 이 화면은 포스팅을 실행하지 않습니다.</small></div>`;
  const v = $('#view'), by = id => S.lib.events.find(e => e.id === id), go2 = fn => guard(async b => { await fn(b); viewPosts(); refreshAcct(); });
  bindCalToggle();
  v.querySelectorAll('[data-ch]').forEach(b => b.onclick = () => { F.ch = b.dataset.ch; viewPosts(); });
  v.querySelectorAll('[data-stf]').forEach(b => b.onclick = () => { F.st = F.st === b.dataset.stf ? '' : b.dataset.stf; viewPosts(); });
  $('#addPost').onclick = postModal;
  v.querySelectorAll('[data-role]').forEach(x => x.onchange = go2(() => libSet('events', 'update', { id: x.dataset.role, item: { role: x.value } })));
  v.querySelectorAll('[data-wait]').forEach(b => b.onclick = go2(() => libSet('events', 'update', { id: b.dataset.wait, item: { wait: !by(b.dataset.wait).wait } })));
  v.querySelectorAll('[data-done]').forEach(b => b.onclick = go2(() => libSet('events', 'toggle', { id: b.dataset.done })));
  v.querySelectorAll('[data-link]').forEach(b => b.onclick = () => linkModal(by(b.dataset.link)));
  v.querySelectorAll('[data-rm]').forEach(b => b.onclick = go2(() => libSet('events', 'delete', { id: b.dataset.rm })));
}

/* ---- Client Request ---- */
const REQ_CHANNELS = ['메일', '카톡', '미팅', '기타'], REQ_STATUS = ['배정', '진행 중', '클로즈'];
const STATUS_KIND = { '배정': 'gray', '진행 중': 'info', '클로즈': 'ok', '해결': 'ok', '조치 중': 'warn', '미해결': 'late' };
function reqModal(pre = {}) {
  modal(`<h3>리퀘스트 등록</h3>
    <form id="rf" class="form" autocomplete="off">
      <label class="field"><span class="lbl">리퀘스트<span class="req">*</span></span><input class="in" name="title" maxlength="100" value="${esc(pre.title || '')}" placeholder="예: 상세페이지 가격 표기 수정" required></label>
      <div class="grid2"><label class="field"><span class="lbl">채널</span>${sel('channel', REQ_CHANNELS, pre.channel || '미팅')}</label>
        <label class="field"><span class="lbl">담당 역할</span>${sel('role', roleOpts, pre.role || '')}</label></div>
      <div class="grid2"><label class="field"><span class="lbl">데드라인</span><input class="in" type="date" name="due" value="${esc(pre.due || '')}"></label>
        <label class="field"><span class="lbl">우선순위</span>${sel('priority', ['Normal', 'High'], 'Normal')}</label></div>
      <p class="muted" style="font-size:12.5px;margin:0">담당을 지정하면 그 팀 탭의 My Tasks에 올라갑니다. 모르는 값은 비워 두세요.</p>
      <div class="row end"><button class="btn" type="button" id="m-no">취소</button><button class="btn pri" type="submit">등록</button></div></form>`,
  m => {
    $('#m-no', m).onclick = closeModal;
    $('#rf', m).onsubmit = guard(async e => {
      e.preventDefault(); const f = e.target.elements, item = {};
      ['title', 'channel', 'role', 'due', 'priority'].forEach(k => { item[k] = f[k].value; });
      await libSet('requests', 'add', { item }); closeModal(); toast('리퀘스트를 등록했습니다.', 'ok'); viewRequests(); refreshAcct();
    });
  });
}
async function loadReqCandidates() {
  const files = S.ov.filter(i => /^meeting/i.test(i.name) && /\.md$/i.test(i.name)).slice(0, 5), out = [];
  for (const f of files) {
    try {
      const t = (await api(`/api/file?project=${encodeURIComponent(f.project)}&area=${f.area}&name=${encodeURIComponent(f.name)}`)).text;
      const sec = t.split(/^##\s*액션아이템.*$/m)[1]; if (!sec) continue;
      for (const line of sec.split('\n')) {
        if (/^##\s/.test(line)) break;
        if (!line.trim().startsWith('|') || /^\|\s*-/.test(line.trim())) continue;
        const c = line.trim().replace(/^\||\|$/g, '').split('|').map(x => x.trim());
        if (!c[0] || c[0] === '내용' || /[{}]/.test(c[0])) continue;
        const due = (c[2] || '').match(/\d{4}-\d{2}-\d{2}/);
        out.push({ title: c[0].slice(0, 100), who: c[1] || '', due: due ? due[0] : '', file: f.name, note: c[2] || '' });
      }
    } catch { /* 파일을 못 읽으면 후보에서 제외 */ }
  }
  const have = new Set(S.lib.requests.map(r => r.title));
  return out.filter(c => !have.has(c.title));
}
function candModal(list) {
  modal(`<h3>Meeting Note 리퀘스트 후보</h3><p class="muted">회의록의 액션아이템입니다. 내용을 확인하고 등록하세요. 담당 역할과 데드라인은 등록 창에서 정합니다.</p>
    <div class="evlist">${list.map((c, i) => `<div class="evrow"><b>${esc(c.title)}</b><small class="muted">${esc(c.file)}${c.who ? ` · 담당자 ${esc(c.who)}` : ''}${c.note ? ` · 기한 ${esc(c.note)}` : ''}</small><div class="row end"><button class="btn sm pri" data-reg="${i}">등록하기</button></div></div>`).join('')}</div>
    <div class="row end"><button class="btn" id="m-no">닫기</button></div>`,
  m => { $('#m-no', m).onclick = closeModal; m.querySelectorAll('[data-reg]').forEach(b => b.onclick = () => { const c = list[+b.dataset.reg]; closeModal(); reqModal({ title: c.title, due: c.due }); }); });
}
function viewRequests() {
  const today = S.st.today, rs = S.lib.requests.slice().sort((a, b) => (b.received || '').localeCompare(a.received || ''));
  const [w0, w1] = (S.acc && S.acc.week) || [today, today];
  const open = rs.filter(r => r.status !== '클로즈'), late = rs.filter(reqLate), closedWk = rs.filter(r => r.status === '클로즈' && r.closed_at >= w0 && r.closed_at <= w1);
  const k = (ko, v, cls) => `<div class="kpi k4"><span class="ko">${ko}</span><b class="${cls || ''}">${v}건</b></div>`;
  const cols = 'grid-template-columns:80px 1fr 80px 90px 100px 100px 150px 40px';
  $('#view').innerHTML = `<div class="stack"><div class="kpis">${k('오픈 리퀘스트', open.length)}${k('딜레이', late.length, late.length ? 'late' : '')}${k('이번 주 클로즈', closedWk.length)}</div>
    <div class="banner" id="cand"><span>회의록(Meeting Note)에서 리퀘스트 후보를 찾는 중…</span><span class="spacer"></span><button class="btn pri" id="candBtn" hidden>후보 보기</button><button class="btn" id="addReq">+ 리퀘스트 등록</button></div>
    <div class="tbl"><div class="tbl-in" style="min-width:960px"><div class="tr th" style="${cols}"><span>접수</span><span>리퀘스트</span><span>채널</span><span>담당</span><span>데드라인</span><span>우선순위</span><span>상태</span><span></span></div>
      ${rs.length ? rs.map(r => `<div class="tr" style="${cols}"><span class="muted">${r.received ? mdShort(r.received) : '—'}</span><b>${esc(r.title)}</b><span class="muted">${esc(r.channel || '—')}</span>
        <span>${sel('role', roleOpts, r.role || '', `data-role="${esc(r.id)}"`)}</span><span class="${reqLate(r) ? 'late-t' : ''}">${r.due ? mdShort(r.due) : '—'}</span>
        <span>${sel('priority', ['Normal', 'High'], r.priority || 'Normal', `data-pri="${esc(r.id)}"`)}</span>
        <span class="row">${reqLate(r) ? stPill('딜레이', 'late') : ''}${sel('status', REQ_STATUS, r.status, `data-st="${esc(r.id)}"`)}</span><button class="lnk" data-rm="${esc(r.id)}" aria-label="삭제">✕</button></div>`).join('')
        : '<div class="empty"><b>리퀘스트가 없어요</b>클라이언트가 요청한 내용을 등록하고 담당 역할을 지정하세요.</div>'}</div></div>
    <small class="muted">담당을 지정하면 해당 팀 탭의 My Tasks에 바로 올라가고, 데드라인이 지나면 Overview의 딜레이에 합산됩니다.</small></div>`;
  const v = $('#view'), after = fn => guard(async x => { await fn(x); viewRequests(); refreshAcct(); });
  $('#addReq').onclick = () => reqModal();
  v.querySelectorAll('[data-role]').forEach(x => x.onchange = after(() => libSet('requests', 'update', { id: x.dataset.role, item: { role: x.value } })));
  v.querySelectorAll('[data-pri]').forEach(x => x.onchange = after(() => libSet('requests', 'update', { id: x.dataset.pri, item: { priority: x.value } })));
  v.querySelectorAll('[data-st]').forEach(x => x.onchange = after(() => libSet('requests', 'update', { id: x.dataset.st, item: { status: x.value } })));
  v.querySelectorAll('[data-rm]').forEach(b => b.onclick = after(() => libSet('requests', 'delete', { id: b.dataset.rm })));
  loadReqCandidates().then(list => {
    if (S.view !== 'requests') return;
    const box = $('#cand'); if (!box) return;
    box.firstElementChild.textContent = list.length ? `Meeting Note에서 뽑은 리퀘스트 후보 ${list.length}건이 있어요. 확인 후 등록하세요.` : '등록할 Meeting Note 후보가 없어요. 회의록을 정리하면 액션아이템이 여기에 후보로 나옵니다.';
    const b = $('#candBtn'); if (list.length) { b.hidden = false; b.onclick = () => candModal(list); }
  });
}

/* ---- Issue Log ---- */
const ISSUE_TYPES = ['일정 딜레이', '소재 리젝', '성과 이상', '매체 정책·계정', '클라이언트 클레임'], ISSUE_STATUS = ['해결', '조치 중', '미해결'];
function issueModal() {
  modal(`<h3>이슈 로그 추가</h3>
    <form id="isf" class="form" autocomplete="off">
      <div class="grid2"><label class="field"><span class="lbl">발생일<span class="req">*</span></span><input class="in" type="date" name="date" value="${esc(S.st.today)}" required></label>
        <label class="field"><span class="lbl">유형<span class="req">*</span></span>${sel('type', ISSUE_TYPES, ISSUE_TYPES[0])}</label></div>
      <label class="field"><span class="lbl">내용 · 영향<span class="req">*</span></span><input class="in" name="content" maxlength="200" required placeholder="무슨 일이 있었고 어떤 영향이 있었나요?"></label>
      <label class="field"><span class="lbl">조치 · 재발 방지</span><input class="in" name="action" maxlength="200" placeholder="모르면 비워 두세요 (원인 확인 전)"></label>
      <div class="row end"><button class="btn" type="button" id="m-no">취소</button><button class="btn pri" type="submit">추가</button></div></form>`,
  m => {
    $('#m-no', m).onclick = closeModal;
    $('#isf', m).onsubmit = guard(async e => {
      e.preventDefault(); const f = e.target.elements, item = {};
      ['date', 'type', 'content', 'action'].forEach(k => { item[k] = f[k].value; });
      await libSet('issues', 'add', { item }); closeModal(); toast('이슈를 기록했습니다.', 'ok'); viewIssues(); refreshAcct();
    });
  });
}
function actionModal(i) {
  modal(`<h3>조치 · 재발 방지</h3><p class="muted">${esc(i.content)}</p>
    <div class="field"><label class="lbl" for="ac">조치 내용</label><input class="in" id="ac" value="${esc(i.action || '')}" maxlength="200"></div>
    <div class="row end"><button class="btn" id="m-no">취소</button><button class="btn pri" id="m-ok">저장</button></div>`,
  m => { $('#m-no', m).onclick = closeModal; $('#m-ok', m).onclick = guard(async () => { await libSet('issues', 'update', { id: i.id, item: { action: $('#ac', m).value.trim() } }); closeModal(); viewIssues(); }); });
}
function viewIssues() {
  const I = S.iss = S.iss || { y: +S.st.today.slice(0, 4), m: +S.st.today.slice(5, 7), type: 'All' };
  const pad = n => String(n).padStart(2, '0'), ym = `${I.y}-${pad(I.m)}`;
  const month = S.lib.issues.filter(i => i.date.startsWith(ym)).sort((a, b) => a.date.localeCompare(b.date));
  const rows = month.filter(i => I.type === 'All' || i.type === I.type), cnt = t => month.filter(i => i.type === t).length;
  const n = s => month.filter(i => i.status === s).length, cand = S.fb.filter(f => f.status === '후보').length;
  const cols = 'grid-template-columns:70px 130px 1fr 1fr 110px 40px';
  $('#view').innerHTML = `<div class="stack"><div class="fbar"><button class="btn icon" id="iPrev" aria-label="이전 달">‹</button><b class="mth">${I.y}년 ${I.m}월</b><button class="btn icon" id="iNext" aria-label="다음 달">›</button><span class="vsep"></span>
      <button class="fchip" data-it="All" aria-pressed="${I.type === 'All'}">All ${month.length}</button>${ISSUE_TYPES.map(t => `<button class="fchip" data-it="${esc(t)}" aria-pressed="${I.type === t}">${esc(t)} ${cnt(t)}</button>`).join('')}
      <span class="spacer"></span><button class="btn pri" id="addIssue">+ 이슈 로그</button></div>
    <div class="tbl"><div class="tbl-in" style="min-width:900px"><div class="tr th" style="${cols}"><span>발생</span><span>유형</span><span>내용 · 영향</span><span>조치 · 재발 방지</span><span>상태</span><span></span></div>
      ${rows.length ? rows.map(i => `<div class="tr top" style="${cols}"><span class="muted">${mdShort(i.date)}</span><b>${esc(i.type)}</b><span>${esc(i.content)}</span>
        <span>${i.action ? esc(i.action) : '<span class="muted">[원인 확인 전]</span>'} <button class="lnk" data-ac="${esc(i.id)}" aria-label="조치 수정">✎</button></span>
        <span>${sel('status', ISSUE_STATUS, i.status, `data-st="${esc(i.id)}"`)}</span><button class="lnk" data-rm="${esc(i.id)}" aria-label="삭제">✕</button></div>`).join('')
        : `<div class="empty"><b>${I.m}월 이슈가 없어요</b>일정 딜레이·소재 리젝·성과 이상 같은 일이 생기면 기록하세요.</div>`}</div></div>
    <div class="grid2"><div class="card pad"><div class="sec-t" style="margin:0 0 6px;color:var(--accent)">피드백 룰 후보</div>
        <p style="margin:0 0 4px;font-weight:500">${cand ? `대표 컨펌을 기다리는 피드백 후보가 ${cand}건 있어요.` : '컨펌 대기 중인 피드백 후보가 없어요.'}</p>
        <small class="muted">같은 사유의 리젝이 반복되면 후보로 올려 대표가 컨펌합니다. 컨펌한 규칙만 이후 작업에 적용됩니다.</small><div class="row" style="margin-top:12px"><button class="btn pri" id="toFb">피드백 규칙 보기</button></div></div>
      <div class="card pad"><div class="sec-t" style="margin:0 0 6px;color:var(--accent)">Monthly Report 연동</div>
        <p style="margin:0 0 4px;font-weight:500">${I.m}월 이슈 ${month.length}건이 Monthly Report의 Issue 섹션에 들어갑니다.</p>
        <small class="muted">해결 ${n('해결')} · 조치 중 ${n('조치 중')} · 미해결 ${n('미해결')} — Monthly Report 화면은 아직 없어서, 만들어지면 이 기록이 연결됩니다.</small></div></div></div>`;
  const v = $('#view'), nav = d => { I.m += d; if (I.m < 1) { I.m = 12; I.y--; } if (I.m > 12) { I.m = 1; I.y++; } viewIssues(); };
  $('#iPrev').onclick = () => nav(-1); $('#iNext').onclick = () => nav(1); $('#addIssue').onclick = issueModal; $('#toFb').onclick = () => goSub('', 'feedback');
  v.querySelectorAll('[data-it]').forEach(b => b.onclick = () => { I.type = b.dataset.it; viewIssues(); });
  v.querySelectorAll('[data-st]').forEach(x => x.onchange = guard(async () => { await libSet('issues', 'update', { id: x.dataset.st, item: { status: x.value } }); viewIssues(); refreshAcct(); }));
  v.querySelectorAll('[data-ac]').forEach(b => b.onclick = () => actionModal(S.lib.issues.find(i => i.id === b.dataset.ac)));
  v.querySelectorAll('[data-rm]').forEach(b => b.onclick = guard(async () => { await libSet('issues', 'delete', { id: b.dataset.rm }); viewIssues(); refreshAcct(); }));
}

/* ---------- 레퍼런스 · 경쟁사 · 검색 키워드 (직접 모으는 자료) ---------- */
/* 외부 서비스에서 자동으로 가져오지 않는다. 검색량·CPC 같은 수치는 키워드 연동 전까지 비워 둔다. */
const LIBV = {
  references: { title: '레퍼런스 보드', icon: 'board', add: '레퍼런스 추가',
    desc: '참고할 광고·영상·페이지를 보드별로 모읍니다. 카피·영상 기획과 제작 화면에서 함께 확인할 수 있습니다.',
    fields: [['title', '제목', '예: 신제품 숏폼 광고', true], ['url', '링크', 'https://', false], ['brand', '브랜드', '예: 경쟁사 A', false], ['board', '보드', '예: 숏폼', false], ['note', '메모', '배울 점', false]],
    empty: '아직 레퍼런스가 없어요. 위에서 첫 레퍼런스를 추가해 보세요.' },
  competitors: { title: '브랜드 아카이브', icon: 'archive', add: '경쟁사 추가',
    desc: '경쟁사·벤치마크 브랜드를 모아 두고, 어떤 채널에서 무엇을 하는지 메모합니다.',
    fields: [['brand', '브랜드', '예: 경쟁사 A', true], ['url', '링크', 'https://', false], ['channel', '채널', '예: 인스타그램', false], ['note', '메모', '관찰한 내용', false]],
    empty: '아직 등록된 경쟁사가 없어요.' },
  keywords: { title: '검색 키워드', icon: 'key', add: '키워드 추가',
    desc: '브랜드와 관련된 검색 키워드를 모아 봅니다. 검색량·CPC 같은 수치는 키워드 도구를 연동하기 전까지 비어 있습니다.',
    fields: [['keyword', '키워드', '예: 모카나루 카페', true], ['type', '유형', '', false], ['note', '메모', '', false]],
    empty: '아직 등록된 키워드가 없어요.' },
};
const safeUrl = u => /^https?:\/\/\S+$/.test(u || '') ? u : '';
const linkHtml = u => safeUrl(u) ? `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(u.replace(/^https?:\/\//, '').slice(0, 48))}</a>` : '';
async function libChange(kind, op, extra) {
  S.lib = await api('/api/library', { kind, op, ...extra });
}
function libCard(kind, r) {
  const del = `<button class="btn sm danger" data-del="${esc(r.id)}">삭제</button>`;
  if (kind === 'references') return `<div class="card lcard"><div class="row"><b>${esc(r.title)}</b><span class="spacer"></span>${del}</div>
    <div class="row">${r.board ? `<span class="chip acc">${esc(r.board)}</span>` : ''}${r.brand ? `<span class="chip">${esc(r.brand)}</span>` : ''}</div>${linkHtml(r.url)}${r.note ? `<p>${esc(r.note)}</p>` : ''}</div>`;
  return `<div class="card lcard"><div class="row"><b>${esc(r.brand)}</b><span class="spacer"></span>${del}</div>
    ${r.channel ? `<div class="row"><span class="chip">${esc(r.channel)}</span></div>` : ''}${linkHtml(r.url)}${r.note ? `<p>${esc(r.note)}</p>` : ''}</div>`;
}
function libList(kind, q) {
  const L = LIBV[kind]; q = (q || '').trim().toLowerCase();
  const rows = S.lib[kind].filter(r => !q || Object.values(r).join(' ').toLowerCase().includes(q));
  if (!rows.length) return `<div class="card empty" style="margin-top:12px"><b>${S.lib[kind].length ? '검색 결과가 없어요' : '비어 있어요'}</b>${S.lib[kind].length ? '다른 검색어를 입력해 보세요.' : L.empty}</div>`;
  if (kind === 'keywords') {
    const tone = { 브랜드: 'ok', 경쟁사: 'warn', 일반: '' };
    return `<div class="card tw" style="margin-top:12px"><table><thead><tr><th>키워드</th><th>유형</th><th>월 검색량</th><th>CPC</th><th>메모</th><th></th></tr></thead><tbody>${rows.map(r =>
      `<tr><td><b>${esc(r.keyword)}</b></td><td><span class="chip ${tone[r.type] || ''}">${esc(r.type || '일반')}</span></td><td class="muted">미연동</td><td class="muted">미연동</td><td>${esc(r.note)}</td><td><button class="btn sm danger" data-del="${esc(r.id)}">삭제</button></td></tr>`).join('')}</tbody></table></div>`;
  }
  return `<div class="lgrid">${rows.map(r => libCard(kind, r)).join('')}</div>`;
}
function viewLib(kind) {
  const L = LIBV[kind]; const n = S.lib[kind].length;
  const ctrl = ([k, l, ph]) => k === 'type'
    ? `<label class="field"><span class="lbl">${l}</span><select class="in" name="type">${KEYWORD_TYPES.map(x => `<option>${x}</option>`).join('')}</select></label>`
    : `<label class="field"><span class="lbl">${l}${L.fields.find(f => f[0] === k)[3] ? '<span class="req">*</span>' : ''}</span><input class="in" name="${k}" placeholder="${esc(ph)}" maxlength="300" ${k === 'url' ? 'type="url"' : ''}></label>`;
  $('#view').innerHTML = `${heroHtml(L.icon, L.title, L.desc)}
    ${kind === 'keywords' ? `<div class="note info" style="margin-bottom:14px">Google Ads 키워드 플래너·Search Console·네이버 검색광고 같은 키워드 도구 연동은 아직 준비 중입니다. 지금은 키워드를 직접 등록해 모아 보고, 월 검색량과 CPC는 연동 후에 채워집니다.</div>` : ''}
    <form class="card pad" id="libform" autocomplete="off"><div class="libform">${L.fields.map(ctrl).join('')}<button class="btn pri" type="submit">${ICONS.plus.replace('<svg', '<svg width="16" height="16"')} ${L.add}</button></div></form>
    <div class="row" style="margin-top:18px"><b>${n}개</b>${kind === 'keywords' ? KEYWORD_TYPES.map(t => `<span class="chip">${t} ${S.lib.keywords.filter(r => r.type === t).length}</span>`).join('') : ''}<span class="spacer"></span>
      <input class="in" id="lq" placeholder="검색" style="max-width:240px"></div>
    <div id="llist">${libList(kind)}</div>`;
  const bindDel = () => $('#llist').querySelectorAll('[data-del]').forEach(b => b.onclick = guard(async () => { await libChange(kind, 'delete', { id: b.dataset.del }); viewLib(kind); renderSide(); }));
  bindDel();
  $('#lq').oninput = e => { $('#llist').innerHTML = libList(kind, e.target.value); bindDel(); };
  $('#libform').onsubmit = guard(async e => {
    e.preventDefault();
    const item = {}; L.fields.forEach(([k]) => { item[k] = e.target.querySelector(`[name=${k}]`).value; });
    await libChange(kind, 'add', { item }); toast('저장했습니다.', 'ok'); viewLib(kind);
  });
}
function refPanel() {
  const refs = S.lib.references.slice(0, 6), comps = S.lib.competitors.slice(0, 6);
  const item = (a, b, u) => `<div class="rp-i"><b>${esc(a)}</b>${b ? `<span class="chip">${esc(b)}</span>` : ''}${linkHtml(u)}</div>`;
  const total = S.lib.references.length + S.lib.competitors.length;
  return `<details class="card refpanel" ${total ? 'open' : ''}><summary>참고 레퍼런스 · 경쟁사 <span class="chip">${total}</span></summary><div class="rp-b">
    ${refs.map(r => item(r.title, r.board || r.brand, r.url)).join('')}${comps.map(r => item(r.brand, r.channel || '경쟁사', r.url)).join('')}
    ${total ? '' : '<span class="muted">저장된 자료가 없어요. 기획 탭의 레퍼런스 보드와 브랜드 아카이브에서 추가하세요.</span>'}
    <div class="row"><button type="button" class="btn sm" data-golib="references">레퍼런스 보드</button><button type="button" class="btn sm" data-golib="competitors">브랜드 아카이브</button></div></div></details>`;
}
function viewAdStudio() {
  const pool = [...S.lib.references.map(r => ({ id: r.id, t: r.title, u: r.url })), ...S.lib.competitors.map(r => ({ id: r.id, t: r.brand + ' (경쟁사)', u: r.url }))];
  S.pick = S.pick || new Set();
  const cl = S.st.clients.find(c => c.id === S.st.active);
  const kws = S.lib.keywords.filter(k => k.type === '브랜드');
  $('#view').innerHTML = `${heroHtml('magic', 'AI 광고 제작', SUBDESC.adstudio)}
    <div class="steps3">
      <div class="card"><span class="n">1</span><b>레퍼런스 선택</b>
        ${pool.length ? pool.map(p => `<label class="pick"><input type="checkbox" data-pick="${esc(p.id)}" ${S.pick.has(p.id) ? 'checked' : ''}><span>${esc(p.t)}</span></label>`).join('') : '<span class="muted">저장된 자료가 없어요. 레퍼런스 보드에서 먼저 추가하세요.</span>'}
        <button class="btn sm" data-golib="references">레퍼런스 보드 열기</button></div>
      <div class="card"><span class="n">2</span><b>브랜드 정보</b>
        <span class="muted">${esc(cl?.name || S.st.active)}의 브랜드 규칙과 활성 피드백은 AI가 어카운트 폴더에서 직접 읽습니다.</span>
        <div class="row">${kws.length ? kws.map(k => `<span class="chip ok">${esc(k.keyword)}</span>`).join('') : '<span class="muted">등록된 브랜드 키워드 없음</span>'}</div></div>
      <div class="card"><span class="n">3</span><b>제작 시작</b>
        <span class="muted">만들 종류를 고르면 해당 화면으로 이동합니다. 선택한 레퍼런스는 요약을 복사해 AI에게 보내는 답장 칸에 붙여 넣을 수 있습니다.</span>
        <div class="row"><button class="btn pri" id="mkCopy">카피 3안</button><button class="btn" id="mkVideo">영상 기획</button><button class="btn" id="mkCopyRef">선택 요약 복사</button></div></div>
    </div>`;
  $('#view').querySelectorAll('[data-pick]').forEach(c => c.onchange = () => c.checked ? S.pick.add(c.dataset.pick) : S.pick.delete(c.dataset.pick));
  $('#view').querySelectorAll('[data-golib]').forEach(b => b.onclick = () => goSub('', b.dataset.golib));
  $('#mkCopy').onclick = () => goSub('copy', 'copy');
  $('#mkVideo').onclick = () => goSub('film', 'video');
  $('#mkCopyRef').onclick = () => {
    const sel = pool.filter(p => S.pick.has(p.id));
    if (!sel.length) return toast('선택한 레퍼런스가 없어요.', 'bad');
    navigator.clipboard.writeText('참고 레퍼런스:\n' + sel.map(p => `- ${p.t}${p.u ? ' ' + p.u : ''}`).join('\n')).then(() => toast('복사했습니다.', 'ok'), () => toast('복사하지 못했습니다.', 'bad'));
  };
}
function viewPdp() {
  $('#view').innerHTML = `${heroHtml('page', '상세페이지', SUBDESC.pdp)}${refPanel()}
    <div class="card pad"><b>상세페이지 카피 만들기</b>
      <p class="muted">카피 3안 화면으로 이동해 상세페이지 채널로 실행합니다. 채널 규격이 확인되지 않은 경우 길이 검수는 판정하지 않습니다.</p>
      <button class="btn pri" id="pdpGo">상세페이지 카피 시작</button></div>`;
  $('#view').querySelectorAll('[data-golib]').forEach(b => b.onclick = () => goSub('', b.dataset.golib));
  $('#pdpGo').onclick = () => {
    const f = S.form.copy = S.form.copy || {};
    const hit = S.st.channels.find(c => /detail|상세|pdp/i.test(c.id));
    if (hit) f.channel = hit.id; else { f.channel = '__custom'; f.channel_custom = 'detail-page'; }
    goSub('copy', 'copy');
  };
}

/* ---------- 광고 ---------- */
/* 계정 연동(OAuth)·API 수집은 아직 없다. 연동 전에는 data/raw 의 CSV·XLSX 를 /report 로 분석한다. */
/* ---------- Performance · Media Report (설계서 §8) ---------- */
/* 수치는 서버가 data/raw 의 CSV·XLSX 를 ad_report.py 의 함수로 계산한 값만 쓴다. 이 화면은 광고 집행·예산 변경을 하지 않는다. */
const fmtN = n => n == null ? '—' : Number(n).toLocaleString('ko-KR', { maximumFractionDigits: 0 });
const fmtMoney = n => n == null ? '—' : `${fmtN(n)}원`;
const fmtPct = n => n == null ? '—' : `${Number(n).toFixed(2)}%`;
const RANGES = [[7, '최근 7일'], [30, '1개월'], [90, '3개월'], [180, '6개월']];
const MEDIA_CLS = { 'google-ads': 'm1', meta: 'm2', other: 'm3', 'google-analytics': 'm3' };
const METRIC_OPTS = [['cost', '집행 금액'], ['impressions', '노출'], ['clicks', '클릭'], ['conversions', '전환']];
function deltaText(D, k) {
  const d = D && D[k]; if (!d || d.value == null) return '';
  const v = Number(d.value); return `${v > 0 ? '+' : ''}${v.toFixed(1)}${d.unit}`;
}
async function loadPerfWeek() {
  const [w0] = (S.acc && S.acc.week) || [S.st.today];
  try { S.perfWk = await api(`/api/performance?start=${w0}&end=${S.st.today}`); } catch { S.perfWk = null; }
}
async function loadPerf() {
  const P = S.perf = S.perf || { days: 7, off: [], grain: 'day', metric: 'cost' };
  try { S.perfData = await api(`/api/performance?days=${P.days}&off=${encodeURIComponent(P.off.join(','))}`); } catch (e) { S.perfData = null; toast(e.message, 'bad'); }
}
function lineChart(D, P) {
  const g = D.series[P.grain], keys = g.keys, medias = Object.keys(g.by);
  if (!keys.length) return `<div class="chart-empty"><b>아직 데이터가 없어요</b><span>플랫폼에서 내려받은 CSV·XLSX를 data/raw에 넣으면 추이가 표시됩니다.</span></div>`;
  const W = 800, H = 240, L = 64, R = 14, T = 12, B = 30, pw = W - L - R, ph = H - T - B;
  const val = (m, k) => (g.by[m][k] || {})[P.metric];
  const max = Math.max(1, ...medias.flatMap(m => keys.map(k => val(m, k) || 0)));
  const step = Math.pow(10, Math.floor(Math.log10(max))), top = Math.ceil(max / step) * step;
  const x = i => L + (keys.length === 1 ? pw / 2 : i / (keys.length - 1) * pw), y = v => T + ph - v / top * ph;
  const lbl = k => P.grain === 'month' ? k.slice(2) : k.slice(5).replace('-', '.');
  const ticks = [0, 1, 2, 3, 4].map(i => top / 4 * i);
  const xs = keys.map((k, i) => [k, i]).filter(([, i]) => keys.length <= 7 || i % Math.ceil(keys.length / 6) === 0 || i === keys.length - 1);
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(METRIC_OPTS.find(m => m[0] === P.metric)[1])} 추이"><g>${ticks.map(t => `<line x1="${L}" x2="${W - R}" y1="${y(t)}" y2="${y(t)}" class="gl ${t === 0 ? 'base' : ''}"/><text x="${L - 8}" y="${y(t) + 4}" class="ax" text-anchor="end">${fmtN(t)}</text>`).join('')}
    ${xs.map(([k, i]) => `<text x="${x(i)}" y="${H - 8}" class="ax" text-anchor="middle">${lbl(k)}</text>`).join('')}
    ${medias.map(m => { const pts = keys.map((k, i) => [i, val(m, k)]).filter(p => p[1] != null);
      return `<g class="ln ${MEDIA_CLS[m] || 'm3'}"><polyline fill="none" points="${pts.map(([i, v]) => `${x(i)},${y(v)}`).join(' ')}"/>${pts.map(([i, v]) => `<circle cx="${x(i)}" cy="${y(v)}" r="3"><title>${esc(MEDIA_LABEL_JS(m))} · ${esc(keys[i])} · ${fmtN(v)}</title></circle>`).join('')}</g>`; }).join('')}</g></svg>`;
}
const MEDIA_LABEL_JS = m => ({ 'google-ads': 'Google Ads', meta: 'Meta 광고', 'google-analytics': 'Google Analytics' }[m] || '기타 채널');
async function viewMedia() {
  const P = S.perf = S.perf || { days: 7, off: [], grain: 'day', metric: 'cost' };
  await loadPerf(); if (S.view !== 'ads-overview') return;
  const D = S.perfData; if (!D) { $('#view').innerHTML = '<div class="empty"><b>성과 데이터를 불러오지 못했어요</b>잠시 후 다시 시도하세요.</div>'; return; }
  const noRows = !D.has_rows, T = D.totals, M = D.metrics, why = !D.has_files ? '연동 또는 CSV 필요' : '이 기간 데이터 없음';
  const kpi = (ko, v, k, basis) => `<div class="kpi k4"><span class="ko">${ko}</span><b>${noRows ? '—' : v}</b><small>${noRows ? (D.data_range && D.has_files ? `${why} · 데이터 ${mdShort(D.data_range[0])}~${mdShort(D.data_range[1])}` : why) : (deltaText(D.deltas, k) ? `전 기간 대비 ${deltaText(D.deltas, k)}` : basis)}</small></div>`;
  const mediaCards = D.media.filter(m => ['google-ads', 'google-analytics', 'meta'].includes(m.id) || m.present).map(m => {
    const info = PLATFORMS.find(p => p.id === m.id);
    return `<section class="mcard"><div class="rc-h"><span class="rcode">${esc(info ? info.mark : '·')}</span><div class="rc-n"><b>${esc(m.label)}</b><small>${info ? esc(info.about) : '기타 채널 데이터'}</small></div>
      <span class="stchip ${m.present ? 'ok' : ''}">${m.present ? '데이터 있음' : '미연동'}</span></div>
      ${m.present ? `<div class="a-met two"><div><small>집행 금액</small><b>${fmtMoney(m.cost)}</b></div><div><small>클릭</small><b>${fmtN(m.clicks)}</b></div></div>` : `<small class="muted">계정 연동은 준비 중입니다. 지금은 ${esc(m.label)}에서 내려받은 파일을 data/raw 에 넣으면 분석됩니다.</small>`}
      <div class="rc-f"><span class="spacer"></span><button class="lnk acc" data-detail="${esc(m.id)}">상세 보기 ›</button></div></section>`; }).join('');
  const toggles = D.media.filter(m => ['google-ads', 'google-analytics', 'meta'].includes(m.id) || m.present).map(m => {
    const on = m.present && !P.off.includes(m.id);
    return `<span class="tg"><span>${esc(m.id === 'google-analytics' ? 'GA' : m.id === 'meta' ? 'Meta' : m.label)}</span><button class="sw" role="switch" aria-checked="${on}" aria-label="${esc(m.label)} ${on ? '끄기' : '켜기'}" data-sw="${esc(m.id)}" ${m.present ? '' : 'disabled title="미연동"'}></button></span>`; }).join('');
  const legend = Object.keys(D.series[P.grain].by).map(m => `<span class="lg"><i class="${MEDIA_CLS[m] || 'm3'}"></i>${esc(MEDIA_LABEL_JS(m))}</span>`).join('');
  $('#view').innerHTML = `<div class="stack perf">
    <section class="card cond" aria-label="조회 조건"><div class="cond-r"><span class="range">${mdShort(D.period.start)} ~ ${mdShort(D.period.end)}</span>
      <div class="seg" role="group" aria-label="기간">${RANGES.map(([d, l]) => `<button class="seg-b" data-days="${d}" aria-pressed="${P.days === d}">${l}</button>`).join('')}</div><span class="vsep"></span>${toggles}
      <span class="spacer"></span><button class="lnk" id="pReset">초기화</button><button class="btn pri" id="pCsv">CSV 불러오기</button><input type="file" id="pFile" accept=".csv,.xlsx,.xlsm" hidden></div></section>
    <div class="kpis5">${kpi('노출', fmtN(T.impressions), 'impressions', '기간 합계')}${kpi('클릭', fmtN(T.clicks), 'clicks', '기간 합계')}${kpi('CTR', fmtPct(M.ctr), 'ctr', '클릭 ÷ 노출')}${kpi('전환', fmtN(T.conversions), 'conversions', '기간 합계')}${kpi('집행 금액', fmtMoney(T.cost), 'cost', '기간 합계')}</div>
    <section class="card pad"><div class="p3h"><h2>Daily Trend</h2><span class="spacer"></span>
      <select class="in sm" id="pMetric" aria-label="지표" style="width:auto">${METRIC_OPTS.map(([k, l]) => `<option value="${k}" ${P.metric === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
      <div class="seg" role="group" aria-label="단위">${[['day', '일별'], ['week', '주별'], ['month', '월별']].map(([k, l]) => `<button class="seg-b" data-grain="${k}" aria-pressed="${P.grain === k}">${l}</button>`).join('')}</div></div>
      ${lineChart(D, P)}<div class="legend">${legend}</div></section>
    <div class="rgrid">${mediaCards}</div>
    ${D.errors.length ? `<div class="note bad">읽지 못한 파일: ${D.errors.map(e => `${esc(e.file)} (${esc(e.error)})`).join(' · ')}</div>` : ''}
    <small class="muted">수치는 스크립트 계산값만 씁니다. 이 화면은 광고 집행·예산 변경을 하지 않습니다.${D.has_files ? ` 분석 파일 ${D.files.length}개 · 제외된 행 ${D.excluded_count}개` : ''}</small></div>
    <button class="handle" id="pHandle" aria-label="상세 보기">‹ 상세 보기</button>`;
  const v = $('#view');
  v.querySelectorAll('[data-days]').forEach(b => b.onclick = () => { P.days = +b.dataset.days; viewMedia(); });
  v.querySelectorAll('[data-grain]').forEach(b => b.onclick = () => { P.grain = b.dataset.grain; viewMedia(); });
  v.querySelectorAll('[data-sw]').forEach(b => b.onclick = () => { const id = b.dataset.sw; P.off = P.off.includes(id) ? P.off.filter(x => x !== id) : [...P.off, id]; viewMedia(); });
  $('#pMetric').onchange = e => { P.metric = e.target.value; viewMedia(); };
  $('#pReset').onclick = () => { S.perf = null; viewMedia(); };
  v.querySelectorAll('[data-detail]').forEach(b => b.onclick = () => openDetail(b.dataset.detail));
  $('#pHandle').onclick = () => openDetail('');
  $('#pCsv').onclick = () => $('#pFile').click();
  $('#pFile').onchange = guard(async e => {
    const f = e.target.files[0]; if (!f) return;
    const buf = new Uint8Array(await f.arrayBuffer()); let bin = ''; buf.forEach(b => { bin += String.fromCharCode(b); });
    const r = await api('/api/raw-upload', { name: f.name, data: btoa(bin) });
    toast(`${r.name} 을(를) 불러왔습니다 (${r.rows}행${r.excluded ? `, 제외 ${r.excluded}행` : ''}).`, 'ok');
    await loadWorkspaceInputs(); viewMedia();
  });
}
async function loadWorkspaceInputs() { S.ws = await api('/api/workspace'); }
function openDetail(media) { S.detail = media === '' ? 'ALL' : media; renderDetail(); const c = $('#detail .close'); if (c) c.focus(); }
function closeDetail() { S.detail = null; renderDetail(); }
function renderDetail() {
  const el = $('#detail'), id = S.detail, D = S.perfData;
  if (!id || !D) { el.hidden = true; el.innerHTML = ''; return; }
  const rows = D.campaigns.filter(c => id === 'ALL' || c.media === id), label = id === 'ALL' ? '전체 매체' : MEDIA_LABEL_JS(id);
  const info = PLATFORMS.find(p => p.id === id);
  el.hidden = false;
  el.innerHTML = `<div class="dr-h"><b id="dtTitle">${esc(label)} · 상세</b><button class="btn icon close" aria-label="패널 닫기">✕</button></div>
    <div class="dr-b">${rows.length ? `<div class="tbl"><div class="tbl-in"><div class="tr th dt"><span>캠페인</span><span>노출</span><span>클릭</span><span>CTR</span><span>집행 금액</span><span>전환</span><span>CPC</span><span>CPA</span></div>
      ${rows.map(c => `<div class="tr dt"><span><b>${esc(c.campaign)}</b><br><small>${esc(c.channel)}</small></span><span>${fmtN(c.totals.impressions)}</span><span>${fmtN(c.totals.clicks)}</span><span>${fmtPct(c.metrics.ctr)}</span><span>${fmtMoney(c.totals.cost)}</span><span>${fmtN(c.totals.conversions)}</span><span>${c.metrics.cpc == null ? '—' : fmtMoney(c.metrics.cpc)}</span><span>${c.metrics.cpa == null ? '—' : fmtMoney(c.metrics.cpa)}</span></div>`).join('')}</div></div>`
      : `<div class="empty"><b>${esc(label)} 데이터가 없어요</b>${info ? `연동 후 가져올 지표: ${info.metrics.map(esc).join(' · ')}` : '이 기간에 해당하는 행이 없습니다.'}</div>`}
      <div><div class="sec-t" style="margin:6px 0 8px">데이터 확인 사항</div><ul class="notes">${D.warnings.map(w => `<li>${esc(w)}</li>`).join('') || '<li>없음</li>'}${D.limitations.map(w => `<li>${esc(w)}</li>`).join('')}
        ${D.excluded_count ? `<li>제외·표시된 행 ${D.excluded_count}개: ${D.excluded.slice(0, 5).map(x => `${esc(x.file)} ${x.row}행 [${esc(x.type)}]`).join(', ')}</li>` : ''}</ul></div></div>
    <small class="muted">CVR 분모는 클릭입니다. 수치는 data/raw 파일을 ad_report 로 계산한 값입니다.</small>`;
  el.querySelector('.close').onclick = closeDetail;
}
document.addEventListener('keydown', e => { if (e.key === 'Escape' && S.detail && $('#modal').hidden) closeDetail(); });

/* ---------- Performance · Content Performance ---------- */
function viewContentPerf() {
  const posts = S.lib.events.filter(e => e.type === '콘텐츠' && e.link).sort(evSort);
  const cols = 'grid-template-columns:100px 100px 1fr 130px 130px';
  $('#view').innerHTML = `<div class="stack"><div class="tbl"><div class="tbl-in" style="min-width:760px"><div class="tr th" style="${cols}"><span>포스팅일</span><span>채널</span><span>콘텐츠</span><span>링크</span><span>성과</span></div>
    ${posts.length ? posts.map(e => `<div class="tr" style="${cols}"><span class="muted">${wd(e.date)}</span><span>${esc(e.channel || '—')}</span><b>${esc(e.title)}${e.sample ? ' <span class="tag">예시</span>' : ''}</b><a href="${esc(e.link)}" target="_blank" rel="noopener noreferrer" class="ok-t">링크 열기</a><span class="muted">매체 연동 후 수집</span></div>`).join('')
      : '<div class="empty"><b>수집할 콘텐츠가 없어요</b>Account 탭의 Content Calendar에서 포스팅 링크를 등록하면 여기에 모입니다.</div>'}</div></div>
    <small class="muted">링크를 등록한 콘텐츠만 성과 수집 대상입니다. 조회·반응 같은 수치는 매체 연동 전까지 비어 있으며, 지어내지 않습니다.</small></div>`;
}

/* ---------- 시작 화면 ---------- */
const brandHue = id => { let h = 0; for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 360; return h; };
const brandColor = id => `hsl(${brandHue(id)} 58% 52%)`;
async function pickClient(id, then) {
  await api('/api/session', { client: id });
    S.run = null; S.jobId = null; await refresh(); then();
}
const isoAdd = (iso, n) => { const d = new Date(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10) + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const dayDiff = (a, b) => Math.round((new Date(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10)) - new Date(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10))) / 864e5);
/* Calendar(레일): 전 어카운트 일정을 읽기 전용으로 모아 본다. 주간 보기가 기본이고 월간으로 바꿀 수 있다.
   일정 추가·체크는 어카운트를 연 뒤 그 어카운트의 Content Calendar에서 한다. */
const mondayOf = iso => isoAdd(iso, -((new Date(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)).getDay() + 6) % 7));
function calState() { const t = S.st.today; return S.hcal = S.hcal || { mode: 'week', wk: mondayOf(t), y: +t.slice(0, 4), m: +t.slice(5, 7), sel: t, only: '', role: '' }; }
function calHtml() {
  const H = calState(), today = S.st.today, pad = n => String(n).padStart(2, '0'), brands = S.st.clients;
  const evs = (S.allEv || []).filter(e => (!H.only || e.client === H.only) && (!H.role || e.role === H.role));
  const late = e => !e.done && e.type === '콘텐츠' && e.date < today;
  const sort = (a, b) => a.date.localeCompare(b.date) || a.brand.localeCompare(b.brand) || a.title.localeCompare(b.title);
  const nm = e => e.brand.split(' (')[0];
  const item = e => `<button class="wk-i evb" data-open="${esc(e.client)}" data-date="${esc(e.date)}"><span class="row" style="gap:6px"><span class="rcode s">${esc(e.role || '—')}</span><span class="bdot" style="background:${brandColor(e.client)}"></span><small>${esc(nm(e))}</small></span><span>${e.done ? '✓ ' : ''}${esc(e.title)}${e.sample ? ' <span class="tag">예시</span>' : ''}</span>${late(e) ? '<small class="late-t">딜레이 · 포스팅 미확인</small>' : ''}</button>`;
  let title, body;
  if (H.mode === 'week') {
    const days = [...Array(7)].map((_, i) => isoAdd(H.wk, i));
    title = `${mdShort(days[0])} ~ ${mdShort(days[6])}`;
    body = `<div class="wk-scroll"><div class="wk">${days.map(d => `<div class="wk-d ${d === today ? 'today' : ''}"><b>${dayLabel(d)}</b>${evs.filter(e => e.date === d).sort(sort).map(item).join('')}</div>`).join('')}</div></div>`;
  } else {
    title = `${H.y}년 ${H.m}월`;
    const key = d => `${H.y}-${pad(H.m)}-${pad(d)}`, lead = new Date(H.y, H.m - 1, 1).getDay(), dn = new Date(H.y, H.m, 0).getDate();
    const by = {}; evs.forEach(e => (by[e.date] = by[e.date] || []).push(e));
    let cells = '<span class="cal-d off"></span>'.repeat(lead);
    for (let d = 1; d <= dn; d++) {
      const k = key(d), list = (by[k] || []).slice().sort(sort);
      cells += `<button class="cal-d ${k === today ? 'today' : ''} ${k === H.sel ? 'sel' : ''}" data-d="${k}"><span class="dn">${d}</span>${list.slice(0, 3).map(e => `<span class="ev ${late(e) ? 'late' : ''}" style="--tc:${brandColor(e.client)}" ${e.done ? 'data-done' : ''} title="${esc(nm(e))}">${e.done ? '✓ ' : ''}${esc(nm(e))} · ${esc(e.title)}</span>`).join('')}${list.length > 3 ? `<span class="more">+${list.length - 3}</span>` : ''}</button>`;
    }
    const day = (by[H.sel] || []).slice().sort(sort);
    body = `<div class="cal card"><div class="cal-w">${WEEKDAY.map(w => `<span>${w}</span>`).join('')}</div><div class="cal-g">${cells}</div></div>
      <div class="card pad"><div class="sec-t" style="margin:0 0 10px">${esc(dayLabel(H.sel))} 일정 <span class="chip">${day.length}</span></div><div class="wk-day">${day.length ? day.map(item).join('') : '<span class="muted">이 날짜에 일정이 없어요.</span>'}</div></div>`;
  }
  return `<div class="home-cal"><div class="calbar"><button class="btn sm" id="hPrev" aria-label="이전">${ICONS.back}</button><b class="mth">${title}</b><button class="btn sm next" id="hNext" aria-label="다음">${ICONS.back}</button><button class="btn sm" id="hToday">오늘</button>
      <div class="seg" role="group" aria-label="보기"><button class="seg-b" data-mode="week" aria-pressed="${H.mode === 'week'}">주간</button><button class="seg-b" data-mode="month" aria-pressed="${H.mode === 'month'}">월간</button></div><span class="spacer"></span>
      <select class="in sm" id="hAcc" aria-label="어카운트 필터" style="width:auto"><option value="">전체 어카운트</option>${brands.map(c => `<option value="${esc(c.id)}" ${H.only === c.id ? 'selected' : ''}>${esc(c.name.split(' (')[0])}</option>`).join('')}</select>
      <select class="in sm" id="hRole" aria-label="역할 필터" style="width:auto"><option value="">전체 역할</option>${ROLE_CARDS.map(r => `<option value="${r.code}" ${H.role === r.code ? 'selected' : ''}>${r.code} · ${r.ko}</option>`).join('')}</select></div>
    ${body}<p class="hint muted" style="font-size:12.5px;margin:6px 2px 0">모아 보기 전용이에요. 일정을 누르면 그 어카운트의 Content Calendar로 가요. 이 화면은 포스팅을 실행하지 않습니다.</p></div>`;
}
function bindCal() {
  const H = calState(), v = $('#view'), redraw = () => { v.querySelector('.home-cal').outerHTML = calHtml(); bindCal(); };
  const nav = d => { if (H.mode === 'week') H.wk = isoAdd(H.wk, 7 * d); else { H.m += d; if (H.m < 1) { H.m = 12; H.y--; } if (H.m > 12) { H.m = 1; H.y++; } } redraw(); };
  $('#hPrev').onclick = () => nav(-1); $('#hNext').onclick = () => nav(1);
  $('#hToday').onclick = () => { const t = S.st.today; Object.assign(H, { wk: mondayOf(t), y: +t.slice(0, 4), m: +t.slice(5, 7), sel: t }); redraw(); };
  v.querySelectorAll('.home-cal [data-mode]').forEach(b => b.onclick = () => { H.mode = b.dataset.mode; redraw(); });
  $('#hAcc').onchange = e => { H.only = e.target.value; redraw(); };
  $('#hRole').onchange = e => { H.role = e.target.value; redraw(); };
  v.querySelectorAll('.home-cal [data-d]').forEach(b => b.onclick = () => { H.sel = b.dataset.d; redraw(); });
  v.querySelectorAll('.home-cal [data-open]').forEach(b => b.onclick = guard(async () => {
    const d = b.dataset.date; S.cal = { y: +d.slice(0, 4), m: +d.slice(5, 7), sel: d }; S.calMode = 'cal';
    const go2 = () => goSub('account', 'cal');
    if (S.st.active === b.dataset.open) go2(); else if (S.st.active) switchClientModal(b.dataset.open); else await pickClient(b.dataset.open, go2);
  }));
}
const monoColor = id => `hsl(${brandHue(id)} 50% 38%)`;
const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토'];
const dayLabel = iso => `${WEEKDAY[new Date(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)).getDay()]} ${iso.slice(5, 7)}.${iso.slice(8, 10)}`;
const PHASES = ['Brief', 'Concept', 'Production', 'Review', 'Confirm', 'Report'];
const STATUS_CLS = { 'On Track': 'ok', 'At Risk': 'warn', 'Delayed': 'late', 'Onboarding': 'info' };
async function loadAccounts() {
  try { S.acc = await api('/api/accounts'); S.allEv = S.acc.events; } catch (e) { S.acc = { accounts: [], events: [], week: ['', ''] }; S.allEv = []; toast(e.message, 'bad'); }
}
const pageHead = (title, desc, search) => `<header class="ph"><div class="ph-t"><span class="eyebrow"><img src="/assets/logo.svg" alt="" width="18" height="18"> MASTER MARKETER</span>
  <div class="ph-row"><h1>${esc(title)}</h1><span class="muted">${esc(desc)}</span></div></div>
  <div class="ph-act">${search ? '<label class="sr" for="accSearch">어카운트 검색</label><input class="in" id="accSearch" type="search" placeholder="어카운트 검색" autocomplete="off">' : ''}
    <button class="btn" data-theme-toggle2>${document.documentElement.dataset.theme === 'dark' ? '라이트 모드' : '다크 모드'}</button>
    <button class="btn pri" data-new-acc>+ New Account</button></div></header>`;
function bindHead() {
  const v = $('#view'), t = v.querySelector('[data-theme-toggle2]'); if (t) t.onclick = toggleTheme;
  const n = v.querySelector('[data-new-acc]'); if (n) n.onclick = newAccountModal;
  const n3 = v.querySelector('[data-new-acc3]'); if (n3) n3.onclick = newAccountModal;
}
function accountCard(a) {
  const post = a.post_total ? `${a.post_done}/${a.post_total}` : '—';
  const m = [['컨펌 대기', a.pending], ['딜레이', a.overdue], ['이번 주 포스팅', post]];
  return `<button class="acard" data-acc="${esc(a.id)}">
    <div class="a-top"><span class="mono" style="background:${monoColor(a.id)}">${esc(a.name[0])}</span>
      <div class="a-name"><b>${esc(a.name)}</b><small>${esc(a.note || a.id)}</small></div>
      <span class="stchip ${STATUS_CLS[a.status]}"><i></i>${esc(a.status)}</span></div>
    <div><div class="a-phase"><span>Phase · <b>${esc(a.phase)}</b></span><span>${a.phase_no} / 6</span></div>
      <div class="bar"><div style="width:${Math.round(a.phase_no / 6 * 100)}%"></div></div></div>
    <div class="a-met">${m.map(([l, v]) => `<div><small>${l}</small><b class="${l === '딜레이' && v ? 'late' : ''}">${esc(v)}</b></div>`).join('')}</div>
    <div class="a-team"><small>Team</small>${ROLE_CODES.map(c => a.team[c] ? `<span class="code on" title="${esc(c)} · ${esc(a.team[c])}">${c}</span>` : `<span class="code" title="${c} · 미배정">${c}</span>`).join('')}</div>
    <div class="a-next"><small>Next</small><span>${a.next ? `${esc(a.next.date.slice(5).replace('-', '.'))} ${esc(a.next.title)}` : '<span class="muted">예정된 일정 없음</span>'}</span><em>Open ›</em></div></button>`;
}
async function viewAccounts() {
  await loadAccounts(); if (S.view !== 'welcome') return;
  const A = S.acc, acc = A.accounts, F = S.accFilter = S.accFilter || { st: 'All', q: '' };
  const today = S.st.today, [w0, w1] = A.week;
  const cnt = st => acc.filter(a => a.status === st).length;
  const sum = k => acc.reduce((n, a) => n + a[k], 0);
  const pend = sum('pending'), over = sum('overdue'), pd = sum('post_done'), pt = sum('post_total');
  const E = acc.length === 0;
  const kpis0 = [
    ['ACTIVE ACCOUNTS', '운영 어카운트', acc.length, '등록된 어카운트 기준', ''],
    ['PENDING CONFIRM', '컨펌 대기', pend, pend ? acc.filter(a => a.pending).map(a => `${a.name} ${a.pending}`).join(' · ') : '컨펌 대기 없음', 'acc'],
    ['OVERDUE', '딜레이', over, over ? `클라이언트 리퀘스트 ${sum('overdue_req')} · 포스팅 ${sum('overdue_posts')}` : '딜레이 없음', over ? 'late' : ''],
    ['POSTING', '이번 주 포스팅', pt ? `${pd} / ${pt}` : '—', pt ? '포스팅 완료 / 예정' : '이번 주 예정 없음', ''],
    ['AD SPEND', '이번 달 집행 금액', acc.some(a => a.month_cost != null) ? fmtMoney(acc.reduce((n, a) => n + (a.month_cost || 0), 0)) : '—', acc.some(a => a.month_cost != null) ? 'data/raw 파일 기준' : '매체 연동 후 표시', ''],
  ];
  const kpis = E ? kpis0.map(k => [k[0], k[1], '—', '어카운트를 만들면 표시돼요', '']) : kpis0;
  const chips = ['All', 'On Track', 'At Risk', 'Delayed', 'Onboarding'].filter(st => st !== 'Delayed' || cnt('Delayed'))
    .map(st => `<button class="fchip" data-st="${st}" aria-pressed="${F.st === st}">${st} ${st === 'All' ? acc.length : cnt(st)}</button>`).join('');
  const week = A.events.filter(e => e.date >= w0 && e.date <= w1).sort((a, b) => a.date.localeCompare(b.date) || a.brand.localeCompare(b.brand));
  $('#view').innerHTML = `<div class="accounts-page">${pageHead('All Accounts', '운영 중인 어카운트와 팀 현황을 한눈에 봅니다.', true)}
    <div class="kpis">${kpis.map(([en, ko, v, sub, cls]) => `<div class="kpi"><span class="en">${en}</span><span class="ko">${ko}</span><b class="${cls}">${esc(v)}</b><small>${esc(sub)}</small></div>`).join('')}</div>
    ${E ? `<div class="card pad empty-acc"><b>아직 어카운트가 없어요</b><p>+ New Account 로 첫 어카운트를 만들면, Overview에서 "처음 시작하기" 순서를 안내해 드려요.</p><button class="btn pri" data-new-acc3>+ New Account</button></div>`
      : `<div class="fbar"><h2>Accounts</h2>${chips}</div><div class="agrid" id="agrid"></div>`}
    ${E ? '' : `<div class="linkrow"><button class="lnk acc" data-to-cal>이번 주 일정 ${week.length}건 ›</button><button class="lnk acc" data-to-team>팀 작업량 ›</button></div>`}</div>`;
  bindHead();
  const lc = $('#view').querySelector('[data-to-cal]'); if (lc) lc.onclick = () => go('calendar');
  const lt = $('#view').querySelector('[data-to-team]'); if (lt) lt.onclick = () => go('team');
  const paint = () => {
    if (!$('#agrid')) return;
    const q = F.q.trim().toLowerCase();
    const list = acc.filter(a => (F.st === 'All' || a.status === F.st) && (!q || (a.name + a.id + a.note).toLowerCase().includes(q)));
    $('#agrid').innerHTML = list.map(accountCard).join('') + `<button class="acard add" data-new-acc2><span>+</span><b>New Account</b><small>브리프와 팀 구성을 함께 설정합니다</small></button>`;
    $('#agrid').querySelectorAll('[data-acc]').forEach(b => b.onclick = () => chooseClient(b.dataset.acc));
    $('#agrid').querySelector('[data-new-acc2]').onclick = newAccountModal;
  };
  paint();
  const si = $('#accSearch'); si.value = F.q; si.oninput = () => { F.q = si.value; paint(); };
  $('#view').querySelectorAll('[data-st]').forEach(b => b.onclick = () => { F.st = b.dataset.st; viewAccounts(); });
}
/* ---------- Team(레일): 사람 기준 화면. 배정을 바꾸면 각 어카운트 ⋯의 담당자 배정과 같은 team.json 이 바뀐다 ---------- */
async function viewTeam() {
  await loadAccounts(); if (S.view !== 'team') return;
  const acc = S.acc.accounts, total = acc.length * ROLE_CODES.length, roleKo = Object.fromEntries(ROLE_CARDS.map(r => [r.code, r.ko]));
  const filled = () => S.acc.accounts.reduce((n, a) => n + Object.keys(a.team || {}).length, 0);
  const people = () => {
    const m = {};
    S.acc.accounts.forEach(a => ROLE_CODES.forEach(c => { const n = (a.team || {})[c]; if (n) (m[n] = m[n] || []).push({ id: a.id, acc: a.name, code: c, work: (a.work || {})[c] || 0 }); }));
    return Object.entries(m).map(([name, list]) => ({ name, list, work: list.reduce((n, x) => n + x.work, 0) })).sort((a, b) => b.work - a.work || b.list.length - a.list.length || a.name.localeCompare(b.name));
  };
  const peopleHtml = () => { const pp = people(); return pp.length ? pp.map(p => `<div class="pp"><div class="row"><b>${esc(p.name)}</b><span class="spacer"></span><span class="chip ${p.work ? 'acc' : ''}">진행 중 작업 ${p.work}</span></div>
      <small class="muted">담당 ${p.list.length}개 · ${p.list.map(x => x.acc).filter((v, i, a) => a.indexOf(v) === i).length}개 어카운트</small>
      <div class="row">${p.list.map(x => `<button class="chip pcc" data-go-acc="${esc(x.id)}" title="${esc(x.acc)}의 ${x.code} (${esc(roleKo[x.code])})">${esc(x.acc)} · ${x.code}${x.work ? ` · ${x.work}` : ''}</button>`).join('')}</div></div>`).join('')
    : '<span class="muted">아직 배정된 팀원이 없어요. 아래 "배정 편집"에 이름을 적으면 여기에 모입니다.</span>'; };
  const loadHtml = () => { const t = ROLE_CODES.map(c => [c, S.acc.accounts.reduce((n, a) => n + ((a.work || {})[c] || 0), 0)]), mx = Math.max(1, ...t.map(x => x[1]));
    return t.map(([c, n]) => `<div class="ldrow"><b>${c}</b><div class="bar"><div style="width:${Math.round(n / mx * 100)}%"></div></div><span>${n}</span></div>`).join(''); };
  $('#view').innerHTML = `<div class="accounts-page">${pageHead('Team', '사람 기준으로 누가 어느 어카운트의 어떤 역할을 맡고, 지금 몇 가지를 진행 중인지 봅니다.', false)}
    ${acc.length ? `<div class="row"><span class="chip ok" id="tmFilled">배정 ${filled()} / ${total}</span><span class="muted" style="font-size:12.5px">진행 중 작업 = 열린 리퀘스트 + 끝나지 않은 일정 + 컨펌 전 결과물(역할을 알 수 있는 것만)</span></div>
    <div class="two"><section class="panel3 wide"><div class="p3h"><h2>팀원별 담당</h2><small>진행 중 작업이 많은 순</small></div><div class="people" id="people">${peopleHtml()}</div></section>
      <section class="panel3"><div class="p3h"><h2>Team Workload</h2><small>역할별 진행 중인 작업</small></div><div id="workload">${loadHtml()}</div><small class="muted">한 역할에 일이 몰리면 막대가 길어져요.</small></section></div>
    <details class="card pad" id="tmEdit" open><summary class="sec-t" style="cursor:pointer;margin:0">배정 편집 <small class="muted" style="font-weight:400">· 이름을 적고 Enter(또는 다른 칸 클릭)를 누르면 저장돼요. 비우면 미배정이에요. 어카운트 ⋯ 메뉴의 담당자 배정과 같은 데이터예요.</small></summary>
      <div class="tbl" style="margin-top:12px"><div class="tbl-in" style="min-width:860px"><div class="tr th" style="grid-template-columns:200px repeat(6,minmax(110px,1fr))"><span>어카운트</span>${ROLE_CODES.map(c => `<span>${c}<br><small>${esc(roleKo[c])}</small></span>`).join('')}</div>
      ${acc.map(a => `<div class="tr" style="grid-template-columns:200px repeat(6,minmax(110px,1fr))"><span class="row"><span class="mono sm" style="background:${monoColor(a.id)}">${esc(a.name[0])}</span><b>${esc(a.name)}</b></span>
        ${ROLE_CODES.map(c => `<span><input class="in sm tm" data-acc="${esc(a.id)}" data-role="${c}" value="${esc((a.team || {})[c] || '')}" placeholder="미배정" maxlength="40" aria-label="${esc(a.name)} ${c} 담당자"></span>`).join('')}</div>`).join('')}</div></div></details>`
    : '<div class="card pad empty-acc"><b>아직 어카운트가 없어요</b><p>어카운트를 만들면 여기서 팀을 배정할 수 있어요.</p><button class="btn pri" data-new-acc3>+ New Account</button></div>'}</div>`;
  bindHead();
  const n3 = $('#view').querySelector('[data-new-acc3]'); if (n3) n3.onclick = newAccountModal;
  const bindChips = () => $('#view').querySelectorAll('[data-go-acc]').forEach(b => b.onclick = () => chooseClient(b.dataset.goAcc));
  bindChips();
  $('#view').querySelectorAll('.tm').forEach(inp => inp.onchange = guard(async () => {
    const a = S.acc.accounts.find(x => x.id === inp.dataset.acc), team = {};
    $('#view').querySelectorAll(`.tm[data-acc="${inp.dataset.acc}"]`).forEach(i => { if (i.value.trim()) team[i.dataset.role] = i.value.trim(); });
    a.team = (await api('/api/team-set', { client: a.id, team })).team;
    $('#tmFilled').textContent = `배정 ${filled()} / ${total}`; $('#people').innerHTML = peopleHtml(); bindChips(); toast('저장했어요.', 'ok');
  }));
}
async function viewCalendarHome() {
  await loadAccounts(); if (S.view !== 'calendar') return;
  $('#view').innerHTML = `<div class="accounts-page">${pageHead('Calendar', '모든 어카운트의 일정을 한곳에서 봅니다. 주간 보기가 기본이에요.', false)}${S.st.clients.length ? calHtml() : '<div class="card pad"><div class="empty"><b>등록된 어카운트가 없어요</b>All Accounts에서 + New Account 로 등록하세요.</div></div>'}</div>`;
  bindHead(); if (S.st.clients.length) bindCal();
}

/* ---------- 명령 화면 ---------- */
const projOptions = (sel, allowBlank) => {
  const ps = S.ws.projects.slice();
  if (!ps.find(p => p.id === 'general')) ps.push({ id: 'general', name: '공통 업무', stage: null });
  return (allowBlank ? `<option value="">(비우면 general)</option>` : '') +
    ps.map(p => `<option value="${esc(p.id)}" ${sel === p.id ? 'selected' : ''}>${esc(p.name)} · ${esc(p.id)}${p.stage ? ' · ' + esc(p.stage) : ''}</option>`).join('');
};
function lastMonth() {
  const [y, m] = S.st.today.split('-').map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
}
function fieldsHtml(cmd) {
  const f = S.form[cmd] = S.form[cmd] || {};
  const row = (label, hint, ctrl, req) => `<div class="field"><span class="lbl">${label}${req ? '<span class="req">*</span>' : ''}</span>${ctrl}${hint ? `<span class="hint">${hint}</span>` : ''}</div>`;
  const proj = (req, hint) => row('프로젝트', hint, `<select class="in" name="project">${projOptions(f.project || (req ? S.ws.projects[0]?.id : ''), !req)}</select>`, req);
  switch (cmd) {
    case 'new-client':
      return row('표시명', '생략해도 됩니다. 인터뷰에서 이어서 물어봅니다.', `<input class="in" name="name" value="${esc(f.name || '')}" placeholder="예: 모카나루" maxlength="60">`);
    case 'copy': {
      const chs = S.st.channels;
      return `<div class="grid2">${row('채널', '길이 검수는 규격이 확인된 채널만 판정합니다.',
        `<select class="in" name="channel">${chs.map(c => `<option value="${esc(c.id)}" ${f.channel === c.id ? 'selected' : ''}>${esc(c.id)}${c.verified ? '' : ' (규격 미검증)'}</option>`).join('')}<option value="__custom">직접 입력…</option></select>
         <input class="in" name="channel_custom" placeholder="예: kakao-channel" hidden style="margin-top:8px">`, true)}
        ${proj(false, '특정 프로젝트 브리프를 쓰려면 선택하세요.')}</div>`;
    }
    case 'report': {
      const mode = S.mode;
      const raw = S.ws.inputs.raw;
      return `<div class="field"><span class="lbl">기간<span class="req">*</span></span>
        <div class="seg" role="group"><button type="button" data-mode="month" aria-pressed="${mode === 'month'}">월 선택</button><button type="button" data-mode="range" aria-pressed="${mode === 'range'}">직접 기간</button></div>
        ${mode === 'month'
          ? `<input class="in" type="month" name="month" value="${esc(f.month || lastMonth())}" style="max-width:220px">`
          : `<div class="row"><input class="in" type="date" name="start" value="${esc(f.start || '')}" style="max-width:200px"><span>~</span><input class="in" type="date" name="end" value="${esc(f.end || '')}" style="max-width:200px"></div>`}
        <span class="hint">월을 고르면 직전 달과 비교합니다. 직접 기간은 비교 기간을 AI가 물어봅니다.</span></div>
        ${proj(false, '')}
        <div class="note ${raw.length ? 'info' : ''}">${raw.length ? `분석 대상 데이터: <b>${raw.map(esc).join(', ')}</b> (data/raw)` : '데이터 파일이 없습니다. data/raw 에 CSV·XLSX 를 넣지 않으면 "분석 제한 보고서"만 만들어집니다.'}</div>`;
    }
    case 'meeting': {
      const inbox = S.ws.inputs.inbox;
      return `<div class="grid2">${proj(true, '')}
        ${row('회의록 파일', inbox.length ? '' : 'inbox 폴더에 파일이 없습니다. 파일 없이 실행하면 AI가 내용을 붙여넣어 달라고 합니다.',
          `<select class="in" name="file"><option value="">(선택 안 함 — 대화에 붙여넣기)</option>${inbox.map(x => `<option ${f.file === x ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select>`)}</div>`;
    }
    case 'video': {
      const p = S.ws.projects.find(x => x.id === (f.project || S.ws.projects[0]?.id));
      const sel = f.selection || '';
      return `${proj(true, '')}
        <div class="field"><span class="lbl">컨셉 선택</span>
          <div class="seg" role="group">${[['', '아직 없음'], ['A', 'A안'], ['B', 'B안'], ['C', 'C안'], ['위임', '위임']].map(([v, l]) => `<button type="button" data-sel="${v}" aria-pressed="${sel === v}">${l}</button>`).join('')}</div>
          <span class="hint">${sel ? '선택한 안으로 구성·스크립트·콘티를 만듭니다.' : '1단계: 컨셉 3안을 제시하고 멈춥니다. 3안을 보고 난 뒤 다시 와서 고르세요.'}</span></div>
        ${p ? `<div class="row"><span class="chip">${esc(p.stage || '단계 미정')}</span>${p.selected ? `<span class="chip ok">선택된 컨셉 ${esc(p.selected)}</span>` : '<span class="chip warn">컨셉 미선택</span>'}</div>` : ''}`;
    }
    case 'shoot-plan': {
      const p = S.ws.projects.find(x => x.id === (f.project || S.ws.projects[0]?.id));
      return `${proj(true, '')}${p && !p.selected ? '<div class="note">이 프로젝트는 아직 컨셉이 선택되지 않았습니다. 선택 전에는 슈팅 계획을 만들 수 없어 AI가 멈춥니다. 먼저 [영상 기획]에서 선택하세요.</div>' : ''}`;
    }
    case 'onset':
      return `${proj(true, '')}
        <div class="field"><span class="lbl">지금 상황<span class="req">*</span></span>
          <textarea class="in" name="situation" rows="3" maxlength="500" placeholder="예: 야외 장소에 비가 내림, 출연자 도착이 40분 늦어짐">${esc(f.situation || '')}</textarea>
          <div class="row">${['야외 장소에 비가 내림', '출연자 도착이 딜레이됨', '슈팅 장소 이용이 제한됨', '장비가 고장 남'].map(t => `<button type="button" class="chip" data-quick="${esc(t)}" style="border:0;cursor:pointer">${esc(t)}</button>`).join('')}</div></div>`;
  }
  return '';
}
function readForm(cmd) {
  const v = $('#view'); const g = n => (v.querySelector(`[name=${n}]`) || {}).value || '';
  const f = S.form[cmd] = S.form[cmd] || {};
  ['name', 'project', 'file', 'situation', 'month', 'start', 'end'].forEach(n => { if (v.querySelector(`[name=${n}]`)) f[n] = g(n); });
  if (v.querySelector('[name=channel]')) { f.channel = g('channel'); f.channel_custom = g('channel_custom'); }
  return f;
}
function buildFields(cmd) {
  const f = readForm(cmd); const out = {};
  if (f.project) out.project = f.project;
  switch (cmd) {
    case 'new-client': out.name = f.name; break;
    case 'copy': out.channel = f.channel === '__custom' ? f.channel_custom : f.channel; break;
    case 'report':
      out.period = S.mode === 'month' ? f.month : (f.start && f.end ? `${f.start}~${f.end}` : '');
      break;
    case 'meeting': out.file = f.file; break;
    case 'video': out.selection = f.selection; break;
    case 'onset': out.situation = f.situation; break;
  }
  return out;
}
function viewCommand(cmd) {
  const c = CMDS[cmd]; const hasCtx = !!S.ws;
  const body = (cmd === 'new-client' && !hasCtx) ? fieldsNewClient() : fieldsHtml(cmd);
  const show = S.run && S.run.cmd === cmd;
  $('#view').innerHTML = `
    <div class="hero"><span class="ic">${ICONS[c.icon]}</span><div><h1>${esc(c.title)}</h1><p>${esc(c.desc)}</p></div></div>
    ${['copy', 'video', 'shoot-plan'].includes(cmd) ? refPanel() : ''}
    <form class="card pad form" id="form" autocomplete="off">${body}
      <div class="form-foot"><button class="btn pri" id="go" type="submit" ${S.st.claude ? '' : 'disabled'}>${S.run?.running && show ? '<span class="spin"></span> 작업 중' : '실행'}</button>
        <span class="muted" style="font-size:13px">초안만 만들며 외부로 발송·포스팅하지 않습니다.</span></div>
      <div class="cmdline" id="cmdline"></div></form>
    <section class="stream" id="stream"></section>
    <div id="composerWrap"></div>`;
  bindForm(cmd); updateCmdline(cmd); renderStream();
  $('#view').querySelectorAll('[data-golib]').forEach(b => b.onclick = () => goSub('', b.dataset.golib));
}
function fieldsNewClient() {
  const f = S.form['new-client'] = S.form['new-client'] || {};
  return `<div class="field"><span class="lbl">표시명</span><input class="in" name="name" value="${esc(f.name || '')}" placeholder="예: 모카나루" maxlength="60"><span class="hint">생략해도 됩니다. 인터뷰에서 이어서 물어봅니다.</span></div>`;
}
function updateCmdline(cmd) {
  const f = buildFields(cmd);
  const parts = ['/' + cmd];
  if (cmd !== 'new-client') parts.push(S.st.active);
  for (const k of ['channel', 'period', 'project', 'file', 'selection', 'situation', 'name']) if (f[k]) parts.push(/\s/.test(f[k]) ? `"${f[k]}"` : f[k]);
  const el = $('#cmdline'); if (el) el.textContent = parts.join(' ');
}
function bindForm(cmd) {
  const form = $('#form');
  form.addEventListener('input', () => { toggleCustom(); updateCmdline(cmd); });
  form.addEventListener('change', () => { toggleCustom(); updateCmdline(cmd); readForm(cmd); if (cmd === 'video' || cmd === 'shoot-plan') viewCommandKeep(cmd); });
  const toggleCustom = () => {
    const sel = form.querySelector('[name=channel]'), cu = form.querySelector('[name=channel_custom]');
    if (sel && cu) cu.hidden = sel.value !== '__custom';
  };
  toggleCustom();
  form.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { readForm(cmd); S.mode = b.dataset.mode; viewCommandKeep(cmd); });
  form.querySelectorAll('[data-sel]').forEach(b => b.onclick = () => { readForm(cmd); S.form[cmd].selection = b.dataset.sel; viewCommandKeep(cmd); });
  form.querySelectorAll('[data-quick]').forEach(b => b.onclick = () => { const t = form.querySelector('[name=situation]'); t.value = b.dataset.quick; t.dispatchEvent(new Event('input', { bubbles: true })); t.focus(); });
  form.onsubmit = guard(async e => {
    e.preventDefault();
    if (S.run?.running) return toast('다른 작업이 진행 중입니다.', 'bad');
    const fields = buildFields(cmd);
    await api('/api/run', { cmd, fields });
    S.run = { cmd, fields, start: Date.now() / 1000, steps: [], logs: [], items: [], notices: [], running: true, newFiles: [] };
    S.jobId = null; S.since = 0; viewCommandKeep(cmd); startPolling();
  });
}
function viewCommandKeep(cmd) { const y = window.scrollY; viewCommand(cmd); window.scrollTo(0, y); }

/* ---------- 진행 스트림 ---------- */
function renderStream() {
  const el = $('#stream'); const r = S.run;
  if (!el || !r || r.cmd !== S.view) { if (el) el.innerHTML = ''; return; }
  const stick = window.innerHeight + window.scrollY >= document.body.scrollHeight - 160;
  let h = '';
  if (r.steps.length) {
    h += `<div class="sec-t">참여한 역할</div><div class="steps">${r.steps.map(s =>
      `<span class="step ${s.state}">${s.state === 'run' ? '<span class="spin"></span>' : s.state === 'err' ? ICONS.x : ICONS.check}${esc(ROLES[s.role] || s.role)}${s.desc ? `<small>${esc(s.desc)}</small>` : ''}</span>`).join('')}</div>`;
  }
  for (const it of r.items) {
    if (it.t === 'user') h += `<div class="msg user"><div class="bub">${esc(it.text)}</div></div>`;
    else if (it.t === 'ai') h += `<div class="msg ai card"><div class="who">${ICONS.send.replace('<svg', '<svg width="14" height="14"')} 디렉터</div><div class="md">${md(it.text)}</div></div>`;
    else if (it.t === 'result') {
      h += `<div class="msg">${it.error ? `<div class="note bad">${esc(it.text)}</div>` : ''}
        ${it.denials.length ? `<div class="note">AI가 요청한 일부 작업이 권한 때문에 막혔습니다: <b>${esc([...new Set(it.denials)].join(', '))}</b>. 결과가 불완전할 수 있습니다.</div>` : ''}
        <div class="resultbar"><span class="chip ${it.error ? 'bad' : 'ok'}">${it.error ? '오류' : '완료'}</span>
          ${it.turns ? `<span>${it.turns}턴</span>` : ''}${it.cost != null ? `<span>비용 약 $${Number(it.cost).toFixed(2)}</span>` : ''}
          <span class="spacer"></span>
          ${r.newFiles.length ? `<span class="newfiles">새 결과물 ${r.newFiles.map((f, i) => `<button class="btn sm" data-open="${i}">${esc(f.name)}</button>`).join('')}</span>` : ''}</div></div>`;
    }
  }
  r.notices.forEach(n => { h += `<div class="note info">${esc(n)}</div>`; });
  if (r.running) h += `<div class="row muted"><span class="spin"></span> ${r.logs.length ? esc(r.logs[r.logs.length - 1].name) + ' 진행 중…' : 'AI 팀이 일하고 있습니다. 보통 1~3분 걸립니다.'}</div>`;
  if (r.logs.length) h += `<details class="logbox"><summary>상세 작업 로그 (${r.logs.length})</summary><ul>${r.logs.map(l => `<li><b>${esc(l.name)}</b>${esc(l.detail)}</li>`).join('')}</ul></details>`;
  el.innerHTML = h;
  el.querySelectorAll('[data-open]').forEach(b => b.onclick = guard(async () => {
    const f = r.newFiles[+b.dataset.open]; S.res.project = f.project; S.res.pick = f.name; await go('results');
  }));
  renderComposer();
  if (stick) window.scrollTo(0, document.body.scrollHeight);
}
function renderComposer() {
  const w = $('#composerWrap'); if (!w) return;
  const r = S.run; const show = r && r.cmd === S.view && r.items.some(i => i.t === 'result');
  if (!show) { w.innerHTML = ''; return; }
  if ($('#reply', w)) { $('#send', w).disabled = !!r.running; return; }
  w.innerHTML = `<div class="composer card"><textarea id="reply" rows="1" placeholder="AI의 질문에 답하거나 수정·추가 요청을 입력하세요 (Enter 전송, Shift+Enter 줄바꿈)"></textarea>
    <button class="btn pri" id="send">${ICONS.send.replace('<svg', '<svg width="16" height="16"')} 보내기</button></div>`;
  const ta = $('#reply'), send = $('#send');
  ta.addEventListener('input', () => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'; });
  const go2 = guard(async () => {
    const text = ta.value.trim(); if (!text) return;
    await api('/api/reply', { text });
    ta.value = ''; ta.style.height = 'auto';
    S.run.running = true; S.jobId = null; S.since = 0; renderTop(); renderSide(); renderStream(); startPolling();
  });
  send.onclick = go2;
  ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); go2(); } });
}

function startPolling() { clearInterval(S.timer); S.timer = setInterval(poll, 800); poll(); }
let polling = false;
async function poll() {
  if (polling) return; polling = true;
  try {
    const j = await api(`/api/job?since=${S.since}`);
    const r = S.run; if (!r) return;
    if (j.id && j.id !== S.jobId) { S.jobId = j.id; S.since = 0; if (j.events.length && j.events[0].i !== 0) return; }
    for (const ev of j.events) { S.since = ev.i + 1; applyEvent(r, ev); }
    if (j.events.length) renderStream();
    if (j.state !== 'running') {
      r.running = false; clearInterval(S.timer);
      await afterRun(r); S.st.running = false; renderTop(); renderSide(); renderStream();
      if (S.view === r.cmd) { const b = $('#go'); if (b) b.textContent = '다시 실행'; }
    }
  } catch (e) { clearInterval(S.timer); toast(e.message, 'bad'); }
  finally { polling = false; }
}
function applyEvent(r, ev) {
  if (ev.k === 'user') r.items.push({ t: 'user', text: ev.text });
  else if (ev.k === 'text') r.items.push({ t: 'ai', text: ev.text });
  else if (ev.k === 'role') { if (!r.steps.find(s => s.id === ev.id)) r.steps.push({ id: ev.id, role: ev.role, desc: ev.desc, state: 'run' }); }
  else if (ev.k === 'role_done') { const s = r.steps.find(x => x.id === ev.id); if (s) s.state = ev.error ? 'err' : 'done'; }
  else if (ev.k === 'tool') r.logs.push({ name: ev.name, detail: ev.detail });
  else if (ev.k === 'notice') r.notices.push(ev.text);
  else if (ev.k === 'result') {
    const last = [...r.items].reverse().find(i => i.t === 'ai');
    const dup = last && last.text.trim() === (ev.text || '').trim();
    if (!dup && ev.text && !ev.error) r.items.push({ t: 'ai', text: ev.text });
    r.items.push({ t: 'result', text: ev.text, error: ev.error, cost: ev.cost, turns: ev.turns, denials: ev.denials || [] });
  }
}
async function afterRun(r) {
  try {
    await refresh();
    const proj = (r.fields.project) || 'general';
    const items = (await api(`/api/deliverables?project=${encodeURIComponent(proj)}`)).items;
    r.newFiles = items.filter(i => i.mtime >= Math.floor(r.start) - 1).slice(0, 6).map(i => ({ ...i, project: proj }));
  } catch { /* 신규 결과물 표시는 선택 기능 */ }
}

/* ---------- 결과물 ---------- */
async function loadResults() {
  const ps = S.ws.projects.map(p => p.id); if (!ps.includes('general')) ps.push('general');
  if (!S.res.project || !ps.includes(S.res.project)) S.res.project = ps[0];
  try { S.res.items = (await api(`/api/deliverables?project=${encodeURIComponent(S.res.project)}`)).items; } catch { S.res.items = []; }
  S.res.sel = null; S.res.text = '';
  const want = S.res.pick && S.res.items.find(i => i.name === S.res.pick); S.res.pick = null;
  if (want) await openFile(want, true);
}
async function openFile(it, silent) {
  S.res.sel = it;
  S.res.text = (await api(`/api/file?project=${encodeURIComponent(S.res.project)}&area=${it.area}&name=${encodeURIComponent(it.name)}`)).text;
  if (!silent) viewResults();
}
const stateChip = s => { const [l, k] = STATES[s] || ['상태 없음', '']; return `<span class="chip ${k}">${l}</span>`; };
function viewResults() {
  const R = S.res; const ps = S.ws.projects.slice();
  if (!ps.find(p => p.id === 'general')) ps.push({ id: 'general', name: '공통 업무' });
  $('#view').innerHTML = `
    <div class="hero"><span class="ic">${ICONS.folder}</span><div><h1>결과물</h1><p>AI가 만든 초안을 확인하고 컨펌합니다. 모든 파일은 새 버전(-v숫자)으로 쌓이고 기존 파일은 덮어쓰지 않습니다.</p></div></div>
    <div class="row" style="margin-bottom:14px"><label class="lbl" for="rp" style="font-weight:600">프로젝트</label>
      <select class="in" id="rp" style="max-width:360px">${ps.map(p => `<option value="${esc(p.id)}" ${R.project === p.id ? 'selected' : ''}>${esc(p.name)} · ${esc(p.id)}</option>`).join('')}</select></div>
    <div class="split"><div class="card flist">${R.items.length ? R.items.map((it, i) =>
      `<button class="fitem" data-i="${i}" aria-current="${R.sel?.name === it.name}"><div class="n">${esc(it.name)}</div><div class="m">${stateChip(it.state)}<span>${AREA[it.area]}</span></div></button>`).join('')
      : '<div class="empty"><b>아직 결과물이 없어요</b>명령을 실행하면 여기에 쌓입니다.</div>'}</div>
      <div class="card viewer" id="viewer"></div></div>`;
  $('#rp').onchange = guard(async e => { R.project = e.target.value; await loadResults(); viewResults(); });
  $('#view').querySelectorAll('.fitem').forEach(b => b.onclick = guard(() => openFile(R.items[+b.dataset.i])));
  const v = $('#viewer');
  if (!R.sel) { v.innerHTML = '<div class="empty"><b>파일을 선택하세요</b>왼쪽 목록에서 열어 볼 수 있습니다.</div>'; return; }
  const it = R.sel; const can = it.state === 'review_passed';
  v.innerHTML = `<div class="viewer-h"><b>${esc(it.name)}</b>${stateChip(it.state)}<span class="spacer"></span>
      <button class="btn sm" id="cp">복사</button>
      ${it.state ? `<button class="btn sm pri" id="ap" ${can ? '' : 'disabled'} title="${can ? '' : 'AI 검수를 통과한 산출물만 컨펌할 수 있습니다'}">컨펌</button>` : ''}</div>
    ${it.state === 'approved' ? `<div class="viewer-b" style="padding-bottom:0"><div class="note info">${esc(it.by || '')} 님이 컨펌했습니다.</div></div>` : ''}
    ${/^(copy|pdp)/i.test(it.name) && bannedHits(R.text).length ? `<div class="viewer-b" style="padding-bottom:0"><div class="note bad">Playbook 금지어가 들어 있어요: ${bannedHits(R.text).map(w => `<b>${esc(w)}</b>`).join(', ')}. 컨펌 전에 고쳐 주세요.</div></div>` : ''}
    <div class="viewer-b">${renderFile(it.name, R.text)}</div>`;
  $('#cp').onclick = () => navigator.clipboard.writeText(R.text).then(() => toast('복사했습니다.', 'ok'), () => toast('복사하지 못했습니다.', 'bad'));
  const ap = $('#ap'); if (ap) ap.onclick = () => approveModal(it);
}
function approveModal(it) {
  modal(`<h3>이 산출물을 컨펌하시겠어요?</h3>
    <p class="muted"><b>${esc(it.name)}</b><br>AI 검수 통과는 컨펌도, 법적 적합성 확정도 아닙니다. 내용을 직접 확인한 대표가 컨펌합니다.</p>
    ${repField('컨펌자 (대표)')}
    <div class="row end"><button class="btn" id="m-no">취소</button><button class="btn pri" id="m-ok">컨펌</button></div>`,
  m => {
    $('#m-no', m).onclick = closeModal; bindRep(m);
    $('#m-ok', m).onclick = guard(async () => {
      const by = $('#by', m).value.trim(); if (!by) return toast('대표 이름을 입력하세요.', 'bad');
      await saveRep(by);
      await api('/api/approve', { project: S.res.project, file: it.name, by });
      closeModal(); toast('컨펌했습니다.', 'ok'); await loadResults(); await openFile(S.res.items.find(i => i.name === it.name) || it, true); viewResults();
    });
  });
}

/* ---------- 피드백 규칙 ---------- */
function viewFeedback() {
  const items = S.fb; const today = S.st.today;
  const live = i => i.status === '승인' && (!i.expires || i.expires >= today);
  const groups = [['컨펌 대기 (후보)', items.filter(i => i.status === '후보')],
    ['활성 규칙', items.filter(live)], ['지난 기록', items.filter(i => i.status !== '후보' && !live(i))]];
  const card = i => `<div class="card fb"><div class="fb-h"><b>${esc(i.id)}</b>
      <span class="chip ${i.status === '승인' ? 'ok' : i.status === '후보' ? 'warn' : ''}">${esc(i.status === '승인' ? '컨펌' : i.status)}</span>
      <span class="chip">${esc(i.scope)}${i.scope_ref ? ':' + esc(i.scope_ref) : ''}</span><span class="chip">${esc(i.kind)}</span><span class="spacer"></span>
      ${i.status === '후보' ? `<button class="btn sm pri" data-ap="${esc(i.id)}">컨펌</button><button class="btn sm danger" data-rj="${esc(i.id)}">폐기</button>` : ''}</div>
    <p>${esc(i.text)}</p>
    <small>출처: ${esc(i.source)} · ${esc(i.date)}${i.approved_by ? ` · 컨펌자 ${esc(i.approved_by)}` : ''}${i.expires ? ` · ~${esc(i.expires)}` : ''}</small></div>`;
  $('#view').innerHTML = `
    <div class="hero"><span class="ic">${ICONS.rule}</span><div><h1>피드백 규칙</h1><p>모델이 재학습되는 것이 아니라, 대표가 컨펌한 규칙만 이후 작업에 적용됩니다. 후보는 컨펌 전까지 어떤 작업에도 쓰이지 않습니다.</p></div></div>
    ${items.length ? groups.filter(g => g[1].length).map(([t, l]) => `<div class="sec-t" style="margin:22px 0 10px">${t} <span class="chip">${l.length}</span></div><div class="fb-list">${l.map(card).join('')}</div>`).join('')
      : '<div class="card empty"><b>아직 피드백이 없어요</b>[회의록 정리]를 실행하면 피드백 후보가 여기에 쌓입니다.</div>'}`;
  $('#view').querySelectorAll('[data-ap]').forEach(b => b.onclick = () => fbApproveModal(b.dataset.ap));
  $('#view').querySelectorAll('[data-rj]').forEach(b => b.onclick = guard(async () => {
    await api('/api/feedback/reject', { id: b.dataset.rj }); await refresh(); viewFeedback(); renderSide(); toast('폐기했습니다.');
  }));
}
function fbApproveModal(id) {
  const it = S.fb.find(x => x.id === id);
  modal(`<h3>${esc(id)} 를 활성 규칙으로 컨펌할까요?</h3>
    <p class="muted">"${esc(it.text)}"<br>적용 범위: <b>${esc(it.scope)}${it.scope_ref ? ':' + esc(it.scope_ref) : ''}</b> — 범위가 넓어지지 않습니다.</p>
    ${repField('컨펌자 (대표)')}
    <div class="field" style="margin-top:12px"><label class="lbl" for="ex">유효기간 (선택)</label><input class="in" id="ex" type="date"></div>
    <div class="field" style="margin-top:12px"><label class="lbl" for="sp">대체할 기존 규칙 ID (충돌 시)</label><input class="in" id="sp" placeholder="예: FB-001, FB-002"><span class="hint">같은 주제의 활성 규칙과 충돌하면 컨펌되지 않습니다. 대체하려면 ID 를 적어 주세요.</span></div>
    <div class="row end"><button class="btn" id="m-no">취소</button><button class="btn pri" id="m-ok">컨펌</button></div>`,
  m => {
    $('#m-no', m).onclick = closeModal; bindRep(m);
    $('#m-ok', m).onclick = guard(async () => {
      const by = $('#by', m).value.trim(); if (!by) return toast('대표 이름을 입력하세요.', 'bad');
      await saveRep(by);
      const supersede = $('#sp', m).value.split(/[,\s]+/).filter(Boolean);
      await api('/api/feedback/approve', { id, by, expires: $('#ex', m).value, supersede });
      closeModal(); toast('활성 규칙으로 컨펌했습니다.', 'ok'); await refresh(); viewFeedback(); renderSide();
    });
  });
}

/* ---------- 시작 ---------- */
/* 버디가 여는 주소: #acc=어카운트&tab=탭&sub=칩. 열린 어카운트가 없으면 열고, 다른 어카운트가 열려 있으면 전환 확인창을 띄운다. */
async function applyHash() {
  const h = new URLSearchParams(location.hash.replace(/^#/, ''));
  if (h.get('new')) { history.replaceState(null, '', location.pathname); await go('welcome'); newAccountModal(); return true; }
  const acc = h.get('acc'); if (!acc) return false;
  history.replaceState(null, '', location.pathname);
  if (!S.st.clients.some(c => c.id === acc)) { toast('이 어카운트를 찾을 수 없어요.', 'bad'); return false; }
  const tab = h.get('tab') || 'overview', sub = h.get('sub') || '';
  const go2 = () => { const t = TABS.find(x => x.id === tab) || TABS[0]; return goSub(t.id, sub && t.subs.some(y => y[0] === sub) ? sub : (t.subs[0] ? t.subs[0][0] : '')); };
  if (S.st.active === acc) { await go2(); return true; }
  if (S.st.active) { switchClientModal(acc); return true; }
  await pickClient(acc, go2); return true;
}
window.addEventListener('hashchange', () => { if (S.st) guard(applyHash)(); });
(async () => {
  try {
    await refresh();
    if (S.st.running) { S.run = { cmd: 'copy', fields: {}, start: Date.now() / 1000, steps: [], logs: [], items: [], notices: [], running: true, newFiles: [] }; }
    if (!(await applyHash())) await (S.st.active ? goSub('overview') : go('welcome'));
    if (S.st.running) startPolling();
  } catch (e) {
    $('#view').innerHTML = `<div class="card empty"><b>화면을 불러오지 못했습니다</b>${esc(e.message)}<br>터미널의 서버가 켜져 있는지 확인하세요.</div>`;
  }
})();
})();
