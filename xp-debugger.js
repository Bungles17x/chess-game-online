
// ============================================
// XP SYSTEM DEBUGGER
// ============================================

// XP Debugger Functions
window.xpDebugger = {
  // Show current XP status
  showStatus: function() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
    const playerXP = parseInt(localStorage.getItem('playerXP') || '0');

    console.log('═══════════════════════════════════════');
    console.log('📊 XP SYSTEM STATUS');
    console.log('═══════════════════════════════════════');
    console.log('👤 Current User:', currentUser?.username || 'Not logged in');
    console.log('💰 Total XP:', currentUser?.xp || playerXP);
    console.log('📈 Level:', currentUser?.level || 'Not set');
    console.log('═══════════════════════════════════════');

    if (currentUser) {
      const totalXP = currentUser.xp || 0;
      const currentLevel = currentUser.level || 1;
      const xpForCurrentLevel = (currentLevel - 1) * 1000;
      const xpInCurrentLevel = totalXP - xpForCurrentLevel;
      const xpNeeded = 1000;
      const progress = (xpInCurrentLevel / xpNeeded) * 100;

      console.log('📊 DETAILED CALCULATION:');
      console.log('   Total XP:', totalXP);
      console.log('   Current Level:', currentLevel);
      console.log('   XP for Level ' + currentLevel + ':', xpForCurrentLevel + ' - ' + (xpForCurrentLevel + 999));
      console.log('   XP in Current Level:', xpInCurrentLevel);
      console.log('   XP Needed for Next Level:', xpNeeded - xpInCurrentLevel);
      console.log('   Progress:', progress.toFixed(1) + '%');
      console.log('═══════════════════════════════════════');
    }

    return currentUser;
  },

  // Set XP to a specific value
  setXP: function(amount) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
    if (!currentUser) {
      console.error('❌ No user logged in!');
      return;
    }

    const oldXP = currentUser.xp || 0;
    const oldLevel = currentUser.level || 1;
    const newXP = amount;
    const newLevel = Math.floor(newXP / 1000) + 1;

    currentUser.xp = newXP;
    currentUser.level = newLevel;
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    localStorage.setItem('playerXP', newXP.toString());

    console.log('✅ XP Updated!');
    console.log('   Old XP:', oldXP, '(Level', oldLevel + ')');
    console.log('   New XP:', newXP, '(Level', newLevel + ')');

    // Trigger UI update
    document.dispatchEvent(new CustomEvent('xpEarned', {
      detail: { amount: newXP - oldXP, total: newXP, level: newLevel, oldLevel }
    }));

    if (newLevel > oldLevel) {
      console.log('🎉 LEVEL UP! You reached level', newLevel);
      document.dispatchEvent(new CustomEvent('levelUp', {
        detail: { level: newLevel, oldLevel, xp: newXP }
      }));
    }

    // Update display
    if (typeof updateXPDisplay === 'function') {
      updateXPDisplay();
    }
  },

  // Add XP to current total
  addXP: function(amount) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
    if (!currentUser) {
      console.error('❌ No user logged in!');
      return;
    }

    const oldXP = currentUser.xp || 0;
    const newXP = oldXP + amount;
    this.setXP(newXP);
  },

  // Reset XP to 0
  resetXP: function() {
    this.setXP(0);
    console.log('🔄 XP has been reset to 0');
  },

  // Set level directly (calculates required XP)
  setLevel: function(level) {
    const requiredXP = (level - 1) * 1000;
    this.setXP(requiredXP);
    console.log('✅ Set to Level', level, '(' + requiredXP + ' XP)');
  },

  // Simulate earning XP from an achievement
  simulateAchievement: function(xpAmount, achievementName) {
    console.log('🏆 Simulating achievement:', achievementName, '(+' + xpAmount + ' XP)');
    this.addXP(xpAmount);
  },

  // Test level up
  testLevelUp: function() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
    if (!currentUser) {
      console.error('❌ No user logged in!');
      return;
    }

    const currentXP = currentUser.xp || 0;
    const currentLevel = currentUser.level || 1;
    const nextLevelXP = currentLevel * 1000;

    console.log('📊 Testing level up...');
    console.log('   Current: Level', currentLevel, '(' + currentXP + ' XP)');
    console.log('   Next level requires:', nextLevelXP, 'XP');
    console.log('   Adding:', nextLevelXP - currentXP + 1, 'XP');

    this.setXP(nextLevelXP + 1);
  },

  // Show all achievements
  showAchievements: function() {
    const achievements = JSON.parse(localStorage.getItem('achievements') || '{}');
    console.log('═══════════════════════════════════════');
    console.log('🏆 ACHIEVEMENTS');
    console.log('═══════════════════════════════════════');

    const unlocked = Object.values(achievements).filter(a => a.unlocked);
    const total = Object.keys(achievements).length;

    console.log('Unlocked:', unlocked.length + '/' + total);
    console.log('');

    unlocked.forEach(a => {
      console.log('✅', a.name, '(+' + (a.xpReward || 0) + ' XP)');
    });

    console.log('═══════════════════════════════════════');
  },

  // Show all rewards
  showRewards: function() {
    const rewards = JSON.parse(localStorage.getItem('rewards') || '{}');
    console.log('═══════════════════════════════════════');
    console.log('🎁 REWARDS');
    console.log('═══════════════════════════════════════');

    const unlocked = Object.values(rewards).filter(r => r.unlocked);
    const total = Object.keys(rewards).length;

    console.log('Unlocked:', unlocked.length + '/' + total);
    console.log('');

    unlocked.forEach(r => {
      console.log('✅', r.name, '(+' + (r.xpBonus || 0) + ' XP)');
    });

    console.log('═══════════════════════════════════════');
  },

  // Run full diagnostics
  runDiagnostics: function() {
    console.log('═══════════════════════════════════════');
    console.log('🔍 XP SYSTEM DIAGNOSTICS');
    console.log('═══════════════════════════════════════');

    // Check localStorage
    console.log('📦 localStorage Check:');
    console.log('   currentUser:', localStorage.getItem('currentUser') ? '✅ Exists' : '❌ Missing');
    console.log('   playerXP:', localStorage.getItem('playerXP') ? '✅ Exists' : '❌ Missing');
    console.log('   achievements:', localStorage.getItem('achievements') ? '✅ Exists' : '❌ Missing');
    console.log('   rewards:', localStorage.getItem('rewards') ? '✅ Exists' : '❌ Missing');
    console.log('');

    // Check systems
    console.log('🔧 System Check:');
    console.log('   achievementsSystem:', typeof achievementsSystem !== 'undefined' ? '✅ Loaded' : '❌ Not loaded');
    console.log('   updateXPDisplay:', typeof updateXPDisplay === 'function' ? '✅ Available' : '❌ Not available');
    console.log('');

    // Show status
    this.showStatus();
    console.log('');

    // Show achievements
    this.showAchievements();
    console.log('');

    // Show rewards
    this.showRewards();

    console.log('═══════════════════════════════════════');
  }
};

// Initialize debugger
console.log('═══════════════════════════════════════');
console.log('🔧 XP DEBUGGER LOADED');
console.log('═══════════════════════════════════════');
console.log('Available commands:');
console.log('  xpDebugger.showStatus()       - Show current XP status');
console.log('  xpDebugger.setXP(amount)       - Set XP to specific value');
console.log('  xpDebugger.addXP(amount)       - Add XP to current total');
console.log('  xpDebugger.resetXP()          - Reset XP to 0');
console.log('  xpDebugger.setLevel(level)     - Set level directly');
console.log('  xpDebugger.simulateAchievement(xp, name) - Simulate earning XP');
console.log('  xpDebugger.testLevelUp()      - Test level up');
console.log('  xpDebugger.showAchievements()  - Show all achievements');
console.log('  xpDebugger.showRewards()       - Show all rewards');
console.log('  xpDebugger.runDiagnostics()    - Run full diagnostics');
console.log('═══════════════════════════════════════');
