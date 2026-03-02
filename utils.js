/**
 * Utility Functions Module
 * Provides common utility functions with error handling
 */

const Utils = {
  /**
   * Safely execute a function with error handling
   * @param {Function} fn - The function to execute
   * @param {*} defaultValue - Default value to return on error
   * @param {string} context - Context for error logging
   * @returns {*} Result of function or default value
   */
  safeExecute(fn, defaultValue = null, context = 'Unknown') {
    try {
      return fn();
    } catch (error) {
      console.error(`Error in ${context}:`, error);
      return defaultValue;
    }
  },

  /**
   * Safely add event listener
   * @param {EventTarget} element - The element to add listener to
   * @param {string} event - The event name
   * @param {Function} handler - The event handler
   * @param {Object} options - Event listener options
   */
  addListener(element, event, handler, options = {}) {
    if (!element || typeof element.addEventListener !== 'function') {
      console.warn(`Cannot add listener to element for event: ${event}`);
      return;
    }
    element.addEventListener(event, handler, options);
  },

  /**
   * Safely remove event listener
   * @param {EventTarget} element - The element to remove listener from
   * @param {string} event - The event name
   * @param {Function} handler - The event handler
   * @param {Object} options - Event listener options
   */
  removeListener(element, event, handler, options = {}) {
    if (!element || typeof element.removeEventListener !== 'function') {
      console.warn(`Cannot remove listener from element for event: ${event}`);
      return;
    }
    element.removeEventListener(event, handler, options);
  },

  /**
   * Safely set element text content
   * @param {HTMLElement} element - The element
   * @param {string} text - The text content
   */
  setText(element, text) {
    if (!element) return;
    try {
      element.textContent = text;
    } catch (error) {
      console.error('Error setting text content:', error);
    }
  },

  /**
   * Safely add/remove CSS class
   * @param {HTMLElement} element - The element
   * @param {string} className - The class name
   * @param {boolean} add - True to add, false to remove
   */
  toggleClass(element, className, add = true) {
    if (!element || !element.classList) return;
    try {
      if (add) {
        element.classList.add(className);
      } else {
        element.classList.remove(className);
      }
    } catch (error) {
      console.error('Error toggling class:', error);
    }
  },

  /**
   * Safely show/hide element
   * @param {HTMLElement} element - The element
   * @param {boolean} show - True to show, false to hide
   */
  toggleDisplay(element, show = true) {
    if (!element || !element.style) return;
    try {
      element.style.display = show ? '' : 'none';
    } catch (error) {
      console.error('Error toggling display:', error);
    }
  },

  /**
   * Safely get element attribute
   * @param {HTMLElement} element - The element
   * @param {string} attr - The attribute name
   * @returns {string|null} The attribute value
   */
  getAttribute(element, attr) {
    if (!element || typeof element.getAttribute !== 'function') {
      return null;
    }
    return element.getAttribute(attr);
  },

  /**
   * Safely set element attribute
   * @param {HTMLElement} element - The element
   * @param {string} attr - The attribute name
   * @param {string} value - The attribute value
   */
  setAttribute(element, attr, value) {
    if (!element || typeof element.setAttribute !== 'function') {
      return;
    }
    try {
      element.setAttribute(attr, value);
    } catch (error) {
      console.error('Error setting attribute:', error);
    }
  },

  /**
   * Debounce function execution
   * @param {Function} func - The function to debounce
   * @param {number} wait - Wait time in milliseconds
   * @returns {Function} Debounced function
   */
  debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  /**
   * Throttle function execution
   * @param {Function} func - The function to throttle
   * @param {number} limit - Time limit in milliseconds
   * @returns {Function} Throttled function
   */
  throttle(func, limit = 300) {
    let inThrottle;
    return function executedFunction(...args) {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  /**
   * Format timestamp to readable string
   * @param {number} timestamp - Unix timestamp
   * @returns {string} Formatted date string
   */
  formatDate(timestamp) {
    try {
      return new Date(timestamp).toLocaleString();
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  },

  /**
   * Validate email format
   * @param {string} email - Email address
   * @returns {boolean} True if valid
   */
  isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  },

  /**
   * Generate unique ID
   * @returns {string} Unique identifier
   */
  generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  },

  /**
   * Deep clone object
   * @param {*} obj - Object to clone
   * @returns {*} Cloned object
   */
  deepClone(obj) {
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch (error) {
      console.error('Error cloning object:', error);
      return obj;
    }
  },

  /**
   * Check if object is empty
   * @param {Object} obj - Object to check
   * @returns {boolean} True if empty
   */
  isEmpty(obj) {
    if (obj == null) return true;
    if (Array.isArray(obj)) return obj.length === 0;
    if (typeof obj === 'object') return Object.keys(obj).length === 0;
    return false;
  },

  /**
   * Merge objects safely
   * @param {Object} target - Target object
   * @param {...Object} sources - Source objects
   * @returns {Object} Merged object
   */
  merge(target, ...sources) {
    try {
      return Object.assign({}, target, ...sources);
    } catch (error) {
      console.error('Error merging objects:', error);
      return target;
    }
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Utils;
}

// Make available globally
window.Utils = Utils;
