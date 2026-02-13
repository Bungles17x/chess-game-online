// Settings Page JavaScript - Enhanced Version
// Improved settings management with better validation and error handling

// Load encryption utility
const encryptionScript = document.createElement('script');
encryptionScript.src = 'encryption.js';
document.head.appendChild(encryptionScript);

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

// Settings State
const settingsState = {
  showCoordinates: false,
  soundEnabled: true,
  notificationsEnabled: true,
  theme: 'dark',
  avatar: '♟',
  autoSave: true
};

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
  initializeValidation();
});

// Initialize form validation
function initializeValidation() {
  // Add input validation for all forms
  const forms = document.querySelectorAll('form');
  forms.forEach(form => {
    form.addEventListener('submit', (e) => {
      if (!form.checkValidity()) {
        e.preventDefault();
        e.stopPropagation();
        showNotification('Please fill in all required fields correctly', 'error');
      }
      form.classList.add('was-validated');
    });
  });
}

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

  // Coordinates toggle
  const coordinatesToggle = document.getElementById('show-coordinates-toggle');
  if (coordinatesToggle) {
    coordinatesToggle.addEventListener('change', (e) => {
      settingsState.showCoordinates = e.target.checked;
      localStorage.setItem('showCoordinates', e.target.checked);
      window.showCoordinates = e.target.checked;
      hasUnsavedChanges = true;
      updateSaveButtonState();
    });
  }

  // Sound toggle
  const soundToggle = document.getElementById('sound-toggle');
  if (soundToggle) {
    soundToggle.addEventListener('change', (e) => {
      settingsState.soundEnabled = e.target.checked;
      localStorage.setItem('soundEnabled', e.target.checked);
      window.soundEnabled = e.target.checked;
      hasUnsavedChanges = true;
      updateSaveButtonState();
    });
  }

  // Notifications toggle
  const notificationsToggle = document.getElementById('notifications-toggle');
  if (notificationsToggle) {
    notificationsToggle.addEventListener('change', (e) => {
      settingsState.notificationsEnabled = e.target.checked;
      localStorage.setItem('notificationsEnabled', e.target.checked);
      window.notificationsEnabled = e.target.checked;
      hasUnsavedChanges = true;
      updateSaveButtonState();
    });
  }

  // Auto-save toggle
  const autoSaveToggle = document.getElementById('auto-save-toggle');
  if (autoSaveToggle) {
    autoSaveToggle.addEventListener('change', (e) => {
      settingsState.autoSave = e.target.checked;
      localStorage.setItem('autoSave', e.target.checked);
      window.autoSave = e.target.checked;
      hasUnsavedChanges = true;
      updateSaveButtonState();
    });
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

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + S to save settings
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      if (hasUnsavedChanges) {
        saveSettings();
      }
    }
  });
}

// Update save button state
function updateSaveButtonState() {
  if (saveSettingsBtn) {
    if (hasUnsavedChanges) {
      saveSettingsBtn.disabled = false;
      saveSettingsBtn.classList.add('has-changes');
    } else {
      saveSettingsBtn.disabled = true;
      saveSettingsBtn.classList.remove('has-changes');
    }
  }
}

// Handle Login
function handleLogin(e) {
  e.preventDefault();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  // Validate inputs
  if (!email) {
    showNotification('Please enter your email or username', 'warning');
    return;
  }

  if (!password) {
    showNotification('Please enter your password', 'warning');
    return;
  }

  // Validate email format if @ is present
  if (email.includes('@') && !validateEmail(email)) {
    showNotification('Please enter a valid email address', 'warning');
    return;
  }

  // Get users from localStorage
  const users = secureStorage.getItem('chessUsers') || [];

  // Find user by email or username
  const user = users.find(u => u.email === email || u.username === email);

  if (!user) {
    showNotification('User not found', 'error');
    return;
  }

  if (user.password !== password) {
    showNotification('Incorrect password', 'error');
    return;
  }

  // Check if user is banned
  if (user.username.toLowerCase() !== 'bungles17x') {
    const banData = localStorage.getItem('botModeBan');
    if (banData) {
      const ban = JSON.parse(banData);
      if (ban.username === user.username) {
        let isBanned = false;
        if (!ban.duration) {
          isBanned = true;
        } else {
          let expiryTime;
          if (ban.unit === 'hours') {
            expiryTime = ban.timestamp + (ban.duration * 60 * 60 * 1000);
          } else {
            expiryTime = ban.timestamp + (ban.duration * 24 * 60 * 60 * 1000);
          }
          isBanned = Date.now() <= expiryTime;
        }

        if (isBanned) {
          showNotification('This account is banned', 'error');
          return;
        }
      }
    }
  }

  // Set current user
  localStorage.setItem('currentUser', JSON.stringify(user));

  // Dispatch login event
  window.dispatchEvent(new CustomEvent('userLoggedIn', { detail: user }));

  // Show notification
  showNotification('Logged in successfully', 'success');

  // Update UI
  checkLoginStatus();
}

