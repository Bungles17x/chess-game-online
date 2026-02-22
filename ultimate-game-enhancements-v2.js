
// ============================================
// ULTIMATE GAME ENHANCEMENTS V2
// ============================================

// Game Enhancement Configuration
const GameEnhancements = {
  enabled: true,
  features: {
    moveSuggestions: true,
    pieceProtection: true,
    capturedPieces: true,
    moveHistory: true,
    gameTimer: true,
    analysisMode: true,
    soundEffects: true,
    animations: true,
    hints: true,
    undoMove: true
  }
};

// ============================================
// MOVE SUGGESTIONS SYSTEM
// ============================================

class MoveSuggestionSystem {
  constructor() {
    this.suggestions = [];
    this.bestMove = null;
  }

  analyzePosition(board, isWhiteTurn) {
    this.suggestions = [];
    this.bestMove = null;

    // Get all legal moves
    const moves = this.getAllLegalMoves(board, isWhiteTurn);

    // Evaluate each move
    moves.forEach(move => {
      const score = this.evaluateMove(board, move, isWhiteTurn);
      this.suggestions.push({ move, score });
    });

    // Sort by score (descending)
    this.suggestions.sort((a, b) => b.score - a.score);

    // Set best move
    if (this.suggestions.length > 0) {
      this.bestMove = this.suggestions[0].move;
    }

    return this.suggestions;
  }

  getAllLegalMoves(board, isWhiteTurn) {
    const moves = [];
    const pieces = board.querySelectorAll('.piece');

    pieces.forEach(piece => {
      const isWhite = piece.classList.contains('white');
      if (isWhite === isWhiteTurn) {
        const pieceMoves = this.getPieceMoves(piece, board);
        moves.push(...pieceMoves);
      }
    });

    return moves;
  }

  getPieceMoves(piece, board) {
    const moves = [];
    const currentSquare = piece.parentElement;
    const squareId = currentSquare.id;
    const [row, col] = this.parseSquare(squareId);
    const pieceType = piece.dataset.type;

    switch (pieceType) {
      case 'pawn':
        moves.push(...this.getPawnMoves(piece, row, col, board));
        break;
      case 'knight':
        moves.push(...this.getKnightMoves(row, col, board));
        break;
      case 'bishop':
        moves.push(...this.getBishopMoves(row, col, board));
        break;
      case 'rook':
        moves.push(...this.getRookMoves(row, col, board));
        break;
      case 'queen':
        moves.push(...this.getQueenMoves(row, col, board));
        break;
      case 'king':
        moves.push(...this.getKingMoves(row, col, board));
        break;
    }

    return moves;
  }

  parseSquare(squareId) {
    const col = squareId.charCodeAt(0) - 97; // 'a' = 0
    const row = parseInt(squareId[1]) - 1; // '1' = 0
    return [row, col];
  }

  squareToId(row, col) {
    const colLetter = String.fromCharCode(97 + col);
    const rowNumber = row + 1;
    return `${colLetter}${rowNumber}`;
  }

  getPawnMoves(piece, row, col, board) {
    const moves = [];
    const isWhite = piece.classList.contains('white');
    const direction = isWhite ? 1 : -1;

    // Forward move
    const forwardRow = row + direction;
    if (forwardRow >= 0 && forwardRow < 8) {
      const forwardSquare = board.querySelector(`#${this.squareToId(forwardRow, col)}`);
      if (forwardSquare && !forwardSquare.querySelector('.piece')) {
        moves.push({
          from: this.squareToId(row, col),
          to: this.squareToId(forwardRow, col),
          piece: piece.dataset.type
        });

        // Double move from starting position
        const startRow = isWhite ? 1 : 6;
        if (row === startRow) {
          const doubleRow = row + (2 * direction);
          const doubleSquare = board.querySelector(`#${this.squareToId(doubleRow, col)}`);
          if (doubleSquare && !doubleSquare.querySelector('.piece')) {
            moves.push({
              from: this.squareToId(row, col),
              to: this.squareToId(doubleRow, col),
              piece: piece.dataset.type
            });
          }
        }
      }
    }

    // Capture moves
    [-1, 1].forEach(colOffset => {
      const captureCol = col + colOffset;
      if (captureCol >= 0 && captureCol < 8) {
        const captureSquare = board.querySelector(`#${this.squareToId(forwardRow, captureCol)}`);
        if (captureSquare) {
          const capturedPiece = captureSquare.querySelector('.piece');
          if (capturedPiece && capturedPiece.classList.contains(isWhite ? 'black' : 'white')) {
            moves.push({
              from: this.squareToId(row, col),
              to: this.squareToId(forwardRow, captureCol),
              piece: piece.dataset.type,
              capture: true
            });
          }
        }
      }
    });

    return moves;
  }

