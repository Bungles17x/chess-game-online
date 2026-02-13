// script.js - Enhanced Version
// Main game logic with improved functionality and error handling

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

// Connection quality elements
const connectionQuality = document.getElementById("connection-quality");
const latencyGraph = document.getElementById("latency-graph");
const latencyValue = document.getElementById("latency-value");

// Chat elements
const chatContainer = document.getElementById("chat-container");
const chatMessages = document.getElementById("chat-messages");
const chatInput = document.getElementById("chat-input");
const sendChatBtn = document.getElementById("send-chat-btn");

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
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_INTERVAL = 2000;
let roomUpdateInterval = null;
let isDisconnected = localStorage.getItem('isDisconnected') === 'true'; // Flag to track if we're disconnected, persisted across page refreshes
let noConnectionTimeout = null; // Store timeout ID so we can cancel it

// WebSocket configuration
const WS_CONFIG = {
  // Use localhost for development, Render for production
  PRODUCTION_URL: 'wss://chess-game-online-u34h.onrender.com',
  DEVELOPMENT_URL: 'ws://localhost:8080',
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
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    fetch('https://www.google.com/favicon.ico', {
      method: 'HEAD',
      mode: 'no-cors',
      signal: controller.signal
    })
      .then(() => {
        clearTimeout(timeoutId);
        resolve(true);
      })
      .catch(() => {
        clearTimeout(timeoutId);
        resolve(false);
      });
  });
}

// Connect to WebSocket with improved error handling
function connectToWebSocket() {
  if (socket && (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN)) {
    debugLog("SOCKET", "Connection already in progress or established");
    return;
  }

  // Check if we've exceeded max reconnect attempts
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    debugLog("SOCKET", "Max reconnect attempts reached");
    showNoConnectionScreen();
    return;
  }

  const wsUrl = getWebSocketUrl();
  debugLog("SOCKET", `Connecting to ${wsUrl}`);

  try {
    socket = new WebSocket(wsUrl);
    window.socket = socket;

    socket.onopen = () => {
      debugLog("SOCKET", "Connected successfully");
      reconnectAttempts = 0;
      isDisconnected = false;
      localStorage.setItem('isDisconnected', 'false');

      // Hide no connection screen if visible
      if (noConnectionScreen) {
        noConnectionScreen.classList.add('hidden');
      }

      // Start connection quality monitoring
      startConnectionMonitoring();

      // Send initial ping
      sendPing();
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleServerMessage(data);
      } catch (error) {
        debugLog("SOCKET", "Error parsing message", { error: error.message });
      }
    };

    socket.onerror = (error) => {
      debugLog("SOCKET", "Connection error", { error });
      handleConnectionError();
    };

    socket.onclose = (event) => {
      debugLog("SOCKET", "Connection closed", { code: event.code, reason: event.reason });
      handleConnectionClose();
    };
  } catch (error) {
    debugLog("SOCKET", "Failed to create WebSocket", { error });
    handleConnectionError();
  }
}

// Handle connection error
function handleConnectionError() {
  isDisconnected = true;
  localStorage.setItem('isDisconnected', 'true');

  // Check if there's actual internet connection
  checkInternetConnection().then(hasInternet => {
    if (!hasInternet) {
      debugLog("SOCKET", "No internet connection");
      showNoConnectionScreen();
    } else {
      debugLog("SOCKET", "Internet available but server unreachable");
      // Attempt to reconnect
      scheduleReconnect();
    }
  });
}

// Handle connection close
function handleConnectionClose() {
  isDisconnected = true;
  localStorage.setItem('isDisconnected', 'true');

  // Stop connection quality monitoring
  stopConnectionMonitoring();

  // Attempt to reconnect
  scheduleReconnect();
}

// Schedule reconnection with exponential backoff
function scheduleReconnect() {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    debugLog("SOCKET", "Max reconnect attempts reached");
    showNoConnectionScreen();
    return;
  }

  reconnectAttempts++;
  const delay = RECONNECT_INTERVAL * Math.pow(2, reconnectAttempts - 1);
  debugLog("SOCKET", `Scheduling reconnect in ${delay}ms (attempt ${reconnectAttempts})`);

  setTimeout(() => {
    if (isDisconnected) {
      connectToWebSocket();
    }
  }, delay);
}

