// Enhanced Profile Page JavaScript

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
    // Update the user in the users array
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

// Display saved games
function displaySavedGames() {
  if (!savedGamesList) return;

  console.log("Profile: Displaying saved games", { count: playerData.savedGames?.length || 0 });
  savedGamesList.innerHTML = "";

  if (!playerData.savedGames || playerData.savedGames.length === 0) {
    savedGamesList.innerHTML = `
      <p class="no-saved-games">No saved games yet. Start playing and save your games!</p>
    `;
    return;
  }

  playerData.savedGames.forEach((game, index) => {
    const gameItem = document.createElement("div");
    gameItem.className = "saved-game-item";
    gameItem.style.opacity = '0';
    gameItem.style.transform = 'translateY(10px)';
    gameItem.innerHTML = `
      <div class="saved-game-info">
        <div class="saved-game-name">${game.name}</div>
        <div class="saved-game-date">${formatDate(game.date)}</div>
      </div>
      <div class="saved-game-actions">
        <button class="saved-game-btn rename-game-btn" data-index="${index}">Rename</button>
        <button class="saved-game-btn load-btn" data-index="${index}">Load</button>
        <button class="saved-game-btn delete-btn" data-index="${index}">Delete</button>
      </div>
    `;
    savedGamesList.appendChild(gameItem);

    // Animate entry
    setTimeout(() => {
      gameItem.style.opacity = '1';
      gameItem.style.transform = 'translateY(0)';
    }, index * 100);
  });

  // Add event listeners to buttons
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

// Format date for display
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

// Load a saved game
function loadGame(index) {
  const game = playerData.savedGames[index];
  localStorage.setItem("loadedGame", JSON.stringify(game));
  window.location.href = "index.html";
}

// Delete a saved game
function deleteGame(index) {
  if (confirm("Are you sure you want to delete this saved game?")) {
    playerData.savedGames.splice(index, 1);
    savePlayerData();
    displaySavedGames();
  }
}

// Rename a saved game
function renameGame(index) {
  const game = playerData.savedGames[index];
  const newName = prompt("Enter new name for this saved game:", game.name);
  
  if (newName === null) {
    // User cancelled
    return;
  }
  
  const trimmedName = newName.trim();
  
  if (!trimmedName) {
    alert("Game name cannot be empty!");
    return;
  }
  
  if (trimmedName === game.name) {
    alert("New name must be different from the current name!");
    return;
  }
  
  // Update game name
  const oldName = game.name;
  game.name = trimmedName;
  
  // Save player data
  savePlayerData();
  
  // Update display
  displaySavedGames();
  
  alert(`Game successfully renamed from "${oldName}" to "${trimmedName}"!`);
}

// Update player statistics (called from main game)
function updateStats(result) {
  playerData.stats.gamesPlayed++;

  switch(result) {
    case "win":
      playerData.stats.wins++;
      playerData.stats.currentStreak = Math.max(0, playerData.stats.currentStreak) + 1;
      playerData.xp += 100;
      break;
    case "loss":
      playerData.stats.losses++;
      playerData.stats.currentStreak = Math.min(0, playerData.stats.currentStreak) - 1;
      playerData.xp += 25;
      break;
    case "draw":
      playerData.stats.draws++;
      playerData.xp += 50;
      break;
  }

  // Check for level up
  checkLevelUp();

  // Save data
  savePlayerData();
}

// Check if player should level up
function checkLevelUp() {
  const xpNeeded = playerData.level * 1000;
  if (playerData.xp >= xpNeeded) {
    playerData.level++;
    playerData.xp -= xpNeeded;
    alert(`Congratulations! You leveled up to Level ${playerData.level}!`);
  }
}

// Save a game
function saveGame(gameState) {
  const savedGame = {
    name: `Game ${playerData.savedGames.length + 1}`,
    date: new Date().toISOString(),
    state: gameState
  };

  playerData.savedGames.push(savedGame);
  savePlayerData();
}

// Friends Management Functions
function displayFriends() {
  if (!friendsList) return;

  // Ensure friends array exists
  if (!playerData.friends) {
    playerData.friends = [];
  }

  if (playerData.friends.length === 0) {
    friendsList.innerHTML = '<p class="no-friends">No friends yet. Add some to play together!</p>';
    return;
  }

  friendsList.innerHTML = playerData.friends.map((friend, index) => `
    <div class="friend-item">
      <div class="friend-info">
        <div class="friend-avatar">${friend.avatar || '♟'}</div>
        <div>
          <div class="friend-name">${friend.username}</div>
          <div class="friend-status ${friend.online ? 'online' : 'offline'}">
            ${friend.online ? '● Online' : '● Offline'}
          </div>
        </div>
      </div>
      <div class="friend-actions">
        <button class="friend-btn invite-btn" data-username="${friend.username}">Invite</button>
        <button class="friend-btn remove" data-index="${index}">Remove</button>
      </div>
    </div>
  `).join('');

  // Add event listeners for friend buttons
  document.querySelectorAll('.invite-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const username = e.target.dataset.username;
      inviteFriendToGame(username);
    });
  });

  document.querySelectorAll('.friend-btn.remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.target.dataset.index);
      removeFriend(index);
    });
  });
}

