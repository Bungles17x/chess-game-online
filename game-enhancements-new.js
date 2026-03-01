// Game Enhancements - New Features
// This file contains additional game enhancements to improve the chess experience

// ============================================
// 1. Timer System with Multiple Time Controls
// ============================================

class ChessTimer {
  constructor() {
    this.whiteTime = 600; // 10 minutes default
    this.blackTime = 600;
    this.isRunning = false;
    this.timerInterval = null;
    this.timeControl = '10|0'; // Default: 10 minutes, 0 increment
    this.increment = 0;
  }

  setTimeControl(control) {
    const [minutes, inc] = control.split('|').map(Number);
    this.timeControl = control;
    this.increment = inc || 0;
    this.whiteTime = minutes * 60;
    this.blackTime = minutes * 60;
    this.updateDisplay();
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.timerInterval = setInterval(() => this.tick(), 1000);
  }

  stop() {
    this.isRunning = false;
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  tick() {
    if (!this.isRunning) return;

    const currentTurn = game.turn();
    if (currentTurn === 'w') {
      this.whiteTime--;
    } else {
      this.blackTime--;
    }

    this.updateDisplay();

    // Check for timeout
    if (this.whiteTime <= 0 || this.blackTime <= 0) {
      this.stop();
      const winner = this.whiteTime <= 0 ? 'Black' : 'White';
      popup(`${winner} wins on time!`, 'yellow');
    }
  }

  addIncrement(color) {
    if (color === 'w') {
      this.whiteTime += this.increment;
    } else {
      this.blackTime += this.increment;
    }
    this.updateDisplay();
  }

  updateDisplay() {
    const whiteDisplay = document.getElementById('white-timer');
    const blackDisplay = document.getElementById('black-timer');

    if (whiteDisplay) {
      whiteDisplay.textContent = this.formatTime(this.whiteTime);
      whiteDisplay.classList.toggle('low-time', this.whiteTime < 60);
    }

    if (blackDisplay) {
      blackDisplay.textContent = this.formatTime(this.blackTime);
      blackDisplay.classList.toggle('low-time', this.blackTime < 60);
    }
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  reset() {
    this.stop();
    const [minutes, inc] = this.timeControl.split('|').map(Number);
    this.whiteTime = minutes * 60;
    this.blackTime = minutes * 60;
    this.updateDisplay();
  }
}

// Initialize timer
const chessTimer = new ChessTimer();

// ============================================
// 2. Move Analysis and Evaluation
// ============================================

class MoveAnalyzer {
  constructor() {
    this.evaluationHistory = [];
  }

  evaluatePosition() {
    const board = game.board();
    let score = 0;

    const pieceValues = {
      'p': 100, 'n': 320, 'b': 330, 'r': 500, 'q': 900, 'k': 20000
    };

    // Position tables for piece-square evaluation
    const pawnTable = [
      [0,  0,  0,  0,  0,  0,  0,  0],
      [50, 50, 50, 50, 50, 50, 50, 50],
      [10, 10, 20, 30, 30, 20, 10, 10],
      [5,  5, 10, 25, 25, 10,  5,  5],
      [0,  0,  0, 20, 20,  0,  0,  0],
      [5, -5,-10,  0,  0,-10, -5,  5],
      [5, 10, 10,-20,-20, 10, 10,  5],
      [0,  0,  0,  0,  0,  0,  0,  0]
    ];

    const knightTable = [
      [-50,-40,-30,-30,-30,-30,-40,-50],
      [-40,-20,  0,  0,  0,  0,-20,-40],
      [-30,  0, 10, 15, 15, 10,  0,-30],
      [-30,  5, 15, 20, 20, 15,  5,-30],
      [-30,  0, 15, 20, 20, 15,  0,-30],
      [-30,  5, 10, 15, 15, 10,  5,-30],
      [-40,-20,  0,  5,  5,  0,-20,-40],
      [-50,-40,-30,-30,-30,-30,-40,-50]
    ];

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (!piece) continue;

        const value = pieceValues[piece.type];
        const positionBonus = this.getPositionBonus(piece, row, col, pawnTable, knightTable);
        const totalValue = value + positionBonus;

        score += piece.color === 'w' ? totalValue : -totalValue;
      }
    }

    this.evaluationHistory.push(score);
    return score;
  }

