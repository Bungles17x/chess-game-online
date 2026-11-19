/* Checks for the achievement tracker and the endgame drills. */
'use strict';

var fs = require('fs');
var path = require('path');
var root = path.join(__dirname, '..');

require(path.join(root, 'js/engine.js'));
require(path.join(root, 'js/drills.js'));
require(path.join(root, 'js/achievements.js'));

var E = global.Engine;
var A = global.Achievements;
var D = global.Drills;

var failures = 0;

function check(ok, label) {
  if (ok) console.log('ok   ' + label);
  else { failures++; console.log('FAIL ' + label); }
}

/* ---------------- online games refuse engine help ---------------- */

var uiSource = fs.readFileSync(path.join(root, 'js/ui.js'), 'utf8');
check(/function onlineLive\(\)/.test(uiSource), 'one helper says when an online game is running');
check(/if \(onlineLive\(\)\) \{ toast\('Hints and the coach are off in online games\.'\); return; \}/.test(uiSource),
  'the hint command refuses during an online game');
check(/name === 'analysis' && onlineLive\(\)/.test(uiSource),
  'the analysis screen refuses during an online game');
check(/classList\.toggle\('locked', locked\)/.test(uiSource),
  'the coach card locks while an online game runs');
check(/b\.dataset\.screen === 'analysis' && onlineLive\(\)/.test(uiSource),
  'the analysis nav button is marked off during an online game');

/* ---------------- achievements ---------------- */

var ids = A.LIST.map(function (a) { return a.id; });
check(ids.length >= 10, 'there are at least ten achievements');
check(new Set(ids).size === ids.length, 'achievement ids are unique');
check(A.LIST.every(function (a) {
  return typeof a.test === 'function' && a.title && a.text && a.xp > 0;
}), 'each achievement has a title, text, xp and a test');

var zero = { games: 0, wins: 0, losses: 0, draws: 0, streak: 0, puzzles: 0, puzzleRating: 1200, rush: 0, drills: 0, drillsTotal: D.LIST.length, endgames: 0 };
check(A.unlocked(zero).length === 0, 'a brand-new player has no achievements');

var busy = { games: 12, wins: 7, losses: 4, draws: 1, streak: 3, puzzles: 11, puzzleRating: 1330, rush: 12, drills: 4, drillsTotal: D.LIST.length, endgames: 1 };
var got = A.unlocked(busy);
check(got.indexOf('first-game') >= 0, 'finishing games unlocks First game');
check(got.indexOf('ten-games') >= 0, 'ten games unlock Regular');
check(got.indexOf('streak-3') >= 0, 'a three-game streak unlocks On a roll');
check(got.indexOf('streak-5') < 0, 'three wins do not unlock the five-game streak');
check(got.indexOf('puzzle-1300') >= 0, 'a 1330 rating unlocks Sharp eye');
check(got.indexOf('endgame-3') < 0, 'one endgame drill does not unlock Endgame technician');

var res = A.evaluate(busy, ['first-game', 'ten-games']);
check(res.ids.length === got.length, 'evaluate returns the same unlocked set');
check(res.fresh.indexOf('first-game') < 0, 'already-seen achievements are not offered again');
check(res.fresh.indexOf('streak-3') >= 0, 'new achievements are reported once');

check(A.xpFor([]) === 0, 'no achievements means no xp');
check(A.xpFor(['first-game']) === 20, 'xp follows the achievement table');
check(A.xpFor(['first-game', 'nope']) === 20, 'unknown ids add nothing');

var l1 = A.levelFor(0);
var l2 = A.levelFor(150);
var big = A.levelFor(2000);
check(l1.level === 1 && l1.pct === 0, 'a new player sits at level 1');
check(l2.level === 2, '150 xp reaches level 2');
check(big.level > l2.level, 'more xp means a higher level');
check(l1.need > 0 && l1.into >= 0 && l1.into < l1.need, 'level progress stays inside the level');
check(A.levelFor(-5).level === 1, 'negative xp is treated as zero');

/* ---------------- endgame drills ---------------- */

var END = [
  { id: 'kqk', fen: '8/8/8/4k3/8/8/8/3QK3 w - - 0 1', color: 'w' },
  { id: 'krk', fen: '8/8/8/4k3/8/8/8/3RK3 w - - 0 1', color: 'w' },
  { id: 'twopawns', fen: '8/8/4k3/8/8/8/3PP3/4K3 w - - 0 1', color: 'w' }
];

END.forEach(function (spec) {
  var def = D.byId(spec.id);
  check(!!def, spec.id + ' is in the drill list');
  if (!def) return;
  check(def.phase === 'endgame', spec.id + ' is filed under the endgame lab');
  check(def.fen === spec.fen, spec.id + ' keeps its position');
  check(def.color === spec.color, spec.id + ' plays the right side');
  check(def.par > 1, spec.id + ' gives more than one move');

  var c = new E.Chess(def.fen);
  check(c.legalMoves().length > 0, spec.id + ' has legal moves');
  check(c.turn === def.color, spec.id + ' starts with the drill side to move');
  check(!c.inCheck(), spec.id + ' does not start in check');

  var piece = {
    kqk: { Q: 1, R: 0, P: 0 },
    krk: { Q: 0, R: 1, P: 0 },
    twopawns: { Q: 0, R: 0, P: 2 }
  }[spec.id];
  var seen = { P: 0, N: 0, B: 0, R: 0, Q: 0, K: 0 };
  var black = 0;
  for (var i = 0; i < 64; i++) {
    var p = c.board[i];
    if (!p) continue;
    if (p === p.toUpperCase()) seen[p]++;
    else black++;
  }
  check(seen.Q === piece.Q && seen.R === piece.R && seen.P === piece.P,
    spec.id + ' has the material the brief promises');
  check(seen.K === 1 && black === 1, spec.id + ' leaves the enemy a lone king');
});

check(D.LIST.filter(function (d) { return d.phase === 'endgame'; }).length === END.length,
  'exactly the three endgame drills are tagged');
check(D.LIST.filter(function (d) { return d.phase !== 'endgame'; }).length >= 6,
  'the original drills stay in the main grid');

console.log('');
if (failures) {
  console.log(failures + ' check' + (failures === 1 ? '' : 's') + ' failed');
  process.exit(1);
}
console.log('all feature checks passed');
