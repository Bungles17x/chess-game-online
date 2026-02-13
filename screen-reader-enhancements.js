// Screen Reader Enhancements
// Provides enhanced accessibility for screen reader users

class ScreenReaderEnhancements {
  constructor() {
    this.enabled = false;
    this.liveRegion = null;
    this.currentGameState = null;
  }

  // Initialize screen reader enhancements
  init() {
    // Check if screen reader mode is enabled
    this.enabled = localStorage.getItem('screenReaderMode') === 'true';
    window.screenReaderMode = this.enabled;

    // Create live region for announcements
    this.createLiveRegion();

    // Setup event listeners
    this.setupEventListeners();

    // Apply initial screen reader mode
    this.applyScreenReaderMode(this.enabled);

    console.log('[Screen Reader] Enhancements initialized', { enabled: this.enabled });
  }

  // Create live region for screen reader announcements
  createLiveRegion() {
    this.liveRegion = document.createElement('div');
    this.liveRegion.setAttribute('aria-live', 'polite');
    this.liveRegion.setAttribute('aria-atomic', 'true');
    this.liveRegion.className = 'sr-only';
    this.liveRegion.id = 'screen-reader-announcer';
    document.body.appendChild(this.liveRegion);
  }

  // Setup event listeners for game events
  setupEventListeners() {
    // Listen for game state changes
    window.addEventListener('gameStateChange', (e) => {
      this.announceGameState(e.detail);
    });

    // Listen for moves
    window.addEventListener('moveMade', (e) => {
      this.announceMove(e.detail);
    });

    // Listen for piece selection
    window.addEventListener('pieceSelected', (e) => {
      this.announcePieceSelection(e.detail);
    });

    // Listen for game events
    window.addEventListener('check', () => this.announce('Check'));
    window.addEventListener('checkmate', (e) => this.announceCheckmate(e.detail));
    window.addEventListener('stalemate', () => this.announce('Stalemate'));
    window.addEventListener('draw', (e) => this.announceDraw(e.detail));

    // Listen for mode changes
    window.addEventListener('screenReaderModeChanged', (e) => {
      this.enabled = e.detail.enabled;
      this.applyScreenReaderMode(this.enabled);
    });
  }

  // Apply screen reader mode
  applyScreenReaderMode(enabled) {
    this.enabled = enabled;

    if (enabled) {
      // Add ARIA labels to chessboard
      this.addChessboardLabels();

      // Add piece descriptions
      this.addPieceDescriptions();

      // Announce mode activation
      this.announce('Screen reader mode enabled');
    } else {
      // Remove enhanced ARIA labels
      this.removeChessboardLabels();

      // Announce mode deactivation
      this.announce('Screen reader mode disabled');
    }
  }

  // Add ARIA labels to chessboard
  addChessboardLabels() {
    const board = document.getElementById('chessboard');
    if (!board) return;

    board.setAttribute('role', 'grid');
    board.setAttribute('aria-label', 'Chess board');

    const squares = board.querySelectorAll('.square');
    squares.forEach((square, index) => {
      const row = Math.floor(index / 8);
      const col = index % 8;
      const file = String.fromCharCode(97 + col);
      const rank = 8 - row;

      square.setAttribute('role', 'gridcell');
      square.setAttribute('aria-label', `${file}${rank}`);
      square.dataset.position = `${file}${rank}`;
    });
  }

  // Remove chessboard labels
  removeChessboardLabels() {
    const board = document.getElementById('chessboard');
    if (!board) return;

    board.removeAttribute('role');
    board.removeAttribute('aria-label');

    const squares = board.querySelectorAll('.square');
    squares.forEach(square => {
      square.removeAttribute('role');
      square.removeAttribute('aria-label');
    });
  }

  // Add piece descriptions
  addPieceDescriptions() {
    const pieces = document.querySelectorAll('.piece');
    pieces.forEach(piece => {
      const square = piece.closest('.square');
      if (square) {
        const position = square.dataset.position || '';
        const pieceType = this.getPieceType(piece.textContent);
        const color = this.getPieceColor(piece);
        piece.setAttribute('aria-label', `${color} ${pieceType} at ${position}`);
      }
    });
  }

  // Get piece type from piece symbol
  getPieceType(symbol) {
    const pieceTypes = {
      '♔': 'King',
      '♕': 'Queen',
      '♖': 'Rook',
      '♗': 'Bishop',
      '♘': 'Knight',
      '♙': 'Pawn'
    };
    return pieceTypes[symbol] || 'Piece';
  }

  // Get piece color
  getPieceColor(piece) {
    const style = window.getComputedStyle(piece);
    const color = style.color;
    return color === 'rgb(249, 250, 251)' || color === '#f9fafb' ? 'White' : 'Black';
  }

  // Announce game state
  announceGameState(state) {
    this.currentGameState = state;

    if (!this.enabled) return;

    const messages = [];

    if (state.turn) {
      messages.push(`${state.turn}'s turn`);
    }

    if (state.check) {
      messages.push('Check');
    }

    if (state.checkmate) {
      messages.push('Checkmate');
    }

    if (state.stalemate) {
      messages.push('Stalemate');
    }

    if (messages.length > 0) {
      this.announce(messages.join(', '));
    }
  }

  // Announce move
  announceMove(move) {
    if (!this.enabled) return;

    const { from, to, piece, captured, promotion } = move;
    const pieceType = this.getPieceType(piece);
    const message = `${pieceType} moves from ${from} to ${to}`;

    if (captured) {
      this.announce(`${message}, capturing ${this.getPieceType(captured)}`);
    } else {
      this.announce(message);
    }

    if (promotion) {
      this.announce(`Promoted to ${this.getPieceType(promotion)}`);
    }
  }

  // Announce piece selection
  announcePieceSelection(piece) {
    if (!this.enabled) return;

    const { position, piece: pieceSymbol, validMoves } = piece;
    const pieceType = this.getPieceType(pieceSymbol);
    const color = this.getPieceColor(pieceSymbol);

    this.announce(`${color} ${pieceType} selected at ${position}`);

    if (validMoves && validMoves.length > 0) {
      setTimeout(() => {
        this.announce(`Can move to ${validMoves.join(', ')}`);
      }, 500);
    }
  }

  // Announce checkmate
  announceCheckmate(winner) {
    if (!this.enabled) return;

    const message = winner ? `Checkmate! ${winner} wins` : 'Checkmate!';
    this.announce(message);
  }

  // Announce draw
  announceDraw(reason) {
    if (!this.enabled) return;

    const message = reason ? `Draw by ${reason}` : 'Draw';
    this.announce(message);
  }

  // Announce message to screen reader
  announce(message) {
    if (!this.liveRegion) return;

    // Clear previous announcement
    this.liveRegion.textContent = '';

    // Force reflow
    this.liveRegion.offsetHeight;

    // Set new announcement
    this.liveRegion.textContent = message;
  }

  // Get valid moves for a piece
  getValidMoves(pieceElement) {
    const square = pieceElement.closest('.square');
    if (!square) return [];

    const position = square.dataset.position;
    if (!position) return [];

    // This would integrate with your game's move validation logic
    // For now, return empty array
    return [];
  }
}

// Initialize screen reader enhancements
const screenReaderEnhancements = new ScreenReaderEnhancements();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => screenReaderEnhancements.init());
} else {
  screenReaderEnhancements.init();
}

// Export for global use
window.screenReaderEnhancements = screenReaderEnhancements;
window.applyScreenReaderMode = (enabled) => screenReaderEnhancements.applyScreenReaderMode(enabled);
window.announce = (message) => screenReaderEnhancements.announce(message);
