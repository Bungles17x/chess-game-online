// Enhanced Game Features for Modern Chess
// This file contains advanced features to improve gameplay experience

// -----------------------------------------------------
// MOVE HIGHLIGHTING AND SUGGESTIONS
// -----------------------------------------------------
const moveHighlighting = {
  lastMove: null,
  suggestedMoves: [],

  // Highlight the last move made
  highlightLastMove(from, to) {
    // Remove previous highlights
    this.clearHighlights();

    // Add highlight to from and to squares
    const fromSquare = document.querySelector(`[data-square="${from}"]`);
    const toSquare = document.querySelector(`[data-square="${to}"]`);

    if (fromSquare) fromSquare.classList.add('last-move');
    if (toSquare) toSquare.classList.add('last-move');

    this.lastMove = { from, to };
  },

  // Highlight legal moves for a piece
  highlightLegalMoves(square) {
    this.clearHighlights();

    const legalMoves = game.moves({ square: square, verbose: true });
    legalMoves.forEach(move => {
      const squareElement = document.querySelector(`[data-square="${move.to}"]`);
      if (squareElement) {
        if (move.captured) {
          squareElement.classList.add('capture-move');
        } else {
          squareElement.classList.add('legal-move');
        }
      }
    });
  },

  // Clear all highlights
  clearHighlights() {
    document.querySelectorAll('.last-move, .legal-move, .capture-move').forEach(el => {
      el.classList.remove('last-move', 'legal-move', 'capture-move');
    });
  }
};

