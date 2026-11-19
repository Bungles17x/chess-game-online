/* Gambit — non-standard win conditions (King of the Hill, Three-check). */
(function (global) {
  'use strict';

  /* d4, e4, d5, e5 */
  var CENTER = { 27: true, 28: true, 35: true, 36: true };

  function isCenter(sq) { return !!CENTER[sq]; }

  function winFor(color, reason) {
    return { code: color, reason: reason };
  }

  /* Call after a move has been made. Mutates `checks` for three-check. */
  function afterMove(chess, mover, variant, checks) {
    if (variant === 'koth' && isCenter(chess.kings[mover])) {
      return winFor(mover, 'king of the hill');
    }
    if (variant === 'threecheck' && chess.inCheck()) {
      var n = (checks[mover] || 0) + 1;
      checks[mover] = n;
      if (n >= 3) return winFor(mover, 'three checks');
    }
    return null;
  }

  var api = { isCenter: isCenter, afterMove: afterMove };

  global.Variants = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : globalThis);
