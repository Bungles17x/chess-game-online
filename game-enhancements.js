// Game Enhancements
// This file contains visual and gameplay enhancements for the chess game

// Enhanced visual feedback for moves
function enhanceMoveVisuals() {
  // Add smooth transitions to pieces
  const pieces = document.querySelectorAll('.piece');
  pieces.forEach(piece => {
    piece.style.transition = 'transform 0.2s ease, opacity 0.2s ease';
  });

  // Add glow effect to selected piece
  const selectedSquare = document.querySelector('.square.selected');
  if (selectedSquare) {
    selectedSquare.style.boxShadow = '0 0 20px rgba(14, 165, 233, 0.8)';
    selectedSquare.style.zIndex = '10';
  }
}

// Enhanced move highlighting with arrows
function enhanceMoveHighlighting() {
  const highlightedSquares = document.querySelectorAll('.square.highlight');
  highlightedSquares.forEach(square => {
    // Add pulsing animation
    square.style.animation = 'pulse 1.5s ease-in-out infinite';

    // Add different colors for different move types
    if (square.classList.contains('capture')) {
      square.style.backgroundColor = 'rgba(239, 68, 68, 0.4)';
    } else {
      square.style.backgroundColor = 'rgba(34, 197, 94, 0.4)';
    }
  });
}

// Add checkmate/stalemate visual effects
function enhanceGameEndEffects(gameState) {
  const board = document.querySelector('.chessboard');

  if (gameState === 'checkmate') {
    board.style.animation = 'shake 0.5s ease-in-out';
    setTimeout(() => {
      board.style.animation = '';
    }, 500);

    // Add dramatic overlay
    const overlay = document.createElement('div');
    overlay.className = 'game-end-overlay';
    overlay.innerHTML = '<div class="game-end-message">Checkmate!</div>';
    document.body.appendChild(overlay);

    setTimeout(() => {
      overlay.style.opacity = '0';
      setTimeout(() => overlay.remove(), 500);
    }, 2000);
  } else if (gameState === 'stalemate') {
    const overlay = document.createElement('div');
    overlay.className = 'game-end-overlay';
    overlay.innerHTML = '<div class="game-end-message">Stalemate!</div>';
    document.body.appendChild(overlay);

    setTimeout(() => {
      overlay.style.opacity = '0';
      setTimeout(() => overlay.remove(), 500);
    }, 2000);
  }
}

// Add sound effects with volume control
function enhanceSoundEffects() {
  const moveSound = document.getElementById('move-sound');
  const captureSound = document.getElementById('capture-sound');

  if (moveSound) {
    moveSound.volume = 0.3;
  }
  if (captureSound) {
    captureSound.volume = 0.4;
  }
}

// Add piece capture animation
function enhancePieceCapture(capturedPiece) {
  const pieceElement = capturedPiece.querySelector('.piece');
  if (pieceElement) {
    pieceElement.style.transform = 'scale(0) rotate(180deg)';
    pieceElement.style.opacity = '0';
  }
}

// Add move indicator arrows
function addMoveIndicators(from, to) {
  const fromSquare = document.querySelector(`[data-square="${from}"]`);
  const toSquare = document.querySelector(`[data-square="${to}"]`);

  if (fromSquare && toSquare) {
    // Create arrow indicator
    const arrow = document.createElement('div');
    arrow.className = 'move-arrow';

    // Calculate arrow position and rotation
    const fromRect = fromSquare.getBoundingClientRect();
    const toRect = toSquare.getBoundingClientRect();

    const deltaX = toRect.left - fromRect.left;
    const deltaY = toRect.top - fromRect.top;
    const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    arrow.style.left = `${fromRect.left + fromRect.width / 2}px`;
    arrow.style.top = `${fromRect.top + fromRect.height / 2}px`;
    arrow.style.width = `${distance}px`;
    arrow.style.transform = `rotate(${angle}deg)`;

    document.body.appendChild(arrow);

    // Remove arrow after animation
    setTimeout(() => {
      arrow.style.opacity = '0';
      setTimeout(() => arrow.remove(), 300);
    }, 1000);
  }
}

// Add promotion modal with piece preview
function enhancePromotionModal() {
  const promotionModal = document.getElementById('promotion-modal');
  if (!promotionModal) return;

  const pieces = promotionModal.querySelectorAll('.promotion-piece');
  pieces.forEach(piece => {
    piece.addEventListener('mouseenter', () => {
      piece.style.transform = 'scale(1.2)';
      piece.style.boxShadow = '0 0 20px rgba(14, 165, 233, 0.8)';
    });

    piece.addEventListener('mouseleave', () => {
      piece.style.transform = 'scale(1)';
      piece.style.boxShadow = '';
    });
  });
}

