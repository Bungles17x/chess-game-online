// Admin Features - Working Version
(function() {
  "use strict";

  function isAdmin() {
    try {
      const currentUser = localStorage.getItem('currentUser');
      if (!currentUser) return false;
      const user = JSON.parse(currentUser);
      return user && user.username && user.username.toLowerCase() === 'bungles17x';
    } catch (e) {
      console.error('Error checking admin status:', e);
      return false;
    }
  }

  function init() {
    if (!isAdmin()) {
      console.log('[Admin Features] Not logged in as admin');
      return;
    }
    console.log('[Admin Features] Initializing');
    addReportsButton();
    addCheatsButton();
  }

  function addReportsButton() {
    const dropdown = document.querySelector('.dropdown-content');
    if (!dropdown || document.getElementById('reports-manage-btn')) return;

    const btn = document.createElement('button');
    btn.id = 'reports-manage-btn';
    btn.className = 'dropdown-item';
    btn.textContent = '📊 Manage Reports';
    btn.addEventListener('click', () => {
      if (window.openReportsModal) window.openReportsModal();
      else alert('Reports feature not available');
    });
    dropdown.appendChild(btn);
  }

  function addCheatsButton() {
    const dropdown = document.querySelector('.dropdown-content');
    if (!dropdown || document.getElementById('admin-cheats-btn')) return;

    const btn = document.createElement('button');
    btn.id = 'admin-cheats-btn';
    btn.className = 'dropdown-item';
    btn.textContent = '🎮 Admin Cheats';
    btn.addEventListener('click', () => {
      alert('Admin cheats coming soon!');
    });
    dropdown.appendChild(btn);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
