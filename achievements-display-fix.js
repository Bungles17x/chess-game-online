// Achievements Display Fix
// Ensures achievements are visible and properly displayed

// ============================================
// FORCED DISPLAY INITIALIZATION
// ============================================

function forceAchievementsDisplay() {
  console.log('[Achievements Display] Forcing display initialization');

  // Get achievements section elements
  const achievementsContent = document.getElementById('achievements-content');
  const achievementsLoginPrompt = document.getElementById('achievements-login-prompt');

  // Remove hidden class to show achievements
  if (achievementsContent) {
    achievementsContent.classList.remove('hidden');
    console.log('[Achievements Display] Removed hidden class from achievements content');
  }

  // Hide login prompt
  if (achievementsLoginPrompt) {
    achievementsLoginPrompt.classList.add('hidden');
    console.log('[Achievements Display] Added hidden class to login prompt');
  }

  // Initialize achievements display
  initializeAchievementsContent();
}

// ============================================
// ACHIEVEMENTS CONTENT INITIALIZATION
// ============================================

function initializeAchievementsContent() {
  console.log('[Achievements Display] Initializing achievements content');

  // Wait for achievements system to be available
  const checkInterval = setInterval(() => {
    if (window.achievementsSystem) {
      clearInterval(checkInterval);

      // Initialize achievements system if not already
      if (typeof window.achievementsSystem.initialize === 'function') {
        window.achievementsSystem.initialize();
        console.log('[Achievements Display] Initialized achievements system');
      }

      // Update XP progress
      updateXPDisplay();

      // Update achievements stats
      updateAchievementsStatsDisplay();

      // Render achievements
      renderAllAchievements();

      // Render rewards
      renderAllRewards();

      console.log('[Achievements Display] Achievements content initialized');
    }
  }, 100);

  // Timeout after 10 seconds
  setTimeout(() => {
    clearInterval(checkInterval);
  }, 10000);
}

// ============================================
// XP DISPLAY UPDATE
// ============================================

function updateXPDisplay() {
  // Get XP and level from account (currentUser) or localStorage
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
  console.log('[XP Debug] currentUser:', currentUser);
  console.log('[XP Debug] currentUser.xp:', currentUser?.xp);
  console.log('[XP Debug] currentUser.level:', currentUser?.level);
  
  // XP is stored as cumulative XP
  const totalXP = currentUser ? (currentUser.xp || 0) : parseInt(localStorage.getItem('playerXP') || '0');
  const currentLevel = currentUser ? (currentUser.level || 1) : Math.floor(totalXP / 1000) + 1;
  const xpForCurrentLevel = (currentLevel - 1) * 1000;
  const xpInCurrentLevel = totalXP - xpForCurrentLevel;
  const xpNeeded = 1000;
  const progress = Math.min((xpInCurrentLevel / xpNeeded) * 100, 100);
  
  console.log('[XP Debug] Calculated values:', { totalXP, currentLevel, xpNeeded, progress });

  // Update DOM elements
  const totalXPElement = document.getElementById('settings-total-xp');
  const currentLevelElement = document.getElementById('settings-current-level');
  const xpToNextElement = document.getElementById('settings-xp-to-next');
  const xpBarElement = document.getElementById('settings-xp-bar');

  if (totalXPElement) totalXPElement.textContent = totalXP;
  if (currentLevelElement) currentLevelElement.textContent = `Level ${currentLevel}`;
  if (xpToNextElement) xpToNextElement.textContent = `${xpInCurrentLevel} / ${xpNeeded} XP`;
  if (xpBarElement) xpBarElement.style.width = `${progress}%`;

  console.log('[Achievements Display] Updated XP display', { totalXP, currentLevel, xpNeeded, progress });
}

// ============================================
// ACHIEVEMENTS STATS UPDATE
// ============================================

