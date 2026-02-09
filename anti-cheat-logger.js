// anti-cheat-logger.js - Separate logging mechanism for anti-cheat system

// Anti-cheat logging configuration
const AntiCheatLogger = {
    enabled: true,
    logLevel: 'INFO', // Options: DEBUG, INFO, WARN, ERROR
    maxLogs: 100,
    logs: [],

    // Log levels with numeric values for comparison
    levels: {
        DEBUG: 0,
        INFO: 1,
        WARN: 2,
        ERROR: 3
    },

    // Initialize the logger
    init() {
        this.loadSettings();
        this.setupStorage();
    },

    // Load settings from localStorage
    loadSettings() {
        const savedSettings = localStorage.getItem('antiCheatLoggerSettings');
        if (savedSettings) {
            try {
                const settings = JSON.parse(savedSettings);
                this.enabled = settings.enabled !== undefined ? settings.enabled : true;
                this.logLevel = settings.logLevel || 'INFO';
            } catch (e) {
                console.warn('Failed to load anti-cheat logger settings', e);
            }
        }
    },

    // Save settings to localStorage
    saveSettings() {
        const settings = {
            enabled: this.enabled,
            logLevel: this.logLevel
        };
        localStorage.setItem('antiCheatLoggerSettings', JSON.stringify(settings));
    },

    // Setup persistent storage
    setupStorage() {
        // Load existing logs from localStorage
        const savedLogs = localStorage.getItem('antiCheatLogs');
        if (savedLogs) {
            try {
                this.logs = JSON.parse(savedLogs);
                // Trim to max logs
                if (this.logs.length > this.maxLogs) {
                    this.logs = this.logs.slice(-this.maxLogs);
                }
            } catch (e) {
                console.warn('Failed to load anti-cheat logs', e);
                this.logs = [];
            }
        }
    },

    // Save logs to localStorage
    saveLogs() {
        try {
            localStorage.setItem('antiCheatLogs', JSON.stringify(this.logs));
        } catch (e) {
            console.warn('Failed to save anti-cheat logs', e);
        }
    },

    // Check if a log level should be logged
    shouldLog(level) {
        if (!this.enabled) return false;
        return this.levels[level] >= this.levels[this.logLevel];
    },

    // Log a message
    log(level, category, message, data = null) {
        if (!this.shouldLog(level)) return;

        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            category,
            message,
            data
        };

        this.logs.push(logEntry);

        // Trim to max logs
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }

        // Save to localStorage
        this.saveLogs();

        // Only log to console for WARN and ERROR levels
        if (level === 'WARN' || level === 'ERROR') {
            const prefix = `[${timestamp}] [ANTI-CHEAT] [${level}] [${category}]`;
            if (data) {
                console.warn(`${prefix} ${message}`, data);
            } else {
                console.warn(`${prefix} ${message}`);
            }
        }
    },

    // Convenience methods for different log levels
    debug(category, message, data = null) {
        this.log('DEBUG', category, message, data);
    },

    info(category, message, data = null) {
        this.log('INFO', category, message, data);
    },

    warn(category, message, data = null) {
        this.log('WARN', category, message, data);
    },

    error(category, message, data = null) {
        this.log('ERROR', category, message, data);
    },

    // Get all logs
    getLogs() {
        return this.logs;
    },

    // Get logs by level
    getLogsByLevel(level) {
        return this.logs.filter(log => log.level === level);
    },

    // Get logs by category
    getLogsByCategory(category) {
        return this.logs.filter(log => log.category === category);
    },

    // Get recent logs
    getRecentLogs(count = 10) {
        return this.logs.slice(-count);
    },

    // Clear all logs
    clearLogs() {
        this.logs = [];
        this.saveLogs();
    },

    // Export logs to file
    exportLogs() {
        const data = JSON.stringify(this.logs, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `anti-cheat-logs-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    },

    // Enable/disable logging
    setEnabled(enabled) {
        this.enabled = enabled;
        this.saveSettings();
    },

    // Set log level
    setLogLevel(level) {
        if (this.levels[level] !== undefined) {
            this.logLevel = level;
            this.saveSettings();
        }
    }
};

// Initialize the logger
AntiCheatLogger.init();

// Make it available globally
window.AntiCheatLogger = AntiCheatLogger;
