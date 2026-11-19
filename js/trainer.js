/* Gambit — opening trainer.
 * A short, hand-written book of main lines. The trainer asks for the next book
 * move at each ply and explains the idea; everything runs in the browser and
 * every line is checked against the real move generator by tools/check-trainer.
 */
(function (global) {
  'use strict';

  var LINES = [
    {
      id: 'italian', name: 'Italian Game', eco: 'C50',
      moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'],
      idea: 'The bishop aims at f7, the weakest square in Black\u2019s camp, and White is ready to castle.'
    },
    {
      id: 'ruy', name: 'Ruy L\u00f3pez', eco: 'C60',
      moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'],
      idea: 'The bishop pressures the knight that defends e5, so White can win the centre pawn back later.'
    },
    {
      id: 'scotch', name: 'Scotch Game', eco: 'C45',
      moves: ['e4', 'e5', 'Nf3', 'Nc6', 'd4'],
      idea: 'White opens the centre immediately, accepting an early queen sortie in exchange for active pieces.'
    },
    {
      id: 'vienna', name: 'Vienna Game', eco: 'C25',
      moves: ['e4', 'e5', 'Nc3'],
      idea: 'The knight supports e4 and prepares f4 \u2014 a King\u2019s Gambit with the knight already developed.'
    },
    {
      id: 'sicilian', name: 'Sicilian Defence', eco: 'B20',
      moves: ['e4', 'c5'],
      idea: 'Black trades a wing pawn for a centre pawn, then attacks the centre with pieces and queenside play.'
    },
    {
      id: 'najdorf', name: 'Sicilian, Najdorf', eco: 'B90',
      moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6'],
      idea: 'a6 controls b5 so the knight can settle on c6 later, and prepares ...e5 or ...b5.'
    },
    {
      id: 'dragon', name: 'Sicilian, Dragon', eco: 'B70',
      moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'g6'],
      idea: 'The bishop goes to g7 and rakes the long diagonal, aiming at White\u2019s queenside.'
    },
    {
      id: 'french', name: 'French Defence', eco: 'C00',
      moves: ['e4', 'e6'],
      idea: 'Black prepares ...d5 to hit e4. The price is a locked-in light-squared bishop.'
    },
    {
      id: 'french-advance', name: 'French, Advance', eco: 'C02',
      moves: ['e4', 'e6', 'd4', 'd5', 'e5'],
      idea: 'White gains space and fixes the centre, then plays against the pawn chain\u2019s base on d4\u2026 from Black\u2019s side.'
    },
    {
      id: 'caro', name: 'Caro-Kann Defence', eco: 'B10',
      moves: ['e4', 'c6'],
      idea: 'Black supports ...d5 with a pawn, keeping the light-squared bishop free \u2014 solider than the French.'
    },
    {
      id: 'scandi', name: 'Scandinavian Defence', eco: 'B01',
      moves: ['e4', 'd5'],
      idea: 'Black challenges e4 at once. After exd5 the queen recaptures and must be careful not to get chased.'
    },
    {
      id: 'qg', name: 'Queen\u2019s Gambit', eco: 'D06',
      moves: ['d4', 'd5', 'c4'],
      idea: 'White offers a wing pawn to deflect the d5 pawn and dominate the centre with the queen\u2019s bishop.'
    },
    {
      id: 'qgd', name: 'Queen\u2019s Gambit Declined', eco: 'D30',
      moves: ['d4', 'd5', 'c4', 'e6'],
      idea: 'Black keeps the centre intact and frees the dark-squared bishop. Solid, but the c8 bishop needs a plan.'
    },
    {
      id: 'slav', name: 'Slav Defence', eco: 'D10',
      moves: ['d4', 'd5', 'c4', 'c6'],
      idea: 'c6 defends d5 and keeps the c8 bishop\u2019s diagonal open; Black can develop it before ...e6.'
    },
    {
      id: 'london', name: 'London System', eco: 'D02',
      moves: ['d4', 'd5', 'Nf3', 'Nf6', 'Bf4'],
      idea: 'A setup rather than a line: bishop outside the pawn chain, e3, c3, and a kingside attack.'
    },
    {
      id: 'kid', name: 'King\u2019s Indian Defence', eco: 'E60',
      moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6'],
      idea: 'Black concedes space, then strikes at the centre with ...e5 or ...c5 and a kingside pawn storm.'
    },
    {
      id: 'nimzo', name: 'Nimzo-Indian Defence', eco: 'E20',
      moves: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4'],
      idea: 'The bishop pins the knight and fights for e4; Black often doubles White\u2019s pawns with ...Bxc3.'
    },
    {
      id: 'english', name: 'English Opening', eco: 'A10',
      moves: ['c4', 'e5', 'Nc3', 'Nf6'],
      idea: 'A Sicilian with colours reversed: White controls d5 from the flank and keeps flexible pawn play.'
    },
    {
      id: 'reti', name: 'R\u00e9ti Opening', eco: 'A09',
      moves: ['Nf3', 'd5', 'c4'],
      idea: 'White attacks d5 from the flank instead of occupying the centre, inviting Black to overextend.'
    },
    {
      id: 'kings-gambit', name: 'King\u2019s Gambit', eco: 'C30',
      moves: ['e4', 'e5', 'f4'],
      idea: 'White offers the f-pawn to drag the e5 pawn away and build a broad centre with d4.'
    }
  ];

  function byId(id) {
    for (var i = 0; i < LINES.length; i++) if (LINES[i].id === id) return LINES[i];
    return null;
  }

  /* FNV-1a over a short string, so a question always looks the same. */
  function seedOf(text) {
    var h = 2166136261;
    text = String(text || '');
    for (var i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  /* mulberry32: a tiny deterministic generator. */
  function seeded(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffle(list, rnd) {
    var out = list.slice();
    for (var i = out.length - 1; i > 0; i--) {
      var j = Math.floor(rnd() * (i + 1));
      var tmp = out[i];
      out[i] = out[j];
      out[j] = tmp;
    }
    return out;
  }

  /* Four choices for the position: the book move plus three legal decoys.
   * The order is stable for the same line, ply and position. */
  function options(legalSans, answer, seed) {
    var pool = (legalSans || []).filter(function (s, i, all) {
      return s !== answer && all.indexOf(s) === i;
    });
    var rnd = seeded(typeof seed === 'number' ? seed : seedOf(String(seed)));
    var picks = [answer].concat(shuffle(pool, rnd).slice(0, 3));
    return shuffle(picks, seeded((typeof seed === 'number' ? seed : seedOf(String(seed))) ^ 0x9e3779b9));
  }

  /* How many plies of this line are already known to the opening book. */
  function known(line, at) {
    return Math.max(0, Math.min(line.moves.length, at || 0));
  }

  var api = {
    LINES: LINES,
    byId: byId,
    seedOf: seedOf,
    seeded: seeded,
    options: options,
    known: known
  };

  global.Trainer = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : globalThis);
