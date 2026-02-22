
// ============================================
// XP AND LEVEL FIX
// ============================================

// Override the awardXP function to properly calculate and update levels
(function fixAwardXP() {
  if (typeof achievementsSystem !== 'undefined' && achievementsSystem.awardXP) {
    const originalAwardXP = achievementsSystem.awardXP.bind(achievementsSystem);

    achievementsSystem.awardXP = function(amount) {
      // Get current user
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
      if (!currentUser) return;

      // Update account XP
      const currentXP = currentUser.xp || 0;
      const newXP = currentXP + amount;
      const oldLevel = currentUser.level || 1;
      const newLevel = Math.floor(newXP / 1000) + 1;

      currentUser.xp = newXP;
      currentUser.level = newLevel;

      // Save to localStorage
      localStorage.setItem('currentUser', JSON.stringify(currentUser));

      // Also update playerXP for compatibility
      localStorage.setItem('playerXP', newXP.toString());

      // Check for rewards after earning XP
      this.checkRewards();

      // Dispatch XP earned event
      document.dispatchEvent(new CustomEvent('xpEarned', {
        detail: { amount, total: newXP, level: newLevel, oldLevel }
      }));

      console.log('[XP Fix] Awarded', amount, 'XP. New total:', newXP, 'Level:', oldLevel, '→', newLevel);

      // Check for level up
      if (newLevel > oldLevel) {
        console.log('[XP Fix] 🎉 LEVEL UP! You reached level', newLevel);
        document.dispatchEvent(new CustomEvent('levelUp', {
          detail: { level: newLevel, oldLevel, xp: newXP }
        }));
      }
    };

    console.log('[XP Fix] Successfully fixed awardXP function');
  } else {
    console.warn('[XP Fix] Achievements system not available yet');
  }
})();

// Fix current user level if it's incorrect
setTimeout(function fixCurrentLevel() {
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
  if (currentUser) {
    const currentXP = currentUser.xp || 0;
    // Correct level calculation: Level 1 = 0-999 XP, Level 2 = 1000-1999 XP, etc.
    const correctLevel = Math.floor(currentXP / 1000) + 1;
    const oldLevel = currentUser.level || 1;

    console.log('[XP Fix] Checking level:', oldLevel, 'vs correct:', correctLevel, '(XP:', currentXP, ')');

    if (correctLevel !== oldLevel) {
      console.log('[XP Fix] 🔄 Fixing level:', oldLevel, '→', correctLevel, '(XP:', currentXP, ')');
      currentUser.level = correctLevel;
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
      
      // Trigger UI update
      document.dispatchEvent(new CustomEvent('xpEarned', {
        detail: { amount: 0, total: currentXP, level: correctLevel, oldLevel }
      }));
      
      // Also update playerXP for compatibility
      localStorage.setItem('playerXP', currentXP.toString());
    } else {
      console.log('[XP Fix] ✅ Level is correct:', correctLevel, '(XP:', currentXP, ')');
    }
  }
}, 500);
