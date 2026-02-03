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

// -----------------------------------------------------
// GAME STATE
// -----------------------------------------------------
const game = new Chess();

let selectedSquare = null;
let legalMovesFromSelected = [];
let touchStartSquare = null; // Track where touch started
let touchStartTime = 0; // Track when touch started
let playerColor = "w";
let roomId = null;
let gameMode = "bot"; // "bot" or "online"

const pieceToUnicode = {
  p: "♟", r: "♜", n: "♞", b: "♝", q: "♛", k: "♚",
  P: "♙", R: "♖", N: "♘", B: "♗", Q: "♕", K: "♔"
};

let socket = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_INTERVAL = 2000;
let roomUpdateInterval = null;

// -----------------------------------------------------
// SOCKET / NETWORKING
// -----------------------------------------------------
function ensureSocket() {
  // Prevent creating multiple sockets
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return;
  }

  // Stop retrying if we hit the max limit
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.error(`[Max Reconnects Reached] Stopped trying to connect to wss://chess-game-online-u34h.onrender.com/`);
    if (gameMode === "online") {
        popup("Connection failed. Server is unreachable. Switching to Bot mode.", "red");
        switchToBotMode();
    }
    return;
  }

  console.log(`[Connecting] Attempting to connect to wss://chess-game-online-u34h.onrender.com/ (Attempt ${reconnectAttempts + 1})`);

  try {
    socket = new WebSocket('wss://chess-game-online-u34h.onrender.com');

    socket.onopen = function(e) {
      console.log("[Connected] Connection established!");
      reconnectAttempts = 0; // Reset counter on success
    };

    socket.onmessage = function(event) {
      console.log(`[Message] Server: ${event.data}`);
      const data = JSON.parse(event.data);
      handleServerMessage(data);
    };

    socket.onclose = function(event) {
      console.log(`[Closed] Connection closed. Code: ${event.code}`);
      
      // Only auto-reconnect if we are in online mode
      if (gameMode === "online") {
        reconnectAttempts++;
        setTimeout(ensureSocket, RECONNECT_INTERVAL);
      }
    };

    socket.onerror = function(error) {
      console.error(`[Error] WebSocket error:`, error);
    };

  } catch (err) {
    console.error("[Error] Failed to create WebSocket:", err);
    reconnectAttempts++;
    setTimeout(ensureSocket, RECONNECT_INTERVAL);
  }
}

function handleServerMessage(data) {
    if (data.type === "error") {
      popup(`error ${data.code}: ${data.message}`, "red");
      return;
    }

    if (data.type === "rooms") {
      // Clear the list completely before adding new items
      roomList.innerHTML = ""; 
      
      if (data.rooms.length === 0) {
        const li = document.createElement("li");
        li.textContent = "No active rooms. Create one!";
        
        // Add classes to ensure the text is visible
        li.className = "room-item"; 
        li.style.color = "var(--text-color, #ff0000)"; // Fallback color
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
      playerColor = data.color;
      popup(`Joined room as ${playerColor === 'w' ? 'White' : 'Black'}`, "green");
    }

    if (data.type === "start") {
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
          console.log(`Removed ${pawnToRemove} to allow Black to move first.`);
        }
      }

      initBoard();
      popup("Game Started!", "green");
    }

    if (data.type === "reset") {
      initBoard();
      popup("Game reset by opponent.", "yellow");
    }

    if (data.type === "drawOffer") {
      const accept = confirm("Opponent offers a draw. Accept?");
      if (accept) {
        socket.send(JSON.stringify({ type: "drawAccept" }));
      } else {
        socket.send(JSON.stringify({ type: "drawDecline" }));
      }
    }

    if (data.type === "drawAccept") {
      updateTurnIndicator();
      popup("Game ended in a draw.", "yellow");
    }

    if (data.type === "drawDecline") {
      popup("Draw offer declined.", "red");
    }

    if (data.type === "resign") {
      const winner = data.winner === "w" ? "White" : "Black";
      turnIndicator.textContent = `${winner} wins by resignation`;
      popup(`${winner} wins by resignation.`, "yellow");
    }

    if (data.type === "move") {
      game.move(data.move);
      logMove(data.move);
      renderPosition();
      updateTurnIndicator();
    }

    if (data.type === "roomClosed") {
      popup("Opponent left the game.", "yellow");
      roomId = null;
      switchToBotMode();
      initBoard();
    }

    if (data.type === "gameOver") {
      handleGameOver();
    }
}

function handleGameOver() {
  // Close the lobby modal if it's open
  lobbyModal.classList.add("hidden");
  
  // Reset game state
  roomId = null;
  
  // Switch back to Bot mode automatically
  switchToBotMode();
  
  // Reset the board visuals
  initBoard();
  
  popup("Game Over. Switching to Bot mode.", "yellow");
}

function switchToBotMode() {
    gameMode = "bot";
    botModeBtn.classList.add("active");
    onlineModeBtn.classList.remove("active");
    roomId = null;
}

function leaveRoom() {
  if (roomId && socket) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "leave", roomId }));
    }
    roomId = null;
  }
}

