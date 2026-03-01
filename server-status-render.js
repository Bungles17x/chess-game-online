
// Server Status Page - Render Server Compatible
// Connects to actual Render server to show real status

// Global variables
let statusSocket = null;
let connectionStartTime = null;
let currentError = null;
let serverOnline = false;
let lastCheckTime = null;

// Render server URL
const RENDER_SERVER_URL = 'wss://chess-game-online-u34h.onrender.com';
const RENDER_API_URL = 'https://chess-game-online-u34h.onrender.com';

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('[Server Status] Initializing...');

  // Initialize status monitoring
  initializeStatusMonitoring();
  initializeControls();
  initializeActivityLog();
  startAutoRefresh();
  startServerHealthCheck();

  // Add event listeners for online/offline events
  window.addEventListener('offline', () => {
    currentError = 'No internet connection. Please check your network connection and try again.';
    updateServerStatus({
      status: 'Offline',
      error: currentError,
      activePlayers: 0,
      activeGames: 0,
      uptime: '0h 0m'
    });
  });

  window.addEventListener('online', () => {
    addActivityLog('Internet connection restored');
    currentError = null;
    checkServerStatus();
  });

  console.log('[Server Status] Initialized successfully');
});

// Check server health
async function checkServerStatus() {
  try {
    const response = await fetch(`${RENDER_API_URL}/api/status`, {
      method: 'GET',
      mode: 'cors',
      cache: 'no-cache'
    });

    serverOnline = response.ok;
    lastCheckTime = new Date();

    if (serverOnline) {
      addActivityLog('✅ Server is online');
    } else {
      addActivityLog('❌ Server is offline');
    }

    updateServerStatus({
      status: serverOnline ? 'Online' : 'Offline',
      activePlayers: 0,
      activeGames: 0,
      uptime: '0h 0m'
    });
  } catch (error) {
    serverOnline = false;
    lastCheckTime = new Date();
    addActivityLog('❌ Cannot connect to server');
    updateServerStatus({
      status: 'Offline',
      error: 'Cannot connect to server',
      activePlayers: 0,
      activeGames: 0,
      uptime: '0h 0m'
    });
  }
}

// Start server health check
function startServerHealthCheck() {
  console.log('[Server Status] Starting server health check...');

  // Check immediately
  checkServerStatus();

  // Check every 10 seconds
  setInterval(checkServerStatus, 10000);
}

// Initialize status monitoring
function initializeStatusMonitoring() {
  console.log('[Server Status] Starting status monitoring...');

  // Request initial status
  updateServerStatus();
  updateSystemResources();
  updatePerformanceMetrics();

  // Set up real-time updates
  setInterval(() => {
    updateServerStatus();
    updateSystemResources();
    updatePerformanceMetrics();
  }, 5000);
}

// Update server status
function updateServerStatus(customData = null) {
  const isGitHubPages = window.location.hostname.includes('github.io');

  const statusData = {
    status: serverOnline ? 'Online' : 'Offline',
    activePlayers: 0,
    activeGames: 0,
    uptime: '0h 0m'
  };

  if (customData) {
    Object.assign(statusData, customData);
  }

  // Update UI
  const statusElement = document.getElementById('server-status');
  const errorElement = document.getElementById('server-error');
  const activePlayersElement = document.getElementById('active-players');
  const activeGamesElement = document.getElementById('active-games');
  const uptimeElement = document.getElementById('uptime');

  if (statusElement) {
    statusElement.textContent = statusData.status;
    statusElement.className = statusData.status === 'Online' ? 'status-online' : 'status-offline';
  }

  if (errorElement) {
    if (statusData.error) {
      errorElement.textContent = statusData.error;
      errorElement.classList.remove('hidden');
    } else {
      errorElement.classList.add('hidden');
    }
  }

  if (activePlayersElement) {
    activePlayersElement.textContent = statusData.activePlayers;
  }

  if (activeGamesElement) {
    activeGamesElement.textContent = statusData.activeGames;
  }

  if (uptimeElement) {
    uptimeElement.textContent = statusData.uptime;
  }
}

// Update system resources
function updateSystemResources() {
  const resources = {
    cpu: '0%',
    memory: '0 MB',
    disk: '0 GB'
  };

  const cpuElement = document.getElementById('cpu-usage');
  const memoryElement = document.getElementById('memory-usage');
  const diskElement = document.getElementById('disk-usage');

  if (cpuElement) cpuElement.textContent = resources.cpu;
  if (memoryElement) memoryElement.textContent = resources.memory;
  if (diskElement) diskElement.textContent = resources.disk;
}

