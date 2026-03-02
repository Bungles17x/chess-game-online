/**
 * Error Handler Module
 * Provides centralized error handling and user feedback for the chess game application
 */

const ErrorHandler = {
  // Error types
  ErrorTypes: {
    NETWORK: 'network',
    WEBSOCKET: 'websocket',
    AUTHENTICATION: 'authentication',
    GAME_STATE: 'game_state',
    VALIDATION: 'validation',
    SERVER: 'server',
    UNKNOWN: 'unknown'
  },

  // Error severity levels
  Severity: {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical'
  },

  // Error messages
  ErrorMessages: {
    NETWORK: {
      title: 'Network Error',
      message: 'Unable to connect to the server. Please check your internet connection.',
      action: 'Please check your connection and try again.'
    },
    WEBSOCKET: {
      title: 'Connection Error',
      message: 'Lost connection to the game server.',
      action: 'Attempting to reconnect...'
    },
    AUTHENTICATION: {
      title: 'Authentication Error',
      message: 'Failed to authenticate with the server.',
      action: 'Please log in again.'
    },
    GAME_STATE: {
      title: 'Game State Error',
      message: 'An error occurred with the game state.',
      action: 'The game will be reset.'
    },
    VALIDATION: {
      title: 'Invalid Input',
      message: 'The input provided is invalid.',
      action: 'Please check your input and try again.'
    },
    SERVER: {
      title: 'Server Error',
      message: 'An error occurred on the server.',
      action: 'Please try again later.'
    },
    UNKNOWN: {
      title: 'Unexpected Error',
      message: 'An unexpected error occurred.',
      action: 'Please refresh the page and try again.'
    }
  },

  /**
   * Handle an error with appropriate user feedback
   * @param {Error|string} error - The error object or error message
   * @param {string} type - The type of error (from ErrorTypes)
   * @param {string} severity - The severity level (from Severity)
   * @param {Object} context - Additional context about the error
   */
  handle(error, type = this.ErrorTypes.UNKNOWN, severity = this.Severity.MEDIUM, context = {}) {
    const errorInfo = this._getErrorInfo(error, type, context);

    // Log the error
    this._logError(errorInfo, severity);

    // Show user feedback based on severity
    this._showUserFeedback(errorInfo, severity);

    // Report critical errors
    if (severity === this.Severity.CRITICAL) {
      this._reportError(errorInfo);
    }

    return errorInfo;
  },

  /**
   * Get standardized error information
   * @private
   */
  _getErrorInfo(error, type, context) {
    const errorMessage = error?.message || String(error);
    const errorType = this.ErrorMessages[type] || this.ErrorMessages.UNKNOWN;

    return {
      type,
      severity: context.severity || this.Severity.MEDIUM,
      message: errorMessage,
      title: errorType.title,
      description: errorType.message,
      action: errorType.action,
      timestamp: new Date().toISOString(),
      context: {
        ...context,
        stack: error?.stack,
        userAgent: navigator.userAgent,
        url: window.location.href
      }
    };
  },

  /**
   * Log error to console with appropriate level
   * @private
   */
  _logError(errorInfo, severity) {
    const logMethod = {
      [this.Severity.LOW]: console.info,
      [this.Severity.MEDIUM]: console.warn,
      [this.Severity.HIGH]: console.error,
      [this.Severity.CRITICAL]: console.error
    }[severity] || console.error;

    logMethod('Error Handler:', {
      type: errorInfo.type,
      message: errorInfo.message,
      context: errorInfo.context
    });
  },

  /**
   * Show user feedback based on error severity
   * @private
   */
  _showUserFeedback(errorInfo, severity) {
    // Use notification system if available
    if (typeof showNotification === 'function') {
      showNotification(
        errorInfo.title,
        `${errorInfo.description}\n${errorInfo.action}`,
        this._getNotificationType(severity)
      );
    } else {
      // Fallback to alert if notification system not available
      console.warn('Notification system not available, using alert');
      alert(`${errorInfo.title}\n${errorInfo.description}\n${errorInfo.action}`);
    }
  },

  /**
   * Get notification type based on error severity
   * @private
   */
  _getNotificationType(severity) {
    const severityMap = {
      [this.Severity.LOW]: 'info',
      [this.Severity.MEDIUM]: 'warning',
      [this.Severity.HIGH]: 'error',
      [this.Severity.CRITICAL]: 'error'
    };
    return severityMap[severity] || 'error';
  },

  /**
   * Report critical errors to server
   * @private
   */
  _reportError(errorInfo) {
    try {
      // Send error report to server if socket is available
      if (window.socket && window.socket.readyState === WebSocket.OPEN) {
        window.socket.send(JSON.stringify({
          type: 'errorReport',
          error: errorInfo
        }));
      }

      // Store error in localStorage for later reporting
      const errorReports = JSON.parse(localStorage.getItem('errorReports') || '[]');
      errorReports.push(errorInfo);

      // Keep only last 50 errors
      if (errorReports.length > 50) {
        errorReports.shift();
      }

      localStorage.setItem('errorReports', JSON.stringify(errorReports));
    } catch (e) {
      console.error('Failed to report error:', e);
    }
  },

  /**
   * Create a wrapped version of a function with error handling
   * @param {Function} fn - The function to wrap
   * @param {string} type - The error type
   * @param {string} severity - The error severity
   * @returns {Function} The wrapped function
   */
  wrap(fn, type = this.ErrorTypes.UNKNOWN, severity = this.Severity.MEDIUM) {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (error) {
        this.handle(error, type, severity, { function: fn.name, args });
        throw error;
      }
    };
  },

  /**
   * Create a safe version of a function that returns a default value on error
   * @param {Function} fn - The function to wrap
   * @param {*} defaultValue - The default value to return on error
   * @param {string} type - The error type
   * @param {string} severity - The error severity
   * @returns {Function} The safe function
   */
  safe(fn, defaultValue = null, type = this.ErrorTypes.UNKNOWN, severity = this.Severity.LOW) {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (error) {
        this.handle(error, type, severity, { function: fn.name, args });
        return defaultValue;
      }
    };
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ErrorHandler;
}

// Make available globally
window.ErrorHandler = ErrorHandler;
