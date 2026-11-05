/* 게임 제작실 — 한 화면 게임 만들기. 셈제작소 · 2026-11-05.
   내 게임 만들기, AI 게임 시험대(요청 카드 복사 → 학교 계정 AI → 받은 코드를 기본 검사 뒤 막힌 상자(sandbox iframe)에서 실행),
   숨은 버그 판 A~D, 같은 길로 다시 실행, 시험 길 4개. 입력은 이 기기 브라우저에만 저장하고 밖으로 보내지 않는다. */
(function () {
'use strict';
const N = 6, MAX_ROUTE = 300, MAX_STARS = 5, MAX_WALLS = 12;
const DIRS = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] };
const ARROW = { U: '↑', D: '↓', L: '←', R: '→' };
const PRESETS = {
  easy: { walls: [], stars: [5, 10, 20, 29, 35] },
  normal: { walls: [7, 8, 13, 22], stars: [5, 10, 20, 29, 35] },
  hard: { walls: [7, 8, 13, 16, 22, 25, 26, 27], stars: [5, 10, 20, 29, 35] }
};
const BUG_MAP = { walls: [7, 8, 10, 16, 18, 20, 26, 28], stars: [3, 14, 23, 30], goal: 3, seconds: 90 };
const CORRECT = { block: 'wallEdge', add: 1, again: 'no', win: 'gte' };
const BUGS = { A: ['add', 2], B: ['again', 'yes'], C: ['block', 'edge'], D: ['win', 'gt'] };
const CODE_OPTS = {
  block: [['wallEdge', '다음 칸이 벽이거나 판 밖이면'], ['edge', '다음 칸이 판 밖이면']],
  add: [[1, '점수 + 1'], [2, '점수 + 2']],
  again: [['no', '점수를 주지 않는다'], ['yes', '점수를 또 준다']],
  win: [['gte', '이길 점수와 같거나 크면'], ['gt', '이길 점수보다 크면']]
};
const RULE_CARD = ['방향 버튼을 누르면 한 칸씩 움직여요.', '벽(■)과 판 밖으로는 갈 수 없어요.', '별(★) 하나를 먹으면 1점이에요.', '이미 먹은 별은 다시 점수가 되지 않아요.', '3점이 되면 성공! 게임이 끝나요.', '90초가 지나면 실패! 게임이 끝나요.'];
const TESTS = [
  { line: 3, name: '점수 시험', route: 'RRR', desc: '별 하나를 먹으면 1점인가?', pass: (r) => r.score === 1 },
  { line: 4, name: '같은 별 시험', route: 'RRRLR', desc: '먹은 별에 다시 들어가도 점수가 그대로인가?', pass: (r, sim) => r.score === sim('RRR').score },
  { line: 2, name: '벽 시험', route: 'RD', desc: '벽 쪽으로 가면 멈추는가?', pass: (r) => r.x === 1 && r.y === 0 },
  { line: 5, name: '끝나는 점수 시험', route: 'RRRDDLRDRR', desc: '3점이 되면 게임이 끝나는가?', pass: (r) => r.phase === 'won' }
];
const CHECKS = [['edge', '판 밖으로 가 보기'], ['wall', '벽 쪽으로 가 보기'], ['again', '먹은 별에 다시 들어가기'], ['end', '이길 점수·시간이 되면 끝나는지']];

const esc = (x) => String(x == null ? '' : x).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const str = (x, n) => (typeof x === 'string' ? x.slice(0, n) : '');
const int = (x, min, max, f) => (Number.isInteger(x) && x >= min && x <= max ? x : f);
const routeOk = (x) => (typeof x === 'string' && /^[UDLR]{0,300}$/.test(x) ? x : '');
const cellList = (a, max) => (Array.isArray(a) ? [...new Set(a.filter((v) => Number.isInteger(v) && v > 0 && v < N * N))].slice(0, max) : null);
const randomLetter = () => 'ABCD'[Math.floor(Math.random() * 4)];
const bugCode = (letter) => { const c = { ...CORRECT }; const b = BUGS[letter]; if (b) c[b[0]] = b[1]; return c; };
const arrows = (route) => { if (!route) return '—'; const out = []; let i = 0; while (i < route.length) { let j = i; while (j < route.length && route[j] === route[i]) j++; out.push(ARROW[route[i]] + (j - i > 1 ? '×' + (j - i) : '')); i = j; } return out.join(' '); };
const where = (s) => `${s.y + 1}행 ${s.x + 1}열`;

