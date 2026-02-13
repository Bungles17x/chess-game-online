// Enhanced Profile Page JavaScript
// Improved saved games management with better UI and functionality

// Load encryption utility
const encryptionScript = document.createElement('script');
encryptionScript.src = 'encryption.js';
document.head.appendChild(encryptionScript);

// DOM Elements
const currentAvatar = document.getElementById("current-avatar");
const playerName = document.getElementById("player-name");
const playerLevel = document.getElementById("player-level");
const avatarOptions = document.querySelectorAll(".avatar-option");
const totalGames = document.getElementById("total-games");
const totalWins = document.getElementById("total-wins");
const totalLosses = document.getElementById("total-losses");
const totalDraws = document.getElementById("total-draws");
const winRate = document.getElementById("win-rate");
const currentStreak = document.getElementById("current-streak");
const savedGamesList = document.getElementById("saved-games-list");
const backToGameBtn = document.getElementById("back-to-game-btn");
const usernameDisplay = document.getElementById("username-display");
const addFriendInput = document.getElementById("add-friend-input");
const addFriendBtn = document.getElementById("add-friend-btn");
const friendsList = document.getElementById("friends-list");

// Player Data
let playerData = {
  name: "Player",
  username: "Player",
  level: 1,
  xp: 0,
  avatar: "♟",
  stats: {
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    currentStreak: 0
  },
  savedGames: [],
  friends: []
};

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  loadPlayerData();
  setupAvatarSelection();
  setupBackButton();
  displaySavedGames();
  displayFriends();
  setupFriendsFunctionality();
  setupAnimations();
});

// Load player data from localStorage
function loadPlayerData() {
  // First try to load from authenticated user
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
  console.log("Profile: Loading player data", { currentUser: !!currentUser, username: currentUser?.username });

  if (currentUser && currentUser.username) {
    // Load from authenticated user
    playerData = {
      name: currentUser.username,
      username: currentUser.username,
      level: currentUser.level || 1,
      xp: currentUser.xp || 0,
      avatar: currentUser.avatar || '♟',
      stats: currentUser.stats || {
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        currentStreak: 0
      },
      savedGames: currentUser.savedGames || [],
      friends: currentUser.friends || []
    };

    // Ensure friends array is properly initialized
    if (!playerData.friends || !Array.isArray(playerData.friends)) {
      playerData.friends = [];
    }
  } else {
    // Fall back to local storage
    const savedData = localStorage.getItem("chessPlayerData");
    if (savedData) {
      playerData = JSON.parse(savedData);
    }
    // Ensure friends array exists
    if (!playerData.friends || !Array.isArray(playerData.friends)) {
      playerData.friends = [];
    }
  }

  updateDisplay();
}

// Save player data to localStorage and sync with server
function savePlayerData() {
  // Save to authenticated user if logged in
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');

  if (currentUser) {
    // Sync with server if user sync manager is available
    if (window.userSyncManager) {
      window.userSyncManager.updateProfile(playerData);
    }
    // Update user in users array
    const users = secureStorage.getItem('chessUsers') || [];
    const userIndex = users.findIndex(u => u.id === currentUser.id);

    if (userIndex !== -1) {
      // Update existing user
      users[userIndex] = {
        ...currentUser,
        username: playerData.username,
        level: playerData.level,
        xp: playerData.xp,
        avatar: playerData.avatar,
        stats: playerData.stats,
        savedGames: playerData.savedGames,
        friends: playerData.friends
      };

      // Save updated users array
      secureStorage.setItem('chessUsers', users);

      // Update current user in localStorage
      localStorage.setItem('currentUser', JSON.stringify(users[userIndex]));
    }
  } else {
    // Fall back to local storage for non-authenticated users
    localStorage.setItem("chessPlayerData", JSON.stringify(playerData));
  }
}

