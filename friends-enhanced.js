// friends.js - Friends System - Enhanced Version
// This module handles all friend-related functionality with improved features

// DOM Elements
const friendsModal = document.getElementById('friends-modal');
const closeFriendsBtn = document.getElementById('close-friends-btn');
const friendsList = document.getElementById('friends-list');
const friendRequestsList = document.getElementById('friend-requests-list');
const addFriendInput = document.getElementById('add-friend-input');
const addFriendBtn = document.getElementById('add-friend-btn');

// State Management
const friendsState = {
  friends: [],
  onlineFriends: [],
  friendRequests: [],
  blockedUsers: [],
  lastUpdate: 0,
  updateInterval: 30000 // 30 seconds
};

// Initialize friends system
function initializeFriendsSystem() {
  // Load cached data
  loadCachedFriendsData();

  // Set up event listeners
  setupFriendsEventListeners();

  // Start automatic updates if modal is open
  if (friendsModal && !friendsModal.classList.contains('hidden')) {
    startFriendsUpdates();
  }
}

// Load cached friends data from localStorage
function loadCachedFriendsData() {
  try {
    const cachedFriends = localStorage.getItem('cachedFriends');
    const cachedOnlineFriends = localStorage.getItem('cachedOnlineFriends');
    const cachedRequests = localStorage.getItem('cachedFriendRequests');
    const cachedBlocked = localStorage.getItem('cachedBlockedUsers');

    if (cachedFriends) friendsState.friends = JSON.parse(cachedFriends);
    if (cachedOnlineFriends) friendsState.onlineFriends = JSON.parse(cachedOnlineFriends);
    if (cachedRequests) friendsState.friendRequests = JSON.parse(cachedRequests);
    if (cachedBlocked) friendsState.blockedUsers = JSON.parse(cachedBlocked);
  } catch (error) {
    console.error('Error loading cached friends data:', error);
  }
}

// Save friends data to localStorage
function saveFriendsData() {
  try {
    localStorage.setItem('cachedFriends', JSON.stringify(friendsState.friends));
    localStorage.setItem('cachedOnlineFriends', JSON.stringify(friendsState.onlineFriends));
    localStorage.setItem('cachedFriendRequests', JSON.stringify(friendsState.friendRequests));
    localStorage.setItem('cachedBlockedUsers', JSON.stringify(friendsState.blockedUsers));
    localStorage.setItem('friendsLastUpdate', Date.now().toString());
  } catch (error) {
    console.error('Error saving friends data:', error);
  }
}

// Setup friends event listeners
function setupFriendsEventListeners() {
  // Close button
  if (closeFriendsBtn) {
    closeFriendsBtn.addEventListener('click', closeFriendsModal);
  }

  // Add friend button
  if (addFriendBtn) {
    addFriendBtn.addEventListener('click', handleAddFriend);
  }

  // Add friend input (Enter key)
  if (addFriendInput) {
    addFriendInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handleAddFriend();
      }
    });
  }

  // Close modal on escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && friendsModal && !friendsModal.classList.contains('hidden')) {
      closeFriendsModal();
    }
  });
}

// Open friends modal
function openFriendsModal() {
  if (socket && socket.readyState === WebSocket.OPEN) {
    // Request fresh data from server
    socket.send(JSON.stringify({ type: 'getFriends' }));
    socket.send(JSON.stringify({ type: 'getFriendRequests' }));
    socket.send(JSON.stringify({ type: 'getBlockedUsers' }));

    // Show modal
    friendsModal.classList.remove('hidden');
    friendsModal.classList.add('show');

    // Start automatic updates
    startFriendsUpdates();

    // Render current data
    renderFriendsList();
    renderFriendRequests();
    renderBlockedUsers();
  } else {
    showNotification('Please connect to server first.', 'warning');
  }
}

// Close friends modal
function closeFriendsModal() {
  friendsModal.classList.remove('show');
  friendsModal.classList.add('hidden');
  // Stop automatic updates
  stopFriendsUpdates();
}

