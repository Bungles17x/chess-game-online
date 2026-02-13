// script.js

// Load call notification system
const callNotificationScript = document.createElement('script');
callNotificationScript.src = 'call-notification.js';
document.head.appendChild(callNotificationScript);

// -----------------------------------------------------
// DOM ELEMENTS
// -----------------------------------------------------
const boardElement = document.getElementById("chessboard");
const movesList = document.getElementById("moves-list");
const turnIndicator = document.getElementById("turn-indicator");
const resetBtn = document.getElementById("reset-btn");
const themeToggle = document.getElementById("theme-toggle");
const modeButtons = document.querySelectorAll("[data-mode]");
const lobbyBtn = document.getElementById("lobby-btn");
const lobbyModal = document.getElementById("lobby-modal");
const roomList = document.getElementById("room-list");
const roomSearchInput = document.getElementById("room-search");
const createRoomBtn = document.getElementById("create-room-btn");
const lobbyFriendsList = document.getElementById("lobby-friends-list");
const tabButtons = document.querySelectorAll(".tab-btn");
const profileBtn = document.getElementById("profile-btn");
const saveGameBtn = document.getElementById("save-game-btn");
const themeBtn = document.getElementById("theme-btn");
const loginBtn = document.getElementById("login-btn");
const registerBtn = document.getElementById("register-btn");
const manageBansBtn = document.getElementById("manage-bans-btn");
const friendsBtn = document.getElementById("friends-btn");
const themeModal = document.getElementById("theme-modal");
const menuBtn = document.getElementById("menu-btn");
const dropdown = document.querySelector(".dropdown");
const closeThemeBtn = document.getElementById("close-theme-btn");
const closeLobbyBtn = document.getElementById("close-lobby-btn");
const botModeBtn = document.getElementById("bot-mode");
const onlineModeBtn = document.getElementById("online-mode");
const checkersModeBtn = document.getElementById("checkers-mode");
const serverStatusBtn = document.getElementById("server-status-btn");
const moveSound = document.getElementById("move-sound");
const captureSound = document.getElementById("capture-sound");
const connectionLostSound = document.getElementById("connection-lost-sound");
const reconnectedSound = document.getElementById("reconnected-sound");
const drawBtn = document.getElementById("draw-btn");
const resignBtn = document.getElementById("resign-btn");
const toggleChatBtn = document.getElementById("toggle-chat-btn");

// Sound initialization flag
let audioInitialized = false;

// Initialize audio on first user interaction
function initializeAudio() {
  if (audioInitialized) return;
  
  // Try to play and pause each sound to initialize audio context
  const sounds = [moveSound, captureSound, connectionLostSound, reconnectedSound];
  let initializedCount = 0;
  
  sounds.forEach(sound => {
    if (sound && sound.readyState >= 2) {
      sound.volume = 0.3;
      sound.play().then(() => {
        sound.pause();
        sound.currentTime = 0;
        initializedCount++;
        if (initializedCount === sounds.length) {
          audioInitialized = true;
          debugLog("AUDIO", "Audio initialized");
        }
      }).catch(err => {
        // Ignore errors during initialization
        debugLog("AUDIO", "Sound initialization skipped", { error: err.message });
        initializedCount++;
        if (initializedCount === sounds.length) {
          audioInitialized = true;
          debugLog("AUDIO", "Audio initialized (some sounds may be missing)");
        }
      });
    } else {
      initializedCount++;
      if (initializedCount === sounds.length) {
        audioInitialized = true;
        debugLog("AUDIO", "Audio initialized (some sounds not ready)");
      }
    }
  });
}

// Add click listener to initialize audio
document.addEventListener("click", initializeAudio, { once: true });
document.addEventListener("touchstart", initializeAudio, { once: true });

const loadingScreen = document.getElementById("loading-screen");
const noConnectionScreen = document.getElementById("no-connection-screen");
const retryConnectionBtn = document.getElementById("retry-connection-btn");
const backToBotBtn = document.getElementById("back-to-bot-btn");
const connectionParticles = document.getElementById("connection-particles");
const connectionDot = document.getElementById("connection-dot");
const connectionText = document.getElementById("connection-text");
const connectionQuality = document.getElementById("connection-quality");
const latencyGraph = document.getElementById("latency-graph");
const latencyValue = document.getElementById("latency-value");

// Chat elements
const chatContainer = document.getElementById("chat-container");
const chatMessages = document.getElementById("chat-messages");
const chatInput = document.getElementById("chat-input");
const sendChatBtn = document.getElementById("send-chat-btn");

// Connection quality tracking
window.connectionLatency = 0;
let lastPingTime = 0;
let pingInterval = null;
let pingTimeout = null;
let latencyHistory = [];
const MAX_LATENCY_HISTORY = 30;
const PING_TIMEOUT = 10000; // 10 seconds timeout for ping response

// -----------------------------------------------------
// GAME STATE
// -----------------------------------------------------
const game = new Chess();

// Expose game to window for admin panel access
window.game = game;

let selectedSquare = null;
let legalMovesFromSelected = [];
let touchStartSquare = null; // Track where touch started
let touchStartTime = 0; // Track when touch started
let lastMove = null; // Track the last move for highlighting
let playerColor = "w";
let roomId = null;
window.roomId = roomId; // Expose roomId to window for other modules
window.gameMode = "bot"; // "bot" or "online"
let isOnlineGame = false; // Track if we're in an online game
let allRooms = []; // Store all available rooms for searching
let isInRoom = false; // Track if player is currently in a room
let currentBoardTheme = "classic"; // Current board theme
let currentPieceTheme = "classic"; // Current piece theme
window.moveCount = 0; // Track total moves
window.captureCount = 0; // Track total captures
let moveHistory = []; // Store move history for navigation
let currentMoveIndex = -1; // Current position in move history

const pieceToUnicode = {
  p: "♟", r: "♜", n: "♞", b: "♝", q: "♛", k: "♚",
  P: "♙", R: "♖", N: "♘", B: "♗", Q: "♕", K: "♔"
};

let socket = null;
// Expose socket to window for admin panel access
window.socket = socket;
let reconnectAttempts = 0;
// Removed MAX_RECONNECT_ATTEMPTS to allow continuous reconnection
const RECONNECT_INTERVAL = 2000;
let roomUpdateInterval = null;
let isDisconnected = localStorage.getItem('isDisconnected') === 'true'; // Flag to track if we're disconnected, persisted across page refreshes
let noConnectionTimeout = null; // Store the timeout ID so we can cancel it

// WebSocket configuration
const WS_CONFIG = {
  // Use localhost for development, Render for production
  PRODUCTION_URL: 'wss://chess-game-online-u34h.onrender.com',
  // Set to true when deploying to production
  isProduction: true,
};

function getWebSocketUrl() {
  return WS_CONFIG.isProduction ? WS_CONFIG.PRODUCTION_URL : WS_CONFIG.DEVELOPMENT_URL;
}

// -----------------------------------------------------
// DEBUGGING UTILITIES
// -----------------------------------------------------
const DEBUG = true; // Set to false to disable debug logging

