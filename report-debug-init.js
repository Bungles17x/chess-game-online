// Report Debug Initialization
// Ensures ReportDebug is available globally

(function() {
  // Wait for ReportDebug to be defined
  function checkReportDebug() {
    if (typeof window.ReportDebug === 'undefined') {
      console.log('%c[REPORT DEBUG] Waiting for ReportDebug to load...', 'color: #ffff00;');
      setTimeout(checkReportDebug, 100);
      return;
    }

    console.log('%c[REPORT DEBUG] ReportDebug is now available', 'color: #00ff00; font-weight: bold;');
    console.log('%c[REPORT DEBUG] Type: ReportDebug.enable() to enable debug mode', 'color: #00aaff;');

    // Make it available globally
    window.ReportDebug = window.ReportDebug;
  }

  // Start checking
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', checkReportDebug);
    } else {
      checkReportDebug();
    }
  } else {
    checkReportDebug();
  }
})();

// Quick access function
function enableReportDebug() {
  if (typeof window.ReportDebug !== 'undefined') {
    window.ReportDebug.enable();
    console.log('%c[REPORT DEBUG] Debug mode enabled via quick access', 'color: #00ff00; font-weight: bold;');
  } else {
    console.error('%c[REPORT DEBUG] ReportDebug not available yet', 'color: #ff0000; font-weight: bold;');
  }
}

// Export quick access function
if (typeof window !== 'undefined') {
  window.enableReportDebug = enableReportDebug;
}

console.log('%c═════════════════════════════════════', 'color: #00aaff;');
console.log('%c🔧 REPORT DEBUG INITIALIZER LOADED', 'color: #00ff00; font-weight: bold; font-size: 14px;');
console.log('%c═════════════════════════════════════', 'color: #00aaff;');
console.log('%cQuick access:', 'color: #ffff00; font-weight: bold;');
console.log('%c  enableReportDebug() - Enable debug mode quickly', 'color: #888888;');
console.log('%c  ReportDebug.enable() - Enable debug mode (when loaded)', 'color: #888888;');
console.log('%c═════════════════════════════════════', 'color: #00aaff;');
