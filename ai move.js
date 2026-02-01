 function aiMove() {
  const moves = game.moves();
  if (moves.length === 0) return;

  const move = moves[Math.floor(Math.random() * moves.length)];
  game.move(move);
  renderBoard();
  updateTurnIndicator();
}

function evaluateBoard(game) {
  // simple material evaluation
}

function minimax(game, depth, isMaximizing) {
  // recursive search
}

function aiMove() {
  const bestMove = minimax(game, 2, true);
  game.move(bestMove);
  renderBoard();
}
