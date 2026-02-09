// debugger-integration.js - Integrates the in-game debugger with existing code

// Override the debugLog function to also log to the in-game debugger
(function() {
    // Store the original debugLog function
    const originalDebugLog = window.debugLog;

    // Override debugLog if it exists
    if (typeof originalDebugLog === 'function') {
        window.debugLog = function(category, message, data = null) {
            // Call the original function
            originalDebugLog(category, message, data);

            // Also log to the in-game debugger if available
            if (window.Debugger && window.Debugger.enabled) {
                window.Debugger.log(category, message, data);
            }
        };
    }

    // Initialize the debugger when the page loads
    document.addEventListener('DOMContentLoaded', function() {
        if (window.Debugger) {
            window.Debugger.init();
            console.log('Debugger initialized successfully');
        }
    });
})();