// Handle Register
function handleRegister(e) {
  e.preventDefault();

  const username = document.getElementById('username').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirm-password').value;
  const terms = document.getElementById('terms').checked;

  // Validate inputs
  if (!username) {
    showNotification('Please enter a username', 'warning');
    return;
  }

  if (username.length < 3) {
    showNotification('Username must be at least 3 characters', 'warning');
    return;
  }

  if (!email) {
    showNotification('Please enter your email address', 'warning');
    return;
  }

  if (!validateEmail(email)) {
    showNotification('Please enter a valid email address', 'warning');
    return;
  }

  if (!password) {
    showNotification('Please enter a password', 'warning');
    return;
  }

  if (password.length < 8) {
    showNotification('Password must be at least 8 characters', 'warning');
    return;
  }

  if (!confirmPassword) {
    showNotification('Please confirm your password', 'warning');
    return;
  }

  if (password !== confirmPassword) {
    showNotification('Passwords do not match', 'warning');
    return;
  }

  if (!terms) {
    showNotification('You must agree to the Terms of Service', 'warning');
    return;
  }

  // Get existing users
  const users = secureStorage.getItem('chessUsers') || [];

  // Check if user already exists
  if (users.find(u => u.email === email)) {
    showNotification('An account with this email already exists', 'error');
    return;
  }

  if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
    showNotification('This username is already taken', 'error');
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
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString()
  };

  users.push(newUser);
  secureStorage.setItem('chessUsers', users);

  // Set current user
  localStorage.setItem('currentUser', JSON.stringify(newUser));

  // Dispatch login event
  window.dispatchEvent(new CustomEvent('userLoggedIn', { detail: newUser }));

  // Show notification
  showNotification('Account created successfully', 'success');

  // Update UI
  checkLoginStatus();
}

// Handle Logout
function handleLogout() {
  if (confirm('Are you sure you want to logout?')) {
    localStorage.removeItem('currentUser');
    window.dispatchEvent(new CustomEvent('userLoggedOut'));
    showNotification('Logged out successfully', 'success');
    checkLoginStatus();
  }
}

// Check Login Status
function checkLoginStatus() {
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');

  if (currentUser) {
    // Show profile display
    if (profileDisplay) {
      profileDisplay.classList.remove('hidden');
    }
    if (profileSettings) {
      profileSettings.classList.remove('hidden');
    }
    if (profileLoginPrompt) {
      profileLoginPrompt.classList.add('hidden');
    }

    // Update profile information
    updateProfileDisplay(currentUser);
  } else {
    // Show login prompt
    if (profileDisplay) {
      profileDisplay.classList.add('hidden');
    }
    if (profileSettings) {
      profileSettings.classList.add('hidden');
    }
    if (profileLoginPrompt) {
      profileLoginPrompt.classList.remove('hidden');
    }
  }
}

