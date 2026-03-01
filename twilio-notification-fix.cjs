// Twilio Notification Fix for Reports
// Adds SMS notification system using Twilio to server.cjs

const fs = require('fs');
const path = require('path');

console.log('[Twilio Notification Fix] Starting...');

// Read server.cjs
const serverPath = path.join(__dirname, 'server.cjs');
let serverContent = fs.readFileSync(serverPath, 'utf8');

// Check if twilio is already imported
if (!serverContent.includes("const twilio = require('twilio')")) {
  // Add twilio import after other requires
  const requiresSection = serverContent.match(/const\s+\w+\s*=\s*require\(['"][^'"]+['"]\)/g);
  if (requiresSection && requiresSection.length > 0) {
    const lastRequire = requiresSection[requiresSection.length - 1];
    const insertPoint = serverContent.indexOf(lastRequire) + lastRequire.length;
    const twilioImport = `
const twilio = require('twilio');

// Twilio configuration
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || '+18146878744';
const ADMIN_PHONE_NUMBER = process.env.ADMIN_PHONE_NUMBER || '+18143862290';
`;
    serverContent = serverContent.slice(0, insertPoint) + twilioImport + serverContent.slice(insertPoint);
    console.log('[Twilio Notification Fix] Added twilio import and configuration');
  }
}

// Find and update the handleReport function to include Twilio SMS notification
const oldReportNotification = `    // Send notification to admin (simplified version)
    console.log("Report created:", reportId, reportData);
    notificationSystem.sendReportNotification({
      id: reportId,
      type: reportData.reportType,
      reportedBy: reportData.reportedBy,
      roomId: reportData.roomId,
      reason: reportData.reason
    }).then(result => {
      console.log("Report notification sent:", result);
    }).catch(error => {
      console.error("Error sending report notification:", error);
    });`;

const newReportNotification = `    // Send notification to admin (simplified version)
    console.log("Report created:", reportId, reportData);

    // Send SMS notification via Twilio
    try {
      const message = \`🚨 NEW REPORT 🚨
ID: \${reportId}
Type: \${reportData.reportType}
Reporter: \${reportData.reportedBy}
Opponent: \${reportData.opponent}
Room: \${reportData.roomId}
Reason: \${reportData.reason}
\${reportData.description ? 'Desc: ' + reportData.description.substring(0, 100) : ''}\`;

      twilioClient.messages.create({
        body: message,
        from: TWILIO_PHONE_NUMBER,
        to: ADMIN_PHONE_NUMBER
      }).then(message => {
        console.log("SMS sent successfully. SID:", message.sid);
      }).catch(error => {
        console.error("Error sending SMS:", error);
      });
    } catch (error) {
      console.error("Error in SMS notification setup:", error);
    }

    notificationSystem.sendReportNotification({
      id: reportId,
      type: reportData.reportType,
      reportedBy: reportData.reportedBy,
      roomId: reportData.roomId,
      reason: reportData.reason
    }).then(result => {
      console.log("Report notification sent:", result);
    }).catch(error => {
      console.error("Error sending report notification:", error);
    });`;

if (serverContent.includes(oldReportNotification)) {
  serverContent = serverContent.replace(oldReportNotification, newReportNotification);
  console.log('[Twilio Notification Fix] Updated handleReport with Twilio SMS notification');
} else {
  console.log('[Twilio Notification Fix] handleReport notification section not found or already updated');
}

// Write the updated content back to server.cjs
fs.writeFileSync(serverPath, serverContent, 'utf8');

console.log('[Twilio Notification Fix] Complete!');
console.log('[Twilio Notification Fix] Please restart your server for changes to take effect');
console.log('[Twilio Notification Fix] Make sure these environment variables are set:');
console.log('  - TWILIO_ACCOUNT_SID');
console.log('  - TWILIO_AUTH_TOKEN');
console.log('  - TWILIO_PHONE_NUMBER');
console.log('  - ADMIN_PHONE_NUMBER');
