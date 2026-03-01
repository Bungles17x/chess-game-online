// Server Status Page - Admin Only
// This file handles real-time server monitoring and controls

// Global variables
let statusSocket = null;
let connectionStartTime = null;
let currentError = null;
let connectionLatency = 0;
let latencyHistory = [];
let reconnectAttempts = 0;
let totalMessagesReceived = 0;
let totalMessagesSent = 0;
let lastPingTime = 0;
let currentRooms = [];
let connectionQuality = 'Good';
let isPaused = false;
let refreshTimer = null;
let latencyTimer = null;
let uptimeTimer = null;
let peakConcurrentGames = 0;
let connectionHistory = [];
let maxHistoryLength = 100;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Check if user is admin
  if (!isAdminUser()) {
    alert('Access Denied: Admin privileges required');
    window.location.href = 'index.html';
    return;
  }

  // Connect to server
  connectToServer();

  // Initialize status monitoring
  initializeStatusMonitoring();
  initializeControls();
  initializeActivityLog();
  startAutoRefresh();

  // Add event listeners for online/offline events
  window.addEventListener('offline', () => {
    console.log('Offline event detected');
    currentError = 'No internet connection. Please check your network connection and try again.';
    updateServerStatus({
      status: 'Error',
      error: currentError,
      activePlayers: 0,
      activeGames: 0,
      uptime: '0h 0m'
    });
    // Close existing WebSocket connection
    if (statusSocket) {
      console.log('Closing WebSocket connection due to offline event');
      statusSocket.close();
    }
  });

  window.addEventListener('online', () => {
    console.log('Online event detected');
    addActivityLog('Internet connection restored');
    // Clear error state
    currentError = null;
    // Update status to show connection is being restored
    updateServerStatus({
      status: 'Connecting',
      activePlayers: 0,
      activeGames: 0,
      uptime: '0h 0m'
    });
    // Reconnect to server
    connectToServer();
  });
});

// Get current user from localStorage
function getCurrentUser() {
  try {
    // Try to get user data directly first (non-encrypted)
    const userData = localStorage.getItem('currentUser');
    if (userData) {
      try {
        return JSON.parse(userData);
      } catch (e) {
        // If parsing fails, data might be encrypted - try to decrypt
        try {
          // Check if it's encrypted format (contains separator)
          if (userData.includes(':')) {
            const parts = userData.split(':');
            if (parts.length >= 2) {
              const encrypted = decodeURIComponent(escape(atob(parts[1])));
              return JSON.parse(encrypted);
            }
          }
        } catch (decryptError) {
          console.error('Decryption failed, trying direct parse:', decryptError);
        }
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

  // Check if username is in admin list or has admin privileges
  const adminUsers = ['bungles17x','674121bruh']; // Add more admin usernames as needed
  return adminUsers.includes(currentUser.username.toLowerCase());
}

// Connect to server
function connectToServer() {
  // Check internet connection before attempting to connect
  if (!navigator.onLine) {
    console.log('No internet connection detected, skipping WebSocket connection');
    currentError = 'No internet connection. Please check your network connection and try again.';
    updateServerStatus({
      status: 'Error',
      error: currentError,
      activePlayers: 0,
      activeGames: 0,
      uptime: '0h 0m'
    });
    return;
  }

  const wsUrl = 'wss://chess-game-online-u34h.onrender.com';
  console.log('Attempting to connect to WebSocket:', wsUrl);

  try {
    statusSocket = new WebSocket(wsUrl);

    statusSocket.onopen = () => {
      console.log('WebSocket connection established');
      connectionStartTime = new Date();
      reconnectAttempts = 0;
      latencyHistory = [];
      addConnectionToHistory('connected');
      addActivityLog('Connected to server');
      // Request rooms list to get active games count
      statusSocket.send(JSON.stringify({ type: 'listRooms' }));
      // Initial latency measurement
      setTimeout(measureLatency, 1000);
    };

    statusSocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // Log error messages as ERROR type
        if (data.type === 'error') {
          console.error(`Server error: ${data.message}`);
        } else {
          console.log('Received message from server:', event.data);
        }
        handleServerMessage(data);
      } catch (error) {
        console.error('Error parsing server message:', error);
      }
    };

    statusSocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      console.log('Current online status:', navigator.onLine);
      addActivityLog('Connection error');

      // Check if there's no internet connection
      if (!navigator.onLine) {
        console.log('No internet connection detected after WebSocket error');
        currentError = 'No internet connection. Please check your network connection and try again.';
        addConnectionToHistory('offline');
        updateServerStatus({
          status: 'Error',
          error: currentError,
          activePlayers: 0,
          activeGames: 0,
          uptime: '0h 0m'
        });
      } else {
        console.log('Internet connection is available, but WebSocket failed');
        currentError = 'Failed to connect to server. The server may be temporarily unavailable.';
        updateServerStatus({
          status: 'Error',
          error: currentError,
          activePlayers: 0,
          activeGames: 0,
          uptime: '0h 0m'
        });
      }
    };

    statusSocket.onclose = () => {
      console.log('WebSocket connection closed');
      reconnectAttempts++;
      addConnectionToHistory('disconnected');
      addActivityLog(`Disconnected from server (Attempt ${reconnectAttempts})`);
      updateReconnectAttempts();
      // Attempt to reconnect after 5 seconds
      setTimeout(connectToServer, 5000);
    };
  } catch (error) {
    console.error('Error connecting to server:', error);
    addActivityLog('Failed to connect to server');
  }
}

