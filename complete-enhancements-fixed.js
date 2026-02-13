// Complete Game Enhancements - Fixed Version
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
    this.setupLazyLoading();
    this.setupEventDelegation();
    this.setupRAFAnimations();
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
    document.addEventListener('click', (e) => {
      const target = e.target.closest('[data-action]');
      if (target) {
        const action = target.dataset.action;
        this.handleAction(action, target, e);
      }
    });

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
    window.batchReads = (reads) => {
      return reads.map(fn => fn());
    };

    window.batchWrites = (writes) => {
      requestAnimationFrame(() => {
        writes.forEach(fn => fn());
      });
    };
  }

  // Accessibility features
  setupAccessibilityFeatures() {
    this.setupFocusManagement();
    this.setupARIA();
    this.setupKeyboardNavigation();
    this.setupScreenReaderSupport();
  }

  // Focus management
  setupFocusManagement() {
    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          this.closeModal(modal);
        }
      });
    });

    window.lastFocusedElement = null;
    document.addEventListener('focusin', (e) => {
      window.lastFocusedElement = e.target;
    });
  }

  // ARIA attributes
  setupARIA() {
    document.querySelectorAll('button, input, select, textarea').forEach(el => {
      if (!el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby')) {
        const label = el.closest('.form-group')?.querySelector('label');
        if (label) {
          el.setAttribute('aria-labelledby', label.id || label.textContent);
        }
      }
    });

    document.querySelectorAll('.modal').forEach(modal => {
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
    });
  }

  // Keyboard navigation
  setupKeyboardNavigation() {
    document.addEventListener('keydown', (e) => {
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
    const liveRegion = document.createElement('div');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only';
    liveRegion.id = 'live-region';
    document.body.appendChild(liveRegion);

    window.announce = (message) => {
      liveRegion.textContent = '';
      setTimeout(() => {
        liveRegion.textContent = message;
      }, 100);
    };
  }

  // Enhanced animations
  setupEnhancedAnimations() {
    this.setupStaggeredAnimations();
    this.setupScrollAnimations();
    this.setupHoverEffects();
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

      switch (e.key.toLowerCase()) {
        case 'escape':
          const activeModal = document.querySelector('.modal:not(.hidden)');
          if (activeModal) {
            this.closeModal(activeModal);
          }
          break;
        case 'f':
          e.preventDefault();
          this.toggleFullscreen();
          break;
      }
    });
  }

  // Undo last move
  undoLastMove() {
    if (window.game && window.game.undo) {
      window.game.undo();
      window.updateBoard();
      showNotification('Move undone', 'info');
    }
  }

  // Redo last move
  redoLastMove() {
    if (window.game && window.game.redo) {
      window.game.redo();
      window.updateBoard();
      showNotification('Move redone', 'info');
    }
  }

  // Start new game
  newGame() {
    if (confirm('Start a new game?')) {
      if (window.game && window.game.reset) {
        window.game.reset();
        window.updateBoard();
      }
      showNotification('New game started', 'success');
    }
  }

  // Reset game
  resetGame() {
    if (confirm('Reset current game?')) {
      if (window.game && window.game.reset) {
        window.game.reset();
        window.updateBoard();
      }
      showNotification('Game reset', 'success');
    }
  }

  // Toggle fullscreen
  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.warn('Fullscreen request failed:', err);
      });
    } else {
      document.exitFullscreen();
    }
  }

  // Close modal
  closeModal(modal) {
    const content = modal.querySelector('.modal-content');
    if (content) {
      content.style.transition = 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
      content.style.transform = 'scale(0.95)';
      content.style.opacity = '0';

      setTimeout(() => {
        modal.classList.add('hidden');
        content.style.transform = '';
        content.style.opacity = '';

        if (window.lastFocusedElement) {
          window.lastFocusedElement.focus();
        }
      }, 300);
    }
  }

  // Handle actions
  handleAction(action, element, event) {
    switch (action) {
      case 'close-modal':
        const modal = element.closest('.modal');
        if (modal) {
          this.closeModal(modal);
        }
        break;
      case 'toggle-theme':
        this.toggleTheme();
        break;
      case 'show-settings':
        this.showSettings();
        break;
    }
  }

  // Handle changes
  handleChange(change, element, event) {
    switch (change) {
      case 'theme':
        this.handleThemeChange(element);
        break;
      case 'sound-volume':
        this.handleVolumeChange(element);
        break;
    }
  }

  // Toggle theme
  toggleTheme() {
    document.body.classList.toggle('light-theme');
    const isLight = document.body.classList.contains('light-theme');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    showNotification(`Switched to ${isLight ? 'light' : 'dark'} theme`, 'info');
  }

  // Show settings
  showSettings() {
    const settingsModal = document.getElementById('settings-modal');
    if (settingsModal) {
      settingsModal.classList.remove('hidden');
    }
  }

  // Handle theme change
  handleThemeChange(element) {
    const theme = element.value;
    document.body.className = theme;
    localStorage.setItem('theme', theme);
    showNotification(`Theme changed to ${theme}`, 'info');
  }

  // Handle volume change
  handleVolumeChange(element) {
    const volume = parseFloat(element.value);
    window.setSoundVolume(volume);
    localStorage.setItem('soundVolume', volume);
    showNotification(`Volume set to ${Math.round(volume * 100)}%`, 'info');
  }

  // Setup local storage
  setupLocalStorage() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      document.body.classList.add(savedTheme);
    }

    const savedVolume = localStorage.getItem('soundVolume');
    if (savedVolume) {
      window.setSoundVolume(parseFloat(savedVolume));
    }
  }

  // Setup responsive design
  setupResponsiveDesign() {
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        this.handleResize();
      }, 250);
    });

    this.handleResize();
  }

  // Handle resize
  handleResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      if (width < 768) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
      } else {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0');
      }
    }

    const board = document.getElementById('chessboard');
    if (board) {
      const maxBoardSize = Math.min(width * 0.9, height * 0.6, 650);
      board.style.width = `${maxBoardSize}px`;
      board.style.height = `${maxBoardSize}px`;
    }
  }
}

// Initialize complete enhancements
const completeEnhancements = new CompleteEnhancements();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => completeEnhancements.init());
} else {
  completeEnhancements.init();
}

// Export for global use
window.completeEnhancements = completeEnhancements;
window.showNotification = (message, type) => completeEnhancements.showNotification(message, type);
window.showError = (message) => completeEnhancements.showError(message);
window.showSuccess = (message) => completeEnhancements.showSuccess(message);
window.showWarning = (message) => completeEnhancements.showWarning(message);
window.playSound = (soundName, volume) => completeEnhancements.playSound(soundName, volume);
window.setSoundVolume = (volume) => completeEnhancements.setSoundVolume(volume);
window.showLoading = (message) => completeEnhancements.showLoading(message);
window.hideLoading = () => completeEnhancements.hideLoading();
window.toggleTheme = () => completeEnhancements.toggleTheme();
window.toggleFullscreen = () => completeEnhancements.toggleFullscreen();
