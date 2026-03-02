// Handle deleteAccount - Fixed Version
// Replace the handleDeleteAccount function in server-enhanced.cjs with this code

function handleDeleteAccount(ws, clientId, data) {
  const client = clients.get(clientId);
  if (!client || !client.username) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Not authenticated'
    }));
    return;
  }

  const username = data.username;
  if (!username) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Username is required'
    }));
    return;
  }

  // Verify the user is deleting their own account
  if (client.username.toLowerCase() !== username.toLowerCase()) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'You can only delete your own account'
    }));
    return;
  }

  // Delete user from server
  const success = userManager.deleteUser(username);

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
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Failed to delete account'
    }));
  }
}
