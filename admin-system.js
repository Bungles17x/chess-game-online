// Admin System for bungles17x and 674121bruh
// This file contains all admin-specific functionality

// Admin configuration
const ADMIN_CONFIG = {
  admins: ['bungles17x', '674121bruh'],
  powers: {
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
  }
};

// Check if user is admin
function isAdmin(username) {
  if (!username) return false;
  return ADMIN_CONFIG.admins.some(admin => 
    admin.toLowerCase() === username.toLowerCase()
  );
}

// Check if user has specific power
function hasAdminPower(username, power) {
  if (!isAdmin(username)) return false;
  return ADMIN_CONFIG.powers[power] === true;
}

// Get all admin powers for a user
function getAdminPowers(username) {
  if (!isAdmin(username)) return {};
  return { ...ADMIN_CONFIG.powers };
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
