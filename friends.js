// friends.js - Friends System
// This module handles all friend-related functionality

// DOM Elements
const friendsModal = document.getElementById('friends-modal');
const closeFriendsBtn = document.getElementById('close-friends-btn');
const friendsList = document.getElementById('friends-list');
const friendRequestsList = document.getElementById('friend-requests-list');
const addFriendInput = document.getElementById('add-friend-input');
const addFriendBtn = document.getElementById('add-friend-btn');

// Open friends modal
function openFriendsModal() {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: 'getFriends' }));
    friendsModal.classList.remove('hidden');
    friendsModal.classList.add('show');
  } else {
    popup('Please connect to server first.', 'yellow');
  }
}

// Close friends modal
function closeFriendsModal() {
  friendsModal.classList.remove('show');
  friendsModal.classList.add('hidden');
}

// Check for online status changes and show notifications
function checkOnlineStatusChanges(friends, onlineFriends) {
  const previousOnlineFriends = JSON.parse(localStorage.getItem('onlineFriends') || '[]');
  
  // Check for friends who came online
  onlineFriends.forEach(friend => {
    if (!previousOnlineFriends.includes(friend)) {
      popup(`${friend} is now online!`, 'green');
    }
  });
  
  // Check for friends who went offline
  previousOnlineFriends.forEach(friend => {
    if (!onlineFriends.includes(friend)) {
      popup(`${friend} went offline`, 'yellow');
    }
  });
}

// Render friends list
function renderFriendsList(friends, onlineFriends) {
  friendsList.innerHTML = '';
  
  // Store online friends in localStorage for use in other functions
  localStorage.setItem('onlineFriends', JSON.stringify(onlineFriends));
  // Store all friends for comparison
  localStorage.setItem('allFriends', JSON.stringify(friends));

  if (friends.length === 0) {
    friendsList.innerHTML = '<li class="no-friends">No friends yet. Add some friends to get started!</li>';
    return;
  }

  friends.forEach(friend => {
    const friendItem = document.createElement('li');
    friendItem.className = 'friend-item';

    const isOnline = onlineFriends.includes(friend);
    const statusClass = isOnline ? 'online' : '';
    const statusText = isOnline ? 'Online' : 'Offline';

    friendItem.innerHTML = `
      <div class="friend-info">
        <span class="friend-name">${friend}</span>
        <span class="friend-status ${statusClass}">${statusText}</span>
      </div>
      <div class="friend-actions">
        <button class="friend-btn invite-btn" data-friend="${friend}" ${!isOnline ? 'disabled' : ''}>Invite</button>
        <button class="friend-btn join-btn" data-friend="${friend}" ${!isOnline ? 'disabled' : ''}>Join</button>
        <button class="friend-btn block-btn" data-friend="${friend}">Block</button>
        <button class="friend-btn remove-friend-btn" data-friend="${friend}">Remove</button>
      </div>
    `;

    friendsList.appendChild(friendItem);
  });

  // Add event listeners to all friend action buttons
  document.querySelectorAll('.invite-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const friendUsername = e.target.dataset.friend;
      inviteFriend(friendUsername);
    });
  });

  document.querySelectorAll('.join-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const friendUsername = e.target.dataset.friend;
      joinFriend(friendUsername);
    });
  });

  document.querySelectorAll('.block-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const friendUsername = e.target.dataset.friend;
      blockUser(friendUsername);
    });
  });

  document.querySelectorAll('.remove-friend-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const friendUsername = e.target.dataset.friend;
      removeFriend(friendUsername);
    });
  });
}

// Render friend requests
function renderFriendRequests(requests) {
  const requestsList = document.getElementById('friend-requests-list');
  if (!requestsList) return;
  
  requestsList.innerHTML = '';

  if (requests.length === 0) {
    requestsList.innerHTML = `
      <li class="empty-state">
        <div class="empty-state-icon">📨</div>
        <div class="empty-state-text">No pending friend requests</div>
        <div class="empty-state-subtext">When someone sends you a request, it will appear here</div>
      </li>
    `;
    return;
  }

  requests.forEach(request => {
    const requestItem = document.createElement('li');
    requestItem.className = 'friend-item';

    requestItem.innerHTML = `
      <div class="friend-info">
        <span class="friend-name">${request.from}</span>
        <span class="friend-status">Wants to be friends</span>
      </div>
      <div class="friend-actions">
        <button class="friend-btn accept-btn" data-from="${request.from}">Accept</button>
        <button class="friend-btn reject-btn" data-from="${request.from}">Reject</button>
      </div>
    `;

    requestsList.appendChild(requestItem);
  });

  // Add event listeners
  document.querySelectorAll('.accept-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const from = e.target.dataset.from;
      acceptFriendRequest(from);
    });
  });

  document.querySelectorAll('.reject-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const from = e.target.dataset.from;
      rejectFriendRequest(from);
    });
  });
}

