/* Gambit — daily quests.
 * Three small goals per day, chosen deterministically from local counters.
 * No server, no clock assumptions beyond the calendar day number.
 */
(function (global) {
  'use strict';

  var POOL = [
    { id: 'play-game', text: 'Play one game', metric: 'games', target: 1 },
    { id: 'win-game', text: 'Win a game', metric: 'wins', target: 1 },
    { id: 'puzzles-3', text: 'Solve three puzzles', metric: 'puzzles', target: 3 },
    { id: 'puzzles-5', text: 'Solve five puzzles', metric: 'puzzles', target: 5 },
    { id: 'moves-30', text: 'Make 30 of your own moves', metric: 'moves', target: 30 },
    { id: 'moves-60', text: 'Make 60 of your own moves', metric: 'moves', target: 60 },
    { id: 'drill-1', text: 'Solve a Learn drill', metric: 'drills', target: 1 },
    { id: 'drill-2', text: 'Solve two Learn drills', metric: 'drills', target: 2 }
  ];

  var PER_DAY = 3;

  function seedOf(n) {
    /* A cheap integer avalanche so neighbouring days look unrelated. */
    var x = (n * 2654435761) >>> 0;
    x ^= x >>> 16;
    x = Math.imul(x, 2246822507) >>> 0;
    x ^= x >>> 13;
    return x >>> 0;
  }

  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* Three quests for the day, each measuring a different thing. */
  function forDay(day) {
    var pick = rng(seedOf(day || 0));
    var rest = POOL.slice();
    for (var i = rest.length - 1; i > 0; i--) {
      var j = Math.floor(pick() * (i + 1));
      var tmp = rest[i];
      rest[i] = rest[j];
      rest[j] = tmp;
    }

    var chosen = [], used = {};
    for (i = 0; i < rest.length && chosen.length < PER_DAY; i++) {
      if (used[rest[i].metric]) continue;
      used[rest[i].metric] = true;
      chosen.push(rest[i]);
    }
    return chosen;
  }

  function progress(quest, counts) {
    var n = Math.max(0, Math.round((counts && counts[quest.metric]) || 0));
    return Math.min(quest.target, n);
  }

  function status(day, counts) {
    return forDay(day).map(function (q) {
      var have = progress(q, counts || {});
      return {
        id: q.id,
        text: q.text,
        metric: q.metric,
        target: q.target,
        progress: have,
        done: have >= q.target
      };
    });
  }

  function empty(day) {
    return { day: day || 0, counts: {}, done: [], allDone: false, streak: 0, total: 0 };
  }

  /* Move stored state onto `day`, keeping a completed streak only when the
   * previous day was also fully completed. */
  function roll(state, day) {
    var s = state || empty(day);
    if (!s.day) return { day: day, counts: {}, done: [], allDone: false, streak: 0, total: s.total || 0 };
    if (s.day === day) return s;
    var carry = s.allDone && s.day === day - 1 ? (s.streak || 0) : 0;
    return { day: day, counts: {}, done: [], allDone: false, streak: carry, total: s.total || 0 };
  }

  /* Add to a counter. Returns the new state plus which quests just finished. */
  function apply(state, day, metric, n) {
    var s = roll(state, day);
    var counts = {};
    Object.keys(s.counts || {}).forEach(function (k) { counts[k] = s.counts[k]; });
    counts[metric] = (counts[metric] || 0) + (n == null ? 1 : n);

    var list = status(day, counts);
    var done = list.filter(function (q) { return q.done; }).map(function (q) { return q.id; });
    var fresh = done.filter(function (id) { return (s.done || []).indexOf(id) < 0; });
    var allDone = done.length === list.length;
    var streak = s.streak || 0;
    if (allDone && !s.allDone) streak += 1;

    return {
      state: {
        day: day,
        counts: counts,
        done: done,
        allDone: allDone,
        streak: streak,
        total: (s.total || 0) + fresh.length
      },
      fresh: fresh,
      allDone: allDone && !s.allDone
    };
  }

  var api = {
    POOL: POOL,
    PER_DAY: PER_DAY,
    forDay: forDay,
    status: status,
    progress: progress,
    empty: empty,
    roll: roll,
    apply: apply
  };

  global.Quests = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : globalThis);