function debugLog(category, message, data = null) {
  if (!DEBUG) return;
  
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${category}]`;
  
  if (data) {
    console.log(`${prefix} ${message}`, data);
  } else {
    console.log(`${prefix} ${message}`);
  }
}

// -----------------------------------------------------
// SOCKET / NETWORKING
// -----------------------------------------------------

// Function to check for actual internet connectivity
function checkInternetConnection() {
  return new Promise((resolve) => {
    // Try to fetch a small resource with a timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      debugLog("NETWORK", "Connection check timed out");
      resolve(false);
    }, 5000);
    
    // Try multiple endpoints for better reliability
    const endpoints = [
      'https://www.google.com/favicon.ico',
      'https://www.cloudflare.com/favicon.ico',
      'https://www.gstatic.com/generate_204'
    ];
    
    const tryEndpoint = async (index) => {
      if (index >= endpoints.length) {
        clearTimeout(timeoutId);
        debugLog("NETWORK", "All connection checks failed");
        resolve(false);
        return;
      }
      
      try {
        const response = await fetch(endpoints[index], {
          mode: 'no-cors',
          signal: controller.signal,
          cache: 'no-store'
        });
        clearTimeout(timeoutId);
        debugLog("NETWORK", "Connection check succeeded", { endpoint: endpoints[index] });
        resolve(true);
      } catch (error) {
        debugLog("NETWORK", "Connection check failed", { endpoint: endpoints[index], error: error.message });
        tryEndpoint(index + 1);
      }
    };
    
    tryEndpoint(0);
  });
}

function ensureSocket() {
  debugLog("SOCKET", "ensureSocket called", {
    socketExists: !!socket,
    socketState: socket ? socket.readyState : "No socket",
    reconnectAttempts,
    gameMode
  });
  
  // Prevent creating multiple sockets
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    debugLog("SOCKET", "Socket already exists and is connecting or open");
    return;
  }


  const wsUrl = getWebSocketUrl();
  debugLog("SOCKET", "Attempting to connect", {
    url: wsUrl,
    attempt: reconnectAttempts + 1
  });

  // Show loading screen when connecting
  if (gameMode === "online" || reconnectAttempts === 0) {
    showLoadingScreen();
  }

  try {
    socket = new WebSocket(wsUrl);
    window.socket = socket; // Update window.socket reference

    socket.onopen = function(e) {
      debugLog("SOCKET", "Connection established", {
        url: e.target.url,
        readyState: e.target.readyState
      });
      reconnectAttempts = 0; // Reset counter on success
      isDisconnected = false; // Reset flag when connection is established
      localStorage.setItem('isDisconnected', 'false'); // Persist the connection state
      // Update connection status
      updateConnectionStatus(true);

      // Send authentication with username
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
      const username = currentUser?.username || 'Player';

      debugLog("AUTH", "Sending authentication", {
        username,
        currentUser: !!currentUser.username
      });

      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: "authenticate",
          username: username
        }));
        debugLog("AUTH", "Authentication message sent");
      } else {
        debugLog("AUTH", "Failed to send authentication - socket not ready", {
          socketExists: !!socket,
          readyState: socket?.readyState
        });
      }

      // Latency measurement disabled - server doesn't support ping/pong protocol
      // Latency is measured from server message timestamps instead
      if (pingInterval) {
        clearInterval(pingInterval);
        pingInterval = null;
      }
      // Cancel the no connection timeout
      if (noConnectionTimeout) {
        clearTimeout(noConnectionTimeout);
        noConnectionTimeout = null;
      }
      hideLoadingScreen(); // Hide loading screen when connected
      hideNoConnectionScreen(); // Hide no connection screen when connected
    };

    socket.onmessage = function(event) {
      try {
        const data = JSON.parse(event.data);
        debugLog("SOCKET", "Message received from server", data);
        handleServerMessage(data);
      } catch (error) {
        debugLog("SOCKET", "Error parsing message", {
          error: error.message,
          rawData: event.data
        });
      }
    };

    socket.onclose = function(event) {
      debugLog("SOCKET", "Connection closed", {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean,
        gameMode
      });
      
      // Stop measuring latency
      if (pingInterval) {
        clearInterval(pingInterval);
        pingInterval = null;
      }
      
      // Clear ping timeout
      if (pingTimeout) {
        clearTimeout(pingTimeout);
        pingTimeout = null;
      }

      // Only auto-reconnect if we are in online mode
      if (gameMode === "online") {
        reconnectAttempts++;
        debugLog("SOCKET", "Scheduling reconnect", {
          attempt: reconnectAttempts,
          delay: RECONNECT_INTERVAL
        });
        setTimeout(ensureSocket, RECONNECT_INTERVAL);
      }
      // Show no connection screen immediately when connection is lost
      isDisconnected = true; // Set flag to indicate we're disconnected
      localStorage.setItem('isDisconnected', 'true'); // Persist the disconnected state
      // Cancel any existing timeout
      if (noConnectionTimeout) {
        clearTimeout(noConnectionTimeout);
      }
      // Show no connection screen immediately
      showNoConnectionScreen();
    };

    socket.onerror = function(error) {
      debugLog("SOCKET", "WebSocket error", {
        error: error.message || "Unknown error",
        socketState: socket ? socket.readyState : "No socket"
      });
    };

  } catch (err) {
    debugLog("SOCKET", "Failed to create WebSocket", {
      error: err.message,
      reconnectAttempts
    });
    reconnectAttempts++;
    setTimeout(ensureSocket, RECONNECT_INTERVAL);
  }
}

function handleServerMessage(data) {
  debugLog("SERVER", "Handling server message", {
    type: data.type,
    data: data
  });

  // Measure latency from server messages (if they include timestamps)
  if (data.timestamp && typeof data.timestamp === 'number') {
    const currentTime = Date.now();
    const latency = currentTime - data.timestamp;
    // Only update if latency is reasonable (0-60 seconds)
    if (latency >= 0 && latency <= 60000) {
      window.connectionLatency = latency;
      updateConnectionQuality(latency);
    }
  }
  
  if (data.type === "error") {
    debugLog("SERVER", "Error received from server", {
      code: data.code,
      message: data.message
    });

    // Show custom ban modal only for actual ban errors
    if (data.code === 403 && (data.message.includes("banned") || data.message.includes("Banned"))) {
      console.log("BAN", "Ban error received", { data });
      showBanModal(
        data.message,
        data.reason || 'No reason provided',
        data.duration,
        data.unit,
        data.expiresAt
      );
    } else {
      popup(`error ${data.code}: ${data.message}`, "red");
    }
    return;
  }

  if (data.type === "accountConflict") {
    debugLog("AUTH", "Account conflict detected", {
      message: data.message
    });

    console.error("Account conflict:", data.message);

    // Clear current user session
    localStorage.removeItem('currentUser');
    localStorage.removeItem('chessPlayerData');

    console.log("Showing logout modal...");

    // Create modal overlay
    const modalOverlay = document.createElement('div');
    modalOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
    `;

    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      background: white;
      padding: 30px;
      border-radius: 10px;
      max-width: 500px;
      text-align: center;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    `;

    // Create icon
    const icon = document.createElement('div');
    icon.style.cssText = `
      font-size: 60px;
      margin-bottom: 20px;
    `;
    icon.textContent = '⚠️';

    // Create message
    const message = document.createElement('p');
    message.style.cssText = `
      font-size: 18px;
      color: #333;
      margin-bottom: 25px;
      line-height: 1.5;
    `;
    message.textContent = 'You have been logged out successfully. If this was unexpected, reset your password immediately.';

    // Create OK button
    const okButton = document.createElement('button');
    okButton.textContent = 'OK';
    okButton.style.cssText = `
      background: #4CAF50;
      color: white;
      border: none;
      padding: 12px 30px;
      font-size: 16px;
      border-radius: 5px;
      cursor: pointer;
      transition: background 0.3s;
    `;
    okButton.onmouseover = () => okButton.style.background = '#45a049';
    okButton.onmouseout = () => okButton.style.background = '#4CAF50';
    okButton.onclick = () => {
      modalOverlay.remove();
      window.location.href = 'login.html';
    };

    // Assemble modal
    modalContent.appendChild(icon);
    modalContent.appendChild(message);
    modalContent.appendChild(okButton);
    modalOverlay.appendChild(modalContent);

    // Show modal
    document.body.appendChild(modalOverlay);

    return;
  }

  if (data.type === "chat") {
    debugLog("CHAT", "Chat message received", {
      sender: data.sender,
      message: data.message
    });
    displayChatMessage(data.message, data.sender, false);
    return;
  }

  if (data.type === "profanityWarning") {
    console.log("Profanity warning received from server:", data);
    debugLog("CHAT", "Profanity warning received", {
      message: data.message
    });
    showProfanityWarningModal(data.message);
    return;
  }

  if (data.type === "gameInvite") {
    debugLog("INVITE", "Game invite received", {
      from: data.from,
      room: data.room
    });

    // Show a popup with the invitation
    const acceptInvite = confirm(`${data.from} has invited you to play a game! Do you want to join?`);

    if (acceptInvite) {
      joinRoom(data.room);
      popup(`Joined game with ${data.from}!`, "green");
    }

    return;
  }

  if (data.type === "inviteSent") {
    debugLog("INVITE", "Invite sent successfully", {
      to: data.to,
      room: data.room
    });
    popup(`Game invitation sent to ${data.to}!`, "green");
    return;
  }

  if (data.type === "pong") {
    // Clear ping timeout
    if (pingTimeout) {
      clearTimeout(pingTimeout);
      pingTimeout = null;
    }
    
    // Validate the pong response
    if (!data.timestamp || typeof data.timestamp !== "number") {
      debugLog("NETWORK", "Invalid pong response", { data });
      return;
    }
    
    // Calculate latency
    const currentTime = Date.now();
    const latency = currentTime - lastPingTime;
    
    // Validate latency is reasonable
    if (latency < 0 || latency > 60000) {
      debugLog("NETWORK", "Invalid latency calculated", { latency, lastPingTime, currentTime });
      return;
    }
    
    window.connectionLatency = latency;
    debugLog("NETWORK", "Pong received", { latency, timestamp: data.timestamp });
    updateConnectionQuality(latency);
    return;
  }



  if (data.type === "rooms") {
    debugLog("LOBBY", "Room list received", {
      roomCount: data.rooms.length,
      rooms: data.rooms
    });
    
    // Store all rooms for searching
    allRooms = data.rooms;

    // Filter rooms based on current search input
    filterRooms(roomSearchInput.value); 
    
    if (data.rooms.length === 0) {
      const li = document.createElement("li");
      li.textContent = "No active rooms. Create one!";
      
      // Add classes to ensure the text is visible
      li.className = "room-item"; 
      li.style.color = "var(--text-color, #333)"; // Fallback color
      li.style.textAlign = "center";
      li.style.padding = "10px";

      roomList.appendChild(li);
      return;
    }

    data.rooms.forEach(room => {
      const roomDiv = document.createElement("div");
      roomDiv.className = "room-item";
      
      const roomName = document.createElement("span");
      roomName.textContent = room;
      
      const joinBtn = document.createElement("button");
      joinBtn.textContent = "Join";
      joinBtn.className = "join-room-btn";
      joinBtn.addEventListener("click", () => joinRoom(room));
      
      roomDiv.appendChild(roomName);
      roomDiv.appendChild(joinBtn);
      roomList.appendChild(roomDiv);
    });
  }

  if (data.type === "joined") {
    debugLog("GAME", "Joined room", {
      color: data.color,
      roomId: roomId
    });
    playerColor = data.color;
    popup(`Joined room as ${playerColor === 'w' ? 'White' : 'Black'}`, "green");
    // Show the chat container after successful join
    if (chatContainer) {
      chatContainer.classList.remove("hidden");
    }
    toggleChatBtn.textContent = "Hide";
    // Clear previous chat messages
    chatMessages.innerHTML = "";
  }

  if (data.type === "start") {
  debugLog("GAME", "Game started", {
    playerColor,
    roomId
  });

  // Set online game flag
  isOnlineGame = true;
  gameMode = "online";
  
  // If you are Black, kill a random white pawn so you don't get interrupted by turn logic
  if (playerColor === 'b') {
    const board = game.board();
    let whitePawnSquares = [];
    
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece && piece.type === 'p' && piece.color === 'w') {
          const file = String.fromCharCode(97 + c);
          const rank = 8 - r;
          whitePawnSquares.push(file + rank);
        }
      }
    }

    if (whitePawnSquares.length > 0) {
      const pawnToRemove = whitePawnSquares[0]; 
      game.remove(pawnToRemove);
      debugLog("GAME", "Removed white pawn to allow Black to move first", {
        pawn: pawnToRemove
      });
    }
  }

  initBoard();
  popup("Game Started!", "green");
}


  if (data.type === "reset") {
    debugLog("GAME", "Game reset by opponent");

    // Reset all game state
    selectedSquare = null;
    legalMovesFromSelected = [];
    lastMove = null;
    moveCount = 0;
    captureCount = 0;
    moveHistory = [];
    currentMoveIndex = -1;

    initBoard();
    popup("Game reset by opponent.", "yellow");
  }

  if (data.type === "drawOffer") {
    debugLog("GAME", "Draw offer received");
    const accept = confirm("Opponent offers a draw. Accept?");
    if (accept) {
      socket.send(JSON.stringify({ type: "drawAccept" }));
      debugLog("GAME", "Draw offer accepted");
    } else {
      socket.send(JSON.stringify({ type: "drawDecline" }));
      debugLog("GAME", "Draw offer declined");
    }
  }

  if (data.type === "drawAccept") {
    debugLog("GAME", "Draw accepted by opponent");
    updateTurnIndicator();
    popup("Game ended in a draw.", "yellow");

    // Hide lobby modal when game ends
    lobbyModal.classList.add("hidden");

    // Reset game state to prevent duplicates
    gameMode = "bot";
    isOnlineGame = false;
  }

  if (data.type === "drawDecline") {
    debugLog("GAME", "Draw declined by opponent");
    popup("Draw offer declined.", "red");
  }

  if (data.type === "resign") {
    debugLog("GAME", "Opponent resigned", {
      winner: data.winner
    });
    const winner = data.winner === "w" ? "White" : "Black";
    turnIndicator.textContent = `${winner} wins by resignation`;
    popup(`${winner} wins by resignation.`, "yellow");

    // Hide lobby modal when game ends by resignation
    lobbyModal.classList.add("hidden");

    // Reset game state to prevent duplicates
    gameMode = "bot";
    isOnlineGame = false;
  }

  if (data.type === "move") {
    debugLog("GAME", "Move received from opponent", {
      move: data.move
    });
    game.move(data.move);
    lastMove = data.move;
    const soundId = data.move.captured ? "capture-sound" : "move-sound";
    playSoundById(soundId);
    logMove(data.move);
    renderPosition();
    updateTurnIndicator();
  }

  if (data.type === "roomClosed") {
    debugLog("GAME", "Room closed by opponent");
    popup("Opponent left the game.", "yellow");
    roomId = null;
  window.roomId = null;
    switchToBotMode();
    initBoard();
  }

  if (data.type === "gameOver") {
    debugLog("GAME", "Game over");
    handleGameOver();
  }

  if (data.type === "bannedUsersList") {
    debugLog("BAN", "Banned users list received", {
      count: data.users.length,
      users: data.users
    });
    updateBannedUsersList(data.users);
  }

  if (data.type === "banExpired") {
    debugLog("BAN", "Ban expired", {
      message: data.message
    });
    
    // Remove the ban modal if it exists
    const banModal = document.querySelector('[style*="z-index: 99999"]');
    if (banModal) {
      banModal.remove();
    }
    
    // Clear all ban-related localStorage items
    localStorage.removeItem('botModeBan');
    localStorage.removeItem('bannedUsername');
    localStorage.removeItem('isUserBanned');
    localStorage.removeItem('showBanAfterLogin');
    localStorage.removeItem('banExpiresAt');
    localStorage.removeItem('banReason');

    // Re-enable game interaction
    if (boardElement) {
      boardElement.style.pointerEvents = '';
      boardElement.style.opacity = '';
    }
    if (resetBtn) resetBtn.disabled = false;
    if (saveGameBtn) saveGameBtn.disabled = false;
    if (onlineModeBtn) onlineModeBtn.disabled = false;
    if (lobbyBtn) lobbyBtn.disabled = false;

    // Show a notification to the user
    popup(data.message || "Your ban has expired. You can now use the chat again.", "green");
    return;
  }

  if (data.type === "userBanned") {
    debugLog("BAN", "User banned", {
      username: data.username
    });
    
    // Check if the banned user is the current user
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (currentUser && data.username.toLowerCase() === currentUser.username.toLowerCase()) {
      // Use expiresAt from server instead of calculating it locally
      const expiresAt = data.expiresAt || null;

      // Store ban data in localStorage for countdown timer
      const banData = {
        username: data.username,
        reason: data.reason || "Multiple profanity offenses in chat",
        duration: data.duration,
        unit: data.unit,
        expiresAt: expiresAt,
        timestamp: Date.now()
      };
      localStorage.setItem('botModeBan', JSON.stringify(banData));
      localStorage.setItem('bannedUsername', data.username);
      localStorage.setItem('isUserBanned', 'true');
      localStorage.setItem('showBanAfterLogin', 'true');
      if (expiresAt) {
        localStorage.setItem('banExpiresAt', new Date(expiresAt).toISOString());
      }
      localStorage.setItem('banReason', data.reason || "Multiple profanity offenses in chat");
      // Show ban modal for the current user
      showBanModal(
        `You have been banned from the game for ${data.duration} ${data.unit}.`,
        data.reason || "Multiple profanity offenses in chat, watch your language next time!",
        data.duration,
        data.unit,
        expiresAt
      );
    }
    
    // Refresh the ban list when a user is banned
    socket.send(JSON.stringify({ type: "getBannedUsers" }));
  }

  if (data.type === "userUnbanned") {
    debugLog("BAN", "User unbanned", {
      username: data.username
    });
    
    // Clear local ban data if the unbanned user matches the current user
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (currentUser && data.username.toLowerCase() === currentUser.username.toLowerCase()) {
      localStorage.removeItem('botModeBan');
      localStorage.removeItem('bannedUsername');
      localStorage.removeItem('isUserBanned');
      
      // Re-enable game interaction
      if (boardElement) {
        boardElement.style.pointerEvents = '';
        boardElement.style.opacity = '';
      }
      if (resetBtn) resetBtn.disabled = false;
      if (saveGameBtn) saveGameBtn.disabled = false;
      if (onlineModeBtn) onlineModeBtn.disabled = false;
      if (lobbyBtn) lobbyBtn.disabled = false;
      
      popup("You have been unbanned!", "green");
    }
    
    // Refresh the ban list when a user is unbanned
    socket.send(JSON.stringify({ type: "getBannedUsers" }));
  }

  // Report system messages
  if (data.type === "reportSubmitted") {
    debugLog("REPORT", `Report submitted successfully. your id code is ${data.reportId}`, {
      reportId: data.reportId
    });
    popup(data.message, "green");
    return;
  }

  if (data.type === "reportsList") {
    debugLog("REPORT", "Reports list received", {
      count: data.reports.length
    });
    if (typeof renderReportsList === "function") {
      renderReportsList(data.reports);
    }
    return;
  }

  if (data.type === "reportDetails") {
    debugLog("REPORT", "Report details received", {
      reportId: data.report.id
    });
    if (typeof loadGameReplay === "function" && data.report) {
      console.log('Report details:', data.report);
      // Note: Game replay functionality has been simplified
    }
    return;
  }

  // Call notification
  if (data.type === "callNotification") {
    debugLog("CALL", "Incoming report call", data);
    if (typeof showCallNotification === "function") {
      showCallNotification(data);
    }
    return;
  }

  if (data.type === "reportStatusUpdated") {
    debugLog("REPORT", "Report status updated", {
      reportId: data.reportId,
      status: data.status
    });
    popup(`Report status updated to: ${data.status}`, "green");
    // Refresh the reports list
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "getReports" }));
    }
    return;
  }

  // Friend system messages
  if (data.type === "friendsList") {
    debugLog("FRIENDS", "Friends list received", {
      count: data.friends.length,
      onlineCount: data.onlineFriends.length
    });
    if (typeof renderFriendsList === "function") {
      renderFriendsList(data.friends, data.onlineFriends);
    }
    return;
  }

  if (data.type === "friendRequest") {
    debugLog("FRIENDS", "Friend request received", {
      from: data.from
    });
    if (typeof showFriendRequestNotification === "function") {
      showFriendRequestNotification(data.from);
    }
    return;
  }

  if (data.type === "friendRequestSent") {
    debugLog("FRIENDS", "Friend request sent", data);
    popup(data.message, "green");
    return;
  }

  if (data.type === "friendAccepted") {
    debugLog("FRIENDS", "Friend request accepted", {
      friend: data.friend
    });
    popup(`You are now friends with ${data.friend}!`, "green");
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "getFriends" }));
    }
    return;
  }

  if (data.type === "friendRequestRejected") {
    debugLog("FRIENDS", "Friend request rejected", data);
    popup(data.message || "Friend request rejected", "orange");
    return;
  }

  if (data.type === "friendRemoved") {
    debugLog("FRIENDS", "Friend removed", {
      friend: data.friend
    });
    popup(`${data.friend} removed from friends`, "orange");
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "getFriends" }));
    }
    return;
  }

  // Call handleFriendMessages if it exists
  if (typeof handleFriendMessages === "function") {
    handleFriendMessages(data);
    return;
  }

  // Call handleReportMessages if it exists
  if (typeof handleReportMessages === "function") {
    handleReportMessages(data);
    return;
  }
}

function handleGameOver() {
  debugLog("GAME", "Handling game over");
  
  // Close the lobby modal if it's open
  lobbyModal.classList.add("hidden");
  
  // Hide the chat container
  chatContainer.classList.add("hidden");
  
  // Reset game state
  roomId = null;
  window.roomId = null;
  
  // Switch back to Bot mode automatically
  switchToBotMode();
  
  // Reset the board visuals
  initBoard();
  
  popup("Game Over. Switching to Bot mode.", "yellow");
}

function switchToBotMode() {
  debugLog("MODE", "Switching to bot mode");
  gameMode = "bot";
  botModeBtn.classList.add("active");
  onlineModeBtn.classList.remove("active");
  roomId = null;
  window.roomId = null;
  
  // Hide the chat container when switching to bot mode
  chatContainer.classList.add("hidden");
}

function leaveRoom() {
  debugLog("LOBBY", "Leaving room", {
    roomId,
    socketState: socket ? socket.readyState : "No socket"
  });
  
  if (roomId && socket) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "leave", roomId }));
      debugLog("LOBBY", "Leave message sent to server");
    }
    roomId = null;
  window.roomId = null;
  }
  
  // Hide the chat container when leaving a room
  if (chatContainer) {
    chatContainer.classList.add("hidden");
  }

  // Reset room state
  isInRoom = false;
}

function joinRoom(room) {
  debugLog("LOBBY", "Joining room", {
    room,
    currentRoomId: roomId
  });
  
  roomId = room;
  window.roomId = room;
  isInRoom = true;
  lobbyModal.classList.add("hidden");
  
  // Show the chat container

  

  
  // Stop updating the room list when joining a room
  stopRoomUpdates();
  
  ensureSocket();
  
  const sendJoin = () => {
    debugLog("LOBBY", "Sending join request", {
      room,
      socketState: socket ? socket.readyState : "No socket"
    });
    
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "join", roomId }));
      debugLog("LOBBY", "Join message sent to server");
    } else if (socket && socket.readyState === WebSocket.CONNECTING) {
      socket.addEventListener("open", () => {
        debugLog("LOBBY", "Socket opened, sending join request");
        socket.send(JSON.stringify({ type: "join", roomId }));
      }, { once: true });
    } else {
      debugLog("LOBBY", "Failed to connect to server");
      popup("Failed to connect to server.", "red");
      // If already in a room, leave it first
  if (isInRoom) {
    debugLog("LOBBY", "Leaving current room before showing lobby");
    leaveRoom();
  }

  // Only show lobby if not already visible to prevent duplicates
  if (!lobbyModal.classList.contains("hidden")) {
    debugLog("LOBBY", "Lobby already visible, skipping");
    return;
  }

  lobbyModal.classList.remove("hidden");
      // Restart room updates if joining failed
      startRoomUpdates();
      // Hide the chat container if joining failed
      chatContainer.classList.add("hidden");
    }
  };
  
  sendJoin();
}

function sendListRooms() {
  debugLog("LOBBY", "Requesting room list", {
    socketState: socket ? socket.readyState : "No socket"
  });
  
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: "listRooms" }));
    debugLog("LOBBY", "Room list request sent to server");
  } else if (socket && socket.readyState === WebSocket.CONNECTING) {
    // Wait for socket to open then send request
    socket.addEventListener("open", () => {
      socket.send(JSON.stringify({ type: "listRooms" }));
      debugLog("LOBBY", "Room list request sent after connection");
    }, { once: true });
  } else {
    debugLog("LOBBY", "Failed to connect to server");
    popup("Failed to connect to server.", "red");
    lobbyModal.classList.add("hidden");
  }
}

function startRoomUpdates() {
  debugLog("LOBBY", "Starting room updates");
  
  // Clear any existing interval
  if (roomUpdateInterval) {
    clearInterval(roomUpdateInterval);
  }
  
  // Request room list immediately
  sendListRooms();
  
  // Set up interval to update room list every 5 seconds
  roomUpdateInterval = setInterval(() => {
    debugLog("LOBBY", "Updating room list");
    sendListRooms();
  }, 5000);
}

function stopRoomUpdates() {
  debugLog("LOBBY", "Stopping room updates");
  
  if (roomUpdateInterval) {
    clearInterval(roomUpdateInterval);
    roomUpdateInterval = null;
  }
}

// -----------------------------------------------------
// CHAT FUNCTIONALITY
// -----------------------------------------------------
function displayChatMessage(message, sender, isSelf) {
  debugLog("CHAT", "Displaying chat message", {
    sender,
    message,
    isSelf
  });

  // Ensure DOM elements exist
  if (!chatMessages || !chatContainer) {
    debugLog("CHAT", "Chat DOM elements not found");
    return;
  }

  // Validate inputs
  if (!message || !sender) {
    debugLog("CHAT", "Invalid message data", { message, sender });
    return;
  }

  // Ensure chat container is visible
  if (chatContainer && chatContainer.classList.contains("hidden")) {
    debugLog("CHAT", "Chat container is hidden, showing it");
    if (chatContainer) {
      chatContainer.classList.remove("hidden");
    }
    if (toggleChatBtn) toggleChatBtn.textContent = "Hide";
  }
  
  const messageDiv = document.createElement("div");
  messageDiv.className = `chat-message ${isSelf ? "own" : "other"}`;
  
  // Create message header with sender and timestamp
  const messageHeader = document.createElement("div");
  messageHeader.className = "chat-message-header";
  
  const senderSpan = document.createElement("span");
  senderSpan.className = "chat-sender";
  senderSpan.textContent = sender;
  
  const timeSpan = document.createElement("span");
  timeSpan.className = "chat-time";
  const now = new Date();
  timeSpan.textContent = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  
  messageHeader.appendChild(senderSpan);
  messageHeader.appendChild(timeSpan);
  
  const messageText = document.createElement("div");
  messageText.className = "chat-text";
  messageText.textContent = message;
  
  messageDiv.appendChild(messageHeader);
  messageDiv.appendChild(messageText);
  
  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function sendChatMessage() {
  // Ensure DOM elements exist
  if (!chatInput || !chatMessages || !chatContainer) {
    debugLog("CHAT", "Chat DOM elements not found");
    return;
  }

  const message = chatInput.value.trim();
  if (!message) return;

  // Clear input field
  chatInput.value = "";
  
  debugLog("CHAT", "Sending chat message", {
    message,
    gameMode,
    roomId,
    playerColor,
    socketState: socket ? socket.readyState : "No socket"
  });
  
  // Check if we're in online mode and connected
  if (gameMode !== "online") {
    debugLog("CHAT", "Chat not available in bot mode");
    popup("Chat is only available in online mode.", "red");
    return;
  }
  
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    debugLog("CHAT", "Not connected to server");
    popup("Not connected to server.", "red");
    return;
  }
  
  if (!roomId) {
    debugLog("CHAT", "Not in a room");
    popup("You need to join a room to chat.", "red");
    return;
  }
  
  // Send message to server
  const payload = { 
    type: "chat", 

    message: message,
    sender: (JSON.parse(localStorage.getItem('currentUser') || '{}')).username || 
          (JSON.parse(localStorage.getItem('chessPlayerData') || '{}')).username || 
          'Player'
  };
  
  debugLog("CHAT", "Sending chat payload to server", payload);
  socket.send(JSON.stringify(payload));
  
  // Message will be displayed after server validation
  
  // Clear input field
  chatInput.value = "";
  
  // Focus back on input field for quick consecutive messages
  chatInput.focus();
}



// -----------------------------------------------------
// AI (MINIMAX BOT)
// -----------------------------------------------------
function evaluateBoard(game) {
  const values = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 1000 };
  let score = 0;
  const board = game.board();

  for (let row of board) {
    for (let piece of row) {
      if (!piece) continue;
      const val = values[piece.type] || 0;
      score += piece.color === "w" ? val : -val;
    }
  }
  return score;
}

function minimax(game, depth, isMaximizing) {
  if (depth === 0 || game.game_over()) {
    return evaluateBoard(game);
  }

  const moves = game.moves();
  if (moves.length === 0) return evaluateBoard(game);

  if (isMaximizing) {
    let best = -Infinity;
    for (const move of moves) {
      game.move(move);
      const value = minimax(game, depth - 1, false);
      game.undo();
      if (value > best) best = value;
    }
    return best;
  } else {
    let best = Infinity;
    for (const move of moves) {
      game.move(move);
      const value = minimax(game, depth - 1, true);
      game.undo();
      if (value < best) best = value;
    }
    return best;
  }
}

function aiMove() {
  debugLog("AI", "AI making a move");
  
  const moves = game.moves();
  if (moves.length === 0) return;

  let bestMove = null;
  let bestValue = Infinity; // AI is black, minimizing

  for (const move of moves) {
    game.move(move);
    const value = minimax(game, 2, false); 
    game.undo();

    if (value < bestValue) {
      bestValue = value;
      bestMove = move;
    }
  }

  if (!bestMove) return;

  const result = game.move(bestMove);
  if (!result) return;

  // Track the last move for highlighting
  lastMove = result;

  debugLog("AI", "AI made a move", {
    move: bestMove,
    value: bestValue
  });
  
const soundId = result.captured ? "capture-sound" : "move-sound";
playSoundById(soundId);



;
  logMove(result);
  renderPosition();
  updateTurnIndicator();

  if (gameMode === "bot" && game.turn() === "b" && !game.game_over()) {
    setTimeout(aiMove, 200);
  }
}

// -----------------------------------------------------
// BOARD RENDERING
// -----------------------------------------------------
function initBoard() {
  debugLog("BOARD", "Initializing board");
  
  // Preserve coordinates before clearing board
  const coordinates = boardElement.querySelectorAll('.board-coordinate');
  boardElement.innerHTML = "";
  selectedSquare = null;
  legalMovesFromSelected = [];
  lastMove = null;
  movesList.innerHTML = "";
  game.reset();
  updateTurnIndicator();
  buildSquares();
  renderPosition();
  
  // Restore coordinates if they should be shown
  const showCoordinates = localStorage.getItem('showCoordinates') !== 'false';
  if (showCoordinates) {
    coordinates.forEach(coord => boardElement.appendChild(coord));
  }
}

function buildSquares() {
  debugLog("BOARD", "Building squares");
  
  for (let rank = 8; rank >= 1; rank--) {
    for (let fileIndex = 0; fileIndex < 8; fileIndex++) {
      const file = String.fromCharCode(97 + fileIndex);
      const squareName = file + rank;

      const sq = document.createElement("div");
      sq.classList.add("square");

      const isLight = (fileIndex + rank) % 2 === 0;
      sq.classList.add(isLight ? "light" : "dark");

      sq.dataset.square = squareName;
      
      // Add touch-action style to prevent browser zooming/scrolling on touch
      sq.style.touchAction = "manipulation";

      // Improved touch event handling for mobile
      sq.addEventListener("touchstart", (e) => {
        // Record where and when the touch started
        touchStartSquare = squareName;
        touchStartTime = Date.now();
      }, { passive: true });

      // Handle touch end to detect taps
      sq.addEventListener("touchend", (e) => {
        // Calculate touch duration
        const touchDuration = Date.now() - touchStartTime;
        
        // If it was a quick tap (less than 300ms) and on the same square, handle it
        if (touchDuration < 300 && touchStartSquare === squareName) {
          e.preventDefault(); // Prevent default to avoid mouse events
          handleSquareClick(squareName);
        }
        
        // Reset touch tracking
        touchStartSquare = null;
        touchStartTime = 0;
      }, { passive: false });

      // Handle click events for desktop
      sq.addEventListener("click", (e) => {
        // Only handle click if we're not tracking a touch (to avoid double handling)
        if (!touchStartSquare) {
          handleSquareClick(squareName);
        }
      });

      boardElement.appendChild(sq);
    }
  }
}

function renderPosition() {
  document.querySelectorAll(".square").forEach(sq => {
    // Clear square content but preserve coordinates
    const coordinates = sq.querySelector('.board-coordinate');
    sq.innerHTML = "";
    if (coordinates) {
      sq.appendChild(coordinates);
    }
  });

  const board = game.board();

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (!piece) continue;

      const file = String.fromCharCode(97 + col);
      const rank = 8 - row;
      const squareName = file + rank;

      const sq = document.querySelector(`.square[data-square="${squareName}"]`);
      if (!sq) continue;

      const span = document.createElement("span");
      span.classList.add("piece");
      span.style.color = piece.color === "w" ? "#f9fafb" : "#020617";
      span.textContent = pieceToUnicode[piece.type];
      sq.appendChild(span);
    }
  }

  // Highlight last move and check/checkmate status
  highlightLastMoveAndCheck();
}

// -----------------------------------------------------
// MOVE HANDLING
// -----------------------------------------------------
function clearHighlights() {
  document
    .querySelectorAll(".square.selected, .square.highlight, .square.capture, .square.last-move, .square.in-check, .square.checkmate, .square.from-square, .square.to-square")
    .forEach(sq => sq.classList.remove("selected", "highlight", "capture", "last-move", "in-check", "checkmate", "from-square", "to-square"));
}

function handleSquareClick(square) {
  debugLog("BOARD", "Square clicked", {
    square,
    selectedSquare,
    gameMode,
    playerColor,
    turn: game.turn()
  });
  
  const piece = game.get(square);

  // Selecting a piece
  if (!selectedSquare) {
    if (!piece) return;

    if (gameMode === "online") {
      if (piece.color !== playerColor) {
        debugLog("BOARD", "Cannot select opponent's piece");
        popup("You can only select your own pieces.", "red");
        return;
      }
      if (game.turn() !== playerColor) {
        debugLog("BOARD", "Not player's turn");
        popup("It's not your turn.", "red");
        return;
      }
    }

    if (piece.color !== game.turn()) return;

    selectedSquare = square;
    legalMovesFromSelected = game.moves({ square, verbose: true });

    clearHighlights();
    highlightSelectionAndMoves();
    return;
  }

  // Attempt move
  const move = legalMovesFromSelected.find(m => m.to === square);

  if (!move) {
    const newPiece = game.get(square);

    if (gameMode === "online" && newPiece && newPiece.color !== playerColor) {
      debugLog("BOARD", "Cannot select opponent's piece");
      popup("You can only select your own pieces.", "red");
      return;
    }

    if (newPiece && newPiece.color === game.turn()) {
      debugLog("BOARD", "Selecting different piece");
      selectedSquare = square;
      legalMovesFromSelected = game.moves({ square, verbose: true });
      clearHighlights();
      highlightSelectionAndMoves();
    }
    return;
  }

  // Online: only allow moving your own color
  // Get the piece at the from square (not the to square)
  const fromPiece = game.get(move.from);
  if (gameMode === "online" && fromPiece && fromPiece.color !== playerColor) {
    debugLog("BOARD", "Cannot move opponent's piece");
    popup("You can only move your own pieces.", "red");
    return;
  }

  // Anti-cheat checks for bot mode (BEFORE executing move)
  if (gameMode === "bot") {
    // Check move timing
    if (typeof checkMoveTiming === 'function') {
      const timingCheck = checkMoveTiming();
      if (!timingCheck.valid) {
        console.log('Anti-cheat: Blocking suspicious move', {
          timeSinceLastMove: timingCheck.timeSinceLastMove
        });
        
        if (typeof trackSuspiciousActivity === 'function') {
          const suspiciousResult = trackSuspiciousActivity('fast_move');
          if (suspiciousResult.shouldReport) {
            console.log('Anti-cheat: Reporting suspicious activity', {
              count: suspiciousResult.count
            });
            // Auto-ban if too many suspicious moves
            if (suspiciousResult.count >= 10) {
              if (typeof handleAutoBan === 'function') {
                handleAutoBan();
              }
            }
          }
        }
        
        // Block the move and show ban modal using the same format as manage ban
        showBanModal(
          "You have been banned for suspicious activity",
          "Multiple fast moves detected by anti-cheat system",
          24, // duration
          "hours", // unit
          new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // expiresAt (24 hours from now)
        );
        
        // Store the ban in localStorage
        localStorage.setItem("banned", "true");
        localStorage.setItem("banReason", "Multiple fast moves detected by anti-cheat system");
        localStorage.setItem("banExpiresAt", new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString());
        
        return;
      }
    }
  }

  // Execute move
  const result = game.move({
    from: move.from,
    to: move.to,
    promotion: "q"
  });

  if (!result) {
    debugLog("BOARD", "Move failed", { move });
    console.error("Move failed:", move);
    return;
  }

  // Track the last move for highlighting
  lastMove = result;

  // Record the move for anti-cheat tracking
  if (gameMode === "bot" && typeof recordMove === 'function') {
    recordMove(result);
  }

  debugLog("BOARD", "Move executed", {
    move: result,
    gameMode,
    playerColor
  });

  // Update statistics
  window.moveCount++;
  if (result.captured) {
    window.captureCount++;
  }

  // Send move to opponent
  if (gameMode === "online" && socket && socket.readyState === WebSocket.OPEN) {
    debugLog("BOARD", "Sending move to server");
    socket.send(JSON.stringify({ type: "move", move: result }));
    
    // Check if this move caused Checkmate
    if (game.in_checkmate()) {
      debugLog("BOARD", "Checkmate detected");
      // Tell the server the game is over so it can notify the opponent
      socket.send(JSON.stringify({ type: "checkmate" })); 
    }
  }

  const soundId = result.captured ? "capture-sound" : "move-sound";
  playSoundById(soundId);
  logMove(result);
  selectedSquare = null;
  legalMovesFromSelected = [];
  clearHighlights();
  renderPosition();
  updateTurnIndicator();

  // AI MOVE
  if (gameMode === "bot" && game.turn() === "b" && !game.game_over()) {
    setTimeout(aiMove, 200);
  }

  // Check for game over and update statistics
  if (game.game_over()) {
    updateGameStatistics();
  }
}

function highlightSelectionAndMoves() {
  clearHighlights();
  if (!selectedSquare) return;

  const fromSq = document.querySelector(
    `.square[data-square="${selectedSquare}"]`
  );
  if (fromSq) fromSq.classList.add("selected");

  legalMovesFromSelected.forEach(m => {
    const targetSq = document.querySelector(
      `.square[data-square="${m.to}"]`
    );
    if (targetSq) {
      targetSq.classList.add("highlight");
      // Add a visual indicator for capture moves
      if (m.captured) {
        targetSq.classList.add("capture");
        debugLog("BOARD", "Capture move highlighted", {
          from: m.from,
          to: m.to,
          captured: m.captured
        });
      }
    }
  });
}

function highlightLastMoveAndCheck() {
  // Highlight last move
  if (lastMove) {
    const fromSq = document.querySelector(
      `.square[data-square="${lastMove.from}"]`
    );
    const toSq = document.querySelector(
      `.square[data-square="${lastMove.to}"]`
    );
    if (fromSq) {
      fromSq.classList.add("last-move");
      fromSq.classList.add("from-square");
    }
    if (toSq) {
      toSq.classList.add("last-move");
      toSq.classList.add("to-square");
    }
  }

  // Highlight king if in check
  if (game.in_check()) {
    const board = game.board();
    const turn = game.turn();
    
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece && piece.type === 'k' && piece.color === turn) {
          const file = String.fromCharCode(97 + c);
          const rank = 8 - r;
          const kingSquare = file + rank;
          const kingSq = document.querySelector(
            `.square[data-square="${kingSquare}"]`
          );
          if (kingSq) {
            if (game.in_checkmate()) {
              kingSq.classList.add("checkmate");
              debugLog("BOARD", "Checkmate highlighted", { kingSquare });
            } else {
              kingSq.classList.add("in-check");
              debugLog("BOARD", "Check highlighted", { kingSquare });
            }
          }
          return;
        }
      }
    }
  }
}

// -----------------------------------------------------
// UI + SOUND + MOVES
// -----------------------------------------------------
function playMoveSound(move) {
  const isCapture = !!move.captured;
  const sound = isCapture ? captureSound : moveSound;
  if (!sound || !sound.src) return;
  
  // Ensure audio is initialized
  if (!audioInitialized) {
    initializeAudio();
  }
  
  sound.currentTime = 0;
  sound.volume = 0.3;
  sound.play().catch(err => {
    debugLog("AUDIO", "Failed to play move sound", { error: err.message });
  });
}

// Helper function to play sound with better error handling
function playSoundById(soundId) {
  const sound = document.getElementById(soundId);
  if (!sound) {
    debugLog("AUDIO", `Sound element not found: ${soundId}`);
    return;
  }
  
  debugLog("AUDIO", `Attempting to play sound: ${soundId}`, {
    soundSrc: sound.src,
    soundReadyState: sound.readyState
  });
  
  // Ensure audio is initialized
  if (!audioInitialized) {
    initializeAudio();
  }
  
  sound.currentTime = 0;
  sound.volume = 0.3;
  sound.play().then(() => {
    debugLog("AUDIO", `Sound played successfully: ${soundId}`);
  }).catch(err => {
    debugLog("AUDIO", `Failed to play sound: ${soundId}`, { error: err.message });
  });
}

function popup(message, type = "yellow") {
  debugLog("UI", "Showing popup", {
    message,
    type
  });
  
  const container = document.getElementById("popup-container");

  const div = document.createElement("div");
  div.className = `popup ${type}`;

  let icon = "⚠️";
  if (type === "green") icon = "✔️";
  if (type === "red") icon = "❌";
  if (type === "yellow") icon = "⚠️";
  if (type === "blue") icon = "ℹ️";
  div.innerHTML = `<span class="icon">${icon}</span> ${message}`;

  container.appendChild(div);

  setTimeout(() => {
    div.remove();
  }, 4000);
}

function logMove(move) {
  debugLog("GAME", "Logging move", {
    move: move.san
  });
  
  const li = document.createElement("li");
  li.textContent = move.san;
  movesList.appendChild(li);
  movesList.scrollTop = movesList.scrollHeight;
  
  // Add move to moveHistory for replay
  moveHistory.push(move.san);
  currentMoveIndex = moveHistory.length - 1;
}

function updateTurnIndicator() {
  if (game.game_over()) {
    if (game.in_checkmate()) {
      const losingPlayerColor = game.turn();
      const winner = losingPlayerColor === "w" ? "Black" : "White";
      turnIndicator.textContent = `Checkmate — ${winner} wins`;
      debugLog("GAME", "Checkmate", { winner });
    } else if (game.in_draw()) {
      // Determine the type of draw
      let drawReason = "Draw";
      
      // Check for stalemate (no legal moves but not in check)
      if (game.in_stalemate()) {
        drawReason = "Stalemate";
      }
      // Check for threefold repetition
      else if (game.in_threefold_repetition()) {
        drawReason = "Threefold repetition";
      }
      // Check for insufficient material
      else if (game.insufficient_material()) {
        drawReason = "Insufficient material";
      }
      // Check for 50-move rule
      else if (game.history().length >= 100) {
        drawReason = "50-move rule";
      }
      
      turnIndicator.textContent = drawReason;
      debugLog("GAME", `Game ended in ${drawReason}`);
    } else {
      turnIndicator.textContent = "Game over";
      debugLog("GAME", "Game over");
    }
  } else {
    const turn = game.turn() === "w" ? "White" : "Black";
    turnIndicator.textContent = `${turn} to move`;
  }
}

// -----------------------------------------------------
// MODE + LOBBY UI
// -----------------------------------------------------
botModeBtn.addEventListener("click", () => {
  debugLog("MODE", "Bot mode button clicked");
  
  if (gameMode === "online" && game.history().length > 0) {
    popup("Cannot change mode during an online game.", "red");
    return;
  }
  switchToBotMode();
  initBoard();
});

onlineModeBtn.addEventListener("click", () => {
  debugLog("MODE", "Online mode button clicked");

  // Check if user is logged in
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  if (!currentUser) {
    popup("you must be logged in to play online!", "red");
    // Redirect to login page after a short delay
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 1500);
    return;
  }
});

checkersModeBtn.addEventListener("click", () => {
  debugLog("MODE", "Checkers mode button clicked");
  popup("Checkers mode is coming soon!", "gold", true);
  
  if (gameMode === "online" && game.history().length > 0) {
    popup("Cannot change mode during an online game.", "red");
    return;
  }
  
  ensureSocket();
  
  // Check if there are any players online
  // checkPlayers function removed - lobby is shown directly
    debugLog("MODE", "Checking for online players");
    
    // Simplified: directly show lobby without checking players
    gameMode = "online";
    onlineModeBtn.classList.add("active");
    botModeBtn.classList.remove("active");
    // If already in a room, leave it first
  if (isInRoom) {
    debugLog("LOBBY", "Leaving current room before showing lobby");
    leaveRoom();
  }

  // Only show lobby if not already visible to prevent duplicates
  if (!lobbyModal.classList.contains("hidden")) {
    debugLog("LOBBY", "Lobby already visible, skipping");
    return;
  }

  lobbyModal.classList.remove("hidden");
    startRoomUpdates();
    sendListRooms();
    return;
  });
  
const handlePlayerCheck = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === "playersOnline") {
      debugLog("MODE", "Online players check result", {
        count: data.count
      });

      socket.removeEventListener("message", handlePlayerCheck);
      if (data.count === 0) {
        popup("No players online at the moment.", "red");
        return;
      }

      gameMode = "online";
      onlineModeBtn.classList.add("active");
      botModeBtn.classList.remove("active");
      // If already in a room, leave it first
  if (isInRoom) {
    debugLog("LOBBY", "Leaving current room before showing lobby");
    leaveRoom();
  }

  // Only show lobby if not already visible to prevent duplicates
  if (!lobbyModal.classList.contains("hidden")) {
    debugLog("LOBBY", "Lobby already visible, skipping");
    return;
  }

  lobbyModal.classList.remove("hidden");
      // Start updating the room list when opening the lobby
      startRoomUpdates();
      sendListRooms();
    }
  };

  if(socket) socket.addEventListener("message", handlePlayerCheck);


modeButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    debugLog("MODE", "Mode button clicked", {
      mode: btn.dataset.mode
    });
    
    if (gameMode === "online" && game.history().length > 0) {
      popup("Cannot change mode during an online game.", "red");
      return;
    }
    gameMode = btn.dataset.mode;
    initBoard();

    if (gameMode === "online" && socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "resetGame" }));
    }

    popup(`Mode changed to ${gameMode}`, "green");
  });
});

createRoomBtn.addEventListener("click", () => {
  debugLog("LOBBY", "Create room button clicked");
  
  const newRoom = "room-" + Math.floor(Math.random() * 9999);
  debugLog("LOBBY", "Creating new room", { room: newRoom });
  
  popup(`Lobby created (${newRoom}). Waiting for opponent…`, "green");
  joinRoom(newRoom);
});

lobbyBtn.addEventListener("click", () => {
  debugLog("LOBBY", "Lobby button clicked");
  
  // If already in a room, leave it first
  if (isInRoom) {
    debugLog("LOBBY", "Leaving current room before showing lobby");
    leaveRoom();
  }

  // Only show lobby if not already visible to prevent duplicates
  if (!lobbyModal.classList.contains("hidden")) {
    debugLog("LOBBY", "Lobby already visible, skipping");
    return;
  }

  lobbyModal.classList.remove("hidden");
  ensureSocket();
  
  // Start updating the room list
  startRoomUpdates();
});

closeLobbyBtn.addEventListener("click", () => {
  debugLog("LOBBY", "Close lobby button clicked");
  
  lobbyModal.classList.add("hidden");
  
  // Stop updating the room list when closing the lobby
  stopRoomUpdates();
});

drawBtn.addEventListener("click", () => {
  debugLog("GAME", "Draw button clicked");
  
  if (gameMode !== "online") {
    popup("Draw offers are only available in online mode.", "red");
    return;
  }
  
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    popup("Not connected to server.", "red");
    return;
  }
  
  socket.send(JSON.stringify({ type: "drawOffer" }));
  popup("Draw offer sent.", "green");
});

resignBtn.addEventListener("click", () => {
  debugLog("GAME", "Resign button clicked");
  
  if (gameMode !== "online") {
    popup("Resignation is only available in online mode.", "red");
    return;
  }
  
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    popup("Not connected to server.", "red");
    return;
  }
  
  socket.send(JSON.stringify({ type: "resign" }));
  popup("You resigned.", "red");

  // Hide lobby modal when resigning
  lobbyModal.classList.add("hidden");

  // Reset game state to prevent duplicates
  gameMode = "bot";
  isOnlineGame = false;
});

// -----------------------------------------------------
// INIT
// -----------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  debugLog("INIT", "DOM loaded, initializing application");

  // Load settings from localStorage or user profile
  loadGameSettings();
  
  // Initialize anti-cheat system
  if (typeof initAntiCheat === 'function') {
    initAntiCheat();
  }

  // Check if user is banned and should see ban modal
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  const banData = JSON.parse(localStorage.getItem('botModeBan'));
  const bannedUsername = localStorage.getItem('bannedUsername');
  
  // Function to disable game for banned users
  function disableGameForBannedUser() {
    localStorage.setItem('isUserBanned', 'true');
    // Disable game interaction
    if (boardElement) {
      boardElement.style.pointerEvents = 'none';
      boardElement.style.opacity = '0.5';
    }
    // Disable game controls
    if (resetBtn) resetBtn.disabled = true;
    if (saveGameBtn) saveGameBtn.disabled = true;
    // Disable online mode
    if (onlineModeBtn) onlineModeBtn.disabled = true;
    // Disable lobby
    if (lobbyBtn) lobbyBtn.disabled = true;
  }
  
  // Function to check if ban is still active
 function isBanActive(banData) {
    if (!banData) return false;

    // Permanent ban
    if (!banData.duration) return true;

    // Check if temporary ban has expired
    // First, try to use expiresAt from server (preferred)
    if (banData.expiresAt && !isNaN(banData.expiresAt)) {
      return Date.now() <= banData.expiresAt;
    }

    // Fallback to local calculation if expiresAt is not available
    let expiryTime;
    if (banData.unit === 'hours') {
      expiryTime = banData.timestamp + (banData.duration * 60 * 60 * 1000);
    } else if (banData.unit === 'days') {
      expiryTime = banData.timestamp + (banData.duration * 24 * 60 * 60 * 1000);
    } else {
      expiryTime = banData.timestamp + (banData.duration * 24 * 60 * 60 * 1000);
    }

    return Date.now() <= expiryTime;
  }

  
  // Automatically clear ban status for admin account
  if (currentUser && currentUser.username.toLowerCase() === 'bungles17x') {
    localStorage.removeItem('botModeBan');
    localStorage.removeItem('bannedUsername');
    localStorage.removeItem('isUserBanned');
    localStorage.removeItem('showBanAfterLogin');
    console.log("BAN", "Admin account ban status cleared", { username: currentUser.username });
  }

  // Check if user is banned and should see ban modal
  if (localStorage.getItem('showBanAfterLogin') === 'true') {
    localStorage.removeItem('showBanAfterLogin');
    
    // Check if the current user is the one who was banned
    if (banData && currentUser && (banData.username === currentUser.username || bannedUsername === currentUser.username)) {
      if (isBanActive(banData)) {
        // Use expiresAt from banData if available, otherwise calculate locally
        let expiresAt = banData.expiresAt || null;
        if (!expiresAt && banData.duration) {
          if (banData.unit === 'hours') {
            expiresAt = banData.timestamp + (banData.duration * 60 * 60 * 1000);
          } else if (banData.unit === 'days') {
            expiresAt = banData.timestamp + (banData.duration * 24 * 60 * 60 * 1000);
          }
        }
        
        // Disable game interaction
        disableGameForBannedUser();
        
        // Show ban modal
        showBanModal(
          "You have been banned",
          banData.reason || 'No reason provided',
          banData.duration,
          banData.unit,
          expiresAt
        );
      }
    }
  }
  
  // Check if user is currently banned (on page load)
  if (banData && currentUser && (banData.username === currentUser.username || bannedUsername === currentUser.username)) {
    if (isBanActive(banData)) {
      disableGameForBannedUser();
    } else {
      // Ban has expired, clear the ban data
      localStorage.removeItem('botModeBan');
      localStorage.removeItem('bannedUsername');
      localStorage.removeItem('isUserBanned');
      localStorage.removeItem('showBanAfterLogin');
      localStorage.removeItem('banExpiresAt');
      localStorage.removeItem('banReason');
      
      // Re-enable game interaction
      if (boardElement) {
        boardElement.style.pointerEvents = '';
        boardElement.style.opacity = '';
      }
      if (resetBtn) resetBtn.disabled = false;
      if (saveGameBtn) saveGameBtn.disabled = false;
      if (onlineModeBtn) onlineModeBtn.disabled = false;
      if (lobbyBtn) lobbyBtn.disabled = false;
      
      // Show notification and refresh page
      popup("Your ban has expired! You can now use the chat again.", "green");
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    }
  } else {
    // No ban data or user is not the banned user, ensure game is enabled
    localStorage.removeItem('isUserBanned');
    if (boardElement) {
      boardElement.style.pointerEvents = '';
      boardElement.style.opacity = '';
    }
    if (resetBtn) resetBtn.disabled = false;
    if (saveGameBtn) saveGameBtn.disabled = false;
    if (onlineModeBtn) onlineModeBtn.disabled = false;
    if (lobbyBtn) lobbyBtn.disabled = false;
  }

  // Show no connection screen if user was disconnected
  if (isDisconnected) {
    debugLog("INIT", "User was disconnected, showing no connection screen");
    showNoConnectionScreen();
  }
  
  // Check if there's a loaded game to replay
  const loadedGame = JSON.parse(localStorage.getItem("loadedGame") || "null");
  if (loadedGame && loadedGame.state) {
    debugLog("GAME", "Loaded game found, entering replay mode");
    // Small delay to ensure everything is initialized
    setTimeout(() => {
      loadGame(loadedGame.state);
    }, 100);
  }
  
  themeToggle.addEventListener("click", () => {
    debugLog("UI", "Theme toggle clicked");
    document.body.classList.toggle("light-theme");
  });

  resetBtn.addEventListener("click", () => {
    debugLog("GAME", "Reset button clicked");
    
    if (gameMode === "online") {
      popup("You have to be playing with a bot in order to do that.", "red");
      return;
    }
    initBoard();
  });

  window.addEventListener("beforeunload", () => {
    debugLog("APP", "Page unloading, leaving room");
    leaveRoom();
  });

  // Add event listener for search input
  if (roomSearchInput) {
    roomSearchInput.addEventListener("input", (e) => {
      filterRooms(e.target.value);
    });
  }

  // Add event listener for profile button
  if (profileBtn) {
    profileBtn.addEventListener("click", () => {
      window.location.href = "profile.html";
    });
  }

  // Add chat event listeners
  if (toggleChatBtn) {
    toggleChatBtn.addEventListener("click", () => {
      if (chatContainer) {
        chatContainer.classList.toggle("hidden");
        toggleChatBtn.textContent = chatContainer.classList.contains("hidden") ? "Show Chat" : "Hide Chat";
      }
    });
  }

  if (sendChatBtn) {
    sendChatBtn.addEventListener("click", sendChatMessage);
  }

  if (chatInput) {
    chatInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        sendChatMessage();
      }
    });
  }

  // Add event listener for save game button
  if (saveGameBtn) {
    saveGameBtn.addEventListener("click", () => {
      debugLog("GAME", "Save game button clicked");
      saveCurrentGame();
    });
  } else {
    debugLog("ERROR", "Save game button not found");
  }
  
  // Add event listener for exit replay button
  const exitReplayBtn = document.getElementById("exit-replay-btn");
  if (exitReplayBtn) {
    exitReplayBtn.addEventListener("click", () => {
      debugLog("GAME", "Exit replay button clicked");
      exitReplayMode();
    });
  }

  // Add event listeners for theme selector
  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      themeModal.classList.remove("hidden");
    });
  }

  if (closeThemeBtn) {
    closeThemeBtn.addEventListener("click", () => {
      themeModal.classList.add("hidden");
    });
  }

  // Setup ban management - only show for bungles17x
  if (manageBansBtn) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (currentUser.username !== 'bungles17x') {
      manageBansBtn.style.display = 'none';
    } else {
      manageBansBtn.addEventListener("click", () => {
        showBanManagementModal();
      });
    }
  }

  // Setup report button
  const reportBtn = document.getElementById('report-btn');
  if (reportBtn) {
    reportBtn.addEventListener("click", () => {
      const reportModal = document.getElementById('report-modal');
      const reportTypeSelect = document.getElementById('report-type');
      const reportReasonInput = document.getElementById('report-reason');
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
      
      // Check if user is logged in for online mode
      if (isOnlineGame && !currentUser) {
        popup("You must be logged in to report players in online games", "red");
        return;
      }
      
      if (reportModal) {
        reportModal.classList.remove("hidden");
        
        // If in bot mode, only show "Bug" and "Other" options
        if (!isOnlineGame) {
          // Clear all options first
          reportTypeSelect.innerHTML = '';
          // Add only Bug and Other options
          const bugOption = document.createElement('option');
          bugOption.value = 'bug';
          bugOption.textContent = 'Bug Report';
          reportTypeSelect.appendChild(bugOption);
          
          const otherOption = document.createElement('option');
          otherOption.value = 'other';
          otherOption.textContent = 'Other';
          reportTypeSelect.appendChild(otherOption);
          
          // Hide the reason field in bot mode
          reportReasonInput.parentElement.style.display = 'none';
          reportReasonInput.removeAttribute('required');
        } else {
          // Restore all options for online mode
          reportTypeSelect.innerHTML = '';
          const options = [
            { value: 'cheating', text: 'Cheating' },
            { value: 'abuse', text: 'Abuse or Harassment' },
            { value: 'bug', text: 'Bug Report' },
            { value: 'other', text: 'Other' }
          ];
          
          options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.text;
            reportTypeSelect.appendChild(option);
          });
          
          // Show the reason field in online mode
          reportReasonInput.parentElement.style.display = 'block';
          reportReasonInput.setAttribute('required', 'required');
        }
      }
    });
  }

  // Setup report form submission
  const reportForm = document.getElementById('report-form');
  if (reportForm) {
    reportForm.addEventListener("submit", (e) => {
      e.preventDefault();
      
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
      
      // Check if user is logged in for online mode
      if (isOnlineGame && !currentUser) {
        popup("You must be logged in to submit reports in online games", "red");
        return;
      }

      const reportData = {
        reportType: document.getElementById('report-type').value,
        reason: isOnlineGame ? document.getElementById('report-reason').value : '',
        description: document.getElementById('report-description').value
      };
      
      if (isOnlineGame) {
        // Send report to server for online games
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            type: 'report',
            ...reportData
          }));
        
        reportForm.reset();
        const reportModal = document.getElementById('report-modal');
        if (reportModal) {
          reportModal.classList.add("hidden");
        }
          popup("Report submitted successfully. Thank you for helping us improve the game!", "green");
        } else {
          popup("Connection error. Please try again.", "red");
        }
      } else {
        // Handle bot mode reports locally
        reportForm.reset();
        const reportModal = document.getElementById('report-modal');
        if (reportModal) {
          reportModal.classList.add("hidden");
        }
        popup("Bug report submitted successfully. Thank you for helping us improve the game!", "green");
      }
    });
  }

  // Setup close report modal button
  const closeReportBtn = document.getElementById('close-report-btn');
  if (closeReportBtn) {
    closeReportBtn.addEventListener("click", () => {
      const reportModal = document.getElementById('report-modal');
      if (reportModal) {
        reportModal.classList.add("hidden");
      }
    });
  }

  // Setup theme selection
  setupThemeSelector();

  // Setup authentication buttons
  setupAuthButtons();

  // Setup dropdown menu
  setupDropdown();

  initBoard();

  // Create a socket when the page loads to detect connection issues
  ensureSocket();

  // Event listeners for retry and back to bot buttons
  retryConnectionBtn.addEventListener("click", () => {
    debugLog("UI", "Retry connection button clicked");
    hideNoConnectionScreen();
    reconnectAttempts = 0;
    ensureSocket();
  });

  backToBotBtn.addEventListener("click", () => {
    debugLog("UI", "Back to bot button clicked");
    hideNoConnectionScreen();
    switchToBotMode();
  });

  // Detect when the user goes offline
  window.addEventListener("offline", () => {
    debugLog("NETWORK", "User went offline");
    isDisconnected = true;
    localStorage.setItem('isDisconnected', 'true');
    showNoConnectionScreen();
  });

  // Detect when the user comes back online
  window.addEventListener("online", async () => {
    debugLog("NETWORK", "User came back online");
    // Check if there's actual internet connectivity
    const hasInternet = await checkInternetConnection();
    if (hasInternet) {
      debugLog("NETWORK", "Internet connection confirmed");
      // Try to reconnect to the server if in online mode
      if (gameMode === "online") {
        reconnectAttempts = 0;
        ensureSocket();
      }
    } else {
      debugLog("NETWORK", "No actual internet connection detected");
      // Keep showing the no connection screen
    }
  });
});

// -----------------------------------------------------
// LOADING SCREEN FUNCTIONS
// -----------------------------------------------------
function showLoadingScreen() {
  debugLog("UI", "Showing loading screen");
  loadingScreen.classList.remove("hidden");
}

function hideLoadingScreen() {
  debugLog("UI", "Hiding loading screen");
  loadingScreen.classList.add("hidden");
}

// -----------------------------------------------------
// CONNECTION STATUS FUNCTIONS
// -----------------------------------------------------
function updateConnectionStatus(connected) {
  if (!connectionDot || !connectionText) return;
  
  if (connected) {
    connectionDot.classList.remove("disconnected");
    connectionText.textContent = "Connected";
  } else {
    connectionDot.classList.add("disconnected");
    connectionText.textContent = "Disconnected";
  }
}

function measureLatency() {
  // Latency is now measured from server message timestamps
  // This function is kept for compatibility but does nothing
  return;
}

function updateConnectionQuality(latency) {
  if (!connectionQuality) return;
  
  // Handle timeout case
  const isTimeout = latency >= 9999;
  
  // Remove all quality classes
  connectionQuality.classList.remove("good", "fair", "poor");
  
  if (isTimeout) {
    connectionQuality.textContent = "Timeout";
    connectionQuality.classList.add("poor");
  } else if (latency < 100) {
    connectionQuality.textContent = "Excellent";
    connectionQuality.classList.add("good");
  } else if (latency < 200) {
    connectionQuality.textContent = "Good";
    connectionQuality.classList.add("good");
  } else if (latency < 300) {
    connectionQuality.textContent = "Fair";
    connectionQuality.classList.add("fair");
  } else {
    connectionQuality.textContent = "Poor";
    connectionQuality.classList.add("poor");
  }
  
  // Update latency value display
  if (latencyValue) {
    latencyValue.textContent = isTimeout ? "Timeout" : `${latency}ms`;
  }
  
  // Update latency history and graph
  if (!isTimeout) {
    latencyHistory.push(latency);
    if (latencyHistory.length > MAX_LATENCY_HISTORY) {
      latencyHistory.shift();
    }
    drawLatencyGraph();
  }
}

function drawLatencyGraph() {
  if (!latencyGraph) return;
  
  const canvas = latencyGraph;
  const ctx = canvas.getContext('2d');
  const width = canvas.width = canvas.offsetWidth;
  const height = canvas.height = canvas.offsetHeight;
  
  // Clear canvas
  ctx.clearRect(0, 0, width, height);
  
  if (latencyHistory.length < 2) return;
  
  // Find max latency for scaling
  const maxLatency = Math.max(...latencyHistory, 500);
  
  // Draw the line
  ctx.beginPath();
  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#38bdf8';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  const stepX = width / (MAX_LATENCY_HISTORY - 1);
  
  latencyHistory.forEach((latency, index) => {
    const x = index * stepX;
    const y = height - (latency / maxLatency) * height;
    
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  
  ctx.stroke();
  
  // Add gradient fill
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, getComputedStyle(document.documentElement).getPropertyValue('--accent-soft').trim() || 'rgba(56, 189, 248, 0.2)');
  gradient.addColorStop(1, 'transparent');
  
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();
}

// -----------------------------------------------------
// NO CONNECTION SCREEN FUNCTIONS
// -----------------------------------------------------

// Particle effect for no connection screen
let particles = [];
let particleAnimationId = null;

class Particle {
  constructor(canvas) {
    this.canvas = canvas;
    this.reset();
  }

  reset() {
    this.x = Math.random() * this.canvas.width;
    this.y = Math.random() * this.canvas.height;
    this.size = Math.random() * 3 + 1;
    this.speedX = Math.random() * 2 - 1;
    this.speedY = Math.random() * 2 - 1;
    this.opacity = Math.random() * 0.5 + 0.2;
    this.color = `rgba(239, 68, 68, ${this.opacity})`; // Red color for warning
  }

  update() {
    this.x += this.speedX;
    this.y += this.speedY;

    // Wrap around the screen
    if (this.x < 0) this.x = this.canvas.width;
    if (this.x > this.canvas.width) this.x = 0;
    if (this.y < 0) this.y = this.canvas.height;
    if (this.y > this.canvas.height) this.y = 0;
  }

  draw(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
  }
}

function initParticles() {
  if (!connectionParticles) return;
  
  const canvas = connectionParticles;
  const ctx = canvas.getContext('2d');
  
  // Set canvas size
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  
  // Create particles
  particles = [];
  const particleCount = 100;
  for (let i = 0; i < particleCount; i++) {
    particles.push(new Particle(canvas));
  }
  
  // Handle window resize
  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });
  
  // Animation loop
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw connections between nearby particles
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 150) {
          ctx.beginPath();
          ctx.strokeStyle = `rgba(239, 68, 68, ${0.1 * (1 - distance / 150)})`;
          ctx.lineWidth = 1;
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }
    
    // Update and draw particles
    particles.forEach(particle => {
      particle.update();
      particle.draw(ctx);
    });
    
    particleAnimationId = requestAnimationFrame(animate);
  }
  
  animate();
}

function stopParticles() {
  if (particleAnimationId) {
    cancelAnimationFrame(particleAnimationId);
    particleAnimationId = null;
  }
}

function showNoConnectionScreen() {
  debugLog("UI", "Showing no connection screen");
  noConnectionScreen.classList.remove("hidden");
  // Update connection status
  updateConnectionStatus(false);
  // Add a small delay to ensure the transition is smooth
  setTimeout(() => {
    noConnectionScreen.style.opacity = "1";
    // Start particle effect
    initParticles();
    // Play connection lost sound
    if (connectionLostSound) {
      // Ensure audio is initialized
      if (!audioInitialized) {
        initializeAudio();
      }
      connectionLostSound.currentTime = 0;
      connectionLostSound.volume = 0.3;
      connectionLostSound.play().catch(err => {
        debugLog("AUDIO", "Failed to play connection lost sound", { error: err.message });
      });
    }
  }, 10);
}

function hideNoConnectionScreen() {
  debugLog("UI", "Hiding no connection screen");
  // Add a fade-out effect
  noConnectionScreen.style.opacity = "0";
  // Stop particle effect
  stopParticles();
  // Update connection status
  updateConnectionStatus(true);
  // Play reconnection sound
  if (reconnectedSound) {
    // Ensure audio is initialized
    if (!audioInitialized) {
      initializeAudio();
    }
    reconnectedSound.currentTime = 0;
    reconnectedSound.volume = 0.3;
    reconnectedSound.play().catch(err => {
      debugLog("AUDIO", "Failed to play reconnection sound", { error: err.message });
    });
  }
  // Wait for the transition to complete before hiding
  setTimeout(() => {
    noConnectionScreen.classList.add("hidden");
  }, 300);
}

// -----------------------------------------------------
// SAVE/LOAD GAME FUNCTIONS
// -----------------------------------------------------
function saveCurrentGame() {
  debugLog("GAME", "saveCurrentGame called");
  try {
    debugLog("GAME", "Creating game state");
    const gameState = {
      fen: game.fen(),
      pgn: game.pgn(),
      turn: game.turn(),
      moveHistory: moveHistory,
      moveCount: moveCount,
      captureCount: captureCount,
      date: new Date().toISOString(),
      mode: gameMode,
      roomId: roomId || null
    };
    debugLog("GAME", "Game state created", { gameState });

    // Save to localStorage
    debugLog("GAME", "Reading from localStorage");
    const currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");
    debugLog("GAME", "currentUser check", { exists: !!currentUser, username: currentUser?.username });
    
    if (currentUser) {
      // Save to currentUser.savedGames
      if (!currentUser.savedGames) {
        currentUser.savedGames = [];
      }
      
      // Check if this game state already exists to avoid duplicates
      const existingGameIndex = currentUser.savedGames.findIndex(
        sg => sg.state.fen === gameState.fen && sg.state.pgn === gameState.pgn
      );
      
      if (existingGameIndex !== -1) {
        // Update existing game instead of creating duplicate
        currentUser.savedGames[existingGameIndex] = {
          ...currentUser.savedGames[existingGameIndex],
          date: new Date().toISOString(),
          state: gameState
        };
        debugLog("GAME", "Updated existing game", { index: existingGameIndex });
      } else {
        // Create new saved game entry
        const savedGame = {
          name: `Game ${currentUser.savedGames.length + 1}`,
          date: new Date().toISOString(),
          state: gameState
        };
        currentUser.savedGames.push(savedGame);
        debugLog("GAME", "Saving to currentUser.savedGames", { totalGames: currentUser.savedGames.length });
      }
      
      localStorage.setItem("currentUser", JSON.stringify(currentUser));
      debugLog("GAME", "Saved to currentUser successfully");
    } else {
      // Fallback to chessSavedGames for non-authenticated users
      const savedGames = JSON.parse(localStorage.getItem("chessSavedGames") || "[]");
      debugLog("GAME", "Current saved games count", { count: savedGames.length });
      
      // Check if this game state already exists to avoid duplicates
      const existingGameIndex = savedGames.findIndex(
        sg => sg.fen === gameState.fen && sg.pgn === gameState.pgn
      );
      
      if (existingGameIndex !== -1) {
        // Update existing game instead of creating duplicate
        savedGames[existingGameIndex] = {
          ...savedGames[existingGameIndex],
          date: new Date().toISOString(),
          ...gameState
        };
        debugLog("GAME", "Updated existing game", { index: existingGameIndex });
      } else {
        // Create new saved game entry
        savedGames.push(gameState);
        debugLog("GAME", "Saving to localStorage", { totalGames: savedGames.length });
      }
      
      localStorage.setItem("chessSavedGames", JSON.stringify(savedGames));
      debugLog("GAME", "Saved to localStorage successfully");
    }

    // Also save to player profile
    if (typeof saveGame === "function") {
      saveGame(gameState);
    }

    popup("Game saved successfully!", "green");
    debugLog("GAME", "Game saved successfully", { gameState });
  } catch (error) {
    const errorMessage = `Failed to save game: ${error.message}`;
    console.error(errorMessage, error);
    debugLog("ERROR", errorMessage, { error: error.message, stack: error.stack });
    popup(errorMessage, "red");
  }
}

function loadGame(gameState) {
  // Check if loading from profile (replay mode)
  const loadedGame = JSON.parse(localStorage.getItem("loadedGame") || "null");
  const isReplayMode = loadedGame && loadedGame.state && loadedGame.state.moveHistory;
  
  if (isReplayMode) {
    // Enter replay mode
    enterReplayMode(loadedGame.state);
  } else {
    // Normal load
    game.load(gameState.fen);
    moveHistory = gameState.moveHistory || [];
    moveCount = gameState.moveCount || 0;
    captureCount = gameState.captureCount || 0;
    currentMoveIndex = moveHistory.length - 1;

    renderPosition();
    updateTurnIndicator();

    popup("Game loaded successfully!", "green");
  }
}

// Enter replay mode
function enterReplayMode(gameState) {
  popup("Entering replay mode...", "blue");
  
  // Disable all buttons except exit replay
  const buttonsToDisable = [
    "save-game-btn",
    "reset-btn",
    "draw-btn",
    "resign-btn",
    "toggle-chat-btn",
    "send-chat-btn",
    "bot-mode",
    "online-mode",
    "lobby-btn",
    "profile-btn",
    "theme-btn",
    "friends-btn",
    "login-btn",
    "register-btn"
  ];
  
  buttonsToDisable.forEach(btnId => {
    const btn = document.getElementById(btnId);
    if (btn) btn.disabled = true;
  });
  
  // Disable piece movement on the board
  if (boardElement) {
    boardElement.style.pointerEvents = "none";
    boardElement.style.opacity = "0.8";
  }

  // Show exit replay button
  const exitReplayBtn = document.getElementById("exit-replay-btn");
  if (exitReplayBtn) {
    exitReplayBtn.classList.remove("hidden");
    exitReplayBtn.disabled = false;
  }
  
  // Reset game to starting position
  game.reset();
  moveHistory = gameState.moveHistory || [];
  moveCount = 0;
  captureCount = 0;
  currentMoveIndex = -1;
  
  renderPosition();
  updateTurnIndicator();
  
  // Replay each move with a delay
  replayMoves(gameState.moveHistory);
}

// Replay moves with animation
function replayMoves(moves) {
  let moveIndex = 0;
  
  function playNextMove() {
    if (moveIndex >= moves.length) {
      debugLog("GAME", "Replay completed");
      return;
    }
    
    const move = moves[moveIndex];
    game.move(move);
    moveCount++;
    currentMoveIndex = moveIndex;
    
    renderPosition();
    updateTurnIndicator();
    
    moveIndex++;
    setTimeout(playNextMove, 1000); // 1 second delay between moves
  }
  
  // Start replay after a short delay
  setTimeout(playNextMove, 500);
}

// Exit replay mode
function exitReplayMode() {
  popup("Exiting replay mode...", "blue");
  
  // Enable all buttons
  const buttonsToEnable = [
    "save-game-btn",
    "reset-btn",
    "draw-btn",
    "resign-btn",
    "toggle-chat-btn",
    "send-chat-btn",
    "bot-mode",
    "online-mode",
    "lobby-btn",
    "profile-btn",
    "theme-btn",
    "manage-bans-btn",
    "report-btn",
    "friends-btn",
    "login-btn",
    "register-btn"
  ];
  
  buttonsToEnable.forEach(btnId => {
    const btn = document.getElementById(btnId);
    if (btn) btn.disabled = false;
  });
  
  // Hide exit replay button
  const exitReplayBtn = document.getElementById("exit-replay-btn");
  if (exitReplayBtn) {
    exitReplayBtn.classList.add("hidden");
  }

  // Re-enable piece movement on the board
  if (boardElement) {
    boardElement.style.pointerEvents = "";
    boardElement.style.opacity = "";
  }
  
  // Reset game
  game.reset();
  moveHistory = [];
  moveCount = 0;
  captureCount = 0;
  currentMoveIndex = -1;
  
  renderPosition();
  updateTurnIndicator();
  
  // Clear loaded game
  localStorage.removeItem("loadedGame");
}

// -----------------------------------------------------
// GAME STATISTICS FUNCTIONS
// -----------------------------------------------------
function updateGameStats(result) {
  // Load player data
  let playerData = JSON.parse(localStorage.getItem("chessPlayerData") || "{}");

  // Initialize if not exists
  if (!playerData.stats) {
    playerData.stats = {
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      currentStreak: 0
    };
  }

  // Update stats
  playerData.stats.gamesPlayed++;

  switch(result) {
    case "win":
      playerData.stats.wins++;
      playerData.stats.currentStreak = Math.max(0, playerData.stats.currentStreak) + 1;
      break;
    case "loss":
      playerData.stats.losses++;
      playerData.stats.currentStreak = Math.min(0, playerData.stats.currentStreak) - 1;
      break;
    case "draw":
      playerData.stats.draws++;
      break;
  }

  // Save back to localStorage
  localStorage.setItem("chessPlayerData", JSON.stringify(playerData));
}

// -----------------------------------------------------
// DROPDOWN MENU FUNCTIONS
// -----------------------------------------------------
function setupDropdown() {
  if (!menuBtn || !dropdown) return;

  // Toggle dropdown on menu button click
  menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('active');
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target)) {
      dropdown.classList.remove('active');
    }
  });

  // Close dropdown when clicking a dropdown item
  const dropdownItems = dropdown.querySelectorAll('.dropdown-item');
  dropdownItems.forEach(item => {
    item.addEventListener('click', () => {
      dropdown.classList.remove('active');
    });
  });

  // Close dropdown on escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      dropdown.classList.remove('active');
    }
  });
}

// -----------------------------------------------------
// AUTHENTICATION FUNCTIONS
// -----------------------------------------------------
function setupAuthButtons() {
  if (!loginBtn || !registerBtn) return;

  // Check if user is logged in
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');

  if (currentUser) {
    // User is logged in - change buttons to logout and profile
    loginBtn.textContent = 'Logout';
    loginBtn.onclick = handleLogout;
    registerBtn.style.display = 'none';
  } else {
    // User is not logged in
    loginBtn.onclick = () => window.location.href = 'login.html';
    registerBtn.onclick = () => window.location.href = 'register.html';
  }
}

function handleLogout() {
  localStorage.removeItem('currentUser');
  window.location.href = 'index.html';
}

// -----------------------------------------------------
// THEME FUNCTIONS
// -----------------------------------------------------
function setupThemeSelector() {
  // Load saved themes
  const savedBoardTheme = localStorage.getItem("chessBoardTheme");
  const savedPieceTheme = localStorage.getItem("chessPieceTheme");

  if (savedBoardTheme) {
    currentBoardTheme = savedBoardTheme;
  }
  if (savedPieceTheme) {
    currentPieceTheme = savedPieceTheme;
  }

  // Apply themes
  applyThemes();

  // Setup board theme selection
  const boardThemeOptions = document.querySelectorAll('.theme-option[data-theme]');
  boardThemeOptions.forEach(option => {
    if (option.dataset.theme === currentBoardTheme) {
      option.classList.add('selected');
    }

    option.addEventListener('click', () => {
      // Remove selected from all
      boardThemeOptions.forEach(opt => opt.classList.remove('selected'));
      // Add selected to clicked
      option.classList.add('selected');
      // Update theme
      currentBoardTheme = option.dataset.theme;
      localStorage.setItem('chessBoardTheme', currentBoardTheme);
      applyThemes();
    });
  });

  // Setup piece theme selection
  const pieceThemeOptions = document.querySelectorAll('.theme-option[data-piece]');
  pieceThemeOptions.forEach(option => {
    if (option.dataset.piece === currentPieceTheme) {
      option.classList.add('selected');
    }

    option.addEventListener('click', () => {
      // Remove selected from all
      pieceThemeOptions.forEach(opt => opt.classList.remove('selected'));
      // Add selected to clicked
      option.classList.add('selected');
      // Update theme
      currentPieceTheme = option.dataset.piece;
      localStorage.setItem('chessPieceTheme', currentPieceTheme);
      applyThemes();
    });
  });
}

function applyThemes() {
  // Apply board theme
  boardElement.className = `chessboard board-${currentBoardTheme}`;

  // Apply piece theme
  boardElement.classList.add(`piece-${currentPieceTheme}`);

  // Re-render board with new themes
  renderPosition();
}

// -----------------------------------------------------
// SOUND EFFECTS FUNCTIONS
// -----------------------------------------------------
function playSound(audioElement) {
  if (!audioElement) return;

  audioElement.currentTime = 0;
  audioElement.volume = 0.3;
  audioElement.play().catch(err => {
    console.log("Failed to play sound:", err);
  });
}

// -----------------------------------------------------
// PIECE ANIMATION FUNCTIONS
// -----------------------------------------------------
function animatePieceMove(fromSquare, toSquare) {
  const piece = fromSquare.querySelector('.piece');
  if (!piece) return;

  // Add moving class
  piece.classList.add('piece-moving');

  // Remove animation class after it completes
  setTimeout(() => {
    piece.classList.remove('piece-moving');
  }, 300);
}

function animatePieceCapture(capturedPiece) {
  if (!capturedPiece) return;

  // Add captured animation
  capturedPiece.classList.add('piece-captured');

  // Remove after animation completes
  setTimeout(() => {
    capturedPiece.remove();
  }, 300);
}

// -----------------------------------------------------
// SEARCH FUNCTIONALITY
// -----------------------------------------------------
function filterRooms(searchTerm) {
  const term = searchTerm.toLowerCase().trim();
  roomList.innerHTML = "";

  const filteredRooms = allRooms.filter(room => 
    room.toLowerCase().includes(term)
  );

  if (filteredRooms.length === 0 && term.length > 0) {
    // Show popup error when user types something and no rooms match
    popup("No rooms found matching your search. Please check for typos.", "red");

    const li = document.createElement("li");
    li.className = "room-item";
    li.style.color = "#ef4444"; // Red color for error
    li.style.textAlign = "center";
    li.style.padding = "10px";
    li.textContent = "No rooms found matching your search. Please check for typos.";
    roomList.appendChild(li);
    return;
  }

  filteredRooms.forEach(room => {
    const roomDiv = document.createElement("div");
    roomDiv.className = "room-item";

    const roomName = document.createElement("span");
    roomName.textContent = room;

    const joinBtn = document.createElement("button");
    joinBtn.textContent = "Join";
    joinBtn.className = "join-room-btn";
    joinBtn.addEventListener("click", () => joinRoom(room));

    roomDiv.appendChild(roomName);
    roomDiv.appendChild(joinBtn);
    roomList.appendChild(roomDiv);
  });
}

// Friends List Functions
function loadLobbyFriends() {
  if (!lobbyFriendsList) return;

  // Get friends from localStorage
  const playerData = JSON.parse(localStorage.getItem('playerData') || '{}');
  const friends = playerData.friends || [];

  if (friends.length === 0) {
    lobbyFriendsList.innerHTML = '<li class="no-friends">No friends yet. Add some in your profile!</li>';
    return;
  }

  lobbyFriendsList.innerHTML = friends.map(friend => `
    <li class="friend-item">
      <div class="friend-info">
        <div class="friend-avatar">${friend.avatar || '♟'}</div>
        <div>
          <div class="friend-name">${friend.username}</div>
          <div class="friend-status ${friend.online ? 'online' : 'offline'}">
            ${friend.online ? '● Online' : '● Offline'}
          </div>
        </div>
      </div>
      <div class="friend-actions">
        <button class="friend-btn invite-btn" data-username="${friend.username}">Invite</button>
      </div>
    </li>
  `).join('');

  // Add event listeners for invite buttons
  document.querySelectorAll('.invite-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const username = e.target.dataset.username;
      inviteFriendToGame(username);
    });
  });
}

function inviteFriendToGame(username) {
  // Create a room with a unique name
  const roomName = `game-${Date.now()}`;

  // Join the room
  joinRoom(roomName);

  // Send invite to the friend
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      type: "invite",
      username: username,
      room: roomName
    }));

    popup(`Invitation sent to ${username}!`, "green");
  } else {
    popup("Not connected to server. Please try again.", "red");
  }
}

// Ban Management Functions
function showBanManagementModal() {
  // Request list of banned users from server
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: "getBannedUsers" }));
  } else {
    popup("Not connected to server. Please try again.", "red");
    return;
  }

  // Create modal overlay
  const modalOverlay = document.createElement('div');
  modalOverlay.id = 'ban-management-modal';
  modalOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999;
  `;

  // Create modal content
  const modalContent = document.createElement('div');
  modalContent.style.cssText = `
    background: white;
    padding: 30px;
    border-radius: 10px;
    max-width: 600px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  `;

  // Create header
  const header = document.createElement('div');
  header.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  `;

  const title = document.createElement('h2');
  title.textContent = 'Manage Bans';
  title.style.cssText = `
    margin: 0;
    color: #333;
  `;

  const closeButton = document.createElement('button');
  closeButton.textContent = '✕';
  closeButton.style.cssText = `
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #666;
  `;
  closeButton.onclick = () => modalOverlay.remove();

  header.appendChild(title);
  header.appendChild(closeButton);

  // Create user list container
  const userListContainer = document.createElement('div');
  userListContainer.id = 'banned-users-list';
  userListContainer.style.cssText = `
    margin-bottom: 20px;
  `;

  // Create add user section
  const addUserSection = document.createElement('div');
  addUserSection.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid #eee;
  `;

  const usernameInput = document.createElement('input');
  usernameInput.type = 'text';
  usernameInput.placeholder = 'Enter username to ban';
  usernameInput.id = 'ban-username-input';
  usernameInput.style.cssText = `
    width: 100%;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 5px;
    font-size: 14px;
    box-sizing: border-box;
  `;

  const reasonInput = document.createElement('input');
  reasonInput.type = 'text';
  reasonInput.placeholder = 'Enter reason for ban (optional)';
  reasonInput.id = 'ban-reason-input';
  reasonInput.style.cssText = `
    width: 100%;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 5px;
    font-size: 14px;
    box-sizing: border-box;
  `;

  const durationSection = document.createElement('div');
  durationSection.style.cssText = `
    display: flex;
    gap: 10px;
    align-items: center;
  `;

  const durationInput = document.createElement('input');
  durationInput.type = 'number';
  durationInput.placeholder = 'Duration';
  durationInput.id = 'ban-duration-input';
  durationInput.min = '1';
  durationInput.style.cssText = `
    flex: 1;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 5px;
    font-size: 14px;
    box-sizing: border-box;
  `;

  const durationUnit = document.createElement('select');
  durationUnit.id = 'ban-duration-unit';
  durationUnit.style.cssText = `
    flex: 1;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 5px;
    font-size: 14px;
    box-sizing: border-box;
    background: white;
  `;

  const units = ['minutes', 'hours', 'days', 'permanent'];
  units.forEach(unit => {
    const option = document.createElement('option');
    option.value = unit;
    option.textContent = unit.charAt(0).toUpperCase() + unit.slice(1);
    durationUnit.appendChild(option);
  });

  durationSection.appendChild(durationInput);
  durationSection.appendChild(durationUnit);

  const banButton = document.createElement('button');
  banButton.textContent = 'Ban User';
  banButton.style.cssText = `
    background: #f44336;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 5px;
    cursor: pointer;
    font-size: 14px;
    align-self: flex-start;
  `;
  banButton.onclick = () => {
    const duration = durationInput.value;
    const unit = durationUnit.value;
    banUser(usernameInput.value, reasonInput.value, duration, unit);
  };

  addUserSection.appendChild(usernameInput);
  addUserSection.appendChild(reasonInput);
  addUserSection.appendChild(durationSection);
  addUserSection.appendChild(banButton);

  // Assemble modal
  modalContent.appendChild(header);
  modalContent.appendChild(userListContainer);
  modalContent.appendChild(addUserSection);
  modalOverlay.appendChild(modalContent);

  // Show modal
  document.body.appendChild(modalOverlay);
}

