// server.cjs - Enhanced Version
// Improved server with better security, error handling, and performance

require('dotenv').config({ path: './twilio.env' });
const WebSocket = require('ws');
const { Chess } = require('chess.js');
const twilio = require('twilio');
const userManager = require('./user-manager');
const userSyncHandlers = require('./user-sync-handlers');
const reportingSystem = require('./reporting-system');
const notificationSystem = require('./notification-system');

// Security: Rate limiting and request validation
const rateLimiter = new Map();
const MAX_REQUESTS_PER_MINUTE = 60;
const REQUEST_WINDOW = 60000; // 1 minute

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
  console.log('Twilio client initialized successfully');
} else {
  console.warn('Twilio credentials not configured. SMS notifications will not be available.');
}

// Rate limiting function
function checkRateLimit(ws, username) {
  const now = Date.now();
  const userRequests = rateLimiter.get(username) || [];

  // Remove requests older than the time window
  const recentRequests = userRequests.filter(time => now - time < REQUEST_WINDOW);

  if (recentRequests.length >= MAX_REQUESTS_PER_MINUTE) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Too many requests. Please wait a moment.'
    }));
    return false;
  }

  recentRequests.push(now);
  rateLimiter.set(username, recentRequests);
  return true;
}

// Validate message structure
function validateMessage(message) {
  console.log('[Validate Message] Received:', message);
  
  if (!message || typeof message !== 'object') {
    console.log('[Validate Message] Failed: not an object');
    return false;
  }

  if (!message.type || typeof message.type !== 'string') {
    console.log('[Validate Message] Failed: invalid type');
    return false;
  }

  console.log('[Validate Message] Passed for type:', message.type);
  return true;
}

// Sanitize user input
function sanitizeInput(input) {
  if (typeof input !== 'string') return input;

  // Remove potentially dangerous characters
  return input
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '');
}

// Track banned users
const bannedUsers = new Map();

// Track active games
const activeGames = new Map();

// Track connected clients
const clients = new Map();

// Track rooms
const rooms = new Map();

// Create WebSocket server
const wss = new WebSocket.Server({
  port: process.env.PORT || 8080,
  perMessageDeflate: false
});

console.log('WebSocket server started on port', process.env.PORT || 8080);

