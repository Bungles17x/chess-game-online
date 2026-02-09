// report-system-ui.js
// Report System UI functionality

// DOM Elements
const reportsModal = document.getElementById('reports-modal');
const closeReportsBtn = document.getElementById('close-reports-btn');
const reportsList = document.getElementById('reports-list');

// Note: Report button and form event listeners are handled in script.js to avoid conflicts

// Close reports modal
closeReportsBtn.addEventListener('click', () => {
  reportsModal.classList.add('hidden');
});

// Function to open reports management modal (for admin)
function openReportsModal() {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: 'getReports' }));
    reportsModal.classList.remove('hidden');
  } else {
    showAlert('Connection error. Please try again.');
  }
}

// Function to render reports list
function renderReportsList(reports) {
  reportsList.innerHTML = '';

  if (reports.length === 0) {
    reportsList.innerHTML = '<p class="no-reports">No reports found.</p>';
    return;
  }

  reports.forEach(report => {
    const reportElement = document.createElement('div');
    reportElement.className = 'report-item';
    reportElement.innerHTML = `
      <div class="report-header">
        <span class="report-id">#${report.id.substring(0, 8)}</span>
        <span class="report-type">${report.reportType || 'Unknown'}</span>
        <span class="report-status status-${report.status}">${report.status || 'pending'}</span>
      </div>
      <div class="report-body">
        <p><strong>Reporter:</strong> ${report.reportedBy}</p>
        <p><strong>Opponent:</strong> ${report.opponent}</p>
        <p><strong>Reason:</strong> ${report.reason}</p>
        <p><strong>Description:</strong> ${report.description || 'No description provided'}</p>
        <p><strong>Time:</strong> ${new Date(report.timestamp).toLocaleString()}</p>
      </div>
      <div class="report-actions">
        <button class="primary-btn view-replay-btn" data-replay-id="${report.replayId}">View Replay</button>
        <button class="primary-btn update-status-btn" data-report-id="${report.id}">Update Status</button>
      </div>
    `;
    reportsList.appendChild(reportElement);
  });

  // Add event listeners to buttons
  document.querySelectorAll('.view-replay-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const replayId = e.target.dataset.replayId;
      viewGameReplay(replayId);
    });
  });

  document.querySelectorAll('.update-status-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const reportId = e.target.dataset.reportId;
      updateReportStatus(reportId);
    });
  });
}

// Function to view game replay
function viewGameReplay(replayId) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      type: 'getReportDetails',
      reportId: replayId
    }));
  } else {
    showAlert('Connection error. Please try again.');
  }
}

// Function to update report status
function updateReportStatus(reportId) {
  const newStatus = prompt('Enter new status (pending, investigating, resolved, dismissed):');
  if (newStatus && ['pending', 'investigating', 'resolved', 'dismissed'].includes(newStatus.toLowerCase())) {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'updateReportStatus',
        reportId: reportId,
        status: newStatus.toLowerCase()
      }));
    } else {
      showAlert('Connection error. Please try again.');
    }
  } else {
    showAlert('Invalid status. Please use: pending, investigating, resolved, or dismissed');
  }
}

// Handle report-related WebSocket messages
function handleReportMessages(data) {
  switch (data.type) {
    case 'reportSubmitted':
      showAlert(data.message);
      break;

    case 'reportsList':
      renderReportsList(data.reports);
      break;

    case 'reportDetails':
      if (data.report) {
        // Show report details
        console.log('Report details received:', data.report);
        showAlert(`Viewing report #${data.report.id.substring(0, 8)}`);
        // Note: Game replay functionality has been simplified
      }
      break;

    case 'reportStatusUpdated':
      showAlert(`Report status updated to: ${data.status}`);
      // Refresh the reports list
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'getReports' }));
      }
      break;

    default:
      break;
  }
}

// Function to load and display game replay
function loadGameReplay(replayData) {
  // Reset the game
  game.reset();

  // Load the PGN
  try {
    game.load_pgn(replayData.gameData.pgn);

    // Update the board display
    renderBoard();

    // Show a message indicating this is a replay
    showAlert('Game replay loaded. Use the move history to navigate through the game.');
  } catch (error) {
    console.error('Error loading game replay:', error);
    showAlert('Error loading game replay');
  }
}
