/* AI 주니어 팀 — 로컬 웹 화면. 외부 라이브러리·외부 통신 없음. */
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
  plus: ic('<path d="M12 5v14M5 12h14"/>'),
  check: ic('<path d="M5 12.5l4.5 4.5L19 7"/>'),
  x: ic('<path d="M6 6l12 12M18 6L6 18"/>'),
  lock: ic('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>'),
  send: ic('<path d="M5 12h14M13 6l6 6-6 6"/>'),
};

/* ---------- 명령 정의 ---------- */
const CMDS = {
  'new-client': { title: '새 고객사 등록', icon: 'plus', group: null,
    desc: '짧은 인터뷰로 브랜드 정보와 계약 범위를 정리합니다. 모르는 항목은 "미정"으로 남습니다.' },
  copy: { title: '카피 3안', icon: 'copy', group: '업무',
    desc: '소구와 전략이 서로 다른 카피 3안을 쓰고, 글자 수·금지어·위험 표현을 기계 검수한 뒤 독립 검수까지 마칩니다.' },
  report: { title: '성과 리포트', icon: 'report', group: '업무',
    desc: '광고 CSV·엑셀을 검증하고 스크립트로 지표를 계산해, 해석과 다음 행동이 담긴 리포트를 만듭니다.' },
  meeting: { title: '회의록 정리', icon: 'meeting', group: '업무',
    desc: '결정사항·미결사항·액션아이템을 뽑고 피드백은 "후보"로만 저장합니다. 승인 전에는 규칙이 되지 않습니다.' },
  video: { title: '영상 기획', icon: 'video', group: '영상·촬영',
    desc: '컨셉 3안을 제시하고 멈춥니다. 직접 고르거나 위임한 뒤에야 구성·스크립트·콘티가 만들어집니다.' },
  'shoot-plan': { title: '촬영 계획', icon: 'shoot', group: '영상·촬영',
    desc: '선택된 콘티로 일정·콜시트·준비물·리스크 표를 만듭니다. 확인되지 않은 허가·예약은 확정으로 쓰지 않습니다.' },
  onset: { title: '현장 대응', icon: 'onset', group: '영상·촬영',
    desc: '촬영 중 돌발 상황에 즉시 조치, 대체 순서, 고객사 보고 문구를 짧게 답합니다.' },
};
const ROLES = {
  researcher: '리서처', strategist: '전략 기획자', copywriter: '카피라이터', pd: 'PD',
  'performance-analyst': '퍼포먼스 분석가', 'report-writer': '리포트 작성자',
  'comms-assistant': '커뮤니케이션 비서', reviewer: '독립 검수자', agent: '담당자',
};
const STATES = {
  draft: ['초안', ''], review_passed: ['AI 검수 통과', 'ok'], needs_revision: ['수정 필요', 'warn'],
  approved: ['승인됨', 'acc'], archived: ['보관', ''],
};
const AREA = { deliverables: '산출물', review: '검수', research: '조사·분석', production: '제작' };

/* ---------- 상태 ---------- */
const S = {
  st: null, ws: null, view: 'welcome', form: {}, mode: 'month',
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
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeModal(); $('#side').classList.remove('open'); } });

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

/* ---------- 사이드바 / 상단 ---------- */
function renderSide() {
  const a = S.st.active; const cl = S.st.clients.find(c => c.id === a);
  $('#clientCard').innerHTML = a
    ? `<span class="avatar">${esc((cl?.name || a)[0])}</span><span class="t"><b>${esc(cl?.name || a)}</b><small>${ICONS.lock.replace('<svg', '<svg width="12" height="12"')} 세션 고정 · ${esc(a)}</small></span>`
    : `<span class="avatar">?</span><span class="t"><b>고객사 선택</b><small>한 세션 = 한 고객사</small></span>`;
  $('#clientCard').onclick = () => a ? switchClientModal() : go('welcome');

  let h = '';
  const item = (k, label, icon, extra = '') =>
    `<button class="nav-i" data-v="${k}" ${S.view === k ? 'aria-current="page"' : ''} ${a ? '' : 'disabled'}>${ICONS[icon]}<span>${label}</span>${extra}</button>`;
  if (a) {
    let last = null;
    for (const [k, c] of Object.entries(CMDS)) {
      if (!c.group) continue;
      if (c.group !== last) { h += `<div class="nav-h">${c.group}</div>`; last = c.group; }
      h += item(k, c.title, c.icon);
    }
    const cand = S.fb.filter(f => f.status === '후보').length;
    h += `<div class="nav-h">관리</div>` + item('results', '결과물', 'folder') +
      item('feedback', '피드백 규칙', 'rule', cand ? `<span class="cnt">${cand}</span>` : '');
  }
  $('#nav').innerHTML = h;
  $('#nav').querySelectorAll('.nav-i').forEach(b => b.onclick = () => go(b.dataset.v));

  const run = S.st.running || (S.run && S.run.running);
  $('#conn').innerHTML = !S.st.claude
    ? '<span class="dot bad"></span> Claude Code 를 찾을 수 없음'
    : run ? '<span class="dot run"></span> AI 팀이 작업 중' : '<span class="dot ok"></span> Claude Code 연결됨';
}
function renderTop() {
  const v = S.view; let t = '';
  if (v === 'welcome') t = '시작';
  else if (v === 'results') t = '결과물';
  else if (v === 'feedback') t = '피드백 규칙';
  else t = CMDS[v].title;
  $('#crumb').innerHTML = esc(t) + (S.st.active ? ` <small>· ${esc(S.st.clients.find(c => c.id === S.st.active)?.name || S.st.active)}</small>` : '');
  $('#topR').innerHTML = (S.run && S.run.running) ? '<span class="chip acc"><span class="spin"></span> 작업 중</span>' : '';
}

