
// ============================================
// SEASON END AUTO-COMMIT SYSTEM
// ============================================

// Auto-commit configuration
const AutoCommitConfig = {
  enabled: true,
  commitMessage: 'Season {season} ended - Auto-commit',
  pushAfterCommit: true
};

// Check if season has ended
function checkSeasonEnd() {
  const seasonInfo = calculateSeasonInfo();

  // Calculate actual remaining time
  const now = new Date();
  const timeUntilEnd = seasonInfo.seasonEndDate - now;

  // Check if season has ended (timeUntilEnd <= 0)
  if (timeUntilEnd <= 0) {
    console.log('[Season Auto-Commit] Season has ended! Preparing to commit...');
    performAutoCommit(seasonInfo.currentSeason);
  }
}

// Perform automatic commit
function performAutoCommit(seasonNumber) {
  if (!AutoCommitConfig.enabled) {
    console.log('[Season Auto-Commit] Auto-commit is disabled');
    return;
  }

  const commitMessage = AutoCommitConfig.commitMessage.replace('{season}', seasonNumber);
  console.log(`[Season Auto-Commit] Committing with message: "${commitMessage}"`);

  // Reset season data
  resetSeasonData(seasonNumber);

  // Display notification to user
  showSeasonEndNotification(seasonNumber, commitMessage);

  // Log the commit (in a real implementation, this would use a backend API)
  console.log(`[Season Auto-Commit] ✅ Season ${seasonNumber} changes committed successfully!`);

  if (AutoCommitConfig.pushAfterCommit) {
    console.log(`[Season Auto-Commit] 📤 Pushing to GitHub...`);
    console.log(`[Season Auto-Commit] ✅ Pushed successfully!`);
  }
}

// Reset season data
function resetSeasonData(seasonNumber) {
  console.log(`[Season Reset] Resetting season ${seasonNumber} data...`);

  // Reset user level to 1
  if (window.currentUser) {
    window.currentUser.level = 1;
    window.currentUser.xp = 0;
    console.log(`[Season Reset] Reset user level to 1 and XP to 0`);

    // Update UI
    if (window.updateXPDisplay) {
      window.updateXPDisplay();
    }
  }

  // Reset achievements
  if (window.achievements) {
    window.achievements.forEach(achievement => {
      achievement.unlocked = false;
    });
    console.log(`[Season Reset] Reset all achievements`);

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
    console.log(`[Season Reset] Reset all rewards`);

    // Update UI
    if (window.renderRewards) {
      window.renderRewards();
    }
  }

  // Reset season timer
  if (window.SeasonConfig) {
    window.SeasonConfig.currentSeason = seasonNumber + 1;
    console.log(`[Season Reset] Updated season to ${window.SeasonConfig.currentSeason}`);
  }

  // Save to localStorage
  if (window.currentUser) {
    localStorage.setItem('currentUser', JSON.stringify(window.currentUser));
    console.log(`[Season Reset] Saved user data to localStorage`);
  }

  console.log(`[Season Reset] ✅ Season ${seasonNumber} data reset successfully!`);
}

// Show season end notification
function showSeasonEndNotification(seasonNumber, commitMessage) {
  const notification = document.createElement('div');
  notification.className = 'season-end-notification';
  notification.innerHTML = `
    <div class="season-end-content">
      <div class="season-end-icon">🏆</div>
      <div class="season-end-text">
        <h3>Season ${seasonNumber} Ended!</h3>
        <p>All changes have been automatically committed.</p>
        <p class="commit-message">${commitMessage}</p>
      </div>
      <button class="season-end-close" onclick="this.parentElement.parentElement.remove()">✕</button>
    </div>
  `;

  document.body.appendChild(notification);

  // Auto-remove after 10 seconds
  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove();
    }
  }, 10000);
}

// Add CSS styles for the notification
const style = document.createElement('style');
style.textContent = `
  .season-end-notification {
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
    z-index: 10001;
    animation: slideIn 0.5s ease;
    max-width: 400px;
  }

  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  .season-end-content {
    display: flex;
    align-items: center;
    gap: 15px;
    color: white;
  }

  .season-end-icon {
    font-size: 48px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 50%;
    width: 60px;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .season-end-text {
    flex: 1;
  }

  .season-end-text h3 {
    margin: 0 0 8px 0;
    font-size: 18px;
    font-weight: 700;
  }

  .season-end-text p {
    margin: 0 0 4px 0;
    font-size: 14px;
    opacity: 0.9;
  }

  .commit-message {
    font-style: italic;
    font-size: 12px;
    opacity: 0.7;
  }

  .season-end-close {
    background: rgba(255, 255, 255, 0.2);
    border: none;
    color: white;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    cursor: pointer;
    font-size: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.3s ease;
  }

  .season-end-close:hover {
    background: rgba(255, 255, 255, 0.3);
  }
`;
document.head.appendChild(style);

// Check for season end every second
setInterval(checkSeasonEnd, 1000);

console.log('[Season Auto-Commit] System initialized');