// Update Profile Display
function updateProfileDisplay(user) {
  const usernameElement = document.getElementById('profile-username');
  const levelElement = document.getElementById('profile-level');
  const xpElement = document.getElementById('profile-xp');
  const avatarElement = document.getElementById('profile-avatar');
  const statsElement = document.getElementById('profile-stats');

  if (usernameElement) {
    usernameElement.textContent = user.username;
  }

  if (levelElement) {
    levelElement.textContent = `Level ${user.level}`;
  }

  if (xpElement) {
    xpElement.textContent = `${user.xp} XP`;
  }

  if (avatarElement) {
    avatarElement.textContent = user.avatar;
  }

  if (statsElement && user.stats) {
    statsElement.innerHTML = `
      <div class="stat-item">
        <span class="stat-label">Games Played</span>
        <span class="stat-value">${user.stats.gamesPlayed || 0}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Wins</span>
        <span class="stat-value">${user.stats.wins || 0}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Losses</span>
        <span class="stat-value">${user.stats.losses || 0}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Draws</span>
        <span class="stat-value">${user.stats.draws || 0}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Current Streak</span>
        <span class="stat-value">${user.stats.currentStreak || 0}</span>
      </div>
    `;
  }
}

// Setup Theme Selection
function setupThemeSelection() {
  const themeButtons = document.querySelectorAll('.theme-btn');

  themeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const theme = btn.dataset.theme;
      setTheme(theme);
    });
  });

  // Load saved theme
  const savedTheme = localStorage.getItem('theme') || 'dark';
  setTheme(savedTheme);
}

// Set Theme
function setTheme(theme) {
  document.body.classList.remove('light-theme', 'dark-theme');
  document.body.classList.add(`${theme}-theme`);
  localStorage.setItem('theme', theme);
  settingsState.theme = theme;
  hasUnsavedChanges = true;
  updateSaveButtonState();

  // Update active theme button
  const themeButtons = document.querySelectorAll('.theme-btn');
  themeButtons.forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.theme === theme) {
      btn.classList.add('active');
    }
  });
}

// Setup Avatar Selection
function setupAvatarSelection() {
  const avatarButtons = document.querySelectorAll('.avatar-btn');

  avatarButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const avatar = btn.dataset.avatar;
      setAvatar(avatar);
    });
  });

  // Load saved avatar
  const savedAvatar = localStorage.getItem('avatar') || '♟';
  setAvatar(savedAvatar);
}

// Set Avatar
function setAvatar(avatar) {
  localStorage.setItem('avatar', avatar);
  settingsState.avatar = avatar;
  hasUnsavedChanges = true;
  updateSaveButtonState();

  // Update active avatar button
  const avatarButtons = document.querySelectorAll('.avatar-btn');
  avatarButtons.forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.avatar === avatar) {
      btn.classList.add('active');
    }
  });

  // Update profile avatar
  const avatarElement = document.getElementById('profile-avatar');
  if (avatarElement) {
    avatarElement.textContent = avatar;
  }
}

// Load Settings
function loadSettings() {
  // Load from localStorage
  settingsState.showCoordinates = localStorage.getItem('showCoordinates') === 'true';
  settingsState.soundEnabled = localStorage.getItem('soundEnabled') !== 'false';
  settingsState.notificationsEnabled = localStorage.getItem('notificationsEnabled') !== 'false';
  settingsState.theme = localStorage.getItem('theme') || 'dark';
  settingsState.avatar = localStorage.getItem('avatar') || '♟';
  settingsState.autoSave = localStorage.getItem('autoSave') !== 'false';

  // Update UI
  const coordinatesToggle = document.getElementById('show-coordinates-toggle');
  if (coordinatesToggle) {
    coordinatesToggle.checked = settingsState.showCoordinates;
  }

  const soundToggle = document.getElementById('sound-toggle');
  if (soundToggle) {
    soundToggle.checked = settingsState.soundEnabled;
  }

  const notificationsToggle = document.getElementById('notifications-toggle');
  if (notificationsToggle) {
    notificationsToggle.checked = settingsState.notificationsEnabled;
  }

  const autoSaveToggle = document.getElementById('auto-save-toggle');
  if (autoSaveToggle) {
    autoSaveToggle.checked = settingsState.autoSave;
  }

  // Track initial settings
  trackInitialSettings();
}

// Track Initial Settings
function trackInitialSettings() {
  initialSettings = { ...settingsState };
  hasUnsavedChanges = false;
  updateSaveButtonState();
}

