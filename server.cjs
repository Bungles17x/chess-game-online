// server.js
const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });
const rooms = new Map();

console.log('WebSocket Server is running on ws://localhost:8080');

wss.on('connection', (ws) => {
  console.log('A new client connected!');

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      handleMessage(ws, data);
    } catch (error) {
      console.error("Error parsing message:", error);
      if (typeof message === 'string') {
         console.log('received (text):', message);
         ws.send(`Server echo: ${message}`);
      } else {
         ws.send(JSON.stringify({ type: "error", code: 400, message: "Invalid message format" }));
      }
    }
  });

  ws.on('close', () => {
    handleDisconnect(ws);
  });

  ws.on('error', (error) => {
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

    case "checkmate":
      handleCheckmate(ws);
      break;

    case "resetAll":
      resetAllLobbies(ws);
      break;

    case "killPiece":
      handleKillPiece(ws, data);
      break;
      
    default:
      ws.send(JSON.stringify({ type: "error", code: 400, message: "Unknown message type" }));
  }
}

function listRooms(ws) {
  // Get all room IDs
  const list = [...rooms.keys()];
  ws.send(JSON.stringify({ type: "rooms", rooms: list }));
}

function checkPlayers(ws) {
  // Count total connected clients
  const count = wss.clients.size;
  ws.send(JSON.stringify({ type: "playersOnline", count }));
}

function joinRoom(ws, roomId) {
  // Create room if it doesn't exist
  if (!rooms.has(roomId)) {
    rooms.set(roomId, []);
  }

  const players = rooms.get(roomId);
  
  // Check if room is full
  if (players.length >= 2) {
    ws.send(JSON.stringify({ type: "error", code: 400, message: "Room is full" }));
    return;
  }

  // Assign color based on join order
  ws.color = players.length === 0 ? "w" : "b";
  ws.roomId = roomId;

  players.push(ws);

  ws.send(JSON.stringify({ type: "joined", color: ws.color }));

  // If 2 players, start the game
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
    // Delete room if empty
    rooms.delete(ws.roomId);
  } else {
    // Update room players
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
  
  // Send move to the other player in the room
  players
    .filter(p => p !== ws)
    .forEach(p =>
      p.send(JSON.stringify({ type: "move", move }))
    );
}

function handleDrawOffer(ws) {
  if (!ws.roomId) return;

  const players = rooms.get(ws.roomId) || [];
  
  // Relay draw offer to opponent
  players
    .filter(p => p !== ws)
    .forEach(p =>
      p.send(JSON.stringify({ type: "drawOffer" }))
    );
}

function handleDrawAccept(ws) {
  if (!ws.roomId) return;

  const players = rooms.get(ws.roomId) || [];
  
  // Notify both players that draw is accepted
  players.forEach(p => {
    p.send(JSON.stringify({ type: "drawAccept" }));
    p.send(JSON.stringify({ type: "gameOver" }));
  });

  // Clean up room
  rooms.delete(ws.roomId);
}

function handleDrawDecline(ws) {
  if (!ws.roomId) return;

  const players = rooms.get(ws.roomId) || [];
  
  // Notify opponent that draw is declined
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
  
  // Notify both players of resignation and winner
  players.forEach(p => {
    p.send(JSON.stringify({ type: "resign", winner }));
    p.send(JSON.stringify({ type: "gameOver" }));
  });

  // Immediately delete the room to stop the match
  rooms.delete(ws.roomId);
}

function handleCheckmate(ws) {
  if (!ws.roomId) return;

  const players = rooms.get(ws.roomId) || [];
  const winner = ws.color === "w" ? "Black" : "White";
  
  // Notify both players that game is over
  players.forEach(p => {
    p.send(JSON.stringify({ type: "gameOver" }));
  });

  // Clean up room
  rooms.delete(ws.roomId);
}

function resetAllLobbies(ws) {
  // Iterate over all rooms and notify players
  rooms.forEach((players, roomId) => {
    players.forEach(player => {
      if (player.readyState === WebSocket.OPEN) {
        player.send(JSON.stringify({ type: "roomClosed" }));
        player.roomId = null; // Clear the roomId on the client socket object
      }
    });
  });

  // Clear the rooms map
  rooms.clear();
  
  console.log("All lobbies have been reset.");
  
  // Confirm to requester
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "info", message: "All lobbies reset successfully." }));
  }
}

function handleKillPiece(ws, data) {
  if (!ws.roomId) return;

  const players = rooms.get(ws.roomId) || [];
  
  // Broadcast the kill request to the opponent
  players
    .filter(p => p !== ws)
    .forEach(p => {
      p.send(JSON.stringify({ 
        type: "pieceKilled", 
        square: data.square 
      }));
    });
}

function handleDisconnect(ws) {
  // This is essentially the same as leaving a room
  if (!ws.roomId) return;

  const players = rooms.get(ws.roomId) || [];
  const updated = players.filter(p => p !== ws);

  if (updated.length === 0) {
    rooms.delete(ws.roomId);
  } else {
    // If a player disconnects mid-game, treat it as leaving/ending the session for the other player
    rooms.set(ws.roomId, updated);
    
    updated.forEach(p => {
      p.send(JSON.stringify({ type: "roomClosed" }));
      // Also send gameOver to ensure the client resets UI
      p.send(JSON.stringify({ type: "gameOver" }));
    });
  }
}