function showBanModal(message, reason, duration, unit, expiresAt) {
  // Debug logging
  console.log("BAN", "showBanModal called", { message, reason, duration, unit, expiresAt, expiresAtType: typeof expiresAt });
  
  // Create modal overlay
  const modalOverlay = document.createElement('div');
  modalOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 99999;
  `;

  // Create modal content with enhanced styling
  const modalContent = document.createElement('div');
  modalContent.style.cssText = `
    background: linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%);
    padding: 50px;
    border-radius: 20px;
    max-width: 550px;
    text-align: center;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1);
    animation: banModalPop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    position: relative;
    overflow: hidden;
  `;

  // Add decorative gradient border
  const borderGradient = document.createElement('div');
  borderGradient.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #ff6b6b 0%, #d32f2f 100%);
  `;
  modalContent.appendChild(borderGradient);

  // Add animation keyframes
  const style = document.createElement('style');
  style.textContent = `
    @keyframes banModalPop {
      0% {
        transform: scale(0.7) translateY(20px);
        opacity: 0;
      }
      100% {
        transform: scale(1) translateY(0);
        opacity: 1;
      }
    }
    
    @keyframes pulse {
      0%, 100% {
        transform: scale(1);
      }
      50% {
        transform: scale(1.05);
      }
    }
    
    @keyframes countdownPulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.7;
      }
    }
  `;
  document.head.appendChild(style);

  // Create icon with enhanced styling and animation
  const icon = document.createElement('div');
  icon.style.cssText = `
    font-size: 90px;
    margin-bottom: 25px;
    animation: pulse 2s ease-in-out infinite;
    filter: drop-shadow(0 4px 8px rgba(211, 47, 47, 0.3));
  `;
  icon.textContent = '🚫';

  // Create title with enhanced styling
  const title = document.createElement('h2');
  title.style.cssText = `
    margin: 0 0 25px 0;
    font-size: 32px;
    font-weight: 700;
    background: linear-gradient(135deg, #d32f2f 0%, #ff6b6b 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    text-shadow: 0 2px 4px rgba(211, 47, 47, 0.1);
  `;
  title.textContent = 'You Have Been Banned';

  // Create message with enhanced styling
  const messageEl = document.createElement('p');
  messageEl.style.cssText = `
    font-size: 18px;
    color: #424242;
    margin-bottom: 25px;
    line-height: 1.6;
    font-weight: 500;
  `;
  messageEl.textContent = message;

  // Create reason section with enhanced styling
  const reasonSection = document.createElement('div');
  reasonSection.style.cssText = `
    background: linear-gradient(135deg, #fff5f5 0%, #ffebee 100%);
    border-left: 4px solid #d32f2f;
    padding: 18px;
    margin-bottom: 25px;
    text-align: left;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(211, 47, 47, 0.08);
  `;

  const reasonLabel = document.createElement('div');
  reasonLabel.style.cssText = `
    font-weight: 700;
    color: #d32f2f;
    margin-bottom: 10px;
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 1px;
  `;
  reasonLabel.textContent = 'Ban Reason:';

  const reasonText = document.createElement('div');
  reasonText.style.cssText = `
    color: #424242;
    font-size: 16px;
    line-height: 1.5;
    font-weight: 500;
  `;
  reasonText.textContent = reason;

  reasonSection.appendChild(reasonLabel);
  reasonSection.appendChild(reasonText);

  // Create duration section with enhanced styling
  const durationSection = document.createElement('div');
  durationSection.style.cssText = `
    background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
    border-left: 4px solid #1976d2;
    padding: 18px;
    margin-bottom: 25px;
    text-align: left;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(25, 118, 210, 0.08);
  `;

  const durationLabel = document.createElement('div');
  durationLabel.style.cssText = `
    font-weight: 700;
    color: #1976d2;
    margin-bottom: 10px;
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 1px;
  `;
  durationLabel.textContent = 'Ban Duration:';

  const durationText = document.createElement('div');
  durationText.style.cssText = `
    color: #424242;
    font-size: 16px;
    line-height: 1.5;
    font-weight: 500;
  `;

  if (duration && unit !== 'permanent') {
    if (expiresAt && !isNaN(expiresAt)) {
      const expiryDate = new Date(expiresAt);
      // Check if the date is valid
      if (!isNaN(expiryDate.getTime())) {
        // Create countdown timer element with enhanced styling
        const countdownElement = document.createElement('div');
        countdownElement.style.cssText = `
          margin-top: 12px;
          font-size: 15px;
          color: #1976d2;
          font-weight: 700;
          padding: 10px;
          background: rgba(25, 118, 210, 0.08);
          border-radius: 6px;
          animation: countdownPulse 2s ease-in-out infinite;
        `;
        
        // Function to update countdown
        const updateCountdown = () => {
          const now = Date.now();
          const remaining = expiresAt - now;
          
          if (remaining <= 0) {
            // Ban has expired, automatically unban
            countdownElement.textContent = 'Ban has expired! Refreshing...';
            
            // Clear all ban-related localStorage items
            localStorage.removeItem('botModeBan');
            localStorage.removeItem('bannedUsername');
            localStorage.removeItem('isUserBanned');
            localStorage.removeItem('showBanAfterLogin');
            localStorage.removeItem('banExpiresAt');
            localStorage.removeItem('banReason');
            
            // Remove the modal
            modalOverlay.remove();
            
            // Re-enable game interaction
            if (boardElement) {
              boardElement.style.pointerEvents = '';
              boardElement.style.opacity = '';
            }
            if (resetBtn) resetBtn.disabled = false;
            if (saveGameBtn) saveGameBtn.disabled = false;
            if (onlineModeBtn) onlineModeBtn.disabled = false;
            if (lobbyBtn) lobbyBtn.disabled = false;
            
            // Show notification
            popup("Your ban has expired! You can now use the chat again.", "green");
            
            // Refresh the page to fully restore functionality
            setTimeout(() => {
              window.location.reload();
            }, 2000);
            
            return;
          }
          
          // Calculate remaining time
          const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
          const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
          const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
          const seconds = Math.floor((remaining % (60 * 1000)) / 1000);
          
          // Format the countdown
          let countdownText = 'Time remaining: ';
          if (days > 0) countdownText += `${days}d `;
          if (hours > 0) countdownText += `${hours}h `;
          if (minutes > 0) countdownText += `${minutes}m `;
          countdownText += `${seconds}s`;
          
          countdownElement.textContent = countdownText;
          
          // Update every second
          setTimeout(updateCountdown, 1000);
        };
        
        // Start the countdown
        updateCountdown();
        
        durationText.textContent = `${duration} ${unit} (Expires: ${expiryDate.toLocaleString()})`;
        durationSection.appendChild(countdownElement);
      } else {
        durationText.textContent = `${duration} ${unit}`;
      }
    } else {
      durationText.textContent = `${duration} ${unit}`;
    }
  } else {
    durationText.textContent = 'Permanent';
  }

  durationSection.appendChild(durationLabel);
  durationSection.appendChild(durationText);

  // Create OK button with enhanced styling and hover effects
  const okButton = document.createElement('button');
  okButton.textContent = 'OK';
  okButton.style.cssText = `
    background: linear-gradient(135deg, #d32f2f 0%, #b71c1c 100%);
    color: white;
    border: none;
    padding: 14px 50px;
    font-size: 16px;
    font-weight: 600;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 4px 12px rgba(211, 47, 47, 0.3);
    text-transform: uppercase;
    letter-spacing: 1px;
  `;
  
  // Add hover effect
  okButton.onmouseenter = () => {
    okButton.style.transform = 'translateY(-2px)';
    okButton.style.boxShadow = '0 6px 16px rgba(211, 47, 47, 0.4)';
  };
  
  okButton.onmouseleave = () => {
    okButton.style.transform = 'translateY(0)';
    okButton.style.boxShadow = '0 4px 12px rgba(211, 47, 47, 0.3)';
  };
  okButton.onclick = () => {
    modalOverlay.remove();
    // Redirect to login page
    window.location.href = 'login.html';
  };

  // Assemble modal
  modalContent.appendChild(icon);
  modalContent.appendChild(title);
  modalContent.appendChild(messageEl);
  modalContent.appendChild(reasonSection);
  modalContent.appendChild(durationSection);
  modalContent.appendChild(okButton);
  modalOverlay.appendChild(modalContent);

  // Show modal
  document.body.appendChild(modalOverlay);
}

