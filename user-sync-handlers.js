// User Synchronization Handlers
// These handlers manage cross-device profile synchronization

// Handle user data synchronization from client
function handleSyncUserData(ws, data, userManager, wss) {
  if (!ws.username) {
    ws.send(JSON.stringify({ type: "error", code: 401, message: "Not authenticated" }));
    return;
  }

  const userData = data.userData;
  if (!userData) {
    ws.send(JSON.stringify({ type: "error", code: 400, message: "User data required" }));
    return;
  }

  try {
    // Get existing user data from server
    const existingUser = userManager.getUser(ws.username);

    if (existingUser) {
      // Merge data - CLIENT DATA takes precedence for most fields
      const mergedData = {
        ...existingUser,  // Start with existing server data
        ...userData,  // Then overlay with client data (client data takes precedence)
        // Ensure username and email stay consistent
        username: existingUser.username,
        email: existingUser.email,
        password: existingUser.password,
        // Client data takes precedence for stats, friends, games
        stats: userData.stats || existingUser.stats,
        friends: userData.friends || existingUser.friends || [],
        savedGames: userData.savedGames || existingUser.savedGames || [],
        // Keep server-side timestamps
        createdAt: existingUser.createdAt,
        updatedAt: new Date().toISOString()
      };

      userManager.saveUser(mergedData);
      console.log('[User Sync] Updated user data:', ws.username);

      ws.send(JSON.stringify({ 
        type: "userDataSynced", 
        success: true,
        userData: mergedData
      }));
    } else {
      // Create new user
      userManager.saveUser(userData);
      console.log('[User Sync] Created new user:', ws.username);

      ws.send(JSON.stringify({ 
        type: "userDataSynced", 
        success: true,
        userData: userData
      }));
    }
  } catch (error) {
    console.error('[User Sync] Error syncing user data:', error);
    ws.send(JSON.stringify({ 
      type: "error", 
      code: 500, 
      message: "Failed to sync user data" 
    }));
  }
}

// Handle user profile update
function handleUpdateUserProfile(ws, data, userManager, wss) {
  if (!ws.username) {
    ws.send(JSON.stringify({ type: "error", code: 401, message: "Not authenticated" }));
    return;
  }

  const updates = data.updates;
  if (!updates) {
    ws.send(JSON.stringify({ type: "error", code: 400, message: "Updates required" }));
    return;
  }

  try {
    const user = userManager.getUser(ws.username);
    if (user) {
      // Apply updates
      const updatedUser = {
        ...user,
        ...updates,
        updatedAt: new Date().toISOString()
      };

      userManager.saveUser(updatedUser);
      console.log('[User Sync] Updated user profile:', ws.username);

      ws.send(JSON.stringify({ 
        type: "userProfileUpdated", 
        success: true,
        userData: updatedUser
      }));

      // Notify all connected devices of this user
      broadcastToUserDevices(ws.username, {
        type: "userProfileUpdated",
        userData: updatedUser
      }, wss);
    } else {
      ws.send(JSON.stringify({ type: "error", code: 404, message: "User not found" }));
    }
  } catch (error) {
    console.error('[User Sync] Error updating user profile:', error);
    ws.send(JSON.stringify({ 
      type: "error", 
      code: 500, 
      message: "Failed to update user profile" 
    }));
  }
}

// Handle get user profile request
function handleGetUserProfile(ws, data, userManager) {
  if (!ws.username) {
    ws.send(JSON.stringify({ type: "error", code: 401, message: "Not authenticated" }));
    return;
  }

  const targetUsername = data.username || ws.username;

  try {
    const user = userManager.getUser(targetUsername);
    if (user) {
      // Send only public profile data if requesting another user
      const isOwnProfile = targetUsername.toLowerCase() === ws.username.toLowerCase();
      const profileData = isOwnProfile ? user : {
        username: user.username,
        level: user.level,
        avatar: user.avatar,
        stats: user.stats
      };

      ws.send(JSON.stringify({ 
        type: "userProfile", 
        userData: profileData 
      }));
    } else {
      ws.send(JSON.stringify({ type: "error", code: 404, message: "User not found" }));
    }
  } catch (error) {
    console.error('[User Sync] Error getting user profile:', error);
    ws.send(JSON.stringify({ 
      type: "error", 
      code: 500, 
      message: "Failed to get user profile" 
    }));
  }
}

// Handle friends synchronization
function handleSyncFriends(ws, data, userManager) {
  if (!ws.username) {
    ws.send(JSON.stringify({ type: "error", code: 401, message: "Not authenticated" }));
    return;
  }

  try {
    const user = userManager.getUser(ws.username);
    if (user) {
      const friends = user.friends || [];

      ws.send(JSON.stringify({ 
        type: "friendsSynced", 
        friends: friends 
      }));
    } else {
      ws.send(JSON.stringify({ type: "error", code: 404, message: "User not found" }));
    }
  } catch (error) {
    console.error('[User Sync] Error syncing friends:', error);
    ws.send(JSON.stringify({ 
      type: "error", 
      code: 500, 
      message: "Failed to sync friends" 
    }));
  }
}

// Handle saved games synchronization
function handleSyncSavedGames(ws, data, userManager) {
  if (!ws.username) {
    ws.send(JSON.stringify({ type: "error", code: 401, message: "Not authenticated" }));
    return;
  }

  try {
    const user = userManager.getUser(ws.username);
    if (user) {
      const savedGames = user.savedGames || [];

      ws.send(JSON.stringify({ 
        type: "savedGamesSynced", 
        savedGames: savedGames 
      }));
    } else {
      ws.send(JSON.stringify({ type: "error", code: 404, message: "User not found" }));
    }
  } catch (error) {
    console.error('[User Sync] Error syncing saved games:', error);
    ws.send(JSON.stringify({ 
      type: "error", 
      code: 500, 
      message: "Failed to sync saved games" 
    }));
  }
}

// Broadcast message to all connected devices of a user
function broadcastToUserDevices(username, message, wss) {
  const messageStr = JSON.stringify(message);

  wss.clients.forEach(client => {
    if (client.username && client.username.toLowerCase() === username.toLowerCase()) {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(messageStr);
      }
    }
  });
}

module.exports = {
  handleSyncUserData,
  handleUpdateUserProfile,
  handleGetUserProfile,
  handleSyncFriends,
  handleSyncSavedGames,
  broadcastToUserDevices
};