  getKnightMoves(row, col, board) {
    const moves = [];
    const offsets = [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2], [1, 2], [2, -1], [2, 1]
    ];

    offsets.forEach(([rowOffset, colOffset]) => {
      const newRow = row + rowOffset;
      const newCol = col + colOffset;

      if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
        const square = board.querySelector(`#${this.squareToId(newRow, newCol)}`);
        if (square) {
          const piece = square.querySelector('.piece');
          const isWhite = board.querySelector(`#${this.squareToId(row, col)} .piece`).classList.contains('white');

          if (!piece || piece.classList.contains(isWhite ? 'black' : 'white')) {
            moves.push({
              from: this.squareToId(row, col),
              to: this.squareToId(newRow, newCol),
              piece: 'knight',
              capture: !!piece
            });
          }
        }
      }
    });

    return moves;
  }

  getBishopMoves(row, col, board) {
    return this.getSlidingMoves(row, col, board, [
      [-1, -1], [-1, 1], [1, -1], [1, 1]
    ]);
  }

  getRookMoves(row, col, board) {
    return this.getSlidingMoves(row, col, board, [
      [-1, 0], [1, 0], [0, -1], [0, 1]
    ]);
  }

  getQueenMoves(row, col, board) {
    return this.getSlidingMoves(row, col, board, [
      [-1, -1], [-1, 1], [1, -1], [1, 1],
      [-1, 0], [1, 0], [0, -1], [0, 1]
    ]);
  }

  getSlidingMoves(row, col, board, directions) {
    const moves = [];
    const isWhite = board.querySelector(`#${this.squareToId(row, col)} .piece`).classList.contains('white');

    directions.forEach(([rowOffset, colOffset]) => {
      let newRow = row + rowOffset;
      let newCol = col + colOffset;

      while (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
        const square = board.querySelector(`#${this.squareToId(newRow, newCol)}`);
        if (square) {
          const piece = square.querySelector('.piece');

          if (!piece) {
            moves.push({
              from: this.squareToId(row, col),
              to: this.squareToId(newRow, newCol),
              piece: board.querySelector(`#${this.squareToId(row, col)} .piece`).dataset.type,
              capture: false
            });
          } else {
            if (piece.classList.contains(isWhite ? 'black' : 'white')) {
              moves.push({
                from: this.squareToId(row, col),
                to: this.squareToId(newRow, newCol),
                piece: board.querySelector(`#${this.squareToId(row, col)} .piece`).dataset.type,
                capture: true
              });
            }
            break;
          }
        }

        newRow += rowOffset;
        newCol += colOffset;
      }
    });

    return moves;
  }

  getKingMoves(row, col, board) {
    const moves = [];
    const offsets = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1], [0, 1],
      [1, -1], [1, 0], [1, 1]
    ];

    offsets.forEach(([rowOffset, colOffset]) => {
      const newRow = row + rowOffset;
      const newCol = col + colOffset;

      if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
        const square = board.querySelector(`#${this.squareToId(newRow, newCol)}`);
        if (square) {
          const piece = square.querySelector('.piece');
          const isWhite = board.querySelector(`#${this.squareToId(row, col)} .piece`).classList.contains('white');

          if (!piece || piece.classList.contains(isWhite ? 'black' : 'white')) {
            moves.push({
              from: this.squareToId(row, col),
              to: this.squareToId(newRow, newCol),
              piece: 'king',
              capture: !!piece
            });
          }
        }
      }
    });

    return moves;
  }

  evaluateMove(board, move, isWhiteTurn) {
    let score = 0;

    // Material gain
    if (move.capture) {
      const targetSquare = board.querySelector(`#${move.to}`);
      const capturedPiece = targetSquare.querySelector('.piece');
      if (capturedPiece) {
        score += this.getPieceValue(capturedPiece.dataset.type) * 10;
      }
    }

    // Center control bonus
    const [row, col] = this.parseSquare(move.to);
    if (row >= 3 && row <= 4 && col >= 3 && col <= 4) {
      score += 3;
    }

    // Development bonus for knights and bishops
    if (move.piece === 'knight' || move.piece === 'bishop') {
      const [fromRow] = this.parseSquare(move.from);
      if ((isWhiteTurn && fromRow === 0) || (!isWhiteTurn && fromRow === 7)) {
        score += 2;
      }
    }

    return score;
  }

  getPieceValue(pieceType) {
    const values = {
      pawn: 1,
      knight: 3,
      bishop: 3,
      rook: 5,
      queen: 9,
      king: 100
    };
    return values[pieceType] || 0;
  }

  showSuggestions(board) {
    // Remove previous suggestions
    board.querySelectorAll('.suggestion').forEach(el => el.remove());

    // Show top 3 suggestions
    this.suggestions.slice(0, 3).forEach((suggestion, index) => {
      const square = board.querySelector(`#${suggestion.move.to}`);
      if (square) {
        const suggestionEl = document.createElement('div');
        suggestionEl.className = 'suggestion';
        suggestionEl.dataset.rank = index + 1;
        square.appendChild(suggestionEl);
      }
    });
  }
}