function showProfanityWarningModal(message) {
  console.log("showProfanityWarningModal called with message:", message);
  // Create modal overlay
  const modalOverlay = document.createElement('div');
  modalOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 99999;
  `;

  // Create modal content
  const modalContent = document.createElement('div');
  modalContent.style.cssText = `
    background: white;
    padding: 40px;
    border-radius: 15px;
    max-width: 500px;
    text-align: center;
    box-shadow: 0 4px 30px rgba(0, 0, 0, 0.5);
    animation: warningModalPop 0.3s ease-out;
  `;

  // Add animation keyframes
  const style = document.createElement('style');
  style.textContent = `
    @keyframes warningModalPop {
      0% {
        transform: scale(0.8);
        opacity: 0;
      }
      100% {
        transform: scale(1);
        opacity: 1;
      }
    }
  `;
  document.head.appendChild(style);

  // Create icon
  const icon = document.createElement('div');
  icon.style.cssText = `
    font-size: 80px;
    margin-bottom: 20px;
  `;
  icon.textContent = '⚠️';

  // Create title
  const title = document.createElement('h2');
  title.style.cssText = `
    margin: 0 0 20px 0;
    color: #ff9800;
    font-size: 28px;
  `;
  title.textContent = 'Profanity Warning';

  // Create message
  const messageEl = document.createElement('p');
  messageEl.style.cssText = `
    font-size: 18px;
    color: #333;
    margin-bottom: 30px;
    line-height: 1.5;
  `;
  messageEl.textContent = message;

  // Create OK button
  const okButton = document.createElement('button');
  okButton.textContent = 'I Understand';
  okButton.style.cssText = `
    background: #ff9800;
    color: white;
    border: none;
    padding: 12px 40px;
    font-size: 16px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  `;
  okButton.onmouseover = () => {
    okButton.style.background = '#f57c00';
    okButton.style.transform = 'translateY(-2px)';
    okButton.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
  };
  okButton.onmouseout = () => {
    okButton.style.background = '#ff9800';
    okButton.style.transform = 'translateY(0)';
    okButton.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.2)';
  };
  okButton.onclick = () => {
    modalOverlay.remove();
  };

  // Assemble modal
  modalContent.appendChild(icon);
  modalContent.appendChild(title);
  modalContent.appendChild(messageEl);
  modalContent.appendChild(okButton);
  modalOverlay.appendChild(modalContent);
  document.body.appendChild(modalOverlay);
}

function updateBannedUsersList(users) {
  const listContainer = document.getElementById('banned-users-list');
  if (!listContainer) return;

  // Check if current user is in the banned list
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  if (currentUser) {
    const bannedUser = users.find(user => user.username.toLowerCase() === currentUser.username.toLowerCase());
    if (bannedUser) {
      // Calculate expiration time using the bannedAt timestamp from server
      const expiresAt = bannedUser.bannedAt + (bannedUser.duration * (bannedUser.unit === 'days' ? 86400000 : bannedUser.unit === 'hours' ? 3600000 : 60000));
      
      // Show ban modal for the current user
      showBanModal(
        `You have been banned from the game for ${bannedUser.duration} ${bannedUser.unit}.`,
        bannedUser.reason || "Multiple profanity offenses in chat",
        bannedUser.duration,
        bannedUser.unit,
        expiresAt
      );
      return;
    }
  }

  if (users.length === 0) {
    listContainer.innerHTML = '<p style="color: #666; text-align: center;">No banned users</p>';
    return;
  }

  listContainer.innerHTML = users.map((user, index) => `
    <div style="
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px;
      background: #f9f9f9;
      border-radius: 5px;
      margin-bottom: 8px;
    ">
      <div>
        <div style="font-weight: 500; color: #333;">${user.username}</div>
        <div style="font-size: 12px; color: #666;">Reason: ${user.reason || 'No reason provided'}</div>
        <div style="font-size: 12px; color: #666;">Duration: ${user.duration ? user.duration + ' ' + user.unit : 'Permanent'}</div>
        ${user.expiresAt ? `<div style="font-size: 12px; color: #666;">Expires: ${new Date(user.expiresAt).toLocaleString()}</div>` : ''}
      </div>
      <button 
        onclick="unbanUser('${user.username}')"
        style="
          background: #4CAF50;
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 3px;
          cursor: pointer;
          font-size: 12px;
        "
      >
        Unban
      </button>
    </div>
  `).join('');
}

function banUser(username, reason, duration, unit) {
  if (!username || username.trim() === '') {
    popup('Please enter a username', 'red');
    return;
  }

  // Parse duration and validate
  const parsedDuration = duration && !isNaN(parseInt(duration)) ? parseInt(duration) : null;
  const banUnit = (unit && unit !== 'permanent') ? unit : 'permanent';

  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      type: "banUser",
      username: username.trim(),
      reason: reason ? reason.trim() : '',
      duration: parsedDuration,
      unit: banUnit
    }));
  } else {
    popup("Not connected to server. Please try again.", "red");
  }
}

// Helper function to remove any existing ban modal
function removeBanModal() {
  const existingModal = document.querySelector('div[style*="z-index: 99999"]');
  if (existingModal) {
    existingModal.remove();
  }
}

function unbanUser(username) {
  // Clear local ban data for this user
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  if (currentUser && username.toLowerCase() === currentUser.username.toLowerCase()) {
    localStorage.removeItem('botModeBan');
    localStorage.removeItem('bannedUsername');
    localStorage.removeItem('isUserBanned');
    localStorage.removeItem('showBanAfterLogin');
    
    // Remove any existing ban modal
    removeBanModal();

    // Re-enable game interaction
    if (boardElement) {
      boardElement.style.pointerEvents = '';
      boardElement.style.opacity = '';
    }
    if (resetBtn) resetBtn.disabled = false;
    if (saveGameBtn) saveGameBtn.disabled = false;
    if (onlineModeBtn) onlineModeBtn.disabled = false;
    if (lobbyBtn) lobbyBtn.disabled = false;
    
    popup("You have been unbanned!", "green");
  }
  
  // Also send to server to unban
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      type: "unbanUser",
      username: username
    }));
  } else {
    popup("Not connected to server. Local ban cleared only.", "orange");
  }
}

// Function to manually clear all ban data
clearAllBanData = function() {
  localStorage.removeItem('botModeBan');
  localStorage.removeItem('bannedUsername');
  localStorage.removeItem('isUserBanned');
  localStorage.removeItem('showBanAfterLogin');
  
  // Re-enable game interaction
  if (boardElement) {
    boardElement.style.pointerEvents = '';
    boardElement.style.opacity = '';
  }
  if (resetBtn) resetBtn.disabled = false;
}

// Update game statistics after game over
function updateGameStatistics() {
  // Determine game result
  let result = "draw";
  
  if (game.in_checkmate()) {
    // Checkmate - determine winner based on whose turn it is
    result = game.turn() === "w" ? "loss" : "win";
  } else if (game.in_draw() || game.in_stalemate() || game.in_threefold_repetition()) {
    result = "draw";
  }
  
  // Load player data from localStorage
  const currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");
  
  if (currentUser && currentUser.username) {
    // Update authenticated user's statistics
    const users = secureStorage.getItem("chessUsers") || [];
    const userIndex = users.findIndex(u => u.id === currentUser.id);
    
    if (userIndex !== -1) {
      const user = users[userIndex];
      
      // Initialize stats if not present
      if (!user.stats) {
        user.stats = {
          gamesPlayed: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          currentStreak: 0
        };
      }
      
      // Update statistics based on result
      user.stats.gamesPlayed++;
      
      switch(result) {
        case "win":
          user.stats.wins++;
          user.stats.currentStreak = Math.max(0, user.stats.currentStreak) + 1;
          user.xp += 100;
          break;
        case "loss":
          user.stats.losses++;
          user.stats.currentStreak = Math.min(0, user.stats.currentStreak) - 1;
          user.xp += 25;
          break;
        case "draw":
          user.stats.draws++;
          user.xp += 50;
          break;
      }
      
      // Check for level up
      const xpNeeded = user.level * 1000;
      if (user.xp >= xpNeeded) {
        user.level++;
        user.xp -= xpNeeded;
        popup(`Congratulations! You leveled up to Level ${user.level}!`, "green");
      }
      
      // Save updated user data
      users[userIndex] = user;
      localStorage.setItem("chessUsers", JSON.stringify(users));
      localStorage.setItem("currentUser", JSON.stringify(user));
    }
  } else {
    // Update local player data for non-authenticated users
    const playerData = JSON.parse(localStorage.getItem("chessPlayerData") || "{}");
    
    // Initialize stats if not present
    if (!playerData.stats) {
      playerData.stats = {
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        currentStreak: 0
      };
    }
    
    // Update statistics based on result
    playerData.stats.gamesPlayed++;
    
    switch(result) {
      case "win":
        playerData.stats.wins++;
        playerData.stats.currentStreak = Math.max(0, playerData.stats.currentStreak) + 1;
        playerData.xp += 100;
        break;
      case "loss":
        playerData.stats.losses++;
        playerData.stats.currentStreak = Math.min(0, playerData.stats.currentStreak) - 1;
        playerData.xp += 25;
        break;
      case "draw":
        playerData.stats.draws++;
        playerData.xp += 50;
        break;
    }
    
    // Check for level up
    const xpNeeded = playerData.level * 1000;
    if (playerData.xp >= xpNeeded) {
      playerData.level++;
      playerData.xp -= xpNeeded;
      popup(`Congratulations! You leveled up to Level ${playerData.level}!`, "green");
    }
    
    // Save updated player data
    localStorage.setItem("chessPlayerData", JSON.stringify(playerData));
  }
  
  // Show result message
  if (result === "win") {
    popup("Congratulations! You won!", "green");
  } else if (result === "loss") {
    popup("Game Over! You lost.", "red");
  } else {
    popup("Game Drawn!", "orange");
  }
}
  if (saveGameBtn) saveGameBtn.disabled = false;
  if (onlineModeBtn) onlineModeBtn.disabled = false;
  if (lobbyBtn) lobbyBtn.disabled = false;
  
  popup("All ban data cleared!", "green");

// Load Game Settings
function loadGameSettings() {
  // Try to load from user profile first
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
  let settings = null;

  if (currentUser && currentUser.settings) {
    settings = currentUser.settings;
  } else {
    // Load from localStorage
    const savedSettings = localStorage.getItem('chessSettings');
    if (savedSettings) {
      settings = JSON.parse(savedSettings);
    }
  }

  if (!settings) {
    // Use default settings
    settings = {
      theme: 'dark',
      boardTheme: 'classic',
      chessBoardTheme: 'classic',
      chessPieceTheme: 'classic',
      soundEnabled: true,
      moveHints: true,
      autoPromote: false,
      showCoordinates: false,
      showBanAfterLogin: false
    };
  }

  // Apply theme
  if (settings.theme) {
    document.documentElement.setAttribute('data-theme', settings.theme);
    localStorage.setItem('theme', settings.theme);
    document.body.classList.remove('light-theme');
    if (settings.theme === 'light') {
      document.body.classList.add('light-theme');
    }
  }

  // Apply chess board theme
  if (settings.chessBoardTheme) {
    localStorage.setItem('chessBoardTheme', settings.chessBoardTheme);
    localStorage.setItem('boardTheme', settings.chessBoardTheme);
    currentBoardTheme = settings.chessBoardTheme;
    // Apply to board element if it exists
    if (boardElement) {
      boardElement.className = `chessboard board-${settings.chessBoardTheme}`;
    }
  }

  // Apply chess piece theme
  if (settings.chessPieceTheme) {
    localStorage.setItem('chessPieceTheme', settings.chessPieceTheme);
    currentPieceTheme = settings.chessPieceTheme;
  }

  // Apply sound setting
  if (typeof settings.soundEnabled === 'boolean') {
    localStorage.setItem('soundEnabled', settings.soundEnabled);
    window.soundEnabled = settings.soundEnabled;
  }

  // Apply move hints setting
  if (typeof settings.moveHints === 'boolean') {
    localStorage.setItem('moveHints', settings.moveHints);
    window.showMoveHints = settings.moveHints;
  }

  // Apply auto-promote setting
  if (typeof settings.autoPromote === 'boolean') {
    localStorage.setItem('autoPromote', settings.autoPromote);
    window.autoPromote = settings.autoPromote;
  }

  // Apply show coordinates setting
  if (typeof settings.showCoordinates === 'boolean') {
    localStorage.setItem('showCoordinates', settings.showCoordinates);
    window.showCoordinates = settings.showCoordinates;
    
    // Update board coordinates
    if (typeof window.removeBoardCoordinates === 'function' && typeof window.enhanceBoardCoordinates === 'function') {
      window.removeBoardCoordinates();
      if (settings.showCoordinates) {
        window.enhanceBoardCoordinates();
      }
    }
  }

  // Apply show ban after login setting
  if (typeof settings.showBanAfterLogin === 'boolean') {
    localStorage.setItem('showBanAfterLogin', settings.showBanAfterLogin.toString());
  }
}

// Server status button event listener
serverStatusBtn.addEventListener("click", () => {
  debugLog("ADMIN", "Server status button clicked");
  
  // Check if user is logged in by reading directly from localStorage
  const currentUserData = localStorage.getItem('currentUser');
  if (!currentUserData) {
    popup("Please login first", "red");
    return;
  }
  
  // Parse the user data
  let currentUser;
  try {
    currentUser = JSON.parse(currentUserData);
  } catch (error) {
    console.error("Error parsing user data:", error);
    popup("Error: Invalid user data", "red");
    return;
  }
  
  // Check if user is admin
  const adminUsers = ['bungles17x'];
  if (!adminUsers.includes(currentUser.username.toLowerCase())) {
    popup("Access denied: Admin privileges required", "red");
    return;
  }
  
  // Navigate to server status page
  window.location.href = 'server-status.html';
});

