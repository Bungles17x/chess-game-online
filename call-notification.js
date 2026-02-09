// call-notification.js - Simulated phone call notification system
// This module can be used both on server and client side
let callNotification = null;
let ringInterval = null;
let isRinging = false;

// Check if running in browser
const isBrowser = typeof window !== 'undefined';

// Create the call notification UI
function createCallNotificationUI() {
  const notification = document.createElement('div');
  notification.id = 'call-notification';
  notification.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 20px;
    padding: 40px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    z-index: 10000;
    display: none;
    flex-direction: column;
    align-items: center;
    min-width: 350px;
    animation: pulse 1s ease-in-out infinite;
  `;

  const icon = document.createElement('div');
  icon.innerHTML = '📞';
  icon.style.cssText = `
    font-size: 80px;
    margin-bottom: 20px;
    animation: shake 0.5s ease-in-out infinite;
  `;

  const title = document.createElement('h2');
  title.textContent = 'Incoming Report Call';
  title.style.cssText = `
    color: white;
    margin: 0 0 20px 0;
    font-size: 28px;
    font-weight: bold;
  `;

  const content = document.createElement('div');
  content.id = 'call-content';
  content.style.cssText = `
    background: rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    padding: 20px;
    margin-bottom: 30px;
    width: 100%;
    color: white;
    font-size: 16px;
    line-height: 1.6;
  `;

  const buttonContainer = document.createElement('div');
  buttonContainer.style.cssText = `
    display: flex;
    gap: 20px;
    width: 100%;
  `;

  const answerButton = document.createElement('button');
  answerButton.textContent = 'Answer';
  answerButton.style.cssText = `
    flex: 1;
    padding: 15px 30px;
    font-size: 20px;
    font-weight: bold;
    border: none;
    border-radius: 50px;
    background: #4CAF50;
    color: white;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 5px 15px rgba(76, 175, 80, 0.4);
  `;
  answerButton.onmouseover = () => {
    answerButton.style.transform = 'scale(1.05)';
    answerButton.style.boxShadow = '0 8px 20px rgba(76, 175, 80, 0.6)';
  };
  answerButton.onmouseout = () => {
    answerButton.style.transform = 'scale(1)';
    answerButton.style.boxShadow = '0 5px 15px rgba(76, 175, 80, 0.4)';
  };
  answerButton.onclick = () => answerCall();

  notification.appendChild(icon);
  notification.appendChild(title);
  notification.appendChild(content);
  buttonContainer.appendChild(answerButton);
  notification.appendChild(buttonContainer);

  // Add CSS animations
  const style = document.createElement('style');
  style.textContent = `
    @keyframes pulse {
      0%, 100% { transform: translate(-50%, -50%) scale(1); }
      50% { transform: translate(-50%, -50%) scale(1.02); }
    }
    @keyframes shake {
      0%, 100% { transform: rotate(0deg); }
      25% { transform: rotate(-10deg); }
      75% { transform: rotate(10deg); }
    }
  `;
  document.head.appendChild(style);

  document.body.appendChild(notification);
  return notification;
}

// Play ringtone
function playRingtone() {
  const audio = new Audio('sounds/ringtone.mp3');
  audio.loop = true;
  audio.play().catch(e => console.log('Audio play failed:', e));
  return audio;
}

// Show call notification
function showCallNotification(reportData) {
  // If running on server, just log the notification
  if (!isBrowser) {
    console.log('[CALL NOTIFICATION]: Incoming report call!');
    console.log('Report Details:', JSON.stringify(reportData, null, 2));
    return;
  }

  if (!callNotification) {
    callNotification = createCallNotificationUI();
  }

  const content = callNotification.querySelector('#call-content');
  content.innerHTML = `
    <strong>Report ID:</strong> ${reportData.id}<br>
    <strong>Type:</strong> ${reportData.type}<br>
    <strong>Reporter:</strong> ${reportData.reportedBy}<br>
    <strong>Room ID:</strong> ${reportData.roomId}<br>
    <strong>Reason:</strong> ${reportData.reason}<br>
    <strong>Time:</strong> ${new Date().toLocaleString()}
  `;

  callNotification.style.display = 'flex';
  isRinging = true;

  // Start ringing
  if (ringInterval) {
    clearInterval(ringInterval);
  }

  let ringtone = playRingtone();

  ringInterval = setInterval(() => {
    if (isRinging) {
      ringtone = playRingtone();
    }
  }, 3000);

  // Try to get user attention
  if (document.hidden) {
    try {
      new Notification('New Report Received!', {
        body: 'Click to view the report',
        requireInteraction: true
      });
    } catch (e) {
      console.log('Notification permission not granted');
    }
  }
}

// Answer the call (dismiss notification)
function answerCall() {
  if (callNotification) {
    callNotification.style.display = 'none';
  }
  isRinging = false;
  if (ringInterval) {
    clearInterval(ringInterval);
    ringInterval = null;
  }
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    showCallNotification,
    answerCall
  };
}
