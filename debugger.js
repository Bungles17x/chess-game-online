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
        // Check if current user is authorized
        if (!this.isAuthorized()) {
            console.warn('Debugger access denied: User not authorized');
            return;
        }
        
        this.createDebuggerUI();
        this.setupEventListeners();
        this.initialized = true;
        this.log('SYSTEM', 'Debugger initialized');
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
            <div class="debugger-header">
                <h3>🐛 Game Debugger</h3>
                <div class="debugger-controls">
                    <button id="debugger-toggle" class="debugger-btn">▶</button>
                    <button id="debugger-clear" class="debugger-btn">Clear</button>
                    <button id="debugger-export" class="debugger-btn">Export</button>
                    <button id="debugger-close" class="debugger-btn">×</button>
                </div>
            </div>

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

        this.displayLog(logEntry);
    },

    // Display a log entry
    displayLog(logEntry) {
        const output = document.getElementById('debugger-log-output');
        if (!output) return;

        const logElement = document.createElement('div');
        logElement.className = `debugger-log-entry debugger-log-${logEntry.category.toLowerCase()}`;
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
            
            this.log('ERROR', `Command failed: ${error.message}`);
        }

        input.value = '';
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
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.Debugger;
}
