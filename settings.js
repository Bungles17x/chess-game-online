// Settings Page JavaScript

// DOM Elements
const backToGameBtn = document.getElementById('back-to-game-btn');

// Track unsaved changes
let hasUnsavedChanges = false;
let initialSettings = {};
const loginFormContainer = document.getElementById('login-form-container');
const registerFormContainer = document.getElementById('register-form-container');
const profileDisplay = document.getElementById('profile-display');
const profileSettings = document.getElementById('profile-settings');
const profileLoginPrompt = document.getElementById('profile-login-prompt');
const showRegisterBtn = document.getElementById('show-register');
const showLoginBtn = document.getElementById('show-login');
const logoutBtn = document.getElementById('logout-btn');
const syncNowBtn = document.getElementById('sync-now-btn');
const lastSyncTime = document.getElementById('last-sync-time');
const syncStatus = document.getElementById('sync-status');
const saveSettingsBtn = document.getElementById('save-settings-btn');

// Rename Popup Elements
const renamePopup = document.getElementById('rename-popup');
const renameInput = document.getElementById('rename-input');
const renameClose = document.getElementById('rename-close');
const renameCancel = document.getElementById('rename-cancel');
const renameConfirm = document.getElementById('rename-confirm');

// Track which game is being renamed
let currentRenameIndex = -1;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  checkLoginStatus();
  setupThemeSelection();
  setupAvatarSelection();
  updateSyncStatus();
  loadSavedGames();
  loadSettings();
  trackInitialSettings();
});

// Setup Event Listeners
function setupEventListeners() {
  // Back to Game button
  if (backToGameBtn) {
    backToGameBtn.addEventListener('click', () => {
      checkUnsavedChanges();
    });
  }

  // Login form
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }

  // Register form
  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', handleRegister);
  }

  // Show/Hide forms
  if (showRegisterBtn) {
    showRegisterBtn.addEventListener('click', (e) => {
      e.preventDefault();
      loginFormContainer.classList.add('hidden');
      registerFormContainer.classList.remove('hidden');
    });
  }

  if (showLoginBtn) {
    showLoginBtn.addEventListener('click', (e) => {
      e.preventDefault();
      registerFormContainer.classList.add('hidden');
      loginFormContainer.classList.remove('hidden');
    });
  }

  // Logout button
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }

  // Sync Now button
  if (syncNowBtn) {
    syncNowBtn.addEventListener('click', handleSyncNow);
  }

  // Listen for login/logout events
  window.addEventListener('userLoggedIn', () => {
    checkLoginStatus();
  });

  window.addEventListener('userLoggedOut', () => {
    checkLoginStatus();
  });

  // Listen for sync events
  window.addEventListener('profileUpdated', () => {
    updateSyncStatus();
  });

  // Rename popup event listeners
  if (renameClose) {
    renameClose.addEventListener('click', closeRenamePopup);
  }

  if (renameCancel) {
    renameCancel.addEventListener('click', closeRenamePopup);
  }

  if (renameConfirm) {
    renameConfirm.addEventListener('click', confirmRename);
  }

  // Close popup when clicking outside
  if (renamePopup) {
    renamePopup.addEventListener('click', (e) => {
      if (e.target === renamePopup) {
        closeRenamePopup();
      }
    });
  }

  // Handle Enter key in rename input
  if (renameInput) {
    renameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        confirmRename();
      }
    });
  }

  // Save settings button
  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', saveSettings);
  }
}

// Handle Login
function handleLogin(e) {
  e.preventDefault();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  // Validate inputs
  if (!email || !password) {
    showNotification('Please enter email and password');
    return;
  }

  // Get users from localStorage
  const users = JSON.parse(localStorage.getItem('chessUsers') || '[]');

  // Find user by email or username
  const user = users.find(u => u.email === email || u.username === email);

  if (!user) {
    showNotification('User not found');
    return;
  }

  if (user.password !== password) {
    showNotification('Incorrect password');
    return;
  }

  // Set current user
  localStorage.setItem('currentUser', JSON.stringify(user));

  // Dispatch login event
  window.dispatchEvent(new CustomEvent('userLoggedIn', { detail: user }));

  // Show notification
  showNotification('Logged in successfully');

  // Update UI
  checkLoginStatus();
}

