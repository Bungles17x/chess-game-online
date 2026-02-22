// Game Replay System for Modern Chess
// This file allows players to replay and analyze their games

const gameReplay = {
  currentGame: null,
  currentMove: 0,
  isPlaying: false,
  playbackSpeed: 1000, // milliseconds per move
  playbackInterval: null,

  // Initialize replay system
  initialize() {
    this.setupControls();
    this.setupKeyboardShortcuts();
  },

  // Load a game for replay
  loadGame(gameData) {
    this.currentGame = {
      moves: gameData.moves || [],
      whitePlayer: gameData.whitePlayer || 'White',
      blackPlayer: gameData.blackPlayer || 'Black',
      result: gameData.result || '*',
      date: gameData.date || new Date().toISOString(),
      pgn: gameData.pgn || ''
    };

    this.currentMove = 0;
    this.stopPlayback();
    this.resetToStart();
    this.updateUI();
  },

  // Setup replay controls
  setupControls() {
    const replayControls = document.getElementById('replay-controls');
    if (!replayControls) return;

    // Start button
    const startBtn = document.getElementById('replay-start');
    if (startBtn) {
      startBtn.addEventListener('click', () => this.resetToStart());
    }

    // Previous button
    const prevBtn = document.getElementById('replay-prev');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => this.previousMove());
    }

    // Play/Pause button
    const playBtn = document.getElementById('replay-play');
    if (playBtn) {
      playBtn.addEventListener('click', () => this.togglePlayback());
    }

    // Next button
    const nextBtn = document.getElementById('replay-next');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => this.nextMove());
    }

    // End button
    const endBtn = document.getElementById('replay-end');
    if (endBtn) {
      endBtn.addEventListener('click', () => this.goToEnd());
    }

    // Speed control
    const speedSelect = document.getElementById('replay-speed');
    if (speedSelect) {
      speedSelect.addEventListener('change', (e) => {
        this.playbackSpeed = parseInt(e.target.value);
        if (this.isPlaying) {
          this.stopPlayback();
          this.startPlayback();
        }
      });
    }
  },

  // Setup keyboard shortcuts
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Only respond if replay mode is active
      if (!this.currentGame) return;

      switch(e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          this.previousMove();
          break;
        case 'ArrowRight':
          e.preventDefault();
          this.nextMove();
          break;
        case ' ':
          e.preventDefault();
          this.togglePlayback();
          break;
        case 'Home':
          e.preventDefault();
          this.resetToStart();
          break;
        case 'End':
          e.preventDefault();
          this.goToEnd();
          break;
      }
    });
  },

  // Go to the start of the game
  resetToStart() {
    if (!this.currentGame) return;

    this.currentMove = 0;
    game.reset();
    renderBoard();
    this.updateUI();
  },

  // Go to the end of the game
  goToEnd() {
    if (!this.currentGame) return;

    this.currentMove = this.currentGame.moves.length;
    this.replayToMove(this.currentMove);
    this.updateUI();
  },

  // Go to previous move
  previousMove() {
    if (!this.currentGame || this.currentMove <= 0) return;

    this.currentMove--;
    this.replayToMove(this.currentMove);
    this.updateUI();
  },

  // Go to next move
  nextMove() {
    if (!this.currentGame || this.currentMove >= this.currentGame.moves.length) return;

    this.currentMove++;
    this.replayToMove(this.currentMove);
    this.updateUI();
  },

  // Replay to a specific move
  replayToMove(moveIndex) {
    if (!this.currentGame) return;

    // Reset game
    game.reset();

    // Replay moves up to the specified index
    for (let i = 0; i < moveIndex; i++) {
      game.move(this.currentGame.moves[i]);
    }

    renderBoard();
  },

  // Toggle playback
  togglePlayback() {
    if (this.isPlaying) {
      this.stopPlayback();
    } else {
      this.startPlayback();
    }
  },

  // Start automatic playback
  startPlayback() {
    if (!this.currentGame || this.isPlaying) return;

    if (this.currentMove >= this.currentGame.moves.length) {
      this.resetToStart();
    }

    this.isPlaying = true;
    this.updatePlayButton();

    this.playbackInterval = setInterval(() => {
      if (this.currentMove >= this.currentGame.moves.length) {
        this.stopPlayback();
        return;
      }

      this.nextMove();
    }, this.playbackSpeed);
  },

  // Stop automatic playback
  stopPlayback() {
    if (!this.isPlaying) return;

    this.isPlaying = false;
    this.updatePlayButton();

    if (this.playbackInterval) {
      clearInterval(this.playbackInterval);
      this.playbackInterval = null;
    }
  },

  // Update play button state
  updatePlayButton() {
    const playBtn = document.getElementById('replay-play');
    if (!playBtn) return;

    playBtn.textContent = this.isPlaying ? '⏸ Pause' : '▶ Play';
    playBtn.classList.toggle('playing', this.isPlaying);
  },

  // Update UI elements
  updateUI() {
    // Update move counter
    const moveCounter = document.getElementById('replay-move-counter');
    if (moveCounter) {
      moveCounter.textContent = `${this.currentMove} / ${this.currentGame.moves.length}`;
    }

    // Update player info
    const whitePlayer = document.getElementById('replay-white-player');
    const blackPlayer = document.getElementById('replay-black-player');
    if (whitePlayer) whitePlayer.textContent = this.currentGame.whitePlayer;
    if (blackPlayer) blackPlayer.textContent = this.currentGame.blackPlayer;

    // Update game result
    const result = document.getElementById('replay-result');
    if (result) result.textContent = this.currentGame.result;

    // Update move list
    this.updateMoveList();

    // Highlight current move
    this.highlightCurrentMove();

    // Update button states
    this.updateButtonStates();
  },

  // Update move list display
  updateMoveList() {
    const moveList = document.getElementById('replay-move-list');
    if (!moveList) return;

    moveList.innerHTML = '';

    for (let i = 0; i < this.currentGame.moves.length; i += 2) {
      const moveNumber = Math.floor(i / 2) + 1;
      const whiteMove = this.currentGame.moves[i] || '';
      const blackMove = this.currentGame.moves[i + 1] || '';

      const moveRow = document.createElement('div');
      moveRow.className = 'replay-move-row';
      moveRow.innerHTML = `
        <span class="replay-move-number">${moveNumber}.</span>
        <span class="replay-move white-move ${i === this.currentMove - 1 ? 'current' : ''}">${whiteMove}</span>
        <span class="replay-move black-move ${i + 1 === this.currentMove - 1 ? 'current' : ''}">${blackMove}</span>
      `;

      // Click to jump to move
      moveRow.addEventListener('click', () => {
        this.currentMove = i + 1;
        this.replayToMove(this.currentMove);
        this.updateUI();
      });

      moveList.appendChild(moveRow);
    }

    // Scroll to current move
    this.scrollToCurrentMove();
  },

  // Highlight current move in the list
  highlightCurrentMove() {
    document.querySelectorAll('.replay-move.current').forEach(el => {
      el.classList.remove('current');
    });

    const moveList = document.getElementById('replay-move-list');
    if (!moveList) return;

    const moves = moveList.querySelectorAll('.replay-move');
    if (this.currentMove > 0 && moves[this.currentMove - 1]) {
      moves[this.currentMove - 1].classList.add('current');
    }
  },

  // Scroll to current move
  scrollToCurrentMove() {
    const currentMove = document.querySelector('.replay-move.current');
    if (currentMove) {
      currentMove.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  },

  // Update button states
  updateButtonStates() {
    const startBtn = document.getElementById('replay-start');
    const prevBtn = document.getElementById('replay-prev');
    const nextBtn = document.getElementById('replay-next');
    const endBtn = document.getElementById('replay-end');

    if (startBtn) startBtn.disabled = this.currentMove === 0;
    if (prevBtn) prevBtn.disabled = this.currentMove === 0;
    if (nextBtn) nextBtn.disabled = this.currentMove >= this.currentGame.moves.length;
    if (endBtn) endBtn.disabled = this.currentMove >= this.currentGame.moves.length;
  },

  // Export game to PGN format
  exportToPGN() {
    if (!this.currentGame) return '';

    let pgn = `[Event "Modern Chess Game"]
`;
    pgn += `[Date "${new Date(this.currentGame.date).toLocaleDateString()}"]
`;
    pgn += `[White "${this.currentGame.whitePlayer}"]
`;
    pgn += `[Black "${this.currentGame.blackPlayer}"]
`;
    pgn += `[Result "${this.currentGame.result}"]

`;

    // Add moves
    for (let i = 0; i < this.currentGame.moves.length; i += 2) {
      const moveNumber = Math.floor(i / 2) + 1;
      const whiteMove = this.currentGame.moves[i] || '';
      const blackMove = this.currentGame.moves[i + 1] || '';

      pgn += `${moveNumber}. ${whiteMove}`;
      if (blackMove) pgn += ` ${blackMove}`;
      pgn += ' ';
    }

    pgn += this.currentGame.result;

    return pgn;
  },

  // Save game to local storage
  saveGame() {
    if (!this.currentGame) return;

    const savedGames = JSON.parse(localStorage.getItem('chessGameReplays') || '[]');
    savedGames.push({
      ...this.currentGame,
      id: Date.now()
    });
    localStorage.setItem('chessGameReplays', JSON.stringify(savedGames));
  },

  // Load saved games
  loadSavedGames() {
    return JSON.parse(localStorage.getItem('chessGameReplays') || '[]');
  },

  // Delete a saved game
  deleteGame(gameId) {
    const savedGames = this.loadSavedGames();
    const filtered = savedGames.filter(game => game.id !== gameId);
    localStorage.setItem('chessGameReplays', JSON.stringify(filtered));
  }
};

// Initialize replay system when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  gameReplay.initialize();
});
