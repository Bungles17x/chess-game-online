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
    showAlert('Connection error. Please try again.');
  }
}

// Close friends modal
function closeFriendsModal() {
  friendsModal.classList.remove('show');
  friendsModal.classList.add('hidden');
}

// Render friends list
function renderFriendsList(friends, onlineFriends) {
  friendsList.innerHTML = '';

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
        <button class="friend-btn remove-friend-btn" data-friend="${friend}">Remove</button>
      </div>
    `;

    friendsList.appendChild(friendItem);
  });

  // Add event listeners to remove buttons
  document.querySelectorAll('.remove-friend-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const friendUsername = e.target.dataset.friend;
      removeFriend(friendUsername);
    });
  });
}

// Add friend
function addFriend() {
  const friendUsername = addFriendInput.value.trim();

  if (!friendUsername) {
    showAlert('Please enter a username');
    return;
  }

  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      type: 'sendFriendRequest',
      friendUsername: friendUsername
    }));
    addFriendInput.value = '';
  } else {
    showAlert('Connection error. Please try again.');
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
    } else {
      showAlert('Connection error. Please try again.');
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
  } else {
    showAlert('Connection error. Please try again.');
  }
}

// Reject friend request
function rejectFriendRequest(from) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      type: 'rejectFriendRequest',
      from: from
    }));
  } else {
    showAlert('Connection error. Please try again.');
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
    notification.remove();
  });

  document.getElementById(`reject-${from}`).addEventListener('click', () => {
    rejectFriendRequest(from);
    notification.remove();
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
      break;

    case 'friendRequest':
      showFriendRequestNotification(data.from);
      showAlert(`Friend request from ${data.from}`, 'green');
      break;

    case 'friendRequestSent':
      showAlert(data.message, 'green');
      break;

    case 'friendAccepted':
      showAlert(`You are now friends with ${data.friend}!`, 'green');
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'getFriends' }));
      }
      break;

    case 'friendRequestRejected':
      showAlert(data.message || 'Friend request rejected', 'orange');
      break;

    case 'friendRemoved':
      showAlert(`${data.friend} removed from friends`, 'orange');
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

closeFriendsBtn.addEventListener('click', closeFriendsModal);
addFriendBtn.addEventListener('click', addFriend);
addFriendInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    addFriend();
  }
});

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
