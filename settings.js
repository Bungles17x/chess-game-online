// Settings Page JavaScript

// Initialize secureStorage if not available
if (typeof secureStorage === 'undefined') {
  window.secureStorage = {
    getItem: function(key) {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
      } catch (e) {
        console.error('Error reading from secureStorage:', e);
        return null;
      }
    },
    setItem: function(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (e) {
        console.error('Error writing to secureStorage:', e);
        return false;
      }
    },
    removeItem: function(key) {
      try {
        localStorage.removeItem(key);
        return true;
      } catch (e) {
        console.error('Error removing from secureStorage:', e);
        return false;
      }
    }
  };
}

// DOM Elements
const backToGameBtn = document.getElementById('back-to-game-btn');

// Track unsaved changes
let hasUnsavedChanges = false;
let initialSettings = {};
let isSyncing = false; // Flag to prevent unsaved changes check during sync
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
  // Initialize achievements system first
  if (window.achievementsSystem && typeof window.achievementsSystem.initialize === 'function') {
    window.achievementsSystem.initialize();
  }
  
  setupEventListeners();
  checkLoginStatus();
  setupThemeSelection();
  setupAvatarSelection();
  setupAchievementsDisplay();

  // Don't call updateSyncStatus on initial load to prevent refresh
  // updateSyncStatus();

  loadSavedGames();
  loadSettings();
  trackInitialSettings();

  // Disable automatic sync to prevent refresh
  if (window.userSyncManager) {
    window.userSyncManager.disableSync();
  }
});

