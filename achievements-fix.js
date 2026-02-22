// Achievements System Fix
// This file fixes the achievements and rewards system by ensuring events are properly dispatched

// ============================================
// EVENT DISPATCHER
// ============================================

const achievementEvents = {
  // Dispatch game move event
  dispatchGameMove(moveData) {
    document.dispatchEvent(new CustomEvent('gameMove', {
      detail: moveData
    }));
  },

  // Dispatch game end event
  dispatchGameEnd(gameData) {
    document.dispatchEvent(new CustomEvent('gameEnd', {
      detail: gameData
    }));
  },

  // Dispatch piece captured event
  dispatchPieceCaptured(captureData) {
    document.dispatchEvent(new CustomEvent('pieceCaptured', {
      detail: captureData
    }));
  },

  // Dispatch check event
  dispatchCheck(checkData) {
    document.dispatchEvent(new CustomEvent('check', {
      detail: checkData
    }));
  },

  // Dispatch checkmate event
  dispatchCheckmate(checkmateData) {
    document.dispatchEvent(new CustomEvent('checkmate', {
      detail: checkmateData
    }));
  }
};

// ============================================
// ACHIEVEMENTS INTEGRATION
// ============================================

function integrateAchievements() {
  // Hook into game move
  const originalMove = game.move;
  game.move = function(move) {
    const result = originalMove.call(this, move);
    if (result) {
      achievementEvents.dispatchGameMove({
        move: result,
        moveNumber: game.history().length
      });

      // Check for captures
      if (result.captured) {
        achievementEvents.dispatchPieceCaptured({
          piece: { type: result.captured, color: result.color === 'w' ? 'b' : 'w' }
        });
      }

      // Check for check
      if (game.in_check()) {
        achievementEvents.dispatchCheck({
          color: game.turn()
        });
      }

      // Check for checkmate
      if (game.in_checkmate()) {
        achievementEvents.dispatchCheckmate({
          color: game.turn(),
          moveNumber: game.history().length
        });
      }
    }
    return result;
  };

  // Hook into game reset
  const originalReset = game.reset;
  game.reset = function() {
    const result = originalReset.call(this);
    achievementEvents.dispatchGameEnd({
      result: 'reset',
      moves: 0
    });
    return result;
  };

  console.log('[Achievements] Successfully integrated with game');
}

// ============================================
// LEVEL SYSTEM FIX
// ============================================

function initializeLevelSystem() {
  // Initialize XP if not set
  if (!localStorage.getItem('playerXP')) {
    localStorage.setItem('playerXP', '0');
  }

  // Initialize win streak if not set
  if (!localStorage.getItem('currentWinStreak')) {
    localStorage.setItem('currentWinStreak', '0');
  }

  // Initialize total games if not set
  if (!localStorage.getItem('totalGamesPlayed')) {
    localStorage.setItem('totalGamesPlayed', '0');
  }

  console.log('[Level System] Initialized');
}

// ============================================
// GAME END HANDLER
// ============================================

function handleGameEnd(result) {
  const gameData = {
    result: result,
    moves: game.history().length,
    timestamp: Date.now()
  };

  // Update win streak
  if (result === 'win') {
    const currentStreak = parseInt(localStorage.getItem('currentWinStreak') || '0');
    localStorage.setItem('currentWinStreak', (currentStreak + 1).toString());
  } else if (result === 'loss') {
    localStorage.setItem('currentWinStreak', '0');
  }

  // Update total games
  const totalGames = parseInt(localStorage.getItem('totalGamesPlayed') || '0');
  localStorage.setItem('totalGamesPlayed', (totalGames + 1).toString());

  // Award XP for playing
  const xpAwarded = result === 'win' ? 100 : result === 'draw' ? 50 : 25;
  const currentXP = parseInt(localStorage.getItem('playerXP') || '0');
  localStorage.setItem('playerXP', (currentXP + xpAwarded).toString());

  // Dispatch game end event
  achievementEvents.dispatchGameEnd(gameData);

  console.log('[Game End] Result:', result, 'XP:', xpAwarded);
}

// ============================================
// NOTIFICATION FIX
// ============================================

function fixAchievementNotifications() {
  // Add CSS for notifications if not present
  if (!document.querySelector('#achievement-notifications-style')) {
    const style = document.createElement('style');
    style.id = 'achievement-notifications-style';
    style.textContent = `
      .achievement-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 16px 20px;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        display: flex;
        align-items: center;
        gap: 12px;
        z-index: 10000;
        opacity: 0;
        transform: translateX(100px);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .achievement-notification.show {
        opacity: 1;
        transform: translateX(0);
      }

      .achievement-icon {
        font-size: 32px;
        line-height: 1;
      }

      .achievement-info {
        display: flex;
        flex-direction: column;
      }

      .achievement-name {
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        opacity: 0.9;
      }

      .achievement-title {
        font-size: 16px;
        font-weight: 700;
        margin: 2px 0;
      }

      .achievement-xp {
        font-size: 14px;
        font-weight: 500;
        opacity: 0.9;
      }
    `;
    document.head.appendChild(style);
  }
}

// ============================================
// INITIALIZATION
// ============================================

function initializeAchievementsFix() {
  // Wait for game to be initialized
  const checkGame = setInterval(() => {
    if (typeof game !== 'undefined' && game) {
      clearInterval(checkGame);

      // Initialize systems
      initializeLevelSystem();
      integrateAchievements();
      fixAchievementNotifications();

      // Hook into existing game end handlers
      const originalHandleGameOver = typeof handleGameOver === 'function' ? handleGameOver : null;
      if (originalHandleGameOver) {
        window.handleGameOver = function() {
          const result = determineGameResult();
          handleGameEnd(result);
          originalHandleGameOver.call(this);
        };
      }

      console.log('[Achievements Fix] All systems initialized');
    }
  }, 100);

  // Timeout after 10 seconds
  setTimeout(() => {
    clearInterval(checkGame);
  }, 10000);
}

// Helper function to determine game result
function determineGameResult() {
  if (game.in_checkmate()) {
    return game.turn() === 'w' ? 'loss' : 'win';
  }
  if (game.in_draw()) {
    return 'draw';
  }
  return 'ongoing';
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeAchievementsFix);
} else {
  initializeAchievementsFix();
}

// Export functions
window.achievementEvents = achievementEvents;
window.integrateAchievements = integrateAchievements;
window.initializeLevelSystem = initializeLevelSystem;
window.handleGameEnd = handleGameEnd;
window.determineGameResult = determineGameResult;