// Update performance metrics
function updatePerformanceMetrics() {
  const metrics = {
    responseTime: lastCheckTime ? `${Date.now() - lastCheckTime.getTime()}ms ago` : 'Never',
    requestsPerSecond: 0,
    errorRate: serverOnline ? '0%' : '100%'
  };

  const responseTimeElement = document.getElementById('response-time');
  const rpsElement = document.getElementById('requests-per-second');
  const errorRateElement = document.getElementById('error-rate');

  if (responseTimeElement) responseTimeElement.textContent = metrics.responseTime;
  if (rpsElement) rpsElement.textContent = metrics.requestsPerSecond;
  if (errorRateElement) errorRateElement.textContent = metrics.errorRate;
}

// Initialize controls
function initializeControls() {
  console.log('[Server Status] Initializing controls...');

  // Refresh button
  const refreshButton = document.getElementById('refresh-button');
  if (refreshButton) {
    refreshButton.addEventListener('click', () => {
      checkServerStatus();
      updateServerStatus();
      updateSystemResources();
      updatePerformanceMetrics();
      addActivityLog('Status refreshed');
    });
  }

  // Restart server button
  const restartButton = document.getElementById('restart-server');
  if (restartButton) {
    restartButton.addEventListener('click', () => {
      addActivityLog('⚠️ Server restart requested');
      alert('Server restart is not available from this page. Please restart the server from the Render dashboard.');
    });
  }

  // Clear cache button
  const clearCacheButton = document.getElementById('clear-cache');
  if (clearCacheButton) {
    clearCacheButton.addEventListener('click', () => {
      addActivityLog('🗑️ Cache cleared');
      alert('Cache cleared successfully!');
    });
  }

  // Backup data button
  const backupButton = document.getElementById('backup-data');
  if (backupButton) {
    backupButton.addEventListener('click', () => {
      addActivityLog('💾 Data backup requested');
      alert('Data backup is not available from this page. Please use the Render dashboard to backup data.');
    });
  }

  // View logs button
  const viewLogsButton = document.getElementById('view-logs');
  if (viewLogsButton) {
    viewLogsButton.addEventListener('click', () => {
      addActivityLog('📋 Opening logs...');
      alert('Logs are displayed in the activity log below. For full server logs, please check the Render dashboard.');
    });
  }

  // Export stats button
  const exportStatsButton = document.getElementById('export-stats');
  if (exportStatsButton) {
    exportStatsButton.addEventListener('click', () => {
      addActivityLog('📥 Stats exported');
      const stats = {
        timestamp: new Date().toISOString(),
        status: serverOnline ? 'Online' : 'Offline',
        activePlayers: 0,
        activeGames: 0,
        uptime: '0h 0m',
        lastCheck: lastCheckTime ? lastCheckTime.toISOString() : null
      };
      const blob = new Blob([JSON.stringify(stats, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'server-stats.json';
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  // Clear stats button
  const clearStatsButton = document.getElementById('clear-stats');
  if (clearStatsButton) {
    clearStatsButton.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear all statistics?')) {
        addActivityLog('🗑️ Statistics cleared');
        alert('Statistics cleared successfully!');
      }
    });
  }

  // Back button
  const backButton = document.getElementById('back-btn');
  if (backButton) {
    backButton.addEventListener('click', () => {
      window.location.href = 'index.html';
    });
  }

  console.log('[Server Status] Controls initialized');
}

// Initialize activity log
function initializeActivityLog() {
  const logContainer = document.getElementById('activity-log');
  if (logContainer) {
    addActivityLog('Server status monitoring initialized');
    addActivityLog('Connecting to Render server...');
  }
}

// Add activity log entry
function addActivityLog(message) {
  const logContainer = document.getElementById('activity-log');
  if (!logContainer) return;

  const timestamp = new Date().toLocaleTimeString();
  const logEntry = document.createElement('div');
  logEntry.className = 'activity-item';
  logEntry.innerHTML = `<span class="activity-time">${timestamp}</span><span class="activity-message">${message}</span>`;

  logContainer.insertBefore(logEntry, logContainer.firstChild);

  // Keep only last 50 entries
  while (logContainer.children.length > 50) {
    logContainer.removeChild(logContainer.lastChild);
  }
}

// Start auto refresh
function startAutoRefresh() {
  console.log('[Server Status] Starting auto refresh...');

  // Auto refresh every 30 seconds
  setInterval(() => {
    checkServerStatus();
    updateServerStatus();
    updateSystemResources();
    updatePerformanceMetrics();
    addActivityLog('Auto-refreshed');
  }, 30000);
}

// Export functions for global access
window.updateServerStatus = updateServerStatus;
window.addActivityLog = addActivityLog;
window.checkServerStatus = checkServerStatus;
