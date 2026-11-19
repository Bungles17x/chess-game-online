/* Gambit — Elo placement test.
 *
 * A pool of 34 positions: 28 generated from the verified puzzle bank (see
 * tools/make-placement.js) and 6 hand-made ones for castling, forks and winning
 * material. Each run serves eight of them along a staircase: solve one and the
 * next is harder, miss one and the next is easier, so the test gets harder the
 * better you do and is different every time.
 *
 * What counts as correct depends on the item's kind:
 *   mate   — any move that forces mate within `mateIn` moves
 *   castle — any legal castling move
 *   best   — only the exact move (a free queen, a fork)
 *
 * Pure data + maths, so tools/check-placement.js can verify all of it.
 */
(function (global) {
  'use strict';

  var MIN = 0;      /* skipping the test entirely */
  var FLOOR = 350;  /* lowest result a completed test can produce */
  var MAX = 1800;

  var TOTAL = 8;              /* positions per run */
  var START_TARGET = 950;     /* difficulty of the first position */
  var STEP = 225;             /* how far the staircase moves per answer */
  var LOW = 650;
  var HIGH = 1850;

  var CURATED = [
    {
      id: 'curated-mate-backrank',
      kind: 'mate', mateIn: 1, rating: 700,
      fen: '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1',
      prompt: 'White to move. Mate in one.',
      answer: 'a1a8',
      why: 'Ra8# \u2014 the black king is walled in by its own pawns and the back rank is empty.'
    },
    {
      id: 'curated-free-queen',
      kind: 'best', effect: 'capture-queen', rating: 900,
      fen: '4k3/8/8/3q4/8/8/8/3RK3 w - - 0 1',
      prompt: 'White to move. Win material.',
      answer: 'd1d5',
      why: 'Rxd5 picks up a free queen down the open file. Checks and captures come first.'
    },
    {
      id: 'curated-promote-mate',
      kind: 'mate', mateIn: 1, rating: 1000,
      fen: '8/P7/8/8/8/8/8/k1K5 w - - 0 1',
      prompt: 'White to move. One move finishes the game.',
      answer: 'a7a8q',
      why: 'a8=Q is mate on the spot \u2014 the pawn becomes a queen and the a-file is deadly.'
    },
    {
      id: 'curated-castle',
      kind: 'castle', rating: 1100,
      fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
      prompt: 'White to move. What belongs in the opening?',
      answer: 'e1g1',
      why: 'O-O brings the king to safety and the rook into the game \u2014 the whole point of opening play.'
    },
    {
      id: 'curated-fork',
      kind: 'best', effect: 'fork', rating: 1250,
      fen: 'r3k3/8/8/3N4/8/8/8/4K3 w - - 0 1',
      prompt: 'White to move. Find the fork.',
      answer: 'd5c7',
      why: 'Nc7+ hits the king and the a8 rook at once \u2014 the king must move, then Nxa8 wins it.'
    },
    {
      id: 'curated-mate-ladder',
      kind: 'mate', mateIn: 1, rating: 1350,
      fen: '6k1/5ppp/8/8/8/8/R7/1R4K1 w - - 0 1',
      prompt: 'White to move. Mate in one, without hanging anything.',
      answer: 'b1b8',
      why: 'Rb8# \u2014 the rook on a2 covers the seventh rank, so the king cannot step out of the check.'
    }
  ];

  var ALL = null;

  /* Resolved on first use, so a wrong <script> order cannot silently drop the
     generated half of the pool. */
  function allItems() {
    if (!ALL) ALL = CURATED.concat(global.PLACEMENT_POOL || []);
    return ALL;
  }

  function clamp(value, low, high) {
    return Math.max(low, Math.min(high, value));
  }

  /* ---------- the one mate search ---------- */

  /* Play exactly this move and say whether it forces mate within `depth` of the
   * mover's own moves. depth 1 = it mates now, depth 2 = mate next move whatever
   * the reply. Every mate question goes through here, so the move is judged as
   * it is played: an underpromotion that does not mate is not a win. */
  function moveWins(game, move, depth) {
    if (!move) return false;

    game.make(move);
    var wins;

    if (game.isCheckmate()) {
      wins = true;
    } else if (depth > 1) {
      var replies = game.legalMoves();
      wins = replies.length > 0;
      for (var i = 0; wins && i < replies.length; i++) {
        game.make(replies[i]);
        if (!forcesMate(game, depth - 1)) wins = false;
        game.unmake();
      }
    } else {
      wins = false;
    }

    game.unmake();
    return wins;
  }

  /* True if the side to move can force mate within `depth` of their own moves. */
  function forcesMate(game, depth) {
    if (depth < 1) return game.isCheckmate();

    var moves = game.legalMoves();
    for (var i = 0; i < moves.length; i++) {
      if (moveWins(game, moves[i], depth)) return true;
    }
    return false;
  }

  /* What a tap on from->to means on this board: the queen promotion when the
   * same squares offer several. Input resolution only — the search above always
   * judges the exact move it is given. */
  function resolveMove(game, move) {
    if (!move) return null;

    var legal = game.legalMoves();
    var chosen = null;
    for (var i = 0; i < legal.length; i++) {
      if (legal[i].from === move.from && legal[i].to === move.to) {
        if (!chosen || legal[i].promo === 'Q') chosen = legal[i];
      }
    }
    return chosen;
  }

  /* Does the move a player tapped force mate? The facet the board answers to. */
  function moveForcesMate(game, move, depth) {
    var chosen = resolveMove(game, move);
    return chosen ? moveWins(game, chosen, depth) : false;
  }

  var FILES = 'abcdefgh';

  function squareName(index) {
    return FILES.charAt(index & 7) + (8 - (index >> 3));
  }

  function uciOf(move) {
    return squareName(move.from) + squareName(move.to) + (move.promo ? move.promo.toLowerCase() : '');
  }

  /* Every move in this position that answers the question. Some positions have
   * several mating moves, and all of them are right. */
  function correctMoves(game, item) {
    if (!game || !item) return [];

    var depth = item.mateIn || 1;
    var moves = game.legalMoves();
    var out = [];

    for (var i = 0; i < moves.length; i++) {
      var move = moves[i];
      var wins;

      if (item.kind === 'castle') {
        wins = !!move.castle;
      } else if (item.kind === 'best') {
        wins = uciOf(move) === item.answer;
      } else {
        wins = moveWins(game, move, depth);
      }

      if (wins) out.push(move);
    }
    return out;
  }

  /* For a move that missed a mate: the reply that proves it fails. Prefers a
   * king move, because "the king steps away" is the lesson. */
  function refutation(game, item) {
    if (!game || !item || item.kind !== 'mate') return null;

    var need = (item.mateIn || 1) - 1;   /* white moves still available */
    var replies = game.legalMoves();
    if (!replies.length) return null;

    var escape = null;
    var first = null;

    for (var i = 0; i < replies.length; i++) {
      var reply = replies[i];
      game.make(reply);
      var survives = need < 1 || !forcesMate(game, need);
      game.unmake();
      if (!survives) continue;

      if (!first) first = reply;
      if (String(game.board[reply.from]).toLowerCase() === 'k') { escape = reply; break; }
    }

    return escape || first;
  }

  /* ---------- the staircase ---------- */

  function createRun() {
    return { target: START_TARGET, used: [], results: [], hardest: 0 };
  }

  function pickFor(run, rng) {
    var random = rng || Math.random;
    var available = allItems().filter(function (q) { return run.used.indexOf(q.id) < 0; });
    if (!available.length) return null;

    available.sort(function (a, b) {
      return Math.abs(a.rating - run.target) - Math.abs(b.rating - run.target);
    });

    var shortlist = available.slice(0, Math.min(3, available.length));
    var pick = shortlist[Math.floor(random() * shortlist.length)] || shortlist[0];
    run.used.push(pick.id);
    return pick;
  }

  function record(run, item, correct) {
    run.results.push({ rating: item.rating, correct: !!correct });
    if (correct && item.rating > run.hardest) run.hardest = item.rating;
    run.target = clamp(run.target + (correct ? STEP : -STEP), LOW, HIGH);
    return run;
  }

  /* ---------- scoring ---------- */

  /* results: [{ rating, correct }].
   * The percentage is difficulty-weighted, so time spent on the hard end of the
   * staircase counts for more, and the hardest position solved anchors the
   * ceiling: clearing eight easy positions is not the same as clearing eight
   * hard ones. */
  function estimate(results) {
    var list = results || [];
    if (!list.length) return MIN;

    var total = 0;
    var got = 0;
    var correct = 0;
    var hardest = 0;

    list.forEach(function (r) {
      var weight = typeof r.rating === 'number' ? r.rating : 0;
      total += weight;
      if (r.correct) {
        got += weight;
        correct += 1;
        if (weight > hardest) hardest = weight;
      }
    });

    if (!correct) return FLOOR;

    var pct = total ? got / total : 0;
    var reach = clamp((hardest - LOW) / (HIGH - LOW), 0, 1);
    var base = clamp(0.55 * pct + 0.45 * reach, 0, 1);
    var raw = FLOOR + (MAX - FLOOR) * Math.pow(base, 1.15);
    return clamp(Math.round(raw / 25) * 25, FLOOR, MAX);
  }

  function correctCount(results) {
    return (results || []).filter(function (r) { return r.correct; }).length;
  }

  var api = {
    MIN: MIN,
    FLOOR: FLOOR,
    MAX: MAX,
    TOTAL: TOTAL,
    START_TARGET: START_TARGET,
    STEP: STEP,
    LOW: LOW,
    HIGH: HIGH,
    CURATED: CURATED,
    forcesMate: forcesMate,
    moveWins: moveWins,
    resolveMove: resolveMove,
    moveForcesMate: moveForcesMate,
    correctMoves: correctMoves,
    refutation: refutation,
    uciOf: uciOf,
    createRun: createRun,
    pickFor: pickFor,
    record: record,
    estimate: estimate,
    correctCount: correctCount
  };

  Object.defineProperty(api, 'POOL', { get: allItems, enumerable: true });

  global.Placement = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : globalThis);
