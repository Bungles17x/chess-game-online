// Game Fixes
// This file contains comprehensive fixes for common game issues

// ============================================
// FIX 1: Prevent Duplicate Script Loading
// ============================================

const loadedScripts = new Set();

function loadScriptOnce(src, callback) {
  if (loadedScripts.has(src)) {
    if (callback) callback();
    return;
  }

  loadedScripts.add(src);
  const script = document.createElement('script');
  script.src = src;
  script.onload = () => {
    console.log(`[Game Fixes] Script loaded: ${src}`);
    if (callback) callback();
  };
  script.onerror = () => {
    console.error(`[Game Fixes] Failed to load script: ${src}`);
  };
  document.head.appendChild(script);
}

// ============================================
// FIX 2: Fix Move Execution Issues
// ============================================

let isProcessingMove = false;

function safeExecuteMove(move) {
  if (isProcessingMove) {
    console.warn('[Game Fixes] Move already being processed, ignoring');
    return false;
  }

  isProcessingMove = true;

  try {
    const result = game.move(move);
    if (!result) {
      console.error('[Game Fixes] Move execution failed:', move);
      return false;
    }

    // Update game state
    lastMove = result;
    selectedSquare = null;
    legalMovesFromSelected = [];

    // Render updates
    clearHighlights();
    renderPosition();
    updateTurnIndicator();

    // Play sound
    const soundId = result.captured ? "capture-sound" : "move-sound";
    playSoundById(soundId);

    // Log move
    logMove(result);

    return true;
  } catch (error) {
    console.error('[Game Fixes] Error executing move:', error);
    return false;
  } finally {
    isProcessingMove = false;
  }
}

// ============================================
// FIX 3: Fix Game State Synchronization
// ============================================

function syncGameState() {
  try {
    // Ensure game state is valid
    if (!game || typeof game.fen !== 'function') {
      console.error('[Game Fixes] Invalid game state');
      return false;
    }

    // Verify board integrity
    const board = game.board();
    if (!board || board.length !== 8) {
      console.error('[Game Fixes] Invalid board state');
      return false;
    }

    return true;
  } catch (error) {
    console.error('[Game Fixes] Error syncing game state:', error);
    return false;
  }
}

// ============================================
// FIX 4: Fix AI Move Timing
// ============================================

let aiMoveTimeout = null;

function scheduleAIMove() {
  if (aiMoveTimeout) {
    clearTimeout(aiMoveTimeout);
  }

  aiMoveTimeout = setTimeout(() => {
    if (gameMode === "bot" && game.turn() === "b" && !game.game_over()) {
      aiMove();
    }
    aiMoveTimeout = null;
  }, 200);
}

// ============================================
// FIX 5: Fix Socket Connection Issues
// ============================================

function safeSendSocket(message) {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    console.warn('[Game Fixes] Socket not ready, message not sent:', message);
    return false;
  }

  try {
    socket.send(JSON.stringify(message));
    console.log('[Game Fixes] Message sent:', message);
    return true;
  } catch (error) {
    console.error('[Game Fixes] Error sending socket message:', error);
    return false;
  }
}

// ============================================
// FIX 6: Fix Statistics Updates
// ============================================