// Handle messages from server
function handleServerMessage(data) {
  totalMessagesReceived++;
  
  switch (data.type) {
    case 'rooms':
      // Update active games count based on rooms
      currentRooms = data.rooms || [];
      const activeGames = currentRooms.length;
      
      // Track peak concurrent games
      if (activeGames > peakConcurrentGames) {
        peakConcurrentGames = activeGames;
        updatePeakGames();
      }
      
      updateActiveGames(activeGames);
      updateRoomList(currentRooms);
      break;
    case 'pong':
      // Calculate latency from ping response
      if (data.timestamp) {
        connectionLatency = Date.now() - data.timestamp;
        latencyHistory.push(connectionLatency);
        // Keep only last 10 measurements
        if (latencyHistory.length > 10) {
          latencyHistory.shift();
        }
        updateLatencyDisplay();
        updateConnectionQuality();
      }
      break;
    case 'server_status':
      updateServerStatus(data);
      break;
    case 'system_resources':
      updateSystemResources(data);
      break;
    case 'performance_metrics':
      updatePerformanceMetrics(data);
      break;
    case 'activity_log':
      addActivityLog(data.message);
      break;
    case 'error':
      console.error('Server error:', data.message);
      addActivityLog(`Server error: ${data.message}`);
      break;
    default:
      console.warn('Unknown message type from server:', data.type);
      break;
  }
  
  updateMessageStats();
}

// Initialize status monitoring
function initializeStatusMonitoring() {
  // Connect to the actual game WebSocket for real-time data
  if (statusSocket && statusSocket.readyState === WebSocket.OPEN) {
    addActivityLog('Connected to game server');
  } else {
    addActivityLog('Connecting to game server...');
  }
}

// Initialize controls
function initializeControls() {
  const restartButton = document.getElementById('restart-server');
  const clearCacheButton = document.getElementById('clear-cache');
  const backupDataButton = document.getElementById('backup-data');
  const viewLogsButton = document.getElementById('view-logs');
  const backButton = document.getElementById('back-btn');

  if (restartButton) {
    restartButton.addEventListener('click', () => {
      if (confirm('Are you sure you want to restart the server?')) {
        addActivityLog('Restarting server...');
        if (statusSocket && statusSocket.readyState === WebSocket.OPEN) {
          statusSocket.send(JSON.stringify({ type: 'restart_server' }));
        } else {
          addActivityLog('Cannot restart: Not connected to server');
        }
      }
    });
  }

  if (clearCacheButton) {
    clearCacheButton.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear the cache?')) {
        addActivityLog('Clearing cache...');
        if (statusSocket && statusSocket.readyState === WebSocket.OPEN) {
          statusSocket.send(JSON.stringify({ type: 'clear_cache' }));
        } else {
          addActivityLog('Cannot clear cache: Not connected to server');
        }
      }
    });
  }

  if (backupDataButton) {
    backupDataButton.addEventListener('click', () => {
      addActivityLog('Creating backup...');
      if (statusSocket && statusSocket.readyState === WebSocket.OPEN) {
        statusSocket.send(JSON.stringify({ type: 'backup_data' }));
      } else {
        addActivityLog('Cannot create backup: Not connected to server');
      }
    });
  }

  if (viewLogsButton) {
    viewLogsButton.addEventListener('click', () => {
      addActivityLog('Fetching server logs...');
      if (statusSocket && statusSocket.readyState === WebSocket.OPEN) {
        statusSocket.send(JSON.stringify({ type: 'get_logs' }));
      } else {
        addActivityLog('Cannot fetch logs: Not connected to server');
      }
    });
  }

  if (backButton) {
    backButton.addEventListener('click', () => {
      window.location.href = 'index.html';
    });
  }
}

// Initialize activity log
function initializeActivityLog() {
  const activityLog = document.getElementById('activity-log');
  if (!activityLog) {
    console.error('Activity log element not found');
    return;
  }

  // Add initial activity
  addActivityLog('Server status page loaded');
}

