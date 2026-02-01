// DOM ELEMENTS
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

// GAME STATE
const game = new Chess();

let selectedSquare = null;
let legalMovesFromSelected = [];

let playerColor = "w";
let roomId = null;
let gameMode = "bot"; // "bot" or "online"

const pieceToUnicode = {
  p: "♟",
  r: "♜",
  n: "♞",
  b: "♝",
  q: "♛",
  k: "♚",
  P: "♙",
  R: "♖",
  N: "♘",
  B: "♗",
  Q: "♕",
  K: "♔"
};

let socket = null;

/* ---------------------------------------------------
   AI (MINIMAX BOT)
--------------------------------------------------- */
function evaluateBoard(game) {
  const values = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 1000 }; // Fixed: King has high value
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
  let bestValue = Infinity; // Since AI is black, minimizing

  for (const move of moves) {
    game.move(move);
    const value = minimax(game, 2, false); // Fixed: AI is minimizing
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

  // AI MOVE (only in bot mode)
  if (gameMode === "bot" && game.turn() === "b" && !game.game_over()) {
    setTimeout(aiMove, 200);
  }
}

/* ---------------------------------------------------
   SOCKET / LOBBY
--------------------------------------------------- */
function ensureSocket() {
  if (socket && socket.readyState === WebSocket.OPEN) return;

  socket = new WebSocket("ws://localhost:8080");

  socket.addEventListener("open", () => {
    console.log("WebSocket connection established");
  });

  socket.addEventListener("error", (error) => {
    console.error("WebSocket error:", error);
    popup("error 209: Unable to connect to server. this feature is unavailable right now. this deleted the lobby you were in.", "red");
  });

  socket.addEventListener("close", (event) => {
    console.log("WebSocket connection closed:", event);
    if (gameMode === "online") {
      popup("Disconnected from server. Switching to bot mode.", "yellow");
      gameMode = "bot";
      botModeBtn.classList.add("active");
      onlineModeBtn.classList.remove("active");
      roomId = null;
    }
  });

  socket.addEventListener("message", event => {
    const data = JSON.parse(event.data);

    if (data.type === "error") {
      popup(`error ${data.code}: ${data.message}`, "red");
      return;
    }

    if (data.type === "rooms") {
      roomList.innerHTML = "";
      if (data.rooms.length === 0) {
        popup("No players online at the moment, try again later", "yellow");
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
    }

    if (data.type === "start") {
      initBoard();
    }

    if (data.type === "reset") {
      initBoard();
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
      game.game_over = () => true; // Force game over
      updateTurnIndicator();
      popup("Game ended in a draw.", "yellow");
    }

    if (data.type === "drawDecline") {
      popup("Draw offer declined.", "red");
    }

    if (data.type === "resign") {
      game.game_over = () => true; // Force game over
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
      popup("The room has been closed as the other player left.", "yellow");
      roomId = null;
      gameMode = "bot";
      botModeBtn.classList.add("active");
      onlineModeBtn.classList.remove("active");
      initBoard();
    }
  });
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
  ensureSocket();
  
  // Wait for socket to open before sending
  const sendJoin = () => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "join", roomId }));
    } else if (socket.readyState === WebSocket.CONNECTING) {
      socket.addEventListener("open", () => {
        socket.send(JSON.stringify({ type: "join", roomId }));
      }, { once: true });
    } else {
      popup("Failed to connect to server. Please try again later.", "red");
      lobbyModal.classList.remove("hidden");
    }
  };
  
  // Add a timeout to check if no response
  const joinTimeout = setTimeout(() => {
    popup("No players online at the moment, try again later", "red");
    lobbyModal.classList.remove("hidden");
  }, 5000);
  
  // Clear timeout if we get a response
  const originalOnMessage = socket.onmessage;
  socket.onmessage = (event) => {
    clearTimeout(joinTimeout);
    if (originalOnMessage) {
      originalOnMessage(event);
    }
  };
  
  sendJoin();
}

