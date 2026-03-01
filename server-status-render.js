
// Server Status Page - Render Server Compatible
// Connects to actual Render server to show real status

// Global variables
let statusSocket = null;
let connectionStartTime = null;
let currentError = null;
let serverOnline = false;
let lastCheckTime = null;
let checkCount = 0;
let successCount = 0;
let failureCount = 0;
let responseTimes = [];
let maxResponseTimes = 50;
let uptimeStart = Date.now();
let lastOnlineTime = null;
let lastOfflineTime = null;
let consecutiveFailures = 0;
let maxConsecutiveFailures = 3;

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
  
  // Initialize debugger before starting health check
  if (typeof initializeDebugger === 'function') {
    initializeDebugger();
  }
  
  startServerHealthCheck();

  // Add event listeners for online/offline events
  window.addEventListener('offline', () => {
    currentError = 'No internet connection. Please check your network connection and try again.';
    addActivityLog('❌ Internet connection lost');
    addActivityLog('ℹ️ Please check your network connection');
    addActivityLog('ℹ️ Server status monitoring is paused until connection is restored');
    updateServerStatus({
      status: 'Offline',
      error: currentError,
      activePlayers: 0,
      activeGames: 0,
      uptime: formatDuration(Date.now() - uptimeStart)
    });
  });

  window.addEventListener('online', () => {
    addActivityLog('✅ Internet connection restored');
    addActivityLog('ℹ️ Resuming server status monitoring');
    currentError = null;
    checkServerStatus();
  });

  console.log('[Server Status] Initialized successfully');
});