// Update display with current player data
function updateDisplay() {
  // Update avatar with animation
  if (currentAvatar) {
    currentAvatar.style.transform = 'scale(0.8)';
    setTimeout(() => {
      currentAvatar.textContent = playerData.avatar || '♟';
      currentAvatar.style.transform = 'scale(1)';
    }, 150);
  }

  // Update name and level
  if (playerName) playerName.textContent = playerData.name;
  if (playerLevel) playerLevel.textContent = `Level ${playerData.level}`;

  // Update username
  if (usernameDisplay) {
    usernameDisplay.textContent = playerData.username || 'Player';
  }

  // Update statistics with animation
  animateNumber(totalGames, playerData.stats.gamesPlayed);
  animateNumber(totalWins, playerData.stats.wins);
  animateNumber(totalLosses, playerData.stats.losses);
  animateNumber(totalDraws, playerData.stats.draws);

  // Calculate win rate
  const rate = playerData.stats.gamesPlayed > 0
    ? Math.round((playerData.stats.wins / playerData.stats.gamesPlayed) * 100)
    : 0;
  winRate.textContent = `${rate}%`;

  // Update streak
  currentStreak.textContent = playerData.stats.currentStreak;

  // Update streak color based on value
  if (currentStreak) {
    currentStreak.style.color = playerData.stats.currentStreak > 0
      ? '#22c55e'
      : playerData.stats.currentStreak < 0
      ? '#ef4444'
      : 'var(--text-muted)';
  }
}

// Animate number changes
function animateNumber(element, target) {
  if (!element) return;

  const current = parseInt(element.textContent) || 0;
  if (current === target) return;

  const duration = 500;
  const steps = 20;
  const increment = (target - current) / steps;
  let step = 0;

  const timer = setInterval(() => {
    step++;
    element.textContent = Math.round(current + (increment * step));

    if (step >= steps) {
      element.textContent = target;
      clearInterval(timer);
    }
  }, duration / steps);
}

// Setup animations
function setupAnimations() {
  // Animate sections on scroll
  const sections = document.querySelectorAll('.username-section, .avatar-section, .stats-section, .saved-games-section');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, { threshold: 0.1 });

  sections.forEach(section => {
    section.style.opacity = '0';
    section.style.transform = 'translateY(20px)';
    section.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
    observer.observe(section);
  });

  // Add hover effects to stat cards
  const statCards = document.querySelectorAll('.stat-card');
  statCards.forEach(card => {
    card.addEventListener('mouseenter', () => {
      card.style.transform = 'translateY(-4px) scale(1.02)';
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'translateY(0) scale(1)';
    });
  });
}

// Setup avatar selection
function setupAvatarSelection() {
  avatarOptions.forEach(option => {
    option.addEventListener("click", () => {
      // Remove selected class from all options
      avatarOptions.forEach(opt => opt.classList.remove("selected"));

      // Add selected class to clicked option
      option.classList.add("selected");

      // Update player avatar
      playerData.avatar = option.dataset.avatar;
      currentAvatar.textContent = playerData.avatar;

      // Save to localStorage
      savePlayerData();

      // Add animation effect
      currentAvatar.style.animation = 'none';
      setTimeout(() => {
        currentAvatar.style.animation = 'avatarGlow 3s ease-in-out infinite';
      }, 10);
    });
  });
}

// Setup back to game button
function setupBackButton() {
  backToGameBtn.addEventListener("click", () => {
    window.location.href = "index.html";
  });
}