// Setup Event Listeners
function setupEventListeners() {
  // Back to Game button
  if (backToGameBtn) {
    backToGameBtn.addEventListener('click', () => {
      // Directly go back to game without checking for unsaved changes
      window.location.href = 'index.html';
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

  // Coordinates toggle
  const coordinatesToggle = document.getElementById('show-coordinates-toggle');
  if (coordinatesToggle) {
    coordinatesToggle.addEventListener('change', (e) => {
      localStorage.setItem('showCoordinates', e.target.checked);
      window.showCoordinates = e.target.checked;
      hasUnsavedChanges = true;
    });
  }

  // Screen reader toggle
  const screenReaderToggle = document.getElementById('screen-reader-toggle');
  if (screenReaderToggle) {
    screenReaderToggle.addEventListener('change', (e) => {
      localStorage.setItem('screenReaderMode', e.target.checked);
      window.screenReaderMode = e.target.checked;
      hasUnsavedChanges = true;

      // Announce the change to screen readers
      if (window.announce) {
        const status = e.target.checked ? 'enabled' : 'disabled';
        window.announce(`Screen reader mode ${status}`);
      }
    });
  }

  // Listen for login/logout events
  window.addEventListener('userLoggedIn', () => {
    console.log('[Settings Debug] userLoggedIn event received, isSyncing:', isSyncing);
    // Don't update UI if syncing to prevent refresh
    if (!isSyncing) {
      console.log('[Settings Debug] Calling checkLoginStatus()');
      checkLoginStatus();
    } else {
      console.log('[Settings Debug] Skipping checkLoginStatus() because syncing');
    }
  });

  window.addEventListener('userLoggedOut', () => {
    checkLoginStatus();
  });

  // Listen for sync events
  // Disabled to prevent automatic refresh
  // window.addEventListener('profileUpdated', () => {
  //   updateSyncStatus();
  // });

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

  try {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    // Validate inputs
    if (!email || !password) {
      showNotification('Please enter email and password');
      return;
    }

    // Check if WebSocket is connected
    if (!window.socket || window.socket.readyState !== WebSocket.OPEN) {
      showNotification('Not connected to server. Please check your connection.');
      return;
    }

    // Send login request to server
    window.socket.send(JSON.stringify({
      type: 'login',
      email: email,
      password: password
    }));

    // Listen for login response
    const handleLoginResponse = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'loginSuccess') {
        // Use user data from server response
        const user = data.userData || {
          username: data.username,
          email: email
        };
        
        // Set current user
        localStorage.setItem('currentUser', JSON.stringify(user));
        
        // Dispatch login event
        window.dispatchEvent(new CustomEvent('userLoggedIn', { detail: user }));
        
        // Show notification
        showNotification('Logged in successfully');
        
        // Update UI
        checkLoginStatus();
      } else if (data.type === 'error') {
        showNotification(data.message || 'Login failed');
      }
      
      // Remove the event listener
      window.socket.removeEventListener('message', handleLoginResponse);
    };

    window.socket.addEventListener('message', handleLoginResponse);
    
    // Timeout after 10 seconds
    setTimeout(() => {
      window.socket.removeEventListener('message', handleLoginResponse);
    }, 10000);
  } catch (error) {
    console.error('Login error:', error);
    showNotification('An error occurred during login. Please try again.');
  }
}

// Handle Register
function handleRegister(e) {
  e.preventDefault();

  try {
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
  const users = secureStorage.getItem('chessUsers') || [];

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
  secureStorage.setItem('chessUsers', users);
  localStorage.setItem('currentUser', JSON.stringify(newUser));

  // Dispatch login event
  window.dispatchEvent(new CustomEvent('userLoggedIn', { detail: newUser }));

  // Show notification
  showNotification('Registered successfully');

  // Update UI
  checkLoginStatus();
  } catch (error) {
    console.error('Registration error:', error);
    showNotification('An error occurred during registration. Please try again.');
  }
}

// Check Login Status
function checkLoginStatus() {
  console.log('[Settings Debug] checkLoginStatus() called');
  const currentUser = localStorage.getItem('currentUser');
  console.log('[Settings Debug] currentUser:', currentUser ? 'exists' : 'null');

  if (currentUser) {
    console.log('[Settings Debug] User is logged in, updating UI');
    // User is logged in
    loginFormContainer.classList.add('hidden');
    registerFormContainer.classList.add('hidden');
    profileDisplay.classList.remove('hidden');
    profileSettings.classList.remove('hidden');
    profileLoginPrompt.classList.add('hidden');

    // Load profile data
    console.log('[Settings Debug] Calling loadProfileData()');
    loadProfileData();
    
    // Load saved games
    loadSavedGames();
    
    // Load achievements
    if (typeof loadAchievements === 'function') {
      loadAchievements();
    }

    // Update sync status when user logs in
    updateSyncStatus();
  } else {
    // User is not logged in
    loginFormContainer.classList.remove('hidden');
    registerFormContainer.classList.add('hidden');
    profileDisplay.classList.add('hidden');
    profileSettings.classList.add('hidden');
    profileLoginPrompt.classList.remove('hidden');
    
    // Hide achievements when logged out
    const achievementsContent = document.getElementById('achievements-content');
    const achievementsLoginPrompt = document.getElementById('achievements-login-prompt');
    if (achievementsContent) achievementsContent.classList.add('hidden');
    if (achievementsLoginPrompt) achievementsLoginPrompt.classList.remove('hidden');
  }
}

// Load Profile Data
function loadProfileData() {
  console.log('[Settings Debug] loadProfileData() called');
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
  console.log('[Settings Debug] currentUser:', currentUser);
  if (!currentUser) {
    console.log('[Settings Debug] No currentUser found, returning');
    return;
  }

  // Update display
  const playerName = document.getElementById('player-name');
  const usernameDisplay = document.getElementById('username-display');
  const playerLevel = document.getElementById('player-level');
  const currentAvatar = document.getElementById('current-avatar');

  if (playerName) playerName.textContent = currentUser.username || 'Player';
  if (usernameDisplay) usernameDisplay.textContent = '@' + (currentUser.username || 'player');
  if (playerLevel) playerLevel.textContent = currentUser.level || 1;
  if (currentAvatar) currentAvatar.textContent = currentUser.avatar || '♟';

  // Update XP progress bar
  const xpProgressFill = document.getElementById('xp-progress-fill');
  const xpText = document.getElementById('xp-text');
  if (xpProgressFill && xpText) {
    const level = currentUser.level || 1;
    const totalXP = currentUser.xp || 0;
    // XP is stored as total cumulative XP
    const xpForCurrentLevel = (level - 1) * 1000;
    const xpInCurrentLevel = totalXP - xpForCurrentLevel;
    const xpNeededForNext = 1000;
    const progressPercentage = Math.min((xpInCurrentLevel / xpNeededForNext) * 100, 100);

    console.log('[XP Progress] Level:', level, 'Total XP:', totalXP, 'XP in current level:', xpInCurrentLevel, 'XP needed:', xpNeededForNext, 'Progress:', progressPercentage + '%');

    // Update progress bar width
    xpProgressFill.style.width = `${progressPercentage}%`;

    // Update XP text
    xpText.textContent = `${xpInCurrentLevel} / ${xpNeededForNext} XP`;
  }

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
  const users = secureStorage.getItem('chessUsers') || [];
  const userIndex = users.findIndex(u => u.id === currentUser.id);
  if (userIndex !== -1) {
    users[userIndex] = currentUser;
    secureStorage.setItem('chessUsers', users);
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
  const users = secureStorage.getItem('chessUsers') || [];
  const userIndex = users.findIndex(u => u.id === currentUser.id);
  if (userIndex !== -1) {
    users[userIndex] = currentUser;
    secureStorage.setItem('chessUsers', users);
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
  console.log('[Settings Sync] Sync button clicked');

  if (!window.userSyncManager) {
    console.error('[Settings Sync] userSyncManager not available');
    showNotification('Sync not available');
    return;
  }

  console.log('[Settings Sync Debug] WebSocket status:', {
    socketExists: !!window.socket,
    readyState: window.socket ? window.socket.readyState : 'No socket',
    readyStateText: window.socket ? 
      (window.socket.readyState === 0 ? 'CONNECTING' :
       window.socket.readyState === 1 ? 'OPEN' :
       window.socket.readyState === 2 ? 'CLOSING' :
       window.socket.readyState === 3 ? 'CLOSED' : 'UNKNOWN') : 'No socket'
  });

  // Check if already syncing
  if (isSyncing) {
    console.log('[Settings Sync] Already syncing, ignoring click');
    return;
  }

  // Check if WebSocket is connected
  if (!window.socket || window.socket.readyState !== WebSocket.OPEN) {
    console.error('[Settings Sync] WebSocket not connected');
    showNotification('Not connected to server. Cannot sync.');
    return;
  }

  console.log('[Settings Sync] Starting sync...');
  syncNowBtn.disabled = true;
  syncNowBtn.textContent = 'Syncing...';
  if (syncStatus) {
    syncStatus.textContent = 'Syncing...';
    syncStatus.style.color = 'var(--warning)';
  }
  isSyncing = true; // Set syncing flag

  // Listen for sync completion
  const handleSyncComplete = (event) => {
    console.log('[Settings Sync Debug] Sync complete event received:', event.detail);
    console.log('[Settings Sync Debug] isSyncing before handling:', isSyncing);
    const data = event.detail;
    if (data && data.success) {
      console.log('[Settings Sync Debug] Sync successful');

      // Store last sync time in localStorage (persists after refresh)
      localStorage.setItem('lastSyncTime', Date.now().toString());
      console.log('[Settings Sync Debug] Last sync time saved to localStorage');

      syncNowBtn.disabled = false;
      syncNowBtn.textContent = 'Sync Now';

      // Update sync status display
      if (syncStatus) {
        syncStatus.textContent = 'Synced';
        syncStatus.style.color = 'var(--success)';
      }
      if (lastSyncTime) {
        const date = new Date();
        lastSyncTime.textContent = date.toLocaleString();
      }

      console.log('[Settings Sync Debug] Calling showNotification()');
      showNotification('Profile synced successfully');
      console.log('[Settings Sync Debug] Notification shown');

      window.removeEventListener('syncComplete', handleSyncComplete);
      isSyncing = false; // Clear syncing flag
      console.log('[Settings Sync Debug] isSyncing after handling:', isSyncing);
      console.log('[Settings Sync Debug] Sync complete handler finished');
    }
  };

  // Remove any existing syncComplete listeners to prevent duplicates
  window.removeEventListener('syncComplete', handleSyncComplete);
  window.addEventListener('syncComplete', handleSyncComplete, { once: true });

  // Trigger sync
  console.log('[Settings Sync] Calling syncAllData()');
  window.userSyncManager.syncAllData();

  // Timeout after 10 seconds
  setTimeout(() => {
    if (syncNowBtn.disabled) {
      console.error('[Settings Sync] Sync timed out');
      syncNowBtn.disabled = false;
      syncNowBtn.textContent = 'Sync Now';
      // Reset sync status display
      if (syncStatus) {
        syncStatus.textContent = 'Sync failed';
        syncStatus.style.color = 'var(--error)';
      }
      window.removeEventListener('syncComplete', handleSyncComplete);
      isSyncing = false; // Clear syncing flag on timeout
      showNotification('Sync timed out. Please try again.');
    }
  }, 10000);
}

// Update Sync Status
function updateSyncStatus() {
  if (!window.userSyncManager) return;

  // Get last sync time from localStorage first (persists after refresh)
  let lastSync = parseInt(localStorage.getItem('lastSyncTime') || '0');

  // Also check userSyncManager if available
  if (window.userSyncManager.lastSyncTime > lastSync) {
    lastSync = window.userSyncManager.lastSyncTime;
    localStorage.setItem('lastSyncTime', lastSync.toString());
  }

  if (lastSync > 0) {
    const date = new Date(lastSync);
    if (lastSyncTime) lastSyncTime.textContent = date.toLocaleString();
    if (syncStatus) {
      syncStatus.textContent = 'Synced';
      syncStatus.style.color = 'var(--success)';
    }
  } else {
    if (lastSyncTime) lastSyncTime.textContent = 'Never';
    if (syncStatus) {
      syncStatus.textContent = 'Not synced';
      syncStatus.style.color = 'var(--text-muted)';
    }
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
    const users = secureStorage.getItem('chessUsers') || [];
    const userIndex = users.findIndex(u => u.id === currentUser.id);
    if (userIndex !== -1) {
      users[userIndex] = currentUser;
      secureStorage.setItem('chessUsers', users);
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

  // Reset unsaved changes flag
  hasUnsavedChanges = false;
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
      showBanAfterLogin: false,
      screenReaderMode: false
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
    
    // Update the checkbox in settings
    const coordinatesToggle = document.getElementById('show-coordinates-toggle');
    if (coordinatesToggle) {
      coordinatesToggle.checked = settings.showCoordinates;
    }
  }

  // Apply show ban after login setting
  if (typeof settings.showBanAfterLogin === 'boolean') {
    localStorage.setItem('showBanAfterLogin', settings.showBanAfterLogin.toString());
  }

  // Apply screen reader mode setting
  if (typeof settings.screenReaderMode === 'boolean') {
    localStorage.setItem('screenReaderMode', settings.screenReaderMode);
    window.screenReaderMode = settings.screenReaderMode;

    // Update the checkbox in settings
    const screenReaderToggle = document.getElementById('screen-reader-toggle');
    if (screenReaderToggle) {
      screenReaderToggle.checked = settings.screenReaderMode;
    }

    // Apply screen reader mode to the game
    if (typeof window.applyScreenReaderMode === 'function') {
      window.applyScreenReaderMode(settings.screenReaderMode);
    }
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
    showBanAfterLogin: localStorage.getItem('showBanAfterLogin') === 'true',
    screenReaderMode: localStorage.getItem('screenReaderMode') === 'true'
  };
  // Don't reset hasUnsavedChanges flag here - it should only be set by user actions
}

// Check for Unsaved Changes
function checkUnsavedChanges() {
  // If syncing, don't check for unsaved changes
  if (isSyncing) {
    console.log('[Settings] Skipping unsaved changes check during sync');
    return;
  }

  // Only check for unsaved changes if the flag is set
  if (!hasUnsavedChanges) {
    console.log('[Settings] No unsaved changes, going back to game');
    window.location.href = 'index.html';
    return;
  }

  // Show unsaved changes dialog
  showUnsavedChangesDialog();
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

// Achievements Display Functions
function setupAchievementsDisplay() {
  // Get DOM elements
  const achievementsContent = document.getElementById('achievements-content');
  const achievementsLoginPrompt = document.getElementById('achievements-login-prompt');
  const achievementsGrid = document.getElementById('settings-achievements-grid');
  const categoryButtons = document.querySelectorAll('.achievement-category-btn');
  
  // Check if achievements system is available
  if (!window.achievementsSystem) {
    console.warn('Achievements system not available');
    return;
  }

  // Initialize the achievements system if not already initialized
  if (typeof window.achievementsSystem.initialize === 'function') {
    window.achievementsSystem.initialize();
  }
  
  // Load achievements when user logs in
  window.addEventListener('userLoggedIn', () => {
    loadAchievements();
  });
  
  // Hide achievements when user logs out
  window.addEventListener('userLoggedOut', () => {
    if (achievementsContent) achievementsContent.classList.add('hidden');
    if (achievementsLoginPrompt) achievementsLoginPrompt.classList.remove('hidden');
  });
  
  // Setup category filter buttons
  categoryButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Remove active class from all buttons
      categoryButtons.forEach(btn => btn.classList.remove('active'));
      // Add active class to clicked button
      button.classList.add('active');
      // Filter achievements by category
      const category = button.dataset.category;
      filterAchievements(category);
    });
  });
  
  // Check login status on initial load
  checkLoginStatus();
}

function loadAchievements() {
  try {
    const achievementsContent = document.getElementById('achievements-content');
    const achievementsLoginPrompt = document.getElementById('achievements-login-prompt');
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    
    // Check if user is logged in
    if (!currentUser || !currentUser.username) {
      if (achievementsContent) achievementsContent.classList.add('hidden');
      if (achievementsLoginPrompt) achievementsLoginPrompt.classList.remove('hidden');
      return;
    }
    
    // Show achievements content
    if (achievementsContent) achievementsContent.classList.remove('hidden');
    if (achievementsLoginPrompt) achievementsLoginPrompt.classList.add('hidden');
    
    // Check for rewards
    if (window.achievementsSystem && typeof window.achievementsSystem.checkRewards === 'function') {
      window.achievementsSystem.checkRewards();
    }
    
    // Update XP progress
    updateXPProgress();
    
    // Update achievements stats
    updateAchievementsStats();
    
    // Render all achievements
    renderAchievements();
    
    // Render rewards
    renderRewards();
  } catch (error) {
    console.error('[Settings] Error loading achievements:', error);
  }
}

function updateXPProgress() {
  // Get the current user data
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
  if (!currentUser) {
    console.warn('[XP Progress] No current user found');
    return;
  }

  const totalXP = currentUser.xp || 0;
  const currentLevel = currentUser.level || 1;
  const xpForCurrentLevel = (currentLevel - 1) * 1000;
  const xpForNextLevel = currentLevel * 1000;
  const xpInCurrentLevel = totalXP - xpForCurrentLevel;
  const xpNeeded = 1000;
  const progress = Math.min((xpInCurrentLevel / xpNeeded) * 100, 100);
  
  // Update DOM elements
  const totalXPElement = document.getElementById('settings-total-xp');
  const currentLevelElement = document.getElementById('settings-current-level');
  const xpToNextElement = document.getElementById('settings-xp-to-next');
  const xpBarElement = document.getElementById('settings-xp-bar');
  
  if (totalXPElement) totalXPElement.textContent = totalXP;
  if (currentLevelElement) currentLevelElement.textContent = `Level ${currentLevel}`;
  if (xpToNextElement) xpToNextElement.textContent = `${xpInCurrentLevel} / ${xpNeeded} XP`;
  if (xpBarElement) xpBarElement.style.width = `${progress}%`;
}

function calculateLevel(xp) {
  // Simple level calculation: level = floor(xp / 1000) + 1
  return Math.floor(xp / 1000) + 1;
}

function getXPForLevel(level) {
  // XP required for each level: level * 1000
  return (level - 1) * 1000;
}

function updateAchievementsStats() {
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
}

function renderAchievements(category = 'all') {
  const achievementsGrid = document.getElementById('settings-achievements-grid');
  if (!achievementsGrid || !window.achievementsSystem) return;
  
  // Get achievements based on category
  let achievements;
  if (category === 'all') {
    achievements = Object.values(window.achievementsSystem.achievements);
  } else {
    achievements = window.achievementsSystem.getAchievementsByCategory(category);
  }
  
  // Clear grid
  achievementsGrid.innerHTML = '';
  
  // Render each achievement
  achievements.forEach(achievement => {
    const card = createAchievementCard(achievement);
    achievementsGrid.appendChild(card);
  });
}

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
        <div class="achievement-card-progress-bar" style="width: ${progressPercentage}%"></div>
      </div>
      <div class="achievement-card-xp">Progress: ${progress} / ${target} | +${achievement.xp} XP</div>
    `;
  } else {
    progressHTML = `<div class="achievement-card-xp">+${achievement.xp} XP</div>`;
  }
  
  card.innerHTML = `
    <div class="achievement-card-icon">${achievement.icon}</div>
    <div class="achievement-card-content">
      <div class="achievement-card-title">${achievement.name}</div>
      <div class="achievement-card-description">${achievement.description}</div>
      ${progressHTML}
    </div>
  `;
  
  return card;
}

function filterAchievements(category) {
  renderAchievements(category);
}

function renderRewards() {
  try {
    const rewardsGrid = document.getElementById('settings-rewards-grid');
    if (!rewardsGrid || !window.achievementsSystem) {
      console.warn('[Settings] Rewards grid or achievements system not available');
      return;
    }
    
    // Get player stats
    const totalXP = parseInt(localStorage.getItem('playerXP') || '0');
    const level = Math.floor(totalXP / 1000) + 1;
    const unlockedAchievements = window.achievementsSystem.getUnlockedAchievements();
    const winStreak = parseInt(localStorage.getItem('currentWinStreak') || '0');
    
    console.log('[Settings] Rendering rewards - Level:', level, 'Achievements:', unlockedAchievements.length, 'Streak:', winStreak);
    
    // Get all rewards
    const rewards = Object.values(window.achievementsSystem.rewards);
    
    // Filter rewards to show only those that are either unlocked or can be unlocked soon
    const availableRewards = rewards.filter(reward => {
      if (reward.unlocked) return true;
      
      // Check if reward is close to being unlocked
      let shouldShow = false;
      switch(reward.id) {
        case 'level_5':
          shouldShow = level >= 3; // Show at level 3+
          break;
        case 'level_10':
          shouldShow = level >= 7; // Show at level 7+
          break;
        case 'level_25':
          shouldShow = level >= 20; // Show at level 20+
          break;
        case 'level_50':
          shouldShow = level >= 40; // Show at level 40+
          break;
        case 'achievements_5':
          shouldShow = unlockedAchievements.length >= 3; // Show with 3+ achievements
          break;
        case 'achievements_10':
          shouldShow = unlockedAchievements.length >= 7; // Show with 7+ achievements
          break;
        case 'achievements_25':
          shouldShow = unlockedAchievements.length >= 20; // Show with 20+ achievements
          break;
        case 'streak_5':
          shouldShow = winStreak >= 3; // Show with 3+ win streak
          break;
        case 'streak_10':
          shouldShow = winStreak >= 7; // Show with 7+ win streak
          break;
        case 'perfect_game_reward':
          shouldShow = window.achievementsSystem.achievements.perfectGame && window.achievementsSystem.achievements.perfectGame.unlocked;
          break;
        case 'quick_win_reward':
          shouldShow = window.achievementsSystem.achievements.perfectGame && window.achievementsSystem.achievements.perfectGame.unlocked;
          break;
        case 'scholar_reward':
          shouldShow = window.achievementsSystem.achievements.comeback && window.achievementsSystem.achievements.comeback.unlocked;
          break;
        case 'queen_gambit_reward':
          shouldShow = window.achievementsSystem.achievements.comeback && window.achievementsSystem.achievements.comeback.unlocked;
          break;
        case 'comeback_king_reward':
          shouldShow = window.achievementsSystem.achievements.comeback && window.achievementsSystem.achievements.comeback.unlocked;
          break;
        default:
          shouldShow = false;
          break;
      }
      return shouldShow;
    });
    
    console.log('[Settings] Available rewards:', availableRewards.length);
    
    // Clear grid
    rewardsGrid.innerHTML = '';
    
    // Render each available reward
    availableRewards.forEach(reward => {
      const card = createRewardCard(reward);
      rewardsGrid.appendChild(card);
    });
    
    // Show message if no rewards available
    if (availableRewards.length === 0) {
      rewardsGrid.innerHTML = '<p class="no-rewards-message">Play more games to unlock rewards!</p>';
    }
  } catch (error) {
    console.error('[Settings] Error rendering rewards:', error);
  }
}

function createRewardCard(reward) {
  const card = document.createElement('div');
  card.className = `reward-card ${reward.unlocked ? 'unlocked' : 'locked'}`;
  
  card.innerHTML = `
    <div class="reward-card-icon">${reward.icon}</div>
    <div class="reward-card-content">
      <div class="reward-card-title">${reward.name}</div>
      <div class="reward-card-description">${reward.description}</div>
      <div class="reward-card-requirement">${reward.requirement}</div>
      <div class="reward-card-status">${reward.unlocked ? 'Unlocked' : 'Locked'}</div>
    </div>
  `;
  
  return card;
}
document.head.appendChild(dialogStyle);