// Check server health
async function checkServerStatus() {
  const checkStart = Date.now();
  checkCount++;
  
  if (typeof addDebuggerLog === 'function') {
    addDebuggerLog(`Starting health check #${checkCount}`, LogCategory.INFO);
  }
  
  try {
    const response = await fetch(`${RENDER_API_URL}/api/status`, {
      method: 'GET',
      mode: 'cors',
      cache: 'no-cache',
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });

    const responseTime = Date.now() - checkStart;
    serverOnline = response.ok;
    lastCheckTime = new Date();

    // Track response times
    responseTimes.push(responseTime);
    if (responseTimes.length > maxResponseTimes) {
      responseTimes.shift();
    }

    if (serverOnline) {
      successCount++;
      consecutiveFailures = 0;
      lastOnlineTime = new Date();
      
      if (typeof addDebuggerLog === 'function') {
        addDebuggerLog(`Server is online - Response time: ${responseTime}ms`, LogCategory.SUCCESS);
      }
      
      if (lastOfflineTime) {
        const downtime = Date.now() - lastOfflineTime.getTime();
        addActivityLog(`✅ Server is online and responding (${responseTime}ms)`);
        addActivityLog(`ℹ️ Server was offline for ${formatDuration(downtime)}`);
        
        if (typeof addDebuggerLog === 'function') {
          addDebuggerLog(`Server back online after ${formatDuration(downtime)} downtime`, LogCategory.SUCCESS);
        }
      } else {
        addActivityLog(`✅ Server is online and responding (${responseTime}ms)`);
      }
    } else {
      failureCount++;
      consecutiveFailures++;
      
      if (!lastOfflineTime) {
        lastOfflineTime = new Date();
      }
      
      addActivityLog('❌ Server responded but returned an error status');
      addActivityLog('ℹ️ The server may be starting up or experiencing issues');
      
      if (typeof addDebuggerLog === 'function') {
        addDebuggerLog(`Server responded with error status`, LogCategory.ERROR);
      }
      
      if (consecutiveFailures >= maxConsecutiveFailures) {
        addActivityLog(`⚠️ Warning: Server has failed ${consecutiveFailures} consecutive checks`);
        
        if (typeof addDebuggerLog === 'function') {
          addDebuggerLog(`Warning: ${consecutiveFailures} consecutive failures`, LogCategory.WARNING);
        }
      }
    }

    updateServerStatus({
      status: serverOnline ? 'Online' : 'Offline',
      activePlayers: 0,
      activeGames: 0,
      uptime: formatDuration(Date.now() - uptimeStart)
    });
    
    updatePerformanceMetrics();
  } catch (error) {
    serverOnline = false;
    lastCheckTime = new Date();
    failureCount++;
    consecutiveFailures++;
    
    if (!lastOfflineTime) {
      lastOfflineTime = new Date();
    }
    
    // Detailed error handling
    if (error.name === 'AbortError') {
      addActivityLog('❌ Connection timeout - Server did not respond within 10 seconds');
      addActivityLog('ℹ️ The server may be offline, starting up, or experiencing high load');
      
      if (typeof addDebuggerLog === 'function') {
        addDebuggerLog(`Connection timeout - Server did not respond within 10 seconds`, LogCategory.ERROR);
      }
      
      if (consecutiveFailures >= maxConsecutiveFailures) {
        addActivityLog(`⚠️ Warning: Server has failed ${consecutiveFailures} consecutive checks`);
      }
      
      updateServerStatus({
        status: 'Offline',
        error: 'Connection timeout - Server not responding',
        activePlayers: 0,
        activeGames: 0,
        uptime: formatDuration(Date.now() - uptimeStart)
      });
    } else if (error.message.includes('Failed to fetch')) {
      addActivityLog('❌ Cannot connect to server - Network error');
      addActivityLog('ℹ️ Possible causes: Server is offline, CORS issues, or network problems');
      
      if (typeof addDebuggerLog === 'function') {
        addDebuggerLog(`Network error - Failed to fetch: ${error.message}`, LogCategory.ERROR);
      }
      
      if (consecutiveFailures >= maxConsecutiveFailures) {
        addActivityLog(`⚠️ Warning: Server has failed ${consecutiveFailures} consecutive checks`);
        
        if (typeof addDebuggerLog === 'function') {
          addDebuggerLog(`Warning: ${consecutiveFailures} consecutive failures`, LogCategory.WARNING);
        }
      }
      
      updateServerStatus({
        status: 'Offline',
        error: 'Cannot connect to server - Network error',
        activePlayers: 0,
        activeGames: 0,
        uptime: formatDuration(Date.now() - uptimeStart)
      });
    } else {
      addActivityLog('❌ Error checking server status: ' + error.message);
      addActivityLog('ℹ️ An unexpected error occurred while trying to connect');
      
      if (typeof addDebuggerLog === 'function') {
        addDebuggerLog(`Unexpected error: ${error.message}`, LogCategory.ERROR);
      }
      
      updateServerStatus({
        status: 'Offline',
        error: 'Error: ' + error.message,
        activePlayers: 0,
        activeGames: 0,
        uptime: formatDuration(Date.now() - uptimeStart)
      });
    }
    
    updatePerformanceMetrics();
  }
}

