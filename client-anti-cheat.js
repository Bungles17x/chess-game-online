// client-anti-cheat.js
// Client-side anti-cheat system for bot mode

// Anti-cheat data structures
let playerMoveHistory = [];
let suspiciousActivity = {
  count: 0,
  lastReported: 0,
  activities: []
};
let lastMoveTime = Date.now();

// Anti-cheat constants
const MIN_MOVE_TIME = 500; // Minimum time between moves in milliseconds
const SUSPICIOUS_MOVE_COUNT = 20; // Number of suspicious moves before flagging
const SUSPICIOUS_WINDOW = 60000; // Time window for suspicious activity (1 minute)
const MAX_INVALID_MOVES = 5; // Maximum invalid moves before disconnect
const AUTO_BAN_THRESHOLD = 30; // Number of suspicious moves before auto-ban

// Initialize anti-cheat
function initAntiCheat() {
  debugLog("ANTI-CHEAT", "Client-side anti-cheat initialized");
}

// Record a move for anti-cheat tracking
function recordMove(move) {
  const currentTime = Date.now();
  playerMoveHistory.push({
    timestamp: currentTime,
    move: move
  });

  // Keep only last 100 moves
  if (playerMoveHistory.length > 100) {
    playerMoveHistory.shift();
  }

  // Update last move time
  lastMoveTime = currentTime;
}

// Check move timing
function checkMoveTiming() {
  if (playerMoveHistory.length === 0) {
    return { valid: true };
  }

  const lastMove = playerMoveHistory[playerMoveHistory.length - 1];
  const currentTime = Date.now();
  const timeSinceLastMove = currentTime - lastMove.timestamp;

  if (timeSinceLastMove < MIN_MOVE_TIME) {
    return {
      valid: false,
      reason: 'Move made too quickly',
      timeSinceLastMove
    };
  }

  return { valid: true };
}

// Track suspicious activity
function trackSuspiciousActivity(activityType) {
  const currentTime = Date.now();

  // Filter old activities
  suspiciousActivity.activities = suspiciousActivity.activities.filter(
    a => currentTime - a.timestamp < SUSPICIOUS_WINDOW
  );

  // Add new activity
  suspiciousActivity.activities.push({
    type: activityType,
    timestamp: currentTime
  });

  suspiciousActivity.count = suspiciousActivity.activities.length;

  // Check if should report
  if (suspiciousActivity.count >= SUSPICIOUS_MOVE_COUNT &&
      (currentTime - suspiciousActivity.lastReported > SUSPICIOUS_WINDOW)) {
    suspiciousActivity.lastReported = currentTime;

    // Auto-ban only if suspicious activity is extremely severe
    if (suspiciousActivity.count >= AUTO_BAN_THRESHOLD) {
      handleAutoBan();
    }

    return {
      shouldReport: true,
      count: suspiciousActivity.count,
      activities: suspiciousActivity.activities
    };
  }

  return { shouldReport: false };
}

// Handle automatic ban
function handleAutoBan() {
  const totalSuspiciousMoves = suspiciousActivity.count;
  
  // Get the current username from currentUser or username
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  const username = currentUser ? currentUser.username : (localStorage.getItem('username') || 'Unknown');

  // Determine ban duration based on severity
  let banDuration = null;
  let banUnit = 'permanent';

  if (totalSuspiciousMoves >= 20) {
    // Severe cheating - permanent ban
    banDuration = null;
    banUnit = 'permanent';
  } else if (totalSuspiciousMoves >= 15) {
    // Very severe cheating - 90 day ban
    banDuration = 90;
    banUnit = 'days';
  } else if (totalSuspiciousMoves >= 10) {
    // Severe cheating - 30 day ban
    banDuration = 30;
    banUnit = 'days';
  } else if (totalSuspiciousMoves >= 7) {
    // Moderate cheating - 14 day ban
    banDuration = 14;
    banUnit = 'days';
  } else if (totalSuspiciousMoves >= 5) {
    // Mild cheating - 7 day ban
    banDuration = 7;
    banUnit = 'days';
  }

  // Store ban in localStorage
  const banData = {
    username: username,
    timestamp: Date.now(),
    duration: banDuration,
    unit: banUnit,
    reason: 'Automatic ban due to suspicious activity',
    activities: suspiciousActivity.activities.map(a => a.type).join(', ')
  };

  // Store ban in localStorage with username
  localStorage.setItem('botModeBan', JSON.stringify(banData));
  localStorage.setItem('bannedUsername', username);
  
  // Send ban information to server to add to manage ban list
  if (typeof socket !== 'undefined' && socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      type: 'banUser',
      username: username,
      reason: banData.reason,
      duration: banData.duration,
      unit: banData.unit
    }));
    debugLog("ANTI-CHEAT", "Ban sent to server", { username, banData });
  } else {
    debugLog("ANTI-CHEAT", "Socket not available, ban stored locally only", { username, banData });
  }

  // Show ban popup using the modal from script.js
  // Calculate expiry time based on unit
  let expiresAt = null;
  if (banData.duration) {
    if (banData.unit === 'hours') {
      expiresAt = banData.timestamp + (banData.duration * 60 * 60 * 1000);
    } else if (banData.unit === 'days') {
      expiresAt = banData.timestamp + (banData.duration * 24 * 60 * 60 * 1000);
    }
  }
  
  // Call the showBanModal function from script.js if it exists
  if (typeof showBanModal === 'function') {
    showBanModal(
      "You have been banned",
      banData.reason || 'No reason provided',
      banData.duration,
      banData.unit,
      expiresAt
    );
  } else {
    // Fallback to showBanPopup if showBanModal is not available
    showBanPopup(banData);
  }

  // Reset game
  initBoard();

  debugLog("ANTI-CHEAT", "Player auto-banned", banData);
}

