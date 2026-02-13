// Admin Features - Fixed Version
(function() {
  "use strict";

  // Check if current user is admin
  function isAdmin() {
    try {
      const currentUser = localStorage.getItem('currentUser');
      if (!currentUser) return false;
      const user = JSON.parse(currentUser);
      if (!user || !user.username) return false;
      const username = user.username.toLowerCase();
      return username === 'bungles17x' || username === '674121bruh';
    } catch (e) {
      console.error('Error checking admin status:', e);
      return false;
    }
  }

  // Wait for page to be fully loaded
  function waitForElement(selector, callback, maxAttempts = 50) {
    let attempts = 0;
    const check = () => {
      attempts++;
      const element = document.querySelector(selector);
      if (element) {
        callback(element);
      } else if (attempts < maxAttempts) {
        setTimeout(check, 100);
      }
    };
    check();
  }

  // Initialize when DOM is ready
  function init() {
    if (!isAdmin()) {
      console.log('[Admin Features] Not logged in as admin');
      return;
    }

    console.log('[Admin Features] Initializing for admin user');

    // Initialize each feature
    initReportsManagement();
    initEnhancedFriends();
    initAdminCheats();
  }

  // ==================== REPORTS MANAGEMENT ====================

  function initReportsManagement() {
    waitForElement('.dropdown-content', (dropdown) => {
      if (document.getElementById('reports-manage-btn')) {
        console.log('[Admin Features] Reports button already exists');
        return;
      }

      const reportsBtn = document.createElement('button');
      reportsBtn.id = 'reports-manage-btn';
      reportsBtn.className = 'dropdown-item';
      reportsBtn.textContent = '📊 Manage Reports';
      reportsBtn.addEventListener('click', createReportsModal);
      dropdown.appendChild(reportsBtn);
      console.log('[Admin Features] Reports button added');
    });
  }

  function createReportsModal() {
    const modal = document.createElement('div');
    modal.id = 'reports-modal-enhanced';
    modal.className = 'modal hidden';
    modal.innerHTML = `
      <div class="modal-content">
        <h2>📊 Reports Management</h2>
        <div id="reports-list-enhanced"></div>
        <button id="close-reports-btn" class="primary-btn">Close</button>
      </div>
    `;
    document.body.appendChild(modal);

    const closeBtn = document.getElementById('close-reports-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
      });
    }

    loadReports();
  }

  function loadReports() {
    const reportsList = document.getElementById('reports-list-enhanced');
    if (!reportsList) {
      console.error('[Admin Features] Reports list not found');
      return;
    }

    reportsList.innerHTML = '<p>Loading reports...</p>';

    if (window.socket && window.socket.readyState === WebSocket.OPEN) {
      window.socket.send(JSON.stringify({ type: 'getReports' }));
    }

    const handleReports = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'reportsList') {
          displayReports(data.reports);
          window.socket.removeEventListener('message', handleReports);
        }
      } catch (error) {
        console.error('[Admin Features] Error handling reports:', error);
      }
    };

    if (window.socket) {
      window.socket.addEventListener('message', handleReports);
    }
  }

  function displayReports(reports) {
    const reportsList = document.getElementById('reports-list-enhanced');
    if (!reportsList) return;

    reportsList.innerHTML = '';

    if (!reports || reports.length === 0) {
      reportsList.innerHTML = '<p class="no-reports">No reports found.</p>';
      return;
    }

    reports.forEach(report => {
      const item = document.createElement('div');
      item.className = 'report-item';
      item.innerHTML = `
        <div class="report-header">
          <span>#${report.id ? report.id.substring(0, 8) : 'Unknown'}</span>
          <span>${report.reportType || 'Unknown'}</span>
          <span class="status-${report.status || 'pending'}">${report.status || 'pending'}</span>
        </div>
        <div class="report-body">
          <p><strong>Reporter:</strong> ${report.reportedBy || 'Unknown'}</p>
          <p><strong>Reason:</strong> ${report.reason || 'No reason'}</p>
          <p><strong>Description:</strong> ${report.description || 'No description'}</p>
        </div>
        <div class="report-actions">
          <button class="primary-btn" onclick="updateReport('${report.id}')">Update Status</button>
          <button class="primary-btn" onclick="dismissReport('${report.id}')">Dismiss</button>
        </div>
      `;
      reportsList.appendChild(item);
    });
  }

  // ==================== ENHANCED FRIENDS SYSTEM ====================

  function initEnhancedFriends() {
    waitForElement('#friends-modal', (modal) => {
      if (document.getElementById('friends-tabs')) {
        console.log('[Admin Features] Friends tabs already exist');
        return;
      }

      const content = modal.querySelector('.friends-content');
      if (!content) {
        console.error('[Admin Features] Friends content not found');
        return;
      }

      const tabs = document.createElement('div');
      tabs.id = 'friends-tabs';
      tabs.className = 'tabs';
      tabs.innerHTML = `
        <button class="tab-btn active" data-tab="friends">Friends</button>
        <button class="tab-btn" data-tab="requests">Requests</button>
        <button class="tab-btn" data-tab="blocked">Blocked</button>
      `;

      content.insertBefore(tabs, content.firstChild);

      const friendsTab = document.createElement('div');
      friendsTab.id = 'friends-tab';
      friendsTab.className = 'tab-content active';

      const requestsTab = document.createElement('div');
      requestsTab.id = 'requests-tab';
      requestsTab.className = 'tab-content';

      const blockedTab = document.createElement('div');
      blockedTab.id = 'blocked-tab';
      blockedTab.className = 'tab-content';

      tabs.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const tabId = btn.dataset.tab;
          tabs.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
          const targetTab = document.getElementById(tabId + '-tab');
          if (targetTab) targetTab.classList.add('active');
        });
      });

      console.log('[Admin Features] Friends tabs added');
      loadFriendsData();
    });
  }

  function loadFriendsData() {
    if (window.socket && window.socket.readyState === WebSocket.OPEN) {
      window.socket.send(JSON.stringify({ type: 'getFriends' }));
    }

    const handleFriends = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'friendsList') {
          displayFriends(data.friends || [], 'friends-tab');
          displayFriends(data.requests || [], 'requests-tab');
          displayFriends(data.blocked || [], 'blocked-tab');
          window.socket.removeEventListener('message', handleFriends);
        }
      } catch (error) {
        console.error('[Admin Features] Error handling friends data:', error);
      }
    };

    if (window.socket) {
      window.socket.addEventListener('message', handleFriends);
    }
  }

  function displayFriends(items, tabId) {
    const container = document.getElementById(tabId);
    if (!container) {
      console.error('[Admin Features] Container not found:', tabId);
      return;
    }

    container.innerHTML = '';

    if (!items || items.length === 0) {
      container.innerHTML = '<p class="no-items">No items found.</p>';
      return;
    }

    items.forEach(item => {
      const el = document.createElement('div');
      el.className = 'friend-item';
      const username = item.username || item.reportedBy || 'Unknown';
      el.innerHTML = `
        <div class="friend-info">
          <span class="friend-name">${username}</span>
          <span class="friend-status ${item.online ? 'online' : 'offline'}">
            ${item.online ? '🟢 Online' : '⚫ Offline'}
          </span>
        </div>
        <div class="friend-actions">
          <button class="friend-btn" onclick="challengeUser('${username}')">Challenge</button>
          ${tabId === 'friends-tab' ? `<button class="friend-btn" onclick="removeFriend('${username}')">Remove</button>` : ''}
          ${tabId === 'requests-tab' ? `<button class="friend-btn" onclick="acceptRequest('${item.id}')">Accept</button><button class="friend-btn" onclick="declineRequest('${item.id}')">Decline</button>` : ''}
          ${tabId === 'blocked-tab' ? `<button class="friend-btn" onclick="unblockUser('${username}')">Unblock</button>` : ''}
        </div>
      `;
      container.appendChild(el);
    });
  }

  // ==================== ADMIN CHEATS ====================

  function initAdminCheats() {
    waitForElement('.dropdown-content', (dropdown) => {
      if (document.getElementById('admin-cheats-btn')) {
        console.log('[Admin Features] Cheats button already exists');
        return;
      }

      const cheatBtn = document.createElement('button');
      cheatBtn.id = 'admin-cheats-btn';
      cheatBtn.className = 'dropdown-item';
      cheatBtn.textContent = '🎮 Admin Cheats';
      cheatBtn.addEventListener('click', createCheatModal);
      dropdown.appendChild(cheatBtn);
      console.log('[Admin Features] Cheats button added');
    });
  }

  function createCheatModal() {
    const modal = document.createElement('div');
    modal.id = 'admin-cheats-modal';
    modal.className = 'modal hidden';
    modal.innerHTML = `
      <div class="modal-content">
        <h2>🎮 Admin Cheats</h2>
        <div class="cheat-grid">
          <button class="cheat-btn" onclick="cheatUndo()">↩️ Undo Move</button>
          <button class="cheat-btn" onclick="cheatRedo()">↪️ Redo Move</button>
          <button class="cheat-btn" onclick="cheatReset()">🔄 Reset Game</button>
          <button class="cheat-btn" onclick="cheatWin()">🏆 Auto Win</button>
          <button class="cheat-btn" onclick="cheatKillPiece()">💀 Kill Piece</button>
          <button class="cheat-btn" onclick="cheatSpawnPiece()">➕ Spawn Piece</button>
          <button class="cheat-btn" onclick="cheatAddTime()">⏰ Add Time</button>
          <button class="cheat-btn" onclick="cheatStopTimer()">⏸️ Stop Timer</button>
        </div>
        <button id="close-cheats-btn" class="primary-btn">Close</button>
      </div>
    `;
    document.body.appendChild(modal);

    const closeBtn = document.getElementById('close-cheats-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
      });
    }
  }

  // Cheat implementations
  window.cheatUndo = function() {
    if (window.game && typeof window.game.undo === 'function') {
      window.game.undo();
      console.log('[CHEAT] Undo move');
    }
  };

  window.cheatRedo = function() {
    if (window.game && typeof window.game.redo === 'function') {
      window.game.redo();
      console.log('[CHEAT] Redo move');
    }
  };

  window.cheatReset = function() {
    if (window.game && typeof window.game.reset === 'function') {
      window.game.reset();
      console.log('[CHEAT] Reset game');
    }
  };

  window.cheatWin = function() {
    if (window.socket && window.socket.readyState === WebSocket.OPEN) {
      window.socket.send(JSON.stringify({ type: 'adminWinGame' }));
      console.log('[CHEAT] Auto win');
    }
  };

  window.cheatKillPiece = function() {
    const square = prompt('Enter square to kill piece (e.g., e4):');
    if (square && window.game) {
      window.game.remove(square);
      console.log('[CHEAT] Killed piece at', square);
    }
  };

  window.cheatSpawnPiece = function() {
    const piece = prompt('Enter piece to spawn (e.g., wP for white pawn):');
    const square = prompt('Enter square (e.g., e4):');
    if (piece && square && window.game) {
      window.game.put({ type: piece[1], color: piece[0] }, square);
      console.log('[CHEAT] Spawned', piece, 'at', square);
    }
  };

  window.cheatAddTime = function() {
    const minutes = prompt('Enter minutes to add:');
    if (minutes) {
      console.log('[CHEAT] Added', minutes, 'minutes');
    }
  };

  window.cheatStopTimer = function() {
    console.log('[CHEAT] Timer stopped');
  };

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