// Handle Register
function handleRegister(e) {
  e.preventDefault();

  const username = document.getElementById('reg-username').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const confirmPassword = document.getElementById('reg-confirm-password').value;

  // Validate inputs
  if (!username || !email || !password || !confirmPassword) {
    showNotification('Please fill in all fields');
    return;
  }

  if (password !== confirmPassword) {
    showNotification('Passwords do not match');
    return;
  }

  if (password.length < 6) {
    showNotification('Password must be at least 6 characters');
    return;
  }

  // Get users from localStorage
  const users = JSON.parse(localStorage.getItem('chessUsers') || '[]');

  // Check if email or username already exists
  if (users.find(u => u.email === email)) {
    showNotification('Email already registered');
    return;
  }

  if (users.find(u => u.username === username)) {
    showNotification('Username already taken');
    return;
  }

  // Create new user
  const newUser = {
    id: Date.now(),
    username,
    email,
    password,
    avatar: '♟',
    level: 1,
    xp: 0,
    stats: {
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      currentStreak: 0
    },
    savedGames: [],
    createdAt: new Date().toISOString()
  };

  // Save user
  users.push(newUser);
  localStorage.setItem('chessUsers', JSON.stringify(users));
  localStorage.setItem('currentUser', JSON.stringify(newUser));

  // Dispatch login event
  window.dispatchEvent(new CustomEvent('userLoggedIn', { detail: newUser }));

  // Show notification
  showNotification('Registered successfully');

  // Update UI
  checkLoginStatus();
}

// Check Login Status
function checkLoginStatus() {
  const currentUser = localStorage.getItem('currentUser');

  if (currentUser) {
    // User is logged in
    loginFormContainer.classList.add('hidden');
    registerFormContainer.classList.add('hidden');
    profileDisplay.classList.remove('hidden');
    profileSettings.classList.remove('hidden');
    profileLoginPrompt.classList.add('hidden');

    // Load profile data
    loadProfileData();
    
    // Load saved games
    loadSavedGames();
  } else {
    // User is not logged in
    loginFormContainer.classList.remove('hidden');
    registerFormContainer.classList.add('hidden');
    profileDisplay.classList.add('hidden');
    profileSettings.classList.add('hidden');
    profileLoginPrompt.classList.remove('hidden');
  }
}

// Load Profile Data
function loadProfileData() {
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
  if (!currentUser) return;

  // Update display
  const playerName = document.getElementById('player-name');
  const usernameDisplay = document.getElementById('username-display');
  const playerLevel = document.getElementById('player-level');
  const currentAvatar = document.getElementById('current-avatar');

  if (playerName) playerName.textContent = currentUser.username || 'Player';
  if (usernameDisplay) usernameDisplay.textContent = '@' + (currentUser.username || 'player');
  if (playerLevel) playerLevel.textContent = currentUser.level || 1;
  if (currentAvatar) currentAvatar.textContent = currentUser.avatar || '♟';

  // Update statistics
  const stats = currentUser.stats || {};
  const totalGames = document.getElementById('total-games');
  const totalWins = document.getElementById('total-wins');
  const totalLosses = document.getElementById('total-losses');
  const totalDraws = document.getElementById('total-draws');
  const winRate = document.getElementById('win-rate');
  const currentStreak = document.getElementById('current-streak');

  if (totalGames) totalGames.textContent = stats.gamesPlayed || 0;
  if (totalWins) totalWins.textContent = stats.wins || 0;
  if (totalLosses) totalLosses.textContent = stats.losses || 0;
  if (totalDraws) totalDraws.textContent = stats.draws || 0;

  // Calculate win rate
  const gamesPlayed = stats.gamesPlayed || 0;
  const wins = stats.wins || 0;
  const rate = gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) : 0;
  if (winRate) winRate.textContent = rate + '%';

  if (currentStreak) currentStreak.textContent = stats.currentStreak || 0;
}

