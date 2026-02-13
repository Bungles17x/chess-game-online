// Admin System for bungles17x and 674121bruh
// This file contains all admin-specific functionality

// Admin configurations
const ADMIN_CONFIG = {
  bungles17x: {
    // User Management
    canBanUsers: true,
    canUnbanUsers: true,
    canKickUsers: true,
    canViewUserInfo: true,
    canEditUserInfo: true,

    // Game Management
    canResetGames: true,
    canKillPieces: true,
    canViewAllGames: true,
    canJoinAnyGame: true,
    canControlAnyGame: true,

    // Chat Management
    canMuteUsers: true,
    canDeleteMessages: true,
    canModerateChat: true,

    // System Management
    canViewReports: true,
    canManageReports: true,
    canViewSystemLogs: true,
    canRestartServer: true,

    // Special Powers
    canBypassAntiCheat: true,
    canMakeUnlimitedMoves: true,
    canViewHiddenInfo: true,
    canExecuteCommands: true
  },
  '674121bruh': {
    // User Management
    canKickUsers: true,
    canViewUserInfo: true,
    canEditUserInfo: true,

    // Game Management
    canResetGames: true,
    canKillPieces: true,
    canViewAllGames: true,
    canJoinAnyGame: true,
    canControlAnyGame: true,

    // Chat Management
    canMuteUsers: true,
    canDeleteMessages: true,
    canModerateChat: true,

    // System Management
    canViewReports: true,
    canManageReports: true,
    canViewSystemLogs: true,
    canRestartServer: true,

    // Special Powers
    canBypassAntiCheat: true,
    canMakeUnlimitedMoves: true,
    canViewHiddenInfo: true,
    canExecuteCommands: true
  }
};

// Check if user is admin
function isAdmin(username) {
  if (!username) return false;
  const usernameLower = username.toLowerCase();
  return usernameLower === 'bungles17x' || usernameLower === '674121bruh';
}

// Check if user has specific power
function hasAdminPower(username, power) {
  if (!username) return false;
  const usernameLower = username.toLowerCase();
  const adminConfig = ADMIN_CONFIG[usernameLower];
  if (!adminConfig) return false;
  return adminConfig[power] === true;
}

// Get all admin powers for a user
function getAdminPowers(username) {
  if (!username) return {};
  const usernameLower = username.toLowerCase();
  const adminConfig = ADMIN_CONFIG[usernameLower];
  if (!adminConfig) return {};
  return { ...adminConfig };
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ADMIN_CONFIG,
    isAdmin,
    hasAdminPower,
    getAdminPowers
  };
}
