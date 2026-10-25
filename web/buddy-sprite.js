/* 버디 픽셀 캐릭터 (2등신 꼬마, 24×28 격자). docs/mockups/buddy/0-sprite.html 의 presets 와 그리기 코드를 그대로 옮겼다.
   BuddySprite.render(charId, state, { size, portrait }) -> <svg> 문자열.  state: work | alert | urgent | sleep | idle */
(function () {
  'use strict';
  var CHARS = [
    { id: 'leo', name: '레오', concept: '카리스마', tag: '#C9D2FF', desc: '슬릭백에 네이비 수트, 와인색 넥타이. 짧고 굵게 보고하는 리더형', line: '대표님, 컨펌 한 건 대기 중입니다. 지금 보시죠.' },
    { id: 'luna', name: '루나', concept: '멋쟁이', tag: '#F2D9A8', desc: '긴 머리에 선글라스, 크림 트렌치. 감각 좋은 트렌드세터', line: '카피 v2 나왔어요. 꽤 괜찮을걸요? 한 번 봐줘요~' },
    { id: 'momo', name: '모모', concept: '귀여운', tag: '#FFC2D6', desc: '리본 단 단발에 노란 셔츠. 팀 분위기를 살리는 비타민', line: '대표님~! 카피가 기다리고 있어요. 봐주세요 ♡' },
    { id: 'doyun', name: '도윤', concept: '열정', tag: '#FFC9BF', desc: '삐죽머리에 빨간 맨투맨. 데드라인 앞에서 불타는 타입', line: '대표님!! 데드라인 하루 남았어요! 같이 달려요!' },
    { id: 'haru', name: '하루', concept: '차분', tag: '#C6EDE3', desc: '올림머리에 동그란 안경, 민트 니트. 꼼꼼한 정리왕', line: '확인이 필요한 건이 하나 있어요. 시간 될 때 봐주세요.' },
    { id: 'jun', name: '준', concept: '힙', tag: '#E6E3FF', desc: '보라 캡에 오버핏 후드. 트렌드에 제일 빠른 막내', line: '대표님, 새 리퀘스트 들어왔어요. 체크 한 번 가실까요?' }
  ];
  var STATE_NAME = { work: '일하는 중', alert: '확인 필요', urgent: '긴급', sleep: '쉬는 중', idle: '대기' };
  var presets = {
    leo:   { name: '레오', hair: 'slick', H: '#3A2E52', h: '#6A5A92', S: '#F7D6BC', F: '#2E3A6B', f: '#222B52', A: '#D04466', N: '#3A4A80', brows: true, acc: '',
             accent: [['W', [[9,17],[10,17],[13,17],[14,17]]], ['A', [[11,17],[12,17],[11,18],[12,18],[11,19],[12,19],[11,20],[12,20]]]] },
    luna:  { name: '루나', hair: 'long', H: '#9A5A43', h: '#C88262', S: '#FADDC8', F: '#EBD6B4', f: '#C9A97F', A: '#7A4A26', N: '#5B4636', acc: 'shades',
             accent: [['f', [[10,17],[13,17],[10,18],[13,18]]], ['A', [[7,21],[8,21],[9,21],[10,21],[11,21],[12,21],[13,21],[14,21],[15,21],[16,21],[9,19],[14,19]]]] },
    momo:  { name: '모모', hair: 'bob', H: '#EE9A4E', h: '#FFC98A', S: '#FDE3D0', F: '#FFD45E', f: '#E8B53A', A: '#FFFFFF', N: '#6C8FD6', acc: 'bow',
             accent: [['W', [[9,17],[10,17],[13,17],[14,17],[12,19],[12,21]]]] },
    doyun: { name: '도윤', hair: 'spiky', H: '#5A3427', h: '#8A5540', S: '#F4CDAE', F: '#E2574A', f: '#B8402F', A: '#FFFFFF', N: '#3A3F5C', brows: true, acc: '',
             accent: [['W', [[7,20],[8,20],[9,20],[10,20],[11,20],[12,20],[13,20],[14,20],[15,20],[16,20]]]] },
    haru:  { name: '하루', hair: 'bun', H: '#3B2C25', h: '#634A3B', S: '#F8DCC6', F: '#8FD3C1', f: '#62B19D', A: '#FFFFFF', N: '#5B5F73', acc: 'glasses',
             accent: [['W', [[10,17],[11,17],[12,17],[13,17]]], ['f', [[9,20],[14,19],[12,21]]]] },
    jun:   { name: '준', hair: 'cap', H: '#3A2E52', h: '#3A2E52', S: '#EDC4A0', F: '#9C98F2', f: '#7A75DE', A: '#FFE08A', N: '#4A4060', acc: '', cap: '#4C46B8', capD: '#36318F',
             accent: [['A', [[10,18],[10,19],[13,18],[13,19]]], ['f', [[9,21],[10,21],[11,21],[12,21],[13,21],[14,21]]]] }
  };
  var CSS = '@keyframes pxBob{0%{transform:translateY(0)}50%{transform:translateY(-1px)}100%{transform:translateY(0)}}' +
    '@keyframes pxHop{0%,60%,100%{transform:translateY(0)}70%{transform:translateY(-2px)}80%{transform:translateY(0)}90%{transform:translateY(-1px)}}' +
    '@keyframes pxBlink{0%,100%{opacity:1}50%{opacity:0}}' +
    '.px-bob{animation:pxBob 1.2s steps(1,end) infinite}.px-hop{animation:pxHop 1.4s steps(1,end) infinite}.px-blink{animation:pxBlink .8s steps(1,end) infinite}' +
    '@media (prefers-reduced-motion: reduce){.px-bob,.px-hop,.px-blink{animation:none}}';
  function ensureStyle() {
    if (typeof document === 'undefined' || document.getElementById('buddy-sprite-css')) return;
    var s = document.createElement('style'); s.id = 'buddy-sprite-css'; s.textContent = CSS; document.head.appendChild(s);
  }
  function render(charId, state, opts) {
    ensureStyle();
    opts = opts || {};
    var c = presets[charId] || presets.momo;
    state = state || 'idle';
    var portrait = !!opts.portrait, size = Number(opts.size || 180);
    var pal = { O: '#2B2140', E: '#2B2140', W: '#FFFFFF', P: '#FF9BB5', M: '#C2456A', K: '#1E1A2B',
      L: '#4A4C6A', l: '#8E91B8', D: '#34354F', R: '#E0453A', B: '#5B55E0', C: '#7CC8FF', Z: '#6C66E8',
      H: c.H, h: c.h, S: c.S, F: c.F, f: c.f, A: c.A, N: c.N, Q: c.cap || '#4C46B8', q: c.capD || '#36318F', p: '#FF7FA8', r: '#D94D86' };
    var WD = 24, HT = 28, g = [], fxg = [], y, x;
    for (y = 0; y < HT; y++) { g.push([]); fxg.push([]); for (x = 0; x < WD; x++) { g[y].push('.'); fxg[y].push('.'); } }
    var put = function (grid, px, py, v) { if (px >= 0 && px < WD && py >= 0 && py < HT) grid[py][px] = v; };
    var row = function (grid, py, x0, x1, v) { for (var i = x0; i <= x1; i++) put(grid, i, py, v); };
    var dots = function (grid, list, v) { list.forEach(function (d) { put(grid, d[0], d[1], v); }); };

    if (c.hair === 'long') { for (y = 8; y <= 21; y++) { row(g, y, 3, 5, 'H'); row(g, y, 18, 20, 'H'); } }
    row(g, 17, 8, 15, 'F');
    for (y = 18; y <= 22; y++) { row(g, y, 7, 16, 'F'); put(g, 7, y, 'f'); put(g, 16, y, 'f'); }
    dots(g, [[6, 18], [6, 19], [17, 18], [17, 19]], 'F');
    for (y = 23; y <= 24; y++) { row(g, y, 8, 10, 'N'); row(g, y, 13, 15, 'N'); }
    row(g, 25, 7, 10, 'K'); row(g, 25, 13, 16, 'K');
    c.accent.forEach(function (a) { dots(g, a[1], a[0]); });

    row(g, 5, 7, 16, 'S'); row(g, 6, 6, 17, 'S');
    for (y = 7; y <= 14; y++) row(g, y, 5, 18, 'S');
    row(g, 15, 6, 17, 'S'); row(g, 16, 7, 16, 'S');

    var hair = c.hair;
    if (hair === 'slick') {
      row(g, 2, 9, 14, 'H'); row(g, 3, 7, 16, 'H'); row(g, 4, 5, 18, 'H'); row(g, 5, 4, 19, 'H');
      row(g, 6, 4, 11, 'H'); row(g, 6, 16, 19, 'H'); row(g, 7, 4, 6, 'H'); row(g, 7, 17, 19, 'H');
      dots(g, [[4, 8], [5, 8], [18, 8], [19, 8], [7, 7]], 'H');
      dots(g, [[10, 3], [11, 3], [12, 3], [7, 4], [8, 4], [6, 5]], 'h');
    } else if (hair === 'bob' || hair === 'long') {
      row(g, 2, 8, 15, 'H'); row(g, 3, 6, 17, 'H'); row(g, 4, 5, 18, 'H'); row(g, 5, 4, 19, 'H'); row(g, 6, 4, 19, 'H');
      if (hair === 'bob') {
        row(g, 7, 4, 7, 'H'); row(g, 7, 10, 11, 'H'); row(g, 7, 13, 14, 'H'); row(g, 7, 16, 19, 'H');
        for (y = 8; y <= 14; y++) { row(g, y, 4, 5, 'H'); row(g, y, 18, 19, 'H'); }
        row(g, 15, 4, 6, 'H'); row(g, 15, 17, 19, 'H');
      } else {
        row(g, 7, 4, 10, 'H'); row(g, 7, 17, 19, 'H'); row(g, 8, 4, 7, 'H');
        for (y = 9; y <= 16; y++) { row(g, y, 4, 5, 'H'); row(g, y, 18, 19, 'H'); }
      }
      dots(g, [[9, 3], [10, 3], [7, 4], [8, 4], [6, 5]], 'h');
    } else if (hair === 'spiky') {
      dots(g, [[8, 0], [15, 0]], 'H'); row(g, 1, 7, 9, 'H'); row(g, 1, 11, 12, 'H'); row(g, 1, 14, 16, 'H');
      row(g, 2, 6, 17, 'H'); row(g, 3, 5, 18, 'H'); row(g, 4, 4, 19, 'H'); row(g, 5, 4, 19, 'H'); row(g, 6, 4, 19, 'H');
      row(g, 7, 4, 5, 'H'); row(g, 7, 7, 8, 'H'); row(g, 7, 11, 12, 'H'); row(g, 7, 15, 16, 'H'); row(g, 7, 18, 19, 'H');
      dots(g, [[4, 8], [19, 8], [4, 9], [19, 9]], 'H');
      dots(g, [[8, 1], [8, 2], [9, 2], [7, 3], [6, 4]], 'h');
    } else if (hair === 'bun') {
      row(g, 0, 11, 12, 'H'); row(g, 1, 10, 13, 'H'); row(g, 2, 10, 13, 'H');
      row(g, 3, 6, 17, 'H'); row(g, 4, 5, 18, 'H'); row(g, 5, 4, 19, 'H');
      row(g, 6, 4, 10, 'H'); row(g, 6, 13, 19, 'H'); row(g, 7, 4, 6, 'H'); row(g, 7, 17, 19, 'H');
      for (y = 8; y <= 11; y++) { row(g, y, 4, 5, 'H'); row(g, y, 18, 19, 'H'); }
      dots(g, [[11, 1], [7, 4], [8, 4], [6, 5]], 'h');
    } else if (hair === 'cap') {
      for (y = 7; y <= 10; y++) { row(g, y, 4, 5, 'H'); row(g, y, 18, 19, 'H'); }
      row(g, 7, 6, 8, 'H');
      row(g, 2, 7, 16, 'Q'); row(g, 3, 5, 18, 'Q'); row(g, 4, 4, 19, 'Q'); row(g, 5, 4, 19, 'Q'); row(g, 6, 3, 20, 'q');
      dots(g, [[11, 3], [12, 3], [11, 4], [12, 4]], 'A');
      dots(g, [[7, 3], [6, 4]], 'h');
    }
    if (c.acc === 'bow') {
      dots(g, [[15, 0], [15, 1], [15, 2], [15, 3], [16, 1], [16, 2], [20, 0], [20, 1], [20, 2], [20, 3], [19, 1], [19, 2]], 'p');
      dots(g, [[17, 1], [18, 1], [17, 2], [18, 2]], 'r');
    }

    dots(g, [[6, 13], [7, 13], [16, 13], [17, 13]], 'P');
    if (state === 'urgent') {
      dots(g, [[8, 10], [9, 11], [8, 12], [15, 10], [14, 11], [15, 12]], 'E');
    } else if (state === 'sleep') {
      dots(g, [[7, 11], [8, 12], [9, 12], [10, 11], [13, 11], [14, 12], [15, 12], [16, 11]], 'E');
    } else {
      dots(g, [[8, 10], [9, 10], [8, 11], [9, 11], [8, 12], [9, 12], [14, 10], [15, 10], [14, 11], [15, 11], [14, 12], [15, 12]], 'E');
      dots(g, [[8, 10], [14, 10]], 'W');
      if (state === 'alert') dots(g, [[9, 12], [15, 12]], 'W');
    }
    if (c.brows && state !== 'sleep') { dots(g, [[7, 8], [8, 8], [9, 9], [16, 8], [15, 8], [14, 9]], 'H'); }
    if (state === 'alert') { dots(g, [[11, 13], [12, 13], [11, 14], [12, 14]], 'M'); }
    else if (state === 'urgent') { dots(g, [[10, 14], [11, 13], [12, 14], [13, 13]], 'E'); }
    else if (state === 'sleep') { dots(g, [[11, 14], [12, 14]], 'E'); }
    else { dots(g, [[10, 13], [11, 14], [12, 14], [13, 13]], 'M'); }

    if (c.acc === 'shades') {
      row(g, 10, 7, 10, 'K'); row(g, 11, 7, 10, 'K'); row(g, 12, 8, 9, 'K');
      row(g, 10, 13, 16, 'K'); row(g, 11, 13, 16, 'K'); row(g, 12, 14, 15, 'K');
      dots(g, [[11, 10], [12, 10]], 'K'); dots(g, [[8, 10], [14, 10]], 'W');
    }
    if (c.acc === 'glasses') {
      row(g, 9, 7, 10, 'K'); row(g, 13, 7, 10, 'K'); row(g, 9, 13, 16, 'K'); row(g, 13, 13, 16, 'K');
      for (y = 10; y <= 12; y++) { put(g, 7, y, 'K'); put(g, 10, y, 'K'); put(g, 13, y, 'K'); put(g, 16, y, 'K'); }
      dots(g, [[11, 11], [12, 11]], 'K');
    }

    if (!portrait) {
      if (state === 'work') {
        for (y = 19; y <= 21; y++) row(g, y, 8, 15, 'L');
        row(g, 19, 9, 14, 'l'); dots(g, [[11, 20], [12, 20]], 'l');
        row(g, 22, 7, 16, 'D');
        dots(g, [[7, 21], [16, 21]], 'S');
        dots(fxg, [[20, 19], [21, 18], [20, 22], [21, 23]], 'Z');
      } else if (state === 'alert') {
        put(g, 17, 18, '.'); put(g, 17, 19, '.');
        dots(g, [[17, 17], [18, 16], [19, 15]], 'F'); dots(g, [[19, 13], [20, 13], [19, 14], [20, 14]], 'S');
        dots(g, [[6, 20]], 'S');
        for (y = 0; y <= 6; y++) row(fxg, y, 0, 4, 'B');
        dots(fxg, [[2, 1], [2, 2], [2, 3], [2, 5]], 'W');
      } else if (state === 'urgent') {
        dots(g, [[6, 20], [17, 20]], 'S');
        dots(g, [[21, 8], [20, 9], [21, 9], [20, 10], [21, 10]], 'C');
        for (y = 0; y <= 6; y++) row(fxg, y, 0, 6, 'R');
        dots(fxg, [[2, 1], [2, 2], [2, 3], [2, 5], [4, 1], [4, 2], [4, 3], [4, 5]], 'W');
      } else if (state === 'sleep') {
        dots(g, [[6, 20], [17, 20]], 'S');
        dots(fxg, [[0, 0], [1, 0], [2, 0], [3, 0], [2, 1], [1, 2], [0, 3], [1, 3], [2, 3], [3, 3]], 'Z');
        dots(fxg, [[1, 5], [2, 5], [3, 5], [2, 6], [1, 7], [2, 7], [3, 7]], 'Z');
      } else {
        dots(g, [[6, 20], [17, 20]], 'S');
      }
    }

    var filled = function (yy, xx) { return yy >= 0 && yy < HT && xx >= 0 && xx < WD && g[yy][xx] !== '.'; };
    var outl = [];
    for (y = 0; y < HT; y++) for (x = 0; x < WD; x++) {
      if (g[y][x] === '.' && (filled(y - 1, x) || filled(y + 1, x) || filled(y, x - 1) || filled(y, x + 1))) outl.push([x, y]);
    }
    outl.forEach(function (d) { g[d[1]][d[0]] = 'O'; });

    var rects = function (grid, maxY, w) {
      var out = '';
      for (var yy = 0; yy < Math.min(HT, maxY); yy++) for (var xx = 0; xx < WD; xx++) { var v = grid[yy][xx]; if (v !== '.') out += '<rect x="' + xx + '" y="' + yy + '" width="' + w + '" height="' + w + '" fill="' + pal[v] + '"/>'; }
      return out;
    };
    var shadow = '';
    if (!portrait) for (x = 7; x <= 16; x++) shadow += '<rect x="' + x + '" y="27" width="1" height="1" fill="#1B1A4B33"/>';
    var w = portrait ? size : Math.round(size * 24 / 28), h = portrait ? Math.round(size * 19 / 20) : size;
    var bob = portrait ? '' : (state === 'alert' || state === 'urgent' ? 'px-hop' : 'px-bob');
    return '<svg width="' + w + '" height="' + h + '" viewBox="' + (portrait ? '2 -1 20 19' : '0 0 24 28') + '" shape-rendering="crispEdges" role="img" aria-label="' +
      c.name + ' 픽셀 캐릭터 · ' + (STATE_NAME[state] || '') + '">' + shadow + '<g class="' + bob + '">' + rects(g, portrait ? 18 : HT, 1.02) +
      '<g class="px-blink">' + (portrait ? '' : rects(fxg, HT, 1.02)) + '</g></g></svg>';
  }
  window.BuddySprite = { CHARS: CHARS, STATE_NAME: STATE_NAME, render: render };
})();
