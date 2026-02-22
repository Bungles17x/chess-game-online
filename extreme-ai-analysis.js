// Extreme AI Analysis System
// Advanced chess analysis with machine learning-inspired features

// ============================================
// QUANTUM-INSPIRED MOVE EVALUATION
// ============================================

class QuantumMoveEvaluator {
  constructor() {
    this.positionHistory = new Map();
    this.patternDatabase = new Map();
    this.learningRate = 0.1;
    this.explorationRate = 0.2;
  }

  evaluatePosition(game, depth = 3) {
    const evaluation = {
      material: this.evaluateMaterial(game),
      position: this.evaluatePositionAdvantage(game),
      mobility: this.evaluateMobility(game),
      safety: this.evaluateKingSafety(game),
      development: this.evaluateDevelopment(game),
      pawnStructure: this.evaluatePawnStructure(game),
      tactical: this.evaluateTacticalElements(game),
      endgame: this.evaluateEndgame(game)
    };

    const totalScore = Object.values(evaluation).reduce((sum, val) => sum + val, 0);

    return {
      ...evaluation,
      totalScore,
      confidence: this.calculateConfidence(game, depth),
      bestMove: this.findBestMove(game, depth),
      suggestedMoves: this.getSuggestedMoves(game, 5),
      criticalPositions: this.findCriticalPositions(game)
    };
  }

  evaluateMaterial(game) {
    const board = game.board();
    const pieceValues = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };
    let score = 0;

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (piece) {
          const value = pieceValues[piece.type];
          score += piece.color === 'w' ? value : -value;
        }
      }
    }

    return score;
  }
