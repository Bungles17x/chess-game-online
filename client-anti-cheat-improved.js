// client-anti-cheat-improved.js
// Improved client-side anti-cheat system for bot mode

// Anti-cheat data structures
let playerMoveHistory = [];
let suspiciousActivity = {
  count: 0,
  lastReported: 0,
  activities: [],
  detectionMethods: new Set(), // Track different detection methods
  confidence: 0 // Confidence score (0-100)
};
let lastMoveTime = Date.now();
let cheatDetectionInitialized = false; // Flag to prevent duplicate initialization messages

// Anti-cheat constants
const MIN_MOVE_TIME = 500; // Minimum time between moves in milliseconds
const SUSPICIOUS_MOVE_COUNT = 5; // Number of suspicious moves before flagging (lowered for testing)
const SUSPICIOUS_WINDOW = 60000; // Time window for suspicious activity (1 minute)
const MAX_INVALID_MOVES = 5; // Maximum invalid moves before disconnect
const AUTO_BAN_THRESHOLD = 10; // Number of suspicious moves before auto-ban (lowered for testing)

// Ban accuracy settings
const BAN_CONFIRMATION_REQUIRED = true; // Require multiple detection methods before banning
const BAN_CONFIRMATION_COUNT = 3; // Number of different detection methods required
const BAN_APPEAL_URL = 'https://chess-game-online-u34h.onrender.com/appeal'; // URL for ban appeals

// Initialize anti-cheat
function initAntiCheat() {
  debugLog("ANTI-CHEAT", "Client-side anti-cheat initialized");

  // Start cheat extension detection
  detectCheatExtensions();
}

