/* Gambit — runs the search off the UI thread. */
'use strict';

importScripts('engine.js', 'ai.js');

self.onmessage = function (e) {
  var d = e.data || {};

  try {
    var chess = new Engine.Chess(d.fen);
    chess.trackKeys = false;

    if (d.type === 'eval') {
      var info = AI.analyze(chess, d.depth || 3);
      self.postMessage({ id: d.id, score: info.score, mate: info.mate, best: info.best });
      return;
    }

    var m = AI.pickMove(chess, d.level);
    self.postMessage({ id: d.id, move: m ? Engine.moveToUci(m) : null });
  } catch (err) {
    self.postMessage({ id: d.id, move: null, score: 0, mate: 0, best: null });
  }
};
