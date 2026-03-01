// Enhanced XP System - Centralized XP Management
// This file handles all XP awarding, level calculations, and notifications

// Prevent the script from being loaded multiple times
if (window.xpSystemLoaded) {
  console.log('[XP System] Script already loaded, skipping...');
} else {
  window.xpSystemLoaded = true;

  // XP System Configuration
  const XP_CONFIG = {
    // XP rewards for different actions
    MOVE_QUALITY: {
      'EXCELLENT': 25,
      'GOOD': 15,
      'OKAY': 10,
      'WEAK': 5,
      'BAD': 2,
      'BLUNDER': 1
    },
    GAME_RESULT: {
      'win': 100,
      'loss': 25,
      'draw': 50
    },
    // Level calculation formula
    XP_PER_LEVEL: 1000,
    // Notification settings
    NOTIFICATION_DELAY: 100,
    LEVEL_UP_DELAY: 200
  };

  // Load required scripts dynamically
  function loadRequiredScripts() {
    return Promise.all([
      loadScript('xp-notification.js'),
      loadScript('level-up.js')
    ]);
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  // Get current user data
  function getCurrentUserData() {
    const currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");
    if (!currentUser) {
      console.error('[XP System] No current user found');
      return null;
    }
    return currentUser;
  }

  // Calculate level from XP
  function calculateLevel(xp) {
    return Math.floor(xp / XP_CONFIG.XP_PER_LEVEL) + 1;
  }

  // Calculate XP in current level
  function calculateXPInCurrentLevel(xp, level) {
    return xp - ((level - 1) * XP_CONFIG.XP_PER_LEVEL);
  }

  // Award XP for a move
  function awardMoveXP(amount, quality) {
    try {
      console.log('[XP System] Awarding move XP:', amount, quality);

      const currentUser = getCurrentUserData();
      if (!currentUser) return;

      // Initialize if not exists
      if (!currentUser.xp) currentUser.xp = 0;
      if (!currentUser.level) currentUser.level = 1;
      if (!currentUser.stats) currentUser.stats = {};

      // Store old level for comparison
      const oldLevel = currentUser.level;

      // Add XP
      currentUser.xp += amount;

      // Calculate new level
      const newLevel = calculateLevel(currentUser.xp);
      currentUser.level = newLevel;

      // Update stats
      if (currentUser.stats.movesPlayed === undefined) {
        currentUser.stats.movesPlayed = 0;
      }
      currentUser.stats.movesPlayed++;

      // Save to localStorage
      saveUserData(currentUser);

      // Show notification and level up animation
      handleXPNotification(amount, quality, currentUser, oldLevel);

    } catch (error) {
      console.error('[XP System] Error in awardMoveXP:', error);
    }
  }

  // Award XP for game result
  function awardGameXP(result) {
    try {
      console.log('[XP System] Awarding game XP:', result);

      const currentUser = getCurrentUserData();
      if (!currentUser) return;

      // Initialize if not exists
      if (!currentUser.xp) currentUser.xp = 0;
      if (!currentUser.level) currentUser.level = 1;
      if (!currentUser.stats) currentUser.stats = {};

      // Store old level for comparison
      const oldLevel = currentUser.level;

      // Update stats based on result
      if (!currentUser.stats.gamesPlayed) currentUser.stats.gamesPlayed = 0;
      currentUser.stats.gamesPlayed++;

      switch(result) {
        case "win":
          if (!currentUser.stats.wins) currentUser.stats.wins = 0;
          currentUser.stats.wins++;
          if (!currentUser.stats.currentStreak) currentUser.stats.currentStreak = 0;
          currentUser.stats.currentStreak = Math.max(0, currentUser.stats.currentStreak) + 1;
          currentUser.xp += XP_CONFIG.GAME_RESULT.win;
          break;
        case "loss":
          if (!currentUser.stats.losses) currentUser.stats.losses = 0;
          currentUser.stats.losses++;
          if (!currentUser.stats.currentStreak) currentUser.stats.currentStreak = 0;
          currentUser.stats.currentStreak = Math.min(0, currentUser.stats.currentStreak) - 1;
          currentUser.xp += XP_CONFIG.GAME_RESULT.loss;
          break;
        case "draw":
          if (!currentUser.stats.draws) currentUser.stats.draws = 0;
          currentUser.stats.draws++;
          currentUser.xp += XP_CONFIG.GAME_RESULT.draw;
          break;
      }

      // Calculate new level
      const newLevel = calculateLevel(currentUser.xp);
      currentUser.level = newLevel;

      // Save to localStorage
      saveUserData(currentUser);

      // Show notification and level up animation
      const amount = XP_CONFIG.GAME_RESULT[result];
      handleXPNotification(amount, result, currentUser, oldLevel);

    } catch (error) {
      console.error('[XP System] Error in awardGameXP:', error);
    }
  }

  // Save user data to localStorage
  function saveUserData(user) {
    // Save to currentUser
    localStorage.setItem("currentUser", JSON.stringify(user));

    // Also save to chessUsers array
    const users = JSON.parse(localStorage.getItem("chessUsers") || "[]");
    const userIndex = users.findIndex(u => u.id === user.id);
    if (userIndex !== -1) {
      users[userIndex] = user;
      localStorage.setItem("chessUsers", JSON.stringify(users));
    }

    // Also save to chessPlayerData for backward compatibility
    const playerData = JSON.parse(localStorage.getItem("chessPlayerData") || "{}");
    playerData.xp = user.xp;
    playerData.level = user.level;
    if (user.stats) {
      playerData.stats = user.stats;
    }
    localStorage.setItem("chessPlayerData", JSON.stringify(playerData));

    console.log('[XP System] User data saved:', user);
  }

  // Handle XP notification and level up animation
  function handleXPNotification(amount, quality, user, oldLevel) {
    loadRequiredScripts().then(() => {
      // Show XP notification
      setTimeout(() => {
        if (typeof showXPNotification === 'function') {
          const xpInCurrentLevel = calculateXPInCurrentLevel(user.xp, user.level);
          showXPNotification(amount, quality, xpInCurrentLevel, XP_CONFIG.XP_PER_LEVEL, user.level);
        } else {
          console.log('[XP System] showXPNotification not available');
        }
      }, XP_CONFIG.NOTIFICATION_DELAY);

      // Show level up animation if level changed
      if (user.level > oldLevel) {
        setTimeout(() => {
          if (typeof showLevelUpAnimation === 'function') {
            showLevelUpAnimation(oldLevel, user.level);
          } else {
            console.log('[XP System] showLevelUpAnimation not available');
          }
        }, XP_CONFIG.LEVEL_UP_DELAY);
      }
    });
  }

  // Make functions globally available
  window.xpSystem = {
    awardMoveXP: awardMoveXP,
    awardGameXP: awardGameXP,
    calculateLevel: calculateLevel,
    calculateXPInCurrentLevel: calculateXPInCurrentLevel,
    getCurrentUserData: getCurrentUserData
  };

  console.log('[XP System] Enhanced XP system loaded successfully');
}
