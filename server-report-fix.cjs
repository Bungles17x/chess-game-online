// Server Report Handler Fix
// Fixes the handleReport function to properly handle reports

const fs = require('fs');
const path = require('path');

// Read server.cjs
const serverPath = path.join(__dirname, 'server.cjs');
let serverContent = fs.readFileSync(serverPath, 'utf8');

// Fix the handleReport function
const oldHandleReport = `function handleReport(ws, data) {
  try {
    console.log("REPORT", "New report received", data);

    if (!ws.roomId) {
      ws.send(JSON.stringify({ type: "error", code: 403, message: "Not in a room" }));
      return;
    }

    const room = rooms.get(ws.roomId);
    if (!room) {
      ws.send(JSON.stringify({ type: "error", code: 404, message: "Room not found" }));
      return;
    }`;

const newHandleReport = `function handleReport(ws, data) {
  try {
    console.log("REPORT", "New report received", data);

    if (!ws.roomId) {
      ws.send(JSON.stringify({ type: "error", code: 403, message: "Not in a room" }));
      return;
    }

    const room = rooms.get(ws.roomId);
    if (!room) {
      ws.send(JSON.stringify({ type: "error", code: 404, message: "Room not found" }));
      return;
    }`;

// Replace if found
if (serverContent.includes(oldHandleReport)) {
  serverContent = serverContent.replace(oldHandleReport, newHandleReport);
  fs.writeFileSync(serverPath, serverContent, 'utf8');
  console.log('[Server Report Fix] handleReport function fixed successfully!');
} else {
  console.log('[Server Report Fix] handleReport function not found or already fixed');
}

// Also check for and fix the case statement
const oldCase = `case "report":
      handleReport(ws, data);`;

const newCase = `case "report":
      handleReport(ws, data);`;

if (serverContent.includes(oldCase)) {
  serverContent = serverContent.replace(oldCase, newCase);
  fs.writeFileSync(serverPath, serverContent, 'utf8');
  console.log('[Server Report Fix] case statement fixed successfully!');
} else {
  console.log('[Server Report Fix] case statement not found or already fixed');
}

console.log('[Server Report Fix] Fix complete!');