function switchClientModal() {
  const busy = S.run && S.run.running;
  modal(`<h3>고객사를 바꾸시겠어요?</h3>
    <p class="muted">고객사 정보가 섞이지 않도록 한 번에 한 고객사만 작업합니다. 전환하면 현재 고객사 세션이 해제되고 대화 내용도 비워집니다. 저장된 결과물은 그대로 남습니다.</p>
    ${busy ? '<div class="note bad">작업이 진행 중입니다. 끝나거나 중단한 뒤에 전환할 수 있습니다.</div>' : ''}
    <div class="row end"><button class="btn" id="m-no">취소</button><button class="btn pri" id="m-ok" ${busy ? 'disabled' : ''}>세션 해제하고 전환</button></div>`,
  m => {
    $('#m-no', m).onclick = closeModal;
    $('#m-ok', m).onclick = guard(async () => {
      await api('/api/session/clear', {}); closeModal();
      S.run = null; S.jobId = null; S.ws = null; S.fb = []; S.form = {};
      await refresh(); go('welcome');
    });
  });
}

/* ---------- 라우팅 ---------- */
async function refresh() {
  S.st = await api('/api/state');
  if (S.st.active) {
    S.ws = await api('/api/workspace');
    try { S.fb = (await api('/api/feedback')).items; } catch { S.fb = []; }
  } else { S.ws = null; S.fb = []; }
}
async function go(v) {
  $('#side').classList.remove('open');
  if (!S.st.active && v !== 'welcome' && v !== 'new-client') v = 'welcome';
  S.view = v;
  if (v === 'results') await loadResults();
  if (v === 'feedback') { try { S.fb = (await api('/api/feedback')).items; } catch (e) { toast(e.message, 'bad'); } }
  render(); window.scrollTo(0, 0);
}
function render() {
  renderSide(); renderTop();
  const v = S.view;
  if (v === 'welcome') return viewWelcome();
  if (v === 'results') return viewResults();
  if (v === 'feedback') return viewFeedback();
  return viewCommand(v);
}

