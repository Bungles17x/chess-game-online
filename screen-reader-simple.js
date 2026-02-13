// Simple Screen Reader Enhancement
// Basic screen reader functionality

// Initialize screen reader mode
function initScreenReader() {
  // Get saved preference
  const screenReaderMode = localStorage.getItem('screenReaderMode') === 'true';
  window.screenReaderMode = screenReaderMode;

  // Create live region
  createLiveRegion();

  // Setup toggle in settings
  setupScreenReaderToggle();

  // Apply initial state
  if (screenReaderMode) {
    enableScreenReader();
  }

  console.log('[Screen Reader] Initialized', { enabled: screenReaderMode });
}

// Create live region for announcements
function createLiveRegion() {
  const liveRegion = document.createElement('div');
  liveRegion.setAttribute('aria-live', 'polite');
  liveRegion.setAttribute('aria-atomic', 'true');
  liveRegion.className = 'sr-only';
  liveRegion.id = 'screen-reader-announcer';
  liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;';
  document.body.appendChild(liveRegion);
  window.screenReaderAnnouncer = liveRegion;
}

// Setup screen reader toggle in settings
function setupScreenReaderToggle() {
  const toggle = document.getElementById('screen-reader-toggle');
  if (toggle) {
    // Set initial state
    toggle.checked = window.screenReaderMode;

    // Add change listener
    toggle.addEventListener('change', function() {
      window.screenReaderMode = this.checked;
      localStorage.setItem('screenReaderMode', this.checked);

      if (this.checked) {
        enableScreenReader();
      } else {
        disableScreenReader();
      }
    });
  }
}

// Enable screen reader mode
function enableScreenReader() {
  console.log('[Screen Reader] Enabled');
  announce('Screen reader mode enabled');

  // Add ARIA labels to board
  const board = document.getElementById('chessboard');
  if (board) {
    board.setAttribute('role', 'grid');
    board.setAttribute('aria-label', 'Chess board');

    // Label squares
    const squares = board.querySelectorAll('.square');
    squares.forEach((square, index) => {
      const row = Math.floor(index / 8);
      const col = index % 8;
      const file = String.fromCharCode(97 + col);
      const rank = 8 - row;
      square.setAttribute('role', 'gridcell');
      square.setAttribute('aria-label', `${file}${rank}`);
    });
  }
}

// Disable screen reader mode
function disableScreenReader() {
  console.log('[Screen Reader] Disabled');
  announce('Screen reader mode disabled');

  // Remove ARIA labels
  const board = document.getElementById('chessboard');
  if (board) {
    board.removeAttribute('role');
    board.removeAttribute('aria-label');

    const squares = board.querySelectorAll('.square');
    squares.forEach(square => {
      square.removeAttribute('role');
      square.removeAttribute('aria-label');
    });
  }
}

// Announce message to screen reader
function announce(message) {
  if (!window.screenReaderAnnouncer) return;

  window.screenReaderAnnouncer.textContent = '';
  window.screenReaderAnnouncer.offsetHeight; // Force reflow
  window.screenReaderAnnouncer.textContent = message;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initScreenReader);
} else {
  initScreenReader();
}

// Export functions
window.announce = announce;
window.enableScreenReader = enableScreenReader;
window.disableScreenReader = disableScreenReader;
