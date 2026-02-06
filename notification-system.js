// notification-system.js
const twilio = require('twilio');

// Configuration - 你需要在这里填入你的 Twilio 凭证
const TWILIO_CONFIG = {
  accountSid: process.env.TWILIO_ACCOUNT_SID || 'YOUR_TWILIO_ACCOUNT_SID',
  authToken: process.env.TWILIO_AUTH_TOKEN || 'YOUR_TWILIO_AUTH_TOKEN',
  phoneNumber: process.env.TWILIO_PHONE_NUMBER || 'YOUR_TWILIO_PHONE_NUMBER',
  // 你的电话号码，用于接收通知
  adminPhoneNumber: process.env.ADMIN_PHONE_NUMBER || 'YOUR_ADMIN_PHONE_NUMBER'
};

// Initialize Twilio client
let twilioClient;
try {
  twilioClient = twilio(TWILIO_CONFIG.accountSid, TWILIO_CONFIG.authToken);
  console.log('Twilio client initialized successfully');
} catch (error) {
  console.error('Error initializing Twilio client:', error);
}

// Send SMS notification
async function sendSMSNotification(message) {
  try {
    if (!twilioClient) {
      console.error('Twilio client not initialized');
      return false;
    }

    const result = await twilioClient.messages.create({
      body: message,
      from: TWILIO_CONFIG.phoneNumber,
      to: TWILIO_CONFIG.adminPhoneNumber
    });

    console.log('SMS notification sent:', result.sid);
    return true;
  } catch (error) {
    console.error('Error sending SMS notification:', error);
    return false;
  }
}

// Make phone call notification
async function makePhoneCallNotification(message) {
  try {
    if (!twilioClient) {
      console.error('Twilio client not initialized');
      return false;
    }

    const result = await twilioClient.calls.create({
      url: `http://demo.twilio.com/docs/voice.xml?message=${encodeURIComponent(message)}`,
      from: TWILIO_CONFIG.phoneNumber,
      to: TWILIO_CONFIG.adminPhoneNumber
    });

    console.log('Phone call notification made:', result.sid);
    return true;
  } catch (error) {
    console.error('Error making phone call notification:', error);
    return false;
  }
}

// Send report notification (both SMS and call)
async function sendReportNotification(reportData) {
  const message = `New chess game report received!\n\nReport ID: ${reportData.id}\nType: ${reportData.type}\nReporter: ${reportData.reportedBy}\nRoom ID: ${reportData.roomId}\nReason: ${reportData.reason}\n\nPlease check your admin panel for details.`;

  // Send SMS notification
  const smsSent = await sendSMSNotification(message);

  // Make phone call notification
  const callMade = await makePhoneCallNotification('New chess game report received. Please check your admin panel.');

  return {
    smsSent,
    callMade
  };
}

module.exports = {
  sendSMSNotification,
  makePhoneCallNotification,
  sendReportNotification
};
