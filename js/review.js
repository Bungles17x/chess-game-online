/* Gambit — game review: move classification, accuracy and coach notes.
 * Everything here is computed locally from engine scores; the accuracy model
 * is our own approximation, not a reproduction of any commercial metric.
 */
(function (global) {
  'use strict';

  var E = global.Engine;
  var BIG = 2000;

  /* Logistic expected score for a side, given centipawns from its point of view. */
  function expected(cp) {
    if (cp >= BIG - 1) return 0.995;
    if (cp <= -BIG + 1) return 0.005;
    return 1 / (1 + Math.exp(-0.00368208 * cp));
  }

  /* Mover's score for a position with no legal moves: mate for the mover, or 0 for stalemate. */
  function finalCp(fen, mover) {
    var c = new E.Chess(fen);
    if (c.legalMoves().length) return null;
    return c.inCheck() ? BIG : 0;
  }

  /* Engine payload -> centipawns from white's point of view. */
  function scoreCp(info) {
    if (!info) return 0;
    if (info.mate) return info.mate > 0 ? BIG : -BIG;
    return info.score || 0;
  }

  /* 0..100 accuracy for one move, given the expected-score points it lost. */
  function accuracy(loss) {
    var v = 103.1668 * Math.exp(-0.04354 * loss) - 3.1669;
    return Math.max(0, Math.min(100, v));
  }

  /* Blend the mean with the harmonic mean so a few bad moves weigh heavily. */
  function aggregate(list) {
    if (!list || !list.length) return null;
    var sum = 0, inv = 0, i;
    for (i = 0; i < list.length; i++) {
      sum += list[i];
      inv += 1 / (list[i] + 1);
    }
    var mean = sum / list.length;
    var harmonic = list.length / inv - 1;
    return Math.max(0, Math.min(100, 0.6 * mean + 0.4 * harmonic));
  }

  function eloFor(acc) {
    if (acc == null) return null;
    return Math.round(400 + 11 * acc);
  }

  var LABELS = {
    brilliant: { sym: '!!', label: 'Brilliant' },
    best: { sym: '\u2605', label: 'Best' },
    excellent: { sym: '\u2713', label: 'Excellent' },
    good: { sym: '', label: 'Good' },
    book: { sym: '\uD83D\uDCD6', label: 'Book' },
    inaccuracy: { sym: '?!', label: 'Inaccuracy' },
    mistake: { sym: '?', label: 'Mistake' },
    blunder: { sym: '??', label: 'Blunder' }
  };

  function classify(o) {
    if (o.book) return 'book';
    if (o.brilliant) return 'brilliant';
    if (o.isBest) return 'best';
    if (o.loss < 2) return 'excellent';
    if (o.loss < 5) return 'good';
    if (o.loss < 10) return 'inaccuracy';
    if (o.loss < 18) return 'mistake';
    return 'blunder';
  }

  var VALUES = { P: 1, N: 3, B: 3, R: 5, Q: 9, K: 0 };

  function material(fen) {
    var c = new E.Chess(fen), w = 0, b = 0, i, p;
    for (i = 0; i < 64; i++) {
      p = c.board[i];
      if (!p) continue;
      if (p === p.toUpperCase()) w += VALUES[p.toUpperCase()] || 0;
      else b += VALUES[p.toUpperCase()] || 0;
    }
    return { w: w, b: b };
  }

  /* Net material the mover gave up on this move (+ = sacrifice, - = they won some). */
  function materialGiven(beforeFen, afterFen, mover) {
    var before = material(beforeFen), after = material(afterFen);
    var mine = mover === 'w' ? 'w' : 'b';
    var theirs = mover === 'w' ? 'b' : 'w';
    return (before[mine] - after[mine]) - (before[theirs] - after[theirs]);
  }

  function cap(s) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  }

  function note(entry, opening) {
    if (!entry) return 'Still analysing this move\u2026';
    var best = entry.bestSan || 'another move';
    switch (entry.cls) {
      case 'book':
        return 'A known book move' + (opening ? ' from the ' + opening + '.' : '.');
      case 'brilliant':
        return 'Brilliant \u2014 a sound sacrifice, and the engine\u2019s first choice.';
      case 'best':
        return 'Best move \u2014 the engine plays this too.';
      case 'excellent':
        return 'Excellent \u2014 nearly as strong as ' + best + '.';
      case 'good':
        return 'A solid move, though ' + best + ' was a touch more accurate.';
      case 'inaccuracy':
        return 'Inaccuracy \u2014 about ' + Math.round(entry.loss) + '% of your winning chances slip away. ' +
          cap(best) + ' was better.';
      case 'mistake':
        return 'Mistake \u2014 roughly ' + Math.round(entry.loss) + '% of your winning chances gone. ' +
          cap(best) + ' kept the position.';
      default:
        return 'Blunder \u2014 this drops about ' + Math.round(entry.loss) + '% of your winning chances. ' +
          cap(best) + ' was the move.';
    }
  }

  var api = {
    LABELS: LABELS,
    expected: expected,
    scoreCp: scoreCp,
    accuracy: accuracy,
    aggregate: aggregate,
    finalCp: finalCp,
    classify: classify,
    material: material,
    materialGiven: materialGiven,
    eloFor: eloFor,
    note: note
  };

  global.GameReview = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : globalThis);
