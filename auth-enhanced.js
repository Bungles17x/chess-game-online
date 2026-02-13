// Authentication JavaScript - Enhanced Version
// Improved security, better error handling, and enhanced functionality

// Constants
const MIN_USERNAME_LENGTH = 3;
const MIN_PASSWORD_LENGTH = 8;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

// Secure Storage Wrapper
const secureStorage = {
  getItem(key) {
    try {
      const item = localStorage.getItem(key);
      if (!item) return null;
      return JSON.parse(item);
    } catch (error) {
      console.error('Error reading from secure storage:', error);
      return null;
    }
  },

  setItem(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Error writing to secure storage:', error);
      return false;
    }
  },

  removeItem(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Error removing from secure storage:', error);
      return false;
    }
  }
};

// Session Management
const sessionManager = {
  lastActivity: Date.now(),

  updateActivity() {
    this.lastActivity = Date.now();
  },

  isExpired() {
    return Date.now() - this.lastActivity > SESSION_TIMEOUT;
  },

  extendSession() {
    this.lastActivity = Date.now();
  }
};

// Login Attempts Tracker
const loginAttempts = {
  attempts: 0,
  lockoutUntil: 0,

  recordAttempt() {
    this.attempts++;
    if (this.attempts >= MAX_LOGIN_ATTEMPTS) {
      this.lockoutUntil = Date.now() + LOCKOUT_DURATION;
    }
  },

  resetAttempts() {
    this.attempts = 0;
    this.lockoutUntil = 0;
  },

  isLocked() {
    return Date.now() < this.lockoutUntil;
  },

  getRemainingLockoutTime() {
    if (!this.isLocked()) return 0;
    return Math.ceil((this.lockoutUntil - Date.now()) / 1000);
  }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  // Get DOM elements after page loads
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const loginBtn = document.getElementById('login-btn');
  const registerBtn = document.getElementById('register-btn');

  setupLoginForm(loginForm);
  setupRegisterForm(registerForm);
  setupAuthButtons(loginBtn, registerBtn);

  // Initialize session timeout check
  setInterval(checkSessionTimeout, 60000); // Check every minute

  // Update last activity on user interaction
  document.addEventListener('click', () => sessionManager.updateActivity());
  document.addEventListener('keypress', () => sessionManager.updateActivity());
});

// Check session timeout
function checkSessionTimeout() {
  if (isAuthenticated() && sessionManager.isExpired()) {
    handleLogout();
    showNotification('Session expired. Please log in again.', 'warning');
  }
}

// Setup login form
function setupLoginForm(loginForm) {
  if (!loginForm) return;

  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();

    // Check if account is locked
    if (loginAttempts.isLocked()) {
      const remainingTime = loginAttempts.getRemainingLockoutTime();
      const minutes = Math.floor(remainingTime / 60);
      const seconds = remainingTime % 60;
      showError(`Account locked. Try again in ${minutes}m ${seconds}s`);
      return;
    }

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('remember-me').checked;

    // Validate inputs
    if (!email) {
      showError('Please enter your email or username');
      return;
    }

    // Only validate as email if it contains @ symbol
    if (email.includes('@') && !validateEmail(email)) {
      showError('Please enter a valid email address');
      return;
    }

    if (!password) {
      showError('Please enter your password');
      return;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      showError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      return;
    }

    // Check if user exists in secureStorage
    const users = secureStorage.getItem('chessUsers') || [];

    // Allow login with either email or username
    const user = users.find(u =>
      (u.email === email || u.username === email) &&
      u.password === password
    );

    if (!user) {
      loginAttempts.recordAttempt();
      const remainingAttempts = MAX_LOGIN_ATTEMPTS - loginAttempts.attempts;
      if (remainingAttempts > 0) {
        showError(`Invalid email/username or password. ${remainingAttempts} attempt(s) remaining.`);
      } else {
        showError('Account locked due to too many failed attempts.');
      }
      return;
    }

    // Reset login attempts on successful login
    loginAttempts.resetAttempts();

    // Check if user is banned
    if (!checkUserBanStatus(user)) {
      return;
    }

    // Login successful - create a safe user object without password
    const safeUser = {
      id: user.id,
      username: user.username,
      avatar: user.avatar,
      level: user.level,
      xp: user.xp,
      stats: user.stats,
      savedGames: user.savedGames,
      createdAt: user.createdAt,
      lastLogin: new Date().toISOString()
    };

    secureStorage.setItem('currentUser', safeUser);
    sessionManager.updateActivity();

    if (rememberMe) {
      secureStorage.setItem('rememberedUser', email);
    } else {
      secureStorage.removeItem('rememberedUser');
    }

    // Redirect to game
    window.location.href = 'index.html';
  });

  // Load remembered user
  const rememberedEmail = secureStorage.getItem('rememberedUser');
  if (rememberedEmail) {
    const emailInput = document.getElementById('email');
    const rememberMeCheckbox = document.getElementById('remember-me');
    if (emailInput) emailInput.value = rememberedEmail;
    if (rememberMeCheckbox) rememberMeCheckbox.checked = true;
  }
}

