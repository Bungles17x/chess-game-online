// script.js

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
const createRoomBtn = document.getElementById("create-room-btn");
const closeLobbyBtn = document.getElementById("close-lobby-btn");
const botModeBtn = document.getElementById("bot-mode");
const onlineModeBtn = document.getElementById("online-mode");
const moveSound = document.getElementById("move-sound");
const captureSound = document.getElementById("capture-sound");
const drawBtn = document.getElementById("draw-btn");
const resignBtn = document.getElementById("resign-btn");

const loadingScreen = document.getElementById("loading-screen");
const noConnectionScreen = document.getElementById("no-connection-screen");
const retryConnectionBtn = document.getElementById("retry-connection-btn");
const backToBotBtn = document.getElementById("back-to-bot-btn");

// -----------------------------------------------------
// GAME STATE
// -----------------------------------------------------
const game = new Chess();

let selectedSquare = null;
let legalMovesFromSelected = [];
let touchStartSquare = null; // Track where touch started
let touchStartTime = 0; // Track when touch started
let lastMove = null; // Track the last move for highlighting
let playerColor = "w";
let roomId = null;
let gameMode = "bot"; // "bot" or "online"

const pieceToUnicode = {
  p: "♟", r: "♜", n: "♞", b: "♝", q: "♛", k: "♚",
  P: "♙", R: "♖", N: "♘", B: "♗", Q: "♕", K: "♔"
};

