/**
 * Mobile Optimization Module
 * Ensures optimal experience on mobile devices
 */

const MobileOptimization = {
  // Track mobile state
  isMobile: false,
  isTouch: false,
  viewportWidth: 0,
  viewportHeight: 0,

  /**
   * Initialize mobile optimizations
   */
  init() {
    console.log('[Mobile Optimization] Initializing...');
    this.detectDevice();
    this.setupViewport();
    this.optimizeTouch();
    this.optimizeLayout();
    this.optimizePerformance();
    this.setupOrientation();
    this.setupKeyboard();
    this.addMobileListeners();
    console.log('[Mobile Optimization] Initialized');
  },

  /**
   * Detect device type
   */
  detectDevice() {
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    this.isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    this.viewportWidth = window.innerWidth;
    this.viewportHeight = window.innerHeight;

    // Add device classes to body
    document.body.classList.toggle('mobile', this.isMobile);
    document.body.classList.toggle('touch', this.isTouch);

    console.log('[Mobile Optimization] Device detected:', {
      isMobile: this.isMobile,
      isTouch: this.isTouch,
      viewport: `${this.viewportWidth}x${this.viewportHeight}`
    });
  },

  /**
   * Setup viewport meta tag
   */
  setupViewport() {
    let viewport = document.querySelector('meta[name="viewport"]');

    if (!viewport) {
      viewport = document.createElement('meta');
      viewport.name = 'viewport';
      document.head.appendChild(viewport);
    }

    // Comprehensive viewport settings
    viewport.content = [
      'width=device-width',
      'initial-scale=1.0',
      'maximum-scale=5.0',
      'user-scalable=yes',
      'viewport-fit=cover'
    ].join(', ');

    // Prevent zoom on double tap for better game experience
    document.addEventListener('touchend', (e) => {
      const now = Date.now();
      if (now - (this.lastTouchEnd || 0) < 300) {
        e.preventDefault();
      }
      this.lastTouchEnd = now;
    }, { passive: false });
  },

  /**
   * Optimize touch interactions
   */
  optimizeTouch() {
    if (!this.isTouch) return;

    // Add touch-action CSS
    const style = document.createElement('style');
    style.textContent = `
      .touch * {
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;
      }

      .touch button,
      .touch .square,
      .touch input,
      .touch textarea {
        touch-action: manipulation;
      }

      .touch #chessboard {
        touch-action: none;
      }
    `;
    document.head.appendChild(style);

    // Prevent default touch behaviors on chessboard
    const chessboard = document.getElementById('chessboard');
    if (chessboard) {
      chessboard.addEventListener('touchstart', (e) => {
        e.preventDefault();
      }, { passive: false });
    }
  },

  /**
   * Optimize layout for mobile
   */
  optimizeLayout() {
    // Add mobile-specific CSS
    const style = document.createElement('style');
    style.textContent = `
      @media (max-width: 768px) {
        /* Chessboard sizing */
        #chessboard {
          width: 100vw;
          max-width: 100vw;
          height: 100vw;
          max-height: 100vw;
          font-size: 8vw;
        }

        .square {
          font-size: 8vw;
        }

        /* Container adjustments */
        .container {
          padding: 10px;
          max-width: 100%;
        }

        /* Button sizing */
        button {
          min-height: 44px;
          padding: 12px 16px;
          font-size: 16px;
        }

        /* Modal adjustments */
        .modal-content {
          width: 95vw;
          max-height: 90vh;
          padding: 16px;
        }

        /* Chat adjustments */
        .chat-container {
          max-height: 300px;
        }

        .chat-messages {
          max-height: 200px;
        }

        /* Form adjustments */
        input,
        textarea,
        select {
          font-size: 16px;
          min-height: 44px;
        }

        /* Menu adjustments */
        .dropdown-content {
          width: 100vw;
          max-width: 300px;
          right: 0;
        }

        /* Turn indicator */
        #turn-indicator {
          font-size: 14px;
          padding: 8px 12px;
        }

        /* Moves list */
        #moves-list {
          font-size: 12px;
          max-height: 150px;
        }
      }

      @media (max-width: 480px) {
        /* Smaller chessboard */
        #chessboard {
          font-size: 10vw;
        }

        .square {
          font-size: 10vw;
        }

        /* Compact buttons */
        button {
          padding: 10px 12px;
          font-size: 14px;
        }

        /* Smaller modal */
        .modal-content {
          padding: 12px;
        }

        /* Compact chat */
        .chat-container {
          max-height: 250px;
        }

        .chat-messages {
          max-height: 150px;
        }
      }

      /* Landscape optimizations */
      @media (max-height: 500px) and (orientation: landscape) {
        #chessboard {
          width: 50vh;
          height: 50vh;
          max-width: 50vh;
          max-height: 50vh;
        }

        .square {
          font-size: 5vh;
        }

        .modal-content {
          max-height: 80vh;
        }
      }
    `;
    document.head.appendChild(style);
  },

  /**
   * Optimize performance for mobile
   */
  optimizePerformance() {
    if (!this.isMobile) return;

    // Reduce animations on mobile
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.documentElement.style.setProperty('--transition-fast', '0s');
      document.documentElement.style.setProperty('--transition-normal', '0.1s');
      document.documentElement.style.setProperty('--transition-slow', '0.2s');
    }

    // Optimize chessboard rendering
    const chessboard = document.getElementById('chessboard');
    if (chessboard) {
      chessboard.style.willChange = 'transform';
      chessboard.style.transform = 'translateZ(0)';
    }

    // Lazy load images
    const images = document.querySelectorAll('img[data-src]');
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
          imageObserver.unobserve(img);
        }
      });
    });

    images.forEach(img => imageObserver.observe(img));
  },

  /**
   * Setup orientation handling
   */
  setupOrientation() {
    const handleOrientation = () => {
      const isPortrait = window.innerHeight > window.innerWidth;
      document.body.classList.toggle('portrait', isPortrait);
      document.body.classList.toggle('landscape', !isPortrait);

      // Adjust chessboard size based on orientation
      const chessboard = document.getElementById('chessboard');
      if (chessboard) {
        const size = isPortrait ? '100vw' : '50vh';
        chessboard.style.width = size;
        chessboard.style.height = size;
        chessboard.style.maxWidth = size;
        chessboard.style.maxHeight = size;
      }
    };

    window.addEventListener('orientationchange', handleOrientation);
    window.addEventListener('resize', handleOrientation);
    handleOrientation();
  },

  /**
   * Setup keyboard handling
   */
  setupKeyboard() {
    if (!this.isMobile) return;

    // Handle virtual keyboard
    const inputs = document.querySelectorAll('input, textarea');
    inputs.forEach(input => {
      input.addEventListener('focus', () => {
        document.body.classList.add('keyboard-open');
      });

      input.addEventListener('blur', () => {
        document.body.classList.remove('keyboard-open');
      });
    });

    // Add keyboard-specific styles
    const style = document.createElement('style');
    style.textContent = `
      .keyboard-open .modal-content {
        max-height: 50vh;
      }

      .keyboard-open #chessboard {
        transform: scale(0.9);
      }
    `;
    document.head.appendChild(style);
  },

  /**
   * Add mobile-specific event listeners
   */
  addMobileListeners() {
    if (!this.isMobile) return;

    // Handle touch events for chessboard
    const chessboard = document.getElementById('chessboard');
    if (chessboard) {
      let lastTap = 0;

      chessboard.addEventListener('touchend', (e) => {
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTap;

        if (tapLength < 300 && tapLength > 0) {
          // Double tap detected
          e.preventDefault();
          const square = e.target.closest('.square');
          if (square) {
            square.dispatchEvent(new MouseEvent('dblclick', {
              bubbles: true,
              cancelable: true
            }));
          }
        }
        lastTap = currentTime;
      });
    }

    // Prevent pull-to-refresh on chessboard
    let startY = 0;
    document.addEventListener('touchstart', (e) => {
      if (e.target.closest('#chessboard')) {
        startY = e.touches[0].clientY;
      }
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
      if (e.target.closest('#chessboard')) {
        const currentY = e.touches[0].clientY;
        const diff = currentY - startY;

        if (diff < 0) {
          e.preventDefault();
        }
      }
    }, { passive: false });
  },

  /**
   * Get mobile status
   * @returns {Object} Mobile status information
   */
  getStatus() {
    return {
      isMobile: this.isMobile,
      isTouch: this.isTouch,
      viewport: {
        width: this.viewportWidth,
        height: this.viewportHeight
      },
      orientation: window.innerHeight > window.innerWidth ? 'portrait' : 'landscape'
    };
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MobileOptimization;
}

// Make available globally
window.MobileOptimization = MobileOptimization;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => MobileOptimization.init());
} else {
  MobileOptimization.init();
}
