// Server Status Debugger - Enhanced Version v5
// This file handles the enhanced debugger functionality for the server status page

// Debugger state
let debuggerLogs = [];
let debuggerStats = {
  total: 0,
  errors: 0,
  warnings: 0,
  info: 0
};
let debuggerPaused = false;
let debuggerSettings = {
  autoScroll: true,
  showTimestamp: true,
  showCategory: true
};
let uniqueErrors = new Set();
let expandedErrors = new Set();

// Error and warning explanations database
const errorExplanations = {
  'High memory usage': {
    explanation: 'The server is using a large amount of memory.',
    possibilities: [
      'Memory leak in the application',
      'Too many concurrent connections',
      'Large data sets being processed',
      'Insufficient memory allocation'
    ],
    severity: 'warning'
  },
  'High CPU usage': {
    explanation: 'The server CPU is under heavy load.',
    possibilities: [
      'Inefficient code execution',
      'Too many concurrent requests',
      'Background processes consuming resources',
      'Complex computations running'
    ],
    severity: 'warning'
  },
  'Connection timeout': {
    explanation: 'A connection attempt timed out.',
    possibilities: [
      'Network latency issues',
      'Server is overloaded',
      'Firewall blocking connections',
      'Client-side network issues'
    ],
    severity: 'warning'
  },
  'Slow response time': {
    explanation: 'The server is taking longer than expected to respond.',
    possibilities: [
      'Database queries are slow',
      'Server is under heavy load',
      'Network congestion',
      'Inefficient code execution'
    ],
    severity: 'warning'
  },
  'Rate limit exceeded': {
    explanation: 'Too many requests have been made in a short period.',
    possibilities: [
      'Client is making too many requests',
      'Rate limit is set too low',
      'Automated scripts or bots',
      'Distributed denial of service attack'
    ],
    severity: 'warning'
  },
  'Unknown message type': {
    explanation: 'The server received a message type it doesn\'t recognize or support.',
    possibilities: [
      'The client is sending an outdated message format',
      'The server hasn\'t implemented this message type yet',
      'There\'s a version mismatch between client and server',
      'The message type field is corrupted or malformed'
    ],
    severity: 'high'
  },
  'Connection refused': {
    explanation: 'The server rejected the connection attempt.',
    possibilities: [
      'The server is not running',
      'The server is at maximum capacity',
      'Firewall is blocking the connection',
      'Wrong port number or address'
    ],
    severity: 'high'
  },
  'Timeout': {
    explanation: 'The connection attempt took too long to complete.',
    possibilities: [
      'Network is slow or congested',
      'Server is overloaded',
      'Server is not responding',
      'Internet connection issues'
    ],
    severity: 'medium'
  },
  'Network error': {
    explanation: 'A network-related error occurred.',
    possibilities: [
      'Lost internet connection',
      'Server went offline',
      'DNS resolution failed',
      'Network routing issues'
    ],
    severity: 'high'
  },
  'Authentication failed': {
    explanation: 'The server rejected the authentication credentials.',
    possibilities: [
      'Invalid username or password',
      'Session expired',
      'Account is locked or disabled',
      'Token is invalid or expired'
    ],
    severity: 'high'
  },
  'WebSocket error': {
    explanation: 'An error occurred with the WebSocket connection.',
    possibilities: [
      'Server went offline',
      'Network interruption',
      'WebSocket protocol version mismatch',
      'Server rejected the connection'
    ],
    severity: 'high'
  }
};

// Toggle error explanation visibility
window.toggleErrorExplanation = function(errorKey) {
  if (expandedErrors.has(errorKey)) {
    expandedErrors.delete(errorKey);
  } else {
    expandedErrors.add(errorKey);
  }
  renderDebuggerLogs();
};

// Initialize debugger when DOM is ready
function initDebuggerWhenReady() {
  if (document.getElementById('debugger-container')) {
    overrideConsole();
    initializeDebugger();
  } else {
    setTimeout(initDebuggerWhenReady, 100);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initDebuggerWhenReady();
});

