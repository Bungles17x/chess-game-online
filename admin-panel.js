// Admin Panel for bungles17x
// This provides a UI for admin functions

// Check if current user is admin
function isAdmin() {
  const currentUser = localStorage.getItem('currentUser');
  return currentUser && JSON.parse(currentUser).username.toLowerCase() === 'bungles17x','674121bruh';
}

// Create admin panel UI
function createAdminPanel() {
  if (!isAdmin()) return;

  const adminPanel = document.createElement('div');
  adminPanel.id = 'admin-panel';
  adminPanel.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 15px;
    border-radius: 10px;
    z-index: 10000;
    font-family: Arial, sans-serif;
    min-width: 250px;
    box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
  `;

  const header = document.createElement('h3');
  header.textContent = '👑 Admin Panel';
  header.style.margin = '0 0 10px 0';
  header.style.color = '#FFD700';
  adminPanel.appendChild(header);

  // Add admin buttons
  const buttons = [
    { text: '👁️ View All Games', action: () => adminViewAllGames() },
    { text: '🚫 Ban User', action: () => adminBanUser() },
    { text: '✅ Unban User', action: () => adminUnbanUser() },
    { text: '👢 Kick User', action: () => adminKickUser() },
    { text: '🔇 Mute User', action: () => adminMuteUser() },
    { text: '🎮 Control Game', action: () => adminControlGame() },
    { text: '📊 System Stats', action: () => adminGetStats() },
    { text: '📜 View Logs', action: () => adminViewLogs() },
    { text: '⚡ Execute Command', action: () => adminExecuteCommand() }
  ];

  buttons.forEach(btn => {
    const button = document.createElement('button');
    button.textContent = btn.text;
    button.style.cssText = `
      width: 100%;
      margin: 5px 0;
      padding: 8px;
      background: #4CAF50;
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      transition: background 0.3s;
    `;
    button.onmouseover = () => button.style.background = '#45a049';
    button.onmouseout = () => button.style.background = '#4CAF50';
    button.onclick = btn.action;
    adminPanel.appendChild(button);
  });

  // Add minimize button
  const minimizeBtn = document.createElement('button');
  minimizeBtn.textContent = '−';
  minimizeBtn.style.cssText = `
    position: absolute;
    top: 5px;
    right: 5px;
    background: transparent;
    color: white;
    border: none;
    cursor: pointer;
    font-size: 20px;
  `;
  minimizeBtn.onclick = () => {
    adminPanel.style.display = adminPanel.style.display === 'none' ? 'block' : 'none';
  };
  adminPanel.appendChild(minimizeBtn);

  document.body.appendChild(adminPanel);
}

// Admin functions
function adminViewAllGames() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'adminViewAllGames' }));
  }
}

function adminBanUser() {
  const username = prompt('Enter username to ban:');
  if (username) {
    const reason = prompt('Enter ban reason:') || 'No reason provided';
    const duration = prompt('Enter duration (leave blank for permanent):');
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'banUser',
        username: username,
        reason: reason,
        duration: duration,
        unit: 'days'
      }));
    }
  }
}

function adminUnbanUser() {
  const username = prompt('Enter username to unban:');
  if (username && ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'unbanUser',
      username: username
    }));
  }
}

function adminKickUser() {
  const username = prompt('Enter username to kick:');
  if (username && ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'adminKickUser',
      username: username
    }));
  }
}

function adminMuteUser() {
  const username = prompt('Enter username to mute:');
  if (username && ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'adminMuteUser',
      username: username
    }));
  }
}

function adminControlGame() {
  const roomId = prompt('Enter room ID to control:');
  if (roomId && ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'adminControlGame',
      roomId: roomId
    }));
  }
}

function adminGetStats() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'adminGetStats' }));
  }
}

function adminViewLogs() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'adminViewLogs' }));
  }
}

function adminExecuteCommand() {
  const command = prompt('Enter command to execute:');
  if (command && ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'adminExecuteCommand',
      command: command
    }));
  }
}

// Initialize admin panel when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  if (isAdmin()) {
    createAdminPanel();
  }
});

// Make functions available globally
window.isAdmin = isAdmin;
window.createAdminPanel = createAdminPanel;