// Load Saved Games
function loadSavedGames() {
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
  if (!currentUser) return;

  const savedGames = currentUser.savedGames || [];
  const savedGamesList = document.getElementById('saved-games-list');
  const noSavedGames = document.getElementById('no-saved-games');

  if (!savedGamesList || !noSavedGames) return;

  // Clear existing games
  savedGamesList.innerHTML = '';

  if (savedGames.length === 0) {
    // Show no games message
    noSavedGames.classList.remove('hidden');
    return;
  }

  // Hide no games message
  noSavedGames.classList.add('hidden');

  // Sort games by date (newest first)
  savedGames.sort((a, b) => new Date(b.date) - new Date(a.date));

  // Display each game
  savedGames.forEach((game, index) => {
    const gameItem = createSavedGameItem(game, index);
    savedGamesList.appendChild(gameItem);
  });
}

// Create Saved Game Item
function createSavedGameItem(game, index) {
  const gameItem = document.createElement('div');
  gameItem.className = 'saved-game-item';

  // Format date
  const date = new Date(game.date);
  const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Determine result class
  const resultClass = game.result ? game.result.toLowerCase() : 'draw';
  const resultText = game.result || 'Draw';

  // Use custom name or default
  const gameTitle = game.name || (game.opponent ? 'vs ' + game.opponent : 'Game');

  gameItem.innerHTML = `
    <div class="saved-game-info">
      <div class="saved-game-date">${formattedDate}</div>
      <div class="saved-game-title" id="game-title-${index}">${gameTitle}</div>
      <span class="saved-game-result ${resultClass}">${resultText}</span>
    </div>
    <div class="saved-game-actions">
      <button class="saved-game-btn rename" data-index="${index}">Rename</button>
      <button class="saved-game-btn load" data-index="${index}">Load</button>
      <button class="saved-game-btn delete" data-index="${index}">Delete</button>
    </div>
  `;

  // Add event listeners
  const renameBtn = gameItem.querySelector('.rename');
  const loadBtn = gameItem.querySelector('.load');
  const deleteBtn = gameItem.querySelector('.delete');

  if (renameBtn) {
    renameBtn.addEventListener('click', () => renameGame(index));
  }

  if (loadBtn) {
    loadBtn.addEventListener('click', () => loadGame(index));
  }

  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => deleteGame(index));
  }

  return gameItem;
}

// Load Game
function loadGame(index) {
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
  if (!currentUser) return;

  const savedGames = currentUser.savedGames || [];
  if (index < 0 || index >= savedGames.length) return;

  const game = savedGames[index];

  // Save game data to localStorage for the main game to load
  localStorage.setItem('loadedGame', JSON.stringify(game));

  // Navigate to game
  window.location.href = 'index.html';
}

// Rename Game
function renameGame(index) {
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
  if (!currentUser) return;

  const savedGames = currentUser.savedGames || [];
  if (index < 0 || index >= savedGames.length) return;

  const game = savedGames[index];

  // Store the current index and show the popup
  currentRenameIndex = index;
  
  // Set the input value to the current name
  if (renameInput) {
    renameInput.value = game.name || (game.opponent ? 'vs ' + game.opponent : 'Game');
  }
  
  // Show the popup
  if (renamePopup) {
    renamePopup.classList.remove('hidden');
  }
  
  // Focus the input
  if (renameInput) {
    setTimeout(() => renameInput.focus(), 100);
  }
}

// Close Rename Popup
function closeRenamePopup() {
  if (renamePopup) {
    renamePopup.classList.add('hidden');
  }
  
  if (renameInput) {
    renameInput.value = '';
  }
  
  currentRenameIndex = -1;
}

// Confirm Rename
function confirmRename() {
  if (currentRenameIndex === -1) return;
  
  const newName = renameInput ? renameInput.value.trim() : '';
  
  if (!newName) {
    showNotification('Name cannot be empty');
    return;
  }
  
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
  if (!currentUser) return;

  const savedGames = currentUser.savedGames || [];
  if (currentRenameIndex < 0 || currentRenameIndex >= savedGames.length) return;

  const game = savedGames[currentRenameIndex];

  // Update game name
  game.name = newName;
  savedGames[currentRenameIndex] = game;
  currentUser.savedGames = savedGames;

  // Update localStorage
  localStorage.setItem('currentUser', JSON.stringify(currentUser));

  // Update users array
  const users = JSON.parse(localStorage.getItem('chessUsers') || '[]');
  const userIndex = users.findIndex(u => u.id === currentUser.id);
  if (userIndex !== -1) {
    users[userIndex] = currentUser;
    localStorage.setItem('chessUsers', JSON.stringify(users));
  }

  // Sync with server
  if (window.userSyncManager) {
    window.userSyncManager.updateProfile({ savedGames });
  }

  // Close popup
  closeRenamePopup();

  // Reload saved games
  loadSavedGames();

  // Show notification
  showNotification('Game renamed successfully');
}