function initializeDebugger() {
  window._originalConsole.log('Initializing debugger...');
  window._originalConsole.log('Checking for debugger elements...');

  const debuggerContainer = document.getElementById('debugger-container');
  const debuggerLogsElement = document.getElementById('debugger-logs');
  const debuggerFilter = document.getElementById('debugger-filter');
  const debuggerClear = document.getElementById('debugger-clear');
  const debuggerExport = document.getElementById('debugger-export');
  const debuggerPause = document.getElementById('debugger-pause');
  const debuggerSearch = document.getElementById('debugger-search');
  const debuggerSearchBar = document.getElementById('debugger-search-bar');
  const debuggerSearchInput = document.getElementById('debugger-search-input');
  const debuggerSearchClose = document.getElementById('debugger-search-close');
  const debuggerCopy = document.getElementById('debugger-copy');
  const debuggerAutoScroll = document.getElementById('debugger-auto-scroll');
  const debuggerShowTimestamp = document.getElementById('debugger-show-timestamp');
  const debuggerShowCategory = document.getElementById('debugger-show-category');

  window._originalConsole.log('debuggerContainer:', debuggerContainer);
  window._originalConsole.log('debuggerLogsElement:', debuggerLogsElement);

  if (!debuggerContainer || !debuggerLogsElement) {
    window._originalConsole.error('Debugger elements not found');
    window._originalConsole.error('debuggerContainer:', debuggerContainer);
    window._originalConsole.error('debuggerLogsElement:', debuggerLogsElement);
    return;
  }

  window._originalConsole.log('All debugger elements found, setting up event listeners...');

  if (debuggerFilter) {
    debuggerFilter.addEventListener('change', (e) => {
      filterDebuggerLogs(e.target.value);
    });
  }

  if (debuggerPause) {
    debuggerPause.addEventListener('click', () => {
      toggleDebuggerPause();
    });
  }

  if (debuggerSearch) {
    debuggerSearch.addEventListener('click', () => {
      debuggerSearchBar.style.display = debuggerSearchBar.style.display === 'none' ? 'flex' : 'none';
      if (debuggerSearchBar.style.display === 'flex') {
        debuggerSearchInput.focus();
      }
    });
  }

  if (debuggerSearchInput) {
    debuggerSearchInput.addEventListener('input', (e) => {
      searchDebuggerLogs(e.target.value);
    });
  }

  if (debuggerSearchClose) {
    debuggerSearchClose.addEventListener('click', () => {
      debuggerSearchBar.style.display = 'none';
      debuggerSearchInput.value = '';
      renderDebuggerLogs();
    });
  }

  if (debuggerClear) {
    debuggerClear.addEventListener('click', () => {
      clearDebuggerLogs();
    });
  }

  if (debuggerExport) {
    debuggerExport.addEventListener('click', () => {
      exportDebuggerLogs();
    });
  }

  if (debuggerCopy) {
    debuggerCopy.addEventListener('click', () => {
      copyDebuggerLogs();
    });
  }

  if (debuggerAutoScroll) {
    debuggerAutoScroll.addEventListener('change', (e) => {
      debuggerSettings.autoScroll = e.target.checked;
    });
  }

  if (debuggerShowTimestamp) {
    debuggerShowTimestamp.addEventListener('change', (e) => {
      debuggerSettings.showTimestamp = e.target.checked;
      renderDebuggerLogs();
    });
  }

  if (debuggerShowCategory) {
    debuggerShowCategory.addEventListener('change', (e) => {
      debuggerSettings.showCategory = e.target.checked;
      renderDebuggerLogs();
    });
  }

  addDebuggerLog('INFO', 'Debugger initialized');
  addDebuggerLog('WARNING', 'This is a sample warning message');
}