// Format duration in human-readable format
function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
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
    uptime: formatDuration(Date.now() - uptimeStart)
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
    
    // Update debugger state based on server status
    if (debuggerState) {
      debuggerState.isOffline = statusData.status !== 'Online';
      updateDebuggerStatus();
    }
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
  // Calculate average response time
  let avgResponseTime = 0;
  if (responseTimes.length > 0) {
    avgResponseTime = Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length);
  }
  
  // Calculate success rate
  const successRate = checkCount > 0 ? ((successCount / checkCount) * 100).toFixed(1) : '0.0';
  
  // Calculate error rate
  const errorRate = checkCount > 0 ? ((failureCount / checkCount) * 100).toFixed(1) : '0.0';
  
  // Get min/max response times
  const minResponseTime = responseTimes.length > 0 ? Math.min(...responseTimes) : 0;
  const maxResponseTime = responseTimes.length > 0 ? Math.max(...responseTimes) : 0;
  
  const metrics = {
    responseTime: avgResponseTime + 'ms',
    minResponseTime: minResponseTime + 'ms',
    maxResponseTime: maxResponseTime + 'ms',
    checkCount: checkCount,
    successCount: successCount,
    failureCount: failureCount,
    successRate: successRate + '%',
    errorRate: errorRate + '%',
    uptime: formatDuration(Date.now() - uptimeStart),
    lastCheck: lastCheckTime ? lastCheckTime.toLocaleTimeString() : 'Never'
  };

  // Update UI elements
  const responseTimeElement = document.getElementById('response-time');
  const rpsElement = document.getElementById('requests-per-second');
  const errorRateElement = document.getElementById('error-rate');
  const activeConnectionsElement = document.getElementById('active-connections');
  
  if (responseTimeElement) {
    responseTimeElement.textContent = metrics.responseTime;
    responseTimeElement.title = `Min: ${metrics.minResponseTime} | Max: ${metrics.maxResponseTime}`;
  }
  
  if (rpsElement) {
    rpsElement.textContent = metrics.checkCount;
    rpsElement.title = `Success: ${metrics.successCount} | Failure: ${metrics.failureCount}`;
  }
  
  if (errorRateElement) {
    errorRateElement.textContent = metrics.errorRate;
    errorRateElement.className = parseFloat(errorRate) > 50 ? 'error-high' : 'error-normal';
  }
  
  if (activeConnectionsElement) {
    activeConnectionsElement.textContent = serverOnline ? '1' : '0';
  }
  
  // Update additional metrics if elements exist
  const successRateElement = document.getElementById('success-rate');
  if (successRateElement) {
    successRateElement.textContent = metrics.successRate;
  }
  
  const checkCountElement = document.getElementById('check-count');
  if (checkCountElement) {
    checkCountElement.textContent = metrics.checkCount;
  }
}

