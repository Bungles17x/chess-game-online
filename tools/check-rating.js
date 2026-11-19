/* Checks for the local Elo maths. */
'use strict';

var path = require('path');
var R = require(path.join(__dirname, '..', 'js/rating.js'));

var failures = 0;
function check(ok, label) {
  if (ok) console.log('ok   ' + label);
  else { failures++; console.log('FAIL ' + label); }
}

check(R.START === 1200, 'new players start at 1200');
check(R.levelRating(3) === 1200, 'the club bot is rated 1200');
check(R.levelRating(1) < R.levelRating(5), 'higher levels are rated higher');
check(R.levelRating(99) === 1200, 'an unknown level falls back to the club bot');

var win = R.update(1200, 1200, 1);
check(win.delta === 16 && win.rating === 1216, 'beating an equal opponent gains 16');
var loss = R.update(1200, 1200, 0);
check(loss.delta === -16 && loss.rating === 1184, 'losing to an equal opponent costs 16');
var draw = R.update(1200, 1200, 0.5);
check(draw.delta === 0 && draw.rating === 1200, 'a draw against an equal opponent changes nothing');

var upset = R.update(1200, 1600, 1);
var expectedWin = R.update(1200, 800, 1);
check(upset.delta > 16, 'beating a stronger bot gains more than 16');
check(expectedWin.delta < 16, 'beating a weaker bot gains less than 16');
check(R.update(1200, 1600, 0).delta > -16, 'losing to a stronger bot costs less than 16');

check(Math.abs(R.expected(1400, 1200) + R.expected(1200, 1400) - 1) < 1e-9,
  'the two expected scores add up to one');
check(R.expected(1200, 1200) === 0.5, 'equal ratings expect an even score');

var floor = R.update(105, 105, 0);

check(floor.rating === R.FLOOR, 'the rating never drops below the floor');
check(R.update(1216, 1300, 1).rating > 1216, 'a win always moves the rating forward');

check(R.scoreFor('w', 'w') === 1, 'winning as white scores 1');
check(R.scoreFor('b', 'w') === 0, 'losing as white scores 0');
check(R.scoreFor('d', 'b') === 0.5, 'a draw scores a half');

check(R.band(850) === 'Newcomer', 'low ratings are called newcomers');
check(R.band(1200) === 'Club', '1200 sits in the club band');
check(R.band(2400) === 'Master', 'very high ratings are masters');
check(R.band(899) === 'Newcomer' && R.band(900) === 'Beginner', 'band edges are clean');

var spark = R.sparkPath([1200, 1216, 1200], 120, 26);
check(/^M[\d.]+,[\d.]+ L/.test(spark), 'the rating sparkline starts at a point and draws lines');
check((spark.match(/L/g) || []).length === 2, 'one line per extra rating');
check(R.sparkPath([1200], 120, 26) === '', 'a single rating has no sparkline');
check(R.sparkPath([], 120, 26) === '', 'no history means no sparkline');
check(R.sparkPath([1200, 1200], 120, 26).indexOf('L') > 0, 'a flat history still draws');
var flat = R.sparkPath([1200, 1200], 120, 26);
check(flat.split(' ')[0].split(',')[1] === flat.split(' ')[1].split(',')[1],
  'equal ratings sit on the same height');

console.log('');
if (failures) {
  console.log(failures + ' check' + (failures === 1 ? '' : 's') + ' failed');
  process.exit(1);
}
console.log('all rating checks passed');
