// Server-side User Management System
// This file handles user data storage and retrieval across multiple devices

const fs = require('fs');
const path = require('path');

// User data storage directory
const USERS_DIR = path.join(__dirname, 'users');
const USERS_FILE = path.join(USERS_DIR, 'users.json');

// Initialize user storage
function initializeUserStorage() {
  try {
    if (!fs.existsSync(USERS_DIR)) {
      fs.mkdirSync(USERS_DIR, { recursive: true });
      console.log('[User Manager] Users directory created');
    }

    if (!fs.existsSync(USERS_FILE)) {
      fs.writeFileSync(USERS_FILE, JSON.stringify({}, null, 2));
      console.log('[User Manager] Users file initialized');
    }
  } catch (error) {
    console.error('[User Manager] Error initializing storage:', error);
  }
}

// Load all users from storage
function loadUsers() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = fs.readFileSync(USERS_FILE, 'utf8');
      return JSON.parse(data);
    }
    return {};
  } catch (error) {
    console.error('[User Manager] Error loading users:', error);
    return {};
  }
}

// Save all users to storage
function saveUsers(users) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    return true;
  } catch (error) {
    console.error('[User Manager] Error saving users:', error);
    return false;
  }
}

// Get user by username
function getUser(username) {
  const users = loadUsers();
  return users[username.toLowerCase()] || null;
}

// Get user by email
function getUserByEmail(email) {
  const users = loadUsers();
  for (const username in users) {
    if (users[username].email === email) {
      return users[username];
    }
  }
  return null;
}

// Create or update user
function saveUser(userData) {
  const users = loadUsers();
  const username = userData.username.toLowerCase();

  // Preserve existing data if updating
  if (users[username]) {
    users[username] = {
      ...users[username],
      ...userData,
      updatedAt: new Date().toISOString()
    };
  } else {
    users[username] = {
      ...userData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  return saveUsers(users);
}

// Update user statistics
function updateUserStats(username, stats) {
  const users = loadUsers();
  const usernameLower = username.toLowerCase();

  if (users[usernameLower]) {
    users[usernameLower].stats = {
      ...users[usernameLower].stats,
      ...stats
    };
    users[usernameLower].updatedAt = new Date().toISOString();
    return saveUsers(users);
  }

  return false;
}

// Add friend to user
function addFriend(username, friendUsername) {
  const users = loadUsers();
  const usernameLower = username.toLowerCase();
  const friendLower = friendUsername.toLowerCase();

  if (users[usernameLower] && users[friendLower]) {
    if (!users[usernameLower].friends) {
      users[usernameLower].friends = [];
    }
    if (!users[usernameLower].friends.includes(friendLower)) {
      users[usernameLower].friends.push(friendLower);
      users[usernameLower].updatedAt = new Date().toISOString();
      return saveUsers(users);
    }
  }

  return false;
}

// Remove friend from user
function removeFriend(username, friendUsername) {
  const users = loadUsers();
  const usernameLower = username.toLowerCase();
  const friendLower = friendUsername.toLowerCase();

  if (users[usernameLower] && users[usernameLower].friends) {
    const index = users[usernameLower].friends.indexOf(friendLower);
    if (index > -1) {
      users[usernameLower].friends.splice(index, 1);
      users[usernameLower].updatedAt = new Date().toISOString();
      return saveUsers(users);
    }
  }

  return false;
}

// Save game for user
function saveGameForUser(username, gameData) {
  const users = loadUsers();
  const usernameLower = username.toLowerCase();

  if (users[usernameLower]) {
    if (!users[usernameLower].savedGames) {
      users[usernameLower].savedGames = [];
    }
    users[usernameLower].savedGames.push({
      ...gameData,
      savedAt: new Date().toISOString()
    });
    users[usernameLower].updatedAt = new Date().toISOString();
    return saveUsers(users);
  }

  return false;
}

// Get all users
function getAllUsers() {
  return loadUsers();
}

// Delete user
function deleteUser(username) {
  const users = loadUsers();
  const usernameLower = username.toLowerCase();

  if (users[usernameLower]) {
    delete users[usernameLower];
    return saveUsers(users);
  }

  return false;
}

// Verify user credentials
function verifyUser(username, password) {
  const user = getUser(username);
  if (user && user.password === password) {
    return user;
  }
  return null;
}

// Update user level and XP
function updateUserLevel(username, xpGained) {
  const users = loadUsers();
  const usernameLower = username.toLowerCase();

  if (users[usernameLower]) {
    const currentXP = users[usernameLower].xp || 0;
    const newXP = currentXP + xpGained;
    const currentLevel = users[usernameLower].level || 1;
    const newLevel = Math.floor(newXP / 1000) + 1;

    users[usernameLower].xp = newXP;
    users[usernameLower].level = newLevel;
    users[usernameLower].updatedAt = new Date().toISOString();

    return saveUsers(users);
  }

  return false;
}

// Get user statistics
function getUserStats(username) {
  const user = getUser(username);
  if (user) {
    return user.stats || {
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      currentStreak: 0
    };
  }
  return null;
}

// Initialize on load
initializeUserStorage();

// Export functions
module.exports = {
  initializeUserStorage,
  loadUsers,
  saveUsers,
  getUser,
  getUserByEmail,
  saveUser,
  updateUserStats,
  addFriend,
  removeFriend,
  saveGameForUser,
  getAllUsers,
  deleteUser,
  verifyUser,
  updateUserLevel,
  getUserStats
};
