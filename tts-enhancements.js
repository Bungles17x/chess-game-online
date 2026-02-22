// TTS Enhancements
// Enhanced TTS announcements for UI interactions

// ============================================
// UI ELEMENT ANNOUNCEMENTS
// ============================================

function announceButtonClick(button) {
  if (!window.ttsSystem || !window.ttsSystem.ttsEnabled) return;

  let announcement = '';

  // Get button text
  const buttonText = button.textContent.trim();

  // Get button ID for context
  const buttonId = button.id;

  // Get aria-label if available
  const ariaLabel = button.getAttribute('aria-label');

  // Build announcement
  if (ariaLabel) {
    announcement = ariaLabel;
  } else if (buttonText) {
    announcement = buttonText;
  } else {
    announcement = 'Button';
  }

  // Add context based on button type
  if (button.classList.contains('primary-btn')) {
    announcement = 'Primary button: ' + announcement;
  } else if (button.classList.contains('secondary-btn')) {
    announcement = 'Secondary button: ' + announcement;
  } else if (button.classList.contains('danger-btn')) {
    announcement = 'Danger button: ' + announcement;
  }

  window.ttsSystem.speak(announcement);
}

function announceLinkClick(link) {
  if (!window.ttsSystem || !window.ttsSystem.ttsEnabled) return;

  const linkText = link.textContent.trim();
  const ariaLabel = link.getAttribute('aria-label');
  const href = link.getAttribute('href');

  let announcement = ariaLabel || linkText || 'Link';

  if (href && href !== '#') {
    announcement += ', link to ' + href;
  }

  window.ttsSystem.speak(announcement);
}

function announceInputChange(input) {
  if (!window.ttsSystem || !window.ttsSystem.ttsEnabled) return;

  const label = input.previousElementSibling?.textContent?.trim() || 
               input.getAttribute('aria-label') || 
               input.getAttribute('placeholder') || 
               'Input field';

  const value = input.type === 'checkbox' || input.type === 'radio' 
    ? (input.checked ? 'checked' : 'unchecked')
    : input.value || 'empty';

  window.ttsSystem.speak(`${label}: ${value}`);
}

function announceSelectChange(select) {
  if (!window.ttsSystem || !window.ttsSystem.ttsEnabled) return;

  const label = select.previousElementSibling?.textContent?.trim() || 
               select.getAttribute('aria-label') || 
               'Dropdown';

  const selectedOption = select.options[select.selectedIndex];
  const value = selectedOption ? selectedOption.textContent : 'empty';

  window.ttsSystem.speak(`${label}: ${value}`);
}

function announceToggleChange(toggle) {
  if (!window.ttsSystem || !window.ttsSystem.ttsEnabled) return;

  const label = toggle.parentElement?.querySelector('.toggle-text')?.textContent?.trim() || 
               toggle.getAttribute('aria-label') || 
               'Toggle';

  const state = toggle.checked ? 'enabled' : 'disabled';

  window.ttsSystem.speak(`${label} ${state}`);
}

function announceSliderChange(slider) {
  if (!window.ttsSystem || !window.ttsSystem.ttsEnabled) return;

  const label = slider.parentElement?.querySelector('.slider-text')?.textContent?.trim() || 
               slider.getAttribute('aria-label') || 
               'Slider';

  const value = slider.value;
  const unit = slider.getAttribute('data-unit') || '';

  window.ttsSystem.speak(`${label}: ${value}${unit}`);
}

function announceTabChange(tab) {
  if (!window.ttsSystem || !window.ttsSystem.ttsEnabled) return;

  const tabName = tab.textContent.trim();
  window.ttsSystem.speak(`Tab: ${tabName}`);
}

function announceModalOpen(modal) {
  if (!window.ttsSystem || !window.ttsSystem.ttsEnabled) return;

  const title = modal.querySelector('h2, h3')?.textContent?.trim() || 'Modal';
  window.ttsSystem.speak(`${title} opened`);
}

function announceModalClose(modal) {
  if (!window.ttsSystem || !window.ttsSystem.ttsEnabled) return;

  const title = modal.querySelector('h2, h3')?.textContent?.trim() || 'Modal';
  window.ttsSystem.speak(`${title} closed`);
}

function announceAlert(alert) {
  if (!window.ttsSystem || !window.ttsSystem.ttsEnabled) return;

  const message = alert.textContent.trim();
  window.ttsSystem.speak(`Alert: ${message}`);
}

function announceNotification(notification) {
  if (!window.ttsSystem || !window.ttsSystem.ttsEnabled) return;

  const title = notification.querySelector('.notification-title')?.textContent?.trim() || 'Notification';
  const message = notification.querySelector('.notification-message')?.textContent?.trim() || '';

  window.ttsSystem.speak(`${title}${message ? ': ' + message : ''}`);
}

function announceMenuOpen(menu) {
  if (!window.ttsSystem || !window.ttsSystem.ttsEnabled) return;

  const menuName = menu.getAttribute('aria-label') || 'Menu';
  window.ttsSystem.speak(`${menuName} opened`);
}

function announceMenuClose(menu) {
  if (!window.ttsSystem || !window.ttsSystem.ttsEnabled) return;

  const menuName = menu.getAttribute('aria-label') || 'Menu';
  window.ttsSystem.speak(`${menuName} closed`);
}

