/* Generates js/puzzles.js.
 *
 * Puzzles are constructed from random legal material layouts and then proven:
 * a depth-3 exact search must find mate, and the stored first move is verified
 * so that every black reply still allows mate next move.
 *
 * Run: node tools/make-puzzles.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const E = require('../js/engine.js');
const AI = require('../js/ai.js');

const MATE = 100000;

/* white attackers / black defenders, balanced to feel like real puzzles */
const TEMPLATES = [
  { w: ['Q'], b: [] },
  { w: ['R'], b: [] },
  { w: ['Q'], b: ['R'] },
  { w: ['Q', 'N'], b: ['R', 'P'] },
  { w: ['R', 'B'], b: ['N', 'P', 'P'] },
  { w: ['R', 'R'], b: ['Q'] },
  { w: ['Q', 'B'], b: ['R', 'B'] },
  { w: ['R', 'N'], b: ['B', 'P', 'P'] },
  { w: ['Q', 'R'], b: ['R', 'N', 'P'] },
  { w: ['R', 'B', 'N'], b: ['R', 'P', 'P'] },
  { w: ['Q', 'N'], b: ['Q'] },
  { w: ['R', 'N', 'B'], b: ['R', 'B', 'P'] },
  { w: ['Q', 'B', 'N'], b: ['R', 'R', 'P'] },
  { w: ['Q', 'R'], b: ['R', 'N', 'B', 'P'] },
  { w: ['R', 'B', 'N'], b: ['Q', 'P', 'P'] }
];

/* only keep positions where black has real material to defend with */
const POOL = TEMPLATES.filter(t => t.b.length >= 1);

const rand = n => (Math.random() * n) | 0;

function cheb(a, b) {
  return Math.max(Math.abs((a >> 3) - (b >> 3)), Math.abs((a & 7) - (b & 7)));
}

