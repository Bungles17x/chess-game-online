/* Checks for the daily quests: stable picks, sensible progress and streaks. */
'use strict';

var path = require('path');
var root = path.join(__dirname, '..');

require(path.join(root, 'js/quests.js'));

var Q = global.Quests;

var failures = 0;

function check(ok, label) {
  if (ok) console.log('ok   ' + label);
  else { failures++; console.log('FAIL ' + label); }
}

var day = 20000;
var today = Q.forDay(day);
var again = Q.forDay(day);

check(today.length === Q.PER_DAY, 'three quests are chosen each day');
check(today.map(function (q) { return q.id; }).join() === again.map(function (q) { return q.id; }).join(),
  'the same day always gives the same quests');
check(Q.forDay(day + 1).map(function (q) { return q.id; }).join() !==
  today.map(function (q) { return q.id; }).join(), 'the next day changes at least one quest');
check(new Set(today.map(function (q) { return q.metric; })).size === today.length,
  'the three quests measure different things');
check(today.every(function (q) { return q.target > 0 && q.text; }), 'each quest has text and a target');

/* How often does each pool entry appear over a year? Nothing should be dead. */
var seen = {};
for (var d = 0; d < 365; d++) {
  Q.forDay(day + d).forEach(function (q) { seen[q.id] = (seen[q.id] || 0) + 1; });
}
check(Object.keys(seen).length === Q.POOL.length, 'every quest in the pool comes up within a year');
check(Object.keys(seen).every(function (id) { return seen[id] > 10; }), 'no quest is vanishingly rare');

var none = Q.status(day, {});
check(none.length === Q.PER_DAY && none.every(function (q) { return q.progress === 0 && !q.done; }),
  'a fresh day starts every quest at zero');

var first = today[0];
var partly = {};
partly[first.metric] = first.target - 1;
var mid = Q.status(day, partly).filter(function (q) { return q.id === first.id; })[0];
check(mid.progress === first.target - 1 && !mid.done, 'progress below the target is not done');

partly[first.metric] = first.target + 50;
var over = Q.status(day, partly).filter(function (q) { return q.id === first.id; })[0];
check(over.done && over.progress === first.target, 'progress is capped at the target');

/* apply(): rolling counters, fresh completions, all-done streak. */
var start = Q.empty(day);
var r1 = Q.apply(start, day, first.metric, first.target);
check(r1.state.day === day, 'apply keeps the day');
check(r1.state.done.indexOf(first.id) >= 0, 'meeting the target completes the quest');
check(r1.fresh.indexOf(first.id) >= 0, 'the completion is reported as fresh');
check(r1.state.total === 1, 'the lifetime total counts the finished quest');
check(!r1.allDone, 'one quest is not the whole day');

var r2 = Q.apply(r1.state, day, first.metric, 1);
check(r2.fresh.length === 0, 'a completed quest is not reported twice');
check(r2.state.total === 1, 'the lifetime total does not double count');

/* Complete the other two. */
var dayDone = r2.state;
today.slice(1).forEach(function (q) {
  dayDone = Q.apply(dayDone, day, q.metric, q.target).state;
});
check(dayDone.allDone, 'finishing all three marks the day complete');
check(dayDone.streak === 1, 'the first completed day starts a streak');

var nextDay = Q.roll(dayDone, day + 1);
check(nextDay.streak === 1 && !nextDay.allDone && Object.keys(nextDay.counts).length === 0,
  'yesterday\u2019s completed day carries the streak forward and resets counters');

var gap = Q.roll(dayDone, day + 2);
check(gap.streak === 0, 'a missed day breaks the streak');

var partial = Q.apply(Q.empty(day + 1), day + 1, 'games', 1).state;
check(Q.roll(partial, day + 2).streak === 0, 'an unfinished day does not carry a streak');

check(Q.empty(day).day === day, 'empty() stamps the day');
check(Q.roll(null, day).day === day, 'roll() copes with no saved state');

console.log('');
if (failures) {
  console.log(failures + ' check' + (failures === 1 ? '' : 's') + ' failed');
  process.exit(1);
}
console.log('all quest checks passed');
