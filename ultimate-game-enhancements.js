// Ultimate Game Enhancements
// Comprehensive improvements for the chess game

// ============================================
// PERFORMANCE OPTIMIZATIONS
// ============================================

// Debounce function for performance
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

// Throttle function for performance
function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Lazy load images
function lazyLoadImages() {
  const images = document.querySelectorAll('img[data-src]');
  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
        observer.unobserve(img);
      }
    });
  });

  images.forEach(img => imageObserver.observe(img));
}

// Optimize animations
function optimizeAnimations() {
  // Use will-change for frequently animated elements
  const animatedElements = document.querySelectorAll('.square, .piece');
  animatedElements.forEach(el => {
    el.style.willChange = 'transform, opacity';
  });
}

// ============================================
// UI ENHANCEMENTS
// ============================================

// Smooth scrolling
function enableSmoothScrolling() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });
}

// Enhanced tooltips
function enhanceTooltips() {
  const tooltipElements = document.querySelectorAll('[data-tooltip]');

  tooltipElements.forEach(element => {
    element.addEventListener('mouseenter', function() {
      const tooltip = document.createElement('div');
      tooltip.className = 'enhanced-tooltip';
      tooltip.textContent = this.dataset.tooltip;
      document.body.appendChild(tooltip);

      const rect = this.getBoundingClientRect();
      tooltip.style.top = `${rect.top - tooltip.offsetHeight - 10}px`;
      tooltip.style.left = `${rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2)}px`;

      this._tooltip = tooltip;
    });

    element.addEventListener('mouseleave', function() {
      if (this._tooltip) {
        this._tooltip.remove();
        this._tooltip = null;
      }
    });
  });
}

// Enhanced button feedback
function enhanceButtonFeedback() {
  const buttons = document.querySelectorAll('button');

  buttons.forEach(button => {
    button.addEventListener('click', function() {
      this.classList.add('clicked');
      setTimeout(() => this.classList.remove('clicked'), 200);
    });
  });
}

// Ripple effect for buttons
function createRippleEffect(event) {
  const button = event.currentTarget;
  const circle = document.createElement('span');
  const diameter = Math.max(button.clientWidth, button.clientHeight);
  const radius = diameter / 2;

  circle.style.width = circle.style.height = `${diameter}px`;
  circle.style.left = `${event.clientX - button.getBoundingClientRect().left - radius}px`;
  circle.style.top = `${event.clientY - button.getBoundingClientRect().top - radius}px`;
  circle.classList.add('ripple');

  const ripple = button.getElementsByClassName('ripple')[0];
  if (ripple) {
    ripple.remove();
  }

  button.appendChild(circle);
}

// ============================================
// GAMEPLAY ENHANCEMENTS
// ============================================

// Track last move
let lastMove = null;

// Track moves and update lastMove
function trackMove(move) {
  if (move) {
    lastMove = {
      from: move.from,
      to: move.to,
      timestamp: Date.now()
    };
    highlightLastMove();
  }
}

// Highlight last move with animation
function highlightLastMove() {

// Show move hints for selected piece
function showMoveHints() {
  const squares = document.querySelectorAll('.square');
  squares.forEach(square => {
    square.classList.remove('move-hint', 'capture-hint');
  });
}

function highlightLastMove() {
  const squares = document.querySelectorAll('.square');
  squares.forEach(square => {
    square.classList.remove('last-move-from', 'last-move-to');
  });

  if (lastMove) {
    const fromSquare = document.querySelector(`[data-square="${lastMove.from}"]`);
    const toSquare = document.querySelector(`[data-square="${lastMove.to}"]`);

    if (fromSquare) fromSquare.classList.add('last-move-from');
    if (toSquare) toSquare.classList.add('last-move-to');
  }
}

// Animate piece movement
function animatePieceMove(from, to) {
  const piece = document.querySelector(`[data-square="${from}"] .piece`);
  if (!piece) return;

  const toSquare = document.querySelector(`[data-square="${to}"]`);
  if (!toSquare) return;

  const fromRect = piece.getBoundingClientRect();
  const toRect = toSquare.getBoundingClientRect();

  const deltaX = toRect.left - fromRect.left;
  const deltaY = toRect.top - fromRect.top;

  piece.style.transition = 'transform 0.2s ease-out';
  piece.style.transform = `translate(${deltaX}px, ${deltaY}px)`;

  setTimeout(() => {
    piece.style.transition = '';
    piece.style.transform = '';
  }, 200);
}

// Show move hints
function showMoveHints() {
  if (!selectedSquare || !legalMovesFromSelected.length) return;

  legalMovesFromSelected.forEach(move => {
    const square = document.querySelector(`[data-square="${move.to}"]`);
    if (square) {
      square.classList.add('move-hint');
      if (move.captured) {
        square.classList.add('capture-hint');
      }
    }
  });
}

// Clear move hints
function clearMoveHints() {
  const squares = document.querySelectorAll('.square');
  squares.forEach(square => {
    square.classList.remove('move-hint', 'capture-hint');
  });
}

// ============================================
// ACCESSIBILITY ENHANCEMENTS
// ============================================

// Enhanced keyboard navigation
function enhanceKeyboardNavigation() {
  const squares = document.querySelectorAll('.square');
  let currentIndex = -1;

  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') {
      currentIndex = Math.min(currentIndex + 1, squares.length - 1);
    } else if (e.key === 'ArrowLeft') {
      currentIndex = Math.max(currentIndex - 1, 0);
    } else if (e.key === 'ArrowDown') {
      currentIndex = Math.min(currentIndex + 8, squares.length - 1);
    } else if (e.key === 'ArrowUp') {
      currentIndex = Math.max(currentIndex - 8, 0);
    }

    if (currentIndex >= 0 && currentIndex < squares.length) {
      squares[currentIndex].focus();
    }
  });
}

