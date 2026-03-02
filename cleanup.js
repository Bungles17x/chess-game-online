/**
 * Cleanup Module
 * Removes unnecessary elements and optimizes the codebase
 */

const Cleanup = {
  removedElements: [],
  optimizedFiles: [],

  /**
   * Initialize cleanup
   */
  init() {
    console.log('[Cleanup] Starting cleanup process...');
    this.removeUnusedElements();
    this.removeDuplicateStyles();
    this.removeUnusedScripts();
    this.optimizeDOM();
    this.removeEmptyElements();
    this.cleanupEventListeners();
    console.log('[Cleanup] Cleanup complete');
    this.report();
  },

  /**
   * Remove unused elements
   */
  removeUnusedElements() {
    // Remove elements that are not used
    const unusedSelectors = [
      '.debug-element',
      '.test-element',
      '.placeholder',
      '.unused-class',
      '[data-removed]',
      '[data-deprecated]'
    ];

    unusedSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        el.remove();
        this.removedElements.push(selector);
      });
    });
  },

  /**
   * Remove duplicate styles
   */
  removeDuplicateStyles() {
    const stylesheets = document.querySelectorAll('style');
    const seenRules = new Set();

    stylesheets.forEach(sheet => {
      const rules = Array.from(sheet.sheet.cssRules || []);
      const rulesToRemove = [];

      rules.forEach(rule => {
        const ruleText = rule.cssText;
        if (seenRules.has(ruleText)) {
          rulesToRemove.push(rule);
        } else {
          seenRules.add(ruleText);
        }
      });

      rulesToRemove.forEach(rule => {
        sheet.sheet.deleteRule(rule);
      });

      if (rulesToRemove.length > 0) {
        this.optimizedFiles.push('style element');
      }
    });
  },

  /**
   * Remove unused scripts
   */
  removeUnusedScripts() {
    const scripts = document.querySelectorAll('script');
    const scriptSources = new Set();

    scripts.forEach(script => {
      const src = script.src;
      if (src && scriptSources.has(src)) {
        script.remove();
        this.removedElements.push(src);
      } else if (src) {
        scriptSources.add(src);
      }
    });
  },

  /**
   * Optimize DOM
   */
  optimizeDOM() {
    // Remove empty text nodes
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          return node.textContent.trim() === '' 
            ? NodeFilter.FILTER_ACCEPT 
            : NodeFilter.FILTER_REJECT;
        }
      }
    );

    const emptyNodes = [];
    let node;
    while (node = walker.nextNode()) {
      emptyNodes.push(node);
    }

    emptyNodes.forEach(node => {
      node.remove();
    });

    if (emptyNodes.length > 0) {
      this.optimizedFiles.push('DOM');
    }
  },

  /**
   * Remove empty elements
   */
  removeEmptyElements() {
    const emptySelectors = [
      'div:empty:not([data-preserve])',
      'span:empty:not([data-preserve])',
      'p:empty:not([data-preserve])'
    ];

    emptySelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        // Only remove if it has no attributes or only has class/ID
        const attrs = Array.from(el.attributes);
        const hasImportantAttrs = attrs.some(attr => 
          attr.name !== 'class' && attr.name !== 'id' && attr.name !== 'style'
        );

        if (!hasImportantAttrs) {
          el.remove();
          this.removedElements.push(el.tagName.toLowerCase());
        }
      });
    });
  },

  /**
   * Cleanup event listeners
   */
  cleanupEventListeners() {
    // This is a placeholder - actual cleanup would require tracking listeners
    // For now, we'll just log that this step was performed
    console.log('[Cleanup] Event listener cleanup (tracking required for full cleanup)');
  },

  /**
   * Generate cleanup report
   */
  report() {
    console.log('[Cleanup] Cleanup Report:', {
      removedElements: this.removedElements.length,
      optimizedFiles: this.optimizedFiles.length,
      details: {
        removed: this.removedElements,
        optimized: this.optimizedFiles
      }
    });
  },

  /**
   * Get cleanup status
   * @returns {Object} Cleanup status
   */
  getStatus() {
    return {
      removedCount: this.removedElements.length,
      optimizedCount: this.optimizedFiles.length,
      timestamp: new Date().toISOString()
    };
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Cleanup;
}

// Make available globally
window.Cleanup = Cleanup;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Cleanup.init());
} else {
  Cleanup.init();
}
