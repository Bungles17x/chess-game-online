// XP Notification System

// Prevent the script from being loaded multiple times
if (window.xpNotificationLoaded) {
  console.log('[XP Notification] Script already loaded, skipping...');
} else {
  window.xpNotificationLoaded = true;

  // Load the CSS file
  const xpNotificationCSS = document.createElement('link');
  xpNotificationCSS.rel = 'stylesheet';
  xpNotificationCSS.href = 'xp-notification.css';
  document.head.appendChild(xpNotificationCSS);

// Create notification container
let xpNotificationContainer = null;

function initXPNotificationContainer() {
  if (!xpNotificationContainer) {
    xpNotificationContainer = document.createElement('div');
    xpNotificationContainer.className = 'xp-notification-container';
    document.body.appendChild(xpNotificationContainer);
  }
}

// Show XP notification
function showXPNotification(amount, type = 'normal', currentXP, maxXP, level) {
  initXPNotificationContainer();

  // Create notification element
  const notification = document.createElement('div');
  notification.className = `xp-notification ${type}`;

  // Calculate progress percentage
  const progress = maxXP ? Math.min((currentXP / maxXP) * 100, 100) : 0;

  // Determine icon and title based on type
  let icon, title;
  switch(type) {
    case 'win':
      icon = '🏆';
      title = 'Victory!';
      break;
    case 'loss':
      icon = '💪';
      title = 'Good Effort';
      break;
    case 'draw':
      icon = '🤝';
      title = 'Draw';
      break;
    default:
      icon = '⭐';
      title = 'XP Gained';
  }

  notification.innerHTML = `
    <div class="xp-notification-header">
      <span class="xp-notification-title">${title}</span>
      <span class="xp-notification-icon">${icon}</span>
    </div>
    <div class="xp-notification-content">
      <span class="xp-amount ${type}">+${amount}</span>
      <span class="xp-label">XP</span>
    </div>
    ${maxXP ? `
      <div class="xp-progress">
        <div class="xp-progress-bar ${type}" style="width: ${progress}%"></div>
      </div>
      <div style="margin-top: 8px; font-size: 12px; color: #94a3b8;">
        Level ${level} • ${currentXP}/${maxXP} XP
      </div>
    ` : ''}
  `;

  // Add close button
  const closeBtn = document.createElement('button');
  closeBtn.className = 'xp-notification-close';
  closeBtn.innerHTML = '×';
  closeBtn.onclick = () => removeNotification(notification);
  notification.appendChild(closeBtn);

  // Add to container
  xpNotificationContainer.appendChild(notification);

  // Play sound effect asynchronously
  if (typeof playXPGainSound === 'function') {
    requestAnimationFrame(() => {
      playXPGainSound(amount);
    });
  }

  // Remove after animation completes (2 seconds)
  setTimeout(() => {
    if (notification && notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 2000);

  // Keep only last 3 notifications
  while (xpNotificationContainer.children.length > 3) {
    xpNotificationContainer.removeChild(xpNotificationContainer.firstChild);
  }
}

function removeNotification(notification) {
  notification.style.animation = 'slideIn 0.4s ease-out reverse';
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 400);
}

// Play XP gain sound
function playXPGainSound(amount) {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Different pitch based on amount
    const baseFreq = 440;
    const multiplier = Math.min(amount / 100, 2);
    oscillator.frequency.setValueAtTime(baseFreq, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      baseFreq * (1 + multiplier),
      audioContext.currentTime + 0.1
    );

    gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (e) {
    console.error('Error playing XP sound:', e);
  }
}

  // Make functions globally available
  window.showXPNotification = showXPNotification;
  window.playXPGainSound = playXPGainSound;
}
