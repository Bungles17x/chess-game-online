/* Checks that move explanations name the mechanism, not just the cost.
 * Run: node tools/check-explain.js */
'use strict';

var path = require('path');
var root = path.join(__dirname, '..');

global.window = global;
require(path.join(root, 'js/engine.js'));
require(path.join(root, 'js/explain.js'));
require(path.join(root, 'js/coach.js'));

var E = global.Engine;
var X = global.Explain;
var C = global.Coach;

var ok = true;
function check(cond, msg) {
  if (!cond) { console.log('FAIL ' + msg); ok = false; }
  else console.log('ok   ' + msg);
}

function after(fen, uci) {
  var c = new E.Chess(fen);
  var mv = E.fromUci(uci, c.legalMoves());
  if (!mv) throw new Error('illegal ' + uci + ' in ' + fen);
  c.make(mv);
  return c.fen();
}

function describe(o) { return X.describe(o); }

/* 1. Hanging queen: the reason must name the piece and the capture. */
var queenBefore = 'r5k1/7p/8/8/8/8/8/4K2Q w - - 0 1';
var queen = describe({
  beforeFen: queenBefore,
  afterFen: after(queenBefore, 'h1h7'),
  playedUci: 'h1h7',
  bestUci: 'h1a8',
  replyUci: 'g8h7',
  mover: 'w',
  cls: 'blunder',
  bestCp: 900,
  playedCp: 0,
  book: false
});
console.log('   -> ' + queen.text);
check(/queen/.test(queen.text), 'names the piece that is lost');
check(/Kxh7/.test(queen.text), 'names the opponent reply that wins it');
check(/\+9\.0 to 0\.0/.test(queen.text), 'states the evaluation swing');
check(!/^Blunder/.test(queen.text), 'badge carries the label instead of repeating it');
check(!/drops about/.test(queen.text), 'no longer just quotes a percentage');

/* 2. Quiet move that hangs a rook: the reply must be spelled out. */
var tradeBefore = '4k3/8/8/3q4/8/8/8/3RK3 w - - 0 1';
var trade = describe({
  beforeFen: tradeBefore,
  afterFen: after(tradeBefore, 'd1d2'),
  playedUci: 'd1d2',
  bestUci: 'd1d5',
  replyUci: 'd5d2',
  mover: 'w',
  cls: 'blunder',
  bestCp: 500,
  playedCp: -500,
  book: false
});
console.log('   -> ' + trade.text);
check(/rook/.test(trade.text) && /Qxd2/.test(trade.text), 'trading blunder names the rook and Qxd2');
check(/Rxd5/.test(trade.text), 'points out the capture that was available');

/* 3. Good moves explain what they do. */
var centre = describe({
  beforeFen: E.START_FEN,
  afterFen: after(E.START_FEN, 'e2e4'),
  playedUci: 'e2e4',
  bestUci: 'e2e4',
  mover: 'w',
  cls: 'best',
  bestCp: 30,
  playedCp: 30,
  book: false
});
console.log('   -> ' + centre.text);
check(/centre/.test(centre.text), 'best move explains that it takes the centre');

var develop = describe({
  beforeFen: E.START_FEN,
  afterFen: after(E.START_FEN, 'g1f3'),
  playedUci: 'g1f3',
  bestUci: 'e2e4',
  mover: 'w',
  cls: 'excellent',
  bestCp: 30,
  playedCp: 25,
  book: false
});
console.log('   -> ' + develop.text);
check(/develops/.test(develop.text), 'developing move says what it develops');
check(/e4/.test(develop.text), 'names the engine alternative');

/* 4. Book and mate wording. */
var book = describe({
  beforeFen: E.START_FEN,
  afterFen: after(E.START_FEN, 'e2e4'),
  playedUci: 'e2e4',
  mover: 'w',
  cls: 'book',
  book: true,
  opening: 'King\u2019s Pawn Opening'
});
check(/Theory/.test(book.text) && /King/.test(book.text), 'book moves are labelled as theory');

var mateBefore = '7k/8/6K1/8/8/8/8/7Q w - - 0 1';
var mate = describe({
  beforeFen: mateBefore,
  afterFen: after(mateBefore, 'h1h7'),
  playedUci: 'h1h7',
  bestUci: 'h1h7',
  mover: 'w',
  cls: 'best',
  bestCp: 2000,
  playedCp: 2000,
  book: false
});
console.log('   -> ' + mate.text);
check(/check/.test(mate.text) || /mate/.test(mate.text), 'mating move says it gives check');

var inacc = describe({
  beforeFen: '4k3/8/8/3q4/8/8/8/3RK3 w - - 0 1',
  afterFen: after('4k3/8/8/3q4/8/8/8/3RK3 w - - 0 1', 'd1d3'),
  playedUci: 'd1d3',
  bestUci: 'd1d5',
  replyUci: 'd5d3',
  mover: 'w',
  cls: 'inaccuracy',
  bestCp: 400,
  playedCp: 250,
  book: false
});
console.log('   -> ' + inacc.text);
check(/loses the rook to Qxd3/.test(inacc.text) && /Rxd5/.test(inacc.text), 'inaccuracies name the loose piece and the better move');

/* The same wording has to work for the opponent's moves: no "your". */
var blackBefore = 'r5k1/7p/8/8/8/8/8/4K2Q b - - 0 1';
var blackMove = describe({
  beforeFen: blackBefore,
  afterFen: after(blackBefore, 'h7h5'),
  playedUci: 'h7h5',
  bestUci: 'g8f8',
  replyUci: 'h1a8',
  cls: 'blunder',
  bestCp: -900,
  playedCp: 0,
  book: false
});
console.log('   -> ' + blackMove.text);
check(!/\byour\b/i.test(blackMove.text), 'opponent explanations avoid second person');
check(/rook/.test(blackMove.text), 'opponent explanation still names the loose piece');

/* Why the engine's move is better, written for Show best. */
var why = C.whyBetter({ san: 'Qxa8+', purpose: 'takes the rook on a8', from: '0.0', to: '+9.0' });
console.log('   -> ' + why);
check(/^Qxa8\+ is better: it takes the rook on a8/.test(why), 'whyBetter names the move and its point');
check(/from 0\.0 to \+9\.0/.test(why), 'whyBetter quotes the evaluation lift');
var whyEdge = C.whyBetter({ san: 'Qf3', purpose: '', from: '+3.9', to: '+4.2' });
console.log('   -> ' + whyEdge);
check(/^Qf3 keeps a slightly better evaluation, from \+3\.9 to \+4\.2\.$/.test(whyEdge), 'whyBetter avoids repeating the same idea');
check(!/\byour\b/i.test(why), 'whyBetter stays side-neutral');

/* 5. Explanations stay readable: no empty text, no doubled sentences. */
[queen, trade, centre, develop, book, mate, inacc].forEach(function (r, i) {
  check(r.text && r.text.length > 25 && r.text.length < 320, 'explanation ' + (i + 1) + ' is a readable length');
  check(/\.\s|\.$/.test(r.text), 'explanation ' + (i + 1) + ' is punctuated');
});

console.log(ok ? '\nall explanation checks passed' : '\nexplanation checks FAILED');
process.exit(ok ? 0 : 1);
