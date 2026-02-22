
// ============================================
// XP PROGRESS FIX
// ============================================

// Override the updateXPProgress function to use currentUser.xp
setTimeout(function fixXPProgress() {
  if (typeof updateXPProgress === 'function') {
    const originalUpdateXPProgress = updateXPProgress;

    window.updateXPProgress = function() {
      // Get XP from currentUser first, fallback to localStorage
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
      const totalXP = currentUser ? (currentUser.xp || 0) : parseInt(localStorage.getItem('playerXP') || '0');
      const currentLevel = currentUser ? (currentUser.level || 1) : Math.floor(totalXP / 1000) + 1;
      const xpForCurrentLevel = (currentLevel - 1) * 1000;
      const xpForNextLevel = currentLevel * 1000;
      const xpInCurrentLevel = totalXP - xpForCurrentLevel;
      const xpNeeded = xpForNextLevel - xpForCurrentLevel;
      const progress = (xpInCurrentLevel / xpNeeded) * 100;

      console.log('[XP Progress Fix] Updating XP display:', { 
        totalXP, 
        currentLevel, 
        xpInCurrentLevel, 
        xpNeeded, 
        progress: progress.toFixed(1) + '%' 
      });

      // Update DOM elements
      const totalXPElement = document.getElementById('settings-total-xp');
      const currentLevelElement = document.getElementById('settings-current-level');
      const xpToNextElement = document.getElementById('settings-xp-to-next');
      const xpBarElement = document.getElementById('settings-xp-bar');

      if (totalXPElement) totalXPElement.textContent = totalXP;
      if (currentLevelElement) currentLevelElement.textContent = `Level ${currentLevel}`;
      if (xpToNextElement) xpToNextElement.textContent = `${xpInCurrentLevel} / ${xpNeeded} XP`;
      if (xpBarElement) xpBarElement.style.width = `${progress}%`;
    };

    console.log('[XP Progress Fix] Successfully fixed updateXPProgress function');
  } else {
    console.warn('[XP Progress Fix] updateXPProgress function not available yet');
  }
}, 1000);