// Check if player is banned
function checkBanStatus() {
  const banData = localStorage.getItem('botModeBan');
  if (!banData) return false;

  const ban = JSON.parse(banData);

  // If permanent ban
  if (!ban.duration) {
    showBanPopup(ban);
    return true;
  }

  // Check if ban has expired
  let expiryTime;
  if (ban.unit === 'hours') {
    expiryTime = ban.timestamp + (ban.duration * 60 * 60 * 1000);
  } else if (ban.unit === 'days') {
    expiryTime = ban.timestamp + (ban.duration * 24 * 60 * 60 * 1000);
  } else {
    expiryTime = ban.timestamp + (ban.duration * 24 * 60 * 60 * 1000); // default to days
  }
  if (Date.now() > expiryTime) {
    localStorage.removeItem('botModeBan');
    return false;
  }

  // Show ban popup using the modal from script.js
  // Calculate expiry time based on unit
  let expiresAt = null;
  if (ban.duration) {
    if (ban.unit === 'hours') {
      expiresAt = ban.timestamp + (ban.duration * 60 * 60 * 1000);
    } else if (ban.unit === 'days') {
      expiresAt = ban.timestamp + (ban.duration * 24 * 60 * 60 * 1000);
    }
  }
  
  // Call the showBanModal function from script.js if it exists
  if (typeof showBanModal === 'function') {
    showBanModal(
      "You have been banned",
      ban.reason || 'No reason provided',
      ban.duration,
      ban.unit,
      expiresAt
    );
  } else {
    // Fallback to showBanPopup if showBanModal is not available
    showBanPopup(ban);
  }
  return true;
}

// Show ban popup
function showBanPopup(banData) {
  // Create popup element
  const popup = document.createElement('div');
  popup.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 40px;
    border-radius: 10px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.3);
    text-align: center;
    z-index: 10000;
    max-width: 500px;
  `;

  const expiryText = banData.duration 
    ? `Expires: ${new Date(banData.timestamp + (banData.duration * 24 * 60 * 60 * 1000)).toLocaleString()}`
    : 'Permanent ban';

  popup.innerHTML = `
    <h2 style="margin-top: 0; font-size: 28px;">⚠️ Account Banned</h2>
    <p style="font-size: 16px; margin: 20px 0;">${banData.reason}</p>
    <p style="font-size: 14px; opacity: 0.9;">Reason: ${banData.activities}</p>
    <p style="font-size: 14px; opacity: 0.9;">${expiryText}</p>
    <button onclick="location.reload()" style="
      margin-top: 20px;
      padding: 12px 30px;
      background: white;
      color: #667eea;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 16px;
      font-weight: bold;
    ">OK</button>
  `;

  // Add overlay
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
    z-index: 9999;
  `;

  // Add to page
  overlay.appendChild(popup);
  document.body.appendChild(overlay);
}

// Export functions for use in script.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initAntiCheat,
    recordMove,
    checkMoveTiming,
    trackSuspiciousActivity,
    checkBanStatus
  };
}