// Connection handling
wss.on('connection', (ws) => {
  console.log('New client connected');

  // Generate unique client ID
  const clientId = Date.now() + Math.random().toString(36).substr(2, 9);
  clients.set(clientId, {
    ws,
    username: null,
    roomId: null,
    lastActivity: Date.now()
  });

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connected',
    clientId: clientId
  }));

  // Handle incoming messages
  ws.on('message', (message) => {
    try {
      console.log('[Message Handler] Raw message:', message.toString());
      const data = JSON.parse(message);
      console.log('[Message Handler] Parsed data:', data);

      // Validate message structure
      if (!validateMessage(data)) {
        console.warn('Invalid message structure:', data);
        return;
      }

      // Sanitize user input
      if (data.username) {
        data.username = sanitizeInput(data.username);
      }
      if (data.message) {
        data.message = sanitizeInput(data.message);
      }

      // Check rate limit
      if (data.username && !checkRateLimit(ws, data.username)) {
        return;
      }

      // Update client activity
      const client = clients.get(clientId);
      if (client) {
        client.lastActivity = Date.now();
      }

      // Handle different message types
      console.log('[Switch] Processing message type:', data.type);
      switch (data.type) {
        case 'authenticate':
          console.log('[Switch] Handling authenticate');
          handleAuthenticate(ws, clientId, data);
          break;
        case 'login':
          console.log('[Switch] Handling login');
          handleLogin(ws, clientId, data);
          break;
        case 'register':
          handleRegister(ws, clientId, data);
          break;
        case 'createRoom':
          handleCreateRoom(ws, clientId, data);
          break;
        case 'joinRoom':
          handleJoinRoom(ws, clientId, data);
          break;
        case 'leaveRoom':
          handleLeaveRoom(ws, clientId);
          break;
        case 'move':
          handleMove(ws, clientId, data);
          break;
        case 'chat':
          handleChat(ws, clientId, data);
          break;
        case 'invite':
          handleInvite(ws, clientId, data);
          break;
        case 'getRooms':
          handleGetRooms(ws);
          break;
        case 'getFriends':
          handleGetFriends(ws, clientId);
          break;
        case 'addFriend':
          handleAddFriend(ws, clientId, data);
          break;
        case 'acceptFriend':
          handleAcceptFriend(ws, clientId, data);
          break;
        case 'rejectFriend':
          handleRejectFriend(ws, clientId, data);
          break;
        case 'removeFriend':
          handleRemoveFriend(ws, clientId, data);
          break;
        case 'blockUser':
          handleBlockUser(ws, clientId, data);
          break;
        case 'unblockUser':
          handleUnblockUser(ws, clientId, data);
          break;
        case 'getFriendRequests':
          handleGetFriendRequests(ws, clientId);
          break;
        case 'getBlockedUsers':
          handleGetBlockedUsers(ws, clientId);
          break;
        case 'report':
          handleReport(ws, clientId, data);
          break;
        case 'draw':
          handleDraw(ws, clientId);
          break;
        case 'resign':
          handleResign(ws, clientId);
          break;
        case 'ping':
          handlePing(ws);
          break;
        case 'syncUserData':
          console.log('[Switch] Handling syncUserData');
          handleSyncUserData(ws, clientId, data);
          break;
        case 'syncFriends':
          console.log('[Switch] Handling syncFriends');
          handleSyncFriends(ws, clientId);
          break;
        case 'syncSavedGames':
          console.log('[Switch] Handling syncSavedGames');
          handleSyncSavedGames(ws, clientId);
          break;
        case 'syncAchievements':
          console.log('[Switch] Handling syncAchievements');
          handleSyncAchievements(ws, clientId, data);
          break;
        case 'deleteAccount':
          console.log('[Switch] Handling deleteAccount');
          handleDeleteAccount(ws, clientId, data);
          break;
        case 'reportSystemFix':
          console.log('[Switch] Handling reportSystemFix');
          handleReportSystemFix(ws, data);
          break;
        default:
          console.warn('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('Error handling message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Internal server error'
      }));
    }
  });

  // Handle disconnection
  ws.on('close', () => {
    console.log('Client disconnected:', clientId);

    const client = clients.get(clientId);
    if (client) {
      // Leave room if in one
      if (client.roomId) {
        handleLeaveRoom(ws, clientId);
      }

      // Remove client
      clients.delete(clientId);
    }
  });

  // Handle errors
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Handle login
function handleLogin(ws, clientId, data) {
  const { username, email, password } = data;

  // Support both username-only and email/password login
  if (email && password) {
    // Email/password login
    const user = userManager.getUserByEmail(email);
    if (!user) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'User not found'
      }));
      return;
    }

    if (user.password !== password) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Incorrect password'
      }));
      return;
    }

    // Check if user is banned
    const bannedUser = bannedUsers.get(user.username.toLowerCase());
    if (bannedUser) {
      // Check if ban is permanent or not expired
      let isBanned = false;
      if (!bannedUser.duration) {
        isBanned = true;
      } else {
        let expiryTime;
        if (bannedUser.unit === 'hours') {
          expiryTime = bannedUser.bannedAt + (bannedUser.duration * 60 * 60 * 1000);
        } else {
          expiryTime = bannedUser.bannedAt + (bannedUser.duration * 24 * 60 * 60 * 1000);
        }
        isBanned = Date.now() <= expiryTime;
      }

      if (isBanned) {
        ws.send(JSON.stringify({
          type: 'userBanned',
          username: bannedUser.username,
          reason: bannedUser.reason,
          duration: bannedUser.duration,
          unit: bannedUser.unit,
          bannedAt: bannedUser.bannedAt
        }));
        return;
      } else {
        // Ban has expired, remove it
        bannedUsers.delete(user.username.toLowerCase());
      }
    }

    // Update client
    const client = clients.get(clientId);
    if (client) {
      client.username = user.username;
    }

    // Send success message with user data
    ws.send(JSON.stringify({
      type: 'loginSuccess',
      username: user.username,
      userData: user
    }));
    return;
  }

  // Username + password login
  if (username && password) {
    const user = userManager.getUser(username);
    if (!user) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'User not found'
      }));
      return;
    }

    if (user.password !== password) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Incorrect password'
      }));
      return;
    }
  }
  // Username-only login (original behavior)
  else if (!username || username.length < 3) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Invalid username'
    }));
    return;
  }

  // Check if user is banned
  const bannedUser = bannedUsers.get(username.toLowerCase());
  if (bannedUser) {
    // Check if ban is permanent or not expired
    let isBanned = false;
    if (!bannedUser.duration) {
      isBanned = true;
    } else {
      let expiryTime;
      if (bannedUser.unit === 'hours') {
        expiryTime = bannedUser.bannedAt + (bannedUser.duration * 60 * 60 * 1000);
      } else {
        expiryTime = bannedUser.bannedAt + (bannedUser.duration * 24 * 60 * 60 * 1000);
      }
      isBanned = Date.now() <= expiryTime;
    }

    if (isBanned) {
      ws.send(JSON.stringify({
        type: 'userBanned',
        username: bannedUser.username,
        reason: bannedUser.reason,
        duration: bannedUser.duration,
        unit: bannedUser.unit,
        bannedAt: bannedUser.bannedAt
      }));
      return;
    } else {
      // Ban has expired, remove it
      bannedUsers.delete(username.toLowerCase());
    }
  }

  // Update client
  const client = clients.get(clientId);
  if (client) {
    client.username = username;
  }

  // Send success message with user data
  const user = userManager.getUser(username);
  ws.send(JSON.stringify({
    type: 'loginSuccess',
    username: user.username,
    userData: user
  }));

  console.log('User logged in:', username);
}

