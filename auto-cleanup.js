/**
 * Auto Cleanup System
 * Automatically detects unnecessary files and prompts for deletion
 */

const AutoCleanup = {
  // Configuration
  config: {
    detectDuplicates: true,
    detectEmptyFiles: true,
    detectTempFiles: true,
    detectOldBackups: true,
    minFileSize: 0, // bytes
    maxAge: 30, // days for temp files
  },

  // Detection results
  results: {
    duplicates: [],
    emptyFiles: [],
    tempFiles: [],
    oldBackups: [],
    totalSize: 0
  },

  /**
   * Initialize auto cleanup
   */
  async init() {
    console.log('[Auto Cleanup] Initializing...');
    await this.detectUnnecessaryFiles();
    this.displayResults();
  },

  /**
   * Detect all unnecessary files
   */
  async detectUnnecessaryFiles() {
    console.log('[Auto Cleanup] Scanning for unnecessary files...');

    if (this.config.detectDuplicates) {
      await this.detectDuplicates();
    }

    if (this.config.detectEmptyFiles) {
      await this.detectEmptyFiles();
    }

    if (this.config.detectTempFiles) {
      await this.detectTempFiles();
    }

    if (this.config.detectOldBackups) {
      await this.detectOldBackups();
    }

    this.calculateTotalSize();
  },

  /**
   * Detect duplicate files
   */
  async detectDuplicates() {
    const patterns = [
      /-enhanced\.js$/,
      /-fixed\.js$/,
      /-new\.js$/,
      /-v\d+\.js$/,
      /-working\.js$/,
      /-complete\.js$/,
      /-backup\.js$/,
    ];

    const files = await this.getFiles();
    const groups = {};

    files.forEach(file => {
      const baseName = file.name.replace(patterns[0], '')
        .replace(patterns[1], '')
        .replace(patterns[2], '')
        .replace(patterns[3], '')
        .replace(patterns[4], '')
        .replace(patterns[5], '')
        .replace(patterns[6], '');

      if (!groups[baseName]) {
        groups[baseName] = [];
      }
      groups[baseName].push(file);
    });

    Object.entries(groups).forEach(([baseName, files]) => {
      if (files.length > 1) {
        // Keep the most recent file, mark others as duplicates
        files.sort((a, b) => b.modified - a.modified);
        const [keep, ...duplicates] = files;

        duplicates.forEach(file => {
          this.results.duplicates.push({
            name: file.name,
            path: file.path,
            size: file.size,
            modified: file.modified,
            reason: `Duplicate of ${keep.name}`,
            keepFile: keep.name
          });
        });
      }
    });
  },

  /**
   * Detect empty files
   */
  async detectEmptyFiles() {
    const files = await this.getFiles();

    files.forEach(file => {
      if (file.size <= this.config.minFileSize) {
        this.results.emptyFiles.push({
          name: file.name,
          path: file.path,
          size: file.size,
          modified: file.modified,
          reason: 'Empty or very small file'
        });
      }
    });
  },

  /**
   * Detect temporary files
   */
  async detectTempFiles() {
    const tempPatterns = [
      /temp/i,
      /tmp/i,
      /backup/i,
      /old/i,
      /test/i,
      /debug/i,
      /-fix\.js$/,
      /-patch\.js$/,
    ];

    const files = await this.getFiles();
    const now = Date.now();
    const maxAge = this.config.maxAge * 24 * 60 * 60 * 1000;

    files.forEach(file => {
      const isTemp = tempPatterns.some(pattern => pattern.test(file.name));
      const age = now - file.modified;

      if (isTemp && age > maxAge) {
        this.results.tempFiles.push({
          name: file.name,
          path: file.path,
          size: file.size,
          modified: file.modified,
          age: Math.round(age / (24 * 60 * 60 * 1000)),
          reason: 'Temporary file older than ' + this.config.maxAge + ' days'
        });
      }
    });
  },

  /**
   * Detect old backup files
   */
  async detectOldBackups() {
    const backupPatterns = [
      /-backup\d*\.js$/,
      /-old\d*\.js$/,
      /-v\d+\.js$/,
      /\.bak$/,
    ];

    const files = await this.getFiles();
    const now = Date.now();
    const maxAge = this.config.maxAge * 24 * 60 * 60 * 1000;

    files.forEach(file => {
      const isBackup = backupPatterns.some(pattern => pattern.test(file.name));
      const age = now - file.modified;

      if (isBackup && age > maxAge) {
        this.results.oldBackups.push({
          name: file.name,
          path: file.path,
          size: file.size,
          modified: file.modified,
          age: Math.round(age / (24 * 60 * 60 * 1000)),
          reason: 'Old backup file'
        });
      }
    });
  },

  /**
   * Get all files in the workspace
   */
  async getFiles() {
    // This is a placeholder - in a real implementation, you'd use the file system API
    // For now, we'll return an empty array
    return [];
  },

  /**
   * Calculate total size of files to be deleted
   */
  calculateTotalSize() {
    this.results.totalSize = 0;

    [...this.results.duplicates, 
     ...this.results.emptyFiles, 
     ...this.results.tempFiles, 
     ...this.results.oldBackups].forEach(file => {
      this.results.totalSize += file.size;
    });
  },

  /**
   * Display detection results
   */
  displayResults() {
    const totalFiles = this.results.duplicates.length + 
                      this.results.emptyFiles.length + 
                      this.results.tempFiles.length + 
                      this.results.oldBackups.length;

    if (totalFiles === 0) {
      console.log('[Auto Cleanup] No unnecessary files found!');
      return;
    }

    console.log('[Auto Cleanup] Detection Results:');
    console.log('==============================');
    console.log(`Total files found: ${totalFiles}`);
    console.log(`Total size: ${this.formatSize(this.results.totalSize)}`);
    console.log('');

    if (this.results.duplicates.length > 0) {
      console.log(`Duplicates (${this.results.duplicates.length}):`);
      this.results.duplicates.forEach(file => {
        console.log(`  - ${file.name} (${this.formatSize(file.size)}) - ${file.reason}`);
      });
      console.log('');
    }

    if (this.results.emptyFiles.length > 0) {
      console.log(`Empty Files (${this.results.emptyFiles.length}):`);
      this.results.emptyFiles.forEach(file => {
        console.log(`  - ${file.name} (${this.formatSize(file.size)}) - ${file.reason}`);
      });
      console.log('');
    }

    if (this.results.tempFiles.length > 0) {
      console.log(`Temporary Files (${this.results.tempFiles.length}):`);
      this.results.tempFiles.forEach(file => {
        console.log(`  - ${file.name} (${this.formatSize(file.size)}) - ${file.reason}`);
      });
      console.log('');
    }

    if (this.results.oldBackups.length > 0) {
      console.log(`Old Backups (${this.results.oldBackups.length}):`);
      this.results.oldBackups.forEach(file => {
        console.log(`  - ${file.name} (${this.formatSize(file.size)}) - ${file.reason}`);
      });
      console.log('');
    }

    this.promptForAction();
  },

  /**
   * Prompt user for action
   */
  promptForAction() {
    console.log('[Auto Cleanup] What would you like to do?');
    console.log('1. Delete all unnecessary files');
    console.log('2. Delete only duplicates');
    console.log('3. Delete only empty files');
    console.log('4. Delete only temporary files');
    console.log('5. Delete only old backups');
    console.log('6. Review files individually');
    console.log('7. Cancel');
    console.log('');
    console.log('Please enter your choice (1-7):');

    // In a real implementation, you'd wait for user input
    // For now, we'll just log the prompt
  },

  /**
   * Format file size for display
   */
  formatSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  },

  /**
   * Get cleanup status
   * @returns {Object} Cleanup status
   */
  getStatus() {
    return {
      duplicates: this.results.duplicates.length,
      emptyFiles: this.results.emptyFiles.length,
      tempFiles: this.results.tempFiles.length,
      oldBackups: this.results.oldBackups.length,
      totalSize: this.results.totalSize,
      timestamp: new Date().toISOString()
    };
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AutoCleanup;
}

// Make available globally
window.AutoCleanup = AutoCleanup;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => AutoCleanup.init());
} else {
  AutoCleanup.init();
}
