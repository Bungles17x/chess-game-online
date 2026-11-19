/* Gambit — a small opening book for names and book-move detection.
 * Lines are plain SAN, so the first N moves of a game can be matched directly.
 */
(function (global) {
  'use strict';

  var LINES = [
    { name: "King's Pawn Opening", moves: ['e4'] },
    { name: 'Open Game', moves: ['e4', 'e5'] },
    { name: 'King\u2019s Knight Opening', moves: ['e4', 'e5', 'Nf3'] },
    { name: 'Ruy L\u00f3pez', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'] },
    { name: 'Italian Game', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'] },
    { name: 'Giuoco Piano', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5'] },
    { name: 'Two Knights Defence', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6'] },
    { name: 'Scotch Game', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'd4'] },
    { name: 'Petrov Defence', moves: ['e4', 'e5', 'Nf3', 'Nf6'] },
    { name: 'Philidor Defence', moves: ['e4', 'e5', 'Nf3', 'd6'] },
    { name: 'Three Knights Opening', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Nc3'] },
    { name: 'Vienna Game', moves: ['e4', 'e5', 'Nc3'] },
    { name: 'King\u2019s Gambit', moves: ['e4', 'e5', 'f4'] },
    { name: 'Sicilian Defence', moves: ['e4', 'c5'] },
    { name: 'Sicilian Defence, Najdorf', moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6'] },
    { name: 'Sicilian Defence, Dragon', moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'g6'] },
    { name: 'Sicilian Defence, Closed', moves: ['e4', 'c5', 'Nc3'] },
    { name: 'Sicilian Defence, Alapin', moves: ['e4', 'c5', 'c3'] },
    { name: 'French Defence', moves: ['e4', 'e6'] },
    { name: 'French Defence, Advance', moves: ['e4', 'e6', 'd4', 'd5', 'e5'] },
    { name: 'French Defence, Winawer', moves: ['e4', 'e6', 'd4', 'd5', 'Nc3', 'Bb4'] },
    { name: 'Caro-Kann Defence', moves: ['e4', 'c6'] },
    { name: 'Caro-Kann, Advance', moves: ['e4', 'c6', 'd4', 'd5', 'e5'] },
    { name: 'Pirc Defence', moves: ['e4', 'd6', 'd4', 'Nf6', 'Nc3', 'g6'] },
    { name: 'Modern Defence', moves: ['e4', 'g6'] },
    { name: 'Scandinavian Defence', moves: ['e4', 'd5'] },
    { name: 'Alekhine Defence', moves: ['e4', 'Nf6'] },
    { name: "Queen's Pawn Opening", moves: ['d4'] },
    { name: 'Closed Game', moves: ['d4', 'd5'] },
    { name: "Queen's Gambit", moves: ['d4', 'd5', 'c4'] },
    { name: "Queen's Gambit Declined", moves: ['d4', 'd5', 'c4', 'e6'] },
    { name: "Queen's Gambit Accepted", moves: ['d4', 'd5', 'c4', 'dxc4'] },
    { name: 'Slav Defence', moves: ['d4', 'd5', 'c4', 'c6'] },
    { name: 'Semi-Slav Defence', moves: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6'] },
    { name: 'London System', moves: ['d4', 'd5', 'Nf3', 'Nf6', 'Bf4'] },
    { name: 'Indian Defence', moves: ['d4', 'Nf6'] },
    { name: 'Nimzo-Indian Defence', moves: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4'] },
    { name: "Queen's Indian Defence", moves: ['d4', 'Nf6', 'c4', 'e6', 'Nf3', 'b6'] },
    { name: "King's Indian Defence", moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6'] },
    { name: 'Gr\u00fcnfeld Defence', moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'd5'] },
    { name: 'Benoni Defence', moves: ['d4', 'Nf6', 'c4', 'c5', 'd5'] },
    { name: 'Catalan Opening', moves: ['d4', 'Nf6', 'c4', 'e6', 'g3'] },
    { name: 'Dutch Defence', moves: ['d4', 'f5'] },
    { name: 'English Opening', moves: ['c4'] },
    { name: 'English, Symmetrical', moves: ['c4', 'c5'] },
    { name: 'English, Reversed Sicilian', moves: ['c4', 'e5'] },
    { name: 'R\u00e9ti Opening', moves: ['Nf3', 'd5', 'c4'] },
    { name: "King's Indian Attack", moves: ['Nf3', 'd5', 'g3'] },
    { name: "Bird's Opening", moves: ['f4'] },
    { name: "Larsen's Opening", moves: ['b3'] },
    { name: 'Grob Opening', moves: ['g4'] }
  ];

  /* Every prefix of every line, so a move can be tagged as "book". */
  var prefixes = Object.create(null);
  (function build() {
    LINES.forEach(function (line) {
      for (var k = 1; k <= line.moves.length; k++) {
        prefixes[line.moves.slice(0, k).join(' ')] = true;
      }
    });
  })();

  function detect(sans) {
    var name = null, plies = 0, i, j;
    if (!sans || !sans.length) return { name: null, plies: 0 };
    for (i = 0; i < LINES.length; i++) {
      var line = LINES[i].moves;
      if (line.length > sans.length || line.length <= plies) continue;
      for (j = 0; j < line.length; j++) {
        if (line[j] !== sans[j]) break;
      }
      if (j === line.length) { plies = line.length; name = LINES[i].name; }
    }
    return { name: name, plies: plies };
  }

  /* Is the ply-th move (1-based) still inside known theory? */
  function isBookPly(sans, ply) {
    if (!sans || ply < 1 || ply > sans.length) return false;
    return !!prefixes[sans.slice(0, ply).join(' ')];
  }

  var api = { detect: detect, isBookPly: isBookPly, LINES: LINES };

  global.Openings = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : globalThis);