// Handle registration
function handleRegister(ws, clientId, data) {
  const { username, email, password } = data;

  // Validate inputs
  if (!username || username.length < 3) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Username must be at least 3 characters'
    }));
    return;
  }

  if (!email || !email.includes('@')) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Please enter a valid email'
    }));
    return;
  }

  if (!password || password.length < 6) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Password must be at least 6 characters'
    }));
    return;
  }

  // Check if username already exists
  const existingUserByUsername = userManager.getUser(username);
  if (existingUserByUsername) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Username already taken'
    }));
    return;
  }

  // Check if email already exists
  const existingUserByEmail = userManager.getUserByEmail(email);
  if (existingUserByEmail) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Email already registered'
    }));
    return;
  }

  // Create new user
  const newUser = {
    username,
    email,
    password,
    avatar: '♟',
    level: 1,
    xp: 0,
    stats: {
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      currentStreak: 0
    },
    savedGames: [],
    createdAt: new Date().toISOString()
  };

  // Save user to server
  const saved = userManager.saveUser(newUser);
  if (!saved) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Failed to create account. Please try again.'
    }));
    return;
  }

  // Update client
  const client = clients.get(clientId);
  if (client) {
    client.username = username;
  }

  // Send success message with user data
  ws.send(JSON.stringify({
    type: 'registerSuccess',
    userData: newUser
  }));

  console.log('User registered:', username);
}

// Handle room creation
function handleCreateRoom(ws, clientId, data) {
  const client = clients.get(clientId);
  if (!client || !client.username) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Please login first'
    }));
    return;
  }

  // Check if user is already in a room
  if (client.roomId) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'You are already in a room'
    }));
    return;
  }

  // Create new room
  const roomId = Date.now().toString();
  const room = {
    id: roomId,
    host: client.username,
    players: [client.username],
    game: new Chess(),
    createdAt: Date.now()
  };

  rooms.set(roomId, room);
  client.roomId = roomId;

  // Send room info to host
  ws.send(JSON.stringify({
    type: 'roomCreated',
    roomId,
    room
  }));

  console.log('Room created:', roomId, 'by', client.username);
}

// Handle joining a room
function handleJoinRoom(ws, clientId, data) {
  const client = clients.get(clientId);
  if (!client || !client.username) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Please login first'
    }));
    return;
  }

  // Check if user is already in a room
  if (client.roomId) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'You are already in a room'
    }));
    return;
  }

  const { roomId } = data;
  const room = rooms.get(roomId);

  if (!room) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Room not found'
    }));
    return;
  }

  if (room.players.length >= 2) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Room is full'
    }));
    return;
  }

  // Add player to room
  room.players.push(client.username);
  client.roomId = roomId;

  // Notify all players in room
  room.players.forEach(player => {
    const playerClient = [...clients.values()].find(c => c.username === player);
    if (playerClient) {
      playerClient.ws.send(JSON.stringify({
        type: 'playerJoined',
        roomId,
        username: client.username,
        players: room.players
      }));
    }
  });

  console.log('Player joined room:', roomId, client.username);
}

