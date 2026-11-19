/* Gambit — coach narration.
 * Turns engine numbers into short written summaries. Everything is generated
 * locally from the analysis we already have; no text leaves the browser.
 */
(function (global) {
  'use strict';

  function lowerFirst(s) {
    if (!s) return '';
    return s.charAt(0).toLowerCase() + s.slice(1);
  }

  function movesWord(n) {
    return n + ' move' + (n === 1 ? '' : 's');
  }

  /* o: {moves, accuracy, outcome, opening, worst:[{label,san,reason}], hanging, blunders} */
  function gameSummary(o) {
    o = o || {};
    var n = o.moves || 0;
    if (!n) return 'No moves to review yet \u2014 make a few moves and the coach will sum up the game.';

    var acc = o.accuracy == null ? null : Math.round(o.accuracy);
    var word = o.outcome === 'won' ? 'won' : o.outcome === 'lost' ? 'lost' : 'drew';
    var parts = [];

    if (n < 6) {
      parts.push('You played ' + movesWord(n) + ' and ' + word +
        (acc == null ? '.' : ', with ' + acc + '% accuracy.'));
    } else {
      parts.push('You ' + word + (o.opening ? ' a ' + o.opening + ' game' : '') + ' in ' + movesWord(n) +
        (acc == null ? '.' : ', finishing on ' + acc + '% accuracy.'));
    }

    var worst = o.worst && o.worst[0];
    if (worst) {
      parts.push('The costliest moment was ' + worst.label + ' ' + worst.san + ' \u2014 ' + lowerFirst(worst.reason));
    } else if (acc != null && acc >= 85) {
      parts.push('Nothing really hurt you \u2014 the engine agreed with almost every choice.');
    }

    if (o.hanging >= 2) {
      parts.push('Most of the damage was pieces left hanging, so build one habit: after you move, ask whether the piece you just touched is defended.');
    } else if (o.blunders >= 2) {
      parts.push('The mistakes came in bunches rather than one accident \u2014 before a capture or a check, take one extra breath and look for the reply.');
    } else if (o.opening && n > 12 && acc != null && acc < 70) {
      parts.push('You left known theory early and the position got loose; the drills in Learn sharpen the patterns that keep it tidy.');
    }

    parts.push('Next step: replay the flagged moves with Show best, then take a drill in Learn.');
    return parts.join(' ');
  }

  /* Why the engine's move is stronger than the one played. */
  function whyBetter(o) {
    o = o || {};
    if (!o.san) return '';
    if (o.purpose) {
      var swing = o.from && o.to ? ', lifting the evaluation from ' + o.from + ' to ' + o.to : '';
      return o.san + ' is better: it ' + o.purpose + swing + '.';
    }
    var edge = o.from && o.to && o.from !== o.to
      ? ', from ' + o.from + ' to ' + o.to
      : '';
    return o.san + ' keeps a slightly better evaluation' + edge + '.';
  }

  /* o: {solved, moves, par, hints}, def: drill definition */
  function drillResult(def, o) {
    o = o || {};
    if (!o.solved) {
      return 'Not solved in ' + movesWord(o.par || 0) + '. ' + (def.hint || '');
    }
    var par = o.moves <= (o.par || o.moves) ? ' inside par' : '';
    var hint = o.hints ? ' with ' + o.hints + ' hint' + (o.hints > 1 ? 's' : '') : ' with no hints';
    return 'Solved in ' + movesWord(o.moves) + par + hint + '. ' + (def.takeaway || '');
  }

  /* o: {total, solved, nextTitle, nextBrief, best:{title,moves}} */
  function learnSummary(o) {
    o = o || {};
    var total = o.total || 0;
    var solved = o.solved || 0;

    if (!solved) {
      return 'No drills solved yet. Each one is a single position with a clear goal \u2014 start with Mate in one, and the coach explains every move you try.';
    }

    var head = 'You have solved ' + solved + ' of ' + total + ' drills';
    if (o.best) head += ', best so far ' + o.best.title + ' in ' + movesWord(o.best.moves);
    head += '.';

    if (solved < total && o.nextTitle) {
      return head + ' Next up: ' + o.nextTitle + ' \u2014 ' + lowerFirst(o.nextBrief || '');
    }
    return head + ' Every drill is solved \u2014 replay them with fewer hints, then take those habits into a Coach game.';
  }

  global.Coach = {
    gameSummary: gameSummary,
    drillResult: drillResult,
    learnSummary: learnSummary,
    whyBetter: whyBetter
  };
})(typeof window !== 'undefined' ? window : globalThis);
