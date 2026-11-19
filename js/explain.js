/* Gambit — move explanations.
 * Turns a played move plus the engine's best moves into a concrete reason:
 * what the move cost, how the opponent punishes it, and what the better move
 * was doing. Pure functions, shared by the live coach and the review.
 */
(function (global) {
  'use strict';

  var E = global.Engine;
  var NAMES = { P: 'pawn', N: 'knight', B: 'bishop', R: 'rook', Q: 'queen', K: 'king' };
  var VALUES = { P: 1, N: 3, B: 3, R: 5, Q: 9, K: 0 };

  function valueOf(p) { return p ? VALUES[p.toUpperCase()] || 0 : 0; }

  function findUci(c, uci) {
    return uci ? E.fromUci(uci, c.legalMoves()) : null;
  }

  function san(c, mv) {
    return mv ? c.san(mv, c.legalMoves()) : '';
  }

  /* Centipawns from the mover's point of view, mate shown as #. */
  function evalText(cp) {
    if (cp >= 1999) return '#';
    if (cp <= -1999) return '-#';
    return (cp > 0 ? '+' : '') + (cp / 100).toFixed(1);
  }

  /* The most valuable own piece that is attacked and undefended. */
  function firstHanging(c, color) {
    var enemy = color === 'w' ? 'b' : 'w';
    var worst = null;
    for (var i = 0; i < 64; i++) {
      var p = c.board[i];
      if (!p || p.toUpperCase() === 'K') continue;
      if ((p === p.toUpperCase()) !== (color === 'w')) continue;
      if (!c.isAttacked(i, enemy) || c.isAttacked(i, color)) continue;
      if (!worst || valueOf(p) > worst.value) {
        worst = { type: p.toUpperCase(), sq: E.sqName(i), value: valueOf(p) };
      }
    }
    return worst;
  }

  /* What a move accomplishes, as a verb phrase. */
  function purpose(fen, uci) {
    var c = new E.Chess(fen);
    var mv = findUci(c, uci);
    if (!mv) return '';
    var pc = c.board[mv.from];
    if (!pc) return '';

    var t = pc.toUpperCase();
    var color = pc === pc.toUpperCase() ? 'w' : 'b';
    var bits = [];

    if (mv.castle) bits.push('castles the king out of the centre');
    if (mv.promo) bits.push('promotes to a ' + NAMES[mv.promo]);

    var cap = c.board[mv.to];
    if (cap && cap.toUpperCase() !== 'K') {
      bits.push('takes the ' + NAMES[cap.toUpperCase()] + ' on ' + E.sqName(mv.to));
    }

    var loose = firstHanging(c, color);
    var probe = new E.Chess(fen);
    probe.make(findUci(probe, uci));

    if (probe.inCheck()) bits.push(probe.legalMoves().length ? 'gives check' : 'delivers mate');
    if (loose && !firstHanging(probe, color)) {
      bits.push('saves the ' + NAMES[loose.type] + ' on ' + loose.sq);
    }

    if (!bits.length && (t === 'N' || t === 'B') && (mv.from >> 3) === (color === 'w' ? 7 : 0)) {
      bits.push('develops the ' + NAMES[t]);
    }
    if (!bits.length && t === 'P') {
      var file = mv.from & 7, toRow = mv.to >> 3;
      if ((file === 3 || file === 4) && ((color === 'w' && toRow <= 4) || (color === 'b' && toRow >= 3))) {
        bits.push('takes the centre');
      }
    }
    if (!bits.length) bits.push('keeps the pieces working together');

    return bits.join(' and ');
  }

  function capped(s) {
    if (!s) return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  /* o: {beforeFen, afterFen, playedUci, bestUci, replyUci, cls, bestCp, playedCp, book, opening} */
  function describe(o) {
    o = o || {};
    var before = new E.Chess(o.beforeFen);
    var after = new E.Chess(o.afterFen);
    var cls = o.cls || 'good';

    var played = findUci(before, o.playedUci);
    var best = findUci(before, o.bestUci);
    var reply = findUci(after, o.replyUci);

    var playedSan = san(before, played);
    var bestSan = san(before, best);
    var replySan = san(after, reply);

    if (cls === 'book') {
      return {
        text: 'Theory: ' + (o.opening ? 'this is still the ' + o.opening : 'a known line') +
          '. Nothing is decided here, so keep developing naturally.',
        topic: o.opening ? 'openings' : null
      };
    }

    if (cls === 'brilliant' || cls === 'best' || cls === 'excellent' || cls === 'good') {
      var why = purpose(o.beforeFen, o.playedUci);
      var head = cls === 'brilliant' ? 'Sound sacrifice' :
        cls === 'best' ? 'Best move' : cls === 'excellent' ? 'Almost the top move' : 'Good move';
      var text = head + (why ? ' \u2014 it ' + why : '') + '.';

      if (bestSan && playedSan && bestSan !== playedSan) {
        var bp = purpose(o.beforeFen, o.bestUci);
        text += bp && bp !== why
          ? ' The engine preferred ' + bestSan + ' because it ' + bp + '.'
          : ' The engine preferred ' + bestSan + ' by a hair.';
      }
      return { text: text, topic: why.indexOf('centre') >= 0 ? 'openings' : null };
    }

    var clauses = [];
    var mentionsBest = false;

    if (reply && after.board[reply.to] && valueOf(after.board[reply.to]) >= 3) {
      clauses.push('this loses the ' + NAMES[after.board[reply.to].toUpperCase()] + ' to ' + replySan);
    }

    var missed = best && before.board[best.to];
    var got = played && before.board[played.to];
    if (missed && valueOf(missed) >= 3 && valueOf(missed) > valueOf(got)) {
      mentionsBest = true;
      clauses.push('the stronger move was ' + bestSan + ', taking the ' +
        NAMES[missed.toUpperCase()] + ' on ' + E.sqName(best.to));
    }

    if (!clauses.length) {
      clauses.push(replySan
        ? 'the engine\u2019s answer is ' + replySan + ', and the position turns'
        : 'the position turns');
    }

    var text = clauses.map(capped).join('. ') + '.';
    if (o.bestCp != null && o.playedCp != null) {
      text += ' The evaluation drops from ' + evalText(o.bestCp) + ' to ' + evalText(o.playedCp) + '.';
    }
    if (bestSan && bestSan !== playedSan && !mentionsBest) text += ' ' + bestSan + ' was the move.';

    return { text: text, topic: 'tactics' };
  }

  global.Explain = { describe: describe, purpose: purpose, evalText: evalText };
})(typeof window !== 'undefined' ? window : globalThis);
