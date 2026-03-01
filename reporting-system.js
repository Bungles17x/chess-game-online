// reporting-system.js
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Configuration
const REPORTS_DIR = path.join(__dirname, 'reports');
const GAME_REPLAYS_DIR = path.join(__dirname, 'game-replays');
const ARCHIVED_REPORTS_DIR = path.join(__dirname, 'reports', 'archived');
const MAX_REPLAY_AGE_DAYS = 30; // Archive replays older than 30 days
const MAX_REPORTS_PER_USER = 100; // Limit reports per user per day

// Debug mode
let DEBUG_MODE = process.env.REPORT_DEBUG === 'true' || false;

// Debug logging function
function debugLog(category, message, data = null) {
  if (!DEBUG_MODE) return;

  const timestamp = new Date().toISOString();
  const prefix = `[REPORT DEBUG ${category}] ${timestamp}`;

  if (data) {
    console.log(`${prefix}: ${message}`, data);
  } else {
    console.log(`${prefix}: ${message}`);
  }
}

// Enable/disable debug mode
function setDebugMode(enabled) {
  DEBUG_MODE = enabled;
  debugLog('SYSTEM', `Debug mode ${enabled ? 'ENABLED' : 'DISABLED'}`);
}

// Get debug status
function isDebugEnabled() {
  return DEBUG_MODE;
}

// Track report submissions per user
const userReportCounts = new Map();

// Create necessary directories if they don't exist
function initializeDirectories() {
  debugLog('INIT', 'Initializing report directories');

  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
    debugLog('INIT', `Created reports directory: ${REPORTS_DIR}`);
  }

  if (!fs.existsSync(GAME_REPLAYS_DIR)) {
    fs.mkdirSync(GAME_REPLAYS_DIR, { recursive: true });
    debugLog('INIT', `Created game replays directory: ${GAME_REPLAYS_DIR}`);
  }

  if (!fs.existsSync(ARCHIVED_REPORTS_DIR)) {
    fs.mkdirSync(ARCHIVED_REPORTS_DIR, { recursive: true });
    debugLog('INIT', `Created archived reports directory: ${ARCHIVED_REPORTS_DIR}`);
  }

  debugLog('INIT', 'All directories initialized successfully');
}

// Store reports in memory
const reports = new Map();

// Check if user has exceeded report limit
function checkUserReportLimit(username) {
  const now = Date.now();
  const dayStart = Math.floor(now / 86400000) * 86400000;
  
  if (!userReportCounts.has(username)) {
    userReportCounts.set(username, { count: 0, day: dayStart });
    return false;
  }
  
  const userData = userReportCounts.get(username);
  
  // Reset count if it's a new day
  if (userData.day !== dayStart) {
    userData.count = 0;
    userData.day = dayStart;
  }
  
  return userData.count >= MAX_REPORTS_PER_USER;
}

// Increment user report count
function incrementUserReportCount(username) {
  const now = Date.now();
  const dayStart = Math.floor(now / 86400000) * 86400000;
  
  if (!userReportCounts.has(username)) {
    userReportCounts.set(username, { count: 1, day: dayStart });
    return;
  }
  
  const userData = userReportCounts.get(username);
  
  // Reset count if it's a new day
  if (userData.day !== dayStart) {
    userData.count = 0;
    userData.day = dayStart;
  }
  
  userData.count++;
}

// Archive old reports
function archiveOldReports() {
  try {
    const now = Date.now();
    const maxAge = MAX_REPLAY_AGE_DAYS * 86400000;
    
    const files = fs.readdirSync(REPORTS_DIR);
    let archivedCount = 0;
    
    files.forEach(file => {
      if (file.endsWith('.json')) {
        const filePath = path.join(REPORTS_DIR, file);
        const stats = fs.statSync(filePath);
        
        if (now - stats.mtimeMs > maxAge) {
          const archivePath = path.join(ARCHIVED_REPORTS_DIR, file);
          fs.renameSync(filePath, archivePath);
          archivedCount++;
        }
      }
    });
    
    console.log(`Archived ${archivedCount} old reports`);
    return archivedCount;
  } catch (error) {
    console.error('Error archiving reports:', error);
    return 0;
  }
}

