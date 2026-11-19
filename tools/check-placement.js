/* Checks the Elo placement test: the whole pool, the mate solver, the staircase
 * selection and the scoring curve.
 */
'use strict';

const path = require('path');
const Engine = require(path.join(__dirname, '..', 'js', 'engine.js'));
require(path.join(__dirname, '..', 'js', 'placement-pool.js'));
const Placement = require(path.join(__dirname, '..', 'js', 'placement.js'));

let failures = 0;

function ok(name) { console.log('ok   ' + name); }
function bad(name, extra) {
  failures += 1;
  console.log('FAIL ' + name + (extra ? ' — ' + extra : ''));
}

const POOL = Placement.POOL;
const KINDS = ['mate', 'castle', 'best'];

/* deterministic rng so a failure is reproducible */
function rng(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

/* ---- pool shape ---- */

if (POOL.length >= 30) ok('pool has ' + POOL.length + ' positions');
else bad('pool has at least 30 positions', String(POOL.length));

if (new Set(POOL.map((q) => q.id)).size === POOL.length) ok('every position has a unique id');
else bad('every position has a unique id');

const ratings = POOL.map((q) => q.rating);
const spread = Math.max(...ratings) - Math.min(...ratings);
if (spread >= 800) ok('difficulty spread is ' + spread + ' points');
else bad('difficulty spread is at least 800', String(spread));

const hardEnough = POOL.filter((q) => q.rating >= 1450).length;
if (hardEnough >= 8) ok(hardEnough + ' positions at 1450+');
else bad('at least 8 hard positions', String(hardEnough));

/* ---- every position ---- */

POOL.forEach((q) => {
  const tag = q.id;

  if (KINDS.indexOf(q.kind) >= 0) ok(tag + ': kind ' + q.kind);
  else { bad(tag + ': known kind', q.kind); return; }

  if (q.prompt && q.why) ok(tag + ': has prompt and reason');
  else bad(tag + ': has prompt and reason');

  let game;
  try { game = new Engine.Chess(q.fen); } catch (err) { bad(tag + ': loads', err.message); return; }
  if (game.turn === 'w') ok(tag + ': white to move');
  else bad(tag + ': white to move');

  const legal = game.legalMoves();
  const move = Engine.fromUci(q.answer, legal);
  if (move) ok(tag + ': answer is legal');
  else { bad(tag + ': answer is legal', q.answer); return; }

  if (q.kind === 'castle') {
    if (move.castle) ok(tag + ': answer castles');
    else bad(tag + ': answer castles');
    return;
  }

  if (q.kind === 'best') {
    if (q.effect === 'capture-queen') {
      if (game.board[move.to] === 'q') ok(tag + ': answer wins the queen');
      else bad(tag + ': answer wins the queen');
    } else if (q.effect === 'fork') {
      const after = new Engine.Chess(q.fen);
      after.make(move);
      const mover = after.board[move.to];
      const target = after.board.findIndex((p) => p === 'r' || p === 'q');
      const near = (a, b) => {
        const dr = Math.abs(Math.floor(a / 8) - Math.floor(b / 8));
        const dc = Math.abs((a % 8) - (b % 8));
        return (dr === 1 && dc === 2) || (dr === 2 && dc === 1);
      };
      if (after.inCheck() && target >= 0 && near(move.to, target) && (mover === 'N' || mover === 'n')) {
        ok(tag + ': answer forks with check');
      } else bad(tag + ': answer forks with check');
    } else {
      bad(tag + ': known effect', String(q.effect));
    }
    return;
  }

  /* mate questions: the stored answer must force mate in the promised depth */
  const depth = q.mateIn || 1;
  const probe = new Engine.Chess(q.fen);
  if (Placement.forcesMate(probe, depth)) ok(tag + ': solver finds mate in ' + depth);
  else bad(tag + ': solver finds mate in ' + depth);

  const judging = new Engine.Chess(q.fen);
  if (Placement.moveForcesMate(judging, move, depth)) {
    ok(tag + ': answer forces mate in ' + depth);
  } else {
    bad(tag + ': answer forces mate in ' + depth);
  }
});

/* ---- the solver itself ---- */

const mateInOne = new Engine.Chess('6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1');
if (Placement.forcesMate(mateInOne, 1)) ok('solver: back-rank mate found');
else bad('solver: back-rank mate found');

const noMate = new Engine.Chess(Engine.START_FEN);
if (!Placement.forcesMate(noMate, 1)) ok('solver: start position has no mate in one');
else bad('solver: start position has no mate in one');

const mateInTwo = POOL.find((q) => q.mateIn === 2);
if (mateInTwo) {
  const g = new Engine.Chess(mateInTwo.fen);
  if (Placement.forcesMate(g, 2)) ok('solver: mate in two found in ' + mateInTwo.id);
  else bad('solver: mate in two found in ' + mateInTwo.id);
}

/* ---- every winning move, not just the stored one ---- */

let multi = 0;
let maxAnswers = 0;
let answerFailures = 0;

POOL.forEach((q) => {
  const game = new Engine.Chess(q.fen);
  const moves = Placement.correctMoves(game, q);
  const ucIs = moves.map((m) => Placement.uciOf(m));
  const tag = q.id;

  if (!moves.length) { bad(tag + ': has at least one winning move'); answerFailures += 1; return; }
  if (ucIs.indexOf(q.answer) < 0) { bad(tag + ': stored answer is among the winning moves'); answerFailures += 1; }
  if (moves.length > 1) multi += 1;
  maxAnswers = Math.max(maxAnswers, moves.length);

  const depth = q.mateIn || 1;
  moves.forEach((move) => {
    const probe = new Engine.Chess(q.fen);
    const exact = probe.legalMoves().find((x) => Placement.uciOf(x) === Placement.uciOf(move));
    if (!exact) { bad(tag + ': listed move is playable'); answerFailures += 1; return; }
    probe.make(exact);

    let wins = true;
    if (q.kind === 'castle') wins = !!exact.castle;
    else if (q.kind === 'best') wins = Placement.uciOf(exact) === q.answer;
    else if (depth === 1) wins = probe.isCheckmate();
    else if (probe.isCheckmate()) wins = true;
    else {
      const replies = probe.legalMoves();
      wins = replies.length > 0 && replies.every((reply) => {
        probe.make(reply);
        const mate = Placement.forcesMate(probe, 1);
        probe.unmake();
        return mate;
      });
    }

    if (!wins) { bad(tag + ': listed move really wins (' + Placement.uciOf(exact) + ')'); answerFailures += 1; }
  });
});

if (!answerFailures) ok('all ' + POOL.length + ' positions list only real winning moves');
if (multi >= 8) ok(multi + ' positions have more than one winning move (max ' + maxAnswers + ')');
else bad('at least 8 positions have alternatives', String(multi));

const promo = POOL.find((q) => q.id === 'curated-promote-mate');
const promoMoves = Placement.correctMoves(new Engine.Chess(promo.fen), promo).map((m) => Placement.uciOf(m)).sort();
if (promoMoves.join(' ') === 'a7a8q a7a8r') ok('promotions: only the mating promotions are listed');
else bad('promotions: only the mating promotions are listed', promoMoves.join(' '));

/* the bug that started this: an underpromotion judged as if it were a queen */
const promoGame = new Engine.Chess(promo.fen);
const knightPromo = promoGame.legalMoves().find((m) => Placement.uciOf(m) === 'a7a8n');
if (knightPromo && Placement.moveWins(promoGame, knightPromo, 1) === false) {
  ok('search judges the move as played (a8=N is not a mate)');
} else {
  bad('search judges the move as played (a8=N is not a mate)');
}

/* one search, one verdict: the scan and the single-move test agree everywhere */
let disagreements = 0;
POOL.filter((q) => q.kind === 'mate').forEach((q) => {
  const board = new Engine.Chess(q.fen);
  const listed = Placement.correctMoves(new Engine.Chess(q.fen), q).map((m) => Placement.uciOf(m));
  board.legalMoves().forEach((move) => {
    if (move.promo && move.promo !== 'Q') return; /* input resolution always queens */
    const single = Placement.moveWins(new Engine.Chess(q.fen), move, q.mateIn || 1);
    if (single !== (listed.indexOf(Placement.uciOf(move)) >= 0)) disagreements += 1;
  });
});
if (!disagreements) ok('the answer scan and the single-move test give the same verdicts');
else bad('the answer scan and the single-move test agree', String(disagreements));

/* ---- the refutation shown after a miss ---- */

let refuted = 0;
let refuteProblems = 0;

POOL.filter((q) => q.kind === 'mate').forEach((q) => {
  const good = Placement.correctMoves(new Engine.Chess(q.fen), q).map((m) => Placement.uciOf(m));

  const miss = new Engine.Chess(q.fen);
  const wrong = miss.legalMoves().find((m) => good.indexOf(Placement.uciOf(m)) < 0);
  if (wrong) {
    miss.make(wrong);
    const reply = Placement.refutation(miss, q);
    const legalNow = miss.legalMoves();
    if (reply && legalNow.some((m) => m.from === reply.from && m.to === reply.to)) refuted += 1;
    else { bad(q.id + ': a miss gets a legal refutation'); refuteProblems += 1; }
  }

  const hit = new Engine.Chess(q.fen);
  const best = hit.legalMoves().find((m) => Placement.uciOf(m) === q.answer);
  if (best) {
    hit.make(best);
    if (Placement.refutation(hit, q)) { bad(q.id + ': a winning move has no refutation'); refuteProblems += 1; }
  }
});

if (!refuteProblems) ok('refutations: every miss has one, every win has none (' + refuted + ' misses)');

/* ---- staircase ---- */

function runAll(correct) {
  const run = Placement.createRun();
  const served = [];
  for (let i = 0; i < Placement.TOTAL; i++) {
    const item = Placement.pickFor(run, rng(42 + i));
    if (!item) break;
    served.push(item);
    Placement.record(run, item, correct);
  }
  return { run, served };
}

const strong = runAll(true);
const weak = runAll(false);

if (strong.served.length === Placement.TOTAL) ok('a run serves eight positions');
else bad('a run serves eight positions', String(strong.served.length));

if (new Set(strong.served.map((q) => q.id)).size === Placement.TOTAL) ok('no position repeats inside a run');
else bad('no position repeats inside a run');

const mean = (list) => list.reduce((sum, q) => sum + q.rating, 0) / list.length;
const strongMean = mean(strong.served);
const weakMean = mean(weak.served);

if (strong.run.target === Placement.HIGH) ok('solving everything pushes the target to the top (' + strong.run.target + ')');
else bad('solving everything pushes the target to the top', String(strong.run.target));

if (weak.run.target === Placement.LOW) ok('missing everything pushes the target to the floor (' + weak.run.target + ')');
else bad('missing everything pushes the target to the floor', String(weak.run.target));

if (strongMean > weakMean + 300) {
  ok('a strong run is served harder positions (' + Math.round(weakMean) + ' vs ' + Math.round(strongMean) + ')');
} else {
  bad('a strong run is served harder positions', Math.round(weakMean) + ' vs ' + Math.round(strongMean));
}

/* two runs with different seeds should not serve the same paper */
const a = runAll(true).served.map((q) => q.id).join(',');
const b = (function () {
  const run = Placement.createRun();
  const ids = [];
  for (let i = 0; i < Placement.TOTAL; i++) ids.push(Placement.pickFor(run, rng(7 + i * 13)).id);
  return ids.join(',');
})();
if (a !== b) ok('different seeds serve a different paper');
else bad('different seeds serve a different paper');

/* ---- scoring ---- */

const perfect = Placement.estimate(strong.run.results);
const worst = Placement.estimate(weak.run.results);

if (perfect >= 1600 && perfect <= Placement.MAX) ok('perfect run scores ' + perfect);
else bad('perfect run scores 1600..' + Placement.MAX, String(perfect));

if (worst === Placement.FLOOR) ok('all missed = ' + Placement.FLOOR);
else bad('all missed = ' + Placement.FLOOR, String(worst));

if (Placement.estimate([]) === Placement.MIN) ok('no answers = ' + Placement.MIN);
else bad('no answers = ' + Placement.MIN);

/* clearing only easy positions must not match clearing hard ones */
const easyOnly = Placement.estimate(POOL.filter((q) => q.rating <= 1000).slice(0, 8)
  .map((q) => ({ rating: q.rating, correct: true })));
const hardOnly = Placement.estimate(POOL.filter((q) => q.rating >= 1500).slice(0, 8)
  .map((q) => ({ rating: q.rating, correct: true })));
if (hardOnly > easyOnly) ok('hard positions score higher (' + easyOnly + ' vs ' + hardOnly + ')');
else bad('hard positions score higher', easyOnly + ' vs ' + hardOnly);

/* one more correct answer can never score lower */
let previous = -1;
let monotonic = true;
for (let n = 0; n <= Placement.TOTAL; n++) {
  const results = strong.run.results.map((r, i) => ({ rating: r.rating, correct: i < n }));
  const elo = Placement.estimate(results);
  if (elo < previous) monotonic = false;
  previous = elo;
}
if (monotonic) ok('more solved positions never lower the rating');
else bad('more solved positions never lower the rating');

if (Placement.correctCount(strong.run.results) === Placement.TOTAL) ok('correctCount counts the run');
else bad('correctCount counts the run');

if (failures) {
  console.log('\n' + failures + ' placement check(s) failed');
  process.exit(1);
}
console.log('\nall placement checks passed');