// Start connection quality monitoring
function startConnectionMonitoring() {
  // Clear any existing monitoring
  stopConnectionMonitoring();

  // Send ping every 5 seconds
  pingInterval = setInterval(() => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      sendPing();
    }
  }, 5000);
}

// Stop connection quality monitoring
function stopConnectionMonitoring() {
  if (pingInterval) {
    clearInterval(pingInterval);
    pingInterval = null;
  }
  if (pingTimeout) {
    clearTimeout(pingTimeout);
    pingTimeout = null;
  }
}

// Send ping to server
function sendPing() {
  if (!socket || socket.readyState !== WebSocket.OPEN) return;

  lastPingTime = performance.now();

  // Set timeout for ping response
  pingTimeout = setTimeout(() => {
    debugLog("SOCKET", "Ping timeout");
    handleConnectionError();
  }, PING_TIMEOUT);

  socket.send(JSON.stringify({ type: 'ping', timestamp: lastPingTime }));
}

// Handle pong from server
function handlePong(timestamp) {
  if (pingTimeout) {
    clearTimeout(pingTimeout);
    pingTimeout = null;
  }

  const latency = Math.round(performance.now() - timestamp);
  window.connectionLatency = latency;

  // Update latency history
  latencyHistory.push(latency);
  if (latencyHistory.length > MAX_LATENCY_HISTORY) {
    latencyHistory.shift();
  }

  // Update UI
  updateConnectionQualityUI();
}

// Update connection quality UI
function updateConnectionQualityUI() {
  if (!latencyGraph || !latencyValue) return;

  // Calculate average latency
  const avgLatency = Math.round(
    latencyHistory.reduce((sum, val) => sum + val, 0) / latencyHistory.length
  );

  // Update latency value display
  latencyValue.textContent = `${avgLatency}ms`;

  // Update latency graph
  updateLatencyGraph(avgLatency);

  // Update connection quality indicator
  if (connectionQuality) {
    const quality = getConnectionQuality(avgLatency);
    connectionQuality.textContent = quality.text;
    connectionQuality.className = `connection-quality ${quality.class}`;
  }
}

// Get connection quality based on latency
function getConnectionQuality(latency) {
  if (latency < 100) {
    return { text: 'Excellent', class: 'excellent' };
  } else if (latency < 200) {
    return { text: 'Good', class: 'good' };
  } else if (latency < 300) {
    return { text: 'Fair', class: 'fair' };
  } else {
    return { text: 'Poor', class: 'poor' };
  }
}

// Update latency graph
function updateLatencyGraph(currentLatency) {
  if (!latencyGraph) return;

  const bars = latencyGraph.querySelectorAll('.latency-bar');

  // Create new bar
  const newBar = document.createElement('div');
  newBar.className = 'latency-bar';
  newBar.style.height = `${Math.min(100, currentLatency / 5)}%`;
  newBar.style.backgroundColor = getLatencyColor(currentLatency);

  // Add to graph
  latencyGraph.appendChild(newBar);

  // Remove old bars if too many
  while (bars.length >= MAX_LATENCY_HISTORY) {
    latencyGraph.removeChild(bars[0]);
  }
}

// Get latency color based on value
function getLatencyColor(latency) {
  if (latency < 100) return '#22c55e'; // Green
  if (latency < 200) return '#eab308'; // Yellow
  if (latency < 300) return '#f97316'; // Orange
  return '#ef4444'; // Red
}

// Show no connection screen
function showNoConnectionScreen() {
  if (noConnectionScreen) {
    noConnectionScreen.classList.remove('hidden');
  }

  // Play connection lost sound
  if (connectionLostSound && audioInitialized) {
    connectionLostSound.play().catch(err => {
      debugLog("AUDIO", "Failed to play connection lost sound", { error: err.message });
    });
  }
}

// Handle server messages
function handleServerMessage(data) {
  debugLog("SOCKET", "Received message", { type: data.type });

  switch (data.type) {
    case 'pong':
      handlePong(data.timestamp);
      break;

    case 'move':
      handleMove(data);
      break;

    case 'gameStart':
      handleGameStart(data);
      break;

    case 'gameEnd':
      handleGameEnd(data);
      break;

    case 'chat':
      handleChatMessage(data);
      break;

    case 'error':
      handleServerError(data);
      break;

    default:
      debugLog("SOCKET", "Unknown message type", { type: data.type });
  }
}

