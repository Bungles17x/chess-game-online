// Level Up Animation

// Load the CSS file
const levelUpCSS = document.createElement('link');
levelUpCSS.rel = 'stylesheet';
levelUpCSS.href = 'level-up.css';
document.head.appendChild(levelUpCSS);

// Function to show level up animation
function showLevelUpAnimation(oldLevel, newLevel) {
  // Create overlay
  const overlay = document.createElement('div');
  overlay.className = 'level-up-overlay';

  // Create container
  const container = document.createElement('div');
  container.className = 'level-up-container';

  // Create title
  const title = document.createElement('h1');
  title.className = 'level-up-title';
  title.textContent = 'Level Up!';

  // Create level display
  const levelDisplay = document.createElement('div');
  levelDisplay.className = 'level-display';

  // Create old level
  const oldLevelElement = document.createElement('span');
  oldLevelElement.className = 'old-level';
  oldLevelElement.textContent = oldLevel;

  // Create new level
  const newLevelElement = document.createElement('span');
  newLevelElement.className = 'new-level';
  newLevelElement.textContent = newLevel;

  // Create lightning container
  const lightningContainer = document.createElement('div');
  lightningContainer.className = 'lightning-container';

  // Create lightning bolt
  const lightningBolt = document.createElement('div');
  lightningBolt.className = 'lightning-bolt';

  // Create lightning glow
  const lightningGlow = document.createElement('div');
  lightningGlow.className = 'lightning-glow';

  // Create message
  const message = document.createElement('p');
  message.className = 'level-up-message';
  message.textContent = `Congratulations! You reached Level ${newLevel}!`;

  // Assemble the elements
  levelDisplay.appendChild(oldLevelElement);
  levelDisplay.appendChild(newLevelElement);

  lightningContainer.appendChild(lightningBolt);
  lightningContainer.appendChild(lightningGlow);

  container.appendChild(title);
  container.appendChild(levelDisplay);
  container.appendChild(lightningContainer);
  container.appendChild(message);

  overlay.appendChild(container);
  document.body.appendChild(overlay);

  // Play sound effect if available
  playLevelUpSound();

  // Remove overlay after animation completes
  setTimeout(() => {
    overlay.style.animation = 'fadeIn 0.3s ease-out reverse';
    setTimeout(() => {
      overlay.remove();
    }, 300);
  }, 3000);
}

// Function to play level up sound
function playLevelUpSound() {
  // Try to play a sound effect
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();

  // Create oscillator for the level up sound
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4
  oscillator.frequency.exponentialRampToValueAtTime(880, audioContext.currentTime + 0.1); // A5
  oscillator.frequency.exponentialRampToValueAtTime(1320, audioContext.currentTime + 0.2); // E6

  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.5);
}

// Make the function globally available
window.showLevelUpAnimation = showLevelUpAnimation;
