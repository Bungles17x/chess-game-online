// This is the corrected code for the authentication ban check in server.cjs
// Replace lines 801-811 in server.cjs with this code

  // Check if username is banned
  const banInfo = bannedUsers.get(username.toLowerCase());
  if (banInfo) {
    console.log("AUTH", "Banned user attempted to connect", { username });

    // Calculate expiration time
    const expiresAt = banInfo.bannedAt + (banInfo.duration * (banInfo.unit === 'days' ? 86400000 : banInfo.unit === 'hours' ? 3600000 : 60000));

    ws.send(JSON.stringify({
      type: "error",
      code: 403,
      message: "Your account has been banned",
      reason: banInfo.reason,
      duration: banInfo.duration,
      unit: banInfo.unit,
      bannedAt: banInfo.bannedAt,
      expiresAt: expiresAt
    }));
    ws.close();
    return;
  }