// -----------------------------------------------------
// MOVE HISTORY AND NOTATION
// -----------------------------------------------------
const enhancedMoveHistory = {
  moves: [],
  currentMove: 0,

  // Add a move to history
  addMove(move) {
    this.moves.push(move);
    this.currentMove = this.moves.length;
    this.updateDisplay();
  },

  // Navigate to a specific move in history
  goToMove(moveIndex) {
    if (moveIndex < 0 || moveIndex > this.moves.length) return;

    // Reset game to starting position
    game.reset();

    // Replay moves up to the specified index
    for (let i = 0; i < moveIndex; i++) {
      game.move(this.moves[i]);
    }

    this.currentMove = moveIndex;
    this.updateDisplay();
    renderBoard();
  },

  // Go to previous move
  previousMove() {
    this.goToMove(this.currentMove - 1);
  },

  // Go to next move
  nextMove() {
    this.goToMove(this.currentMove + 1);
  },

  // Update the move history display
  updateDisplay() {
    const movesList = document.getElementById('moves-list');
    if (!movesList) return;

    movesList.innerHTML = '';

    for (let i = 0; i < this.moves.length; i += 2) {
      const moveNumber = Math.floor(i / 2) + 1;
      const whiteMove = this.moves[i] || '';
      const blackMove = this.moves[i + 1] || '';

      const moveRow = document.createElement('div');
      moveRow.className = 'move-row';
      moveRow.innerHTML = `
        <span class="move-number">${moveNumber}.</span>
        <span class="move white-move ${i === this.currentMove - 1 ? 'current-move' : ''}">${whiteMove}</span>
        <span class="move black-move ${i + 1 === this.currentMove - 1 ? 'current-move' : ''}">${blackMove}</span>
      `;

      movesList.appendChild(moveRow);
    }

    // Scroll to current move
    const currentMoveElement = movesList.querySelector('.current-move');
    if (currentMoveElement) {
      currentMoveElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }
};

// -----------------------------------------------------
// GAME ANALYSIS
// -----------------------------------------------------
const gameAnalysis = {
  // Analyze the current position
  analyzePosition() {
    const evaluation = this.evaluatePosition();
    const suggestions = this.getSuggestedMoves();

    return {
      evaluation,
      suggestions,
      isCheck: game.in_check(),
      isCheckmate: game.in_checkmate(),
      isStalemate: game.in_stalemate(),
      isDraw: game.in_draw()
    };
  },

  // Evaluate the current position
  evaluatePosition() {
    let score = 0;

    // Material evaluation
    const pieceValues = {
      'p': 1,
      'n': 3,
      'b': 3,
      'r': 5,
      'q': 9,
      'k': 0
    };

    game.board().forEach(row => {
      row.forEach(piece => {
        if (piece) {
          const value = pieceValues[piece.type];
          score += piece.color === 'w' ? value : -value;
        }
      });
    });

    return score;
  },

  // Get suggested moves for the current position
  getSuggestedMoves() {
    const moves = game.moves({ verbose: true });

    // Sort moves by capture value
    const capturePriority = {
      'p': 1,
      'n': 3,
      'b': 3,
      'r': 5,
      'q': 9
    };

    return moves.sort((a, b) => {
      if (a.captured && !b.captured) return -1;
      if (!a.captured && b.captured) return 1;
      if (a.captured && b.captured) {
        return capturePriority[b.captured] - capturePriority[a.captured];
      }
      return 0;
    }).slice(0, 5); // Return top 5 moves
  }
};

// -----------------------------------------------------
// TIMERS AND TIME CONTROL
// -------------------------------------------------------
const gameTimer = {
  whiteTime: 600, // 10 minutes in seconds
  blackTime: 600,
  timerInterval: null,
  isRunning: false,

  // Initialize timers with specified time
  initialize(minutes) {
    this.whiteTime = minutes * 60;
    this.blackTime = minutes * 60;
    this.updateDisplay();
  },

  // Start the timer
  start() {
    if (this.isRunning) return;

    this.isRunning = true;
    this.timerInterval = setInterval(() => {
      const currentTime = game.turn() === 'w' ? this.whiteTime : this.blackTime;

      if (currentTime <= 0) {
        this.stop();
        // Handle timeout
        handleTimeout();
        return;
      }

      if (game.turn() === 'w') {
        this.whiteTime--;
      } else {
        this.blackTime--;
      }

      this.updateDisplay();
    }, 1000);
  },

  // Stop the timer
  stop() {
    this.isRunning = false;
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  },

  // Reset the timer
  reset() {
    this.stop();
    this.whiteTime = 600;
    this.blackTime = 600;
    this.updateDisplay();
  },

  // Update the timer display
  updateDisplay() {
    const whiteTimer = document.getElementById('white-timer');
    const blackTimer = document.getElementById('black-timer');

    if (whiteTimer) {
      whiteTimer.textContent = this.formatTime(this.whiteTime);
    }

    if (blackTimer) {
      blackTimer.textContent = this.formatTime(this.blackTime);
    }
  },

  // Format time in MM:SS
  formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
};

// -----------------------------------------------------
// GAME STATISTICS
// -----------------------------------------------------
const gameStats = {
  gamesPlayed: 0,
  wins: 0,
  losses: 0,
  draws: 0,
  currentStreak: 0,

  // Load stats from localStorage
  loadStats() {
    const stats = localStorage.getItem('chessGameStats');
    if (stats) {
      const parsedStats = JSON.parse(stats);
      this.gamesPlayed = parsedStats.gamesPlayed || 0;
      this.wins = parsedStats.wins || 0;
      this.losses = parsedStats.losses || 0;
      this.draws = parsedStats.draws || 0;
      this.currentStreak = parsedStats.currentStreak || 0;
    }
  },

  // Save stats to localStorage
  saveStats() {
    const stats = {
      gamesPlayed: this.gamesPlayed,
      wins: this.wins,
      losses: this.losses,
      draws: this.draws,
      currentStreak: this.currentStreak
    };
    localStorage.setItem('chessGameStats', JSON.stringify(stats));
  },

  // Record a game result
  recordGame(result) {
    this.gamesPlayed++;

    if (result === 'win') {
      this.wins++;
      this.currentStreak = this.currentStreak > 0 ? this.currentStreak + 1 : 1;
    } else if (result === 'loss') {
      this.losses++;
      this.currentStreak = this.currentStreak < 0 ? this.currentStreak - 1 : -1;
    } else {
      this.draws++;
      this.currentStreak = 0;
    }

    this.saveStats();
  },

  // Get win rate percentage
  getWinRate() {
    if (this.gamesPlayed === 0) return 0;
    return Math.round((this.wins / this.gamesPlayed) * 100);
  }
};

// -----------------------------------------------------
// SOUND EFFECTS
// -----------------------------------------------------
const soundEffects = {
  moveSound: null,
  captureSound: null,
  checkSound: null,
  castleSound: null,
  promoteSound: null,
  gameOverSound: null,

  // Initialize sounds
  initialize() {
    this.moveSound = document.getElementById('move-sound');
    this.captureSound = document.getElementById('capture-sound');
    this.checkSound = document.getElementById('check-sound');
    this.castleSound = document.getElementById('castle-sound');
    this.promoteSound = document.getElementById('promote-sound');
    this.gameOverSound = document.getElementById('game-over-sound');
  },

  // Play move sound
  playMove() {
    if (this.moveSound) {
      this.moveSound.currentTime = 0;
      this.moveSound.play();
    }
  },

  // Play capture sound
  playCapture() {
    if (this.captureSound) {
      this.captureSound.currentTime = 0;
      this.captureSound.play();
    }
  },

  // Play check sound
  playCheck() {
    if (this.checkSound) {
      this.checkSound.currentTime = 0;
      this.checkSound.play();
    }
  },

  // Play castle sound
  playCastle() {
    if (this.castleSound) {
      this.castleSound.currentTime = 0;
      this.castleSound.play();
    }
  },

  // Play promotion sound
  playPromote() {
    if (this.promoteSound) {
      this.promoteSound.currentTime = 0;
      this.promoteSound.play();
    }
  },

  // Play game over sound
  playGameOver() {
    if (this.gameOverSound) {
      this.gameOverSound.currentTime = 0;
      this.gameOverSound.play();
    }
  }
};

// -----------------------------------------------------
// ANIMATIONS
// -----------------------------------------------------
const animations = {
  // Animate a piece move
  animateMove(from, to, callback) {
    const fromSquare = document.querySelector(`[data-square="${from}"]`);
    const toSquare = document.querySelector(`[data-square="${to}"]`);

    if (!fromSquare || !toSquare) {
      if (callback) callback();
      return;
    }

    const piece = fromSquare.querySelector('.piece');
    if (!piece) {
      if (callback) callback();
      return;
    }

    // Get positions
    const fromRect = fromSquare.getBoundingClientRect();
    const toRect = toSquare.getBoundingClientRect();

    // Calculate distance
    const deltaX = toRect.left - fromRect.left;
    const deltaY = toRect.top - fromRect.top;

    // Apply animation
    piece.style.transition = 'transform 0.2s ease-out';
    piece.style.transform = `translate(${deltaX}px, ${deltaY}px)`;

    // After animation, reset and call callback
    setTimeout(() => {
      piece.style.transition = '';
      piece.style.transform = '';
      if (callback) callback();
    }, 200);
  },

  // Animate piece capture
  animateCapture(square, callback) {
    const squareElement = document.querySelector(`[data-square="${square}"]`);
    if (!squareElement) {
      if (callback) callback();
      return;
    }

    const piece = squareElement.querySelector('.piece');
    if (!piece) {
      if (callback) callback();
      return;
    }

    // Apply fade out animation
    piece.style.transition = 'opacity 0.2s ease-out';
    piece.style.opacity = '0';

    setTimeout(() => {
      if (callback) callback();
    }, 200);
  }
};

// Initialize all features when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  moveHighlighting.clearHighlights();
  gameStats.loadStats();
  soundEffects.initialize();
});