// Check Unsaved Changes
function checkUnsavedChanges() {
  if (hasUnsavedChanges) {
    if (confirm('You have unsaved changes. Do you want to save them?')) {
      saveSettings();
    }
  }

  // Navigate back to game
  window.location.href = 'index.html';
}

// Save Settings
function saveSettings() {
  // Save to localStorage
  localStorage.setItem('showCoordinates', settingsState.showCoordinates);
  localStorage.setItem('soundEnabled', settingsState.soundEnabled);
  localStorage.setItem('notificationsEnabled', settingsState.notificationsEnabled);
  localStorage.setItem('theme', settingsState.theme);
  localStorage.setItem('avatar', settingsState.avatar);
  localStorage.setItem('autoSave', settingsState.autoSave);

  // Update window globals
  window.showCoordinates = settingsState.showCoordinates;
  window.soundEnabled = settingsState.soundEnabled;
  window.notificationsEnabled = settingsState.notificationsEnabled;
  window.autoSave = settingsState.autoSave;

  // Reset unsaved changes
  hasUnsavedChanges = false;
  updateSaveButtonState();

  // Show notification
  showNotification('Settings saved successfully', 'success');

  // Dispatch settings saved event
  window.dispatchEvent(new CustomEvent('settingsSaved', { detail: settingsState }));
}