function safeUpdateStatistics(result) {
  try {
    const currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");

    if (!currentUser || !currentUser.username) {
      console.warn('[Game Fixes] No user logged in, skipping stats update');
      return;
    }

    // Ensure stats object exists
    if (!currentUser.stats) {
      currentUser.stats = {
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        currentStreak: 0
      };
    }

    // Update stats based on result
    currentUser.stats.gamesPlayed++;

    switch(result) {
      case "win":
        currentUser.stats.wins++;
        currentUser.stats.currentStreak = Math.max(0, currentUser.stats.currentStreak) + 1;
        currentUser.xp = (currentUser.xp || 0) + 100;
        break;
      case "loss":
        currentUser.stats.losses++;
        currentUser.stats.currentStreak = Math.min(0, currentUser.stats.currentStreak) - 1;
        currentUser.xp = (currentUser.xp || 0) + 25;
        break;
      case "draw":
        currentUser.stats.draws++;
        currentUser.xp = (currentUser.xp || 0) + 50;
        break;
    }

    // Check for level up
    const oldLevel = currentUser.level || 1;
    const xpNeeded = 1000 * currentUser.level + 500 * Math.max(0, currentUser.level - 1);

    while (currentUser.xp >= xpNeeded) {
      currentUser.level++;
      currentUser.xp -= xpNeeded;
    }

    // Save updated user data
    localStorage.setItem("currentUser", JSON.stringify(currentUser));

    // Update users array if available
    const users = secureStorage.getItem("chessUsers") || [];
    const userIndex = users.findIndex(u => u.id === currentUser.id);

    if (userIndex !== -1) {
      users[userIndex] = currentUser;
      localStorage.setItem("chessUsers", JSON.stringify(users));
    }

    // Show notifications
    if (typeof showXPNotification === 'function') {
      const xpGained = result === 'win' ? 100 : result === 'loss' ? 25 : 50;
      showXPNotification(xpGained, result, currentUser.xp, xpNeeded, currentUser.level);
    }

    if (currentUser.level > oldLevel && typeof showLevelUpAnimation === 'function') {
      showLevelUpAnimation(oldLevel, currentUser.level);
    }

    console.log('[Game Fixes] Statistics updated successfully');
  } catch (error) {
    console.error('[Game Fixes] Error updating statistics:', error);
  }
}

// ============================================
// FIX 7: Fix Board Rendering Issues
// ============================================

let renderTimeout = null;

function safeRenderPosition() {
  if (renderTimeout) {
    clearTimeout(renderTimeout);
  }

  renderTimeout = setTimeout(() => {
    try {
      renderPosition();
      console.log('[Game Fixes] Board rendered successfully');
    } catch (error) {
      console.error('[Game Fixes] Error rendering board:', error);
    }
    renderTimeout = null;
  }, 50);
}

// ============================================
// FIX 8: Fix Highlight Issues
// ============================================

function safeClearHighlights() {
  try {
    document
      .querySelectorAll(".square.selected, .square.highlight, .square.capture, .square.last-move, .square.in-check, .square.checkmate, .square.from-square, .square.to-square")
      .forEach(sq => {
        sq.classList.remove("selected", "highlight", "capture", "last-move", "in-check", "checkmate", "from-square", "to-square");
      });
  } catch (error) {
    console.error('[Game Fixes] Error clearing highlights:', error);
  }
}

// ============================================
// FIX 9: Fix Move Analysis Loading
// ============================================

function loadMoveAnalysisOnce(moveData) {
  loadScriptOnce('move-analysis.js', () => {
    if (typeof analyzeAndShowFeedback === 'function') {
      try {
        analyzeAndShowFeedback(game, moveData);
        console.log('[Game Fixes] Move analysis completed');
      } catch (error) {
        console.error('[Game Fixes] Error during move analysis:', error);
      }
    }
  });
}

// ============================================
// FIX 10: Fix Game End Detection
// ============================================

function checkGameEnd() {
  if (!game.game_over()) {
    return null;
  }

  let result = null;

  if (game.in_checkmate()) {
    result = game.turn() === "w" ? "loss" : "win";
  } else if (game.in_draw() || game.in_stalemate() || game.in_threefold_repetition()) {
    result = "draw";
  }

  return result;
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  console.log('[Game Fixes] All fixes initialized');

  // Override problematic functions with safe versions
  window.safeExecuteMove = safeExecuteMove;
  window.safeUpdateStatistics = safeUpdateStatistics;
  window.safeRenderPosition = safeRenderPosition;
  window.safeClearHighlights = safeClearHighlights;
  window.loadMoveAnalysisOnce = loadMoveAnalysisOnce;
  window.checkGameEnd = checkGameEnd;
  window.scheduleAIMove = scheduleAIMove;
  window.safeSendSocket = safeSendSocket;
  window.syncGameState = syncGameState;
});

// Export fixes for use in main script
window.gameFixes = {
  safeExecuteMove,
  safeUpdateStatistics,
  safeRenderPosition,
  safeClearHighlights,
  loadMoveAnalysisOnce,
  checkGameEnd,
  scheduleAIMove,
  safeSendSocket,
  syncGameState
};
