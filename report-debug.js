// Report System Debug Utilities
// Provides comprehensive debugging for the report system

// Debug configuration
const ReportDebug = {
  enabled: false,
  categories: {
    CREATE: true,
    READ: true,
    UPDATE: true,
    DELETE: true,
    SEARCH: true,
    STATISTICS: true,
    SYSTEM: true
  },
  logLevel: 'info' // debug, info, warn, error
};

// Enable debug mode
ReportDebug.enable = function() {
  this.enabled = true;
  console.log('%c[REPORT DEBUG] Debug mode ENABLED', 'color: #00ff00; font-weight: bold;');
};

// Disable debug mode
ReportDebug.disable = function() {
  this.enabled = false;
  console.log('%c[REPORT DEBUG] Debug mode DISABLED', 'color: #ff0000; font-weight: bold;');
};

// Toggle debug mode
ReportDebug.toggle = function() {
  this.enabled = !this.enabled;
  console.log(`%c[REPORT DEBUG] Debug mode ${this.enabled ? 'ENABLED' : 'DISABLED'}`, 
    `color: ${this.enabled ? '#00ff00' : '#ff0000'}; font-weight: bold;`);
};

// Set log level
ReportDebug.setLogLevel = function(level) {
  this.logLevel = level;
  console.log(`%c[REPORT DEBUG] Log level set to: ${level}`, 'color: #00aaff; font-weight: bold;');
};

// Enable specific category
ReportDebug.enableCategory = function(category) {
  this.categories[category] = true;
  console.log(`%c[REPORT DEBUG] Category enabled: ${category}`, 'color: #00ff00;');
};

// Disable specific category
ReportDebug.disableCategory = function(category) {
  this.categories[category] = false;
  console.log(`%c[REPORT DEBUG] Category disabled: ${category}`, 'color: #ff0000;');
};

// Log function
ReportDebug.log = function(category, message, data = null) {
  if (!this.enabled) return;
  if (!this.categories[category]) return;

  const timestamp = new Date().toISOString();
  const prefix = `%c[REPORT DEBUG ${category}]%c ${timestamp}`;

  // Color coding by category
  const categoryColors = {
    CREATE: '#00ff00',
    READ: '#00aaff',
    UPDATE: '#ffff00',
    DELETE: '#ff0000',
    SEARCH: '#ff00ff',
    STATISTICS: '#00ffff',
    SYSTEM: '#ffffff'
  };

  const categoryColor = categoryColors[category] || '#ffffff';

  if (data) {
    console.log(`${prefix}: ${message}`, `color: ${categoryColor}`, 'color: #888888', data);
  } else {
    console.log(`${prefix}: ${message}`, `color: ${categoryColor}`, 'color: #888888');
  }
};

// Debug report creation
ReportDebug.logCreate = function(reportData, reportId) {
  this.log('CREATE', 'Creating report', {
    reportData,
    reportId
  });
};

// Debug report retrieval
ReportDebug.logGet = function(reportId, report) {
  this.log('READ', 'Retrieved report', {
    reportId,
    found: !!report,
    report
  });
};

// Debug report update
ReportDebug.logUpdate = function(reportId, updates) {
  this.log('UPDATE', 'Updating report', {
    reportId,
    updates
  });
};

// Debug report deletion
ReportDebug.logDelete = function(reportId) {
  this.log('DELETE', 'Deleting report', {
    reportId
  });
};

// Debug search
ReportDebug.logSearch = function(query, results) {
  this.log('SEARCH', 'Search performed', {
    query,
    resultCount: results ? results.length : 0
  });
};

// Debug statistics
ReportDebug.logStats = function(stats) {
  this.log('STATISTICS', 'Report statistics', stats);
};

// Debug error
ReportDebug.logError = function(category, error) {
  this.log(category, 'Error occurred', {
    error: error.message,
    stack: error.stack
  });
};

// Debug WebSocket message
ReportDebug.logMessage = function(type, data) {
  this.log('SYSTEM', 'WebSocket message received', {
    type,
    data
  });
};

// Debug UI rendering
ReportDebug.logRender = function(reports) {
  this.log('SYSTEM', 'Rendering reports', {
    reportCount: reports ? reports.length : 0
  });
};

// Debug user action
ReportDebug.logAction = function(action, data) {
  this.log('SYSTEM', 'User action', {
    action,
    data
  });
};

// Export debug utilities
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ReportDebug;
} else {
  window.ReportDebug = ReportDebug;
}

// Initialize with default settings
console.log('%c═══════════════════════════════════════', 'color: #00aaff;');
console.log('%c🔧 REPORT DEBUGGER LOADED', 'color: #00ff00; font-weight: bold; font-size: 14px;');
console.log('%c═══════════════════════════════════════', 'color: #00aaff;');
console.log('%cAvailable commands:', 'color: #ffff00; font-weight: bold;');
console.log('%c  ReportDebug.enable()        - Enable debug mode', 'color: #888888;');
console.log('%c  ReportDebug.disable()       - Disable debug mode', 'color: #888888;');
console.log('%c  ReportDebug.toggle()        - Toggle debug mode', 'color: #888888;');
console.log('%c  ReportDebug.setLogLevel()   - Set log level (debug, info, warn, error)', 'color: #888888;');
console.log('%c  ReportDebug.enableCategory() - Enable specific category', 'color: #888888;');
console.log('%c  ReportDebug.disableCategory()- Disable specific category', 'color: #888888;');
console.log('%cCategories: CREATE, READ, UPDATE, DELETE, SEARCH, STATISTICS, SYSTEM', 'color: #888888;');
console.log('%c═══════════════════════════════════════', 'color: #00aaff;');