function negamax(c, depth, alpha, beta, ply) {
  const moves = c.legalMoves();
  if (!moves.length) return c.inCheck() ? -MATE + ply : 0;
  if (depth === 0) return AI.evaluate(c) * (c.turn === 'w' ? 1 : -1);

  let best = -1e9;
  for (const m of moves) {
    c.make(m);
    const s = -negamax(c, depth - 1, -beta, -alpha, ply + 1);
    c.unmake();
    if (s > best) best = s;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

function searchRoot(c, depth) {
  const moves = c.legalMoves();
  if (!moves.length) return { score: 0, move: null };
  let best = null, bestScore = -1e9;
  for (const m of moves) {
    c.make(m);
    const s = -negamax(c, depth - 1, -1e9, 1e9, 1);
    c.unmake();
    if (s > bestScore) { bestScore = s; best = m; }
  }
  return { score: bestScore, move: best };
}

function hasMateIn1(c) {
  for (const m of c.legalMoves()) {
    c.make(m);
    const mate = c.legalMoves().length === 0 && c.inCheck();
    c.unmake();
    if (mate) return true;
  }
  return false;
}

function forcesMateNext(c, move) {
  c.make(move);
  const replies = c.legalMoves();
  if (!replies.length) { c.unmake(); return false; }
  for (const r of replies) {
    c.make(r);
    const ok = hasMateIn1(c);
    c.unmake();
    if (!ok) { c.unmake(); return false; }
  }
  c.unmake();
  return true;
}

function buildPosition(tpl) {
  for (let attempt = 0; attempt < 400; attempt++) {
    const grid = new Array(64).fill(null);
    const used = new Set();

    const place = (piece, filter) => {
      for (let k = 0; k < 300; k++) {
        const sq = rand(64);
        if (used.has(sq) || (filter && !filter(sq))) continue;
        used.add(sq);
        grid[sq] = piece;
        return sq;
      }
      return -1;
    };

    const bk = place('k', sq => (sq >> 3) <= 1 || (sq >> 3) >= 6 || (sq & 7) === 0 || (sq & 7) === 7);
    if (bk < 0) continue;

    const wk = place('K', sq => cheb(sq, bk) > 1);
    if (wk < 0) continue;

    let ok = true;
    for (const p of tpl.w) {
      const sq = place(p, s => s !== wk && s !== bk);
      if (sq < 0) { ok = false; break; }
    }
    if (!ok) continue;

    for (const raw of tpl.b) {
      const bp = raw.toLowerCase();
      const sq = place(bp, s => {
        if (s === wk || s === bk) return false;
        if (bp === 'p') {
          const rank = 7 - (s >> 3);
          return rank >= 2 && rank <= 7;
        }
        return true;
      });
      if (sq < 0) { ok = false; break; }
    }
    if (!ok) continue;

    const c = new E.Chess();
    c.board = grid;
    c.turn = 'w';
    c.castling = { K: false, Q: false, k: false, q: false };
    c.ep = -1;
    c.halfmove = 0;
    c.fullmove = 1;
    c.kings = { w: wk, b: bk };
    c.history = [];
    c.keys = [];
    c.trackKeys = false;

    if (c.isAttacked(wk, 'b')) continue;
    if (c.isAttacked(bk, 'w')) continue;
    if (!c.legalMoves('w').length) continue;
    if (!c.legalMoves('b').length) continue;

    /* legalMoves() flips turn on unmake, so restore the side to move */
    c.turn = 'w';
    return c;
  }
  return null;
}

function materialCount(fen) {
  return fen.split(' ')[0].replace(/[^a-zA-Z]/g, '').length;
}

function main() {
  const easy = [];
  const hard = [];
  const seen = new Set();
  const started = Date.now();
  const budget = 200000;

  let attempts = 0;
  let built = 0;
  let candidates = 0;
  while (Date.now() - started < budget && (easy.length < 14 || hard.length < 14) && attempts < 20000) {
    attempts++;
    const tpl = POOL[rand(POOL.length)];
    const c = buildPosition(tpl);
    if (!c) continue;

    const res = searchRoot(c, 3);
    built++;
    if (!res.move || res.score < MATE - 100) continue;
    candidates++;

    const fen = c.fen();
    const key = fen.split(' ')[0];
    if (seen.has(key)) continue;

    const mateDist = MATE - res.score;

    if (mateDist <= 1) {
      const fresh = new E.Chess(fen);
      fresh.trackKeys = false;
      const mv = fresh.legalMoves().filter(m => E.moveToUci(m) === E.moveToUci(res.move))[0];
      if (!mv) continue;
      fresh.make(mv);
      const isMate = fresh.legalMoves().length === 0 && fresh.inCheck();
      if (!isMate) continue;
      if (easy.length >= 14 || materialCount(fen) < 6) continue;
      easy.push({ fen, mateIn: 1, rating: 780 + materialCount(fen) * 28 });
      seen.add(key);
    } else {
      const fresh = new E.Chess(fen);
      fresh.trackKeys = false;
      const mv = fresh.legalMoves().filter(m => E.moveToUci(m) === E.moveToUci(res.move))[0];
      if (!mv) continue;
      if (!forcesMateNext(fresh, mv)) continue;
      if (hard.length >= 14 || materialCount(fen) < 6) continue;
      hard.push({ fen, mateIn: 2, rating: 1180 + materialCount(fen) * 32 });
      seen.add(key);
    }
  }

  const list = easy.concat(hard).sort((a, b) => a.rating - b.rating);

  const body = list.map(p =>
    '  { fen: ' + JSON.stringify(p.fen) + ', mateIn: ' + p.mateIn + ', rating: ' + Math.round(p.rating) + ' }'
  ).join(',\n');

  const out = '/* Gambit puzzle bank — generated and verified by tools/make-puzzles.js.\n' +
    ' * Each entry is a legal position where the side to move has a forced mate,\n' +
    ' * proven by the engine rather than typed by hand.\n' +
    ' */\n' +
    'window.PUZZLES = [\n' + body + '\n];\n';

  fs.writeFileSync(path.join(__dirname, '..', 'js', 'puzzles.js'), out);

  console.log('attempts=' + attempts + ' legalPositions=' + built +
    ' matePositions=' + candidates + ' kept=' + list.length +
    ' (mate-in-1: ' + easy.length + ', mate-in-2: ' + hard.length + ')' +
    ' in ' + ((Date.now() - started) / 1000).toFixed(1) + 's');
}

main();