// Delete Game
function deleteGame(index) {
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
  if (!currentUser) return;

  const savedGames = currentUser.savedGames || [];
  if (index < 0 || index >= savedGames.length) return;

  // Remove game
  savedGames.splice(index, 1);
  currentUser.savedGames = savedGames;

  // Update localStorage
  localStorage.setItem('currentUser', JSON.stringify(currentUser));

  // Update users array
  const users = JSON.parse(localStorage.getItem('chessUsers') || '[]');
  const userIndex = users.findIndex(u => u.id === currentUser.id);
  if (userIndex !== -1) {
    users[userIndex] = currentUser;
    localStorage.setItem('chessUsers', JSON.stringify(users));
  }

  // Sync with server
  if (window.userSyncManager) {
    window.userSyncManager.updateProfile({ savedGames });
  }

  // Reload saved games
  loadSavedGames();

  // Show notification
  showNotification('Game deleted successfully');
}

// Handle Logout
function handleLogout() {
  // Clear current user
  localStorage.removeItem('currentUser');

  // Dispatch logout event
  window.dispatchEvent(new CustomEvent('userLoggedOut'));

  // Show notification
  showNotification('Logged out successfully');

  // Update UI
  checkLoginStatus();
}

// Handle Sync Now
function handleSyncNow() {
  if (!window.userSyncManager) {
    showNotification('Sync not available');
    return;
  }

  syncNowBtn.disabled = true;
  syncNowBtn.textContent = 'Syncing...';

  window.userSyncManager.syncAllData();

  setTimeout(() => {
    syncNowBtn.disabled = false;
    syncNowBtn.textContent = 'Sync Now';
    updateSyncStatus();
    showNotification('Profile synced successfully');
  }, 1000);
}

// Update Sync Status
function updateSyncStatus() {
  if (!window.userSyncManager) return;

  const lastSync = window.userSyncManager.lastSyncTime;

  if (lastSync > 0) {
    const date = new Date(lastSync);
    lastSyncTime.textContent = date.toLocaleString();
    syncStatus.textContent = 'Synced';
    syncStatus.style.color = 'var(--success)';
  } else {
    lastSyncTime.textContent = 'Never';
    syncStatus.textContent = 'Not synced';
    syncStatus.style.color = 'var(--text-muted)';
  }
}

