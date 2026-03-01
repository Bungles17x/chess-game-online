// Report Form Syntax Fix
// Fixes the misplaced closing brace in the report form submission

(function() {
  console.log('[Report Form Fix] Initializing...');

  // Wait for DOM to be ready
  function fixReportForm() {
    const reportForm = document.getElementById('report-form');

    if (!reportForm) {
      console.log('[Report Form Fix] Report form not found, retrying...');
      setTimeout(fixReportForm, 500);
      return;
    }

    console.log('[Report Form Fix] Report form found, fixing...');

    // Remove existing event listener and add fixed one
    const newReportForm = reportForm.cloneNode(true);
    reportForm.parentNode.replaceChild(newReportForm, reportForm);

    newReportForm.addEventListener('submit', function(e) {
      e.preventDefault();

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

      // Always send report to server for SMS notification
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: 'report',
          ...reportData
        }));

        newReportForm.reset();
        const reportModal = document.getElementById('report-modal');
        if (reportModal) {
          reportModal.classList.add("hidden");
        }
        popup("Report submitted successfully. Thank you for helping us improve the game!", "green");
      } else {
        popup("Connection error. Please try again.", "red");
      }
    });

    console.log('[Report Form Fix] Report form fixed successfully!');
  }

  // Start fixing
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fixReportForm);
  } else {
    fixReportForm();
  }
})();