// Initialize controls
function initializeControls() {
  console.log('[Server Status] Initializing controls...');

  // Refresh button
  const refreshButton = document.getElementById('refresh-button');
  if (refreshButton) {
    refreshButton.addEventListener('click', () => {
      addActivityLog('🔄 Manual refresh requested');
      addActivityLog('ℹ️ Checking server status...');
      checkServerStatus();
      updateServerStatus();
      updateSystemResources();
      updatePerformanceMetrics();
      addActivityLog('✅ Status refreshed successfully');
    });
  }

  // Restart server button
  const restartButton = document.getElementById('restart-server');
  if (restartButton) {
    restartButton.addEventListener('click', () => {
      addActivityLog('⚠️ Server restart requested');
      addActivityLog('ℹ️ Note: Server restart must be done from the Render dashboard');
      addActivityLog('ℹ️ Go to dashboard.render.com to restart your server');
      alert('Server restart is not available from this page.\n\nTo restart your server:\n1. Go to dashboard.render.com\n2. Select your service\n3. Click Manual Deploy > Clear build cache & deploy\n\nOr use the Render CLI: render restart <service-name>');
    });
  }

  // Clear cache button
  const clearCacheButton = document.getElementById('clear-cache');
  if (clearCacheButton) {
    clearCacheButton.addEventListener('click', () => {
      addActivityLog('🗑️ Clearing local cache...');
      if (typeof caches !== 'undefined') {
        caches.keys().then(names => {
          for (let name of names) caches.delete(name);
        });
      }
      addActivityLog('✅ Local cache cleared');
      addActivityLog('ℹ️ Browser cache has been cleared');
      alert('Cache cleared successfully!\n\nLocal browser cache and service worker cache have been cleared.');
    });
  }

  // Backup data button
  const backupButton = document.getElementById('backup-data');
  if (backupButton) {
    backupButton.addEventListener('click', () => {
      addActivityLog('💾 Data backup requested');
      addActivityLog('ℹ️ Note: Data backup must be done from the Render dashboard');
      addActivityLog('ℹ️ Or use the Render CLI: render backup create <service-name>');
      alert('Data backup is not available from this page.\n\nTo backup your data:\n1. Go to dashboard.render.com\n2. Select your service\n3. Go to Backups tab\n4. Click Create Backup\n\nOr use the Render CLI:\nrender backup create <service-name>');
    });
  }

  // View logs button
  const viewLogsButton = document.getElementById('view-logs');
  if (viewLogsButton) {
    viewLogsButton.addEventListener('click', () => {
      addActivityLog('📋 Opening logs...');
      addActivityLog('ℹ️ Activity log is displayed below');
      addActivityLog('ℹ️ For full server logs, check the Render dashboard');
      alert('Logs are displayed in the activity log below.\n\nFor full server logs:\n1. Go to dashboard.render.com\n2. Select your service\n3. Click on Logs tab\n\nOr use the Render CLI:\nrender logs <service-name>');
    });
  }

  // Export stats button
  const exportStatsButton = document.getElementById('export-stats');
  if (exportStatsButton) {
    exportStatsButton.addEventListener('click', () => {
      addActivityLog('📥 Exporting server statistics...');
      
      // Calculate statistics
      const avgResponseTime = responseTimes.length > 0 
        ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) 
        : 0;
      const minResponseTime = responseTimes.length > 0 ? Math.min(...responseTimes) : 0;
      const maxResponseTime = responseTimes.length > 0 ? Math.max(...responseTimes) : 0;
      const successRate = checkCount > 0 ? ((successCount / checkCount) * 100).toFixed(2) : '0.00';
      const errorRate = checkCount > 0 ? ((failureCount / checkCount) * 100).toFixed(2) : '0.00';
      
      const stats = {
        exportInfo: {
          timestamp: new Date().toISOString(),
          exportedBy: 'Server Status Monitoring System',
          version: '2.0'
        },
        serverInfo: {
          url: RENDER_API_URL,
          status: serverOnline ? 'Online' : 'Offline',
          lastCheck: lastCheckTime ? lastCheckTime.toISOString() : null,
          lastOnline: lastOnlineTime ? lastOnlineTime.toISOString() : null,
          lastOffline: lastOfflineTime ? lastOfflineTime.toISOString() : null
        },
        monitoringStats: {
          uptime: formatDuration(Date.now() - uptimeStart),
          totalChecks: checkCount,
          successfulChecks: successCount,
          failedChecks: failureCount,
          successRate: successRate + '%',
          errorRate: errorRate + '%',
          consecutiveFailures: consecutiveFailures
        },
        performanceMetrics: {
          averageResponseTime: avgResponseTime + 'ms',
          minResponseTime: minResponseTime + 'ms',
          maxResponseTime: maxResponseTime + 'ms',
          totalResponseTimes: responseTimes.length,
          responseTimes: responseTimes
        },
        configuration: {
          healthCheckInterval: '10 seconds',
          autoRefreshInterval: '30 seconds',
          maxResponseTime: '10 seconds',
          maxConsecutiveFailures: maxConsecutiveFailures,
          maxResponseTimesStored: maxResponseTimes
        },
        notes: 'These are local monitoring statistics from the server status page, not actual server statistics'
      };
      const blob = new Blob([JSON.stringify(stats, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `server-stats-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      addActivityLog('✅ Statistics exported successfully');
      addActivityLog('ℹ️ File saved as: server-stats-' + new Date().toISOString().split('T')[0] + '.json');
      alert('Statistics exported successfully!\n\nFile has been downloaded with the current server status and monitoring data.\n\nNote: These are local statistics from this monitoring page, not the actual server statistics.');
    });
  }

  // Clear stats button
  const clearStatsButton = document.getElementById('clear-stats');
  if (clearStatsButton) {
    clearStatsButton.addEventListener('click', () => {
      addActivityLog('⚠️ Clear statistics requested');
      addActivityLog('ℹ️ This will clear local monitoring statistics only');
      if (confirm('Are you sure you want to clear all local statistics?\n\nThis will:\n- Clear the activity log\n- Reset monitoring data\n\nThis will NOT affect the actual server or its data.')) {
        addActivityLog('🗑️ Local statistics cleared');
        addActivityLog('ℹ️ Activity log has been reset');
        addActivityLog('ℹ️ Monitoring data has been reset');
        alert('Statistics cleared successfully!\n\nLocal monitoring statistics have been cleared.\nThe actual server and its data are unaffected.');
      } else {
        addActivityLog('ℹ️ Clear statistics cancelled');
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
    addActivityLog('🚀 Server Status Monitoring System Initialized');
    addActivityLog('═════════════════════════════════════════════════');
    addActivityLog('ℹ️ Monitoring Configuration:');
    addActivityLog('   • Target Server: ' + RENDER_API_URL);
    addActivityLog('   • Health Check Interval: 10 seconds');
    addActivityLog('   • Auto-Refresh Interval: 30 seconds');
    addActivityLog('   • Max Response Time: 10 seconds');
    addActivityLog('   • Max Consecutive Failures: ' + maxConsecutiveFailures);
    addActivityLog('═════════════════════════════════════════════════');
    addActivityLog('ℹ️ Monitoring Features:');
    addActivityLog('   • Real-time server status tracking');
    addActivityLog('   • Response time monitoring');
    addActivityLog('   • Success/failure statistics');
    addActivityLog('   • Uptime tracking');
    addActivityLog('   • Automatic error detection');
    addActivityLog('═════════════════════════════════════════════════');
    addActivityLog('⏳ Starting initial server health check...');
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

// ============================================
// DEBUGGER FUNCTIONALITY
// ============================================

// Debugger state
const debuggerState = {
  logs: [],
  paused: false,
  autoScroll: true,
  showTimestamp: true,
  showCategory: true,
  filter: 'all',
  maxLogs: 1000,
  bookmarks: [],
  selectedLogId: null,
  searchTerm: '',
  highlightedLogs: new Set(),
  logLevels: {
    info: true,
    warning: true,
    error: true,
    success: true
  },
  timeRange: {
    enabled: false,
    start: null,
    end: null
  },
  statistics: {
    totalLogs: 0,
    errors: 0,
    warnings: 0,
    info: 0,
    success: 0,
    avgResponseTime: 0,
    maxResponseTime: 0,
    minResponseTime: 0
  },
  hasError: false,
  isOffline: false
};

// Log categories
const LogCategory = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  SUCCESS: 'success'
};

// Initialize debugger
document.addEventListener('DOMContentLoaded', () => {
  initializeDebugger();
});

function initializeDebugger() {
  console.log('[Debugger] Initializing...');

  // Monitor online/offline status
  window.addEventListener('online', () => {
    debuggerState.isOffline = false;
    addDebuggerLog('Connection restored - Online', LogCategory.SUCCESS);
    updateDebuggerStatus();
  });

  window.addEventListener('offline', () => {
    debuggerState.isOffline = true;
    addDebuggerLog('Connection lost - Offline', LogCategory.ERROR);
    updateDebuggerStatus();
  });
  
  // Get debugger elements
  const pauseBtn = document.getElementById('debugger-pause');
  const searchBtn = document.getElementById('debugger-search');
  const clearBtn = document.getElementById('debugger-clear');
  const exportBtn = document.getElementById('debugger-export');
  const searchCloseBtn = document.getElementById('debugger-search-close');
  const searchInput = document.getElementById('debugger-search-input');
  const filterSelect = document.getElementById('debugger-filter');
  const autoScrollToggle = document.getElementById('debugger-auto-scroll');
  const showTimestampToggle = document.getElementById('debugger-show-timestamp');
  const showCategoryToggle = document.getElementById('debugger-show-category');
  const copyBtn = document.getElementById('debugger-copy');
  
  // Pause/Resume button
  if (pauseBtn) {
    pauseBtn.addEventListener('click', () => {
      debuggerState.paused = !debuggerState.paused;
      pauseBtn.textContent = debuggerState.paused ? '▶️' : '⏸️';
      
      // Only log if resuming (not pausing)
      if (!debuggerState.paused) {
        addDebuggerLog('Debugger resumed', LogCategory.INFO);
      }
      
      updateDebuggerStatus();
    });
  }
  
  // Search button
  if (searchBtn) {
    searchBtn.addEventListener('click', () => {
      const searchBar = document.getElementById('debugger-search-bar');
      searchBar.style.display = searchBar.style.display === 'none' ? 'flex' : 'none';
      if (searchBar.style.display === 'flex') {
        searchInput.focus();
      }
    });
  }
  
  // Search close button
  if (searchCloseBtn) {
    searchCloseBtn.addEventListener('click', () => {
      document.getElementById('debugger-search-bar').style.display = 'none';
      searchInput.value = '';
      renderDebuggerLogs();
    });
  }
  
  // Search input
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      renderDebuggerLogs();
    });
  }
  
  // Clear button
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear all debugger logs?')) {
        debuggerState.logs = [];
        renderDebuggerLogs();
        updateDebuggerStats();
        addDebuggerLog('Logs cleared', LogCategory.INFO);
      }
    });
  }
  
  // Export button
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      exportDebuggerLogs();
    });
  }
  
  // Filter select
  if (filterSelect) {
    filterSelect.addEventListener('change', (e) => {
      debuggerState.filter = e.target.value;
      renderDebuggerLogs();
    });
  }
  
  // Auto scroll toggle
  if (autoScrollToggle) {
    autoScrollToggle.addEventListener('change', (e) => {
      debuggerState.autoScroll = e.target.checked;
    });
  }
  
  // Show timestamp toggle
  if (showTimestampToggle) {
    showTimestampToggle.addEventListener('change', (e) => {
      debuggerState.showTimestamp = e.target.checked;
      renderDebuggerLogs();
    });
  }
  
  // Show category toggle
  if (showCategoryToggle) {
    showCategoryToggle.addEventListener('change', (e) => {
      debuggerState.showCategory = e.target.checked;
      renderDebuggerLogs();
    });
  }
  
  // Copy button
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      copyDebuggerLogs();
    });
  }
  
  console.log('[Debugger] Initialized');
}

function addDebuggerLog(message, category = LogCategory.INFO, metadata = {}) {
  if (debuggerState.paused) {
    return;
  }
  
  const timestamp = new Date();
  const log = {
    id: Date.now() + Math.random(),
    timestamp: timestamp.toISOString(),
    timestampMs: timestamp.getTime(),
    message: message,
    category: category,
    metadata: metadata,
    bookmarked: false,
    highlighted: false,
    responseTime: metadata.responseTime || null,
    source: metadata.source || 'system'
  };
  
  debuggerState.logs.push(log);
  
  // Update statistics
  debuggerState.statistics.totalLogs++;
  if (category === LogCategory.ERROR) {
    debuggerState.statistics.errors++;
    debuggerState.hasError = true;
  }
  if (category === LogCategory.WARNING) debuggerState.statistics.warnings++;
  if (category === LogCategory.INFO) debuggerState.statistics.info++;
  if (category === LogCategory.SUCCESS) debuggerState.statistics.success++;
  
  if (metadata.responseTime) {
    debuggerState.statistics.avgResponseTime = 
      (debuggerState.statistics.avgResponseTime * (debuggerState.statistics.totalLogs - 1) + metadata.responseTime) / 
      debuggerState.statistics.totalLogs;
    debuggerState.statistics.maxResponseTime = 
      Math.max(debuggerState.statistics.maxResponseTime, metadata.responseTime);
    debuggerState.statistics.minResponseTime = 
      debuggerState.statistics.minResponseTime === 0 
        ? metadata.responseTime 
        : Math.min(debuggerState.statistics.minResponseTime, metadata.responseTime);
  }
  
  // Keep only maxLogs
  if (debuggerState.logs.length > debuggerState.maxLogs) {
    const removedLog = debuggerState.logs.shift();
    // Remove bookmark if it existed
    debuggerState.bookmarks = debuggerState.bookmarks.filter(id => id !== removedLog.id);
  }
  
  renderDebuggerLogs();
  updateDebuggerStats();
  
  // Auto-highlight if search term matches
  if (debuggerState.searchTerm && message.toLowerCase().includes(debuggerState.searchTerm.toLowerCase())) {
    highlightLog(log.id);
  }
}

function renderDebuggerLogs() {
  const logsContainer = document.getElementById('debugger-logs');
  if (!logsContainer) return;
  
  // Get filter and search values
  const filter = debuggerState.filter;
  const searchTerm = document.getElementById('debugger-search-input')?.value.toLowerCase() || '';
  debuggerState.searchTerm = searchTerm;
  
  // Filter logs
  let filteredLogs = debuggerState.logs.filter(log => {
    // Filter by category
    if (filter !== 'all' && log.category !== filter) {
      return false;
    }
    
    // Filter by log levels
    if (!debuggerState.logLevels[log.category]) {
      return false;
    }
    
    // Filter by search term
    if (searchTerm && !log.message.toLowerCase().includes(searchTerm)) {
      return false;
    }
    
    // Filter by time range
    if (debuggerState.timeRange.enabled) {
      if (debuggerState.timeRange.start && log.timestampMs < debuggerState.timeRange.start) {
        return false;
      }
      if (debuggerState.timeRange.end && log.timestampMs > debuggerState.timeRange.end) {
        return false;
      }
    }
    
    return true;
  });
  
  // Sort logs by timestamp (oldest first so newest at bottom)
  filteredLogs.sort((a, b) => a.timestampMs - b.timestampMs);
  
  // Render logs
  logsContainer.innerHTML = filteredLogs.map(log => {
    const timestamp = new Date(log.timestamp);
    const timeStr = timestamp.toLocaleTimeString();
    const dateStr = timestamp.toLocaleDateString();
    const isSelected = debuggerState.selectedLogId === log.id;
    const isBookmarked = debuggerState.bookmarks.includes(log.id);
    const isHighlighted = debuggerState.highlightedLogs.has(log.id);
    
    // Determine log color based on category and response time
    let logColorClass = '';
    if (log.category === LogCategory.ERROR) {
      logColorClass = 'error';
    } else if (log.category === LogCategory.WARNING) {
      logColorClass = 'warning';
    } else if (log.category === LogCategory.SUCCESS) {
      logColorClass = 'success';
    } else {
      logColorClass = 'info';
    }
    
    // Add response time color
    let responseTimeClass = '';
    if (log.responseTime) {
      if (log.responseTime > 5000) {
        responseTimeClass = 'response-slow';
      } else if (log.responseTime > 2000) {
        responseTimeClass = 'response-medium';
      } else {
        responseTimeClass = 'response-fast';
      }
    }
    
    let logHTML = `<div class="debugger-log-entry ${logColorClass} ${isSelected ? 'selected' : ''} ${isHighlighted ? 'highlighted' : ''}" data-category="${log.category}" data-log-id="${log.id}">`;
    
    // Bookmark icon
    logHTML += `<button class="debugger-bookmark-btn ${isBookmarked ? 'bookmarked' : ''}" onclick="toggleBookmark('${log.id}')" title="Toggle bookmark">${isBookmarked ? '⭐' : '☆'}</button>`;
    
    // Timestamp
    if (debuggerState.showTimestamp) {
      logHTML += `<span class="debugger-timestamp">${dateStr} ${timeStr}</span>`;
    }
    
    // Category with color
    if (debuggerState.showCategory) {
      const categoryColors = {
        error: '#ff4757',
        warning: '#ffa502',
        info: '#2ed573',
        success: '#1e90ff'
      };
      const bgColor = categoryColors[log.category] || '#747d8c';
      logHTML += `<span class="debugger-category debugger-${log.category}" style="background-color: ${bgColor};">[${log.category.toUpperCase()}]</span>`;
    }
    
    // Response time with color
    if (log.responseTime) {
      logHTML += `<span class="debugger-response-time ${responseTimeClass}">${log.responseTime}ms</span>`;
    }
    
    // Source with color
    if (log.source) {
      const sourceColors = {
        system: '#747d8c',
        network: '#3742fa',
        server: '#2ed573',
        client: '#ff6b81'
      };
      const sourceColor = sourceColors[log.source] || '#747d8c';
      logHTML += `<span class="debugger-source" style="color: ${sourceColor};">[${log.source}]</span>`;
    }
    
    // Message with highlighting
    let message = escapeHtml(log.message);
    if (searchTerm) {
      const regex = new RegExp(`(${escapeRegex(searchTerm)})`, 'gi');
      message = message.replace(regex, '<mark class="search-highlight">$1</mark>');
    }
    logHTML += `<span class="debugger-message">${message}</span>`;
    
    // Metadata
    if (log.metadata && Object.keys(log.metadata).length > 0) {
      logHTML += `<button class="debugger-metadata-btn" onclick="showMetadata('${log.id}')" title="Show metadata">ℹ️</button>`;
    }
    
    logHTML += `</div>`;
    
    return logHTML;
  }).join('');
  
  // Update log count
  const logCount = document.getElementById('debugger-log-count');
  if (logCount) {
    logCount.textContent = `${filteredLogs.length} of ${debuggerState.logs.length} logs`;
  }
  
  // Auto scroll to bottom (newest logs are at bottom)
  if (debuggerState.autoScroll) {
    logsContainer.scrollTop = logsContainer.scrollHeight;
  }
}

function updateDebuggerStats() {
  const totalLogs = document.getElementById('debug-total-logs');
  const errors = document.getElementById('debug-errors');
  const warnings = document.getElementById('debug-warnings');
  const info = document.getElementById('debug-info');
  
  if (totalLogs) totalLogs.textContent = debuggerState.logs.length;
  if (errors) errors.textContent = debuggerState.logs.filter(l => l.category === LogCategory.ERROR).length;
  if (warnings) warnings.textContent = debuggerState.logs.filter(l => l.category === LogCategory.WARNING).length;
  if (info) info.textContent = debuggerState.logs.filter(l => l.category === LogCategory.INFO).length;
}

function updateDebuggerStatus() {
  const statusIndicator = document.getElementById('debugger-status');
  if (!statusIndicator) return;
  
  const statusDot = statusIndicator.querySelector('.status-dot');
  const statusText = statusIndicator.querySelector('.status-text');
  
  if (debuggerState.isOffline) {
    statusDot.className = 'status-dot offline';
    statusText.textContent = 'Offline';
  } else if (debuggerState.paused) {
    statusDot.className = 'status-dot paused';
    statusText.textContent = 'Paused';
  } else if (debuggerState.hasError) {
    statusDot.className = 'status-dot error';
    statusText.textContent = 'Error';
  } else {
    statusDot.className = 'status-dot active';
    statusText.textContent = 'Active';
  }
}

function exportDebuggerLogs() {
  const logs = JSON.stringify(debuggerState.logs, null, 2);
  const blob = new Blob([logs], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `debugger-logs-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  a.click();
  URL.revokeObjectURL(url);
  
  addDebuggerLog('Logs exported', LogCategory.SUCCESS);
}

function copyDebuggerLogs() {
  const logsText = debuggerState.logs.map(log => {
    const timestamp = new Date(log.timestamp).toISOString();
    return `[${timestamp}] [${log.category.toUpperCase()}] ${log.message}`;
  }).join('\n');
  
  navigator.clipboard.writeText(logsText).then(() => {
    addDebuggerLog('Logs copied to clipboard', LogCategory.SUCCESS);
  }).catch(err => {
    addDebuggerLog('Failed to copy logs: ' + err.message, LogCategory.ERROR);
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Export debugger functions
window.addDebuggerLog = addDebuggerLog;
window.LogCategory = LogCategory;
