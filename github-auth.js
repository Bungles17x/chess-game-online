// Simple Data Sync System
console.log('Data Sync System loaded');

// Load GitHub auth CSS
const githubAuthCSS = document.createElement('link');
githubAuthCSS.rel = 'stylesheet';
githubAuthCSS.href = 'github-auth.css';
document.head.appendChild(githubAuthCSS);

// Simple data sync using localStorage
class DataSync {
  constructor() {
    this.syncKey = 'chess_player_data_sync';
    this.lastSyncTime = localStorage.getItem('chess_last_sync') || 0;
    this.init();
  }

  init() {
    console.log('Data Sync System initialized');
    this.checkAutoSync();
  }

  // Check if auto-sync is needed
  checkAutoSync() {
    const now = Date.now();
    const syncInterval = 5 * 60 * 1000; // 5 minutes

    if (now - this.lastSyncTime > syncInterval) {
      console.log('Auto-syncing player data...');
      this.syncData();
    }
  }

  // Export player data to JSON
  exportData() {
    try {
      const playerData = JSON.parse(localStorage.getItem('chessPlayerData') || '{}');
      const dataStr = JSON.stringify(playerData, null, 2);

      // Create download link
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chess-player-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log('Player data exported successfully');
      return true;
    } catch (error) {
      console.error('Error exporting data:', error);
      return false;
    }
  }

  // Import player data from JSON
  importData(jsonData) {
    try {
      const playerData = JSON.parse(jsonData);

      // Validate data structure
      if (!playerData.xp && !playerData.level) {
        throw new Error('Invalid player data format');
      }

      // Merge with existing data
      const existingData = JSON.parse(localStorage.getItem('chessPlayerData') || '{}');
      const mergedData = {
        ...existingData,
        ...playerData
      };

      // Save to localStorage
      localStorage.setItem('chessPlayerData', JSON.stringify(mergedData));
      localStorage.setItem('chess_last_sync', Date.now().toString());

      console.log('Player data imported successfully');
      return true;
    } catch (error) {
      console.error('Error importing data:', error);
      return false;
    }
  }

  // Sync data (placeholder for future cloud sync)
  syncData() {
    try {
      const playerData = JSON.parse(localStorage.getItem('chessPlayerData') || '{}');

      // Store sync timestamp
      localStorage.setItem('chess_last_sync', Date.now().toString());
      localStorage.setItem('chess_player_data_sync', JSON.stringify(playerData));

      console.log('Data synced successfully');
      return true;
    } catch (error) {
      console.error('Error syncing data:', error);
      return false;
    }
  }

  // Get last sync time
  getLastSyncTime() {
    return this.lastSyncTime;
  }

  // Check if data needs sync
  needsSync() {
    const now = Date.now();
    const syncInterval = 5 * 60 * 1000; // 5 minutes
    return (now - this.lastSyncTime) > syncInterval;
  }
}

// Create global instance
window.dataSync = new DataSync();

// Make functions globally available
window.exportPlayerData = () => window.dataSync.exportData();
window.importPlayerData = (data) => window.dataSync.importData(data);
window.syncPlayerData = () => window.dataSync.syncData();
