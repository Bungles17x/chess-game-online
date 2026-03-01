// Server Status Debugger - Embedded in server-status page
// This file handles the debugger functionality for the server status page

// Debugger state
let debuggerLogs = [];
let debuggerStats = {
  total: 0,
  errors: 0,
  warnings: 0
};

// Initialize debugger when DOM is ready
function initDebuggerWhenReady() {
  if (document.getElementById('debugger-container')) {
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
  console.log('Initializing debugger...');
  console.log('Checking for debugger elements...');

  // Get debugger elements
  const debuggerContainer = document.getElementById('debugger-container');
  const debuggerLogsElement = document.getElementById('debugger-logs');
  const debuggerFilter = document.getElementById('debugger-filter');
  const debuggerClear = document.getElementById('debugger-clear');
  const debuggerExport = document.getElementById('debugger-export');

  console.log('debuggerContainer:', debuggerContainer);
  console.log('debuggerLogsElement:', debuggerLogsElement);

  if (!debuggerContainer || !debuggerLogsElement) {
    console.error('Debugger elements not found');
    console.error('debuggerContainer:', debuggerContainer);
    console.error('debuggerLogsElement:', debuggerLogsElement);
    return;
  }

  console.log('All debugger elements found, setting up event listeners...');

  // Setup filter change handler
  if (debuggerFilter) {
    debuggerFilter.addEventListener('change', (e) => {
      filterDebuggerLogs(e.target.value);
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

  // Override console methods to capture logs
  overrideConsole();

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
  }

  updateDebuggerStats();
  renderDebuggerLogs();
}

function renderDebuggerLogs() {
  const debuggerLogsElement = document.getElementById('debugger-logs');
  if (!debuggerLogsElement) return;

  const filter = document.getElementById('debugger-filter');
  const filterValue = filter ? filter.value : 'all';

  const filteredLogs = filterValue === 'all' 
    ? debuggerLogs 
    : debuggerLogs.filter(log => log.type.toLowerCase() === filterValue);

  debuggerLogsElement.innerHTML = filteredLogs.map(log => {
    const explanation = getErrorExplanation(log.message);
    return `
    <div class="debugger-log-entry ${log.type === 'ERROR' ? 'error' : ''}">
      <span class="debugger-log-time">${new Date(log.timestamp).toLocaleTimeString()}</span>
      <span class="debugger-log-category">${log.type}</span>
      <span class="debugger-log-message">${log.message}</span>
      ${explanation ? `<div class="debugger-error-explanation">${explanation}</div>` : ''}
    </div>`;
  }).join('');

  // Auto-scroll to bottom
  debuggerLogsElement.scrollTop = debuggerLogsElement.scrollHeight;
}

function filterDebuggerLogs(filterValue) {
  renderDebuggerLogs();
}

function clearDebuggerLogs() {
  debuggerLogs = [];
  debuggerStats = {
    total: 0,
    errors: 0,
    warnings: 0
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

function updateDebuggerStats() {
  const totalElement = document.getElementById('debug-total-logs');
  const errorsElement = document.getElementById('debug-errors');
  const warningsElement = document.getElementById('debug-warnings');

  if (totalElement) totalElement.textContent = debuggerStats.total;
  if (errorsElement) errorsElement.textContent = debuggerStats.errors;
  if (warningsElement) warningsElement.textContent = debuggerStats.warnings;
}

// Get detailed explanation for common errors
function getErrorExplanation(errorMessage) {
  const errorLower = errorMessage.toLowerCase();
  
  const errorExplanations = {
    // WebSocket errors
    'websocket connection failed': 'The WebSocket connection to the server could not be established. This usually means:\n1. The server is offline or not responding\n2. There is a network connectivity issue\n3. The WebSocket URL is incorrect\n\nSolution: Check your internet connection and try refreshing the page.',
    'websocket connection closed': 'The WebSocket connection was closed unexpectedly. Possible causes:\n1. Server restarted or crashed\n2. Network interruption\n3. Connection timeout\n\nSolution: The system will automatically attempt to reconnect.',
    'no internet connection': 'Your device is not connected to the internet.\n\nSolution: Check your network connection and try again.',
    'connection refused': 'The server refused the connection. This could be because:\n1. The server is not running\n2. The server is overloaded\n3. A firewall is blocking the connection\n\nSolution: Check if the server is running and try again.',
    'connection timeout': 'The connection attempt timed out. This means:\n1. The server is taking too long to respond\n2. Network latency is too high\n3. The server is overloaded\n\nSolution: Check your internet connection and try again.',
    'connection lost': 'The connection to the server was lost. Possible causes:\n1. Network interruption\n2. Server went offline\n3. Session expired\n\nSolution: The system will attempt to reconnect automatically.',
    'connection reset': 'The connection was reset by the server. This could be because:\n1. Server restarted\n2. Connection was idle for too long\n3. Server detected an issue\n\nSolution: Try reconnecting. If the problem persists, contact support.',
    
    // Authentication errors
    'access denied': 'You do not have permission to access this resource.\n\nSolution: Make sure you are logged in with the correct account.',
    'unauthorized': 'Your session has expired or you are not authorized.\n\nSolution: Please log in again.',
    'invalid credentials': 'The username or password is incorrect.\n\nSolution: Check your login details and try again.',
    'authentication failed': 'Authentication failed. This could be because:\n1. Invalid username or password\n2. Account is locked or disabled\n3. Session expired\n\nSolution: Check your credentials and try logging in again.',
    'not authenticated': 'You are not authenticated. You need to log in to access this resource.\n\nSolution: Please log in to continue.',
    'session expired': 'Your session has expired due to inactivity.\n\nSolution: Please log in again to continue.',
    'token expired': 'Your authentication token has expired.\n\nSolution: Please log in again to get a new token.',
    'invalid token': 'The authentication token is invalid.\n\nSolution: Please log in again to get a valid token.',
    
    // Room/Game errors
    'room not found': 'The game room you are trying to join does not exist or has been closed.\n\nSolution: Create a new room or join an existing one.',
    'room full': 'The game room is already full (2 players).\n\nSolution: Join a different room or create a new one.',
    'invalid move': 'The chess move you attempted is not valid.\n\nSolution: Check the chess rules and try a different move.',
    'game not found': 'The game you are trying to access does not exist or has been deleted.\n\nSolution: Create a new game or join an existing one.',
    'player not found': 'The player you are trying to interact with does not exist.\n\nSolution: Check the player name and try again.',
    'game over': 'The game has already ended.\n\nSolution: Start a new game to continue playing.',
    'not your turn': 'It is not your turn to make a move.\n\nSolution: Wait for your opponent to make their move.',
    
    // Server errors
    'server error': 'An unexpected error occurred on the server.\n\nSolution: Try again later. If the problem persists, contact support.',
    'unknown message type': 'The server received a message type it doesn't recognize or support.\n\n📋 Explanation:\nThe server received a message type it doesn't recognize or support.\n\n🔍 Possible Causes:\n- The client is sending an outdated message format\n- The server hasn't implemented this message type yet\n- There's a version mismatch between client and server\n- The message type field is corrupted or malformed\n\nSeverity: HIGH',
    'server error: unknown message type': 'The server received a message type it doesn't recognize or support.\n\n📋 Explanation:\nThe server received a message type it doesn't recognize or support.\n\n🔍 Possible Causes:\n- The client is sending an outdated message format\n- The server hasn't implemented this message type yet\n- There's a version mismatch between client and server\n- The message type field is corrupted or malformed\n\nSeverity: HIGH',
    'internal server error': 'The server encountered an unexpected condition.\n\nSolution: Please try again. If the problem continues, report this issue.',
    'server unavailable': 'The server is currently unavailable. This could be because:\n1. Server is under maintenance\n2. Server is overloaded\n3. Server is down\n\nSolution: Try again later or check the server status page.',
    'server busy': 'The server is busy and cannot process your request right now.\n\nSolution: Please wait a moment and try again.',
    'service unavailable': 'The service is temporarily unavailable.\n\nSolution: Please try again later.',
    
    // Network errors
    'network error': 'A network error occurred while communicating with the server.\n\nSolution: Check your internet connection and try again.',
    'timeout': 'The request took too long to complete.\n\nSolution: Check your internet connection and try again.',
    'request timeout': 'The request to the server timed out. This could be because:\n1. Server is slow to respond\n2. Network issues\n3. Request is too complex\n\nSolution: Try again or simplify your request.',
    'connection error': 'A connection error occurred. This could be because:\n1. Internet connection lost\n2. Server is down\n3. Network configuration issue\n\nSolution: Check your internet connection and try again.',
    'dns error': 'A DNS error occurred. This means the domain name could not be resolved.\n\nSolution: Check your internet connection and try again.',
    
    // Database errors
    'database error': 'A database error occurred.\n\nSolution: Please try again. If the problem persists, contact support.',
    'database connection failed': 'Could not connect to the database.\n\nSolution: Please try again. If the problem continues, report this issue.',
    'query failed': 'The database query failed.\n\nSolution: Please try again. If the problem persists, contact support.',
    
    // File/Resource errors
    'file not found': 'The requested file or resource was not found.\n\nSolution: Check the file path and try again.',
    'resource not found': 'The requested resource was not found.\n\nSolution: Check the resource URL and try again.',
    '404': 'The requested resource was not found (404).\n\nSolution: Check the URL and try again.',
    
    // Permission errors
    'permission denied': 'You do not have permission to perform this action.\n\nSolution: Check your permissions and try again.',
    'forbidden': 'Access to this resource is forbidden (403).\n\nSolution: Make sure you have the proper permissions to access this resource.',
    
    // Validation errors
    'validation error': 'The data you provided is invalid.\n\nSolution: Check your input and try again.',
    'invalid input': 'The input you provided is invalid.\n\nSolution: Check your input and try again.',
    'invalid data': 'The data you provided is invalid.\n\nSolution: Check your data and try again.',
    'invalid parameter': 'One or more parameters are invalid.\n\nSolution: Check the parameters and try again.',
    'missing parameter': 'A required parameter is missing.\n\nSolution: Provide all required parameters and try again.',
    
    // Rate limiting errors
    'rate limit exceeded': 'You have exceeded the rate limit.\n\nSolution: Please wait before making more requests.',
    'too many requests': 'You have made too many requests.\n\nSolution: Please wait before making more requests.',
    
    // Generic errors
    'error': 'An error occurred. Please check the console for more details.',
    'failed': 'The operation failed. Please try again.',
    'unexpected error': 'An unexpected error occurred.\n\nSolution: Please try again. If the problem persists, contact support.',
    'unknown error': 'An unknown error occurred.\n\nSolution: Please try again. If the problem continues, contact support.',
    
    // JavaScript errors
    'undefined is not a function': 'You are trying to call a function that does not exist.\n\nSolution: Check your code for typos or undefined variables.',
    'cannot read property': 'You are trying to access a property of an undefined or null value.\n\nSolution: Check that the object exists before accessing its properties.',
    'unexpected token': 'There is a syntax error in your JavaScript code.\n\nSolution: Check your code for missing brackets, quotes, or other syntax issues.',
    'is not defined': 'A variable or function is not defined.\n\nSolution: Check that the variable or function is properly declared before use.',
    'is not a function': 'You are trying to call something that is not a function.\n\nSolution: Check that you are calling the correct function.',
    'cannot read properties of undefined': 'You are trying to read properties of an undefined value.\n\nSolution: Check that the object exists before accessing its properties.',
    'cannot read properties of null': 'You are trying to read properties of a null value.\n\nSolution: Check that the object is not null before accessing its properties.',
    'maximum call stack size exceeded': 'You have a recursive function that is calling itself infinitely.\n\nSolution: Check your recursive functions and add proper termination conditions.',
    'is not a constructor': 'You are trying to use something as a constructor that is not a constructor.\n\nSolution: Check that you are using the correct constructor.',
    'cannot set property': 'You are trying to set a property on an undefined or null value.\n\nSolution: Check that the object exists before setting its properties.',
    'is not iterable': 'You are trying to iterate over something that is not iterable.\n\nSolution: Check that the value is an array or other iterable type.',
    'invalid assignment': 'You are trying to assign a value to a read-only property.\n\nSolution: Check that you are not trying to modify a read-only property.',
    'reference error': 'A reference error occurred. This usually means a variable is not defined.\n\nSolution: Check that all variables are properly declared.',
    'syntax error': 'A syntax error occurred in your code.\n\nSolution: Check your code for syntax issues like missing brackets, quotes, or semicolons.',
    'type error': 'A type error occurred. This usually means you are using a value of the wrong type.\n\nSolution: Check the types of your variables and operations.',
    'range error': 'A range error occurred. This usually means you are trying to access a value outside the valid range.\n\nSolution: Check the range of your array indices or numeric values.',
    'uri error': 'A URI error occurred. This usually means there is an issue with encoding or decoding a URI.\n\nSolution: Check your URI encoding/decoding operations.',
    'eval error': 'An eval error occurred. This usually means there is an issue with the eval() function.\n\nSolution: Check your eval() usage and consider alternative approaches.',
    
    // HTTP status codes
    '400': 'Bad Request (400): The server could not understand the request.\n\nSolution: Check your request parameters and try again.',
    '401': 'Unauthorized (401): Authentication is required.\n\nSolution: Please log in and try again.',
    '403': 'Forbidden (403): You do not have permission to access this resource.\n\nSolution: Check your permissions and try again.',
    '404': 'Not Found (404): The requested resource was not found.\n\nSolution: Check the URL and try again.',
    '405': 'Method Not Allowed (405): The HTTP method is not allowed for this resource.\n\nSolution: Check your HTTP method and try again.',
    '408': 'Request Timeout (408): The request timed out.\n\nSolution: Try again with a faster connection or simplify your request.',
    '409': 'Conflict (409): There is a conflict with the current state of the resource.\n\nSolution: Check the resource state and try again.',
    '410': 'Gone (410): The resource is no longer available.\n\nSolution: The resource has been permanently removed.',
    '413': 'Payload Too Large (413): The request is too large.\n\nSolution: Reduce the size of your request.',
    '414': 'URI Too Long (414): The URI is too long.\n\nSolution: Shorten the URI and try again.',
    '415': 'Unsupported Media Type (415): The media type is not supported.\n\nSolution: Check the content type and try again.',
    '429': 'Too Many Requests (429): You have made too many requests.\n\nSolution: Please wait before making more requests.',
    '500': 'Internal Server Error (500): The server encountered an unexpected error.\n\nSolution: Please try again. If the problem continues, report this issue.',
    '502': 'Bad Gateway (502): The server received an invalid response from an upstream server.\n\nSolution: Please try again later.',
    '503': 'Service Unavailable (503): The service is temporarily unavailable.\n\nSolution: Please try again later.',
    '504': 'Gateway Timeout (504): The gateway timed out waiting for a response.\n\nSolution: Please try again later.',
  };
  
  // Check for matching error explanations
  for (const [errorKey, explanation] of Object.entries(errorExplanations)) {
    if (errorLower.includes(errorKey)) {
      return explanation;
    }
  }
  
  // Return generic explanation if no match found
  return 'An error occurred. Check the console for more details.';
}
