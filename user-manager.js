// Server-side User Management System
// This file handles user data storage and retrieval across multiple devices
// Enhanced with backup system, data validation, and improved error recovery

const fs = require('fs');
const path = require('path');

// User data storage directory
const USERS_DIR = path.join(__dirname, 'users');
const USERS_FILE = path.join(USERS_DIR, 'users.json');
const BACKUP_DIR = path.join(USERS_DIR, 'backups');
const MAX_BACKUPS = 5;

// Initialize user storage
function initializeUserStorage() {
  try {
    if (!fs.existsSync(USERS_DIR)) {
      fs.mkdirSync(USERS_DIR, { recursive: true });
      console.log('[User Manager] Users directory created');
    }

    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
      console.log('[User Manager] Backup directory created');
    }

    if (!fs.existsSync(USERS_FILE)) {
      fs.writeFileSync(USERS_FILE, JSON.stringify({}, null, 2));
      console.log('[User Manager] Users file initialized');
    } else {
      // Validate existing users file
      validateUserData();
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
    // Create backup before saving
    createBackup();

    // Save users data
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    return true;
  } catch (error) {
    console.error('[User Manager] Error saving users:', error);
    // Attempt to restore from backup
    restoreFromBackup();
    return false;
  }
}

// Create backup of users data
function createBackup() {
  try {
    if (!fs.existsSync(USERS_FILE)) {
      return false;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(BACKUP_DIR, `users-backup-${timestamp}.json`);

    // Copy current users file to backup
    fs.copyFileSync(USERS_FILE, backupFile);

    // Clean old backups
    cleanOldBackups();

    console.log(`[User Manager] Backup created: ${path.basename(backupFile)}`);
    return true;
  } catch (error) {
    console.error('[User Manager] Error creating backup:', error);
    return false;
  }
}

// Clean old backups, keeping only MAX_BACKUPS
function cleanOldBackups() {
  try {
    const backups = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.startsWith('users-backup-') && file.endsWith('.json'))
      .map(file => ({
        name: file,
        path: path.join(BACKUP_DIR, file),
        time: fs.statSync(path.join(BACKUP_DIR, file)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time);

    // Remove excess backups
    if (backups.length > MAX_BACKUPS) {
      backups.slice(MAX_BACKUPS).forEach(backup => {
        fs.unlinkSync(backup.path);
        console.log(`[User Manager] Removed old backup: ${backup.name}`);
      });
    }
  } catch (error) {
    console.error('[User Manager] Error cleaning backups:', error);
  }
}

// Restore from latest backup
function restoreFromBackup() {
  try {
    const backups = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.startsWith('users-backup-') && file.endsWith('.json'))
      .map(file => ({
        name: file,
        path: path.join(BACKUP_DIR, file),
        time: fs.statSync(path.join(BACKUP_DIR, file)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time);

    if (backups.length > 0) {
      const latestBackup = backups[0];
      fs.copyFileSync(latestBackup.path, USERS_FILE);
      console.log(`[User Manager] Restored from backup: ${latestBackup.name}`);
      return true;
    }

    console.log('[User Manager] No backups available to restore');
    return false;
  } catch (error) {
    console.error('[User Manager] Error restoring from backup:', error);
    return false;
  }
}

// Validate user data structure
function validateUserData() {
  try {
    const users = loadUsers();
    let isValid = true;
    let errors = [];

    for (const username in users) {
      const user = users[username];

      // Check required fields
      if (!user.username) {
        errors.push(`User missing username: ${username}`);
        isValid = false;
      }
      if (!user.email) {
        errors.push(`User ${username} missing email`);
        isValid = false;
      }
      if (!user.password) {
        errors.push(`User ${username} missing password`);
        isValid = false;
      }

      // Validate stats structure
      if (user.stats) {
        const requiredStats = ['gamesPlayed', 'wins', 'losses', 'draws', 'currentStreak'];
        requiredStats.forEach(stat => {
          if (typeof user.stats[stat] !== 'number') {
            user.stats[stat] = 0;
          }
        });
      }

      // Validate level and XP
      if (typeof user.level !== 'number' || user.level < 1) {
        user.level = 1;
      }
      if (typeof user.xp !== 'number' || user.xp < 0) {
        user.xp = 0;
      }
    }

    if (!isValid) {
      console.error('[User Manager] Validation errors:', errors);
      // Save corrected data
      saveUsers(users);
    } else {
      console.log('[User Manager] User data validation passed');
    }

    return isValid;
  } catch (error) {
    console.error('[User Manager] Error validating user data:', error);
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

// Add achievement to user
function addAchievement(username, achievementId, achievementData) {
  const users = loadUsers();
  const usernameLower = username.toLowerCase();

  if (users[usernameLower]) {
    if (!users[usernameLower].achievements) {
      users[usernameLower].achievements = [];
    }

    // Check if achievement already exists
    const exists = users[usernameLower].achievements.some(a => a.id === achievementId);
    if (!exists) {
      users[usernameLower].achievements.push({
        id: achievementId,
        ...achievementData,
        earnedAt: new Date().toISOString()
      });
      users[usernameLower].updatedAt = new Date().toISOString();
      return saveUsers(users);
    }
  }

  return false;
}

// Get user achievements
function getUserAchievements(username) {
  const user = getUser(username);
  if (user) {
    return user.achievements || [];
  }
  return [];
}

// Add reward to user
function addReward(username, rewardId, rewardData) {
  const users = loadUsers();
  const usernameLower = username.toLowerCase();

  if (users[usernameLower]) {
    if (!users[usernameLower].rewards) {
      users[usernameLower].rewards = [];
    }

    // Check if reward already exists
    const exists = users[usernameLower].rewards.some(r => r.id === rewardId);
    if (!exists) {
      users[usernameLower].rewards.push({
        id: rewardId,
        ...rewardData,
        unlockedAt: new Date().toISOString()
      });
      users[usernameLower].updatedAt = new Date().toISOString();
      return saveUsers(users);
    }
  }

  return false;
}

// Get user rewards
function getUserRewards(username) {
  const user = getUser(username);
  if (user) {
    return user.rewards || [];
  }
  return [];
}

// Update user season data
function updateUserSeason(username, seasonData) {
  const users = loadUsers();
  const usernameLower = username.toLowerCase();

  if (users[usernameLower]) {
    users[usernameLower].seasonData = {
      ...users[usernameLower].seasonData,
      ...seasonData,
      lastUpdated: new Date().toISOString()
    };
    users[usernameLower].updatedAt = new Date().toISOString();
    return saveUsers(users);
  }

  return false;
}

// Get user season data
function getUserSeason(username) {
  const user = getUser(username);
  if (user) {
    return user.seasonData || {
      currentSeason: 1,
      seasonXP: 0,
      seasonLevel: 1,
      seasonAchievements: [],
      seasonRewards: []
    };
  }
  return null;
}

// Update user settings
function updateUserSettings(username, settings) {
  const users = loadUsers();
  const usernameLower = username.toLowerCase();

  if (users[usernameLower]) {
    users[usernameLower].settings = {
      ...users[usernameLower].settings,
      ...settings
    };
    users[usernameLower].updatedAt = new Date().toISOString();
    return saveUsers(users);
  }

  return false;
}

// Get user settings
function getUserSettings(username) {
  const user = getUser(username);
  if (user) {
    return user.settings || {};
  }
  return {};
}

// Get user by ID
function getUserById(userId) {
  const users = loadUsers();
  for (const username in users) {
    if (users[username].id === userId) {
      return users[username];
    }
  }
  return null;
}

// Search users by partial username
function searchUsers(query) {
  const users = loadUsers();
  const queryLower = query.toLowerCase();
  const results = [];

  for (const username in users) {
    const user = users[username];
    if (username.includes(queryLower) || 
        user.email?.toLowerCase().includes(queryLower)) {
      results.push({
        username: user.username,
        email: user.email,
        level: user.level || 1,
        xp: user.xp || 0,
        avatar: user.avatar
      });
    }
  }

  return results;
}

// Get user activity log
function getUserActivityLog(username) {
  const user = getUser(username);
  if (user) {
    return user.activityLog || [];
  }
  return [];
}

// Add activity to user log
function addActivity(username, activity) {
  const users = loadUsers();
  const usernameLower = username.toLowerCase();

  if (users[usernameLower]) {
    if (!users[usernameLower].activityLog) {
      users[usernameLower].activityLog = [];
    }

    users[usernameLower].activityLog.unshift({
      ...activity,
      timestamp: new Date().toISOString()
    });

    // Keep only last 100 activities
    if (users[usernameLower].activityLog.length > 100) {
      users[usernameLower].activityLog = users[usernameLower].activityLog.slice(0, 100);
    }

    users[usernameLower].updatedAt = new Date().toISOString();
    return saveUsers(users);
  }

  return false;
}

// Batch operations - Update multiple users at once
function batchUpdateUsers(userUpdates) {
  const users = loadUsers();
  let successCount = 0;
  let errors = [];

  userUpdates.forEach(({ username, updates }) => {
    const usernameLower = username.toLowerCase();
    if (users[usernameLower]) {
      try {
        users[usernameLower] = {
          ...users[usernameLower],
          ...updates,
          updatedAt: new Date().toISOString()
        };
        successCount++;
      } catch (error) {
        errors.push({ username, error: error.message });
      }
    } else {
      errors.push({ username, error: 'User not found' });
    }
  });

  const saved = saveUsers(users);
  return {
    success: saved,
    successCount,
    errorCount: errors.length,
    errors
  };
}

// Get user analytics
function getUserAnalytics(username, timeRange = 'all') {
  const user = getUser(username);
  if (!user) {
    return null;
  }

  const now = new Date();
  const timeRanges = {
    day: 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
    month: 30 * 24 * 60 * 60 * 1000,
    all: Infinity
  };

  const cutoffTime = timeRanges[timeRange] || Infinity;
  const activities = user.activityLog || [];
  const filteredActivities = activities.filter(
    activity => now - new Date(activity.timestamp) < cutoffTime
  );

  const stats = user.stats || {};
  const achievements = user.achievements || [];
  const recentAchievements = achievements.filter(
    a => now - new Date(a.earnedAt) < cutoffTime
  );

  return {
    username: user.username,
    level: user.level || 1,
    xp: user.xp || 0,
    stats: {
      gamesPlayed: stats.gamesPlayed || 0,
      wins: stats.wins || 0,
      losses: stats.losses || 0,
      draws: stats.draws || 0,
      currentStreak: stats.currentStreak || 0,
      winRate: stats.gamesPlayed > 0 
        ? ((stats.wins / stats.gamesPlayed) * 100).toFixed(2) 
        : 0
    },
    achievements: {
      total: achievements.length,
      recent: recentAchievements.length,
      recentList: recentAchievements
    },
    activity: {
      total: activities.length,
      recent: filteredActivities.length,
      recentList: filteredActivities.slice(0, 10)
    },
    timeRange
  };
}

// Get global analytics
function getGlobalAnalytics(timeRange = 'all') {
  const users = loadUsers();
  const now = new Date();
  const timeRanges = {
    day: 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
    month: 30 * 24 * 60 * 60 * 1000,
    all: Infinity
  };

  const cutoffTime = timeRanges[timeRange] || Infinity;
  let totalGames = 0;
  let totalWins = 0;
  let totalLosses = 0;
  let totalDraws = 0;
  let totalXP = 0;
  let totalLevel = 0;
  let activeUsers = 0;
  let newUsers = 0;

  Object.values(users).forEach(user => {
    const stats = user.stats || {};
    totalGames += stats.gamesPlayed || 0;
    totalWins += stats.wins || 0;
    totalLosses += stats.losses || 0;
    totalDraws += stats.draws || 0;
    totalXP += user.xp || 0;
    totalLevel += user.level || 1;

    // Count active users (recent activity)
    const activities = user.activityLog || [];
    const recentActivity = activities.some(
      activity => now - new Date(activity.timestamp) < cutoffTime
    );
    if (recentActivity) {
      activeUsers++;
    }

    // Count new users (created in time range)
    if (user.createdAt) {
      const createdTime = new Date(user.createdAt).getTime();
      if (now - createdTime < cutoffTime) {
        newUsers++;
      }
    }
  });

  const userCount = Object.keys(users).length;

  return {
    users: {
      total: userCount,
      active: activeUsers,
      new: newUsers
    },
    games: {
      total: totalGames,
      wins: totalWins,
      losses: totalLosses,
      draws: totalDraws,
      winRate: totalGames > 0 
        ? ((totalWins / totalGames) * 100).toFixed(2) 
        : 0
    },
    progress: {
      totalXP,
      averageXP: userCount > 0 ? Math.round(totalXP / userCount) : 0,
      averageLevel: userCount > 0 ? (totalLevel / userCount).toFixed(2) : 1
    },
    timeRange
  };
}

// Admin functions - Ban user
function banUser(username, reason, duration = null) {
  const users = loadUsers();
  const usernameLower = username.toLowerCase();

  if (users[usernameLower]) {
    users[usernameLower].banned = true;
    users[usernameLower].banReason = reason;
    users[usernameLower].bannedAt = new Date().toISOString();

    if (duration) {
      const expiry = new Date();
      expiry.setHours(expiry.getHours() + duration);
      users[usernameLower].banExpiry = expiry.toISOString();
    }

    users[usernameLower].updatedAt = new Date().toISOString();
    return saveUsers(users);
  }

  return false;
}

// Admin functions - Unban user
function unbanUser(username) {
  const users = loadUsers();
  const usernameLower = username.toLowerCase();

  if (users[usernameLower]) {
    delete users[usernameLower].banned;
    delete users[usernameLower].banReason;
    delete users[usernameLower].bannedAt;
    delete users[usernameLower].banExpiry;
    users[usernameLower].updatedAt = new Date().toISOString();
    return saveUsers(users);
  }

  return false;
}

// Admin functions - Check if user is banned
function isUserBanned(username) {
  const user = getUser(username);
  if (!user || !user.banned) {
    return false;
  }

  // Check if ban has expired
  if (user.banExpiry) {
    const expiry = new Date(user.banExpiry);
    if (new Date() > expiry) {
      unbanUser(username);
      return false;
    }
  }

  return true;
}

// Admin functions - Get banned users
function getBannedUsers() {
  const users = loadUsers();
  const bannedUsers = [];

  for (const username in users) {
    const user = users[username];
    if (user.banned) {
      bannedUsers.push({
        username: user.username,
        email: user.email,
        bannedAt: user.bannedAt,
        banReason: user.banReason,
        banExpiry: user.banExpiry
      });
    }
  }

  return bannedUsers;
}

// Admin functions - Reset user data
function resetUserData(username, fields = []) {
  const users = loadUsers();
  const usernameLower = username.toLowerCase();

  if (users[usernameLower]) {
    const resetFields = fields.length > 0 ? fields : [
      'xp', 'level', 'stats', 'achievements', 'rewards', 
      'savedGames', 'activityLog', 'seasonData'
    ];

    resetFields.forEach(field => {
      if (field === 'xp') users[usernameLower].xp = 0;
      if (field === 'level') users[usernameLower].level = 1;
      if (field === 'stats') {
        users[usernameLower].stats = {
          gamesPlayed: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          currentStreak: 0
        };
      }
      if (field === 'achievements') users[usernameLower].achievements = [];
      if (field === 'rewards') users[usernameLower].rewards = [];
      if (field === 'savedGames') users[usernameLower].savedGames = [];
      if (field === 'activityLog') users[usernameLower].activityLog = [];
      if (field === 'seasonData') {
        users[usernameLower].seasonData = {
          currentSeason: 1,
          seasonXP: 0,
          seasonLevel: 1,
          seasonAchievements: [],
          seasonRewards: []
        };
      }
    });

    users[usernameLower].updatedAt = new Date().toISOString();
    return saveUsers(users);
  }

  return false;
}

// Admin functions - Get system health
function getSystemHealth() {
  try {
    const users = loadUsers();
    const userCount = Object.keys(users).length;
    const backupFiles = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.startsWith('users-backup-') && file.endsWith('.json'));

    return {
      status: 'healthy',
      userCount,
      backupCount: backupFiles.length,
      lastBackup: backupFiles.length > 0 
        ? fs.statSync(path.join(BACKUP_DIR, backupFiles[0])).mtime 
        : null,
      storage: {
        usersFileExists: fs.existsSync(USERS_FILE),
        usersFileSize: fs.existsSync(USERS_FILE) 
          ? fs.statSync(USERS_FILE).size 
          : 0,
        backupDirExists: fs.existsSync(BACKUP_DIR)
      }
    };
  } catch (error) {
    return {
      status: 'error',
      error: error.message
    };
  }
}

// Admin functions - Export user data
function exportUserData(username, format = 'json') {
  const user = getUser(username);
  if (!user) {
    return null;
  }

  if (format === 'json') {
    return JSON.stringify(user, null, 2);
  } else if (format === 'csv') {
    const fields = ['username', 'email', 'level', 'xp', 'createdAt', 'updatedAt'];
    const values = fields.map(field => user[field] || '');
    return fields.join(',') + '\n' + values.join(',');
  }

  return null;
}

// Admin functions - Import user data
function importUserData(userData, overwrite = false) {
  try {
    let user;
    if (typeof userData === 'string') {
      user = JSON.parse(userData);
    } else {
      user = userData;
    }

    const existingUser = getUser(user.username);
    if (existingUser && !overwrite) {
      return {
        success: false,
        error: 'User already exists'
      };
    }

    const users = loadUsers();
    const usernameLower = user.username.toLowerCase();

    users[usernameLower] = {
      ...existingUser,
      ...user,
      importedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const saved = saveUsers(users);
    return {
      success: saved,
      user: users[usernameLower]
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// User Relationships - Send friend request
function sendFriendRequest(fromUsername, toUsername) {
  const users = loadUsers();
  const fromLower = fromUsername.toLowerCase();
  const toLower = toUsername.toLowerCase();

  if (!users[fromLower] || !users[toLower]) {
    return { success: false, error: 'User not found' };
  }

  if (fromLower === toLower) {
    return { success: false, error: 'Cannot send friend request to yourself' };
  }

  // Initialize friend requests arrays
  if (!users[toLower].friendRequests) {
    users[toLower].friendRequests = [];
  }

  // Check if already friends
  if (users[fromLower].friends && users[fromLower].friends.includes(toLower)) {
    return { success: false, error: 'Already friends' };
  }

  // Check if request already sent
  if (users[toLower].friendRequests.some(req => req.from === fromLower)) {
    return { success: false, error: 'Friend request already sent' };
  }

  // Add friend request
  users[toLower].friendRequests.push({
    from: fromLower,
    sentAt: new Date().toISOString()
  });

  users[toLower].updatedAt = new Date().toISOString();
  const saved = saveUsers(users);

  if (saved) {
    // Add notification
    addNotification(toUsername, {
      type: 'friend_request',
      from: fromUsername,
      message: `${fromUsername} sent you a friend request`
    });
  }

  return { success: saved };
}

// User Relationships - Accept friend request
function acceptFriendRequest(username, fromUsername) {
  const users = loadUsers();
  const userLower = username.toLowerCase();
  const fromLower = fromUsername.toLowerCase();

  if (!users[userLower] || !users[fromLower]) {
    return { success: false, error: 'User not found' };
  }

  if (!users[userLower].friendRequests) {
    return { success: false, error: 'No friend requests found' };
  }

  // Find and remove the friend request
  const requestIndex = users[userLower].friendRequests.findIndex(
    req => req.from === fromLower
  );

  if (requestIndex === -1) {
    return { success: false, error: 'Friend request not found' };
  }

  users[userLower].friendRequests.splice(requestIndex, 1);

  // Add to friends lists
  if (!users[userLower].friends) users[userLower].friends = [];
  if (!users[fromLower].friends) users[fromLower].friends = [];

  users[userLower].friends.push(fromLower);
  users[fromLower].friends.push(userLower);

  users[userLower].updatedAt = new Date().toISOString();
  users[fromLower].updatedAt = new Date().toISOString();

  const saved = saveUsers(users);

  if (saved) {
    // Add notification to both users
    addNotification(username, {
      type: 'friend_accepted',
      from: fromUsername,
      message: `You are now friends with ${fromUsername}`
    });

    addNotification(fromUsername, {
      type: 'friend_accepted',
      from: username,
      message: `${username} accepted your friend request`
    });
  }

  return { success: saved };
}

// User Relationships - Reject friend request
function rejectFriendRequest(username, fromUsername) {
  const users = loadUsers();
  const userLower = username.toLowerCase();
  const fromLower = fromUsername.toLowerCase();

  if (!users[userLower]) {
    return { success: false, error: 'User not found' };
  }

  if (!users[userLower].friendRequests) {
    return { success: false, error: 'No friend requests found' };
  }

  const requestIndex = users[userLower].friendRequests.findIndex(
    req => req.from === fromLower
  );

  if (requestIndex === -1) {
    return { success: false, error: 'Friend request not found' };
  }

  users[userLower].friendRequests.splice(requestIndex, 1);
  users[userLower].updatedAt = new Date().toISOString();

  const saved = saveUsers(users);

  return { success: saved };
}

// User Relationships - Get friend requests
function getFriendRequests(username) {
  const user = getUser(username);
  if (!user || !user.friendRequests) {
    return [];
  }

  const users = loadUsers();
  return user.friendRequests.map(req => {
    const requester = users[req.from];
    return {
      from: req.from,
      username: requester ? requester.username : req.from,
      avatar: requester ? requester.avatar : null,
      level: requester ? requester.level : 1,
      sentAt: req.sentAt
    };
  });
}

// User Relationships - Get mutual friends
function getMutualFriends(username1, username2) {
  const user1 = getUser(username1);
  const user2 = getUser(username2);

  if (!user1 || !user2) {
    return [];
  }

  const friends1 = user1.friends || [];
  const friends2 = user2.friends || [];

  const mutual = friends1.filter(friend => friends2.includes(friend));
  const users = loadUsers();

  return mutual.map(username => ({
    username: users[username]?.username || username,
    avatar: users[username]?.avatar || null,
    level: users[username]?.level || 1
  }));
}

// Notifications - Add notification
function addNotification(username, notification) {
  const users = loadUsers();
  const usernameLower = username.toLowerCase();

  if (!users[usernameLower]) {
    return false;
  }

  if (!users[usernameLower].notifications) {
    users[usernameLower].notifications = [];
  }

  users[usernameLower].notifications.unshift({
    ...notification,
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
    read: false
  });

  // Keep only last 50 notifications
  if (users[usernameLower].notifications.length > 50) {
    users[usernameLower].notifications = users[usernameLower].notifications.slice(0, 50);
  }

  users[usernameLower].updatedAt = new Date().toISOString();
  return saveUsers(users);
}

// Notifications - Get notifications
function getNotifications(username, unreadOnly = false) {
  const user = getUser(username);
  if (!user || !user.notifications) {
    return [];
  }

  let notifications = user.notifications;

  if (unreadOnly) {
    notifications = notifications.filter(n => !n.read);
  }

  return notifications;
}

// Notifications - Mark notification as read
function markNotificationRead(username, notificationId) {
  const users = loadUsers();
  const usernameLower = username.toLowerCase();

  if (!users[usernameLower] || !users[usernameLower].notifications) {
    return false;
  }

  const notification = users[usernameLower].notifications.find(
    n => n.id === notificationId
  );

  if (notification) {
    notification.read = true;
    users[usernameLower].updatedAt = new Date().toISOString();
    return saveUsers(users);
  }

  return false;
}

// Notifications - Mark all notifications as read
function markAllNotificationsRead(username) {
  const users = loadUsers();
  const usernameLower = username.toLowerCase();

  if (!users[usernameLower] || !users[usernameLower].notifications) {
    return false;
  }

  users[usernameLower].notifications.forEach(n => {
    n.read = true;
  });

  users[usernameLower].updatedAt = new Date().toISOString();
  return saveUsers(users);
}

// Notifications - Delete notification
function deleteNotification(username, notificationId) {
  const users = loadUsers();
  const usernameLower = username.toLowerCase();

  if (!users[usernameLower] || !users[usernameLower].notifications) {
    return false;
  }

  const index = users[usernameLower].notifications.findIndex(
    n => n.id === notificationId
  );

  if (index !== -1) {
    users[usernameLower].notifications.splice(index, 1);
    users[usernameLower].updatedAt = new Date().toISOString();
    return saveUsers(users);
  }

  return false;
}

// Advanced Search - Search users with filters
function searchUsersAdvanced(filters = {}) {
  const users = loadUsers();
  const results = [];

  for (const username in users) {
    const user = users[username];
    let match = true;

    // Filter by username
    if (filters.username && !user.username.toLowerCase().includes(filters.username.toLowerCase())) {
      match = false;
    }

    // Filter by email
    if (filters.email && !user.email?.toLowerCase().includes(filters.email.toLowerCase())) {
      match = false;
    }

    // Filter by level range
    if (filters.minLevel && (user.level || 1) < filters.minLevel) {
      match = false;
    }
    if (filters.maxLevel && (user.level || 1) > filters.maxLevel) {
      match = false;
    }

    // Filter by XP range
    if (filters.minXP && (user.xp || 0) < filters.minXP) {
      match = false;
    }
    if (filters.maxXP && (user.xp || 0) > filters.maxXP) {
      match = false;
    }

    // Filter by online status
    if (filters.onlineOnly && !user.isOnline) {
      match = false;
    }

    // Filter by registration date
    if (filters.registeredAfter) {
      const regDate = new Date(user.createdAt || 0);
      if (regDate < new Date(filters.registeredAfter)) {
        match = false;
      }
    }
    if (filters.registeredBefore) {
      const regDate = new Date(user.createdAt || 0);
      if (regDate > new Date(filters.registeredBefore)) {
        match = false;
      }
    }

    // Filter by friends only
    if (filters.friendsOf) {
      const friendUser = getUser(filters.friendsOf);
      if (!friendUser || !friendUser.friends || !friendUser.friends.includes(username)) {
        match = false;
      }
    }

    // Filter by achievements
    if (filters.hasAchievement) {
      if (!user.achievements || !user.achievements.some(a => a.id === filters.hasAchievement)) {
        match = false;
      }
    }

    // Filter by ban status
    if (filters.bannedOnly && !user.banned) {
      match = false;
    }
    if (filters.notBannedOnly && user.banned) {
      match = false;
    }

    if (match) {
      results.push({
        username: user.username,
        email: user.email,
        level: user.level || 1,
        xp: user.xp || 0,
        avatar: user.avatar,
        isOnline: user.isOnline || false,
        createdAt: user.createdAt,
        lastActive: user.lastActive,
        stats: user.stats,
        achievements: user.achievements?.length || 0
      });
    }
  }

  // Sort results
  if (filters.sortBy) {
    results.sort((a, b) => {
      if (filters.sortBy === 'level') return b.level - a.level;
      if (filters.sortBy === 'xp') return b.xp - a.xp;
      if (filters.sortBy === 'username') return a.username.localeCompare(b.username);
      if (filters.sortBy === 'createdAt') return new Date(b.createdAt) - new Date(a.createdAt);
      return 0;
    });
  }

  // Limit results
  if (filters.limit && filters.limit > 0) {
    return results.slice(0, filters.limit);
  }

  return results;
}

// Leaderboard - Get top users by XP
function getLeaderboard(limit = 10, timeRange = 'all') {
  const users = loadUsers();
  const now = new Date();
  const timeRanges = {
    day: 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
    month: 30 * 24 * 60 * 60 * 1000,
    all: Infinity
  };

  const cutoffTime = timeRanges[timeRange] || Infinity;
  const leaderboard = [];

  for (const username in users) {
    const user = users[username];
    if (user.banned) continue;

    let xp = user.xp || 0;

    // Filter by time range if not 'all'
    if (timeRange !== 'all' && user.activityLog) {
      const recentActivities = user.activityLog.filter(
        activity => now - new Date(activity.timestamp) < cutoffTime
      );
      // Calculate XP from recent activities
      xp = recentActivities.reduce((sum, activity) => sum + (activity.xpGained || 0), 0);
    }

    leaderboard.push({
      username: user.username,
      level: user.level || 1,
      xp: xp,
      avatar: user.avatar,
      stats: user.stats || {}
    });
  }

  // Sort by XP descending
  leaderboard.sort((a, b) => b.xp - a.xp);

  // Return top N users
  return leaderboard.slice(0, limit);
}

// User Status - Update online status
function updateOnlineStatus(username, isOnline) {
  const users = loadUsers();
  const usernameLower = username.toLowerCase();

  if (!users[usernameLower]) {
    return false;
  }

  users[usernameLower].isOnline = isOnline;
  users[usernameLower].lastActive = new Date().toISOString();
  users[usernameLower].updatedAt = new Date().toISOString();

  return saveUsers(users);
}

// User Status - Get online users
function getOnlineUsers() {
  const users = loadUsers();
  const onlineUsers = [];

  for (const username in users) {
    const user = users[username];
    if (user.isOnline && !user.banned) {
      onlineUsers.push({
        username: user.username,
        level: user.level || 1,
        avatar: user.avatar,
        lastActive: user.lastActive
      });
    }
  }

  return onlineUsers;
}

// User Status - Get recently active users
function getRecentlyActiveUsers(minutes = 30) {
  const users = loadUsers();
  const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);
  const activeUsers = [];

  for (const username in users) {
    const user = users[username];
    if (user.banned) continue;

    const lastActive = user.lastActive ? new Date(user.lastActive) : null;
    if (lastActive && lastActive > cutoffTime) {
      activeUsers.push({
        username: user.username,
        level: user.level || 1,
        avatar: user.avatar,
        lastActive: user.lastActive
      });
    }
  }

  return activeUsers;
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
  getUserById,
  saveUser,
  updateUserStats,
  addFriend,
  removeFriend,
  saveGameForUser,
  getAllUsers,
  deleteUser,
  verifyUser,
  updateUserLevel,
  getUserStats,
  addAchievement,
  getUserAchievements,
  addReward,
  getUserRewards,
  updateUserSeason,
  getUserSeason,
  updateUserSettings,
  getUserSettings,
  searchUsers,
  getUserActivityLog,
  addActivity,
  createBackup,
  restoreFromBackup,
  validateUserData,
  batchUpdateUsers,
  getUserAnalytics,
  getGlobalAnalytics,
  banUser,
  unbanUser,
  isUserBanned,
  getBannedUsers,
  resetUserData,
  getSystemHealth,
  exportUserData,
  importUserData,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  getFriendRequests,
  getMutualFriends,
  addNotification,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  searchUsersAdvanced,
  getLeaderboard,
  updateOnlineStatus
};