function announceMenuItem(item) {
  if (!window.ttsSystem || !window.ttsSystem.ttsEnabled) return;

  const itemName = item.textContent.trim();
  const description = item.getAttribute('aria-description') || '';

  window.ttsSystem.speak(`${itemName}${description ? ': ' + description : ''}`);
}

// ============================================
// GAME-SPECIFIC ANNOUNCEMENTS
// ============================================

function announceGameMode(mode) {
  if (!window.ttsSystem || !window.ttsSystem.ttsEnabled) return;

  const modeNames = {
    'bot': 'Bot mode',
    'online': 'Online mode',
    'local': 'Local mode'
  };

  window.ttsSystem.speak(`Game mode: ${modeNames[mode] || mode}`);
}

function announcePlayerColor(color) {
  if (!window.ttsSystem || !window.ttsSystem.ttsEnabled) return;

  const colorName = color === 'w' ? 'White' : 'Black';
  window.ttsSystem.speak(`You are playing as ${colorName}`);
}

function announceGameStart() {
  if (!window.ttsSystem || !window.ttsSystem.ttsEnabled) return;

  window.ttsSystem.speak('Game started');
}

function announceGameEnd(result) {
  if (!window.ttsSystem || !window.ttsSystem.ttsEnabled) return;

  const messages = {
    'win': 'You won the game',
    'loss': 'You lost the game',
    'draw': 'Game ended in a draw'
  };

  window.ttsSystem.speak(messages[result] || 'Game ended');
}

function announceUndoMove() {
  if (!window.ttsSystem || !window.ttsSystem.ttsEnabled) return;

  window.ttsSystem.speak('Move undone');
}

function announceRedoMove() {
  if (!window.ttsSystem || !window.ttsSystem.ttsEnabled) return;

  window.ttsSystem.speak('Move redone');
}

function announceOfferDraw() {
  if (!window.ttsSystem || !window.ttsSystem.ttsEnabled) return;

  window.ttsSystem.speak('Draw offered');
}

function announceAcceptDraw() {
  if (!window.ttsSystem || !window.ttsSystem.ttsEnabled) return;

  window.ttsSystem.speak('Draw accepted');
}

function announceResign() {
  if (!window.ttsSystem || !window.ttsSystem.ttsEnabled) return;

  window.ttsSystem.speak('You resigned');
}

function announceRematch() {
  if (!window.ttsSystem || !window.ttsSystem.ttsEnabled) return;

  window.ttsSystem.speak('Rematch started');
}

// ============================================
// SETTINGS ANNOUNCEMENTS
// ============================================

function announceSettingChange(setting, value) {
  if (!window.ttsSystem || !window.ttsSystem.ttsEnabled) return;

  window.ttsSystem.speak(`${setting} changed to ${value}`);
}

function announceThemeChange(theme) {
  if (!window.ttsSystem || !window.ttsSystem.ttsEnabled) return;

  window.ttsSystem.speak(`Theme changed to ${theme}`);
}

function announceBoardStyleChange(style) {
  if (!window.ttsSystem || !window.ttsSystem.ttsEnabled) return;

  window.ttsSystem.speak(`Board style changed to ${style}`);
}

// ============================================
// INITIALIZATION
// ============================================

function setupTTSEnhancements() {
  // Button clicks
  document.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (button) {
      announceButtonClick(button);
      return;
    }

    const link = event.target.closest('a');
    if (link) {
      announceLinkClick(link);
      return;
    }
  });

  // Input changes
  document.addEventListener('change', (event) => {
    const target = event.target;

    if (target.type === 'checkbox' || target.type === 'radio') {
      announceToggleChange(target);
      return;
    }

    if (target.tagName === 'SELECT') {
      announceSelectChange(target);
      return;
    }
  });

  // Slider changes
  document.addEventListener('input', (event) => {
    if (event.target.type === 'range') {
      // Debounce slider announcements
      if (event.target.ttsTimeout) {
        clearTimeout(event.target.ttsTimeout);
      }
      event.target.ttsTimeout = setTimeout(() => {
        announceSliderChange(event.target);
      }, 300);
    }
  });

  // Modals
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) {
          if (node.classList.contains('modal') || node.classList.contains('popup')) {
            announceModalOpen(node);
          }
          if (node.classList.contains('alert')) {
            announceAlert(node);
          }
          if (node.classList.contains('notification')) {
            announceNotification(node);
          }
        }
      });

      mutation.removedNodes.forEach((node) => {
        if (node.nodeType === 1) {
          if (node.classList.contains('modal') || node.classList.contains('popup')) {
            announceModalClose(node);
          }
        }
      });
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  console.log('[TTS Enhancements] Initialized');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupTTSEnhancements);
} else {
  setupTTSEnhancements();
}

// Export functions
window.ttsEnhancements = {
  announceButtonClick,
  announceLinkClick,
  announceInputChange,
  announceSelectChange,
  announceToggleChange,
  announceSliderChange,
  announceTabChange,
  announceModalOpen,
  announceModalClose,
  announceAlert,
  announceNotification,
  announceMenuOpen,
  announceMenuClose,
  announceMenuItem,
  announceGameMode,
  announcePlayerColor,
  announceGameStart,
  announceGameEnd,
  announceUndoMove,
  announceRedoMove,
  announceOfferDraw,
  announceAcceptDraw,
  announceResign,
  announceRematch,
  announceSettingChange,
  announceThemeChange,
  announceBoardStyleChange
};
