/* 버디 페이지. /api/buddy 를 30초마다 읽어 캐릭터가 있는 어카운트의 말풍선을 그린다. 계산은 서버가 한다(버디가 따로 계산하지 않음).
   캐릭터를 누르면 역할별 현황 패널, 이따가는 서버에 저장(10분), 방해 금지 시간에는 모두 잠들고 긴급만 작은 배지로 남는다. */
(function () {
  'use strict';
  var TOKEN = document.querySelector('meta[name=token]').content, B = window.BuddySprite, stage = document.getElementById('stage');
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); };
  var KIND = {
    confirm: { label: '확인 필요', color: '#D63A72', bg: '#FFF1F6', btn: '#FFD1E0', go: '볼게요!', icon: ['.rr.rr.', 'rpprppr', 'rpwpppr', '.rpppr.', '..rpr..', '...r...'], pal: { r: '#C2306A', p: '#FF7FA8', w: '#FFFFFF' } },
    check: { label: '체크 필요', color: '#9A5B00', bg: '#FFF8DE', btn: '#FFE48F', go: '확인할게요', icon: ['...y...', '..yYy..', 'yyyYyyy', '.yyYyy.', '.yy.yy.', 'y.....y'], pal: { y: '#E8A317', Y: '#FFE08A' } },
    urgent: { label: '긴급', color: '#C2321F', bg: '#FFEDEA', btn: '#FFC2B8', go: '지금 볼게요', icon: ['.rrrrr.', 'rrrwrrr', 'rrrwrrr', 'rrrwrrr', 'rrrrrrr', '.rrwrr.'], pal: { r: '#E0453A', w: '#FFFFFF' } }
  };
  var VOICE = {
    leo: { urgent: function (t) { return '대표님, 긴급입니다. ' + t + '. 바로 확인하시죠.'; }, check: function (t) { return '대표님, 체크가 필요합니다. ' + t + '.'; }, confirm: function (t) { return '대표님, ' + t + '. 지금 보시죠.'; } },
    luna: { urgent: function (t) { return t + '! 이건 지금 봐야 해요~'; }, check: function (t) { return t + '~ 잠깐 체크해 줄래요?'; }, confirm: function (t) { return t + '~ 한 번 봐줘요~'; } },
    momo: { urgent: function (t) { return '대표님~!! ' + t + ' 얼른 봐주세요 ㅠㅠ'; }, check: function (t) { return '대표님~ ' + t + ' 확인 부탁해요 ♡'; }, confirm: function (t) { return '대표님~! ' + t + ' 봐주세요 ♡'; } },
    doyun: { urgent: function (t) { return '대표님!! ' + t + '! 지금 바로 가요!!'; }, check: function (t) { return '대표님! ' + t + '! 같이 챙겨요!'; }, confirm: function (t) { return '대표님!! ' + t + '! 같이 달려요!'; } },
    haru: { urgent: function (t) { return t + '. 급한 건이라 먼저 말씀드려요.'; }, check: function (t) { return t + '. 시간 될 때 체크해 주세요.'; }, confirm: function (t) { return t + '. 시간 될 때 봐주세요.'; } },
    jun: { urgent: function (t) { return '대표님, ' + t + '. 이건 바로 가야 돼요.'; }, check: function (t) { return '대표님, ' + t + '. 체크 한 번 가실까요?'; }, confirm: function (t) { return '대표님, ' + t + '. 확인 한 번 가실까요?'; } }
  };
  var PX = { small: 4, normal: 6, large: 8 }, last = null, curSize = 'small', openAcc = '', offlineNow = false, rt = null;
  function spx() { return 28 * (PX[curSize] || 4); }   // 한 칸을 정수 픽셀로 키워 도트가 흐려지지 않게 한다
  var icon = function (k) { var rows = KIND[k].icon, pal = KIND[k].pal, s = ''; rows.forEach(function (r, y) { for (var x = 0; x < r.length; x++) if (r[x] !== '.') s += '<rect x="' + x + '" y="' + y + '" width="1.02" height="1.02" fill="' + pal[r[x]] + '"/>'; }); return '<svg width="14" height="12" viewBox="0 0 7 6" shape-rendering="crispEdges" aria-hidden="true">' + s + '</svg>'; };
  var charOf = function (id) { return B.CHARS.filter(function (c) { return c.id === id; })[0] || B.CHARS[2]; };
  var api = function () { return window.pywebview && window.pywebview.api; };
  var DOT = { ok: '#5DB86A', warn: '#F2B45A', late: '#E0453A', none: '#B9B3A6' };
  function post(path, body) { return fetch(path, { method: 'POST', headers: { 'X-Token': TOKEN, 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) }).then(function (r) { return r.json(); }); }
  function openApp(hash) { window.open(location.origin + '/#' + hash, 'mm-main'); }
  function panel(acc, ch) {
    return '<div class="panel pxo-box"><div class="out pxo"><div class="in pxo"><div class="ph"><span class="ptitle"><b>' + esc(acc.name) + ' 팀 현황</b><small>' + esc(ch.name) + '가 지켜보는 중</small></span><button class="pxo xbtn" data-close aria-label="패널 닫기">X</button></div>' +
      acc.roles.map(function (r) { return '<div class="prow"><span class="pcode">' + r.code + '</span><span class="ptext">' + esc(r.text) + '</span><i class="pdot" style="background:' + DOT[r.dot] + '" title="' + r.dot + '"></i></div>'; }).join('') +
      '<button class="pxo ov" data-ov="' + esc(acc.id) + '">Overview 열기</button></div></div></div>';
  }
  function render(data, offline) {
    last = data; offlineNow = !!offline;
    curSize = PX[data.size] ? data.size : curSize; document.body.dataset.size = curSize;
    var html = '';
    // 캐릭터가 있는 어카운트만 보인다. 바탕화면 창은 '바탕화면에 표시'가 켜진 것만, 브라우저 미리보기는 캐릭터가 있는 것 모두.
    var list = data.accounts.filter(function (a) { return a.char && (!api() || a.desktop); });
    list.forEach(function (acc) {
      var ch = charOf(acc.char), top = acc.alerts[0], bubble = '';
      var state = offline || data.quiet ? 'sleep' : top ? (top.level === 'urgent' ? 'urgent' : 'alert') : 'work';
      if (offline) bubble = '<div class="idle-b pxo"><span>서버가 꺼져 있어요</span></div>';
      else if (data.quiet) bubble = acc.urgent ? '<button class="badge-u pxo" data-panel="' + esc(acc.id) + '" aria-label="긴급 ' + acc.urgent + '건, 팀 현황 열기">긴급 ' + acc.urgent + '</button>' : '<div class="idle-b pxo"><span>쉬는 중 · zZ</span></div>';
      else if (top) {
        var k = KIND[top.level], msg = VOICE[acc.char][top.level](top.text);
        bubble = '<div class="bubble pop" style="--bg:' + k.bg + '">' + (acc.alerts.length > 1 ? '<span class="plus pxo">+' + (acc.alerts.length - 1) + '</span>' : '') +
          '<div class="out pxr"><div class="in pxr" style="background:' + k.bg + '"><div class="hd">' + icon(top.level) + '<span style="color:' + k.color + '">' + esc(ch.name) + ' · ' + k.label + '</span>' + (top.tag ? '<span class="tagl">' + esc(top.tag) + '</span>' : '') + (top.sample ? '<span class="ex">예시</span>' : '') + '<span class="code">' + esc(acc.name) + (top.role ? '·' + esc(top.role) : '') + '</span></div>' +
          '<div class="msg">' + esc(msg) + '</div><div class="btns"><button class="pxo" style="background:' + k.btn + '" data-go="' + esc(acc.id) + '|' + esc(top.tab) + '|' + esc(top.sub || '') + '">' + k.go + '</button><button class="pxo later" data-later="' + esc(acc.id) + '|' + esc(top.id) + '">이따가</button></div></div></div>' +
          '<div class="tail"><i></i><i></i><i></i><i></i></div></div>';
      } else bubble = '<div class="idle-b pxo"><span>열일 중 · · ·</span></div>';
      html += '<section class="unit" aria-label="' + esc(acc.name) + ' 버디">' + (openAcc === acc.id ? panel(acc, ch) : '') + bubble +
        '<button class="sprite" data-panel="' + esc(acc.id) + '" aria-label="' + esc(acc.name) + ' 팀 현황 ' + (openAcc === acc.id ? '닫기' : '열기') + '">' + B.render(acc.char, state, { size: spx() }) + '</button><span class="who">' + esc(acc.name) + '</span></section>';
    });
    if (!list.length) {
      if (api()) { api().quit(); return; }           // 바탕화면 창: 띄울 캐릭터가 하나도 없으면 스스로 닫는다
      html = '<section class="unit"><div class="idle-b pxo"><span>미리볼 캐릭터가 없어요 · 캐릭터 설정에서 붙여 주세요</span></div></section>';
    }
    stage.innerHTML = html;
    stage.querySelectorAll('[data-go]').forEach(function (b) { b.onclick = function () { var p = b.dataset.go.split('|'); openApp('acc=' + encodeURIComponent(p[0]) + '&tab=' + encodeURIComponent(p[1]) + (p[2] ? '&sub=' + encodeURIComponent(p[2]) : '')); }; });
    stage.querySelectorAll('[data-ov]').forEach(function (b) { b.onclick = function () { openApp('acc=' + encodeURIComponent(b.dataset.ov) + '&tab=overview'); }; });
    stage.querySelectorAll('[data-panel]').forEach(function (b) { b.onclick = function () { openAcc = openAcc === b.dataset.panel ? '' : b.dataset.panel; render(last, offlineNow); }; });
    stage.querySelectorAll('[data-close]').forEach(function (b) { b.onclick = function () { openAcc = ''; render(last, offlineNow); }; });
    stage.querySelectorAll('[data-later]').forEach(function (b) {
      b.onclick = function () { var p = b.dataset.later.split('|'); post('/api/buddy-snooze', { acc: p[0], id: p[1], minutes: 10 }).then(function () { load(true); }); };   // 서버에 저장 → 새로고침해도 10분간 숨김
    });
    controls(); report();
  }
  function controls() {
    if (!api()) return;
    var c = document.createElement('div'); c.className = 'ctl';
    c.innerHTML = '<button class="pxo" data-hide aria-label="30분 숨기기" title="30분 숨기기">–</button><button class="pxo" data-quit aria-label="버디 닫기" title="버디 닫기">✕</button>';
    stage.appendChild(c);
    c.querySelector('[data-hide]').onclick = function () { api().hide(30); };
    c.querySelector('[data-quit]').onclick = function () { api().quit(); };
  }
  window.addEventListener('pywebviewready', function () { if (last) render(last, offlineNow); });
  /* 바탕화면 창이 캐릭터·말풍선에 딱 맞게 줄고, 투명한 부분은 뒤쪽 창이 눌리도록 눌러도 되는 영역(rects)을 알려 준다. 좌표는 오른쪽 아래 기준 */
  function report() {
    if (!api() || !api().layout) return;
    clearTimeout(rt);
    rt = setTimeout(function () {
      var r = stage.getBoundingClientRect(), rects = [], vw = window.innerWidth, vh = window.innerHeight;
      stage.querySelectorAll('.bubble, .idle-b, .badge-u, .panel, .sprite svg, .who, .ctl button, .plus').forEach(function (el) {
        var b = el.getBoundingClientRect(); if (b.width && b.height) rects.push([b.left - vw, b.top - vh, b.width, b.height]);
      });
      api().layout(Math.ceil(r.width) + 26, Math.ceil(r.height) + 24, rects);
    }, 60);
  }
  if (window.ResizeObserver) new ResizeObserver(report).observe(stage);
  function stamp(d) { return JSON.stringify([d.accounts, d.size, d.quiet]); }   // now 처럼 매번 바뀌는 값은 빼서, 바뀐 게 없으면 다시 그리지 않는다
  function load(force) {
    fetch('/api/buddy', { headers: { 'X-Token': TOKEN } }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (d) {
      if (force || !last || offlineNow || stamp(d) !== stamp(last)) render(d, false);
    }).catch(function () { if (last) render(last, true); else stage.innerHTML = '<section class="unit"><div class="idle-b pxo"><span>서버가 꺼져 있어요</span></div></section>'; });
  }
  document.body.dataset.size = curSize;
  setTimeout(function () {
    if (api()) return;                                   // 바탕화면 창에서는 안내가 필요 없다
    var bn = document.createElement('div'); bn.className = 'banner-pv';
    bn.innerHTML = '<span>바탕화면에 띄우려면 \'버디 띄우기\'를 눌러 주세요</span><button type="button">버디 띄우기</button>';
    bn.querySelector('button').onclick = function () {
      post('/api/buddy-launch', {}).then(function (d) { bn.querySelector('span').textContent = d.error ? d.error : d.none ? d.message : d.started ? '바탕화면에 띄웠어요. 이 미리보기는 닫아도 돼요.' : '이미 실행 중이에요.'; })
        .catch(function () { bn.querySelector('span').textContent = '서버에 연결하지 못했어요.'; });
    };
    document.body.appendChild(bn);
  }, 1200);
  load(); setInterval(load, 30000);
  window.addEventListener('focus', function () { load(); });
})();
