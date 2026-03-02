/**
 * Performance Optimizations Module
 * Provides performance enhancements for the chess game application
 */

const Performance = {
  // Lazy loading configuration
  LazyLoad: {
    loadedScripts: new Set(),
    loadedStyles: new Set(),

    /**
     * Lazy load a script
     * @param {string} src - The script source
     * @returns {Promise<void>} Resolves when script is loaded
     */
    async script(src) {
      if (this.loadedScripts.has(src)) {
        return Promise.resolve();
      }

      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.async = true;

        script.onload = () => {
          this.loadedScripts.add(src);
          resolve();
        };

        script.onerror = () => {
          reject(new Error(`Failed to load script: ${src}`));
        };

        document.head.appendChild(script);
      });
    },

    /**
     * Lazy load a stylesheet
     * @param {string} href - The stylesheet href
     * @returns {Promise<void>} Resolves when stylesheet is loaded
     */
    async style(href) {
      if (this.loadedStyles.has(href)) {
        return Promise.resolve();
      }

      return new Promise((resolve, reject) => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;

        link.onload = () => {
          this.loadedStyles.add(href);
          resolve();
        };

        link.onerror = () => {
          reject(new Error(`Failed to load stylesheet: ${href}`));
        };

        document.head.appendChild(link);
      });
    },

    /**
     * Lazy load an image
     * @param {HTMLImageElement} img - The image element
     * @param {string} src - The image source
     */
    image(img, src) {
      if (!img || !src) return;

      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            img.src = src;
            observer.unobserve(img);
          }
        });
      }, { rootMargin: '50px' });

      observer.observe(img);
    }
  },

  // Debouncing and throttling
  Timing: {
    /**
     * Debounce a function
     * @param {Function} fn - The function to debounce
     * @param {number} delay - The delay in milliseconds
     * @returns {Function} The debounced function
     */
    debounce(fn, delay = 300) {
      let timeoutId;
      return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn.apply(this, args), delay);
      };
    },

    /**
     * Throttle a function
     * @param {Function} fn - The function to throttle
     * @param {number} limit - The time limit in milliseconds
     * @returns {Function} The throttled function
     */
    throttle(fn, limit = 300) {
      let inThrottle;
      return function (...args) {
        if (!inThrottle) {
          fn.apply(this, args);
          inThrottle = true;
          setTimeout(() => inThrottle = false, limit);
        }
      };
    },

    /**
     * Request animation frame throttle
     * @param {Function} fn - The function to throttle
     * @returns {Function} The throttled function
     */
    rafThrottle(fn) {
      let rafId = null;
      return function (...args) {
        if (rafId === null) {
          rafId = requestAnimationFrame(() => {
            fn.apply(this, args);
            rafId = null;
          });
        }
      };
    }
  },

  // Memory management
  Memory: {
    observers: new Set(),
    eventListeners: new Map(),

    /**
     * Create an intersection observer with automatic cleanup
     * @param {Function} callback - The callback function
     * @param {Object} options - Observer options
     * @returns {IntersectionObserver} The observer
     */
    createObserver(callback, options) {
      const observer = new IntersectionObserver(callback, options);
      this.observers.add(observer);
      return observer;
    },

    /**
     * Add event listener with automatic cleanup
     * @param {EventTarget} target - The event target
     * @param {string} event - The event name
     * @param {Function} handler - The event handler
     * @param {Object} options - Event listener options
     */
    addListener(target, event, handler, options) {
      if (!target || !event || !handler) return;

      target.addEventListener(event, handler, options);

      if (!this.eventListeners.has(target)) {
        this.eventListeners.set(target, []);
      }

      this.eventListeners.get(target).push({ event, handler, options });
    },

    /**
     * Clean up all resources
     */
    cleanup() {
      // Clean up observers
      this.observers.forEach(observer => observer.disconnect());
      this.observers.clear();

      // Clean up event listeners
      this.eventListeners.forEach((listeners, target) => {
        listeners.forEach(({ event, handler, options }) => {
          target.removeEventListener(event, handler, options);
        });
      });

      this.eventListeners.clear();
    }
  },

  // Caching
  Cache: {
    cache: new Map(),
    maxSize: 100,

    /**
     * Get value from cache
     * @param {string} key - The cache key
     * @returns {*} The cached value or undefined
     */
    get(key) {
      const entry = this.cache.get(key);

      if (!entry) return undefined;

      // Check if entry has expired
      if (entry.expiresAt && Date.now() > entry.expiresAt) {
        this.cache.delete(key);
        return undefined;
      }

      // Move to end for LRU
      this.cache.delete(key);
      this.cache.set(key, entry);

      return entry.value;
    },

    /**
     * Set value in cache
     * @param {string} key - The cache key
     * @param {*} value - The value to cache
     * @param {number} ttl - Time to live in milliseconds
     */
    set(key, value, ttl = 60000) {
      // Remove oldest entry if cache is full
      if (this.cache.size >= this.maxSize) {
        const firstKey = this.cache.keys().next().value;
        this.cache.delete(firstKey);
      }

      this.cache.set(key, {
        value,
        expiresAt: ttl ? Date.now() + ttl : null
      });
    },

    /**
     * Clear cache
     */
    clear() {
      this.cache.clear();
    },

    /**
     * Remove expired entries
     */
    cleanup() {
      const now = Date.now();
      for (const [key, entry] of this.cache) {
        if (entry.expiresAt && now > entry.expiresAt) {
          this.cache.delete(key);
        }
      }
    }
  },

  // Performance monitoring
  Monitor: {
    metrics: new Map(),

    /**
     * Start measuring performance
     * @param {string} name - The metric name
     */
    start(name) {
      this.metrics.set(name, {
        startTime: performance.now(),
        endTime: null,
        duration: null
      });
    },

    /**
     * Stop measuring performance
     * @param {string} name - The metric name
     * @returns {number} The duration in milliseconds
     */
    stop(name) {
      const metric = this.metrics.get(name);

      if (!metric) {
        console.warn(`No metric found for: ${name}`);
        return null;
      }

      metric.endTime = performance.now();
      metric.duration = metric.endTime - metric.startTime;

      console.log(`Performance [${name}]: ${metric.duration.toFixed(2)}ms`);

      return metric.duration;
    },

    /**
     * Get all metrics
     * @returns {Object} All metrics
     */
    getMetrics() {
      const result = {};
      this.metrics.forEach((value, key) => {
        result[key] = value;
      });
      return result;
    },

    /**
     * Clear all metrics
     */
    clear() {
      this.metrics.clear();
    }
  },

  /**
   * Initialize performance optimizations
   */
  init() {
    // Set up periodic cache cleanup
    setInterval(() => {
      this.Cache.cleanup();
    }, 300000); // Every 5 minutes

    // Clean up on page unload
    window.addEventListener('beforeunload', () => {
      this.Memory.cleanup();
    });

    console.log('Performance module initialized');
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Performance;
}

// Make available globally
window.Performance = Performance;

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  Performance.init();
});
