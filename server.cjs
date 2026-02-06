// server.cjs
const WebSocket = require('ws');
const { Chess } = require('chess.js');
const reportingSystem = require('./reporting-system');
const notificationSystem = require('./notification-system');

const wss = new WebSocket.Server({ port: 8080 });

const rooms = new Map();
const connectedUsers = new Map(); // Track connected users by username
const bannedUsers = new Map(); // Track banned usernames with reasons: {username: reason}

console.log('WebSocket Server is running on ws://localhost:8081');

wss.on('connection', (ws) => {
  console.log('A new client connected!');

  ws.on('message', (message) => {
    try {
      // Convert Buffer to string if necessary
      const messageString = Buffer.isBuffer(message) ? message.toString() : message;
      console.log('Received message:', messageString);
      const data = JSON.parse(messageString);
      handleMessage(ws, data);
    } catch (error) {
      console.error("Error parsing message:", error);
      const messageString = Buffer.isBuffer(message) ? message.toString() : message;
      console.log('Received non-JSON message:', messageString);
      // Don't send echo response, just log it
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
  console.log("Received message type:", data.type, "Full data:", data);
  switch (data.type) {
    case "authenticate":
      handleAuthenticate(ws, data);
      break;
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
    case "resetGame":
      resetAllLobbies(ws);
      break;
    case "killPiece":
      handleKillPiece(ws, data);
      break;
    case "chat":
      handleChat(ws, data);
      break;
    case "invite":
      handleInvite(ws, data);
      break;
    case "getBannedUsers":
      handleGetBannedUsers(ws);
      break;
    case "banUser":
      handleBanUser(ws, data);
      break;
    case "unbanUser":
      handleUnbanUser(ws, data);
      break;
    case "report":
      handleReport(ws, data);
      break;
    case "getReports":
      handleGetReports(ws);
      break;
    case "getReportDetails":
      handleGetReportDetails(ws, data);
      break;
    case "updateReportStatus":
      handleUpdateReportStatus(ws, data);
      break;
    case "callNotification":
      // Call notifications are sent from server to client, not processed as requests
      console.log("Call notification received (should not happen)");
      break;
    default:
      console.error("Unknown message type received:", data.type, "Full data:", data);
      ws.send(JSON.stringify({ type: "error", code: 400, message: "Unknown message type" }));
  }
}

function listRooms(ws) {
  const roomList = Array.from(rooms.keys());
  ws.send(JSON.stringify({ type: "rooms", rooms: roomList }));
}

function checkPlayers(ws) {
  let count = 0;
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      count++;
    }
  });
  ws.send(JSON.stringify({ type: "playersOnline", count }));
}

function joinRoom(ws, roomId) {
  // Check if room exists
  if (!rooms.has(roomId)) {
    // Create new room
    rooms.set(roomId, {
      players: [],
      game: new Chess(),
      white: null,
      black: null
    });
  }
  const room = rooms.get(roomId);
  // Check if room is full
  if (room.players.length >= 2) {
    ws.send(JSON.stringify({ type: "error", code: 403, message: "Room is full" }));
    return;
  }
  // Assign color
  let color;
  if (!room.white) {
    color = 'w';
    room.white = ws;
  } else if (!room.black) {
    color = 'b';
    room.black = ws;
  } else {
    ws.send(JSON.stringify({ type: "error", code: 403, message: "Room is full" }));
    return;
  }
  // Add player to room
  ws.roomId = roomId;
  ws.color = color;
  room.players.push(ws);
  // Send join confirmation
  const joinedMessage = JSON.stringify({ type: "joined", color });
  console.log('Sending joined message:', joinedMessage);
  ws.send(joinedMessage);
  // If room is now full, start the game
  if (room.players.length === 2) {
    // Notify both players that game is starting
    room.players.forEach(player => {
      const startMessage = JSON.stringify({ type: "start" });
      console.log('Sending start message:', startMessage);
      player.send(startMessage);
    });
  }
}


function leaveRoom(ws) {
  if (!ws.roomId) return;

  const room = rooms.get(ws.roomId);
  if (!room) return;

  // Remove player from room
  room.players = room.players.filter(player => player !== ws);

  // Reset color assignments
  if (ws.color === 'w') {
    room.white = null;
  } else if (ws.color === 'b') {
    room.black = null;
  }

  // If room is empty, delete it
  if (room.players.length === 0) {
    rooms.delete(ws.roomId);
  } else {
    // Notify remaining player that opponent left
    room.players.forEach(player => {
      player.send(JSON.stringify({ type: "roomClosed" }));
    });
  }

  ws.roomId = null;
  ws.color = null;
}

function handleMove(ws, move) {
  if (!ws.roomId) {
    ws.send(JSON.stringify({ type: "error", code: 403, message: "Not in a room" }));
    return;
  }

  const room = rooms.get(ws.roomId);
  if (!room) {
    ws.send(JSON.stringify({ type: "error", code: 404, message: "Room not found" }));
    return;
  }

  // Verify it's the player's turn
  if (room.game.turn() !== ws.color) {
    ws.send(JSON.stringify({ type: "error", code: 403, message: "Not your turn" }));
    return;
  }

  // Try to make the move
  const result = room.game.move(move);
  if (!result) {
    ws.send(JSON.stringify({ type: "error", code: 400, message: "Invalid move" }));
    return;
  }

  // Broadcast move to all players in the room
  room.players.forEach(player => {
    if (player.readyState === WebSocket.OPEN) {
      player.send(JSON.stringify({ type: "move", move: result }));
    }
  });
}

function handleDrawOffer(ws) {
  if (!ws.roomId) {
    ws.send(JSON.stringify({ type: "error", code: 403, message: "Not in a room" }));
    return;
  }

  const room = rooms.get(ws.roomId);
  if (!room) {
    ws.send(JSON.stringify({ type: "error", code: 404, message: "Room not found" }));
    return;
  }

  // Send draw offer to opponent
  room.players.forEach(player => {
    if (player !== ws && player.readyState === WebSocket.OPEN) {
      player.send(JSON.stringify({ type: "drawOffer" }));
    }
  });
}

function handleDrawAccept(ws) {
  if (!ws.roomId) {
    ws.send(JSON.stringify({ type: "error", code: 403, message: "Not in a room" }));
    return;
  }

  const room = rooms.get(ws.roomId);
  if (!room) {
    ws.send(JSON.stringify({ type: "error", code: 404, message: "Room not found" }));
    return;
  }

  // Notify both players that draw is accepted
  room.players.forEach(player => {
    if (player.readyState === WebSocket.OPEN) {
      player.send(JSON.stringify({ type: "drawAccept" }));
    }
  });
}

function handleDrawDecline(ws) {
  if (!ws.roomId) {
    ws.send(JSON.stringify({ type: "error", code: 403, message: "Not in a room" }));
    return;
  }

  const room = rooms.get(ws.roomId);
  if (!room) {
    ws.send(JSON.stringify({ type: "error", code: 404, message: "Room not found" }));
    return;
  }

  // Notify player that draw is declined
  ws.send(JSON.stringify({ type: "drawDecline" }));
}

function handleResign(ws) {
  if (!ws.roomId) {
    ws.send(JSON.stringify({ type: "error", code: 403, message: "Not in a room" }));
    return;
  }

  const room = rooms.get(ws.roomId);
  if (!room) {
    ws.send(JSON.stringify({ type: "error", code: 404, message: "Room not found" }));
    return;
  }

  // Determine winner
  const winner = ws.color === 'w' ? 'b' : 'w';

  // Notify both players of resignation
  room.players.forEach(player => {
    if (player.readyState === WebSocket.OPEN) {
      player.send(JSON.stringify({ type: "resign", winner }));
    }
  });
}

function handleCheckmate(ws) {
  if (!ws.roomId) {
    ws.send(JSON.stringify({ type: "error", code: 403, message: "Not in a room" }));
    return;
  }

  const room = rooms.get(ws.roomId);
  if (!room) {
    ws.send(JSON.stringify({ type: "error", code: 404, message: "Room not found" }));
    return;
  }

  // Notify both players of checkmate
  room.players.forEach(player => {
    if (player.readyState === WebSocket.OPEN) {
      player.send(JSON.stringify({ type: "gameOver" }));
    }
  });
}

function resetAllLobbies(ws) {
  // Reset all rooms
  rooms.forEach((room, roomId) => {
    room.game.reset();
    room.players.forEach(player => {
      if (player.readyState === WebSocket.OPEN) {
        player.send(JSON.stringify({ type: "reset" }));
      }
    });
  });
}

function handleKillPiece(ws, data) {
  if (!ws.roomId) {
    ws.send(JSON.stringify({ type: "error", code: 403, message: "Not in a room" }));
    return;
  }

  const room = rooms.get(ws.roomId);
  if (!room) {
    ws.send(JSON.stringify({ type: "error", code: 404, message: "Room not found" }));
    return;
  }

  // Remove the specified piece from the board
  const result = room.game.remove(data.square);
  if (!result) {
    ws.send(JSON.stringify({ type: "error", code: 400, message: "Invalid square" }));
    return;
  }

  // Broadcast the updated board to all players
  room.players.forEach(player => {
    if (player.readyState === WebSocket.OPEN) {
      player.send(JSON.stringify({ type: "move", move: { from: data.square, to: data.square } }));
    }
  });
}

// New function to handle chat messages
function handleChat(ws, data) {
  if (!ws.roomId) {
    ws.send(JSON.stringify({ type: "error", code: 403, message: "Not in a room" }));
    return;
  }
  
  const room = rooms.get(ws.roomId);
  if (!room) {
    ws.send(JSON.stringify({ type: "error", code: 404, message: "Room not found" }));
    return;
  }
  
  // Broadcast the chat message to all players in the room
  const message = {
    type: "chat",
    message: data.message,
    sender: data.sender,
    roomId: ws.roomId
  };
  
  room.players.forEach(player => {
    if (player.readyState === WebSocket.OPEN) {
      player.send(JSON.stringify(message));
    }
  });
}

function handleAuthenticate(ws, data) {
  console.log("AUTH", "Authentication attempt", {
    username: data.username,
    connectedUsers: Array.from(connectedUsers.keys())
  });

  if (!data.username) {
    console.log("AUTH", "Username missing");
    ws.send(JSON.stringify({ type: "error", code: 400, message: "Username required" }));
    return;
  }

  const username = data.username.toLowerCase();

  // Check if username is banned
  if (isBanActive(username)) {
    console.log("AUTH", "Banned user attempted to connect", { username });
    ws.send(JSON.stringify({ 
      type: "error", 
      code: 403, 
      message: "Your account has been banned" 
    }));
    ws.close();
    return;
  }

  // Check if user is already connected
  if (connectedUsers.has(username)) {
    console.log("AUTH", "User already connected, disconnecting old connection", { username });
    const existingConnection = connectedUsers.get(username);

    // Disconnect the existing connection
    if (existingConnection.readyState === WebSocket.OPEN) {
      existingConnection.send(JSON.stringify({
        type: "accountConflict",
        message: "Another user is using this account"
      }));
      existingConnection.close();
    }

    // Remove old connection from tracking
    connectedUsers.delete(username);
  }

  // Set username on the new connection
  ws.username = username;

  // Track the new connection
  connectedUsers.set(username, ws);

  console.log("AUTH", "Authentication successful", {
    username,
    totalConnected: connectedUsers.size
  });

  // Send success response
  ws.send(JSON.stringify({
    type: "authenticated",
    username: username
  }));
}

function handleInvite(ws, data) {
  if (!ws.roomId) {
    ws.send(JSON.stringify({ type: "error", code: 403, message: "Not in a room" }));
    return;
  }

  if (!data.username) {
    ws.send(JSON.stringify({ type: "error", code: 400, message: "Username required" }));
    return;
  }

  // Find the invited user's connection
  const invitedUser = Array.from(connectedUsers.values()).find(client => 
    client.username === data.username && client.readyState === WebSocket.OPEN
  );

  if (!invitedUser) {
    ws.send(JSON.stringify({ type: "error", code: 404, message: "User not found or offline" }));
    return;
  }

  // Send the invitation to the invited user
  invitedUser.send(JSON.stringify({
    type: "gameInvite",
    from: ws.username || "Someone",
    room: ws.roomId
  }));

  // Confirm to the sender that the invite was sent
  ws.send(JSON.stringify({
    type: "inviteSent",
    to: data.username,
    room: ws.roomId
  }));
}

function handleDisconnect(ws) {
  // If player was in a room, handle leaving
  if (ws.roomId) {
    leaveRoom(ws);
  }

  // Remove user from connected users tracking
  if (ws.username && connectedUsers.has(ws.username)) {
    connectedUsers.delete(ws.username);
  }
}

function isBanActive(username) {
  const banInfo = bannedUsers.get(username);
  if (!banInfo) return false;

  // If no expiration time, it's a permanent ban
  if (!banInfo.expiresAt) return true;

  // Check if the ban has expired
  const now = Date.now();
  if (now > banInfo.expiresAt) {
    // Ban has expired, remove it
    console.log("BAN", "Ban expired, removing", { username });
    bannedUsers.delete(username);
    return false;
  }

  return true;
}

function handleGetBannedUsers(ws) {
  console.log("BAN", "Sending list of banned users", {
    count: bannedUsers.size
  });

  const bannedUsersList = Array.from(bannedUsers.entries()).map(([username, banInfo]) => ({
    username,
    reason: banInfo.reason,
    duration: banInfo.duration,
    unit: banInfo.unit,
    expiresAt: banInfo.expiresAt
  }));

  ws.send(JSON.stringify({
    type: "bannedUsersList",
    users: bannedUsersList
  }));
}

function handleBanUser(ws, data) {
  if (!data.username) {
    ws.send(JSON.stringify({ type: "error", code: 400, message: "Username required" }));
    return;
  }

  const username = data.username.toLowerCase();

  if (isBanActive(username)) {
    ws.send(JSON.stringify({ type: "error", code: 400, message: "User is already banned" }));
    return;
  }

  const reason = data.reason || 'No reason provided';
  const duration = data.duration || null;
  const unit = data.unit || 'permanent';

  // Calculate expiration time
  let expiresAt = null;
  if (duration && unit !== 'permanent') {
    const now = Date.now();
    const multipliers = {
      'minutes': 60 * 1000,
      'hours': 60 * 60 * 1000,
      'days': 24 * 60 * 60 * 1000
    };
    expiresAt = now + (duration * multipliers[unit]);
  }

  bannedUsers.set(username, {
    reason,
    expiresAt,
    duration,
    unit
  });

  console.log("BAN", "User banned", { username, reason, duration, unit, expiresAt });

  // Disconnect the user if they're currently connected
  const userConnection = connectedUsers.get(username);
  if (userConnection && userConnection.readyState === WebSocket.OPEN) {
    userConnection.send(JSON.stringify({
      type: "error",
      code: 403,
      message: "Your account has been banned",
      reason: reason,
      duration: duration,
      unit: unit,
      expiresAt: expiresAt
    }));
    userConnection.close();
  }

  ws.send(JSON.stringify({
    type: "userBanned",
    username: data.username,
    reason: reason,
    duration: duration,
    unit: unit,
    expiresAt: expiresAt
  }));
}

function handleUnbanUser(ws, data) {
  if (!data.username) {
    ws.send(JSON.stringify({ type: "error", code: 400, message: "Username required" }));
    return;
  }

  const username = data.username.toLowerCase();

  if (!bannedUsers.has(username)) {
    ws.send(JSON.stringify({ type: "error", code: 400, message: "User is not banned" }));
    return;
  }

  bannedUsers.delete(username);
  console.log("BAN", "User unbanned", { username });

  ws.send(JSON.stringify({
    type: "userUnbanned",
    username: data.username
  }));
}

// Report handling functions
function handleReport(ws, data) {
  try {
    console.log("REPORT", "New report received", data);
    
    if (!ws.roomId) {
      ws.send(JSON.stringify({ type: "error", code: 403, message: "Not in a room" }));
      return;
    }

    const room = rooms.get(ws.roomId);
    if (!room) {
      ws.send(JSON.stringify({ type: "error", code: 404, message: "Room not found" }));
      return;
    }

    // Save game replay
    const replayId = reportingSystem.saveGameReplay(ws.roomId, {
      pgn: room.game.pgn(),
      history: room.game.history(),
      fen: room.game.fen()
    });

    // Create report
    const reportData = {
      type: data.type || "cheating",
      reportedBy: ws.username || "Anonymous",
      roomId: ws.roomId,
      opponent: room.players.find(p => p !== ws)?.username || "Unknown",
      reason: data.reason || "No reason provided",
      description: data.description || "",
      replayId: replayId
    };

    const reportId = reportingSystem.createReport(reportData);

    // Send notification to admin
    notificationSystem.sendReportNotification({
      id: reportId,
      ...reportData
    }).catch(err => {
      console.error("Error sending notification:", err);
    });

    

    // Send call notification to admin user bungles17x
    const callNotificationData = {
      type: "callNotification",
      id: reportId,
      ...reportData
    };

    // Send only to admin user bungles17x
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN && client.username === "bungles17x".toLowerCase()) {
        client.send(JSON.stringify(callNotificationData));
      }
    });

    // Confirm report submission to user
    ws.send(JSON.stringify({
      type: "reportSubmitted",
      reportId: reportId,
      message: "Report submitted successfully. Thank you for helping us improve the game!"
    }));

  } catch (error) {
    console.error("Error handling report:", error);
    ws.send(JSON.stringify({ type: "error", code: 500, message: "Failed to submit report" }));
  }
}

