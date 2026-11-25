/* Gambit — fair-play rules, shared by the server and the page.
 *
 * The server decides everything that matters (legality, clocks, results); this
 * module only scores the traffic a client produces and turns that score into a
 * warning or a ban. The page loads the same file so the ban screen can explain
 * a decision in the same words the server used.
 *
 * No dependencies, no network, no storage.
 */
(function (global) {
  'use strict';

  /* Thresholds. Deliberately generous: a fast human is not a cheater, so a ban
     needs either tampering or a lot of sustained machine-speed play. */
  var BASE = {
    windowMs: 10000,

    /* A game needs a handful of messages per move, not a hundred. */
    messagesPerWindow: 140,
    chatPerWindow: 8,
    syncPerWindow: 24,
    illegalPerWindow: 5,

    /* 16 moves in a minute, each chosen in under 170 ms from 12+ legal moves,
       is not how a person plays — even in bullet. */
    instantMoveMs: 170,
    instantMovesPerWindow: 16,
    instantWindowMs: 60000,
    instantMinLegal: 12,

    /* One finding is scored once per half minute, so a burst is one incident. */
    repeatMs: 30000,

    weight: {
      flood: 2,
      chat: 1,
      sync: 1,
      illegal: 3,
      instant: 3
    },

    /* Points, not incidents: 2 warns, 3 pauses for five minutes, 6 for an
       hour, 11 for a day and 30 is permanent. */
    warnAt: 2,
    minBanAt: 3,
    hourBanAt: 6,
    dayBanAt: 11,
    permBanAt: 30,

    minBanMs: 5 * 60 * 1000,
    hourBanMs: 60 * 60 * 1000,
    dayBanMs: 24 * 60 * 60 * 1000
  };

  var FINDINGS = {
    flood: {
      label: 'Message flooding',
      detail: 'Sent far more traffic than a game can produce.'
    },
    chat: {
      label: 'Chat spam',
      detail: 'Posted messages faster than anyone could read them.'
    },
    sync: {
      label: 'State scraping',
      detail: 'Asked the server to resend the whole game over and over.'
    },
    illegal: {
      label: 'Tampering with the board',
      detail: 'Sent moves that are not legal in the position on the board.'
    },
    instant: {
      label: 'Machine-like timing',
      detail: 'Chose many moves in a fraction of the time a person needs to read the board.'
    }
  };

  function isNum(n) { return typeof n === 'number' && isFinite(n); }

  /* A full rules object with `overrides` applied, weights included. */
  function withRules(overrides) {
    var out = {};
    var k;
    for (k in BASE) if (k !== 'weight') out[k] = BASE[k];
    out.weight = {};
    for (k in BASE.weight) out.weight[k] = BASE.weight[k];

    if (overrides) {
      for (k in overrides) {
        if (k === 'weight') {
          for (var w in overrides.weight) {
            if (isNum(overrides.weight[w])) out.weight[w] = overrides.weight[w];
          }
        } else if (k in BASE) {
          out[k] = overrides[k];
        }
      }
    }
    return out;
  }

  /* ---------------- detection ---------------- */

  /* A guard watches one connection. `note()` returns the findings that fired,
     never points and never a verdict: scoring and sentencing live in the store,
     so a reconnect cannot launder the score. */
  function createGuard(rules) {
    var R = rules || withRules();
    var buckets = { messages: [], chat: [], sync: [], illegal: [], instant: [] };

    function nowOf(info) {
      return info && isNum(info.now) ? info.now : Date.now();
    }

    function prune(list, now, span) {
      var cut = now - span;
      var i;
      for (i = list.length - 1; i >= 0; i--) if (list[i] < cut) list.splice(i, 1);
    }

    /* Push one mark and say whether the window is now over its limit. */
    function over(name, now, span, limit) {
      prune(buckets[name], now, span);
      buckets[name].push(now);
      return buckets[name].length > limit;
    }

    function note(kind, info) {
      var now = nowOf(info);
      var hit = [];

      if (kind === 'message') {
        if (over('messages', now, R.windowMs, R.messagesPerWindow)) hit.push('flood');
        return hit;
      }

      if (kind === 'chat') {
        if (over('messages', now, R.windowMs, R.messagesPerWindow)) hit.push('flood');
        if (over('chat', now, R.windowMs, R.chatPerWindow)) hit.push('chat');
        return hit;
      }

      if (kind === 'sync') {
        if (over('sync', now, R.windowMs, R.syncPerWindow)) hit.push('sync');
        return hit;
      }

      if (kind === 'illegal') {
        if (over('illegal', now, R.windowMs, R.illegalPerWindow)) hit.push('illegal');
        return hit;
      }

      if (kind === 'move') {
        var think = info && isNum(info.thinkMs) ? info.thinkMs : Infinity;
        var legal = info && isNum(info.legal) ? info.legal : 0;
        prune(buckets.instant, now, R.instantWindowMs);
        if (legal >= R.instantMinLegal && think >= 0 && think <= R.instantMoveMs) {
          buckets.instant.push(now);
          if (buckets.instant.length >= R.instantMovesPerWindow) {
            buckets.instant.length = 0;
            hit.push('instant');
          }
        }
      }

      return hit;
    }

    return {
      note: note,
      rules: R,
      /* Mostly for tests and the server's own diagnostics. */
      counts: function () {
        var out = {};
        for (var k in buckets) out[k] = buckets[k].length;
        return out;
      }
    };
  }

  /* ---------------- sentencing ---------------- */

  /* The ladder is decided by the score alone. `prior` stays in the signature
     for callers, but a ban count no longer escalates: the points do. */
  function sentence(points, prior, rules) {
    var R = rules || BASE;
    var n = Math.max(0, Number(points) || 0);

    if (n >= R.permBanAt) return { action: 'permanent', ms: 0, label: 'Permanent ban' };
    if (n >= R.dayBanAt) return { action: 'ban', ms: R.dayBanMs, label: '24-hour ban' };
    if (n >= R.hourBanAt) return { action: 'ban', ms: R.hourBanMs, label: '1-hour ban' };
    if (n >= R.minBanAt) return { action: 'ban', ms: R.minBanMs, label: '5-minute ban' };
    if (n >= R.warnAt) return { action: 'warn', ms: 0, label: 'Fair-play warning' };
    return { action: null, ms: 0, label: '' };
  }

  /* ---------------- ban records ---------------- */

  function active(ban, now) {
    if (!ban) return false;
    var t = isNum(now) ? now : Date.now();
    if (!ban.expiresAt) return true;
    return ban.expiresAt > t;
  }

  function expiresIn(ban, now) {
    if (!ban || !ban.expiresAt) return 0;
    var t = isNum(now) ? now : Date.now();
    return Math.max(0, ban.expiresAt - t);
  }

  function formatLeft(ms) {
    var s = Math.max(0, Math.round(Number(ms || 0) / 1000));
    if (s < 60) return s + ' second' + (s === 1 ? '' : 's');
    var m = Math.round(s / 60);
    if (m < 60) return m + ' minute' + (m === 1 ? '' : 's');
    var h = Math.floor(m / 60);
    var rest = m % 60;
    if (h < 48) {
      return h + ' hour' + (h === 1 ? '' : 's') + (rest ? ' ' + rest + ' min' : '');
    }
    var d = Math.round(h / 24);
    return d + ' day' + (d === 1 ? '' : 's');
  }

  /* The record a client is allowed to see: no address, no internal counters. */
  function publicBan(ban) {
    if (!ban) return null;
    return {
      id: ban.id,
      reason: ban.reason,
      reasonLabel: ban.reasonLabel,
      detail: ban.detail,
      findings: (ban.findings || []).map(function (f) {
        return { id: f.id, label: f.label, detail: f.detail, count: f.count };
      }),
      points: ban.points,
      threshold: ban.threshold,
      severity: ban.severity,
      issuedAt: ban.issuedAt,
      expiresAt: ban.expiresAt,
      strike: ban.strike,
      name: ban.name
    };
  }

  var api = {
    RULES: BASE,
    FINDINGS: FINDINGS,
    withRules: withRules,
    createGuard: createGuard,
    sentence: sentence,
    active: active,
    expiresIn: expiresIn,
    formatLeft: formatLeft,
    publicBan: publicBan
  };

  global.AntiCheat = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : globalThis);