// Handle move from server
function handleMove(data) {
  const { from, to, promotion } = data;

  try {
    game.move({ from, to, promotion });
    renderBoard();
    updateMovesList();

    // Update last move highlight
    lastMove = { from, to };
    highlightLastMove();

    // Play sound
    if (audioInitialized) {
      const sound = game.captured() ? captureSound : moveSound;
      if (sound) {
        sound.play().catch(err => {
          debugLog("AUDIO", "Failed to play move sound", { error: err.message });
        });
      }
    }
  } catch (error) {
    debugLog("GAME", "Invalid move from server", { error: error.message, move: data });
  }
}

// Handle game start
function handleGameStart(data) {
  const { roomId, color, opponent } = data;

  window.roomId = roomId;
  playerColor = color;
  isOnlineGame = true;
  isInRoom = true;

  // Update UI
  turnIndicator.textContent = `Playing as ${color === 'w' ? 'White' : 'Black'} against ${opponent}`;

  // Close lobby if open
  if (lobbyModal) {
    lobbyModal.classList.add('hidden');
  }

  debugLog("GAME", "Game started", { roomId, color, opponent });
}

// Handle game end
function handleGameEnd(data) {
  const { result, reason } = data;

  isOnlineGame = false;
  isInRoom = false;

  // Show result
  popup(`Game ${result}: ${reason}`, result === 'win' ? 'green' : 'yellow');

  debugLog("GAME", "Game ended", { result, reason });
}

// Handle chat message
function handleChatMessage(data) {
  const { username, message, timestamp } = data;

  if (!chatMessages) return;

  const messageElement = document.createElement('div');
  messageElement.className = 'chat-message';
  messageElement.innerHTML = `
    <span class="chat-username">${username}</span>
    <span class="chat-text">${escapeHtml(message)}</span>
    <span class="chat-time">${new Date(timestamp).toLocaleTimeString()}</span>
  `;

  chatMessages.appendChild(messageElement);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  // Play notification sound if enabled
  if (audioInitialized && window.soundEnabled) {
    // Use a subtle notification sound
    // (You can add a specific sound for chat messages)
  }
}

// Handle server error
function handleServerError(data) {
  const { message } = data;
  debugLog("SOCKET", "Server error", { message });
  popup(message, 'red');
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  debugLog("INIT", "Initializing game");

  // Initialize board
  renderBoard();

  // Connect to WebSocket
  connectToWebSocket();

  // Setup event listeners
  setupEventListeners();

  // Load settings
  loadSettings();

  // Initialize theme
  initializeTheme();

  debugLog("INIT", "Game initialized");
});

// Setup event listeners
function setupEventListeners() {
  // Board click handler
  if (boardElement) {
    boardElement.addEventListener('click', handleBoardClick);
    boardElement.addEventListener('touchstart', handleTouchStart);
    boardElement.addEventListener('touchend', handleTouchEnd);
  }

  // Button handlers
  if (resetBtn) {
    resetBtn.addEventListener('click', handleReset);
  }

  if (saveGameBtn) {
    saveGameBtn.addEventListener('click', handleSaveGame);
  }

  if (drawBtn) {
    drawBtn.addEventListener('click', handleDraw);
  }

  if (resignBtn) {
    resignBtn.addEventListener('click', handleResign);
  }

  if (toggleChatBtn) {
    toggleChatBtn.addEventListener('click', toggleChat);
  }

  if (sendChatBtn) {
    sendChatBtn.addEventListener('click', sendChatMessage);
  }

  if (chatInput) {
    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        sendChatMessage();
      }
    });
  }

  // Mode buttons
  modeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;
      setGameMode(mode);
    });
  });

  // Theme toggle
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }

  // Retry connection button
  if (retryConnectionBtn) {
    retryConnectionBtn.addEventListener('click', () => {
      reconnectAttempts = 0;
      connectToWebSocket();
    });
  }

  // Back to bot mode button
  if (backToBotBtn) {
    backToBotBtn.addEventListener('click', () => {
      setGameMode('bot');
      if (noConnectionScreen) {
        noConnectionScreen.classList.add('hidden');
      }
    });
  }
}

