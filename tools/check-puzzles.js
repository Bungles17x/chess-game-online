/* Independently verify every shipped puzzle.
 * Run: node tools/check-puzzles.js
 */
'use strict';

global.window = {};
require('../js/puzzles.js');
const E = require('../js/engine.js');

const PUZZLES = global.window.PUZZLES || [];

function hasMateIn1(c) {
  for (const m of c.legalMoves()) {
    c.make(m);
    const mate = c.legalMoves().length === 0 && c.inCheck();
    c.unmake();
    if (mate) return true;
  }
  return false;
}

function forcingMoveExists(c) {
  for (const m of c.legalMoves()) {
    c.make(m);
    const replies = c.legalMoves();
    let ok = replies.length > 0;
    for (const r of replies) {
      c.make(r);
      const mate = hasMateIn1(c);
      c.unmake();
      if (!mate) { ok = false; break; }
    }
    c.unmake();
    if (ok) return true;
  }
  return false;
}

let bad = 0;
let m1 = 0;
let m2 = 0;

PUZZLES.forEach((p, i) => {
  const c = new E.Chess(p.fen);
  c.trackKeys = false;
  const issues = [];

  if (c.turn !== 'w') issues.push('white is not to move');
  if (c.kings.w < 0 || c.kings.b < 0) issues.push('missing king');
  if (c.isAttacked(c.kings.b, 'w')) issues.push('black starts in check');
  if (c.isAttacked(c.kings.w, 'b')) issues.push('white starts in check');
  if (!c.legalMoves().length) issues.push('no legal moves');

  if (p.mateIn === 1) {
    m1++;
    if (!hasMateIn1(c)) issues.push('no mate in one found');
  } else {
    m2++;
    if (hasMateIn1(c)) issues.push('labelled mate-in-2 but a mate-in-1 exists');
    if (!forcingMoveExists(c)) issues.push('no forced mate in two found');
  }

  if (issues.length) {
    bad++;
    console.log('FAIL #' + (i + 1) + ' ' + p.fen + ' -> ' + issues.join('; '));
  }
});

console.log('\npuzzles checked: ' + PUZZLES.length + ' (mate-in-1 ' + m1 + ', mate-in-2 ' + m2 + ')');
console.log(bad ? bad + ' problem(s) found' : 'all puzzles verified');
process.exit(bad ? 1 : 0);
