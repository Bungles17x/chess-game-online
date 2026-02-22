
// ============================================
// XP RESET FIX
// ============================================

// Reset XP to a reasonable value
setTimeout(function resetXP() {
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
  if (currentUser) {
    // Reset to Level 6 with 5586 XP (as mentioned by user)
    const newXP = 5586;
    const newLevel = Math.floor(newXP / 1000) + 1;

    console.log('[XP Reset] Resetting XP from', currentUser.xp, 'to', newXP);
    console.log('[XP Reset] Resetting level from', currentUser.level, 'to', newLevel);

    currentUser.xp = newXP;
    currentUser.level = newLevel;
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    localStorage.setItem('playerXP', newXP.toString());

    // Trigger UI update
    document.dispatchEvent(new CustomEvent('xpEarned', {
      detail: { amount: 0, total: newXP, level: newLevel }
    }));

    console.log('[XP Reset] ✅ XP reset successfully!');
    console.log('[XP Reset] New XP:', newXP);
    console.log('[XP Reset] New Level:', newLevel);
  } else {
    console.error('[XP Reset] ❌ No user logged in!');
  }
}, 1000);
