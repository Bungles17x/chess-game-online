// Recent Updates Page JavaScript

// DOM Elements
const backToGameBtn = document.getElementById("back-to-game");
const updatesList = document.getElementById("updates-list");

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  loadUpdates();
  setupBackButton();
});

// Load updates from GitHub API
async function loadUpdates() {
  const updatesList = document.getElementById("updates-list");

  // Show loading state
  if (updatesList) {
    updatesList.innerHTML = '<p class="loading-updates">Loading recent commits...</p>';
  }

  try {
    // Fetch only the latest commit from GitHub API
    const response = await fetch('https://api.github.com/repos/Bungles17x/chess-game-online/commits?per_page=1');

    if (!response.ok) {
      throw new Error('Failed to fetch commits');
    }

    const commits = await response.json();

    if (commits.length === 0) {
      throw new Error('No commits found');
    }

    const commit = commits[0];

    // Determine severity based on commit message
    const message = commit.commit.message.split('\n')[0];
    const severity = determineSeverity(message);

    // Create update object
    const update = {
      commit: commit.sha.substring(0, 7),
      message: message,
      timestamp: commit.commit.committer.date,
      author: commit.commit.author.name,
      severity: severity
    };

    // Store in localStorage for offline viewing
    localStorage.setItem("chessUpdates", JSON.stringify([update]));

    displayUpdates([update]);
  } catch (error) {
    console.error('Error fetching commits:', error);

    // Fall back to localStorage if API call fails
    const storedUpdates = localStorage.getItem("chessUpdates");

    if (storedUpdates) {
      const updates = JSON.parse(storedUpdates);
      displayUpdates(updates);

      // Show error message
      const errorMessage = document.createElement('p');
      errorMessage.className = 'error-message';
      errorMessage.textContent = 'Unable to fetch latest commits. Showing cached updates.';
      errorMessage.style.color = '#ef4444';
      errorMessage.style.marginTop = '10px';
      updatesList.insertBefore(errorMessage, updatesList.firstChild);
    } else {
      // Default updates if none stored and API call fails
      const defaultUpdates = [
        {
          commit: "N/A",
          message: "Unable to load updates. Please check your internet connection.",
          timestamp: new Date().toISOString(),
          severity: 'normal'
        }
      ];
      displayUpdates(defaultUpdates);
    }
  }
}

// Determine severity based on commit message
function determineSeverity(message) {
  const lowerMessage = message.toLowerCase();

  // Major changes: breaking changes, major features, security fixes
  if (lowerMessage.includes('breaking') || 
      lowerMessage.includes('major') || 
      lowerMessage.includes('security') ||
      lowerMessage.includes('critical') ||
      lowerMessage.includes('important') ||
      lowerMessage.startsWith('feat:') ||
      lowerMessage.startsWith('fix:')) {
    return 'major';
  }

  // Normal changes: features, fixes, improvements
  if (lowerMessage.includes('feature') || 
      lowerMessage.includes('fix') || 
      lowerMessage.includes('update') ||
      lowerMessage.includes('improve') ||
      lowerMessage.includes('add') ||
      lowerMessage.includes('change')) {
    return 'normal';
  }

  // Minor changes: documentation, styling, small tweaks
  return 'minor';
}

// Display updates in the list
function displayUpdates(updates) {
  if (!updatesList) return;

  if (updates.length === 0) {
    updatesList.innerHTML = '<p class="no-updates">No updates available yet.</p>';
    return;
  }

  updatesList.innerHTML = updates.map(update => `
    <div class="update-item update-${update.severity || 'normal'}">
      <div class="update-header">
        <h3 class="update-commit">Commit ${escapeHtml(update.commit)}</h3>
        <span class="update-severity severity-${update.severity || 'normal'}">${capitalizeFirst(update.severity || 'normal')}</span>
        <span class="update-time">${formatTime(update.timestamp)}</span>
      </div>
      <p class="update-message">${escapeHtml(update.message)}</p>
      ${update.author ? `<p class="update-author">by ${escapeHtml(update.author)}</p>` : ''}
    </div>
  `).join('');
}

// Capitalize first letter
function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Format timestamp for display
function formatTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;

  // Less than a minute
  if (diff < 60000) {
    return "Just now";
  }

  // Less than an hour
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  }

  // Less than a day
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  }

  // Less than a week
  if (diff < 604800000) {
    const days = Math.floor(diff / 86400000);
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  }

  // Otherwise show the date
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Setup back button
function setupBackButton() {
  if (backToGameBtn) {
    backToGameBtn.addEventListener("click", () => {
      window.location.href = "index.html";
    });
  }
}

// Function to add a new update (can be called from other scripts)
function addUpdate(commit, message) {
  const updates = JSON.parse(localStorage.getItem("chessUpdates") || "[]");

  updates.unshift({
    commit: commit,
    message: message,
    timestamp: new Date().toISOString()
  });

  // Keep only the last 20 updates
  if (updates.length > 20) {
    updates.pop();
  }

  localStorage.setItem("chessUpdates", JSON.stringify(updates));

  // If on the updates page, refresh the display
  if (window.location.pathname.endsWith("updates.html")) {
    displayUpdates(updates);
  }
}

// Make addUpdate available globally
window.addUpdate = addUpdate;