/* ---------- 시작 화면 ---------- */
function viewWelcome() {
  const cl = S.st.clients;
  $('#view').innerHTML = `<div class="welcome">
    <h1>어느 고객사 작업을 시작할까요?</h1>
    <p>한 세션에는 한 고객사만 열립니다. 고객사를 고르면 그 고객사의 자료만 AI 팀에게 전달됩니다.</p>
    ${S.st.claude ? '' : '<div class="note bad" style="margin-bottom:16px">Claude Code(claude 명령)를 찾지 못했습니다. 설치 후 터미널에서 claude 가 실행되는지 확인하세요.</div>'}
    <div class="cgrid">
      ${cl.map(c => `<div class="ccard"><span class="avatar">${esc(c.name[0])}</span><b>${esc(c.name)}</b><small class="muted">${esc(c.id)}</small>
        <button class="btn pri" data-pick="${esc(c.id)}">이 고객사로 시작</button></div>`).join('')}
      <div class="ccard add"><span class="avatar">${ICONS.plus}</span><b>새 고객사</b><small class="muted">인터뷰로 등록</small>
        <button class="btn" id="newc">등록 시작</button></div>
    </div>
    ${cl.length ? '' : '<p class="muted" style="margin-top:24px">등록된 고객사가 없습니다. 연습하려면 터미널에서 <code>py -3 scripts/install_samples.py</code> 를 실행하세요.</p>'}
    <div class="rule note info">${ICONS.lock.replace('<svg', '<svg width="18" height="18"')}<span>이 화면은 이 PC 안에서만 열리며, 메일·게시·광고 집행 같은 외부 실행은 하지 않습니다. 초안만 만들고, 승인은 항상 사람이 합니다.</span></div>
  </div>`;
  $('#view').querySelectorAll('[data-pick]').forEach(b => b.onclick = guard(async () => {
    await api('/api/session', { client: b.dataset.pick });
    S.run = null; S.jobId = null; await refresh(); go('copy');
  }));
  $('#newc').onclick = () => go('new-client');
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
      return `${proj(true, '')}${p && !p.selected ? '<div class="note">이 프로젝트는 아직 컨셉이 선택되지 않았습니다. 선택 전에는 촬영 계획을 만들 수 없어 AI가 멈춥니다. 먼저 [영상 기획]에서 선택하세요.</div>' : ''}`;
    }
    case 'onset':
      return `${proj(true, '')}
        <div class="field"><span class="lbl">지금 상황<span class="req">*</span></span>
          <textarea class="in" name="situation" rows="3" maxlength="500" placeholder="예: 야외 장소에 비가 내림, 출연자 도착이 40분 늦어짐">${esc(f.situation || '')}</textarea>
          <div class="row">${['야외 장소에 비가 내림', '출연자 도착이 지연됨', '촬영 장소 이용이 제한됨', '장비가 고장 남'].map(t => `<button type="button" class="chip" data-quick="${esc(t)}" style="border:0;cursor:pointer">${esc(t)}</button>`).join('')}</div></div>`;
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
    <form class="card pad form" id="form" autocomplete="off">${body}
      <div class="form-foot"><button class="btn pri" id="go" type="submit" ${S.st.claude ? '' : 'disabled'}>${S.run?.running && show ? '<span class="spin"></span> 작업 중' : '실행'}</button>
        <span class="muted" style="font-size:13px">초안만 만들며 외부로 발송·게시하지 않습니다.</span></div>
      <div class="cmdline" id="cmdline"></div></form>
    <section class="stream" id="stream"></section>
    <div id="composerWrap"></div>`;
  bindForm(cmd); updateCmdline(cmd); renderStream();
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
    <div class="hero"><span class="ic">${ICONS.folder}</span><div><h1>결과물</h1><p>AI가 만든 초안을 확인하고 승인합니다. 모든 파일은 새 버전(-v숫자)으로 쌓이고 기존 파일은 덮어쓰지 않습니다.</p></div></div>
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
      ${it.state ? `<button class="btn sm pri" id="ap" ${can ? '' : 'disabled'} title="${can ? '' : 'AI 검수를 통과한 산출물만 승인할 수 있습니다'}">승인</button>` : ''}</div>
    ${it.state === 'approved' ? `<div class="viewer-b" style="padding-bottom:0"><div class="note info">${esc(it.by || '')} 님이 승인했습니다.</div></div>` : ''}
    <div class="viewer-b">${renderFile(it.name, R.text)}</div>`;
  $('#cp').onclick = () => navigator.clipboard.writeText(R.text).then(() => toast('복사했습니다.', 'ok'), () => toast('복사하지 못했습니다.', 'bad'));
  const ap = $('#ap'); if (ap) ap.onclick = () => approveModal(it);
}
function approveModal(it) {
  modal(`<h3>이 산출물을 승인하시겠어요?</h3>
    <p class="muted"><b>${esc(it.name)}</b><br>AI 검수 통과는 승인도, 법적 적합성 확정도 아닙니다. 내용을 직접 확인한 담당자가 승인자 이름을 적어 승인합니다.</p>
    <div class="field"><label class="lbl" for="by">승인자 이름</label><input class="in" id="by" value="${esc(store.get('approver'))}" placeholder="예: 김팀장" maxlength="40"></div>
    <div class="row end"><button class="btn" id="m-no">취소</button><button class="btn pri" id="m-ok">승인</button></div>`,
  m => {
    $('#m-no', m).onclick = closeModal;
    $('#m-ok', m).onclick = guard(async () => {
      const by = $('#by', m).value.trim(); if (!by) return toast('승인자 이름을 입력하세요.', 'bad');
      store.set('approver', by);
      await api('/api/approve', { project: S.res.project, file: it.name, by });
      closeModal(); toast('승인했습니다.', 'ok'); await loadResults(); await openFile(S.res.items.find(i => i.name === it.name) || it, true); viewResults();
    });
  });
}

