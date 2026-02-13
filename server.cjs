// server.cjs
require('dotenv').config({ path: './twilio.env' });
const WebSocket = require('ws');
const { Chess } = require('chess.js');
const twilio = require('twilio');
const { isAdmin, hasAdminPower, getAdminPowers } = require('./admin-system-fixed');
const userManager = require('./user-manager');
const userSyncHandlers = require('./user-sync-handlers');
const reportingSystem = require('./reporting-system');
const notificationSystem = require('./notification-system');

// Profanity filter system
const profanityKeywords = [
  'fuck', 'shit', 'ass', 'bitch', 'damn', 'hell',
  'bastard', 'crap', 'dick', 'piss', 'whore',
  'slut', 'cock', 'pussy', 'nigger', 'nigga',
  'fag', 'faggot', 'retard', 'idiot', 'stupid',
  'dumbass', 'asshole', 'douche', 'wanker', 'cunt'
];

// Track chat offenses for each user
const chatOffenses = new Map();

// Maximum offenses before ban
const MAX_OFFENSES = 3;

// Function to check for profanity in a message
function containsProfanity(message) {
  const lowerMessage = message.toLowerCase();
  return profanityKeywords.some(keyword => lowerMessage.includes(keyword));
}

// Function to handle profanity offense
function handleProfanityOffense(ws, username, message) {
  const offenses = chatOffenses.get(username) || 0;
  const newOffenses = offenses + 1;
  chatOffenses.set(username, newOffenses);
  
  console.log("PROFANITY", `User ${username} has ${newOffenses} offense(s)`);
  
  if (newOffenses >= MAX_OFFENSES) {
    // Ban the user
    const banData = {
      username: username,
      reason: "Multiple profanity offenses in chat",
      duration: 7,
      unit: "days",
      bannedBy: "System"
    };
    
    // Add to banned users
    bannedUsers.set(username.toLowerCase(), {
      username: username,
      reason: banData.reason,
      duration: banData.duration,
      unit: banData.unit,
      bannedBy: banData.bannedBy,
      bannedAt: Date.now()
    });
    
    // Notify the user
    ws.send(JSON.stringify({
      type: "userBanned",
      username: username,
      reason: banData.reason,
      duration: banData.duration,
      unit: banData.unit,
      bannedAt: Date.now()
    }));
    
    // Reset offenses after ban
    chatOffenses.delete(username);
    
    console.log("PROFANITY", `User ${username} has been banned for profanity`);
  } else {
    // Send warning
    const remaining = MAX_OFFENSES - newOffenses;
    ws.send(JSON.stringify({
      type: "profanityWarning",
      message: `Your message "${message}" contains inappropriate language. Please watch your language! You have ${newOffenses} offense(s). ${remaining} more offense(s) will result in a ban.`
    }));
  }
}

// Twilio configuration
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

// Debug: Log environment variables (without sensitive values)
console.log('Environment check:');
console.log('TWILIO_ACCOUNT_SID:', accountSid ? 'Set' : 'Not set');
console.log('TWILIO_AUTH_TOKEN:', authToken ? 'Set' : 'Not set');
console.log('ADMIN_PHONE_NUMBER:', process.env.ADMIN_PHONE_NUMBER || 'Not set');
console.log('TWILIO_PHONE_NUMBER:', process.env.TWILIO_PHONE_NUMBER || 'Not set');

// Only initialize Twilio client if credentials are available
let client;
if (accountSid && authToken) {
  client = twilio(accountSid, authToken);
} else {
  console.warn('Twilio credentials not configured. Phone call notifications will be disabled.');
}

const yourPhoneNumber = process.env.ADMIN_PHONE_NUMBER; // Your personal phone number
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER; // Your Twilio phone number

