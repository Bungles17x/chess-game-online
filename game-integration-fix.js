// Game Integration Fix
// Properly integrates achievements and rewards with game mechanics

// ============================================
// GAME MOVE INTERCEPTION
// ============================================

let originalGameMove = null;
let originalGameReset = null;
let integrationMoveHistory = [];
let isDispatchingMove = false;

function interceptGameMethods() {
  if (typeof game === 'undefined' || !game) {
    console.warn('[Game Integration] Game not available yet');
    return false;
  }

  // Only intercept once
  if (originalGameMove) {
    console.log('[Game Integration] Already intercepted');
    return true;
  }

  // Store original methods
  originalGameMove = game.move.bind(game);
  originalGameReset = game.reset.bind(game);

  // Override move method
  game.move = function(move) {
    const result = originalGameMove(move);

    if (result) {
      // Track move
      const moveNumber = game.history().length;
      integrationMoveHistory.push({
        ...result,
        moveNumber,
        timestamp: Date.now()
      });

      // Dispatch game move event
      dispatchGameMoveEvent({
        move: result,
        moveNumber: moveNumber,
        history: game.history()
      });

      // Check for captures
      if (result.captured) {
        dispatchPieceCapturedEvent({
          piece: { type: result.captured, color: result.color === 'w' ? 'b' : 'w' },
          from: result.from,
          to: result.to
        });
      }

      // Check for check
      if (game.in_check()) {
        dispatchCheckEvent({
          color: game.turn(),
          inCheck: true
        });
      }

      // Check for checkmate
      if (game.in_checkmate()) {
        dispatchCheckmateEvent({
          color: game.turn(),
          winner: result.color === 'w' ? 'white' : 'black',
          moveNumber: moveNumber,
          history: game.history()
        });

        // Dispatch game end event
        dispatchGameEndEvent({
          result: result.color === 'w' ? 'win' : 'loss',
          reason: 'checkmate',
          moves: moveNumber,
          winner: result.color === 'w' ? 'white' : 'black'
        });
      }

      // Check for draw
      if (game.in_draw()) {
        dispatchGameEndEvent({
          result: 'draw',
          reason: 'draw',
          moves: moveNumber
        });
      }

      // Update achievements
      if (typeof achievementsSystem !== 'undefined' && achievementsSystem) {
        updateAchievements(result, moveNumber);
      }
    }

    return result;
  };

  // Override reset method
  game.reset = function() {
    const result = originalGameReset();
    integrationMoveHistory = [];

    // Dispatch game end event for reset
    dispatchGameEndEvent({
      result: 'reset',
      reason: 'manual_reset',
      moves: 0
    });

    return result;
  };

  console.log('[Game Integration] Successfully intercepted game methods');
  return true;
}

// ============================================
// ACHIEVEMENT UPDATES
// ============================================

function updateAchievements(moveResult, moveNumber) {
  // First move achievement
  if (moveNumber === 1) {
    achievementsSystem.unlock('firstMove');
  }

  // Check for quick win
  if (moveNumber <= 10 && game.in_checkmate()) {
    achievementsSystem.unlock('fourMoveMate');
  }

  // Check for scholar's mate
  if (isScholarsMate()) {
    achievementsSystem.unlock('scholarsMate');
  }

  // Check for queen sacrifice
  if (isQueenSacrifice()) {
    achievementsSystem.unlock('queenSacrifice');
  }

  // Check for perfect game
  if (isPerfectGame()) {
    achievementsSystem.unlock('perfectGame');
  }

  // Check for comeback
  if (isComeback()) {
    achievementsSystem.unlock('comebackKing');
  }
}

// ============================================
// SPECIAL CHECK FUNCTIONS
// ============================================

function isScholarsMate() {
  const history = game.history();
  if (history.length < 4) return false;

  const lastMoves = history.slice(-4);
  const pattern = [
    { from: 'e2', to: 'e4' },
    { from: 'e7', to: 'e5' },
    { from: 'f1', to: 'c4' },
    { from: 'h8', to: 'c4' }
  ];

  return lastMoves.every((move, i) => {
    return move.from === pattern[i].from && move.to === pattern[i].to;
  });
}

function isQueenSacrifice() {
  const history = game.history();
  if (history.length < 10) return false;

  // Look for queen capture followed by checkmate
  for (let i = history.length - 10; i < history.length - 1; i++) {
    if (history[i].captured === 'q' && game.in_checkmate()) {
      return true;
    }
  }

  return false;
}

function isPerfectGame() {
  const history = game.history();
  if (!game.in_checkmate()) return false;

  // Check if won without losing any pieces
  const board = game.board();
  const winner = game.turn() === 'w' ? 'b' : 'w';

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece && piece.color === winner && piece.captured) {
        return false;
      }
    }
  }

  return true;
}

