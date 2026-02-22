
// ============================================
// ACHIEVEMENTS INITIALIZATION FIX
// ============================================

// Force achievements to be visible and working
function initAchievements() {
  console.log('[Achievements Init] Starting initialization...');

  // Remove hidden class from achievements content
  const achievementsContent = document.getElementById('achievements-content');
  if (achievementsContent) {
    achievementsContent.classList.remove('hidden');
    console.log('[Achievements Init] Removed hidden class from achievements content');
  }

  // Hide login prompt
  const loginPrompt = document.getElementById('achievements-login-prompt');
  if (loginPrompt) {
    loginPrompt.classList.add('hidden');
    console.log('[Achievements Init] Hidden login prompt');
  }

  // Wait for achievements system
  const checkInterval = setInterval(() => {
    if (window.achievementsSystem) {
      clearInterval(checkInterval);
      console.log('[Achievements Init] Achievements system found');

      // Initialize system
      if (typeof window.achievementsSystem.initialize === 'function') {
        window.achievementsSystem.initialize();
        console.log('[Achievements Init] System initialized');
      }

      // Render achievements
      renderAchievements();
      renderRewards();
      updateAchievementsStats();
    }
  }, 100);

  // Timeout after 10 seconds
  setTimeout(() => {
    clearInterval(checkInterval);
    console.error('[Achievements Init] Timeout - system not found');
  }, 10000);
}

// Render all achievements
function renderAchievements() {
  if (!window.achievementsSystem) return;

  const achievementsGrid = document.getElementById('settings-achievements-grid');
  if (!achievementsGrid) {
    console.error('[Achievements Init] Achievements grid not found');
    return;
  }

  // Clear grid
  achievementsGrid.innerHTML = '';

  // Get all achievements
  const achievements = Object.values(window.achievementsSystem.achievements);
  console.log('[Achievements Init] Rendering', achievements.length, 'achievements');

  // Render each achievement
  achievements.forEach(achievement => {
    const card = createAchievementCard(achievement);
    achievementsGrid.appendChild(card);
  });
}

// Render all rewards
function renderRewards() {
  if (!window.achievementsSystem) return;

  const rewardsGrid = document.getElementById('settings-rewards-grid');
  if (!rewardsGrid) {
    console.error('[Achievements Init] Rewards grid not found');
    return;
  }

  // Clear grid
  rewardsGrid.innerHTML = '';

  // Get all rewards
  const rewards = Object.values(window.achievementsSystem.rewards);
  console.log('[Achievements Init] Rendering', rewards.length, 'rewards');

  // Render each reward
  rewards.forEach(reward => {
    const card = createRewardCard(reward);
    rewardsGrid.appendChild(card);
  });
}

// Update achievements stats
function updateAchievementsStats() {
  if (!window.achievementsSystem) return;

  const unlockedCount = window.achievementsSystem.getUnlockedAchievements().length;
  const totalCount = Object.keys(window.achievementsSystem.achievements).length;

  const unlockedElement = document.getElementById('unlocked-count');
  const totalElement = document.getElementById('total-achievements');

  if (unlockedElement) {
    unlockedElement.textContent = unlockedCount;
  }
  if (totalElement) {
    totalElement.textContent = totalCount;
  }

  console.log('[Achievements Init] Updated stats:', unlockedCount, '/', totalCount);
}

// Create achievement card
function createAchievementCard(achievement) {
  const card = document.createElement('div');
  card.className = `achievement-card ${achievement.unlocked ? 'unlocked' : 'locked'}`;

  const hasProgress = achievement.target !== undefined && achievement.target !== null;
  let progressHTML = '';

  if (hasProgress) {
    const progressPercentage = window.achievementsSystem.getProgressPercentage(achievement.id);
    const progress = achievement.progress !== undefined ? achievement.progress : (achievement.unlocked ? achievement.target : 0);
    const target = achievement.target;

    progressHTML = `
      <div class="achievement-card-progress">
        <div class="achievement-card-progress-bar">
          <div class="achievement-card-progress-fill" style="width: ${progressPercentage}%"></div>
        </div>
        <div class="achievement-card-progress-text">${progress} / ${target}</div>
      </div>
    `;
  }

  const category = achievement.category || 'general';
  const statusText = achievement.unlocked ? '✓ Unlocked' : '🔒 Locked';

  card.innerHTML = `
    <div class="achievement-card-icon">${achievement.icon}</div>
    <div class="achievement-card-content">
      <div class="achievement-card-header">
        <div class="achievement-card-title">${achievement.name}</div>
        <div class="achievement-card-xp">+${achievement.xp} XP</div>
      </div>
      <div class="achievement-card-description">${achievement.description}</div>
      ${progressHTML}
      <div class="achievement-card-footer">
        <div class="achievement-card-category">${category}</div>
        <div class="achievement-card-status">${statusText}</div>
      </div>
    </div>
  `;

  return card;
}

// Create reward card
function createRewardCard(reward) {
  const card = document.createElement('div');
  const rarity = reward.rarity || 'common';
  const xpBonus = reward.xpBonus || 0;

  card.className = `reward-card ${reward.unlocked ? 'unlocked' : 'locked'} rarity-${rarity}`;

  card.innerHTML = `
    <div class="reward-card-icon">${reward.icon}</div>
    <div class="reward-card-content">
      <div class="reward-card-header">
        <div class="reward-card-title">${reward.name}</div>
        ${xpBonus > 0 ? `<div class="reward-card-xp-bonus">+${xpBonus} XP</div>` : ''}
      </div>
      <div class="reward-card-description">${reward.description}</div>
      <div class="reward-card-requirement">${reward.requirement}</div>
      <div class="reward-card-footer">
        <div class="reward-card-rarity rarity-${rarity}">${rarity.charAt(0).toUpperCase() + rarity.slice(1)}</div>
        <div class="reward-card-type">${reward.type}</div>
      </div>
    </div>
  `;

  return card;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAchievements);
} else {
  initAchievements();
}

// Also initialize after a short delay to ensure everything is loaded
setTimeout(initAchievements, 500);