// Handle board click
function handleBoardClick(event) {
  const square = event.target.dataset.square;
  if (!square) return;

  if (selectedSquare) {
    // Try to make a move
    try {
      const move = game.move({
        from: selectedSquare,
        to: square,
        promotion: 'q' // Always promote to queen for simplicity
      });

      if (move) {
        // Move was successful
        selectedSquare = null;
        legalMovesFromSelected = [];
        renderBoard();
        updateMovesList();

        // Update last move highlight
        lastMove = { from: move.from, to: move.to };
        highlightLastMove();

        // Play sound
        if (audioInitialized) {
          const sound = game.captured() ? captureSound : moveSound;
          if (sound) {
            sound.play().catch(err => {
              debugLog("AUDIO", "Failed to play move sound", { error: err.message });
            });
          }
        }

        // If in online mode, send move to server
        if (isOnlineGame && socket && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            type: 'move',
            from: move.from,
            to: move.to,
            promotion: move.promotion
          }));
        }
      } else {
        // Invalid move, check if clicking on another piece
        const piece = game.get(square);
        if (piece && piece.color === game.turn()) {
          // Select new piece
          selectedSquare = square;
          legalMovesFromSelected = game.moves({ square, verbose: true });
          renderBoard();
          highlightLegalMoves();
        } else {
          // Deselect
          selectedSquare = null;
          legalMovesFromSelected = [];
          renderBoard();
        }
      }
    } catch (error) {
      debugLog("GAME", "Invalid move", { error: error.message });
      selectedSquare = null;
      legalMovesFromSelected = [];
      renderBoard();
    }
  } else {
    // Select piece
    const piece = game.get(square);
    if (piece && piece.color === game.turn()) {
      selectedSquare = square;
      legalMovesFromSelected = game.moves({ square, verbose: true });
      renderBoard();
      highlightLegalMoves();
    }
  }
}

// Handle touch start
function handleTouchStart(event) {
  const square = event.target.dataset.square;
  if (!square) return;

  touchStartSquare = square;
  touchStartTime = Date.now();
}

// Handle touch end
function handleTouchEnd(event) {
  const square = event.target.dataset.square;
  if (!square || !touchStartSquare) return;

  // Check if this is a tap (not a drag)
  const touchDuration = Date.now() - touchStartTime;
  if (touchDuration < 300 && touchStartSquare === square) {
    // Treat as click
    handleBoardClick({ target: event.target });
  }

  touchStartSquare = null;
  touchStartTime = 0;
}

// Render board
function renderBoard() {
  if (!boardElement) return;

  boardElement.innerHTML = '';

  const board = game.board();

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const square = document.createElement('div');
      const squareName = String.fromCharCode(97 + col) + (8 - row);

      square.className = `square ${getSquareColor(row, col)}`;
      square.dataset.square = squareName;

      const piece = board[row][col];
      if (piece) {
        const pieceElement = document.createElement('span');
        pieceElement.className = `piece ${piece.color === 'w' ? 'white' : 'black'}`;
        pieceElement.textContent = pieceToUnicode[piece.type];
        square.appendChild(pieceElement);
      }

      boardElement.appendChild(square);
    }
  }

  // Highlight selected square and legal moves
  if (selectedSquare) {
    highlightSelectedSquare();
    highlightLegalMoves();
  }

  // Highlight last move
  if (lastMove) {
    highlightLastMove();
  }
}

// Get square color
function getSquareColor(row, col) {
  return (row + col) % 2 === 0 ? 'light' : 'dark';
}

// Highlight selected square
function highlightSelectedSquare() {
  const squares = document.querySelectorAll('.square');
  squares.forEach(sq => {
    if (sq.dataset.square === selectedSquare) {
      sq.classList.add('selected');
    }
  });
}

// Highlight legal moves
function highlightLegalMoves() {
  legalMovesFromSelected.forEach(move => {
    const squares = document.querySelectorAll('.square');
    squares.forEach(sq => {
      if (sq.dataset.square === move.to) {
        sq.classList.add('legal-move');
        if (move.captured) {
          sq.classList.add('capture-move');
        }
      }
    });
  });
}

// Highlight last move
function highlightLastMove() {
  if (!lastMove) return;

  const squares = document.querySelectorAll('.square');
  squares.forEach(sq => {
    if (sq.dataset.square === lastMove.from || sq.dataset.square === lastMove.to) {
      sq.classList.add('last-move');
    }
  });
}

