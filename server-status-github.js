
// Server Status Page - GitHub Pages Compatible
// This file handles server monitoring for GitHub Pages deployment

// Global variables
let statusSocket = null;
let connectionStartTime = null;
let currentError = null;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Check if user is admin
  if (!isAdminUser()) {
    alert('Access Denied: Admin privileges required');
    window.location.href = 'index.html';
    return;
  }

  // Initialize status monitoring
  initializeStatusMonitoring();
  initializeControls();
  initializeActivityLog();
  startAutoRefresh();

  // Add event listeners for online/offline events
  window.addEventListener('offline', () => {
    currentError = 'No internet connection. Please check your network connection and try again.';
    updateServerStatus({
      status: 'Error',
      error: currentError,
      activePlayers: 0,
      activeGames: 0,
      uptime: '0h 0m'
    });
  });

  window.addEventListener('online', () => {
    addActivityLog('Internet connection restored');
    currentError = null;
    updateServerStatus({
      status: 'Online',
      activePlayers: 0,
      activeGames: 0,
      uptime: '0h 0m'
    });
  });
});

// Get current user from localStorage
function getCurrentUser() {
  try {
    const userData = localStorage.getItem('currentUser');
    if (userData) {
      try {
        return JSON.parse(userData);
      } catch (e) {
        console.error('Error parsing user data:', e);
        return null;
      }
    }
    return null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

// Check if current user is admin
function isAdminUser() {
  const currentUser = getCurrentUser();
  if (!currentUser) return false;

  const adminUsers = ['bungles17x','674121bruh'];
  return adminUsers.includes(currentUser.username.toLowerCase());
}

// Initialize status monitoring
function initializeStatusMonitoring() {
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
    status: isGitHubPages ? 'Online (GitHub Pages)' : 'Online',
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
  // Simulated system resources for GitHub Pages
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
  // Simulated performance metrics for GitHub Pages
  const metrics = {
    responseTime: '0ms',
    requestsPerSecond: 0,
    errorRate: '0%'
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
  const refreshButton = document.getElementById('refresh-button');
  if (refreshButton) {
    refreshButton.addEventListener('click', () => {
      updateServerStatus();
      updateSystemResources();
      updatePerformanceMetrics();
      addActivityLog('Status refreshed');
    });
  }
}

// Initialize activity log
function initializeActivityLog() {
  const logContainer = document.getElementById('activity-log');
  if (logContainer) {
    addActivityLog('Server status monitoring initialized');
    addActivityLog('Running on GitHub Pages - Static hosting');
  }
}

// Add activity log entry
function addActivityLog(message) {
  const logContainer = document.getElementById('activity-log');
  if (!logContainer) return;

  const timestamp = new Date().toLocaleTimeString();
  const logEntry = document.createElement('div');
  logEntry.className = 'log-entry';
  logEntry.innerHTML = `<span class="log-time">${timestamp}</span> ${message}`;

  logContainer.insertBefore(logEntry, logContainer.firstChild);

  // Keep only last 50 entries
  while (logContainer.children.length > 50) {
    logContainer.removeChild(logContainer.lastChild);
  }
}

// Start auto refresh
function startAutoRefresh() {
  // Auto refresh every 30 seconds
  setInterval(() => {
    updateServerStatus();
    updateSystemResources();
    updatePerformanceMetrics();
    addActivityLog('Auto-refreshed');
  }, 30000);
}

// Export functions for global access
window.updateServerStatus = updateServerStatus;
window.addActivityLog = addActivityLog;
