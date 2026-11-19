/* Gambit — local Elo rating.
 * Bot games move your rating with the standard Elo formula; the opponent's
 * rating comes from the bot's level. Nothing leaves the browser.
 */
(function (global) {
  'use strict';

  var START = 1200;
  var K = 32;
  var FLOOR = 100;
  var LEVELS = { 1: 700, 2: 900, 3: 1200, 4: 1500, 5: 1800 };

  /* Probability that `player` scores against `opponent`. */
  function expected(player, opponent) {
    return 1 / (1 + Math.pow(10, (opponent - player) / 400));
  }

  /* New rating and the points gained or lost. */
  function update(rating, opponent, score) {
    var from = typeof rating === 'number' ? Math.round(rating) : START;
    var delta = Math.round(K * (score - expected(from, opponent)));
    var next = Math.max(FLOOR, from + delta);
    return { rating: next, delta: next - from };
  }

  /* 1 for a win, 0.5 for a draw, 0 for a loss — from your colour. */
  function scoreFor(code, color) {
    if (!code || code === 'd') return 0.5;
    return code === color ? 1 : 0;
  }

  function levelRating(level) {
    return LEVELS[level] || LEVELS[3];
  }

  /* SVG path for a small sparkline of rating values. */
  function sparkPath(values, width, height) {
    var list = (values || []).filter(function (v) { return typeof v === 'number' && isFinite(v); });
    if (list.length < 2) return '';

    var pad = 2;
    var w = (width || 120) - pad * 2;
    var h = (height || 26) - pad * 2;
    var min = Math.min.apply(null, list);
    var max = Math.max.apply(null, list);
    var span = max - min || 1;

    return list.map(function (v, i) {
      var x = pad + (i / (list.length - 1)) * w;
      var y = pad + h - ((v - min) / span) * h;
      return (i ? 'L' : 'M') + x.toFixed(2) + ',' + y.toFixed(2);
    }).join(' ');
  }

  function band(rating) {
    var r = typeof rating === 'number' ? rating : START;
    if (r < 900) return 'Newcomer';
    if (r < 1100) return 'Beginner';
    if (r < 1300) return 'Club';
    if (r < 1500) return 'Strong club';
    if (r < 1700) return 'Tournament';
    if (r < 1900) return 'Expert';
    return 'Master';
  }

  var api = {
    START: START,
    K: K,
    FLOOR: FLOOR,
    LEVELS: LEVELS,
    expected: expected,
    update: update,
    scoreFor: scoreFor,
    levelRating: levelRating,
    band: band,
    sparkPath: sparkPath
  };

  global.Ratings = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : globalThis);
