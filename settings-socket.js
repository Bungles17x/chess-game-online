// Settings Page WebSocket Initialization
// This file initializes the WebSocket connection for the settings page
// without loading the full game script

// WebSocket connection
let socket = null;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;

// Get WebSocket URL
function getWebSocketUrl() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.hostname;

  // Always use port 8080 for WebSocket connections
  return `${protocol}//${host}:8080`;
}

// Debug function to check connection status
function debugConnectionStatus() {
  console.log('[Settings Socket Debug] Connection Status:', {
    socketExists: !!socket,
    readyState: socket ? socket.readyState : 'No socket',
    readyStateText: socket ? 
      (socket.readyState === 0 ? 'CONNECTING' :
       socket.readyState === 1 ? 'OPEN' :
       socket.readyState === 2 ? 'CLOSING' :
       socket.readyState === 3 ? 'CLOSED' : 'UNKNOWN') : 'No socket',
    username: localStorage.getItem('currentUser'),
    reconnectAttempts
  });
}

// Initialize WebSocket connection
function initWebSocket() {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    console.log('[Settings Socket] WebSocket already connected or connecting');
    debugConnectionStatus();
    return;
  }

  const wsUrl = getWebSocketUrl();
  console.log('[Settings Socket] Connecting to:', wsUrl);

  try {
    socket = new WebSocket(wsUrl);
    window.socket = socket;

    console.log('[Settings Socket] WebSocket object created, current state:', socket.readyState);

    socket.onopen = function(e) {
      console.log('[Settings Socket] Connected successfully');
      console.log('[Settings Socket Debug] Connection details:', {
        url: e.target.url,
        readyState: e.target.readyState,
        timestamp: new Date().toISOString()
      });
      debugConnectionStatus();
      reconnectAttempts = 0;

      // Update server status indicator
      const serverStatus = document.getElementById('server-status');
      if (serverStatus) {
        serverStatus.textContent = 'Connected';
        serverStatus.style.color = '#4CAF50';
      }

      // Send authentication with username
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
      const username = currentUser?.username || 'Player';

      console.log('[Settings Socket Debug] Attempting authentication with username:', username);

      if (socket && socket.readyState === WebSocket.OPEN) {
        const authMessage = {
          type: "authenticate",
          username: username
        };
        socket.send(JSON.stringify(authMessage));
        console.log('[Settings Socket] Authentication sent:', authMessage);
      } else {
        console.error('[Settings Socket Error] Cannot send authentication - socket not ready');
      }
    };

    socket.onmessage = function(e) {
      console.log('[Settings Socket Debug] Message received:', e.data);
      try {
        const data = JSON.parse(e.data);
        console.log('[Settings Socket Debug] Parsed message:', data);

        // Handle authentication success
        if (data.type === 'authenticated') {
          console.log('[Settings Socket] Authentication successful');
          console.log('[Settings Socket Debug] Authenticated username:', data.username);
          // Dispatch socket connected event after authentication
          window.dispatchEvent(new CustomEvent('socketConnected'));
          debugConnectionStatus();
        }

        // Handle sync responses
        if (window.userSyncManager) {
          window.userSyncManager.handleSyncResponse(data);
        }
      } catch (error) {
        console.error('[Settings Socket] Error parsing message:', error);
        console.error('[Settings Socket Debug] Raw message that failed to parse:', e.data);
      }
    };

    socket.onerror = function(e) {
      console.error('[Settings Socket] WebSocket error:', e);
      console.error('[Settings Socket Debug] Error details:', {
        type: e.type,
        target: e.target,
        timestamp: new Date().toISOString()
      });
      debugConnectionStatus();

      // Update server status indicator
      const serverStatus = document.getElementById('server-status');
      if (serverStatus) {
        serverStatus.textContent = 'Connection Error';
        serverStatus.style.color = '#f44336';
      }
    };

    socket.onclose = function(e) {
      console.log('[Settings Socket] Connection closed:', e.code, e.reason);
      console.log('[Settings Socket Debug] Close details:', {
        code: e.code,
        reason: e.reason,
        wasClean: e.wasClean,
        timestamp: new Date().toISOString()
      });
      debugConnectionStatus();

      // Update server status indicator
      const serverStatus = document.getElementById('server-status');
      if (serverStatus) {
        serverStatus.textContent = 'Disconnected';
        serverStatus.style.color = '#f44336';
      }

      // Attempt to reconnect
      if (reconnectAttempts < maxReconnectAttempts) {
        reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000);
        console.log('[Settings Socket] Reconnecting in', delay, 'ms...');
        setTimeout(initWebSocket, delay);
      } else {
        console.error('[Settings Socket] Max reconnection attempts reached');
      }
    };
  } catch (error) {
    console.error('[Settings Socket] Failed to create WebSocket:', error);
  }
}

// Initialize WebSocket when page loads
document.addEventListener('DOMContentLoaded', () => {
  initWebSocket();
});
