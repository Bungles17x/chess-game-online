
// Password Reset Admin Dashboard for bungles17x
// This module provides live updates for password reset requests

// State management
let passwordResetRequests = [];
let currentAdminUser = null;
let autoRefreshInterval = null;
const REFRESH_INTERVAL = 5000; // 5 seconds

// DOM Elements
let resetRequestsContainer = null;
let statusFilter = 'all'; // all, pending, completed
let searchQuery = '';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  // Check if we're on the admin panel or password reset admin page
  if (document.querySelector('.admin-panel') || document.querySelector('.password-reset-admin') || document.querySelector('.admin-content')) {
    initializePasswordResetAdmin();
  }
});

// Initialize Password Reset Admin
function initializePasswordResetAdmin() {
  // Check if user is admin
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
  if (!currentUser || currentUser.username.toLowerCase() !== 'bungles17x') {
    showAccessDenied();
    return;
  }

  currentAdminUser = currentUser;

  // Create admin interface
  createPasswordResetAdminUI();

  // Load initial data
  loadPasswordResetRequests();

  // Start auto-refresh
  startAutoRefresh();

  // Setup event listeners
  setupEventListeners();
}

// Create Password Reset Admin UI
function createPasswordResetAdminUI() {
  const adminContainer = document.querySelector('.admin-panel') || document.querySelector('.password-reset-admin') || document.querySelector('.admin-content');
  if (!adminContainer) return;

  // Create password reset section
  const resetSection = document.createElement('div');
  resetSection.className = 'password-reset-admin-section';
  resetSection.innerHTML = `
    <div class="admin-section-header">
      <h2>Password Reset Requests</h2>
      <div class="admin-controls">
        <select id="reset-status-filter" class="admin-select">
          <option value="all">All Requests</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
        </select>
        <input type="text" id="reset-search" placeholder="Search requests..." class="admin-search">
        <button id="refresh-resets" class="admin-btn">Refresh</button>
      </div>
    </div>
    <div class="admin-stats">
      <div class="stat-card">
        <span class="stat-label">Total Requests</span>
        <span class="stat-value" id="total-resets">0</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Pending</span>
        <span class="stat-value" id="pending-resets">0</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Completed</span>
        <span class="stat-value" id="completed-resets">0</span>
      </div>
    </div>
    <div id="reset-requests-container" class="reset-requests-container">
      <div class="loading">Loading password reset requests...</div>
    </div>
  `;

  adminContainer.appendChild(resetSection);
  resetRequestsContainer = document.getElementById('reset-requests-container');
}

// Load Password Reset Requests
function loadPasswordResetRequests() {
  try {
    // Get all password reset requests from localStorage
    const requests = JSON.parse(localStorage.getItem('passwordResetRequests') || '[]');

    // Sort by timestamp (newest first)
    passwordResetRequests = requests.sort((a, b) => b.timestamp - a.timestamp);

    // Update UI
    updatePasswordResetUI();
    updateStats();
  } catch (error) {
    console.error('Error loading password reset requests:', error);
    showError('Failed to load password reset requests');
  }
}