// Check for online status changes and show notifications
function checkOnlineStatusChanges() {
  const previousOnlineFriends = JSON.parse(localStorage.getItem('previousOnlineFriends') || '[]');

  // Check for friends who came online
  friendsState.onlineFriends.forEach(friend => {
    if (!previousOnlineFriends.includes(friend)) {
      showNotification(`${friend} is now online!`, 'success');
      // Play notification sound if enabled
      if (window.playNotificationSound) {
        window.playNotificationSound();
      }
    }
  });

  // Check for friends who went offline
  previousOnlineFriends.forEach(friend => {
    if (!friendsState.onlineFriends.includes(friend)) {
      showNotification(`${friend} went offline`, 'info');
    }
  });

  // Save current online friends for next comparison
  localStorage.setItem('previousOnlineFriends', JSON.stringify(friendsState.onlineFriends));
}

// Set up automatic friends list updates
let friendsUpdateInterval = null;

function startFriendsUpdates() {
  // Clear any existing interval
  if (friendsUpdateInterval) {
    clearInterval(friendsUpdateInterval);
  }

  // Update friends list every 30 seconds
  friendsUpdateInterval = setInterval(() => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'getFriends' }));
      socket.send(JSON.stringify({ type: 'getFriendRequests' }));
      socket.send(JSON.stringify({ type: 'getBlockedUsers' }));
    }
  }, friendsState.updateInterval);
}

function stopFriendsUpdates() {
  if (friendsUpdateInterval) {
    clearInterval(friendsUpdateInterval);
    friendsUpdateInterval = null;
  }
}

// Handle add friend
function handleAddFriend() {
  const username = addFriendInput.value.trim();

  if (!username) {
    showNotification('Please enter a username', 'warning');
    return;
  }

  if (username.length < 3) {
    showNotification('Username must be at least 3 characters', 'warning');
    return;
  }

  // Check if already friends
  if (friendsState.friends.includes(username)) {
    showNotification(`${username} is already your friend`, 'info');
    return;
  }

  // Check if user is blocked
  if (friendsState.blockedUsers.includes(username)) {
    showNotification(`You have blocked ${username}. Unblock them first.`, 'warning');
    return;
  }

  // Check if trying to add yourself
  const currentUser = getCurrentUser();
  if (currentUser && currentUser.username === username) {
    showNotification('You cannot add yourself as a friend', 'warning');
    return;
  }

  // Send friend request
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      type: 'addFriend',
      username: username
    }));
    showNotification(`Friend request sent to ${username}`, 'success');
    addFriendInput.value = '';
  } else {
    showNotification('Please connect to server first.', 'warning');
  }
}

// Render friends list
function renderFriendsList() {
  if (!friendsList) return;

  friendsList.innerHTML = '';

  if (friendsState.friends.length === 0) {
    friendsList.innerHTML = `
      <li class="empty-state">
        <div class="empty-state-icon">👥</div>
        <div class="empty-state-text">No friends yet</div>
        <div class="empty-state-subtext">Add some friends to get started!</div>
      </li>
    `;
    return;
  }

  // Sort friends: online first, then alphabetically
  const sortedFriends = [...friendsState.friends].sort((a, b) => {
    const aOnline = friendsState.onlineFriends.includes(a);
    const bOnline = friendsState.onlineFriends.includes(b);
    if (aOnline && !bOnline) return -1;
    if (!aOnline && bOnline) return 1;
    return a.localeCompare(b);
  });

  sortedFriends.forEach(friend => {
    const friendItem = document.createElement('li');
    friendItem.className = 'friend-item';

    const isOnline = friendsState.onlineFriends.includes(friend);
    const statusClass = isOnline ? 'online' : '';
    const statusText = isOnline ? 'Online' : 'Offline';

    friendItem.innerHTML = `
      <div class="friend-info">
        <div class="friend-avatar">${getFriendAvatar(friend)}</div>
        <div class="friend-details">
          <span class="friend-name">${friend}</span>
          <span class="friend-status ${statusClass}">${statusText}</span>
        </div>
      </div>
      <div class="friend-actions">
        <button class="friend-btn invite-btn" data-friend="${friend}" ${!isOnline ? 'disabled' : ''} title="Invite to game">
          <span class="btn-icon">🎮</span>
        </button>
        <button class="friend-btn join-btn" data-friend="${friend}" ${!isOnline ? 'disabled' : ''} title="Join game">
          <span class="btn-icon">🚪</span>
        </button>
        <button class="friend-btn block-btn" data-friend="${friend}" title="Block user">
          <span class="btn-icon">🚫</span>
        </button>
        <button class="friend-btn remove-friend-btn" data-friend="${friend}" title="Remove friend">
          <span class="btn-icon">🗑️</span>
        </button>
      </div>
    `;

    friendsList.appendChild(friendItem);
  });

  // Add event listeners to all friend action buttons
  attachFriendActionListeners();
}

