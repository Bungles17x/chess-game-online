// Admin Panel - Non-conflicting version
(function() {
  "use strict";

  // Check if current user is admin
  function isAdmin() {
    try {
      const currentUser = localStorage.getItem('currentUser');
      if (!currentUser) return false;
      const user = JSON.parse(currentUser);
      return user && user.username && user.username.toLowerCase() === 'bungles17x';
    } catch (e) {
      return false;
    }
  }

  // Initialize admin features
  function initAdminPanel() {
    if (!isAdmin()) {
      console.log('[Admin Panel] Not logged in as admin');
      return;
    }

    console.log('[Admin Panel] Initializing for admin user');

    // Wait for dropdown to be available
    const checkDropdown = setInterval(() => {
      const dropdown = document.querySelector('.dropdown-content');
      if (dropdown) {
        clearInterval(checkDropdown);
        addAdminButtons(dropdown);
      }
    }, 100);

    // Stop checking after 5 seconds
    setTimeout(() => clearInterval(checkDropdown), 5000);
  }

  // Add admin buttons to dropdown
  function addAdminButtons(dropdown) {
    // Reports Management Button
    const reportsBtn = document.createElement('button');
    reportsBtn.id = 'admin-reports-btn';
    reportsBtn.className = 'dropdown-item';
    reportsBtn.textContent = '📊 Manage Reports';
    reportsBtn.addEventListener('click', openReportsModal);
    dropdown.appendChild(reportsBtn);

    // Admin Cheats Button
    const cheatsBtn = document.createElement('button');
    cheatsBtn.id = 'admin-cheats-btn';
    cheatsBtn.className = 'dropdown-item';
    cheatsBtn.textContent = '🎮 Admin Cheats';
    cheatsBtn.addEventListener('click', openCheatsModal);
    dropdown.appendChild(cheatsBtn);

    console.log('[Admin Panel] Buttons added');
  }

  // Reports Modal
  function openReportsModal() {
    // Check if modal already exists
    let modal = document.getElementById('admin-reports-modal');
    if (modal) {
      modal.classList.remove('hidden');
      return;
    }

    // Create modal
    modal = document.createElement('div');
    modal.id = 'admin-reports-modal';
    modal.className = 'modal hidden';
    modal.innerHTML = `
      <div class="modal-content">
        <h2>📊 Reports Management</h2>
        <div id="admin-reports-list">
          <p>Loading reports...</p>
        </div>
        <button id="admin-reports-close" class="primary-btn">Close</button>
      </div>
    `;
    document.body.appendChild(modal);

    // Close button
    document.getElementById('admin-reports-close').addEventListener('click', () => {
      modal.classList.add('hidden');
    });

    // Load reports
    loadReports();
  }

  function loadReports() {
    const reportsList = document.getElementById('admin-reports-list');
    if (!reportsList) return;

    // Send request to server if socket is available
    if (window.socket && window.socket.readyState === WebSocket.OPEN) {
      window.socket.send(JSON.stringify({ type: 'getReports' }));
    }

    // Listen for reports
    const handleReports = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'reportsList') {
          displayReports(data.reports || []);
          window.socket.removeEventListener('message', handleReports);
        }
      } catch (e) {
        console.error('[Admin Panel] Error handling reports:', e);
      }
    };

    if (window.socket) {
      window.socket.addEventListener('message', handleReports);
    }

    // Show sample data if no server response
    setTimeout(() => {
      if (reportsList.innerHTML.includes('Loading')) {
        displayReports([]);
      }
    }, 2000);
  }

  function displayReports(reports) {
    const reportsList = document.getElementById('admin-reports-list');
    if (!reportsList) return;

    if (!reports || reports.length === 0) {
      reportsList.innerHTML = '<p>No reports found.</p>';
      return;
    }

    reportsList.innerHTML = reports.map(report => `
      <div class="report-item">
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
          <button class="primary-btn" onclick="updateReportStatus('${report.id}')">Update Status</button>
          <button class="primary-btn" onclick="dismissReport('${report.id}')">Dismiss</button>
        </div>
      </div>
    `).join('');
  }

  // Cheats Modal
  function openCheatsModal() {
    // Check if modal already exists
    let modal = document.getElementById('admin-cheats-modal');
    if (modal) {
      modal.classList.remove('hidden');
      return;
    }

    // Create modal
    modal = document.createElement('div');
    modal.id = 'admin-cheats-modal';
    modal.className = 'modal hidden';
    modal.innerHTML = `
      <div class="modal-content">
        <h2>🎮 Admin Cheats</h2>
        <div class="cheat-grid">
          <button class="cheat-btn" onclick="window.adminCheatUndo()">↩️ Undo Move</button>
          <button class="cheat-btn" onclick="window.adminCheatRedo()">↪️ Redo Move</button>
          <button class="cheat-btn" onclick="window.adminCheatReset()">🔄 Reset Game</button>
          <button class="cheat-btn" onclick="window.adminCheatWin()">🏆 Auto Win</button>
          <button class="cheat-btn" onclick="window.adminCheatKill()">💀 Kill Piece</button>
          <button class="cheat-btn" onclick="window.adminCheatSpawn()">➕ Spawn Piece</button>
          <button class="cheat-btn" onclick="window.adminCheatTime()">⏰ Add Time</button>
          <button class="cheat-btn" onclick="window.adminCheatTimer()">⏸️ Stop Timer</button>
        </div>
        <button id="admin-cheats-close" class="primary-btn">Close</button>
      </div>
    `;
    document.body.appendChild(modal);

    // Close button
    document.getElementById('admin-cheats-close').addEventListener('click', () => {
      modal.classList.add('hidden');
    });
  }

  // Cheat functions
  window.adminCheatUndo = function() {
    console.log('[Admin Cheat] Undo move triggered');
    // Trigger undo by simulating a keyboard shortcut or calling game function
    if (typeof undoMove === 'function') {
      undoMove();
    } else {
      alert('Undo function not available');
    }
  };

  window.adminCheatRedo = function() {
    console.log('[Admin Cheat] Redo move triggered');
    if (typeof redoMove === 'function') {
      redoMove();
    } else {
      alert('Redo function not available');
    }
  };

  window.adminCheatReset = function() {
    console.log('[Admin Cheat] Reset game triggered');
    if (typeof resetGame === 'function') {
      resetGame();
    } else if (typeof resetBtn !== 'undefined' && resetBtn) {
      resetBtn.click();
    } else {
      alert('Reset function not available');
    }
  };

  window.adminCheatWin = function() {
    if (window.socket && window.socket.readyState === WebSocket.OPEN) {
      window.socket.send(JSON.stringify({ type: 'adminWinGame' }));
      console.log('[Admin Cheat] Auto win');
    }
  };

  window.adminCheatKill = function() {
    console.log('[Admin Cheat] Kill piece triggered');
    const square = prompt('Enter square to kill piece (e.g., e4):');
    if (square) {
      // Access game through the board element
      const board = document.getElementById('chessboard');
      if (board && board.game) {
        board.game.remove(square);
        console.log('[Admin Cheat] Killed piece at', square);
        alert(`Piece at ${square} removed!`);
      } else {
        alert('Game not available');
      }
    }
  };

  window.adminCheatSpawn = function() {
    console.log('[Admin Cheat] Spawn piece triggered');
    const piece = prompt('Enter piece to spawn (e.g., wP for white pawn):');
    const square = prompt('Enter square (e.g., e4):');
    if (piece && square) {
      const board = document.getElementById('chessboard');
      if (board && board.game) {
        board.game.put({ type: piece[1], color: piece[0] }, square);
        console.log('[Admin Cheat] Spawned', piece, 'at', square);
        alert(`Spawned ${piece} at ${square}!`);
      } else {
        alert('Game not available');
      }
    }
  };

  window.adminCheatTime = function() {
    console.log('[Admin Cheat] Add time triggered');
    const minutes = prompt('Enter minutes to add:');
    if (minutes && !isNaN(minutes)) {
      // Add time to both players
      if (window.whiteTime) window.whiteTime += parseInt(minutes) * 60000;
      if (window.blackTime) window.blackTime += parseInt(minutes) * 60000;
      console.log('[Admin Cheat] Added', minutes, 'minutes');
      alert(`Added ${minutes} minutes to both players!`);
    }
  };

  window.adminCheatTimer = function() {
    console.log('[Admin Cheat] Stop timer triggered');
    if (typeof timerInterval !== 'undefined') {
      clearInterval(timerInterval);
      alert('Timer stopped!');
    } else {
      alert('Timer not available');
    }
  };

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdminPanel);
  } else {
    initAdminPanel();
  }
})();
