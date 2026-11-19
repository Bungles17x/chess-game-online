/* Checks for the opening trainer: every line must be legal SAN from the start,
 * and the multiple-choice options must include the answer and stay stable. */
'use strict';

var path = require('path');
var root = path.join(__dirname, '..');

require(path.join(root, 'js/engine.js'));
require(path.join(root, 'js/trainer.js'));

var E = global.Engine;
var T = global.Trainer;

var failures = 0;

function check(ok, label) {
  if (ok) console.log('ok   ' + label);
  else { failures++; console.log('FAIL ' + label); }
}

var ids = T.LINES.map(function (l) { return l.id; });
check(T.LINES.length >= 15, 'the trainer ships at least fifteen lines');
check(new Set(ids).size === ids.length, 'line ids are unique');
check(T.LINES.every(function (l) { return l.name && l.idea && l.moves.length >= 2; }),
  'every line has a name, an idea and at least two moves');
check(T.LINES.every(function (l) { return typeof l.eco === 'string'; }),
  'every line carries an ECO code');

/* Replay every line; SAN must be legal and the move count must agree. */
T.LINES.forEach(function (line) {
  var game = new E.Chess();
  var ok = true;
  var at = -1;
  for (var i = 0; i < line.moves.length; i++) {
    var legal = game.legalMoves();
    var want = line.moves[i];
    var found = null;
    for (var j = 0; j < legal.length; j++) {
      if (game.san(legal[j], legal) === want) { found = legal[j]; break; }
    }
    if (!found) { ok = false; at = i; break; }
    game.make(found);
  }
  check(ok, line.id + ' is legal' + (ok ? '' : ' (failed at ply ' + (at + 1) + ': ' + line.moves[at] + ')'));
  check(game.turn === (line.moves.length % 2 === 0 ? 'w' : 'b'),
    line.id + ' ends with the right side to move');
});

/* Questions: four unique legal choices, always containing the book move. */
var italian = T.byId('italian');
var probe = new E.Chess();
var legalSans = probe.legalMoves().map(function (m) { return probe.san(m); });
var seed = T.seedOf(italian.id + ':0');
var opts = T.options(legalSans, 'e4', seed);
check(opts.length === 4, 'a question offers four choices');
check(opts.indexOf('e4') >= 0, 'the book move is one of the choices');
check(new Set(opts).size === opts.length, 'no duplicate choices');
check(opts.every(function (s) { return legalSans.indexOf(s) >= 0; }), 'every choice is a legal move');
check(T.options(legalSans, 'e4', seed).join(',') === opts.join(','), 'choices are stable for the same seed');
check(T.options(legalSans, 'e4', T.seedOf(italian.id + ':1')).join(',') !== opts.join(','),
  'a different ply can offer a different set');

/* A position with only two legal moves still asks a sane question. */
var cramped = new E.Chess('7k/8/8/8/8/8/6q1/7K w - - 0 1');
var crampedSans = cramped.legalMoves().map(function (m) { return cramped.san(m); });
var small = T.options(crampedSans, crampedSans[0], 7);
check(small.length === crampedSans.length, 'tiny positions offer only their legal moves');
check(small.indexOf(crampedSans[0]) >= 0, 'the answer survives a tiny position');

check(T.known(italian, 0) === 0 && T.known(italian, 99) === italian.moves.length,
  'known() clamps to the line length');
check(T.byId('nope') === null, 'an unknown id returns null');

console.log('');
if (failures) {
  console.log(failures + ' check' + (failures === 1 ? '' : 's') + ' failed');
  process.exit(1);
}
console.log('all trainer checks passed');
