// Enhanced Chess AI with Minimax and Alpha-Beta Pruning
// This provides a much stronger chess playing experience

// Prevent the script from being loaded multiple times
if (window.enhancedAILoaded) {
  console.log('[Enhanced AI] Script already loaded, skipping...');
} else {
  window.enhancedAILoaded = true;

  // Piece values for evaluation
  const PIECE_VALUES = {
    'p': 100,
    'n': 320,
    'b': 330,
    'r': 500,
    'q': 900,
    'k': 20000
  };

  // Piece-Square Tables for positional evaluation
  // These encourage pieces to be in better positions
  const PST = {
    'p': [
      [0,  0,  0,  0,  0,  0,  0,  0],
      [50, 50, 50, 50, 50, 50, 50, 50],
      [10, 10, 20, 30, 30, 20, 10, 10],
      [5,  5, 10, 25, 25, 10,  5,  5],
      [0,  0,  0, 20, 20,  0,  0,  0],
      [5, -5,-10,  0,  0,-10, -5,  5],
      [5, 10, 10,-20,-20, 10, 10,  5],
      [0,  0,  0,  0,  0,  0,  0,  0]
    ],
    'n': [
      [-50,-40,-30,-30,-30,-30,-40,-50],
      [-40,-20,  0,  0,  0,  0,-20,-40],
      [-30,  0, 10, 15, 15, 10,  0,-30],
      [-30,  5, 15, 20, 20, 15,  5,-30],
      [-30,  0, 15, 20, 20, 15,  0,-30],
      [-30,  5, 10, 15, 15, 10,  5,-30],
      [-40,-20,  0,  5,  5,  0,-20,-40],
      [-50,-40,-30,-30,-30,-30,-40,-50]
    ],
    'b': [
      [-20,-10,-10,-10,-10,-10,-10,-20],
      [-10,  0,  0,  0,  0,  0,  0,-10],
      [-10,  0,  5, 10, 10,  5,  0,-10],
      [-10,  5,  5, 10, 10,  5,  5,-10],
      [-10,  0, 10, 10, 10, 10,  0,-10],
      [-10, 10, 10, 10, 10, 10, 10,-10],
      [-10,  5,  0,  0,  0,  0,  5,-10],
      [-20,-10,-10,-10,-10,-10,-10,-20]
    ],
    'r': [
      [0,  0,  0,  0,  0,  0,  0,  0],
      [5, 10, 10, 10, 10, 10, 10,  5],
      [-5,  0,  0,  0,  0,  0,  0, -5],
      [-5,  0,  0,  0,  0,  0,  0, -5],
      [-5,  0,  0,  0,  0,  0,  0, -5],
      [-5,  0,  0,  0,  0,  0,  0, -5],
      [-5,  0,  0,  0,  0,  0,  0, -5],
      [0,  0,  0,  5,  5,  0,  0,  0]
    ],
    'q': [
      [-20,-10,-10, -5, -5,-10,-10,-20],
      [-10,  0,  0,  0,  0,  0,  0,-10],
      [-10,  0,  5,  5,  5,  5,  0,-10],
      [-5,  0,  5,  5,  5,  5,  0, -5],
      [0,  0,  5,  5,  5,  5,  0, -5],
      [-10,  5,  5,  5,  5,  5,  0,-10],
      [-10,  0,  5,  0,  0,  0,  0,-10],
      [-20,-10,-10, -5, -5,-10,-10,-20]
    ],
    'k': [
      [-30,-40,-40,-50,-50,-40,-40,-30],
      [-30,-40,-40,-50,-50,-40,-40,-30],
      [-30,-40,-40,-50,-50,-40,-40,-30],
      [-30,-40,-40,-50,-50,-40,-40,-30],
      [-20,-30,-30,-40,-40,-30,-30,-20],
      [-10,-20,-20,-20,-20,-20,-20,-10],
      [20, 20,  0,  0,  0,  0, 20, 20],
      [20, 30, 10,  0,  0, 10, 30, 20]
    ]
  };

  // Evaluate board position with enhanced tactical awareness
  function evaluateBoard(game) {
    let totalEvaluation = 0;
    const board = game.board();

    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const piece = board[i][j];
        if (piece) {
          // Get piece value
          const pieceValue = PIECE_VALUES[piece.type];

          // Get positional value from piece-square table
          const row = piece.color === 'w' ? i : 7 - i;
          const col = piece.color === 'w' ? j : 7 - j;
          const positionalValue = PST[piece.type][row][col];

          // Calculate mobility bonus
          let mobilityBonus = 0;
          const moves = game.moves({ square: `${String.fromCharCode(97 + j)}${8 - i}`, verbose: true });
          mobilityBonus = moves.length * 5;

          // Calculate control of center
          let centerControl = 0;
          if ((i >= 3 && i <= 4) && (j >= 3 && j <= 4)) {
            centerControl = 15;
          }

          // Add to total (positive for white, negative for black)
          const totalPieceValue = pieceValue + positionalValue + mobilityBonus + centerControl;
          totalEvaluation += piece.color === 'w' ? totalPieceValue : -totalPieceValue;
        }
      }
    }

    // Bonus for castling
    if (game.turn() === 'w' && game.in_check()) totalEvaluation -= 20;
    if (game.turn() === 'b' && game.in_check()) totalEvaluation += 20;

    return totalEvaluation;
  }

  // Minimax with Alpha-Beta Pruning
  function minimax(game, depth, alpha, beta, isMaximizing) {
    if (depth === 0 || game.game_over()) {
      return -evaluateBoard(game); // Negative because we want black to minimize
    }

    const moves = game.moves();
    if (moves.length === 0) return -evaluateBoard(game);

    // Sort moves for better pruning (captures and checks first)
    moves.sort((a, b) => {
      // Prioritize captures
      const aCapture = a.includes('x');
      const bCapture = b.includes('x');
      if (aCapture && !bCapture) return -1;
      if (!aCapture && bCapture) return 1;
      
      // Prioritize promotions
      const aPromotion = a.includes('=');
      const bPromotion = b.includes('=');
      if (aPromotion && !bPromotion) return -1;
      if (!aPromotion && bPromotion) return 1;
      
      // Prioritize checks
      const aCheck = a.includes('+');
      const bCheck = b.includes('+');
      if (aCheck && !bCheck) return -1;
      if (!aCheck && bCheck) return 1;
      
      return 0;
    });

    if (isMaximizing) {
      let best = -Infinity;
      for (const move of moves) {
        game.move(move);
        const value = minimax(game, depth - 1, alpha, beta, false);
        game.undo();
        best = Math.max(best, value);
        alpha = Math.max(alpha, best);
        if (beta <= alpha) break; // Beta cutoff
      }
      return best;
    } else {
      let best = Infinity;
      for (const move of moves) {
        game.move(move);
        const value = minimax(game, depth - 1, alpha, beta, true);
        game.undo();
        best = Math.min(best, value);
        beta = Math.min(beta, best);
        if (beta <= alpha) break; // Alpha cutoff
      }
      return best;
    }
  }

  // Enhanced AI move function
  function enhancedAIMove(game, difficulty = 2) {
    console.log('[Enhanced AI] Making move with difficulty:', difficulty);

    const moves = game.moves();
    if (moves.length === 0) return null;

    // First, check for any captures (not just free captures)
    const board = game.board();
    for (const move of moves) {
      if (move.includes('x')) {
        // This is a capture move - use verbose moves to get full information
        const verboseMoves = game.moves({ verbose: true });
        const verboseMove = verboseMoves.find(m => m.san === move);
        
        if (verboseMove && verboseMove.captured) {
          // Get the captured piece value
          const capturedValue = PIECE_VALUES[verboseMove.captured];
          
          // Get the moving piece value
          const fromSquare = verboseMove.from;
          const col = fromSquare.charCodeAt(0) - 97;
          const row = 8 - parseInt(fromSquare[1]);
          const movingPiece = board[row][col];
          
          if (movingPiece) {
            const movingValue = PIECE_VALUES[movingPiece.type];
            
            // Capture if:
            // 1. Capturing a more valuable piece (free capture)
            // 2. Equal trade but we're ahead in material
            // 3. Pawn capturing anything (pawns are expendable)
            const isFreeCapture = capturedValue > movingValue;
            const isPawnCapture = movingPiece.type === 'p';
            
            if (isFreeCapture || isPawnCapture) {
              console.log('[Enhanced AI] Found capture:', move, 'Captured:', verboseMove.captured, 'Value:', capturedValue);
              return move;
            }
          }
        }
      }
    }

    let bestMove = null;
    let bestValue = Infinity; // AI is black, minimizing

    // Use different depth based on difficulty
    const depth = Math.min(difficulty, 2); // Cap at depth 2 for lag-free performance

    for (const move of moves) {
      game.move(move);
      const value = minimax(game, depth - 1, -Infinity, Infinity, true);
      game.undo();

      if (value < bestValue) {
        bestValue = value;
        bestMove = move;
      }
    }

    console.log('[Enhanced AI] Best move:', bestMove, 'Value:', bestValue);
    return bestMove;
  }

  // Make functions globally available
  window.enhancedAI = {
    evaluateBoard: evaluateBoard,
    minimax: minimax,
    makeMove: enhancedAIMove
  };

  console.log('[Enhanced AI] Enhanced AI system loaded successfully');
}