n  
  evaluatePositionAdvantage(game) {
    const board = game.board();
    const positionBonus = [
      [0, 0, 0, 0, 0, 0, 0, 0],
      [5, 5, 5, 5, 5, 5, 5, 5],
      [1, 1, 2, 3, 3, 2, 1, 1],
      [0.5, 0.5, 1, 2.5, 2.5, 1, 0.5, 0.5],
      [0, 0, 0, 2, 2, 0, 0, 0],
      [0.5, -0.5, -1, 0, 0, -1, -0.5, 0.5],
      [0.5, 1, 1, -2, -2, 1, 1, 0.5],
      [0, 0, 0, 0, 0, 0, 0, 0]
    ];

    let score = 0;
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (piece && piece.type === 'p') {
          const bonus = piece.color === 'w' 
            ? positionBonus[row][col] 
            : positionBonus[7 - row][col];
          score += piece.color === 'w' ? bonus : -bonus;
        }
      }
    }

    return score * 10;
  }

  evaluateMobility(game) {
    const moves = game.moves({ verbose: true });
    const whiteMoves = moves.filter(m => m.color === 'w').length;
    const blackMoves = moves.filter(m => m.color === 'b').length;

    return (whiteMoves - blackMoves) * 5;
  }

  evaluateKingSafety(game) {
    const board = game.board();
    let whiteKingSafety = 0;
    let blackKingSafety = 0;

    // Find kings
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (piece && piece.type === 'k') {
          // Check pawn shield
          const pawnShield = this.evaluatePawnShield(game, row, col, piece.color);
          // Check for open files
          const openFile = this.evaluateOpenFiles(game, col);
          // Check for piece attacks
          const attacks = this.evaluateKingAttacks(game, row, col, piece.color);

          const safety = pawnShield + openFile + attacks;
          if (piece.color === 'w') {
            whiteKingSafety = safety;
          } else {
            blackKingSafety = safety;
          }
        }
      }
    }

    return whiteKingSafety - blackKingSafety;
  }

  evaluatePawnShield(game, kingRow, kingCol, color) {
    const board = game.board();
    const direction = color === 'w' ? 1 : -1;
    const pawnRow = kingRow + direction;
    let shield = 0;

    for (let col = kingCol - 1; col <= kingCol + 1; col++) {
      if (col >= 0 && col < 8 && pawnRow >= 0 && pawnRow < 8) {
        const piece = board[pawnRow][col];
        if (piece && piece.type === 'p' && piece.color === color) {
          shield += 10;
        }
      }
    }

    return shield;
  }

  evaluateOpenFiles(game, col) {
    const board = game.board();
    let hasWhitePawn = false;
    let hasBlackPawn = false;

    for (let row = 0; row < 8; row++) {
      const piece = board[row][col];
      if (piece && piece.type === 'p') {
        if (piece.color === 'w') hasWhitePawn = true;
        if (piece.color === 'b') hasBlackPawn = true;
      }
    }

    // Open file is bad for king safety
    return (!hasWhitePawn || !hasBlackPawn) ? -15 : 0;
  }

  evaluateKingAttacks(game, kingRow, kingCol, color) {
    const attacks = game.moves({ 
      square: `${String.fromCharCode(97 + kingCol)}${8 - kingRow}`,
      verbose: true 
    });

    // Count attacks by opponent
    const opponentAttacks = attacks.filter(m => m.color !== color).length;
    return -opponentAttacks * 5;
  }

  evaluateDevelopment(game) {
    const board = game.board();
    let whiteDevelopment = 0;
    let blackDevelopment = 0;

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (piece && (piece.type === 'n' || piece.type === 'b')) {
          const homeRank = piece.color === 'w' ? 0 : 7;
          if (row !== homeRank) {
            if (piece.color === 'w') whiteDevelopment += 10;
            else blackDevelopment += 10;
          }
        }
      }
    }

    return whiteDevelopment - blackDevelopment;
  }

  evaluatePawnStructure(game) {
    const board = game.board();
    let score = 0;

    // Evaluate doubled pawns
    const whitePawns = new Set();
    const blackPawns = new Set();

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (piece && piece.type === 'p') {
          if (piece.color === 'w') {
            if (whitePawns.has(col)) score -= 10; // Doubled pawn
            whitePawns.add(col);
          } else {
            if (blackPawns.has(col)) score += 10; // Doubled pawn for opponent
            blackPawns.add(col);
          }
        }
      }
    }

    // Evaluate isolated pawns
    for (let col = 0; col < 8; col++) {
      if (whitePawns.has(col) && 
          !whitePawns.has(col - 1) && 
          !whitePawns.has(col + 1)) {
        score -= 15; // Isolated pawn
      }
      if (blackPawns.has(col) && 
          !blackPawns.has(col - 1) && 
          !blackPawns.has(col + 1)) {
        score += 15; // Opponent isolated pawn
      }
    }

    return score;
  }

  evaluateTacticalElements(game) {
    const moves = game.moves({ verbose: true });
    let score = 0;

    // Evaluate captures
    const captures = moves.filter(m => m.captured);
    const whiteCaptures = captures.filter(m => m.color === 'w');
    const blackCaptures = captures.filter(m => m.color === 'b');

    score += whiteCaptures.length * 5;
    score -= blackCaptures.length * 5;

    // Evaluate checks
    const checks = moves.filter(m => m.san.includes('+'));
    const whiteChecks = checks.filter(m => m.color === 'w');
    const blackChecks = checks.filter(m => m.color === 'b');

    score += whiteChecks.length * 10;
    score -= blackChecks.length * 10;

    return score;
  }

  evaluateEndgame(game) {
    const board = game.board();
    let pieceCount = 0;

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        if (board[row][col]) pieceCount++;
      }
    }

    // Endgame evaluation
    if (pieceCount <= 10) {
      return this.evaluateKingActivity(game) + 
             this.evaluatePassedPawns(game) +
             this.evaluateOpposition(game);
    }

    return 0;
  }

  evaluateKingActivity(game) {
    const board = game.board();
    let whiteKingActivity = 0;
    let blackKingActivity = 0;

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (piece && piece.type === 'k') {
          // King in center is good in endgame
          const centerBonus = (4 - Math.abs(3.5 - row)) + (4 - Math.abs(3.5 - col));
          if (piece.color === 'w') {
            whiteKingActivity = centerBonus * 5;
          } else {
            blackKingActivity = centerBonus * 5;
          }
        }
      }
    }

    return whiteKingActivity - blackKingActivity;
  }

  evaluatePassedPawns(game) {
    const board = game.board();
    let score = 0;

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (piece && piece.type === 'p') {
          const isPassed = this.isPassedPawn(game, row, col, piece.color);
          if (isPassed) {
            const promotionDistance = piece.color === 'w' ? 7 - row : row;
            score += piece.color === 'w' ? (8 - promotionDistance) * 10 : -(8 - promotionDistance) * 10;
          }
        }
      }
    }

    return score;
  }

  isPassedPawn(game, row, col, color) {
    const board = game.board();
    const direction = color === 'w' ? 1 : -1;

    // Check if any opponent pawns can block or capture
    for (let r = row + direction; r >= 0 && r < 8; r += direction) {
      // Check same file
      if (board[r][col] && board[r][col].type === 'p' && board[r][col].color !== color) {
        return false;
      }

      // Check adjacent files
      for (let c = col - 1; c <= col + 1; c += 2) {
        if (c >= 0 && c < 8) {
          if (board[r][c] && board[r][c].type === 'p' && board[r][c].color !== color) {
            return false;
          }
        }
      }
    }

    return true;
  }

  evaluateOpposition(game) {
    const board = game.board();
    let whiteKingPos = null;
    let blackKingPos = null;

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (piece && piece.type === 'k') {
          if (piece.color === 'w') {
            whiteKingPos = { row, col };
          } else {
            blackKingPos = { row, col };
          }
        }
      }
    }

    if (!whiteKingPos || !blackKingPos) return 0;

    // Check if kings are in opposition
    const sameFile = whiteKingPos.col === blackKingPos.col;
    const distance = Math.abs(whiteKingPos.row - blackKingPos.row);

    if (sameFile && distance === 2) {
      return game.turn() === 'w' ? 20 : -20;
    }

    return 0;
  }

  calculateConfidence(game, depth) {
    const moveCount = game.moves().length;
    const materialBalance = Math.abs(this.evaluateMaterial(game));
    const positionComplexity = this.evaluatePositionComplexity(game);

    let confidence = 100;

    // Reduce confidence for complex positions
    confidence -= positionComplexity * 0.5;

    // Reduce confidence for low material
    if (materialBalance < 500) {
      confidence -= 10;
    }

    // Increase confidence with depth
    confidence += depth * 5;

    return Math.max(0, Math.min(100, confidence));
  }

  evaluatePositionComplexity(game) {
    const board = game.board();
    let complexity = 0;

    // Count pieces
    let pieceCount = 0;
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        if (board[row][col]) pieceCount++;
      }
    }

    // More pieces = more complex
    complexity += pieceCount * 2;

    // Count possible moves
    const moves = game.moves();
    complexity += moves.length * 0.5;

    return complexity;
  }

  findBestMove(game, depth) {
    const moves = game.moves({ verbose: true });
    let bestMove = null;
    let bestScore = -Infinity;

    for (const move of moves) {
      const tempGame = new Chess(game.fen());
      tempGame.move(move);

      const score = this.minimax(tempGame, depth - 1, -Infinity, Infinity, false);

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    return bestMove;
  }

  minimax(game, depth, alpha, beta, isMaximizing) {
    if (depth === 0 || game.game_over()) {
      return this.evaluatePosition(game).totalScore;
    }

    const moves = game.moves({ verbose: true });

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const move of moves) {
        const tempGame = new Chess(game.fen());
        tempGame.move(move);
        const evalScore = this.minimax(tempGame, depth - 1, alpha, beta, false);
        maxEval = Math.max(maxEval, evalScore);
        alpha = Math.max(alpha, evalScore);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const move of moves) {
        const tempGame = new Chess(game.fen());
        tempGame.move(move);
        const evalScore = this.minimax(tempGame, depth - 1, alpha, beta, true);
        minEval = Math.min(minEval, evalScore);
        beta = Math.min(beta, evalScore);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  }

  getSuggestedMoves(game, count) {
    const moves = game.moves({ verbose: true });
    const evaluations = moves.map(move => ({
      move,
      score: this.evaluateMove(game, move)
    }));

    return evaluations
      .sort((a, b) => b.score - a.score)
      .slice(0, count)
      .map(e => e.move);
  }

  evaluateMove(game, move) {
    const tempGame = new Chess(game.fen());
    const result = tempGame.move(move);

    if (!result) return -Infinity;

    const evaluation = this.evaluatePosition(tempGame);
    let score = evaluation.totalScore;

    // Bonus for captures
    if (result.captured) {
      score += 50;
    }

    // Bonus for checks
    if (result.san.includes('+')) {
      score += 25;
    }

    // Bonus for castling
    if (result.san.includes('O-O')) {
      score += 15;
    }

    return score;
  }

  findCriticalPositions(game) {
    const criticalPositions = [];
    const moves = game.moves({ verbose: true });

    for (const move of moves) {
      const tempGame = new Chess(game.fen());
      const result = tempGame.move(move);

      if (!result) continue;

      const evaluation = this.evaluatePosition(tempGame);

      // Check for tactical opportunities
      if (result.captured && evaluation.totalScore > 100) {
        criticalPositions.push({
          type: 'capture',
          move: result,
          score: evaluation.totalScore
        });
      }

      // Check for forcing moves
      if (result.san.includes('+')) {
        criticalPositions.push({
          type: 'check',
          move: result,
          score: evaluation.totalScore
        });
      }

      // Check for dangerous opponent responses
      const opponentMoves = tempGame.moves({ verbose: true });
      for (const opponentMove of opponentMoves) {
        if (opponentMove.captured) {
          criticalPositions.push({
            type: 'danger',
            move: result,
            threat: opponentMove
          });
        }
      }
    }

    return criticalPositions.sort((a, b) => b.score - a.score);
  }
}

// Initialize and export
window.QuantumMoveEvaluator = QuantumMoveEvaluator;
window.quantumEvaluator = new QuantumMoveEvaluator();

console.log('[Extreme AI Analysis] Quantum Move Evaluator initialized');
