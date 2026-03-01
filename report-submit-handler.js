// Report Submit Handler - Clean, Simple, Error-Free
// This file handles report submission without any page refresh

(function() {
  console.log('[Report Submit Handler] Initializing...');

  // Global flag to prevent multiple submissions
  let isSubmitting = false;

  // Function to handle report submission
  function handleReportSubmission(e) {
    console.log('[Report Submit Handler] Submit button clicked');

    // Prevent any default behavior
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    // Check if already submitting
    if (isSubmitting) {
      console.log('[Report Submit Handler] Already submitting, ignoring click');
      return false;
    }

    // Set flag to prevent multiple submissions
    isSubmitting = true;

    console.log('[Report Submit Handler] Default behavior prevented');

    // Get form elements
    const reportType = document.getElementById('report-type');
    const reportReason = document.getElementById('report-reason');
    const reportDescription = document.getElementById('report-description');

    if (!reportType || !reportDescription) {
      console.error('[Report Submit Handler] Form elements not found!');
      alert('Error: Form elements not found. Please refresh the page and try again.');
      isSubmitting = false;
      return false;
    }

    // Collect form data
    const reportData = {
      reportType: reportType.value,
      reason: reportReason ? reportReason.value : '',
      description: reportDescription.value
    };

    console.log('[Report Submit Handler] Report data:', reportData);

    // Check if user is logged in for online mode
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
    if (typeof isOnlineGame !== 'undefined' && isOnlineGame && !currentUser) {
      alert('You must be logged in to submit reports in online games');
      isSubmitting = false;
      return false;
    }

    // Check WebSocket connection
    if (typeof socket !== 'undefined' && socket && socket.readyState === WebSocket.OPEN) {
      console.log('[Report Submit Handler] Sending report to server...');

      try {
        // Send report to server
        socket.send(JSON.stringify({
          type: 'report',
          ...reportData
        }));

        console.log('[Report Submit Handler] Report sent successfully');

        // Don't reset form or close modal here - wait for server response
        // The server will send a "reportSubmitted" message which will be handled by script.js
      } catch (error) {
        console.error('[Report Submit Handler] Error sending report:', error);
        alert('Error sending report: ' + error.message);
        isSubmitting = false;
        return false;
      }
    } else if (typeof ensureSocket === 'function') {
      console.log('[Report Submit Handler] WebSocket not connected, attempting to reconnect...');
      ensureSocket();

      // Wait for connection to be established
      const maxWaitTime = 5000; // 5 seconds
      const startTime = Date.now();

      return new Promise((resolve) => {
        const checkConnection = setInterval(() => {
          if (typeof socket !== 'undefined' && socket && socket.readyState === WebSocket.OPEN) {
            clearInterval(checkConnection);
            console.log('[Report Submit Handler] Connection established, sending report...');

            try {
              // Send report to server
              socket.send(JSON.stringify({
                type: 'report',
                ...reportData
              }));

              console.log('[Report Submit Handler] Report sent successfully');

              // Reset form
              const reportForm = document.getElementById('report-form');
              if (reportForm) {
                reportForm.reset();
              }

              // Close modal
              const reportModal = document.getElementById('report-modal');
              if (reportModal) {
                reportModal.classList.add('hidden');
              }

              // Show success message
              if (typeof popup === 'function') {
                popup('Report submitted successfully. Thank you for helping us improve the game!', 'green');
              } else {
                alert('Report submitted successfully!');
              }

              resolve();
            } catch (error) {
              console.error('[Report Submit Handler] Error sending report:', error);
              alert('Error sending report: ' + error.message);
              resolve();
            }
          } else if (Date.now() - startTime > maxWaitTime) {
            clearInterval(checkConnection);
            console.error('[Report Submit Handler] Failed to establish connection');
            alert('Connection error. Please check your internet connection and try again.');
            resolve();
          }
        }, 100);
      });
    } else {
      console.error('[Report Submit Handler] WebSocket not connected and ensureSocket not available');
      alert('Connection error. Please check your internet connection and try again.');
      isSubmitting = false;
      return false;
    }

    // Reset flag after a short delay
    setTimeout(() => {
      isSubmitting = false;
    }, 1000);

    return false;
  }

  // Wait for DOM to be fully loaded
  document.addEventListener('DOMContentLoaded', function() {
    console.log('[Report Submit Handler] DOM loaded');

    // Find the form and completely disable its submit event
    const reportForm = document.getElementById('report-form');
    if (reportForm) {
      // Keep the onsubmit attribute and add additional prevention
      reportForm.setAttribute('onsubmit', 'return false;');

      // Add a submit event listener that prevents any submission
      reportForm.addEventListener('submit', function(e) {
        console.log('[Report Submit Handler] Form submit prevented');
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }, true); // Use capture phase to ensure it runs first

      // Prevent default behavior on cancel button
      const cancelBtn = document.getElementById('close-report-btn');
      if (cancelBtn) {
        cancelBtn.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
        }, true);
      }
    }

    // Find the submit button
    const submitBtn = document.getElementById('submit-report-btn');

    if (!submitBtn) {
      console.error('[Report Submit Handler] Submit button not found!');
      return;
    }

    console.log('[Report Submit Handler] Submit button found, adding click handler');

    // Add click handler to the submit button
    submitBtn.addEventListener('click', handleReportSubmission, true); // Use capture phase

    console.log('[Report Submit Handler] Initialization complete');
  });
})();