function joinRoom(room) {
  roomId = room;
  lobbyModal.classList.add("hidden");
  
  // Stop updating the room list when joining a room
  stopRoomUpdates();
  
  ensureSocket();
  
  const sendJoin = () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "join", roomId }));
    } else if (socket && socket.readyState === WebSocket.CONNECTING) {
      socket.addEventListener("open", () => {
        socket.send(JSON.stringify({ type: "join", roomId }));
      }, { once: true });
    } else {
      popup("Failed to connect to server.", "red");
      lobbyModal.classList.remove("hidden");
      // Restart room updates if joining failed
      startRoomUpdates();
    }
  };
  
  sendJoin();
}

function sendListRooms() {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: "listRooms" }));
  } else if (socket && socket.readyState === WebSocket.CONNECTING) {
    socket.addEventListener("open", () => {
      socket.send(JSON.stringify({ type: "listRooms" }));
    }, { once: true });
  } else {
    popup("Failed to connect to server.", "red");
    lobbyModal.classList.add("hidden");
  }
}

function startRoomUpdates() {
  // Clear any existing interval
  if (roomUpdateInterval) {
    clearInterval(roomUpdateInterval);
  }
  
  // Request room list immediately
  sendListRooms();
  
  // Set up interval to update room list every 5 seconds
  roomUpdateInterval = setInterval(() => {
    sendListRooms();
  }, 1000);
}

function stopRoomUpdates() {
  if (roomUpdateInterval) {
    clearInterval(roomUpdateInterval);
    roomUpdateInterval = null;
  }
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
  boardElement.innerHTML = "";
  selectedSquare = null;
  legalMovesFromSelected = [];
  movesList.innerHTML = "";
  game.reset();
  updateTurnIndicator();
  buildSquares();
  renderPosition();
}

function buildSquares() {
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
}

// -----------------------------------------------------
// MOVE HANDLING
// -----------------------------------------------------
function clearHighlights() {
  document
    .querySelectorAll(".square.selected, .square.highlight, .square.capture")
    .forEach(sq => sq.classList.remove("selected", "highlight", "capture"));
}

function handleSquareClick(square) {
  const piece = game.get(square);

  // Selecting a piece
  if (!selectedSquare) {
    if (!piece) return;

    if (gameMode === "online") {
      if (piece.color !== playerColor) {
        popup("You can only select your own pieces.", "red");
        return;
      }
      if (game.turn() !== playerColor) {
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

  // Clicking same square cancels selection
  if (selectedSquare === square) {
    selectedSquare = null;
    legalMovesFromSelected = [];
    clearHighlights();
    return;
  }

  // Attempt move
  const move = legalMovesFromSelected.find(m => m.to === square);

  if (!move) {
    const newPiece = game.get(square);

    if (gameMode === "online" && newPiece && newPiece.color !== playerColor) {
      popup("You can only select your own pieces.", "red");
      return;
    }

    if (newPiece && newPiece.color === game.turn()) {
      selectedSquare = square;
      legalMovesFromSelected = game.moves({ square, verbose: true });
      clearHighlights();
      highlightSelectionAndMoves();
    }
    return;
  }

  // Online: only allow moving your own color
  if (gameMode === "online" && piece && piece.color !== playerColor) {
    popup("You can only move your own pieces.", "red");
    return;
  }

  // Execute move
  const result = game.move({
    from: move.from,
    to: move.to,
    promotion: "q"
  });

  if (!result) return;

  // Send move to opponent
  if (gameMode === "online" && socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: "move", move: result }));
    
    // Check if this move caused Checkmate
    if (game.in_checkmate()) {
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
      }
    }
  });
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
    } else if (game.in_draw()) {
      turnIndicator.textContent = "Draw";
    } else {
      turnIndicator.textContent = "Game over";
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
  if (gameMode === "online" && game.history().length > 0) {
    popup("Cannot change mode during an online game.", "red");
    return;
  }
  switchToBotMode();
  initBoard();
});

onlineModeBtn.addEventListener("click", () => {
  if (gameMode === "online" && game.history().length > 0) {
    popup("Cannot change mode during an online game.", "red");
    return;
  }
  
  ensureSocket();
  
  // Check if there are any players online
  const checkPlayers = () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "checkPlayers" }));
    } else if (socket && socket.readyState === WebSocket.CONNECTING) {
      socket.addEventListener("open", () => {
        socket.send(JSON.stringify({ type: "checkPlayers" }));
      }, { once: true });
    } else {
      popup("Failed to connect to server.", "red");
      return;
    }
  };
  
  const handlePlayerCheck = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === "playersOnline") {
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
  const newRoom = "room-" + Math.floor(Math.random() * 9999);
  popup(`Lobby created (${newRoom}). Waiting for opponent…`, "green");
  joinRoom(newRoom);
});

lobbyBtn.addEventListener("click", () => {
  lobbyModal.classList.remove("hidden");
  ensureSocket();
  
  // Start updating the room list
  startRoomUpdates();
});

closeLobbyBtn.addEventListener("click", () => {
  lobbyModal.classList.add("hidden");
  
  // Stop updating the room list when closing the lobby
  stopRoomUpdates();
});

drawBtn.addEventListener("click", () => {
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
  themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("light-theme");
  });

  resetBtn.addEventListener("click", () => {
    if (gameMode === "online") {
      popup("You have to be playing with a bot in order to do that.", "red");
      return;
    }
    initBoard();
  });

  window.addEventListener("beforeunload", () => {
    leaveRoom();
  });

  initBoard();
});
