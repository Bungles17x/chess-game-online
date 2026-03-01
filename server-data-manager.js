// Server Data Manager - Centralized Data Sync with Server
// This file handles all data synchronization between client and server

class ServerDataManager {
  constructor() {
    this.syncQueue = [];
    this.isSyncing = false;
    this.syncInterval = null;
    this.initialized = false;

    this.init();
  }

  init() {
    if (this.initialized) return;

    // Listen for socket connection
    window.addEventListener('socketConnected', () => {
      this.syncAllData();
    });

    // Set up periodic sync (every 30 seconds)
    this.syncInterval = setInterval(() => {
      this.syncAllData();
    }, 30000);

    this.initialized = true;
    console.log('[Server Data Manager] Initialized');
  }

  // Sync all data with server
  syncAllData() {
    if (!window.socket || window.socket.readyState !== WebSocket.OPEN) {
      console.log('[Server Data Manager] WebSocket not connected, skipping sync');
      return;
    }

    if (this.isSyncing) {
      console.log('[Server Data Manager] Sync already in progress, queuing');
      return;
    }

    this.isSyncing = true;
    console.log('[Server Data Manager] Starting full data sync');

    // Sync user data
    this.syncUserData();

    // Sync friends
    this.syncFriends();

    // Sync saved games
    this.syncSavedGames();

    // Sync achievements
    this.syncAchievements();

    this.isSyncing = false;
  }

  // Sync user data (XP, level, stats)
  syncUserData() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
    if (!currentUser) return;

    window.socket.send(JSON.stringify({
      type: 'syncUserData',
      userData: currentUser
    }));

    console.log('[Server Data Manager] Synced user data');
  }

  // Sync friends list
  syncFriends() {
    const allFriends = JSON.parse(localStorage.getItem('allFriends') || '[]');
    const onlineFriends = JSON.parse(localStorage.getItem('onlineFriends') || '[]');

    window.socket.send(JSON.stringify({
      type: 'syncFriends',
      friends: allFriends,
      onlineFriends: onlineFriends
    }));

    console.log('[Server Data Manager] Synced friends');
  }

  // Sync saved games
  syncSavedGames() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
    if (!currentUser || !currentUser.savedGames) return;

    window.socket.send(JSON.stringify({
      type: 'syncSavedGames',
      savedGames: currentUser.savedGames
    }));

    console.log('[Server Data Manager] Synced saved games');
  }

  // Sync achievements
  syncAchievements() {
    const achievements = JSON.parse(localStorage.getItem('chessAchievements') || '{}');
    const rewards = JSON.parse(localStorage.getItem('chessRewards') || '{}');

    window.socket.send(JSON.stringify({
      type: 'syncAchievements',
      achievements: achievements,
      rewards: rewards
    }));

    console.log('[Server Data Manager] Synced achievements');
  }

  // Update user data (XP, level, stats)
  updateUserData(data) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
    if (!currentUser) return;

    // Update user data
    Object.assign(currentUser, data);

    // Save to local storage (as backup)
    localStorage.setItem('currentUser', JSON.stringify(currentUser));

    // Sync with server
    this.syncUserData();

    console.log('[Server Data Manager] Updated user data');
  }

  // Add saved game
  addSavedGame(gameData) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
    if (!currentUser) return;

    if (!currentUser.savedGames) {
      currentUser.savedGames = [];
    }

    // Check if game already exists
    const existingIndex = currentUser.savedGames.findIndex(
      sg => sg.fen === gameData.fen && sg.pgn === gameData.pgn
    );

    if (existingIndex !== -1) {
      // Update existing game
      currentUser.savedGames[existingIndex] = {
        ...currentUser.savedGames[existingIndex],
        date: new Date().toISOString(),
        ...gameData
      };
    } else {
      // Add new game
      currentUser.savedGames.push({
        ...gameData,
        date: new Date().toISOString()
      });
    }

    // Save to local storage (as backup)
    localStorage.setItem('currentUser', JSON.stringify(currentUser));

    // Sync with server
    this.syncSavedGames();

    console.log('[Server Data Manager] Added saved game');
  }

  // Update achievement
  updateAchievement(achievementId, data) {
    const achievements = JSON.parse(localStorage.getItem('chessAchievements') || '{}');

    if (!achievements[achievementId]) {
      achievements[achievementId] = {};
    }

    Object.assign(achievements[achievementId], data);

    // Save to local storage (as backup)
    localStorage.setItem('chessAchievements', JSON.stringify(achievements));

    // Sync with server
    this.syncAchievements();

    console.log('[Server Data Manager] Updated achievement:', achievementId);
  }

  // Handle server response
  handleServerResponse(data) {
    switch (data.type) {
      case 'userDataSynced':
        console.log('[Server Data Manager] User data synced with server');
        break;

      case 'friendsSynced':
        console.log('[Server Data Manager] Friends synced with server');
        break;

      case 'savedGamesSynced':
        console.log('[Server Data Manager] Saved games synced with server');
        break;

      case 'achievementsSynced':
        console.log('[Server Data Manager] Achievements synced with server');
        break;

      case 'error':
        console.error('[Server Data Manager] Server error:', data.message);
        break;
    }
  }

  // Stop periodic sync
  stopSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('[Server Data Manager] Stopped periodic sync');
    }
  }
}

// Create global instance
window.serverDataManager = new ServerDataManager();

// Make it available globally
window.ServerDataManager = ServerDataManager;

console.log('[Server Data Manager] Loaded');