// Handle leaving a room
function handleLeaveRoom(ws, clientId) {
  const client = clients.get(clientId);
  if (!client || !client.roomId) {
    return;
  }

  const room = rooms.get(client.roomId);
  if (!room) {
    client.roomId = null;
    return;
  }

  // Remove player from room
  room.players = room.players.filter(p => p !== client.username);
  client.roomId = null;

  // Notify remaining players
  room.players.forEach(player => {
    const playerClient = [...clients.values()].find(c => c.username === player);
    if (playerClient) {
      playerClient.ws.send(JSON.stringify({
        type: 'playerLeft',
        roomId: room.id,
        username: client.username,
        players: room.players
      }));
    }
  });

  // Delete room if empty
  if (room.players.length === 0) {
    rooms.delete(room.id);
    console.log('Room deleted:', room.id);
  }

  console.log('Player left room:', room.id, client.username);
}

// Handle chess move
function handleMove(ws, clientId, data) {
  const client = clients.get(clientId);
  if (!client || !client.roomId) {
    return;
  }

  const room = rooms.get(client.roomId);
  if (!room) {
    return;
  }

  try {
    const move = room.game.move(data.move);
    if (move) {
      // Broadcast move to all players in room
      room.players.forEach(player => {
        const playerClient = [...clients.values()].find(c => c.username === player);
        if (playerClient) {
          playerClient.ws.send(JSON.stringify({
            type: 'move',
            move: data.move,
            fen: room.game.fen(),
            player: client.username
          }));
        }
      });

      // Check for game end
      if (room.game.isGameOver()) {
        const result = room.game.isCheckmate() ? 'checkmate' : 
                     room.game.isDraw() ? 'draw' : 'stalemate';

        room.players.forEach(player => {
          const playerClient = [...clients.values()].find(c => c.username === player);
          if (playerClient) {
            playerClient.ws.send(JSON.stringify({
              type: 'gameOver',
              result,
              winner: room.game.turn() === 'w' ? 'black' : 'white'
            }));
          }
        });

        // Delete room after game ends
        rooms.delete(room.id);
      }
    }
  } catch (error) {
    console.error('Invalid move:', error);
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Invalid move'
    }));
  }
}

// Handle chat messages
function handleChat(ws, clientId, data) {
  const client = clients.get(clientId);
  if (!client || !client.username) {
    return;
  }

  const { message } = data;

  // Check for profanity
  if (containsProfanity(message)) {
    handleProfanityOffense(ws, client.username, message);
    return;
  }

  // Broadcast chat message to all clients in same room
  if (client.roomId) {
    const room = rooms.get(client.roomId);
    if (room) {
      room.players.forEach(player => {
        const playerClient = [...clients.values()].find(c => c.username === player);
        if (playerClient) {
          playerClient.ws.send(JSON.stringify({
            type: 'chat',
            username: client.username,
            message
          }));
        }
      });
    }
  } else {
    // Broadcast to all connected clients
    clients.forEach((c) => {
      c.ws.send(JSON.stringify({
        type: 'chat',
        username: client.username,
        message
      }));
    });
  }
}

// Handle game invitations
function handleInvite(ws, clientId, data) {
  const client = clients.get(clientId);
  if (!client || !client.username) {
    return;
  }

  const { username } = data;
  const invitedClient = [...clients.values()].find(c => c.username === username);

  if (!invitedClient) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'User not found'
    }));
    return;
  }

  // Send invitation
  invitedClient.ws.send(JSON.stringify({
    type: 'invitation',
    from: client.username
  }));

  console.log('Invitation sent from', client.username, 'to', username);
}

// Handle getting rooms list
function handleGetRooms(ws) {
  const roomList = [...rooms.values()].map(room => ({
    id: room.id,
    host: room.host,
    playerCount: room.players.length,
    createdAt: room.createdAt
  }));

  ws.send(JSON.stringify({
    type: 'roomsList',
    rooms: roomList
  }));
}

// Handle ping
function handlePing(ws) {
  ws.send(JSON.stringify({
    type: 'pong'
  }));
}

// Handle authenticate
function handleAuthenticate(ws, clientId, data) {
  const { username } = data;
  
  // Check if user exists
  const user = userManager.getUser(username);
  if (!user) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'User not found'
    }));
    return;
  }
  
  // Update client
  const client = clients.get(clientId);
  if (client) {
    client.username = user.username;
  }
  
  // Send success message
  ws.send(JSON.stringify({
    type: 'authenticated',
    username: user.username,
    userData: user
  }));
  
  console.log('User authenticated:', username);
}

// Handle syncUserData
function handleSyncUserData(ws, clientId, data) {
  const { userData } = data;
  
  if (!userData || !userData.username) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Invalid user data'
    }));
    return;
  }
  
  // Update user data
  userManager.updateUser(userData.username, userData);
  
  ws.send(JSON.stringify({
    type: 'userDataSynced',
    userData: userData
  }));
  
  console.log('User data synced:', userData.username);
}