// Render blocked users
function renderBlockedUsers(blocked) {
  const blockedList = document.getElementById('blocked-list');
  if (!blockedList) return;
  
  blockedList.innerHTML = '';

  if (blocked.length === 0) {
    blockedList.innerHTML = `
      <li class="empty-state">
        <div class="empty-state-icon">🚫</div>
        <div class="empty-state-text">No blocked users</div>
        <div class="empty-state-subtext">Users you block will appear here</div>
      </li>
    `;
    return;
  }

  blocked.forEach(user => {
    const blockedItem = document.createElement('li');
    blockedItem.className = 'friend-item';

    blockedItem.innerHTML = `
      <div class="friend-info">
        <span class="friend-name">${user}</span>
        <span class="friend-status">Blocked</span>
      </div>
      <div class="friend-actions">
        <button class="friend-btn unblock-btn" data-user="${user}">Unblock</button>
      </div>
    `;

    blockedList.appendChild(blockedItem);
  });

  // Add event listeners
  document.querySelectorAll('.unblock-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const user = e.target.dataset.user;
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
      popup(`${username} unblocked`, 'green');
    } else {
      popup('Please connect to server first.', 'yellow');
    }
  }
}

// Invite friend to game
function inviteFriend(friendUsername) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    // Check if friend is online
    const onlineFriends = JSON.parse(localStorage.getItem('onlineFriends') || '[]');
    if (!onlineFriends.includes(friendUsername)) {
      popup(`${friendUsername} is currently offline. Cannot send invitation.`, 'yellow');
      return;
    }
    
    // Check if user is in a room
    if (!window.roomId) {
      popup('You need to be in a room to invite friends. Please create or join a room first.', 'yellow');
      return;
    }
    
    // Send invitation message to server
    socket.send(JSON.stringify({
      type: 'invite',
      username: friendUsername
    }));
    popup(`Game invitation sent to ${friendUsername}!`, 'green');
  } else {
    popup('Please connect to server first.', 'yellow');
  }
}

// Join friend's game
function joinFriend(friendUsername) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    // Check if friend is online
    const onlineFriends = JSON.parse(localStorage.getItem('onlineFriends') || '[]');
    if (!onlineFriends.includes(friendUsername)) {
      popup(`${friendUsername} is currently offline. Cannot join game.`, 'yellow');
      return;
    }
    
    // Send a chat message to request to join
    socket.send(JSON.stringify({
      type: 'chat',
      message: `🎮 ${friendUsername}, I'd like to join your game! What room are you in?`
    }));
    popup(`Request sent to ${friendUsername}! Please wait for them to share the room ID.`, 'blue');
  } else {
    popup('Please connect to server first.', 'yellow');
  }
}

// Block user
function blockUser(username) {
  if (confirm(`Are you sure you want to block ${username}?`)) {
    // Store blocked users in localStorage
    let blockedUsers = JSON.parse(localStorage.getItem('blockedUsers') || '[]');
    
    if (!blockedUsers.includes(username)) {
      blockedUsers.push(username);
      localStorage.setItem('blockedUsers', JSON.stringify(blockedUsers));
      popup(`${username} blocked`, 'orange');
      
      // Remove from friends if they are a friend
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: 'removeFriend',
          friendUsername: username
        }));
        // Refresh friends list
        socket.send(JSON.stringify({ type: 'getFriends' }));
      }
      
      // Update blocked users list display
      renderBlockedUsers(blockedUsers);
    } else {
      popup(`${username} is already blocked`, 'yellow');
    }
  }
}

// Add friend
function addFriend() {
  const friendUsername = addFriendInput.value.trim();

  if (!friendUsername) {
    popup('Please enter a username', 'yellow');
    return;
  }

  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      type: 'sendFriendRequest',
      friendUsername: friendUsername
    }));
    addFriendInput.value = '';
    popup('Friend request sent!', 'green');
  } else {
    popup('Please connect to server first.', 'yellow');
  }
}