function handleGetReports(ws) {
  try {
    const reports = reportingSystem.getAllReports();
    ws.send(JSON.stringify({
      type: "reportsList",
      reports: reports
    }));
  } catch (error) {
    console.error("Error getting reports:", error);
    ws.send(JSON.stringify({ type: "error", code: 500, message: "Failed to get reports" }));
  }
}

function handleGetReportDetails(ws, data) {
  try {
    if (!data.reportId) {
      ws.send(JSON.stringify({ type: "error", code: 400, message: "Report ID required" }));
      return;
    }

    const report = reportingSystem.getReportById(data.reportId);
    if (!report) {
      ws.send(JSON.stringify({ type: "error", code: 404, message: "Report not found" }));
      return;
    }

    // Get game replay if available
    let replay = null;
    if (report.replayId) {
      replay = reportingSystem.getGameReplay(report.replayId);
    }

    ws.send(JSON.stringify({
      type: "reportDetails",
      report: report,
      replay: replay
    }));
  } catch (error) {
    console.error("Error getting report details:", error);
    ws.send(JSON.stringify({ type: "error", code: 500, message: "Failed to get report details" }));
  }
}

function handleUpdateReportStatus(ws, data) {
  try {
    if (!data.reportId || !data.status) {
      ws.send(JSON.stringify({ type: "error", code: 400, message: "Report ID and status required" }));
      return;
    }

    const success = reportingSystem.updateReportStatus(data.reportId, data.status);
    if (success) {
      ws.send(JSON.stringify({
        type: "reportStatusUpdated",
        reportId: data.reportId,
        status: data.status
      }));
    } else {
      ws.send(JSON.stringify({ type: "error", code: 404, message: "Report not found" }));
    }
  } catch (error) {
    console.error("Error updating report status:", error);
    ws.send(JSON.stringify({ type: "error", code: 500, message: "Failed to update report status" }));
  }
}
