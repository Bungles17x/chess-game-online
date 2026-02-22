
// ============================================
// RESET SEASON TO 1
// ============================================

console.log('[Season Reset] Resetting season to 1...');

// Reset SeasonConfig
if (window.SeasonConfig) {
  window.SeasonConfig.currentSeason = 1;
  console.log('[Season Reset] SeasonConfig.currentSeason set to 1');
} else {
  window.SeasonConfig = {
    seasonDuration: 30,
    seasonStartDate: new Date('2024-01-01'),
    currentSeason: 1
  };
  console.log('[Season Reset] Created SeasonConfig with currentSeason = 1');
}

// Reset user level to 1
if (window.currentUser) {
  window.currentUser.level = 1;
  window.currentUser.xp = 0;
  console.log('[Season Reset] User level reset to 1, XP reset to 0');

  // Update UI
  if (window.updateXPDisplay) {
    window.updateXPDisplay();
  }

  // Save to localStorage
  localStorage.setItem('currentUser', JSON.stringify(window.currentUser));
  console.log('[Season Reset] User data saved to localStorage');
}

// Reset achievements
if (window.achievements) {
  window.achievements.forEach(achievement => {
    achievement.unlocked = false;
  });
  console.log('[Season Reset] All achievements reset');

  // Update UI
  if (window.renderAchievements) {
    window.renderAchievements();
  }
}

// Reset rewards
if (window.rewards) {
  window.rewards.forEach(reward => {
    reward.claimed = false;
  });
  console.log('[Season Reset] All rewards reset');

  // Update UI
  if (window.renderRewards) {
    window.renderRewards();
  }
}

// Save SeasonConfig to localStorage
localStorage.setItem('SeasonConfig', JSON.stringify(window.SeasonConfig));
console.log('[Season Reset] SeasonConfig saved to localStorage');

console.log('[Season Reset] ✅ Season successfully reset to 1!');
console.log('[Season Reset] Please refresh the page to see changes.');
