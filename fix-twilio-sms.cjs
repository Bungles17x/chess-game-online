// Fix Twilio SMS Notification
// Ensures Twilio is properly configured and sends SMS

const fs = require('fs');
const path = require('path');

console.log('[Fix Twilio SMS] Starting...');

// Read server.cjs
const serverPath = path.join(__dirname, 'server.cjs');
let serverContent = fs.readFileSync(serverPath, 'utf8');

// Check if twilio client is initialized
if (!serverContent.includes('const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);')) {
  // Find where twilio is imported and add client initialization
  const twilioImport = "const twilio = require('twilio');";
  const importIndex = serverContent.indexOf(twilioImport);

  if (importIndex !== -1) {
    const insertPoint = importIndex + twilioImport.length;
    const clientInit = `

// Twilio client initialization
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
const ADMIN_PHONE_NUMBER = process.env.ADMIN_PHONE_NUMBER;
`;

    serverContent = serverContent.slice(0, insertPoint) + clientInit + serverContent.slice(insertPoint);
    console.log('[Fix Twilio SMS] Added Twilio client initialization');
  }
}

// Update the handleReport function to send SMS directly
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
    if (twilioClient && TWILIO_PHONE_NUMBER && ADMIN_PHONE_NUMBER) {
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
    } else {
      console.log("Twilio not properly configured - skipping SMS notification");
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
  console.log('[Fix Twilio SMS] Updated handleReport with direct SMS notification');
} else {
  console.log('[Fix Twilio SMS] handleReport notification section not found or already updated');
}

// Write the updated content back to server.cjs
fs.writeFileSync(serverPath, serverContent, 'utf8');

console.log('[Fix Twilio SMS] Complete!');
console.log('[Fix Twilio SMS] Please restart your server for changes to take effect');
console.log('[Fix Twilio SMS] Make sure twilio.env is properly configured with:');
console.log('  - TWILIO_ACCOUNT_SID');
console.log('  - TWILIO_AUTH_TOKEN');
console.log('  - TWILIO_PHONE_NUMBER');
console.log('  - ADMIN_PHONE_NUMBER');