// Setup Theme Selection
function setupThemeSelection() {
  const themeBtns = document.querySelectorAll('.theme-btn');
  const themeOptions = document.querySelectorAll('.theme-option[data-theme]');

  // Handle theme toggle buttons
  themeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const theme = btn.dataset.theme;
      document.body.classList.remove('light-theme');
      if (theme === 'light') {
        document.body.classList.add('light-theme');
      }

      // Update active state
      themeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Save preference
      localStorage.setItem('theme', theme);
    });
  });

  // Handle board theme selection
  themeOptions.forEach(option => {
    option.addEventListener('click', () => {
      const theme = option.dataset.theme;

      // Update active state
      themeOptions.forEach(o => o.classList.remove('selected'));
      option.classList.add('selected');

      // Save preference to both boardTheme and chessBoardTheme for compatibility
      localStorage.setItem('boardTheme', theme);
      localStorage.setItem('chessBoardTheme', theme);

      // Apply theme
      document.documentElement.style.setProperty('--board-theme', theme);
    });
  });

  // Load saved theme preferences
  const savedTheme = localStorage.getItem('theme') || 'dark';
  const savedBoardTheme = localStorage.getItem('chessBoardTheme') || localStorage.getItem('boardTheme') || 'classic';

  // Apply theme
  if (savedTheme === 'light') {
    document.body.classList.add('light-theme');
  }

  // Update active states
  themeBtns.forEach(btn => {
    if (btn.dataset.theme === savedTheme) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  themeOptions.forEach(option => {
    if (option.dataset.theme === savedBoardTheme) {
      option.classList.add('selected');
    } else {
      option.classList.remove('selected');
    }
  });
}

// Setup Avatar Selection
function setupAvatarSelection() {
  const avatarOptions = document.querySelectorAll('.avatar-option');

  avatarOptions.forEach(option => {
    option.addEventListener('click', () => {
      const avatar = option.dataset.avatar;

      // Update active state
      avatarOptions.forEach(o => o.classList.remove('selected'));
      option.classList.add('selected');

      // Update display
      const currentAvatar = document.getElementById('current-avatar');
      if (currentAvatar) {
        currentAvatar.textContent = avatar;
      }

      // Save to profile
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
      if (currentUser) {
        currentUser.avatar = avatar;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));

        // Sync with server
        if (window.userSyncManager) {
          window.userSyncManager.updateProfile({ avatar });
        }

        // Dispatch event
        window.dispatchEvent(new CustomEvent('profileUpdated', { detail: currentUser }));
      }
    });
  });

  // Load saved avatar
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
  if (currentUser && currentUser.avatar) {
    const currentAvatarDisplay = document.getElementById('current-avatar');
    if (currentAvatarDisplay) {
      currentAvatarDisplay.textContent = currentUser.avatar;
    }

    // Update selected state
    avatarOptions.forEach(option => {
      if (option.dataset.avatar === currentUser.avatar) {
        option.classList.add('selected');
      } else {
        option.classList.remove('selected');
      }
    });
  }
}

// Show Notification
function showNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 24px;
    background: linear-gradient(135deg, var(--accent), var(--accent-strong));
    color: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 10000;
    animation: slideIn 0.3s ease-out;
  `;

  document.body.appendChild(notification);

  // Remove after 3 seconds
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, 3000);
}

// Add CSS animations
const settingsStyle = document.createElement('style');
settingsStyle.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
`;
document.head.appendChild(settingsStyle);

// Save Settings
function saveSettings() {
  // Get all settings from localStorage
  const settings = {
    // Theme settings
    theme: localStorage.getItem('theme') || 'dark',
    boardTheme: localStorage.getItem('boardTheme') || 'classic',
    chessBoardTheme: localStorage.getItem('chessBoardTheme') || 'classic',
    chessPieceTheme: localStorage.getItem('chessPieceTheme') || 'classic',
    
    // Game settings
    soundEnabled: localStorage.getItem('soundEnabled') !== 'false',
    moveHints: localStorage.getItem('moveHints') !== 'false',
    autoPromote: localStorage.getItem('autoPromote') !== 'false',
    showCoordinates: localStorage.getItem('showCoordinates') !== 'false',
    
    // Other settings
    showBanAfterLogin: localStorage.getItem('showBanAfterLogin') === 'true'
  };

  // Save to localStorage as a single object
  localStorage.setItem('chessSettings', JSON.stringify(settings));

  // Save to user profile if logged in
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
  if (currentUser) {
    currentUser.settings = settings;
    localStorage.setItem('currentUser', JSON.stringify(currentUser));

    // Update users array
    const users = JSON.parse(localStorage.getItem('chessUsers') || '[]');
    const userIndex = users.findIndex(u => u.id === currentUser.id);
    if (userIndex !== -1) {
      users[userIndex] = currentUser;
      localStorage.setItem('chessUsers', JSON.stringify(users));
    }

    // Sync with server
    if (window.userSyncManager) {
      window.userSyncManager.updateProfile({ settings });
    }
  }

  // Show success notification
  showNotification('Settings saved successfully!');

  // Reset initial settings to current settings
  trackInitialSettings();
}

