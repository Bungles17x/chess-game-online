
// ============================================
// ACHIEVEMENTS TESTING TOOL
// ============================================

// Test achievement unlocking
function testAchievement(achievementId) {
  console.log('[Test] Attempting to unlock achievement:', achievementId);

  if (window.achievementsSystem) {
    const achievement = window.achievementsSystem.achievements[achievementId];

    if (!achievement) {
      console.error('[Test] Achievement not found:', achievementId);
      return;
    }

    if (achievement.unlocked) {
      console.log('[Test] Achievement already unlocked:', achievementId);
      return;
    }

    console.log('[Test] Unlocking achievement:', achievement.name, '(ID:', achievement.id, ')');
    window.achievementsSystem.unlock(achievement.id);
    console.log('[Test] Achievement unlocked successfully!');
  } else {
    console.error('[Test] Achievements system not available');
  }
}

// Test multiple achievements
function testAllAchievements() {
  console.log('[Test] Testing all achievements...');

  const testAchievements = [
    'firstMove',
    'firstWin',
    'winStreak3',
    'fourMoveMate',
    'perfectGame'
  ];

  testAchievements.forEach(id => testAchievement(id));
}

// Create test button
function createTestButton() {
  const button = document.createElement('button');
  button.textContent = '🎮 Test Achievements';
  button.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 15px 25px;
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: 700;
    cursor: pointer;
    z-index: 9999;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
    transition: all 0.3s ease;
  `;

  button.addEventListener('click', () => {
    testAchievement('firstMove');
  });

  document.body.appendChild(button);
  console.log('[Test] Test button created');
}

// Initialize test button
setTimeout(() => {
  createTestButton();
}, 2000);

// Expose to window for console testing
window.testAchievement = testAchievement;
window.testAllAchievements = testAllAchievements;

console.log('[Test] Achievement testing tools loaded!');
console.log('[Test] Use: testAchievement("firstMove") in console');