// Enhanced focus indicators
function enhanceFocusIndicators() {
  const focusableElements = document.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );

  focusableElements.forEach(element => {
    element.addEventListener('focus', () => {
      element.classList.add('focused');
    });

    element.addEventListener('blur', () => {
      element.classList.remove('focused');
    });
  });
}

// Skip to main content link
function addSkipLink() {
  const skipLink = document.createElement('a');
  skipLink.href = '#main-content';
  skipLink.className = 'skip-link';
  skipLink.textContent = 'Skip to main content';
  skipLink.setAttribute('aria-label', 'Skip to main content');
  document.body.insertBefore(skipLink, document.body.firstChild);
}

// ============================================
// NOTIFICATION ENHANCEMENTS
// ============================================

// Toast notification system
function showToast(message, type = 'info', duration = 3000) {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'polite');

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('show');
  }, 10);

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// Enhanced notification queue
class NotificationQueue {
  constructor(maxNotifications = 5) {
    this.queue = [];
    this.maxNotifications = maxNotifications;
    this.currentNotifications = 0;
  }

  add(message, type = 'info') {
    if (this.currentNotifications >= this.maxNotifications) {
      return false;
    }

    this.queue.push({ message, type });
    this.processQueue();
    return true;
  }

  processQueue() {
    if (this.queue.length === 0 || this.currentNotifications >= this.maxNotifications) {
      return;
    }

    const { message, type } = this.queue.shift();
    showToast(message, type);
    this.currentNotifications++;

    setTimeout(() => {
      this.currentNotifications--;
      this.processQueue();
    }, 3000);
  }
}

const notificationQueue = new NotificationQueue();

// ============================================
// ERROR HANDLING ENHANCEMENTS
// ============================================

// Global error handler
function setupGlobalErrorHandler() {
  window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    showToast('An error occurred. Please try again.', 'error');
  });

  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    showToast('An error occurred. Please try again.', 'error');
  });
}

// Network error handler
function setupNetworkErrorHandler() {
  window.addEventListener('offline', () => {
    showToast('You are offline. Some features may not work.', 'warning');
  });

  window.addEventListener('online', () => {
    showToast('You are back online.', 'success');
  });
}

// ============================================
// STORAGE ENHANCEMENTS
// ============================================

// Enhanced localStorage with error handling
const storage = {
  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error(`Error reading from localStorage: ${error}`);
      return defaultValue;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Error writing to localStorage: ${error}`);
      return false;
    }
  },

  remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Error removing from localStorage: ${error}`);
      return false;
    }
  },

  clear() {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.error(`Error clearing localStorage: ${error}`);
      return false;
    }
  }
};

// ============================================
// THEME ENHANCEMENTS
// ============================================

// Smooth theme transitions
function enableSmoothThemeTransition() {
  document.documentElement.style.transition = 'background-color 0.3s, color 0.3s';
}

// Auto theme based on system preference
function setupAutoTheme() {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

  function updateTheme() {
    if (prefersDark.matches) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  }

  prefersDark.addEventListener('change', updateTheme);
  updateTheme();
}

// ============================================
// INITIALIZATION
// ============================================

function initUltimateEnhancements() {
  // Performance
  lazyLoadImages();
  optimizeAnimations();

  // UI
  enableSmoothScrolling();
  enhanceTooltips();
  enhanceButtonFeedback();

  // Gameplay
  highlightLastMove();
  showMoveHints();
  
  // Track moves
  document.addEventListener('gameMove', (e) => {
    trackMove(e.detail.move);
  });

  // Accessibility
  enhanceKeyboardNavigation();
  enhanceFocusIndicators();
  addSkipLink();

  // Error handling
  setupGlobalErrorHandler();
  setupNetworkErrorHandler();

  // Theme
  enableSmoothThemeTransition();
  setupAutoTheme();

  console.log('[Ultimate Enhancements] Initialized');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initUltimateEnhancements);
} else {
  initUltimateEnhancements();
}

// Export functions
window.ultimateEnhancements = {
  debounce,
  throttle,
  createRippleEffect,
  showToast,
  storage,
  notificationQueue
};
};