/* ---------- 피드백 규칙 ---------- */
function viewFeedback() {
  const items = S.fb; const today = S.st.today;
  const live = i => i.status === '승인' && (!i.expires || i.expires >= today);
  const groups = [['승인 대기 (후보)', items.filter(i => i.status === '후보')],
    ['활성 규칙', items.filter(live)], ['지난 기록', items.filter(i => i.status !== '후보' && !live(i))]];
  const card = i => `<div class="card fb"><div class="fb-h"><b>${esc(i.id)}</b>
      <span class="chip ${i.status === '승인' ? 'ok' : i.status === '후보' ? 'warn' : ''}">${esc(i.status)}</span>
      <span class="chip">${esc(i.scope)}${i.scope_ref ? ':' + esc(i.scope_ref) : ''}</span><span class="chip">${esc(i.kind)}</span><span class="spacer"></span>
      ${i.status === '후보' ? `<button class="btn sm pri" data-ap="${esc(i.id)}">승인</button><button class="btn sm danger" data-rj="${esc(i.id)}">폐기</button>` : ''}</div>
    <p>${esc(i.text)}</p>
    <small>출처: ${esc(i.source)} · ${esc(i.date)}${i.approved_by ? ` · 승인자 ${esc(i.approved_by)}` : ''}${i.expires ? ` · ~${esc(i.expires)}` : ''}</small></div>`;
  $('#view').innerHTML = `
    <div class="hero"><span class="ic">${ICONS.rule}</span><div><h1>피드백 규칙</h1><p>모델이 재학습되는 것이 아니라, 사람이 승인한 규칙만 이후 작업에 적용됩니다. 후보는 승인 전까지 어떤 작업에도 쓰이지 않습니다.</p></div></div>
    ${items.length ? groups.filter(g => g[1].length).map(([t, l]) => `<div class="sec-t" style="margin:22px 0 10px">${t} <span class="chip">${l.length}</span></div><div class="fb-list">${l.map(card).join('')}</div>`).join('')
      : '<div class="card empty"><b>아직 피드백이 없어요</b>[회의록 정리]를 실행하면 피드백 후보가 여기에 쌓입니다.</div>'}`;
  $('#view').querySelectorAll('[data-ap]').forEach(b => b.onclick = () => fbApproveModal(b.dataset.ap));
  $('#view').querySelectorAll('[data-rj]').forEach(b => b.onclick = guard(async () => {
    await api('/api/feedback/reject', { id: b.dataset.rj }); await refresh(); viewFeedback(); renderSide(); toast('폐기했습니다.');
  }));
}
function fbApproveModal(id) {
  const it = S.fb.find(x => x.id === id);
  modal(`<h3>${esc(id)} 를 활성 규칙으로 승인할까요?</h3>
    <p class="muted">"${esc(it.text)}"<br>적용 범위: <b>${esc(it.scope)}${it.scope_ref ? ':' + esc(it.scope_ref) : ''}</b> — 범위가 넓어지지 않습니다.</p>
    <div class="field"><label class="lbl" for="by">승인자 이름</label><input class="in" id="by" value="${esc(store.get('approver'))}" maxlength="40" placeholder="예: 김팀장"></div>
    <div class="field" style="margin-top:12px"><label class="lbl" for="ex">유효기간 (선택)</label><input class="in" id="ex" type="date"></div>
    <div class="field" style="margin-top:12px"><label class="lbl" for="sp">대체할 기존 규칙 ID (충돌 시)</label><input class="in" id="sp" placeholder="예: FB-001, FB-002"><span class="hint">같은 주제의 활성 규칙과 충돌하면 승인되지 않습니다. 대체하려면 ID 를 적어 주세요.</span></div>
    <div class="row end"><button class="btn" id="m-no">취소</button><button class="btn pri" id="m-ok">승인</button></div>`,
  m => {
    $('#m-no', m).onclick = closeModal;
    $('#m-ok', m).onclick = guard(async () => {
      const by = $('#by', m).value.trim(); if (!by) return toast('승인자 이름을 입력하세요.', 'bad');
      store.set('approver', by);
      const supersede = $('#sp', m).value.split(/[,\s]+/).filter(Boolean);
      await api('/api/feedback/approve', { id, by, expires: $('#ex', m).value, supersede });
      closeModal(); toast('활성 규칙으로 승인했습니다.', 'ok'); await refresh(); viewFeedback(); renderSide();
    });
  });
}

/* ---------- 시작 ---------- */
$('#menuBtn').onclick = () => $('#side').classList.toggle('open');
(async () => {
  try {
    await refresh();
    if (S.st.running) { S.run = { cmd: 'copy', fields: {}, start: Date.now() / 1000, steps: [], logs: [], items: [], notices: [], running: true, newFiles: [] }; }
    await go(S.st.active ? 'copy' : 'welcome');
    if (S.st.running) startPolling();
  } catch (e) {
    $('#view').innerHTML = `<div class="card empty"><b>화면을 불러오지 못했습니다</b>${esc(e.message)}<br>터미널의 서버가 켜져 있는지 확인하세요.</div>`;
  }
})();
})();
