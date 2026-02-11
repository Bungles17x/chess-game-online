// Admin Features - Reports, Friends, and Cheats
// This file adds enhanced functionality for admin users

(function() {
  "use strict";

  // Check if current user is admin
  function isAdmin() {
    const currentUser = localStorage.getItem('currentUser');
    return currentUser && JSON.parse(currentUser).username.toLowerCase() === 'bungles17x';
  }

  // ==================== REPORTS MANAGEMENT ====================

  function addReportsManagementButton() {
    console.log('[ADMIN] Adding reports management button...');
    if (!isAdmin()) {
      console.log('[ADMIN] User is not admin, cannot add reports button');
      return;
    }

    const dropdown = document.querySelector('.dropdown-content');
    console.log('[ADMIN] Dropdown:', dropdown ? 'Found' : 'Not found');
    if (!dropdown) {
      console.log('[ADMIN] Dropdown not found, cannot add reports button');
      return;
    }

    if (document.getElementById('reports-manage-btn')) {
      console.log('[ADMIN] Reports button already exists');
      return;
    }

    const reportsBtn = document.createElement('button');
    reportsBtn.id = 'reports-manage-btn';
    reportsBtn.className = 'dropdown-item';
    reportsBtn.textContent = '📊 Manage Reports';

    reportsBtn.addEventListener('click', () => {
      console.log('[ADMIN] Reports button clicked');
      createReportsModal();
    });

    dropdown.appendChild(reportsBtn);
    console.log('[ADMIN] Reports button added successfully');
  }

  // ==================== PASSWORD RESET MANAGEMENT ====================

  function addPasswordResetManagementButton() {
    if (!isAdmin()) return;

    const dropdown = document.querySelector('.dropdown-content');
    if (!dropdown) return;

    if (document.getElementById('password-reset-manage-btn')) return;

    const resetBtn = document.createElement('button');
    resetBtn.id = 'password-reset-manage-btn';
    resetBtn.className = 'dropdown-item';
    resetBtn.textContent = '🔑 Password Reset Requests';

    resetBtn.addEventListener('click', () => {
      createPasswordResetModal();
    });

    dropdown.appendChild(resetBtn);
  }

  function createPasswordResetModal() {
    // Check if modal already exists
    if (document.getElementById('password-reset-modal')) {
      const modal = document.getElementById('password-reset-modal');
      modal.classList.remove('hidden');
      loadPasswordResetRequests();
      return;
    }

    const modal = document.createElement('div');
    modal.id = 'password-reset-modal';
    modal.className = 'modal hidden';
    modal.innerHTML = `
      <div class="modal-content password-reset-modal-content">
        <div class="modal-header">
          <h2>🔑 Password Reset Requests</h2>
          <button id="close-password-reset-btn" class="close-modal-btn">&times;</button>
        </div>
        <div class="modal-body">
          <div id="password-reset-list" class="password-reset-list"></div>
        </div>
        <div class="modal-footer">
          <button id="refresh-password-reset-btn" class="primary-btn">🔄 Refresh</button>
          <button id="close-password-reset-footer-btn" class="primary-btn">Close</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    // Add event listeners
    document.getElementById('close-password-reset-btn').addEventListener('click', () => {
      modal.classList.add('hidden');
    });

    document.getElementById('close-password-reset-footer-btn').addEventListener('click', () => {
      modal.classList.add('hidden');
    });

    document.getElementById('refresh-password-reset-btn').addEventListener('click', () => {
      loadPasswordResetRequests();
    });

    // Make modal resizable
    makeModalResizable(modal);

    loadPasswordResetRequests();
  }

  function loadPasswordResetRequests() {
    const resetList = document.getElementById('password-reset-list');
    if (!resetList) return;

    // Get password reset requests from localStorage
    const requests = JSON.parse(localStorage.getItem('passwordResetRequests') || '[]');

    displayPasswordResetRequests(requests);
  }

  function displayPasswordResetRequests(requests) {
    const resetList = document.getElementById('password-reset-list');
    if (!resetList) return;

    resetList.innerHTML = '';

    if (!requests || requests.length === 0) {
      resetList.innerHTML = '<p class="no-requests">No password reset requests found.</p>';
      return;
    }

    // Sort by timestamp (newest first)
    const sortedRequests = requests.sort((a, b) => b.timestamp - a.timestamp);

    sortedRequests.forEach(request => {
      const requestItem = document.createElement('div');
      requestItem.className = `password-reset-item ${request.status}`;
      requestItem.setAttribute('data-email', request.email);
      requestItem.innerHTML = `
        <div class="reset-request-header">
          <span class="request-username">${request.username || 'Unknown'}</span>
          <span class="request-status ${request.status}">${request.status}</span>
        </div>
        <div class="reset-request-body">
          <p><strong>Email:</strong> ${request.email}</p>
          <p><strong>Phone:</strong> ${request.phone}</p>
          <p><strong>Verification Code:</strong> ${request.verificationCode}</p>
          <p><strong>Time:</strong> ${new Date(request.timestamp).toLocaleString()}</p>
          ${request.completedAt ? `<p><strong>Completed:</strong> ${new Date(request.completedAt).toLocaleString()}</p>` : ''}
          ${request.completedBy ? `<p><strong>Completed By:</strong> ${request.completedBy}</p>` : ''}
        </div>
        <div class="reset-request-actions">
          ${request.status === 'pending' ? `
            <button class="primary-btn approve-btn" data-email="${request.email}">✅ Approve</button>
            <button class="primary-btn reject-btn" data-email="${request.email}">❌ Reject</button>
          ` : `
            <button class="primary-btn view-btn" data-email="${request.email}">👁️ View Details</button>
          `}
        </div>
      `;
      resetList.appendChild(requestItem);
    });

    // Add event listeners to action buttons
    document.querySelectorAll('.approve-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const email = e.target.dataset.email;
        approvePasswordReset(email);
      });
    });

    document.querySelectorAll('.reject-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const email = e.target.dataset.email;
        rejectPasswordReset(email);
      });
    });

    document.querySelectorAll('.view-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const email = e.target.dataset.email;
        viewPasswordResetDetails(email);
      });
    });
  }

  function approvePasswordReset(email) {
    const requests = JSON.parse(localStorage.getItem('passwordResetRequests') || '[]');
    const requestIndex = requests.findIndex(r => r.email === email);
    
    if (requestIndex !== -1) {
      // Remove the request from localStorage
      requests.splice(requestIndex, 1);
      localStorage.setItem('passwordResetRequests', JSON.stringify(requests));
      
      // Find the request element and update it
      const requestElement = document.querySelector(`.password-reset-item[data-email="${email}"]`);
      if (requestElement) {
        const actionsContainer = requestElement.querySelector('.reset-request-actions');
        if (actionsContainer) {
          actionsContainer.innerHTML = `<span class="action-message">✅ Approved - Hiding in 5 seconds...</span>`;
        }
        
        // Hide the request after 5 seconds
        setTimeout(() => {
          requestElement.style.opacity = '0';
          requestElement.style.transform = 'translateX(100%)';
          setTimeout(() => {
            requestElement.remove();
          }, 300);
        }, 5000);
      }
      
      showAlert(`Password reset approved for ${email}`);
    }
  }

  function rejectPasswordReset(email) {
    if (!confirm('Are you sure you want to reject this password reset request?')) {
      return;
    }

    const requests = JSON.parse(localStorage.getItem('passwordResetRequests') || '[]');
    const requestIndex = requests.findIndex(r => r.email === email);
    
    if (requestIndex !== -1) {
      // Remove the request from localStorage
      requests.splice(requestIndex, 1);
      localStorage.setItem('passwordResetRequests', JSON.stringify(requests));
      
      // Find the request element and update it
      const requestElement = document.querySelector(`.password-reset-item[data-email="${email}"]`);
      if (requestElement) {
        const actionsContainer = requestElement.querySelector('.reset-request-actions');
        if (actionsContainer) {
          actionsContainer.innerHTML = `<span class="action-message">❌ Rejected - Hiding in 5 seconds...</span>`;
        }
        
        // Hide the request after 5 seconds
        setTimeout(() => {
          requestElement.style.opacity = '0';
          requestElement.style.transform = 'translateX(100%)';
          setTimeout(() => {
            requestElement.remove();
          }, 300);
        }, 5000);
      }
      
      showAlert(`Password reset rejected for ${email}`);
    }
  }

  function viewPasswordResetDetails(email) {
    const requests = JSON.parse(localStorage.getItem('passwordResetRequests') || '[]');
    const request = requests.find(r => r.email === email);
    
    if (request) {
      const details = `
        Username: ${request.username}
        Email: ${request.email}
        Phone: ${request.phone}
        Verification Code: ${request.verificationCode}
        Status: ${request.status}
        Requested: ${new Date(request.timestamp).toLocaleString()}
        ${request.completedAt ? `Completed: ${new Date(request.completedAt).toLocaleString()}` : ''}
        ${request.completedBy ? `Completed By: ${request.completedBy}` : ''}
      `;
      alert(details);
    }
  }

  // ==================== CONSOLE COMMANDS ====================

  // Add console command to manually hide password reset requests
  window.hidePasswordResetRequest = function(email) {
    if (!email) {
      console.error('Please provide an email address. Usage: hidePasswordResetRequest("user@example.com")');
      return;
    }

    const requests = JSON.parse(localStorage.getItem('passwordResetRequests') || '[]');
    const requestIndex = requests.findIndex(r => r.email === email);
    
    if (requestIndex === -1) {
      console.error(`No password reset request found for email: ${email}`);
      return;
    }

    // Remove the request
    requests.splice(requestIndex, 1);
    localStorage.setItem('passwordResetRequests', JSON.stringify(requests));
    
    console.log(`✅ Password reset request for ${email} has been removed`);
    
    // If modal is open, refresh the list
    const resetList = document.getElementById('password-reset-list');
    if (resetList) {
      loadPasswordResetRequests();
    }
  };

  // Add console command to hide all password reset requests
  window.hideAllPasswordResetRequests = function() {
    const requests = JSON.parse(localStorage.getItem('passwordResetRequests') || '[]');
    const count = requests.length;
    
    if (count === 0) {
      console.log('No password reset requests to hide');
      return;
    }

    // Clear all requests
    localStorage.removeItem('passwordResetRequests');
    
    console.log(`✅ All ${count} password reset requests have been removed`);
    
    // If modal is open, refresh the list
    const resetList = document.getElementById('password-reset-list');
    if (resetList) {
      loadPasswordResetRequests();
    }
  };

  // Add console command to list all password reset requests
  window.listPasswordResetRequests = function() {
    const requests = JSON.parse(localStorage.getItem('passwordResetRequests') || '[]');
    
    if (requests.length === 0) {
      console.log('No password reset requests found');
      return;
    }

    console.log(`\n=== Password Reset Requests (${requests.length}) ===`);
    requests.forEach((request, index) => {
      console.log(`\n[${index + 1}] ${request.email}`);
      console.log(`    Username: ${request.username}`);
      console.log(`    Phone: ${request.phone}`);
      console.log(`    Status: ${request.status}`);
      console.log(`    Time: ${new Date(request.timestamp).toLocaleString()}`);
    });
    console.log('\n=== End of List ===\n');
    console.log('Usage:');
    console.log('  hidePasswordResetRequest("user@example.com") - Hide specific request');
    console.log('  hideAllPasswordResetRequests() - Hide all requests');
  };

  // Log available console commands
  console.log('%c🔑 Password Reset Console Commands Available:', 'color: #0ea5e9; font-weight: bold;');
  console.log('  hidePasswordResetRequest("email") - Hide specific request by email');
  console.log('  hideAllPasswordResetRequests() - Hide all requests');
  console.log('  listPasswordResetRequests() - List all requests');

  function makeModalResizable(modal) {
    const modalContent = modal.querySelector('.modal-content');
    if (!modalContent) return;

    // Create resize handle
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'resize-handle';
    modalContent.appendChild(resizeHandle);

    let isResizing = false;
    let startX, startY, startWidth, startHeight;

    resizeHandle.addEventListener('mousedown', (e) => {
      isResizing = true;
      startX = e.clientX;
      startY = e.clientY;
      startWidth = parseInt(document.defaultView.getComputedStyle(modalContent).width, 10);
      startHeight = parseInt(document.defaultView.getComputedStyle(modalContent).height, 10);
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isResizing) return;
      const width = startWidth + e.clientX - startX;
      const height = startHeight + e.clientY - startY;
      modalContent.style.width = `${Math.max(width, 400)}px`;
      modalContent.style.height = `${Math.max(height, 300)}px`;
    });

    document.addEventListener('mouseup', () => {
      isResizing = false;
    });
  }

  function createReportsModal() {
    console.log('[ADMIN] Creating reports modal...');
    const modal = document.createElement('div');
    modal.id = 'reports-modal-enhanced';
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <h2>📊 Reports Management</h2>
        <div id="reports-list-enhanced" class="reports-list"></div>
        <button id="close-reports-enhanced-btn" class="primary-btn">Close</button>
      </div>
    `;
    document.body.appendChild(modal);
    console.log('[ADMIN] Reports modal created and added to body');
    console.log('[ADMIN] Modal element:', modal);
    console.log('[ADMIN] Modal classes:', modal.className);
    console.log('[ADMIN] Modal display style:', window.getComputedStyle(modal).display);

    document.getElementById('close-reports-enhanced-btn').addEventListener('click', () => {
      console.log('[ADMIN] Closing reports modal');
      modal.classList.add('hidden');
    });

    console.log('[ADMIN] Loading reports...');
    loadReports();
  }

  function loadReports() {
    console.log('[ADMIN] Loading reports...');
    const reportsList = document.getElementById('reports-list-enhanced');
    console.log('[ADMIN] Reports list element:', reportsList ? 'Found' : 'Not found');
    if (!reportsList) {
      console.log('[ADMIN] Reports list element not found, cannot load reports');
      return;
    }

    if (window.socket && window.socket.readyState === WebSocket.OPEN) {
      console.log('[ADMIN] Sending getReports request to server');
      window.socket.send(JSON.stringify({ type: 'getReports' }));
    } else {
      console.log('[ADMIN] Socket not connected, cannot load reports');
    }

    const handleReports = (event) => {
      const data = JSON.parse(event.data);
      console.log('[ADMIN] Received message from server:', data.type);
      if (data.type === 'reportsList') {
        console.log('[ADMIN] Reports list received:', data.reports);
        displayReports(data.reports);
        window.socket.removeEventListener('message', handleReports);
      }
    };

    window.socket.addEventListener('message', handleReports);
    console.log('[ADMIN] Reports message handler added');
  }

  function displayReports(reports) {
    console.log('[ADMIN] Displaying reports:', reports);
    const reportsList = document.getElementById('reports-list-enhanced');
    console.log('[ADMIN] Reports list element:', reportsList ? 'Found' : 'Not found');
    if (!reportsList) {
      console.log('[ADMIN] Reports list element not found');
      return;
    }

    console.log('[ADMIN] Clearing reports list');
    reportsList.innerHTML = '';

    if (!reports || reports.length === 0) {
      console.log('[ADMIN] No reports to display');
      reportsList.innerHTML = '<p class="no-reports">No reports found.</p>';
      console.log('[ADMIN] Set no reports message');
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
          <button class="primary-btn" onclick="updateReportStatus('${report.id}')">Update Status</button>
          <button class="primary-btn" onclick="dismissReport('${report.id}')">Dismiss</button>
        </div>
      `;
      reportsList.appendChild(reportItem);
    });
  }

  // Dismiss report function
  window.dismissReport = function(reportId) {
    if (window.socket && window.socket.readyState === WebSocket.OPEN) {
      window.socket.send(JSON.stringify({
        type: 'updateReportStatus',
        reportId: reportId,
        status: 'dismissed'
      }));
      console.log('[Admin Features] Dismissing report:', reportId);
    } else {
      alert('Connection error. Please try again.');
    }
  };

  // Update report status function
  window.updateReportStatus = function(reportId) {
    const newStatus = prompt('Enter new status (pending, investigating, resolved, dismissed):');
    if (newStatus && ['pending', 'investigating', 'resolved', 'dismissed'].includes(newStatus.toLowerCase())) {
      if (window.socket && window.socket.readyState === WebSocket.OPEN) {
        window.socket.send(JSON.stringify({
          type: 'updateReportStatus',
          reportId: reportId,
          status: newStatus.toLowerCase()
        }));
        console.log('[Admin Features] Updating report status:', reportId, newStatus);
      } else {
        alert('Connection error. Please try again.');
      }
    } else {
      alert('Invalid status. Please use: pending, investigating, resolved, or dismissed');
    }
  };

  // ==================== ENHANCED FRIENDS SYSTEM ====================

  function enhanceFriendsSystem() {
    const friendsModal = document.getElementById('friends-modal');
    if (!friendsModal) return;

    const friendsContent = friendsModal.querySelector('.friends-content');
    if (!friendsContent) return;

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

    const friendsSection = document.createElement('div');
    friendsSection.id = 'friends-list-tab';
    friendsSection.className = 'tab-content active';

    const requestsSection = document.createElement('div');
    requestsSection.id = 'friend-requests-tab';
    requestsSection.className = 'tab-content';

    const blockedSection = document.createElement('div');
    blockedSection.id = 'blocked-users-tab';
    blockedSection.className = 'tab-content';

    tabsContainer.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tabId = btn.dataset.tab;
        tabsContainer.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        document.getElementById(tabId + '-tab').classList.add('active');
      });
    });

    loadFriendsData();
  }

  function loadFriendsData() {
    if (window.socket && window.socket.readyState === WebSocket.OPEN) {
      window.socket.send(JSON.stringify({ type: 'getFriends' }));
    }

    const handleFriends = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'friendsList') {
        displayFriendsList(data.friends);
        displayFriendRequests(data.requests);
        displayBlockedUsers(data.blocked);
        window.socket.removeEventListener('message', handleFriends);
      }
    };

    if (window.socket) {
      window.socket.addEventListener('message', handleFriends);
    }
  }

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
          <button class="friend-btn" onclick="removeFriend('${friend.username}')">Remove</button>
        </div>
      `;
      friendsList.appendChild(friendItem);
    });
  }

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
        </div>
        <div class="request-actions">
          <button class="friend-btn accept" onclick="acceptFriendRequest('${request.id}')">Accept</button>
          <button class="friend-btn decline" onclick="declineFriendRequest('${request.id}')">Decline</button>
        </div>
      `;
      requestsList.appendChild(requestItem);
    });
  }

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
        </div>
        <div class="blocked-actions">
          <button class="friend-btn" onclick="unblockUser('${user.username}')">Unblock</button>
        </div>
      `;
      blockedList.appendChild(blockedItem);
    });
  }

  // ==================== ADMIN CHEATS ====================

  function addAdminCheatMenu() {
    if (!isAdmin()) return;

    const cheatBtn = document.createElement('button');
    cheatBtn.id = 'admin-cheat-btn';
    cheatBtn.className = 'dropdown-item';
    cheatBtn.innerHTML = '🎮 Admin Cheats';

    const dropdown = document.querySelector('.dropdown-content');
    if (dropdown) {
      dropdown.appendChild(cheatBtn);
    }

    cheatBtn.addEventListener('click', () => {
      createCheatModal();
    });
  }

  function createCheatModal() {
    const modal = document.createElement('div');
    modal.id = 'admin-cheat-modal';
    modal.className = 'modal hidden';
    modal.innerHTML = `
      <div class="modal-content cheat-modal-content">
        <h2>🎮 Admin Cheats</h2>
        <div class="cheat-sections">
          <div class="cheat-section">
            <h3>Game Control</h3>
            <button class="cheat-btn" onclick="cheatUndoMove()">↩️ Undo Last Move</button>
            <button class="cheat-btn" onclick="cheatRedoMove()">↪️ Redo Move</button>
            <button class="cheat-btn" onclick="cheatResetGame()">🔄 Reset Game</button>
            <button class="cheat-btn" onclick="cheatAutoWin()">🏆 Auto Win</button>
          </div>
          <div class="cheat-section">
            <h3>Piece Control</h3>
            <button class="cheat-btn" onclick="cheatKillPiece()">💀 Kill Any Piece</button>
            <button class="cheat-btn" onclick="cheatSpawnPiece()">➕ Spawn Piece</button>
            <button class="cheat-btn" onclick="cheatMovePiece()">♟️ Move Any Piece</button>
          </div>
          <div class="cheat-section">
            <h3>Time Control</h3>
            <button class="cheat-btn" onclick="cheatAddTime()">⏰ Add Time</button>
            <button class="cheat-btn" onclick="cheatStopTime()">⏸️ Stop Timer</button>
            <button class="cheat-btn" onclick="cheatResetTime()">🔄 Reset Timer</button>
          </div>
        </div>
        <button id="close-cheat-btn" class="primary-btn">Close</button>
      </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('close-cheat-btn').addEventListener('click', () => {
      modal.classList.add('hidden');
    });
  }

  // Cheat functions
  window.cheatUndoMove = function() {
    if (window.game) {
      window.game.undo();
      window.updateBoard();
      console.log('[CHEAT] Move undone');
    }
  };

  window.cheatRedoMove = function() {
    if (window.game) {
      window.game.redo();
      window.updateBoard();
      console.log('[CHEAT] Move redone');
    }
  };

  window.cheatResetGame = function() {
    if (confirm('Reset the current game?')) {
      if (window.game) {
        window.game.reset();
        window.updateBoard();
        console.log('[CHEAT] Game reset');
      }
    }
  };

  window.cheatAutoWin = function() {
    if (confirm('Auto-win the current game?')) {
      if (window.socket && window.socket.readyState === WebSocket.OPEN) {
        window.socket.send(JSON.stringify({ type: 'adminAutoWin' }));
      }
      console.log('[CHEAT] Auto-win activated');
    }
  };

  window.cheatKillPiece = function() {
    const square = prompt('Enter square to kill piece (e.g., e4):');
    if (square && window.game) {
      window.game.remove(square);
      window.updateBoard();
      console.log('[CHEAT] Piece killed at', square);
    }
  };

  window.cheatSpawnPiece = function() {
    const piece = prompt('Enter piece to spawn (e.g., wK for white king):');
    const square = prompt('Enter square (e.g., e4):');
    if (piece && square && window.game) {
      window.game.put(piece, square);
      window.updateBoard();
      console.log('[CHEAT] Spawned', piece, 'at', square);
    }
  };

  window.cheatMovePiece = function() {
    const from = prompt('Enter from square:');
    const to = prompt('Enter to square:');
    if (from && to && window.game) {
      window.game.move({ from, to });
      window.updateBoard();
      console.log('[CHEAT] Moved piece from', from, 'to', to);
    }
  };

  window.cheatAddTime = function() {
    const minutes = prompt('Enter minutes to add:');
    if (minutes && window.socket && window.socket.readyState === WebSocket.OPEN) {
      window.socket.send(JSON.stringify({ 
        type: 'adminAddTime', 
        minutes: parseInt(minutes) 
      }));
      console.log('[CHEAT] Added', minutes, 'minutes');
    }
  };

  window.cheatStopTime = function() {
    if (window.socket && window.socket.readyState === WebSocket.OPEN) {
      window.socket.send(JSON.stringify({ type: 'adminStopTime' }));
      console.log('[CHEAT] Timer stopped');
    }
  };

  window.cheatResetTime = function() {
    if (window.socket && window.socket.readyState === WebSocket.OPEN) {
      window.socket.send(JSON.stringify({ type: 'adminResetTime' }));
      console.log('[CHEAT] Timer reset');
    }
  };

  // ==================== INITIALIZATION ====================

  function initializeAdminFeatures() {
    console.log('[ADMIN] Initializing admin features...');
    console.log('[ADMIN] Is admin:', isAdmin());
    console.log('[ADMIN] Current user:', localStorage.getItem('currentUser'));
    
    if (!isAdmin()) {
      console.log('[ADMIN] User is not admin, skipping initialization');
      return;
    }

    // Wait for dropdown to be available
    const checkDropdown = setInterval(() => {
      const dropdown = document.querySelector('.dropdown-content');
      console.log('[ADMIN] Checking for dropdown...', dropdown ? 'Found' : 'Not found');
      if (dropdown) {
        clearInterval(checkDropdown);
        addReportsManagementButton();
        addPasswordResetManagementButton();
        addAdminCheatMenu();
        console.log('[ADMIN] Admin features initialized');
      }
    }, 100);

    // Stop checking after 5 seconds
    setTimeout(() => clearInterval(checkDropdown), 5000);

    // Enhance friends system (doesn't need dropdown)
    enhanceFriendsSystem();
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAdminFeatures);
  } else {
    initializeAdminFeatures();
  }

})();