// Update Password Reset UI
function updatePasswordResetUI() {
  if (!resetRequestsContainer) return;

  // Filter requests
  let filteredRequests = passwordResetRequests.filter(request => {
    if (statusFilter !== 'all' && request.status !== statusFilter) {
      return false;
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        request.email.toLowerCase().includes(query) ||
        request.phone.includes(query) ||
        request.username.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Clear container
  resetRequestsContainer.innerHTML = '';

  // Show message if no requests
  if (filteredRequests.length === 0) {
    resetRequestsContainer.innerHTML = `
      <div class="no-requests">
        <p>No password reset requests found</p>
      </div>
    `;
    return;
  }

  // Render requests
  filteredRequests.forEach(request => {
    const requestElement = createRequestElement(request);
    resetRequestsContainer.appendChild(requestElement);
  });
}

// Create Request Element
function createRequestElement(request) {
  const element = document.createElement('div');
  element.className = `reset-request-card ${request.status}`;
  element.innerHTML = `
    <div class="request-header">
      <div class="request-info">
        <h3>${request.username || 'Unknown'}</h3>
        <span class="request-status ${request.status}">${request.status}</span>
      </div>
      <div class="request-time">${formatTimestamp(request.timestamp)}</div>
    </div>
    <div class="request-details">
      <div class="detail-item">
        <span class="detail-label">Email:</span>
        <span class="detail-value">${request.email}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Phone:</span>
        <span class="detail-value">${request.phone}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Code:</span>
        <span class="detail-value">${request.verificationCode}</span>
      </div>
    </div>
    <div class="request-actions">
      ${request.status === 'pending' ? `
        <button class="admin-btn approve" data-action="approve" data-email="${request.email}">Approve</button>
        <button class="admin-btn reject" data-action="reject" data-email="${request.email}">Reject</button>
      ` : `
        <button class="admin-btn view" data-action="view" data-email="${request.email}">View Details</button>
      `}
    </div>
  `;

  return element;
}

// Update Stats
function updateStats() {
  const total = passwordResetRequests.length;
  const pending = passwordResetRequests.filter(r => r.status === 'pending').length;
  const completed = passwordResetRequests.filter(r => r.status === 'completed').length;

  document.getElementById('total-resets').textContent = total;
  document.getElementById('pending-resets').textContent = pending;
  document.getElementById('completed-resets').textContent = completed;
}

// Setup Event Listeners
function setupEventListeners() {
  // Status filter
  const statusFilterSelect = document.getElementById('reset-status-filter');
  if (statusFilterSelect) {
    statusFilterSelect.addEventListener('change', (e) => {
      statusFilter = e.target.value;
      updatePasswordResetUI();
    });
  }

  // Search
  const searchInput = document.getElementById('reset-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      updatePasswordResetUI();
    });
  }

  // Refresh button
  const refreshButton = document.getElementById('refresh-resets');
  if (refreshButton) {
    refreshButton.addEventListener('click', () => {
      loadPasswordResetRequests();
      showNotification('Password reset requests refreshed');
    });
  }

  // Request actions (event delegation)
  if (resetRequestsContainer) {
    resetRequestsContainer.addEventListener('click', (e) => {
      const action = e.target.dataset.action;
      const email = e.target.dataset.email;

      if (action && email) {
        handleRequestAction(action, email);
      }
    });
  }
}

// Handle Request Action
function handleRequestAction(action, email) {
  const request = passwordResetRequests.find(r => r.email === email);
  if (!request) return;

  switch (action) {
    case 'approve':
      approvePasswordReset(request);
      break;
    case 'reject':
      rejectPasswordReset(request);
      break;
    case 'view':
      viewRequestDetails(request);
      break;
  }
}

// Approve Password Reset
function approvePasswordReset(request) {
  request.status = 'completed';
  request.completedAt = Date.now();
  request.completedBy = currentAdminUser.username;

  updatePasswordResetRequest(request);
  loadPasswordResetRequests();
  showNotification(`Password reset approved for ${request.email}`);
}

// Reject Password Reset
function rejectPasswordReset(request) {
  if (!confirm('Are you sure you want to reject this password reset request?')) {
    return;
  }

  // Remove the request
  passwordResetRequests = passwordResetRequests.filter(r => r.email !== request.email);
  localStorage.setItem('passwordResetRequests', JSON.stringify(passwordResetRequests));

  loadPasswordResetRequests();
  showNotification(`Password reset rejected for ${request.email}`);
}

// View Request Details
function viewRequestDetails(request) {
  const details = `
    Username: ${request.username}
    Email: ${request.email}
    Phone: ${request.phone}
    Verification Code: ${request.verificationCode}
    Status: ${request.status}
    Requested: ${formatTimestamp(request.timestamp)}
    ${request.completedAt ? `Completed: ${formatTimestamp(request.completedAt)}` : ''}
    ${request.completedBy ? `Completed By: ${request.completedBy}` : ''}
  `;

  alert(details);
}

// Update Password Reset Request
function updatePasswordResetRequest(updatedRequest) {
  const index = passwordResetRequests.findIndex(r => r.email === updatedRequest.email);
  if (index !== -1) {
    passwordResetRequests[index] = updatedRequest;
    localStorage.setItem('passwordResetRequests', JSON.stringify(passwordResetRequests));
  }
}

// Start Auto Refresh
function startAutoRefresh() {
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
  }

  autoRefreshInterval = setInterval(() => {
    loadPasswordResetRequests();
  }, REFRESH_INTERVAL);
}

// Stop Auto Refresh
function stopAutoRefresh() {
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
    autoRefreshInterval = null;
  }
}

// Format Timestamp
function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleString();
}

// Show Access Denied
function showAccessDenied() {
  const adminContainer = document.querySelector('.admin-panel') || document.querySelector('.password-reset-admin');
  if (adminContainer) {
    adminContainer.innerHTML = `
      <div class="access-denied">
        <h2>Access Denied</h2>
        <p>You don't have permission to access the password reset admin panel.</p>
      </div>
    `;
  }
}

// Show Notification
function showNotification(message) {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = 'admin-notification';
  notification.textContent = message;

  // Add to page
  document.body.appendChild(notification);

  // Remove after 3 seconds
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// Show Error
function showError(message) {
  console.error(message);
  showNotification(message);
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initializePasswordResetAdmin,
    loadPasswordResetRequests,
    updatePasswordResetUI,
    stopAutoRefresh
  };
}
