/* Move-generation sanity check: node tools/perft.js */
'use strict';

const E = require('../js/engine.js');

const cases = [
  { name: 'start position', fen: E.START_FEN, expect: [20, 400, 8902, 197281] },
  {
    name: 'kiwipete',
    fen: 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1',
    expect: [48, 2039, 97862]
  },
  {
    name: 'endgame',
    fen: '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1',
    expect: [14, 191, 2812, 43238]
  },
  {
    name: 'promotions/castling',
    fen: 'r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1',
    expect: [6, 264, 9467]
  },
  {
    name: 'position 4',
    fen: 'rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8',
    expect: [44, 1486, 62379]
  }
];

let failures = 0;

for (const c of cases) {
  const chess = new E.Chess(c.fen);
  for (let i = 0; i < c.expect.length; i++) {
    const depth = i + 1;
    const got = chess.perft(depth);
    const ok = got === c.expect[i];
    if (!ok) failures++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${c.name}  depth ${depth}: ${got} (expected ${c.expect[i]})`);
  }
}

console.log(failures ? `\n${failures} failure(s)` : '\nAll perft checks passed');
process.exit(failures ? 1 : 0);
