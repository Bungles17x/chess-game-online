import { WebSocketServer } from "ws";

const wss = new WebSocketServer({ port: 8080 });

const rooms = new Map();

wss.on("connection", ws => {
  console.log("New client connected");
  
  ws.on("message", msg => {
    try {
      const data = JSON.parse(msg);
      handleMessage(ws, data);
    } catch (error) {
      console.error("Error parsing message:", error);
      ws.send(JSON.stringify({ type: "error", code: 400, message: "Invalid message format" }));
    }
  });

  ws.on("close", () => {
    handleDisconnect(ws);
  });

  ws.on("error", error => {
    console.error("WebSocket error:", error);
  });
});

function handleMessage(ws, data) {
  switch (data.type) {
    case "listRooms":
      listRooms(ws);
      break;
      
    case "checkPlayers":
      checkPlayers(ws);
      break;
      
    case "join":
      joinRoom(ws, data.roomId);
      break;
      
    case "leave":
      leaveRoom(ws);
      break;
      
    case "move":
      handleMove(ws, data.move);
      break;
      
    case "drawOffer":
      handleDrawOffer(ws);
      break;
      
    case "drawAccept":
      handleDrawAccept(ws);
      break;
      
    case "drawDecline":
      handleDrawDecline(ws);
      break;
      
    case "resign":
      handleResign(ws);
      break;
      
    default:
      ws.send(JSON.stringify({ type: "error", code: 400, message: "Unknown message type" }));
  }
}

function listRooms(ws) {
  const list = [...rooms.keys()];
  ws.send(JSON.stringify({ type: "rooms", rooms: list }));
}

function checkPlayers(ws) {
  const count = wss.clients.size;
  ws.send(JSON.stringify({ type: "playersOnline", count }));
}

function joinRoom(ws, roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, []);
  }

  const players = rooms.get(roomId);
  
  if (players.length >= 2) {
    ws.send(JSON.stringify({ type: "error", code: 400, message: "Room is full" }));
    return;
  }

  ws.color = players.length === 0 ? "w" : "b";
  ws.roomId = roomId;

  players.push(ws);

  ws.send(JSON.stringify({ type: "joined", color: ws.color }));

  if (players.length === 2) {
    players.forEach(p =>
      p.send(JSON.stringify({ type: "start", roomId }))
    );
  }
}

function leaveRoom(ws) {
  if (!ws.roomId) return;

  const players = rooms.get(ws.roomId) || [];
  const updated = players.filter(p => p !== ws);

  if (updated.length === 0) {
    rooms.delete(ws.roomId);
  } else {
    rooms.set(ws.roomId, updated);
    
    // Notify the remaining player that the other player left
    updated.forEach(p =>
      p.send(JSON.stringify({ type: "roomClosed" }))
    );
  }
  
  ws.roomId = null;
}

function handleMove(ws, move) {
  if (!ws.roomId) return;

  const players = rooms.get(ws.roomId) || [];
  players
    .filter(p => p !== ws)
    .forEach(p =>
      p.send(JSON.stringify({ type: "move", move }))
    );
}

function handleDrawOffer(ws) {
  if (!ws.roomId) return;

  const players = rooms.get(ws.roomId) || [];
  players
    .filter(p => p !== ws)
    .forEach(p =>
      p.send(JSON.stringify({ type: "drawOffer" }))
    );
}

function handleDrawAccept(ws) {
  if (!ws.roomId) return;

  const players = rooms.get(ws.roomId) || [];
  players.forEach(p =>
    p.send(JSON.stringify({ type: "drawAccept" }))
  );
}

function handleDrawDecline(ws) {
  if (!ws.roomId) return;

  const players = rooms.get(ws.roomId) || [];
  players
    .filter(p => p !== ws)
    .forEach(p =>
      p.send(JSON.stringify({ type: "drawDecline" }))
    );
}

function handleResign(ws) {
  if (!ws.roomId) return;

  const players = rooms.get(ws.roomId) || [];
  const winner = ws.color === "w" ? "b" : "w";
  
  players.forEach(p =>
    p.send(JSON.stringify({ type: "resign", winner }))
  );
}

function handleDisconnect(ws) {
  if (!ws.roomId) return;

  const players = rooms.get(ws.roomId) || [];
  const updated = players.filter(p => p !== ws);

  if (updated.length === 0) {
    rooms.delete(ws.roomId);
  } else {
    rooms.set(ws.roomId, updated);
    
    // Notify the remaining player that the other player left
    updated.forEach(p =>
      p.send(JSON.stringify({ type: "roomClosed" }))
    );
  }
}

console.log("WebSocket server running on port 8080");
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

    // Rest of the message handling...
  });
}