// Add activity log entry
function addActivityLog(message) {
  const activityLog = document.getElementById('activity-log');
  if (!activityLog) {
    console.error('Activity log element not found');
    return;
  }

  const activityItem = document.createElement('div');
  activityItem.className = 'activity-item';

  const timeSpan = document.createElement('span');
  timeSpan.className = 'activity-time';
  timeSpan.textContent = new Date().toLocaleTimeString();

  const messageSpan = document.createElement('span');
  messageSpan.className = 'activity-message';
  messageSpan.textContent = message;

  activityItem.appendChild(timeSpan);
  activityItem.appendChild(messageSpan);

  // Add to the beginning of the log
  activityLog.insertBefore(activityItem, activityLog.firstChild);

  // Keep only the last 50 entries
  while (activityLog.children.length > 50) {
    activityLog.removeChild(activityLog.lastChild);
  }
}

// Update server status
function updateServerStatus(data) {
  const serverStatus = document.getElementById('server-status');
  const serverError = document.getElementById('server-error');
  const activePlayers = document.getElementById('active-players');
  const activeGames = document.getElementById('active-games');
  const serverUptime = document.getElementById('server-uptime');

  if (serverStatus) {
    serverStatus.textContent = data.status || 'Unknown';
  }

  if (serverError) {
    if (data.error) {
      serverError.textContent = data.error;
      serverError.classList.remove('hidden');
    } else {
      serverError.classList.add('hidden');
    }
  }

  if (activePlayers) {
    activePlayers.textContent = data.activePlayers || 0;
  }

  if (activeGames) {
    activeGames.textContent = data.activeGames || 0;
  }

  if (serverUptime) {
    serverUptime.textContent = data.uptime || '0h 0m';
  }
}

// Update system resources
function updateSystemResources(data) {
  const cpuUsage = document.getElementById('cpu-usage');
  const cpuValue = document.getElementById('cpu-value');
  const memoryUsage = document.getElementById('memory-usage');
  const memoryValue = document.getElementById('memory-value');
  const diskUsage = document.getElementById('disk-usage');
  const diskValue = document.getElementById('disk-value');
  const networkUsage = document.getElementById('network-usage');
  const networkValue = document.getElementById('network-value');

  if (cpuUsage && cpuValue) {
    cpuUsage.style.width = `${data.cpu || 0}%`;
    cpuValue.textContent = data.cpu || 0;
  }

  if (memoryUsage && memoryValue) {
    memoryUsage.style.width = `${data.memory || 0}%`;
    memoryValue.textContent = data.memory || 0;
  }

  if (diskUsage && diskValue) {
    diskUsage.style.width = `${data.disk || 0}%`;
    diskValue.textContent = data.disk || 0;
  }

  if (networkUsage && networkValue) {
    networkUsage.style.width = `${data.network || 0}%`;
    networkValue.textContent = data.network || 0;
  }
}

// Update active games count
function updateActiveGames(count) {
  const activeGamesElement = document.getElementById('active-games');
  if (activeGamesElement) {
    activeGamesElement.textContent = count;
  }
}

// Update room list display
function updateRoomList(rooms) {
  const roomListElement = document.getElementById('room-list');
  if (!roomListElement) return;
  
  roomListElement.innerHTML = '';
  
  if (rooms.length === 0) {
    roomListElement.innerHTML = '<p class="no-rooms">No active games</p>';
    return;
  }
  
  rooms.forEach(room => {
    const roomItem = document.createElement('div');
    roomItem.className = 'room-item';
    roomItem.innerHTML = `
      <span class="room-name">🎮 ${room}</span>
      <span class="room-status">Active</span>
    `;
    roomListElement.appendChild(roomItem);
  });
}

// Update message statistics
function updateMessageStats() {
  const messagesReceivedElement = document.getElementById('messages-received');
  const messagesSentElement = document.getElementById('messages-sent');
  
  if (messagesReceivedElement) {
    messagesReceivedElement.textContent = totalMessagesReceived;
  }
  
  if (messagesSentElement) {
    messagesSentElement.textContent = totalMessagesSent;
  }
}

// Calculate connection quality based on latency
function updateConnectionQuality() {
  if (latencyHistory.length < 3) return;
  
  const avgLatency = latencyHistory.reduce((a, b) => a + b, 0) / latencyHistory.length;
  
  if (avgLatency < 100) {
    connectionQuality = 'Excellent';
  } else if (avgLatency < 200) {
    connectionQuality = 'Good';
  } else if (avgLatency < 500) {
    connectionQuality = 'Fair';
  } else {
    connectionQuality = 'Poor';
  }
  
  updateConnectionQualityDisplay();
}

// Update connection quality display
function updateConnectionQualityDisplay() {
  const qualityElement = document.getElementById('connection-quality');
  if (qualityElement) {
    qualityElement.textContent = connectionQuality;
    qualityElement.className = `quality-indicator ${connectionQuality.toLowerCase()}`;
  }
}

