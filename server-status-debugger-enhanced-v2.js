// Server Status Debugger - Enhanced Version v2
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

// Initialize debugger when DOM is ready
function initDebuggerWhenReady() {
  if (document.getElementById('debugger-container')) {
    // Override console first
    overrideConsole();
    // Then initialize the debugger
    initializeDebugger();
  } else {
    // Retry after a short delay
    setTimeout(initDebuggerWhenReady, 100);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initDebuggerWhenReady();
});

function initializeDebugger() {
  window._originalConsole.log('Initializing debugger...');
  window._originalConsole.log('Checking for debugger elements...');

  // Get debugger elements
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

  // Setup filter change handler
  if (debuggerFilter) {
    debuggerFilter.addEventListener('change', (e) => {
      filterDebuggerLogs(e.target.value);
    });
  }

  // Setup pause button
  if (debuggerPause) {
    debuggerPause.addEventListener('click', () => {
      toggleDebuggerPause();
    });
  }

  // Setup search button
  if (debuggerSearch) {
    debuggerSearch.addEventListener('click', () => {
      debuggerSearchBar.style.display = debuggerSearchBar.style.display === 'none' ? 'flex' : 'none';
      if (debuggerSearchBar.style.display === 'flex') {
        debuggerSearchInput.focus();
      }
    });
  }

  // Setup search input
  if (debuggerSearchInput) {
    debuggerSearchInput.addEventListener('input', (e) => {
      searchDebuggerLogs(e.target.value);
    });
  }

  // Setup search close button
  if (debuggerSearchClose) {
    debuggerSearchClose.addEventListener('click', () => {
      debuggerSearchBar.style.display = 'none';
      debuggerSearchInput.value = '';
      renderDebuggerLogs();
    });
  }

  // Setup clear button
  if (debuggerClear) {
    debuggerClear.addEventListener('click', () => {
      clearDebuggerLogs();
    });
  }

  // Setup export button
  if (debuggerExport) {
    debuggerExport.addEventListener('click', () => {
      exportDebuggerLogs();
    });
  }

  // Setup copy button
  if (debuggerCopy) {
    debuggerCopy.addEventListener('click', () => {
      copyDebuggerLogs();
    });
  }

  // Setup auto scroll toggle
  if (debuggerAutoScroll) {
    debuggerAutoScroll.addEventListener('change', (e) => {
      debuggerSettings.autoScroll = e.target.checked;
    });
  }

  // Setup show timestamp toggle
  if (debuggerShowTimestamp) {
    debuggerShowTimestamp.addEventListener('change', (e) => {
      debuggerSettings.showTimestamp = e.target.checked;
      renderDebuggerLogs();
    });
  }

  // Setup show category toggle
  if (debuggerShowCategory) {
    debuggerShowCategory.addEventListener('change', (e) => {
      debuggerSettings.showCategory = e.target.checked;
      renderDebuggerLogs();
    });
  }

  // Add initial log
  addDebuggerLog('INFO', 'Debugger initialized');
}

function overrideConsole() {
  // Store original console methods if not already stored
  if (!window._originalConsole) {
    window._originalConsole = {
      log: console.log.bind(console),
      error: console.error.bind(console),
      warn: console.warn.bind(console)
    };
  }

  // Override console methods
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
  
  // Check if there's an active search or filter
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

      return `
      <div class="debugger-log-entry ${typeClass}">
        ${timeSpan}
        ${categorySpan}
        <span class="debugger-log-message">${log.message}</span>
      </div>
    `;}).join('');
  }

  // Update log count
  const logCountElement = document.getElementById('debugger-log-count');
  if (logCountElement) {
    logCountElement.textContent = `${filteredLogs.length} log${filteredLogs.length !== 1 ? 's' : ''}`;
  }

  // Auto-scroll to bottom
  if (debuggerSettings.autoScroll) {
    debuggerLogsElement.scrollTop = debuggerLogsElement.scrollHeight;
  }
}

function filterDebuggerLogs(filterValue) {
  renderDebuggerLogs();
}

function searchDebuggerLogs(searchTerm) {
  const debuggerLogsElement = document.getElementById('debugger-logs');
  if (!debuggerLogsElement) return;

  const filter = document.getElementById('debugger-filter');
  const filterValue = filter ? filter.value : 'all';

  const filteredLogs = debuggerLogs.filter(log => {
    const matchesFilter = filterValue === 'all' || log.type.toLowerCase() === filterValue;
    const matchesSearch = !searchTerm || 
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.type.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

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

      return `
      <div class="debugger-log-entry ${typeClass}">
        ${timeSpan}
        ${categorySpan}
        <span class="debugger-log-message">${log.message}</span>
      </div>
    `;}).join('');
  }

  // Update log count
  const logCountElement = document.getElementById('debugger-log-count');
  if (logCountElement) {
    logCountElement.textContent = `${filteredLogs.length} log${filteredLogs.length !== 1 ? 's' : ''}`;
  }
}

function clearDebuggerLogs() {
  debuggerLogs = [];
  debuggerStats = {
    total: 0,
    errors: 0,
    warnings: 0,
    info: 0
  };
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
      statusIndicator.querySelector('.status-text').textContent = 'Paused';
    } else {
      statusIndicator.classList.remove('paused');
      statusIndicator.querySelector('.status-text').textContent = 'Active';
    }
  }

  if (pauseButton) {
    pauseButton.textContent = debuggerPaused ? '▶️' : '⏸️';
  }

  addDebuggerLog('INFO', `Debugger ${debuggerPaused ? 'paused' : 'resumed'}`);
}

function updateDebuggerStats() {
  const totalElement = document.getElementById('debug-total-logs');
  const errorsElement = document.getElementById('debug-errors');
  const warningsElement = document.getElementById('debug-warnings');
  const infoElement = document.getElementById('debug-info');

  if (totalElement) totalElement.textContent = debuggerStats.total;
  if (errorsElement) errorsElement.textContent = debuggerStats.errors;
  if (warningsElement) warningsElement.textContent = debuggerStats.warnings;
  if (infoElement) infoElement.textContent = debuggerStats.info;
}
