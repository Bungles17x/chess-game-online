/* Checks drill goals and coach narration. Run: node tools/check-drills.js */
'use strict';

var path = require('path');
var root = path.join(__dirname, '..');

global.window = global;
require(path.join(root, 'js/engine.js'));
require(path.join(root, 'js/drills.js'));
require(path.join(root, 'js/coach.js'));

var E = global.Engine;
var D = global.Drills;
var C = global.Coach;

var ok = true;
function check(cond, msg) {
  if (!cond) { console.log('FAIL ' + msg); ok = false; }
  else console.log('ok   ' + msg);
}

function after(fen, uci) {
  var c = new E.Chess(fen);
  var mv = c.legalMoves().filter(function (m) { return E.moveToUci(m) === uci; })[0];
  if (!mv) return null;
  c.make(mv);
  return c.fen();
}

check(D.LIST.length === 9, 'nine drills are defined (six core, three endgame)');
check(D.LIST.filter(function (d) { return d.phase === 'endgame'; }).length === 3, 'three of them are endgame drills');

D.LIST.forEach(function (d) {
  check(!!d.fen && !!d.goal && d.par >= 1, d.id + ' has a position, a goal and a move budget');
  var probe = new E.Chess(d.fen);
  check(probe.legalMoves().length > 0, d.id + ' is a playable position');
});

var cases = [
  { id: 'mate1', win: 'a1a8', lose: 'a1a2' },
  { id: 'winqueen', win: 'd1d5', lose: 'd1d2' },
  { id: 'promote', win: 'a7a8q', lose: 'a7a8r' },
  { id: 'castle', win: 'e1g1', lose: 'e1f1' },
  { id: 'queenmate', win: 'h1h7', lose: 'h1h2' }
];

cases.forEach(function (t) {
  var def = D.byId(t.id);
  var winFen = after(def.fen, t.win);
  var loseFen = after(def.fen, t.lose);
  check(!!winFen, t.id + ' solution ' + t.win + ' is legal');
  check(!!loseFen, t.id + ' decoy ' + t.lose + ' is legal');
  if (winFen) check(D.reached(def, def.fen, winFen, def.color), t.id + ' recognises success');
  if (loseFen) check(!D.reached(def, def.fen, loseFen, def.color), t.id + ' rejects a non-solution');
});

var develop = D.byId('develop');
check(!D.reached(develop, develop.fen, after(develop.fen, 'g1f3'), 'w'), 'develop needs every minor off the back rank');
var wide = 'rnbqkbnr/pppppppp/8/8/2B1P1B1/2N2N2/PPPP1PPP/R2Q1RK1 b kq - 7 8';
check(D.reached(develop, develop.fen, wide, 'w'), 'develop accepts a fully developed army');

/* Narration must be real prose built from the numbers we pass in. */
var g = C.gameSummary({
  moves: 22,
  accuracy: 78.4,
  outcome: 'lost',
  opening: "King's Pawn Opening",
  worst: [{ label: '14.', san: 'Nf3', reason: 'Careful: your knight on f3 is attacked and undefended.' }],
  hanging: 2,
  blunders: 1
});
check(/22 moves/.test(g) && /78% accuracy/.test(g), 'game summary states moves and accuracy');
check(/King's Pawn Opening/.test(g) && /14\. Nf3/.test(g), 'game summary names the opening and worst move');
check(/hanging/.test(g) && /Next step/.test(g), 'game summary draws a habit and a next step');

check(/Mate in one/.test(C.learnSummary({ total: 6, solved: 0 })), 'learn summary suggests the first drill when nothing is solved');
check(/solved 2 of 6/.test(C.learnSummary({ total: 6, solved: 2, nextTitle: 'Promote the pawn', nextBrief: 'Your pawn is one square from the end of the board.', best: { title: 'Mate in one', moves: 1 } })), 'learn summary counts progress and names the best drill');

var solved = C.drillResult(D.byId('mate1'), { solved: true, moves: 1, par: 1, hints: 0 });
check(/Solved in 1 move/.test(solved) && /no hints/.test(solved), 'drill result celebrates a clean solve');
var missed = C.drillResult(D.byId('mate1'), { solved: false, moves: 1, par: 1 });
check(/Not solved/.test(missed) && /rook/.test(missed), 'drill result explains a miss');

console.log(ok ? '\nall drill checks passed' : '\ndrill checks FAILED');
process.exit(ok ? 0 : 1);