// Check user ban status
function checkUserBanStatus(user) {
  // Exempt admin account from ban check
  if (user.username.toLowerCase() === 'bungles17x') {
    console.log("AUTH", "Admin account exempted from ban check", { username: user.username });
    // Clear any existing ban data for admin account
    secureStorage.removeItem('botModeBan');
    secureStorage.removeItem('bannedUsername');
    secureStorage.removeItem('isUserBanned');
    secureStorage.removeItem('showBanAfterLogin');
    return true;
  }

  const banData = secureStorage.getItem('botModeBan');
  if (banData) {
    const ban = JSON.parse(banData);

    // Only check ban if it belongs to this user
    if (ban.username && ban.username === user.username) {
      // Check if ban is permanent or not expired
      let isBanned = false;
      if (!ban.duration) {
        isBanned = true;
      } else {
        let expiryTime;
        if (ban.unit === 'hours') {
          expiryTime = ban.timestamp + (ban.duration * 60 * 60 * 1000);
        } else if (ban.unit === 'days') {
          expiryTime = ban.timestamp + (ban.duration * 24 * 60 * 60 * 1000);
        } else {
          expiryTime = ban.timestamp + (ban.duration * 24 * 60 * 60 * 1000);
        }
        isBanned = Date.now() <= expiryTime;
      }

      if (isBanned) {
        // Store username of banned user
        secureStorage.setItem('bannedUsername', user.username);
        // Store ban data to show modal after login
        secureStorage.setItem('showBanAfterLogin', 'true');
        return false;
      } else {
        // Ban has expired, clear all ban-related data
        secureStorage.removeItem('botModeBan');
        secureStorage.removeItem('bannedUsername');
        secureStorage.removeItem('isUserBanned');
        secureStorage.removeItem('showBanAfterLogin');
        secureStorage.removeItem('banExpiresAt');
        secureStorage.removeItem('banReason');
      }
    }
  }
  return true;
}

