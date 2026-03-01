// Safe Game Enhancements - No Breaking Changes

// ========================================
// SAFE VISUAL ENHANCEMENTS
// ========================================

function addSafeVisualEnhancements() {
  // Add smooth transitions to existing elements
  const elements = document.querySelectorAll('.square, .piece, .btn, button');
  elements.forEach(el => {
    if (!el.style.transition) {
      el.style.transition = 'transform 0.2s ease';
    }
  });

  // Add hover effects to squares
  const squares = document.querySelectorAll('.square');
  squares.forEach(square => {
    if (!square.classList.contains('enhanced')) {
      square.classList.add('enhanced');
      // No scale animation - user prefers static interface
    }
  });

  // Add subtle glow to pieces
  const pieces = document.querySelectorAll('.piece');
  pieces.forEach(piece => {
    if (!piece.classList.contains('enhanced')) {
      piece.classList.add('enhanced');
      piece.style.filter = 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))';
    }
  });
}

// ========================================
// SAFE ANIMATION ENHANCEMENTS
// ========================================

function addSafeAnimationEnhancements() {
  // No animations added - user prefers static interface
  return;
}

// ========================================
// SAFE UI IMPROVEMENTS
// ========================================

function addSafeUIImprovements() {
  // Improve button feedback
  const buttons = document.querySelectorAll('button, .btn');
  buttons.forEach(btn => {
    if (!btn.classList.contains('enhanced')) {
      btn.classList.add('enhanced');
      // No scale animation - user prefers static interface
    }
  });

  // Add focus indicators for accessibility
  const focusableElements = document.querySelectorAll('button, input, [tabindex]');
  focusableElements.forEach(el => {
    if (!el.classList.contains('enhanced')) {
      el.classList.add('enhanced');
      el.addEventListener('focus', () => {
        el.style.outline = '2px solid #0ea5e9';
        el.style.outlineOffset = '2px';
      });
      el.addEventListener('blur', () => {
        el.style.outline = 'none';
      });
    }
  });
}

// ========================================
// SAFE PERFORMANCE OPTIMIZATIONS
// ========================================

function addSafePerformanceOptimizations() {
  // Debounce resize events
  let resizeTimeout;
  const originalResize = window.onresize;
  window.onresize = function() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      if (originalResize) originalResize();
    }, 250);
  };

  // Optimize scroll events
  const scrollableElements = document.querySelectorAll('[data-scrollable]');
  scrollableElements.forEach(el => {
    let scrollTimeout;
    el.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        // Handle scroll after debounce
      }, 100);
    }, { passive: true });
  });
}

// ========================================
// SAFE ACCESSIBILITY IMPROVEMENTS
// ========================================

function addSafeAccessibilityImprovements() {
  // Add ARIA labels to buttons without them
  const buttons = document.querySelectorAll('button:not([aria-label])');
  buttons.forEach(btn => {
    const text = btn.textContent.trim();
    if (text && !btn.getAttribute('aria-label')) {
      btn.setAttribute('aria-label', text);
    }
  });

  // Improve keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      document.body.classList.add('keyboard-nav');
    }
  });

  document.addEventListener('mousedown', () => {
    document.body.classList.remove('keyboard-nav');
  });
}

// ========================================
// SAFE THEME IMPROVEMENTS
// ========================================

function addSafeThemeImprovements() {
  // Ensure theme variables exist
  const root = document.documentElement;
  const variables = [
    '--accent', '--accent-strong',
    '--success', '--warning', '--danger',
    '--info', '--purple', '--pink',
    '--teal', '--orange', '--gold',
    '--text-primary', '--text-secondary',
    '--transition-fast', '--transition-normal',
    '--transition-slow', '--transition-smooth',
    '--transition-bounce'
  ];

  variables.forEach(variable => {
    if (!getComputedStyle(root).getPropertyValue(variable)) {
      // Set default values if not defined
      const defaults = {
        '--accent': '#0ea5e9',
        '--accent-strong': '#0284c7',
        '--success': '#22c55e',
        '--warning': '#eab308',
        '--danger': '#ef4444',
        '--info': '#3b82f6',
        '--purple': '#8b5cf6',
        '--pink': '#ec4899',
        '--teal': '#0d9488',
        '--orange': '#ea580c',
        '--gold': '#ffd700',
        '--text-primary': '#f9fafb',
        '--text-secondary': '#94a3b8',
        '--transition-fast': '150ms',
        '--transition-normal': '300ms',
        '--transition-slow': '500ms',
        '--transition-smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
        '--transition-bounce': 'cubic-bezier(0.34, 1.56, 0.64, 1)'
      };
      root.style.setProperty(variable, defaults[variable]);
    }
  });
}

// ========================================
// SAFE RESPONSIVE IMPROVEMENTS
// ========================================

function addSafeResponsiveImprovements() {
  // Add touch support for mobile
  const touchElements = document.querySelectorAll('.square, .btn, button');
  touchElements.forEach(el => {
    // No scale animation - user prefers static interface
  });

  // Optimize for mobile viewport
  const viewport = document.querySelector('meta[name="viewport"]');
  if (viewport) {
    viewport.setAttribute('content', 
      'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'
    );
  }
}

// ========================================
// SAFE ERROR HANDLING
// ========================================

function addSafeErrorHandling() {
  // Global error handler
  window.addEventListener('error', (e) => {
    console.error('[Safe Enhancements] Error:', {
      message: e.error ? e.error.message : 'Unknown error',
      stack: e.error ? e.error.stack : 'No stack trace',
      filename: e.filename,
      lineno: e.lineno,
      colno: e.colno
    });
    // Don't break the game, just log it
  });

  // Unhandled promise rejection handler
  window.addEventListener('unhandledrejection', (e) => {
    console.error('[Safe Enhancements] Unhandled rejection:', e.reason);
    // Don't break the game, just log it
  });
}

// ========================================
// INITIALIZE SAFE ENHANCEMENTS
// ========================================

function initializeSafeEnhancements() {
  console.log('[Safe Enhancements] Initializing...');

  try {
    addSafeVisualEnhancements();
    addSafeAnimationEnhancements();
    addSafeUIImprovements();
    addSafePerformanceOptimizations();
    addSafeAccessibilityImprovements();
    addSafeThemeImprovements();
    addSafeResponsiveImprovements();
    addSafeErrorHandling();

    console.log('[Safe Enhancements] All enhancements applied successfully!');
  } catch (error) {
    console.error('[Safe Enhancements] Error during initialization:', error);
    // Don't break the game if enhancements fail
  }
}

// Run when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeSafeEnhancements);
} else {
  initializeSafeEnhancements();
}

// Export for global access
window.initializeSafeEnhancements = initializeSafeEnhancements;
window.addSafeVisualEnhancements = addSafeVisualEnhancements;
window.addSafeAnimationEnhancements = addSafeAnimationEnhancements;
window.addSafeUIImprovements = addSafeUIImprovements;
window.addSafePerformanceOptimizations = addSafePerformanceOptimizations;
window.addSafeAccessibilityImprovements = addSafeAccessibilityImprovements;
window.addSafeThemeImprovements = addSafeThemeImprovements;
window.addSafeResponsiveImprovements = addSafeResponsiveImprovements;
window.addSafeErrorHandling = addSafeErrorHandling;
