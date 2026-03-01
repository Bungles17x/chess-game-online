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

    // Format priority badge
    const priorityClass = `priority-${report.priority || 'normal'}`;
    const priorityLabel = (report.priority || 'normal').charAt(0).toUpperCase() + (report.priority || 'normal').slice(1);

    reportElement.innerHTML = `
      <div class="report-header">
        <span class="report-id">#${report.id.substring(0, 8)}</span>
        <span class="report-type">${report.reportType || 'Unknown'}</span>
        <span class="report-status status-${report.status}">${report.status || 'pending'}</span>
        <span class="report-priority ${priorityClass}">${priorityLabel}</span>
      </div>
      <div class="report-body">
        <p><strong>Reporter:</strong> ${report.reportedBy || 'Unknown'}</p>
        <p><strong>Opponent:</strong> ${report.opponent || 'Unknown'}</p>
        <p><strong>Reason:</strong> ${report.reason || 'No reason provided'}</p>
        <p><strong>Description:</strong> ${report.description || 'No description provided'}</p>
        <p><strong>Time:</strong> ${new Date(report.timestamp).toLocaleString()}</p>
        ${report.reviewed ? `<p><strong>Reviewed by:</strong> ${report.reviewedBy || 'Unknown'}</p>` : ''}
        ${report.resolution ? `<p><strong>Resolution:</strong> ${report.resolution}</p>` : ''}
        ${report.notes && report.notes.length > 0 ? `
          <div class="report-notes">
            <strong>Notes:</strong>
            ${report.notes.map(note => `
              <div class="report-note">
                <span class="note-author">${note.addedBy || 'Unknown'}:</span>
                <span class="note-text">${note.text}</span>
                <span class="note-time">${new Date(note.addedAt).toLocaleString()}</span>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
      <div class="report-actions">
        <button class="primary-btn view-replay-btn" data-replay-id="${report.replayId}">View Replay</button>
        <button class="primary-btn update-status-btn" data-report-id="${report.id}">Update Status</button>
        <button class="primary-btn update-priority-btn" data-report-id="${report.id}">Update Priority</button>
        <button class="primary-btn add-note-btn" data-report-id="${report.id}">Add Note</button>
        <button class="danger-btn delete-report-btn" data-report-id="${report.id}">Delete</button>
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

  document.querySelectorAll('.update-priority-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const reportId = e.target.dataset.reportId;
      updateReportPriority(reportId);
    });
  });

  document.querySelectorAll('.add-note-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const reportId = e.target.dataset.reportId;
      addReportNote(reportId);
    });
  });

  document.querySelectorAll('.delete-report-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const reportId = e.target.dataset.reportId;
      deleteReport(reportId);
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
  const statusOptions = ['pending', 'investigating', 'resolved', 'dismissed'];
  const newStatus = prompt('Enter new status (pending, investigating, resolved, dismissed):');

  if (newStatus && statusOptions.includes(newStatus.toLowerCase())) {
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

// Function to update report priority
function updateReportPriority(reportId) {
  const priorityOptions = ['normal', 'high', 'critical'];
  const newPriority = prompt('Enter new priority (normal, high, critical):');

  if (newPriority && priorityOptions.includes(newPriority.toLowerCase())) {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'updateReportPriority',
        reportId: reportId,
        priority: newPriority.toLowerCase()
      }));
    } else {
      showAlert('Connection error. Please try again.');
    }
  } else {
    showAlert('Invalid priority. Please use: normal, high, or critical');
  }
}

// Function to add note to report
function addReportNote(reportId) {
  const note = prompt('Enter note:');

  if (note && note.trim()) {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'addReportNote',
        reportId: reportId,
        note: note.trim()
      }));
    } else {
      showAlert('Connection error. Please try again.');
    }
  }
}

// Function to delete report
function deleteReport(reportId) {
  const confirmed = confirm('Are you sure you want to delete this report?');

  if (confirmed) {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'deleteReport',
        reportId: reportId
      }));
    } else {
      showAlert('Connection error. Please try again.');
    }
  }
}

// Function to search reports
function searchReports(query) {
  if (!query || query.trim() === '') {
    // If empty query, load all reports
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'getReports' }));
    }
    return;
  }

  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      type: 'searchReports',
      query: query.trim()
    }));
  } else {
    showAlert('Connection error. Please try again.');
  }
}

// Handle report-related WebSocket messages
function handleReportMessages(data) {
  switch (data.type) {
    case 'reportSubmitted':
      showAlert(data.message || 'Report submitted successfully');
      break;

    case 'reportsList':
      renderReportsList(data.reports || []);
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

    case 'reportPriorityUpdated':
      showAlert(`Report priority updated to: ${data.priority}`);
      // Refresh the reports list
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'getReports' }));
      }
      break;

    case 'reportNoteAdded':
      showAlert('Note added to report');
      // Refresh the reports list
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'getReports' }));
      }
      break;

    case 'reportDeleted':
      showAlert('Report deleted successfully');
      // Refresh the reports list
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'getReports' }));
      }
      break;

    case 'searchResults':
      renderReportsList(data.reports || []);
      break;

    case 'error':
      showAlert(data.message || 'An error occurred');
      break;

    default:
      console.log('Unknown report message type:', data.type);
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
