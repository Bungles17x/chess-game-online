/* Verifies King of the Hill and Three-check win conditions. */
'use strict';

var E = require('../js/engine.js');
var V = require('../js/variants.js');
var R = require('../js/results.js');

var ok = true;
function check(cond, label, detail) {
  if (cond) console.log('PASS  ' + label);
  else { ok = false; console.log('FAIL  ' + label + (detail ? '  -> ' + detail : '')); }
}

/* white king c4, black king h1 */
var koth = new E.Chess('8/8/8/8/2K5/8/8/7k w - - 0 1');
check(V.isCenter(35) && V.isCenter(36) && V.isCenter(27) && V.isCenter(28), 'centre squares are d4/e4/d5/e5');
check(!V.isCenter(34), 'c4 is not a centre square');

var quiet = E.fromUci('c4c3', koth.legalMoves());
koth.make(quiet);
check(V.afterMove(koth, 'w', 'koth', { w: 0, b: 0 }) === null, 'a non-central king move does not win');
koth.unmake();

var into = E.fromUci('c4d4', koth.legalMoves());
check(!!into, 'Kd4 is legal');
koth.make(into);
var kothWin = V.afterMove(koth, 'w', 'koth', { w: 0, b: 0 });
check(kothWin && kothWin.code === 'w' && kothWin.reason === 'king of the hill',
  'king reaching d4 wins by king of the hill', JSON.stringify(kothWin));
koth.unmake();

var std = new E.Chess('8/8/8/8/2K5/8/8/7k w - - 0 1');
std.make(E.fromUci('c4d4', std.legalMoves()));
check(V.afterMove(std, 'w', 'standard', { w: 0, b: 0 }) === null, 'standard chess ignores the centre');

/* white rook h1, black king e8, white king e1: 1.Rh8+ */
var three = new E.Chess('4k3/8/8/8/8/8/8/4K2R w K - 0 1');
var checks = { w: 0, b: 0 };
var rook = E.fromUci('h1h8', three.legalMoves());
check(!!rook, 'Rh8 is legal');
three.make(rook);
check(three.inCheck(), 'Rh8 gives check');
check(V.afterMove(three, 'w', 'threecheck', checks) === null && checks.w === 1,
  'first check is counted but does not win', JSON.stringify(checks));
three.unmake();

var checks2 = { w: 2, b: 0 };
three.make(rook);
var threeWin = V.afterMove(three, 'w', 'threecheck', checks2);
check(threeWin && threeWin.code === 'w' && threeWin.reason === 'three checks',
  'third check wins', JSON.stringify(threeWin));

var noCheck = { w: 0, b: 0 };
var plain = new E.Chess();
plain.make(E.fromUci('e2e4', plain.legalMoves()));
check(V.afterMove(plain, 'w', 'threecheck', noCheck) === null && noCheck.w === 0,
  'a quiet move does not count as a check');

/* Result model: codes in, wording out. */
check(R.text('w', 'checkmate').title === 'White wins' && R.text('w', 'checkmate').sub === 'by checkmate',
  'checkmate text comes from the code');
check(R.text('d', 'fifty-move rule').sub === 'by the fifty-move rule',
  'fifty-move reason keeps its article');
check(R.text('b', 'time').sub === 'on time', 'flag fall reads "on time"');
check(R.text('d', 'timeout-material').sub === 'time out with no mating material',
  'timeout without mating material reads correctly');
check(R.text('d', 'agreement').title === 'Draw', 'agreement is a draw');
check(R.text('d', 'king of the hill').sub === 'by king of the hill', 'variant reason is rendered');
check(R.pgn('w') === '1-0' && R.pgn('b') === '0-1' && R.pgn('d') === '1/2-1/2', 'PGN results come from the code');

console.log(ok ? '\nall variant checks passed' : '\nvariant checks FAILED');
process.exit(ok ? 0 : 1);