function overrideConsole() {
  if (!window._originalConsole) {
    window._originalConsole = {
      log: console.log.bind(console),
      error: console.error.bind(console),
      warn: console.warn.bind(console)
    };
  }

  console.log = function(...args) {
    window._originalConsole.log.apply(console, args);
    const message = args.map(arg =>
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');
    addDebuggerLog('INFO', message);
  };

  console.error = function(...args) {
    window._originalConsole.error.apply(console, args);
    const message = args.map(arg =>
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');
    addDebuggerLog('ERROR', message);
  };

  console.warn = function(...args) {
    window._originalConsole.warn.apply(console, args);
    const message = args.map(arg =>
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');
    addDebuggerLog('WARNING', message);
  };
}

function addDebuggerLog(type, message) {
  if (debuggerPaused) return;

  const log = {
    type: type,
    message: message,
    timestamp: new Date().toISOString()
  };

  debuggerLogs.push(log);
  debuggerStats.total++;

  if (type === 'ERROR') {
    debuggerStats.errors++;
  } else if (type === 'WARNING') {
    debuggerStats.warnings++;
  } else if (type === 'INFO') {
    debuggerStats.info++;
  }

  updateDebuggerStats();

  const searchInput = document.getElementById('debugger-search-input');
  const filterSelect = document.getElementById('debugger-filter');

  if (searchInput && searchInput.value.trim()) {
    searchDebuggerLogs(searchInput.value);
  } else if (filterSelect && filterSelect.value !== 'all') {
    renderDebuggerLogs();
  } else {
    renderDebuggerLogs();
  }
}

function renderDebuggerLogs() {
  const debuggerLogsElement = document.getElementById('debugger-logs');
  if (!debuggerLogsElement) {
    window._originalConsole.warn('debugger-logs element not found');
    return;
  }

  const filter = document.getElementById('debugger-filter');
  const filterValue = filter ? filter.value : 'all';

  const filteredLogs = filterValue === 'all'
    ? debuggerLogs
    : debuggerLogs.filter(log => log.type.toLowerCase() === filterValue);

  if (filteredLogs.length === 0) {
    debuggerLogsElement.innerHTML = '<div class="debugger-no-results">No results found</div>';
  } else {
    debuggerLogsElement.innerHTML = filteredLogs.map(log => {
      const logType = log.type.toLowerCase();
      const typeClass = logType === 'error' ? 'error' :
                     logType === 'warning' ? 'warning' :
                     logType === 'info' ? 'info' : '';

      const timeSpan = debuggerSettings.showTimestamp 
        ? `<span class="debugger-log-time">${new Date(log.timestamp).toLocaleTimeString()}</span>` 
        : '';

      const categorySpan = debuggerSettings.showCategory 
        ? `<span class="debugger-log-category">${log.type}</span>` 
        : '';

      let errorExplanation = '';
      if (logType === 'error') {
        const errorKey = log.message;
        const explanation = findErrorExplanation(log.message);
          if (explanation) {
            const isExpanded = expandedErrors.has(errorKey);
            const escapedKey = errorKey.replace(/'/g, "\\'").replace(/"/g, '&quot;');
            errorExplanation = `
              <div class="debugger-error-explanation">
                <div class="error-explanation-toggle" onclick="toggleErrorExplanation('${escapedKey}')">
                  <span class="toggle-icon">${isExpanded ? '▼' : '▶'}</span>
                  <span class="toggle-text">${isExpanded ? 'Hide' : 'Show'} Explanation</span>
                </div>
                <div class="error-explanation-content ${isExpanded ? 'expanded' : 'collapsed'}">
                  <div class="error-explanation-title">📋 Explanation:</div>
                  <div class="error-explanation-text">${explanation.explanation}</div>
                  <div class="error-explanation-title">🔍 Possible Causes:</div>
                  <ul class="error-explanation-list">
                    ${explanation.possibilities.map(p => `<li>${p}</li>`).join('')}
                  </ul>
                  <div class="error-severity severity-${explanation.severity}">Severity: ${explanation.severity.toUpperCase()}</div>
                </div>
              </div>
            `;
          }
        }

      return `
      <div class="debugger-log-entry ${typeClass}">
        ${timeSpan}
        ${categorySpan}
        <span class="debugger-log-message">${log.message}</span>
        ${errorExplanation}
      </div>
    `;}).join('');
  }

  const logCountElement = document.getElementById('debugger-log-count');
  if (logCountElement) {
    logCountElement.textContent = `${filteredLogs.length} log${filteredLogs.length !== 1 ? 's' : ''}`;
  }

  if (debuggerSettings.autoScroll) {
    debuggerLogsElement.scrollTop = debuggerLogsElement.scrollHeight;
  }
}

function findErrorExplanation(message) {
  for (const [errorType, explanation] of Object.entries(errorExplanations)) {
    if (message.toLowerCase().includes(errorType.toLowerCase())) {
      return explanation;
    }
  }
  return null;
}

function clearDebuggerLogs() {
  debuggerLogs = [];
  debuggerStats = {
    total: 0,
    errors: 0,
    warnings: 0,
    info: 0
  };
  uniqueErrors.clear();
  expandedErrors.clear();
  updateDebuggerStats();
  renderDebuggerLogs();
  addDebuggerLog('INFO', 'Logs cleared');
}

function exportDebuggerLogs() {
  const dataStr = JSON.stringify(debuggerLogs, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

  const exportFileDefaultName = 'debugger-logs-' + new Date().toISOString().split('T')[0] + '.json';

  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
}

function copyDebuggerLogs() {
  const filter = document.getElementById('debugger-filter');
  const filterValue = filter ? filter.value : 'all';

  const filteredLogs = filterValue === 'all'
    ? debuggerLogs
    : debuggerLogs.filter(log => log.type.toLowerCase() === filterValue);

  const text = filteredLogs.map(log => {
    const time = debuggerSettings.showTimestamp
      ? `[${new Date(log.timestamp).toLocaleTimeString()}] `
      : '';
    const category = debuggerSettings.showCategory
      ? `[${log.type}] `
      : '';
    return `${time}${category}${log.message}`;
  }).join('\n');

  navigator.clipboard.writeText(text).then(() => {
    addDebuggerLog('INFO', 'Logs copied to clipboard');
  }).catch(err => {
    addDebuggerLog('ERROR', 'Failed to copy logs: ' + err);
  });
}

function toggleDebuggerPause() {
  debuggerPaused = !debuggerPaused;
  const statusIndicator = document.getElementById('debugger-status');
  const pauseButton = document.getElementById('debugger-pause');

  if (statusIndicator) {
    if (debuggerPaused) {
      statusIndicator.classList.add('paused');
      statusIndicator.classList.remove('running');
      addDebuggerLog('INFO', 'Debugger paused');
    } else {
      statusIndicator.classList.remove('paused');
      statusIndicator.classList.add('running');
      addDebuggerLog('INFO', 'Debugger resumed');
    }
  }

  if (pauseButton) {
    pauseButton.textContent = debuggerPaused ? '▶ Resume' : '⏸ Pause';
  }
}

function updateDebuggerStats() {
  const totalElement = document.getElementById('debug-total-logs');
  const errorElement = document.getElementById('debug-errors');
  const warningElement = document.getElementById('debug-warnings');
  const infoElement = document.getElementById('debug-info');

  if (totalElement) totalElement.textContent = debuggerStats.total;
  if (errorElement) errorElement.textContent = debuggerStats.errors;
  if (warningElement) warningElement.textContent = debuggerStats.warnings;
  if (infoElement) infoElement.textContent = debuggerStats.info;
}

function filterDebuggerLogs(filterValue) {
  renderDebuggerLogs();
}

function searchDebuggerLogs(searchTerm) {
  const debuggerLogsElement = document.getElementById('debugger-logs');
  if (!debuggerLogsElement) {
    window._originalConsole.warn('debugger-logs element not found');
    return;
  }

  const filter = document.getElementById('debugger-filter');
  const filterValue = filter ? filter.value : 'all';

  const filteredLogs = debuggerLogs.filter(log => {
    const matchesFilter = filterValue === 'all' || log.type.toLowerCase() === filterValue;
    const matchesSearch = log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.type.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  if (filteredLogs.length === 0) {
    debuggerLogsElement.innerHTML = '<div class="debugger-no-results">No results found</div>';
  } else {
    const seenErrors = new Set();

    debuggerLogsElement.innerHTML = filteredLogs.map(log => {
      const logType = log.type.toLowerCase();
      const typeClass = logType === 'error' ? 'error' :
                     logType === 'warning' ? 'warning' :
                     logType === 'info' ? 'info' : '';

      const timeSpan = debuggerSettings.showTimestamp 
        ? `<span class="debugger-log-time">${new Date(log.timestamp).toLocaleTimeString()}</span>` 
        : '';

      const categorySpan = debuggerSettings.showCategory 
        ? `<span class="debugger-log-category">${log.type}</span>` 
        : '';

      let errorExplanation = '';
      if (logType === 'error') {
        const errorKey = log.message;
        const explanation = findErrorExplanation(log.message);
          if (explanation) {
            const isExpanded = expandedErrors.has(errorKey);
            const escapedKey = errorKey.replace(/'/g, "\\'").replace(/"/g, '&quot;');
            errorExplanation = `
              <div class="debugger-error-explanation">
                <div class="error-explanation-toggle" onclick="toggleErrorExplanation('${escapedKey}')">
                  <span class="toggle-icon">${isExpanded ? '▼' : '▶'}</span>
                  <span class="toggle-text">${isExpanded ? 'Hide' : 'Show'} Explanation</span>
                </div>
                <div class="error-explanation-content ${isExpanded ? 'expanded' : 'collapsed'}">
                  <div class="error-explanation-title">📋 Explanation:</div>
                  <div class="error-explanation-text">${explanation.explanation}</div>
                  <div class="error-explanation-title">🔍 Possible Causes:</div>
                  <ul class="error-explanation-list">
                    ${explanation.possibilities.map(p => `<li>${p}</li>`).join('')}
                  </ul>
                  <div class="error-severity severity-${explanation.severity}">Severity: ${explanation.severity.toUpperCase()}</div>
                </div>
              </div>
            `;
          }
        }

      return `
      <div class="debugger-log-entry ${typeClass}">
        ${timeSpan}
        ${categorySpan}
        <span class="debugger-log-message">${log.message}</span>
        ${errorExplanation}
      </div>
    `;}).join('');
  }

  const logCountElement = document.getElementById('debugger-log-count');
  if (logCountElement) {
    logCountElement.textContent = `${filteredLogs.length} log${filteredLogs.length !== 1 ? 's' : ''}`;
  }

  if (debuggerSettings.autoScroll) {
    debuggerLogsElement.scrollTop = debuggerLogsElement.scrollHeight;
  }
}

function findErrorExplanation(message) {
  for (const [errorType, explanation] of Object.entries(errorExplanations)) {
    if (message.toLowerCase().includes(errorType.toLowerCase())) {
      return explanation;
    }
  }
  return null;
}

function clearDebuggerLogs() {
  debuggerLogs = [];
  debuggerStats = {
    total: 0,
    errors: 0,
    warnings: 0,
    info: 0
  };
  uniqueErrors.clear();
  expandedErrors.clear();
  updateDebuggerStats();
  renderDebuggerLogs();
  addDebuggerLog('INFO', 'Logs cleared');
}

function exportDebuggerLogs() {
  const dataStr = JSON.stringify(debuggerLogs, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

  const exportFileDefaultName = 'debugger-logs-' + new Date().toISOString().split('T')[0] + '.json';

  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
}

function copyDebuggerLogs() {
  const filter = document.getElementById('debugger-filter');
  const filterValue = filter ? filter.value : 'all';

  const filteredLogs = filterValue === 'all'
    ? debuggerLogs
    : debuggerLogs.filter(log => log.type.toLowerCase() === filterValue);

  const text = filteredLogs.map(log => {
    const time = debuggerSettings.showTimestamp
      ? `[${new Date(log.timestamp).toLocaleTimeString()}] `
      : '';
    const category = debuggerSettings.showCategory
      ? `[${log.type}] `
      : '';
    return `${time}${category}${log.message}`;
  }).join('\n');

  navigator.clipboard.writeText(text).then(() => {
    addDebuggerLog('INFO', 'Logs copied to clipboard');
  }).catch(err => {
    addDebuggerLog('ERROR', 'Failed to copy logs: ' + err);
  });
}

function toggleDebuggerPause() {
  debuggerPaused = !debuggerPaused;
  const statusIndicator = document.getElementById('debugger-status');
  const pauseButton = document.getElementById('debugger-pause');

  if (statusIndicator) {
    if (debuggerPaused) {
      statusIndicator.classList.add('paused');
      statusIndicator.classList.remove('running');
      addDebuggerLog('INFO', 'Debugger paused');
    } else {
      statusIndicator.classList.remove('paused');
      statusIndicator.classList.add('running');
      addDebuggerLog('INFO', 'Debugger resumed');
    }
  }

  if (pauseButton) {
    pauseButton.textContent = debuggerPaused ? '▶ Resume' : '⏸ Pause';
  }
}

function updateDebuggerStats() {
  const totalElement = document.getElementById('debug-total-logs');
  const errorElement = document.getElementById('debug-errors');
  const warningElement = document.getElementById('debug-warnings');
  const infoElement = document.getElementById('debug-info');

  if (totalElement) totalElement.textContent = debuggerStats.total;
  if (errorElement) errorElement.textContent = debuggerStats.errors;
  if (warningElement) warningElement.textContent = debuggerStats.warnings;
  if (infoElement) infoElement.textContent = debuggerStats.info;
}

function filterDebuggerLogs(filterValue) {
  renderDebuggerLogs();
}

function searchDebuggerLogs(searchTerm) {
  renderDebuggerLogs();
}
