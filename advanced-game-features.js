// Advanced Game Features
// Comprehensive gameplay enhancements

// ============================================
// MOVE SUGGESTIONS & ANALYSIS
// ============================================

class MoveAnalyzer {
  constructor(game) {
    this.game = game;
    this.evaluations = new Map();
  }

  evaluateMove(move) {
    const tempGame = new Chess(this.game.fen());
    const result = tempGame.move(move);

    if (!result) return null;

    let score = 0;

    // Material evaluation
    const pieceValues = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };
    score += pieceValues[result.captured] || 0;

    // Position evaluation
    score += this.evaluatePosition(result.to, result.piece);

    // Safety evaluation
    score += this.evaluateSafety(result.to, result.color);

    // Development evaluation
    score += this.evaluateDevelopment(result);

    return { move: result, score };
  }

  evaluatePosition(square, piece) {
    const centerSquares = ['d4', 'd5', 'e4', 'e5'];
    if (centerSquares.includes(square)) return 20;
    return 0;
  }

  evaluateSafety(square, color) {
    const attacks = this.game.moves({ square, verbose: true });
    const isSafe = !attacks.some(m => m.color !== color);
    return isSafe ? 10 : -10;
  }

  evaluateDevelopment(move) {
    if (move.piece === 'n' || move.piece === 'b') {
      const startRank = move.color === 'w' ? '1' : '8';
      if (move.from.includes(startRank)) return 15;
    }
    return 0;
  }

  getBestMoves(limit = 3) {
    const moves = this.game.moves({ verbose: true });
    const evaluations = moves.map(m => this.evaluateMove(m));

    return evaluations
      .filter(e => e !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
}

// ============================================
// MOVE HISTORY & TIMELINE
// ============================================

class MoveTimeline {
  constructor() {
    this.moves = [];
    this.positions = new Map();
    this.bookmarks = new Map();
    this.annotations = new Map();
  }

  addMove(move, fen) {
    const moveData = {
      ...move,
      timestamp: Date.now(),
      fen: fen,
      index: this.moves.length
    };

    this.moves.push(moveData);
    this.positions.set(fen, moveData);

    return moveData;
  }

  getMove(index) {
    return this.moves[index];
  }

  getPosition(fen) {
    return this.positions.get(fen);
  }

  addBookmark(index, note) {
    this.bookmarks.set(index, {
      note,
      timestamp: Date.now()
    });
  }

  addAnnotation(index, annotation) {
    this.annotations.set(index, annotation);
  }

  getAnnotations(index) {
    return this.annotations.get(index);
  }

  export() {
    return {
      moves: this.moves,
      bookmarks: Array.from(this.bookmarks.entries()),
      annotations: Array.from(this.annotations.entries())
    };
  }

  import(data) {
    this.moves = data.moves || [];
    this.bookmarks = new Map(data.bookmarks || []);
    this.annotations = new Map(data.annotations || []);

    this.moves.forEach(move => {
      this.positions.set(move.fen, move);
    });
  }
}

// ============================================
// GAME STATISTICS
// ============================================

class GameStatistics {
  constructor() {
    this.stats = {
      gamesPlayed: 0,
      gamesWon: 0,
      gamesLost: 0,
      gamesDrawn: 0,
      movesMade: 0,
      captures: 0,
      checks: 0,
      checkmates: 0,
      averageMovesPerGame: 0,
      longestGame: 0,
      shortestGame: 0,
      pieceCaptures: {
        p: 0, n: 0, b: 0, r: 0, q: 0
      },
      openingUsed: new Map(),
      timeControl: new Map()
    };
  }

  recordGame(result, moves, duration) {
    this.stats.gamesPlayed++;

    switch(result) {
      case 'win':
        this.stats.gamesWon++;
        break;
      case 'loss':
        this.stats.gamesLost++;
        break;
      case 'draw':
        this.stats.gamesDrawn++;
        break;
    }

    this.stats.movesMade += moves;
    this.stats.longestGame = Math.max(this.stats.longestGame, moves);
    this.stats.shortestGame = this.stats.shortestGame === 0 ? moves : Math.min(this.stats.shortestGame, moves);
    this.stats.averageMovesPerGame = this.stats.movesMade / this.stats.gamesPlayed;
  }

  recordCapture(piece) {
    this.stats.captures++;
    this.stats.pieceCaptures[piece]++;
  }

  recordCheck() {
    this.stats.checks++;
  }

  recordCheckmate() {
    this.stats.checkmates++;
  }

  recordOpening(opening) {
    const count = this.stats.openingUsed.get(opening) || 0;
    this.stats.openingUsed.set(opening, count + 1);
  }

  recordTimeControl(timeControl) {
    const count = this.stats.timeControl.get(timeControl) || 0;
    this.stats.timeControl.set(timeControl, count + 1);
  }

  getStats() {
    return {
      ...this.stats,
      winRate: (this.stats.gamesWon / this.stats.gamesPlayed * 100).toFixed(2),
      lossRate: (this.stats.gamesLost / this.stats.gamesPlayed * 100).toFixed(2),
      drawRate: (this.stats.gamesDrawn / this.stats.gamesPlayed * 100).toFixed(2),
      mostUsedOpening: this.getMostUsedOpening(),
      mostUsedTimeControl: this.getMostUsedTimeControl()
    };
  }

  getMostUsedOpening() {
    let max = 0;
    let mostUsed = null;

    for (const [opening, count] of this.stats.openingUsed.entries()) {
      if (count > max) {
        max = count;
        mostUsed = opening;
      }
    }

    return mostUsed;
  }

  getMostUsedTimeControl() {
    let max = 0;
    let mostUsed = null;

    for (const [timeControl, count] of this.stats.timeControl.entries()) {
      if (count > max) {
        max = count;
        mostUsed = timeControl;
      }
    }

    return mostUsed;
  }
}

// ============================================
// PUZZLE MODE
// ============================================

class PuzzleMode {
  constructor() {
    this.puzzles = [];
    this.currentPuzzle = null;
    this.attempts = new Map();
  }

  loadPuzzles(puzzles) {
    this.puzzles = puzzles;
  }

  startPuzzle(index) {
    if (index >= this.puzzles.length) return false;

    this.currentPuzzle = {
      ...this.puzzles[index],
      currentIndex: index,
      moveIndex: 0,
      solved: false
    };

    return true;
  }

  makeMove(move) {
    if (!this.currentPuzzle || this.currentPuzzle.solved) return false;

    const expectedMove = this.currentPuzzle.moves[this.currentPuzzle.moveIndex];

    if (move.san !== expectedMove.san) {
      const attempts = this.attempts.get(this.currentPuzzle.currentIndex) || 0;
      this.attempts.set(this.currentPuzzle.currentIndex, attempts + 1);
      return false;
    }

    this.currentPuzzle.moveIndex++;

    if (this.currentPuzzle.moveIndex >= this.currentPuzzle.moves.length) {
      this.currentPuzzle.solved = true;
      return true;
    }

    return true;
  }

  getCurrentMove() {
    if (!this.currentPuzzle) return null;
    return this.currentPuzzle.moves[this.currentPuzzle.moveIndex];
  }

  isSolved() {
    return this.currentPuzzle && this.currentPuzzle.solved;
  }

  getAttempts() {
    return this.attempts.get(this.currentPuzzle?.currentIndex) || 0;
  }
}

// ============================================
// TRAINING MODE
// ============================================

class TrainingMode {
  constructor() {
    this.exercises = [];
    this.currentExercise = null;
    this.progress = new Map();
    this.streak = 0;
  }

  loadExercises(exercises) {
    this.exercises = exercises;
  }

  startExercise(index) {
    if (index >= this.exercises.length) return false;

    this.currentExercise = {
      ...this.exercises[index],
      currentIndex: index,
      attempts: 0,
      completed: false
    };

    return true;
  }

  completeExercise(success) {
    if (!this.currentExercise) return false;

    this.currentExercise.attempts++;

    if (success) {
      this.currentExercise.completed = true;
      this.streak++;

      const progress = this.progress.get(this.currentExercise.category) || 0;
      this.progress.set(this.currentExercise.category, progress + 1);
    } else {
      this.streak = 0;
    }

    return success;
  }

  getProgress(category) {
    return this.progress.get(category) || 0;
  }

  getStreak() {
    return this.streak;
  }
}

// ============================================
// GAME REPLAY SYSTEM
// ============================================

class GameReplay {
  constructor() {
    this.games = new Map();
    this.currentGame = null;
    this.currentMove = 0;
  }

  saveGame(id, gameData) {
    this.games.set(id, {
      ...gameData,
      id,
      savedAt: Date.now()
    });
  }

  loadGame(id) {
    const game = this.games.get(id);
    if (!game) return false;

    this.currentGame = game;
    this.currentMove = 0;
    return true;
  }

  nextMove() {
    if (!this.currentGame) return null;

    if (this.currentMove >= this.currentGame.moves.length) {
      return null;
    }

    return this.currentGame.moves[this.currentMove++];
  }

  previousMove() {
    if (!this.currentGame) return null;

    if (this.currentMove <= 0) {
      return null;
    }

    return this.currentGame.moves[--this.currentMove];
  }

  goToMove(index) {
    if (!this.currentGame || index < 0 || index >= this.currentGame.moves.length) {
      return false;
    }

    this.currentMove = index;
    return true;
  }

  getCurrentPosition() {
    if (!this.currentGame) return null;

    const tempGame = new Chess();
    for (let i = 0; i < this.currentMove; i++) {
      tempGame.move(this.currentGame.moves[i]);
    }

    return tempGame.fen();
  }
}

// ============================================
// INITIALIZATION
// ============================================

// Export classes
window.MoveAnalyzer = MoveAnalyzer;
window.MoveTimeline = MoveTimeline;
window.GameStatistics = GameStatistics;
window.PuzzleMode = PuzzleMode;
window.TrainingMode = TrainingMode;
window.GameReplay = GameReplay;

// Initialize instances
window.moveAnalyzer = null;
window.moveTimeline = null;
window.gameStatistics = null;
window.puzzleMode = null;
window.trainingMode = null;
window.gameReplay = null;

// Initialize when game is ready
function initializeAdvancedFeatures() {
  if (typeof game !== 'undefined') {
    window.moveAnalyzer = new MoveAnalyzer(game);
    window.moveTimeline = new MoveTimeline();
    window.gameStatistics = new GameStatistics();
    window.puzzleMode = new PuzzleMode();
    window.trainingMode = new TrainingMode();
    window.gameReplay = new GameReplay();

    console.log('[Advanced Features] Initialized');
  }
}

// Auto-initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeAdvancedFeatures);
} else {
  initializeAdvancedFeatures();
}
