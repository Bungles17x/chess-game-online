
// ============================================
// ACHIEVEMENTS XP DISPLAY FIX
// ============================================

// Override the updateXPDisplay function from achievements-display-fix.js
setTimeout(function fixAchievementsXPDisplay() {
  // Wait for the function to be defined
  const checkInterval = setInterval(() => {
    if (typeof window.updateXPDisplay === 'function') {
      clearInterval(checkInterval);

      // Save the original function
      const originalUpdateXPDisplay = window.updateXPDisplay;

      // Override with correct implementation
      window.updateXPDisplay = function() {
        // Get XP and level from account (currentUser) or localStorage
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
        console.log('[Achievements XP Display Fix] currentUser:', currentUser);
        console.log('[Achievements XP Display Fix] currentUser.xp:', currentUser?.xp);
        console.log('[Achievements XP Display Fix] currentUser.level:', currentUser?.level);

        // XP is stored as total cumulative XP
        const totalXP = currentUser ? (currentUser.xp || 0) : parseInt(localStorage.getItem('playerXP') || '0');
        const currentLevel = currentUser ? (currentUser.level || 1) : Math.floor(totalXP / 1000) + 1;

        // Calculate XP in current level
        const xpForCurrentLevel = (currentLevel - 1) * 1000;
        const xpInCurrentLevel = totalXP - xpForCurrentLevel;
        const xpNeeded = 1000;
        const progress = (xpInCurrentLevel / xpNeeded) * 100;

        console.log('[Achievements XP Display Fix] Calculated values:', { totalXP, currentLevel, xpInCurrentLevel, xpNeeded, progress });

        // Update DOM elements
        const totalXPElement = document.getElementById('settings-total-xp');
        const currentLevelElement = document.getElementById('settings-current-level');
        const xpToNextElement = document.getElementById('settings-xp-to-next');
        const xpBarElement = document.getElementById('settings-xp-bar');

        if (totalXPElement) totalXPElement.textContent = totalXP;
        if (currentLevelElement) currentLevelElement.textContent = `Level ${currentLevel}`;
        if (xpToNextElement) xpToNextElement.textContent = `${xpInCurrentLevel} / ${xpNeeded} XP`;
        if (xpBarElement) xpBarElement.style.width = `${progress}%`;

        console.log('[Achievements XP Display Fix] Updated XP display', { totalXP, currentLevel, xpInCurrentLevel, xpNeeded, progress });
      };

      console.log('[Achievements XP Display Fix] Successfully fixed updateXPDisplay function');
    }
  }, 100);

  // Timeout after 10 seconds
  setTimeout(() => {
    clearInterval(checkInterval);
  }, 10000);
}, 2000);
