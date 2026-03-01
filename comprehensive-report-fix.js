// Comprehensive Report System Fix
// Fixes both client and server-side report issues

(function() {
  console.log('[Comprehensive Report Fix] Initializing...');

  // Client-side fixes
  function fixClientReport() {
    console.log('[Comprehensive Report Fix] Fixing client-side...');

    // Wait for report form
    const checkForm = setInterval(() => {
      const reportForm = document.getElementById('report-form');
      if (reportForm) {
        clearInterval(checkForm);

        // Get the submit button
        const submitBtn = document.getElementById('submit-report-btn');

        if (submitBtn) {
          // Add click event listener to the submit button
          submitBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation(); // Prevent the event from bubbling to other handlers

            const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');

            // Check if user is logged in for online mode
            if (isOnlineGame && !currentUser) {
              popup("You must be logged in to submit reports in online games", "red");
              return;
            }

            const reportData = {
              reportType: document.getElementById('report-type').value,
              reason: isOnlineGame ? document.getElementById('report-reason').value : '',
              description: document.getElementById('report-description').value
            };

            console.log('[Comprehensive Report Fix] Submitting report:', reportData);
            console.log('[Comprehensive Report Fix] Socket status:', {
              exists: !!socket,
              readyState: socket ? socket.readyState : 'N/A',
              isOpen: socket && socket.readyState === WebSocket.OPEN
            });

            // Always send report to server for SMS notification
            if (socket && socket.readyState === WebSocket.OPEN) {
              console.log('[Comprehensive Report Fix] Sending to server...');
              console.log('[Comprehensive Report Fix] Report data to send:', JSON.stringify({
                type: 'report',
                ...reportData
              }));
              socket.send(JSON.stringify({
                type: 'report',
                ...reportData
              }));
              console.log('[Comprehensive Report Fix] Report sent successfully');

              reportForm.reset();
              const reportModal = document.getElementById('report-modal');
              if (reportModal) {
                reportModal.classList.add("hidden");
              }
              popup("Report submitted successfully. Thank you for helping us improve the game!", "green");
            } else {
              console.error('[Comprehensive Report Fix] WebSocket not connected');
              // Store report locally for later submission when connection is restored
              const pendingReports = JSON.parse(localStorage.getItem('pendingReports') || '[]');
              pendingReports.push({
                ...reportData,
                timestamp: new Date().toISOString(),
                submittedBy: currentUser ? currentUser.username : 'anonymous'
              });
              localStorage.setItem('pendingReports', JSON.stringify(pendingReports));
              popup("Report saved locally. It will be submitted when connection is restored.", "yellow");

              // Try to reconnect to the server
              if (typeof ensureSocket === 'function') {
                ensureSocket();
              }
            }
          });

          console.log('[Comprehensive Report Fix] Submit button handler added!');
        } else {
          console.error('[Comprehensive Report Fix] Submit button not found!');
        }

        console.log('[Comprehensive Report Fix] Client-side fixed!');
      }
    }, 100);

    // Stop checking after 10 seconds
    setTimeout(() => clearInterval(checkForm), 10000);
  }

  // Server-side notification
  function notifyServerFix() {
    if (socket && socket.readyState === WebSocket.OPEN) {
      console.log('[Comprehensive Report Fix] Notifying server of fix...');
      socket.send(JSON.stringify({
        type: 'reportSystemFix',
        message: 'Client report system fixed'
      }));

      // Submit any pending reports
      submitPendingReports();
    }
  }

  // Submit pending reports when connection is restored
  function submitPendingReports() {
    const pendingReports = JSON.parse(localStorage.getItem('pendingReports') || '[]');
    if (pendingReports.length === 0) return;

    console.log('[Comprehensive Report Fix] Submitting pending reports:', pendingReports.length);

    // Check if socket is connected before submitting
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      console.log('[Comprehensive Report Fix] WebSocket not connected, will retry later');
      return;
    }

    let submittedCount = 0;
    pendingReports.forEach((report, index) => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: 'report',
          ...report
        }));
        submittedCount++;
      }
    });

    if (submittedCount > 0) {
      // Clear pending reports after submission
      localStorage.removeItem('pendingReports');
      console.log('[Comprehensive Report Fix] Pending reports submitted successfully:', submittedCount);

      // Show notification to user
      popup(`${submittedCount} report(s) submitted successfully!`, "green");
    }
  }

  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      fixClientReport();
      setTimeout(notifyServerFix, 1000);
      setupConnectionListener();
    });
  } else {
    fixClientReport();
    setTimeout(notifyServerFix, 1000);
    setupConnectionListener();
  }

  // Set up listener for WebSocket connection
  function setupConnectionListener() {
    // Monitor socket connection state
    setInterval(() => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        submitPendingReports();
      }
    }, 5000); // Check every 5 seconds
  }

  console.log('[Comprehensive Report Fix] Initialization complete!');
})();

// Export for debugging
window.ComprehensiveReportFix = {
  status: 'active',
  version: '1.0.0',
  fixClientReport: function() {
    console.log('[Comprehensive Report Fix] Manual client fix triggered');
  }
};

console.log('%c═════════════════════════════════════', 'color: #00aaff;');
console.log('%c🔧 COMPREHENSIVE REPORT FIX LOADED', 'color: #00ff00; font-weight: bold; font-size: 14px;');
console.log('%c═════════════════════════════════════', 'color: #00aaff;');
console.log('%cStatus:', 'color: #ffff00; font-weight: bold;');
console.log('%c  Client-side: Fixed', 'color: #00ff00;');
console.log('%c  Server-side: Run server-report-fix.cjs', 'color: #ffaa00;');
console.log('%c═════════════════════════════════════', 'color: #00aaff;');
