// Authentication JavaScript

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
});

// Setup login form
function setupLoginForm(loginForm) {
  if (!loginForm) return;

  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();

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

    if (password.length < 6) {
      showError('Password must be at least 6 characters');
      return;
    }

    // Check if user exists in localStorage
    const users = JSON.parse(localStorage.getItem('chessUsers') || '[]');
    
    // Allow login with either email or username
    const user = users.find(u => 
      (u.email === email || u.username === email) && 
      u.password === password
    );

    if (!user) {
      showError('Invalid email/username or password');
      return;
    }
    
    // Check if user is banned
    // Exempt admin account from ban check
    if (user.username.toLowerCase() === 'bungles17x') {
      console.log("AUTH", "Admin account exempted from ban check", { username: user.username });
      // Clear any existing ban data for admin account
      localStorage.removeItem('botModeBan');
      localStorage.removeItem('bannedUsername');
      localStorage.removeItem('isUserBanned');
      localStorage.removeItem('showBanAfterLogin');
    } else {
      const banData = localStorage.getItem('botModeBan');
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
          // Store the username of the banned user
          localStorage.setItem('bannedUsername', user.username);
          // Store the ban data to show modal after login
          localStorage.setItem('showBanAfterLogin', 'true');
        } else {
          // Ban has expired, clear all ban-related data only for bungles17x
          if (user.username === 'bungles17x') {
            localStorage.removeItem('botModeBan');
            localStorage.removeItem('bannedUsername');
            localStorage.removeItem('isUserBanned');
            localStorage.removeItem('showBanAfterLogin');
            localStorage.removeItem('banExpiresAt');
            localStorage.removeItem('banReason');
          }
        }
      }
    }
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
      createdAt: user.createdAt
    };
    localStorage.setItem('currentUser', JSON.stringify(safeUser));

    if (rememberMe) {
      localStorage.setItem('rememberedUser', email);
    } else {
      localStorage.removeItem('rememberedUser');
    }

    // Redirect to game
    window.location.href = 'index.html';
  });

  // Load remembered user
  const rememberedEmail = localStorage.getItem('rememberedUser');
  if (rememberedEmail) {
    document.getElementById('email').value = rememberedEmail;
    document.getElementById('remember-me').checked = true;
  }
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

    if (username.length < 3) {
      showError('Username must be at least 3 characters');
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

    if (password.length < 6) {
      showError('Password must be at least 6 characters');
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
      showError('You must agree to the Terms of Service');
      return;
    }

    // Check if user already exists
    const users = JSON.parse(localStorage.getItem('chessUsers') || '[]');

    if (users.find(u => u.email === email)) {
      showError('An account with this email already exists');
      return;
    }

    if (users.find(u => u.username === username)) {
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
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    localStorage.setItem('chessUsers', JSON.stringify(users));
    
    // Create a safe user object without password and email for localStorage
    const safeUser = {
      id: newUser.id,
      username: newUser.username,
      avatar: newUser.avatar,
      level: newUser.level,
      xp: newUser.xp,
      stats: newUser.stats,
      savedGames: newUser.savedGames,
      createdAt: newUser.createdAt
    };
    localStorage.setItem('currentUser', JSON.stringify(safeUser));

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
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');

  // No additional logic needed - Settings button always navigates to settings page
  // All login/register functionality is now in settings.html
}

// Handle logout
function handleLogout() {
  localStorage.removeItem('currentUser');
  window.location.href = 'index.html';
}

// Validate email format
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// Show error message
function showError(message) {
  // Create error alert
  const alertDiv = document.createElement('div');
  alertDiv.className = 'auth-alert error';
  alertDiv.textContent = message;

  // Insert after form header
  const authHeader = document.querySelector('.auth-header');
  authHeader.insertAdjacentElement('afterend', alertDiv);

  // Remove after 3 seconds
  setTimeout(() => {
    alertDiv.remove();
  }, 3000);
}

// Check if user is authenticated
function isAuthenticated() {
  return localStorage.getItem('currentUser') !== null;
}

// Get current user
function getCurrentUser() {
  return JSON.parse(localStorage.getItem('currentUser') || 'null');
}

// Export functions for use in other files
window.isAuthenticated = isAuthenticated;
window.getCurrentUser = getCurrentUser;
window.handleLogout = handleLogout;