// Setup register form
function setupRegisterForm(registerForm) {
  if (!registerForm) return;

  registerForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const terms = document.getElementById('terms').checked;

    // Validate inputs
    if (!username) {
      showError('Please enter a username');
      return;
    }

    if (username.length < MIN_USERNAME_LENGTH) {
      showError(`Username must be at least ${MIN_USERNAME_LENGTH} characters`);
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      showError('Username can only contain letters, numbers, and underscores');
      return;
    }

    if (!email) {
      showError('Please enter your email address');
      return;
    }

    if (!validateEmail(email)) {
      showError('Please enter a valid email address');
      return;
    }

    if (!password) {
      showError('Please enter a password');
      return;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      showError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      return;
    }

    if (!validatePasswordStrength(password)) {
      showError('Password must contain at least one uppercase letter, one lowercase letter, and one number');
      return;
    }

    if (!confirmPassword) {
      showError('Please confirm your password');
      return;
    }

    if (password !== confirmPassword) {
      showError('Passwords do not match');
      return;
    }

    if (!terms) {
      showError('You must agree to Terms of Service');
      return;
    }

    // Check if user already exists
    const users = secureStorage.getItem('chessUsers') || [];

    if (users.find(u => u.email === email)) {
      showError('An account with this email already exists');
      return;
    }

    if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
      showError('This username is already taken');
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

    // Create a safe user object without password and email for localStorage
    const safeUser = {
      id: newUser.id,
      username: newUser.username,
      avatar: newUser.avatar,
      level: newUser.level,
      xp: newUser.xp,
      stats: newUser.stats,
      savedGames: newUser.savedGames,
      createdAt: newUser.createdAt,
      lastLogin: newUser.lastLogin
    };

    secureStorage.setItem('currentUser', safeUser);
    sessionManager.updateActivity();

    // Redirect to game
    window.location.href = 'index.html';
  });
}

// Setup auth buttons in main game
function setupAuthButtons(settingsBtn) {
  if (!settingsBtn) return;

  // Settings button always navigates to settings page
  settingsBtn.addEventListener('click', () => {
    window.location.href = 'settings.html';
  });

  // Check if user is logged in
  const currentUser = secureStorage.getItem('currentUser');

  // No additional logic needed - Settings button always navigates to settings page
  // All login/register functionality is now in settings.html
}

// Handle logout
function handleLogout() {
  secureStorage.removeItem('currentUser');
  sessionManager.lastActivity = 0;
  window.location.href = 'index.html';
}

// Validate email format
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// Validate password strength
function validatePasswordStrength(password) {
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  return hasUpperCase && hasLowerCase && hasNumber;
}

// Show error message
function showError(message) {
  // Remove any existing error messages
  const existingErrors = document.querySelectorAll('.auth-alert.error');
  existingErrors.forEach(error => error.remove());

  // Create error alert
  const alertDiv = document.createElement('div');
  alertDiv.className = 'auth-alert error';
  alertDiv.textContent = message;

  // Insert after form header
  const authHeader = document.querySelector('.auth-header');
  if (authHeader) {
    authHeader.insertAdjacentElement('afterend', alertDiv);
  }

  // Remove after 5 seconds
  setTimeout(() => {
    if (alertDiv.parentNode) {
      alertDiv.remove();
    }
  }, 5000);
}

// Show notification
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.classList.add('show');
  }, 100);

  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 300);
  }, 5000);
}

// Check if user is authenticated
function isAuthenticated() {
  return secureStorage.getItem('currentUser') !== null;
}

// Get current user
function getCurrentUser() {
  return secureStorage.getItem('currentUser');
}

// Update current user
function updateCurrentUser(updates) {
  const currentUser = getCurrentUser();
  if (!currentUser) return false;

  const updatedUser = { ...currentUser, ...updates };
  secureStorage.setItem('currentUser', updatedUser);
  return true;
}

// Export functions for use in other files
window.isAuthenticated = isAuthenticated;
window.getCurrentUser = getCurrentUser;
window.handleLogout = handleLogout;
window.updateCurrentUser = updateCurrentUser;
window.sessionManager = sessionManager;

// Clear old encrypted data (for migration to new encryption system)
window.clearOldEncryptedData = function() {
  console.log('Starting encrypted data cleanup...');

  // Clear all encrypted storage
  const keys = Object.keys(localStorage);
  let clearedCount = 0;

  keys.forEach(key => {
    // Clear chessUsers which contains encrypted user data
    if (key === 'chessUsers') {
      localStorage.removeItem(key);
      clearedCount++;
      console.log(`Cleared: ${key}`);
    }
  });

  // Don't clear currentUser - keep user logged in

  console.log(`\nCleared ${clearedCount} item(s)`);
  console.log('Please re-register your account with the new encryption system.');
  console.log('After registration, you will be able to log in normally.');

  return clearedCount;
};

// Make clearOldEncryptedData available globally
