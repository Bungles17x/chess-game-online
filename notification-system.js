// notification-system.js
// Note: Twilio integration is optional. Without it, notifications will be logged to console

// Configuration - 你需要在这里填入你的 Twilio 凭证
const TWILIO_CONFIG = {
  accountSid: process.env.TWILIO_ACCOUNT_SID || '',
  authToken: process.env.TWILIO_AUTH_TOKEN || '',
  phoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
  // 你的电话号码，用于接收通知
  adminPhoneNumber: process.env.ADMIN_PHONE_NUMBER || ''
};

// Check if Twilio is configured
const isTwilioConfigured = TWILIO_CONFIG.accountSid && TWILIO_CONFIG.authToken && 
                              TWILIO_CONFIG.phoneNumber && TWILIO_CONFIG.adminPhoneNumber;

// Initialize Twilio client only if configured
let twilioClient;
if (isTwilioConfigured) {
  try {
    const twilio = require('twilio');
    twilioClient = twilio(TWILIO_CONFIG.accountSid, TWILIO_CONFIG.authToken);
    console.log('Twilio client initialized successfully');
  } catch (error) {
    console.error('Error initializing Twilio client:', error);
  }
} else {
  console.log('Twilio not configured - notifications will be logged to console only');
}

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Sleep function for retry delays
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Log notification to console as fallback
function logNotification(type, message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${type.toUpperCase()} NOTIFICATION]:`, message);
}

// Send SMS notification
async function sendSMSNotification(message) {
  if (!isTwilioConfigured || !twilioClient) {
    logNotification('SMS', message);
    return false;
  }
  
  let lastError;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await twilioClient.messages.create({
        body: message,
        from: TWILIO_CONFIG.phoneNumber,
        to: TWILIO_CONFIG.adminPhoneNumber
      });

      console.log(`SMS notification sent (attempt ${attempt}):`, result.sid);
      return true;
    } catch (error) {
      lastError = error;
      console.error(`SMS notification attempt ${attempt} failed:`, error.message);
      
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY * attempt);
      }
    }
  }
  
  logNotification('SMS', message);
  console.error('All SMS notification attempts failed:', lastError);
  return false;
}

// Make phone call notification
async function makePhoneCallNotification(message) {
  if (!isTwilioConfigured || !twilioClient) {
    logNotification('PHONE CALL', message);
    return false;
  }
  
  let lastError;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await twilioClient.calls.create({
        url: `http://demo.twilio.com/docs/voice.xml?message=${encodeURIComponent(message)}`,
        from: TWILIO_CONFIG.phoneNumber,
        to: TWILIO_CONFIG.adminPhoneNumber
      });

      console.log(`Phone call notification made (attempt ${attempt}):`, result.sid);
      return true;
    } catch (error) {
      lastError = error;
      console.error(`Phone call notification attempt ${attempt} failed:`, error.message);
      
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY * attempt);
      }
    }
  }
  
  logNotification('PHONE CALL', message);
  console.error('All phone call notification attempts failed:', lastError);
  return false;
}

// Send report notification (both SMS and call)
async function sendReportNotification(reportData) {
  const message = `New chess game report received!\n\nReport ID: ${reportData.id}\nType: ${reportData.type}\nReporter: ${reportData.reportedBy}\nRoom ID: ${reportData.roomId}\nReason: ${reportData.reason}\n\nPlease check your admin panel for details.`;

  // Send SMS notification
  const smsSent = await sendSMSNotification(message);

  // Make phone call notification
  const callMade = await makePhoneCallNotification('New chess game report received. Please check your admin panel.');

  // Note: Call notification is handled by the client via WebSocket message

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
