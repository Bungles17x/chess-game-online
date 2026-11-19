/* Gambit — achievements, XP and levels.
 * Everything is worked out from local counters, so there is no server,
 * no account and nothing to sync.
 */
(function (global) {
  'use strict';

  var LIST = [
    {
      id: 'first-game', title: 'First game', text: 'Finish a game',
      xp: 20, test: function (s) { return s.games >= 1; }
    },
    {
      id: 'first-win', title: 'First win', text: 'Win a game',
      xp: 30, test: function (s) { return s.wins >= 1; }
    },
    {
      id: 'ten-games', title: 'Regular', text: 'Save 10 games',
      xp: 40, test: function (s) { return s.games >= 10; }
    },
    {
      id: 'fifty-games', title: 'Club player', text: 'Save 50 games',
      xp: 80, test: function (s) { return s.games >= 50; }
    },
    {
      id: 'streak-3', title: 'On a roll', text: 'Win 3 games in a row',
      xp: 50, test: function (s) { return s.streak >= 3; }
    },
    {
      id: 'streak-5', title: 'Unstoppable', text: 'Win 5 games in a row',
      xp: 90, test: function (s) { return s.streak >= 5; }
    },
    {
      id: 'elo-1400', title: 'Rated', text: 'Reach a 1400 rating',
      xp: 70, test: function (s) { return s.rating >= 1400; }
    },
    {
      id: 'puzzle-10', title: 'Puzzle solver', text: 'Solve 10 puzzles',
      xp: 40, test: function (s) { return s.puzzles >= 10; }
    },
    {
      id: 'puzzle-1300', title: 'Sharp eye', text: 'Reach a 1300 puzzle rating',
      xp: 60, test: function (s) { return s.puzzleRating >= 1300; }
    },
    {
      id: 'rush-10', title: 'Rush hour', text: 'Score 10 in Puzzle Rush',
      xp: 50, test: function (s) { return s.rush >= 10; }
    },
    {
      id: 'drill-3', title: 'Student', text: 'Solve 3 drills',
      xp: 40, test: function (s) { return s.drills >= 3; }
    },
    {
      id: 'drill-all', title: 'Scholar', text: 'Solve every drill',
      xp: 120, test: function (s) { return s.drillsTotal > 0 && s.drills >= s.drillsTotal; }
    },
    {
      id: 'endgame-3', title: 'Endgame technician', text: 'Solve 3 endgame drills',
      xp: 60, test: function (s) { return s.endgames >= 3; }
    },
    {
      id: 'bookworm', title: 'Bookworm', text: 'Master 3 openings in the trainer',
      xp: 50, test: function (s) { return s.openings >= 3; }
    },
    {
      id: 'theorist', title: 'Theorist', text: 'Master 10 openings',
      xp: 90, test: function (s) { return s.openings >= 10; }
    },
    {
      id: 'quest-5', title: 'Errand runner', text: 'Complete 5 daily quests',
      xp: 40, test: function (s) { return s.quests >= 5; }
    },
    {
      id: 'daily-3', title: 'Daily habit', text: 'Finish every quest 3 days running',
      xp: 80, test: function (s) { return s.questStreak >= 3; }
    }
  ];

  function byId(id) {
    for (var i = 0; i < LIST.length; i++) if (LIST[i].id === id) return LIST[i];
    return null;
  }

  function unlocked(stats) {
    return LIST.filter(function (a) { return !!a.test(stats || {}); })
      .map(function (a) { return a.id; });
  }

  function xpFor(ids) {
    var set = Object.create(null), i;
    for (i = 0; i < (ids || []).length; i++) set[ids[i]] = true;
    var sum = 0;
    for (i = 0; i < LIST.length; i++) if (set[LIST[i].id]) sum += LIST[i].xp;
    return sum;
  }

  /* Levels need a bit more XP each time: 150, then 210, 294, 412 … */
  function levelFor(xp) {
    xp = Math.max(0, xp || 0);
    var level = 1, base = 0, need = 150;
    while (xp >= base + need) {
      base += need;
      level += 1;
      need = Math.round(need * 1.4);
    }
    return {
      level: level,
      base: base,
      need: need,
      into: xp - base,
      pct: Math.round(((xp - base) / need) * 100)
    };
  }

  /* Newly earned achievements are those in `ids` that `seen` has not recorded. */
  function evaluate(stats, seen) {
    var ids = unlocked(stats);
    var have = Object.create(null), i;
    for (i = 0; i < (seen || []).length; i++) have[seen[i]] = true;
    var fresh = ids.filter(function (id) { return !have[id]; });
    var xp = xpFor(ids);
    return { ids: ids, fresh: fresh, xp: xp, level: levelFor(xp) };
  }

  var api = {
    LIST: LIST,
    byId: byId,
    unlocked: unlocked,
    xpFor: xpFor,
    levelFor: levelFor,
    evaluate: evaluate
  };

  global.Achievements = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : globalThis);