// Load Settings
function loadSettings() {
  // Try to load from user profile first
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
  let settings = null;

  if (currentUser && currentUser.settings) {
    settings = currentUser.settings;
  } else {
    // Load from localStorage
    const savedSettings = localStorage.getItem('chessSettings');
    if (savedSettings) {
      settings = JSON.parse(savedSettings);
    }
  }

  if (!settings) {
    // Use default settings
    settings = {
      theme: 'dark',
      boardTheme: 'classic',
      chessBoardTheme: 'classic',
      chessPieceTheme: 'classic',
      soundEnabled: true,
      moveHints: true,
      autoPromote: false,
      showCoordinates: false,
      showBanAfterLogin: false
    };
  }

  // Apply settings
  applySettings(settings);
}

// Apply Settings
function applySettings(settings) {
  // Apply theme
  if (settings.theme) {
    document.documentElement.setAttribute('data-theme', settings.theme);
    localStorage.setItem('theme', settings.theme);

    // Update theme buttons
    const themeBtns = document.querySelectorAll('.theme-btn');
    themeBtns.forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.theme === settings.theme) {
        btn.classList.add('active');
      }
    });

    // Apply to body
    document.body.classList.remove('light-theme');
    if (settings.theme === 'light') {
      document.body.classList.add('light-theme');
    }
  }

  // Apply board theme
  if (settings.boardTheme) {
    localStorage.setItem('boardTheme', settings.boardTheme);

    // Update board theme options
    const boardThemeOptions = document.querySelectorAll('.theme-option[data-theme]');
    boardThemeOptions.forEach(option => {
      option.classList.remove('selected');
      if (option.dataset.theme === settings.boardTheme) {
        option.classList.add('selected');
      }
    });

    // Apply to document
    document.documentElement.style.setProperty('--board-theme', settings.boardTheme);
  }

  // Apply chess board theme (from script.js)
  if (settings.chessBoardTheme) {
    localStorage.setItem('chessBoardTheme', settings.chessBoardTheme);
    localStorage.setItem('boardTheme', settings.chessBoardTheme);
    if (typeof window.currentBoardTheme !== 'undefined') {
      window.currentBoardTheme = settings.chessBoardTheme;
    }
    if (typeof window.boardElement !== 'undefined') {
      window.boardElement.className = `chessboard board-${settings.chessBoardTheme}`;
    }
    if (typeof window.applyThemes === 'function') {
      window.applyThemes();
    }
  }

  // Apply chess piece theme (from script.js)
  if (settings.chessPieceTheme) {
    localStorage.setItem('chessPieceTheme', settings.chessPieceTheme);
    if (typeof window.currentPieceTheme !== 'undefined') {
      window.currentPieceTheme = settings.chessPieceTheme;
    }
    if (typeof window.applyThemes === 'function') {
      window.applyThemes();
    }
  }

  // Apply sound setting
  if (typeof settings.soundEnabled === 'boolean') {
    localStorage.setItem('soundEnabled', settings.soundEnabled);
    window.soundEnabled = settings.soundEnabled;
  }

  // Apply move hints setting
  if (typeof settings.moveHints === 'boolean') {
    localStorage.setItem('moveHints', settings.moveHints);
    window.showMoveHints = settings.moveHints;
  }

  // Apply auto-promote setting
  if (typeof settings.autoPromote === 'boolean') {
    localStorage.setItem('autoPromote', settings.autoPromote);
    window.autoPromote = settings.autoPromote;
  }

  // Apply show coordinates setting
  if (typeof settings.showCoordinates === 'boolean') {
    localStorage.setItem('showCoordinates', settings.showCoordinates);
    window.showCoordinates = settings.showCoordinates;
  }

  // Apply show ban after login setting
  if (typeof settings.showBanAfterLogin === 'boolean') {
    localStorage.setItem('showBanAfterLogin', settings.showBanAfterLogin.toString());
  }
}

// Track Initial Settings
function trackInitialSettings() {
  initialSettings = {
    theme: localStorage.getItem('theme') || 'dark',
    boardTheme: localStorage.getItem('boardTheme') || 'classic',
    chessBoardTheme: localStorage.getItem('chessBoardTheme') || 'classic',
    chessPieceTheme: localStorage.getItem('chessPieceTheme') || 'classic',
    soundEnabled: localStorage.getItem('soundEnabled') !== 'false',
    moveHints: localStorage.getItem('moveHints') !== 'false',
    autoPromote: localStorage.getItem('autoPromote') !== 'false',
    showCoordinates: localStorage.getItem('showCoordinates') !== 'false',
    showBanAfterLogin: localStorage.getItem('showBanAfterLogin') === 'true'
  };
  hasUnsavedChanges = false;
}

