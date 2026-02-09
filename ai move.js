 // Simple random AI move function
function aiMove() {
  const moves = game.moves();
  if (moves.length === 0) return;

  const move = moves[Math.floor(Math.random() * moves.length)];
  game.move(move);
  renderBoard();
  updateTurnIndicator();
}

function evaluateBoard(game) {
  // Simple material evaluation
  const values = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 1000 };
  let score = 0;
  const board = game.board();

  for (let row of board) {
    for (let piece of row) {
      if (!piece) continue;
      const val = values[piece.type] || 0;
      score += piece.color === "w" ? val : -val;
    }
  }
  return score;
}

function minimax(game, depth, isMaximizing) {
  if (depth === 0 || game.game_over()) {
    return evaluateBoard(game);
  }

  const moves = game.moves();
  if (moves.length === 0) return evaluateBoard(game);

  if (isMaximizing) {
    let best = -Infinity;
    for (const move of moves) {
      game.move(move);
      const value = minimax(game, depth - 1, false);
      game.undo();
      if (value > best) best = value;
    }
    return best;
  } else {
    let best = Infinity;
    for (const move of moves) {
      game.move(move);
      const value = minimax(game, depth - 1, true);
      game.undo();
      if (value < best) best = value;
    }
    return best;
  }
}
