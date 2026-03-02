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
const serverStatus = document.getElementById('server-status');
const statusIndicator = document.getElementById('status-indicator');

// Track unsaved changes
let hasUnsavedChanges = false;

// Update connection status
function updateConnectionStatus(status) {
  if (!serverStatus || !statusIndicator) return;
  
  statusIndicator.classList.remove('connected', 'disconnected');
  
  switch (status) {
    case 'connected':
      serverStatus.textContent = 'Connected';
      statusIndicator.classList.add('connected');
      break;
    case 'disconnected':
      serverStatus.textContent = 'Disconnected';
      statusIndicator.classList.add('disconnected');
      break;
    case 'connecting':
      serverStatus.textContent = 'Connecting...';
      break;
    default:
      serverStatus.textContent = status;
  }
}

// Validate email format
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}
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
  
  // Initialize server data manager
  if (window.serverDataManager) {
    console.log('[Settings] Server data manager initialized');
  } else {
    console.warn('[Settings] Server data manager not available');
  }

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

  // Delete account button
  const deleteAccountBtn = document.getElementById('delete-account-btn');
  if (deleteAccountBtn) {
    deleteAccountBtn.addEventListener('click', handleDeleteAccount);
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

  // Listen for WebSocket messages from server
  if (window.socket) {
    window.socket.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[Settings] Received message from server:', data.type);

        // Store username on socket when authenticated
        if (data.type === 'authenticated') {
          window.socket.username = data.username;
          console.log('[Settings] Socket authenticated as:', data.username);
        }

        // Handle user profile data from server
        if (data.type === 'userProfile') {
          console.log('[Settings] Received user profile from server:', data.userData);
          updateProfileDisplay(data.userData);
        }

        // Handle user data synced confirmation
        if (data.type === 'userDataSynced') {
          console.log('[Settings] User data synced to server:', data.userData);
          updateProfileDisplay(data.userData);
        }

        // Handle login confirmation
        if (data.type === 'loggedIn') {
          console.log('[Settings] Login confirmation received:', data);
          
          // Set current user
          const user = data.userData || {
            username: data.username,
            email: data.email
          };
          localStorage.setItem('currentUser', JSON.stringify(user));
          window.currentUser = user;

          // Dispatch login event
          window.dispatchEvent(new CustomEvent('userLoggedIn', { detail: user }));

          // Show notification
          if (window.showNotification) {
            window.showNotification('Logged in successfully', 'success');
          }

          // Update UI
          checkLoginStatus();
        }

        // Handle registration confirmation
        if (data.type === 'registered') {
          console.log('[Settings] Registration confirmation received:', data);
          
          // Set current user
          const user = data.userData || {
            username: data.username,
            email: data.email
          };
          localStorage.setItem('currentUser', JSON.stringify(user));
          window.currentUser = user;

          // Dispatch login event
          window.dispatchEvent(new CustomEvent('userLoggedIn', { detail: user }));

          // Show notification
          if (window.showNotification) {
            window.showNotification('Registered successfully', 'success');
          }

          // Update UI
          checkLoginStatus();
        }

        // Handle report system fix acknowledgment
        if (data.type === 'reportSystemFixAck') {
          console.log('[Settings] Report system fix acknowledged:', data.message);
          // This is just an acknowledgment, no action needed
        }

        // Handle account deletion notification
        if (data.type === 'accountDeleted') {
          console.log('[Settings] Account deleted notification received:', data);
          
          // Clear ALL local data
          const allKeys = Object.keys(localStorage);
          allKeys.forEach(key => {
            localStorage.removeItem(key);
            console.log('[Settings] Removed local storage key:', key);
          });

          // Clear session storage
          sessionStorage.clear();

          // Clear current user
          window.currentUser = null;

          // Dispatch logout event
          window.dispatchEvent(new CustomEvent('userLoggedOut'));

          // Show notification
          if (window.showNotification) {
            window.showNotification(data.message || 'Your account has been deleted', 'error');
          }

          // Update UI
          checkLoginStatus();

          // Redirect to home after delay
          setTimeout(() => {
            window.location.href = 'index.html';
          }, 2000);
        }

        // Handle user profile updated
        if (data.type === 'userProfileUpdated') {
          console.log('[Settings] User profile updated on server:', data.userData);
          updateProfileDisplay(data.userData);
        }

        // Handle friends synced
        if (data.type === 'friendsSynced') {
          console.log('[Settings] Friends synced from server:', data.friends);
          loadFriendsList();
        }

        // Handle saved games synced
        if (data.type === 'savedGamesSynced') {
          console.log('[Settings] Saved games synced from server:', data.savedGames);
          loadSavedGames();
        }
      } catch (error) {
        console.error('[Settings] Error handling WebSocket message:', error);
      }
    });
  }

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
      showNotification('Please enter email and password', 'error', true);
      return;
    }

    // Check if input is an email or username
    const isEmail = email.includes('@');

    // Only validate as email if it contains @ symbol
    if (isEmail && !validateEmail(email)) {
      showNotification('Please enter a valid email address', 'error', true);
      return;
    }

    if (password.length < 6) {
      showNotification('Password must be at least 6 characters', 'error', true);
      return;
    }

    // Check if user exists in secureStorage (local authentication)
    const users = secureStorage.getItem('chessUsers') || [];

    // Allow login with either email or username
    const user = users.find(u =>
      (u.email === email || u.username === email) &&
      u.password === password
    );

    if (user) {
      // Login successful - create a safe user object without password
      const safeUser = {
        id: user.id,
        username: user.username,
        avatar: user.avatar,
        level: user.level,
        xp: user.xp,
        stats: user.stats,
        savedGames: user.savedGames,
        createdAt: user.createdAt
      };
      localStorage.setItem('currentUser', JSON.stringify(safeUser));

      // Sync user data to server if connected
      if (window.socket && window.socket.readyState === WebSocket.OPEN) {
        try {
          window.socket.send(JSON.stringify({
            type: 'syncUserData',
            userData: safeUser
          }));
          console.log('[Login] User data synced to server');
        } catch (error) {
          console.error('[Login] Failed to sync user data to server:', error);
          // Don't block login if sync fails
        }
      }

      // Dispatch login event
      window.dispatchEvent(new CustomEvent('userLoggedIn', { detail: safeUser }));

      // Show notification
      showNotification('Logged in successfully');

      // Update UI
      checkLoginStatus();
      return;
    }

    // If not found locally, try server authentication
    if (window.socket && window.socket.readyState === WebSocket.OPEN) {
      console.log('[Login] Attempting to login with:', { isEmail, email, password: '***' });
    
    window.socket.send(JSON.stringify({
      type: 'login',
      email: isEmail ? email : undefined,
      username: isEmail ? undefined : email,
      password: password
    }));
    console.log('[Login] Login request sent');

    // Listen for login response
    const handleLoginResponse = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'loggedIn' || data.type === 'loginSuccess') {
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
    } else {
      showNotification('Invalid email/username or password', 'error', true);
    }
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
      showNotification('Please fill in all fields', 'error', true);
      return;
    }

    if (username.length < 3) {
      showNotification('Username must be at least 3 characters', 'error', true);
      return;
    }

    if (!validateEmail(email)) {
      showNotification('Please enter a valid email address', 'error', true);
      return;
    }

    if (password !== confirmPassword) {
      showNotification('Passwords do not match', 'error', true);
      return;
    }

    if (password.length < 6) {
      showNotification('Password must be at least 6 characters', 'error', true);
      return;
    }

    // Check if user already exists in secureStorage (local registration)
    const users = secureStorage.getItem('chessUsers') || [];

    if (users.find(u => u.email === email)) {
      showNotification('An account with this email already exists', 'error', true);
      return;
    }

    if (users.find(u => u.username === username)) {
      showNotification('This username is already taken', 'error', true);
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

    users.push(newUser);
    secureStorage.setItem('chessUsers', users);

    // Create a safe user object without password and email for localStorage
    const safeUser = {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      avatar: newUser.avatar,
      level: newUser.level,
      xp: newUser.xp,
      stats: newUser.stats,
      savedGames: newUser.savedGames,
      createdAt: newUser.createdAt
    };
    localStorage.setItem('currentUser', JSON.stringify(safeUser));

    // Sync user data to server if connected
    if (window.socket && window.socket.readyState === WebSocket.OPEN) {
      try {
        window.socket.send(JSON.stringify({
          type: 'syncUserData',
          userData: safeUser
        }));
        console.log('[Register] User data synced to server');
      } catch (error) {
        console.error('[Register] Failed to sync user data to server:', error);
        // Don't block registration if sync fails
      }
    }

    // Dispatch login event
    window.dispatchEvent(new CustomEvent('userLoggedIn', { detail: safeUser }));

    // Show notification
    showNotification('Registered successfully');

    // Update UI
    checkLoginStatus();
    return;

    // Server registration is disabled - using local registration only
    // Server registration is disabled - using local registration only

    // Listen for registration response
    const handleRegisterResponse = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'registered' || data.type === 'registerSuccess') {
        const user = data.userData;
        
        // Set current user
        localStorage.setItem('currentUser', JSON.stringify(user));
        
        // Dispatch login event
        window.dispatchEvent(new CustomEvent('userLoggedIn', { detail: user }));
        
        // Show notification
        showNotification('Registered successfully');
        
        // Update UI
        checkLoginStatus();
      } else if (data.type === 'error') {
        showNotification(data.message || 'Registration failed');
      }
      
      // Remove the event listener
      window.socket.removeEventListener('message', handleRegisterResponse);
    };

    window.socket.addEventListener('message', handleRegisterResponse);
    
    // Timeout after 10 seconds
    setTimeout(() => {
      window.socket.removeEventListener('message', handleRegisterResponse);
    }, 10000);
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
  
  // Request user data from server
  if (window.socket && window.socket.readyState === WebSocket.OPEN) {
    window.socket.send(JSON.stringify({
      type: 'getUserProfile',
      username: window.currentUsername
    }));
    console.log('[Settings Debug] Requested user profile from server');
    return;
  }
  
  // Fallback to localStorage only if server not available
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
  console.log('[Settings Debug] currentUser from localStorage:', currentUser);
  if (!currentUser) {
    console.log('[Settings Debug] No currentUser found, returning');
    return;
  }

  // Update display with fallback data
  updateProfileDisplay(currentUser);
}

