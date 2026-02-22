// Client-side User Synchronization System
// This file handles cross-device profile synchronization

// Function to clear old encrypted data
function clearOldEncryptedData() {
  console.log('[User Sync] Clearing old encrypted data...');

  try {
    // Clear corrupted chessUsers data
    const chessUsers = localStorage.getItem('chessUsers');
    if (chessUsers) {
      try {
        JSON.parse(chessUsers);
      } catch (error) {
        console.log('[User Sync] Found corrupted chessUsers data, clearing it...');
        localStorage.removeItem('chessUsers');
      }
    }

    // Clear other potentially corrupted data
    const keysToRemove = ['encryptedData', 'userEncryptedData', 'profileEncrypted'];
    keysToRemove.forEach(key => {
      if (localStorage.getItem(key)) {
        console.log('[User Sync] Removing old encrypted key:', key);
        localStorage.removeItem(key);
      }
    });

    console.log('[User Sync] Old encrypted data cleared successfully');
  } catch (error) {
    console.error('[User Sync] Error clearing old encrypted data:', error);
  }
}

// Make function available globally
window.clearOldEncryptedData = clearOldEncryptedData;

// User Sync Manager
class UserSyncManager {
  constructor() {
    this.syncEnabled = false;
    this.syncInterval = null;
    this.lastSyncTime = 0;
    this.syncInProgress = false;
    this.pendingUpdates = false;

    // Initialize sync manager
    this.init();
  }

  init() {
    // Clear old encrypted data on initialization
    clearOldEncryptedData();

    // Check if user is logged in
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) {
      this.enableSync();
    }

    // Listen for login/logout events
    // Disabled to prevent automatic sync and refresh
    // window.addEventListener('userLoggedIn', () => this.enableSync());
    window.addEventListener('userLoggedOut', () => this.disableSync());

    // Listen for profile updates
    // Disabled to prevent automatic sync and refresh
    // window.addEventListener('profileUpdated', () => this.queueSync());

