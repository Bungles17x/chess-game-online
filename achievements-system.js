// Achievements and Rewards System for Modern Chess
// This file handles player achievements, badges, and rewards

const achievementsSystem = {
  rewards: {
    // Level Rewards
    level5: {
      id: 'level_5',
      name: 'Novice Badge',
      description: 'Unlock a special badge for reaching level 5. +500 XP bonus!',
      icon: '🥉',
      requirement: 'Reach Level 5',
      unlocked: false,
      type: 'badge',
      xpBonus: 500,
      rarity: 'common'
    },
    level10: {
      id: 'level_10',
      name: 'Intermediate Badge',
      description: 'Unlock a special badge for reaching level 10. +1000 XP bonus!',
      icon: '🥈',
      requirement: 'Reach Level 10',
      unlocked: false,
      type: 'badge',
      xpBonus: 1000,
      rarity: 'uncommon'
    },
    level25: {
      id: 'level_25',
      name: 'Advanced Badge',
      description: 'Unlock a special badge for reaching level 25. +2500 XP bonus!',
      icon: '🥇',
      requirement: 'Reach Level 25',
      unlocked: false,
      type: 'badge',
      xpBonus: 2500,
      rarity: 'rare'
    },
    level50: {
      id: 'level_50',
      name: 'Master Badge',
      description: 'Unlock a special badge for reaching level 50. +5000 XP bonus!',
      icon: '🏆',
      requirement: 'Reach Level 50',
      unlocked: false,
      type: 'badge',
      xpBonus: 5000,
      rarity: 'legendary'
    },
    level75: {
      id: 'level_75',
      name: 'Grandmaster Badge',
      description: 'Unlock a legendary badge for reaching level 75. +10000 XP bonus!',
      icon: '👑',
      requirement: 'Reach Level 75',
      unlocked: false,
      type: 'badge',
      xpBonus: 10000,
      rarity: 'legendary'
    },
    level100: {
      id: 'level_100',
      name: 'Chess God Badge',
      description: 'Unlock the ultimate badge for reaching level 100. +25000 XP bonus!',
      icon: '⚜️',
      requirement: 'Reach Level 100',
      unlocked: false,
      type: 'badge',
      xpBonus: 25000,
      rarity: 'mythic'
    },
    
    // Achievement Count Rewards
    achievements5: {
      id: 'achievements_5',
      name: 'Collector',
      description: 'Unlock a special avatar for earning 5 achievements. +300 XP bonus!',
      icon: '🎨',
      requirement: 'Earn 5 Achievements',
      unlocked: false,
      type: 'avatar',
      xpBonus: 300,
      rarity: 'common'
    },
    achievements10: {
      id: 'achievements_10',
      name: 'Achiever',
      description: 'Unlock a special avatar for earning 10 achievements. +750 XP bonus!',
      icon: '🎖️',
      requirement: 'Earn 10 Achievements',
      unlocked: false,
      type: 'avatar',
      xpBonus: 750,
      rarity: 'uncommon'
    },
    achievements25: {
      id: 'achievements_25',
      name: 'Champion',
      description: 'Unlock a special avatar for earning 25 achievements. +2000 XP bonus!',
      icon: '🏅',
      requirement: 'Earn 25 Achievements',
      unlocked: false,
      type: 'avatar',
      xpBonus: 2000,
      rarity: 'rare'
    },
    achievements50: {
      id: 'achievements_50',
      name: 'Legend',
      description: 'Unlock a legendary avatar for earning 50 achievements. +5000 XP bonus!',
      icon: '🌟',
      requirement: 'Earn 50 Achievements',
      unlocked: false,
      type: 'avatar',
      xpBonus: 5000,
      rarity: 'legendary'
    },
    
    // Win Streak Rewards
    streak5: {
      id: 'streak_5',
      name: 'Hot Streak Title',
      description: 'Unlock a special title for winning 5 games in a row. +500 XP bonus!',
      icon: '🔥',
      requirement: 'Win 5 Games in a Row',
      unlocked: false,
      type: 'title',
      xpBonus: 500,
      rarity: 'uncommon'
    },
    streak10: {
      id: 'streak_10',
      name: 'Unstoppable Title',
      description: 'Unlock a special title for winning 10 games in a row. +1500 XP bonus!',
      icon: '⚡',
      requirement: 'Win 10 Games in a Row',
      unlocked: false,
      type: 'title',
      xpBonus: 1500,
      rarity: 'rare'
    },
    streak20: {
      id: 'streak_20',
      name: 'Godlike Title',
      description: 'Unlock a legendary title for winning 20 games in a row. +5000 XP bonus!',
      icon: '🌟',
      requirement: 'Win 20 Games in a Row',
      unlocked: false,
      type: 'title',
      xpBonus: 5000,
      rarity: 'legendary'
    },
    
    // Special Rewards
    perfectGame: {
      id: 'perfect_game_reward',
      name: 'Perfect Game Badge',
      description: 'Unlock a special badge for winning a perfect game. +1000 XP bonus!',
      icon: '💎',
      requirement: 'Win a Perfect Game',
      unlocked: false,
      type: 'badge',
      xpBonus: 1000,
      rarity: 'rare'
    },
    quickWin: {
      id: 'quick_win_reward',
      name: 'Speed Demon Badge',
      description: 'Unlock a special badge for winning in 10 moves or less. +750 XP bonus!',
      icon: '⚡',
      requirement: 'Win in 10 Moves or Less',
      unlocked: false,
      type: 'badge',
      xpBonus: 750,
      rarity: 'uncommon'
    },
    scholarReward: {
      id: 'scholar_reward',
      name: 'Scholar\'s Badge',
      description: 'Unlock a special badge for winning with Scholar\'s Mate. +500 XP bonus!',
      icon: '🎓',
      requirement: 'Win with Scholar\'s Mate',
      unlocked: false,
      type: 'badge',
      xpBonus: 500,
      rarity: 'common'
    },
    queenGambitReward: {
      id: 'queen_gambit_reward',
      name: 'Queen\'s Sacrifice Badge',
      description: 'Unlock a special badge for winning after sacrificing your queen. +2000 XP bonus!',
      icon: '👑',
      requirement: 'Win After Queen Sacrifice',
      unlocked: false,
      type: 'badge',
      xpBonus: 2000,
      rarity: 'rare'
    },
    comebackKingReward: {
      id: 'comeback_king_reward',
      name: 'Comeback King Badge',
      description: 'Unlock a special badge for winning after being down in material. +1500 XP bonus!',
      icon: '🔥',
      requirement: 'Win After Being Down in Material',
      unlocked: false,
      type: 'badge',
      xpBonus: 1500,
      rarity: 'rare'
    }
  },
  
  achievements: {
    // First Game Achievements
    firstMove: {
      id: 'first_move',
      name: 'First Move',
      description: 'Make your first move in a game',
      icon: '♟',
      xp: 10,
      unlocked: false,
      category: 'gameplay'
    },
    firstWin: {
      id: 'first_win',
      name: 'First Victory',
      description: 'Win your first game',
      icon: '🏆',
      xp: 50,
      unlocked: false,
      category: 'gameplay'
    },

    // Win Streak Achievements
    winStreak3: {
      id: 'win_streak_3',
      name: 'Hot Streak',
      description: 'Win 3 games in a row',
      icon: '🔥',
      xp: 100,
      unlocked: false,
      category: 'streak'
    },
    winStreak5: {
      id: 'win_streak_5',
      name: 'On Fire',
      description: 'Win 5 games in a row',
      icon: '⚡',
      xp: 200,
      unlocked: false,
      category: 'streak'
    },
    winStreak10: {
      id: 'win_streak_10',
      name: 'Unstoppable',
      description: 'Win 10 games in a row',
      icon: '🌟',
      xp: 500,
      unlocked: false,
      category: 'streak'
    },

    // Checkmate Achievements
    scholarMate: {
      id: 'scholar_mate',
      name: 'Scholar',
      description: "Win with Scholar's Mate",
      icon: '🎓',
      xp: 75,
      unlocked: false,
      category: 'checkmate'
    },
    fourMoveMate: {
      id: 'four_move_mate',
      name: 'Speed Demon',
      description: 'Checkmate in 4 moves or less',
      icon: '💨',
      xp: 100,
      unlocked: false,
      category: 'checkmate'
    },
    queenSacrifice: {
      id: 'queen_sacrifice',
      name: "Queen's Gambit",
      description: 'Win after sacrificing your queen',
      icon: '👑',
      xp: 300,
      unlocked: false,
      category: 'checkmate'
    },

    // Piece Capture Achievements
    captureKnight: {
      id: 'capture_knight',
      name: 'Knight Slayer',
      description: 'Capture 10 knights',
      icon: '♞',
      xp: 50,
      unlocked: false,
      category: 'capture',
      progress: 0,
      target: 10
    },
    captureBishop: {
      id: 'capture_bishop',
      name: 'Bishop Hunter',
      description: 'Capture 10 bishops',
      icon: '♝',
      xp: 50,
      unlocked: false,
      category: 'capture',
      progress: 0,
      target: 10
    },
    captureRook: {
      id: 'capture_rook',
      name: 'Rook Destroyer',
      description: 'Capture 10 rooks',
      icon: '♜',
      xp: 50,
      unlocked: false,
      category: 'capture',
      progress: 0,
      target: 10
    },
    captureQueen: {
      id: 'capture_queen',
      name: 'Queen Taker',
      description: 'Capture 5 queens',
      icon: '♛',
      xp: 100,
      unlocked: false,
      category: 'capture',
      progress: 0,
      target: 5
    },

    // Game Count Achievements
    gamesPlayed10: {
      id: 'games_played_10',
      name: 'Getting Started',
      description: 'Play 10 games',
      icon: '🎮',
      xp: 50,
      unlocked: false,
      category: 'games',
      progress: 0,
      target: 10
    },
    gamesPlayed50: {
      id: 'games_played_50',
      name: 'Regular Player',
      description: 'Play 50 games',
      icon: '🎲',
      xp: 200,
      unlocked: false,
      category: 'games',
      progress: 0,
      target: 50
    },
    gamesPlayed100: {
      id: 'games_played_100',
      name: 'Chess Master',
      description: 'Play 100 games',
      icon: '👑',
      xp: 500,
      unlocked: false,
      category: 'games',
      progress: 0,
      target: 100
    },

    // Online Achievements
    onlineWin: {
      id: 'online_win',
      name: 'Online Warrior',
      description: 'Win an online game',
      icon: '🌐',
      xp: 75,
      unlocked: false,
      category: 'online'
    },
    onlineWinStreak3: {
      id: 'online_win_streak_3',
      name: 'Online Dominator',
      description: 'Win 3 online games in a row',
      icon: '🏅',
      xp: 150,
      unlocked: false,
      category: 'online'
    },

    // Special Achievements
    perfectGame: {
      id: 'perfect_game',
      name: 'Perfect Game',
      description: 'Win without losing any pieces',
      icon: '💎',
      xp: 300,
      unlocked: false,
      category: 'special'
    },
    comeback: {
      id: 'comeback',
      name: 'Comeback King',
      description: 'Win after being down in material',
      icon: '🔥',
      xp: 250,
      unlocked: false,
      category: 'special'
    }
  },

  // Initialize the achievements system
  initialize() {
    this.loadAchievements();
    this.loadRewards();
    this.setupEventListeners();
    this.checkRewards();
  },

  // Load achievements from localStorage
  loadAchievements() {
    const saved = localStorage.getItem('chessAchievements');
    if (saved) {
      const savedAchievements = JSON.parse(saved);
      Object.keys(savedAchievements).forEach(key => {
        if (this.achievements[key]) {
          this.achievements[key] = {
            ...this.achievements[key],
            ...savedAchievements[key]
          };
        }
      });
    }
  },

  // Load rewards from localStorage
  loadRewards() {
    const saved = localStorage.getItem('chessRewards');
    if (saved) {
      const savedRewards = JSON.parse(saved);
      Object.keys(savedRewards).forEach(key => {
        if (this.rewards[key]) {
          this.rewards[key] = {
            ...this.rewards[key],
            ...savedRewards[key]
          };
        }
      });
    }
  },

  // Save achievements to localStorage
  saveAchievements() {
    localStorage.setItem('chessAchievements', JSON.stringify(this.achievements));
  },

  // Save rewards to localStorage
  saveRewards() {
    localStorage.setItem('chessRewards', JSON.stringify(this.rewards));
  },

  // Check and unlock rewards based on player progress
  checkRewards() {
    // Get player stats from account
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
    const level = currentUser ? (currentUser.level || 1) : 1;
    const unlockedAchievements = this.getUnlockedAchievements();
    const winStreak = parseInt(localStorage.getItem('currentWinStreak') || '0');
    
    console.log('[Rewards] Checking rewards - Level:', level, 'Achievements:', unlockedAchievements.length, 'Streak:', winStreak);
    
    // Check level rewards
    if (level >= 5 && !this.rewards.level5.unlocked) {
      console.log('[Rewards] Unlocking level 5 reward');
      this.unlockReward('level_5');
    }
    if (level >= 10 && !this.rewards.level10.unlocked) {
      console.log('[Rewards] Unlocking level 10 reward');
      this.unlockReward('level_10');
    }
    if (level >= 25 && !this.rewards.level25.unlocked) {
      console.log('[Rewards] Unlocking level 25 reward');
      this.unlockReward('level_25');
    }
    if (level >= 50 && !this.rewards.level50.unlocked) {
      console.log('[Rewards] Unlocking level 50 reward');
      this.unlockReward('level_50');
    }
    if (level >= 75 && !this.rewards.level75.unlocked) {
      console.log('[Rewards] Unlocking level 75 reward');
      this.unlockReward('level_75');
    }
    if (level >= 100 && !this.rewards.level100.unlocked) {
      console.log('[Rewards] Unlocking level 100 reward');
      this.unlockReward('level_100');
    }
    
    // Check achievement count rewards
    if (unlockedAchievements.length >= 5 && !this.rewards.achievements5.unlocked) {
      console.log('[Rewards] Unlocking 5 achievements reward');
      this.unlockReward('achievements_5');
    }
    if (unlockedAchievements.length >= 10 && !this.rewards.achievements10.unlocked) {
      console.log('[Rewards] Unlocking 10 achievements reward');
      this.unlockReward('achievements_10');
    }
    if (unlockedAchievements.length >= 25 && !this.rewards.achievements25.unlocked) {
      console.log('[Rewards] Unlocking 25 achievements reward');
      this.unlockReward('achievements_25');
    }
    if (unlockedAchievements.length >= 50 && !this.rewards.achievements50.unlocked) {
      console.log('[Rewards] Unlocking 50 achievements reward');
      this.unlockReward('achievements_50');
    }
    
    // Check win streak rewards
    if (winStreak >= 5 && !this.rewards.streak5.unlocked) {
      console.log('[Rewards] Unlocking 5 win streak reward');
      this.unlockReward('streak_5');
    }
    if (winStreak >= 10 && !this.rewards.streak10.unlocked) {
      console.log('[Rewards] Unlocking 10 win streak reward');
      this.unlockReward('streak_10');
    }
    if (winStreak >= 20 && !this.rewards.streak20.unlocked) {
      console.log('[Rewards] Unlocking 20 win streak reward');
      this.unlockReward('streak_20');
    }
    
    // Check special rewards
    if (this.achievements.perfectGame && this.achievements.perfectGame.unlocked && !this.rewards.perfectGame.unlocked) {
      console.log('[Rewards] Unlocking perfect game reward');
      this.unlockReward('perfect_game_reward');
    }
    if (this.achievements.fourMoveMate && this.achievements.fourMoveMate.unlocked && !this.rewards.quickWin.unlocked) {
      console.log('[Rewards] Unlocking quick win reward');
      this.unlockReward('quick_win_reward');
    }
    if (this.achievements.scholarsMate && this.achievements.scholarsMate.unlocked && !this.rewards.scholarReward.unlocked) {
      console.log('[Rewards] Unlocking scholar reward');
      this.unlockReward('scholar_reward');
    }
    if (this.achievements.queenGambit && this.achievements.queenGambit.unlocked && !this.rewards.queenGambitReward.unlocked) {
      console.log('[Rewards] Unlocking queen gambit reward');
      this.unlockReward('queen_gambit_reward');
    }
    if (this.achievements.comeback && this.achievements.comeback.unlocked && !this.rewards.comebackKingReward.unlocked) {
      console.log('[Rewards] Unlocking comeback king reward');
      this.unlockReward('comeback_king_reward');
    }
  },

  // Unlock a reward
  unlockReward(rewardId) {
    // Find reward by property name or ID
    let reward = this.rewards[rewardId];
    
    // If not found by property name, search by id field
    if (!reward) {
      reward = Object.values(this.rewards).find(r => r.id === rewardId);
    }
    
    if (!reward || reward.unlocked) return;

    reward.unlocked = true;
    reward.unlockedAt = Date.now();

    // Award XP bonus if applicable
    if (reward.xpBonus && reward.xpBonus > 0) {
      this.awardXP(reward.xpBonus);
      console.log('[Rewards] Awarded', reward.xpBonus, 'XP for unlocking', reward.name);
    }

    // Show notification
    this.showRewardNotification(reward);

    // Save rewards
    this.saveRewards();

    // Dispatch event
    document.dispatchEvent(new CustomEvent('rewardUnlocked', {
      detail: { reward }
    }));
  },

  // Show reward notification
  showRewardNotification(reward) {
    const notification = document.createElement('div');
    notification.className = 'achievement-notification';
    const xpBonus = reward.xpBonus || 0;
    notification.innerHTML = `
      <div class="achievement-icon">${reward.icon}</div>
      <div class="achievement-info">
        <div class="achievement-name">🎉 Reward Unlocked!</div>
        <div class="achievement-title">${reward.name}</div>
        ${xpBonus > 0 ? `<div class="achievement-xp">+${xpBonus} XP Bonus!</div>` : ''}
        <div class="achievement-description">${reward.description.replace(/\+\d+ XP bonus!$/gi, '').trim()}</div>
      </div>
    `;
    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => notification.classList.add('show'), 10);

    // Remove after delay
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 500);
    }, 4000);
  },

  // Get unlocked rewards
  getUnlockedRewards() {
    return Object.values(this.rewards).filter(r => r.unlocked);
  },

  // Get locked rewards
  getLockedRewards() {
    return Object.values(this.rewards).filter(r => !r.unlocked);
  },

  // Setup event listeners for game events
  setupEventListeners() {
    // Listen for game events
    document.addEventListener('gameMove', (e) => this.onMove(e.detail));
    document.addEventListener('gameEnd', (e) => this.onGameEnd(e.detail));
    document.addEventListener('pieceCaptured', (e) => this.onPieceCaptured(e.detail));
  },

  // Handle move events
  onMove(moveData) {
    const { moveNumber } = moveData;

    // Check for first move achievement
    if (moveNumber === 1 && !this.achievements.firstMove.unlocked) {
      this.unlock('firstMove');
    }
  },

  // Handle game end events
  onGameEnd(gameData) {
    const { result, mode, moves, piecesLost } = gameData;

    // Check for first win
    if (result === 'win' && !this.achievements.firstWin.unlocked) {
      this.unlock('firstWin');
    }

    // Check for win streak achievements
    if (result === 'win') {
      const streak = this.getCurrentWinStreak();
      if (streak >= 3 && !this.achievements.winStreak3.unlocked) {
        this.unlock('winStreak3');
      }
      if (streak >= 5 && !this.achievements.winStreak5.unlocked) {
        this.unlock('winStreak5');
      }
      if (streak >= 10 && !this.achievements.winStreak10.unlocked) {
        this.unlock('winStreak10');
      }

      // Check for online achievements
      if (mode === 'online') {
        if (!this.achievements.onlineWin.unlocked) {
          this.unlock('onlineWin');
        }

        const onlineStreak = this.getOnlineWinStreak();
        if (onlineStreak >= 3 && !this.achievements.onlineWinStreak3.unlocked) {
          this.unlock('onlineWinStreak3');
        }
      }
    }

    // Check for quick checkmate
    if (result === 'win' && moves <= 4 && !this.achievements.fourMoveMate.unlocked) {
      this.unlock('fourMoveMate');
    }

    // Check for perfect game
    if (result === 'win' && piecesLost === 0 && !this.achievements.perfectGame.unlocked) {
      this.unlock('perfectGame');
    }

    // Update games played achievements
    const totalGames = this.getTotalGamesPlayed();
    this.updateProgress('gamesPlayed10', totalGames);
    this.updateProgress('gamesPlayed50', totalGames);
    this.updateProgress('gamesPlayed100', totalGames);
  },

  // Handle piece capture events
  onPieceCaptured(captureData) {
    const { piece } = captureData;

    switch (piece.type) {
      case 'n':
        this.updateProgress('captureKnight');
        break;
      case 'b':
        this.updateProgress('captureBishop');
        break;
      case 'r':
        this.updateProgress('captureRook');
        break;
      case 'q':
        this.updateProgress('captureQueen');
        break;
    }
  },

  // Unlock an achievement
  unlock(achievementId) {
    // Find achievement by ID (since achievements are stored by property name)
    let achievement = this.achievements[achievementId];
    
    // If not found by property name, search by id field
    if (!achievement) {
      achievement = Object.values(this.achievements).find(a => a.id === achievementId);
    }
    
    if (!achievement || achievement.unlocked) return;

    achievement.unlocked = true;
    achievement.unlockedAt = Date.now();

    // Award XP
    this.awardXP(achievement.xp);

    // Show notification
    this.showAchievementNotification(achievement);

    // Save achievements
    this.saveAchievements();

    // Check for rewards
    this.checkRewards();

    // Dispatch event
    document.dispatchEvent(new CustomEvent('achievementUnlocked', {
      detail: { achievement }
    }));
  },

  // Update progress for an achievement
  updateProgress(achievementId, increment = 1) {
    // Find achievement by property name or ID
    let achievement = this.achievements[achievementId];
    
    // If not found by property name, search by id field
    if (!achievement) {
      achievement = Object.values(this.achievements).find(a => a.id === achievementId);
    }
    
    if (!achievement || achievement.unlocked || achievement.progress === undefined) return;

    achievement.progress = (achievement.progress || 0) + increment;

    if (achievement.progress >= achievement.target) {
      this.unlock(achievement.id);
    } else {
      this.saveAchievements();
    }
  },

  // Award XP to player
  awardXP(amount) {
    // Get current user
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
    if (!currentUser) return;
    
    // Update account XP
    const currentXP = currentUser.xp || 0;
    const newXP = currentXP + amount;
    currentUser.xp = newXP;

    // Calculate and update level based on XP
    const newLevel = Math.floor(newXP / 1000) + 1;
    currentUser.level = newLevel;

    console.log('[Achievements] Awarded', amount, 'XP. New total:', newXP, 'New level:', newLevel);
    
    // Save to localStorage
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    // Also update playerXP for compatibility
    localStorage.setItem('playerXP', newXP.toString());

    // Check for rewards after earning XP
    this.checkRewards();

    // Dispatch XP earned event
    document.dispatchEvent(new CustomEvent('xpEarned', {
      detail: { amount, total: newXP }
    }));
    
    console.log('[Achievements] Awarded', amount, 'XP. New total:', newXP);
  },

  // Get current win streak
  getCurrentWinStreak() {
    return parseInt(localStorage.getItem('currentWinStreak') || '0');
  },

  // Get online win streak
  getOnlineWinStreak() {
    return parseInt(localStorage.getItem('onlineWinStreak') || '0');
  },

  // Get total games played
  getTotalGamesPlayed() {
    return parseInt(localStorage.getItem('totalGamesPlayed') || '0');
  },

  // Show achievement notification
  showAchievementNotification(achievement) {
    const notification = document.createElement('div');
    notification.className = 'achievement-notification';
    notification.innerHTML = `
      <div class="achievement-icon">${achievement.icon}</div>
      <div class="achievement-info">
        <div class="achievement-name">Achievement Unlocked!</div>
        <div class="achievement-title">${achievement.name}</div>
        <div class="achievement-xp">+${achievement.xp} XP</div>
      </div>
    `;

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => notification.classList.add('show'), 10);

    // Remove after delay
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 500);
    }, 4000);
  },

  // Get achievements by category
  getAchievementsByCategory(category) {
    return Object.values(this.achievements).filter(a => a.category === category);
  },

  // Get unlocked achievements
  getUnlockedAchievements() {
    return Object.values(this.achievements).filter(a => a.unlocked);
  },

  // Get locked achievements
  getLockedAchievements() {
    return Object.values(this.achievements).filter(a => !a.unlocked);
  },

  // Get achievement progress percentage
  getProgressPercentage(achievementId) {
    const achievement = this.achievements[achievementId];
    if (!achievement) return 0;
    if (achievement.progress === undefined) return achievement.unlocked ? 100 : 0;
    return Math.min(100, (achievement.progress / achievement.target) * 100);
  }
};

// Initialize achievements system when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  try {
    achievementsSystem.initialize();
    console.log('[Achievements] System initialized successfully');
  } catch (error) {
    console.error('[Achievements] Failed to initialize system:', error);
  }
});

// Make achievements system available globally
window.achievementsSystem = achievementsSystem;