  getPositionBonus(piece, row, col, pawnTable, knightTable) {
    const actualRow = piece.color === 'w' ? row : 7 - row;

    switch (piece.type) {
      case 'p':
        return pawnTable[actualRow][col];
      case 'n':
        return knightTable[actualRow][col];
      case 'b':
        return (piece.color === 'w' && (col === 2 || col === 5)) ? 20 : 0;
      case 'r':
        return (col === 0 || col === 7) ? 10 : 0;
      case 'q':
        return (row === 3 || row === 4) && (col === 3 || col === 4) ? -20 : 0;
      default:
        return 0;
    }
  }

  getBestMove() {
    const moves = game.moves({ verbose: true });
    let bestMove = null;
    let bestScore = -Infinity;

    for (const move of moves) {
      game.move(move);
      const score = -this.evaluatePosition();
      game.undo();

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    return bestMove;
  }

  getMoveEvaluation(move) {
    game.move(move);
    const score = this.evaluatePosition();
    game.undo();

    if (score > 200) return { rating: 'excellent', color: 'green' };
    if (score > 100) return { rating: 'good', color: 'blue' };
    if (score > -100) return { rating: 'neutral', color: 'gray' };
    if (score > -200) return { rating: 'inaccuracy', color: 'orange' };
    return { rating: 'blunder', color: 'red' };
  }
}

// Initialize move analyzer
const moveAnalyzer = new MoveAnalyzer();

// ============================================
// 3. Hint System
// ============================================

class HintSystem {
  constructor() {
    this.showingHint = false;
  }

  showHint() {
    if (this.showingHint) return;

    const bestMove = moveAnalyzer.getBestMove();
    if (!bestMove) return;

    this.showingHint = true;

    const fromSquare = document.querySelector(`[data-square="${bestMove.from}"]`);
    const toSquare = document.querySelector(`[data-square="${bestMove.to}"]`);

    if (fromSquare) fromSquare.classList.add('hint-from');
    if (toSquare) toSquare.classList.add('hint-to');

    // Auto-hide hint after 3 seconds
    setTimeout(() => this.hideHint(), 3000);
  }

  hideHint() {
    this.showingHint = false;
    document.querySelectorAll('.hint-from, .hint-to').forEach(el => {
      el.classList.remove('hint-from', 'hint-to');
    });
  }
}

// Initialize hint system
const hintSystem = new HintSystem();

// ============================================
// 4. Undo/Redo System
// ============================================

class UndoRedoSystem {
  constructor() {
    this.history = [];
    this.currentIndex = -1;
    this.maxHistory = 100;
  }

  saveState() {
    const fen = game.fen();
    const move = game.history({ verbose: true }).pop();

    // Remove any future states if we're not at the end
    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1);
    }

    this.history.push({ fen, move });

    // Limit history size
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    } else {
      this.currentIndex++;
    }
  }

  undo() {
    if (this.currentIndex < 0) return false;

    const state = this.history[this.currentIndex];
    game.load(state.fen);
    this.currentIndex--;

    renderPosition();
    updateTurnIndicator();
    return true;
  }

  redo() {
    if (this.currentIndex >= this.history.length - 1) return false;

    this.currentIndex++;
    const state = this.history[this.currentIndex];
    game.load(state.fen);

    renderPosition();
    updateTurnIndicator();
    return true;
  }

  canUndo() {
    return this.currentIndex >= 0;
  }

  canRedo() {
    return this.currentIndex < this.history.length - 1;
  }

  clear() {
    this.history = [];
    this.currentIndex = -1;
  }
}

// Initialize undo/redo system
const undoRedo = new UndoRedoSystem();