// Handle syncFriends
function handleSyncFriends(ws, clientId) {
  const client = clients.get(clientId);
  if (!client || !client.username) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Not authenticated'
    }));
    return;
  }
  
  const user = userManager.getUser(client.username);
  const friends = user.friends || [];
  
  ws.send(JSON.stringify({
    type: 'friendsSynced',
    friends: friends
  }));
  
  console.log('Friends synced for:', client.username);
}

// Handle syncSavedGames
function handleSyncSavedGames(ws, clientId) {
  const client = clients.get(clientId);
  if (!client || !client.username) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Not authenticated'
    }));
    return;
  }
  
  const user = userManager.getUser(client.username);
  const savedGames = user.savedGames || [];
  
  ws.send(JSON.stringify({
    type: 'savedGamesSynced',
    savedGames: savedGames
  }));
  
  console.log('Saved games synced for:', client.username);
}

// Handle reportSystemFix
function handleReportSystemFix(ws, data) {
  console.log('[Report System Fix] Message:', data.message);
  
  ws.send(JSON.stringify({
    type: 'reportSystemFixAck',
    message: 'Report system fix acknowledged'
  }));
}

// Handle syncAchievements
function handleSyncAchievements(ws, clientId, data) {
  const client = clients.get(clientId);
  if (!client || !client.username) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Not authenticated'
    }));
    return;
  }
  
  const user = userManager.getUser(client.username);
  if (!user) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'User not found'
    }));
    return;
  }
  
  // Update achievements and rewards
  if (data.achievements) {
    user.achievements = data.achievements;
  }
  
  if (data.rewards) {
    user.rewards = data.rewards;
  }
  
  // Save updated user
  userManager.updateUser(user.username, user);
  
  // Send confirmation
  ws.send(JSON.stringify({
    type: 'achievementsSynced',
    achievements: user.achievements,
    rewards: user.rewards
  }));
  
  console.log('[Achievements] Synced for:', client.username);
}

// Handle deleteAccount
function handleDeleteAccount(ws, clientId, data) {
  console.log('[Delete Account] Request received:', { clientId, data });
  console.log('[Delete Account] Client info:', {
    hasClient: !!clients.get(clientId),
    clientUsername: clients.get(clientId)?.username,
    requestedUsername: data.username
  });
  const client = clients.get(clientId);
  
  const username = data.username;
  if (!username) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Username is required'
    }));
    return;
  }
  
  // Verify the user is deleting their own account
  // If client is not authenticated, check if user exists
  if (!client.username) {
    const user = userManager.getUser(username);
    if (!user) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'User not found'
      }));
      return;
    }
  } else if (client.username.toLowerCase() !== username.toLowerCase()) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'You can only delete your own account'
    }));
    return;
  }
  
  // Delete user from server
  console.log('[Delete Account] Attempting to delete user:', username);
  console.log('[Delete Account] User exists before deletion:', !!userManager.getUser(username));
  
  const success = userManager.deleteUser(username);
  console.log('[Delete Account] Delete result:', success);
  console.log('[Delete Account] User exists after deletion:', !!userManager.getUser(username));
  
  if (success) {
    console.log('[Account Deletion] Account deleted:', username);
    
    // Send confirmation
    ws.send(JSON.stringify({
      type: 'accountDeleted',
      username: username
    }));
    
    // Close the connection
    setTimeout(() => {
      ws.close();
    }, 1000);
  } else {
    console.log('[Delete Account] Failed to delete user:', username);
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Failed to delete account'
    }));
  }
}

// Clean up inactive clients periodically
setInterval(() => {
  const now = Date.now();
  const INACTIVE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

  clients.forEach((client, clientId) => {
    if (now - client.lastActivity > INACTIVE_TIMEOUT) {
      console.log('Removing inactive client:', clientId);
      client.ws.terminate();
      clients.delete(clientId);
    }
  });
}, 60000); // Check every minute

// Clean up old rooms periodically
setInterval(() => {
  const now = Date.now();
  const OLD_ROOM_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

  rooms.forEach((room, roomId) => {
    if (now - room.createdAt > OLD_ROOM_TIMEOUT) {
      console.log('Removing old room:', roomId);
      rooms.delete(roomId);
    }
  });
}, 3600000); // Check every hour

console.log('Server initialization complete');
