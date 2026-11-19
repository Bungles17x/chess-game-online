/* Gambit — Learn mode drills.
 * Short, goal-driven positions played against the coach. Each drill has a
 * position, a move budget and a goal that is checked from the resulting FEN.
 */
(function (global) {
  'use strict';

  var E = global.Engine;
  var VALUES = { P: 1, N: 3, B: 3, R: 5, Q: 9, K: 0 };

  var LIST = [
    {
      id: 'mate1',
      topic: 'check',
      title: 'Mate in one',
      brief: 'The black king is boxed in by its own pawns. One check finishes it.',
      fen: '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1',
      color: 'w',
      par: 1,
      goal: { type: 'mate' },
      hint: 'Your rook belongs on the eighth rank.',
      takeaway: 'A rook on the open back rank beats a king trapped by its own pawns.'
    },
    {
      id: 'winqueen',
      topic: 'tactics',
      title: 'Win the queen',
      brief: 'A free queen is sitting on the board. Take it before it takes you.',
      fen: '4k3/8/8/3q4/8/8/8/3RK3 w - - 0 1',
      color: 'w',
      par: 1,
      goal: { type: 'material', value: 8 },
      hint: 'Check the file your rook is on.',
      takeaway: 'Checks and captures come first \u2014 scan for undefended pieces every move.'
    },
    {
      id: 'promote',
      topic: 'endgame',
      title: 'Promote the pawn',
      brief: 'Your pawn is one square from the end of the board.',
      fen: '8/P7/8/8/8/8/8/k1K5 w - - 0 1',
      color: 'w',
      par: 1,
      goal: { type: 'promote' },
      hint: 'The shortest path to a new queen is one square forward.',
      takeaway: 'A passed pawn on the seventh rank is worth more than a piece.'
    },
    {
      id: 'castle',
      topic: 'castling',
      title: 'Castle to safety',
      brief: 'Your king is still in the centre. Get it out of the way in one move.',
      fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
      color: 'w',
      par: 1,
      goal: { type: 'castle' },
      hint: 'Nothing is between your king and the h1 rook.',
      takeaway: 'Castling is a move that develops a rook and defends the king at once.'
    },
    {
      id: 'develop',
      topic: 'openings',
      title: 'Develop your army',
      brief: 'Get all four knights and bishops off the back rank within eight moves.',
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      color: 'w',
      par: 8,
      goal: { type: 'develop' },
      hint: 'Knights first, then bishops \u2014 one move each, no repeats.',
      takeaway: 'Four developing moves can finish your opening plan.'
    },
    {
      id: 'kqk',
      phase: 'endgame',
      topic: 'endgame',
      title: 'Queen mate',
      brief: 'King and queen against a lone king. Shrink the box, then mate.',
      fen: '8/8/8/4k3/8/8/8/3QK3 w - - 0 1',
      color: 'w',
      par: 12,
      goal: { type: 'mate' },
      hint: 'Take squares away one rank at a time; the queen cannot mate alone.',
      takeaway: 'King and queen mate: push the enemy king to the edge, then walk your king up.'
    },
    {
      id: 'krk',
      phase: 'endgame',
      topic: 'endgame',
      title: 'Rook mate',
      brief: 'King and rook against a lone king. Cut it off, then mate on the edge.',
      fen: '8/8/8/4k3/8/8/8/3RK3 w - - 0 1',
      color: 'w',
      par: 16,
      goal: { type: 'mate' },
      hint: 'A rook a knight-move away from the enemy king loses a tempo safely.',
      takeaway: 'King and rook mate: two kings face off and the rook checks along the edge.'
    },
    {
      id: 'twopawns',
      phase: 'endgame',
      topic: 'endgame',
      title: 'Pawns decide',
      brief: 'Two connected pawns against a king. Turn one of them into a queen.',
      fen: '8/8/4k3/8/8/8/3PP3/4K3 w - - 0 1',
      color: 'w',
      par: 14,
      goal: { type: 'promote' },
      hint: 'Push the pawn the enemy king is not attacking.',
      takeaway: 'Connected passed pawns win the race; your king shepherds them home.'
    },
    {
      id: 'queenmate',
      topic: 'check',
      title: 'Queen and king mate',
      brief: 'Your king already covers the escape squares. Find the mate.',
      fen: '7k/8/6K1/8/8/8/8/7Q w - - 0 1',
      color: 'w',
      par: 2,
      goal: { type: 'mate' },
      hint: 'Put the queen next to the enemy king, where your own king defends her.',
      takeaway: 'Queen and king mate by walking the enemy king to the edge.'
    }
  ];

  function byId(id) {
    for (var i = 0; i < LIST.length; i++) if (LIST[i].id === id) return LIST[i];
    return null;
  }

  function materialOf(fen, color) {
    var c = new E.Chess(fen), sum = 0;
    for (var i = 0; i < 64; i++) {
      var p = c.board[i];
      if (!p) continue;
      var t = p.toUpperCase();
      if ((color === 'w') !== (p === t)) continue;
      sum += VALUES[t] || 0;
    }
    return sum;
  }

  function queenCount(fen, color) {
    var c = new E.Chess(fen), n = 0;
    for (var i = 0; i < 64; i++) {
      var p = c.board[i];
      if (!p) continue;
      if (p.toUpperCase() !== 'Q') continue;
      if ((color === 'w') === (p === 'Q')) n++;
    }
    return n;
  }

  function homeMinors(fen, color) {
    var c = new E.Chess(fen);
    var row = color === 'w' ? 7 : 0, n = 0;
    for (var f = 0; f < 8; f++) {
      var p = c.board[row * 8 + f];
      if (p && (p.toUpperCase() === 'N' || p.toUpperCase() === 'B')) n++;
    }
    return n;
  }

  function castled(fen, color) {
    var c = new E.Chess(fen);
    var k = c.kings[color];
    return color === 'w' ? (k === 62 || k === 58) : (k === 6 || k === 2);
  }

  /* Has the drill goal been met in `fen`, for the side that just moved? */
  function reached(def, startFen, fen, color) {
    var g = new E.Chess(fen);
    var goal = def.goal || {};

    if (goal.type === 'mate') {
      return !g.legalMoves().length && g.inCheck() && g.turn !== color;
    }
    if (goal.type === 'material') {
      var them = color === 'w' ? 'b' : 'w';
      var now = materialOf(fen, color) - materialOf(fen, them);
      var then = materialOf(startFen, color) - materialOf(startFen, them);
      return now - then >= (goal.value || 1);
    }
    if (goal.type === 'promote') {
      return queenCount(fen, color) > queenCount(startFen, color);
    }
    if (goal.type === 'castle') {
      return castled(fen, color);
    }
    if (goal.type === 'develop') {
      return homeMinors(fen, color) === 0;
    }
    return false;
  }

  global.Drills = { LIST: LIST, byId: byId, reached: reached, materialOf: materialOf };
})(typeof window !== 'undefined' ? window : globalThis);