function updateAchievementsStatsDisplay() {
  if (!window.achievementsSystem) return;

  const unlockedAchievements = window.achievementsSystem.getUnlockedAchievements();
  const totalAchievements = Object.values(window.achievementsSystem.achievements).length;
  const xpEarned = unlockedAchievements.reduce((sum, achievement) => sum + achievement.xp, 0);

  // Update DOM elements
  const unlockedCountElement = document.getElementById('unlocked-count');
  const totalAchievementsElement = document.getElementById('total-achievements');
  const xpEarnedElement = document.getElementById('xp-earned');

  if (unlockedCountElement) unlockedCountElement.textContent = unlockedAchievements.length;
  if (totalAchievementsElement) totalAchievementsElement.textContent = totalAchievements;
  if (xpEarnedElement) xpEarnedElement.textContent = xpEarned;

  console.log('[Achievements Display] Updated achievements stats', {
    unlocked: unlockedAchievements.length,
    total: totalAchievements,
    xpEarned
  });
}

// ============================================
// RENDER ALL ACHIEVEMENTS
// ============================================

function renderAllAchievements() {
  if (!window.achievementsSystem) return;

  const achievementsGrid = document.getElementById('settings-achievements-grid');
  if (!achievementsGrid) return;

  // Clear grid
  achievementsGrid.innerHTML = '';

  // Get all achievements
  const achievements = Object.values(window.achievementsSystem.achievements);

  // Render each achievement
  achievements.forEach(achievement => {
    const card = createAchievementCard(achievement);
    achievementsGrid.appendChild(card);
  });

  console.log('[Achievements Display] Rendered achievements', achievements.length);
}

// ============================================
// RENDER ALL REWARDS
// ============================================

function renderAllRewards() {
  if (!window.achievementsSystem) return;

  const rewardsGrid = document.getElementById('settings-rewards-grid');
  if (!rewardsGrid) return;

  // Clear grid
  rewardsGrid.innerHTML = '';

  // Get all rewards
  const rewards = Object.values(window.achievementsSystem.rewards);

  // Render each reward
  rewards.forEach(reward => {
    const card = createRewardCard(reward);
    rewardsGrid.appendChild(card);
  });

  console.log('[Achievements Display] Rendered rewards', rewards.length);
}

// ============================================
// CREATE ACHIEVEMENT CARD
// ============================================

function createAchievementCard(achievement) {
  const card = document.createElement('div');
  card.className = `achievement-card ${achievement.unlocked ? 'unlocked' : 'locked'}`;

  // Check if achievement has progress tracking
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

// ============================================
// CREATE REWARD CARD
// ============================================

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

// ============================================
// EVENT LISTENERS
// ============================================

function setupAchievementEventListeners() {
  // Listen for achievement unlocks
  document.addEventListener('achievementUnlocked', (e) => {
    console.log('[Achievements Display] Achievement unlocked', e.detail);

    // Re-render achievements
    renderAllAchievements();

    // Update stats
    updateAchievementsStatsDisplay();

    // Update XP
    updateXPDisplay();
  });

  // Listen for reward unlocks
  document.addEventListener('rewardUnlocked', (e) => {
    console.log('[Achievements Display] Reward unlocked', e.detail);

    // Re-render rewards
    renderAllRewards();
  });

  // Listen for XP earned
  document.addEventListener('xpEarned', (e) => {
    console.log('[Achievements Display] XP earned', e.detail);

    // Update XP display
    updateXPDisplay();
  });
}

// ============================================
// INITIALIZATION
// ============================================

function initializeAchievementsDisplayFix() {
  console.log('[Achievements Display] Initializing fix');

  // Force display on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(forceAchievementsDisplay, 500);
      setupAchievementEventListeners();
    });
  } else {
    setTimeout(forceAchievementsDisplay, 500);
    setupAchievementEventListeners();
  }
}

// Initialize
initializeAchievementsDisplayFix();

// Export functions
window.forceAchievementsDisplay = forceAchievementsDisplay;
window.initializeAchievementsContent = initializeAchievementsContent;
window.updateXPDisplay = updateXPDisplay;
window.updateAchievementsStatsDisplay = updateAchievementsStatsDisplay;
window.renderAllAchievements = renderAllAchievements;
window.renderAllRewards = renderAllRewards;
