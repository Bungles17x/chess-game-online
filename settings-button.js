// Settings Button Handler
// This file handles the Settings button click event

document.addEventListener('DOMContentLoaded', () => {
  const settingsBtn = document.getElementById('settings-btn');

  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      window.location.href = 'settings.html';
    });
    console.log('[Settings Button] Settings button event listener attached');
  } else {
    console.error('[Settings Button] Settings button not found');
  }
});
