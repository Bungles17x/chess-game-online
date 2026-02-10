// debugger.js - In-Game Debugger System
// This file provides a comprehensive debugging interface accessible from any file

// Make debugger available globally
window.Debugger = {
    enabled: false,
    logs: [],
    maxLogs: 100,
    currentFile: 'global',
    breakpoints: new Set(),
    authorizedUser: 'bungles17x', // Only this user can access the debugger
    initialized: false, // Track if debugger has been initialized

    // Initialize the debugger
    init() {
        // Check if already initialized
        if (this.initialized) {
            console.warn('Debugger already initialized');
            return;
        }

        // Check if current user is authorized
        if (!this.isAuthorized()) {
            console.error('Debugger access denied: User not authorized');
            return;
        }
        
        this.createDebuggerUI();
        this.setupEventListeners();
        this.setupErrorMonitoring();
        this.initialized = true;
        this.log('SYSTEM', 'Debugger initialized');
    },

    // Setup error monitoring to auto-show debugger on errors
    setupErrorMonitoring() {
        // Override console.error to catch errors
        const originalError = console.error;
        const self = this;
        
        console.error = function(...args) {
            // Call original error
            originalError.apply(console, args);
            
            // Auto-show debugger if authorized user encounters error
            if (self.isAuthorized() && !self.enabled) {
                self.toggle();
                self.log('ERROR', 'Auto-opened due to console error');
            }
            
            // Log to debugger if it's enabled
            if (self.enabled) {
                const errorMessage = args.map(arg => 
                    typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
                ).join(' ');
                self.log('ERROR', errorMessage);
            }
        };
        
        // Override console.warn to catch warnings
        const originalWarn = console.warn;
        console.warn = function(...args) {
            // Call original warn
            originalWarn.apply(console, args);
            
            // Log to debugger if it's enabled
            if (self.enabled) {
                const warnMessage = args.map(arg => 
                    typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
                ).join(' ');
                self.log('WARN', warnMessage);
            }
        };
    },

    // Check if current user is authorized
    isAuthorized() {
        // Check localStorage for currentUser object (used by auth system)
        const currentUserStr = localStorage.getItem('currentUser');
        if (currentUserStr) {
            try {
                const currentUser = JSON.parse(currentUserStr);
                if (currentUser.username && currentUser.username === this.authorizedUser) {
                    return true;
                }
            } catch (e) {
                console.warn('Failed to parse currentUser from localStorage', e);
            }
        }
        
        // Check localStorage for username directly
        const username = localStorage.getItem('username');
        if (username === this.authorizedUser) {
            return true;
        }
        
        // Check if there's a global user object
        if (window.currentUser && window.currentUser.username === this.authorizedUser) {
            return true;
        }
        
        // Check sessionStorage
        const sessionUser = sessionStorage.getItem('username');
        if (sessionUser === this.authorizedUser) {
            return true;
        }
        
        return false;
    },

    // Create the debugger UI elements
    createDebuggerUI() {
        // Check if debugger container already exists
        if (document.getElementById('debugger-container')) {
            return;
        }
        
        // Create main debugger container
        const debuggerContainer = document.createElement('div');
        debuggerContainer.id = 'debugger-container';
        debuggerContainer.className = 'debugger-container hidden';

        debuggerContainer.innerHTML = `
            <div class="debugger-header" id="debugger-header">
                <h3>🐛 Game Debugger</h3>
                <div class="debugger-controls">
                    <button id="debugger-toggle" class="debugger-btn">▶</button>
                    <button id="debugger-clear" class="debugger-btn">Clear</button>
                    <button id="debugger-export" class="debugger-btn">Export</button>
                    <button id="debugger-close" class="debugger-btn">×</button>
                </div>
            </div>
            <!-- Resize handles -->
            <div class="debugger-resize-handle nw" data-handle="nw"></div>
            <div class="debugger-resize-handle ne" data-handle="ne"></div>
            <div class="debugger-resize-handle sw" data-handle="sw"></div>
            <div class="debugger-resize-handle se" data-handle="se"></div>
            <div class="debugger-resize-handle n" data-handle="n"></div>
            <div class="debugger-resize-handle s" data-handle="s"></div>
            <div class="debugger-resize-handle e" data-handle="e"></div>
            <div class="debugger-resize-handle w" data-handle="w"></div>

            <div class="debugger-body">
                <div class="debugger-sidebar">
                    <div class="debugger-section">
                        <h4>📁 File Selector</h4>
                        <select id="debugger-file-select" class="debugger-select">
                            <option value="global">Global</option>
                            <option value="script.js">Main Script</option>
                            <option value="chess.js">Chess Engine</option>
                            <option value="auth.js">Authentication</option>
                            <option value="friends.js">Friends System</option>
                            <option value="profile.js">Profile</option>
                            <option value="admin-features.js">Admin Features</option>
                            <option value="client-anti-cheat.js">Anti-Cheat</option>
                            <option value="notification-system.js">Notifications</option>
                            <option value="reporting-system.js">Reporting</option>
                        </select>
                    </div>

                    <div class="debugger-section">
                        <h4>🎯 Game State</h4>
                        <div class="debugger-info">
                            <div>Turn: <span id="debug-turn">-</span></div>
                            <div>Mode: <span id="debug-mode">-</span></div>
                            <div>Room: <span id="debug-room">-</span></div>
                        </div>
                    </div>

                    <div class="debugger-section">
                        <h4>⚙️ Actions</h4>
                        <button id="debug-reset-game" class="debugger-action-btn">Reset Game</button>
                        <button id="debug-toggle-bot" class="debugger-action-btn">Toggle Bot</button>
                        <button id="debug-force-win" class="debugger-action-btn">Force Win</button>
                        <button id="debug-test-move" class="debugger-action-btn">Test Move</button>
                    </div>

                    <div class="debugger-section">
                        <h4>📊 Statistics</h4>
                        <div class="debugger-info">
                            <div>Moves: <span id="debug-moves">0</span></div>
                            <div>Captures: <span id="debug-captures">0</span></div>
                            <div>Latency: <span id="debug-latency">0ms</span></div>
                        </div>
                    </div>
                </div>

                <div class="debugger-main">
                    <div class="debugger-tabs">
                        <button class="debugger-tab active" data-tab="logs">Logs</button>
                        <button class="debugger-tab" data-tab="console">Console</button>
                        <button class="debugger-tab" data-tab="network">Network</button>
                        <button class="debugger-tab" data-tab="state">State</button>
                    </div>

                    <div id="debugger-logs" class="debugger-tab-content active">
                        <div id="debugger-log-output" class="debugger-log-output"></div>
                    </div>

                    <div id="debugger-console" class="debugger-tab-content">
                        <div id="debugger-console-output" class="debugger-console-output"></div>
                        <div class="debugger-console-input">
                            <input type="text" id="debugger-cmd-input" placeholder="Enter command..." />
                            <button id="debugger-cmd-btn">Run</button>
                        </div>
                    </div>

                    <div id="debugger-network" class="debugger-tab-content">
                        <div id="debugger-network-output" class="debugger-network-output"></div>
                    </div>

                    <div id="debugger-state" class="debugger-tab-content">
                        <div id="debugger-state-output" class="debugger-state-output"></div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(debuggerContainer);

        // Add debugger toggle button to the main menu (only if it doesn't exist)
        const menuDropdown = document.querySelector('.dropdown-content');
        if (menuDropdown && !document.getElementById('debugger-menu-btn')) {
            const debuggerBtn = document.createElement('button');
            debuggerBtn.id = 'debugger-menu-btn';
            debuggerBtn.className = 'dropdown-item';
            debuggerBtn.innerHTML = '🐛 Debugger';
            debuggerBtn.onclick = () => this.toggle();
            menuDropdown.appendChild(debuggerBtn);
        }
    },

    // Setup event listeners for debugger UI
    setupEventListeners() {
        // Wait for DOM to be ready
        setTimeout(() => {
            // Toggle debugger visibility
            const closeBtn = document.getElementById('debugger-close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => this.toggle());
            }

            // Clear logs
            const clearBtn = document.getElementById('debugger-clear');
            if (clearBtn) {
                clearBtn.addEventListener('click', () => this.clearLogs());
            }

            // Export logs
            const exportBtn = document.getElementById('debugger-export');
            if (exportBtn) {
                exportBtn.addEventListener('click', () => this.exportLogs());
            }

            // File selector
            const fileSelect = document.getElementById('debugger-file-select');
            if (fileSelect) {
                fileSelect.addEventListener('change', (e) => {
                    this.currentFile = e.target.value;
                    this.filterLogs();
                });
            }

            // Tab switching
            document.querySelectorAll('.debugger-tab').forEach(tab => {
                tab.addEventListener('click', () => {
                    document.querySelectorAll('.debugger-tab').forEach(t => t.classList.remove('active'));
                    document.querySelectorAll('.debugger-tab-content').forEach(c => c.classList.remove('active'));
                    tab.classList.add('active');
                    const tabContent = document.getElementById(`debugger-${tab.dataset.tab}`);
                    if (tabContent) {
                        tabContent.classList.add('active');
                        
                        // Update content when switching tabs
                        if (tab.dataset.tab === 'network') {
                            this.updateNetworkInfo();
                        } else if (tab.dataset.tab === 'state') {
                            this.updateStateInfo();
                        }
                    }
                });
            });

            // Console command input
            const cmdBtn = document.getElementById('debugger-cmd-btn');
            const cmdInput = document.getElementById('debugger-cmd-input');
            
            if (cmdBtn) {
                cmdBtn.addEventListener('click', () => this.executeCommand());
            }
            
            if (cmdInput) {
                cmdInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') this.executeCommand();
                });
            }

            // Setup drag functionality
            this.setupDrag();

            // Setup resize functionality
            this.setupResize();

            // Action buttons
            const resetGameBtn = document.getElementById('debug-reset-game');
            if (resetGameBtn) {
                resetGameBtn.addEventListener('click', () => {
                    if (window.resetGame) window.resetGame();
                    this.log('ACTION', 'Game reset via debugger');
                });
            }

            const toggleBotBtn = document.getElementById('debug-toggle-bot');
            if (toggleBotBtn) {
                toggleBotBtn.addEventListener('click', () => {
                    if (window.toggleBotMode) window.toggleBotMode();
                    this.log('ACTION', 'Bot mode toggled via debugger');
                });
            }

            const forceWinBtn = document.getElementById('debug-force-win');
            if (forceWinBtn) {
                forceWinBtn.addEventListener('click', () => {
                    this.log('ACTION', 'Force win triggered via debugger');
                    // Add your force win logic here
                });
            }

            const testMoveBtn = document.getElementById('debug-test-move');
            if (testMoveBtn) {
                testMoveBtn.addEventListener('click', () => {
                    this.testRandomMove();
                });
            }
        }, 100);
    },

    // Toggle debugger visibility
    toggle() {
        // Check if user is authorized before showing debugger
        if (!this.isAuthorized()) {
            alert('Access Denied: You are not authorized to use the debugger.');
            return;
        }
        
        const container = document.getElementById('debugger-container');
        if (container) {
            container.classList.toggle('hidden');
            this.enabled = !container.classList.contains('hidden');
            
            // Start auto-refresh when opened
            if (this.enabled) {
                this.startAutoRefresh();
                this.updateGameState(); // Immediate update
            }
        }
    },

    // Log a message
    log(category, message, data = null) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            category,
            message,
            data,
            file: this.currentFile
        };

        this.logs.push(logEntry);
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }

        // Auto-show debugger on error for authorized user
        if (this.isAuthorized() && (category === 'ERROR' || category === 'error' || message.toLowerCase().includes('error'))) {
            if (!this.enabled) {
                this.toggle();
            }
        }

        this.displayLog(logEntry);
    },

    // Display a log entry
    displayLog(logEntry) {
        const output = document.getElementById('debugger-log-output');
        if (!output) return;

        const isError = logEntry.category === 'ERROR' || 
                       logEntry.category === 'error' || 
                       logEntry.message.toLowerCase().includes('error');
        
        const logElement = document.createElement('div');
        logElement.className = `debugger-log-entry debugger-log-${logEntry.category.toLowerCase()} ${isError ? 'error' : ''}`;
        logElement.innerHTML = `
            <span class="debugger-log-time">${logEntry.timestamp}</span>
            <span class="debugger-log-category">[${logEntry.category}]</span>
            <span class="debugger-log-message">${logEntry.message}</span>
            ${logEntry.data ? `<pre class="debugger-log-data">${JSON.stringify(logEntry.data, null, 2)}</pre>` : ''}
        `;

        output.appendChild(logElement);
        output.scrollTop = output.scrollHeight;
    },

    // Filter logs by current file
    filterLogs() {
        const output = document.getElementById('debugger-log-output');
        if (!output) return;

        output.innerHTML = '';
        this.logs.forEach(logEntry => {
            if (logEntry.file === this.currentFile || this.currentFile === 'global') {
                this.displayLog(logEntry);
            }
        });
    },

    // Clear all logs
    clearLogs() {
        this.logs = [];
        const output = document.getElementById('debugger-log-output');
        if (output) output.innerHTML = '';
        this.log('SYSTEM', 'Logs cleared');
    },

    // Export logs to file
    exportLogs() {
        const data = JSON.stringify(this.logs, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `debug-logs-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        this.log('SYSTEM', 'Logs exported');
    },

    // Execute a console command
    executeCommand() {
        const input = document.getElementById('debugger-cmd-input');
        if (!input) return;

        const command = input.value.trim();
        if (!command) return;

        // Check if it's a help command
        if (command.toLowerCase() === 'help') {
            this.showHelp();
            input.value = '';
            return;
        }

        // Check if it's a clear command
        if (command.toLowerCase() === 'clear') {
            this.clearConsole();
            input.value = '';
            return;
        }

        // Display command in console output
        const consoleOutput = document.getElementById('debugger-console-output');
        if (consoleOutput) {
            const cmdElement = document.createElement('div');
            cmdElement.className = 'debugger-console-command';
            cmdElement.innerHTML = `<span class="debugger-console-prompt">></span> ${command}`;
            consoleOutput.appendChild(cmdElement);
        }

        try {
            const result = eval(command);
            
            // Display result in console output
            if (consoleOutput) {
                const resultElement = document.createElement('div');
                resultElement.className = 'debugger-console-result';
                resultElement.textContent = typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result);
                consoleOutput.appendChild(resultElement);
                consoleOutput.scrollTop = consoleOutput.scrollHeight;
            }
            
            this.log('COMMAND', `Executed: ${command}`);
        } catch (error) {
            // Display error in console output
            if (consoleOutput) {
                const errorElement = document.createElement('div');
                errorElement.className = 'debugger-console-error';
                errorElement.textContent = `Error: ${error.message}`;
                consoleOutput.appendChild(errorElement);
                consoleOutput.scrollTop = consoleOutput.scrollHeight;
            }
            
            // Check if it's a ReferenceError (command not found)
            if (error instanceof ReferenceError) {
                const suggestion = this.findSimilarCommand(command);
                let errorMessage = `The command "${command}" does not exist`;
                
                // Check if it's an incomplete command (prefix of a known command)
                const isIncomplete = this.isIncompleteCommand(command);
                
                if (isIncomplete) {
                    errorMessage = `Please use the full command input`;
                } else if (suggestion) {
                    errorMessage = `The command "${command}" does not exist, but there is a command "${suggestion}" that's close enough to this, use this one?`;
                }
                
                // Update error message in console output
                if (consoleOutput) {
                    const errorElement = document.querySelector('.debugger-console-error:last-child');
                    if (errorElement) {
                        errorElement.textContent = errorMessage;
                    }
                }
                
                this.log('ERROR', errorMessage);
            } else {
                this.log('ERROR', `Command failed: ${error.message}`);
            }
        }

        input.value = '';
    },

    // Clear the console output
    clearConsole() {
        const consoleOutput = document.getElementById('debugger-console-output');
        if (consoleOutput) {
            consoleOutput.innerHTML = '';
            this.log('SYSTEM', 'Console cleared');
        }
    },

    // Show help with all available commands
    showHelp() {
        const consoleOutput = document.getElementById('debugger-console-output');
        if (!consoleOutput) return;

        // Create help header
        const headerElement = document.createElement('div');
        headerElement.className = 'debugger-console-help-header';
        headerElement.textContent = 'Available Commands:';
        consoleOutput.appendChild(headerElement);

        // Define command categories
        const commandCategories = {
            'Game Commands': [
                { cmd: 'game.fen()', desc: 'Get current board position (FEN notation)' },
                { cmd: 'game.moves()', desc: 'Get all legal moves' },
                { cmd: 'game.turn()', desc: 'Get current turn (white/black)' },
                { cmd: 'game.in_check()', desc: 'Check if current player is in check' },
                { cmd: 'game.checkmate()', desc: 'Check if game is in checkmate' },
                { cmd: 'game.draw()', desc: 'Check if game is a draw' },
                { cmd: 'game.stalemate()', desc: 'Check if game is in stalemate' },
                { cmd: 'game.history()', desc: 'Get move history' },
                { cmd: 'game.ascii()', desc: 'Display board as ASCII art' }
            ],
            'Game Actions': [
                { cmd: 'resetGame()', desc: 'Reset the game to starting position' },
                { cmd: 'toggleBotMode()', desc: 'Toggle between bot and online mode' },
                { cmd: 'game.move(move)', desc: 'Make a move (e.g., game.move("e4"))' },
                { cmd: 'game.undo()', desc: 'Undo the last move' }
            ],
            'Debugger Commands': [
                { cmd: 'Debugger.toggle()', desc: 'Toggle debugger visibility' },
                { cmd: 'Debugger.log(category, message)', desc: 'Log a message to the debugger' },
                { cmd: 'Debugger.clearLogs()', desc: 'Clear all debugger logs' },
                { cmd: 'Debugger.exportLogs()', desc: 'Export logs to a file' }
            ],
            'Console Commands': [
                { cmd: 'help', desc: 'Show this help message' },
                { cmd: 'clear', desc: 'Clear the console output' }
            ],
            'Global Variables': [
                { cmd: 'window.game', desc: 'The chess game instance' },
                { cmd: 'window.roomId', desc: 'Current room ID' },
                { cmd: 'window.gameMode', desc: 'Current game mode (bot/online)' },
                { cmd: 'window.Debugger', desc: 'The debugger instance' }
            ]
        };

        // Display each category
        for (const [category, commands] of Object.entries(commandCategories)) {
            const categoryElement = document.createElement('div');
            categoryElement.className = 'debugger-console-help-category';
            categoryElement.textContent = `\n${category}`;
            consoleOutput.appendChild(categoryElement);

            commands.forEach(({ cmd, desc }) => {
                const cmdElement = document.createElement('div');
                cmdElement.className = 'debugger-console-help-command';
                cmdElement.innerHTML = `<span class="debugger-console-help-cmd">${cmd}</span> - ${desc}`;
                consoleOutput.appendChild(cmdElement);
            });
        }

        // Scroll to bottom
        consoleOutput.scrollTop = consoleOutput.scrollHeight;

        this.log('SYSTEM', 'Help command executed');
    },

    // Check if command is incomplete (prefix of a known command or used without context)
    isIncompleteCommand(command) {
        const availableCommands = [
            'game', 'Debugger', 'socket', 'roomId', 'gameMode',
            'resetGame', 'toggleBotMode', 'makeMove', 'undoMove',
            'log', 'toggle', 'clearLogs', 'exportLogs', 'executeCommand',
            'fen', 'moves', 'turn', 'in_check', 'checkmate', 'draw',
            'localStorage', 'sessionStorage', 'document', 'window', 'console'
        ];

        // Check if the command is a prefix of any available command
        const isPrefix = availableCommands.some(cmd => 
            cmd.toLowerCase().startsWith(command.toLowerCase()) && 
            cmd.toLowerCase() !== command.toLowerCase()
        );

        // Check if the command matches a known command but is used without proper context
        const isUsedWithoutContext = availableCommands.some(cmd => 
            cmd.toLowerCase() === command.toLowerCase() &&
            (cmd === 'moves' || cmd === 'fen' || cmd === 'turn' || 
             cmd === 'in_check' || cmd === 'checkmate' || cmd === 'draw')
        );

        return isPrefix || isUsedWithoutContext;
    },

    // Find similar command using Levenshtein distance
    findSimilarCommand(command) {
        // Get all available global functions and properties
        const availableCommands = [
            // Window properties
            'game', 'Debugger', 'socket', 'roomId', 'gameMode',
            // Game methods
            'resetGame', 'toggleBotMode', 'makeMove', 'undoMove',
            // Debugger methods
            'log', 'toggle', 'clearLogs', 'exportLogs', 'executeCommand',
            // Common console methods
            'log', 'error', 'warn', 'info', 'debug',
            // Chess.js methods
            'fen', 'moves', 'turn', 'in_check', 'checkmate', 'draw',
            // Other useful commands
            'localStorage', 'sessionStorage', 'document', 'window', 'console'
        ];

        // Filter out commands that don't exist
        const existingCommands = availableCommands.filter(cmd => {
            try {
                return typeof window[cmd] !== 'undefined' || 
                       (window.game && typeof window.game[cmd] !== 'undefined') ||
                       (window.Debugger && typeof window.Debugger[cmd] !== 'undefined');
            } catch (e) {
                return false;
            }
        });

        // Add game methods if game exists
        if (window.game) {
            existingCommands.push('fen', 'moves', 'turn', 'ascii', 'history', 'in_check', 'checkmate', 'draw', 'stalemate', 'insufficient_material', 'threefold_repetition');
        }

        // Find the closest match using Levenshtein distance
        let closestMatch = null;
        let minDistance = Infinity;

        for (const cmd of existingCommands) {
            const distance = this.levenshteinDistance(command.toLowerCase(), cmd.toLowerCase());
            if (distance < minDistance && distance <= 3) { // Threshold of 3 characters difference
                minDistance = distance;
                closestMatch = cmd;
            }
        }

        return closestMatch;
    },

    // Calculate Levenshtein distance between two strings
    levenshteinDistance(str1, str2) {
        const m = str1.length;
        const n = str2.length;
        const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

        for (let i = 0; i <= m; i++) {
            dp[i][0] = i;
        }

        for (let j = 0; j <= n; j++) {
            dp[0][j] = j;
        }

        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                if (str1[i - 1] === str2[j - 1]) {
                    dp[i][j] = dp[i - 1][j - 1];
                } else {
                    dp[i][j] = Math.min(
                        dp[i - 1][j] + 1,    // deletion
                        dp[i][j - 1] + 1,    // insertion
                        dp[i - 1][j - 1] + 1 // substitution
                    );
                }
            }
        }

        return dp[m][n];
    },

    // Test a random move
    testRandomMove() {
        if (!window.game) {
            this.log('ERROR', 'Game not available');
            return;
        }

        const moves = window.game.moves();
        if (moves.length === 0) {
            this.log('INFO', 'No legal moves available');
            return;
        }

        const randomMove = moves[Math.floor(Math.random() * moves.length)];
        const result = window.game.move(randomMove);

        this.log('ACTION', `Test move: ${randomMove}`, {
            result,
            fen: window.game.fen()
        });

        this.updateGameState();
    },

    // Update game state display
    updateGameState() {
        if (!window.game) return;

        const turnEl = document.getElementById('debug-turn');
        const modeEl = document.getElementById('debug-mode');
        const roomEl = document.getElementById('debug-room');

        if (turnEl) turnEl.textContent = window.game.turn() === 'w' ? 'White' : 'Black';
        if (modeEl) modeEl.textContent = window.gameMode || 'bot';
        if (roomEl) roomEl.textContent = window.roomId || 'None';

        // Update statistics
        const movesEl = document.getElementById('debug-moves');
        const capturesEl = document.getElementById('debug-captures');
        const latencyEl = document.getElementById('debug-latency');

        if (movesEl) movesEl.textContent = window.moveCount || 0;
        if (capturesEl) capturesEl.textContent = window.captureCount || 0;
        if (latencyEl) latencyEl.textContent = `${window.connectionLatency || 0}ms`;
    },

    // Start auto-refreshing statistics
    startAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        
        this.refreshInterval = setInterval(() => {
            if (this.enabled) {
                this.updateGameState();
                
                // Update Network and State tabs if they are active
                const activeTab = document.querySelector('.debugger-tab.active');
                if (activeTab) {
                    if (activeTab.dataset.tab === 'network') {
                        this.updateNetworkInfo();
                    } else if (activeTab.dataset.tab === 'state') {
                        this.updateStateInfo();
                    }
                }
            }
        }, 1000); // Update every second
    },

    // Update network status
    updateNetworkStatus(status) {
        const output = document.getElementById('debugger-network-output');
        if (!output) return;

        const statusElement = document.createElement('div');
        statusElement.className = 'debugger-network-entry';
        statusElement.innerHTML = `
            <span class="debugger-network-time">${new Date().toISOString()}</span>
            <span class="debugger-network-status">${status}</span>
        `;

        output.appendChild(statusElement);
        output.scrollTop = output.scrollHeight;
    },

    // Update network information
    updateNetworkInfo() {
        const output = document.getElementById('debugger-network-output');
        if (!output) return;

        // Clear existing content
        output.innerHTML = '';

        // Create network info header
        const headerElement = document.createElement('div');
        headerElement.className = 'debugger-network-header';
        headerElement.textContent = 'Network Information';
        output.appendChild(headerElement);

        // Network status - check multiple socket properties
        let isConnected = false;
        if (window.socket) {
            isConnected = window.socket.connected || 
                        window.socket.readyState === 1 || 
                        window.socket._readyState === 1 ||
                        (window.socket.io && window.socket.io.readyState === 'open');
        }
        
        const statusElement = document.createElement('div');
        statusElement.className = 'debugger-network-info';
        statusElement.innerHTML = `
            <div class="debugger-network-label">Connection Status:</div>
            <div class="debugger-network-value">${isConnected ? 'Connected' : 'Disconnected'}</div>
        `;
        output.appendChild(statusElement);

        // Room ID
        const roomElement = document.createElement('div');
        roomElement.className = 'debugger-network-info';
        roomElement.innerHTML = `
            <div class="debugger-network-label">Room ID:</div>
            <div class="debugger-network-value">${window.roomId || 'None'}</div>
        `;
        output.appendChild(roomElement);

        // Game mode
        const modeElement = document.createElement('div');
        modeElement.className = 'debugger-network-info';
        modeElement.innerHTML = `
            <div class="debugger-network-label">Game Mode:</div>
            <div class="debugger-network-value">${window.gameMode || 'bot'}</div>
        `;
        output.appendChild(modeElement);

        // Latency
        const latencyElement = document.createElement('div');
        latencyElement.className = 'debugger-network-info';
        latencyElement.innerHTML = `
            <div class="debugger-network-label">Latency:</div>
            <div class="debugger-network-value">${window.connectionLatency || 0}ms</div>
        `;
        output.appendChild(latencyElement);

        // Socket ID
        if (window.socket && window.socket.id) {
            const socketIdElement = document.createElement('div');
            socketIdElement.className = 'debugger-network-info';
            socketIdElement.innerHTML = `
                <div class="debugger-network-label">Socket ID:</div>
                <div class="debugger-network-value">${window.socket.id}</div>
            `;
            output.appendChild(socketIdElement);
        }

        // Network events log header
        const logHeader = document.createElement('div');
        logHeader.className = 'debugger-network-log-header';
        logHeader.textContent = '\nRecent Network Events';
        output.appendChild(logHeader);
    },

    // Setup drag functionality
    setupDrag() {
        const header = document.getElementById('debugger-header');
        const container = document.getElementById('debugger-container');
        
        if (!header || !container) return;

        let isDragging = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;
        let xOffset = 0;
        let yOffset = 0;

        // Remove the transform to allow absolute positioning
        container.style.transform = 'none';
        
        // Center the container initially
        const rect = container.getBoundingClientRect();
        container.style.left = `${(window.innerWidth - rect.width) / 2}px`;
        container.style.top = `${(window.innerHeight - rect.height) / 2}px`;

        header.addEventListener('mousedown', dragStart);
        document.addEventListener('mouseup', dragEnd);
        document.addEventListener('mousemove', drag);

        function dragStart(e) {
            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;

            if (e.target === header || header.contains(e.target)) {
                // Check if clicking on a button
                if (e.target.tagName === 'BUTTON') return;
                isDragging = true;
            }
        }

        function dragEnd(e) {
            initialX = currentX;
            initialY = currentY;
            isDragging = false;
        }

        function drag(e) {
            if (isDragging) {
                e.preventDefault();
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;

                xOffset = currentX;
                yOffset = currentY;

                setTranslate(currentX, currentY, container);
            }
        }

        function setTranslate(xPos, yPos, el) {
            el.style.left = xPos + 'px';
            el.style.top = yPos + 'px';
        }
    },

    // Setup resize functionality
    setupResize() {
        const container = document.getElementById('debugger-container');
        const handles = document.querySelectorAll('.debugger-resize-handle');
        
        if (!container) return;

        handles.forEach(handle => {
            let isResizing = false;
            let startX, startY, startWidth, startHeight, startLeft, startTop;
            const handleType = handle.dataset.handle;

            handle.addEventListener('mousedown', (e) => {
                e.preventDefault();
                isResizing = true;
                startX = e.clientX;
                startY = e.clientY;
                startWidth = container.offsetWidth;
                startHeight = container.offsetHeight;
                startLeft = container.offsetLeft;
                startTop = container.offsetTop;

                document.addEventListener('mousemove', resize);
                document.addEventListener('mouseup', stopResize);
            });

            function resize(e) {
                if (!isResizing) return;

                const deltaX = e.clientX - startX;
                const deltaY = e.clientY - startY;
                const minWidth = 400;
                const minHeight = 400;
                const maxWidth = window.innerWidth * 0.95;
                const maxHeight = window.innerHeight * 0.95;

                if (handleType.includes('e')) {
                    const newWidth = Math.min(Math.max(startWidth + deltaX, minWidth), maxWidth);
                    container.style.width = newWidth + 'px';
                }

                if (handleType.includes('w')) {
                    const newWidth = Math.min(Math.max(startWidth - deltaX, minWidth), maxWidth);
                    const newLeft = startLeft + startWidth - newWidth;
                    if (newWidth >= minWidth && newWidth <= maxWidth) {
                        container.style.width = newWidth + 'px';
                        container.style.left = newLeft + 'px';
                    }
                }

                if (handleType.includes('s')) {
                    const newHeight = Math.min(Math.max(startHeight + deltaY, minHeight), maxHeight);
                    container.style.height = newHeight + 'px';
                }

                if (handleType.includes('n')) {
                    const newHeight = Math.min(Math.max(startHeight - deltaY, minHeight), maxHeight);
                    const newTop = startTop + startHeight - newHeight;
                    if (newHeight >= minHeight && newHeight <= maxHeight) {
                        container.style.height = newHeight + 'px';
                        container.style.top = newTop + 'px';
                    }
                }
            }

            function stopResize() {
                isResizing = false;
                document.removeEventListener('mousemove', resize);
                document.removeEventListener('mouseup', stopResize);
            }
        });
    },

    // Update game state information
    updateStateInfo() {
        const output = document.getElementById('debugger-state-output');
        if (!output) return;

        // Clear existing content
        output.innerHTML = '';

        if (!window.game) {
            const noGameElement = document.createElement('div');
            noGameElement.className = 'debugger-state-error';
            noGameElement.textContent = 'Game not initialized';
            output.appendChild(noGameElement);
            return;
        }

        // Create state info header
        const headerElement = document.createElement('div');
        headerElement.className = 'debugger-state-header';
        headerElement.textContent = 'Game State Information';
        output.appendChild(headerElement);

        // Current position (FEN)
        const fenElement = document.createElement('div');
        fenElement.className = 'debugger-state-info';
        fenElement.innerHTML = `
            <div class="debugger-state-label">Position (FEN):</div>
            <div class="debugger-state-value">${window.game.fen()}</div>
        `;
        output.appendChild(fenElement);

        // Current turn
        const turnElement = document.createElement('div');
        turnElement.className = 'debugger-state-info';
        turnElement.innerHTML = `
            <div class="debugger-state-label">Current Turn:</div>
            <div class="debugger-state-value">${window.game.turn() === 'w' ? 'White' : 'Black'}</div>
        `;
        output.appendChild(turnElement);

        // Game status
        const statusElement = document.createElement('div');
        statusElement.className = 'debugger-state-info';
        let gameStatus = 'In Progress';
        if (window.game.in_checkmate()) gameStatus = 'Checkmate';
        else if (window.game.in_draw()) gameStatus = 'Draw';
        else if (window.game.in_stalemate()) gameStatus = 'Stalemate';
        else if (window.game.in_threefold_repetition()) gameStatus = 'Threefold Repetition';
        else if (window.game.insufficient_material()) gameStatus = 'Insufficient Material';
        
        statusElement.innerHTML = `
            <div class="debugger-state-label">Game Status:</div>
            <div class="debugger-state-value">${gameStatus}</div>
        `;
        output.appendChild(statusElement);

        // Check status
        const checkElement = document.createElement('div');
        checkElement.className = 'debugger-state-info';
        checkElement.innerHTML = `
            <div class="debugger-state-label">In Check:</div>
            <div class="debugger-state-value">${window.game.in_check() ? 'Yes' : 'No'}</div>
        `;
        output.appendChild(checkElement);

        // Move count
        const moveCountElement = document.createElement('div');
        moveCountElement.className = 'debugger-state-info';
        moveCountElement.innerHTML = `
            <div class="debugger-state-label">Move Count:</div>
            <div class="debugger-state-value">${window.game.history().length}</div>
        `;
        output.appendChild(moveCountElement);

        // Legal moves count
        const legalMovesElement = document.createElement('div');
        legalMovesElement.className = 'debugger-state-info';
        legalMovesElement.innerHTML = `
            <div class="debugger-state-label">Legal Moves:</div>
            <div class="debugger-state-value">${window.game.moves().length}</div>
        `;
        output.appendChild(legalMovesElement);

        // Castling rights
        const castlingElement = document.createElement('div');
        castlingElement.className = 'debugger-state-info';
        const castlingRights = window.game.get_castling();
        castlingElement.innerHTML = `
            <div class="debugger-state-label">Castling Rights:</div>
            <div class="debugger-state-value">${castlingRights || 'None'}</div>
        `;
        output.appendChild(castlingElement);

        // En passant square
        const enPassantElement = document.createElement('div');
        enPassantElement.className = 'debugger-state-info';
        enPassantElement.innerHTML = `
            <div class="debugger-state-label">En Passant:</div>
            <div class="debugger-state-value">${window.game.get_en_passant() || 'None'}</div>
        `;
        output.appendChild(enPassantElement);

        // Full move number
        const fullMoveElement = document.createElement('div');
        fullMoveElement.className = 'debugger-state-info';
        fullMoveElement.innerHTML = `
            <div class="debugger-state-label">Full Move Number:</div>
            <div class="debugger-state-value">${window.game.get_fullmove_number()}</div>
        `;
        output.appendChild(fullMoveElement);

        // Half move clock
        const halfMoveElement = document.createElement('div');
        halfMoveElement.className = 'debugger-state-info';
        halfMoveElement.innerHTML = `
            <div class="debugger-state-label">Half Move Clock:</div>
            <div class="debugger-state-value">${window.game.get_halfmove_clock()}</div>
        `;
        output.appendChild(halfMoveElement);

        // Move history header
        const historyHeader = document.createElement('div');
        historyHeader.className = 'debugger-state-history-header';
        historyHeader.textContent = '\nMove History';
        output.appendChild(historyHeader);

        // Move history
        const historyElement = document.createElement('div');
        historyElement.className = 'debugger-state-history';
        const history = window.game.history();
        if (history.length > 0) {
            historyElement.textContent = history.join(', ');
        } else {
            historyElement.textContent = 'No moves yet';
        }
        output.appendChild(historyElement);
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.Debugger;
}
