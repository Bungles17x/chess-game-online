/**
 * Security Improvements Module
 * Provides security enhancements for the chess game application
 */

const Security = {
  // Rate limiting configuration
  RateLimit: {
    MAX_ATTEMPTS: 5,
    WINDOW_MS: 60000, // 1 minute
    attempts: new Map(),

    /**
     * Check if action should be rate limited
     * @param {string} action - The action identifier
     * @returns {boolean} True if action should be blocked
     */
    check(action) {
      const key = `${action}_${this._getWindowKey()}`;
      const attempts = this.attempts.get(key) || 0;

      if (attempts >= this.MAX_ATTEMPTS) {
        console.warn(`Rate limit exceeded for action: ${action}`);
        return true;
      }

      return false;
    },

    /**
     * Record an attempt for rate limiting
     * @param {string} action - The action identifier
     */
    record(action) {
      const key = `${action}_${this._getWindowKey()}`;
      const attempts = (this.attempts.get(key) || 0) + 1;
      this.attempts.set(key, attempts);

      // Clean up old entries
      this._cleanup();
    },

    /**
     * Get current time window key
     * @private
     */
    _getWindowKey() {
      return Math.floor(Date.now() / this.WINDOW_MS);
    },

    /**
     * Clean up old rate limit entries
     * @private
     */
    _cleanup() {
      const currentWindow = this._getWindowKey();
      for (const [key] of this.attempts) {
        const window = parseInt(key.split('_').pop());
        if (window < currentWindow - 1) {
          this.attempts.delete(key);
        }
      }
    }
  },

  // Input sanitization
  Sanitize: {
    /**
     * Sanitize user input to prevent XSS
     * @param {string} input - The input to sanitize
     * @returns {string} The sanitized input
     */
    input(input) {
      if (typeof input !== 'string') return input;

      return input
        .replace(/[&<>"']/g, (char) => ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#x27;'
        }[char]))
        .trim()
        .substring(0, 1000); // Limit length
    },

    /**
     * Sanitize username
     * @param {string} username - The username to sanitize
     * @returns {string} The sanitized username
     */
    username(username) {
      if (typeof username !== 'string') return '';

      // Allow only alphanumeric, underscores, and hyphens
      return username
        .replace(/[^a-zA-Z0-9_-]/g, '')
        .substring(0, 30)
        .toLowerCase();
    },

    /**
     * Sanitize room ID
     * @param {string} roomId - The room ID to sanitize
     * @returns {string} The sanitized room ID
     */
    roomId(roomId) {
      if (typeof roomId !== 'string') return '';

      // Allow only alphanumeric, underscores, and hyphens
      return roomId
        .replace(/[^a-zA-Z0-9_-]/g, '')
        .substring(0, 50);
    },

    /**
     * Sanitize chat message
     * @param {string} message - The message to sanitize
     * @returns {string} The sanitized message
     */
    message(message) {
      if (typeof message !== 'string') return '';

      return this.input(message)
        .substring(0, 500); // Limit chat messages to 500 characters
    }
  },

  // CSRF protection
  CSRF: {
    token: null,

    /**
     * Generate CSRF token
     * @returns {string} The CSRF token
     */
    generate() {
      if (this.token) return this.token;

      this.token = this._generateRandomString(32);
      sessionStorage.setItem('csrfToken', this.token);
      return this.token;
    },

    /**
     * Get CSRF token
     * @returns {string} The CSRF token
     */
    get() {
      return this.token || sessionStorage.getItem('csrfToken') || this.generate();
    },

    /**
     * Validate CSRF token
     * @param {string} token - The token to validate
     * @returns {boolean} True if token is valid
     */
    validate(token) {
      return token === this.get();
    },

    /**
     * Generate random string
     * @private
     */
    _generateRandomString(length) {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let result = '';
      for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    }
  },

  // Content Security Policy helpers
  CSP: {
    /**
     * Validate URL against CSP
     * @param {string} url - The URL to validate
     * @returns {boolean} True if URL is allowed
     */
    isUrlAllowed(url) {
      try {
        const parsed = new URL(url);
        const allowedProtocols = ['http:', 'https:', 'ws:', 'wss:'];

        if (!allowedProtocols.includes(parsed.protocol)) {
          return false;
        }

        // Check against whitelist if defined
        if (this.whitelist && this.whitelist.length > 0) {
          return this.whitelist.some(allowed => {
            const allowedUrl = new URL(allowed);
            return parsed.origin === allowedUrl.origin;
          });
        }

        return true;
      } catch (e) {
        return false;
      }
    },

    /**
     * Set URL whitelist
     * @param {string[]} urls - Array of allowed URLs
     */
    setWhitelist(urls) {
      this.whitelist = urls;
    }
  },

  // Password security
  Password: {
    /**
     * Validate password strength
     * @param {string} password - The password to validate
     * @returns {Object} Validation result with score and feedback
     */
    validate(password) {
      const result = {
        valid: false,
        score: 0,
        feedback: []
      };

      if (!password || typeof password !== 'string') {
        result.feedback.push('Password is required');
        return result;
      }

      // Minimum length
      if (password.length < 8) {
        result.feedback.push('Password must be at least 8 characters');
      } else {
        result.score += 1;
      }

      // Contains uppercase
      if (/[A-Z]/.test(password)) {
        result.score += 1;
      } else {
        result.feedback.push('Include uppercase letters');
      }

      // Contains lowercase
      if (/[a-z]/.test(password)) {
        result.score += 1;
      } else {
        result.feedback.push('Include lowercase letters');
      }

      // Contains numbers
      if (/[0-9]/.test(password)) {
        result.score += 1;
      } else {
        result.feedback.push('Include numbers');
      }

      // Contains special characters
      if (/[^A-Za-z0-9]/.test(password)) {
        result.score += 1;
      } else {
        result.feedback.push('Include special characters');
      }

      result.valid = result.score >= 4;
      return result;
    },

    /**
     * Generate secure random password
     * @param {number} length - The password length
     * @returns {string} The generated password
     */
    generate(length = 16) {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
      let password = '';

      // Ensure at least one of each type
      password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
      password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
      password += '0123456789'[Math.floor(Math.random() * 10)];
      password += '!@#$%^&*()_+-=[]{}|;:,.<>?'[Math.floor(Math.random() * 30)];

      // Fill rest with random characters
      for (let i = password.length; i < length; i++) {
        password += chars[Math.floor(Math.random() * chars.length)];
      }

      // Shuffle the password
      return password.split('').sort(() => Math.random() - 0.5).join('');
    }
  },

  // Session management
  Session: {
    /**
     * Create secure session token
     * @returns {string} The session token
     */
    createToken() {
      return this._generateRandomString(64);
    },

    /**
     * Validate session
     * @param {string} token - The session token
     * @returns {boolean} True if session is valid
     */
    isValid(token) {
      if (!token || typeof token !== 'string') return false;
      if (token.length !== 64) return false;

      // Check if session exists in storage
      const sessions = JSON.parse(localStorage.getItem('sessions') || '{}');
      const session = sessions[token];

      if (!session) return false;

      // Check if session has expired
      if (Date.now() > session.expiresAt) {
        delete sessions[token];
        localStorage.setItem('sessions', JSON.stringify(sessions));
        return false;
      }

      return true;
    },

    /**
     * Invalidate session
     * @param {string} token - The session token
     */
    invalidate(token) {
      const sessions = JSON.parse(localStorage.getItem('sessions') || '{}');
      delete sessions[token];
      localStorage.setItem('sessions', JSON.stringify(sessions));
    },

    /**
     * Generate random string
     * @private
     */
    _generateRandomString(length) {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let result = '';
      for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    }
  },

  /**
   * Initialize security features
   */
  init() {
    // Generate CSRF token
    this.CSRF.generate();

    // Set up CSP whitelist
    this.CSP.setWhitelist([
      window.location.origin,
      'https://chess-game-online-u34h.onrender.com'
    ]);

    // Clean up expired sessions
    this._cleanupExpiredSessions();

    console.log('Security module initialized');
  },

  /**
   * Clean up expired sessions
   * @private
   */
  _cleanupExpiredSessions() {
    const sessions = JSON.parse(localStorage.getItem('sessions') || '{}');
    const now = Date.now();
    let cleaned = false;

    for (const [token, session] of Object.entries(sessions)) {
      if (now > session.expiresAt) {
        delete sessions[token];
        cleaned = true;
      }
    }

    if (cleaned) {
      localStorage.setItem('sessions', JSON.stringify(sessions));
    }
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Security;
}

// Make available globally
window.Security = Security;

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  Security.init();
});
