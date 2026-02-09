
// Anti-Cheat and Report Management System Fix
// This file fixes issues with cheat detection and report management

// ==================== ANTI-CHEAT SYSTEM FIX ====================

// Fix anti-cheat initialization
function initAntiCheatSystem() {
  console.log('Initializing anti-cheat system...');

  // Initialize anti-cheat if not already initialized
  if (typeof initAntiCheat === 'function') {
    initAntiCheat();
  }

  // Set up move tracking
  if (typeof window !== 'undefined') {
    window.addEventListener('moveMade', (event) => {
      trackPlayerMove(event.detail);
    });
  }

  console.log('Anti-cheat system initialized');
}

// Track player moves for cheat detection
function trackPlayerMove(moveData) {
  if (!moveData || !moveData.username) return;

  const username = moveData.username;
  const move = moveData.move;
  const timestamp = Date.now();

  // Record move
  if (typeof recordMove === 'function') {
    recordMove(username, move);
  }

  // Check move timing
  if (typeof checkMoveTiming === 'function') {
    const timingCheck = checkMoveTiming(username);
    if (!timingCheck.valid) {
      console.warn('Suspicious move timing detected:', timingCheck);
      trackSuspiciousActivity(username, 'suspicious_timing');
    }
  }

  // Track suspicious activity
  if (typeof trackSuspiciousActivity === 'function') {
    const activityCheck = trackSuspiciousActivity(username, 'move_made');
    if (activityCheck.shouldReport) {
      console.warn('Suspicious activity detected:', activityCheck);
      // Send report to server
      if (window.socket && window.socket.readyState === WebSocket.OPEN) {
        window.socket.send(JSON.stringify({
          type: 'suspiciousActivity',
          username: username,
          activities: activityCheck.activities,
          count: activityCheck.count
        }));
      }
    }
  }
}

// ==================== REPORT MANAGEMENT SYSTEM FIX ====================

// Fix report submission
function submitReport(reportData) {
  if (!window.socket || window.socket.readyState !== WebSocket.OPEN) {
    showAlert('Connection error. Please try again.');
    return;
  }

  // Validate report data
  if (!reportData.reportType || !reportData.reason) {
    showAlert('Please fill in all required fields.');
    return;
  }

  // Send report to server
  window.socket.send(JSON.stringify({
    type: 'report',
    ...reportData
  }));

  console.log('Report submitted:', reportData);
}

// Fix report loading
function loadReports() {
  if (!window.socket || window.socket.readyState !== WebSocket.OPEN) {
    showAlert('Connection error. Please try again.');
    return;
  }

  // Request reports from server
  window.socket.send(JSON.stringify({
    type: 'getReports'
  }));

  console.log('Loading reports...');
}

// Fix report status update
function updateReportStatus(reportId, newStatus) {
  if (!window.socket || window.socket.readyState !== WebSocket.OPEN) {
    showAlert('Connection error. Please try again.');
    return;
  }

  // Validate status
  const validStatuses = ['pending', 'investigating', 'resolved', 'dismissed'];
  if (!validStatuses.includes(newStatus)) {
    showAlert('Invalid status. Please use: pending, investigating, resolved, or dismissed');
    return;
  }

  // Send update to server
  window.socket.send(JSON.stringify({
    type: 'updateReportStatus',
    reportId: reportId,
    status: newStatus
  }));

  console.log('Updating report status:', reportId, newStatus);
}

// Fix report details loading
function loadReportDetails(reportId) {
  if (!window.socket || window.socket.readyState !== WebSocket.OPEN) {
    showAlert('Connection error. Please try again.');
    return;
  }

  // Request report details from server
  window.socket.send(JSON.stringify({
    type: 'getReportDetails',
    reportId: reportId
  }));

  console.log('Loading report details:', reportId);
}

// ==================== INTEGRATION FIX ====================

// Fix WebSocket message handling for reports
function setupReportMessageHandler() {
  if (!window.socket) return;

  // Remove existing handler if any
  if (window.reportMessageHandler) {
    window.socket.removeEventListener('message', window.reportMessageHandler);
  }

  // Create new handler
  window.reportMessageHandler = (event) => {
    try {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case 'reportSubmitted':
          showAlert(data.message || 'Report submitted successfully');
          break;

        case 'reportsList':
          if (typeof displayReports === 'function') {
            displayReports(data.reports);
          } else if (typeof renderReportsList === 'function') {
            renderReportsList(data.reports);
          }
          break;

        case 'reportDetails':
          if (data.report) {
            console.log('Report details received:', data.report);
            showAlert(`Viewing report #${data.report.id.substring(0, 8)}`);
            // Handle report details display
            if (typeof displayReportDetails === 'function') {
              displayReportDetails(data.report);
            }
          }
          break;

        case 'reportStatusUpdated':
          showAlert(`Report status updated to: ${data.status}`);
          // Refresh the reports list
          loadReports();
          break;

        case 'suspiciousActivity':
          console.warn('Suspicious activity detected:', data);
          showAlert(`Suspicious activity detected for user: ${data.username}`);
          break;

        default:
          break;
      }
    } catch (error) {
      console.error('Error handling report message:', error);
    }
  };

  // Add handler to socket
  window.socket.addEventListener('message', window.reportMessageHandler);

  console.log('Report message handler set up');
}

// ==================== INITIALIZATION ====================

// Initialize fixes when DOM is ready
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('Applying anti-cheat and report management fixes...');

    // Initialize anti-cheat system
    initAntiCheatSystem();

    // Set up report message handler
    setupReportMessageHandler();

    console.log('Anti-cheat and report management fixes applied');
  });
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initAntiCheatSystem,
    trackPlayerMove,
    submitReport,
    loadReports,
    updateReportStatus,
    loadReportDetails,
    setupReportMessageHandler
  };
}
