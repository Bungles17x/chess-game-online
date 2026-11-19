/* Gambit — game results are stored as a code ('w' | 'b' | 'd') plus a reason.
 * Display text is derived from those, never parsed back out of it.
 */
(function (global) {
  'use strict';

  var SUB = {
    time: 'on time',
    'timeout-material': 'time out with no mating material',
    'fifty-move rule': 'by the fifty-move rule'
  };

  function title(code) {
    return code === 'w' ? 'White wins' : code === 'b' ? 'Black wins' : 'Draw';
  }

  function sub(code, reason) {
    if (code === 'd' && !reason) return 'by agreement';
    return SUB[reason] || ('by ' + (reason || 'unknown'));
  }

  function text(code, reason) {
    return { title: title(code), sub: sub(code, reason) };
  }

  function pgn(code) {
    return code === 'w' ? '1-0' : code === 'b' ? '0-1' : '1/2-1/2';
  }

  var api = { text: text, title: title, sub: sub, pgn: pgn };

  global.Results = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : globalThis);