// Detect cheat extensions
function detectCheatExtensions() {
  const suspiciousExtensions = [
    'chess-bot',
    'chess-cheat',
    'chess-helper',
    'chess-assistant',
    'chess-engine',
    'chess-ai',
    'chess-auto',
    'chess-hack',
    'chess-mod',
    'chess-plus',
    'chess-pro',
    'chess-master',
    'chess-king',
    'chess-queen',
    'chess-knight',
    'chess-bishop',
    'chess-rook',
    'chess-pawn'
  ];

  // Check for suspicious DOM elements
  const suspiciousElements = document.querySelectorAll('[id*="chess"], [class*="chess"]');
  suspiciousElements.forEach(element => {
    const id = element.id.toLowerCase();
    const className = element.className.toLowerCase();

    suspiciousExtensions.forEach(extension => {
      if (id.includes(extension) || className.includes(extension)) {
        debugLog("ANTI-CHEAT", "Suspicious element detected", { id, className, extension });
        trackSuspiciousActivity('cheat_extension_detected', { id, className, extension });
      }
    });
  });

  // Check for suspicious global variables
  Object.keys(window).forEach(key => {
    const lowerKey = key.toLowerCase();
    suspiciousExtensions.forEach(extension => {
      if (lowerKey.includes(extension)) {
        debugLog("ANTI-CHEAT", "Suspicious global variable detected", { key, extension });
        trackSuspiciousActivity('cheat_extension_detected', { key, extension });
      }
    });
  });

  // Check for suspicious scripts
  const scripts = document.querySelectorAll('script');
  scripts.forEach(script => {
    const src = script.src.toLowerCase();
    const content = script.textContent.toLowerCase();

    suspiciousExtensions.forEach(extension => {
      if (src.includes(extension) || content.includes(extension)) {
        debugLog("ANTI-CHEAT", "Suspicious script detected", { src, extension });
        trackSuspiciousActivity('cheat_extension_detected', { src, extension });
      }
    });
  });

  // Check for suspicious localStorage items
  Object.keys(localStorage).forEach(key => {
    const lowerKey = key.toLowerCase();
    suspiciousExtensions.forEach(extension => {
      if (lowerKey.includes(extension)) {
        debugLog("ANTI-CHEAT", "Suspicious localStorage item detected", { key, extension });
        trackSuspiciousActivity('cheat_extension_detected', { key, extension });
      }
    });
  });

  // Check for suspicious sessionStorage items
  Object.keys(sessionStorage).forEach(key => {
    const lowerKey = key.toLowerCase();
    suspiciousExtensions.forEach(extension => {
      if (lowerKey.includes(extension)) {
        debugLog("ANTI-CHEAT", "Suspicious sessionStorage item detected", { key, extension });
        trackSuspiciousActivity('cheat_extension_detected', { key, extension });
      }
    });
  });

  // Check for suspicious cookies
  document.cookie.split(';').forEach(cookie => {
    const lowerCookie = cookie.toLowerCase();
    suspiciousExtensions.forEach(extension => {
      if (lowerCookie.includes(extension)) {
        debugLog("ANTI-CHEAT", "Suspicious cookie detected", { cookie, extension });
        trackSuspiciousActivity('cheat_extension_detected', { cookie, extension });
      }
    });
  });

  // Check for suspicious URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  urlParams.forEach((value, key) => {
    const lowerKey = key.toLowerCase();
    const lowerValue = value.toLowerCase();

    suspiciousExtensions.forEach(extension => {
      if (lowerKey.includes(extension) || lowerValue.includes(extension)) {
        debugLog("ANTI-CHEAT", "Suspicious URL parameter detected", { key, value, extension });
        trackSuspiciousActivity('cheat_extension_detected', { key, value, extension });
      }
    });
  });

  // Check for suspicious user agent
  const userAgent = navigator.userAgent.toLowerCase();
  suspiciousExtensions.forEach(extension => {
    if (userAgent.includes(extension)) {
      debugLog("ANTI-CHEAT", "Suspicious user agent detected", { userAgent, extension });
      trackSuspiciousActivity('cheat_extension_detected', { userAgent, extension });
    }
  });

  // Check for suspicious window properties
  const suspiciousProperties = ['chessBot', 'chessCheat', 'chessHelper', 'chessAssistant', 'chessEngine', 'chessAI', 'chessAuto', 'chessHack', 'chessMod', 'chessPlus', 'chessPro', 'chessMaster', 'chessKing', 'chessQueen', 'chessKnight', 'chessBishop', 'chessRook', 'chessPawn'];
  suspiciousProperties.forEach(property => {
    if (window[property]) {
      debugLog("ANTI-CHEAT", "Suspicious window property detected", { property });
      trackSuspiciousActivity('cheat_extension_detected', { property });
    }
  });

  // Check for suspicious functions
  const suspiciousFunctions = ['autoMove', 'bestMove', 'calculateMove', 'engineMove', 'aiMove', 'botMove', 'hackMove', 'cheatMove'];
  suspiciousFunctions.forEach(func => {
    if (window[func] && typeof window[func] === 'function') {
      debugLog("ANTI-CHEAT", "Suspicious function detected", { func });
      trackSuspiciousActivity('cheat_extension_detected', { func });
    }
  });

  // Check for suspicious event listeners
  const suspiciousEvents = ['mousemove', 'click', 'keydown', 'keyup'];
  suspiciousEvents.forEach(event => {
    const listeners = getEventListeners ? getEventListeners(document)[event] : [];
    if (listeners && listeners.length > 10) {
      debugLog("ANTI-CHEAT", "Suspicious number of event listeners detected", { event, count: listeners.length });
      trackSuspiciousActivity('cheat_extension_detected', { event, count: listeners.length });
    }
  });

  // Check for suspicious intervals
  const originalSetInterval = window.setInterval;
  window.setInterval = function(callback, delay) {
    if (delay < 100) {
      debugLog("ANTI-CHEAT", "Suspicious interval detected", { delay });
      trackSuspiciousActivity('cheat_extension_detected', { delay });
    }
    return originalSetInterval.apply(this, arguments);
  };

  // Check for suspicious timeouts
  const originalSetTimeout = window.setTimeout;
  window.setTimeout = function(callback, delay) {
    if (delay < 50) {
      debugLog("ANTI-CHEAT", "Suspicious timeout detected", { delay });
      trackSuspiciousActivity('cheat_extension_detected', { delay });
    }
    return originalSetTimeout.apply(this, arguments);
  };

  // Check for suspicious fetch requests
  const originalFetch = window.fetch;
  window.fetch = function(url, options) {
    const lowerUrl = url.toLowerCase();
    suspiciousExtensions.forEach(extension => {
      if (lowerUrl.includes(extension)) {
        debugLog("ANTI-CHEAT", "Suspicious fetch request detected", { url, extension });
        trackSuspiciousActivity('cheat_extension_detected', { url, extension });
      }
    });
    return originalFetch.apply(this, arguments);
  };

  // Check for suspicious XMLHttpRequest
  const originalXHR = window.XMLHttpRequest;
  window.XMLHttpRequest = function() {
    const xhr = new originalXHR();
    const originalOpen = xhr.open;
    xhr.open = function(method, url) {
      const lowerUrl = url.toLowerCase();
      suspiciousExtensions.forEach(extension => {
        if (lowerUrl.includes(extension)) {
          debugLog("ANTI-CHEAT", "Suspicious XMLHttpRequest detected", { url, extension });
          trackSuspiciousActivity('cheat_extension_detected', { url, extension });
        }
      });
      return originalOpen.apply(this, arguments);
    };
    return xhr;
  };

  // Only log initialization message once
  if (!cheatDetectionInitialized) {
    debugLog("ANTI-CHEAT", "Cheat extension detection initialized");
    cheatDetectionInitialized = true;
  }
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
function trackSuspiciousActivity(activityType, details = {}) {
  const currentTime = Date.now();

  // Filter old activities
  suspiciousActivity.activities = suspiciousActivity.activities.filter(
    a => currentTime - a.timestamp < SUSPICIOUS_WINDOW
  );

  // Add new activity with detailed information
  suspiciousActivity.activities.push({
    type: activityType,
    timestamp: currentTime,
    details: details
  });

  suspiciousActivity.count = suspiciousActivity.activities.length;

  // Track different detection methods
  suspiciousActivity.detectionMethods.add(activityType);

  // Calculate confidence score based on:
  // 1. Number of different detection methods (more methods = higher confidence)
  // 2. Number of suspicious activities (more activities = higher confidence)
  // 3. Severity of activities (some activities are more severe than others)

  const methodCount = suspiciousActivity.detectionMethods.size;
  const activityCount = suspiciousActivity.count;

  // Base confidence from activity count (0-50 points)
  const activityConfidence = Math.min(activityCount * 2, 50);

  // Additional confidence from different detection methods (0-50 points)
  const methodConfidence = Math.min(methodCount * 10, 50);

  // Calculate total confidence
  suspiciousActivity.confidence = activityConfidence + methodConfidence;

  debugLog("ANTI-CHEAT", "Suspicious activity tracked", {
    type: activityType,
    details: details,
    totalActivities: activityCount,
    detectionMethods: Array.from(suspiciousActivity.detectionMethods),
    confidence: suspiciousActivity.confidence
  });

  // Check if should report
  if (suspiciousActivity.count >= SUSPICIOUS_MOVE_COUNT &&
      (currentTime - suspiciousActivity.lastReported > SUSPICIOUS_WINDOW)) {
    suspiciousActivity.lastReported = currentTime;

    // Auto-ban only if:
    // 1. Confidence is high enough (>= 70)
    // 2. Multiple detection methods have been triggered (>= 3)
    // 3. Suspicious activity count is high enough (>= AUTO_BAN_THRESHOLD)
    if (suspiciousActivity.confidence >= 70 && 
        suspiciousActivity.detectionMethods.size >= BAN_CONFIRMATION_COUNT &&
        suspiciousActivity.count >= AUTO_BAN_THRESHOLD) {
      handleAutoBan();
    }

    return {
      shouldReport: true,
      count: suspiciousActivity.count,
      activities: suspiciousActivity.activities,
      detectionMethods: Array.from(suspiciousActivity.detectionMethods),
      confidence: suspiciousActivity.confidence
    };
  }

  return { shouldReport: false };
}