let socket = null;
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
  DEVELOPMENT_URL: 'ws://localhost:8080',
  // Set to true when deploying to production
  isProduction: false
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

  // Removed the check for MAX_RECONNECT_ATTEMPTS to allow continuous reconnection
  if (false) { // Always false to allow continuous reconnection
    debugLog("SOCKET", "Max reconnect attempts reached", {
      url: 'wss://chess-game-online-u34h.onrender.com/',
      reconnectAttempts
    });
    
    if (gameMode === "online") {
        hideLoadingScreen();
        showNoConnectionScreen();
    }
    return;
  }

  debugLog("SOCKET", "Attempting to connect", {
    url: 'wss://chess-game-online-u34h.onrender.com/',
    attempt: reconnectAttempts + 1
  });

  // Show loading screen when connecting
  if (gameMode === "online" || reconnectAttempts === 0) {
    showLoadingScreen();
  }

  try {
    socket = new WebSocket('wss://chess-game-online-u34h.onrender.com');

    socket.onopen = function(e) {
      debugLog("SOCKET", "Connection established", {
        url: e.target.url,
        readyState: e.target.readyState
      });
      reconnectAttempts = 0; // Reset counter on success
      isDisconnected = false; // Reset flag when connection is established
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
  
  if (data.type === "error") {
    debugLog("SERVER", "Error received from server", {
      code: data.code,
      message: data.message
    });
    popup(`error ${data.code}: ${data.message}`, "red");
    return;
  }



  if (data.type === "rooms") {
    debugLog("LOBBY", "Room list received", {
      roomCount: data.rooms.length,
      rooms: data.rooms
    });
    
    // Clear the list completely before adding new items
    roomList.innerHTML = ""; 
    
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
    chatContainer.classList.remove("hidden");
    toggleChatBtn.textContent = "Hide";
    // Clear previous chat messages
    chatMessages.innerHTML = "";
  }

  if (data.type === "start") {
  debugLog("GAME", "Game started", {
    playerColor,
    roomId
  });
  
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
  }

  if (data.type === "move") {
    debugLog("GAME", "Move received from opponent", {
      move: data.move
    });
    game.move(data.move);
    lastMove = data.move;
    logMove(data.move);
    renderPosition();
    updateTurnIndicator();
  }

  if (data.type === "roomClosed") {
    debugLog("GAME", "Room closed by opponent");
    popup("Opponent left the game.", "yellow");
    roomId = null;
    switchToBotMode();
    initBoard();
  }

  if (data.type === "gameOver") {
    debugLog("GAME", "Game over");
    handleGameOver();
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
  }
  
  // Hide the chat container when leaving a room
  chatContainer.classList.add("hidden");
}

function joinRoom(room) {
  debugLog("LOBBY", "Joining room", {
    room,
    currentRoomId: roomId
  });
  
  roomId = room;
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
    socket.addEventListener("open", () => {
      debugLog("LOBBY", "Socket opened, requesting room list");
      socket.send(JSON.stringify({ type: "listRooms" }));
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
  if (chatContainer.classList.contains("hidden")) {
    debugLog("CHAT", "Chat container is hidden, showing it");
    chatContainer.classList.remove("hidden");
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
    sender: playerColor === 'w' ? 'White' : 'Black'
  };
  
  debugLog("CHAT", "Sending chat payload to server", payload);
  socket.send(JSON.stringify(payload));
  
  // Display message in our own chat
  displayChatMessage(message, "You", true);
  
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
  
  playMoveSound(result);
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
  
  boardElement.innerHTML = "";
  selectedSquare = null;
  legalMovesFromSelected = [];
  lastMove = null;
  movesList.innerHTML = "";
  game.reset();
  updateTurnIndicator();
  buildSquares();
  renderPosition();
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
  document.querySelectorAll(".square").forEach(sq => (sq.innerHTML = ""));

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
    .querySelectorAll(".square.selected, .square.highlight, .square.capture, .square.last-move, .square.in-check, .square.checkmate")
    .forEach(sq => sq.classList.remove("selected", "highlight", "capture", "last-move", "in-check", "checkmate"));
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

  debugLog("BOARD", "Move executed", {
    move: result,
    gameMode,
    playerColor
  });

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

  playMoveSound(result);
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
    if (fromSq) fromSq.classList.add("last-move");
    if (toSq) toSq.classList.add("last-move");
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
  sound.currentTime = 0;
  sound.play().catch(() => {});
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
}

function updateTurnIndicator() {
  if (game.game_over()) {
    if (game.in_checkmate()) {
      const losingPlayerColor = game.turn();
      const winner = losingPlayerColor === "w" ? "Black" : "White";
      turnIndicator.textContent = `Checkmate — ${winner} wins`;
      debugLog("GAME", "Checkmate", { winner });
    } else if (game.in_draw()) {
      turnIndicator.textContent = "Draw";
      debugLog("GAME", "Game ended in draw");
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
  
  if (gameMode === "online" && game.history().length > 0) {
    popup("Cannot change mode during an online game.", "red");
    return;
  }
  
  ensureSocket();
  
  // Check if there are any players online
  const checkPlayers = () => {
    debugLog("MODE", "Checking for online players");
    
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "checkPlayers" }));
    } else if (socket && socket.readyState === WebSocket.CONNECTING) {
      socket.addEventListener("open", () => {
        debugLog("MODE", "Socket opened, checking for online players");
        socket.send(JSON.stringify({ type: "checkPlayers" }));
      }, { once: true });
    } else {
      debugLog("MODE", "Failed to connect to server");
      popup("Failed to connect to server.", "red");
      return;
    }
  };
  
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
      lobbyModal.classList.remove("hidden");
      // Start updating the room list when opening the lobby
      startRoomUpdates();
      sendListRooms();
    }
  };
  
  if(socket) socket.addEventListener("message", handlePlayerCheck);
  checkPlayers();
});

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
});

// -----------------------------------------------------
// INIT
// -----------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  debugLog("INIT", "DOM loaded, initializing application");

  // Show no connection screen if user was disconnected
  if (isDisconnected) {
    debugLog("INIT", "User was disconnected, showing no connection screen");
    showNoConnectionScreen();
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
  window.addEventListener("online", () => {
    debugLog("NETWORK", "User came back online");
    // Check if we can actually connect to the server before hiding the screen
    if (gameMode === "online") {
      reconnectAttempts = 0;
      ensureSocket();
    }
    // Don't hide the screen yet - wait for successful connection
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
// NO CONNECTION SCREEN FUNCTIONS
// -----------------------------------------------------
function showNoConnectionScreen() {
  debugLog("UI", "Showing no connection screen");
  noConnectionScreen.classList.remove("hidden");
}

function hideNoConnectionScreen() {
  debugLog("UI", "Hiding no connection screen");
  noConnectionScreen.classList.add("hidden");
}
;