// Get friend avatar (placeholder - can be enhanced with actual avatars)
function getFriendAvatar(username) {
  // Generate a consistent avatar based on username
  const avatars = ['♟', '♞', '♝', '♜', '♛', '♚'];
  const index = username.length % avatars.length;
  return avatars[index];
}

// Attach event listeners to friend action buttons
function attachFriendActionListeners() {
  document.querySelectorAll('.invite-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const friendUsername = e.target.closest('.invite-btn').dataset.friend;
      inviteFriend(friendUsername);
    });
  });

  document.querySelectorAll('.join-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const friendUsername = e.target.closest('.join-btn').dataset.friend;
      joinFriend(friendUsername);
    });
  });

  document.querySelectorAll('.block-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const friendUsername = e.target.closest('.block-btn').dataset.friend;
      blockUser(friendUsername);
    });
  });

  document.querySelectorAll('.remove-friend-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const friendUsername = e.target.closest('.remove-friend-btn').dataset.friend;
      removeFriend(friendUsername);
    });
  });
}

// Render friend requests
function renderFriendRequests() {
  if (!friendRequestsList) return;

  friendRequestsList.innerHTML = '';

  if (friendsState.friendRequests.length === 0) {
    friendRequestsList.innerHTML = `
      <li class="empty-state">
        <div class="empty-state-icon">📨</div>
        <div class="empty-state-text">No pending friend requests</div>
        <div class="empty-state-subtext">When someone sends you a request, it will appear here</div>
      </li>
    `;
    return;
  }

  friendsState.friendRequests.forEach(request => {
    const requestItem = document.createElement('li');
    requestItem.className = 'friend-item';

    requestItem.innerHTML = `
      <div class="friend-info">
        <div class="friend-avatar">${getFriendAvatar(request.from)}</div>
        <div class="friend-details">
          <span class="friend-name">${request.from}</span>
          <span class="friend-status">Wants to be friends</span>
        </div>
      </div>
      <div class="friend-actions">
        <button class="friend-btn accept-btn" data-from="${request.from}" title="Accept request">
          <span class="btn-icon">✓</span>
        </button>
        <button class="friend-btn reject-btn" data-from="${request.from}" title="Reject request">
          <span class="btn-icon">✗</span>
        </button>
      </div>
    `;

    friendRequestsList.appendChild(requestItem);
  });

  // Add event listeners
  document.querySelectorAll('.accept-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const from = e.target.closest('.accept-btn').dataset.from;
      acceptFriendRequest(from);
    });
  });

  document.querySelectorAll('.reject-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const from = e.target.closest('.reject-btn').dataset.from;
      rejectFriendRequest(from);
    });
  });
}