// ============================================
// 5. Keyboard Shortcuts
// ============================================

class KeyboardShortcuts {
  constructor() {
    this.shortcuts = {
      'z': () => undoRedo.undo(),
      'y': () => undoRedo.redo(),
      'h': () => hintSystem.showHint(),
      'r': () => initBoard(),
      's': () => this.saveGame(),
      'ArrowLeft': () => undoRedo.undo(),
      'ArrowRight': () => undoRedo.redo(),
      'Escape': () => hintSystem.hideHint()
    };

    this.init();
  }

  init() {
    document.addEventListener('keydown', (e) => {
      // Don't trigger shortcuts if typing in input fields
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      const handler = this.shortcuts[e.key];
      if (handler) {
        e.preventDefault();
        handler();
      }
    });
  }

  saveGame() {
    const fen = game.fen();
    const moveHistory = game.history();
    const gameData = {
      fen,
      moves: moveHistory,
      timestamp: Date.now()
    };

    localStorage.setItem('savedGame', JSON.stringify(gameData));
    popup('Game saved!', 'green');
  }

  loadGame() {
    const saved = localStorage.getItem('savedGame');
    if (!saved) {
      popup('No saved game found', 'red');
      return;
    }

    const gameData = JSON.parse(saved);
    game.load(gameData.fen);
    renderPosition();
    updateTurnIndicator();
    popup('Game loaded!', 'green');
  }
}

// Initialize keyboard shortcuts
const keyboardShortcuts = new KeyboardShortcuts();

// ============================================
// 6. Enhanced Game Statistics
// ============================================

class GameStatistics {
  constructor() {
    this.stats = this.loadStats();
  }

  loadStats() {
    const saved = localStorage.getItem('chessStats');
    return saved ? JSON.parse(saved) : {
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      currentStreak: 0,
      bestStreak: 0,
      movesMade: 0,
      captures: 0,
      checkmates: 0,
      timeSpent: 0
    };
  }

  saveStats() {
    localStorage.setItem('chessStats', JSON.stringify(this.stats));
  }

  recordGame(result) {
    this.stats.gamesPlayed++;
    this.stats.movesMade += game.history().length;

    if (result === 'win') {
      this.stats.wins++;
      this.stats.currentStreak++;
      this.stats.checkmates++;
      if (this.stats.currentStreak > this.stats.bestStreak) {
        this.stats.bestStreak = this.stats.currentStreak;
      }
    } else if (result === 'loss') {
      this.stats.losses++;
      this.stats.currentStreak = 0;
    } else {
      this.stats.draws++;
      this.stats.currentStreak = 0;
    }

    this.saveStats();
    this.displayStats();
  }

  recordCapture() {
    this.stats.captures++;
    this.saveStats();
  }

  displayStats() {
    const statsDisplay = document.getElementById('game-stats');
    if (!statsDisplay) return;

    const winRate = this.stats.gamesPlayed > 0 
      ? ((this.stats.wins / this.stats.gamesPlayed) * 100).toFixed(1) 
      : 0;

    statsDisplay.innerHTML = `
      <div class="stat-item">
        <span class="stat-label">Games:</span>
        <span class="stat-value">${this.stats.gamesPlayed}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Wins:</span>
        <span class="stat-value">${this.stats.wins}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Losses:</span>
        <span class="stat-value">${this.stats.losses}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Draws:</span>
        <span class="stat-value">${this.stats.draws}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Win Rate:</span>
        <span class="stat-value">${winRate}%</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Streak:</span>
        <span class="stat-value">${this.stats.currentStreak}</span>
      </div>
    `;
  }
}

// Initialize game statistics
const gameStats = new GameStatistics();

// ============================================
// Export for use in other modules
// ============================================

window.chessTimer = chessTimer;
window.moveAnalyzer = moveAnalyzer;
window.hintSystem = hintSystem;
window.undoRedo = undoRedo;
window.keyboardShortcuts = keyboardShortcuts;
window.gameStats = gameStats;