function addFriend(username) {
  // Ensure friends array exists
  if (!playerData.friends) {
    playerData.friends = [];
  }

  // Check if friend already exists
  if (playerData.friends.some(friend => friend.username === username)) {
    alert('This user is already your friend!');
    return;
  }

  // Validate username exists
  validateUsername(username, (isValid) => {
    if (!isValid) {
      alert(`User "${username}" does not exist or is not registered! Please check the username and try again.`);
      return;
    }

    // Get friend's avatar from registered users
    const allUsers = JSON.parse(localStorage.getItem("chessUsers") || "[]");
    const friendUser = allUsers.find(user => user.username === username);
    const friendAvatar = friendUser ? friendUser.avatar : '♟';

    // Add friend to list
    playerData.friends.push({
      username: username,
      avatar: friendAvatar,
      online: false,
      addedAt: new Date().toISOString()
    });

    // Save to localStorage
    savePlayerData();

    // Update display
    displayFriends();

    // Show success message
    alert(`Successfully added ${username} as a friend!`);
  });
}

function removeFriend(index) {
  // Ensure friends array exists
  if (!playerData.friends) {
    playerData.friends = [];
    return;
  }

  if (confirm('Are you sure you want to remove this friend?')) {
    playerData.friends.splice(index, 1);
    savePlayerData();
    displayFriends();
  }
}

function inviteFriendToGame(username) {
  // Store the invited friend username in localStorage
  localStorage.setItem('invitedFriend', username);

  // Navigate to the game page
  window.location.href = 'index.html';
}

function setupFriendsFunctionality() {
  if (!addFriendBtn || !addFriendInput) return;

  addFriendBtn.addEventListener('click', () => {
    const username = addFriendInput.value.trim();
    if (username) {
      addFriend(username);
      addFriendInput.value = '';
    }
  });

  addFriendInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const username = addFriendInput.value.trim();
      if (username) {
        addFriend(username);
        addFriendInput.value = '';
      }
    }
  });
}

function validateUsername(username, callback) {
  // Check if username is the current user
  if (username === playerData.username) {
    callback(false);
    return;
  }

  // Check if username is empty
  if (!username || username.trim() === '') {
    callback(false);
    return;
  }

  // Check against all registered users in localStorage
  const allUsers = JSON.parse(localStorage.getItem("chessUsers") || "[]");
  const userExists = allUsers.some(user => user.username === username);
  
  if (userExists) {
    callback(true);
  } else {
    callback(false);
  }
}

// Make functions available globally
window.updateStats = updateStats;
window.saveGame = saveGame;
