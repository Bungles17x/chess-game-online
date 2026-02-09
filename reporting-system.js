// reporting-system.js
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Configuration
const REPORTS_DIR = path.join(__dirname, 'reports');
const GAME_REPLAYS_DIR = path.join(__dirname, 'game-replays');

// Create necessary directories if they don't exist
function initializeDirectories() {
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }
  if (!fs.existsSync(GAME_REPLAYS_DIR)) {
    fs.mkdirSync(GAME_REPLAYS_DIR, { recursive: true });
  }
}

// Store reports in memory
const reports = new Map();

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
    const reportId = uuidv4();
    const report = {
      id: reportId,
      timestamp: new Date().toISOString(),
      status: 'pending',
      ...reportData
    };

    // Save report to file
    const reportPath = path.join(REPORTS_DIR, `${reportId}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Store in memory
    reports.set(reportId, report);

    console.log('Report created:', reportId);
    return reportId;
  } catch (error) {
    console.error('Error creating report:', error);
    throw error;
  }
}

// Get all reports
function getAllReports() {
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

    return reportsList.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
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

// Initialize the reporting system
initializeDirectories();

module.exports = {
  saveGameReplay,
  createReport,
  getAllReports,
  getReportById,
  updateReportStatus,
  getGameReplay
};
