/* Gambit — original chess search engine.
 * Negamax + alpha-beta + quiescence, with hand-written evaluation tables.
 */
(function (global) {
  'use strict';

  var Engine = global.Engine;
  if (!Engine && typeof require === 'function') Engine = require('./engine.js');

  var VALUES = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 0 };

  /* Tables are written rank 8 first, i.e. index 0 = a8, matching board order. */
  var PAWN = [
    0, 0, 0, 0, 0, 0, 0, 0,
    60, 60, 60, 60, 60, 60, 60, 60,
    12, 14, 22, 32, 32, 22, 14, 12,
    4, 6, 12, 26, 26, 12, 6, 4,
    0, 0, 0, 18, 18, 0, 0, 0,
    4, -6, -10, 0, 0, -10, -6, 4,
    4, 10, 10, -18, -18, 10, 10, 4,
    0, 0, 0, 0, 0, 0, 0, 0
  ];
  var KNIGHT = [
    -50, -40, -30, -30, -30, -30, -40, -50,
    -40, -20, 0, 0, 0, 0, -20, -40,
    -30, 0, 10, 15, 15, 10, 0, -30,
    -30, 5, 15, 20, 20, 15, 5, -30,
    -30, 0, 15, 20, 20, 15, 0, -30,
    -30, 5, 10, 15, 15, 10, 5, -30,
    -40, -20, 0, 5, 5, 0, -20, -40,
    -50, -40, -30, -30, -30, -30, -40, -50
  ];
  var BISHOP = [
    -20, -10, -10, -10, -10, -10, -10, -20,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -10, 0, 5, 10, 10, 5, 0, -10,
    -10, 5, 5, 10, 10, 5, 5, -10,
    -10, 0, 10, 10, 10, 10, 0, -10,
    -10, 10, 10, 10, 10, 10, 10, -10,
    -10, 5, 0, 0, 0, 0, 5, -10,
    -20, -10, -10, -10, -10, -10, -10, -20
  ];
  var ROOK = [
    0, 0, 0, 0, 0, 0, 0, 0,
    6, 10, 10, 10, 10, 10, 10, 6,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    0, 0, 0, 6, 6, 0, 0, 0
  ];
  var QUEEN = [
    -20, -10, -10, -5, -5, -10, -10, -20,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -10, 0, 5, 5, 5, 5, 0, -10,
    -5, 0, 5, 5, 5, 5, 0, -5,
    0, 0, 5, 5, 5, 5, 0, -5,
    -10, 5, 5, 5, 5, 5, 0, -10,
    -10, 0, 5, 0, 0, 0, 0, -10,
    -20, -10, -10, -5, -5, -10, -10, -20
  ];
  var KING_MID = [
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -20, -30, -30, -40, -40, -30, -30, -20,
    -10, -20, -20, -20, -20, -20, -20, -10,
    20, 20, 0, 0, 0, 0, 20, 20,
    20, 30, 10, 0, 0, 10, 30, 20
  ];
  var KING_END = [
    -50, -40, -30, -20, -20, -30, -40, -50,
    -30, -20, -10, 0, 0, -10, -20, -30,
    -30, -10, 20, 30, 30, 20, -10, -30,
    -30, -10, 30, 40, 40, 30, -10, -30,
    -30, -10, 30, 40, 40, 30, -10, -30,
    -30, -10, 20, 30, 30, 20, -10, -30,
    -30, -30, 0, 0, 0, 0, -30, -30,
    -50, -30, -30, -30, -30, -30, -30, -50
  ];

  var PST = { P: PAWN, N: KNIGHT, B: BISHOP, R: ROOK, Q: QUEEN, K: KING_MID, KE: KING_END };

  var VFLIP = new Array(64);
  for (var i = 0; i < 64; i++) VFLIP[i] = (7 - (i >> 3)) * 8 + (i & 7);

  var MATE = 100000;
  var ABORT = { abort: true };

  var LEVELS = {
    1: { name: 'Beginner', depth: 1, time: 250, blunder: 0.40, noise: 120 },
    2: { name: 'Easy', depth: 2, time: 500, blunder: 0.14, noise: 45 },
    3: { name: 'Club', depth: 3, time: 1100, blunder: 0.02, noise: 12 },
    4: { name: 'Strong', depth: 4, time: 2000, blunder: 0, noise: 8 },
    5: { name: 'Master', depth: 5, time: 3200, blunder: 0, noise: 0 }
  };

  function evaluate(chess) {
    var b = chess.board;
    var score = 0, npm = 0, bishopsW = 0, bishopsB = 0;
    var pawnsW = [0, 0, 0, 0, 0, 0, 0, 0];
    var pawnsB = [0, 0, 0, 0, 0, 0, 0, 0];

    for (var i = 0; i < 64; i++) {
      var p = b[i];
      if (!p) continue;
      var white = p === p.toUpperCase();
      var t = p.toUpperCase();
      if (t === 'K') continue;
      var idx = white ? i : VFLIP[i];
      var v = VALUES[t] + PST[t][idx];
      score += white ? v : -v;
      if (t !== 'P') npm += VALUES[t];
      if (t === 'P') { if (white) pawnsW[i & 7]++; else pawnsB[i & 7]++; }
      if (t === 'B') { if (white) bishopsW++; else bishopsB++; }
    }

    var phase = Math.max(0, Math.min(1, (2600 - npm) / 1600));
    var kw = chess.kings.w, kb = chess.kings.b;
    if (kw >= 0) score += (1 - phase) * KING_MID[kw] + phase * KING_END[kw];
    if (kb >= 0) score -= (1 - phase) * KING_MID[VFLIP[kb]] + phase * KING_END[VFLIP[kb]];

    if (bishopsW >= 2) score += 30;
    if (bishopsB >= 2) score -= 30;

    for (var f = 0; f < 8; f++) {
      if (pawnsW[f] > 1) score -= 14 * (pawnsW[f] - 1);
      if (pawnsB[f] > 1) score += 14 * (pawnsB[f] - 1);
      if (pawnsW[f] && !pawnsW[f - 1] && !pawnsW[f + 1]) score -= 12;
      if (pawnsB[f] && !pawnsB[f - 1] && !pawnsB[f + 1]) score += 12;
      var eAdjW = (pawnsB[f - 1] || 0) + pawnsB[f] + (pawnsB[f + 1] || 0);
      var eAdjB = (pawnsW[f - 1] || 0) + pawnsW[f] + (pawnsW[f + 1] || 0);
      if (pawnsW[f] && !eAdjW) score += 12;
      if (pawnsB[f] && !eAdjB) score -= 12;
    }

    return score;
  }

  function scoreMove(m, chess) {
    var s = 0;
    var target = chess.board[m.to];
    if (target) s += 1000 + VALUES[target.toUpperCase()] - VALUES[m.piece.toUpperCase()] / 10;
    if (m.ep) s += 1050;
    if (m.promo) s += 900 + VALUES[m.promo];
    if (m.castle) s += 60;
    return s;
  }

  function orderMoves(moves, chess, first) {
    for (var i = 0; i < moves.length; i++) moves[i]._s = scoreMove(moves[i], chess);
    moves.sort(function (a, b) { return b._s - a._s; });
    if (first) {
      var idx = moves.indexOf(first);
      if (idx > 0) { moves.splice(idx, 1); moves.unshift(first); }
    }
    return moves;
  }

  function quiesce(chess, alpha, beta, ctx, ply, qdepth) {
    if ((ctx.nodes++ & 1023) === 0 && Date.now() > ctx.deadline) throw ABORT;
    var stand = evaluate(chess) * (chess.turn === 'w' ? 1 : -1);
    if (stand >= beta) return beta;
    if (stand > alpha) alpha = stand;
    if (qdepth >= 4) return alpha;

    var legal = chess.legalMoves();
    var moves = [];
    for (var i = 0; i < legal.length; i++) {
      var m = legal[i];
      if (m.ep || m.promo || chess.board[m.to]) moves.push(m);
    }
    if (!moves.length) return chess.inCheck() ? -MATE + ply : alpha;

    orderMoves(moves, chess);
    for (var j = 0; j < moves.length; j++) {
      chess.make(moves[j]);
      var s = -quiesce(chess, -beta, -alpha, ctx, ply + 1, qdepth + 1);
      chess.unmake();
      if (s >= beta) return beta;
      if (s > alpha) alpha = s;
    }
    return alpha;
  }

  function negamax(chess, depth, alpha, beta, ctx, ply) {
    if ((ctx.nodes++ & 1023) === 0 && Date.now() > ctx.deadline) throw ABORT;
    if (depth <= 0) return quiesce(chess, alpha, beta, ctx, ply, 0);

    var moves = chess.legalMoves();
    if (!moves.length) return chess.inCheck() ? -MATE + ply : 0;

    orderMoves(moves, chess);
    var best = -1e9;
    for (var i = 0; i < moves.length; i++) {
      chess.make(moves[i]);
      var s = -negamax(chess, depth - 1, -beta, -alpha, ctx, ply + 1);
      chess.unmake();
      if (s > best) best = s;
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }
    return best;
  }

  function pickMove(chess, level) {
    var cfg = LEVELS[level] || LEVELS[3];
    var rootMoves = chess.legalMoves();
    if (!rootMoves.length) return null;
    if (rootMoves.length === 1) return rootMoves[0];
    if (cfg.blunder && Math.random() < cfg.blunder) {
      return rootMoves[(Math.random() * rootMoves.length) | 0];
    }

    var histLen = chess.history.length;
    var ctx = { nodes: 0, deadline: Date.now() + cfg.time };
    var best = rootMoves[0];

    try {
      for (var d = 1; d <= cfg.depth; d++) {
        var ordered = orderMoves(rootMoves.slice(), chess, best);
        var alpha = -1e9, localBest = null;
        for (var i = 0; i < ordered.length; i++) {
          chess.make(ordered[i]);
          var s = -negamax(chess, d - 1, -1e9, -alpha, ctx, 1);
          chess.unmake();
          if (cfg.noise) s += (Math.random() - 0.5) * cfg.noise;
          if (localBest === null || s > alpha) { alpha = s; localBest = ordered[i]; }
        }
        if (localBest) best = localBest;
        if (Date.now() > ctx.deadline) break;
      }
    } catch (err) {
      if (err !== ABORT) throw err;
      while (chess.history.length > histLen) chess.unmake();
    }
    return best;
  }

  /* Score a position for the analysis board: returns centipawns from white's
   * point of view plus the engine's preferred move. */
  function analyze(chess, depth) {
    depth = depth || 3;
    var histLen = chess.history.length;
    var rootMoves = chess.legalMoves();
    if (!rootMoves.length) return { score: 0, mate: 0, best: null };

    orderMoves(rootMoves, chess);
    var ctx = { nodes: 0, deadline: Date.now() + 6000 };
    var best = null, bestScore = -1e9;

    try {
      for (var i = 0; i < rootMoves.length; i++) {
        chess.make(rootMoves[i]);
        var s = -negamax(chess, depth - 1, -1e9, 1e9, ctx, 1);
        chess.unmake();
        if (s > bestScore) { bestScore = s; best = rootMoves[i]; }
      }
    } catch (err) {
      if (err !== ABORT) throw err;
      while (chess.history.length > histLen) chess.unmake();
    }

    var white = chess.turn === 'w' ? bestScore : -bestScore;
    var mate = 0;
    if (Math.abs(white) > MATE - 1000) {
      mate = Math.ceil((MATE - Math.abs(white)) / 2) * (white > 0 ? 1 : -1);
      white = white > 0 ? MATE : -MATE;
    }

    return {
      score: Math.round(white),
      mate: mate,
      best: best ? Engine.moveToUci(best) : null
    };
  }

  var api = { pickMove: pickMove, evaluate: evaluate, analyze: analyze, LEVELS: LEVELS, MATE: MATE };

  global.AI = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : globalThis);