// Update moves list
function updateMovesList() {
  if (!movesList) return;

  movesList.innerHTML = '';

  const history = game.history();

  history.forEach((move, index) => {
    const moveElement = document.createElement('li');
    moveElement.className = 'move-item';

    const moveNumber = Math.floor(index / 2) + 1;
    const isWhiteMove = index % 2 === 0;

    if (isWhiteMove) {
      moveElement.innerHTML = `<span class="move-number">${moveNumber}.</span> ${move.san}`;
    } else {
      moveElement.innerHTML = `<span class="move-number"></span> ${move.san}`;
    }

    movesList.appendChild(moveElement);
  });

  // Scroll to bottom
  movesList.scrollTop = movesList.scrollHeight;
}

// Handle reset
function handleReset() {
  if (confirm('Are you sure you want to reset the game?')) {
    game.reset();
    selectedSquare = null;
    legalMovesFromSelected = [];
    lastMove = null;
    renderBoard();
    updateMovesList();
  }
}

// Handle save game
function handleSaveGame() {
  const pgn = game.pgn();
  const savedGames = JSON.parse(localStorage.getItem('savedGames') || '[]');

  savedGames.push({
    id: Date.now(),
    pgn,
    date: new Date().toISOString()
  });

  localStorage.setItem('savedGames', JSON.stringify(savedGames));
  popup('Game saved!', 'green');
}

// Handle draw
function handleDraw() {
  if (isOnlineGame && socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: 'drawOffer' }));
    popup('Draw offer sent', 'green');
  } else {
    popup('Draw offers are only available in online games', 'yellow');
  }
}

// Handle resign
function handleResign() {
  if (isOnlineGame && socket && socket.readyState === WebSocket.OPEN) {
    if (confirm('Are you sure you want to resign?')) {
      socket.send(JSON.stringify({ type: 'resign' }));
      popup('You resigned', 'yellow');
    }
  } else {
    popup('Resignation is only available in online games', 'yellow');
  }
}

// Toggle chat
function toggleChat() {
  if (!chatContainer) return;

  chatContainer.classList.toggle('hidden');
  toggleChatBtn.textContent = chatContainer.classList.contains('hidden') 
    ? 'Show Chat' 
    : 'Hide Chat';
}

// Send chat message
function sendChatMessage() {
  if (!chatInput || !socket || socket.readyState !== WebSocket.OPEN) return;

  const message = chatInput.value.trim();
  if (!message) return;

  socket.send(JSON.stringify({
    type: 'chat',
    message
  }));

  chatInput.value = '';
}

// Set game mode
function setGameMode(mode) {
  window.gameMode = mode;
  isOnlineGame = mode === 'online';

  debugLog("GAME", `Game mode set to ${mode}`);

  // Update UI
  modeButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });

  // If switching to online mode, ensure we're connected
  if (mode === 'online' && (!socket || socket.readyState !== WebSocket.OPEN)) {
    connectToWebSocket();
  }
}

// Toggle theme
function toggleTheme() {
  document.body.classList.toggle('light-theme');
  const isLight = document.body.classList.contains('light-theme');
  localStorage.setItem('theme', isLight ? 'light' : 'dark');

  if (themeToggle) {
    themeToggle.querySelector('.pill-label').textContent = isLight ? 'Light mode' : 'Dark mode';
  }
}

// Initialize theme
function initializeTheme() {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'light') {
    document.body.classList.add('light-theme');
    if (themeToggle) {
      themeToggle.querySelector('.pill-label').textContent = 'Light mode';
    }
  }
}

// Load settings
function loadSettings() {
  window.showCoordinates = localStorage.getItem('showCoordinates') === 'true';
  window.soundEnabled = localStorage.getItem('soundEnabled') !== 'false';
  window.notificationsEnabled = localStorage.getItem('notificationsEnabled') !== 'false';
  window.autoSave = localStorage.getItem('autoSave') !== 'false';
}

// Show popup notification
function popup(message, color = 'blue') {
  const popupContainer = document.getElementById('popup-container');
  if (!popupContainer) return;

  const popupElement = document.createElement('div');
  popupElement.className = `popup popup-${color}`;
  popupElement.textContent = message;

  popupContainer.appendChild(popupElement);

  // Remove after 3 seconds
  setTimeout(() => {
    popupElement.remove();
  }, 3000);
}
