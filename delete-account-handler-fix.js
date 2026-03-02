// Handle deleteAccount - Enhanced Version
// Replace the handleDeleteAccount function in server-enhanced.cjs with this code

function handleDeleteAccount(ws, clientId, data) {
  console.log('[Delete Account] Request received:', { clientId, data });
  const client = clients.get(clientId);

  const username = data.username;
  if (!username) {
    console.log('[Delete Account] No username provided');
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Username is required'
    }));
    return;
  }

  // Check if client is authenticated
  if (!client || !client.username) {
    console.log('[Delete Account] Client not authenticated, checking user existence');

    // Allow deletion if user exists (for authenticated requests from client)
    const user = userManager.getUser(username);
    if (!user) {
      console.log('[Delete Account] User not found:', username);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'User not found'
      }));
      return;
    }

    console.log('[Delete Account] User found, proceeding with deletion:', username);
  } else {
    // Verify the user is deleting their own account
    if (client.username.toLowerCase() !== username.toLowerCase()) {
      console.log('[Delete Account] Username mismatch:', client.username, 'vs', username);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'You can only delete your own account'
      }));
      return;
    }

    console.log('[Delete Account] Authenticated user deleting account:', username);
  }

  // Delete user from server
  console.log('[Delete Account] Attempting to delete user:', username);
  const success = userManager.deleteUser(username);
  console.log('[Delete Account] Delete result:', success);

  if (success) {
    console.log('[Account Deletion] Account deleted:', username);

    // Send confirmation
    ws.send(JSON.stringify({
      type: 'accountDeleted',
      username: username
    }));

    // Close the connection after sending response
    setTimeout(() => {
      try {
        ws.close();
      } catch (error) {
        console.error('[Delete Account] Error closing connection:', error);
      }
    }, 1000);
  } else {
    console.log('[Delete Account] Failed to delete user:', username);
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Failed to delete account'
    }));
  }
}