// ============================================
// PIECE PROTECTION SYSTEM
// ============================================

class PieceProtectionSystem {
  constructor() {
    this.protectedPieces = new Set();
  }

  analyzeProtection(board) {
    this.protectedPieces.clear();

    const pieces = board.querySelectorAll('.piece');

    pieces.forEach(piece => {
      const square = piece.parentElement;
      const squareId = square.id;
      const isWhite = piece.classList.contains('white');

      // Get all pieces that can move to this square
      const protectingPieces = this.findProtectingPieces(board, squareId, !isWhite);

      if (protectingPieces.length > 0) {
        this.protectedPieces.add(squareId);
        square.classList.add('protected');
      } else {
        square.classList.remove('protected');
      }
    });
  }

  findProtectingPieces(board, targetSquareId, isWhite) {
    const protectingPieces = [];
    const [targetRow, targetCol] = this.parseSquare(targetSquareId);

    const pieces = board.querySelectorAll('.piece');

    pieces.forEach(piece => {
      if (piece.classList.contains('white') === isWhite) {
        const square = piece.parentElement;
        const [row, col] = this.parseSquare(square.id);
        const pieceType = piece.dataset.type;

        if (this.canPieceAttack(row, col, targetRow, targetCol, pieceType, board)) {
          protectingPieces.push(piece);
        }
      }
    });

    return protectingPieces;
  }

  parseSquare(squareId) {
    const col = squareId.charCodeAt(0) - 97;
    const row = parseInt(squareId[1]) - 1;
    return [row, col];
  }

  canPieceAttack(fromRow, fromCol, toRow, toCol, pieceType, board) {
    const rowDiff = toRow - fromRow;
    const colDiff = toCol - fromCol;

    switch (pieceType) {
      case 'pawn':
        // Pawns attack diagonally
        const isWhite = board.querySelector(`#${this.squareToId(fromRow, fromCol)} .piece`).classList.contains('white');
        const direction = isWhite ? 1 : -1;
        return rowDiff === direction && Math.abs(colDiff) === 1;

      case 'knight':
        return (Math.abs(rowDiff) === 2 && Math.abs(colDiff) === 1) ||
               (Math.abs(rowDiff) === 1 && Math.abs(colDiff) === 2);

      case 'bishop':
        return Math.abs(rowDiff) === Math.abs(colDiff) &&
               this.isPathClear(fromRow, fromCol, toRow, toCol, board);

      case 'rook':
        return (rowDiff === 0 || colDiff === 0) &&
               this.isPathClear(fromRow, fromCol, toRow, toCol, board);

      case 'queen':
        return ((Math.abs(rowDiff) === Math.abs(colDiff) || rowDiff === 0 || colDiff === 0) &&
               this.isPathClear(fromRow, fromCol, toRow, toCol, board));

      case 'king':
        return Math.abs(rowDiff) <= 1 && Math.abs(colDiff) <= 1;

      default:
        return false;
    }
  }

  squareToId(row, col) {
    const colLetter = String.fromCharCode(97 + col);
    const rowNumber = row + 1;
    return `${colLetter}${rowNumber}`;
  }