// Save game replay
function saveGameReplay(roomId, gameData) {
  try {
    const replayId = uuidv4();
    const replayPath = path.join(GAME_REPLAYS_DIR, `${replayId}.json`);

    const replayData = {
      id: replayId,
      roomId: roomId,
      timestamp: new Date().toISOString(),
      gameData: gameData
    };

    fs.writeFileSync(replayPath, JSON.stringify(replayData, null, 2));
    console.log('Game replay saved:', replayId);
    return replayId;
  } catch (error) {
    console.error('Error saving game replay:', error);
    throw error;
  }
}

// Create a new report
function createReport(reportData) {
  try {
    // Check user report limit
    if (reportData.reportedBy && checkUserReportLimit(reportData.reportedBy)) {
      throw new Error(`User ${reportData.reportedBy} has exceeded daily report limit`);
    }
    
    const reportId = uuidv4();
    const report = {
      id: reportId,
      timestamp: new Date().toISOString(),
      status: 'pending',
      priority: 'normal', // normal, high, critical
      reviewed: false,
      reviewedBy: null,
      reviewedAt: null,
      resolution: null,
      ...reportData
    };

    // Save report to file
    const reportPath = path.join(REPORTS_DIR, `${reportId}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Store in memory
    reports.set(reportId, report);
    
    // Increment user report count
    if (reportData.reportedBy) {
      incrementUserReportCount(reportData.reportedBy);
    }

    console.log('Report created:', reportId);
    return reportId;
  } catch (error) {
    console.error('Error creating report:', error);
    throw error;
  }
}

// Get all reports
function getAllReports(filters = {}) {
  try {
    const reportsList = [];
    const files = fs.readdirSync(REPORTS_DIR);

    files.forEach(file => {
      if (file.endsWith('.json')) {
        const filePath = path.join(REPORTS_DIR, file);
        const reportData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        reportsList.push(reportData);
      }
    });

    let filteredReports = reportsList.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Apply filters if provided
    if (filters.status) {
      filteredReports = filteredReports.filter(r => r.status === filters.status);
    }
    if (filters.type) {
      filteredReports = filteredReports.filter(r => r.reportType === filters.type);
    }
    if (filters.priority) {
      filteredReports = filteredReports.filter(r => r.priority === filters.priority);
    }
    if (filters.reportedBy) {
      filteredReports = filteredReports.filter(r => r.reportedBy === filters.reportedBy);
    }
    if (filters.startDate) {
      filteredReports = filteredReports.filter(r => new Date(r.timestamp) >= new Date(filters.startDate));
    }
    if (filters.endDate) {
      filteredReports = filteredReports.filter(r => new Date(r.timestamp) <= new Date(filters.endDate));
    }
    
    return filteredReports;
  } catch (error) {
    console.error('Error getting reports:', error);
    return [];
  }
}

// Get report by ID
function getReportById(reportId) {
  try {
    const reportPath = path.join(REPORTS_DIR, `${reportId}.json`);
    if (fs.existsSync(reportPath)) {
      return JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    }
    return null;
  } catch (error) {
    console.error('Error getting report:', error);
    return null;
  }
}

// Update report status
function updateReportStatus(reportId, status) {
  try {
    const report = getReportById(reportId);
    if (report) {
      report.status = status;
      report.updatedAt = new Date().toISOString();

      const reportPath = path.join(REPORTS_DIR, `${reportId}.json`);
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

      reports.set(reportId, report);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error updating report status:', error);
    return false;
  }
}

// Update report priority
function updateReportPriority(reportId, priority) {
  try {
    const report = getReportById(reportId);
    if (report) {
      if (!['normal', 'high', 'critical'].includes(priority)) {
        throw new Error('Invalid priority level');
      }
      report.priority = priority;
      report.updatedAt = new Date().toISOString();

      const reportPath = path.join(REPORTS_DIR, `${reportId}.json`);
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

      reports.set(reportId, report);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error updating report priority:', error);
    return false;
  }
}

// Mark report as reviewed
function markReportAsReviewed(reportId, reviewedBy, resolution = null) {
  try {
    const report = getReportById(reportId);
    if (report) {
      report.reviewed = true;
      report.reviewedBy = reviewedBy;
      report.reviewedAt = new Date().toISOString();
      report.resolution = resolution;
      report.updatedAt = new Date().toISOString();

      const reportPath = path.join(REPORTS_DIR, `${reportId}.json`);
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

      reports.set(reportId, report);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error marking report as reviewed:', error);
    return false;
  }
}

// Get game replay by ID
function getGameReplay(replayId) {
  try {
    const replayPath = path.join(GAME_REPLAYS_DIR, `${replayId}.json`);
    if (fs.existsSync(replayPath)) {
      return JSON.parse(fs.readFileSync(replayPath, 'utf8'));
    }
    return null;
  } catch (error) {
    console.error('Error getting game replay:', error);
    return null;
  }
}

// Delete report
function deleteReport(reportId) {
  try {
    const reportPath = path.join(REPORTS_DIR, `${reportId}.json`);
    if (fs.existsSync(reportPath)) {
      // Archive instead of delete
      const archivePath = path.join(ARCHIVED_REPORTS_DIR, `deleted-${reportId}.json`);
      fs.renameSync(reportPath, archivePath);

      // Remove from memory
      reports.delete(reportId);

      console.log('Report deleted:', reportId);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting report:', error);
    return false;
  }
}

// Get report statistics
function getReportStatistics() {
  try {
    const allReports = getAllReports();

    const stats = {
      total: allReports.length,
      byStatus: {},
      byType: {},
      byPriority: {},
      reviewed: 0,
      pending: 0
    };

    allReports.forEach(report => {
      // Count by status
      if (!stats.byStatus[report.status]) {
        stats.byStatus[report.status] = 0;
      }
      stats.byStatus[report.status]++;

      // Count by type
      if (!stats.byType[report.reportType]) {
        stats.byType[report.reportType] = 0;
      }
      stats.byType[report.reportType]++;

      // Count by priority
      if (!stats.byPriority[report.priority]) {
        stats.byPriority[report.priority] = 0;
      }
      stats.byPriority[report.priority]++;

      // Count reviewed vs pending
      if (report.reviewed) {
        stats.reviewed++;
      } else {
        stats.pending++;
      }
    });

    return stats;
  } catch (error) {
    console.error('Error getting report statistics:', error);
    return null;
  }
}

// Get reports by user
function getReportsByUser(username) {
  try {
    const allReports = getAllReports();
    return allReports.filter(r => r.reportedBy === username);
  } catch (error) {
    console.error('Error getting reports by user:', error);
    return [];
  }
}

// Get reports about user
function getReportsAboutUser(username) {
  try {
    const allReports = getAllReports();
    return allReports.filter(r => r.opponent === username);
  } catch (error) {
    console.error('Error getting reports about user:', error);
    return [];
  }
}

// Add note to report
function addReportNote(reportId, note, addedBy) {
  try {
    const report = getReportById(reportId);
    if (report) {
      if (!report.notes) {
        report.notes = [];
      }

      report.notes.push({
        text: note,
        addedBy: addedBy,
        addedAt: new Date().toISOString()
      });

      report.updatedAt = new Date().toISOString();

      const reportPath = path.join(REPORTS_DIR, `${reportId}.json`);
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

      reports.set(reportId, report);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error adding note to report:', error);
    return false;
  }
}

// Get report notes
function getReportNotes(reportId) {
  try {
    const report = getReportById(reportId);
    if (report && report.notes) {
      return report.notes;
    }
    return [];
  } catch (error) {
    console.error('Error getting report notes:', error);
    return [];
  }
}

// Search reports
function searchReports(query) {
  try {
    const allReports = getAllReports();
    const queryLower = query.toLowerCase();

    return allReports.filter(report => {
      return (
        report.reportedBy?.toLowerCase().includes(queryLower) ||
        report.opponent?.toLowerCase().includes(queryLower) ||
        report.reason?.toLowerCase().includes(queryLower) ||
        report.description?.toLowerCase().includes(queryLower) ||
        report.id?.toLowerCase().includes(queryLower)
      );
    });
  } catch (error) {
    console.error('Error searching reports:', error);
    return [];
  }
}

// Initialize the reporting system
initializeDirectories();

module.exports = {
  saveGameReplay,
  createReport,
  getAllReports,
  getReportById,
  updateReportStatus,
  updateReportPriority,
  markReportAsReviewed,
  getGameReplay,
  archiveOldReports,
  checkUserReportLimit,
  deleteReport,
  getReportStatistics,
  getReportsByUser,
  getReportsAboutUser,
  addReportNote,
  getReportNotes,
  searchReports
};