/* ---------------------------------------------------
   BOARD RENDERING
--------------------------------------------------- */
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
      sq.addEventListener("click", () => handleSquareClick(squareName));

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

/* ---------------------------------------------------
   MOVE HANDLING
--------------------------------------------------- */
function clearHighlights() {
  document
    .querySelectorAll(".square.selected, .square.highlight")
    .forEach(sq => sq.classList.remove("selected", "highlight"));
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
    if (targetSq) targetSq.classList.add("highlight");
  });
}

/* ---------------------------------------------------
   UI + SOUND + MOVES
--------------------------------------------------- */
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

/* ---------------------------------------------------
   MODE + LOBBY UI
--------------------------------------------------- */
botModeBtn.addEventListener("click", () => {
  if (gameMode === "online" && game.history().length > 0) {
    popup("Cannot change mode during an online game.", "red");
    return;
  }
  gameMode = "bot";
  botModeBtn.classList.add("active");
  onlineModeBtn.classList.remove("active");
});

onlineModeBtn.addEventListener("click", () => {
  if (gameMode === "online" && game.history().length > 0) {
    popup("Cannot change mode during an online game.", "red");
    return;
  }
  
  ensureSocket();
  
  // Check if there are any players online
  const checkPlayers = () => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "checkPlayers" }));
    } else if (socket.readyState === WebSocket.CONNECTING) {
      socket.addEventListener("open", () => {
        socket.send(JSON.stringify({ type: "checkPlayers" }));
      }, { once: true });
    } else {
      popup("Failed to connect to server. Please try again later.", "red");
      return;
    }
  };
  
  // Add a one-time listener for the response
  const handlePlayerCheck = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === "playersOnline") {
      socket.removeEventListener("message", handlePlayerCheck);
      if (data.count === 0) {
        popup("No players online at the moment, try again later", "red");
        return;
      }
      
      gameMode = "online";
      onlineModeBtn.classList.add("active");
      botModeBtn.classList.remove("active");
      lobbyModal.classList.remove("hidden");
      sendListRooms();
    }
  };
  
  socket.addEventListener("message", handlePlayerCheck);
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

    // If online, broadcast reset
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
  
  // Wait for socket to open before sending
  const sendListRooms = () => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "listRooms" }));
    } else if (socket.readyState === WebSocket.CONNECTING) {
      socket.addEventListener("open", () => {
        socket.send(JSON.stringify({ type: "listRooms" }));
      }, { once: true });
    } else {
      popup("Failed to connect to server. Please try again later.", "red");
      lobbyModal.classList.add("hidden");
    }
  };
  
  // Add a timeout to check if no response
  const listTimeout = setTimeout(() => {
    popup("No players online at the moment, try again later", "red");
    lobbyModal.classList.add("hidden");
  }, 5000);
  
  // Clear timeout if we get a response
  const originalOnMessage = socket.onmessage;
  socket.onmessage = (event) => {
    clearTimeout(listTimeout);
    if (originalOnMessage) {
      originalOnMessage(event);
    }
  };
  
  sendListRooms();
});

closeLobbyBtn.addEventListener("click", () => {
  lobbyModal.classList.add("hidden");
});

// Add listeners for draw and resign
drawBtn.addEventListener("click", () => {
  if (gameMode !== "online") {
    popup("Draw offers are only available in online mode.", "red");
    return;
  }
  
  if (socket.readyState !== WebSocket.OPEN) {
    popup("Not connected to server. Please try again later.", "red");
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
  
  if (socket.readyState !== WebSocket.OPEN) {
    popup("Not connected to server. Please try again later.", "red");
    return;
  }
  
  socket.send(JSON.stringify({ type: "resign" }));
  popup("You resigned.", "red");
});

/* ---------------------------------------------------
   INIT
--------------------------------------------------- */
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

  // Handle page unload
  window.addEventListener("beforeunload", () => {
    leaveRoom();
  });

  initBoard();
});