function isComeback() {
  const history = game.history();
  if (history.length < 20) return false;

  // Check material balance at midgame
  const midgameMoves = history.slice(10, 20);
  let materialDiff = 0;

  midgameMoves.forEach(move => {
    if (move.captured) {
      materialDiff += move.color === 'w' ? -1 : 1;
    }
  });

  // If was behind by 3+ pieces and won
  if (materialDiff < -3 && game.in_checkmate()) {
    return true;
  }

  return false;
}

// ============================================
// EVENT DISPATCHERS
// ============================================

function dispatchGameMoveEvent(data) {
  if (isDispatchingMove) return;
  isDispatchingMove = true;

  document.dispatchEvent(new CustomEvent('gameMove', {
    detail: data,
    bubbles: true,
    cancelable: true
  }));

  console.log('[Game Integration] Dispatched gameMove event', data);

  // Reset flag after a short delay
  setTimeout(() => {
    isDispatchingMove = false;
  }, 100);
}

function dispatchGameEndEvent(data) {
  document.dispatchEvent(new CustomEvent('gameEnd', {
    detail: data,
    bubbles: true,
    cancelable: true
  }));

  console.log('[Game Integration] Dispatched gameEnd event', data);

  // Update player stats
  updatePlayerStats(data);
}

function dispatchPieceCapturedEvent(data) {
  document.dispatchEvent(new CustomEvent('pieceCaptured', {
    detail: data,
    bubbles: true,
    cancelable: true
  }));

  console.log('[Game Integration] Dispatched pieceCaptured event', data);
}

function dispatchCheckEvent(data) {
  document.dispatchEvent(new CustomEvent('check', {
    detail: data,
    bubbles: true,
    cancelable: true
  }));

  console.log('[Game Integration] Dispatched check event', data);
}

function dispatchCheckmateEvent(data) {
  document.dispatchEvent(new CustomEvent('checkmate', {
    detail: data,
    bubbles: true,
    cancelable: true
  }));

  console.log('[Game Integration] Dispatched checkmate event', data);
}

// ============================================
// PLAYER STATS
// ============================================

function updatePlayerStats(gameData) {
  // Update total games
  const totalGames = parseInt(localStorage.getItem('totalGamesPlayed') || '0');
  localStorage.setItem('totalGamesPlayed', (totalGames + 1).toString());

  // Update win streak
  if (gameData.result === 'win') {
    const currentStreak = parseInt(localStorage.getItem('currentWinStreak') || '0');
    localStorage.setItem('currentWinStreak', (currentStreak + 1).toString());
  } else if (gameData.result === 'loss') {
    localStorage.setItem('currentWinStreak', '0');
  }

  // Award XP
  const xpAwarded = gameData.result === 'win' ? 100 : gameData.result === 'draw' ? 50 : 25;
  const currentXP = parseInt(localStorage.getItem('playerXP') || '0');
  const newXP = currentXP + xpAwarded;
  localStorage.setItem('playerXP', newXP.toString());

  // Update currentUser level
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
  if (currentUser) {
    const oldLevel = currentUser.level;
    currentUser.xp = newXP;
    currentUser.level = Math.floor(newXP / 1000) + 1;
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    console.log('[Game Integration] Updated user XP:', newXP, 'Level:', currentUser.level);
    
    // Show level up animation if level changed
    if (currentUser.level > oldLevel) {
      console.log('[Game Integration] Level up detected! Old level:', oldLevel, 'New level:', currentUser.level);
      if (typeof showLevelUpAnimation === 'function') {
        showLevelUpAnimation(oldLevel, currentUser.level);
      } else {
        console.log('[Game Integration] showLevelUpAnimation not available');
      }
    }
  }

  console.log('[Game Integration] Updated player stats', {
    result: gameData.result,
    xpAwarded,
    totalXP: currentXP + xpAwarded
  });
}

// ============================================
// INITIALIZATION
// ============================================

function initializeGameIntegration() {
  // Wait for game to be available
  const checkInterval = setInterval(() => {
    if (typeof game !== 'undefined' && game) {
      clearInterval(checkInterval);

      // Intercept game methods
      if (interceptGameMethods()) {
        console.log('[Game Integration] Successfully initialized');

        // Dispatch initial game state
        dispatchGameMoveEvent({
          move: null,
          moveNumber: 0,
          history: []
        });
      } else {
        console.error('[Game Integration] Failed to initialize');
      }
    }
  }, 100);

  // Timeout after 10 seconds
  setTimeout(() => {
    clearInterval(checkInterval);
  }, 10000);
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeGameIntegration);
} else {
  initializeGameIntegration();
}

// Export functions
window.interceptGameMethods = interceptGameMethods;
window.updateAchievements = updateAchievements;
window.dispatchGameMoveEvent = dispatchGameMoveEvent;
window.dispatchGameEndEvent = dispatchGameEndEvent;
window.dispatchPieceCapturedEvent = dispatchPieceCapturedEvent;
window.dispatchCheckEvent = dispatchCheckEvent;
window.dispatchCheckmateEvent = dispatchCheckmateEvent;