// Display saved games with enhanced features
function displaySavedGames() {
  if (!savedGamesList) return;

  console.log("Profile: Displaying saved games", { count: playerData.savedGames?.length || 0 });
  savedGamesList.innerHTML = "";

  if (!playerData.savedGames || playerData.savedGames.length === 0) {
    savedGamesList.innerHTML = `
      <div class="no-saved-games">
        <div class="no-saved-games-icon">🎮</div>
        <div class="no-saved-games-text">No saved games yet</div>
        <div class="no-saved-games-subtext">Start playing and save your games!</div>
      </div>
    `;
    return;
  }

  // Sort games by date (newest first)
  const sortedGames = [...playerData.savedGames].sort((a, b) => 
    new Date(b.date) - new Date(a.date)
  );

  sortedGames.forEach((game, index) => {
    const gameItem = document.createElement("div");
    gameItem.className = "saved-game-item";
    gameItem.style.opacity = '0';
    gameItem.style.transform = 'translateY(10px)';

    // Get game info
    const gameState = game.state || {};
    const fen = gameState.fen || '';
    const pgn = gameState.pgn || '';
    const moveCount = gameState.moveCount || 0;
    const captureCount = gameState.captureCount || 0;
    const mode = gameState.mode || 'bot';
    const result = getGameResult(gameState);

    gameItem.innerHTML = `
      <div class="saved-game-info">
        <div class="saved-game-header">
          <div class="saved-game-name">${game.name}</div>
          <div class="saved-game-result ${result.class}">${result.text}</div>
        </div>
        <div class="saved-game-details">
          <div class="saved-game-detail">
            <span class="detail-icon">📅</span>
            <span class="detail-text">${formatDate(game.date)}</span>
          </div>
          <div class="saved-game-detail">
            <span class="detail-icon">🎯</span>
            <span class="detail-text">${moveCount} moves</span>
          </div>
          <div class="saved-game-detail">
            <span class="detail-icon">💥</span>
            <span class="detail-text">${captureCount} captures</span>
          </div>
          <div class="saved-game-detail">
            <span class="detail-icon">🎮</span>
            <span class="detail-text">${mode === 'bot' ? 'vs Bot' : 'Online'}</span>
          </div>
        </div>
      </div>
      <div class="saved-game-actions">
        <button class="saved-game-btn rename-game-btn" data-index="${index}" title="Rename game">✏️ Rename</button>
        <button class="saved-game-btn load-btn" data-index="${index}" title="Load game">▶️ Load</button>
        <button class="saved-game-btn delete-btn" data-index="${index}" title="Delete game">🗑️ Delete</button>
      </div>
    `;

    savedGamesList.appendChild(gameItem);

    // Animate entry
    setTimeout(() => {
      gameItem.style.opacity = '1';
      gameItem.style.transform = 'translateY(0)';
    }, index * 50);
  });

  // Add event listeners to buttons
  setupSavedGamesButtons();
}

// Setup event listeners for saved games buttons
function setupSavedGamesButtons() {
  document.querySelectorAll(".rename-game-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const index = parseInt(e.target.dataset.index);
      renameGame(index);
    });

    btn.addEventListener('mouseenter', () => {
      btn.style.transform = 'scale(1.05)';
    });

    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'scale(1)';
    });
  });

  document.querySelectorAll(".load-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const index = parseInt(e.target.dataset.index);
      loadGame(index);
    });

    btn.addEventListener('mouseenter', () => {
      btn.style.transform = 'scale(1.05)';
    });

    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'scale(1)';
    });
  });

  document.querySelectorAll(".delete-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const index = parseInt(e.target.dataset.index);
      deleteGame(index);
    });

    btn.addEventListener('mouseenter', () => {
      btn.style.transform = 'scale(1.05)';
    });

    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'scale(1)';
    });
  });
}

// Get game result from state
function getGameResult(gameState) {
  if (!gameState) return { text: 'Unknown', class: 'unknown' };

  const fen = gameState.fen || '';

  // Check for checkmate
  if (fen.includes(' w ') || fen.includes(' b ')) {
    // Game ended in checkmate
    const turn = fen.includes(' w ') ? 'b' : 'w';
    const winner = turn === 'w' ? 'White' : 'Black';
    return { text: `${winner} wins`, class: 'win' };
  }

  // Check for draw conditions
  if (gameState.in_draw || gameState.in_stalemate) {
    return { text: 'Draw', class: 'draw' };
  }

  return { text: 'In Progress', class: 'progress' };
}

// Format date for display
function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;

  // Format based on how recent it is
  if (diff < 60000) { // Less than 1 minute
    return 'Just now';
  } else if (diff < 3600000) { // Less than 1 hour
    return `${Math.floor(diff / 60000)} minutes ago`;
  } else if (diff < 86400000) { // Less than 1 day
    return `${Math.floor(diff / 3600000)} hours ago`;
  } else if (diff < 604800000) { // Less than 1 week
    return `${Math.floor(diff / 86400000)} days ago`;
  } else {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  }
}

