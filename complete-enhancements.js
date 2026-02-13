// Complete Game Enhancements
// Comprehensive improvements for all game features

class CompleteEnhancements {
  constructor() {
    this.initialized = false;
    this.features = {
      animations: true,
      sounds: true,
      notifications: true,
      accessibility: true,
      performance: true
    };
  }

  // Initialize all enhancements
  init() {
    if (this.initialized) return;

    console.log('[Complete] Initializing all enhancements...');

    this.setupPerformanceOptimizations();
    this.setupAccessibilityFeatures();
    this.setupEnhancedAnimations();
    this.setupSoundSystem();
    this.setupNotificationSystem();
    this.setupErrorHandling();
    this.setupKeyboardShortcuts();
    this.setupLocalStorage();
    this.setupResponsiveDesign();

    this.initialized = true;
    console.log('[Complete] All enhancements initialized');
  }

  // Performance optimizations
  setupPerformanceOptimizations() {
    // Lazy load images
    this.setupLazyLoading();

    // Optimize event listeners
    this.setupEventDelegation();

    // Use requestAnimationFrame for animations
    this.setupRAFAnimations();

    // Optimize reflows
    this.setupReflowOptimization();
  }

  // Lazy loading for images
  setupLazyLoading() {
    const images = document.querySelectorAll('img[data-src]');
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.classList.add('loaded');
          imageObserver.unobserve(img);
        }
      });
    }, { rootMargin: '50px' });

    images.forEach(img => imageObserver.observe(img));
  }

  // Event delegation for better performance
  setupEventDelegation() {
    // Delegate click events
    document.addEventListener('click', (e) => {
      const target = e.target.closest('[data-action]');
      if (target) {
        const action = target.dataset.action;
        this.handleAction(action, target, e);
      }
    });

    // Delegate change events
    document.addEventListener('change', (e) => {
      const target = e.target.closest('[data-change]');
      if (target) {
        const change = target.dataset.change;
        this.handleChange(change, target, e);
      }
    });
  }

  // RequestAnimationFrame for smooth animations
  setupRAFAnimations() {
    window.requestAnimFrame = (callback) => {
      return requestAnimationFrame(callback);
    };
  }

  // Optimize reflows
  setupReflowOptimization() {
    // Batch DOM reads
    window.batchReads = (reads) => {
      return reads.map(fn => fn());
    };

    // Batch DOM writes
    window.batchWrites = (writes) => {
      requestAnimationFrame(() => {
        writes.forEach(fn => fn());
      });
    };
  }

  // Accessibility features
  setupAccessibilityFeatures() {
    // Focus management
    this.setupFocusManagement();

    // ARIA attributes
    this.setupARIA();

    // Keyboard navigation
    this.setupKeyboardNavigation();

    // Screen reader support
    this.setupScreenReaderSupport();
  }

  // Focus management
  setupFocusManagement() {
    // Trap focus in modals
    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          this.closeModal(modal);
        }
      });
    });

    // Return focus after modal close
    window.lastFocusedElement = null;
    document.addEventListener('focusin', (e) => {
      window.lastFocusedElement = e.target;
    });
  }

  // ARIA attributes
  setupARIA() {
    // Add ARIA labels to interactive elements
    document.querySelectorAll('button, input, select, textarea').forEach(el => {
      if (!el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby')) {
        const label = el.closest('.form-group')?.querySelector('label');
        if (label) {
          el.setAttribute('aria-labelledby', label.id || label.textContent);
        }
      }
    });

    // Add role attributes
    document.querySelectorAll('.modal').forEach(modal => {
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
    });
  }

  // Keyboard navigation
  setupKeyboardNavigation() {
    document.addEventListener('keydown', (e) => {
      // Tab navigation
      if (e.key === 'Tab') {
        const focusableElements = document.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    });
  }

  // Screen reader support
  setupScreenReaderSupport() {
    // Live regions for dynamic content
    const liveRegion = document.createElement('div');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only';
    liveRegion.id = 'live-region';
    document.body.appendChild(liveRegion);

    // Announce changes
    window.announce = (message) => {
      liveRegion.textContent = '';
      setTimeout(() => {
        liveRegion.textContent = message;
      }, 100);
    };
  }

  // Enhanced animations
  setupEnhancedAnimations() {
    // Stagger animations
    this.setupStaggeredAnimations();

    // Scroll animations
    this.setupScrollAnimations();

    // Hover effects
    this.setupHoverEffects();

    // Loading states
    this.setupLoadingStates();
  }

  // Staggered animations
  setupStaggeredAnimations() {
    const animateElements = (elements, delay = 100) => {
      elements.forEach((el, index) => {
        el.style.animationDelay = `${index * delay}ms`;
        el.classList.add('animate-in');
      });
    };

    window.staggerAnimate = animateElements;
  }

  // Scroll animations
  setupScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          entry.target.classList.remove('hidden');
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.animate-on-scroll').forEach(el => {
      el.classList.add('hidden');
      observer.observe(el);
    });
  }

  // Hover effects
  setupHoverEffects() {
    document.addEventListener('mouseover', (e) => {
      const target = e.target.closest('[data-hover]');
      if (target) {
        const effect = target.dataset.hover;
        this.applyHoverEffect(target, effect);
      }
    });

    document.addEventListener('mouseout', (e) => {
      const target = e.target.closest('[data-hover]');
      if (target) {
        this.removeHoverEffect(target);
      }
    });
  }

  // Apply hover effect
  applyHoverEffect(element, effect) {
    switch (effect) {
      case 'lift':
        element.style.transform = 'translateY(-4px)';
        element.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.3)';
        break;
      case 'scale':
        element.style.transform = 'scale(1.05)';
        break;
      case 'glow':
        element.style.boxShadow = '0 0 20px rgba(14, 165, 233, 0.4)';
        break;
    }
  }

  // Remove hover effect
  removeHoverEffect(element) {
    element.style.transform = '';
    element.style.boxShadow = '';
  }

  // Loading states
  setupLoadingStates() {
    window.showLoading = (message = 'Loading...') => {
      const loading = document.createElement('div');
      loading.className = 'loading-screen';
      loading.innerHTML = `
        <div class="loading-content">
          <div class="spinner"></div>
          <p>${message}</p>
        </div>
      `;
      document.body.appendChild(loading);
      return loading;
    };

    window.hideLoading = () => {
      const loading = document.querySelector('.loading-screen');
      if (loading) {
        loading.style.opacity = '0';
        setTimeout(() => loading.remove(), 300);
      }
    };
  }

  // Sound system
  setupSoundSystem() {
    const sounds = {
      move: document.getElementById('move-sound'),
      capture: document.getElementById('capture-sound'),
      check: document.getElementById('check-sound'),
      checkmate: document.getElementById('checkmate-sound'),
      connect: document.getElementById('reconnected-sound'),
      disconnect: document.getElementById('connection-lost-sound')
    };

    window.playSound = (soundName, volume = 0.3) => {
      const sound = sounds[soundName];
      if (sound) {
        sound.volume = volume;
        sound.currentTime = 0;
        sound.play().catch(err => {
          console.warn('Sound play failed:', err);
        });
      }
    };

    window.setSoundVolume = (volume) => {
      Object.values(sounds).forEach(sound => {
        if (sound) sound.volume = volume;
      });
    };
  }

  // Notification system
  setupNotificationSystem() {
    window.showNotification = (message, type = 'info', duration = 3000) => {
      const notification = document.createElement('div');
      notification.className = `notification ${type}`;
      notification.textContent = message;
      notification.setAttribute('role', 'alert');
      notification.setAttribute('aria-live', 'polite');

      document.body.appendChild(notification);

      setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => notification.remove(), 300);
      }, duration);
    };

    window.showError = (message) => {
      showNotification(message, 'error');
    };

    window.showSuccess = (message) => {
      showNotification(message, 'success');
    };

    window.showWarning = (message) => {
      showNotification(message, 'warning');
    };
  }

  // Error handling
  setupErrorHandling() {
    window.addEventListener('error', (e) => {
      console.error('[Error]', e);
      this.handleError(e);
    });

    window.addEventListener('unhandledrejection', (e) => {
      console.error('[Unhandled Rejection]', e);
      this.handleRejection(e);
    });
  }

  // Handle errors
  handleError(error) {
    const message = error.message || 'An error occurred';
    showNotification(message, 'error');

    // Log to console for debugging
    console.error('[Error Handler]', {
      message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }

  // Handle rejections
  handleRejection(rejection) {
    const message = rejection.reason || 'An operation failed';
    showNotification(message, 'error');

    console.error('[Rejection Handler]', {
      reason: rejection.reason,
      timestamp: new Date().toISOString()
    });
  }

  // Keyboard shortcuts
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + shortcuts
      if ((e.ctrlKey || e.metaKey)) {
        switch (e.key.toLowerCase()) {
          case 'z':
            e.preventDefault();
            this.undoLastMove();
            break;
          case 'y':
            e.preventDefault();
            this.redoLastMove();
            break;
          case 'n':
            e.preventDefault();
            this.newGame();
            break;
          case 'r':
            e.preventDefault();
            this.resetGame();
            break;
        }
      }

      // Single key shortcuts
      switch (e.key) {
        case 'Escape':
          this.closeAllModals();
          break;
        case 'F1':
          e.preventDefault();
          this.showHelp();
          break;
      }
    });
  }

  // Game actions
  undoLastMove() {
    const undoBtn = document.getElementById('undo-btn');
    if (undoBtn) undoBtn.click();
  }

  redoLastMove() {
    const redoBtn = document.getElementById('redo-btn');
    if (redoBtn) redoBtn.click();
  }

  newGame() {
    if (confirm('Start a new game?')) {
      const resetBtn = document.getElementById('reset-btn');
      if (resetBtn) resetBtn.click();
    }
  }

  resetGame() {
    if (confirm('Reset the current game?')) {
      const resetBtn = document.getElementById('reset-btn');
      if (resetBtn) resetBtn.click();
    }
  }

  // Close all modals
  closeAllModals() {
    document.querySelectorAll('.modal:not(.hidden)').forEach(modal => {
      this.closeModal(modal);
    });
  }

  // Close modal
  closeModal(modal) {
    modal.classList.add('hidden');
    if (window.lastFocusedElement) {
      window.lastFocusedElement.focus();
    }
  }

  // Show help
  showHelp() {
    const shortcuts = `
      Keyboard Shortcuts:
      Ctrl/Cmd + Z: Undo move
      Ctrl/Cmd + Y: Redo move
      Ctrl/Cmd + N: New game
      Ctrl/Cmd + R: Reset game
      Escape: Close modals
      F1: Show this help
    `;
    alert(shortcuts);
  }

  // Local storage management
  setupLocalStorage() {
    // Safe localStorage wrapper
    window.safeStorage = {
      get: (key, defaultValue = null) => {
        try {
          const value = localStorage.getItem(key);
          return value ? JSON.parse(value) : defaultValue;
        } catch (e) {
          console.error('[Storage] Get error:', e);
          return defaultValue;
        }
      },
      set: (key, value) => {
        try {
          localStorage.setItem(key, JSON.stringify(value));
          return true;
        } catch (e) {
          console.error('[Storage] Set error:', e);
          return false;
        }
      },
      remove: (key) => {
        try {
          localStorage.removeItem(key);
          return true;
        } catch (e) {
          console.error('[Storage] Remove error:', e);
          return false;
        }
      },
      clear: () => {
        try {
          localStorage.clear();
          return true;
        } catch (e) {
          console.error('[Storage] Clear error:', e);
          return false;
        }
      }
    };
  }

  // Responsive design
  setupResponsiveDesign() {
    // Handle viewport changes
    this.setupViewportHandler();

    // Touch support
    this.setupTouchSupport();

    // Orientation changes
    this.setupOrientationHandler();
  }

  // Viewport handler
  setupViewportHandler() {
    const updateViewport = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      document.documentElement.style.setProperty('--viewport-width', `${width}px`);
      document.documentElement.style.setProperty('--viewport-height', `${height}px`);

      // Add responsive classes
      if (width < 480) {
        document.body.classList.add('mobile');
        document.body.classList.remove('tablet', 'desktop');
      } else if (width < 768) {
        document.body.classList.add('tablet');
        document.body.classList.remove('mobile', 'desktop');
      } else {
        document.body.classList.add('desktop');
        document.body.classList.remove('mobile', 'tablet');
      }
    };

    updateViewport();
    window.addEventListener('resize', debounce(updateViewport, 250));
  }

  // Touch support
  setupTouchSupport() {
    // Detect touch capabilities
    const isTouch = 'ontouchstart' in window;
    document.body.classList.toggle('touch', isTouch);

    if (isTouch) {
      // Add touch-specific enhancements
      document.querySelectorAll('button, a').forEach(el => {
        el.addEventListener('touchstart', () => {
          el.classList.add('touch-active');
        }, { passive: true });

        el.addEventListener('touchend', () => {
          el.classList.remove('touch-active');
        }, { passive: true });
      });
    }
  }

  // Orientation handler
  setupOrientationHandler() {
    const updateOrientation = () => {
      const orientation = window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
      document.documentElement.style.setProperty('--orientation', orientation);
    };

    updateOrientation();
    window.addEventListener('resize', debounce(updateOrientation, 250));
    window.addEventListener('orientationchange', updateOrientation);
  }
}

// Debounce utility
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Initialize complete enhancements
const completeEnhancements = new CompleteEnhancements();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => completeEnhancements.init());
} else {
  completeEnhancements.init();
}

// Export for global use
window.completeEnhancements = completeEnhancements;
