// Admin Enhancements - Reports, Friends, and Cheats
// This file adds enhanced functionality for admin users

(function() {
  "use strict";

  // Check if current user is admin
  function isAdmin() {
    const currentUser = localStorage.getItem('currentUser');
    return currentUser && JSON.parse(currentUser).username.toLowerCase() === 'bungles17x';
  }

  // ==================== REPORTS MANAGEMENT ====================

  // Add reports management button to menu
  function addReportsManagementButton() {
    if (!isAdmin()) return;

    const dropdown = document.querySelector('.dropdown-content');
    if (!dropdown) return;

    // Check if button already exists
    if (document.getElementById('reports-manage-btn')) return;

    const reportsBtn = document.createElement('button');
    reportsBtn.id = 'reports-manage-btn';
    reportsBtn.className = 'dropdown-item';
    reportsBtn.textContent = '📊 Manage Reports';
    reportsBtn.style.display = 'flex';
    reportsBtn.style.alignItems = 'center';
    reportsBtn.style.gap = '8px';

    reportsBtn.addEventListener('click', () => {
      if (typeof openReportsModal === 'function') {
        openReportsModal();
      } else {
        // Fallback: create simple modal
        createReportsModal();
      }
    });

    dropdown.appendChild(reportsBtn);
  }

  // Create reports modal if not available
  function createReportsModal() {
    const modal = document.createElement('div');
    modal.id = 'reports-modal-enhanced';
    modal.className = 'modal hidden';
    modal.innerHTML = `
      <div class="modal-content">
        <h2>📊 Reports Management</h2>
        <div id="reports-list-enhanced" class="reports-list"></div>
        <button id="close-reports-enhanced-btn" class="primary-btn">Close</button>
      </div>
    `;
    document.body.appendChild(modal);

    const closeBtn = document.getElementById('close-reports-enhanced-btn');
    closeBtn.addEventListener('click', () => {
      modal.classList.add('hidden');
    });

    // Load reports
    loadReports();
  }

  // Load and display reports
  function loadReports() {
    const reportsList = document.getElementById('reports-list-enhanced');
    if (!reportsList) return;

    if (window.socket && window.socket.readyState === WebSocket.OPEN) {
      window.socket.send(JSON.stringify({ type: 'getReports' }));
    }

    // Listen for reports
    const handleReports = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'reportsList') {
        displayReports(data.reports);
        window.socket.removeEventListener('message', handleReports);
      }
    };

    window.socket.addEventListener('message', handleReports);
  }

  // Display reports
  function displayReports(reports) {
    const reportsList = document.getElementById('reports-list-enhanced');
    if (!reportsList) return;

    reportsList.innerHTML = '';

    if (!reports || reports.length === 0) {
      reportsList.innerHTML = '<p class="no-reports">No reports found.</p>';
      return;
    }

    reports.forEach(report => {
      const reportItem = document.createElement('div');
      reportItem.className = 'report-item';
      reportItem.innerHTML = `
        <div class="report-header">
          <span class="report-id">#${report.id ? report.id.substring(0, 8) : 'Unknown'}</span>
          <span class="report-type">${report.reportType || 'Unknown'}</span>
          <span class="report-status status-${report.status || 'pending'}">${report.status || 'pending'}</span>
        </div>
        <div class="report-body">
          <p><strong>Reporter:</strong> ${report.reportedBy || 'Unknown'}</p>
          <p><strong>Reported:</strong> ${report.reportedUser || 'Unknown'}</p>
          <p><strong>Reason:</strong> ${report.reason || 'No reason'}</p>
          <p><strong>Description:</strong> ${report.description || 'No description'}</p>
          <p><strong>Time:</strong> ${report.timestamp ? new Date(report.timestamp).toLocaleString() : 'Unknown'}</p>
        </div>
        <div class="report-actions">
          <button class="primary-btn" onclick="viewReportDetails('${report.id}')">View Details</button>
          <button class="primary-btn" onclick="updateReportStatus('${report.id}')">Update Status</button>
          <button class="primary-btn" onclick="dismissReport('${report.id}')">Dismiss</button>
        </div>
      `;
      reportsList.appendChild(reportItem);
    });
  }

  // ==================== ENHANCED FRIENDS SYSTEM ====================

  // Add friends list similar to saved games
  function enhanceFriendsSystem() {
    const friendsModal = document.getElementById('friends-modal');
    if (!friendsModal) return;

    // Add tabs for friends
    const friendsContent = friendsModal.querySelector('.friends-content');
    if (!friendsContent) return;

    // Check if already enhanced
    if (document.getElementById('friends-tabs')) return;

    const tabsContainer = document.createElement('div');
    tabsContainer.id = 'friends-tabs';
    tabsContainer.className = 'tabs';
    tabsContainer.innerHTML = `
      <button class="tab-btn active" data-tab="friends-list">Friends</button>
      <button class="tab-btn" data-tab="friend-requests">Requests</button>
      <button class="tab-btn" data-tab="blocked-users">Blocked</button>
    `;

    friendsContent.insertBefore(tabsContainer, friendsContent.firstChild);

    // Create tab content containers
    const friendsSection = document.createElement('div');
    friendsSection.id = 'friends-list-tab';
    friendsSection.className = 'tab-content active';

    const requestsSection = document.createElement('div');
    requestsSection.id = 'friend-requests-tab';
    requestsSection.className = 'tab-content';

    const blockedSection = document.createElement('div');
    blockedSection.id = 'blocked-users-tab';
    blockedSection.className = 'tab-content';

    // Add tab functionality
    tabsContainer.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tabId = btn.dataset.tab;

        // Update active tab
        tabsContainer.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Show/hide content
        document.querySelectorAll('.tab-content').forEach(content => {
          content.classList.remove('active');
        });
        document.getElementById(tabId + '-tab').classList.add('active');
      });
    });

    // Load friends data
    loadFriendsData();
  }

  // Load friends data
  function loadFriendsData() {
    if (window.socket && window.socket.readyState === WebSocket.OPEN) {
      window.socket.send(JSON.stringify({ type: 'getFriends' }));
    }

    // Listen for friends data
    const handleFriends = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'friendsList') {
        displayFriendsList(data.friends);
        displayFriendRequests(data.requests);
        displayBlockedUsers(data.blocked);
        window.socket.removeEventListener('message', handleFriends);
      }
    };

    window.socket.addEventListener('message', handleFriends);
  }

  // Display friends list
  function displayFriendsList(friends) {
    const friendsList = document.getElementById('friends-list-tab');
    if (!friendsList) return;

    friendsList.innerHTML = '';

    if (!friends || friends.length === 0) {
      friendsList.innerHTML = '<p class="no-friends">No friends yet. Add some friends!</p>';
      return;
    }

    friends.forEach(friend => {
      const friendItem = document.createElement('div');
      friendItem.className = 'friend-item';
      friendItem.innerHTML = `
        <div class="friend-info">
          <span class="friend-name">${friend.username}</span>
          <span class="friend-status ${friend.online ? 'online' : 'offline'}">
            ${friend.online ? '🟢 Online' : '⚫ Offline'}
          </span>
        </div>
        <div class="friend-actions">
          <button class="friend-btn" onclick="challengeFriend('${friend.username}')">Challenge</button>
          <button class="friend-btn" onclick="chatWithFriend('${friend.username}')">Chat</button>
          <button class="friend-btn remove" onclick="removeFriend('${friend.username}')">Remove</button>
        </div>
      `;
      friendsList.appendChild(friendItem);
    });
  }

  // Display friend requests
  function displayFriendRequests(requests) {
    const requestsList = document.getElementById('friend-requests-tab');
    if (!requestsList) return;

    requestsList.innerHTML = '';

    if (!requests || requests.length === 0) {
      requestsList.innerHTML = '<p class="no-requests">No pending requests.</p>';
      return;
    }

    requests.forEach(request => {
      const requestItem = document.createElement('div');
      requestItem.className = 'friend-request-item';
      requestItem.innerHTML = `
        <div class="request-info">
          <span class="request-username">${request.username}</span>
          <span class="request-time">${request.timestamp ? new Date(request.timestamp).toLocaleString() : 'Unknown'}</span>
        </div>
        <div class="request-actions">
          <button class="friend-btn accept" onclick="acceptFriendRequest('${request.id}')">Accept</button>
          <button class="friend-btn decline" onclick="declineFriendRequest('${request.id}')">Decline</button>
        </div>
      `;
      requestsList.appendChild(requestItem);
    });
  }

  // Display blocked users
  function displayBlockedUsers(blocked) {
    const blockedList = document.getElementById('blocked-users-tab');
    if (!blockedList) return;

    blockedList.innerHTML = '';

    if (!blocked || blocked.length === 0) {
      blockedList.innerHTML = '<p class="no-blocked">No blocked users.</p>';
      return;
    }

    blocked.forEach(user => {
      const blockedItem = document.createElement('div');
      blockedItem.className = 'blocked-user-item';
      blockedItem.innerHTML = `
        <div class="blocked-info">
          <span class="blocked-username">${user.username}</span>
          <span class="blocked-reason">${user.reason || 'No reason'}</span>
        </div>
        <div class="blocked-actions">
          <button class="friend-btn" onclick="unblockUser('${user.username}')">Unblock</button>
        </div>
      `;
      blockedList.appendChild(blockedItem);
    });
  }

  // ==================== ADMIN CHEATS ====================

  // Add cheat menu for admin
  function addAdminCheatMenu() {
    if (!isAdmin()) return;

    // Create cheat menu button
    const cheatBtn = document.createElement('button');
    cheatBtn.id = 'admin-cheat-btn';
    cheatBtn.className = 'dropdown-item';
    cheatBtn.innerHTML = '🎮 Admin Cheats';
    cheatBtn.style.display = 'flex';
    cheatBtn.style.alignItems = 'center';
    cheatBtn.style.gap = '8px';

    const dropdown = document.querySelector('.dropdown-content');
    if (dropdown) {
      dropdown.appendChild(cheatBtn);
    }

    // Create cheat modal
    const cheatModal = document.createElement('div');
    cheatModal.id = 'admin-cheat-modal';
    cheatModal.className = 'modal hidden';
    cheatModal.innerHTML = `
      <div class="modal-content cheat-modal-content">
        <h2>🎮 Admin Cheats</h2>
        <div class="cheat-sections">
          <div class="cheat-section">
            <h3>Game Control</h3>
            <button class="cheat-btn" onclick="cheatUndoMove()">↩️ Undo Last Move</button>
            <button class="cheat-btn" onclick="cheatRedoMove()">↪️ Redo Move</button>
            <button class="cheat-btn" onclick="cheatSkipTurn()">⏭️ Skip Turn</button>
            <button class="cheat-btn" onclick="cheatAutoPlay()">🤖 Auto Play</button>
          </div>
          <div class="cheat-section">
            <h3>Piece Control</h3>
            <button class="cheat-btn" onclick="cheatRemovePiece()">❌ Remove Any Piece</button>
            <button class="cheat-btn" onclick="cheatMovePiece()">📍 Move Any Piece</button>
            <button class="cheat-btn" onclick="cheatPromotePawn()">♛ Promote Pawn</button>
            <button class="cheat-btn" onclick="cheatSpawnPiece()">➕ Spawn Piece</button>
          </div>
          <div class="cheat-section">
            <h3>Game State</h3>
            <button class="cheat-btn" onclick="cheatSetTime()">⏱️ Set Timer</button>
            <button class="cheat-btn" onclick="cheatAddTime()">➕ Add Time</button>
            <button class="cheat-btn" onclick="cheatResetGame()">🔄 Reset Game</button>
            <button class="cheat-btn" onclick="cheatEndGame()">🏁 End Game</button>
          </div>
          <div class="cheat-section">
            <h3>Special</h3>
            <button class="cheat-btn" onclick="cheatGodMode()">👑 God Mode</button>
            <button class="cheat-btn" onclick="cheatInfiniteTime()">∞ Infinite Time</button>
            <button class="cheat-btn" onclick="cheatSeeAllMoves()">👁️ See All Moves</button>
            <button class="cheat-btn" onclick="cheatAutoWin()">🏆 Auto Win</button>
          </div>
        </div>
        <button id="close-cheat-modal-btn" class="primary-btn">Close</button>
      </div>
    `;
    document.body.appendChild(cheatModal);

    // Add event listeners
    cheatBtn.addEventListener('click', () => {
      cheatModal.classList.remove('hidden');
    });

    document.getElementById('close-cheat-modal-btn').addEventListener('click', () => {
      cheatModal.classList.add('hidden');
    });
  }

  // Cheat functions
  window.cheatUndoMove = function() {
    if (window.game && typeof window.game.undo === 'function') {
      window.game.undo();
      showAlert('Undo successful');
    }
  };

  window.cheatRedoMove = function() {
    if (window.game && typeof window.game.redo === 'function') {
      window.game.redo();
      showAlert('Redo successful');
    }
  };

  window.cheatSkipTurn = function() {
    if (window.socket && window.socket.readyState === WebSocket.OPEN) {
      window.socket.send(JSON.stringify({ type: 'adminSkipTurn' }));
      showAlert('Turn skipped');
    }
  };

  window.cheatAutoPlay = function() {
    if (window.socket && window.socket.readyState === WebSocket.OPEN) {
      window.socket.send(JSON.stringify({ type: 'adminAutoPlay' }));
      showAlert('Auto play enabled');
    }
  };

  window.cheatRemovePiece = function() {
    const square = prompt('Enter square to remove piece from (e.g., e4):');
    if (square && window.game) {
      window.game.remove(square);
      showAlert(`Piece removed from ${square}`);
    }
  };

  window.cheatMovePiece = function() {
    const from = prompt('Enter source square (e.g., e2):');
    const to = prompt('Enter destination square (e.g., e4):');
    if (from && to && window.game) {
      window.game.move({ from, to });
      showAlert(`Piece moved from ${from} to ${to}`);
    }
  };

  window.cheatPromotePawn = function() {
    const square = prompt('Enter pawn square to promote (e.g., e8):');
    const piece = prompt('Enter piece type (q, r, b, n):');
    if (square && piece && window.game) {
      window.game.put({ type: piece, color: 'w' }, square);
      showAlert(`Pawn promoted to ${piece}`);
    }
  };

  window.cheatSpawnPiece = function() {
    const square = prompt('Enter square to spawn piece (e.g., e4):');
    const piece = prompt('Enter piece type (p, r, n, b, q, k):');
    const color = prompt('Enter color (w, b):');
    if (square && piece && color && window.game) {
      window.game.put({ type: piece, color }, square);
      showAlert(`Spawned ${color}${piece} at ${square}`);
    }
  };

  window.cheatSetTime = function() {
    const time = prompt('Enter time in seconds:');
    if (time && !isNaN(time)) {
      if (window.game) {
        window.game.clock = { white: parseInt(time), black: parseInt(time) };
        showAlert(`Timer set to ${time} seconds`);
      }
    }
  };

  window.cheatAddTime = function() {
    const time = prompt('Enter time to add in seconds:');
    if (time && !isNaN(time)) {
      if (window.game && window.game.clock) {
        window.game.clock.white += parseInt(time);
        window.game.clock.black += parseInt(time);
        showAlert(`Added ${time} seconds to both clocks`);
      }
    }
  };

  window.cheatResetGame = function() {
    if (window.game && typeof window.game.reset === 'function') {
      window.game.reset();
      showAlert('Game reset');
    }
  };

  window.cheatEndGame = function() {
    const winner = prompt('Enter winner (white, black, draw):');
    if (winner && window.socket && window.socket.readyState === WebSocket.OPEN) {
      window.socket.send(JSON.stringify({ 
        type: 'adminEndGame',
        winner: winner.toLowerCase()
      }));
      showAlert(`Game ended: ${winner} wins`);
    }
  };

  window.cheatGodMode = function() {
    if (window.socket && window.socket.readyState === WebSocket.OPEN) {
      window.socket.send(JSON.stringify({ type: 'adminGodMode' }));
      showAlert('God mode enabled');
    }
  };

  window.cheatInfiniteTime = function() {
    if (window.game && window.game.clock) {
      window.game.clock.white = Infinity;
      window.game.clock.black = Infinity;
      showAlert('Infinite time enabled');
    }
  };

  window.cheatSeeAllMoves = function() {
    if (window.socket && window.socket.readyState === WebSocket.OPEN) {
      window.socket.send(JSON.stringify({ type: 'adminSeeAllMoves' }));
      showAlert('All moves revealed');
    }
  };

  window.cheatAutoWin = function() {
    const side = prompt('Which side wins? (white, black):');
    if (side && window.socket && window.socket.readyState === WebSocket.OPEN) {
      window.socket.send(JSON.stringify({ 
        type: 'adminAutoWin',
        winner: side.toLowerCase()
      }));
      showAlert(`${side} wins!`);
    }
  };

  // ==================== INITIALIZATION ====================

  // Initialize all enhancements when DOM is ready
  function initializeEnhancements() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        addReportsManagementButton();
        enhanceFriendsSystem();
        addAdminCheatMenu();
      });
    } else {
      addReportsManagementButton();
      enhanceFriendsSystem();
      addAdminCheatMenu();
    }
  }

  // Start initialization
  initializeEnhancements();

})();
