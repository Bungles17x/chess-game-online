// Email Notification Fix for Reports
// Adds proper email notification system to server.cjs

const fs = require('fs');
const path = require('path');

console.log('[Email Notification Fix] Starting...');

// Read server.cjs
const serverPath = path.join(__dirname, 'server.cjs');
let serverContent = fs.readFileSync(serverPath, 'utf8');

// Check if nodemailer is already imported
if (!serverContent.includes("const nodemailer = require('nodemailer')")) {
  // Add nodemailer import after other requires
  const requiresSection = serverContent.match(/const\s+\w+\s*=\s*require\(['"][^'"]+['"]\)/g);
  if (requiresSection && requiresSection.length > 0) {
    const lastRequire = requiresSection[requiresSection.length - 1];
    const insertPoint = serverContent.indexOf(lastRequire) + lastRequire.length;
    const nodemailerImport = `
const nodemailer = require('nodemailer');

// Email transporter configuration
const transporter = nodemailer.createTransport({
  service: 'yahoo',
  auth: {
    user: process.env.EMAIL_USER || 'chessygames@yahoo.com',
    pass: process.env.EMAIL_PASS
  }
});
`;
    serverContent = serverContent.slice(0, insertPoint) + nodemailerImport + serverContent.slice(insertPoint);
    console.log('[Email Notification Fix] Added nodemailer import and transporter');
  }
}

// Find and update the handleReport function to include email notification
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

    // Send email notification
    const mailOptions = {
      from: process.env.EMAIL_USER || 'chessygames@yahoo.com',
      to: 'chessygames@yahoo.com',
      subject: \`New Report: \${reportData.reportType} - \${reportData.reportedBy} vs \${reportData.opponent}\`,
      text: \`Report ID: \${reportId}
Type: \${reportData.reportType}
Reported by: \${reportData.reportedBy}
Opponent: \${reportData.opponent}
Room ID: \${reportData.roomId}
Reason: \${reportData.reason}
Description: \${reportData.description}
Timestamp: \${reportData.timestamp}\`
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Error sending email:", error);
      } else {
        console.log("Email sent successfully:", info.response);
      }
    });

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
  console.log('[Email Notification Fix] Updated handleReport with email notification');
} else {
  console.log('[Email Notification Fix] handleReport notification section not found or already updated');
}

// Write the updated content back to server.cjs
fs.writeFileSync(serverPath, serverContent, 'utf8');

console.log('[Email Notification Fix] Complete!');
console.log('[Email Notification Fix] Please restart your server for changes to take effect');
console.log('[Email Notification Fix] Make sure EMAIL_USER and EMAIL_PASS environment variables are set');