// Update profile display with server data
function updateProfileDisplay(currentUser) {
  console.log('[Settings Debug] updateProfileDisplay() called with:', currentUser);
  if (!currentUser) {
    console.log('[Settings Debug] No user data provided');
    return;
  }

  // Save to localStorage as cache
  localStorage.setItem('currentUser', JSON.stringify(currentUser));

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

// Load Friends List
function loadFriendsList() {
  // Request friends from server
  if (window.socket && window.socket.readyState === WebSocket.OPEN) {
    window.socket.send(JSON.stringify({
      type: 'syncFriends'
    }));
    console.log('[Settings] Requested friends from server');
    return;
  }

  // Fallback to localStorage only if server not available
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
  if (!currentUser) return;

  const friends = currentUser.friends || [];
  const friendsList = document.getElementById('friends-list');
  const noFriends = document.getElementById('no-friends');

  if (!friendsList || !noFriends) return;
  
  displayFriendsList(friends, friendsList, noFriends);
}

// Display friends list
function displayFriendsList(friends, friendsList, noFriends) {
  // Clear existing friends
  friendsList.innerHTML = '';

  if (friends.length === 0) {
    // Show no friends message
    noFriends.classList.remove('hidden');
    return;
  }

  // Hide no friends message
  noFriends.classList.add('hidden');

  // Display each friend
  friends.forEach(friend => {
    const friendItem = createFriendItem(friend);
    friendsList.appendChild(friendItem);
  });
}

// Create friend item
function createFriendItem(friend) {
  const friendItem = document.createElement('div');
  friendItem.className = 'friend-item';
  friendItem.innerHTML = `
    <div class="friend-avatar">${friend.avatar || '♟'}</div>
    <div class="friend-info">
      <div class="friend-name">${friend.username}</div>
      <div class="friend-level">Level ${friend.level || 1}</div>
    </div>
    <div class="friend-actions">
      <button class="friend-btn remove" data-username="${friend.username}">Remove</button>
    </div>
  `;

  // Add event listener for remove button
  const removeBtn = friendItem.querySelector('.remove');
  if (removeBtn) {
    removeBtn.addEventListener('click', () => removeFriend(friend.username));
  }

  return friendItem;
}

// Remove friend
function removeFriend(username) {
  if (!window.socket || window.socket.readyState !== WebSocket.OPEN) {
    showNotification('Not connected to server');
    return;
  }

  window.socket.send(JSON.stringify({
    type: 'removeFriend',
    friendUsername: username
  }));
  console.log('[Settings] Sent remove friend request:', username);
}

// Load Saved Games
function loadSavedGames() {
  // Request saved games from server
  if (window.socket && window.socket.readyState === WebSocket.OPEN) {
    window.socket.send(JSON.stringify({
      type: 'syncSavedGames'
    }));
    console.log('[Settings] Requested saved games from server');
    return;
  }

  // Fallback to localStorage only if server not available
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
  if (!currentUser) return;

  const savedGames = currentUser.savedGames || [];
  const savedGamesList = document.getElementById('saved-games-list');
  const noSavedGames = document.getElementById('no-saved-games');

  if (!savedGamesList || !noSavedGames) return;
  
  displaySavedGames(savedGames, savedGamesList, noSavedGames);
}

// Display saved games
function displaySavedGames(savedGames, savedGamesList, noSavedGames) {

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
  // Request saved games from server to get latest data
  if (window.socket && window.socket.readyState === WebSocket.OPEN) {
    window.socket.send(JSON.stringify({
      type: 'syncSavedGames'
    }));
    console.log('[Settings] Requesting saved games from server before loading');
    // Load will happen after server responds
    return;
  }

  // Fallback to localStorage only if server not available
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

// Handle Delete Account
function handleDeleteAccount() {
  // Check if user is logged in
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
  if (!currentUser || !currentUser.username) {
    showNotification('No user logged in');
    return;
  }

  // Check if WebSocket is connected
  if (!window.socket || window.socket.readyState !== WebSocket.OPEN) {
    showNotification('Not connected to server. Please check your connection.');
    return;
  }

  // Create enhanced confirmation dialog
  const dialog = document.createElement('div');
  dialog.className = 'delete-account-dialog';
  dialog.innerHTML = `
    <div class="delete-account-content">
      <h2>Delete Account</h2>
      <div class="delete-account-warning">
        <p>⚠️ WARNING: This action cannot be undone!</p>
        <p>This will permanently delete:</p>
        <ul>
          <li>Your account and profile</li>
          <li>All saved games (${currentUser.savedGames?.length || 0} games)</li>
          <li>Your friends list (${currentUser.friends?.length || 0} friends)</li>
          <li>XP and achievements</li>
          <li>All game statistics</li>
          <li>Settings and preferences</li>
        </ul>
      </div>
      <div class="delete-account-input">
        <label>Type your username to confirm:</label>
        <input type="text" id="delete-username-confirm" placeholder="${currentUser.username}">
      </div>
      <div class="delete-account-actions">
        <button class="cancel-btn" id="delete-cancel">Cancel</button>
        <button class="delete-btn" id="delete-confirm">Delete Account</button>
      </div>
    </div>
  `;

  // Add dialog to page
  document.body.appendChild(dialog);

  // Add event listeners
  const cancelBtn = dialog.querySelector('#delete-cancel');
  const confirmBtn = dialog.querySelector('#delete-confirm');
  const usernameInput = dialog.querySelector('#delete-username-confirm');

  const closeDialog = () => {
    document.body.removeChild(dialog);
  };

  cancelBtn.addEventListener('click', closeDialog);

  confirmBtn.addEventListener('click', async () => {
    const enteredUsername = usernameInput.value.trim();
    
    // Validate username matches
    if (enteredUsername !== currentUser.username) {
      showNotification('Username does not match. Please try again.');
      usernameInput.classList.add('error');
      return;
    }

    // Disable buttons and show loading state
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Deleting...';
    cancelBtn.disabled = true;

    let deleteTimeout;
    
    // Set up delete response handler
    const handleDeleteResponse = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[Delete Account] Response received:', data);

        if (data.type === 'accountDeleted') {
          // Clear delete timeout
          clearTimeout(deleteTimeout);
          
          // Clear ALL local data
          const allKeys = Object.keys(localStorage);
          allKeys.forEach(key => {
            // Only clear chess-related keys
            if (key.toLowerCase().includes('chess') || 
                key.toLowerCase().includes('user') || 
                key.toLowerCase().includes('player') ||
                key.toLowerCase().includes('achievement') ||
                key.toLowerCase().includes('reward') ||
                key.toLowerCase().includes('friend') ||
                key.toLowerCase().includes('game') ||
                key.toLowerCase().includes('sync') ||
                key.toLowerCase().includes('theme')) {
              localStorage.removeItem(key);
              console.log('[Delete Account] Removed:', key);
            }
          });

          // Clear session storage
          sessionStorage.clear();

          // Dispatch logout event
          window.dispatchEvent(new CustomEvent('userLoggedOut'));

          // Show success notification
          showNotification('Account deleted successfully', 'success');

          // Update UI
          checkLoginStatus();

          // Close dialog
          closeDialog();

          // Redirect to home after delay
          setTimeout(() => {
            window.location.href = 'index.html';
          }, 2000);
        } else if (data.type === 'error') {
          // Clear delete timeout
          clearTimeout(deleteTimeout);
          
          showNotification(data.message || 'Failed to delete account', 'error');
          
          // Re-enable buttons
          confirmBtn.disabled = false;
          confirmBtn.textContent = 'Delete Account';
          cancelBtn.disabled = false;
        }

        // Remove the event listener
        window.socket.removeEventListener('message', handleDeleteResponse);
      } catch (error) {
        console.error('[Delete Account] Error handling delete response:', error);
        showNotification('Error processing delete response. Please try again.', 'error');
        
        // Clear delete timeout
        clearTimeout(deleteTimeout);
        
        // Re-enable buttons
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Delete Account';
        cancelBtn.disabled = false;
        
        // Remove the event listener
        window.socket.removeEventListener('message', handleDeleteResponse);
      }
    };

    // Add delete response listener
    window.socket.addEventListener('message', handleDeleteResponse);

    try {
      console.log('[Delete Account] Starting deletion process for:', currentUser.username);
      console.log('[Delete Account] WebSocket state:', window.socket.readyState);
      
      if (window.socket.readyState !== WebSocket.OPEN) {
        throw new Error('WebSocket not connected');
      }
      
      // Send delete account request
      console.log('[Delete Account] Current user data:', currentUser);
      console.log('[Delete Account] Sending delete request with:', {
        type: 'deleteAccount',
        username: currentUser.username,
        userId: currentUser.id,
        email: currentUser.email
      });
      
      // Validate required fields
      if (!currentUser.username) {
        throw new Error('Username is required');
      }
      
      window.socket.send(JSON.stringify({
        type: 'deleteAccount',
        username: currentUser.username
      }));
      console.log('[Delete Account] Delete request sent');
      
      // Set delete timeout
      deleteTimeout = setTimeout(() => {
        console.error('[Delete Account] Delete request timed out');
        showNotification('Delete request timed out. Please try again.', 'error');
        
        // Re-enable buttons
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Delete Account';
        cancelBtn.disabled = false;
      }, 15000);

      // Timeout after 15 seconds
      setTimeout(() => {
        window.socket.removeEventListener('message', handleDeleteResponse);
        if (dialog.parentNode) {
          showNotification('Delete request timed out. Please try again.', 'error');
          confirmBtn.disabled = false;
          confirmBtn.textContent = 'Delete Account';
          cancelBtn.disabled = false;
        }
      }, 15000);
    } catch (error) {
      console.error('Delete account error:', error);
      showNotification('An error occurred. Please try again.', 'error');
      
      // Re-enable buttons
      confirmBtn.disabled = false;
      confirmBtn.textContent = 'Delete Account';
      cancelBtn.disabled = false;
    }
  });

  // Add input validation
  usernameInput.addEventListener('input', () => {
    usernameInput.classList.remove('error');
  });

  // Close dialog when clicking outside
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) {
      closeDialog();
    }
  });

  // Add escape key handler
  const escapeHandler = (e) => {
    if (e.key === 'Escape' && dialog.parentNode) {
      closeDialog();
      document.removeEventListener('keydown', escapeHandler);
    }
  };
  document.addEventListener('keydown', escapeHandler);
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
      
      // Mark as unsaved changes
      hasUnsavedChanges = true;
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
      
      // Mark as unsaved changes
      hasUnsavedChanges = true;
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

        // Mark as unsaved changes
        hasUnsavedChanges = true;

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
function showNotification(message, type = 'info', centered = false) {
  const notification = document.createElement('div');
  notification.className = 'notification';
  
  // Set background color based on type
  let background = 'linear-gradient(135deg, var(--accent), var(--accent-strong))';
  if (type === 'error') {
    background = 'linear-gradient(135deg, var(--danger), #dc2626)';
  } else if (type === 'success') {
    background = 'linear-gradient(135deg, var(--success), #16a34a)';
  } else if (type === 'warning') {
    background = 'linear-gradient(135deg, var(--warning), #d97706)';
  }
  
  notification.textContent = message;
  
  if (centered) {
    notification.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      padding: 16px 24px;
      background: ${background};
      color: white;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      z-index: 99999;
      animation: slideInCenter 0.3s ease-out;
      max-width: 400px;
      text-align: center;
    `;
  } else {
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 24px;
      background: ${background};
      color: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 10000;
      animation: slideIn 0.3s ease-out;
    `;
  }

  document.body.appendChild(notification);

  // Remove after 3 seconds
  setTimeout(() => {
    notification.style.animation = centered ? 'slideOutCenter 0.3s ease-out' : 'slideOut 0.3s ease-out';
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
  console.log('[Settings] checkUnsavedChanges called, hasUnsavedChanges:', hasUnsavedChanges);
  
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

  console.log('[Settings] Showing unsaved changes dialog');
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
  .delete-account-dialog {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.85);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
    animation: fadeIn 0.3s ease-in;
    backdrop-filter: blur(8px);
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      backdrop-filter: blur(0px);
    }
    to {
      opacity: 1;
      backdrop-filter: blur(8px);
    }
  }

  .delete-account-content {
    background: var(--bg-color, #1a1a2e);
    color: var(--text-color, #eee);
    padding: 40px;
    border-radius: 16px;
    max-width: 500px;
    width: 90%;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
    animation: slideUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    border: 2px solid rgba(255, 68, 68, 0.3);
    position: relative;
    overflow: hidden;
  }

  .delete-account-content::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #ff4444, #ff6666, #ff4444);
    background-size: 200% 100%;
    animation: gradientMove 2s linear infinite;
  }

  @keyframes gradientMove {
    0% {
      background-position: 0% 50%;
    }
    100% {
      background-position: 200% 50%;
    }
  }

  @keyframes slideUp {
    from {
      transform: translateY(40px) scale(0.95);
      opacity: 0;
    }
    to {
      transform: translateY(0) scale(1);
      opacity: 1;
    }
  }

  .delete-account-content.closing {
    animation: slideDown 0.3s ease-in forwards;
  }

  @keyframes slideDown {
    from {
      transform: translateY(0) scale(1);
      opacity: 1;
    }
    to {
      transform: translateY(40px) scale(0.95);
      opacity: 0;
    }
  }

  .delete-account-content h2 {
    margin: 0 0 20px 0;
    font-size: 28px;
    color: #ff4444;
    text-align: center;
  }

  .delete-account-warning {
    background: rgba(255, 68, 68, 0.1);
    border-left: 4px solid #ff4444;
    padding: 20px;
    margin-bottom: 25px;
    border-radius: 8px;
    animation: pulseWarning 2s ease-in-out infinite;
  }

  @keyframes pulseWarning {
    0%, 100% {
      background: rgba(255, 68, 68, 0.1);
      border-left-color: #ff4444;
    }
    50% {
      background: rgba(255, 68, 68, 0.15);
      border-left-color: #ff6666;
    }
  }

  .delete-account-warning p {
    margin: 0 0 10px 0;
    font-size: 16px;
    line-height: 1.5;
  }

  .delete-account-warning ul {
    margin: 15px 0 0 0;
    padding-left: 20px;
  }

  .delete-account-warning li {
    margin: 8px 0;
    font-size: 14px;
    line-height: 1.4;
    animation: slideIn 0.3s ease-out forwards;
    opacity: 0;
  }

  .delete-account-warning li:nth-child(1) { animation-delay: 0.1s; }
  .delete-account-warning li:nth-child(2) { animation-delay: 0.2s; }
  .delete-account-warning li:nth-child(3) { animation-delay: 0.3s; }
  .delete-account-warning li:nth-child(4) { animation-delay: 0.4s; }
  .delete-account-warning li:nth-child(5) { animation-delay: 0.5s; }
  .delete-account-warning li:nth-child(6) { animation-delay: 0.6s; }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(-10px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  .delete-account-input {
    margin-bottom: 25px;
  }

  .delete-account-input label {
    display: block;
    margin-bottom: 10px;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-color, #eee);
  }

  .delete-account-input input {
    width: 100%;
    padding: 12px 16px;
    font-size: 16px;
    border: 2px solid var(--border-color, #333);
    border-radius: 8px;
    background: var(--input-bg, #2a2a4e);
    color: var(--text-color, #eee);
    transition: all 0.3s ease;
  }

  .delete-account-input input:focus {
    outline: none;
    border-color: var(--accent, #ff9800);
    box-shadow: 0 0 0 3px rgba(255, 152, 0, 0.1);
  }

  .delete-account-input input.error {
    border-color: #ff4444;
    animation: shake 0.5s ease-in-out;
  }

  @keyframes shake {
    0%, 100% {
      transform: translateX(0);
    }
    25% {
      transform: translateX(-10px);
    }
    75% {
      transform: translateX(10px);
    }
  }

  .delete-account-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
  }

  .delete-account-actions button {
    padding: 12px 24px;
    font-size: 16px;
    font-weight: 600;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    position: relative;
    overflow: hidden;
  }

  .delete-account-actions button::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.3);
    transform: translate(-50%, -50%);
    transition: width 0.6s, height 0.6s;
  }

  .delete-account-actions button:active::before {
    width: 300px;
    height: 300px;
  }

  .delete-account-actions button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .delete-account-actions button:disabled::before {
    display: none;
  }

  .cancel-btn {
    background: var(--bg-secondary, #2a2a4e);
    color: var(--text-color, #eee);
  }

  .cancel-btn:hover:not(:disabled) {
    background: var(--bg-tertiary, #3a3a5e);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  .delete-btn {
    background: linear-gradient(135deg, #ff4444, #cc0000);
    color: white;
    animation: pulseDelete 2s ease-in-out infinite;
  }

  @keyframes pulseDelete {
    0%, 100% {
      box-shadow: 0 0 0 0 rgba(255, 68, 68, 0.7);
    }
    50% {
      box-shadow: 0 0 0 10px rgba(255, 68, 68, 0);
    }
  }

  .delete-btn:hover:not(:disabled) {
    background: linear-gradient(135deg, #ff6666, #ee0000);
    transform: translateY(-2px) scale(1.05);
    box-shadow: 0 6px 20px rgba(255, 68, 68, 0.5);
  }

  .delete-btn:active:not(:disabled) {
    transform: translateY(0) scale(0.98);
  }

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
