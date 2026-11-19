/* Gambit — UI, clocks, notation, sound. */
(function () {
  'use strict';

  var E = window.Engine;
  var AI = window.AI;
  var Art = window.PieceArt;
  var Review = window.GameReview;
  var Openings = window.Openings;
  var Variants = window.Variants;
  var Results = window.Results;
  var Drills = window.Drills;
  var Coach = window.Coach;
  var Explain = window.Explain;
  var Achievements = window.Achievements;
  var Ratings = window.Ratings;
  var Trainer = window.Trainer;
  var Quests = window.Quests;
  var AccountStore = window.Accounts;
  var ErrorLog = window.ErrorLog;
  var Placement = window.Placement;

  var $ = function (id) { return document.getElementById(id); };
  var FILES = E.FILES;
  var START_COUNT = { P: 8, N: 2, B: 2, R: 2, Q: 1, K: 1 };
  var POINTS = { P: 1, N: 3, B: 3, R: 5, Q: 9, K: 0 };

  /* ---------------- settings ---------------- */

  var DEFAULTS = {
    theme: 'green', pieceStyle: 'classic', coords: true, hints: true, anim: true, sound: true,
    autoFlip: false, blindfold: false, autoQueen: false,
    accent: 'green', glass: 'frosted',
    notify: true, notifyReminders: true, notifyAchievements: true
  };
  var settings = loadSettings();

  function loadSettings() {
    try {
      var raw = JSON.parse(localStorage.getItem('gambit.settings') || '{}');
      return Object.assign({}, DEFAULTS, raw);
    } catch (err) {
      return Object.assign({}, DEFAULTS);
    }
  }

  function saveSettings() {
    try { localStorage.setItem('gambit.settings', JSON.stringify(settings)); } catch (err) { /* ignore */ }
  }

  /* ---------------- state ---------------- */

  var S = {
    game: new E.Chess(),
    mode: 'ai',
    level: 3,
    playerColor: 'w',
    base: 300,
    inc: 0,
    clocks: { w: 300000, b: 300000 },
    started: false,
    running: false,
    lastTick: 0,
    selected: -1,
    positions: [{ fen: E.START_FEN, san: null, move: null, mover: null }],
    cursor: 0,
    lost: { w: [], b: [] },
    result: null,
    thinking: false,
    flipped: false,
    screen: 'play',
    puzzle: null,
    token: 0,
    drag: null,
    soundOn: settings.sound,
    review: null,
    coachHint: null,
    net: null,
    variant: 'standard',
    checks: { w: 0, b: 0 },
    rush: null,
    coachBase: null,
    coachNotes: {},
    coachChat: [],
    coachAsk: null,
    lastNotePly: null,
    coachSeq: 0,
    drill: null,
    showWhy: null,
    replay: null,
    arrows: [],
    practice: null,
    ladderGame: false,
    daily: false,
    startedAt: 0
  };

  var pending = { mode: 'ai', level: 3, color: 'w', base: 300, inc: 0, variant: 'standard' };

  var PUZZLES = window.PUZZLES || [];
  var saved = { play: null, analysis: null, puzzles: null };
  var P = { index: 0, rating: 1200, streak: 0, solved: 0 };
  var evalToken = 0;
  var evalTimer = null;
  var lastEval = null;
  var dailyState = loadJSON('gambit.daily', { day: 0, streak: 0, done: false });
  var ladderState = loadJSON('gambit.ladder', { step: 1, best: 1 });
  var questState = loadJSON('gambit.quests', Quests.empty(dayNumber()));
  var openingDone = loadJSON('gambit.openings', {});
  var statsFilter = 'all';
  var statsQuery = '';
  var pzFilter = 'all';
  var trainer = null;
  var ed = null;
  var THEMES = ['green', 'walnut', 'slate', 'ink', 'sunset', 'ocean', 'rose', 'paper', 'night'];

  function loadJSON(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || 'null') || fallback; }
    catch (err) { return fallback; }
  }

  function saveJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (err) { /* ignore */ }
  }

  var record = loadJSON('gambit.record', { w: 0, l: 0, d: 0 });
  /* A new device starts at 0 until the placement test says otherwise — skipping
     the test is exactly this zero. */
  var ratingState = loadJSON('gambit.rating', { r: 0, best: 0, games: 0 });
  if (!ratingState || typeof ratingState.r !== 'number') ratingState = { r: 0, best: 0, games: 0 };
  var pzStats = loadJSON('gambit.puzzles', { rating: 1200, streak: 0, solved: 0, best: 0, rushBest: 0 });
  var games = loadJSON('gambit.games', []).map(normalizeGame);

  P.rating = pzStats.rating;
  P.streak = pzStats.streak;
  P.solved = pzStats.solved;

  var boardEl = $('board');
  var movesEl = $('movesList');

  /* ---------------- sound ---------------- */

  var audioCtx = null;

  function ac() {
    if (!settings.sound) return null;
    if (!audioCtx) {
      var C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      try { audioCtx = new C(); } catch (err) { return null; }
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  function blip(freq, dur, type, vol, delay) {
    var ctx = ac();
    if (!ctx) return;
    var t0 = ctx.currentTime + (delay || 0);
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(vol == null ? 0.12 : vol, t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.03);
  }

  function playEvent(kind) {
    if (!settings.sound) return;
    if (kind === 'move') { blip(320, 0.07, 'triangle', 0.11); blip(190, 0.06, 'sine', 0.05, 0.03); }
    else if (kind === 'capture') { blip(150, 0.11, 'square', 0.08); blip(95, 0.14, 'triangle', 0.11, 0.02); }
    else if (kind === 'castle') { blip(240, 0.07, 'triangle', 0.09); blip(330, 0.08, 'triangle', 0.09, 0.08); }
    else if (kind === 'check') { blip(700, 0.09, 'sine', 0.11); blip(960, 0.11, 'sine', 0.09, 0.1); }
    else if (kind === 'correct') { blip(660, 0.09, 'sine', 0.1); blip(880, 0.13, 'sine', 0.08, 0.08); }
    else if (kind === 'wrong') { blip(170, 0.15, 'sawtooth', 0.06); blip(110, 0.2, 'sine', 0.06, 0.05); }
    else if (kind === 'end') {
      [523, 659, 784].forEach(function (f, i) { blip(f, 0.26, 'sine', 0.09, i * 0.12); });
    } else if (kind === 'start') { blip(440, 0.07, 'sine', 0.09); blip(660, 0.1, 'sine', 0.09, 0.07); }
    else if (kind === 'illegal') { blip(150, 0.09, 'sawtooth', 0.04); }
  }

  /* ---------------- helpers ---------------- */

  /* A notification card: a short title, an optional detail line, and a bar that
     drains while it is on screen. */
  var TOAST_MS = 2600;

  function toast(msg, detail, kind) {
    var el = $('toast');
    if (!el) return;

    var title = $('toastTitle');
    if (title) title.textContent = msg;
    else el.textContent = msg;

    var meta = $('toastMeta');
    if (meta) meta.textContent = detail || 'Just now';

    if (kind) el.setAttribute('data-kind', kind);
    else el.removeAttribute('data-kind');

    el.hidden = false;
    if (!el.classList.contains('show')) {
      void el.offsetWidth;
      el.classList.add('show');
    }

    var life = el.querySelector('.toast-life');
    if (life) {
      life.style.animation = 'none';
      void life.offsetWidth;
      life.style.animation = '';
    }

    clearTimeout(toast._t);
    toast._t = setTimeout(function () {
      el.classList.remove('show');
      setTimeout(function () { el.hidden = true; }, 260);
    }, TOAST_MS);
  }

  function fmtClock(ms) {
    if (S.base === 0) return '\u221e';
    var s = ms / 1000;
    if (s < 20) return s.toFixed(1);
    var total = Math.ceil(s);
    var m = Math.floor(total / 60);
    var sec = total % 60;
    return m + ':' + (sec < 10 ? '0' : '') + sec;
  }

  function isLive() { return S.cursor === S.positions.length - 1; }

  function recomputeCaptured() {
    var counts = {
      w: { P: 0, N: 0, B: 0, R: 0, Q: 0, K: 0 },
      b: { P: 0, N: 0, B: 0, R: 0, Q: 0, K: 0 }
    };
    S.game.board.forEach(function (p) {
      if (!p) return;
      counts[E.colorOf(p)][p.toUpperCase()]++;
    });
    S.lost = { w: [], b: [] };
    ['Q', 'R', 'B', 'N', 'P'].forEach(function (t) {
      var missW = Math.max(0, START_COUNT[t] - counts.w[t]);
      var missB = Math.max(0, START_COUNT[t] - counts.b[t]);
      var i;
      for (i = 0; i < missW; i++) S.lost.w.push(t);
      for (i = 0; i < missB; i++) S.lost.b.push(t);
    });
  }

  function whiteAdvantage() {
    var diff = 0;
    S.lost.b.forEach(function (t) { diff += POINTS[t]; });
    S.lost.w.forEach(function (t) { diff -= POINTS[t]; });
    return diff;
  }

  /* ---------------- rendering ---------------- */

  function renderBoard(opts) {
    opts = opts || {};
    var pos = S.positions[S.cursor];
    var probe = new E.Chess(pos.fen);
    var board = probe.board;
    var live = isLive();
    var checkSq = probe.inCheck() ? probe.kings[probe.turn] : -1;
    var move = pos.move;

    var hints = Object.create(null);
    if (live && !S.result && S.selected >= 0 && settings.hints) {
      S.game.legalMoves().forEach(function (m) {
        if (m.from === S.selected) hints[m.to] = true;
      });
    }

    var html = '';
    for (var d = 0; d < 64; d++) {
      var i = S.flipped ? 63 - d : d;
      var p = board[i];
      var cls = 'sq ' + (E.isLight(i) ? 'light' : 'dark');
      if (move && (i === move.from || i === move.to)) cls += ' last';
      if (i === S.selected) cls += ' sel';
      if (i === checkSq) cls += ' check';
      if (hints[i]) cls += p ? ' hint-cap' : ' hint';
      if (S.coachHint && (i === S.coachHint.from || i === S.coachHint.to)) cls += ' coach-hint';

      html += '<div class="' + cls + '" data-i="' + i + '">';
      if (settings.coords && (d >> 3) === 7) {
        html += '<span class="coord file">' + FILES.charAt(i & 7) + '</span>';
      }
      if (settings.coords && (d & 7) === 0) {
        html += '<span class="coord rank">' + (8 - (i >> 3)) + '</span>';
      }
      if (p && !settings.blindfold) html += Art.svg(p);
      html += '</div>';
    }
    boardEl.innerHTML = html;
    renderArrows();
    boardEl.classList.toggle('review', !live);
    if (opts.animateMove) animateMove(opts.animateMove);
  }

  function slidePiece(sq, dx, dy) {
    var el = boardEl.querySelector('.sq[data-i="' + sq + '"] .piece');
    if (!el) return;
    el.style.setProperty('--dx', dx + '%');
    el.style.setProperty('--dy', dy + '%');
    el.classList.add('slide');
  }

  function animateMove(move) {
    if (!settings.anim || !move) return;
    var dirX = S.flipped ? -1 : 1;
    var dirY = S.flipped ? -1 : 1;
    slidePiece(move.to,
      (E.colOf(move.from) - E.colOf(move.to)) * 100 * dirX,
      (E.rowOf(move.from) - E.rowOf(move.to)) * 100 * dirY);
    if (move.castle === 'k') slidePiece(move.from + 1, 200 * dirX, 0);
    if (move.castle === 'q') slidePiece(move.from - 1, -300 * dirX, 0);
    if (move.captured || move.ep) {
      var landed = boardEl.querySelector('.sq[data-i="' + move.to + '"]');
      if (landed) {
        landed.classList.add('burst');
        setTimeout(function () { landed.classList.remove('burst'); }, 520);
      }
    }
  }

  function playerName(color) {
    if (S.mode === 'online') {
      if (S.net && S.net.names && S.net.names[color]) return S.net.names[color];
      return color === 'w' ? 'White' : 'Black';
    }
    if (S.mode === 'coach') return color === S.playerColor ? 'You' : 'Coach';
    if (S.mode === 'human') return color === 'w' ? 'White' : 'Black';
    return color === S.playerColor ? 'You' : 'Computer';
  }

  /* wins-losses-draws, the way chess scoresheets write it: 3-2-0 */
  function recordTag() { return record.w + '-' + record.l + '-' + record.d; }

  function playerMeta(color) {
    if (S.mode === 'online') {
      return S.net && S.net.seat === color ? 'You \u00b7 online' : 'Online';
    }
    if (S.variant === 'threecheck') return 'Checks ' + S.checks[color] + '/3';
    if (S.mode === 'coach') {
      return color === S.playerColor
        ? 'Elo ' + Math.round(ratingState.r) + ' · live feedback · ' + recordTag()
        : 'Coach · Elo ' + Ratings.levelRating(S.level);
    }
    if (S.mode === 'human') return 'Local player';
    if (color === S.playerColor) {
      return 'Elo ' + Math.round(ratingState.r) + ' \u00b7 ' + Ratings.band(ratingState.r) +
        ' \u00b7 ' + recordTag();
    }
    return 'Level ' + S.level + ' \u00b7 Elo ' + Ratings.levelRating(S.level);
  }

  function paintClock(el, color) {
    el.textContent = fmtClock(S.clocks[color]);
    el.classList.toggle('low', S.base > 0 && S.clocks[color] < 20000);
    el.classList.toggle('active', !S.result && S.game.turn === color);
  }

  function renderClocks() {
    paintClock($('clockTop'), S.flipped ? 'w' : 'b');
    paintClock($('clockBottom'), S.flipped ? 'b' : 'w');
  }

  function fillPlayer(which, color) {
    $('name' + which).textContent = playerName(color);
    $('meta' + which).textContent = playerMeta(color);
    var avatar = $('avatar' + which);
    avatar.textContent = playerName(color).charAt(0);
    avatar.classList.toggle('dark', color === 'b');

    var lostByThem = S.lost[color === 'w' ? 'b' : 'w'];
    $('cap' + which).innerHTML = lostByThem.map(function (t) { return Art.svg(t); }).join('');
    $('player' + which).classList.toggle('thinking', !!S.thinking && isBotSide(color));

    var diff = whiteAdvantage() * (color === 'w' ? 1 : -1);
    $('adv' + which).textContent = diff > 0 ? '+' + diff : '';
  }

  function renderPlayers() {
    var top = S.flipped ? 'w' : 'b';
    var bottom = S.flipped ? 'b' : 'w';
    fillPlayer('Top', top);
    fillPlayer('Bottom', bottom);
    renderClocks();
  }

  function renderStatus() {
    var el = $('status');
    if (S.screen === 'play') updateCoach();
    /* the online lockout follows the game state, so refresh the nav with it */
    syncNav();

    if (S.screen === 'puzzles' && S.puzzle) {
      var pz = S.puzzle;
      el.textContent = pz.solved
        ? 'Solved \u2014 mate in ' + pz.mateIn
        : 'Puzzle ' + (pz.index + 1) + ' of ' + PUZZLES.length + ' \u2014 mate in ' + pz.mateIn;
      return;
    }
    if (S.screen === 'review') {
      el.textContent = S.review && S.review.running
        ? 'Game review \u2014 analysing position ' + S.review.done + ' of ' + S.review.positions.length + '\u2026'
        : 'Game review \u2014 step through the moves for coach notes';
      return;
    }
    if (S.screen === 'analysis') {
      el.textContent = (S.game.turn === 'w' ? 'White' : 'Black') + ' to move \u2014 free analysis';
      return;
    }

    if (S.replay) {
      var turn = S.positions[S.cursor].fen.split(' ')[1];
      el.textContent = S.thinking
        ? (isCoach() ? 'Coach' : 'Computer') + ' is thinking\u2026'
        : (turn === 'w' ? 'White' : 'Black') + ' to move \u00b7 replay';
      el.classList.toggle('thinking', !!S.thinking);
      return;
    }

    el.classList.toggle('thinking', !!S.thinking);

    if (S.result) {
      var finished = resultText();
      el.textContent = finished.title + ' \u2014 ' + finished.sub;
    } else if (!isLive()) {
      el.textContent = 'Reviewing move ' + S.cursor + ' of ' + (S.positions.length - 1) + ' \u2014 press \u23ed to return';
    } else if (S.thinking) {
      el.textContent = (isCoach() ? 'Coach' : 'Computer') + ' is thinking\u2026';
    } else {
      var side = S.game.turn === 'w' ? 'White' : 'Black';
      var check = S.game.inCheck() ? ' \u2014 check!' : '';
      var who = (S.mode === 'ai' || S.mode === 'coach') && S.game.turn === S.playerColor ? ' (your move)' : '';
      el.textContent = side + ' to move' + who + check;
    }
  }

  function renderMoves() {
    var hist = S.positions.slice(1);
    var html = '';
    for (var i = 0; i < hist.length; i += 2) {
      html += '<div class="mrow"><span class="mnum">' + (i / 2 + 1) + '.</span>';
      html += '<button class="san' + (S.cursor === i + 1 ? ' cur' : '') + '" data-ply="' + (i + 1) + '">' + hist[i].san + moveBadge(i + 1) + '</button>';
      if (hist[i + 1]) {
        html += '<button class="san' + (S.cursor === i + 2 ? ' cur' : '') + '" data-ply="' + (i + 2) + '">' + hist[i + 1].san + moveBadge(i + 2) + '</button>';
      } else {
        html += '<span class="san empty"></span>';
      }
      html += '</div>';
    }
    movesEl.innerHTML = html || '<div class="empty-state">No moves yet. Click a piece to begin \u2014 or drag it to a square.</div>';
    /* Keep the current move in view inside the list only. scrollIntoView also
       scrolls the page, which used to yank the board out of view on every
       move; this moves the list's own scrollTop and nothing else. */
    var cur = movesEl.querySelector('.san.cur');
    if (cur) {
      var box = movesEl.getBoundingClientRect();
      var row = cur.getBoundingClientRect();
      if (row.top < box.top) movesEl.scrollTop -= box.top - row.top;
      else if (row.bottom > box.bottom) movesEl.scrollTop += row.bottom - box.bottom;
    }
    renderReviewNote();
    renderCoachNote();
  }

  function moveBadge(ply) {
    if (S.screen !== 'review' || !S.review) return '';
    var entry = S.review.moves[ply];
    if (!entry) return '';
    var info = Review.LABELS[entry.cls];
    if (!info || !info.sym) return '';
    return '<i class="mvq ' + entry.cls + '" title="' + info.label + '">' + info.sym + '</i>';
  }

  function renderAll(opts) {
    renderBoard(opts);
    renderPlayers();
    renderMoves();
    renderStatus();
    renderModeExtras();
    $('fenText').textContent = 'FEN';
  }

  /* ---------------- game flow ---------------- */

  /* ---------------- extras: resume, sharing, files, focus ---------------- */

  function saveResume() {
    if (S.drill || S.mode === 'online' || S.screen !== 'play') return;
    if (S.positions.length < 2 || S.result) return;
    saveJSON('gambit.resume', {
      sans: S.positions.slice(1).map(function (p) { return p.san; }),
      start: S.positions[0].fen,
      mode: S.mode,
      level: S.level,
      playerColor: S.playerColor,
      base: S.base,
      inc: S.inc,
      variant: S.variant,
      flipped: S.flipped,
      clocks: { w: S.clocks.w, b: S.clocks.b },
      at: Date.now()
    });
  }

  function resumeGame() {
    var r = loadJSON('gambit.resume', null);
    if (!r || !r.sans || !r.sans.length) return false;

    var rebuilt;
    try { rebuilt = sansToPositions(r.sans, r.start); }
    catch (err) { return false; }
    if (!rebuilt || !rebuilt.positions || rebuilt.positions.length < 2) return false;

    S.token++;
    S.screen = 'play';
    document.body.dataset.screen = 'play';
    S.mode = r.mode === 'human' ? 'human' : r.mode === 'coach' ? 'coach' : 'ai';
    S.level = r.level || 3;
    S.playerColor = r.playerColor === 'b' ? 'b' : 'w';
    S.base = r.base || 0;
    S.inc = r.inc || 0;
    S.variant = r.variant || 'standard';
    S.checks = { w: 0, b: 0 };
    S.game = rebuilt.game;
    S.positions = rebuilt.positions;
    S.cursor = S.positions.length - 1;
    S.flipped = !!r.flipped;
    S.clocks = r.clocks || { w: 0, b: 0 };
    S.lost = { w: [], b: [] };
    S.result = null;
    S.started = true;
    S.running = false;
    S.selected = -1;
    S.thinking = false;
    S.ratingChange = null;
    S.arrows = [];
    S.practice = null;
    $('resultLayer').hidden = true;
    recomputeCaptured();
    syncNav();
    renderAll();
    if (S.mode === 'coach') coachGreet('Picking up where we left off.');
    toast('Resumed your last game.');
    if (!S.result) maybeAI();
    coachPrime();
    return true;
  }

  function sharedFen() {
    var m = /(?:^#|&)fen=([^&]+)/.exec(location.hash || '');
    if (!m) return null;
    var fen;
    try { fen = decodeURIComponent(m[1]); } catch (err) { return null; }
    try { new E.Chess(fen); } catch (err) { return null; }
    return fen;
  }

  function shareLink() {
    var url = location.origin + location.pathname + '#fen=' + encodeURIComponent(S.positions[S.cursor].fen);
    copyText(url, 'Position link');
  }

  function downloadText(text, filename, label) {
    try {
      var blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
      toast(label + ' downloaded.');
      return true;
    } catch (err) {
      toast('Download failed.');
      return false;
    }
  }

  function downloadPgn() {
    downloadText(buildPgn(), 'gambit-game.pgn', 'PGN');
  }

  function archivePgn(g) {
    var d = new Date(g.at || Date.now());
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    var date = d.getFullYear() + '.' + pad(d.getMonth() + 1) + '.' + pad(d.getDate());
    var foe = g.mode === 'online' ? 'Online' : (g.mode === 'ai' || g.mode === 'coach') ? 'Computer' : 'Friend';
    var white = g.you === 'b' ? foe : 'You';
    var black = g.you === 'w' ? foe : 'You';
    if (!g.you) { white = 'White'; black = 'Black'; }

    var head = '[Event "Casual game"]\n[Site "Gambit"]\n[Date "' + date + '"]\n[Round "-"]\n' +
      '[White "' + white + '"]\n[Black "' + black + '"]\n[Result "' + Results.pgn(g.code) + '"]\n\n';
    var body = '';
    (g.sans || []).forEach(function (san, i) {
      if (i % 2 === 0) body += (i / 2 + 1) + '. ';
      body += san + ' ';
    });
    return head + body + Results.pgn(g.code);
  }

  function reviewReport() {
    var rv = S.review;
    if (!rv) return '';
    var names = { w: playerName('w'), b: playerName('b') };
    var lines = ['# Gambit game report', ''];
    lines.push('- Date: ' + new Date().toLocaleString());
    lines.push('- Opening: ' + (rv.opening || 'Uncommon line'));
    if (S.result) {
      var t = Results.text(S.result.code, S.result.reason);
      lines.push('- Result: ' + t.title + ' ' + t.sub);
    }
    lines.push('- Moves: ' + Math.max(0, rv.positions.length - 1));
    if (rv.acc) {
      var accW = rv.acc.w == null ? 'n/a' : Math.round(rv.acc.w) + '%';
      var accB = rv.acc.b == null ? 'n/a' : Math.round(rv.acc.b) + '%';
      lines.push('- Accuracy: ' + names.w + ' ' + accW + ' \u00b7 ' + names.b + ' ' + accB);
    }
    if (rv.elo && rv.elo.w != null && rv.elo.b != null) {
      lines.push('- Performance \u2248 ' + Math.round((rv.elo.w + rv.elo.b) / 2));
    }

    lines.push('', '## How each side played');
    ['w', 'b'].forEach(function (c) {
      var counts = (rv.counts && rv.counts[c]) || {};
      var parts = Object.keys(counts).filter(function (k) { return Review.LABELS[k] && counts[k]; })
        .map(function (k) { return Review.LABELS[k].label + ' ' + counts[k]; });
      lines.push('- ' + names[c] + ': ' + (parts.length ? parts.join(', ') : 'no moves'));
    });

    var worst = [];
    Object.keys(rv.moves || {}).forEach(function (k) {
      var m = rv.moves[k];
      if (!m || !(m.loss > 0)) return;
      worst.push({ ply: Number(k), m: m });
    });
    worst.sort(function (a, b) { return b.m.loss - a.m.loss; });

    if (worst.length) {
      lines.push('', '## Costliest moves');
      worst.slice(0, 3).forEach(function (w) {
        var label = Review.LABELS[w.m.cls] ? Review.LABELS[w.m.cls].label : w.m.cls;
        lines.push('- Move ' + Math.ceil(w.ply / 2) + (w.ply % 2 ? '.' : '...') + ' ' + w.m.san +
          ' (' + label + ')' + (w.m.bestSan ? ' \u2014 best was ' + w.m.bestSan : '') +
          (w.m.explain ? '. ' + w.m.explain : ''));
      });
    }

    lines.push('', '## Moves', buildPgn());
    return lines.join('\n');
  }

  function toggleFocus() {
    var on = document.body.classList.toggle('focus');
    $('focusBtn').classList.toggle('active', on);
    $('focusBtn').setAttribute('aria-pressed', on ? 'true' : 'false');
    toast(on ? 'Focus mode \u2014 press Z to leave.' : 'Focus mode off.');
  }

  /* ---------------- arrows on the board ---------------- */

  var arrowDrag = null;

  function arrowSqFromEvent(ev) {
    var el = document.elementFromPoint(ev.clientX, ev.clientY);
    var sq = el && el.closest ? el.closest('.sq') : null;
    return sq ? Number(sq.getAttribute('data-i')) : -1;
  }

  function renderArrows() {
    var layer = boardEl.querySelector('.arrow-layer');
    if (!layer) {
      layer = document.createElement('div');
      layer.className = 'arrow-layer';
      boardEl.appendChild(layer);
    }

    var list = (S.arrows || []).slice();
    if (S.coachHint) list.push({ from: S.coachHint.from, to: S.coachHint.to, coach: true });
    if (!list.length) { layer.innerHTML = ''; return; }

    function pt(i) {
      var d = S.flipped ? 63 - i : i;
      return [(d & 7) * 8 + 4, (d >> 3) * 8 + 4];
    }

    var body = list.map(function (a) {
      var from = pt(a.from), to = pt(a.to);
      var dx = to[0] - from[0], dy = to[1] - from[1];
      var len = Math.sqrt(dx * dx + dy * dy) || 1;
      var ux = dx / len, uy = dy / len;
      return '<line class="' + (a.coach ? 'coach' : 'you') + '" x1="' +
        (from[0] + ux * 3.2).toFixed(2) + '" y1="' + (from[1] + uy * 3.2).toFixed(2) +
        '" x2="' + (to[0] - ux * 3).toFixed(2) + '" y2="' + (to[1] - uy * 3).toFixed(2) +
        '" marker-end="url(#' + (a.coach ? 'coachHead' : 'arrowHead') + ')"/>';
    }).join('');

    layer.innerHTML = '<svg viewBox="0 0 64 64" aria-hidden="true">' +
      '<defs>' +
      '<marker id="arrowHead" viewBox="0 0 6 6" refX="4.4" refY="3" markerWidth="3" ' +
      'markerHeight="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z"/></marker>' +
      '<marker id="coachHead" class="coach" viewBox="0 0 6 6" refX="4.4" refY="3" markerWidth="3" ' +
      'markerHeight="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z"/></marker>' +
      '</defs>' + body + '</svg>';
  }

  /* ---------------- daily puzzle, ladder ---------------- */

  function dayNumber() { return Math.floor(Date.now() / 86400000); }

  function startDaily() {
    if (!PUZZLES.length) return;
    var idx = dayNumber() % PUZZLES.length;
    startPuzzle(idx, { exact: true });
    S.daily = true;
    toast('Puzzle of the day \u2014 mate in ' + PUZZLES[idx].mateIn + '.');
  }

  function renderLadder() {
    var text = $('ladderText');
    if (!text) return;
    var step = Math.min(5, Math.max(1, ladderState.step || 1));
    var cleared = (ladderState.step || 1) > 5;
    text.textContent = cleared ? 'Cleared' : 'Step ' + step + ' of 5';
    $('ladderSub').textContent = cleared
      ? 'You beat every bot. Play it again for a fresh run.'
      : 'Beat the bots in order, from Beginner to Master. Next: Level ' + step + '.';
    $('ladderBtn').textContent = cleared ? 'Play the ladder again' : 'Beat Level ' + step;
  }

  function startLadder() {
    var cleared = (ladderState.step || 1) > 5;
    if (cleared) { ladderState.step = 1; saveJSON('gambit.ladder', ladderState); }
    var step = Math.min(5, Math.max(1, ladderState.step || 1));
    newGame({ mode: 'ai', level: step, color: 'w', base: 300, inc: 0, variant: 'standard' });
    S.ladderGame = true;
    renderLadder();
    toast('Ladder step ' + step + ' of 5 \u2014 beat Level ' + step + '.');
  }

  function ladderAdvance() {
    if (!S.ladderGame || S.drill || S.mode !== 'ai') return;
    if (!S.result || S.result.code !== S.playerColor) return;
    ladderState.step = Math.min(6, (S.level || 1) + 1);
    ladderState.best = Math.max(ladderState.best || 1, ladderState.step);
    saveJSON('gambit.ladder', ladderState);
    renderLadder();
    toast(ladderState.step > 5
      ? 'Ladder cleared \u2014 every bot beaten!'
      : 'Ladder cleared \u2014 next up: Level ' + ladderState.step + '.');
  }

  /* ---------------- review / analysis jumps ---------------- */

  function analyseFromHere() {
    if (!S.review || S.cursor < 1) { toast('Step to a move first.'); return; }
    var cut = S.positions.slice(0, S.cursor + 1);
    saved.analysis = {
      fen: cut[cut.length - 1].fen,
      positions: cut,
      cursor: cut.length - 1,
      flipped: S.flipped,
      result: null,
      clocks: { w: 0, b: 0 },
      started: true,
      running: false,
      mode: 'human',
      level: S.level,
      playerColor: 'w',
      lost: { w: S.lost.w.slice(), b: S.lost.b.slice() }
    };
    setScreen('analysis');
    toast('Analysing the position after move ' + S.cursor + '.');
  }

  function playFromHere() {
    var fen = S.positions[S.cursor].fen;
    var turn = fen.split(' ')[1] === 'b' ? 'b' : 'w';
    newGame({ mode: 'ai', level: S.level || 3, color: turn, base: 0, inc: 0, variant: 'standard', fen: fen });
    toast('Playing on from this position.');
  }

  function practiseMove() {
    if (!S.review || S.cursor < 1) { toast('Step to a move first.'); return; }
    var entry = S.review.moves[S.cursor];
    var prev = S.positions[S.cursor - 1];
    if (!entry || !entry.bestSan || !prev) { toast('No suggestion for this move yet.'); return; }

    var probe = new E.Chess(prev.fen);
    var legal = probe.legalMoves();
    var best = null;
    for (var i = 0; i < legal.length; i++) {
      if (probe.san(legal[i], legal) === entry.bestSan) { best = E.moveToUci(legal[i]); break; }
    }
    if (!best) { toast('No suggestion for this move yet.'); return; }

    setScreen('play');
    newGame({ mode: 'human', level: 3, color: prev.fen.split(' ')[1], base: 0, inc: 0, fen: prev.fen });
    S.practice = { best: best, bestSan: entry.bestSan };
    toast('Your move \u2014 play what the coach would play.');
  }

  function newGame(cfg, opts) {
    cfg = cfg || pending;
    opts = opts || {};
    if (S.net && S.net.code) netLeave(true);
    if (S.screen !== 'play') {
      saved.play = null;
      S.screen = 'play';
      document.body.dataset.screen = 'play';
      syncNav();
    }
    S.token++;
    S.thinking = false;
    S.mode = cfg.mode;
    S.level = cfg.level;
    S.playerColor = cfg.color === 'r' ? (Math.random() < 0.5 ? 'w' : 'b') : cfg.color;
    S.base = cfg.base;
    S.inc = cfg.inc;
    S.variant = cfg.variant || 'standard';
    S.checks = { w: 0, b: 0 };
    S.coachBase = null;
    S.coachNotes = {};
    S.coachAsk = null;
    S.lastNotePly = null;
    S.coachSeq++;
    S.showWhy = null;
    S.ratingChange = null;
    S.startedAt = 0;
    S.practice = null;
    S.ladderGame = false;
    S.daily = false;
    S.arrows = [];
    stopReplay(true);
    S.drill = cfg.drill ? { def: cfg.drill, moves: 0, hints: 0, done: null } : null;
    if (S.rush) cancelRush();

    S.game = new E.Chess(cfg.fen || E.START_FEN);
    S.positions = [{ fen: S.game.fen(), san: null, move: null, mover: null }];
    S.cursor = 0;
    S.selected = -1;
    S.result = null;
    S.started = false;
    S.running = false;
    S.lastTick = performance.now();
    S.flipped = (S.mode === 'ai' || S.mode === 'coach') ? S.playerColor === 'b' : false;
    S.clocks = { w: S.base * 1000, b: S.base * 1000 };
    S.lost = { w: [], b: [] };
    S.drag = null;
    S.review = null;
    S.coachHint = null;
    $('resultLayer').hidden = true;
    $('promoLayer').hidden = true;

    renderAll();
    switchTab('moves');
    if (!opts.silent) playEvent('start');
    maybeAI();
    coachPrime();
    if (S.mode === 'coach') coachGreet();
  }

  function doMove(move) {
    if (S.screen === 'puzzles') { puzzleMove(move); return; }
    if (S.mode === 'online' && S.screen === 'play') {
      if (S.result || !S.net || !S.net.seat) return;
      if (S.game.turn !== S.net.seat) return;
      S.selected = -1;
      renderBoard();
      netSend({ t: 'move', uci: E.moveToUci(move) });
      return;
    }
    performMove(move);
  }

  function performMove(move) {
    var g = S.game;
    if (S.result) return;

    var legal = g.legalMoves();
    var san = g.san(move, legal);
    var isCapture = !!(g.board[move.to] || move.ep);
    var mover = g.turn;
    S.arrows = [];

    if (S.practice && mover === S.playerColor) {
      var target = S.practice;
      S.practice = null;
      toast(E.moveToUci(move) === target.best
        ? 'Correct \u2014 ' + san + ' is the move the coach wanted.'
        : 'Not quite \u2014 ' + target.bestSan + ' was the stronger move.');
    }

    g.make(move);
    S.positions.push({ fen: g.fen(), san: san, move: move, mover: mover });
    S.cursor = S.positions.length - 1;
    S.selected = -1;
    S.coachHint = null;

    if (!S.started) {
      S.started = true;
      S.startedAt = Date.now();
      if (S.base > 0) { S.running = true; S.lastTick = performance.now(); }
    }
    if (S.base > 0 && S.mode !== 'online') S.clocks[mover] += S.inc * 1000;

    recomputeCaptured();
    if (S.mode === 'human' && settings.autoFlip) S.flipped = g.turn === 'b';

    var outcome = null;
    if (S.screen === 'play' && S.mode !== 'online') {
      outcome = Variants.afterMove(g, mover, S.variant, S.checks);
    }

    renderBoard({ animateMove: move });
    renderPlayers();
    renderMoves();
    renderStatus();
    $('fenText').textContent = 'FEN';

    playEvent(move.castle ? 'castle' : isCapture ? 'capture' : 'move');
    if (/[+#]$/.test(san)) setTimeout(function () { playEvent('check'); }, 130);

    if (S.screen === 'analysis') {
      renderStatus();
      scheduleEval();
      return;
    }

    if (S.drill && !S.drill.done && mover === S.playerColor) {
      S.drill.moves++;
      if (Drills.reached(S.drill.def, S.drill.def.fen, g.fen(), S.playerColor)) {
        S.drill.done = 'solved';
        drillDone[S.drill.def.id] = { moves: S.drill.moves, hints: S.drill.hints, at: Date.now() };
        saveDrillDone();
        toast('Drill solved.');
        questAdd('drills', 1);
        checkAchievements();
      } else if (S.drill.moves >= S.drill.def.par) {
        S.drill.done = 'failed';
      }
      renderDrill();
    }

    if (outcome) { finishGame(outcome.code, outcome.reason); return; }

    checkGameEnd();
    if (isCoach() && mover === S.playerColor) {
      var prev = S.positions[S.positions.length - 2];
      coachFeedback(S.positions.length - 1, prev.fen, g.fen(), move, mover, {
        quiet: true, live: true, then: coachReact
      });
    }
    if (isCoach() && mover !== S.playerColor) coachTheirMove();
    if (!S.result) maybeAI();
    coachPrime();
    if (S.screen === 'play' && !S.drill && S.mode !== 'online' && mover === S.playerColor) {
      questAdd('moves', 1);
    }
    saveResume();
  }

  function attemptMove(from, to) {
    var g = S.game;
    if (S.result) return;
    var cands = g.legalMoves().filter(function (m) { return m.from === from && m.to === to; });
    S.selected = -1;
    if (!cands.length) { renderBoard(); return; }
    if (cands.length > 1) {
      if (settings.autoQueen) {
        var queen = cands.filter(function (m) { return String(m.promo).toLowerCase() === 'q'; })[0];
        if (queen) { doMove(queen); return; }
      }
      openPromotion(cands);
      return;
    }
    doMove(cands[0]);
  }

  function openPromotion(cands) {
    var mover = S.game.turn;
    var to = cands[0].to;
    var col = to & 7;
    var dCol = S.flipped ? 7 - col : col;
    var strip = $('promoCard');

    strip.style.left = (dCol * 12.5) + '%';
    strip.style.width = '12.5%';
    strip.style.top = mover === 'w' ? '0%' : '50%';
    strip.innerHTML = '';

    var order = mover === 'w' ? ['Q', 'R', 'B', 'N'] : ['N', 'B', 'R', 'Q'];
    order.forEach(function (t) {
      var piece = mover === 'w' ? t : t.toLowerCase();
      var btn = document.createElement('button');
      btn.className = 'promo-sq';
      btn.innerHTML = Art.svg(piece);
      btn.title = { Q: 'Queen', R: 'Rook', B: 'Bishop', N: 'Knight' }[t];
      btn.addEventListener('click', function () {
        $('promoLayer').hidden = true;
        var pick = cands.filter(function (x) { return x.promo === t; })[0];
        if (pick) doMove(pick);
      });
      strip.appendChild(btn);
    });
    $('promoLayer').hidden = false;
  }

  function checkGameEnd() {
    var g = S.game;
    if (!g.legalMoves().length) {
      if (g.inCheck()) finishGame(g.turn === 'w' ? 'b' : 'w', 'checkmate');
      else finishGame('d', 'stalemate');
      return;
    }
    if (g.isFiftyMove()) { finishGame('d', 'fifty-move rule'); return; }
    if (g.isThreefold()) { finishGame('d', 'threefold repetition'); return; }
    if (g.insufficientMaterial()) { finishGame('d', 'insufficient material'); }
  }

  function resultText() {
    return S.result ? Results.text(S.result.code, S.result.reason) : null;
  }

  /* Bot games move your Elo; local and online games leave it alone. */
  function applyRating(result) {
    if (!result || S.drill) return null;
    if (S.mode !== 'ai' && S.mode !== 'coach') return null;

    /* `||` is wrong here now that 0 is a real rating: it would silently start a
       zero-rated player from Ratings.START. */
    var before = Math.round(ratingNow());
    var res = Ratings.update(before, Ratings.levelRating(S.level), Ratings.scoreFor(result.code, S.playerColor));
    ratingState.r = res.rating;
    ratingState.games = (ratingState.games || 0) + 1;
    ratingState.best = Math.max(Math.round(ratingNow(ratingState.best)), res.rating);
    ratingState.history = (ratingState.history || []).concat([res.rating]).slice(-40);
    saveJSON('gambit.rating', ratingState);
    return { before: before, after: res.rating, delta: res.delta };
  }

  /* The rating as a number, treating a missing value as the module default but
     leaving a genuine 0 alone. */
  function ratingNow(value) {
    var v = typeof value === 'number' ? value : ratingState.r;
    return typeof v === 'number' && isFinite(v) ? v : Ratings.START;
  }

  function renderResultRating() {
    var el = $('resultRating');
    if (!el) return;
    var ch = S.ratingChange;
    el.hidden = !ch;
    if (!ch) return;
    el.textContent = 'Rating ' + ch.after + ' (' + (ch.delta > 0 ? '+' : '') + ch.delta + ')';
    el.className = 'result-rating ' + (ch.delta > 0 ? 'up' : ch.delta < 0 ? 'down' : 'flat');
  }

  function finishGame(code, reason) {
    if (S.result) return;
    var text = Results.text(code, reason);
    S.result = { code: code, reason: reason };
    S.coachHint = null;
    renderBoard();
    if (!S.drill && (S.mode !== 'online' || (S.net && S.net.seat))) archiveGame(S.result);
    if (!S.drill && S.screen === 'play' && (S.mode === 'ai' || S.mode === 'coach')) recordResult(code);
    if (!S.drill) {
      questAdd('games', 1);
      var iWon = S.mode === 'online'
        ? !!(S.net && S.net.seat && code === S.net.seat)
        : (S.mode !== 'human' && code === S.playerColor);
      if (iWon) questAdd('wins', 1);
      checkAchievements();
    }
    ladderAdvance();
    S.running = false;
    S.thinking = false;
    $('resultScore').textContent = code === 'w' ? '1\u20130' : code === 'b' ? '0\u20131' : '\u00bd\u2013\u00bd';
    $('resultTitle').textContent = text.title;
    $('resultSub').textContent = text.sub;
    S.ratingChange = applyRating(S.result);
    renderResultRating();
    $('resultLayer').hidden = false;
    playEvent('end');
    renderStatus();
    renderClocks();
    renderPlayers();

    if (S.drill) {
      if (!S.drill.done) S.drill.done = code === S.playerColor ? 'solved' : 'failed';
      $('resultLayer').hidden = true;
      renderDrill();
      return;
    }
    coachFinalize();
  }

  function hideResult() { $('resultLayer').hidden = true; }

  function flagFall(color) {
    if (S.result) return;
    var opp = color === 'w' ? 'b' : 'w';
    if (!E.hasMatingMaterial(S.game.board, opp)) {
      finishGame('d', 'timeout-material');
    } else {
      finishGame(opp, 'time');
    }
  }

  function undo() {
    if (S.positions.length < 2) return;
    if (S.replay) stopReplay(true);
    S.token++;
    var remove = 1;
    if (S.mode === 'ai' || S.mode === 'coach') {
      /* Undo your move plus the engine's reply, and land back on your turn. */
      remove = S.positions[S.positions.length - 1].mover === S.playerColor ? 1 : 2;
    }
    remove = Math.min(remove, S.positions.length - 1);
    S.positions.splice(S.positions.length - remove, remove);

    var last = S.positions[S.positions.length - 1];
    S.game = new E.Chess(last.fen);
    S.cursor = S.positions.length - 1;
    S.selected = -1;
    S.result = null;
    S.thinking = false;
    S.started = S.positions.length > 1;
    hideResult();
    recomputeCaptured();

    if (S.base > 0 && S.started) { S.running = true; S.lastTick = performance.now(); }
    else if (S.base === 0) S.running = false;

    S.coachBase = null;
    S.coachNotes = {};
    S.coachAsk = null;
    S.lastNotePly = null;
    S.coachSeq++;
    if (isCoach()) coachTalk('Taken back \u2014 try a different idea.');
    renderCoachNote();
    saveResume();
    renderAll();
    if (S.screen === 'analysis') scheduleEval();
    maybeAI();
    coachPrime();
    renderCoachSummary();
  }

  function flip() {
    S.flipped = !S.flipped;
    renderBoard();
    renderPlayers();
  }

  function goLive() {
    if (S.replay) stopReplay(true);
    if (isLive()) return;
    S.cursor = S.positions.length - 1;
    S.selected = -1;
    renderBoard();
    renderMoves();
    renderStatus();
    maybeAI();
    coachPrime();
  }

  function navigate(delta) {
    if (S.replay) stopReplay(true);
    var next = S.cursor + delta;
    if (next < 0) next = 0;
    if (next > S.positions.length - 1) next = S.positions.length - 1;
    if (next === S.cursor) return;
    S.cursor = next;
    S.selected = -1;
    if (!isLive()) S.coachHint = null;
    renderBoard();
    renderMoves();
    renderStatus();
    if (isLive()) { maybeAI(); coachPrime(); }
  }

  function offerDraw() {
    if (S.result) { toast('The game is already over.'); return; }
    if (S.mode === 'online') {
      if (!S.net || !S.net.seat) { toast('Join a game first.'); return; }
      netSend({ t: 'draw', offer: true });
      return;
    }
    if (S.mode === 'human') { finishGame('d', 'agreement'); return; }
    var evalScore = AI.evaluate(S.game) * (S.playerColor === 'w' ? 1 : -1);
    if (evalScore <= 0 || S.positions.length > 90) {
      finishGame('d', 'agreement');
    } else {
      toast('Your opponent declines the draw.');
    }
  }

  /* ---------------- engine plumbing ---------------- */

  var worker = null;
  var workerDead = false;
  var aiSeq = 0;
  var evalSeq = 0;
  var aiPending = {};

  function ensureWorker() {
    if (worker || workerDead) return worker;
    try {
      worker = new Worker('js/ai-worker.js');
      worker.onmessage = function (ev) {
        var cb = aiPending[ev.data.id];
        if (cb) { delete aiPending[ev.data.id]; cb(ev.data); }
      };
      worker.onerror = function () {
        worker = null;
        workerDead = true;
        aiPending = {};
      };
    } catch (err) {
      worker = null;
      workerDead = true;
    }
    return worker;
  }

  function requestAIMove(fen, level, cb) {
    var done = false;
    function finish(uci) { if (done) return; done = true; cb(uci); }

    var w = ensureWorker();
    var id = ++aiSeq;

    if (w) {
      aiPending[id] = function (msg) { finish(msg && msg.move ? msg.move : null); };
      w.postMessage({ fen: fen, level: level, id: id });
      setTimeout(function () {
        if (done) return;
        delete aiPending[id];
        var fallback = AI.pickMove(new E.Chess(fen), level);
        finish(fallback ? E.moveToUci(fallback) : null);
      }, 8000);
      return;
    }

    setTimeout(function () {
      var fallback = AI.pickMove(new E.Chess(fen), level);
      finish(fallback ? E.moveToUci(fallback) : null);
    }, 30);
  }

  function requestEvalAsync(fen, depth, cb) {
    var done = false;
    function finish(info) { if (done) return; done = true; cb(info); }

    var w = ensureWorker();
    var id = 'rq' + (++evalSeq);

    if (w) {
      aiPending[id] = function (msg) {
        delete aiPending[id];
        finish({ score: msg.score || 0, mate: msg.mate || 0, best: msg.best || null });
      };
      w.postMessage({ fen: fen, type: 'eval', id: id, depth: depth || 2 });
      setTimeout(function () {
        if (done) return;
        delete aiPending[id];
        finish(AI.analyze(new E.Chess(fen), 2));
      }, 15000);
      return;
    }

    setTimeout(function () {
      finish(AI.analyze(new E.Chess(fen), 2));
    }, 0);
  }

  function maybeAI() {
    if ((S.mode !== 'ai' && S.mode !== 'coach') || S.result || S.thinking || !isLive()) return;
    var aiColor = S.playerColor === 'w' ? 'b' : 'w';
    if (S.game.turn !== aiColor) return;

    S.thinking = true;
    var fen = S.game.fen();
    var token = S.token;
    var started = performance.now();
    renderStatus();
    renderPlayers();

    requestAIMove(fen, S.level, function (uci) {
      if (token !== S.token) return;

      /* Let the opponent visibly think even when the search is instant. */
      var wait = Math.max(0, 420 - (performance.now() - started));
      setTimeout(function () {
        if (token !== S.token) return;
        S.thinking = false;
        if (S.result || S.game.fen() !== fen) { renderStatus(); renderPlayers(); return; }
        var legal = S.game.legalMoves();
        if (!legal.length) return;
        var move = uci ? E.fromUci(uci, legal) : null;
        if (!move) move = legal[(Math.random() * legal.length) | 0];
        doMove(move);
      }, wait);
    });
  }

  /* ---------------- replay ---------------- */

  function isBotSide(color) {
    if (S.mode !== 'ai' && S.mode !== 'coach') return false;
    return color !== S.playerColor;
  }

  function stopReplay(quiet) {
    if (S.replay && S.replay.timer) clearTimeout(S.replay.timer);
    S.replay = null;
    S.thinking = false;
    if ($('replayLabel')) $('replayLabel').textContent = 'Watch';
    if (!quiet) {
      renderBoard();
      renderStatus();
      renderPlayers();
    }
  }

  function startReplay() {
    if (S.positions.length < 2) { toast('Play a few moves first.'); return; }
    stopReplay(true);
    S.replay = { playing: true, timer: null };
    S.cursor = 0;
    S.selected = -1;
    S.coachHint = null;
    S.showWhy = null;
    S.ratingChange = null;
    renderBoard();
    renderMoves();
    renderStatus();
    renderPlayers();
    $('replayLabel').textContent = 'Pause';
    tickReplay();
  }

  function replayPause() {
    if (!S.replay) return;
    S.replay.playing = false;
    if (S.replay.timer) clearTimeout(S.replay.timer);
    S.replay.timer = null;
    S.thinking = false;
    $('replayLabel').textContent = 'Resume';
    renderStatus();
    renderPlayers();
  }

  function replayResume() {
    if (!S.replay) return;
    S.replay.playing = true;
    $('replayLabel').textContent = 'Pause';
    tickReplay();
  }

  function finishReplay() {
    if (S.replay && S.replay.timer) clearTimeout(S.replay.timer);
    S.replay = null;
    S.thinking = false;
    $('replayLabel').textContent = 'Watch';
    renderStatus();
    renderPlayers();
    toast('Replay finished.');
  }

  function tickReplay() {
    var r = S.replay;
    if (!r || !r.playing) return;
    if (S.cursor >= S.positions.length - 1) { finishReplay(); return; }

    var nextPly = S.cursor + 1;
    var bot = isBotSide(S.positions[nextPly].mover);
    if (bot) { S.thinking = true; renderStatus(); renderPlayers(); }

    r.timer = setTimeout(function () {
      if (!S.replay || !S.replay.playing) return;
      S.thinking = false;
      S.cursor = nextPly;
      S.selected = -1;
      renderBoard();
      renderMoves();
      renderStatus();
      renderPlayers();
      renderCoachNote();
      if (S.cursor >= S.positions.length - 1) { finishReplay(); return; }
      tickReplay();
    }, bot ? 1150 : 900);
  }

  /* ---------------- screens ---------------- */

  function captureState() {
    return {
      fen: S.game.fen(),
      positions: S.positions.slice(),
      cursor: S.cursor,
      flipped: S.flipped,
      result: S.result,
      clocks: { w: S.clocks.w, b: S.clocks.b },
      started: S.started,
      running: S.running,
      mode: S.mode,
      level: S.level,
      playerColor: S.playerColor,
      base: S.base,
      inc: S.inc,
      variant: S.variant,
      checks: { w: S.checks.w, b: S.checks.b },
      lost: { w: S.lost.w.slice(), b: S.lost.b.slice() }
    };
  }

  function applyState(st) {
    S.game = new E.Chess(st.fen);
    S.positions = st.positions;
    S.cursor = st.cursor;
    S.flipped = st.flipped;
    S.result = st.result;
    S.clocks = { w: st.clocks.w, b: st.clocks.b };
    S.started = st.started;
    S.running = st.running;
    S.lastTick = performance.now();
    S.mode = st.mode;
    S.level = st.level;
    S.playerColor = st.playerColor;
    S.base = st.base;
    S.inc = st.inc;
    S.variant = st.variant || 'standard';
    S.checks = st.checks || { w: 0, b: 0 };
    S.lost = st.lost;
    S.selected = -1;
    S.thinking = false;
    S.coachHint = null;
    $('resultLayer').hidden = true;
    $('promoLayer').hidden = true;
  }

  function syncNav() {
    document.querySelectorAll('.nav-btn[data-screen]').forEach(function (b) {
      /* The analysis board is an engine, so it is shut during an online game. */
      var off = b.dataset.screen === 'analysis' && onlineLive();
      b.classList.toggle('active', b.dataset.screen === S.screen);
      b.classList.toggle('off', off);
      if (off) b.title = 'Analysis is off during an online game';
      else b.removeAttribute('title');
    });
  }

  function setScreen(name) {
    if (S.screen === name) { syncNav(); return; }
    if (name === 'analysis' && onlineLive()) {
      toast('Analysis is off during an online game.');
      syncNav();
      return;
    }
    if (S.replay) stopReplay(true);
    saved[S.screen] = captureState();
    S.token++;
    S.thinking = false;
    S.coachHint = null;
    if (S.review) { S.review.token = ++reviewToken; S.review.running = false; S.review = null; }
    if (S.screen === 'puzzles' && S.rush) cancelRush();
    S.screen = name;
    document.body.dataset.screen = name;
    syncNav();
    S.selected = -1;

    if (name === 'play') {
      if (saved.play) applyState(saved.play);
      else newGame(pending, { silent: true });
      renderAll();
      maybeAI();
      coachPrime();
    } else if (name === 'review') {
      initReview();
      renderAll();
    } else if (name === 'analysis') {
      if (saved.analysis) applyState(saved.analysis);
      else initAnalysis();
      S.selected = -1;
      renderAll();
      scheduleEval();
    } else if (name === 'learn') {
      renderAll();
      renderLearn();
    } else if (name === 'stats') {
      renderStats();
    } else {
      if (saved.puzzles) { applyState(saved.puzzles); renderAll(); renderPuzzle(); }
      else startPuzzle(P.index);
    }
  }

  function initAnalysis() {
    var base = saved.play || captureState();
    S.game = new E.Chess(base.fen);
    S.positions = base.positions.slice();
    S.cursor = S.positions.length - 1;
    S.flipped = base.flipped;
    S.result = null;
    S.running = false;
    S.started = true;
    S.base = 0;
    S.inc = 0;
    S.mode = 'human';
    S.clocks = { w: 0, b: 0 };
    S.lost = { w: base.lost.w.slice(), b: base.lost.b.slice() };
    S.selected = -1;
    S.thinking = false;
    recomputeCaptured();
  }

  /* ---------------- game review ---------------- */

  var reviewToken = 0;
  var NAMES = { P: 'pawn', N: 'knight', B: 'bishop', R: 'rook', Q: 'queen', K: 'king' };

  function initReview() {
    var src = (saved.play && saved.play.positions.length > 1) ? saved.play
      : (saved.analysis && saved.analysis.positions.length > 1) ? saved.analysis
      : captureState();

    S.game = new E.Chess(src.fen);
    S.positions = src.positions.slice();
    S.cursor = S.positions.length - 1;
    S.flipped = src.flipped;
    S.result = src.result;
    S.clocks = { w: src.clocks.w, b: src.clocks.b };
    S.started = src.started;
    S.running = false;
    S.mode = src.mode;
    S.level = src.level;
    S.playerColor = src.playerColor;
    S.base = 0;
    S.inc = 0;
    S.lost = { w: src.lost.w.slice(), b: src.lost.b.slice() };
    S.selected = -1;
    S.thinking = false;
    S.coachHint = null;
    $('resultLayer').hidden = true;
    $('promoLayer').hidden = true;
    recomputeCaptured();
    startReview();
  }

  function startReview() {
    var positions = S.positions;
    var sans = positions.slice(1).map(function (p) { return p.san; });
    var found = Openings.detect(sans);

    S.review = {
      token: ++reviewToken,
      positions: positions,
      sans: sans,
      evals: new Array(positions.length),
      done: 0,
      moves: {},
      running: positions.length > 1,
      opening: found.name,
      acc: null,
      elo: null,
      counts: null
    };

    paintReview();
    if (positions.length > 1) runReview(0);
    else { paintReview(); renderMoves(); }
  }

  function runReview(i) {
    var rv = S.review;
    if (!rv) return;
    var token = rv.token;
    if (i >= rv.positions.length) { finishReview(token); return; }

    requestEvalAsync(rv.positions[i].fen, 3, function (info) {
      if (!S.review || S.review.token !== token) return;
      rv.evals[i] = info;
      rv.done = i + 1;
      paintReview();
      runReview(i + 1);
    });
  }

  function finishReview(token) {
    var rv = S.review;
    if (!rv || rv.token !== token) return;
    rv.running = false;

    var accs = { w: [], b: [] };
    var counts = { w: {}, b: {} };
    var openingName = Openings.detect(rv.sans).name;

    for (var ply = 1; ply < rv.positions.length; ply++) {
      var prev = rv.positions[ply - 1];
      var cur = rv.positions[ply];
      var mover = cur.mover === 'b' ? 'b' : 'w';
      var sgn = mover === 'w' ? 1 : -1;
      var before = rv.evals[ply - 1];
      var after = rv.evals[ply];

      var bestCp = Review.scoreCp(before) * sgn;
      var final = Review.finalCp(cur.fen, mover);
      var playedCp = final == null ? Review.scoreCp(after) * sgn : final;
      var loss = Math.max(0, (Review.expected(bestCp) - Review.expected(playedCp)) * 100);

      var uci = cur.move ? E.moveToUci(cur.move) : null;
      var isBest = !!(before && before.best && uci && before.best === uci);
      var book = Openings.isBookPly(rv.sans, ply);
      if (isBest || book) loss = 0;

      var bestSan = null;
      if (before && before.best) {
        var probe = new E.Chess(prev.fen);
        var mv = E.fromUci(before.best, probe.legalMoves());
        if (mv) bestSan = probe.san(mv);
      }

      var given = Review.materialGiven(prev.fen, cur.fen, mover);
      var brilliant = isBest && given >= 2 && Review.expected(playedCp) >= 0.5;
      var cls = Review.classify({ loss: loss, isBest: isBest, book: book, brilliant: brilliant });

      var exp = Explain.describe({
        beforeFen: prev.fen,
        afterFen: cur.fen,
        playedUci: uci,
        bestUci: before && before.best,
        replyUci: after && after.best,
        cls: cls,
        bestCp: bestCp,
        playedCp: playedCp,
        book: book,
        opening: openingName
      });

      rv.moves[ply] = {
        cls: cls,
        loss: loss,
        bestSan: bestSan,
        san: cur.san,
        acc: Review.accuracy(loss),
        explain: exp.text
      };
      accs[mover].push(rv.moves[ply].acc);
      counts[mover][cls] = (counts[mover][cls] || 0) + 1;
    }

    rv.acc = { w: Review.aggregate(accs.w), b: Review.aggregate(accs.b) };
    rv.elo = { w: Review.eloFor(rv.acc.w), b: Review.eloFor(rv.acc.b) };
    rv.counts = counts;

    paintReview();
    renderMoves();
    renderStatus();
  }

  /* White's point of view, in centipawns, for the position at `i`. */
  function whiteCp(rv, i) {
    var info = rv.evals[i];
    if (!info) return null;
    var cp = Review.scoreCp(info);
    var turn = rv.positions[i].fen.split(' ')[1];
    return turn === 'w' ? cp : -cp;
  }

  var GRAPH_COLORS = {
    brilliant: '#6ec5ff', best: '#81b64c', excellent: '#a9dd6c', good: '#cfcabb',
    book: '#9aa3b2', inaccuracy: '#e8b03c', mistake: '#e8823c', blunder: '#d0453f'
  };

  function graphY(cp) {
    return 20 - Math.max(-1, Math.min(1, cp / 800)) * 16;
  }

  /* A clickable evaluation graph: white above the midline, black below. */
  function renderEvalGraph(rv) {
    var box = $('rvGraph');
    if (!box) return;
    var n = rv.positions.length;
    if (n < 2) {
      box.hidden = true;
      box.innerHTML = '';
      return;
    }
    box.hidden = false;

    var step = 100 / (n - 1);
    var pts = [], marks = '', hits = '', i;
    for (i = 0; i < n; i++) {
      var cp = whiteCp(rv, i);
      if (cp == null) continue;
      pts.push([i * step, graphY(cp)]);
    }

    for (var ply = 1; ply < n; ply++) {
      var m = rv.moves[ply];
      if (!m || (m.cls !== 'blunder' && m.cls !== 'mistake' && m.cls !== 'inaccuracy')) continue;
      var v = whiteCp(rv, ply);
      if (v == null) continue;
      marks += '<circle cx="' + (ply * step).toFixed(2) + '" cy="' + graphY(v).toFixed(2) +
        '" r="1.5" fill="' + GRAPH_COLORS[m.cls] + '"/>';
    }

    for (i = 1; i < n; i++) {
      hits += '<rect class="g-hit" data-ply="' + i + '" x="' + ((i - 1) * step).toFixed(2) +
        '" y="0" width="' + step.toFixed(2) + '" height="40"/>';
    }

    var line = pts.map(function (p, k) {
      return (k ? 'L' : 'M') + p[0].toFixed(2) + ',' + p[1].toFixed(2);
    }).join(' ');
    var area = pts.length
      ? line + 'L' + pts[pts.length - 1][0].toFixed(2) + ',20L0,20Z'
      : '';

    box.innerHTML = '<svg viewBox="0 0 100 40" preserveAspectRatio="none" role="img" ' +
        'aria-label="Evaluation graph, click a move to jump to it">' +
        '<rect x="0" y="0" width="100" height="20" class="g-white"/>' +
        '<rect x="0" y="20" width="100" height="20" class="g-black"/>' +
        '<line x1="0" y1="20" x2="100" y2="20" class="g-mid"/>' +
        (area ? '<path d="' + area + '" class="g-area"/>' : '') +
        (line ? '<path d="' + line + '" class="g-line"/>' : '') +
        marks + hits + '</svg>';
  }

  function paintReview() {
    var card = $('reviewCard');
    var rv = S.review;
    if (!card || !rv) return;

    var bar = $('rvBar');
    bar.style.width = Math.round((rv.done / Math.max(1, rv.positions.length)) * 100) + '%';

    $('rvStatus').textContent = rv.positions.length < 2
      ? 'Play a few moves first \u2014 the review needs a game.'
      : rv.running
        ? 'Analysing position ' + rv.done + ' of ' + rv.positions.length + '\u2026'
        : 'Review complete \u00b7 ' + (rv.positions.length - 1) +
          (rv.positions.length === 2 ? ' move' : ' moves') +
          (rv.opening ? ' \u00b7 ' + rv.opening : '');

    var names = { w: playerName('w'), b: playerName('b') };
    $('rvNameW').textContent = names.w + ' accuracy';
    $('rvNameB').textContent = names.b + ' accuracy';
    $('rvAccW').textContent = rv.acc && rv.acc.w != null ? Math.round(rv.acc.w) + '%' : '\u2014';
    $('rvAccB').textContent = rv.acc && rv.acc.b != null ? Math.round(rv.acc.b) + '%' : '\u2014';
    var elos = [];
    if (rv.elo && rv.elo.w != null) elos.push(rv.elo.w);
    if (rv.elo && rv.elo.b != null) elos.push(rv.elo.b);
          $('rvElo').textContent = elos.length
      ? 'Performance \u2248 ' + Math.round(elos.reduce(function (a, b) { return a + b; }, 0) / elos.length)
      : '';

    var order = ['brilliant', 'best', 'excellent', 'good', 'book', 'inaccuracy', 'mistake', 'blunder'];
    var html = '';
    ['w', 'b'].forEach(function (color) {
      var c = (rv.counts && rv.counts[color]) || {};
      var chips = '';
      order.forEach(function (key) {
        if (!c[key]) return;
        var lab = Review.LABELS[key];
        chips += '<span class="rvc ' + key + '" title="' + lab.label + '">' +
          (lab.sym || '\u00b7') + ' ' + c[key] + '</span>';
      });
      html += '<div class="rv-row"><b>' + names[color] + '</b>' +
        (chips || '<span class="rvc none">No moves yet</span>') + '</div>';
    });
    $('rvCounts').innerHTML = html;
    renderEvalGraph(rv);
    $('rvAnalyse').disabled = S.cursor < 1;
    $('rvPractise').disabled = !(rv.moves && rv.moves[S.cursor] && rv.moves[S.cursor].bestSan);
    renderReviewNote();
  }

  function renderReviewNote() {
    var el = $('rvCoach');
    var rv = S.review;
    if (!el || !rv || S.screen !== 'review') return;

    if (S.cursor === 0) {
      el.innerHTML = rv.opening
        ? '<b>' + rv.opening + '</b><br>Step forward to read the coach\u2019s notes on each move.'
        : 'Step forward to read the coach\u2019s notes on each move.';
      return;
    }

    var entry = rv.moves[S.cursor];
    var hist = rv.positions[S.cursor];
    var tag = entry ? Review.LABELS[entry.cls] : null;
    var head = '<b>' + Math.ceil(S.cursor / 2) + (S.cursor % 2 ? '.' : '\u2026') + ' ' + hist.san + '</b>';
    if (tag) head += ' <span class="rv-tag ' + entry.cls + '">' + tag.label + '</span>';
    el.innerHTML = head + '<br>' + (entry && entry.explain ? entry.explain : Review.note(entry, rv.opening));
  }

  /* ---------------- coach overview ---------------- */

  function pieceWord(v) {
    var map = {
      1: 'a pawn', 2: 'two pawns', 3: 'a piece', 4: 'two pawns more',
      5: 'a rook', 6: 'a rook and a pawn', 7: 'a rook and two pawns',
      8: 'a rook and a piece', 9: 'a queen', 10: 'a queen and a pawn'
    };
    return map[v] || v + ' points';
  }

  function hangingPiece(c, color) {
    var enemy = color === 'w' ? 'b' : 'w';
    for (var i = 0; i < 64; i++) {
      var p = c.board[i];
      if (!p || E.colorOf(p) !== color) continue;
      var t = p.toUpperCase();
      if (t === 'K') continue;
      if (!c.isAttacked(i, enemy)) continue;
      if (c.isAttacked(i, color)) continue;
      return { type: t, sq: E.sqName(i) };
    }
    return null;
  }

  function castled(c, color) {
    var k = c.kings[color];
    return color === 'w' ? (k === 62 || k === 58) : (k === 6 || k === 2);
  }

  function undeveloped(c, color) {
    var row = color === 'w' ? 7 : 0, n = 0;
    for (var f = 0; f < 8; f++) {
      var p = c.board[row * 8 + f];
      if (p && (p.toUpperCase() === 'N' || p.toUpperCase() === 'B')) n++;
    }
    return n;
  }

  function coachAdvice() {
    var tips = [];
    var g = S.game;
    var you = (S.mode === 'ai' || S.mode === 'coach' || S.mode === 'online') ? S.playerColor : g.turn;
    var diff = whiteAdvantage() * (you === 'w' ? 1 : -1);

    if (S.result) {
      var finished = resultText();
      tips.push(finished.title + ' ' + finished.sub + ' \u2014 open Review to see where it turned.');
      return tips;
    }

    if (g.inCheck()) tips.push('You are in check \u2014 answer the threat before anything else.');
    if (diff > 0) tips.push('You are up ' + pieceWord(diff) + '. Trading pieces helps you convert.');
    else if (diff < 0) tips.push('You are down ' + pieceWord(-diff) + '. Look for active play, not trades.');
    else tips.push('Material is level \u2014 improve your worst-placed piece.');

    var hang = hangingPiece(g, you);
    if (hang) {
      tips.push('Your ' + NAMES[hang.type] + ' on ' + hang.sq + ' is attacked and undefended.');
    } else if (!castled(g, you) && S.positions.length > 20) {
      tips.push('Your king is still in the centre \u2014 castle when you can.');
    } else if (undeveloped(g, you) >= 2) {
      tips.push('Develop your knights and bishops before starting an attack.');
    }
    if (S.coachHint && isLive() && isCoach()) tips.push('The blue arrow is the move I would play.');
    return tips;
  }

  function updateCoach() {
    var card = $('coachCard');
    if (!card || S.screen !== 'play') return;

    /* Online: the card stays where it is, but only to say why it is empty. */
    var locked = onlineLive();
    card.classList.toggle('locked', locked);
    $('coachHintBtn').disabled = locked;
    $('coachHintBtn').title = locked
      ? 'Hints are off in online games'
      : 'Ask the coach for a move';

    if (locked) {
      $('coachOpen').textContent = 'Online game';
      $('coachOpen').classList.add('off');
      $('coachTips').innerHTML =
        '<li>No hints and no coach while an online game is running \u2014 your opponent gets no help either.</li>';
      $('coachChatWrap').hidden = true;
      syncNav();
      return;
    }

    var sans = S.positions.slice(1).map(function (p) { return p.san; });
    var found = Openings.detect(sans);
    $('coachOpen').textContent = found.name || 'Out of book';
    $('coachOpen').classList.toggle('off', !found.name);

    $('coachTips').innerHTML = coachAdvice().slice(0, 3).map(function (t) {
      return '<li>' + t + '</li>';
    }).join('');
    renderCoachChat();
  }

  /* ---------- the coach talks during a coach game ---------- */

  function coachTalk(text, who) {
    if (!text) return;
    if (!S.coachChat) S.coachChat = [];
    S.coachChat.push({ text: String(text).slice(0, 320), who: who === 'you' ? 'you' : 'coach' });
    if (S.coachChat.length > 60) S.coachChat.shift();
    renderCoachChat();
  }

  function renderCoachChat() {
    var wrap = $('coachChatWrap');
    var box = $('coachChat');
    if (!wrap || !box) return;
    var on = isCoach() && S.screen === 'play';
    wrap.hidden = !on;
    if (!on) return;
    box.innerHTML = (S.coachChat || []).map(function (m) {
      return '<div class="cc-row ' + (m.who === 'you' ? 'you' : 'coach') + '">' +
        (m.who === 'you' ? '' : '<span class="cc-ava">C</span>') +
        '<div class="cc-bubble">' + escText(m.text) + '</div></div>';
    }).join('');
    box.scrollTop = box.scrollHeight;
  }

  function coachGreet(pickup) {
    S.coachChat = [];
    coachTalk((pickup ? pickup + ' ' : '') +
      'I will draw a blue arrow where I would move. Ask me for a hint, a threat check, or what I think of your last move.');
  }

  function coachReact(note) {
    if (!note || !note.mine || !isCoach()) return;
    if (note.cls === 'brilliant') coachTalk('Brilliant \u2014 ' + note.san + ' is exactly right.');
    else if (note.cls === 'best') coachTalk('That is the move. ' + note.san + ' keeps everything together.');
    else if (note.cls === 'book') coachTalk(note.san + ' is still book. Keep developing.');
    else if (note.cls === 'excellent' || note.cls === 'good') coachTalk('Fine \u2014 ' + note.san + ' holds up.');
    else if (note.cls === 'inaccuracy') coachTalk('A little loose. ' + note.tip);
    else coachTalk('Careful. ' + note.tip);
  }

  function coachTheirMove() {
    if (S.game.inCheck()) { coachTalk('Check. Deal with the threat before anything else.'); return; }
    var hang = hangingPiece(S.game, S.playerColor);
    if (hang) coachTalk('I am looking at your ' + NAMES[hang.type] + ' on ' + hang.sq + '.');
  }

  function coachReply(text) {
    var q = String(text || '').toLowerCase();
    var you = S.playerColor;
    var g = S.game;

    if (/^(hi|hey|hello|yo)\b/.test(q)) { coachTalk('Hello. Ask for a hint, a threat check, or what I think of your last move.'); return; }
    if (/thank/.test(q)) { coachTalk('Any time.'); return; }
    if (/hint|suggest|best|what should|which move|help/.test(q)) { coachTalk('Taking a look\u2026'); coachHint(); return; }

    if (/threat|danger|attack|hanging|loose|safe/.test(q)) {
      if (g.inCheck()) { coachTalk('You are in check \u2014 answer it before anything else.'); return; }
      var hang = hangingPiece(g, you);
      coachTalk(hang
        ? 'Your ' + NAMES[hang.type] + ' on ' + hang.sq + ' is attacked and undefended.'
        : 'Nothing is hanging right now. Watch for forks and checks before you commit.');
      return;
    }

    if (/why|explain|mistake|blunder|bad|wrong/.test(q)) {
      var note = currentNote();
      if (!note) { coachTalk('Play a move first and I will grade it. Then ask me why.'); return; }
      coachTalk(note.tip);
      return;
    }

    if (/castle|king|safety/.test(q)) {
      coachTalk(castled(g, you)
        ? 'Your king is castled \u2014 keep the pawns in front of it steady.'
        : 'Castle as soon as it is safe; a king in the centre invites tactics.');
      return;
    }

    if (/trade|material|ahead|behind|eval|score/.test(q)) {
      var diff = whiteAdvantage() * (you === 'w' ? 1 : -1);
      if (diff > 0) coachTalk('You are up ' + pieceWord(diff) + ' \u2014 trade pieces and simplify.');
      else if (diff < 0) coachTalk('You are down ' + pieceWord(-diff) + ' \u2014 keep pieces on and create activity.');
      else coachTalk('Material is level. Improve your worst-placed piece.');
      return;
    }

    if (/book|theory|opening|line/.test(q)) {
      var name = Openings.detect(S.positions.slice(1).map(function (p) { return p.san; })).name;
      coachTalk(name
        ? 'We are in the ' + name + '. Keep developing while you are in book.'
        : 'We are out of book \u2014 checks, captures, threats, in that order.');
      return;
    }

    var tips = coachAdvice();
    coachTalk(tips.length ? tips[0] : 'Play on \u2014 I will comment as we go.');
  }

  /* An online game is against a person, so no engine help of any kind is
   * allowed while it runs. Once it is over, the coach and analysis are fair
   * game again. */
  function onlineLive() {
    return S.mode === 'online' && !S.result;
  }

  function coachHint() {
    if (S.screen !== 'play') { toast('Hints are for the play screen.'); return; }
    if (onlineLive()) { toast('Hints and the coach are off in online games.'); return; }
    if (S.result) { toast('The game is over \u2014 open Review.'); return; }
    if (!isLive()) { toast('Return to the latest position first.'); return; }
    if (S.mode === 'ai' && S.game.turn !== S.playerColor) { toast('Wait for the computer\u2019s move.'); return; }

    var fen = S.game.fen();
    var token = S.token;
    if (settings.sound) playEvent('move');
    toast('Coach is looking\u2026');

    requestEvalAsync(fen, 2, function (info) {
      if (token !== S.token || S.screen !== 'play' || S.game.fen() !== fen) return;
      if (!info || !info.best) { toast('No suggestion here.'); return; }
      var mv = E.fromUci(info.best, S.game.legalMoves());
      if (!mv) { toast('No suggestion here.'); return; }
      var san = S.game.san(mv);
      S.coachHint = { from: mv.from, to: mv.to, auto: true, san: san };
      renderBoard();
      updateCoach();
      toast('Coach suggests ' + san + '.');
      if (isCoach()) {
        var idea = Explain.purpose(fen, info.best);
        coachTalk('I like ' + san + ' here' + (idea ? ' \u2014 ' + idea : '') + '.');
      }
    });
  }

  /* ---------------- analysis engine ---------------- */

  function scheduleEval() {
    clearTimeout(evalTimer);
    evalTimer = setTimeout(requestEval, 160);
  }

  function requestEval() {
    if (S.screen !== 'analysis') return;
    var fen = S.game.fen();
    var token = ++evalToken;
    var id = 'eval-' + token;
    var w = ensureWorker();

    if (w) {
      aiPending[id] = function (msg) {
        if (token === evalToken && S.screen === 'analysis') paintEval(msg);
      };
      w.postMessage({ fen: fen, type: 'eval', id: id, depth: 3 });
    } else {
      var info = AI.analyze(new E.Chess(fen), 3);
      if (token === evalToken) paintEval(info);
    }
  }

  function paintEval(info) {
    if (!info) return;
    lastEval = info;

    var score = info.score;
    if (info.mate) score = info.mate > 0 ? 900 : -900;
    var pct = 100 / (1 + Math.pow(10, -score / 500));
    pct = Math.max(4, Math.min(96, pct));
    $('evalWhite').style.height = pct.toFixed(1) + '%';

    $('engEval').textContent = info.mate
      ? (info.mate > 0 ? '+M' : '-M') + Math.abs(info.mate)
      : (score >= 0 ? '+' : '') + (score / 100).toFixed(2);

    var san = '\u2014';
    var probe = new E.Chess(S.game.fen());
    var mv = info.best ? E.fromUci(info.best, probe.legalMoves()) : null;
    if (mv) san = probe.san(mv);
    $('engBest').textContent = san;

    /* In analysis the engine suggestion is drawn on the board. */
    S.arrows = mv ? [{ from: mv.from, to: mv.to }] : [];
    renderArrows();
  }

  function playBest() {
    if (S.screen !== 'analysis') return;
    if (!lastEval || !lastEval.best) { toast('No engine move yet.'); return; }
    var mv = E.fromUci(lastEval.best, S.game.legalMoves());
    if (mv) doMove(mv);
  }

  function resetAnalysis() {
    S.game = new E.Chess(E.START_FEN);
    S.positions = [{ fen: E.START_FEN, san: null, move: null, mover: null }];
    S.cursor = 0;
    S.result = null;
    S.selected = -1;
    S.thinking = false;
    S.flipped = false;
    recomputeCaptured();
    renderAll();
    scheduleEval();
    toast('Board reset.');
  }

  /* ---------------- puzzles ---------------- */

  function puzzlePool() {
    if (pzFilter === 'all') return PUZZLES.map(function (_, i) { return i; });
    var want = Number(pzFilter);
    return PUZZLES.map(function (_, i) { return i; }).filter(function (i) {
      return PUZZLES[i].mateIn === want;
    });
  }

  function startPuzzle(index, opts) {
    if (!PUZZLES.length) { toast('No puzzles installed.'); return; }
    S.daily = false;
    var pool = puzzlePool();
    if (!pool.length) pool = PUZZLES.map(function (_, i) { return i; });
    var i;
    if (opts && opts.exact) i = index;
    else i = pool[((index % pool.length) + pool.length) % pool.length];
    if (!PUZZLES[i]) i = 0;
    var pz = PUZZLES[i];
    P.index = i;

    S.game = new E.Chess(pz.fen);
    S.positions = [{ fen: pz.fen, san: null, move: null, mover: null }];
    S.cursor = 0;
    S.result = null;
    S.running = false;
    S.base = 0;
    S.inc = 0;
    S.mode = 'human';
    S.clocks = { w: 0, b: 0 };
    S.flipped = S.game.turn === 'b';
    S.selected = -1;
    S.thinking = false;
    S.puzzle = {
      index: i, fen: pz.fen, mateIn: pz.mateIn, rating: pz.rating,
      stage: 0, blocked: false, solved: false,
      retryFen: pz.fen,
      retryPositions: [{ fen: pz.fen, san: null, move: null, mover: null }]
    };

    recomputeCaptured();
    renderAll();
    renderPuzzle();
  }

  function renderPuzzle() {
    var card = $('puzzleCard');
    if (!card) return;
    var pz = S.puzzle;
    if (!pz) { card.hidden = true; return; }
    card.hidden = S.screen !== 'puzzles';

    var rush = S.rush;
    $('pzLive').hidden = !rush;
    $('pzRushBtn').hidden = !!rush;
    var filterEl = $('pzFilter');
    if (filterEl) filterEl.hidden = !!rush;

    var dailyBtn = $('pzDaily');
    if (dailyBtn) {
      var today = dailyState.day === dayNumber() && dailyState.done;
      dailyBtn.hidden = !!rush;
      dailyBtn.disabled = today;
      dailyBtn.textContent = today
        ? 'Daily done \u00b7 ' + (dailyState.streak || 1) + ' day streak'
        : 'Puzzle of the day' + (dailyState.streak ? ' \u00b7 ' + dailyState.streak + ' day streak' : '');
    }

    var top = $('pzTop');
    if (top) {
      var runs = pzStats.rushTop || [];
      var poolCount = puzzlePool().length;
      top.textContent = (runs.length ? 'Rush top runs: ' + runs.join(' \u00b7 ') + ' \u00b7 ' : '') +
        PUZZLES.length + ' puzzles \u00b7 ' + poolCount + ' in this set';
    }
    if (rush) {
      $('pzLives').textContent = rush.lives + (rush.lives === 1 ? ' life' : ' lives');
      $('pzScore').textContent = rush.score + ' solved';
    }

    $('pzBadge').textContent = rush ? 'Puzzle Rush' : 'Mate in ' + pz.mateIn;
    $('pzRating').textContent = rush
      ? 'Best ' + (pzStats.rushBest || 0)
      : 'Puzzle ' + pz.rating + ' \u00b7 You ' + P.rating;
    $('pzTitle').textContent = pz.solved ? 'Solved!' : (S.game.turn === 'w' ? 'White to move' : 'Black to move');
    $('pzSub').textContent = pz.solved
      ? (rush ? rush.score + ' solved so far' : 'Streak ' + P.streak + ' \u00b7 rating ' + P.rating)
      : pz.stage === 1 ? 'Deliver the mate.' : 'Find the forcing move.';
    $('pzHint').hidden = pz.solved || !!rush;
    $('pzRetry').hidden = pz.solved || !!rush;
    $('pzNext').textContent = pz.solved ? 'Next puzzle' : 'Next';
  }

  /* Does every black reply still allow a mate in one? */
  function forcesMateIn1(c) {
    var replies = c.legalMoves();
    if (!replies.length) return false;
    for (var i = 0; i < replies.length; i++) {
      c.make(replies[i]);
      var mine = c.legalMoves();
      var forced = false;
      for (var j = 0; j < mine.length; j++) {
        c.make(mine[j]);
        if (c.legalMoves().length === 0 && c.inCheck()) forced = true;
        c.unmake();
        if (forced) break;
      }
      c.unmake();
      if (!forced) return false;
    }
    return true;
  }

  function puzzleMove(move) {
    var pz = S.puzzle;
    if (!pz || pz.solved || pz.blocked) return;

    var g = S.game;
    var legal = g.legalMoves();
    var san = g.san(move, legal);
    var mover = g.turn;
    g.make(move);

    S.positions.push({ fen: g.fen(), san: san, move: move, mover: mover });
    S.cursor = S.positions.length - 1;
    S.selected = -1;
    recomputeCaptured();
    renderBoard({ animateMove: move });
    renderPlayers();
    renderMoves();
    renderStatus();
    playEvent('move');

    if (pz.stage === 0) {
      if (g.legalMoves().length === 0 && g.inCheck()) { puzzleSolved(); return; }
      if (forcesMateIn1(g)) {
        pz.stage = 1;
        pz.blocked = true;
        setTimeout(puzzleReply, 420);
        return;
      }
      puzzleWrong();
      return;
    }

    if (g.legalMoves().length === 0 && g.inCheck()) { puzzleSolved(); return; }
    puzzleWrong();
  }

  function puzzleReply() {
    if (S.screen !== 'puzzles' || !S.puzzle || S.puzzle.solved) return;
    var g = S.game;
    var replies = g.legalMoves();
    if (!replies.length) { puzzleSolved(); return; }

    var best = replies[0];
    var bestCount = -1;
    for (var i = 0; i < replies.length; i++) {
      g.make(replies[i]);
      var mine = g.legalMoves();
      var count = 0;
      for (var j = 0; j < mine.length; j++) {
        g.make(mine[j]);
        if (g.legalMoves().length === 0 && g.inCheck()) count++;
        g.unmake();
      }
      g.unmake();
      if (count > bestCount) { bestCount = count; best = replies[i]; }
    }

    var san = g.san(best, replies);
    var mover = g.turn;
    g.make(best);

    S.positions.push({ fen: g.fen(), san: san, move: best, mover: mover });
    S.cursor = S.positions.length - 1;
    recomputeCaptured();
    renderBoard({ animateMove: best });
    renderPlayers();
    renderMoves();
    renderStatus();
    playEvent('move');

    S.puzzle.retryFen = g.fen();
    S.puzzle.retryPositions = S.positions.slice();
    S.puzzle.blocked = false;
  }

  function puzzleSolved() {
    var pz = S.puzzle;
    if (!pz || pz.solved) return;
    pz.solved = true;
    pz.blocked = true;
    var rush = !!S.rush;

    if (rush) {
      S.rush.score++;
      pzStats.rushBest = Math.max(pzStats.rushBest || 0, S.rush.score);
      savePuzzleStats();
    } else {
      P.streak++;
      P.solved++;
      P.rating += 12;
      savePuzzleStats();
    }

    if (S.daily) {
      var day = dayNumber();
      if (dailyState.day !== day) {
        dailyState.streak = dailyState.day === day - 1 ? (dailyState.streak || 0) + 1 : 1;
        dailyState.day = day;
        dailyState.done = true;
        saveJSON('gambit.daily', dailyState);
      }
      S.daily = false;
    }

    questAdd('puzzles', 1);
    checkAchievements();

    renderPuzzle();
    renderStatus();
    playEvent('end');
    toast(rush ? 'Solved \u2014 ' + S.rush.score + '!' : 'Solved \u2014 mate in ' + pz.mateIn + '!');

    var token = S.token;
    setTimeout(function () {
      if (S.screen !== 'puzzles' || token !== S.token) return;
      if (rush) {
        if (S.rush) startPuzzle(Math.floor(Math.random() * PUZZLES.length));
      } else {
        startPuzzle(P.index + 1);
      }
    }, rush ? 700 : 1700);
  }

  function puzzleWrong() {
    if (!S.puzzle) return;
    S.puzzle.blocked = true;
    playEvent('illegal');

    if (S.rush) {
      S.rush.lives--;
      renderPuzzle();
      if (S.rush.lives <= 0) {
        endRush('Out of lives \u2014 ' + S.rush.score + ' solved.');
        return;
      }
      toast('Missed \u2014 ' + S.rush.lives + ' lives left.');
      var rushToken = S.token;
      setTimeout(function () {
        if (S.screen !== 'puzzles' || rushToken !== S.token || !S.rush) return;
        startPuzzle(Math.floor(Math.random() * PUZZLES.length));
      }, 800);
      return;
    }

    P.streak = 0;
    P.rating = Math.max(700, P.rating - 8);
    savePuzzleStats();
    renderPuzzle();
    toast('Not quite \u2014 try again.');

    setTimeout(function () {
      if (S.screen !== 'puzzles' || !S.puzzle) return;
      S.puzzle.blocked = false;
      resetPuzzlePosition();
    }, 800);
  }

  function resetPuzzlePosition() {
    var pz = S.puzzle;
    if (!pz) return;
    S.game = new E.Chess(pz.retryFen);
    S.positions = pz.retryPositions.slice();
    S.cursor = S.positions.length - 1;
    S.selected = -1;
    S.result = null;
    recomputeCaptured();
    renderAll();
  }

  function puzzleHint() {
    var pz = S.puzzle;
    if (!pz || pz.solved) return;
    var g = S.game;
    var moves = g.legalMoves();
    var pick = null;

    for (var i = 0; i < moves.length; i++) {
      g.make(moves[i]);
      var mate = g.legalMoves().length === 0 && g.inCheck();
      g.unmake();
      if (mate) { pick = moves[i]; break; }
    }

    if (!pick && pz.stage === 0) {
      for (var j = 0; j < moves.length; j++) {
        g.make(moves[j]);
        var ok = forcesMateIn1(g);
        g.unmake();
        if (ok) { pick = moves[j]; break; }
      }
    }

    if (!pick) { toast('No hint available here.'); return; }
    S.selected = pick.from;
    renderBoard();
    toast('Look at the highlighted piece.');
  }

  function savePuzzleStats() {
    pzStats.rating = P.rating;
    pzStats.streak = P.streak;
    pzStats.solved = P.solved;
    pzStats.best = Math.max(pzStats.best || 0, P.streak);
    saveJSON('gambit.puzzles', pzStats);
  }

  /* ---------------- puzzle rush ---------------- */

  function fmtRush(ms) {
    var s = Math.ceil(ms / 1000);
    var m = Math.floor(s / 60);
    var sec = s % 60;
    return m + ':' + (sec < 10 ? '0' : '') + sec;
  }

  function startRush() {
    if (!PUZZLES.length) { toast('No puzzles installed.'); return; }
    S.rush = { ends: Date.now() + 180000, lives: 3, score: 0 };
    startPuzzle(Math.floor(Math.random() * PUZZLES.length));
    renderPuzzle();
    playEvent('start');
    toast('Puzzle Rush \u2014 3 minutes, 3 lives.');
  }

  function rememberRushBest(score) {
    pzStats.rushBest = Math.max(pzStats.rushBest || 0, score);
    pzStats.rushTop = (pzStats.rushTop || [])
      .concat([score])
      .sort(function (a, b) { return b - a; })
      .slice(0, 5);
    savePuzzleStats();
  }

  function endRush(message) {
    if (!S.rush) return;
    var score = S.rush.score;
    S.rush = null;
    rememberRushBest(score);
    renderPuzzle();
    renderStats();
    checkAchievements();
    playEvent('end');
    toast(message || ('Rush over \u2014 ' + score + ' solved.'));
    if (S.screen === 'puzzles') startPuzzle(P.index + 1);
  }

  /* Leaving mid-run keeps the score and never touches the normal streak. */
  function cancelRush() {
    if (!S.rush) return;
    rememberRushBest(S.rush.score);
    S.rush = null;
    if (S.screen === 'puzzles') renderPuzzle();
  }

  /* ---------------- game archive + stats ---------------- */

  function archiveGame(result) {
    if (S.positions.length < 2) return;
    games.unshift({
      at: Date.now(),
      code: result.code,
      reason: result.reason,
      mode: S.mode,
      variant: S.variant,
      level: (S.mode === 'ai' || S.mode === 'coach') ? S.level : null,
      dur: S.startedAt ? Math.max(0, Date.now() - S.startedAt) : null,
      start: S.positions[0].fen,
      you: (S.mode === 'ai' || S.mode === 'coach' || S.mode === 'online') ? S.playerColor : null,
      sans: S.positions.slice(1).map(function (p) { return p.san; })
    });
    games = games.slice(0, 60);
    saveJSON('gambit.games', games);
  }

  /* Older saves only carried wording; convert them once, at load. */
  function normalizeGame(g) {
    if (g.code) return g;
    var code = g.title === 'Draw' ? 'd'
      : g.title && g.title.indexOf('White wins') === 0 ? 'w'
        : g.title && g.title.indexOf('Black wins') === 0 ? 'b' : 'd';
    return {
      at: g.at,
      code: code,
      reason: (g.sub || 'unknown').replace(/^by /, ''),
      mode: g.mode,
      variant: g.variant,
      start: g.start,
      you: g.you,
      sans: g.sans || []
    };
  }

  function myResult(g) {
    if (g.code === 'd') return 'd';
    if (!g.you) return '?';
    return g.you === g.code ? 'w' : 'l';
  }

  function renderStats() {
    var grid = $('statGrid');
    var list = $('gameList');
    if (!grid || !list) return;

    renderProgress(false);
    renderQuestCard();
    renderPlacementState();
    renderOpeningReport();
    renderLevelReport();
    renderResultStrip();

    var w = 0, l = 0, d = 0;
    games.forEach(function (g) {
      var r = myResult(g);
      if (r === 'w') w++;
      else if (r === 'l') l++;
      else if (r === 'd') d++;
    });

    var decided = w + l + d;
    var scorePct = decided ? Math.round(((w + d / 2) / decided) * 100) : 0;
    var cards = [
      ['Games saved', games.length],
      ['Elo \u00b7 ' + Ratings.band(ratingState.r), Math.round(ratingState.r)],
      ['Best Elo', Math.round(ratingNow(ratingState.best))],
      ['Wins', w],
      ['Losses', l],
      ['Draws', d],
      ['Score', scorePct + '%'],
      ['Puzzle Elo', P.rating],
      ['Rush best', pzStats.rushBest || 0],
      ['Puzzle streak', P.streak || 0],
      ['Best streak', pzStats.best || 0]
    ];

    grid.innerHTML = '';
    cards.forEach(function (c) {
      var el = document.createElement('div');
      el.className = 'stat-card';
      var b = document.createElement('b');
      b.textContent = c[1];
      var s = document.createElement('span');
      s.textContent = c[0];
      el.appendChild(b);
      el.appendChild(s);
      grid.appendChild(el);
    });

    list.innerHTML = '';
    if (!games.length) {
      var empty = document.createElement('div');
      empty.className = 'rl-empty';
      empty.textContent = 'No finished games yet \u2014 play one and it lands here.';
      list.appendChild(empty);
      return;
    }

    var query = statsQuery.trim().toLowerCase();
    var shown = [];
    games.forEach(function (g, i) {
      var r = myResult(g);
      if (statsFilter !== 'all' && r !== statsFilter) return;
      if (query) {
        var text = Results.text(g.code, g.reason);
        var hay = (text.title + ' ' + text.sub + ' ' + (Openings.detect(g.sans).name || '') +
          ' ' + (g.mode || '') + ' ' + (g.variant || '') + ' ' +
          new Date(g.at).toLocaleDateString()).toLowerCase();
        if (hay.indexOf(query) < 0) return;
      }
      shown.push({ g: g, i: i });
    });

    if (!shown.length) {
      var none = document.createElement('div');
      none.className = 'rl-empty';
      none.textContent = games.length
        ? 'No saved games match that filter.'
        : 'No finished games yet \u2014 play one and it lands here.';
      list.appendChild(none);
      return;
    }

    shown.forEach(function (entry) {
      var g = entry.g, i = entry.i;
      var row = document.createElement('div');
      row.className = 'game-row';

      var main = document.createElement('div');
      main.className = 'gr-main';
      var text = Results.text(g.code, g.reason);
      var title = document.createElement('b');
      title.textContent = text.title + ' ' + text.sub;
      var meta = document.createElement('span');
      var label = g.variant && g.variant !== 'standard' ? g.variant : (g.mode === 'online' ? 'online' : g.mode === 'ai' ? 'computer' : 'two players');
      var found = Openings.detect(g.sans);
      meta.textContent = new Date(g.at).toLocaleDateString() + ' \u00b7 ' +
        g.sans.length + (g.sans.length === 1 ? ' move' : ' moves') + ' \u00b7 ' + label +
        (found.name ? ' \u00b7 ' + found.name : '') +
        (g.dur ? ' \u00b7 ' + Math.max(1, Math.round(g.dur / 60000)) + ' min' : '');
      main.appendChild(title);
      main.appendChild(meta);

      var acts = document.createElement('div');
      acts.className = 'gr-acts';

      var btn = document.createElement('button');
      btn.className = 'mini';
      btn.type = 'button';
      btn.textContent = 'Open';
      btn.addEventListener('click', function () { openArchived(i); });

      var pgn = document.createElement('button');
      pgn.className = 'mini';
      pgn.type = 'button';
      pgn.textContent = 'PGN';
      pgn.title = 'Download this game as a PGN';
      pgn.addEventListener('click', function () {
        downloadText(archivePgn(g), 'gambit-game-' + (i + 1) + '.pgn', 'PGN');
      });

      var del = document.createElement('button');
      del.className = 'mini danger';
      del.type = 'button';
      del.textContent = '\u00d7';
      del.title = 'Remove this game';
      del.addEventListener('click', function () {
        games.splice(i, 1);
        saveJSON('gambit.games', games);
        renderStats();
        toast('Game removed.');
      });

      acts.appendChild(btn);
      acts.appendChild(pgn);
      acts.appendChild(del);
      row.appendChild(main);
      row.appendChild(acts);
      list.appendChild(row);
    });
  }

  /* ---------------- achievements, XP, opening report ---------------- */

  function achievementStats() {
    var w = 0, l = 0, d = 0, streak = 0, i;
    games.forEach(function (g) {
      var r = myResult(g);
      if (r === 'w') w++;
      else if (r === 'l') l++;
      else if (r === 'd') d++;
    });
    for (i = 0; i < games.length; i++) {
      if (myResult(games[i]) !== 'w') break;
      streak++;
    }

    var solved = Object.keys(drillDone).filter(function (id) { return !!Drills.byId(id); });
    var endgames = solved.filter(function (id) {
      var def = Drills.byId(id);
      return !!(def && def.phase === 'endgame');
    }).length;

    return {
      games: games.length,
      wins: w,
      losses: l,
      draws: d,
      streak: streak,
      puzzles: P.solved || 0,
      puzzleRating: P.rating || 0,
      rush: pzStats.rushBest || 0,
      rating: Math.round(ratingNow()),
      drills: solved.length,
      drillsTotal: Drills.LIST.length,
      endgames: endgames,
      openings: Object.keys(openingDone).length,
      quests: questState.total || 0,
      questStreak: questState.streak || 0
    };
  }

  function renderProgress(announce) {
    var box = $('progressCard');
    if (!box) return;
    var res = Achievements.evaluate(achievementStats(), loadJSON('gambit.ach', []));
    var lvl = res.level;

    if (res.fresh.length) {
      if (announce) {
        notify('Achievement unlocked', res.fresh.map(function (id) {
          var a = Achievements.byId(id);
          return a ? a.title : id;
        }).join(', '), 'achievement', 'achievements');
      }
      saveJSON('gambit.ach', res.ids);
    }

    var next = null;
    Achievements.LIST.forEach(function (a) {
      if (!next && res.ids.indexOf(a.id) < 0) next = a;
    });

    var chips = Achievements.LIST.map(function (a) {
      var on = res.ids.indexOf(a.id) >= 0;
      return '<span class="ach' + (on ? ' on' : '') + '" title="' + a.text + '">' +
        (on ? '\u2605' : '\u2606') + ' ' + a.title + '</span>';
    }).join('');

    box.innerHTML =
      '<div class="pg-head"><span>Level <b>' + lvl.level + '</b></span>' +
      '<span class="pg-xp">' + res.xp + ' XP \u00b7 ' + lvl.into + '/' + lvl.need + ' to level ' + (lvl.level + 1) + '</span></div>' +
      '<div class="pg-bar"><i style="width:' + lvl.pct + '%"></i></div>' +
      (ratingSpark() ? '<div class="pg-spark">' + ratingSpark() + '</div>' : '') +
      '<div class="ach-grid">' + chips + '</div>' +
      (next
        ? '<p class="pg-next">Next: <b>' + next.title + '</b> \u2014 ' + next.text + '.</p>'
        : '<p class="pg-next">Every achievement unlocked. Impressive.</p>');
  }

  function checkAchievements() { renderProgress(true); }

  function renderOpeningReport() {
    var box = $('openingReport');
    if (!box) return;

    var rows = {};
    games.forEach(function (g) {
      if (!g.sans || !g.sans.length) return;
      var name = Openings.detect(g.sans).name || 'Uncommon lines';
      var row = rows[name] || (rows[name] = { name: name, w: 0, l: 0, d: 0 });
      var r = myResult(g);
      if (r === 'w') row.w++;
      else if (r === 'l') row.l++;
      else if (r === 'd') row.d++;
    });

    var list = Object.keys(rows).map(function (k) { return rows[k]; })
      .sort(function (a, b) { return (b.w + b.l + b.d) - (a.w + a.l + a.d); })
      .slice(0, 6);

    if (!list.length) {
      box.innerHTML = '<div class="rl-empty">Finish a few games and your openings show up here.</div>';
      return;
    }

    box.innerHTML = list.map(function (r) {
      var n = r.w + r.l + r.d;
      var pct = Math.round(((r.w + r.d / 2) / n) * 100);
      return '<div class="or-row"><span class="or-name">' + r.name + '</span>' +
        '<span class="or-games">' + n + ' game' + (n === 1 ? '' : 's') + '</span>' +
        '<span class="or-score">' + r.w + 'W \u00b7 ' + r.l + 'L \u00b7 ' + r.d + 'D</span>' +
        '<b>' + pct + '%</b></div>';
    }).join('');
  }

  function ratingSpark() {
    var vals = (ratingState.history || []).slice(-24);
    if (vals.length < 2) return '';
    return '<svg viewBox="0 0 120 26" preserveAspectRatio="none" aria-label="Rating history">' +
      '<path d="' + Ratings.sparkPath(vals, 120, 26) + '" class="spark-line"/></svg>';
  }

  function renderResultStrip() {
    var box = $('resultStrip');
    if (!box) return;
    var last = games.slice(0, 20).map(myResult);
    if (!last.length) {
      box.innerHTML = '<span class="rs-empty">Your last games will show up here.</span>';
      return;
    }
    box.innerHTML = '<span class="rs-label">Last ' + last.length + '</span>' +
      last.reverse().map(function (r) {
        var cls = r === 'w' ? 'w' : r === 'l' ? 'l' : r === 'd' ? 'd' : 'x';
        var name = r === 'w' ? 'win' : r === 'l' ? 'loss' : r === 'd' ? 'draw' : 'game';
        return '<i class="rs-bar ' + cls + '" title="' + name + '"></i>';
      }).join('');
  }

  function openArchived(index) {
    var g = games[index];
    if (!g) return;
    var rebuilt = sansToPositions(g.sans, g.start);
    saved.analysis = {
      fen: rebuilt.game.fen(),
      positions: rebuilt.positions,
      cursor: rebuilt.positions.length - 1,
      flipped: false,
      result: null,
      clocks: { w: 0, b: 0 },
      started: true,
      running: false,
      mode: 'human',
      level: S.level,
      playerColor: 'w',
      base: 0,
      inc: 0,
      lost: { w: [], b: [] }
    };
    setScreen('analysis');
    toast('Loaded into the analysis board.');
  }

  /* ---------------- position tools ---------------- */

  function readFen(fen) {
    var text = String(fen || '').trim();
    if (!text) return null;
    try {
      var probe = new E.Chess(text);
      if (!probe.kings.w || !probe.kings.b) return null;
      return probe;
    } catch (err) {
      return null;
    }
  }

  function useAnalysisPositions(positions) {
    if (!positions || !positions.length) return;
    var last = positions[positions.length - 1];
    S.game = new E.Chess(last.fen);
    S.positions = positions;
    S.cursor = positions.length - 1;
    S.result = null;
    S.selected = -1;
    S.thinking = false;
    S.base = 0;
    S.inc = 0;
    S.mode = 'human';
    S.variant = 'standard';
    S.checks = { w: 0, b: 0 };
    S.started = true;
    S.running = false;
    S.clocks = { w: 0, b: 0 };
    S.lost = { w: [], b: [] };
    $('resultLayer').hidden = true;
    recomputeCaptured();
    renderAll();
    scheduleEval();
  }

  function loadFenIntoAnalysis() {
    var probe = readFen($('fenInput').value);
    if (!probe) { toast('That FEN is not valid \u2014 it needs both kings.'); return; }
    useAnalysisPositions([{ fen: probe.fen(), san: null, move: null, mover: null }]);
    toast('Position loaded.');
  }

  function cleanPgn(text) {
    return String(text || '')
      .replace(/\{[^}]*\}/g, ' ')
      .replace(/\([^)]*\)/g, ' ')
      .replace(/\[[^\]]*\]/g, ' ')
      .replace(/\$\d+/g, ' ')
      .replace(/0-0-0/g, 'O-O-O')
      .replace(/0-0/g, 'O-O')
      .replace(/\b(1-0|0-1|1\/2-1\/2|\*)\b/g, ' ')
      .replace(/\d+\.(\.\.)?/g, ' ')
      .replace(/[?!]+/g, ' ')
      .split(/\s+/)
      .filter(Boolean);
  }

  function loadPgnIntoAnalysis() {
    var tokens = cleanPgn($('pgnInput').value);
    if (!tokens.length) { toast('No moves found in that PGN.'); return; }

    var game = new E.Chess();
    var positions = [{ fen: E.START_FEN, san: null, move: null, mover: null }];

    for (var i = 0; i < tokens.length; i++) {
      var legal = game.legalMoves();
      var token = tokens[i];
      var bare = token.replace(/[+#]$/, '');
      var found = null;

      for (var j = 0; j < legal.length; j++) {
        var san = game.san(legal[j], legal);
        if (san === token || san.replace(/[+#]$/, '') === bare) { found = legal[j]; break; }
      }

      if (!found) { toast('Could not play "' + token + '" at move ' + (i + 1) + '.'); return; }

      var mover = game.turn;
      var applied = game.san(found, legal);
      game.make(found);
      positions.push({ fen: game.fen(), san: applied, move: found, mover: mover });
    }

    useAnalysisPositions(positions);
    toast('Loaded ' + tokens.length + ' moves.');
  }

  /* ---------------- record ---------------- */

  function recordResult(code) {
    if (code === 'd') record.d++;
    else if (code === S.playerColor) record.w++;
    else record.l++;
    saveJSON('gambit.record', record);
    renderRecord();
    renderPlayers();
  }

  function renderRecord() {
    var el = $('recordLine');
    if (!el) return;
    el.innerHTML = 'Record: ' + recordTag() + ' <span class="rec-legend">W-L-D</span>';
    var pick = function (n, one, many) { return n + ' ' + (n === 1 ? one : many); };
    el.title = pick(record.w, 'win', 'wins') + ' \u00b7 ' + pick(record.l, 'loss', 'losses') +
      ' \u00b7 ' + pick(record.d, 'draw', 'draws');
  }

  /* ---------------- per-screen chrome ---------------- */

  function renderModeExtras() {
    var card = $('puzzleCard');
    var strip = $('engineStrip');
    var coach = $('coachCard');
    var review = $('reviewCard');
    if (S.screen === 'puzzles') {
      card.hidden = false;
      strip.hidden = true;
      renderPuzzle();
    } else if (S.screen === 'analysis') {
      card.hidden = true;
      strip.hidden = false;
    } else {
      card.hidden = true;
      strip.hidden = true;
    }
    coach.hidden = S.screen !== 'play';
    review.hidden = S.screen !== 'review';
    syncNav();
    var tools = $('toolsCard');
    if (tools) tools.hidden = S.screen !== 'analysis';
    renderDrill();
    renderCoachNote();
    if (S.screen === 'review') paintReview();
    renderRoom();
    renderRecord();
  }

  /* ---------------- clock ---------------- */

  setInterval(function () {
    if (!S.running || S.result || S.base === 0) return;
    var now = performance.now();
    var dt = now - S.lastTick;
    S.lastTick = now;
    if (dt < 0 || dt > 1500) return;
    var t = S.game.turn;
    S.clocks[t] = Math.max(0, S.clocks[t] - dt);
    if (S.clocks[t] <= 0) flagFall(t);
    renderClocks();
  }, 100);

  setInterval(function () {
    if (!S.rush) return;
    var left = Math.max(0, S.rush.ends - Date.now());
    var el = $('pzTime');
    if (el) el.textContent = fmtRush(left);
    if (left <= 0) {
      var score = S.rush.score;
      endRush('Time \u2014 ' + score + ' solved.');
    }
  }, 250);

  /* ---------------- board interaction ---------------- */

  function canControl() {
    if (S.result || !isLive() || S.thinking || S.replay) return false;
    if (S.screen === 'review') return false;
    if (S.mode === 'online') {
      if (!S.net || !S.net.seat || !S.net.present) return false;
      if (!S.net.present.w || !S.net.present.b) return false;
      return S.game.turn === S.net.seat;
    }
    if (S.screen === 'puzzles') return !!(S.puzzle && !S.puzzle.solved && !S.puzzle.blocked);
    return S.mode === 'human' || S.game.turn === S.playerColor;
  }

  boardEl.addEventListener('pointerdown', function (ev) {
    if (ev.button !== undefined && ev.button !== 0) return;
    var sqEl = ev.target.closest('.sq');
    if (!sqEl) return;
    if (!canControl()) {
      if (S.thinking) renderStatus();
      return;
    }
    var i = Number(sqEl.dataset.i);
    var piece = S.game.board[i];

    if (piece && E.colorOf(piece) === S.game.turn) {
      if (S.selected === i) {
        S.selected = -1;
        renderBoard();
        return;
      }
      S.selected = i;
      renderBoard();
      startDrag(ev, i);
      ev.preventDefault();
      return;
    }

    if (S.selected >= 0) attemptMove(S.selected, i);
    else { S.selected = -1; renderBoard(); }
  });

  function startDrag(ev, i) {
    var sqEl = boardEl.querySelector('.sq[data-i="' + i + '"]');
    if (!sqEl) return;
    var rect = sqEl.getBoundingClientRect();
    var ghost = document.createElement('div');
    ghost.className = 'drag-ghost';
    ghost.style.width = rect.width + 'px';
    ghost.style.height = rect.height + 'px';
    ghost.style.left = (ev.clientX - rect.width / 2) + 'px';
    ghost.style.top = (ev.clientY - rect.height / 2) + 'px';
    ghost.innerHTML = sqEl.innerHTML;
    ghost.querySelectorAll('.coord').forEach(function (c) { c.remove(); });
    document.body.appendChild(ghost);

    var src = sqEl.querySelector('.piece');
    if (src) src.classList.add('dragging');
    document.body.classList.add('grabbing');

    S.drag = { from: i, ghost: ghost, moved: false };
  }

  window.addEventListener('pointermove', function (ev) {
    var drag = S.drag;
    if (!drag) return;
    var w = parseFloat(drag.ghost.style.width);
    drag.ghost.style.left = (ev.clientX - w / 2) + 'px';
    drag.ghost.style.top = (ev.clientY - w / 2) + 'px';
    drag.moved = true;
  });

  window.addEventListener('pointerup', function (ev) {
    var drag = S.drag;
    if (!drag) return;
    S.drag = null;
    drag.ghost.remove();
    document.body.classList.remove('grabbing');

    var el = document.elementFromPoint(ev.clientX, ev.clientY);
    var sqEl = el && el.closest ? el.closest('.sq') : null;
    if (sqEl) {
      var to = Number(sqEl.dataset.i);
      if (to !== drag.from) { attemptMove(drag.from, to); return; }
    }
    renderBoard();
  });

  window.addEventListener('pointercancel', function () {
    if (!S.drag) return;
    S.drag.ghost.remove();
    S.drag = null;
    document.body.classList.remove('grabbing');
    renderBoard();
  });

  /* ---------------- coach game mode ---------------- */

  var LESSON_FOR = {
    tactics: 'lesson-tactics',
    openings: 'lesson-openings',
    endgame: 'lesson-endgame',
    check: 'lesson-check',
    castling: 'lesson-castling'
  };

  function isCoach() { return S.mode === 'coach'; }

  function sanOf(uci, fen) {
    if (!uci) return null;
    var probe = new E.Chess(fen);
    var mv = E.fromUci(uci, probe.legalMoves());
    return mv ? probe.san(mv) : null;
  }

  /* Paint the engine's choice as the blue coach arrow on your turn. */
  function showCoachArrow(info, tries) {
    if (!isCoach() || S.screen !== 'play' || S.result || !isLive()) return;
    if (S.game.turn !== S.playerColor) return;
    if (!info || !info.best) return;
    /* Never repaint the board out from under a drag; try again shortly. */
    if (S.drag) {
      if ((tries || 0) < 8) {
        setTimeout(function () { showCoachArrow(info, (tries || 0) + 1); }, 250);
      }
      return;
    }
    if ($('promoLayer') && !$('promoLayer').hidden) return;
    var mv = E.fromUci(info.best, S.game.legalMoves());
    if (!mv) return;
    var san = S.game.san(mv);
    if (S.coachHint && S.coachHint.auto && S.coachHint.from === mv.from &&
      S.coachHint.to === mv.to && S.coachHint.san === san) return;
    S.coachHint = { from: mv.from, to: mv.to, auto: true, san: san };
    renderBoard();
    updateCoach();
  }

  function coachPrime() {
    if (!isCoach() || S.screen !== 'play' || S.result || !isLive()) return;
    if (S.game.turn !== S.playerColor) return;
    var fen = S.game.fen();
    if (S.coachBase && S.coachBase.fen === fen) {
      showCoachArrow(S.coachBase.info);
      return;
    }

    var seq = S.coachSeq;
    requestEvalAsync(fen, 3, function (info) {
      if (seq !== S.coachSeq || !isCoach() || S.game.fen() !== fen) return;
      S.coachBase = { fen: fen, info: info };
      showCoachArrow(info);
    });
  }

  /* Grade any ply in the current game — yours, the coach's, or a historic one. */
  function coachFeedback(plyIndex, beforeFen, afterFen, move, mover, opts) {
    opts = opts || {};
    var seq = ++S.coachSeq;
    S.coachAsk = opts.quiet ? null : plyIndex;
    renderCoachNote();
    var before = S.coachBase && S.coachBase.fen === beforeFen ? S.coachBase.info : null;

    function apply(bi, ai) {
      if (seq !== S.coachSeq) { if (opts.then) opts.then(null); return; }
      S.coachAsk = null;
      var entry = S.positions[plyIndex];
      if (!entry || entry.fen !== afterFen) { renderCoachNote(); return; }

      var sgn = mover === 'w' ? 1 : -1;
      var bestCp = Review.scoreCp(bi) * sgn;
      var final = Review.finalCp(afterFen, mover);
      var playedCp = final == null ? Review.scoreCp(ai) * sgn : final;
      var loss = Math.max(0, (Review.expected(bestCp) - Review.expected(playedCp)) * 100);

      var uci = E.moveToUci(move);
      var isBest = !!(bi && bi.best && bi.best === uci);

      var sans = S.positions.slice(1).map(function (p) { return p.san; });
      var book = Openings.isBookPly(sans, plyIndex);
      if (isBest || book) loss = 0;
      var given = Review.materialGiven(beforeFen, afterFen, mover);
      var brilliant = isBest && given >= 2 && Review.expected(playedCp) >= 0.5;
      var cls = Review.classify({ loss: loss, isBest: isBest, book: book, brilliant: brilliant });
      var bestSan = sanOf(bi && bi.best, beforeFen);
      var bestPoint = Explain.purpose(beforeFen, bi && bi.best);
      var playedPoint = Explain.purpose(beforeFen, uci);
      var whyBest = bestSan && bestSan !== entry.san
        ? Coach.whyBetter({
          san: bestSan,
          purpose: bestPoint && bestPoint !== playedPoint ? bestPoint : '',
          from: Explain.evalText(playedCp),
          to: Explain.evalText(bestCp)
        })
        : '';

      var exp = Explain.describe({
        beforeFen: beforeFen,
        afterFen: afterFen,
        playedUci: uci,
        bestUci: bi && bi.best,
        replyUci: ai && ai.best,
        cls: cls,
        bestCp: bestCp,
        playedCp: playedCp,
        book: book,
        opening: Openings.detect(sans).name
      });

      S.coachNotes[plyIndex] = {
        ply: plyIndex,
        mine: mover === S.playerColor,
        cls: cls,
        loss: loss,
        bestSan: bestSan,
        bestUci: bi && bi.best,
        playedUci: uci,
        whyBest: whyBest,
        san: entry.san,
        tip: exp.text,
        topic: exp.topic,
        evalText: final != null
          ? (final > 0 ? '#' : '0.00')
          : loss >= 5
            ? '\u2212' + Math.round(loss) + '% chances'
            : (playedCp >= 0 ? '+' : '') + (playedCp / 100).toFixed(2)
      };
      S.lastNotePly = plyIndex;

      renderCoachNote();
      if (opts.live && (cls === 'blunder' || cls === 'mistake')) playEvent('illegal');
      if (opts.then) opts.then(S.coachNotes[plyIndex]);
      if (S.result) renderCoachSummary();
    }

    if (before) {
      requestEvalAsync(afterFen, 3, function (ai) { apply(before, ai); });
    } else {
      requestEvalAsync(beforeFen, 3, function (bi) {
        requestEvalAsync(afterFen, 3, function (ai) { apply(bi, ai); });
      });
    }
  }

  function plyLabel(ply) {
    var n = Math.ceil(ply / 2);
    return ply % 2 === 1 ? n + '.' : n + '\u2026';
  }

  function noteForPly(ply) {
    return ply >= 1 ? S.coachNotes[ply] || null : null;
  }

  /* Verdict shown for the current cursor: its own note, or the latest one while live. */
  function currentNote() {
    var fb = noteForPly(S.cursor);
    if (!fb && isLive() && S.lastNotePly && noteForPly(S.lastNotePly)) {
      fb = noteForPly(S.lastNotePly);
    }
    return fb;
  }

  function renderCoachNote() {
    var card = $('coachNote');
    if (!card) return;
    var ply = S.cursor;
    var entry = S.positions[ply];
    var asking = S.coachAsk === ply;
    var why = !asking && S.showWhy && S.showWhy.ply === ply + 1 ? S.showWhy.text : '';
    var atStart = !entry || !entry.san;
    var visible = S.screen === 'play' && isCoach() && (!atStart || !!why);
    card.hidden = !visible;
    if (!visible) return;

    var fb = currentNote();
    var ask = $('cnAsk');

    $('cnWhy').hidden = !why;
    $('cnWhy').textContent = why;

    if (atStart) {
      ask.hidden = true;
      $('cnBadge').hidden = true;
      $('cnEval').textContent = '';
      $('cnTitle').textContent = 'Before ' + plyLabel(ply + 1) + ' ' + (S.positions[ply + 1] ? S.positions[ply + 1].san : '');
      $('cnTip').textContent = '';
      $('cnShow').hidden = true;
      $('cnUndo').hidden = true;
      $('cnLearn').hidden = true;
      return;
    }

    ask.textContent = 'Ask coach about ' + plyLabel(ply) + ' ' + entry.san;
    ask.hidden = asking || !!(fb && fb.ply === ply);
    ask.disabled = !!S.coachAsk;

    if (asking) {
      $('cnBadge').hidden = true;
      $('cnEval').textContent = '';
      $('cnTitle').textContent = plyLabel(ply) + ' ' + entry.san;
      $('cnTip').textContent = 'Coach is looking at this move\u2026';
      $('cnShow').hidden = true;
      $('cnUndo').hidden = true;
      $('cnLearn').hidden = true;
      return;
    }

    if (!fb) {
      $('cnBadge').hidden = true;
      $('cnEval').textContent = '';
      $('cnTitle').textContent = plyLabel(ply) + ' ' + entry.san;
      $('cnTip').textContent = 'Ask the coach what it thinks of this move, and what the stronger move was.';
      $('cnShow').hidden = true;
      $('cnUndo').hidden = true;
      $('cnLearn').hidden = true;
      return;
    }

    var lab = Review.LABELS[fb.cls];
    var badge = $('cnBadge');
    badge.hidden = false;
    badge.textContent = lab.label;
    badge.className = 'cn-badge rv-tag ' + fb.cls;
    $('cnEval').textContent = fb.evalText;
    $('cnTitle').textContent = plyLabel(fb.ply) + ' ' + fb.san +
      (fb.bestSan && fb.cls !== 'best' && fb.cls !== 'book' ? ' \u2014 better: ' + fb.bestSan : '');
    $('cnTip').textContent = (fb.mine ? 'You: ' : 'Coach: ') + fb.tip;
    $('cnShow').hidden = !fb.bestUci || fb.bestUci === fb.playedUci;
    $('cnUndo').hidden = !(isLive() && fb.mine && !S.result &&
      (fb.ply === S.positions.length - 1 || fb.ply === S.positions.length - 2));
    $('cnLearn').hidden = !fb.topic;
  }

  function coachShowBest() {
    var fb = currentNote();
    if (!fb || !fb.bestUci) return;
    var prev = S.positions[fb.ply - 1];
    if (!prev) return;
    var probe = new E.Chess(prev.fen);
    var mv = E.fromUci(fb.bestUci, probe.legalMoves());
    if (!mv) { toast('That suggestion no longer applies.'); return; }
    S.showWhy = { ply: fb.ply, text: fb.whyBest || '' };
    S.cursor = fb.ply - 1;
    S.selected = -1;
    S.coachHint = { from: mv.from, to: mv.to };
    renderBoard();
    renderMoves();
    renderStatus();
    renderCoachNote();
    toast('Coach suggestion highlighted.');
  }

  /* ---------------- end-of-game coach summary ---------------- */

  function coachSummaryNotes() {
    var out = [];
    for (var ply = 1; ply < S.positions.length; ply++) {
      var n = S.coachNotes[ply];
      if (n && n.mine) out.push(n);
    }
    return out;
  }

  function renderCoachSummary() {
    var box = $('coachSummary');
    if (!box) return;
    var show = isCoach() && S.screen === 'play' && !!S.result;
    box.hidden = !show;
    if (!show) return;

    var notes = coachSummaryNotes();
    if (!notes.length) { box.hidden = true; return; }
    var worst = notes.filter(function (n) { return n.loss >= 5; })
      .sort(function (a, b) { return b.loss - a.loss; })
      .slice(0, 3);

    var acc = Review.aggregate(notes.map(function (n) { return Review.accuracy(n.loss); }));
    var opening = Openings.detect(S.positions.slice(1).map(function (p) { return p.san; })).name;
    $('csNarrative').textContent = Coach.gameSummary({
      moves: notes.length,
      accuracy: acc,
      outcome: S.result.code === 'd' ? 'drawn' : S.result.code === S.playerColor ? 'won' : 'lost',
      opening: opening,
      worst: worst.map(function (n) { return { label: plyLabel(n.ply), san: n.san, reason: n.tip }; }),
      hanging: notes.filter(function (n) { return /loses the/.test(n.tip); }).length,
      blunders: notes.filter(function (n) { return n.cls === 'blunder'; }).length
    });

    var list = $('csList');
    list.innerHTML = '';
    worst.forEach(function (n) {
      var li = document.createElement('li');
      li.className = 'cs-row';

      var tag = document.createElement('i');
      tag.className = 'rv-tag ' + n.cls;
      tag.textContent = Review.LABELS[n.cls].label;

      var mv = document.createElement('b');
      mv.className = 'cs-move';
      mv.textContent = plyLabel(n.ply) + ' ' + n.san;

      var note = document.createElement('span');
      note.className = 'cs-note';
      note.textContent = n.tip;

      var cost = document.createElement('span');
      cost.className = 'cs-cost';
      cost.textContent = '\u2212' + Math.round(n.loss) + '%';

      li.appendChild(tag);
      li.appendChild(mv);
      li.appendChild(note);
      li.appendChild(cost);
      list.appendChild(li);
    });

    $('csSub').textContent = worst.length
      ? worst.length + ' of ' + notes.length + ' moves'
      : 'no mistakes worth flagging';
  }

  /* Grade any of your moves the live pass missed, then draw the summary. */
  function coachFinalize() {
    if (!isCoach() || !S.result) { renderCoachSummary(); return; }
    var todo = [];
    for (var ply = 1; ply < S.positions.length; ply++) {
      if (S.positions[ply].mover === S.playerColor && !S.coachNotes[ply]) todo.push(ply);
    }

    var i = 0;
    function next() {
      while (i < todo.length) {
        var ply2 = todo[i++];
        if (S.coachNotes[ply2]) continue;
        var prev = S.positions[ply2 - 1];
        var entry = S.positions[ply2];
        coachFeedback(ply2, prev.fen, entry.fen, entry.move, entry.mover, { quiet: true, then: next });
        return;
      }
      renderCoachSummary();
    }
    next();
  }

  function goLesson(topic) {
    var id = LESSON_FOR[topic];
    if (!id) return;
    setScreen('learn');
    var el = document.getElementById(id);
    if (el) {
      el.open = true;
      el.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
  }

  /* ---------------- learn mode: drills ---------------- */

  var drillDone = loadJSON('gambit.drills', {});

  function saveDrillDone() { saveJSON('gambit.drills', drillDone); }

  function nextDrillId(id) {
    var list = Drills.LIST;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[(i + 1) % list.length].id;
    }
    return list[0].id;
  }

  function startDrill(id) {
    var def = Drills.byId(id);
    if (!def) return;
    setScreen('play');
    newGame({
      mode: 'coach',
      level: 2,
      color: def.color || 'w',
      base: 0,
      inc: 0,
      fen: def.fen,
      drill: def
    });
  }

  function renderDrill() {
    var card = $('drillCard');
    if (!card) return;
    var d = S.drill;
    card.hidden = !d || S.screen !== 'play';
    if (card.hidden) return;

    var done = d.done;
    $('dcTitle').textContent = d.def.title;
    $('dcBrief').textContent = d.def.brief;
    $('dcPar').textContent = done === 'solved'
      ? 'Solved'
      : done === 'failed'
        ? 'Out of moves'
        : 'Move ' + Math.min(d.moves + 1, d.def.par) + ' of ' + d.def.par;

    $('dcStatus').textContent = done
      ? Coach.drillResult(d.def, { solved: done === 'solved', moves: d.moves, par: d.def.par, hints: d.hints })
      : '';
    $('dcStatus').className = 'dc-status' + (done === 'solved' ? ' ok' : done === 'failed' ? ' bad' : '');

    $('dcHint').hidden = !!done;
    $('dcRetry').hidden = done !== 'failed';
    $('dcNext').hidden = done !== 'solved';
  }

  function renderLearn() {
    var grid = $('drillGrid');
    if (!grid) return;

    var solved = 0, best = null;
    Drills.LIST.forEach(function (d) {
      var rec = drillDone[d.id];
      if (!rec) return;
      solved++;
      if (!best || rec.moves < best.moves) best = { title: d.title, moves: rec.moves };
    });
    var next = Drills.LIST.filter(function (d) { return !drillDone[d.id]; })[0] || Drills.LIST[0];

    $('learnSummary').textContent = Coach.learnSummary({
      total: Drills.LIST.length,
      solved: solved,
      nextTitle: next.title,
      nextBrief: next.brief,
      best: best
    });

    var endGrid = $('endgameGrid');
    grid.innerHTML = '';
    if (endGrid) endGrid.innerHTML = '';
    Drills.LIST.forEach(function (d, i) {
      var target = d.phase === 'endgame' && endGrid ? endGrid : grid;
      var rec = drillDone[d.id];
      var tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'drill-tile' + (rec ? ' done' : '');
      tile.dataset.drill = d.id;

      var num = document.createElement('span');
      num.className = 'dt-num';
      num.textContent = rec ? '\u2713' : String(i + 1);

      var title = document.createElement('span');
      title.className = 'dt-title';
      title.textContent = d.title;

      var brief = document.createElement('span');
      brief.className = 'dt-brief';
      brief.textContent = d.brief;

      var foot = document.createElement('span');
      foot.className = 'dt-foot';
      foot.textContent = rec
        ? 'Solved in ' + rec.moves + ' move' + (rec.moves === 1 ? '' : 's')
        : 'Play \u00b7 ' + d.par + ' move' + (d.par === 1 ? '' : 's');

      tile.appendChild(num);
      tile.appendChild(title);
      tile.appendChild(brief);
      tile.appendChild(foot);
      target.appendChild(tile);
    });

    renderOpeningGrid();
    if (!trainer) $('trainerCard').hidden = true;
  }

  /* ---------------- online play ---------------- */

  var netCfg = { name: '', base: 300, inc: 0, color: 'w' };

  /* A static host (GitHub Pages, file://) has no server of its own, so online
     play is only offered there when js/config.js names a hosted server. */
  var SERVER = String(window.GAMBIT_SERVER || '').trim();
  var STATIC_HOST = /\.github\.io$/i.test(location.hostname) || location.protocol === 'file:';
  var NO_SERVER = STATIC_HOST && !SERVER;

  function markStaticHost() {
    if (!NO_SERVER) return;

    var note = $('netHint');
    if (note) {
      note.textContent = 'Online rooms need the Gambit server, and this copy is a static build, ' +
        'so rooms are off here. The computer, puzzles, drills, review and the Elo test all work.';
    }

    ['netCreate', 'netQuick', 'netJoin', 'netRefresh'].forEach(function (id) {
      var el = $(id);
      if (!el) return;
      el.disabled = true;
      el.title = 'Needs the Gambit server';
    });

    var code = $('netCode');
    if (code) {
      code.disabled = true;
      code.placeholder = 'static build';
    }
  }

  function netSend(obj) {
    if (!S.net || !S.net.ws || S.net.ws.readyState !== 1) return false;
    try { S.net.ws.send(JSON.stringify(obj)); return true; } catch (err) { return false; }
  }

  function netConnect(then, quiet) {
    if (NO_SERVER) {
      toast('Online rooms need the Gambit server \u2014 this copy has none configured.');
      return;
    }

    if (S.net && S.net.ws && (S.net.ws.readyState === 0 || S.net.ws.readyState === 1)) {
      if (S.net.ws.readyState === 1) then();
      else S.net.queued = then;
      return;
    }

    /* A free host spins the server down when nobody is around, and the first
       connection afterwards waits for it to boot, so keep knocking for a bit. */
    var firstTry = Date.now();
    var tries = 0;

    function open() {
      var ws;
      try { ws = new WebSocket(GambitNet.wsUrl(SERVER, location)); }
      catch (err) { toast('Could not open a connection.'); return; }

      var opened = false;
      S.net = { ws: ws, code: null, seat: null, names: {}, present: {}, chat: [], open: false, queued: then, quiet: !!quiet };

      ws.onopen = function () {
        if (!S.net || S.net.ws !== ws) return;
        opened = true;
        S.net.open = true;
        renderRoom();
        netSend({ t: 'lobby' });
        var fn = S.net.queued;
        S.net.queued = null;
        if (fn) fn();
      };

      ws.onmessage = function (ev) {
        var msg;
        try { msg = JSON.parse(ev.data); } catch (err) { return; }
        netMessage(msg);
      };

      ws.onerror = function () { /* onclose reports it */ };

      ws.onclose = function () {
        if (!S.net || S.net.ws !== ws) return;
        var wasQuiet = S.net.quiet;
        S.net.open = false;
        S.net.present = {};
        if (!opened && SERVER && Date.now() - firstTry < 90000) {
          tries++;
          if (tries === 1) toast('Waking the online server \u2014 the first visit can take a minute.');
          setTimeout(open, Math.min(8000, 1000 * tries));
          return;
        }
        if (!wasQuiet) toast('Disconnected from the online game.');
        renderRoom();
        renderPlayers();
      };
    }

    open();
  }

  function netMessage(msg) {
    switch (msg.t) {
      case 'state': applyOnlineState(msg); break;
      case 'rooms': renderLobby(msg.rooms); break;
      case 'move': applyOnlineMove(msg); break;
      case 'end': setOnlineResult(msg.result, msg.clocks); break;
      case 'chat':
        if (S.net) { S.net.chat = msg.chat || []; renderChat(); }
        break;
      case 'drawOffer':
        if (S.net) S.net.drawOffered = true;
        renderRoom();
        toast('Your opponent offers a draw.');
        break;
      case 'drawDeclined':
        toast('Draw offer declined.');
        break;
      case 'notice':
        toast(msg.message);
        break;
      case 'left':
        if (S.net) { S.net.present = {}; S.net.drawOffered = false; }
        renderRoom();
        renderPlayers();
        renderStatus();
        break;
      case 'error':
        toast(msg.message);
        break;
      default: break;
    }
  }

  function sansToPositions(sans, startFen) {
    var game = new E.Chess(startFen || E.START_FEN);
    var positions = [{ fen: game.fen(), san: null, move: null, mover: null }];
    (sans || []).forEach(function (san) {
      var legal = game.legalMoves();
      var found = null;
      for (var i = 0; i < legal.length; i++) {
        if (game.san(legal[i], legal) === san) { found = legal[i]; break; }
      }
      if (!found) return;
      var mover = game.turn;
      game.make(found);
      positions.push({ fen: game.fen(), san: san, move: found, mover: mover });
    });
    return { game: game, positions: positions };
  }

  function applyOnlineState(msg) {
    var rebuilt = sansToPositions(msg.sans);
    S.mode = 'online';
    S.game = rebuilt.game;
    S.positions = rebuilt.positions;
    S.cursor = S.positions.length - 1;
    S.base = msg.base;
    S.inc = msg.inc;
    S.clocks = { w: msg.clocks ? msg.clocks.w : 0, b: msg.clocks ? msg.clocks.b : 0 };
    S.started = S.positions.length > 1;
    S.result = null;
    S.thinking = false;
    S.selected = -1;
    S.coachHint = null;
    S.review = null;
    S.playerColor = msg.seat || 'w';
    S.flipped = msg.seat === 'b';
    S.running = S.base > 0 && S.started;
    S.lastTick = performance.now();
    $('resultLayer').hidden = true;
    $('promoLayer').hidden = true;

    if (S.net) {
      S.net.code = msg.code;
      S.net.seat = msg.seat;
      S.net.names = msg.names || {};
      S.net.present = msg.present || {};
      S.net.chat = msg.chat || [];
      S.net.drawOffered = false;
    }

    if (S.screen !== 'play') {
      S.screen = 'play';
      document.body.dataset.screen = 'play';
      syncNav();
    }

    var activeTab = document.querySelector('.tab-btn.active');
    if (!activeTab || activeTab.dataset.tab === 'online') switchTab('moves');

    recomputeCaptured();
    renderAll();
    if (msg.result) setOnlineResult(msg.result);
  }

  function applyOnlineMove(msg) {
    if (S.mode !== 'online') return;
    var move = E.fromUci(msg.uci, S.game.legalMoves());
    if (!move) { netSend({ t: 'sync' }); return; }

    performMove(move);
    if (msg.clocks) S.clocks = { w: msg.clocks.w, b: msg.clocks.b };
    S.running = S.base > 0 && !S.result;
    S.lastTick = performance.now();
    renderClocks();
    if (msg.result) setOnlineResult(msg.result);
    else renderRoom();
  }

  function setOnlineResult(result, clocks) {
    if (clocks) { S.clocks = { w: clocks.w, b: clocks.b }; renderClocks(); }
    if (result && !S.result) finishGame(result.code, result.reason);
    renderRoom();
  }

  function netCreate() {
    netCfg.name = ($('netName').value || '').trim();
    netConnect(function () {
      if (!netSend({ t: 'create', name: netCfg.name, base: netCfg.base, inc: netCfg.inc, color: netCfg.color })) {
        toast('Connection not ready \u2014 try again.');
      }
    });
  }

  function netJoin(codeOverride) {
    var code = String(codeOverride || $('netCode').value || '').toUpperCase().trim();
    if (code.length < 4) { toast('Enter the room code.'); return; }
    netCfg.name = ($('netName').value || '').trim();
    netConnect(function () {
      if (!netSend({ t: 'join', code: code, name: netCfg.name })) toast('Connection not ready \u2014 try again.');
    });
  }

  function netLeave(quiet) {
    if (!S.net) return;
    if (!quiet) netSend({ t: 'leave' });
    S.net.quiet = true;
    try { S.net.ws.close(); } catch (err) { /* ignore */ }
    S.net = null;
    renderRoom();
  }

  function renderRoom() {
    var card = $('roomCard');
    if (!card) return;
    var net = S.net;
    var live = !!(net && net.code);
    card.hidden = !live || S.screen !== 'play';
    if (!live) return;

    $('rmCode').textContent = net.code;
    $('rmSeat').textContent = net.seat ? (net.seat === 'w' ? 'White' : 'Black') : 'Spectating';

    var status;
    if (!net.open) status = 'Disconnected \u2014 reload to reconnect.';
    else if (!net.present || !net.present.w || !net.present.b) status = 'Waiting for an opponent \u2014 share the code below.';
    else if (S.result) {
      var finished = resultText();
      status = finished.title + ' ' + finished.sub;
    }
    else status = S.game.turn === net.seat ? 'Your move' : 'Opponent is thinking\u2026';
    $('rmStatus').textContent = status;

    $('rmPending').hidden = !(net.drawOffered && !S.result);
    renderChat();
  }

  function renderChat() {
    var box = $('rmChat');
    if (!box) return;
    var list = (S.net && S.net.chat) || [];
    box.innerHTML = '';
    list.slice(-40).forEach(function (m) {
      var row = document.createElement('div');
      row.className = 'rm-msg' + (S.net && m.seat === S.net.seat ? ' me' : '');
      var who = document.createElement('b');
      who.textContent = (m.from || 'Player') + ': ';
      row.appendChild(who);
      row.appendChild(document.createTextNode(m.text || ''));
      box.appendChild(row);
    });
    box.scrollTop = box.scrollHeight;
  }

  function tcLabel(r) {
    if (!r.base) return 'Casual';
    return Math.round(r.base / 60) + '+' + (r.inc || 0);
  }

  function renderLobby(rooms) {
    var list = $('roomList');
    if (!list) return;
    list.innerHTML = '';

    if (!rooms || !rooms.length) {
      var empty = document.createElement('div');
      empty.className = 'rl-empty';
      empty.textContent = 'No rooms right now \u2014 create one or hit Quick match.';
      list.appendChild(empty);
      return;
    }

    rooms.forEach(function (r) {
      var row = document.createElement('div');
      row.className = 'rl-row';

      var main = document.createElement('div');
      main.className = 'rl-main';
      var code = document.createElement('b');
      code.textContent = r.code;
      var meta = document.createElement('span');
      var state = r.live ? 'live' : r.result ? 'finished' : r.open ? 'open' : 'full';
      meta.textContent = tcLabel(r) + ' \u00b7 ' + state + ' \u00b7 ' + r.moves + ' moves';
      main.appendChild(code);
      main.appendChild(meta);

      var who = document.createElement('div');
      who.className = 'rl-who';
      who.textContent = (r.w === 'Waiting\u2026' ? '\u2014' : r.w) + ' vs ' +
        (r.b === 'Waiting\u2026' ? '\u2014' : r.b) +
        (r.watchers ? ' \u00b7 ' + r.watchers + ' watching' : '');

      var joinable = r.open && !r.result;
      var btn = document.createElement('button');
      btn.className = 'mini';
      btn.type = 'button';
      btn.textContent = joinable ? 'Join' : 'Watch';
      btn.addEventListener('click', function () {
        if (joinable) netJoin(r.code);
        else netWatch(r.code);
      });

      row.appendChild(main);
      row.appendChild(who);
      row.appendChild(btn);
      list.appendChild(row);
    });
  }

  function loadLobby() {
    netConnect(function () { netSend({ t: 'lobby' }); }, true);
  }

  function netWatch(code) {
    netConnect(function () { netSend({ t: 'watch', code: code }); }, true);
  }

  function netQuick() {
    netCfg.name = ($('netName').value || '').trim();
    netConnect(function () {
      netSend({ t: 'quick', name: netCfg.name, base: netCfg.base, inc: netCfg.inc });
    });
  }

  /* ---------------- panels ---------------- */

  function switchTab(name) {
    document.querySelectorAll('.tab-btn').forEach(function (b) {
      b.classList.toggle('active', b.dataset.tab === name);
    });
    document.querySelectorAll('.tabpanel').forEach(function (p) {
      p.hidden = p.dataset.panel !== name;
    });
    if (name === 'online') loadLobby();
  }

  function bindSeg(container, attr, onPick) {
    container.addEventListener('click', function (ev) {
      var btn = ev.target.closest('button[data-' + attr + ']');
      if (!btn) return;
      container.querySelectorAll('button').forEach(function (b) { b.classList.remove('on'); });
      btn.classList.add('on');
      onPick(btn.getAttribute('data-' + attr), btn);
    });
  }

  function syncNewPanel() {
    $('levelField').style.display = pending.mode === 'human' ? 'none' : '';
    $('colorField').style.display = pending.mode === 'human' ? 'none' : '';
    $('tcBase').value = Math.round((pending.base || 0) / 60);
    $('tcInc').value = pending.inc || 0;
  }

  function applyCustomClock() {
    var mins = Math.max(0, Math.min(180, Math.round(Number($('tcBase').value) || 0)));
    var inc = Math.max(0, Math.min(60, Math.round(Number($('tcInc').value) || 0)));
    pending.base = mins * 60;
    pending.inc = inc;
    document.querySelectorAll('#tcSeg .tc-card').forEach(function (c) { c.classList.remove('on'); });
  }

  $('tcBase').addEventListener('change', applyCustomClock);
  $('tcInc').addEventListener('change', applyCustomClock);
  $('tcBase').addEventListener('input', applyCustomClock);
  $('tcInc').addEventListener('input', applyCustomClock);

  bindSeg($('modeSeg'), 'mode', function (v) { pending.mode = v; syncNewPanel(); });
  bindSeg($('levelSeg'), 'level', function (v) { pending.level = Number(v); });
  bindSeg($('colorSeg'), 'color', function (v) { pending.color = v; });
  bindSeg($('variantSeg'), 'variant', function (v) { pending.variant = v; });
  bindSeg($('tcSeg'), 'base', function (v, btn) {
    pending.base = Number(v);
    pending.inc = Number(btn.getAttribute('data-inc') || 0);
  });

  $('startBtn').addEventListener('click', function () {
    var fen = ($('fenStart').value || '').trim();
    if (fen) {
      var probe = readFen(fen);
      if (!probe) { toast('That FEN is not valid.'); return; }
      newGame({
        mode: pending.mode,
        level: pending.level,
        color: probe.turn,
        base: pending.base,
        inc: pending.inc,
        variant: pending.variant,
        fen: probe.fen()
      });
      return;
    }
    newGame(pending);
  });

  document.querySelectorAll('[data-tab]').forEach(function (btn) {
    btn.addEventListener('click', function () { switchTab(btn.dataset.tab); });
  });

  document.querySelectorAll('.nav-btn[data-screen]').forEach(function (btn) {
    btn.addEventListener('click', function () { setScreen(btn.dataset.screen); });
  });

  $('pzHint').addEventListener('click', puzzleHint);
  $('pzRushBtn').addEventListener('click', function () {
    if (S.rush) endRush();
    else startRush();
  });
  $('fenLoad').addEventListener('click', loadFenIntoAnalysis);
  $('pgnLoad').addEventListener('click', loadPgnIntoAnalysis);
  $('clearGames').addEventListener('click', function () {
    games = [];
    saveJSON('gambit.games', games);
    renderStats();
    toast('History cleared.');
  });

  $('cnShow').addEventListener('click', coachShowBest);
  $('cnUndo').addEventListener('click', function () {
    if (S.positions.length < 2) return;
    undo();
    toast('Move taken back \u2014 try again.');
  });
  $('cnLearn').addEventListener('click', function () {
    var fb = currentNote();
    if (fb && fb.topic) goLesson(fb.topic);
  });

  ['drillGrid', 'endgameGrid'].forEach(function (id) {
    var grid = $(id);
    if (!grid) return;
    grid.addEventListener('click', function (ev) {
      var tile = ev.target.closest('[data-drill]');
      if (tile) startDrill(tile.dataset.drill);
    });
  });

  $('dcHint').addEventListener('click', function () {
    if (!S.drill) return;
    S.drill.hints++;
    coachHint();
    renderDrill();
  });

  $('dcRetry').addEventListener('click', function () {
    if (S.drill) startDrill(S.drill.def.id);
  });

  $('dcNext').addEventListener('click', function () {
    if (S.drill) startDrill(nextDrillId(S.drill.def.id));
  });

  $('dcBack').addEventListener('click', function () { setScreen('learn'); });

  $('cnAsk').addEventListener('click', function () {
    var ply = S.cursor;
    var cur = S.positions[ply];
    var prev = S.positions[ply - 1];
    if (!cur || !prev) return;
    coachFeedback(ply, prev.fen, cur.fen, cur.move, cur.mover, {
      then: function (note) {
        if (note) coachTalk(note.tip);
      }
    });
  });
  $('coachHintBtn').addEventListener('click', coachHint);
  $('coachSayForm').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var input = $('coachSayInput');
    var text = input.value.trim();
    if (!text) return;
    input.value = '';
    coachTalk(text, 'you');
    coachReply(text);
  });
  $('pzRetry').addEventListener('click', function () {
    if (!S.puzzle) return;
    S.puzzle.blocked = false;
    resetPuzzlePosition();
  });
  $('pzNext').addEventListener('click', function () { startPuzzle(P.index + 1); });
  $('engPlay').addEventListener('click', playBest);
  $('engReset').addEventListener('click', resetAnalysis);

  movesEl.addEventListener('click', function (ev) {
    var btn = ev.target.closest('.san[data-ply]');
    if (!btn) return;
    if (S.replay) stopReplay(true);
    var ply = Number(btn.dataset.ply);
    S.cursor = ply;
    S.selected = -1;
    renderBoard();
    renderMoves();
    renderStatus();
    if (isLive()) maybeAI();
  });

  document.querySelectorAll('[data-nav]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var nav = btn.dataset.nav;
      if (nav === 'start') {
        if (S.replay) stopReplay(true);
        S.cursor = 0;
        renderBoard();
        renderMoves();
        renderStatus();
      }
      else if (nav === 'prev') navigate(-1);
      else if (nav === 'next') navigate(1);
      else goLive();
    });
  });

  /* ---------------- settings panel ---------------- */

  function applySettings() {
    document.body.dataset.theme = settings.theme;
    document.body.dataset.pieces = settings.pieceStyle || 'classic';
    document.body.dataset.accent = settings.accent || 'green';
    document.body.dataset.glass = settings.glass || 'frosted';
    document.querySelectorAll('.accent-dot').forEach(function (b) {
      b.classList.toggle('on', b.dataset.accent === (settings.accent || 'green'));
    });
    var gs = $('glassSeg');
    if (gs) {
      gs.querySelectorAll('button').forEach(function (b) {
        b.classList.toggle('on', b.dataset.glass === (settings.glass || 'frosted'));
      });
    }
    document.querySelectorAll('#pieceSeg button').forEach(function (b) {
      b.classList.toggle('on', b.dataset.pieces === (settings.pieceStyle || 'classic'));
    });
    renderRecord();
    $('optCoords').checked = settings.coords;
    $('optHints').checked = settings.hints;
    $('optAnim').checked = settings.anim;
    $('optSound').checked = settings.sound;
    $('optAutoFlip').checked = settings.autoFlip;
    $('optBlind').checked = !!settings.blindfold;
    $('optAutoQueen').checked = !!settings.autoQueen;
    paintSoundBtn();
    document.querySelectorAll('.theme-btn').forEach(function (b) {
      b.classList.toggle('active', b.dataset.theme === settings.theme);
    });
  }

  function bindToggle(id, key, after) {
    $(id).addEventListener('change', function (ev) {
      settings[key] = ev.target.checked;
      saveSettings();
      if (after) after();
    });
  }

  bindToggle('optCoords', 'coords', function () { renderBoard(); });
  bindToggle('optHints', 'hints', function () { renderBoard(); });
  bindToggle('optAnim', 'anim');
  bindToggle('optSound', 'sound', function () {
    paintSoundBtn();
  });
  bindToggle('optAutoFlip', 'autoFlip');
  bindToggle('optBlind', 'blindfold', function () { renderBoard(); });
  bindToggle('optAutoQueen', 'autoQueen');

  function toggleBlindfold() {
    settings.blindfold = !settings.blindfold;
    saveSettings();
    applySettings();
    renderBoard();
    toast(settings.blindfold ? 'Blindfold on \u2014 pieces hidden.' : 'Blindfold off.');
  }

  $('themeGrid').addEventListener('click', function (ev) {
    var btn = ev.target.closest('.theme-btn');
    if (!btn) return;
    settings.theme = btn.dataset.theme;
    saveSettings();
    applySettings();
  });

  bindSeg($('pieceSeg'), 'pieces', function (v) {
    settings.pieceStyle = v;
    saveSettings();
    applySettings();
  });

  $('accentGrid').addEventListener('click', function (ev) {
    var btn = ev.target.closest('.accent-dot');
    if (!btn) return;
    settings.accent = btn.dataset.accent;
    saveSettings();
    applySettings();
  });

  bindSeg($('glassSeg'), 'glass', function (v) {
    settings.glass = v;
    saveSettings();
    applySettings();
  });

  $('resetSettings').addEventListener('click', function () {
    settings = Object.assign({}, DEFAULTS);
    saveSettings();
    applySettings();
    renderBoard();
    toast('Settings reset.');
  });

  /* ---------------- actions ---------------- */

  $('newBtn').addEventListener('click', function () { switchTab('new'); });
  $('flipBtn').addEventListener('click', flip);
  $('undoBtn').addEventListener('click', undo);
  $('drawBtn').addEventListener('click', offerDraw);

  var resignTimer = null;
  $('resignBtn').classList.add('danger');

  function setResignLabel(text) {
    var btn = $('resignBtn');
    var label = btn.querySelector('.tb-label');
    if (label) label.textContent = text;
    else btn.textContent = text;
  }

  $('resignBtn').addEventListener('click', function () {
    var btn = $('resignBtn');
    if (S.result) { toast('The game is already over.'); return; }
    if (!btn.classList.contains('confirming')) {
      btn.classList.add('confirming');
      setResignLabel('Sure?');
      clearTimeout(resignTimer);
      resignTimer = setTimeout(function () {
        btn.classList.remove('confirming');
        setResignLabel('Resign');
      }, 2600);
      return;
    }
    clearTimeout(resignTimer);
    btn.classList.remove('confirming');
    setResignLabel('Resign');
    if (S.mode === 'online') {
      if (!S.net || !S.net.seat) { toast('Join a game first.'); return; }
      netSend({ t: 'resign' });
      return;
    }
    var loser = (S.mode === 'ai' || S.mode === 'coach') ? S.playerColor : S.game.turn;
    finishGame(loser === 'w' ? 'b' : 'w', 'resignation');
  });

  $('rematchBtn').addEventListener('click', function () {
    if (S.mode === 'online') {
      netSend({ t: 'rematch' });
      toast('Rematch requested.');
      return;
    }
    newGame({ mode: S.mode, level: S.level, color: S.playerColor, base: S.base, inc: S.inc });
  });
  $('replayBtn').addEventListener('click', function () {
    if (!S.replay) { startReplay(); return; }
    if (S.replay.playing) replayPause(); else replayResume();
  });
  $('watchBtn').addEventListener('click', function () { hideResult(); startReplay(); });

  var graphEl = $('rvGraph');
  if (graphEl) {
    graphEl.addEventListener('click', function (ev) {
      var hit = ev.target.closest ? ev.target.closest('.g-hit') : null;
      if (!hit || S.screen !== 'review' || !S.review) return;
      var ply = Number(hit.getAttribute('data-ply'));
      if (!ply || !S.review.positions[ply]) return;
      S.cursor = ply;
      S.selected = -1;
      renderBoard();
      renderMoves();
      renderStatus();
      paintReview();
    });
  }
  $('reviewBtn').addEventListener('click', function () { hideResult(); setScreen('review'); });
  $('csReview').addEventListener('click', function () { hideResult(); setScreen('review'); });
  $('newGameBtn').addEventListener('click', function () { hideResult(); switchTab('new'); });

  $('netCreate').addEventListener('click', netCreate);
  $('netJoin').addEventListener('click', function () { netJoin(); });
  $('netCode').addEventListener('keydown', function (ev) {
    if (ev.key === 'Enter') { ev.preventDefault(); netJoin(); }
  });
  $('netQuick').addEventListener('click', netQuick);
  $('netRefresh').addEventListener('click', loadLobby);

  setInterval(function () {
    var panel = document.querySelector('.tabpanel[data-panel="online"]');
    if (!panel || panel.hidden) return;
    loadLobby();
  }, 4000);
  bindSeg($('netTcSeg'), 'base', function (v, btn) {
    netCfg.base = Number(v);
    netCfg.inc = Number(btn.getAttribute('data-inc') || 0);
  });
  bindSeg($('netColorSeg'), 'color', function (v) { netCfg.color = v; });

  $('rmCopy').addEventListener('click', function () {
    if (!S.net || !S.net.code) return;
    copyText(location.origin + location.pathname + '?room=' + S.net.code, 'Invite link');
  });

  $('rmLeave').addEventListener('click', function () {
    netLeave();
    toast('Left the online game.');
    newGame(pending, { silent: true });
  });

  $('rmAccept').addEventListener('click', function () { netSend({ t: 'draw', accept: true }); });
  $('rmDecline').addEventListener('click', function () {
    netSend({ t: 'draw', decline: true });
    if (S.net) S.net.drawOffered = false;
    renderRoom();
  });

  $('rmForm').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var input = $('rmInput');
    var text = input.value.trim();
    if (!text) return;
    if (netSend({ t: 'chat', text: text })) input.value = '';
  });

  function paintSoundBtn() {
    var btn = $('soundBtn');
    if (!btn) return;
    btn.classList.toggle('muted', !settings.sound);
    btn.setAttribute('aria-pressed', settings.sound ? 'true' : 'false');
  }

  $('soundBtn').addEventListener('click', function () {
    settings.sound = !settings.sound;
    saveSettings();
    applySettings();
    if (settings.sound) playEvent('move');
  });

  /* ---------------- PGN / FEN ---------------- */

  function copyText(text, label) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        toast(label + ' copied.');
      }, function () {
        toast('Copy failed.');
      });
    } else {
      toast('Clipboard unavailable.');
    }
  }

  function buildPgn() {
    var d = new Date();
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    var date = d.getFullYear() + '.' + pad(d.getMonth() + 1) + '.' + pad(d.getDate());
    var opponent = S.mode === 'coach' ? 'Coach' : 'Computer';
    var white = (S.mode === 'ai' || S.mode === 'coach') && S.playerColor === 'b' ? opponent : 'White';
    var black = (S.mode === 'ai' || S.mode === 'coach') && S.playerColor === 'w' ? opponent : 'Black';
    var result = S.result ? Results.pgn(S.result.code) : '*';

    var head = '[Event "Casual game"]\n[Site "Gambit"]\n[Date "' + date + '"]\n[Round "-"]\n' +
      '[White "' + white + '"]\n[Black "' + black + '"]\n[Result "' + result + '"]\n\n';

    var body = '';
    var hist = S.positions.slice(1);
    for (var i = 0; i < hist.length; i++) {
      if (i % 2 === 0) body += (i / 2 + 1) + '. ';
      body += hist[i].san + ' ';
    }
    body += result;
    return head + body;
  }

  $('pgnBtn').addEventListener('click', function () { copyText(buildPgn(), 'PGN'); });
  $('fenBtn').addEventListener('click', function () { copyText(S.positions[S.cursor].fen, 'FEN'); });
  $('linkBtn').addEventListener('click', shareLink);
  $('focusBtn').addEventListener('click', toggleFocus);

  $('rvAnalyse').addEventListener('click', analyseFromHere);
  $('rvPractise').addEventListener('click', practiseMove);

  $('rvReport').addEventListener('click', function () {
    if (!S.review) { toast('Step through a game first.'); return; }
    var stamp = new Date().toISOString().slice(0, 10);
    downloadText(reviewReport(), 'gambit-report-' + stamp + '.md', 'Report');
  });

  $('pzFilter').addEventListener('click', function (ev) {
    var btn = ev.target.closest('[data-pz]');
    if (!btn) return;
    var kind = btn.dataset.pz;
    if (kind === 'random') {
      var pool = puzzlePool();
      startPuzzle(pool[Math.floor(Math.random() * pool.length)], { exact: true });
      return;
    }
    pzFilter = kind;
    $('pzFilter').querySelectorAll('.pz-chip').forEach(function (b) {
      b.classList.toggle('on', b === btn);
    });
    var first = puzzlePool()[0];
    if (first != null) startPuzzle(first, { exact: true });
  });

  $('openingGrid').addEventListener('click', function (ev) {
    var tile = ev.target.closest('[data-opening]');
    if (tile) startTrainer(tile.dataset.opening);
  });
  $('trClose').addEventListener('click', closeTrainer);
  $('trHint').addEventListener('click', trainerHint);
  $('trShow').addEventListener('click', trainerShow);
  $('trOptions').addEventListener('click', function (ev) {
    var btn = ev.target.closest('[data-san]');
    if (btn) trainerAnswer(btn.dataset.san, btn);
  });

  $('openEditor').addEventListener('click', function () { openEditor(); });
  $('edCancel').addEventListener('click', closeEditor);
  $('edStart').addEventListener('click', function () {
    if (!ed) return;
    ed.board = new E.Chess().board.slice();
    ed.turn = 'w';
    ed.castle = { K: true, Q: true, k: true, q: true };
    paintEditor();
  });
  $('edEmpty').addEventListener('click', function () {
    if (!ed) return;
    ed.board = new Array(64).fill('');
    ed.castle = { K: false, Q: false, k: false, q: false };
    paintEditor();
  });
  $('edCopy').addEventListener('click', function () {
    if (ed) copyText(edFen(), 'FEN');
  });
  $('edPlay').addEventListener('click', playEditorPosition);
  $('edPalette').addEventListener('click', function (ev) {
    var btn = ev.target.closest('[data-piece]');
    if (!btn || !ed) return;
    ed.pick = btn.dataset.piece;
    paintPalette();
  });
  bindSeg($('edTurn'), 'turn', function (v) {
    if (!ed) return;
    ed.turn = v;
    $('edFen').textContent = edFen();
  });
  ['edCastleK', 'edCastleQ', 'edCastlek', 'edCastleq'].forEach(function (id) {
    $(id).addEventListener('change', function () {
      if (!ed) return;
      ed.castle.K = $('edCastleK').checked;
      ed.castle.Q = $('edCastleQ').checked;
      ed.castle.k = $('edCastlek').checked;
      ed.castle.q = $('edCastleq').checked;
      $('edFen').textContent = edFen();
    });
  });
  $('editorLayer').addEventListener('click', function (ev) {
    if (ev.target === $('editorLayer')) closeEditor();
  });

  $('gameSearch').addEventListener('input', function (ev) {
    statsQuery = ev.target.value || '';
    renderStats();
  });
  bindSeg($('gameFilter'), 'filter', function (v) {
    statsFilter = v;
    renderStats();
  });

  $('pgnDownload').addEventListener('click', downloadPgn);
  $('pgnFileBtn').addEventListener('click', function () { $('pgnFile').click(); });
  $('pgnFile').addEventListener('change', function (ev) {
    var file = ev.target.files && ev.target.files[0];
    ev.target.value = '';
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      $('pgnInput').value = String(reader.result || '');
      loadPgnIntoAnalysis();
    };
    reader.readAsText(file);
  });
  $('playFromHere').addEventListener('click', playFromHere);
  $('pzDaily').addEventListener('click', startDaily);
  $('ladderBtn').addEventListener('click', startLadder);

  boardEl.addEventListener('contextmenu', function (ev) { ev.preventDefault(); });
  boardEl.addEventListener('pointerdown', function (ev) {
    var right = ev.button === 2 || (ev.button === 0 && ev.shiftKey);
    if (!right) return;
    arrowDrag = { from: arrowSqFromEvent(ev) };
    ev.preventDefault();
  });

  window.addEventListener('pointerup', function (ev) {
    if (!arrowDrag) return;
    var from = arrowDrag.from;
    arrowDrag = null;
    var to = arrowSqFromEvent(ev);
    if (from < 0) return;
    if (to < 0) return;
    if (from === to) { S.arrows = []; renderArrows(); return; }
    S.arrows = (S.arrows || []).filter(function (a) { return !(a.from === from && a.to === to); });
    S.arrows.push({ from: from, to: to });
    renderArrows();
  });

  $('fenText').addEventListener('click', function () {
    copyText(S.positions[S.cursor].fen, 'FEN');
  });

  /* ---------------- keyboard ---------------- */

  document.addEventListener('keydown', function (ev) {
    var tag = (ev.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    if (ev.key === 'ArrowLeft') { navigate(-1); ev.preventDefault(); }
    else if (ev.key === 'ArrowRight') { navigate(1); ev.preventDefault(); }
    else if (ev.key === 'Home') { S.cursor = 0; S.selected = -1; renderBoard(); renderMoves(); renderStatus(); ev.preventDefault(); }
    else if (ev.key === 'End') { goLive(); ev.preventDefault(); }
    else if (/^[1-6]$/.test(ev.key)) {
      setScreen(['play', 'puzzles', 'review', 'analysis', 'learn', 'stats'][Number(ev.key) - 1]);
    }
    else if (ev.key === 't' || ev.key === 'T') { cycleTheme(); }
    else if (ev.key === 'e' || ev.key === 'E') { openEditor(); }
    else if (ev.key === 'f' || ev.key === 'F') { flip(); }
    else if (ev.key === 'b' || ev.key === 'B') { toggleBlindfold(); }
    else if (ev.key === 'z' || ev.key === 'Z') { toggleFocus(); }
    else if (ev.key === 'u' || ev.key === 'U') { undo(); }
    else if (ev.key === 'w' || ev.key === 'W') {
      if (!S.replay) startReplay();
      else if (S.replay.playing) replayPause();
      else replayResume();
    }
    else if (ev.key === 'n' || ev.key === 'N') { setScreen('play'); switchTab('new'); }
    else if (ev.key === 'p' || ev.key === 'P') { copyText(buildPgn(), 'PGN'); }
    else if (ev.key === 'l' || ev.key === 'L') { shareLink(); }
    else if (ev.key === 's' || ev.key === 'S') {
      settings.sound = !settings.sound;
      saveSettings();
      applySettings();
      toast(settings.sound ? 'Sound on.' : 'Sound off.');
    }
    else if (ev.key === '?') {
      toast('Keys: 1-6 screens \u00b7 arrows step \u00b7 F flip \u00b7 U undo \u00b7 W replay \u00b7 N new \u00b7 E editor \u00b7 P PGN \u00b7 L link \u00b7 B blindfold \u00b7 Z focus \u00b7 T theme \u00b7 S sound');
    }
    else if (ev.key === 'Escape') {
      if ($('editorLayer') && !$('editorLayer').hidden) { closeEditor(); return; }
      if (!$('promoLayer').hidden) { $('promoLayer').hidden = true; S.selected = -1; renderBoard(); }
      else if (S.arrows.length) { S.arrows = []; renderArrows(); S.selected = -1; renderBoard(); }
      else { S.selected = -1; renderBoard(); }
    }
  });

  $('promoLayer').addEventListener('click', function (ev) {
    if (ev.target === $('promoLayer')) {
      $('promoLayer').hidden = true;
      S.selected = -1;
      renderBoard();
    }
  });

  /* ---------------- daily quests ---------------- */

  function renderQuestCard() {
    var box = $('questCard');
    if (!box) return;
    var day = dayNumber();
    questState = Quests.roll(questState, day);
    var list = Quests.status(day, questState.counts);
    var done = list.filter(function (q) { return q.done; }).length;

    var rows = list.map(function (q) {
      var pct = Math.round((q.progress / q.target) * 100);
      return '<div class="qc-row' + (q.done ? ' done' : '') + '">' +
        '<div class="qc-top"><b>' + (q.done ? '\u2713 ' : '') + q.text + '</b>' +
        '<span>' + q.progress + '/' + q.target + '</span></div>' +
        '<div class="qc-bar"><i style="width:' + pct + '%"></i></div></div>';
    }).join('');

    box.innerHTML = '<div class="qc-head"><span>Daily quests</span>' +
      '<span class="qc-streak">' + (questState.streak ? questState.streak + '-day streak \u00b7 ' : '') +
      done + ' of ' + list.length + ' done</span></div>' +
      '<div class="qc-rows">' + rows + '</div>' +
      '<p class="qc-foot">' + (done === list.length
        ? 'All done \u2014 three fresh quests tomorrow.'
        : 'Counted from your games, puzzles and drills. New quests each day.') + '</p>';
  }

  function questAdd(metric, n) {
    var day = dayNumber();
    var res = Quests.apply(questState, day, metric, n);
    questState = res.state;
    saveJSON('gambit.quests', questState);

    if (res.fresh.length) {
      var names = Quests.status(day, questState.counts).filter(function (q) {
        return res.fresh.indexOf(q.id) >= 0;
      }).map(function (q) { return q.text.toLowerCase(); });
      notify('Quest complete', names.join(', ') + (res.allDone ? ' \u2014 all three done!' : ''), 'quest', 'reminders');
      checkAchievements();
    }
    renderQuestCard();
    return res;
  }

  /* ---------------- stats: record against each bot level ---------------- */

  var LEVEL_NAMES = { 1: 'Beginner', 2: 'Easy', 3: 'Club', 4: 'Strong', 5: 'Master' };

  function renderLevelReport() {
    var box = $('levelReport');
    if (!box) return;
    var rows = {};
    games.forEach(function (g) {
      if (!g.level || g.you == null) return;
      var row = rows[g.level] || (rows[g.level] = { level: g.level, w: 0, l: 0, d: 0 });
      var r = myResult(g);
      if (r === 'w') row.w++;
      else if (r === 'l') row.l++;
      else if (r === 'd') row.d++;
    });

    var keys = Object.keys(rows).sort();
    if (!keys.length) {
      box.innerHTML = '<div class="rl-empty">Play a computer game and your record at each level lands here.</div>';
      return;
    }

    box.innerHTML = keys.map(function (k) {
      var r = rows[k];
      var n = r.w + r.l + r.d;
      var pct = Math.round(((r.w + r.d / 2) / n) * 100);
      return '<div class="or-row"><span class="or-name">Level ' + r.level + ' \u00b7 ' +
        (LEVEL_NAMES[r.level] || 'Bot') + '</span>' +
        '<span class="or-games">' + n + ' game' + (n === 1 ? '' : 's') + '</span>' +
        '<span class="or-score">' + r.w + 'W \u00b7 ' + r.l + 'L \u00b7 ' + r.d + 'D</span>' +
        '<b>' + pct + '%</b></div>';
    }).join('');
  }

  /* ---------------- opening trainer ---------------- */

  function miniBoardHtml(fen) {
    var game;
    try { game = new E.Chess(fen); } catch (err) { return ''; }
    var html = '<div class="mini-board">';
    for (var i = 0; i < 64; i++) {
      var dark = ((i >> 3) + (i & 7)) % 2 === 1;
      var p = game.board[i];
      html += '<div class="mb-sq ' + (dark ? 'dark' : 'light') + '">' + (p ? Art.svg(p) : '') + '</div>';
    }
    return html + '</div>';
  }

  function renderOpeningGrid() {
    var grid = $('openingGrid');
    if (!grid) return;
    grid.innerHTML = '';
    Trainer.LINES.forEach(function (line) {
      var done = !!openingDone[line.id];
      var tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'opening-tile' + (done ? ' done' : '');
      tile.dataset.opening = line.id;

      var name = document.createElement('span');
      name.className = 'ot-name';
      name.textContent = line.name;

      var meta = document.createElement('span');
      meta.className = 'ot-meta';
      meta.textContent = line.eco + ' \u00b7 ' + line.moves.length + ' plies';

      var foot = document.createElement('span');
      foot.className = 'ot-foot';
      foot.textContent = done ? '\u2713 Mastered \u00b7 train again' : 'Train \u2192';

      tile.appendChild(name);
      tile.appendChild(meta);
      tile.appendChild(foot);
      grid.appendChild(tile);
    });
  }

  function trainerScore() {
    if (!trainer) return '';
    return 'Solved ' + trainer.at + ' of ' + trainer.line.moves.length +
      (trainer.wrong ? ' \u00b7 ' + trainer.wrong + ' missed' : '') +
      (trainer.hints ? ' \u00b7 ' + trainer.hints + ' hint' + (trainer.hints === 1 ? '' : 's') : '');
  }

  function startTrainer(id) {
    var line = Trainer.byId(id);
    if (!line) return;
    trainer = { line: line, at: 0, wrong: 0, hints: 0, done: false };
    $('trFeed').textContent = '';
    paintTrainer();
    var card = $('trainerCard');
    if (card.scrollIntoView) card.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function closeTrainer() {
    trainer = null;
    $('trainerCard').hidden = true;
  }

  function paintTrainer() {
    var card = $('trainerCard');
    if (!card) return;
    if (!trainer) { card.hidden = true; return; }
    card.hidden = false;

    var line = trainer.line;
    var rebuilt = sansToPositions(line.moves.slice(0, trainer.at));
    $('trName').textContent = line.name + ' \u00b7 ' + line.eco;
    $('trCount').textContent = trainer.done
      ? 'Line complete'
      : 'Move ' + (trainer.at + 1) + ' of ' + line.moves.length;
    $('trBoard').innerHTML = miniBoardHtml(rebuilt.game.fen());

    var opts = $('trOptions');
    opts.innerHTML = '';
    if (trainer.done) {
      $('trPrompt').textContent = 'Line complete.';
    } else {
      var turn = rebuilt.game.turn === 'w' ? 'White' : 'Black';
      $('trPrompt').textContent = turn + ' to move \u2014 what is the book move?';
      var legal = rebuilt.game.legalMoves();
      var sans = legal.map(function (m) { return rebuilt.game.san(m, legal); });
      Trainer.options(sans, line.moves[trainer.at], Trainer.seedOf(line.id + ':' + trainer.at))
        .forEach(function (san) {
          var b = document.createElement('button');
          b.type = 'button';
          b.className = 'tr-opt';
          b.dataset.san = san;
          b.textContent = san;
          opts.appendChild(b);
        });
    }

    $('trScore').textContent = trainerScore();
    $('trHint').hidden = !!trainer.done;
    $('trShow').hidden = !!trainer.done;
  }

  function trainerAnswer(san, btn) {
    if (!trainer || trainer.done) return;
    var line = trainer.line;

    if (san !== line.moves[trainer.at]) {
      trainer.wrong++;
      if (btn) btn.classList.add('bad');
      playEvent('illegal');
      $('trFeed').textContent = san + ' is legal, but not the book move. ' +
        (trainer.wrong >= 2 ? 'Use Hint to see it.' : 'Try another.');
      $('trScore').textContent = trainerScore();
      return;
    }

    trainer.at++;
    if (trainer.at >= line.moves.length) trainer.done = true;

    if (trainer.done) {
      openingDone[line.id] = { at: Date.now(), wrong: trainer.wrong, hints: trainer.hints };
      saveJSON('gambit.openings', openingDone);
      renderOpeningGrid();
      checkAchievements();
      toast('Opening mastered: ' + line.name + '.');
      $('trFeed').textContent = line.idea;
    } else {
      playEvent('move');
      $('trFeed').textContent = 'Correct \u2014 ' + san + '.';
    }
    paintTrainer();
    if (trainer.done) $('trFeed').textContent = line.idea;
  }

  function trainerHint() {
    if (!trainer || trainer.done) return;
    trainer.hints++;
    var answer = trainer.line.moves[trainer.at];
    $('trFeed').textContent = 'The book move here is ' + answer + '.';
    var btn = $('trOptions').querySelector('[data-san="' + answer + '"]');
    if (btn) btn.classList.add('hint');
    $('trScore').textContent = trainerScore();
  }

  function trainerShow() {
    if (!trainer || trainer.done) return;
    trainer.hints++;
    var line = trainer.line;
    var btn = $('trOptions').querySelector('[data-san="' + line.moves[trainer.at] + '"]');
    if (btn) btn.classList.add('hint');
    $('trFeed').textContent = 'Line: ' + line.moves.join(' ') + '. ' + line.idea;
    $('trScore').textContent = trainerScore();
  }

  /* ---------------- board editor ---------------- */

  var ED_PIECES = ['K', 'Q', 'R', 'B', 'N', 'P', 'k', 'q', 'r', 'b', 'n', 'p'];

  function openEditor(fen) {
    var src = fen || (S.positions[S.cursor] && S.positions[S.cursor].fen) || E.START_FEN;
    var game;
    try { game = new E.Chess(src); } catch (err) { game = new E.Chess(); }
    ed = {
      board: game.board.slice(),
      turn: game.turn,
      pick: 'P',
      castle: {
        K: !!game.castling.K, Q: !!game.castling.Q,
        k: !!game.castling.k, q: !!game.castling.q
      }
    };
    $('editorLayer').hidden = false;
    paintEditor();
  }

  function closeEditor() {
    $('editorLayer').hidden = true;
    ed = null;
  }

  function edFen() {
    if (!ed) return '';
    var rows = [];
    for (var r = 0; r < 8; r++) {
      var empty = 0, text = '';
      for (var f = 0; f < 8; f++) {
        var p = ed.board[r * 8 + f];
        if (!p) { empty++; continue; }
        if (empty) { text += empty; empty = 0; }
        text += p;
      }
      if (empty) text += empty;
      rows.push(text);
    }
    var cast = (ed.castle.K ? 'K' : '') + (ed.castle.Q ? 'Q' : '') +
      (ed.castle.k ? 'k' : '') + (ed.castle.q ? 'q' : '');
    return rows.join('/') + ' ' + ed.turn + ' ' + (cast || '-') + ' - 0 1';
  }

  function paintPalette() {
    var box = $('edPalette');
    if (!box || !ed) return;
    box.innerHTML = '';
    ED_PIECES.forEach(function (p) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'ed-piece' + (ed.pick === p ? ' on' : '');
      b.dataset.piece = p;
      b.title = p;
      b.innerHTML = Art.svg(p);
      box.appendChild(b);
    });
    var erase = document.createElement('button');
    erase.type = 'button';
    erase.className = 'ed-piece eraser' + (ed.pick === '' ? ' on' : '');
    erase.dataset.piece = '';
    erase.title = 'Clear a square';
    erase.textContent = '\u232b';
    box.appendChild(erase);
  }

  function paintEditor() {
    if (!ed) return;
    var box = $('edBoard');
    if (!box) return;
    paintPalette();
    box.innerHTML = '';

    for (var i = 0; i < 64; i++) {
      var sq = document.createElement('button');
      sq.type = 'button';
      sq.className = 'ed-sq ' + (((i >> 3) + (i & 7)) % 2 ? 'dark' : 'light');
      sq.dataset.i = i;
      var p = ed.board[i];
      sq.innerHTML = p ? Art.svg(p) : '';
      (function (index, cell) {
        cell.addEventListener('click', function () {
          if (!ed) return;
          ed.board[index] = ed.pick;
          paintEditor();
        });
        cell.addEventListener('contextmenu', function (ev) {
          ev.preventDefault();
          if (!ed) return;
          ed.board[index] = '';
          paintEditor();
        });
      })(i, sq);
      box.appendChild(sq);
    }

    $('edFen').textContent = edFen();
    $('edCastleK').checked = !!ed.castle.K;
    $('edCastleQ').checked = !!ed.castle.Q;
    $('edCastlek').checked = !!ed.castle.k;
    $('edCastleq').checked = !!ed.castle.q;
    var seg = $('edTurn');
    if (seg) {
      seg.querySelectorAll('button').forEach(function (b) {
        b.classList.toggle('on', b.dataset.turn === ed.turn);
      });
    }
  }

  function playEditorPosition() {
    if (!ed) return;
    var probe = readFen(edFen());
    if (!probe) { toast('Each side needs a king \u2014 finish the position first.'); return; }
    var cfg = {
      mode: pending.mode,
      level: pending.level,
      color: probe.turn,
      base: pending.base,
      inc: pending.inc,
      variant: pending.variant,
      fen: probe.fen()
    };
    closeEditor();
    newGame(cfg);
    toast('Custom position loaded.');
  }

  function cycleTheme() {
    var at = THEMES.indexOf(settings.theme);
    settings.theme = THEMES[(at + 1) % THEMES.length];
    saveSettings();
    applySettings();
    toast('Theme: ' + settings.theme + '.');
  }

  /* ---------------- Elo placement test ---------------- */

  var placementRun = null;
  var placementPrompt = false;

  function plPanel(name) {
    ['plIntro', 'plQuiz', 'plResult'].forEach(function (id) {
      var el = $(id);
      if (el) el.hidden = id !== name;
    });
  }

  function openPlacement() {
    var layer = $('placementLayer');
    if (!layer) return;
    placementRun = null;
    layer.classList.remove('quiz');
    plPanel('plIntro');
    layer.hidden = false;
    if ($('plStart')) $('plStart').focus();
  }

  function closePlacement() {
    clearPlacementTimers();
    var layer = $('placementLayer');
    if (layer) {
      layer.classList.remove('quiz');
      layer.hidden = true;
    }
    placementRun = null;
  }

  /* ---------- the test board: the player makes the move ---------- */

  function placementBoardHtml(game) {
    var html = '';
    for (var i = 0; i < 64; i++) {
      var dark = ((i >> 3) + (i & 7)) % 2 === 1;
      var piece = game.board[i];
      var file = i & 7;
      var rank = 8 - (i >> 3);
      html += '<div class="sq ' + (dark ? 'dark' : 'light') + '" data-sq="' + i + '">';
      if (piece) html += Art.svg(piece);
      if (rank === 1) html += '<span class="coord file">' + FILES[file] + '</span>';
      if (file === 0) html += '<span class="coord rank">' + rank + '</span>';
      html += '</div>';
    }
    return html;
  }

  function paintPlacementBoard() {
    var run = placementRun;
    if (!run) return;
    var board = $('plBoard');
    board.innerHTML = placementBoardHtml(run.game);

    if (run.sel < 0) return;
    var sel = board.querySelector('.sq[data-sq="' + run.sel + '"]');
    if (sel) sel.classList.add('sel');

    run.legal.forEach(function (move) {
      if (move.from !== run.sel) return;
      var target = board.querySelector('.sq[data-sq="' + move.to + '"]');
      if (target) target.classList.add(move.captured || move.ep ? 'hint-cap' : 'hint');
    });
  }

  function markPlacementSquares(squares, cls) {
    var board = $('plBoard');
    squares.forEach(function (index) {
      if (typeof index !== 'number') return;
      var el = board.querySelector('.sq[data-sq="' + index + '"]');
      if (el) el.classList.add(cls);
    });
  }

  /* every other move that also answers the question */
  function markPlacementAlternatives(run, exceptUci) {
    var board = $('plBoard');
    run.answers.forEach(function (a) {
      if (!a.move || a.uci === exceptUci) return;
      [a.move.from, a.move.to].forEach(function (index) {
        var el = board.querySelector('.sq[data-sq="' + index + '"]');
        if (el) el.classList.add('alt');
      });
    });
  }

  function placementOtherAnswers(run, exceptUci) {
    return run.answers
      .filter(function (a) { return a.uci !== exceptUci; })
      .map(function (a) { return a.san; });
  }

  /* The mate search is the expensive part of a question, and a retake can serve
     the same position again, so each item's answer list is worked out once. */
  var placementAnswerCache = {};

  function placementAnswersFor(q) {
    var cache = placementAnswerCache[q.id];
    if (cache) return cache;

    var game = new E.Chess(q.fen);
    var legal = game.legalMoves();
    var all = Placement.correctMoves(game, q);
    var out = [];

    for (var i = 0; i < all.length; i++) {
      out.push({
        move: all[i],
        san: game.san(all[i], legal),
        uci: Placement.uciOf(all[i])
      });
    }

    if (!out.length) {
      var fallback = E.fromUci(q.answer, legal);
      if (fallback) out.push({ move: fallback, san: q.answer, uci: q.answer });
    }

    placementAnswerCache[q.id] = out;
    return out;
  }

  var placementTimers = [];

  function clearPlacementTimers() {
    placementTimers.forEach(function (id) { clearTimeout(id); });
    placementTimers = [];
  }

  function placementLater(fn, ms) {
    placementTimers.push(setTimeout(fn, ms));
  }

  function placementFeedback(cls, text) {
    var feedback = $('plFeedback');
    if (!feedback) return;
    feedback.className = 'pl-feedback' + (cls ? ' ' + cls : '');
    feedback.textContent = text || '';
  }

  function placementOpponent(cls, line) {
    var box = $('plOpponent');
    if (box) box.className = 'pq-opponent' + (cls ? ' ' + cls : '');
    if ($('plOppLine')) $('plOppLine').textContent = line;
  }

  function playPlacementSound(move, game) {
    if (!move) return;
    if (move.captured || move.ep) playEvent('capture');
    else if (move.castle) playEvent('castle');
    else playEvent('move');
    if (game.inCheck() && !game.isCheckmate()) playEvent('check');
  }

  function slidePlacementPiece(to, from) {
    if (!settings.anim || typeof from !== 'number' || typeof to !== 'number') return;
    var el = $('plBoard').querySelector('.sq[data-sq="' + to + '"] .piece');
    if (!el) return;
    el.style.setProperty('--dx', ((from & 7) - (to & 7)) * 100 + '%');
    el.style.setProperty('--dy', ((from >> 3) - (to >> 3)) * 100 + '%');
    el.classList.add('slide');
  }

  function burstPlacementSquare(sq) {
    if (typeof sq !== 'number') return;
    var el = $('plBoard').querySelector('.sq[data-sq="' + sq + '"]');
    if (el) el.classList.add('burst');
  }

  function startPlacement() {
    clearPlacementTimers();
    placementRun = {
      run: Placement.createRun(),
      item: null,
      game: null,
      legal: [],
      answered: false,
      sel: -1
    };
    $('placementLayer').classList.add('quiz');
    plPanel('plQuiz');
    renderPlacementQuestion();
    playEvent('start');
  }

  function renderPlacementQuestion() {
    var run = placementRun;
    if (!run) return;
    clearPlacementTimers();

    var q = Placement.pickFor(run.run);
    if (!q) { finishPlacement(); return; }

    run.item = q;
    run.game = new E.Chess(q.fen);
    run.legal = run.game.legalMoves();
    run.sel = -1;
    run.answered = false;

    var done = run.run.results.length;
    $('plProgress').textContent = 'Position ' + (done + 1) + ' of ' + Placement.TOTAL;
    $('plBar').style.width = Math.round((done / Placement.TOTAL) * 100) + '%';
    $('plPrompt').textContent = q.prompt;
    $('plTurn').textContent = (run.game.turn === 'w' ? 'White' : 'Black') +
      ' to move \u00b7 click a piece, then the square you want to play';
    placementFeedback('', '');
    placementOpponent('', 'watching your move');
    $('plNext').hidden = true;
    $('plGiveUp').hidden = false;

    paintPlacementBoard();

    /* All the moves that answer this question, kept for the feedback. Worked out
       after the board has painted, so a hard position never delays the question
       appearing. */
    run.answers = [];
    placementLater(function () {
      if (placementRun !== run) return;
      run.answers = placementAnswersFor(q);
    }, 0);
  }

  function placementMoveCounts(q, move, judge) {
    if (q.kind === 'mate') return Placement.moveForcesMate(judge, move, q.mateIn || 1);
    if (q.kind === 'castle') return !!move.castle;
    return E.moveToUci(move) === q.answer;
  }

  function playPlacementMove(move) {
    var run = placementRun;
    if (!run || !run.item) return;
    var q = run.item;
    var playedSan = run.game.san(move, run.legal);
    /* judge on an untouched copy: the verdict walks the tree */
    var judge = new E.Chess(q.fen);
    var ok = placementMoveCounts(q, move, judge);

    run.game.make(move);
    playPlacementSound(move, run.game);
    settlePlacement(ok, playedSan, move);
  }

  function revealPlacementNext() {
    var run = placementRun;
    if (!run) return;
    $('plGiveUp').hidden = true;
    var next = $('plNext');
    next.hidden = false;
    next.textContent = run.run.results.length >= Placement.TOTAL ? 'See my rating' : 'Next position';
    next.focus();
  }

  function settlePlacement(ok, playedSan, move) {
    var run = placementRun;
    if (!run || !run.item || run.answered) return;
    var q = run.item;
    var demoDelay = settings.anim === false ? 120 : 560;

    if (!run.answers || !run.answers.length) run.answers = placementAnswersFor(q);

    run.answered = true;
    run.sel = -1;
    Placement.record(run.run, q, ok);

    /* show the move that was just played, then either praise it or take it back */
    paintPlacementBoard();
    if (move) {
      slidePlacementPiece(move.to, move.from);
      if (move.captured || move.ep) burstPlacementSquare(move.to);
      markPlacementSquares([move.from, move.to], 'last');
    }
    $('plBar').style.width = Math.round((run.run.results.length / Placement.TOTAL) * 100) + '%';

    if (ok) {
      playEvent(q.kind === 'mate' ? 'end' : 'correct');
      var also = placementOtherAnswers(run, move ? Placement.uciOf(move) : '');
      placementFeedback('right', 'Correct. ' + q.why +
        (also.length ? ' Also winning: ' + also.join(', ') + '.' : ''));
      markPlacementAlternatives(run, move ? Placement.uciOf(move) : '');
      placementOpponent('played', 'that is the move');
      revealPlacementNext();
      return;
    }

    /* why the move that was played fails, in this position */
    var failing = '';
    var refute = null;
    if (move && q.kind === 'mate') {
      refute = Placement.refutation(run.game, q);
      if (refute) {
        failing = ' Black answers ' + run.game.san(refute, run.game.legalMoves()) + ' and there is no mate.';
      } else {
        failing = ' It never forces mate.';
      }
    } else if (move && q.kind === 'castle') {
      failing = ' The king stays stuck in the middle.';
    } else if (move && q.effect === 'capture-queen') {
      failing = ' The queen is still on the board.';
    } else if (move && q.effect === 'fork') {
      failing = ' That knight move attacks nothing.';
    }

    var winning = placementOtherAnswers(run, '');
    var winningList = winning.length > 1 ? ' ' + winning.length + ' moves win here: ' + winning.join(', ') + '.' : '';
    var lead = (playedSan ? 'Not quite \u2014 ' + playedSan + ' does not work.' : 'No move played.') + failing;

    playEvent('wrong');
    placementOpponent('thinking', 'thinking\u2026');
    placementFeedback('wrong', lead + ' Gambit will show you the move.');
    $('plGiveUp').hidden = true;

    placementLater(function () {
      if (placementRun !== run) return;
      run.game = new E.Chess(q.fen);
      run.legal = run.game.legalMoves();
      paintPlacementBoard();
      placementFeedback('wrong', lead + ' Watch this:');

      placementLater(function () {
        if (placementRun !== run) return;
        var answer = E.fromUci(q.answer, run.legal);
        if (!answer) { revealPlacementNext(); return; }

        var san = run.game.san(answer, run.legal);
        run.game.make(answer);
        paintPlacementBoard();
        slidePlacementPiece(answer.to, answer.from);
        if (answer.captured || answer.ep) burstPlacementSquare(answer.to);
        markPlacementSquares([answer.from, answer.to], 'answer');
        playPlacementSound(answer, run.game);
        if (run.game.isCheckmate()) playEvent('end');

        markPlacementAlternatives(run, Placement.uciOf(answer));
        placementOpponent('played', 'plays ' + san);
        placementFeedback('wrong', lead + ' ' + q.why + winningList);
        revealPlacementNext();

        /* then the miss and Black's answer to it, played out on the board */
        if (refute) {
          showPlacementRefutation(run, q, move, refute, lead + ' ' + q.why + winningList);
        }
      }, demoDelay);
    }, demoDelay);
  }

  /* The last beat of a miss: play your move again, then Black's reply, so the
   * reason is something you watch instead of something you read. The next
   * position is already offered, so this never holds anyone up. */
  function showPlacementRefutation(run, q, move, refute, base) {
    var gap = settings.anim === false ? 160 : 620;

    placementLater(function () {
      if (placementRun !== run) return;

      run.game = new E.Chess(q.fen);
      run.legal = run.game.legalMoves();
      paintPlacementBoard();

      var again = E.fromUci(Placement.uciOf(move), run.legal);
      var againSan = again ? run.game.san(again, run.legal) : '';

      if (again) {
        run.game.make(again);
        paintPlacementBoard();
        slidePlacementPiece(again.to, again.from);
        markPlacementSquares([again.from, again.to], 'last');
        playEvent('move');
      }

      placementOpponent('thinking', 'answer your ' + againSan);
      placementFeedback('wrong', base + ' Your ' + againSan + ' again, then Black replies:');

      placementLater(function () {
        if (placementRun !== run) return;

        var replies = run.game.legalMoves();
        var reply = E.fromUci(Placement.uciOf(refute), replies);
        if (!reply) { revealPlacementNext(); return; }

        var replySan = run.game.san(reply, replies);
        run.game.make(reply);
        paintPlacementBoard();
        slidePlacementPiece(reply.to, reply.from);
        if (reply.captured || reply.ep) burstPlacementSquare(reply.to);
        markPlacementSquares([again.from, again.to], 'last');
        markPlacementSquares([reply.from, reply.to], 'refute');
        playPlacementSound(reply, run.game);

        placementOpponent('played', 'answers ' + replySan);
        placementFeedback('wrong', base);
        revealPlacementNext();
      }, gap);
    }, gap + 120);
  }

  function onPlacementSquare(index) {
    var run = placementRun;
    if (!run || run.answered) return;

    var piece = run.game.board[index];
    var mine = !!piece && E.colorOf(piece) === run.game.turn;

    if (run.sel < 0 || mine) {
      if (!mine) return;
      run.sel = run.sel === index ? -1 : index;
      paintPlacementBoard();
      return;
    }

    var chosen = null;
    for (var i = 0; i < run.legal.length; i++) {
      var move = run.legal[i];
      if (move.from !== run.sel || move.to !== index) continue;
      /* the test always promotes to a queen */
      if (!chosen || move.promo === 'Q') chosen = move;
    }

    if (!chosen) {
      run.sel = -1;
      paintPlacementBoard();
      return;
    }

    playPlacementMove(chosen);
  }

  function advancePlacement() {
    var run = placementRun;
    if (!run) return;
    clearPlacementTimers();
    if (run.run.results.length >= Placement.TOTAL) { finishPlacement(); return; }
    renderPlacementQuestion();
  }

  function finishPlacement() {
    var run = placementRun;
    if (!run) return;
    clearPlacementTimers();
    var results = run.run.results;
    var elo = Placement.estimate(results);
    var total = results.length || Placement.TOTAL;
    run.elo = elo;
    run.correct = Placement.correctCount(results);

    $('plScore').textContent = run.correct + ' of ' + total + ' correct';
    $('plElo').textContent = String(elo);
    $('plBand').textContent = Ratings.band(elo) + ' \u00b7 starting Elo';
    $('plNote').textContent = elo >= 1400
      ? 'A strong paper. Accept it and this is where your rating begins.'
      : elo >= 900
        ? 'A solid base. You start here, then every game moves you from it.'
        : 'Everyone starts somewhere. Take the rating, or start at 0 and climb.';
    $('placementLayer').classList.remove('quiz');
    plPanel('plResult');
    playEvent('end');
    $('plUse').focus();
  }

  function applyPlacement(value) {
    var taken = typeof value === 'number' && value > 0;
    var elo = taken ? value : 0;

    ratingState.r = elo;
    ratingState.best = elo;
    ratingState.placed = true;
    ratingState.placement = { taken: taken, elo: elo, at: Date.now() };
    saveJSON('gambit.rating', ratingState);

    closePlacement();
    renderPlayers();
    renderStats();
    renderPlacementState();
    toast(taken
      ? 'Starting Elo set to ' + elo + ' \u00b7 ' + Ratings.band(elo) + '.'
      : 'Starting at 0 Elo. Win games to climb.');
  }

  function renderPlacementState() {
    var el = $('placementState');
    if (!el) return;
    var p = ratingState.placement;
    el.textContent = !p
      ? 'No Elo test yet \u2014 take it and start from your result, or skip and start at 0.'
      : p.taken
        ? 'Test result: ' + p.elo + ' Elo \u00b7 ' + Ratings.band(p.elo) + '. Retake it any time.'
        : 'Skipped \u2014 starting at 0 Elo.';
    var btn = $('placementBtn');
    if (btn) btn.textContent = p && p.taken ? 'Retake the test' : 'Take the Elo test';
  }

  if ($('placementLayer')) {
    $('plStart').addEventListener('click', startPlacement);
    $('plSkip').addEventListener('click', function () { applyPlacement(0); });
    $('plClose').addEventListener('click', function () { applyPlacement(0); });
    $('plNext').addEventListener('click', advancePlacement);
    $('plRetake').addEventListener('click', startPlacement);
    $('plGiveUp').addEventListener('click', function () { settlePlacement(false, '', null); });
    $('plBoard').addEventListener('click', function (ev) {
      var sq = ev.target.closest('.sq');
      if (!sq) return;
      onPlacementSquare(Number(sq.dataset.sq));
    });
    $('plUse').addEventListener('click', function () {
      applyPlacement(placementRun ? placementRun.elo : 0);
    });
    $('plUseZero').addEventListener('click', function () { applyPlacement(0); });
    $('placementBtn').addEventListener('click', openPlacement);
    $('placementLayer').addEventListener('click', function (ev) {
      if (ev.target === $('placementLayer')) applyPlacement(0);
    });

    /* Keep the game shortcuts (screen switching, undo, resign) from firing
       under the test dialog. Capture phase beats the app's own handler. */
    document.addEventListener('keydown', function (ev) {
      if ($('placementLayer').hidden) return;
      if (ev.key === 'Escape') {
        ev.preventDefault();
        applyPlacement(0);
        return;
      }
      /* letters, digits and the arrow keys are game shortcuts; Tab, Enter and
         Space have to keep working inside the dialog */
      if (ev.key.length === 1 || ev.key.indexOf('Arrow') === 0) ev.stopImmediatePropagation();
    }, true);
  }

  /* ---------------- accounts, alerts and error handling ---------------- */

  var NOTIFY_KEY = 'gambit.notify';
  var NOTIFY_SEEN_KEY = 'gambit.notifySeen';
  var ERROR_IDS = [
    'siEmailErr', 'siPasswordErr', 'siErr', 'upNameErr', 'upEmailErr', 'upPasswordErr',
    'upConfirmErr', 'upErr', 'rsEmailErr', 'rsCodeErr', 'rsPasswordErr', 'rsErr', 'rsFormErr',
    'vfErr', 'vfFormErr', 'pfNameErr', 'pfCurrentErr', 'pfNewErr', 'pfPassErr', 'delErr'
  ];

  var session = null;
  var inboxMail = null;
  var verifyEmail = '';
  var resetEmail = '';
  var resendTimer = null;
  var mailDelivery = { status: 'idle', to: '', error: '' };

  var accounts = AccountStore.create({
    storage: window.localStorage,
    onMail: function (mail) {
      inboxMail = mail;
      renderInbox();
    }
  });

  var errorLog = ErrorLog.create({ storage: window.localStorage });
  errorLog.subscribe(function (entry) { if (entry) showErrorBanner(entry); });
  errorLog.install(window);

  function escText(text) {
    return String(text == null ? '' : text)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function clockText(stamp) {
    var d = new Date(stamp);
    var h = d.getHours();
    var m = d.getMinutes();
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }

  function agoText(stamp) {
    var mins = Math.round((Date.now() - stamp) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return mins + 'm ago';
    var hours = Math.round(mins / 60);
    if (hours < 24) return hours + 'h ago';
    return Math.round(hours / 24) + 'd ago';
  }

  /* ---------- notification centre ---------- */

  function notifyEntries() {
    var list = loadJSON(NOTIFY_KEY, []);
    return Array.isArray(list) ? list : [];
  }

  function notify(title, body, kind, channel) {
    var list = notifyEntries();
    list.unshift({
      id: 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      at: Date.now(),
      title: title,
      body: body || '',
      kind: kind || 'info'
    });
    saveJSON(NOTIFY_KEY, list.slice(0, 24));
    renderNotify();

    var show = !!settings.notify;
    if (channel === 'achievements' && !settings.notifyAchievements) show = false;
    if (channel === 'reminders' && !settings.notifyReminders) show = false;
    if (show) toast(title, body, kind);
  }

  function unreadCount() {
    var seen = 0;
    try { seen = Number(localStorage.getItem(NOTIFY_SEEN_KEY) || 0) || 0; } catch (err) { seen = 0; }
    return notifyEntries().filter(function (e) { return (e.at || 0) > seen; }).length;
  }

  function kindLabel(kind) {
    if (kind === 'achievement') return 'Achievement';
    if (kind === 'quest') return 'Quest';
    if (kind === 'reminder') return 'Reminder';
    if (kind === 'account') return 'Account';
    return 'Note';
  }

  function agoText(at) {
    var s = Math.max(0, Math.round((Date.now() - Number(at || 0)) / 1000));
    if (s < 45) return 'just now';
    if (s < 3600) return Math.max(1, Math.round(s / 60)) + ' min ago';
    if (s < 86400) return Math.round(s / 3600) + ' h ago';
    return Math.round(s / 86400) + ' d ago';
  }

  function renderNotify() {
    var list = notifyEntries();
    var dot = $('notifyDot');
    if (dot) dot.hidden = unreadCount() === 0;
    var box = $('npList');
    if (!box) return;
    if (!list.length) {
      box.innerHTML = '<p class="np-empty">Nothing yet. Sign-in codes, quests and achievements land here.</p>';
      return;
    }
    box.innerHTML = list.map(function (e) {
      var kind = e.kind || 'info';
      var at = e.at || Date.now();
      return '<div class="np-row ' + escText(kind) + '">' +
        '<div class="np-row-head"><b>' + escText(e.title) + '</b><span>' + clockText(at) + '</span></div>' +
        (e.body ? '<p>' + escText(e.body) + '</p>' : '') +
        '<div class="np-row-meta"><span class="np-tag">' + escText(kindLabel(kind)) + '</span>' +
        '<span>' + escText(agoText(at)) + '</span></div></div>';
    }).join('');
  }

  function hideNotifyPanel() {
    var panel = $('notifyPanel');
    if (panel) panel.hidden = true;
  }

  function toggleNotifyPanel() {
    var panel = $('notifyPanel');
    if (!panel) return;
    if (!panel.hidden) { panel.hidden = true; return; }
    panel.hidden = false;
    try { localStorage.setItem(NOTIFY_SEEN_KEY, String(Date.now())); } catch (err) { /* ignore */ }
    renderNotify();
  }

  function syncNotifyUI() {
    var master = $('notifyToggle');
    if (master) master.checked = !!settings.notify;
    var pf = $('pfNotify');
    if (pf) pf.checked = !!settings.notify;
    var rem = $('pfReminders');
    if (rem) rem.checked = !!settings.notifyReminders;
    var ach = $('pfAchievements');
    if (ach) ach.checked = !!settings.notifyAchievements;
    var label = master && master.closest('.switch-label');
    if (label) label.classList.toggle('off', !settings.notify);
  }

  function setNotifyPref(key, value) {
    settings[key] = !!value;
    saveSettings();
    if (session) {
      accounts.setPrefs({
        notify: settings.notify,
        reminders: settings.notifyReminders,
        achievements: settings.notifyAchievements
      });
    }
    syncNotifyUI();
  }

  /* ---------- form helpers ---------- */

  function clearErrors() {
    ERROR_IDS.forEach(function (id) {
      var el = $(id);
      if (!el) return;
      el.textContent = '';
      el.hidden = true;
    });
  }

  function fieldError(id, message) {
    var el = $(id);
    if (!el) return;
    el.textContent = message;
    el.hidden = false;
  }

  function busy(btn, on, label) {
    if (!btn) return;
    if (on) {
      btn.dataset.label = btn.textContent;
      btn.textContent = label || 'Working\u2026';
      btn.disabled = true;
    } else {
      if (btn.dataset.label) btn.textContent = btn.dataset.label;
      btn.disabled = false;
    }
  }

  /* ---------- account views ---------- */

  function accView(name) {
    var guest = $('accGuest');
    var verify = $('accVerify');
    var user = $('accUser');
    if (guest) guest.hidden = name !== 'guest';
    if (verify) verify.hidden = name !== 'verify';
    if (user) user.hidden = name !== 'user';
  }

  function setAccTab(tab) {
    var tabs = $('accTabs');
    if (!tabs) return;
    tabs.querySelectorAll('button').forEach(function (b) {
      b.classList.toggle('on', b.dataset.tab === tab);
    });
    $('signInForm').hidden = tab !== 'in';
    $('signUpForm').hidden = tab !== 'up';
    $('resetForm').hidden = tab !== 'reset';
    $('accTitle').textContent = tab === 'up' ? 'Create your account' :
      tab === 'reset' ? 'Reset your password' : 'Sign in to Gambit';
    clearErrors();
  }

  function openAccount(tab) {
    hideNotifyPanel();
    clearErrors();
    $('accountLayer').hidden = false;
    if (session) {
      accView('user');
      renderAccountUser();
    } else if (verifyEmail) {
      accView('verify');
      renderVerify();
      startResendClock();
    } else {
      accView('guest');
      setAccTab(tab === 'up' || tab === 'reset' ? tab : 'in');
    }
    renderErrorList();
  }

  function closeAccount() {
    $('accountLayer').hidden = true;
    stopResendClock();
  }

  function applyAccountState() {
    var a = accounts.current();
    session = a;
    var label = $('accLabel');
    var avatar = $('accAvatar');
    if (label) label.textContent = a ? String(a.name).split(/\s+/)[0] : 'Sign in';
    if (avatar) avatar.textContent = a ? AccountStore.initials(a.name) : '?';
    var btn = $('accountBtn');
    if (btn) {
      btn.classList.toggle('signed-in', !!a);
      btn.title = a ? a.name + ' \u00b7 ' + a.email : 'Sign in or create an account';
    }
    if (a && a.prefs) {
      settings.notify = !!a.prefs.notify;
      settings.notifyReminders = !!a.prefs.reminders;
      settings.notifyAchievements = !!a.prefs.achievements;
      saveSettings();
    }
    syncNotifyUI();
  }

  function renderAccountUser() {
    var a = session || accounts.current();
    if (!a) { accView('guest'); setAccTab('in'); return; }
    session = a;
    $('pfAvatar').textContent = AccountStore.initials(a.name);
    $('pfName').textContent = a.name;
    $('pfEmail').textContent = a.email;
    $('pfVerified').hidden = !a.verified;
    $('pfUnverified').hidden = !!a.verified;
    if (!a.verified) {
      $('pfUnverifiedText').textContent = 'Verify ' + AccountStore.redact(a.email) + ' to finish setting up your account.';
    }
    $('pfNameInput').value = a.name;
    syncNotifyUI();
    renderErrorList();
  }

  function afterSignIn(account) {
    verifyEmail = '';
    resetEmail = '';
    mailDelivery = { status: 'idle', to: '', error: '' };
    stopResendClock();
    session = account || null;
    applyAccountState();
    clearErrors();
    $('siPassword').value = '';
    $('upName').value = '';
    $('upEmail').value = '';
    $('upPassword').value = '';
    $('upConfirm').value = '';
    $('vfInput').value = '';
    accView('user');
    renderAccountUser();
    notify('Signed in', 'Welcome back, ' + (account ? account.name : '') + '.', 'account', 'account');
    if (placementPrompt) {
      placementPrompt = false;
      setTimeout(openPlacement, 650);
    }
  }

  function renderInbox() {
    var head = $('vfInboxHead');
    var pill = $('vfInboxPill');
    var code = $('vfCode');
    var mail = $('vfMail');
    var fill = $('vfFill');
    var note = $('vfDelivery');
    var sent = mailDelivery.status === 'sent';
    var sending = mailDelivery.status === 'sending';

    if (head) head.textContent = sent ? 'Email sent' : sending ? 'Sending\u2026' : 'Local inbox';
    if (pill) {
      pill.textContent = sent ? 'via email' : sending ? 'waiting' : (mailDelivery.error ? 'email not sent' : 'no mail server');
      pill.classList.toggle('ok', sent);
    }
    if (code) code.textContent = sent ? '\u2022\u2022\u2022\u2022\u2022\u2022' : (inboxMail ? inboxMail.code : '\u2014');
    if (fill) fill.hidden = sent || !inboxMail;
    if (mail) {
      mail.textContent = sent
        ? 'Sent to ' + (mailDelivery.to || (inboxMail && inboxMail.to) || verifyEmail) + ' \u00b7 check spam too'
        : inboxMail ? 'To ' + inboxMail.to + ' \u00b7 ' + inboxMail.subject : 'No code yet \u2014 ask for one below.';
    }
    if (note) {
      if (sent) note.textContent = 'The code is in your email and works even if you close this page.';
      else if (sending) note.textContent = 'Sending the code to ' + (mailDelivery.to || verifyEmail) + '\u2026';
      else if (inboxMail) note.textContent = (mailDelivery.error ? mailDelivery.error + ' ' : '') + 'The code above still verifies this account.';
      else note.textContent = '';
    }
    var card = document.querySelector('.inbox-card');
    if (card) card.classList.toggle('sent', sent);
  }

  /* Ask the local server to email the code. Falls back to the code card when
   * no mail service is configured or the request fails. */
  function postCode(mail, name, render) {
    var done = typeof render === 'function' ? render : function () {};
    if (!mail) return Promise.resolve(mailDelivery);

    if (typeof fetch !== 'function') {
      mailDelivery = { status: 'local', to: mail.to, error: 'This browser cannot reach the mail service.' };
      done(mailDelivery);
      return Promise.resolve(mailDelivery);
    }

    mailDelivery = { status: 'sending', to: mail.to, error: '' };
    done(mailDelivery);

    return fetch('/api/send-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: mail.to, code: mail.code, name: name || '', purpose: mail.purpose || 'verify' })
    }).then(function (res) {
      return res.json().then(function (out) {
        return { status: res.status, body: out };
      }, function () {
        return { status: res.status, body: null };
      });
    }).then(function (out) {
      var body = (out && out.body) || {};
      if (body.ok) {
        mailDelivery = { status: 'sent', to: mail.to, error: '' };
      } else {
        mailDelivery = {
          status: 'local',
          to: mail.to,
          error: body.error || (out && out.status === 503
            ? 'Email sending is not set up on this server.'
            : 'The code could not be emailed.')
        };
      }
      done(mailDelivery);
      return mailDelivery;
    }).catch(function (err) {
      errorLog.capture(err, 'send verification email');
      mailDelivery = { status: 'local', to: mail.to, error: 'Could not reach the mail service. The code below still works.' };
      done(mailDelivery);
      return mailDelivery;
    });
  }

  function renderVerify() {
    $('vfLead').textContent = verifyEmail
      ? 'We made a 6-digit code for ' + verifyEmail + '. It expires in 10 minutes.'
      : 'Enter the code from your email.';
    renderInbox();
  }

  function startVerify(email, mail) {
    verifyEmail = email || '';
    inboxMail = mail || inboxMail;
    mailDelivery = { status: 'idle', to: verifyEmail, error: '' };
    clearErrors();
    accView('verify');
    renderVerify();
    startResendClock();
    if (!mail) return;

    var who = (accounts.pending(email) || {}).name || '';
    postCode(mail, who, function (state) {
      renderVerify();
      if (state.status === 'sent') {
        notify('Code emailed', 'Check ' + mail.to + ' for the 6-digit code.', 'account', 'account');
      }
    });
  }

  function startResendClock() {
    stopResendClock();
    tickResend();
    resendTimer = setInterval(tickResend, 1000);
  }

  function stopResendClock() {
    if (resendTimer) {
      clearInterval(resendTimer);
      resendTimer = null;
    }
  }

  function tickResend() {
    var btn = $('vfResend');
    if (!btn) return;
    var wait = verifyEmail ? accounts.resendWait(verifyEmail) : 0;
    btn.disabled = wait > 0;
    btn.textContent = wait > 0 ? 'New code in ' + wait + 's' : 'Send a new code';
    if (!wait && resendTimer) {
      clearInterval(resendTimer);
      resendTimer = null;
    }
  }

  /* ---------- error banner and log ---------- */

  function showErrorBanner(entry) {
    var msg = $('ebMsg');
    if (!msg) return;
    var text = entry ? String(entry.message || 'Unknown error') : 'Unknown error';
    msg.textContent = text.length > 110 ? text.slice(0, 109) + '\u2026' : text;
    $('errorBanner').hidden = false;
    clearTimeout(showErrorBanner._t);
    showErrorBanner._t = setTimeout(hideErrorBanner, 9000);
  }

  function hideErrorBanner() {
    var banner = $('errorBanner');
    if (banner) banner.hidden = true;
  }

  function renderErrorList() {
    var box = $('errList');
    if (!box) return;
    var list = errorLog.entries();
    if (!list.length) {
      box.innerHTML = '<p class="np-empty">No problems recorded.</p>';
      return;
    }
    box.innerHTML = list.map(function (e) {
      return '<div class="err-row">' +
        '<div class="err-row-text"><b>' + escText(e.message) + '</b>' +
        (e.where ? '<code>' + escText(e.where) + '</code>' : '') + '</div>' +
        '<span class="err-row-meta">' + agoText(e.at || Date.now()) +
        (e.count > 1 ? ' \u00d7' + e.count : '') + '</span></div>';
    }).join('');
  }

  /* ---------- account bindings ---------- */

  $('notifyBtn').addEventListener('click', function (ev) {
    ev.stopPropagation();
    toggleNotifyPanel();
  });
  $('npClose').addEventListener('click', hideNotifyPanel);
  $('npClear').addEventListener('click', function () {
    saveJSON(NOTIFY_KEY, []);
    renderNotify();
    toast('Notifications cleared.');
  });
  document.addEventListener('click', function (ev) {
    var panel = $('notifyPanel');
    if (!panel || panel.hidden) return;
    if (panel.contains(ev.target) || $('notifyBtn').contains(ev.target)) return;
    panel.hidden = true;
  });

  $('notifyToggle').addEventListener('change', function (ev) {
    setNotifyPref('notify', ev.target.checked);
    toast(ev.target.checked
      ? 'Notifications on \u2014 alerts appear as they happen.'
      : 'Notifications off \u2014 the bell keeps a quiet history.');
  });
  $('pfNotify').addEventListener('change', function (ev) {
    setNotifyPref('notify', ev.target.checked);
    toast(ev.target.checked ? 'Notifications on.' : 'Notifications paused.');
  });
  $('pfReminders').addEventListener('change', function (ev) {
    setNotifyPref('notifyReminders', ev.target.checked);
  });
  $('pfAchievements').addEventListener('change', function (ev) {
    setNotifyPref('notifyAchievements', ev.target.checked);
  });

  $('accountBtn').addEventListener('click', function () { openAccount(); });
  $('accClose').addEventListener('click', closeAccount);
  $('accountLayer').addEventListener('click', function (ev) {
    if (ev.target === $('accountLayer')) closeAccount();
  });
  document.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Escape') return;
    if (!$('notifyPanel').hidden) { hideNotifyPanel(); return; }
    if (!$('accountLayer').hidden) closeAccount();
  });

  $('accTabs').addEventListener('click', function (ev) {
    var btn = ev.target.closest('button[data-tab]');
    if (btn) setAccTab(btn.dataset.tab);
  });

  $('siForgot').addEventListener('click', function () {
    var typed = $('siEmail').value;
    setAccTab('reset');
    if (typed) $('rsEmail').value = typed;
    $('rsEmail').focus();
  });

  $('signInForm').addEventListener('submit', function (ev) {
    ev.preventDefault();
    clearErrors();
    var email = $('siEmail').value;
    var password = $('siPassword').value;
    busy($('siSubmit'), true, 'Signing in\u2026');
    accounts.signIn({ email: email, password: password }).then(function (res) {
      busy($('siSubmit'), false);
      if (!res.ok) {
        if (res.field === 'email') fieldError('siEmailErr', res.error);
        else if (res.field === 'password') fieldError('siPasswordErr', res.error);
        else fieldError('siErr', res.error);
        if (res.needsVerify) startVerify(res.email || email, res.code);
        return;
      }
      afterSignIn(res.account);
    }).catch(function (err) {
      busy($('siSubmit'), false);
      errorLog.capture(err, 'sign in');
      fieldError('siErr', 'Sign in could not finish. Try again.');
    });
  });

  ['siEmail', 'upEmail', 'rsEmail'].forEach(function (id) {
    $(id).addEventListener('blur', function () {
      var el = $(id);
      if (!el.value.trim()) return;
      var problem = AccountStore.emailProblem(el.value);
      var target = id === 'siEmail' ? 'siEmailErr' : id === 'upEmail' ? 'upEmailErr' : 'rsEmailErr';
      if (problem) fieldError(target, problem);
    });
  });

  $('upPassword').addEventListener('input', function (ev) {
    var score = AccountStore.strength(ev.target.value);
    var meter = $('upMeter');
    if (meter) {
      meter.dataset.score = String(score.score);
      if (meter.firstElementChild) meter.firstElementChild.style.width = (score.score * 25) + '%';
    }
    var label = $('upMeterLabel');
    if (label) {
      label.textContent = ev.target.value
        ? 'Strength: ' + score.label + ' \u00b7 at least 8 characters with a letter and a number'
        : 'At least 8 characters with a letter and a number.';
    }
  });

  $('signUpForm').addEventListener('submit', function (ev) {
    ev.preventDefault();
    clearErrors();
    var data = { name: $('upName').value, email: $('upEmail').value, password: $('upPassword').value };
    if (data.password !== $('upConfirm').value) {
      fieldError('upConfirmErr', 'The two passwords do not match.');
      return;
    }
    busy($('upSubmit'), true, 'Creating\u2026');
    accounts.signUp(data).then(function (res) {
      busy($('upSubmit'), false);
      if (!res.ok) {
        if (res.field === 'name') fieldError('upNameErr', res.error);
        else if (res.field === 'email') fieldError('upEmailErr', res.error);
        else if (res.field === 'password') fieldError('upPasswordErr', res.error);
        else fieldError('upErr', res.error);
        return;
      }
      $('siEmail').value = res.email;
      placementPrompt = true;
      startVerify(res.email, res.code);
    }).catch(function (err) {
      busy($('upSubmit'), false);
      errorLog.capture(err, 'create account');
      fieldError('upErr', 'The account could not be created. Try again.');
    });
  });

  $('vfFill').addEventListener('click', function () {
    if (!inboxMail) return;
    $('vfInput').value = inboxMail.code;
    $('vfInput').focus();
  });

  $('verifyForm').addEventListener('submit', function (ev) {
    ev.preventDefault();
    clearErrors();
    var res = accounts.verify({ email: verifyEmail, code: $('vfInput').value });
    if (!res.ok) {
      if (res.field === 'code') fieldError('vfErr', res.error);
      else fieldError('vfFormErr', res.error);
      return;
    }
    afterSignIn(res.account);
    notify('Email verified', 'Your account is ready.', 'account', 'account');
  });

  $('vfResend').addEventListener('click', function () {
    var res = accounts.resend(verifyEmail);
    if (!res.ok) {
      fieldError('vfErr', res.error);
      if (res.wait) startResendClock();
      return;
    }
    startResendClock();
    renderVerify();
    if (!res.code) return;

    var who = (accounts.pending(verifyEmail) || {}).name || '';
    postCode(res.code, who, function (state) {
      renderVerify();
      notify(state.status === 'sent' ? 'New code emailed' : 'New code ready',
        state.status === 'sent' ? 'Check ' + verifyEmail + ' for the new code.' : 'Code ' + res.code.code + ' is in the local inbox.',
        'account', 'account');
    });
  });

  $('vfBack').addEventListener('click', function () {
    verifyEmail = '';
    inboxMail = null;
    stopResendClock();
    clearErrors();
    accView('guest');
    setAccTab('up');
  });

  function submitReset() {
    clearErrors();
    busy($('rsSubmit'), true, 'Saving\u2026');
    accounts.resetPassword({
      email: resetEmail,
      code: $('rsCode').value,
      password: $('rsPassword').value
    }).then(function (res) {
      busy($('rsSubmit'), false);
      if (!res.ok) {
        if (res.field === 'code') fieldError('rsCodeErr', res.error);
        else if (res.field === 'password') fieldError('rsPasswordErr', res.error);
        else fieldError('rsFormErr', res.error);
        return;
      }
      afterSignIn(res.account);
      notify('Password reset', 'You are signed in with the new password.', 'account', 'account');
    }).catch(function (err) {
      busy($('rsSubmit'), false);
      errorLog.capture(err, 'reset password');
      fieldError('rsFormErr', 'The reset could not finish. Try again.');
    });
  }

  $('resetForm').addEventListener('submit', function (ev) {
    ev.preventDefault();
    if (ev.submitter && ev.submitter.id === 'rsSubmit') { submitReset(); return; }
    clearErrors();
    busy($('rsSend'), true, 'Sending\u2026');
    var res = accounts.beginReset($('rsEmail').value);
    busy($('rsSend'), false);
    if (!res.ok) {
      fieldError('rsEmailErr', res.error);
      return;
    }
    resetEmail = res.email;
    inboxMail = res.code || null;
    mailDelivery = { status: 'idle', to: res.email, error: '' };
    $('rsStep1').hidden = true;
    $('rsStep2').hidden = false;
    $('rsSent').textContent = res.code
      ? 'Sending the code to ' + res.email + '\u2026'
      : 'If that address has an account, a code is on its way.';
    $('rsCode').focus();
    if (!res.code) return;

    postCode(res.code, '', function (state) {
      $('rsSent').textContent = state.status === 'sent'
        ? 'Code emailed to ' + res.email + '. It expires in 10 minutes.'
        : 'Code ' + res.code.code + ' is in the local inbox' +
          (state.error ? ' (' + state.error + ')' : '') + '. It expires in 10 minutes.';
    });
  });

  $('rsBack').addEventListener('click', function () {
    resetEmail = '';
    $('rsStep1').hidden = false;
    $('rsStep2').hidden = true;
    clearErrors();
  });

  $('nameForm').addEventListener('submit', function (ev) {
    ev.preventDefault();
    clearErrors();
    var res = accounts.updateName($('pfNameInput').value);
    if (!res.ok) { fieldError('pfNameErr', res.error); return; }
    applyAccountState();
    renderAccountUser();
    toast('Name saved.');
  });

  $('passForm').addEventListener('submit', function (ev) {
    ev.preventDefault();
    clearErrors();
    busy($('pfPassSave'), true, 'Saving\u2026');
    accounts.changePassword({ currentPassword: $('pfCurrent').value, password: $('pfNew').value })
      .then(function (res) {
        busy($('pfPassSave'), false);
        if (!res.ok) {
          if (res.field === 'currentPassword') fieldError('pfCurrentErr', res.error);
          else if (res.field === 'password') fieldError('pfNewErr', res.error);
          else fieldError('pfPassErr', res.error);
          return;
        }
        $('pfCurrent').value = '';
        $('pfNew').value = '';
        notify('Password changed', 'Your new password is in effect.', 'account', 'account');
      }).catch(function (err) {
        busy($('pfPassSave'), false);
        errorLog.capture(err, 'change password');
        fieldError('pfPassErr', 'The password could not be changed.');
      });
  });

  $('pfVerifyNow').addEventListener('click', function () {
    if (!session) return;
    var res = accounts.resend(session.email);
    if (!res.ok && res.wait) {
      startVerify(session.email);
      return;
    }
    startVerify(session.email, res.code || null);
  });

  $('accSignOut').addEventListener('click', function () {
    accounts.signOut();
    session = null;
    verifyEmail = '';
    inboxMail = null;
    applyAccountState();
    accView('guest');
    setAccTab('in');
    notify('Signed out', 'Your games stay saved on this device.', 'account', 'account');
  });

  $('accDelete').addEventListener('click', function () {
    $('deleteForm').hidden = !$('deleteForm').hidden;
    if (!$('deleteForm').hidden) $('delPassword').focus();
  });

  $('delCancel').addEventListener('click', function () {
    $('deleteForm').hidden = true;
    $('delPassword').value = '';
  });

  $('deleteForm').addEventListener('submit', function (ev) {
    ev.preventDefault();
    clearErrors();
    busy($('delConfirm'), true, 'Deleting\u2026');
    accounts.deleteAccount($('delPassword').value).then(function (res) {
      busy($('delConfirm'), false);
      if (!res.ok) { fieldError('delErr', res.error); return; }
      session = null;
      verifyEmail = '';
      inboxMail = null;
      $('deleteForm').hidden = true;
      $('delPassword').value = '';
      applyAccountState();
      accView('guest');
      setAccTab('in');
      notify('Account deleted', 'Nothing was sent anywhere; the record is gone from this device.', 'account', 'account');
    }).catch(function (err) {
      busy($('delConfirm'), false);
      errorLog.capture(err, 'delete account');
      fieldError('delErr', 'The account could not be deleted.');
    });
  });

  $('errClear').addEventListener('click', function () {
    errorLog.clear();
    renderErrorList();
    toast('Error log cleared.');
  });

  $('ebClose').addEventListener('click', hideErrorBanner);
  $('ebOpen').addEventListener('click', function () {
    hideErrorBanner();
    openAccount();
    var list = $('errList');
    if (list) setTimeout(function () { list.scrollIntoView({ block: 'center' }); }, 30);
  });

  function bootReminder() {
    if (!settings.notify || !settings.notifyReminders) return;
    var day = dayNumber();
    var today = dailyState && dailyState.day === day ? dailyState : null;
    if (today && today.done) return;
    var last = 0;
    try { last = Number(localStorage.getItem('gambit.reminderDay') || 0) || 0; } catch (err) { last = 0; }
    if (last === day) return;
    try { localStorage.setItem('gambit.reminderDay', String(day)); } catch (err) { /* ignore */ }
    notify('Daily puzzle ready', 'Today\u2019s position is waiting on the Puzzles screen.', 'reminder', 'reminders');
  }

  /* ---------------- boot ---------------- */

  applySettings();
  session = accounts.current();
  applyAccountState();
  renderNotify();
  renderErrorList();
  bootReminder();
  syncNewPanel();
  syncNav();
  markStaticHost();
  var shared = sharedFen();
  newGame(shared
    ? { mode: 'human', level: 3, color: 'w', base: 0, inc: 0, variant: 'standard', fen: shared }
    : pending, { silent: true });
  renderRecord();
  renderLadder();
  if (shared) toast('Shared position loaded.');
  else resumeGame();

  (function bootRoom() {
    var code = null;
    try { code = new URLSearchParams(location.search).get('room'); } catch (err) { code = null; }
    if (!code) return;
    $('netCode').value = code.toUpperCase();
    switchTab('online');
    setTimeout(function () { netJoin(code.toUpperCase()); }, 200);
  })();
})();