// Check for Unsaved Changes
function checkUnsavedChanges() {
  // Get current settings
  const currentSettings = {
    theme: localStorage.getItem('theme') || 'dark',
    boardTheme: localStorage.getItem('boardTheme') || 'classic',
    chessBoardTheme: localStorage.getItem('chessBoardTheme') || 'classic',
    chessPieceTheme: localStorage.getItem('chessPieceTheme') || 'classic',
    soundEnabled: localStorage.getItem('soundEnabled') !== 'false',
    moveHints: localStorage.getItem('moveHints') !== 'false',
    autoPromote: localStorage.getItem('autoPromote') !== 'false',
    showCoordinates: localStorage.getItem('showCoordinates') !== 'false',
    showBanAfterLogin: localStorage.getItem('showBanAfterLogin') === 'true'
  };

  // Check if any settings have changed
  const hasChanges = JSON.stringify(currentSettings) !== JSON.stringify(initialSettings);

  if (hasChanges) {
    showUnsavedChangesDialog();
  } else {
    // No changes, go back to game
    window.location.href = 'index.html';
  }
}

// Show Unsaved Changes Dialog
function showUnsavedChangesDialog() {
  // Create dialog overlay
  const dialog = document.createElement('div');
  dialog.className = 'unsaved-changes-dialog';
  dialog.innerHTML = `
    <div class="unsaved-changes-content">
      <h2>⚠️ Unsaved Changes</h2>
      <p>You have unsaved changes. Are you sure you want to continue without saving?</p>
      <div class="unsaved-changes-buttons">
        <button class="unsaved-changes-btn cancel" id="unsaved-cancel">Go Back</button>
        <button class="unsaved-changes-btn save" id="unsaved-save">Save & Continue</button>
        <button class="unsaved-changes-btn discard" id="unsaved-discard">Continue Without Saving</button>
      </div>
    </div>
  `;

  // Add dialog to page
  document.body.appendChild(dialog);

  // Add event listeners
  document.getElementById('unsaved-cancel').addEventListener('click', () => {
    dialog.remove();
  });

  document.getElementById('unsaved-save').addEventListener('click', () => {
    saveSettings();
    dialog.remove();
    window.location.href = 'index.html';
  });

  document.getElementById('unsaved-discard').addEventListener('click', () => {
    dialog.remove();
    window.location.href = 'index.html';
  });
}

// Add CSS for dialog
const dialogStyle = document.createElement('style');
dialogStyle.textContent = `
  .unsaved-changes-dialog {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
  }

  .unsaved-changes-content {
    background: var(--bg-color, #1a1a2e);
    color: var(--text-color, #eee);
    padding: 30px;
    border-radius: 12px;
    max-width: 450px;
    width: 90%;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    text-align: center;
  }

  .unsaved-changes-content h2 {
    margin: 0 0 15px 0;
    font-size: 24px;
    color: #ff9800;
  }

  .unsaved-changes-content p {
    margin: 0 0 25px 0;
    font-size: 16px;
    line-height: 1.5;
  }

  .unsaved-changes-buttons {
    display: flex;
    gap: 10px;
    justify-content: center;
    flex-wrap: wrap;
  }

  .unsaved-changes-btn {
    padding: 12px 20px;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    flex: 1;
    min-width: 120px;
  }

  .unsaved-changes-btn.cancel {
    background: #4a4a4a;
    color: #fff;
  }

  .unsaved-changes-btn.cancel:hover {
    background: #5a5a5a;
  }

  .unsaved-changes-btn.save {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: #fff;
  }

  .unsaved-changes-btn.save:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  }

  .unsaved-changes-btn.discard {
    background: #f44336;
    color: #fff;
  }

  .unsaved-changes-btn.discard:hover {
    background: #d32f2f;
  }
`;
document.head.appendChild(dialogStyle);