// Render blocked users
function renderBlockedUsers() {
  const blockedList = document.getElementById('blocked-list');
  if (!blockedList) return;

  blockedList.innerHTML = '';

  if (friendsState.blockedUsers.length === 0) {
    blockedList.innerHTML = `
      <li class="empty-state">
        <div class="empty-state-icon">🚫</div>
        <div class="empty-state-text">No blocked users</div>
        <div class="empty-state-subtext">Users you block will appear here</div>
      </li>
    `;
    return;
  }

  friendsState.blockedUsers.forEach(user => {
    const blockedItem = document.createElement('li');
    blockedItem.className = 'friend-item';

    blockedItem.innerHTML = `
      <div class="friend-info">
        <div class="friend-avatar">${getFriendAvatar(user)}</div>
        <div class="friend-details">
          <span class="friend-name">${user}</span>
          <span class="friend-status">Blocked</span>
        </div>
      </div>
      <div class="friend-actions">
        <button class="friend-btn unblock-btn" data-user="${user}" title="Unblock user">
          <span class="btn-icon">🔓</span>
        </button>
      </div>
    `;

    blockedList.appendChild(blockedItem);
  });

  // Add event listeners
  document.querySelectorAll('.unblock-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const user = e.target.closest('.unblock-btn').dataset.user;
      unblockUser(user);
    });
  });
}

// Unblock user
function unblockUser(username) {
  if (confirm(`Are you sure you want to unblock ${username}?`)) {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'unblockUser',
        username: username
      }));

      // Update local state
      const index = friendsState.blockedUsers.indexOf(username);
      if (index > -1) {
        friendsState.blockedUsers.splice(index, 1);
        saveFriendsData();
        renderBlockedUsers();
      }

      showNotification(`${username} unblocked`, 'success');
    } else {
      showNotification('Please connect to server first.', 'warning');
    }
  }
}

// Invite friend to game
function inviteFriend(friendUsername) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    // Check if friend is online
    if (!friendsState.onlineFriends.includes(friendUsername)) {
      showNotification(`${friendUsername} is currently offline. Cannot send invitation.`, 'warning');
      return;
    }

    // Check if user is in a room
    if (!window.roomId) {
      showNotification('You need to be in a room to invite friends. Please create or join a room first.', 'warning');
      return;
    }

    // Send invitation message to server
    socket.send(JSON.stringify({
      type: 'invite',
      username: friendUsername
    }));

    showNotification(`Invitation sent to ${friendUsername}!`, 'success');
  } else {
    showNotification('Please connect to server first.', 'warning');
  }
}

// Join friend's game
function joinFriend(friendUsername) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    // Check if friend is online
    if (!friendsState.onlineFriends.includes(friendUsername)) {
      showNotification(`${friendUsername} is currently offline. Cannot join game.`, 'warning');
      return;
    }

    // Send a chat message to request to join
    socket.send(JSON.stringify({
      type: 'chat',
      message: `🎮 ${friendUsername}, I'd like to join your game! What room are you in?`
    }));

    showNotification(`Request sent to ${friendUsername}! Please wait for them to share room ID.`, 'info');
  } else {
    showNotification('Please connect to server first.', 'warning');
  }
}

// Remove friend
function removeFriend(username) {
  if (confirm(`Are you sure you want to remove ${username} from your friends list?`)) {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'removeFriend',
        username: username
      }));

      // Update local state
      const index = friendsState.friends.indexOf(username);
      if (index > -1) {
        friendsState.friends.splice(index, 1);
        saveFriendsData();
        renderFriendsList();
      }

      showNotification(`${username} removed from friends`, 'info');
    } else {
      showNotification('Please connect to server first.', 'warning');
    }
  }
}

// Block user
function blockUser(username) {
  if (confirm(`Are you sure you want to block ${username}? They won't be able to send you messages or friend requests.`)) {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'blockUser',
        username: username
      }));

      // Update local state
      if (!friendsState.blockedUsers.includes(username)) {
        friendsState.blockedUsers.push(username);
        saveFriendsData();
        renderBlockedUsers();
      }

      // Also remove from friends if they are a friend
      const friendIndex = friendsState.friends.indexOf(username);
      if (friendIndex > -1) {
        friendsState.friends.splice(friendIndex, 1);
        renderFriendsList();
      }

      showNotification(`${username} blocked`, 'success');
    } else {
      showNotification('Please connect to server first.', 'warning');
    }
  }
}