// Add board coordinates with hover effects
function enhanceBoardCoordinates() {
  const board = document.querySelector('.chessboard');
  if (!board) return;

  // Check if coordinates should be shown
  const showCoordinates = localStorage.getItem('showCoordinates') !== 'false';
  if (!showCoordinates) {
    // Remove any existing coordinates
    removeBoardCoordinates();
    return;
  }

  // Add file labels (a-h)
  for (let i = 0; i < 8; i++) {
    const fileLabel = document.createElement('div');
    fileLabel.className = 'board-coordinate file-label';
    fileLabel.textContent = String.fromCharCode(97 + i);
    fileLabel.style.left = `${(i + 0.5) * 12.5}%`;
    board.appendChild(fileLabel);
  }

  // Add rank labels (1-8)
  for (let i = 0; i < 8; i++) {
    const rankLabel = document.createElement('div');
    rankLabel.className = 'board-coordinate rank-label';
    rankLabel.textContent = 8 - i;
    rankLabel.style.top = `${(i + 0.5) * 12.5}%`;
    board.appendChild(rankLabel);
  }
}

// Remove board coordinates
function removeBoardCoordinates() {
  const board = document.querySelector('.chessboard');
  if (!board) return;

  // Remove all coordinate labels
  const coordinates = board.querySelectorAll('.board-coordinate');
  coordinates.forEach(coord => coord.remove());
}

// Add move history with visual indicators
function enhanceMoveHistory() {
  const movesList = document.getElementById('moves-list');
  if (!movesList) return;

  const moves = movesList.querySelectorAll('li');
  moves.forEach((move, index) => {
    // Add move number
    if (index % 2 === 0) {
      move.innerHTML = `<span class="move-number">${(index / 2) + 1}.</span> ${move.textContent}`;
    }

    // Add hover effect to show move on board
    move.addEventListener('mouseenter', () => {
      move.style.backgroundColor = 'rgba(14, 165, 233, 0.2)';
    });

    move.addEventListener('mouseleave', () => {
      move.style.backgroundColor = '';
    });
  });
}

// Add keyboard shortcuts
function enhanceKeyboardControls() {
  document.addEventListener('keydown', (e) => {
    // Ctrl+Z to undo (in bot mode)
    if (e.ctrlKey && e.key === 'z' && gameMode === 'bot') {
      e.preventDefault();
      game.undo();
      renderPosition();
      updateTurnIndicator();
    }

    // Escape to deselect
    if (e.key === 'Escape') {
      clearHighlights();
      selectedSquare = null;
      legalMovesFromSelected = [];
    }

    // Space to offer draw
    if (e.key === ' ' && gameMode === 'online') {
      e.preventDefault();
      document.getElementById('draw-btn').click();
    }
  });
}

// Add responsive board size adjustment
function enhanceResponsiveBoard() {
  function adjustBoardSize() {
    const board = document.querySelector('.chessboard');
    const container = board.parentElement;

    const minDimension = Math.min(
      container.clientWidth,
      window.innerHeight * 0.7
    );

    board.style.width = `${minDimension}px`;
    board.style.height = `${minDimension}px`;
  }

  window.addEventListener('resize', adjustBoardSize);
  adjustBoardSize();
}

// Initialize all enhancements
function initializeGameEnhancements() {
  enhanceSoundEffects();
  enhanceBoardCoordinates();
  enhanceKeyboardControls();
  enhanceResponsiveBoard();

  console.log('Game enhancements initialized');
}

// Make functions available globally
window.enhanceMoveVisuals = enhanceMoveVisuals;
window.enhanceMoveHighlighting = enhanceMoveHighlighting;
window.enhanceGameEndEffects = enhanceGameEndEffects;
window.enhanceBoardCoordinates = enhanceBoardCoordinates;
window.removeBoardCoordinates = removeBoardCoordinates;
window.enhancePieceCapture = enhancePieceCapture;
window.addMoveIndicators = addMoveIndicators;
window.enhancePromotionModal = enhancePromotionModal;
window.enhanceMoveHistory = enhanceMoveHistory;
window.initializeGameEnhancements = initializeGameEnhancements;

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeGameEnhancements);
} else {
  initializeGameEnhancements();
}