  isPathClear(fromRow, fromCol, toRow, toCol, board) {
    const rowStep = Math.sign(toRow - fromRow);
    const colStep = Math.sign(toCol - fromCol);

    let currentRow = fromRow + rowStep;
    let currentCol = fromCol + colStep;

    while (currentRow !== toRow || currentCol !== toCol) {
      const square = board.querySelector(`#${this.squareToId(currentRow, currentCol)}`);
      if (square && square.querySelector('.piece')) {
        return false;
      }
      currentRow += rowStep;
      currentCol += colStep;
    }

    return true;
  }
}

// ============================================
// CAPTURED PIECES DISPLAY
// ============================================

class CapturedPiecesDisplay {
  constructor() {
    this.whiteCaptured = [];
    this.blackCaptured = [];
  }

  addCapturedPiece(piece) {
    const isWhite = piece.classList.contains('white');
    const pieceType = piece.dataset.type;

    if (isWhite) {
      this.whiteCaptured.push(pieceType);
    } else {
      this.blackCaptured.push(pieceType);
    }

    this.updateDisplay();
  }

  updateDisplay() {
    const whiteContainer = document.getElementById('white-captured');
    const blackContainer = document.getElementById('black-captured');

    if (whiteContainer) {
      whiteContainer.innerHTML = this.whiteCaptured.map(type => 
        `<span class="captured-piece white">${this.getPieceSymbol(type)}</span>`
      ).join('');
    }

    if (blackContainer) {
      blackContainer.innerHTML = this.blackCaptured.map(type => 
        `<span class="captured-piece black">${this.getPieceSymbol(type)}</span>`
      ).join('');
    }
  }

  getPieceSymbol(pieceType) {
    const symbols = {
      pawn: '♟',
      knight: '♞',
      bishop: '♝',
      rook: '♜',
      queen: '♛',
      king: '♚'
    };
    return symbols[pieceType] || '';
  }

  reset() {
    this.whiteCaptured = [];
    this.blackCaptured = [];
    this.updateDisplay();
  }
}

// ============================================
// GAME TIMER SYSTEM
// ============================================

class GameTimer {
  constructor(whiteTime = 600, blackTime = 600) {
    this.whiteTime = whiteTime;
    this.blackTime = blackTime;
    this.isWhiteTurn = true;
    this.isRunning = false;
    this.interval = null;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.interval = setInterval(() => this.tick(), 1000);
  }

