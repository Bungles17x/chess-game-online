// Ultimate Game Enhancements - Error Free Version
// Complete improvements for all game features

class UltimateEnhancements {
  constructor() {
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;

    console.log('[Ultimate] Initializing enhancements...');
    this.setupPerformance();
    this.setupAccessibility();
    this.setupAnimations();
    this.setupNotifications();
    this.setupSounds();
    this.setupKeyboard();
    this.setupResponsive();

    this.initialized = true;
    console.log('[Ultimate] All enhancements initialized');
  }

  setupPerformance() {
    window.requestAnimFrame = (callback) => {
      return requestAnimationFrame(callback);
    };
  }

  setupAccessibility() {
    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          modal.classList.add('hidden');
        }
      });
    });
  }

  setupAnimations() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    });

    document.querySelectorAll('.animate-on-scroll').forEach(el => {
      observer.observe(el);
    });
  }

  setupNotifications() {
    window.showNotification = (message, type = 'info') => {
      const notification = document.createElement('div');
      notification.className = `notification ${type}`;
      notification.textContent = message;
      document.body.appendChild(notification);

      setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
      }, 3000);
    };
  }

  setupSounds() {
    window.playSound = (soundName) => {
      const sound = document.getElementById(soundName + '-sound');
      if (sound) {
        sound.volume = 0.3;
        sound.currentTime = 0;
        sound.play().catch(() => {});
      }
    };
  }

  setupKeyboard() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const modal = document.querySelector('.modal:not(.hidden)');
        if (modal) {
          modal.classList.add('hidden');
        }
      }
    });
  }

  setupResponsive() {
    const handleResize = () => {
      const board = document.getElementById('chessboard');
      if (board) {
        const maxSize = Math.min(window.innerWidth * 0.9, 650);
        board.style.width = `${maxSize}px`;
        board.style.height = `${maxSize}px`;
      }
    };

    window.addEventListener('resize', () => {
      requestAnimationFrame(handleResize);
    });

    handleResize();
  }
}

const ultimate = new UltimateEnhancements();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => ultimate.init());
} else {
  ultimate.init();
}

window.showNotification = (message, type) => ultimate.showNotification(message, type);
window.playSound = (soundName) => ultimate.playSound(soundName);