// Accept friend request
function acceptFriendRequest(from) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      type: 'acceptFriendRequest',
      from: from
    }));

    // Update local state
    const requestIndex = friendsState.friendRequests.findIndex(r => r.from === from);
    if (requestIndex > -1) {
      friendsState.friendRequests.splice(requestIndex, 1);
      if (!friendsState.friends.includes(from)) {
        friendsState.friends.push(from);
      }
      saveFriendsData();
      renderFriendRequests();
      renderFriendsList();
    }

    showNotification(`You are now friends with ${from}!`, 'success');
  } else {
    showNotification('Please connect to server first.', 'warning');
  }
}

// Reject friend request
function rejectFriendRequest(from) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      type: 'rejectFriendRequest',
      from: from
    }));

    // Update local state
    const requestIndex = friendsState.friendRequests.findIndex(r => r.from === from);
    if (requestIndex > -1) {
      friendsState.friendRequests.splice(requestIndex, 1);
      saveFriendsData();
      renderFriendRequests();
    }

    showNotification(`Friend request from ${from} rejected`, 'info');
  } else {
    showNotification('Please connect to server first.', 'warning');
  }
}

// Handle friends-related messages from server
function handleFriendsMessage(data) {
  switch (data.type) {
    case 'friends':
      friendsState.friends = data.friends || [];
      friendsState.onlineFriends = data.onlineFriends || [];
      checkOnlineStatusChanges();
      renderFriendsList();
      saveFriendsData();
      break;

    case 'friendRequests':
      friendsState.friendRequests = data.requests || [];
      renderFriendRequests();
      saveFriendsData();
      break;

    case 'blockedUsers':
      friendsState.blockedUsers = data.blocked || [];
      renderBlockedUsers();
      saveFriendsData();
      break;

    case 'friendAdded':
      if (!friendsState.friends.includes(data.username)) {
        friendsState.friends.push(data.username);
        renderFriendsList();
        saveFriendsData();
        showNotification(`${data.username} added to friends!`, 'success');
      }
      break;

    case 'friendRemoved':
      const removeIndex = friendsState.friends.indexOf(data.username);
      if (removeIndex > -1) {
        friendsState.friends.splice(removeIndex, 1);
        renderFriendsList();
        saveFriendsData();
        showNotification(`${data.username} removed from friends`, 'info');
      }
      break;

    case 'friendRequestReceived':
      if (!friendsState.friendRequests.find(r => r.from === data.from)) {
        friendsState.friendRequests.push({ from: data.from });
        renderFriendRequests();
        saveFriendsData();
        showNotification(`New friend request from ${data.from}!`, 'info');
        // Play notification sound if enabled
        if (window.playNotificationSound) {
          window.playNotificationSound();
        }
      }
      break;

    case 'friendRequestAccepted':
      if (!friendsState.friends.includes(data.from)) {
        friendsState.friends.push(data.from);
        renderFriendsList();
        saveFriendsData();
        showNotification(`${data.from} accepted your friend request!`, 'success');
      }
      break;

    case 'friendRequestRejected':
      showNotification(`${data.from} rejected your friend request`, 'info');
      break;

    case 'userBlocked':
      if (!friendsState.blockedUsers.includes(data.username)) {
        friendsState.blockedUsers.push(data.username);
        renderBlockedUsers();
        saveFriendsData();
        showNotification(`${data.username} blocked`, 'success');
      }
      break;

    case 'userUnblocked':
      const unblockIndex = friendsState.blockedUsers.indexOf(data.username);
      if (unblockIndex > -1) {
        friendsState.blockedUsers.splice(unblockIndex, 1);
        renderBlockedUsers();
        saveFriendsData();
        showNotification(`${data.username} unblocked`, 'success');
      }
      break;
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initializeFriendsSystem);

// Export functions for use in other files
window.openFriendsModal = openFriendsModal;
window.closeFriendsModal = closeFriendsModal;
window.handleFriendsMessage = handleFriendsMessage;