    // Listen for WebSocket connection
    // Disabled to prevent automatic sync and refresh
    // window.addEventListener('socketConnected', () => {
    //   if (this.syncEnabled) {
    //     this.syncAllData();
    //   }
    // });
  }

  enableSync() {
    if (this.syncEnabled) return;

    this.syncEnabled = true;
    console.log('[User Sync] Sync enabled');

    // Only sync if WebSocket is connected
    if (window.socket && window.socket.readyState === WebSocket.OPEN) {
      this.syncAllData();
    } else {
      console.log('[User Sync] WebSocket not connected, will sync when connected');
    }

    // Disabled periodic sync to prevent automatic refresh
    // this.syncInterval = setInterval(() => {
    //   if (window.socket && window.socket.readyState === WebSocket.OPEN) {
    //     this.syncAllData();
    //   } else {
    //     console.log('[User Sync] WebSocket not connected, skipping periodic sync');
    //   }
    // }, 5 * 60 * 1000);
  }

  disableSync() {
    if (!this.syncEnabled) return;

    this.syncEnabled = false;
    console.log('[User Sync] Sync disabled');

    // Clear sync interval
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  queueSync() {
    // Don't queue sync if we're already syncing
    if (this.syncInProgress) {
      console.log('[User Sync] Already syncing, skipping queue');
      return;
    }

    this.pendingUpdates = true;
    // If sync is not in progress, trigger it after a short delay
    if (!this.syncInProgress) {
      setTimeout(() => {
        if (this.pendingUpdates && !this.syncInProgress) {
          this.syncAllData();
        }
      }, 1000);
    }
  }

  syncAllData() {
    // Allow manual sync even when auto-sync is disabled
    // Only check if sync is in progress
    if (this.syncInProgress) {
      console.log('[User Sync] Sync already in progress, skipping');
      return;
    }

    // Check if WebSocket is connected before starting sync
    if (!window.socket || window.socket.readyState !== WebSocket.OPEN) {
      console.log('[User Sync] WebSocket not connected, cannot sync');
      return;
    }

    this.syncInProgress = true;
    this.pendingUpdates = false;

    console.log('[User Sync] Starting sync...');

    // Track sync completion
    let syncCompleted = {
      userData: false,
      friends: false,
      savedGames: false
    };

    const checkSyncComplete = () => {
      if (syncCompleted.userData && syncCompleted.friends && syncCompleted.savedGames) {
        this.syncInProgress = false;
        this.lastSyncTime = Date.now();
        console.log('[User Sync] All sync operations completed');

        // Store last sync time in localStorage (persists after refresh)
        localStorage.setItem('lastSyncTime', this.lastSyncTime.toString());

        // Dispatch sync complete event
        window.dispatchEvent(new CustomEvent('syncComplete', { 
          detail: { success: true } 
        }));
      }
    };

    // Override sync methods to track completion
    const originalSyncUserData = this.syncUserData.bind(this);
    const originalSyncFriends = this.syncFriends.bind(this);
    const originalSyncSavedGames = this.syncSavedGames.bind(this);

    // Use handleSyncResponse for all sync responses instead of adding multiple listeners
    const originalHandleSyncResponse = this.handleSyncResponse.bind(this);
    this.handleSyncResponse = (data) => {
      originalHandleSyncResponse(data);

      // Track sync completion
      if (data.type === 'userDataSynced') {
        syncCompleted.userData = true;
        checkSyncComplete();
      } else if (data.type === 'friendsSynced') {
        syncCompleted.friends = true;
        checkSyncComplete();
      } else if (data.type === 'savedGamesSynced') {
        syncCompleted.savedGames = true;
        checkSyncComplete();
      }
    };

    // Add timeout to ensure sync completes even if some parts fail
    const syncTimeout = setTimeout(() => {
      if (this.syncInProgress) {
        console.log('[User Sync] Sync timeout, marking as complete');
        this.syncInProgress = false;
        this.lastSyncTime = Date.now();

        // Dispatch sync complete event even if timeout
        window.dispatchEvent(new CustomEvent('syncComplete', {
          detail: { success: true }
        }));
      }
    }, 8000); // 8 seconds timeout

    this.syncUserData = () => {
      originalSyncUserData();
    };

    this.syncFriends = () => {
      originalSyncFriends();
    };

    this.syncSavedGames = () => {
      originalSyncSavedGames();
    };

    // Sync user data
    this.syncUserData();

    // Sync friends
    this.syncFriends();

    // Sync saved games
    this.syncSavedGames();
  }

  syncUserData() {
    if (!window.socket || window.socket.readyState !== WebSocket.OPEN) {
      console.log('[User Sync] WebSocket not connected, skipping sync');
      return;
    }

    const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
    if (!currentUser) return;

    window.socket.send(JSON.stringify({
      type: 'syncUserData',
      userData: currentUser
    }));

    console.log('[User Sync] Sent user data sync request');
  }

  syncFriends() {
    if (!window.socket || window.socket.readyState !== WebSocket.OPEN) return;

    window.socket.send(JSON.stringify({
      type: 'syncFriends'
    }));

    console.log('[User Sync] Sent friends sync request');
  }

  syncSavedGames() {
    if (!window.socket || window.socket.readyState !== WebSocket.OPEN) return;

    window.socket.send(JSON.stringify({
      type: 'syncSavedGames'
    }));

    console.log('[User Sync] Sent saved games sync request');
  }

  updateProfile(updates) {
    if (!window.socket || window.socket.readyState !== WebSocket.OPEN) {
      console.log('[User Sync] WebSocket not connected, saving locally');
      this.saveProfileLocally(updates);
      return;
    }

    window.socket.send(JSON.stringify({
      type: 'updateUserProfile',
      updates: updates
    }));

    console.log('[User Sync] Sent profile update request');
  }

  saveProfileLocally(updates) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
    if (currentUser) {
      const updatedUser = { ...currentUser, ...updates };
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));

      // Also update in chessUsers array using secureStorage
      const users = secureStorage.getItem('chessUsers') || [];
      const userIndex = users.findIndex(u => u.username === currentUser.username);
      if (userIndex !== -1) {
        users[userIndex] = updatedUser;
        secureStorage.setItem('chessUsers', users);
      }

      // Trigger profile updated event
      window.dispatchEvent(new CustomEvent('profileUpdated', { detail: updatedUser }));
    }
  }

  handleSyncResponse(data) {
    switch (data.type) {
      case 'userDataSynced':
        if (data.success && data.userData) {
          console.log('[User Sync] User data synced successfully');
          this.updateLocalUserData(data.userData);
        }
        break;

      case 'userProfileUpdated':
        if (data.success && data.userData) {
          console.log('[User Sync] Profile updated successfully');
          this.updateLocalUserData(data.userData);

          // Show notification
          this.showNotification('Profile synced across all devices');
        }
        break;

      case 'friendsSynced':
        if (data.friends) {
          console.log('[User Sync] Friends synced:', data.friends);
          this.updateLocalFriends(data.friends);
        }
        break;

      case 'savedGamesSynced':
        if (data.savedGames) {
          console.log('[User Sync] Saved games synced:', data.savedGames);
          this.updateLocalSavedGames(data.savedGames);
        }
        break;

      case 'userProfile':
        if (data.userData) {
          console.log('[User Sync] User profile received:', data.userData);
          this.updateLocalUserData(data.userData);
        }
        break;
    }
  }

  updateLocalUserData(userData) {
    // Update currentUser in localStorage
    localStorage.setItem('currentUser', JSON.stringify(userData));

    // Update in chessUsers array
    try {
      const users = JSON.parse(localStorage.getItem('chessUsers') || '[]');
      const userIndex = users.findIndex(u => u.username === userData.username);
      if (userIndex !== -1) {
        users[userIndex] = userData;
        localStorage.setItem('chessUsers', JSON.stringify(users));
      } else {
        // Add user if not found
        users.push(userData);
        localStorage.setItem('chessUsers', JSON.stringify(users));
      }
    } catch (error) {
      console.error('[User Sync] Error updating chessUsers:', error);
      // Clear corrupted data and start fresh
      localStorage.setItem('chessUsers', JSON.stringify([userData]));
    }

    // Only trigger profile updated event if not syncing
    if (!this.syncInProgress) {
      window.dispatchEvent(new CustomEvent('profileUpdated', { detail: userData }));
    }
  }

  updateLocalFriends(friends) {
    try {
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
      if (currentUser) {
        currentUser.friends = friends;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));

        // Update in chessUsers array
        try {
          const users = JSON.parse(localStorage.getItem('chessUsers') || '[]');
          const userIndex = users.findIndex(u => u.username === currentUser.username);
          if (userIndex !== -1) {
            users[userIndex].friends = friends;
            localStorage.setItem('chessUsers', JSON.stringify(users));
          }
        } catch (error) {
          console.error('[User Sync] Error updating chessUsers for friends:', error);
        }

        // Trigger friends updated event
        window.dispatchEvent(new CustomEvent('friendsUpdated', { detail: friends }));
      }
    } catch (error) {
      console.error('[User Sync] Error updating local friends:', error);
    }
  }

  updateLocalSavedGames(savedGames) {
    try {
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
      if (currentUser) {
        currentUser.savedGames = savedGames;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));

        // Update in chessUsers array
        try {
          const users = JSON.parse(localStorage.getItem('chessUsers') || '[]');
          const userIndex = users.findIndex(u => u.username === currentUser.username);
          if (userIndex !== -1) {
            users[userIndex].savedGames = savedGames;
            localStorage.setItem('chessUsers', JSON.stringify(users));
          }
        } catch (error) {
          console.error('[User Sync] Error updating chessUsers for saved games:', error);
        }

        // Trigger saved games updated event
        window.dispatchEvent(new CustomEvent('savedGamesUpdated', { detail: savedGames }));
      }
    } catch (error) {
      console.error('[User Sync] Error updating local saved games:', error);
    }
  }

  showNotification(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'sync-notification';
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 24px;
      background: linear-gradient(135deg, #0ea5e9, #16a34a);
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
}

// Create global instance
window.userSyncManager = new UserSyncManager();

// Add CSS animations for notifications
const syncStyle = document.createElement('style');
syncStyle.textContent = `
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
document.head.appendChild(syncStyle);

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UserSyncManager;
}