// Handle automatic ban
function handleAutoBan() {
  const totalSuspiciousMoves = suspiciousActivity.count;
  const detectionMethods = Array.from(suspiciousActivity.detectionMethods);
  const confidence = suspiciousActivity.confidence;

  // Get the current username from currentUser or username
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  const username = currentUser ? currentUser.username : (localStorage.getItem('username') || 'Unknown');

  // Determine ban duration based on severity (confidence score and detection methods)
  let banDuration = null;
  let banUnit = 'days';
  let severity = 'mild';

  if (confidence >= 90 && detectionMethods.length >= 5) {
    // Extremely severe cheating - 365 day ban
    banDuration = 365;
    banUnit = 'days';
    severity = 'extreme';
  } else if (confidence >= 80 && detectionMethods.length >= 4) {
    // Very severe cheating - 90 day ban
    banDuration = 90;
    banUnit = 'days';
    severity = 'very severe';
  } else if (confidence >= 70 && detectionMethods.length >= 3) {
    // Severe cheating - 30 day ban
    banDuration = 30;
    banUnit = 'days';
    severity = 'severe';
  } else if (confidence >= 60 && detectionMethods.length >= 2) {
    // Moderate cheating - 14 day ban
    banDuration = 14;
    banUnit = 'days';
    severity = 'moderate';
  } else if (confidence >= 50 && detectionMethods.length >= 1) {
    // Mild cheating - 7 day ban
    banDuration = 7;
    banUnit = 'days';
    severity = 'mild';
  }

  // Create detailed ban reason
  const banReason = `Automatic ban due to ${severity} cheating detected. 
    Detection methods: ${detectionMethods.join(', ')}. 
    Confidence score: ${confidence}%. 
    Total suspicious activities: ${totalSuspiciousMoves}.`;

  // Store ban in localStorage
  const banData = {
    username: username,
    timestamp: Date.now(),
    duration: banDuration,
    unit: banUnit,
    reason: banReason,
    severity: severity,
    confidence: confidence,
    detectionMethods: detectionMethods,
    activities: suspiciousActivity.activities,
    appealUrl: BAN_APPEAL_URL
  };

  // Store ban in localStorage with username
  localStorage.setItem('botModeBan', JSON.stringify(banData));
  localStorage.setItem('bannedUsername', username);

  // Send ban information to server to add to manage ban list
  if (typeof socket !== 'undefined' && socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      type: 'banUser',
      username: username,
      reason: banReason,
      duration: banData.duration,
      unit: banData.unit,
      confidence: confidence,
      detectionMethods: detectionMethods
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
      banReason,
      banData.duration,
      banData.unit,
      expiresAt,
      confidence,
      detectionMethods
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

  const confidenceText = banData.confidence
    ? `Confidence: ${banData.confidence}%`
    : '';

  const detectionMethodsText = banData.detectionMethods
    ? `Detection methods: ${banData.detectionMethods.join(', ')}`
    : '';

  const appealLink = banData.appealUrl
    ? `<p style="font-size: 14px; opacity: 0.9;"><a href="${banData.appealUrl}" style="color: white; text-decoration: underline;">Appeal this ban</a></p>`
    : '';

  popup.innerHTML = `
    <h2 style="margin-top: 0; font-size: 28px;">⚠️ Account Banned</h2>
    <p style="font-size: 16px; margin: 20px 0;">${banData.reason}</p>
    ${confidenceText ? `<p style="font-size: 14px; opacity: 0.9;">${confidenceText}</p>` : ''}
    ${detectionMethodsText ? `<p style="font-size: 14px; opacity: 0.9;">${detectionMethodsText}</p>` : ''}
    <p style="font-size: 14px; opacity: 0.9;">${expiryText}</p>
    ${appealLink}
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
    detectCheatExtensions,
    recordMove,
    checkMoveTiming,
    trackSuspiciousActivity,
    checkBanStatus
  };
}

// Expose functions to global scope for testing
window.initAntiCheat = initAntiCheat;
window.detectCheatExtensions = detectCheatExtensions;
window.recordMove = recordMove;
window.checkMoveTiming = checkMoveTiming;
window.trackSuspiciousActivity = trackSuspiciousActivity;
window.checkBanStatus = checkBanStatus;