// Load a saved game
function loadGame(index) {
  const game = playerData.savedGames[index];
  localStorage.setItem("loadedGame", JSON.stringify(game));
  window.location.href = "index.html";
}

// Delete a saved game with confirmation
function deleteGame(index) {
  const game = playerData.savedGames[index];

  if (confirm(`Are you sure you want to delete "${game.name}"?`)) {
    playerData.savedGames.splice(index, 1);
    savePlayerData();
    displaySavedGames();

    // Show notification
    showNotification('Game deleted successfully', 'success');
  }
}

// Rename a saved game with validation
function renameGame(index) {
  const game = playerData.savedGames[index];
  const newName = prompt("Enter new name for this saved game:", game.name);

  if (newName === null) {
    // User cancelled
    return;
  }

  const trimmedName = newName.trim();

  if (!trimmedName) {
    showNotification('Game name cannot be empty', 'error');
    return;
  }

  if (trimmedName === game.name) {
    // Name didn't change
    return;
  }

  // Check for duplicate names
  const nameExists = playerData.savedGames.some((g, i) => 
    g.name === trimmedName && i !== index
  );

  if (nameExists) {
    showNotification('A game with this name already exists', 'warning');
    return;
  }

  // Update game name
  playerData.savedGames[index].name = trimmedName;
  savePlayerData();
  displaySavedGames();

  // Show notification
  showNotification('Game renamed successfully', 'success');
}

// Display friends list
function displayFriends() {
  if (!friendsList) return;

  friendsList.innerHTML = "";

  if (!playerData.friends || playerData.friends.length === 0) {
    friendsList.innerHTML = `
      <div class="no-friends">
        <div class="no-friends-icon">👥</div>
        <div class="no-friends-text">No friends yet</div>
        <div class="no-friends-subtext">Add friends to play together!</div>
      </div>
    `;
    return;
  }

  playerData.friends.forEach(friend => {
    const friendItem = document.createElement("div");
    friendItem.className = "friend-item";
    friendItem.innerHTML = `
      <div class="friend-avatar">${friend.avatar || '♟'}</div>
      <div class="friend-info">
        <div class="friend-name">${friend.username}</div>
        <div class="friend-status">${friend.status || 'Offline'}</div>
      </div>
    `;
    friendsList.appendChild(friendItem);
  });
}

// Setup friends functionality
function setupFriendsFunctionality() {
  if (addFriendBtn) {
    addFriendBtn.addEventListener("click", handleAddFriend);
  }

  if (addFriendInput) {
    addFriendInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        handleAddFriend();
      }
    });
  }
}

// Handle adding a friend
function handleAddFriend() {
  const username = addFriendInput.value.trim();

  if (!username) {
    showNotification('Please enter a username', 'warning');
    return;
  }

  if (username.length < 3) {
    showNotification('Username must be at least 3 characters', 'warning');
    return;
  }

  // Check if already friends
  if (playerData.friends.some(f => f.username === username)) {
    showNotification('Already friends with this user', 'info');
    return;
  }

  // Add friend (this would normally sync with server)
  playerData.friends.push({
    username: username,
    avatar: '♟',
    status: 'Offline',
    addedAt: new Date().toISOString()
  });

  savePlayerData();
  displayFriends();
  addFriendInput.value = '';

  showNotification('Friend request sent!', 'success');
}

// Show notification
function showNotification(message, type = 'info') {
  const container = document.getElementById('notification-container');
  if (!container) return;

  const notification = document.createElement('div');
  notification.className = `notification ${type}`;

  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  if (type === 'error') icon = '❌';
  if (type === 'warning') icon = '⚠️';

  notification.innerHTML = `
    <span class="notification-icon">${icon}</span>
    <span class="notification-message">${message}</span>
    <button class="notification-close" onclick="this.parentElement.remove()">×</button>
  `;

  container.appendChild(notification);

  // Auto-remove after 4 seconds
  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => notification.remove(), 300);
  }, 4000);
}
