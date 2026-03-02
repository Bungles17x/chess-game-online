// Authentication JavaScript

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  // Get DOM elements after page loads
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const loginBtn = document.getElementById('login-btn');
  const registerBtn = document.getElementById('register-btn');
  
  setupLoginForm(loginForm);
  
  // Only setup register form if not on settings.html (settings.js handles it)
  if (!window.location.pathname.includes('settings.html')) {
    setupRegisterForm(registerForm);
  }
  
  setupAuthButtons(loginBtn, registerBtn);
});

// Setup login form
function setupLoginForm(loginForm) {
  if (!loginForm) return;

  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const emailElement = document.getElementById('email');
    const passwordElement = document.getElementById('password');
    const rememberMeElement = document.getElementById('remember-me');
    
    // Check if elements exist before accessing their properties
    if (!emailElement || !passwordElement || !rememberMeElement) {
      showError('Form elements not found. Please refresh the page.');
      return;
    }
    
    const email = emailElement.value.trim();
    const password = passwordElement.value;
    const rememberMe = rememberMeElement.checked;

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

    // Always try to authenticate with server first
    if (window.socket && window.socket.readyState === WebSocket.OPEN) {
      const isEmail = email.includes('@');
      
      window.socket.send(JSON.stringify({
        type: 'login',
        email: isEmail ? email : undefined,
        username: isEmail ? undefined : email,
        password: password
      }));
      console.log('[Auth] Login request sent to server');
      
      // Listen for login response
      const handleLoginResponse = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'loggedIn' || data.type === 'loginSuccess') {
          console.log('[Auth] Login successful on server:', data);
          
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
          
          // Redirect to game
          setTimeout(() => {
            window.location.href = 'index.html';
          }, 500);
        } else if (data.type === 'error') {
          console.error('[Auth] Login failed on server:', data.message);
          showError(data.message || 'Login failed');
        }
        
        // Remove the event listener
        window.socket.removeEventListener('message', handleLoginResponse);
      };
      
      window.socket.addEventListener('message', handleLoginResponse);
      
      // Timeout after 10 seconds
      setTimeout(() => {
        window.socket.removeEventListener('message', handleLoginResponse);
      }, 10000);
      
      return; // Don't proceed with local login
    }
    
    // Fallback to local storage if server is not available
    const users = secureStorage.getItem('chessUsers') || [];
    
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

    // Sync user data to server if connected
    if (window.socket && window.socket.readyState === WebSocket.OPEN) {
      try {
        window.socket.send(JSON.stringify({
          type: 'syncUserData',
          userData: safeUser
        }));
        console.log('[Auth] User data synced to server');
      } catch (error) {
        console.error('[Auth] Failed to sync user data to server:', error);
        // Don't block login if sync fails
      }
    }

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

    const usernameElement = document.getElementById('reg-username');
    const emailElement = document.getElementById('reg-email');
    const passwordElement = document.getElementById('reg-password');
    const confirmPasswordElement = document.getElementById('reg-confirm-password');
    
    // Check if elements exist before accessing their properties
    if (!usernameElement || !emailElement || !passwordElement || !confirmPasswordElement) {
      showError('Form elements not found. Please refresh the page.');
      return;
    }
    
    const username = usernameElement.value.trim();
    const email = emailElement.value.trim();
    const password = passwordElement.value;
    const confirmPassword = confirmPasswordElement.value;

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



    // Always try to register on server first
    if (window.socket && window.socket.readyState === WebSocket.OPEN) {
      window.socket.send(JSON.stringify({
        type: 'register',
        username: username,
        email: email,
        password: password
      }));
      console.log('[Auth] Registration request sent to server');
      
      // Listen for registration response
      const handleRegisterResponse = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'registered' || data.type === 'registerSuccess') {
          console.log('[Auth] Registration successful on server:', data);
          
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
          
          // Redirect to game
          setTimeout(() => {
            window.location.href = 'index.html';
          }, 500);
        } else if (data.type === 'error') {
          console.error('[Auth] Registration failed on server:', data.message);
          showError(data.message || 'Registration failed');
        }
        
        // Remove the event listener
        window.socket.removeEventListener('message', handleRegisterResponse);
      };
      
      window.socket.addEventListener('message', handleRegisterResponse);
      
      // Timeout after 10 seconds
      setTimeout(() => {
        window.socket.removeEventListener('message', handleRegisterResponse);
      }, 10000);
      
      return; // Don't proceed with local registration
    }
    
    // Fallback to local storage if server is not available
    // Check if user already exists
    const users = secureStorage.getItem('chessUsers') || [];

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
      createdAt: newUser.createdAt
    };
    localStorage.setItem('currentUser', JSON.stringify(safeUser));

    // Register user on server if connected
    if (window.socket && window.socket.readyState === WebSocket.OPEN) {
      try {
        window.socket.send(JSON.stringify({
          type: 'register',
          username: username,
          email: email,
          password: password
        }));
        console.log('[Auth] Registration request sent to server');
        
        // Listen for registration response
        const handleRegisterResponse = (event) => {
          const data = JSON.parse(event.data);
          
          if (data.type === 'registered' || data.type === 'registerSuccess') {
            console.log('[Auth] Registration successful on server:', data);
            // User is already logged in locally, no action needed
          } else if (data.type === 'error') {
            console.error('[Auth] Registration failed on server:', data.message);
            // Don't block registration if server registration fails
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
        console.error('[Auth] Failed to send registration to server:', error);
        // Don't block registration if server communication fails
      }
    }

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
  
  // Position at top center
  alertDiv.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, var(--danger), #dc2626);
    color: white;
    padding: 16px 24px;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    z-index: 99999;
    animation: slideInTop 0.3s ease-out;
    max-width: 400px;
    text-align: center;
  `;

  document.body.appendChild(alertDiv);

  // Remove after 3 seconds
  setTimeout(() => {
    alertDiv.style.animation = 'slideOutTop 0.3s ease-out';
    setTimeout(() => {
      alertDiv.remove();
    }, 300);
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

// Global WebSocket message handlers
if (window.socket) {
  window.socket.addEventListener('message', (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log('[Auth] Received message from server:', data.type);

      // Handle authentication confirmation (from handleAuthenticate)
      if (data.type === 'authenticated') {
        console.log('[Auth] Authentication confirmation received:', data);
        // Just store username on socket, no action needed
        if (window.socket) {
          window.socket.username = data.username;
        }
      }

      // Handle login confirmation
      if (data.type === 'loggedIn') {
        console.log('[Auth] Login confirmation received:', data);
        
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
        if (window.checkLoginStatus) {
          window.checkLoginStatus();
        }
      }

      // Handle registration confirmation
      if (data.type === 'registered') {
        console.log('[Auth] Registration confirmation received:', data);
        
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
        if (window.checkLoginStatus) {
          window.checkLoginStatus();
        }
      }

      // Handle account deletion notification
      if (data.type === 'accountDeleted') {
        console.log('[Auth] Account deleted notification received:', data);
        
        // Clear ALL local data
        const allKeys = Object.keys(localStorage);
        allKeys.forEach(key => {
          localStorage.removeItem(key);
          console.log('[Auth] Removed local storage key:', key);
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
        if (window.checkLoginStatus) {
          window.checkLoginStatus();
        }

        // Redirect to home after delay
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 2000);
      }

      // Handle report system fix acknowledgment
      if (data.type === 'reportSystemFixAck') {
        console.log('[Auth] Report system fix acknowledged:', data.message);
        // This is just an acknowledgment, no action needed
      }
    } catch (error) {
      console.error('[Auth] Error processing message:', error);
    }
  });
}
console.log('To clear old encrypted data, run: clearOldEncryptedData()');