  stop() {
    this.isRunning = false;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  tick() {
    if (this.isWhiteTurn) {
      this.whiteTime--;
    } else {
      this.blackTime--;
    }

    this.updateDisplay();

    if (this.whiteTime <= 0 || this.blackTime <= 0) {
      this.stop();
      this.handleTimeout();
    }
  }

  switchTurn() {
    this.isWhiteTurn = !this.isWhiteTurn;
  }

  updateDisplay() {
    const whiteTimer = document.getElementById('white-timer');
    const blackTimer = document.getElementById('black-timer');

    if (whiteTimer) {
      whiteTimer.textContent = this.formatTime(this.whiteTime);
    }

    if (blackTimer) {
      blackTimer.textContent = this.formatTime(this.blackTime);
    }
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  handleTimeout() {
    const winner = this.whiteTime <= 0 ? 'Black' : 'White';
    console.log(`[Game Timer] ${winner} wins on time!`);
    // Trigger game end
  }

  reset() {
    this.stop();
    this.whiteTime = 600;
    this.blackTime = 600;
    this.isWhiteTurn = true;
    this.updateDisplay();
  }
}

// ============================================
// MOVE HISTORY SYSTEM
// ============================================

class MoveHistory {
  constructor() {
    this.moves = [];
    this.moveNumber = 1;
  }

  addMove(move) {
    this.moves.push({
      number: this.moveNumber,
      move: move,
      timestamp: Date.now()
    });

    if (this.moves.length % 2 === 0) {
      this.moveNumber++;
    }

    this.updateDisplay();
  }

  updateDisplay() {
    const container = document.getElementById('move-history');
    if (!container) return;

    container.innerHTML = this.moves.map((moveData, index) => {
      const isWhiteMove = index % 2 === 0;
      const moveClass = isWhiteMove ? 'white-move' : 'black-move';
      return `
        <div class="move-entry ${moveClass}">
          <span class="move-number">${moveData.number}.</span>
          <span class="move-text">${moveData.move}</span>
        </div>
      `;
    }).join('');

    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
  }

  clear() {
    this.moves = [];
    this.moveNumber = 1;
    this.updateDisplay();
  }
}

// ============================================
// ANALYSIS MODE
// ============================================

class AnalysisMode {
  constructor() {
    this.isActive = false;
    this.evaluation = 0;
  }

  toggle() {
    this.isActive = !this.isActive;
    const board = document.getElementById('chessboard');

    if (this.isActive) {
      board.classList.add('analysis-mode');
      this.analyzePosition();
    } else {
      board.classList.remove('analysis-mode');
      this.clearAnalysis();
    }
  }

  analyzePosition() {
    if (!this.isActive) return;

    // Calculate position evaluation
    const board = document.getElementById('chessboard');
    const pieces = board.querySelectorAll('.piece');

    let whiteMaterial = 0;
    let blackMaterial = 0;

    pieces.forEach(piece => {
      const value = this.getPieceValue(piece.dataset.type);
      if (piece.classList.contains('white')) {
        whiteMaterial += value;
      } else {
        blackMaterial += value;
      }
    });

    this.evaluation = whiteMaterial - blackMaterial;
    this.updateEvaluationDisplay();
  }

  getPieceValue(pieceType) {
    const values = {
      pawn: 1,
      knight: 3,
      bishop: 3,
      rook: 5,
      queen: 9,
      king: 100
    };
    return values[pieceType] || 0;
  }

  updateEvaluationDisplay() {
    const display = document.getElementById('evaluation-display');
    if (!display) return;

    const evaluationText = this.evaluation > 0 ? `+${this.evaluation}` : this.evaluation;
    display.textContent = evaluationText;

    // Update bar
    const bar = document.getElementById('evaluation-bar');
    if (bar) {
      const percentage = Math.min(Math.max((this.evaluation + 10) / 20 * 100, 0), 100);
      bar.style.width = `${percentage}%`;
    }
  }

  clearAnalysis() {
    const display = document.getElementById('evaluation-display');
    if (display) {
      display.textContent = '0.0';
    }

    const bar = document.getElementById('evaluation-bar');
    if (bar) {
      bar.style.width = '50%';
    }
  }
}

// ============================================
// UNDO MOVE SYSTEM
// ============================================

class UndoMoveSystem {
  constructor() {
    this.moveHistory = [];
  }

  saveMove(moveData) {
    this.moveHistory.push(moveData);
  }

  undo() {
    if (this.moveHistory.length === 0) {
      console.log('[Undo] No moves to undo');
      return null;
    }

    const lastMove = this.moveHistory.pop();
    return lastMove;
  }

  clear() {
    this.moveHistory = [];
  }
}

// ============================================
// INITIALIZE SYSTEMS
// ============================================

// Initialize all systems when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  if (!GameEnhancements.enabled) return;

  // Initialize move suggestions
  if (GameEnhancements.features.moveSuggestions) {
    window.moveSuggestionSystem = new MoveSuggestionSystem();
    console.log('[Game Enhancements] Move suggestions system initialized');
  }

  // Initialize piece protection
  if (GameEnhancements.features.pieceProtection) {
    window.pieceProtectionSystem = new PieceProtectionSystem();
    console.log('[Game Enhancements] Piece protection system initialized');
  }

  // Initialize captured pieces display
  if (GameEnhancements.features.capturedPieces) {
    window.capturedPiecesDisplay = new CapturedPiecesDisplay();
    console.log('[Game Enhancements] Captured pieces display initialized');
  }

  // Initialize game timer
  if (GameEnhancements.features.gameTimer) {
    window.gameTimer = new GameTimer();
    console.log('[Game Enhancements] Game timer initialized');
  }

  // Initialize move history
  if (GameEnhancements.features.moveHistory) {
    window.moveHistory = new MoveHistory();
    console.log('[Game Enhancements] Move history initialized');
  }

  // Initialize analysis mode
  if (GameEnhancements.features.analysisMode) {
    window.analysisMode = new AnalysisMode();
    console.log('[Game Enhancements] Analysis mode initialized');
  }

  // Initialize undo move system
  if (GameEnhancements.features.undoMove) {
    window.undoMoveSystem = new UndoMoveSystem();
    console.log('[Game Enhancements] Undo move system initialized');
  }

  console.log('[Game Enhancements] All systems initialized successfully! 🎮');
});

// Export for use in other files
window.GameEnhancements = GameEnhancements;
