/* Verifies the game review maths and opening book on a known miniature. */
'use strict';

var E = require('../js/engine.js');
var AI = require('../js/ai.js');
var R = require('../js/review.js');
var O = require('../js/openings.js');

var c = new E.Chess();
var positions = [{ fen: E.START_FEN, san: null, move: null, mover: null }];
var sans = [];

function play(san) {
  var legal = c.legalMoves();
  var mv = null;
  for (var i = 0; i < legal.length; i++) if (c.san(legal[i], legal) === san) mv = legal[i];
  if (!mv) throw new Error('illegal move ' + san);
  var mover = c.turn;
  c.make(mv);
  positions.push({ fen: c.fen(), san: san, move: mv, mover: mover });
  sans.push(san);
}

/* 1.e4 e5 2.Bc4 Bc5 3.Qh5 Nf6?? 4.Qxf7# */
['e4', 'e5', 'Bc4', 'Bc5', 'Qh5', 'Nf6', 'Qxf7#'].forEach(play);

var evals = positions.map(function (p) { return AI.analyze(new E.Chess(p.fen), 2); });
var rows = [];
var ok = true;

for (var ply = 1; ply < positions.length; ply++) {
  var prev = positions[ply - 1];
  var cur = positions[ply];
  var mover = cur.mover;
  var sgn = mover === 'w' ? 1 : -1;
  var bestCp = R.scoreCp(evals[ply - 1]) * sgn;
  var playedCp = R.scoreCp(evals[ply]) * sgn;
  var loss = Math.max(0, (R.expected(bestCp) - R.expected(playedCp)) * 100);

  var uci = E.moveToUci(cur.move);
  var isBest = !!(evals[ply - 1].best && evals[ply - 1].best === uci);
  if (isBest) loss = 0;

  var bestSan = null;
  if (evals[ply - 1].best) {
    var probe = new E.Chess(prev.fen);
    var mv = E.fromUci(evals[ply - 1].best, probe.legalMoves());
    if (mv) bestSan = probe.san(mv);
  }

  var book = O.isBookPly(sans, ply);
  var given = R.materialGiven(prev.fen, cur.fen, mover);
  var brilliant = isBest && given >= 2 && R.expected(playedCp) >= 0.5;
  var cls = R.classify({ loss: loss, isBest: isBest, book: book, brilliant: brilliant });
  var acc = R.accuracy(loss);

  if (!R.LABELS[cls]) { console.log('bad class', cls); ok = false; }
  if (!(acc >= 0 && acc <= 100)) { console.log('bad accuracy', acc); ok = false; }

  rows.push({ ply: ply, san: cur.san, cls: cls, loss: loss, acc: acc, bestSan: bestSan, book: book });
  console.log(
    String(ply).padStart(2) + '  ' + cur.san.padEnd(7) + cls.padEnd(11) +
    loss.toFixed(1).padStart(6) + '  ' + acc.toFixed(1).padStart(5) + '  ' +
    (bestSan || '-') + (book ? '   [book]' : '')
  );
}

var accW = R.aggregate(rows.filter(function (r) { return r.ply % 2 === 1; }).map(function (r) { return r.acc; }));
var accB = R.aggregate(rows.filter(function (r) { return r.ply % 2 === 0; }).map(function (r) { return r.acc; }));

console.log('\naccuracy white ' + (accW == null ? '-' : accW.toFixed(1)) +
  ' / black ' + (accB == null ? '-' : accB.toFixed(1)));
console.log('est elo ' + R.eloFor(accW) + ' / ' + R.eloFor(accB));
console.log('opening ' + O.detect(sans).name + ' after ' + O.detect(sans).plies + ' plies');

if (accW == null || accB == null) { console.log('missing accuracy'); ok = false; }
if (O.detect(sans).name !== 'Open Game') { console.log('opening detection wrong'); ok = false; }

var italian = O.detect(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4']);
if (italian.name !== 'Italian Game' || italian.plies !== 5) {
  console.log('Italian detection wrong:', italian);
  ok = false;
}
if (!O.isBookPly(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'], 5) || O.isBookPly(['e4', 'e5', 'Qh5'], 3)) {
  console.log('book prefix flags wrong');
  ok = false;
}

var blunder = rows.filter(function (r) { return r.san === 'Nf6'; })[0];
if (!blunder || ['inaccuracy', 'mistake', 'blunder'].indexOf(blunder.cls) === -1) {
  console.log('Nf6 not flagged:', blunder && blunder.cls);
  ok = false;
}

var mate = rows.filter(function (r) { return r.san === 'Qxf7#'; })[0];
if (!mate || mate.cls !== 'best') {
  console.log('mate not credited:', mate && mate.cls);
  ok = false;
}

/* Coach note wording should never be empty. */
rows.forEach(function (r) {
  if (!R.note(r, 'Open Game')) { console.log('empty note for', r.san); ok = false; }
});

/* A finished position must be scored for the mover, not as the engine's 0. */
if (R.finalCp('7k/6Q1/6K1/8/8/8/8/8 b - - 0 1', 'w') !== 2000) {
  console.log('checkmate not scored as a win for the mover');
  ok = false;
}
if (R.finalCp('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1', 'w') !== 0) {
  console.log('stalemate not scored as a draw');
  ok = false;
}
if (R.finalCp('8/8/8/8/8/8/8/K6k w - - 0 1', 'w') !== null) {
  console.log('finalCp scored a position that still has moves');
  ok = false;
}

console.log(ok ? '\nall review checks passed' : '\nreview checks FAILED');
process.exit(ok ? 0 : 1);