// Remove friend
function removeFriend(friendUsername) {
  if (confirm(`Are you sure you want to remove ${friendUsername} from your friends?`)) {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'removeFriend',
        friendUsername: friendUsername
      }));
      popup(`${friendUsername} removed from friends`, 'green');
    } else {
      popup('Please connect to server first.', 'yellow');
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
    popup(`You are now friends with ${from}!`, 'green');
  } else {
    popup('Please connect to server first.', 'yellow');
  }
}

// Reject friend request
function rejectFriendRequest(from) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      type: 'rejectFriendRequest',
      from: from
    }));
    popup(`Friend request from ${from} rejected`, 'orange');
  } else {
    popup('Please connect to server first.', 'yellow');
  }
}

// Show friend request notification
function showFriendRequestNotification(from) {
  const notification = document.createElement('div');
  notification.className = 'friend-request-notification';
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #4CAF50;
    color: white;
    padding: 15px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    z-index: 10000;
    animation: slideIn 0.3s ease-out;
  `;

  notification.innerHTML = `
    <div style="margin-bottom: 10px; font-weight: bold;">${from} wants to be your friend!</div>
    <div style="display: flex; gap: 10px;">
      <button id="accept-${from}" style="padding: 5px 15px; background: white; color: #4CAF50; border: none; border-radius: 4px; cursor: pointer;">Accept</button>
      <button id="reject-${from}" style="padding: 5px 15px; background: rgba(255,255,255,0.3); color: white; border: none; border-radius: 4px; cursor: pointer;">Reject</button>
    </div>
  `;

  document.body.appendChild(notification);

  document.getElementById(`accept-${from}`).addEventListener('click', () => {
    acceptFriendRequest(from);
    // Add fade-out animation
    notification.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
    notification.style.opacity = '0';
    notification.style.transform = 'translateX(100%)';
    setTimeout(() => {
      notification.remove();
    }, 300);
  });

  document.getElementById(`reject-${from}`).addEventListener('click', () => {
    rejectFriendRequest(from);
    // Add fade-out animation
    notification.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
    notification.style.opacity = '0';
    notification.style.transform = 'translateX(100%)';
    setTimeout(() => {
      notification.remove();
    }, 300);
  });

  // Auto-remove after 30 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 30000);
}

// Handle friend-related WebSocket messages
function handleFriendMessages(data) {
  switch (data.type) {
    case 'friendsList':
      renderFriendsList(data.friends, data.onlineFriends);
      // Load and render blocked users from localStorage
      const blockedUsers = JSON.parse(localStorage.getItem('blockedUsers') || '[]');
      renderBlockedUsers(blockedUsers);
      // Check for online status changes and show notifications
      checkOnlineStatusChanges(data.friends, data.onlineFriends);
      break;

    case 'friendRequest':
      showFriendRequestNotification(data.from);
      popup(`Friend request from ${data.from}`, 'green');
      break;

    case 'friendRequestSent':
      popup(data.message, 'green');
      break;

    case 'friendAccepted':
      popup(`You are now friends with ${data.friend}!`, 'green');
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'getFriends' }));
      }
      break;

    case 'friendRequestRejected':
      popup(data.message || 'Friend request rejected', 'orange');
      break;

    case 'friendRemoved':
      popup(`${data.friend} removed from friends`, 'orange');
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'getFriends' }));
      }
      break;

    default:
      break;
  }
}

// Event listeners
const friendsBtnElement = document.getElementById('friends-btn');
if (friendsBtnElement) {
  friendsBtnElement.addEventListener('click', openFriendsModal);
}

// Friends navigation buttons
document.querySelectorAll('.friends-nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    // Remove active class from all buttons
    document.querySelectorAll('.friends-nav-btn').forEach(b => b.classList.remove('active'));
    // Add active class to clicked button
    btn.classList.add('active');
    
    // Hide all sections
    document.querySelectorAll('.friends-section').forEach(section => {
      section.classList.remove('active');
    });
    
    // Show selected section
    const sectionId = btn.dataset.section + '-section';
    const section = document.getElementById(sectionId);
    if (section) {
      section.classList.add('active');
    }
  });
});



closeFriendsBtn.addEventListener('click', closeFriendsModal);
addFriendBtn.addEventListener('click', addFriend);
if (addFriendInput) {
  addFriendInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      addFriend();
    }
  });
}

// Close modal on outside click
friendsModal.addEventListener('click', (e) => {
  if (e.target === friendsModal) {
    closeFriendsModal();
  }
});

// Add CSS animation for notifications
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
`;
document.head.appendChild(style);