// Function to make a call when a report is submitted
async function makeReportCall(reportData, reportId) {
  // Check if Twilio is configured before making call
  if (!client) {
    console.warn('Twilio client not initialized. Skipping phone call notification.');
    return;
  }
  
  try {
    const message = `New report received. Type: ${reportData.reportType}. Reported by: ${reportData.reportedBy}. Against: ${reportData.opponent}. Reason: ${reportData.reason}`;
    
    // Use TwiML to speak the message
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say voice="alice" language="en-US">${message}. Goodbye.</Say>
      </Response>`;

    const call = await client.calls.create({
      to: yourPhoneNumber,
      from: twilioPhoneNumber,
      twiml: twiml
    });
    
    console.log("Call initiated:", call.sid);
  } catch (error) {
    console.error("Error making call:", error);
  }
}

const wss = new WebSocket.Server({ port: 8080 });

const rooms = new Map();
const connectedUsers = new Map(); // Track connected users by username
const bannedUsers = new Map(); // Track banned usernames with reasons: {username: reason}

// TEMPORARY: Unban bungles17x account on server start
const adminUsernames = ["bungles17x", "674121bruh"];
adminUsernames.forEach(username => {
  if (bannedUsers.has(username.toLowerCase())) {
    console.log("ADMIN", "Unbanning admin account", { username: username });
    bannedUsers.delete(username.toLowerCase());
  }
});
const friends = new Map(); // Track friendships: {username: [friend1, friend2, ...]}
const mutedUsers = new Set(); // Track muted users

// Anti-cheat data structures
const playerMoveHistory = new Map(); // Track move timestamps: {username: [{timestamp, move}...]}
const suspiciousActivity = new Map(); // Track suspicious activity: {username: {count, lastReported}}
const gameStates = new Map(); // Track game states for validation: {roomId: {fen, pgn, lastMove}}

// Anti-cheat constants
const MIN_MOVE_TIME =500; // Minimum time between moves in milliseconds
const MAX_MOVE_TIME = 300000; // Maximum time for a move (5 minutes)
const SUSPICIOUS_MOVE_COUNT = 5; // Number of suspicious moves before flagging
const SUSPICIOUS_WINDOW = 60000; // Time window for suspicious activity (1 minute)
const MAX_INVALID_MOVES = 3; // Maximum invalid moves before disconnect

// Generate unique report ID
function generateReportId() {
  return `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Anti-cheat helper functions
function recordMove(username, move) {
  if (!playerMoveHistory.has(username)) {
    playerMoveHistory.set(username, []);
  }
  const history = playerMoveHistory.get(username);
  history.push({
    timestamp: Date.now(),
    move: move
  });
  if (history.length > 100) {
    history.shift();
  }
}

function checkMoveTiming(username) {
  if (!playerMoveHistory.has(username)) {
    return { valid: true };
  }
  
  const history = playerMoveHistory.get(username);
  if (history.length === 0) {
    return { valid: true };
  }
  
  const lastMove = history[history.length - 1];
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

function trackSuspiciousActivity(username, activityType) {
  if (!suspiciousActivity.has(username)) {
    suspiciousActivity.set(username, { count: 0, lastReported: 0, activities: [] });
  }
  
  const activity = suspiciousActivity.get(username);
  const currentTime = Date.now();
  
  activity.activities = activity.activities.filter(
    a => currentTime - a.timestamp < SUSPICIOUS_WINDOW
  );
  
  activity.activities.push({
    type: activityType,
    timestamp: currentTime
  });
  
  activity.count = activity.activities.length;
  
  if (activity.count >= SUSPICIOUS_MOVE_COUNT && 
      (currentTime - activity.lastReported > SUSPICIOUS_WINDOW)) {
    activity.lastReported = currentTime;
    
    // Auto-ban if suspicious activity is severe (10+ occurrences)
    if (activity.count >= 10) {
      handleAutoBanSuspiciousPlayer(username);
    }
    
    return {
      shouldReport: true,
      count: activity.count,
      activities: activity.activities
    };
  }
  
  return { shouldReport: false };
}

function updateGameState(roomId, game) {
  gameStates.set(roomId, {
    fen: game.fen(),
    pgn: game.pgn(),
    lastMove: game.history({ verbose: true }).pop()
  });
}

function validateGameState(roomId, clientState) {
  if (!gameStates.has(roomId)) {
    return { valid: true };
  }
  
  const serverState = gameStates.get(roomId);
  
  if (clientState.fen !== serverState.fen) {
    return {
      valid: false,
      reason: 'Game state mismatch',
      serverFen: serverState.fen,
      clientFen: clientState.fen
    };
  }
  
  return { valid: true };
}

console.log('WebSocket Server is running on ws://localhost:8081');

// Periodic cleanup of expired anti-cheat data
setInterval(() => {
  const now = Date.now();
  
  // Clean up old move history (older than 1 hour)
  playerMoveHistory.forEach((history, username) => {
    const filteredHistory = history.filter(
      move => now - move.timestamp < 3600000
    );
    if (filteredHistory.length === 0) {
      playerMoveHistory.delete(username);
    } else {
      playerMoveHistory.set(username, filteredHistory);
    }
  });
  
  // Clean up old suspicious activity records (older than 24 hours)
  suspiciousActivity.forEach((activity, username) => {
    const filteredActivities = activity.activities.filter(
      a => now - a.timestamp < 86400000
    );
    if (filteredActivities.length === 0) {
      suspiciousActivity.delete(username);
    } else {
      activity.activities = filteredActivities;
      activity.count = filteredActivities.length;
    }
  });
  
  console.log("Anti-cheat: Cleanup completed", {
    moveHistoryCount: playerMoveHistory.size,
    suspiciousActivityCount: suspiciousActivity.size
  });
}, 300000); // Run every 5 minutes

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
    case "clearAllBans":
      handleClearAllBans(ws);
      break;
    case "report":
      handleReport(ws, data);
      break;
    case "getReports":
      handleGetReports(ws);
      break;
    case "syncUserData":
      userSyncHandlers.handleSyncUserData(ws, data, userManager, wss);
      break;
    case "updateUserProfile":
      userSyncHandlers.handleUpdateUserProfile(ws, data, userManager, wss);
      break;
    case "getUserProfile":
      userSyncHandlers.handleGetUserProfile(ws, data, userManager);
      break;
    case "syncFriends":
      userSyncHandlers.handleSyncFriends(ws, data, userManager);
      break;
    case "syncSavedGames":
      userSyncHandlers.handleSyncSavedGames(ws, data, userManager);
      break;
    case "getReportDetails":
      handleGetReportDetails(ws, data);
      break;
    case "updateReportStatus":
      handleUpdateReportStatus(ws, data);
      break;
    case "addFriend":
      handleAddFriend(ws, data);
      break;
    case "removeFriend":
      handleRemoveFriend(ws, data);
      break;
    case "getFriends":
      handleGetFriends(ws);
      break;
    case "acceptFriendRequest":
      handleAcceptFriendRequest(ws, data);
      break;
    case "rejectFriendRequest":
      handleRejectFriendRequest(ws, data);
      break;
    case "sendFriendRequest":
      handleSendFriendRequest(ws, data);
      break;
    case "getAntiCheatStats":
      handleGetAntiCheatStats(ws);
      break;
    case "banSuspiciousPlayer":
      handleBanSuspiciousPlayer(ws, data);
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
    const game = new Chess();
    rooms.set(roomId, {
      players: [],
      game: game,
      white: null,
      black: null
    });
    // Initialize game state tracking
    updateGameState(roomId, game);
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
    // Clean up game state tracking
    gameStates.delete(ws.roomId);
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
    trackSuspiciousActivity(ws.username, 'wrong_turn_attempt');
    return;
  }

  // Check move timing (anti-cheat)
  const timingCheck = checkMoveTiming(ws.username);
  if (!timingCheck.valid) {
    console.log('Anti-cheat: Suspicious move timing', {
      username: ws.username,
      timeSinceLastMove: timingCheck.timeSinceLastMove
    });
    
    const suspiciousResult = trackSuspiciousActivity(ws.username, 'fast_move');
    if (suspiciousResult.shouldReport) {
      console.log('Anti-cheat: Reporting suspicious activity', {
        username: ws.username,
        count: suspiciousResult.count
      });
    }
  }

  // Validate game state if provided
  if (move.clientState) {
    const stateValidation = validateGameState(ws.roomId, move.clientState);
    if (!stateValidation.valid) {
      console.log('Anti-cheat: Game state mismatch', {
        username: ws.username,
        reason: stateValidation.reason
      });
      trackSuspiciousActivity(ws.username, 'state_mismatch');
      
      // Send error and reset game state for this player
      ws.send(JSON.stringify({ 
        type: "error", 
        code: 403, 
        message: "Game state mismatch detected",
        serverFen: room.game.fen()
      }));
      return;
    }
  }

  // Try to make the move
  const result = room.game.move(move);
  if (!result) {
    ws.send(JSON.stringify({ type: "error", code: 400, message: "Invalid move" }));
    
    // Track invalid moves
    const invalidResult = trackSuspiciousActivity(ws.username, 'invalid_move');
    if (invalidResult.shouldReport) {
      console.log('Anti-cheat: Multiple invalid moves detected', {
        username: ws.username,
        count: invalidResult.count
      });
    }
    return;
  }

  // Record the move for anti-cheat tracking
  recordMove(ws.username, result);
  
  // Update game state
  updateGameState(ws.roomId, room.game);

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
    // Update game state tracking
    updateGameState(roomId, room.game);
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
  
  // Check for profanity in the message
  if (containsProfanity(data.message)) {
    handleProfanityOffense(ws, data.sender, data.message);
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
  const banInfo = bannedUsers.get(username.toLowerCase());
  if (banInfo) {
    console.log("AUTH", "Banned user attempted to connect", { username });
    
    // Calculate expiration time
    const expiresAt = banInfo.bannedAt + (banInfo.duration * (banInfo.unit === 'days' ? 86400000 : banInfo.unit === 'hours' ? 3600000 : 60000));
    
    ws.send(JSON.stringify({ 
      type: "error", 
      code: 403, 
      message: "Your account has been banned",
      reason: banInfo.reason,
      duration: banInfo.duration,
      unit: banInfo.unit,
      bannedAt: banInfo.bannedAt,
      expiresAt: expiresAt 
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
  
  // Clean up anti-cheat data
  if (ws.username) {
    playerMoveHistory.delete(ws.username);
    suspiciousActivity.delete(ws.username);
  }
}

function isBanActive(username) {
  // bungles17x is never considered banned
  if (username.toLowerCase() === 'bungles17x') {
    return false;
  }
  
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
    
    // Notify the user if they're currently connected
    const userConnection = connectedUsers.get(username);
    if (userConnection && userConnection.readyState === WebSocket.OPEN) {
      userConnection.send(JSON.stringify({
        type: "banExpired",
        message: "Your ban has expired. You can now use the chat again."
      }));
    }
    
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
  if (!ws.username || !hasAdminPower(ws.username, 'canBanUsers')) {
    ws.send(JSON.stringify({ type: "error", code: 403, message: "Access denied" }));
    return;
  }

  if (!data.username) {
    ws.send(JSON.stringify({ type: "error", code: 400, message: "Username required" }));
    return;
  }

  const username = data.username.toLowerCase();

  // Prevent banning admins, with exception for bungles17x banning 674121bruh
  if (isAdmin(username)) {
    // Allow bungles17x to ban 674121bruh
    if (ws.username.toLowerCase() === 'bungles17x' && username === '674121bruh') {
      console.log("BAN", "bungles17x is banning 674121bruh");
    } else {
      ws.send(JSON.stringify({ type: "error", code: 403, message: "This user cannot be banned" }));
      return;
    }
  }

  if (isBanActive(username)) {
    ws.send(JSON.stringify({ type: "error", code: 400, message: "User is already banned" }));
    return;
  }

  const reason = data.reason || 'No reason provided';
  const duration = data.duration && !isNaN(parseInt(data.duration)) ? parseInt(data.duration) : null;
  const unit = data.unit || 'permanent';

  // Calculate expiration time
  let expiresAt = null;
  console.log("BAN", "Calculating expiration time", { duration, unit, durationType: typeof duration, unitType: typeof unit });
  if (duration && unit !== 'permanent') {
    const now = Date.now();
    const multipliers = {
      'minutes': 60 * 1000,
      'hours': 60 * 60 * 1000,
      'days': 24 * 60 * 60 * 1000
    };
    
    // Validate unit value
    if (!multipliers[unit]) {
      console.error("BAN", "Invalid unit value", { unit, validUnits: Object.keys(multipliers) });
      expiresAt = null; // Fall back to permanent ban
    } else {
      // Ensure duration is a number
      const numericDuration = typeof duration === 'string' ? parseInt(duration, 10) : duration;

      // Calculate expiresAt
      const multiplier = multipliers[unit];
      expiresAt = now + (numericDuration * multiplier);

      console.log("BAN", "Final expiration time", { expiresAt, expiresAtDate: new Date(expiresAt).toISOString() });

      // Validate expiresAt is a valid timestamp
      console.log("BAN", "Validating expiresAt", { expiresAt, now, numericDuration, multiplier, isNaNExpiresAt: isNaN(expiresAt), expiresAtLessThanNow: expiresAt <= now });
      // Only invalidate expiresAt if it's clearly invalid (NaN or significantly in the past)
      if (isNaN(expiresAt) || expiresAt < now - 60000) { // 1 minute margin
        console.error("BAN", "Invalid expiration time calculated", { expiresAt, now, numericDuration, multiplier });
        expiresAt = null; // Fall back to permanent ban
      } else {
        console.log("BAN", "Valid expiresAt calculated", { expiresAt, expiresAtDate: new Date(expiresAt).toISOString() });
      }
    }
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
  if (!ws.username || !hasAdminPower(ws.username, 'canUnbanUsers')) {
    ws.send(JSON.stringify({ type: "error", code: 403, message: "Access denied" }));
    return;
  }

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

function handleClearAllBans(ws) {
  const count = bannedUsers.size;
  bannedUsers.clear();
  console.log("BAN", "All bans cleared", { count });

  ws.send(JSON.stringify({
    type: "allBansCleared",
    count: count
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
    const gameData = {
      pgn: room.game.pgn(),
      fen: room.game.fen(),
      history: room.game.history({ verbose: true })
    };
    const replayId = reportingSystem.saveGameReplay(ws.roomId, gameData);

    // Get opponent username
    let opponent = "Unknown";
    if (room.players && room.players.length > 0) {
      const opponentPlayer = room.players.find(p => p !== ws && p.username);
      if (opponentPlayer && opponentPlayer.username) {
        opponent = opponentPlayer.username;
      }
    }

    // Create report
    const reportData = {
      reportType: data.reportType || "cheating",
      reportedBy: ws.username || "Anonymous",
      roomId: ws.roomId,
      opponent: opponent,
      reason: data.reason || "No reason provided",
      description: data.description || "",
      replayId: replayId,
      timestamp: new Date().toISOString(),
      status: "pending"
    };

    const reportId = reportingSystem.createReport(reportData);

    // Send notification to admin (simplified version)
    console.log("Report created:", reportId, reportData);
    notificationSystem.sendReportNotification({
      id: reportId,
      type: reportData.reportType,
      reportedBy: reportData.reportedBy,
      roomId: reportData.roomId,
      reason: reportData.reason
    }).then(result => {
      console.log("Report notification sent:", result);
    }).catch(error => {
      console.error("Error sending report notification:", error);
    });

    

    // Call notifications are now handled by the admin panel

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
    const reportsList = reportingSystem.getAllReports();
    ws.send(JSON.stringify({
      type: "reportsList",
      reports: reportsList
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

    ws.send(JSON.stringify({
      type: "reportDetails",
      report: report
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
    if (!success) {
      ws.send(JSON.stringify({ type: "error", code: 404, message: "Report not found or update failed" }));
      return;
    }

    ws.send(JSON.stringify({
      type: "reportStatusUpdated",
      reportId: data.reportId,
      status: data.status
    }));
  } catch (error) {
    console.error("Error updating report status:", error);
    ws.send(JSON.stringify({ type: "error", code: 500, message: "Failed to update report status" }));
  }
}

// Friend system functions
function handleSendFriendRequest(ws, data) {
  try {
    if (!ws.username) {
      ws.send(JSON.stringify({ type: "error", code: 401, message: "Not authenticated" }));
      return;
    }

    if (!data.friendUsername) {
      ws.send(JSON.stringify({ type: "error", code: 400, message: "Friend username required" }));
      return;
    }

    if (data.friendUsername.toLowerCase() === ws.username.toLowerCase()) {
      ws.send(JSON.stringify({ type: "error", code: 400, message: "Cannot add yourself as a friend" }));
      return;
    }

    // Check if user exists
    let friendExists = false;
    wss.clients.forEach(client => {
      if (client.username && client.username.toLowerCase() === data.friendUsername.toLowerCase()) {
        friendExists = true;
      }
    });

    if (!friendExists) {
      ws.send(JSON.stringify({ type: "error", code: 404, message: "User not found" }));
      return;
    }

    // Send friend request to the target user
    wss.clients.forEach(client => {
      if (client.username && client.username.toLowerCase() === data.friendUsername.toLowerCase()) {
        client.send(JSON.stringify({
          type: "friendRequest",
          from: ws.username
        }));
      }
    });

    ws.send(JSON.stringify({
      type: "friendRequestSent",
      message: "Friend request sent successfully"
    }));
  } catch (error) {
    console.error("Error sending friend request:", error);
    ws.send(JSON.stringify({ type: "error", code: 500, message: "Failed to send friend request" }));
  }
}

function handleAcceptFriendRequest(ws, data) {
  try {
    if (!ws.username) {
      ws.send(JSON.stringify({ type: "error", code: 401, message: "Not authenticated" }));
      return;
    }

    if (!data.from) {
      ws.send(JSON.stringify({ type: "error", code: 400, message: "Sender username required" }));
      return;
    }

    // Add to both users' friend lists
    if (!friends.has(ws.username)) {
      friends.set(ws.username, []);
    }
    if (!friends.has(data.from)) {
      friends.set(data.from, []);
    }

    const userFriends = friends.get(ws.username);
    const friendFriends = friends.get(data.from);

    if (!userFriends.includes(data.from)) {
      userFriends.push(data.from);
    }
    if (!friendFriends.includes(ws.username)) {
      friendFriends.push(ws.username);
    }

    // Notify both users
    wss.clients.forEach(client => {
      if (client.username && client.username.toLowerCase() === data.from.toLowerCase()) {
        client.send(JSON.stringify({
          type: "friendAccepted",
          friend: ws.username
        }));
      }
    });

    ws.send(JSON.stringify({
      type: "friendAccepted",
      friend: data.from
    }));
  } catch (error) {
    console.error("Error accepting friend request:", error);
    ws.send(JSON.stringify({ type: "error", code: 500, message: "Failed to accept friend request" }));
  }
}

function handleRejectFriendRequest(ws, data) {
  try {
    if (!ws.username) {
      ws.send(JSON.stringify({ type: "error", code: 401, message: "Not authenticated" }));
      return;
    }

    if (!data.from) {
      ws.send(JSON.stringify({ type: "error", code: 400, message: "Sender username required" }));
      return;
    }

    // Notify the sender that the request was rejected
    wss.clients.forEach(client => {
      if (client.username && client.username.toLowerCase() === data.from.toLowerCase()) {
        client.send(JSON.stringify({
          type: "friendRequestRejected",
          from: ws.username
        }));
      }
    });

    ws.send(JSON.stringify({
      type: "friendRequestRejected",
      message: "Friend request rejected"
    }));
  } catch (error) {
    console.error("Error rejecting friend request:", error);
    ws.send(JSON.stringify({ type: "error", code: 500, message: "Failed to reject friend request" }));
  }
}

function handleGetAntiCheatStats(ws) {
  try {
    if (!ws.username) {
      ws.send(JSON.stringify({ type: "error", code: 401, message: "Not authenticated" }));
      return;
    }

    const stats = {
      totalPlayers: connectedUsers.size,
      playersWithSuspiciousActivity: suspiciousActivity.size,
      totalGames: rooms.size,
      suspiciousPlayers: []
    };

    // Get details of suspicious players
    suspiciousActivity.forEach((activity, username) => {
      stats.suspiciousPlayers.push({
        username,
        suspiciousCount: activity.count,
        lastReported: activity.lastReported,
        activities: activity.activities
      });
    });

    ws.send(JSON.stringify({
      type: "antiCheatStats",
      stats
    }));
  } catch (error) {
    console.error("Error getting anti-cheat stats:", error);
    ws.send(JSON.stringify({ type: "error", code: 500, message: "Failed to get anti-cheat stats" }));
  }
}

// Function to handle manual banning of suspicious players
function handleBanSuspiciousPlayer(ws, data) {
  try {
    if (!data.username) {
      ws.send(JSON.stringify({ type: "error", code: 400, message: "Username required" }));
      return;
    }

    const username = data.username.toLowerCase();

    if (!suspiciousActivity.has(username)) {
      ws.send(JSON.stringify({ type: "error", code: 404, message: "No suspicious activity found for this user" }));
      return;
    }

    const banned = handleAutoBanSuspiciousPlayer(username);

    if (banned) {
      ws.send(JSON.stringify({
        type: "playerBanned",
        username: username,
        message: "Player successfully banned for suspicious activity"
      }));
    } else {
      ws.send(JSON.stringify({ type: "error", code: 400, message: "Failed to ban player" }));
    }
  } catch (error) {
    console.error("Error banning suspicious player:", error);
    ws.send(JSON.stringify({ type: "error", code: 500, message: "Failed to ban player" }));
  }
}

// Function to handle automatic banning of suspicious players
function handleAutoBanSuspiciousPlayer(username) {
  // Prevent auto-banning bungles17x
  if (username.toLowerCase() === 'bungles17x') {
    console.log("AUTO-BAN", "Skipping auto-ban for protected user", { username });
    return;
  }
  
  const activity = suspiciousActivity.get(username);
  if (!activity) return;

  // Count different types of suspicious activities
  const activityTypes = {};
  activity.activities.forEach(a => {
    activityTypes[a.type] = (activityTypes[a.type] || 0) + 1;
  });

  // Determine ban duration based on severity
  let banDuration = null;
  let banUnit = 'permanent';
  
  const totalSuspiciousMoves = activity.count;
  
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

  // Create ban
  if (banDuration !== null || banUnit === 'permanent') {
    let expiresAt = null;
    if (banDuration && banUnit !== 'permanent') {
      const now = Date.now();
      const multipliers = {
        'minutes': 60 * 1000,
        'hours': 60 * 60 * 1000,
        'days': 24 * 60 * 60 * 1000
      };
      expiresAt = now + (banDuration * multipliers[banUnit]);
    }

    bannedUsers.set(username, {
      reason: `Automatic ban due to suspicious activity: ${Object.keys(activityTypes).join(', ')}`,
      expiresAt,
      duration: banDuration,
      unit: banUnit
    });

    console.log("AUTO-BAN", "Player automatically banned", {
      username,
      reason: bannedUsers.get(username).reason,
      duration: banDuration,
      unit: banUnit,
      expiresAt
    });

    // Disconnect the user if they're currently connected
    const userConnection = connectedUsers.get(username);
    if (userConnection && userConnection.readyState === WebSocket.OPEN) {
      userConnection.send(JSON.stringify({
        type: "error",
        code: 403,
        message: "Your account has been banned for suspicious activity",
        reason: bannedUsers.get(username).reason,
        duration: banDuration,
        unit: banUnit,
        expiresAt: expiresAt
      }));
      userConnection.close();
    }

    // Clean up anti-cheat data for banned user
    playerMoveHistory.delete(username);
    suspiciousActivity.delete(username);

    return true;
  }

  return false;
}

function handleGetFriends(ws) {
  try {
    if (!ws.username) {
      ws.send(JSON.stringify({ type: "error", code: 401, message: "Not authenticated" }));
      return;
    }

    const userFriends = friends.get(ws.username) || [];
    const onlineFriends = userFriends.filter(friendUsername => {
      let isOnline = false;
      wss.clients.forEach(client => {
        if (client.username && client.username.toLowerCase() === friendUsername.toLowerCase()) {
          isOnline = true;
        }
      });
      return isOnline;
    });

    ws.send(JSON.stringify({
      type: "friendsList",
      friends: userFriends,
      onlineFriends: onlineFriends
    }));
  } catch (error) {
    console.error("Error getting friends:", error);
    ws.send(JSON.stringify({ type: "error", code: 500, message: "Failed to get friends" }));
  }
}

function handleRemoveFriend(ws, data) {
  try {
    if (!ws.username) {
      ws.send(JSON.stringify({ type: "error", code: 401, message: "Not authenticated" }));
      return;
    }

    if (!data.friendUsername) {
      ws.send(JSON.stringify({ type: "error", code: 400, message: "Friend username required" }));
      return;
    }

    // Remove from user's friend list
    const userFriends = friends.get(ws.username);
    if (userFriends) {
      const index = userFriends.indexOf(data.friendUsername);
      if (index > -1) {
        userFriends.splice(index, 1);
      }
    }

    // Remove from friend's friend list
    const friendFriends = friends.get(data.friendUsername);
    if (friendFriends) {
      const index = friendFriends.indexOf(ws.username);
      if (index > -1) {
        friendFriends.splice(index, 1);
      }
    }

    // Notify both users
    wss.clients.forEach(client => {
      if (client.username && client.username.toLowerCase() === data.friendUsername.toLowerCase()) {
        client.send(JSON.stringify({
          type: "friendRemoved",
          friend: ws.username
        }));
      }
    });

    ws.send(JSON.stringify({
      type: "friendRemoved",
      friend: data.friendUsername
    }));
  } catch (error) {
    console.error("Error removing friend:", error);
    ws.send(JSON.stringify({ type: "error", code: 500, message: "Failed to remove friend" }));
  }
}

function handleAddFriend(ws, data) {
  // This function is deprecated, use handleSendFriendRequest instead
  handleSendFriendRequest(ws, data);
}

// Admin Functions
function handleAdminGetPowers(ws) {
  if (!ws.username || !isAdmin(ws.username)) {
    ws.send(JSON.stringify({ type: "error", code: 403, message: "Access denied" }));
    return;
  }
  
  const powers = getAdminPowers(ws.username);
  ws.send(JSON.stringify({ type: "adminPowers", powers }));
}

function handleAdminKickUser(ws, data) {
  if (!ws.username || !hasAdminPower(ws.username, 'canKickUsers')) {
    ws.send(JSON.stringify({ type: "error", code: 403, message: "Access denied" }));
    return;
  }
  
  const targetUsername = data.username;
  if (!targetUsername) {
    ws.send(JSON.stringify({ type: "error", code: 400, message: "Username required" }));
    return;
  }
  
  // Find and disconnect the user
  wss.clients.forEach(client => {
    if (client.username && client.username.toLowerCase() === targetUsername.toLowerCase()) {
      client.send(JSON.stringify({
        type: "kicked",
        message: "You have been kicked by an admin",
        kickedBy: ws.username
      }));
      client.close();
    }
  });
  
  console.log("ADMIN", "User kicked", { kickedBy: ws.username, kickedUser: targetUsername });
  ws.send(JSON.stringify({ type: "success", message: `User ${targetUsername} has been kicked` }));
}

function handleAdminBanUser(ws, data) {
  if (!ws.username || !hasAdminPower(ws.username, 'canBanUsers')) {
    ws.send(JSON.stringify({ type: "error", code: 403, message: "Access denied" }));
    return;
  }

  const targetUsername = data.username;
  const reason = data.reason || 'No reason provided';
  if (!targetUsername) {
    ws.send(JSON.stringify({ type: "error", code: 400, message: "Username required" }));
    return;
  }

  // Add user to banned users
  bannedUsers.set(targetUsername.toLowerCase(), reason);

  // Find and disconnect the user
  wss.clients.forEach(client => {
    if (client.username && client.username.toLowerCase() === targetUsername.toLowerCase()) {
      client.send(JSON.stringify({
        type: "banned",
        message: `You have been banned by an admin. Reason: ${reason}`,
        bannedBy: ws.username
      }));
      client.close();
    }
  });

  console.log("ADMIN", "User banned", { bannedBy: ws.username, bannedUser: targetUsername, reason });
  ws.send(JSON.stringify({ type: "success", message: `User ${targetUsername} has been banned` }));
}

function handleAdminUnbanUser(ws, data) {
  if (!ws.username || !hasAdminPower(ws.username, 'canUnbanUsers')) {
    ws.send(JSON.stringify({ type: "error", code: 403, message: "Access denied" }));
    return;
  }

  const targetUsername = data.username;
  if (!targetUsername) {
    ws.send(JSON.stringify({ type: "error", code: 400, message: "Username required" }));
    return;
  }

  // Remove user from banned users
  if (bannedUsers.has(targetUsername.toLowerCase())) {
    bannedUsers.delete(targetUsername.toLowerCase());
    console.log("ADMIN", "User unbanned", { unbannedBy: ws.username, unbannedUser: targetUsername });
    ws.send(JSON.stringify({ type: "success", message: `User ${targetUsername} has been unbanned` }));
  } else {
    ws.send(JSON.stringify({ type: "error", code: 404, message: "User not found in ban list" }));
  }
}

function handleAdminMuteUser(ws, data) {
  if (!ws.username || !hasAdminPower(ws.username, 'canMuteUsers')) {
    ws.send(JSON.stringify({ type: "error", code: 403, message: "Access denied" }));
    return;
  }
  
  const targetUsername = data.username;
  if (!targetUsername) {
    ws.send(JSON.stringify({ type: "error", code: 400, message: "Username required" }));
    return;
  }
  
  // Add user to muted users
  mutedUsers.add(targetUsername.toLowerCase());
  
  console.log("ADMIN", "User muted", { mutedBy: ws.username, mutedUser: targetUsername });
  ws.send(JSON.stringify({ type: "success", message: `User ${targetUsername} has been muted` }));
}

function handleAdminViewAllGames(ws) {
  if (!ws.username || !hasAdminPower(ws.username, 'canViewAllGames')) {
    ws.send(JSON.stringify({ type: "error", code: 403, message: "Access denied" }));
    return;
  }
  
  const games = [];
  rooms.forEach((game, roomId) => {
    games.push({
      roomId,
      white: game.white,
      black: game.black,
      fen: game.fen,
      status: game.status
    });
  });
  
  ws.send(JSON.stringify({ type: "allGames", games }));
}

function handleAdminExecuteCommand(ws, data) {
  if (!ws.username || !hasAdminPower(ws.username, 'canExecuteCommands')) {
    ws.send(JSON.stringify({ type: "error", code: 403, message: "Access denied" }));
    return;
  }
  
  const command = data.command;
  if (!command) {
    ws.send(JSON.stringify({ type: "error", code: 400, message: "Command required" }));
    return;
  }
  
  console.log("ADMIN", "Executing command", { executedBy: ws.username, command });
  
  try {
    // Basic command execution
    let result;
    switch (command.toLowerCase()) {
      case 'clear all bans':
        bannedUsers.clear();
        result = 'All bans cleared';
        break;
      case 'clear all mutes':
        mutedUsers.clear();
        result = 'All mutes cleared';
        break;
      case 'get player count':
        result = `Players online: ${wss.clients.size}`;
        break;
      default:
        result = `Unknown command: ${command}`;
    }
    
    ws.send(JSON.stringify({ type: "commandResult", result }));
  } catch (error) {
    console.error("Error executing command:", error);
    ws.send(JSON.stringify({ type: "error", code: 500, message: "Failed to execute command" }));
  }
}
