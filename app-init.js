/**
 * Application Initialization Module
 * Ensures all systems load in the correct order and are properly initialized
 */

const AppInit = {
  // Track initialization status
  initialized: new Set(),
  dependencies: {
    'error-handler': [],
    'security-improvements': [],
    'performance-optimizations': [],
    'utils': [],
    'encryption': [],
    'comprehensive-fix': ['utils'],
    'server-data-manager': ['utils'],
    'auth': ['encryption', 'utils'],
    'chess': [],
    'friends': ['auth', 'utils'],
    'client-anti-cheat': ['utils'],
    'anti-cheat-report-fix': ['client-anti-cheat', 'utils'],
    'enhanced-game-features': ['chess', 'utils'],
    'game-fixes': ['chess', 'utils'],
    'enhanced-ai': ['chess', 'utils'],
    'xp-system-enhanced': ['utils'],
    'level-up': ['xp-system-enhanced', 'utils'],
    'script': ['chess', 'utils', 'error-handler'],
    'achievements-system': ['utils'],
    'achievements-fix': ['achievements-system', 'utils'],
    'game-integration-fix': ['chess', 'utils'],
    'report-system-ui': ['utils'],
    'report-submit-handler': ['utils', 'error-handler'],
    'admin-panel-enhanced': ['auth', 'utils'],
    'admin-features': ['auth', 'utils'],
    'debugger': ['utils'],
    'debugger-integration': ['debugger', 'utils'],
    'user-sync-client': ['utils'],
    'settings-button': ['utils'],
    'game-enhancements': ['chess', 'utils'],
    'tts-system': ['utils'],
    'tts-enhancements': ['tts-system', 'utils'],
    'screen-reader-simple': ['utils'],
    'ultimate-game-enhancements': ['chess', 'utils'],
    'ultimate-game-enhancements-v2': ['chess', 'utils'],
    'advanced-game-features': ['chess', 'utils'],
    'enhanced-ui-components-v2': ['utils'],
    'extreme-ai-analysis': ['chess', 'utils'],
    'extreme-visual-effects': ['utils'],
    'safe-enhancements': ['utils'],
    'tutorial-mode-fixed': ['chess', 'utils'],
    'interactive-practice': ['chess', 'utils'],
    'practice-advance': ['chess', 'utils'],
    'practice-integration-fixed': ['chess', 'utils'],
    'simple-enhancements': ['utils']
  },

  /**
   * Check if all dependencies are initialized
   * @param {string} module - Module name
   * @returns {boolean} True if dependencies are ready
   */
  checkDependencies(module) {
    const deps = this.dependencies[module] || [];
    return deps.every(dep => this.initialized.has(dep));
  },

  /**
   * Mark module as initialized
   * @param {string} module - Module name
   */
  markInitialized(module) {
    this.initialized.add(module);
    console.log(`[AppInit] Module initialized: ${module}`);
  },

  /**
   * Wait for dependencies to be ready
   * @param {string} module - Module name
   * @param {Function} callback - Callback when ready
   */
  waitForDependencies(module, callback) {
    if (this.checkDependencies(module)) {
      callback();
    } else {
      const checkInterval = setInterval(() => {
        if (this.checkDependencies(module)) {
          clearInterval(checkInterval);
          callback();
        }
      }, 100);
    }
  },

  /**
   * Initialize application
   */
  init() {
    console.log('[AppInit] Starting application initialization...');

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initializeSystems());
    } else {
      this.initializeSystems();
    }
  },

  /**
   * Initialize all systems
   */
  initializeSystems() {
    console.log('[AppInit] Initializing all systems...');

    // Core systems (no dependencies)
    this.waitForDependencies('error-handler', () => {
      if (typeof ErrorHandler !== 'undefined') {
        console.log('[AppInit] Error handler ready');
      }
    });

    this.waitForDependencies('security-improvements', () => {
      if (typeof Security !== 'undefined') {
        console.log('[AppInit] Security system ready');
      }
    });

    this.waitForDependencies('performance-optimizations', () => {
      if (typeof Performance !== 'undefined') {
        console.log('[AppInit] Performance system ready');
      }
    });

    this.waitForDependencies('utils', () => {
      if (typeof Utils !== 'undefined') {
        console.log('[AppInit] Utils ready');
      }
    });

    // Game systems
    this.waitForDependencies('chess', () => {
      if (typeof Chess !== 'undefined') {
        console.log('[AppInit] Chess engine ready');
      }
    });

    // Wait for all critical systems
    setTimeout(() => {
      this.verifyInitialization();
    }, 2000);
  },

  /**
   * Verify all critical systems are initialized
   */
  verifyInitialization() {
    const criticalSystems = [
      'error-handler',
      'security-improvements',
      'performance-optimizations',
      'utils',
      'chess'
    ];

    const missing = criticalSystems.filter(sys => !this.initialized.has(sys));

    if (missing.length > 0) {
      console.warn('[AppInit] Warning: Some systems may not be fully initialized:', missing);
    } else {
      console.log('[AppInit] All critical systems initialized successfully');
    }

    // Log initialization status
    console.log('[AppInit] Initialized systems:', Array.from(this.initialized));
  },

  /**
   * Get initialization status
   * @returns {Object} Status of all systems
   */
  getStatus() {
    return {
      initialized: Array.from(this.initialized),
      total: Object.keys(this.dependencies).length,
      progress: Math.round((this.initialized.size / Object.keys(this.dependencies).length) * 100)
    };
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AppInit;
}

// Make available globally
window.AppInit = AppInit;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => AppInit.init());
} else {
  AppInit.init();
}