function defaults() {
  const letter = randomLetter();
  return {
    title: '', ruleWin: '', ruleLose: '', ruleScore: '', goal: 3, seconds: 60, points: 1,
    walls: [...PRESETS.normal.walls], stars: [...PRESETS.normal.stars],
    checks: { edge: '', wall: '', again: '', end: '' }, checkNotes: { edge: '', wall: '', again: '', end: '' },
    runs: [],
    bug: { letter, code: bugCode(letter), repro: { route: '', rule: 0, expect: '', actual: '', replayed: false, differs: false }, request: '', verified: false, suite: null },
    reflectFix: '', reflectLeft: '', reflectNext: '',
    ai: aiDefaults()
  };
}
/* ── AI 게임 시험대 ── */
const AI_BY = [['self', '우리 태블릿에서 직접'], ['station', '선생님 기기에 우리가 가서 직접'], ['teacher', '선생님이 대신 입력'], ['sample', '미리 준비한 예시'], ['none', '사용하지 않음']];
const VERDICT = [['win', '규칙 1 · 성공'], ['lose', '규칙 2 · 실패'], ['score', '규칙 3 · 점수'], ['wall', '벽 · 판 밖에서 멈춤'], ['again', '먹은 별 다시 들어가기']];
const AI_RULES = [['1', '규칙 1 · 성공'], ['2', '규칙 2 · 실패'], ['3', '규칙 3 · 점수'], ['wall', '벽 · 판 밖'], ['again', '먹은 별']];
const MAX_CODE = 40000;
function aiDefaults() { return { by: '', card: '1', slot: 1, code1: '', code2: '', src1: '', src2: '', verdict: { win: '', lose: '', score: '', wall: '', again: '' }, route: '', rule: '', expect: '', actual: '', said: '', after: '' }; }
function normalizeAi(raw) {
  const a = aiDefaults(), r = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  if (AI_BY.some(([k]) => k === r.by)) a.by = r.by;
  if (['1', '2', '2b', '3'].includes(r.card)) a.card = r.card;
  a.slot = r.slot === 2 ? 2 : 1;
  a.code1 = str(r.code1, MAX_CODE); a.code2 = str(r.code2, MAX_CODE);
  ['src1', 'src2'].forEach((k) => { if (['', 'ai', 'sample'].includes(r[k])) a[k] = r[k]; });
  if (r.verdict && typeof r.verdict === 'object') VERDICT.forEach(([k]) => { if (['', 'ok', 'diff', 'na'].includes(r.verdict[k])) a.verdict[k] = r.verdict[k]; });
  a.route = routeOk(r.route).slice(0, 60);
  if (AI_RULES.some(([k]) => k === r.rule)) a.rule = r.rule;
  a.expect = str(r.expect, 200); a.actual = str(r.actual, 200); a.said = str(r.said, 200);
  if (['', 'same', 'diff', 'na'].includes(r.after)) a.after = r.after;
  return a;
}
/* 받은 코드 기본 검사 — 막는 것(외부 연결·저장·창 열기)과 알리는 것(글 쓰는 칸) */
function cleanCode(raw) {
  let c = String(raw || '').trim();
  const fence = c.match(/```(?:html|HTML)?\s*\n([\s\S]*?)```/);
  if (fence) c = fence[1].trim();
  return c.slice(0, MAX_CODE);
}
function scanCode(code) {
  const block = [], warn = [];
  if (!code) return { block: ['붙여 넣은 코드가 없어요.'], warn };
  if (!/<(html|body|script|canvas|div|style)\b/i.test(code)) block.push('HTML 코드가 아닌 것 같아요. AI 답에서 코드 부분만 복사해요.');
  const noNs = code.replace(/https?:\/\/www\.w3\.org\/[\w./-]*/gi, '');
  if (/https?:\/\//i.test(noNs) || /(src|href)\s*=\s*["']?\/\//i.test(code)) block.push('인터넷 주소(http)가 들어 있어요.');
  if (/<script[^>]*\ssrc\s*=/i.test(code) || /<link[^>]*\shref\s*=/i.test(code)) block.push('바깥 파일을 불러오는 줄이 있어요.');
  if (/\bfetch\s*\(|XMLHttpRequest|WebSocket|EventSource|sendBeacon|\bimport\s*\(|^\s*import\s/m.test(code)) block.push('인터넷으로 무언가를 주고받는 코드가 있어요.');
  if (/localStorage|sessionStorage|indexedDB|document\.cookie/.test(code)) block.push('기기에 저장하는 코드가 있어요.');
  if (/<(iframe|object|embed|form|base)\b/i.test(code) || /window\.open\s*\(|\blocation\b|\.navigate\s*\(|history\.(push|replace)State/.test(code)
      || /<meta[^>]*http-equiv\s*=\s*["']?refresh/i.test(code) || /<a\b[^>]*\bhref\s*=\s*["']?(?!#)/i.test(code)) block.push('다른 화면을 열거나 다른 곳으로 넘어가는 코드가 있어요.');
  if (/<textarea\b|<input[^>]*type\s*=\s*["']?(text|email|tel|search)|<input(?![^>]*type=)[^>]*>|\bprompt\s*\(/i.test(code)) warn.push('글을 쓰는 칸이 있어요. 이름·학교는 쓰지 않아요.');
  if (code.length >= MAX_CODE) warn.push('코드가 길어서 뒷부분이 잘렸을 수 있어요.');
  return { block, warn };
}
const SANDBOX_CSP = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; media-src data: blob:; connect-src 'none'; form-action 'none'; base-uri 'none'";
function sandboxDoc(code) {
  const meta = `<meta http-equiv="Content-Security-Policy" content="${SANDBOX_CSP}">`;
  // CSP는 받은 코드를 보기 전에 문서 맨 앞에 둔다(주석·<header> 같은 글자에 흔들리지 않게). 받은 코드의 doctype만 떼어 낸다.
  const rest = String(code).replace(/^\uFEFF?\s*<!doctype[^>]*>/i, '');
  return '<!doctype html><html><head><meta charset="utf-8">' + meta + '</head>' + rest;
}
function normalize(raw) {
  const d = defaults(), r = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  d.title = str(r.title, 40);
  ['ruleWin', 'ruleLose', 'ruleScore'].forEach((k) => (d[k] = str(r[k], 120)));
  ['reflectFix', 'reflectLeft', 'reflectNext'].forEach((k) => (d[k] = str(r[k], 600)));
  d.goal = int(r.goal, 1, 15, 3); d.seconds = int(r.seconds, 10, 180, 60); d.points = int(r.points, 1, 3, 1);
  const w = cellList(r.walls, MAX_WALLS), s = cellList(r.stars, MAX_STARS);
  if (w) d.walls = w;
  if (s) d.stars = s.filter((c) => !d.walls.includes(c));
  if (r.checks && typeof r.checks === 'object') CHECKS.forEach(([k]) => { if (['', 'ok', 'odd'].includes(r.checks[k])) d.checks[k] = r.checks[k]; });
  if (r.checkNotes && typeof r.checkNotes === 'object') CHECKS.forEach(([k]) => (d.checkNotes[k] = str(r.checkNotes[k], 80)));
  d.runs = Array.isArray(r.runs) ? r.runs.slice(-12).map(cleanRun).filter(Boolean) : [];
  const b = r.bug && typeof r.bug === 'object' ? r.bug : {};
  if (BUGS[b.letter]) d.bug.letter = b.letter;
  const code = bugCode(d.bug.letter);
  if (b.code && typeof b.code === 'object') Object.keys(CODE_OPTS).forEach((k) => { const v = CODE_OPTS[k].map((o) => o[0]); if (v.includes(b.code[k])) code[k] = b.code[k]; });
  d.bug.code = code;
  const rp = b.repro && typeof b.repro === 'object' ? b.repro : {};
  d.bug.repro = { route: routeOk(rp.route), rule: int(rp.rule, 0, 6, 0), expect: str(rp.expect, 200), actual: str(rp.actual, 200), replayed: rp.replayed === true, differs: rp.differs === true };
  d.bug.request = str(b.request, 300); d.bug.verified = b.verified === true;
  d.bug.suite = Array.isArray(b.suite) && b.suite.length === TESTS.length ? b.suite.map((v) => v === true) : null;
  d.ai = normalizeAi(r.ai);
  return d;
}
function cleanRun(r) {
  if (!r || typeof r !== 'object' || Array.isArray(r)) return null;
  return { board: r.board === 'bug' ? 'bug' : 'mine', route: routeOk(r.route), score: int(r.score, 0, 999, 0), left: int(r.left, 0, MAX_STARS, 0), end: str(r.end, 20), at: str(r.at, 40), letter: BUGS[r.letter] ? r.letter : '' };
}

/* ── 게임 규칙(순수 함수) ── */
function makeState(cfg) { return { x: 0, y: 0, score: 0, eaten: [], route: '', bumps: 0, phase: 'running' }; }
function step(s, dir, cfg) {
  if (s.phase !== 'running' || !DIRS[dir]) return s;
  if (s.route.length >= MAX_ROUTE) return s;
  s.route += dir;
  const x = s.x + DIRS[dir][0], y = s.y + DIRS[dir][1], cell = y * N + x;
  const out = x < 0 || x >= N || y < 0 || y >= N;
  if (out || (cfg.code.block === 'wallEdge' && cfg.walls.includes(cell))) { s.bumps++; return s; }
  s.x = x; s.y = y;
  if (cfg.stars.includes(cell)) {
    const had = s.eaten.includes(cell);
    if (!had) s.score += Number(cfg.code.add);
    if (!had && cfg.code.again === 'no') s.eaten.push(cell); // again='yes'(버그 B): 먹은 별을 기억하지 않아 다시 점수가 되고 별도 남는다
  }
  if (cfg.code.win === 'gte' ? s.score >= cfg.goal : s.score > cfg.goal) s.phase = 'won';
  return s;
}
function simulate(cfg, route) { const s = makeState(cfg); for (const c of route) step(s, c, cfg); return s; }
const starsLeft = (s, cfg) => cfg.stars.filter((c) => !s.eaten.includes(c)).length;
const sameResult = (a, b, cfg) => a.x === b.x && a.y === b.y && a.score === b.score && a.phase === b.phase && starsLeft(a, cfg) === starsLeft(b, cfg);
function reachable(walls) { // 시작 칸에서 갈 수 있는 칸
  const seen = new Set([0]), q = [0];
  while (q.length) { const c = q.shift(), x = c % N, y = Math.floor(c / N); for (const [dx, dy] of Object.values(DIRS)) { const nx = x + dx, ny = y + dy, n = ny * N + nx; if (nx >= 0 && nx < N && ny >= 0 && ny < N && !walls.includes(n) && !seen.has(n)) { seen.add(n); q.push(n); } } }
  return seen;
}
const mineCfg = (d) => ({ walls: d.walls, stars: d.stars, goal: d.goal, seconds: d.seconds, code: { ...CORRECT, add: d.points } });
const bugCfg = (code) => ({ walls: BUG_MAP.walls, stars: BUG_MAP.stars, goal: BUG_MAP.goal, seconds: BUG_MAP.seconds, code });
function runSuite(code) { const cfg = bugCfg(code), sim = (rt) => simulate(cfg, rt); return TESTS.map((t) => t.pass(sim(t.route), sim)); }
function mapProblems(d) {
  const out = [], reach = reachable(d.walls), cut = d.stars.filter((c) => !reach.has(c)).length;
  if (!d.stars.length) out.push('별이 하나도 없어요. 별을 1개 이상 놓아 주세요.');
  if (cut) out.push(`갈 수 없는 별이 ${cut}개 있어요. 벽을 옮겨 길을 열어 주세요.`);
  if (d.stars.length * d.points < d.goal) out.push(`별을 다 먹어도 ${d.stars.length * d.points}점이라 이길 점수 ${d.goal}점에 못 닿아요.`);
  return out;
}

/* ── 판 그리기와 실제 플레이 ── */
function Board(host, o) {
  let s = null, timer = null, remaining = 0, last = 0, anim = null, view = null, disposed = false;
  host.innerHTML = `<div class="ghud"><strong data-k="score"></strong><strong data-k="time"></strong></div>
    <div class="gstage" tabindex="0" role="group" aria-label="${esc(o.label)} 게임판. 방향키나 W·A·S·D로 움직여요."><div class="gboard"></div></div>
    <p class="gstate small" role="status" aria-live="polite"></p>
    <div class="gpad" aria-label="방향 버튼"><button type="button" class="button u" data-dir="U" aria-label="위로 한 칸">↑</button><button type="button" class="button l" data-dir="L" aria-label="왼쪽으로 한 칸">←</button><button type="button" class="button d" data-dir="D" aria-label="아래로 한 칸">↓</button><button type="button" class="button r" data-dir="R" aria-label="오른쪽으로 한 칸">→</button></div>
    <div class="gctl"><button type="button" class="button primary" data-g="start">시작</button><button type="button" class="button" data-g="pause">일시정지</button><button type="button" class="button" data-g="stop">끝내고 기록</button></div>`;
  const q = (sel) => host.querySelector(sel);
  const active = () => !!s && (s.phase === 'running' || s.phase === 'paused');
  function clear() { if (timer !== null) { clearInterval(timer); timer = null; } }
  function draw() {
    if (disposed) return;
    const cfg = o.cfg(), st = view || s || makeState(cfg), editing = !active() && !anim && o.editable && o.editable();
    q('[data-k="score"]').textContent = `점수 ${st.score} / 이길 점수 ${cfg.goal}`;
    q('[data-k="time"]').textContent = anim ? '다시 실행 중' : `남은 시간 ${Math.ceil(s ? remaining : cfg.seconds)}초`;
    const cells = [];
    for (let i = 0; i < N * N; i++) {
      const wall = cfg.walls.includes(i), star = cfg.stars.includes(i) && !st.eaten.includes(i), me = i === st.y * N + st.x;
      const label = `${Math.floor(i / N) + 1}행 ${(i % N) + 1}열 ${i === 0 ? '시작 칸' : wall ? '벽' : star ? '별' : '빈칸'}`;
      const inner = me ? '<span class="me">●</span>' : star ? '<span class="st">★</span>' : i === 0 ? '<span class="sp">S</span>' : '';
      const cls = `gcell${wall ? ' wall' : ''}${me && wall ? ' hit' : ''}`;
      cells.push(editing && i !== 0 ? `<button type="button" class="${cls}" data-cell="${i}" aria-label="${label}. 눌러서 바꾸기">${inner}</button>` : `<div class="${cls}" aria-hidden="true">${inner}</div>`);
    }
    q('.gboard').innerHTML = cells.join('');
    q('.gboard').classList.toggle('editing', !!editing);
    const left = cfg.stars.filter((c) => !st.eaten.includes(c)).length;
    q('.gstate').textContent = anim ? `같은 길 다시 실행 중… 위치 ${where(st)} · 남은 별 ${left}개`
      : !s ? (editing ? '판을 눌러 벽·별을 놓을 수 있어요. 준비되면 ‘시작’.' : '‘시작’을 누르고 방향키나 아래 버튼으로 움직여요.')
      : s.phase === 'won' ? `성공! 게임 끝 · 위치 ${where(s)} · 남은 별 ${left}개`
      : s.phase === 'lost' ? `시간 끝 · 게임 끝 · 남은 별 ${left}개`
      : s.phase === 'paused' ? '일시정지 · ‘이어 하기’를 누르세요.'
      : s.phase === 'stopped' ? `직접 끝냄 · 위치 ${where(s)} · 남은 별 ${left}개`
      : `플레이 중 · 위치 ${where(s)} · 남은 별 ${left}개 · 누른 횟수 ${s.route.length}`;
    q('[data-g="start"]').disabled = active() || !!anim;
    q('[data-g="pause"]').disabled = !active();
    q('[data-g="stop"]').disabled = !active();
    q('[data-g="pause"]').textContent = s && s.phase === 'paused' ? '이어 하기' : '일시정지';
    host.querySelectorAll('[data-dir]').forEach((b) => (b.disabled = !s || s.phase !== 'running'));
    if (o.onDraw) o.onDraw();
  }
  function finish(reason) {
    clear(); if (!s) return;
    const cfg = o.cfg();
    o.onFinish({ route: s.route, score: s.score, left: starsLeft(s, cfg), end: reason, at: new Date().toISOString() });
    draw();
  }
  function tick() {
    if (!s || s.phase !== 'running') return;
    const now = Date.now(); remaining = Math.max(0, remaining - (now - last) / 1000); last = now;
    if (remaining <= 0) { s.phase = 'lost'; finish('시간 끝'); } else draw();
  }
  function runClock() { clear(); last = Date.now(); timer = setInterval(tick, 250); }
  function move(dir) {
    if (!s || s.phase !== 'running') return;
    tick(); if (s.phase !== 'running') return;
    step(s, dir, o.cfg());
    if (s.phase === 'won') finish('성공');
    else if (s.route.length >= MAX_ROUTE) { s.phase = 'stopped'; finish('300번 넘음'); }
    else draw();
  }
  function start() { if (active() || anim) return; if (o.canStart && !o.canStart()) return; view = null; s = makeState(o.cfg()); remaining = o.cfg().seconds; runClock(); draw(); q('.gstage').focus({ preventScroll: true }); }
  function pause() { if (!active()) return; if (s.phase === 'running') { tick(); if (s.phase === 'running') { s.phase = 'paused'; clear(); } } else { s.phase = 'running'; runClock(); } draw(); }
  function stop(reason) { if (!active()) return; s.phase = 'stopped'; finish(reason || '직접 끝냄'); }
  function reset() { if (anim) return; clear(); s = null; view = null; draw(); }
  function replay(route, code) {
    if (active()) stop('다시 실행 전에 끝냄');
    if (anim) { clearInterval(anim); anim = null; }
    const cfg = { ...o.cfg(), code }, st = makeState(cfg), frames = [JSON.parse(JSON.stringify(st))];
    for (const c of route) { step(st, c, cfg); frames.push(JSON.parse(JSON.stringify(st))); }
    s = null; let i = 0; const delay = Math.max(60, Math.min(240, Math.round(3200 / Math.max(1, route.length))));
    return new Promise((resolve) => {
      view = frames[0];
      anim = setInterval(() => {
        if (disposed) { clearInterval(anim); anim = null; return resolve(st); }
        i++; view = frames[Math.min(i, frames.length - 1)]; draw();
        if (i >= frames.length - 1) { clearInterval(anim); anim = null; draw(); resolve(st); }
      }, delay);
      draw();
    });
  }
  function onClick(e) {
    const b = e.target.closest('button'); if (!b || !host.contains(b)) return;
    if (b.dataset.dir) { move(b.dataset.dir); return; }
    if (b.dataset.cell && o.onEdit) { s = null; view = null; o.onEdit(Number(b.dataset.cell)); draw(); return; }
    if (b.dataset.g === 'start') start();
    if (b.dataset.g === 'pause') pause();
    if (b.dataset.g === 'stop') stop();
  }
  host.addEventListener('click', onClick);
  draw();
  return { draw, move, start, stop, reset, replay, active, busy: () => active() || !!anim, pauseIfRunning() { if (s && s.phase === 'running') pause(); }, dispose() { disposed = true; clear(); if (anim) clearInterval(anim); host.removeEventListener('click', onClick); } };
}

/* ── 화면 ── */
function mount(root, ctx) {
  const d = ctx.data; let panel = 1, mine = null, bug = null;
  const runRow = (r, i, pick) => `<li><span class="route">${esc(arrows(r.route))}</span><span class="small muted"> · 점수 ${r.score} · 남은 별 ${r.left} · ${esc(r.end)}</span>${pick ? ` <button type="button" class="button tiny" data-pick="${i}">이 길로 재현 기록</button>` : ''}</li>`;
  const opt = (k, v) => CODE_OPTS[k].map(([val, label]) => `<option value="${val}"${String(val) === String(v) ? ' selected' : ''}>${esc(label)}</option>`).join('');
  const chip = (name, val, label, attr) => `<label class="chip"><input type="radio" name="${name}" value="${val}" ${attr}><span>${label}</span></label>`;
  const AI_PANEL = `<section class="sheet" data-sheet="2" hidden>
    <div class="sheet-head"><span class="tag ai">2 · AI에게 요청하고 시험하기</span><h2>AI 게임 시험대</h2><p>우리 규칙으로 AI에게 게임 코드를 받고, 이 시험대에서 규칙대로인지 <b>우리가 직접</b> 시험해요. AI가 만든 코드도 시험 대상이에요.</p></div>
    <ul class="safety4" aria-label="AI 쓸 때 약속 4가지"><li><b>1</b>이름·학교·반은 쓰지 않아요</li><li><b>2</b>카드 칸에 있는 것만 보내요</li><li><b>3</b>AI 답은 틀릴 수 있어요 · 시험해서 판단해요</li><li><b>4</b>이상하면 손 들고 화면을 덮어요</li></ul>
    <div class="subpanel"><h3>AI에 누가 입력했나요?</h3><div class="chips wrap" role="group" aria-label="AI 입력 방식">${AI_BY.map(([k, l]) => chip('ai-by', k, l, `data-ai="by"`)).join('')}</div>
      <p class="small muted">기본은 우리 태블릿에서 직접이에요. 로그인이 안 되면 선생님 기기에 가서 우리가 직접 쳐요. 선생님이 대신 입력하는 것은 마지막 방법이에요.</p></div>
    <div class="subpanel"><h3><span class="num-dot">1</span>요청 카드 고르고 복사하기</h3>
      <div class="chips" role="group" aria-label="요청 카드">${chip('ai-card', '1', '카드 1 · 게임 만들어 주세요', 'data-ai="card"')}${chip('ai-card', '2', '카드 2 · 고쳐 주세요', 'data-ai="card"')}${chip('ai-card', '2b', '카드 2-B · 규칙 하나 바꿔 주세요', 'data-ai="card"')}${chip('ai-card', '3', '카드 3 · 새 대화로 이어서 (지난 대화가 안 열릴 때)', 'data-ai="card"')}</div>
      <pre id="g-card" class="cardtext" tabindex="0" aria-label="요청 카드 내용"></pre>
      <div class="row-btns"><button type="button" class="button primary" id="g-card-copy">카드 복사</button><span class="small muted">학교 계정 AI 화면에 붙여 넣어요. 이 화면은 AI에 자동으로 보내지 않아요.</span></div></div>
    <div class="subpanel"><h3><span class="num-dot">2</span>받은 코드 넣고 열기</h3>
      <div class="chips" role="group" aria-label="어느 코드">${chip('ai-slot', '1', '처음 받은 코드', 'data-ai="slot"')}${chip('ai-slot', '2', '고친 코드', 'data-ai="slot"')}</div>
      <textarea id="g-code-in" rows="5" maxlength="${MAX_CODE}" spellcheck="false" placeholder="AI 답에서 &lt;!DOCTYPE html&gt; 부터 &lt;/html&gt; 까지 복사해 붙여 넣어요" aria-label="받은 코드"></textarea>
      <div class="row-btns"><button type="button" class="button primary" id="g-run">기본 검사하고 열기</button><button type="button" class="button" id="g-stop">닫기</button><button type="button" class="button tiny ghost" id="g-sample">AI를 쓸 수 없을 때 · 미리 받아 둔 예시 코드</button></div>
      <div id="g-scan" class="feedback" role="status" aria-live="polite"></div>
      <div class="sandbox" id="g-sandbox-box" hidden><p class="small muted">아래는 받은 코드가 움직이는 화면이에요. 눌러서 게임을 시작해요. 기본 검사는 금지 표현만 거른 것이고, 모든 위험을 막는다는 뜻은 아니에요. 이상하면 멈추고 손을 들어요.</p><iframe id="g-sandbox" sandbox="allow-scripts" referrerpolicy="no-referrer" title="AI 게임 시험대"></iframe></div></div>
    <div class="subpanel"><h3><span class="num-dot">3</span>우리 규칙표대로인가요?</h3><p class="small muted">해 보기 전에 어떻게 되어야 하는지 먼저 말하고, 하나씩 해 봐요.</p>
      <div class="checks">${VERDICT.map(([k, l]) => `<div class="check-row v3"><span class="ck-label">${l}</span><div class="chips" role="group" aria-label="${l} 결과">${chip('v-' + k, 'ok', '맞음', `data-v="${k}"`)}${chip('v-' + k, 'diff', '다름', `data-v="${k}"`)}${chip('v-' + k, 'na', '못 해 봄', `data-v="${k}"`)}</div></div>`).join('')}</div></div>
    <div class="subpanel"><h3><span class="num-dot">4</span>다르게 움직인 곳 · 재현 기록</h3>
      <p class="small">누른 길: <span class="route" id="g-ai-route">—</span></p>
      <div class="row-btns" aria-label="누른 길 적기">${['U', 'D', 'L', 'R'].map((k) => `<button type="button" class="button tiny arrow" data-addroute="${k}" aria-label="${{ U: '위', D: '아래', L: '왼쪽', R: '오른쪽' }[k]} 추가">${ARROW[k]}</button>`).join('')}<button type="button" class="button tiny" data-addroute="back">한 칸 지우기</button><button type="button" class="button tiny quiet" data-addroute="clear">모두 지우기</button></div>
      <div class="two-col"><div class="field"><label for="g-ai-rule">어느 규칙과 달랐나요?</label><select id="g-ai-rule" data-ai="rule"><option value="">고르세요</option>${AI_RULES.map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></div><div></div></div>
      <div class="two-col"><div class="field"><label for="g-ai-expect">규칙대로라면 (기대)</label><textarea id="g-ai-expect" data-ai="expect" maxlength="200" rows="2" placeholder="예: 별 1개를 먹었으니 1점"></textarea></div>
        <div class="field"><label for="g-ai-actual">실제로는</label><textarea id="g-ai-actual" data-ai="actual" maxlength="200" rows="2" placeholder="예: 별이 사라지지 않고 또 1점"></textarea></div></div>
      <div class="row-btns"><button type="button" class="button" id="g-to-card2">이 기록으로 카드 2 만들기</button><span class="small muted">다른 곳을 못 찾았으면 “이번 시험에서는 못 찾았다”고 쓰고 카드 2-B를 써요.</span></div></div>
    <div class="subpanel"><h3><span class="num-dot">5</span>고친 코드도 같은 길로</h3>
      <div class="field"><label for="g-ai-said">AI가 “고쳤다 · 바꿨다”고 한 것</label><input id="g-ai-said" data-ai="said" maxlength="200" placeholder="AI 답의 한 줄 설명을 옮겨 써요"></div>
      <div class="check-row v3"><span class="ck-label">같은 길로 다시 해 보니 AI 말과</span><div class="chips" role="group" aria-label="고친 뒤 결과">${chip('ai-after', 'same', '같았다', 'data-ai="after"')}${chip('ai-after', 'diff', '달랐다', 'data-ai="after"')}${chip('ai-after', 'na', '아직 못 해 봄', 'data-ai="after"')}</div></div></div>
    <div class="pager"><button type="button" class="button" data-go="1">← 내 게임</button><button type="button" class="button primary" data-go="3">버그 판 고치기 →</button></div>
  </section>`;
  root.innerHTML = `<div class="gapp">
  <ol class="stepper g4" aria-label="네 단계">
    <li><button type="button" class="step" data-panel="1"><span class="n">1</span><span class="l">내 게임 만들기</span></button></li>
    <li><button type="button" class="step ai" data-panel="2"><span class="n">2</span><span class="l">AI 게임 시험</span></button></li>
    <li><button type="button" class="step" data-panel="3"><span class="n">3</span><span class="l">버그 판 고치기</span></button></li>
    <li><button type="button" class="step" data-panel="4"><span class="n">4</span><span class="l">정리 · 발표</span></button></li>
  </ol>

  <section class="sheet" data-sheet="1">
    <div class="sheet-head"><span class="tag">1 · 규칙 설계</span><h2>내 게임 만들기</h2><p>규칙을 문장으로 쓰고, 판에 벽과 별을 놓고, 직접 해 보며 시험해요. 이 화면은 정해진 규칙대로만 움직여요.</p></div>
    <div class="gsplit">
      <div>
        <div class="field"><label for="g-title">게임 제목</label><input id="g-title" data-f="title" maxlength="40" placeholder="예: 별 정원 탈출"></div>
        <div class="subpanel"><h3><span class="num-dot">3</span>규칙 세 문장</h3>
          <div class="field"><label for="g-win">성공 — 어떻게 되면 이기나요?</label><input id="g-win" data-f="ruleWin" maxlength="120" placeholder="예: 별을 모아 3점이 되면 성공"></div>
          <div class="field"><label for="g-lose">실패 — 어떻게 되면 지나요?</label><input id="g-lose" data-f="ruleLose" maxlength="120" placeholder="예: 60초가 지나면 실패"></div>
          <div class="field"><label for="g-score">점수 — 점수는 어떻게 오르나요?</label><input id="g-score" data-f="ruleScore" maxlength="120" placeholder="예: 별 하나는 1점, 같은 별은 한 번만"></div>
        </div>
        <div class="three-col">
          <div class="field"><label for="g-goal">이길 점수</label><input id="g-goal" data-f="goal" type="number" min="1" max="15" step="1" inputmode="numeric"></div>
          <div class="field"><label for="g-sec">제한 시간(초)</label><input id="g-sec" data-f="seconds" type="number" min="10" max="180" step="1" inputmode="numeric"></div>
          <div class="field"><label for="g-pts">별 하나 점수</label><select id="g-pts" data-f="points"><option value="1">1점</option><option value="2">2점</option><option value="3">3점</option></select></div>
        </div>
        <div class="subpanel"><h3>판 만들기</h3>
          <p class="small muted">게임을 시작하기 전에 오른쪽 판의 칸을 누르면 <b>빈칸 → 벽 → 별 → 빈칸</b> 순서로 바뀌어요. 별은 5개, 벽은 12개까지.</p>
          <div class="row-btns"><button type="button" class="button tiny" data-preset="easy">벽 없음</button><button type="button" class="button tiny" data-preset="normal">벽 4개</button><button type="button" class="button tiny" data-preset="hard">벽 8개</button></div>
          <div id="g-mapcheck" class="mapcheck" role="status" aria-live="polite"></div>
        </div>
      </div>
      <div><div id="g-board-mine" class="gplay"></div></div>
    </div>
    <div class="subpanel"><h3>짝이 시험하기 — 규칙대로 움직이나요?</h3>
      <div class="checks">${CHECKS.map(([k, label]) => `<div class="check-row"><span class="ck-label">${label}</span><div class="chips" role="group" aria-label="${label} 결과"><label class="chip"><input type="radio" name="ck-${k}" value="ok" data-ck="${k}"><span>규칙대로</span></label><label class="chip"><input type="radio" name="ck-${k}" value="odd" data-ck="${k}"><span>이상해요</span></label></div><input data-ckn="${k}" maxlength="80" aria-label="${label} 메모" placeholder="본 것 한 줄"></div>`).join('')}</div>
    </div>
    <div class="subpanel"><h3>내 게임 기록 <span class="small muted">(최근 6번)</span></h3><ol id="g-runs-mine" class="runs"></ol></div>
    <div class="pager"><span></span><button type="button" class="button primary" data-go="2">AI 게임 시험 →</button></div>
  </section>

  ${AI_PANEL}

  <section class="sheet" data-sheet="3" hidden>
    <div class="sheet-head"><span class="tag">3 · 버그 재현과 수정</span><h2>버그 판 고치기 <span class="badge" id="g-letter"></span></h2><p>이 판에는 <b>버그가 하나</b> 숨어 있어요. 규칙표와 다르게 움직이는 곳을 찾고, 같은 길로 다시 해도 똑같이 나오는지 확인한 뒤, 규칙 코드를 고쳐요. 수업용으로 미리 심어 둔 버그예요.</p></div>
    <details class="teacher"><summary>선생님: 버그 판 고르기</summary><p class="small muted">조마다 다른 판을 주려면 글자를 고르세요. 어떤 버그인지는 강사용 교안 정답표에만 있어요. 바꾸면 이 판의 기록이 처음으로 돌아가요.</p><div class="row-btns">${'ABCD'.split('').map((l) => `<button type="button" class="button tiny" data-letter="${l}">판 ${l}</button>`).join('')}<button type="button" class="button tiny" data-letter="?">무작위</button></div></details>
    <div class="gsplit">
      <div class="rulecard"><h3>규칙표 <span class="small muted">— 사람이 쓴 약속</span></h3><ol>${RULE_CARD.map((t) => `<li>${t}</li>`).join('')}</ol><p class="small muted">시작은 왼쪽 위 S 칸이에요. 끝나면 ‘끝내고 기록’을 눌러요.</p></div>
      <div><div id="g-board-bug" class="gplay"></div></div>
    </div>
    <div class="subpanel"><h3><span class="num-dot">1</span>버그 판 기록 <span class="small muted">(최근 6번)</span></h3><ol id="g-runs-bug" class="runs"></ol></div>
    <div class="subpanel"><h3><span class="num-dot">2</span>재현 기록 — 같은 길이면 늘 똑같이 나오나요?</h3>
      <p class="small">고른 길: <span class="route" id="g-repro-route"></span></p>
      <div class="two-col">
        <div class="field"><label for="g-rule">규칙표 몇 번과 달랐나요?</label><select id="g-rule" data-r="rule"><option value="0">고르세요</option>${RULE_CARD.map((_, i) => `<option value="${i + 1}">${i + 1}번</option>`).join('')}</select></div>
        <div class="field"><span class="mini-title">다시 실행</span><button type="button" class="button" id="g-replay">같은 길로 다시 실행</button></div>
      </div>
      <div class="two-col">
        <div class="field"><label for="g-expect">규칙대로라면 어떻게 되어야 하나요? (기대)</label><textarea id="g-expect" data-r="expect" maxlength="200" rows="2" placeholder="예: 별 1개를 먹었으니 1점"></textarea></div>
        <div class="field"><label for="g-actual">실제로는 어떻게 되었나요? (실제)</label><textarea id="g-actual" data-r="actual" maxlength="200" rows="2" placeholder="예: 2점이 되었다"></textarea></div>
      </div>
      <div id="g-repro-result" class="feedback" role="status" aria-live="polite"></div>
    </div>
    <div class="subpanel" id="g-codebox"><h3><span class="num-dot">3</span>규칙 코드 — 컴퓨터가 따르는 문장</h3><div id="g-code"></div></div>
    <div class="pager"><button type="button" class="button" data-go="2">← AI 게임 시험</button><button type="button" class="button primary" data-go="4">정리 · 발표 →</button></div>
  </section>

  <section class="sheet" data-sheet="4" hidden>
    <div class="sheet-head"><span class="tag">4 · 설명하기</span><h2>정리 · 발표</h2><p>무엇을 고쳤고, 무엇으로 확인했고, 아직 무엇을 모르는지 나눠서 써요.</p></div>
    <div id="g-progress" class="progress"></div>
    <div class="field"><label for="g-rf1">내가 고친 것과 근거 (어떤 길로 다시 시험했나요?)</label><textarea id="g-rf1" data-f="reflectFix" maxlength="600" rows="3"></textarea></div>
    <div class="field"><label for="g-rf2">아직 확인하지 못한 것</label><textarea id="g-rf2" data-f="reflectLeft" maxlength="600" rows="2" placeholder="예: 시간이 끝날 때는 시험하지 못했다"></textarea></div>
    <div class="field"><label for="g-rf3">다음에 해 볼 시험 하나</label><textarea id="g-rf3" data-f="reflectNext" maxlength="600" rows="2"></textarea></div>
    <div class="callout"><p><b>1분 발표 순서</b> — ① 우리 게임 규칙 ② 찾은 버그(규칙 몇 번과 달랐나) ③ 재현한 길 ④ 고친 줄 ⑤ 같은 길로 다시 시험한 결과 ⑥ 아직 모르는 것</p></div>
    <div class="callout"><p><b>AI가 한 일 · 우리가 판단한 일</b> — AI는 우리 카드로 코드를 만들고 고쳤어요. 규칙을 정하고, 같은 길로 시험하고, 맞는지 판단한 것은 우리예요. AI를 쓰지 않았으면 ‘없음’이라고 말해요.</p></div>
    <div class="pager"><button type="button" class="button" data-go="3">← 버그 판</button><span></span></div>
  </section></div>`;

  const q = (sel) => root.querySelector(sel);
  function save() { ctx.save(); if (ctx.renderOutput) ctx.renderOutput(); }

  /* 1 · 내 게임 */
  q('#g-title').value = d.title; q('#g-win').value = d.ruleWin; q('#g-lose').value = d.ruleLose; q('#g-score').value = d.ruleScore;
  q('#g-goal').value = d.goal; q('#g-sec').value = d.seconds; q('#g-pts').value = String(d.points);
  q('#g-rf1').value = d.reflectFix; q('#g-rf2').value = d.reflectLeft; q('#g-rf3').value = d.reflectNext;
  CHECKS.forEach(([k]) => { const r = root.querySelector(`input[name="ck-${k}"][value="${d.checks[k]}"]`); if (r) r.checked = true; q(`[data-ckn="${k}"]`).value = d.checkNotes[k]; });
  function drawMineExtras() {
    const probs = mapProblems(d), box = q('#g-mapcheck');
    box.className = 'mapcheck ' + (probs.length ? 'warn' : 'ok');
    box.innerHTML = probs.length ? probs.map((p) => `<p>⚠ ${esc(p)}</p>`).join('') : `<p>✓ 모든 별(${d.stars.length}개)에 갈 수 있고, 이길 점수 ${d.goal}점에 닿을 수 있어요. 벽 ${d.walls.length}개.</p>`;
    const list = d.runs.filter((r) => r.board === 'mine').slice(-6);
    q('#g-runs-mine').innerHTML = list.length ? list.map((r) => runRow(r)).join('') : '<li class="muted small">아직 기록이 없어요.</li>';
    root.querySelectorAll('[data-f="goal"],[data-f="seconds"],[data-f="points"],[data-preset]').forEach((el) => (el.disabled = !!(mine && mine.busy())));
  }
  mine = Board(q('#g-board-mine'), {
    label: '내 게임', cfg: () => mineCfg(d), editable: () => true,
    canStart: () => { const p = mapProblems(d); if (p.length) { ctx.status(p[0]); return false; } return true; },
    onEdit: (cell) => {
      const w = d.walls.indexOf(cell), s = d.stars.indexOf(cell);
      if (w >= 0) { if (d.stars.length >= MAX_STARS) { d.walls.splice(w, 1); ctx.status('별은 5개까지라 빈칸으로 바꿨어요.'); } else { d.walls.splice(w, 1); d.stars.push(cell); } }
      else if (s >= 0) d.stars.splice(s, 1);
      else if (d.walls.length < MAX_WALLS) d.walls.push(cell);
      else if (d.stars.length < MAX_STARS) { d.stars.push(cell); ctx.status('벽은 12개까지라 별로 바꿨어요.'); }
      else ctx.status('벽 12개, 별 5개를 모두 썼어요. 다른 칸을 비워 주세요.');
      save(); drawMineExtras();
    },
    onFinish: (run) => { d.runs.push({ ...run, board: 'mine', letter: '' }); d.runs = d.runs.slice(-12); save(); drawMineExtras(); },
    onDraw: () => drawMineExtras()
  });

  /* 2 · 버그 판 */
  const original = () => bugCode(d.bug.letter);
  const unlocked = () => { const r = d.bug.repro; return !!(r.route && r.rule && r.expect.trim() && r.actual.trim() && r.replayed && r.differs); };
  const changedLines = () => Object.keys(CODE_OPTS).filter((k) => String(d.bug.code[k]) !== String(original()[k]));
  const lineNo = { block: 2, add: 3, again: 4, win: 5 };
  function resetBug(letter) {
    d.bug = { letter, code: bugCode(letter), repro: { route: '', rule: 0, expect: '', actual: '', replayed: false, differs: false }, request: '', verified: false, suite: null };
    q('#g-rule').value = '0'; q('#g-expect').value = ''; q('#g-actual').value = '';
    save(); bug.reset(); drawBug();
  }
  function resultCells(st, cfg) { return `<td>${where(st)}</td><td>${st.score}점</td><td>${starsLeft(st, cfg)}개</td><td>${st.phase === 'won' ? '성공·끝' : '계속'}</td>`; }
  function drawCode() {
    const box = q('#g-code'), b = d.bug;
    if (!unlocked()) { box.innerHTML = '<p class="lock">🔒 2번 재현 기록을 마치면 규칙 코드가 열려요. 길 고르기 → 규칙 번호 → 기대·실제 쓰기 → ‘같은 길로 다시 실행’에서 규칙표와 다른 결과가 나와야 해요.</p>'; return; }
    const canEdit = b.request.trim().length >= 8, ch = changedLines();
    box.innerHTML = `<div class="field"><label for="g-request">수정 요청 문장 — 프로그래머나 AI에게 말하듯 써요</label><textarea id="g-request" maxlength="300" rows="2" placeholder="예: 별 하나를 먹으면 1점이어야 하는데 2점이 돼요. 점수 줄을 1로 고쳐 주세요.">${esc(b.request)}</textarea></div>
      ${canEdit ? '' : '<p class="small muted">수정 요청 문장을 먼저 쓰면 코드를 바꿀 수 있어요.</p>'}
      <ol class="codelines">
        <li><span class="ln">1</span><span>방향 버튼을 누르면 → 그쪽으로 한 칸 움직인다</span><em>고정</em></li>
        <li class="${ch.includes('block') ? 'changed' : ''}"><span class="ln">2</span><span><select data-code="block" aria-label="2번 줄"${canEdit ? '' : ' disabled'}>${opt('block', b.code.block)}</select> → 움직이지 않는다</span>${ch.includes('block') ? '<em>바꿈</em>' : ''}</li>
        <li class="${ch.includes('add') ? 'changed' : ''}"><span class="ln">3</span><span>별 칸에 들어가면 → <select data-code="add" aria-label="3번 줄"${canEdit ? '' : ' disabled'}>${opt('add', b.code.add)}</select></span>${ch.includes('add') ? '<em>바꿈</em>' : ''}</li>
        <li class="${ch.includes('again') ? 'changed' : ''}"><span class="ln">4</span><span>이미 먹은 별 칸이면 → <select data-code="again" aria-label="4번 줄"${canEdit ? '' : ' disabled'}>${opt('again', b.code.again)}</select></span>${ch.includes('again') ? '<em>바꿈</em>' : ''}</li>
        <li class="${ch.includes('win') ? 'changed' : ''}"><span class="ln">5</span><span>점수가 <select data-code="win" aria-label="5번 줄"${canEdit ? '' : ' disabled'}>${opt('win', b.code.win)}</select> → 성공, 게임 끝</span>${ch.includes('win') ? '<em>바꿈</em>' : ''}</li>
        <li><span class="ln">6</span><span>남은 시간이 0이 되면 → 실패, 게임 끝</span><em>고정</em></li>
      </ol>
      <div class="row-btns"><button type="button" class="button primary" id="g-verify"${ch.length ? '' : ' disabled'}>고친 코드로 같은 길 다시 시험</button><button type="button" class="button" id="g-suite">시험 길 4개 한꺼번에</button><button type="button" class="button tiny" id="g-code-reset">코드 처음 상태로</button></div>
      <div id="g-verify-out" class="feedback" role="status" aria-live="polite">${verifyHtml()}</div>
      <div id="g-suite-out">${suiteHtml()}</div>`;
  }
  function verifyHtml() {
    const b = d.bug; if (!b.repro.route || !b.verified && !b._shown) return '';
    const cfgB = bugCfg(original()), before = simulate(cfgB, b.repro.route), after = simulate(bugCfg(b.code), b.repro.route), ref = simulate(bugCfg(CORRECT), b.repro.route);
    return `<table class="gtable"><thead><tr><th>같은 길<br><span class="route">${esc(arrows(b.repro.route))}</span></th><th>위치</th><th>점수</th><th>남은 별</th><th>게임</th></tr></thead><tbody>
      <tr><th>고치기 전<br><span class="small muted">판 ${b.letter}</span></th>${resultCells(before, cfgB)}</tr><tr><th>고친 뒤</th>${resultCells(after, cfgB)}</tr><tr><th>규칙표대로</th>${resultCells(ref, cfgB)}</tr></tbody></table>
      <p>${b.verified ? '✓ 같은 길에서 규칙표대로 움직였어요. <b>이 길 하나</b>에서 확인한 것이에요. ‘시험 길 4개’로 다른 경우도 확인해 보세요.' : '✗ 고친 뒤에도 규칙표와 달라요. 다른 줄을 의심해 보거나, 바꾼 줄을 처음 상태로 돌려 보세요.'}</p>`;
  }
  function suiteHtml() {
    const r = d.bug.suite; if (!r) return '';
    const n = r.filter(Boolean).length;
    return `<table class="gtable gsuite"><thead><tr><th>시험 길</th><th>확인할 것</th><th>관련 줄</th><th>결과</th></tr></thead><tbody>${TESTS.map((t, i) => `<tr><td>${t.name}<br><span class="route">${arrows(t.route)}</span></td><td>${t.desc}</td><td>${t.line}번</td><td>${r[i] ? '✓ 통과' : '✗ 다름'}</td></tr>`).join('')}</tbody></table>
      <p class="small">${n}/4 통과. ${n === 4 ? '시험 길 4개는 모두 규칙표대로예요. 그래도 모든 길을 다 시험한 것은 아니에요.' : '다른 결과가 나온 시험 길의 줄 번호를 살펴보세요.'}</p>`;
  }
  function drawBug() {
    const b = d.bug;
    q('#g-letter').textContent = `판 ${b.letter}`;
    const list = d.runs.map((r, i) => [r, i]).filter(([r]) => r.board === 'bug' && r.letter === b.letter).slice(-6);
    q('#g-runs-bug').innerHTML = list.length ? list.map(([r, i]) => runRow(r, i, r.route.length > 0)).join('') : '<li class="muted small">아직 기록이 없어요. ‘시작’을 눌러 규칙표대로인지 해 보세요.</li>';
    q('#g-repro-route').textContent = b.repro.route ? `${arrows(b.repro.route)}  (누른 횟수 ${b.repro.route.length})` : '아직 없음 — 1번 기록에서 ‘이 길로 재현 기록’을 누르세요';
    q('#g-rule').value = String(b.repro.rule);
    if (q('#g-expect').value !== b.repro.expect) q('#g-expect').value = b.repro.expect;
    if (q('#g-actual').value !== b.repro.actual) q('#g-actual').value = b.repro.actual;
    q('#g-replay').disabled = !b.repro.route || bug.busy();
    const rr = q('#g-repro-result');
    rr.innerHTML = !b.repro.replayed ? '<p class="small muted">길을 고른 뒤 ‘같은 길로 다시 실행’을 눌러 보세요.</p>'
      : b.repro.differs ? `<p>✓ <b>재현됨</b> — 같은 길로 다시 해도 규칙표와 다른 결과가 나왔어요.${unlocked() ? ' 규칙 코드가 열렸어요.' : ' 규칙 번호·기대·실제를 쓰면 규칙 코드가 열려요.'}</p>`
      : '<p>이 길에서는 규칙표대로 움직였어요. 버그가 보이는 다른 길을 찾아보세요.</p>';
    drawCode();
  }
  bug = Board(q('#g-board-bug'), {
    label: '버그 판', cfg: () => bugCfg(d.bug.code),
    onFinish: (run) => { d.runs.push({ ...run, board: 'bug', letter: d.bug.letter }); d.runs = d.runs.slice(-12); if (!d.bug.repro.route && run.route) setRoute(run.route); save(); drawBug(); }
  });
  function setRoute(route) { d.bug.repro.route = route; d.bug.repro.replayed = false; d.bug.repro.differs = false; d.bug.verified = false; d.bug._shown = false; }
  async function doReplay() {
    const b = d.bug; if (!b.repro.route || bug.busy()) return;
    q('#g-replay').disabled = true;
    const before = await bug.replay(b.repro.route, original());
    const ref = simulate(bugCfg(CORRECT), b.repro.route);
    b.repro.replayed = true; b.repro.differs = !sameResult(before, ref, bugCfg(original()));
    save(); drawBug();
    ctx.status(b.repro.differs ? '같은 길에서 규칙표와 다른 결과가 다시 나왔어요. 재현 성공!' : '이 길에서는 버그가 보이지 않았어요.');
  }
  async function doVerify() {
    const b = d.bug; if (!unlocked() || bug.busy()) return;
    const after = await bug.replay(b.repro.route, b.code);
    b.verified = sameResult(after, simulate(bugCfg(CORRECT), b.repro.route), bugCfg(CORRECT)); b._shown = true;
    save(); drawCode();
    ctx.status(b.verified ? '같은 길에서 규칙표대로 움직였어요.' : '아직 규칙표와 달라요.');
  }

  /* 3 · 정리 */
  function drawProgress() {
    const b = d.bug, ck = CHECKS.filter(([k]) => d.checks[k]).length, s = b.suite ? b.suite.filter(Boolean).length : 0;
    const items = [
      [!!(d.ruleWin.trim() && d.ruleLose.trim() && d.ruleScore.trim()), '규칙 세 문장'], [!mapProblems(d).length, '판 검사 통과'], [ck === 4, `짝 시험 ${ck}/4`],
      [!!d.ai.by, 'AI 입력 방식 표시'], [VERDICT.filter(([k]) => d.ai.verdict[k]).length === VERDICT.length, `AI 게임 판정 ${VERDICT.filter(([k]) => d.ai.verdict[k]).length}/${VERDICT.length}`],
      [unlocked(), '버그 재현 기록'], [b.verified, '고친 뒤 같은 길 다시 시험'], [s === 4, `시험 길 ${b.suite ? s : 0}/4`]
    ];
    q('#g-progress').innerHTML = `<ul>${items.map(([ok, t]) => `<li class="${ok ? 'ok' : ''}">${ok ? '✓' : '○'} ${t}</li>`).join('')}</ul>`;
  }


  /* AI 게임 시험대 */
  const aiQ = () => d.ai;
  function setRadio(name, val) { root.querySelectorAll(`input[name="${name}"]`).forEach((r) => (r.checked = r.value === String(val))); }
  function drawCard() { q('#g-card').textContent = cards(d)[d.ai.card]; }
  function closeSandbox() { const f = q('#g-sandbox'); if (f) f.onload = null; if (f && f.getAttribute('srcdoc')) f.removeAttribute('srcdoc'); if (f) f.src = 'about:blank'; const box = q('#g-sandbox-box'); if (box) box.hidden = true; }
  function drawAI() {
    const a = d.ai;
    setRadio('ai-by', a.by); setRadio('ai-card', a.card); setRadio('ai-slot', a.slot); setRadio('ai-after', a.after);
    VERDICT.forEach(([k]) => setRadio('v-' + k, a.verdict[k]));
    q('#g-ai-rule').value = a.rule; q('#g-ai-expect').value = a.expect; q('#g-ai-actual').value = a.actual; q('#g-ai-said').value = a.said;
    q('#g-code-in').value = a['code' + a.slot];
    q('#g-ai-route').textContent = a.route ? arrows(a.route) : '—';
    drawCard();
  }
  function showScan(res) {
    const box = q('#g-scan');
    if (res.block.length) box.innerHTML = `<p class="bad"><b>이 코드는 열지 않아요.</b></p><ul>${res.block.map((m) => `<li>✗ ${esc(m)}</li>`).join('')}</ul><p class="small">AI에게 “인터넷 주소·바깥 파일·저장 기능 없이 HTML 한 파일로 다시 주세요”라고 한 번 더 요청해요.</p>`;
    else box.innerHTML = `<p class="good"><b>✓ 기본 검사 통과</b> — 막힌 상자에서만 열어요. 검사가 모든 위험을 찾지는 못해요.</p>${res.warn.map((m) => `<p>⚠ ${esc(m)}</p>`).join('')}`;
  }
  function runCode() {
    const a = d.ai, raw = q('#g-code-in').value, code = cleanCode(raw);
    if (code !== raw) { q('#g-code-in').value = code; }
    a['code' + a.slot] = code; save(); if (a.card === '3') drawCard();
    const res = scanCode(code); showScan(res); closeSandbox();
    if (res.block.length) { ctx.status('기본 검사에서 막혔어요. 이유를 읽고 다시 요청해요.'); return; }
    // 실행할 때마다 새 상자를 만든다. 첫 load는 받은 코드, 그다음 load가 오면 다른 곳으로 넘어간 것이라 바로 닫는다.
    const old = q('#g-sandbox'), f = old.cloneNode(false); f.removeAttribute('src'); f.removeAttribute('srcdoc');
    let loads = 0;
    f.onload = () => { loads += 1; if (loads > 1) { closeSandbox(); showScan({ block: ['게임이 다른 화면으로 넘어가려 해서 닫았어요. 그 부분을 빼 달라고 같은 대화에 다시 요청해요.'], warn: [] }); ctx.status('시험대를 닫았어요. 이유를 읽고 다시 요청해요.'); } };
    f.srcdoc = sandboxDoc(code); old.replaceWith(f); q('#g-sandbox-box').hidden = false;
    ctx.status(a.slot === 2 ? '고친 코드를 열었어요. 같은 길로 다시 해 봐요.' : '받은 코드를 열었어요. 규칙 1·2·3을 하나씩 시험해요.');
  }
  function addRoute(k) {
    const a = d.ai;
    if (k === 'clear') a.route = ''; else if (k === 'back') a.route = a.route.slice(0, -1); else if (a.route.length < 60) a.route += k;
    q('#g-ai-route').textContent = a.route ? arrows(a.route) : '—'; save(); if (a.card === '2' || a.card === '3') drawCard();
  }

  /* 공통 */
  function show(n) {
    if (mine.active()) mine.stop('화면 바꿈');
    if (bug.active()) bug.stop('화면 바꿈');
    panel = n;
    root.querySelectorAll('[data-sheet]').forEach((s) => (s.hidden = Number(s.dataset.sheet) !== n));
    root.querySelectorAll('.step').forEach((s) => { const on = Number(s.dataset.panel) === n; s.classList.toggle('current', on); if (on) s.setAttribute('aria-current', 'step'); else s.removeAttribute('aria-current'); });
    if (n !== 2) closeSandbox();
    if (n === 2) drawAI(); if (n === 3) drawBug(); if (n === 4) drawProgress();
  }
  function onInput(e) {
    const el = e.target;
    if (el.dataset.f) {
      const k = el.dataset.f;
      if (['goal', 'seconds'].includes(k)) { if (!el.value || !el.checkValidity()) { ctx.status(k === 'goal' ? '이길 점수는 1~15 사이 정수예요.' : '제한 시간은 10~180초 사이 정수예요.'); return; } d[k] = Number(el.value); }
      else if (k === 'points') d.points = Number(el.value);
      else d[k] = el.value;
      save(); if (['goal', 'seconds', 'points'].includes(k)) mine.draw(); else drawMineExtras(); return;
    }
    if (el.dataset.ck) { d.checks[el.dataset.ck] = el.value; save(); return; }
    if (el.dataset.v) { d.ai.verdict[el.dataset.v] = el.value; save(); return; }
    if (el.dataset.ai) { const k = el.dataset.ai, a = d.ai; if (k === 'slot') { a.slot = Number(el.value) === 2 ? 2 : 1; q('#g-code-in').value = a['code' + a.slot]; closeSandbox(); q('#g-scan').innerHTML = ''; } else a[k] = el.value; save(); if (k === 'card' || k === 'rule' || k === 'expect' || k === 'actual') drawCard(); return; }
    if (el.id === 'g-code-in') { d.ai['code' + d.ai.slot] = el.value.slice(0, MAX_CODE); d.ai['src' + d.ai.slot] = el.value ? 'ai' : ''; if (el.value && d.ai.by === 'sample') { d.ai.by = ''; setRadio('ai-by', ''); ctx.status('AI에게 받은 코드를 넣었어요. ‘AI에 누가 입력했나요?’를 다시 골라요.'); } save(); return; }
    if (el.dataset.ckn) { d.checkNotes[el.dataset.ckn] = el.value; save(); return; }
    if (el.dataset.r) {
      const r = d.bug.repro, was = unlocked();
      if (el.dataset.r === 'rule') r.rule = Number(el.value); else r[el.dataset.r] = el.value;
      save(); if (was !== unlocked()) drawBug(); else if (el.dataset.r === 'rule') drawBug(); return;
    }
    if (el.id === 'g-request') { const had = d.bug.request.trim().length >= 8; d.bug.request = el.value; save(); if (had !== d.bug.request.trim().length >= 8) { drawCode(); const t = q('#g-request'); t.focus(); t.setSelectionRange(t.value.length, t.value.length); } return; }
    if (el.dataset.code) { const k = el.dataset.code; d.bug.code[k] = k === 'add' ? Number(el.value) : el.value; d.bug.verified = false; d.bug._shown = false; d.bug.suite = null; save(); drawCode(); }
  }
  function onClick(e) {
    const b = e.target.closest('button'); if (!b || !root.contains(b)) return;
    if (b.dataset.panel) show(Number(b.dataset.panel));
    else if (b.dataset.go) { show(Number(b.dataset.go)); root.scrollIntoView({ block: 'start' }); }
    else if (b.dataset.preset) { if (mine.busy()) return; d.walls = [...PRESETS[b.dataset.preset].walls]; d.stars = [...PRESETS[b.dataset.preset].stars]; save(); mine.reset(); }
    else if (b.dataset.letter) { if (bug.busy()) return; resetBug(b.dataset.letter === '?' ? randomLetter() : b.dataset.letter); ctx.status(`버그 판 ${d.bug.letter}를 준비했어요.`); }
    else if (b.dataset.pick !== undefined) { const r = d.runs[Number(b.dataset.pick)]; if (r) { setRoute(r.route); save(); drawBug(); ctx.status('이 길을 재현 기록에 넣었어요. ‘같은 길로 다시 실행’을 눌러 보세요.'); } }
    else if (b.id === 'g-replay') doReplay();
    else if (b.id === 'g-verify') doVerify();
    else if (b.id === 'g-suite') { d.bug.suite = runSuite(d.bug.code); save(); drawCode(); ctx.status('시험 길 4개를 돌렸어요.'); }
    else if (b.id === 'g-code-reset') { d.bug.code = original(); d.bug.verified = false; d.bug._shown = false; d.bug.suite = null; save(); drawCode(); }
    else if (b.id === 'g-card-copy') ctx.copy(cards(d)[d.ai.card]);
    else if (b.id === 'g-run') runCode();
    else if (b.id === 'g-stop') { closeSandbox(); ctx.status('시험대를 닫았어요.'); }
    else if (b.id === 'g-sample') { const S = window.GAME_SAMPLE; if (!S) return; d.ai.slot = 1; setRadio('ai-slot', 1); q('#g-code-in').value = S.code; d.ai.code1 = S.code; d.ai.src1 = 'sample'; if (d.ai.by !== 'none') { d.ai.by = 'sample'; setRadio('ai-by', 'sample'); } save(); runCode(); ctx.status('예제 규칙 ‘' + S.title + '’로 미리 받아 둔 코드예요. 입력 방식을 ‘미리 준비한 예시’로 바꿨어요. 감독 선생님이 안 계셔서 AI를 쓰지 않은 날이면 ‘사용하지 않음’을 골라요.'); }
    else if (b.dataset.addroute) addRoute(b.dataset.addroute);
    else if (b.id === 'g-to-card2') { d.ai.card = '2'; setRadio('ai-card', '2'); drawCard(); save(); q('#g-card').scrollIntoView({ block: 'center' }); ctx.status('카드 2를 만들었어요. 같은 대화에 붙여 넣어요.'); }
  }
  function onKey(e) {
    if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    const dir = { ArrowUp: 'U', ArrowDown: 'D', ArrowLeft: 'L', ArrowRight: 'R', w: 'U', s: 'D', a: 'L', d: 'R', W: 'U', S: 'D', A: 'L', D: 'R' }[e.key];
    const board = panel === 1 ? mine : panel === 3 ? bug : null;
    if (dir && board && board.active()) { e.preventDefault(); board.move(dir); }
  }
  function onHidden() { if (document.hidden) { mine.pauseIfRunning(); bug.pauseIfRunning(); } }
  root.addEventListener('input', onInput); root.addEventListener('change', onInput); root.addEventListener('click', onClick); root.addEventListener('keydown', onKey);
  document.addEventListener('visibilitychange', onHidden);
  show(1);
  return () => { mine.dispose(); bug.dispose(); root.removeEventListener('input', onInput); root.removeEventListener('change', onInput); root.removeEventListener('click', onClick); root.removeEventListener('keydown', onKey); document.removeEventListener('visibilitychange', onHidden); };
}

/* ── 인쇄 기록·요청문 ── */
function mapText(walls, stars) { let t = ''; for (let y = 0; y < N; y++) { for (let x = 0; x < N; x++) { const i = y * N + x; t += i === 0 ? 'S' : walls.includes(i) ? '#' : stars.includes(i) ? '*' : '.'; } t += '\n'; } return t.trimEnd(); }
function miniMap(walls, stars) { let h = '<table class="pmap">'; for (let y = 0; y < N; y++) { h += '<tr>'; for (let x = 0; x < N; x++) { const i = y * N + x; h += `<td class="${walls.includes(i) ? 'w' : ''}">${i === 0 ? 'S' : stars.includes(i) ? '★' : ''}</td>`; } h += '</tr>'; } return h + '</table>'; }
function worksheet(data) {
  const d = normalize(data), b = d.bug, code = b.code, orig = bugCode(b.letter), cfgB = bugCfg(orig);
  const changed = Object.keys(CODE_OPTS).filter((k) => String(code[k]) !== String(orig[k]));
  const label = (k, v) => (CODE_OPTS[k].find((o) => String(o[0]) === String(v)) || ['', ''])[1];
  const line = { block: 2, add: 3, again: 4, win: 5 };
  let verify = '아직 하지 않음';
  if (b.repro.route && b.verified) { const a = simulate(bugCfg(code), b.repro.route); verify = `같은 길에서 규칙표대로 움직임 (점수 ${a.score}, 위치 ${where(a)})`; } else if (b.repro.route && changed.length) verify = '고친 뒤 같은 길 시험: 아직 규칙표와 다름 또는 시험 전';
  const suite = b.suite ? TESTS.map((t, i) => `<tr><td>${t.name}</td><td>${t.line}번</td><td>${b.suite[i] ? '통과' : '다름'}</td></tr>`).join('') : '';
  return `<article class="gsheet">
  <header><h1>게임 제작실 기록 · ${esc(d.title || '제목 없음')}</h1><p>셈제작소 · 한 화면 게임 만들기 · 이름 없이 기록합니다 · ${new Date().toLocaleDateString('sv-SE')}</p></header>
  <section><h2>1. 내 게임</h2><div class="pcols"><div>
    <p><b>성공</b> ${esc(d.ruleWin) || '—'}</p><p><b>실패</b> ${esc(d.ruleLose) || '—'}</p><p><b>점수</b> ${esc(d.ruleScore) || '—'}</p>
    <p>이길 점수 ${d.goal}점 · ${d.seconds}초 · 별 하나 ${d.points}점 · 별 ${d.stars.length}개 · 벽 ${d.walls.length}개</p>
    <table class="ptable"><tr><th>짝 시험</th><th>결과</th><th>본 것</th></tr>${CHECKS.map(([k, l]) => `<tr><td>${l}</td><td>${d.checks[k] === 'ok' ? '규칙대로' : d.checks[k] === 'odd' ? '이상함' : '—'}</td><td>${esc(d.checkNotes[k])}</td></tr>`).join('')}</table>
  </div><div>${miniMap(d.walls, d.stars)}<p class="cap">S 시작 · ■ 벽 · ★ 별</p></div></div></section>
  ${aiSheet(d)}
  <section><h2>3. 버그 판 ${b.letter} — 재현과 수정</h2>
    <table class="ptable"><tr><th>재현한 길</th><td>${esc(arrows(b.repro.route))}</td></tr><tr><th>규칙표 몇 번과 다름</th><td>${b.repro.rule ? b.repro.rule + '번 — ' + RULE_CARD[b.repro.rule - 1] : '—'}</td></tr>
    <tr><th>기대</th><td>${esc(b.repro.expect) || '—'}</td></tr><tr><th>실제</th><td>${esc(b.repro.actual) || '—'}</td></tr>
    <tr><th>같은 길 다시 실행</th><td>${b.repro.replayed ? (b.repro.differs ? '재현됨 (규칙표와 다른 결과가 다시 나옴)' : '이 길에서는 버그가 보이지 않음') : '아직 하지 않음'}</td></tr>
    <tr><th>수정 요청 문장</th><td>${esc(b.request) || '—'}</td></tr>
    <tr><th>바꾼 줄</th><td>${changed.length ? changed.map((k) => `${line[k]}번: “${esc(label(k, orig[k]))}” → “${esc(label(k, code[k]))}”`).join('<br>') : '없음'}</td></tr>
    <tr><th>고친 뒤 같은 길</th><td>${verify}</td></tr></table>
    ${suite ? `<table class="ptable"><tr><th>시험 길</th><th>관련 줄</th><th>결과</th></tr>${suite}</table>` : ''}</section>
  <section><h2>4. 정리</h2><p><b>고친 것과 근거</b> ${esc(d.reflectFix) || '—'}</p><p><b>아직 확인하지 못한 것</b> ${esc(d.reflectLeft) || '—'}</p><p><b>다음 시험</b> ${esc(d.reflectNext) || '—'}</p></section>
  <footer>버그 판의 버그는 수업용으로 미리 심어 둔 것입니다. AI 게임에 쓴 코드의 출처와 입력 방식은 위 ‘AI에 입력한 방법’ 기록을 따릅니다. 시험한 길에서 확인한 결과이고, 모든 경우가 맞다는 뜻은 아닙니다.</footer></article>`;
}
function cards(data) {
  const d = normalize(data), a = d.ai, ruleLabel = (AI_RULES.find(([k]) => k === a.rule) || ['', '(규칙 번호)'])[1];
  const c1 = `초등학생 수업에서 시험해 볼 한 화면 게임을 만들어 주세요.
- HTML 파일 하나에 CSS와 JavaScript를 모두 넣어 주세요. 외부 파일, 외부 라이브러리, 인터넷 주소, 저장 기능은 쓰지 마세요.
- 6×6 칸 판입니다. 시작 위치는 왼쪽 위(S)입니다. 키보드 화살표와 화면의 큰 방향 버튼(태블릿용)으로 한 칸씩 움직입니다.
- 판 모양 (S 시작, # 벽, * 별, . 빈칸):
${mapText(d.walls, d.stars)}
- 게임 제목: ${d.title || '(제목)'}
- 규칙 1 (성공): ${d.ruleWin || '(성공 규칙)'}
- 규칙 2 (실패): ${d.ruleLose || '(실패 규칙)'}
- 규칙 3 (점수): ${d.ruleScore || '(점수 규칙)'}
- 설정: 별 하나 ${d.points}점, 이길 점수 ${d.goal}점, 제한 시간 ${d.seconds}초. 벽과 판 밖으로는 갈 수 없습니다.
- 화면에 점수, 남은 시간, 게임 상태(진행 중 / 성공 / 실패)를 크게 보여 주고, ‘다시 시작’ 버튼을 넣어 주세요.
- 코드 맨 위 주석에 규칙을 번호로 적고, 각 규칙을 처리하는 코드 옆에 같은 번호 주석을 달아 주세요.
- 코드 앞뒤 설명은 초등학생이 읽을 수 있게 세 줄 이내로 써 주세요.`;
  const c2 = `방금 만든 게임을 시험해 보니 규칙과 다르게 움직이는 곳이 있었어요. 이 부분만 고친 전체 코드를 다시 주세요. 무엇을 바꿨는지 한 줄로 알려 주세요.
- 시작부터 누른 길: ${a.route ? arrows(a.route) : '(누른 방향 순서)'}
- ${ruleLabel}에 따르면: ${a.expect || '(기대한 결과)'}
- 실제로는: ${a.actual || '(실제 결과)'}
다른 규칙과 판 모양은 그대로 두어 주세요. 인터넷 주소, 바깥 파일, 저장 기능은 이번에도 쓰지 마세요.
고친 뒤에 같은 길로 다시 시험해 확인하겠습니다.`;
  const np = d.points === 3 ? 1 : d.points + 1;
  const c2b = `다른 규칙과 판 모양은 그대로 두고, 별 하나의 점수만 ${np}점으로 바꾼 전체 코드를 주세요. 무엇을 바꿨는지 한 줄로 알려 주세요.
인터넷 주소, 바깥 파일, 저장 기능은 이번에도 쓰지 마세요.
(바꾼 뒤 같은 길로 다시 해서 점수만 바뀌었는지 확인하겠습니다.)`;
  // 카드 3: 2회 방문에서 지난 대화가 안 열릴 때 새 대화에 붙여 넣는 카드 (규칙·판·재현 기록·지난번 코드를 모두 담음)
  const prev = a.code2 || a.code1;
  const c3 = `지난 시간에 AI와 함께 만든 한 화면 게임을 이어서 고치려고 해요. 지난 대화는 열 수 없어서 새 대화에 다시 적어요.
아래 규칙과 지난번에 받은 코드를 읽고, 시험에서 규칙과 다르게 움직인 부분만 고친 전체 코드를 주세요. 무엇을 바꿨는지 한 줄로 알려 주세요.
- 판 모양 (S 시작, # 벽, * 별, . 빈칸):
${mapText(d.walls, d.stars)}
- 게임 제목: ${d.title || '(제목)'}
- 규칙 1 (성공): ${d.ruleWin || '(성공 규칙)'}
- 규칙 2 (실패): ${d.ruleLose || '(실패 규칙)'}
- 규칙 3 (점수): ${d.ruleScore || '(점수 규칙)'}
- 설정: 별 하나 ${d.points}점, 이길 점수 ${d.goal}점, 제한 시간 ${d.seconds}초.
- 시험 기록: 시작부터 누른 길 ${a.route ? arrows(a.route) : '(누른 방향 순서)'} · ${ruleLabel}에 따르면 ${a.expect || '(기대한 결과)'} · 실제로는 ${a.actual || '(실제 결과)'}
다른 규칙과 판 모양은 그대로 두어 주세요. 인터넷 주소, 바깥 파일, 저장 기능은 쓰지 마세요.
[지난번에 받은 코드]
${prev || '(시험대에 붙여 넣었던 코드를 여기에 붙여 넣기)'}`;
  return { '1': c1, '2': c2, '2b': c2b, '3': c3 };
}
function prompt(data) {
  const c = cards(data);
  return `[요청 카드 4장] 학생이 학교 계정 AI 화면에 직접 붙여 넣는 카드입니다. 로그인이 안 되면 교탁 기기에서 학생이 와서 직접 붙여 넣습니다.
이 화면은 AI에 자동으로 보내지 않습니다. 학생 이름·학교·반은 넣지 않습니다.

━━ 카드 1 · 게임 만들어 주세요 ━━
${c['1']}

━━ 카드 2 · 고쳐 주세요 (게임을 시험한 뒤, 같은 대화에서) ━━
${c['2']}

━━ 카드 2-B · 다른 곳을 못 찾았을 때: 규칙 하나 바꿔 주세요 ━━
${c['2b']}

━━ 카드 3 · 새 대화로 이어서 (두 번째 방문에 지난 대화가 안 열릴 때) ━━
${c['3']}

※ 받은 코드는 제작실 ‘AI 게임 시험대’에 붙여 넣어 기본 검사 뒤 막힌 상자에서만 엽니다. 인터넷 주소·바깥 파일·저장 기능이 있으면 열지 않고 다시 요청합니다.`;
}
function aiSheet(d) {
  const a = d.ai, by = (AI_BY.find(([k]) => k === a.by) || ['', '표시 안 함'])[1];
  const vl = { ok: '맞음', diff: '다름', na: '못 해 봄', '': '—' }, al = { same: '같았다', diff: '달랐다', na: '아직 못 해 봄', '': '—' };
  const rule = (AI_RULES.find(([k]) => k === a.rule) || ['', '—'])[1];
  const sl = { ai: 'AI에게 받은 코드', sample: '미리 받아 둔 예시 코드', '': '—' }, src = a.code2 ? `첫 코드: ${sl[a.src1]} · 고친 코드: ${sl[a.src2]}` : sl[a.src1];
  return `<section><h2>2. AI 게임 시험</h2>
    <table class="ptable"><tr><th>AI에 입력한 방법</th><td>${esc(by)}</td></tr><tr><th>시험한 코드</th><td>${src}</td></tr>${VERDICT.map(([k, l]) => `<tr><th>${l}</th><td>${vl[a.verdict[k]]}</td></tr>`).join('')}
    <tr><th>다르게 움직인 길</th><td>${esc(a.route ? arrows(a.route) : '—')} · ${esc(rule)}</td></tr><tr><th>기대 / 실제</th><td>${esc(a.expect) || '—'} / ${esc(a.actual) || '—'}</td></tr>
    <tr><th>AI가 고쳤다고 한 것</th><td>${esc(a.said) || '—'}</td></tr><tr><th>같은 길로 다시 해 보니</th><td>${al[a.after]}</td></tr></table></section>`;
}
const bookCSS = `.gsheet{background:#fff;max-width:186mm;margin:0 auto 12px;padding:10mm 11mm;font-family:"Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",sans-serif;color:#10221f;font-size:10.5pt;line-height:1.55;word-break:keep-all}
.gsheet header{border-bottom:2px solid #0b7a75;padding-bottom:3mm;margin-bottom:4mm}.gsheet h1{font-size:16pt;margin:0}.gsheet header p{margin:1mm 0 0;color:#3d524e;font-size:9pt}
.gsheet h2{font-size:12pt;color:#08605c;margin:5mm 0 2mm;break-after:avoid}.gsheet p{margin:1mm 0}.gsheet section{break-inside:avoid-page}
.gsheet .pcols{display:grid;grid-template-columns:1fr 46mm;gap:6mm;align-items:start}
.gsheet .ptable{width:100%;border-collapse:collapse;margin:2mm 0;font-size:9.5pt}.gsheet .ptable th,.gsheet .ptable td{border:1px solid #a9cbc5;padding:1.4mm 2mm;text-align:left;vertical-align:top}.gsheet .ptable th{background:#e9f5f2;width:34%}
.gsheet .pmap{border-collapse:collapse;margin:0 auto}.gsheet .pmap td{width:7mm;height:7mm;border:1px solid #a9cbc5;text-align:center;font-size:9pt;color:#0b7a75}.gsheet .pmap td.w{background:#24423d}.gsheet .cap{text-align:center;font-size:8pt;color:#5c706c}
.gsheet footer{margin-top:5mm;border-top:1px solid #cfe3df;padding-top:2mm;font-size:8.5pt;color:#5c706c}`;

function demo() {
  return normalize({
    title: '별 정원 탈출', ruleWin: '별을 모아 3점이 되면 성공', ruleLose: '60초가 지나면 실패', ruleScore: '별 하나는 1점, 같은 별은 한 번만',
    goal: 3, seconds: 60, points: 1, walls: [...PRESETS.normal.walls], stars: [5, 10, 20, 29],
    checks: { edge: 'ok', wall: 'ok', again: 'ok', end: 'odd' }, checkNotes: { edge: '맨 위에서 위로 눌러도 그대로', wall: '벽 앞에서 멈춤', again: '별이 사라지고 점수 그대로', end: '시간 끝은 아직 못 봄' },
    runs: [{ board: 'mine', route: 'RRRRRDD', score: 2, left: 2, end: '직접 끝냄' }, { board: 'bug', route: 'RRRD', score: 2, left: 3, end: '직접 끝냄', letter: 'A' }],
    bug: { letter: 'A', code: { block: 'wallEdge', add: 1, again: 'no', win: 'gte' }, repro: { route: 'RRR', rule: 3, expect: '별 1개를 먹었으니 1점', actual: '2점이 되었다', replayed: true, differs: true }, request: '별 하나를 먹으면 1점이어야 하는데 2점이 돼요. 3번 줄을 점수 + 1로 고쳐 주세요.', verified: true, suite: [true, true, true, true] },
    reflectFix: '3번 줄을 +2에서 +1로 바꿨다. →→→ 길로 다시 해서 1점이 나온 것을 봤다.', reflectLeft: '시간이 끝날 때 실패가 되는지는 아직 시험하지 못했다.', reflectNext: '90초를 기다려 시간 끝 시험하기'
  });
}

window.GameStudio = { version: '0.3', defaults, normalize, demo, mount, worksheet, prompt, cards, bookCSS, ai: { scanCode, cleanCode, sandboxDoc, SANDBOX_CSP }, logic: { makeState, step, simulate, sameResult, reachable, runSuite, bugCode, mapProblems, arrows, TESTS, BUG_MAP, PRESETS, CORRECT, BUGS } };
})();