// Update Sync Status
function updateSyncStatus() {
  const lastSync = localStorage.getItem('lastSyncTime');

  if (lastSync) {
    const syncDate = new Date(parseInt(lastSync));
    const now = new Date();
    const diff = now - syncDate;

    if (lastSyncTime) {
      if (diff < 60000) {
        lastSyncTime.textContent = 'Just now';
      } else if (diff < 3600000) {
        const minutes = Math.floor(diff / 60000);
        lastSyncTime.textContent = `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
      } else if (diff < 86400000) {
        const hours = Math.floor(diff / 3600000);
        lastSyncTime.textContent = `${hours} hour${hours > 1 ? 's' : ''} ago`;
      } else {
        const days = Math.floor(diff / 86400000);
        lastSyncTime.textContent = `${days} day${days > 1 ? 's' : ''} ago`;
      }
    }

    if (syncStatus) {
      syncStatus.textContent = 'Synced';
      syncStatus.className = 'sync-status synced';
    }
  } else {
    if (lastSyncTime) {
      lastSyncTime.textContent = 'Never';
    }

    if (syncStatus) {
      syncStatus.textContent = 'Not synced';
      syncStatus.className = 'sync-status not-synced';
    }
  }
}

// Handle Sync Now
function handleSyncNow() {
  if (syncStatus) {
    syncStatus.textContent = 'Syncing...';
    syncStatus.className = 'sync-status syncing';
  }

  // Simulate sync (replace with actual sync logic)
  setTimeout(() => {
    localStorage.setItem('lastSyncTime', Date.now().toString());
    updateSyncStatus();
    showNotification('Sync completed successfully', 'success');
  }, 1000);
}

// Load Saved Games
function loadSavedGames() {
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
  const savedGamesList = document.getElementById('saved-games-list');

  if (!savedGamesList) return;

  savedGamesList.innerHTML = '';

  if (!currentUser || !currentUser.savedGames || currentUser.savedGames.length === 0) {
    savedGamesList.innerHTML = `
      <li class="empty-state">
        <div class="empty-state-icon">📁</div>
        <div class="empty-state-text">No saved games</div>
        <div class="empty-state-subtext">Your saved games will appear here</div>
      </li>
    `;
    return;
  }

  currentUser.savedGames.forEach((game, index) => {
    const gameItem = document.createElement('li');
    gameItem.className = 'saved-game-item';

    const gameDate = new Date(game.savedAt);
    const dateStr = gameDate.toLocaleDateString() + ' ' + gameDate.toLocaleTimeString();

    gameItem.innerHTML = `
      <div class="game-info">
        <span class="game-name">${game.name || `Game ${index + 1}`}</span>
        <span class="game-date">${dateStr}</span>
      </div>
      <div class="game-actions">
        <button class="game-btn load-btn" data-index="${index}" title="Load game">
          <span class="btn-icon">📂</span>
        </button>
        <button class="game-btn rename-btn" data-index="${index}" title="Rename game">
          <span class="btn-icon">✏️</span>
        </button>
        <button class="game-btn delete-btn" data-index="${index}" title="Delete game">
          <span class="btn-icon">🗑️</span>
        </button>
      </div>
    `;

    savedGamesList.appendChild(gameItem);
  });

  // Add event listeners
  document.querySelectorAll('.load-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.target.closest('.load-btn').dataset.index);
      loadGame(index);
    });
  });

  document.querySelectorAll('.rename-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.target.closest('.rename-btn').dataset.index);
      openRenamePopup(index);
    });
  });

  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.target.closest('.delete-btn').dataset.index);
      deleteGame(index);
    });
  });
}

// Load Game
function loadGame(index) {
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');

  if (!currentUser || !currentUser.savedGames || !currentUser.savedGames[index]) {
    showNotification('Game not found', 'error');
    return;
  }

  const game = currentUser.savedGames[index];

  // Load game state
  if (window.loadGameState) {
    window.loadGameState(game.fen, game.pgn);
  }

  showNotification(`Loaded: ${game.name || 'Game ' + (index + 1)}`, 'success');
}

// Open Rename Popup
function openRenamePopup(index) {
  currentRenameIndex = index;
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');

  if (!currentUser || !currentUser.savedGames || !currentUser.savedGames[index]) {
    showNotification('Game not found', 'error');
    return;
  }

  const game = currentUser.savedGames[index];

  if (renameInput) {
    renameInput.value = game.name || `Game ${index + 1}`;
  }

  if (renamePopup) {
    renamePopup.classList.remove('hidden');
    renameInput.focus();
  }
}

// Close Rename Popup
function closeRenamePopup() {
  if (renamePopup) {
    renamePopup.classList.add('hidden');
  }
  currentRenameIndex = -1;
}

// Confirm Rename
function confirmRename() {
  if (currentRenameIndex === -1) return;

  const newName = renameInput.value.trim();

  if (!newName) {
    showNotification('Please enter a name for the game', 'warning');
    return;
  }

  const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');

  if (!currentUser || !currentUser.savedGames || !currentUser.savedGames[currentRenameIndex]) {
    showNotification('Game not found', 'error');
    return;
  }

  currentUser.savedGames[currentRenameIndex].name = newName;
  localStorage.setItem('currentUser', JSON.stringify(currentUser));

  // Update users storage
  const users = secureStorage.getItem('chessUsers') || [];
  const userIndex = users.findIndex(u => u.id === currentUser.id);

  if (userIndex !== -1) {
    users[userIndex].savedGames = currentUser.savedGames;
    secureStorage.setItem('chessUsers', users);
  }

  closeRenamePopup();
  loadSavedGames();
  showNotification('Game renamed successfully', 'success');
}

// Delete Game
function deleteGame(index) {
  if (!confirm('Are you sure you want to delete this game?')) {
    return;
  }

  const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');

  if (!currentUser || !currentUser.savedGames || !currentUser.savedGames[index]) {
    showNotification('Game not found', 'error');
    return;
  }

  currentUser.savedGames.splice(index, 1);
  localStorage.setItem('currentUser', JSON.stringify(currentUser));

  // Update users storage
  const users = secureStorage.getItem('chessUsers') || [];
  const userIndex = users.findIndex(u => u.id === currentUser.id);

  if (userIndex !== -1) {
    users[userIndex].savedGames = currentUser.savedGames;
    secureStorage.setItem('chessUsers', users);
  }

  loadSavedGames();
  showNotification('Game deleted successfully', 'success');
}

// Validate Email
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// Show Notification
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;

  document.body.appendChild(notification);

  // Remove after 3 seconds
  setTimeout(() => {
    notification.classList.add('fade-out');
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 3000);
}

// Export functions for use in other files
window.handleLogout = handleLogout;
window.checkLoginStatus = checkLoginStatus;
window.updateProfileDisplay = updateProfileDisplay;
window.setTheme = setTheme;
window.setAvatar = setAvatar;
window.saveSettings = saveSettings;
window.loadGame = loadGame;
window.deleteGame = deleteGame;