// Measure connection latency
function measureLatency() {
  if (statusSocket && statusSocket.readyState === WebSocket.OPEN) {
    lastPingTime = Date.now();
    totalMessagesSent++;
    statusSocket.send(JSON.stringify({ type: 'ping', timestamp: lastPingTime }));
  }
}

// Update latency display
function updateLatencyDisplay() {
  const latencyElement = document.getElementById('connection-latency');
  if (latencyElement) {
    latencyElement.textContent = `${connectionLatency}ms`;
  }
}

// Update performance metrics
function updatePerformanceMetrics(data) {
  const avgResponseTime = document.getElementById('avg-response-time');
  const requestsPerSecond = document.getElementById('requests-per-second');
  const errorRate = document.getElementById('error-rate');
  const activeConnections = document.getElementById('active-connections');

  if (avgResponseTime) {
    avgResponseTime.textContent = `${data.avgResponseTime || 0}ms`;
  }

  if (requestsPerSecond) {
    requestsPerSecond.textContent = data.requestsPerSecond || 0;
  }

  if (errorRate) {
    errorRate.textContent = `${data.errorRate || 0}%`;
  }

  if (activeConnections) {
    activeConnections.textContent = data.activeConnections || 0;
  }
}

// Start auto refresh
function startAutoRefresh() {
  // Refresh rooms list every 5 seconds
  setInterval(() => {
    if (statusSocket && statusSocket.readyState === WebSocket.OPEN) {
      statusSocket.send(JSON.stringify({ type: 'listRooms' }));
    }
  }, 5000);

  // Measure latency every 3 seconds
  setInterval(() => {
    measureLatency();
  }, 3000);

  // Update uptime every second
  setInterval(() => {
    if (connectionStartTime) {
      const now = new Date();
      const diff = Math.floor((now - connectionStartTime) / 1000);
      const hours = Math.floor(diff / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      const seconds = diff % 60;

      const serverUptime = document.getElementById('server-uptime');
      if (serverUptime) {
        serverUptime.textContent = `${hours}h ${minutes}m ${seconds}s`;
      }
    }
  }, 1000);
}

// Add connection to history
function addConnectionToHistory(status) {
  const historyEntry = {
    timestamp: new Date(),
    status: status
  };
  
  connectionHistory.push(historyEntry);
  
  if (connectionHistory.length > maxHistoryLength) {
    connectionHistory.shift();
  }
  
  updateConnectionHistoryDisplay();
}

// Update connection history display
function updateConnectionHistoryDisplay() {
  const historyElement = document.getElementById('connection-history');
  if (!historyElement) return;
  
  historyElement.innerHTML = '';
  
  connectionHistory.slice(-10).reverse().forEach(entry => {
    const historyItem = document.createElement('div');
    historyItem.className = `history-item ${entry.status}`;
    historyItem.innerHTML = `
      <span class="history-time">${entry.timestamp.toLocaleTimeString()}</span>
      <span class="history-status">${entry.status}</span>
    `;
    historyElement.appendChild(historyItem);
  });
}

// Update peak games
function updatePeakGames() {
  const peakElement = document.getElementById('peak-games');
  if (peakElement) {
    peakElement.textContent = peakConcurrentGames;
  }
}

// Export statistics
function exportStatistics() {
  const stats = {
    timestamp: new Date().toISOString(),
    connection: {
      status: statusSocket ? statusSocket.readyState : 'disconnected',
      latency: connectionLatency,
      quality: connectionQuality,
      reconnectAttempts: reconnectAttempts
    },
    messages: {
      sent: totalMessagesSent,
      received: totalMessagesReceived
    },
    games: {
      active: currentRooms.length,
      peak: peakConcurrentGames
    },
    rooms: currentRooms,
    latencyHistory: latencyHistory,
    connectionHistory: connectionHistory
  };
  
  const blob = new Blob([JSON.stringify(stats, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `server-stats-${new Date().toISOString()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  addActivityLog('Statistics exported');
}

// Clear statistics
function clearStatistics() {
  reconnectAttempts = 0;
  totalMessagesReceived = 0;
  totalMessagesSent = 0;
  peakConcurrentGames = 0;
  latencyHistory = [];
  connectionHistory = [];
  
  updateMessageStats();
  updateReconnectAttempts();
  updatePeakGames();
  updateConnectionHistoryDisplay();
  
  addActivityLog('Statistics cleared');
}

// Update reconnection attempts display
function updateReconnectAttempts() {
  const reconnectElement = document.getElementById('reconnect-attempts');
  if (reconnectElement) {
    reconnectElement.textContent = reconnectAttempts;
  }
}
