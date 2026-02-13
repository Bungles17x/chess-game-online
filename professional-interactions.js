// Professional Interactions & Animations
// Enhanced user experience with smooth animations and professional effects

class ProfessionalAnimations {
  constructor() {
    this.initialized = false;
    this.animationQueue = [];
  }

  // Initialize all professional animations
  init() {
    if (this.initialized) return;

    this.setupBoardAnimations();
    this.setupPieceAnimations();
    this.setupUIAnimations();
    this.setupSoundEffects();

    this.initialized = true;
    console.log('[Professional] Animations initialized');
  }

  // Setup chessboard animations
  setupBoardAnimations() {
    const board = document.getElementById('chessboard');
    if (!board) return;

    // Add subtle floating animation to board
    board.style.animation = 'boardFloat 6s ease-in-out infinite';
  }

  // Setup piece animations
  setupPieceAnimations() {
    document.addEventListener('mouseover', (e) => {
      const piece = e.target.closest('.piece');
      if (piece) {
        this.animatePieceHover(piece);
      }
    });

    document.addEventListener('click', (e) => {
      const piece = e.target.closest('.piece');
      if (piece) {
        this.animatePieceClick(piece);
      }
    });
  }

  // Setup UI animations
  setupUIAnimations() {
    this.setupScrollAnimations();
    this.setupHoverEffects();
    this.setupModalAnimations();
  }

  // Setup scroll animations
  setupScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '0';
          entry.target.style.transform = 'translateY(20px)';

          requestAnimationFrame(() => {
            entry.target.style.transition = 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
          });
        }
      });
    }, { threshold: 0.1 });

    // Observe all animatable elements
    document.querySelectorAll('.side-panel, .board-card, .modal-content').forEach(el => {
      observer.observe(el);
    });
  }

  // Setup hover effects
  setupHoverEffects() {
    document.querySelectorAll('.dropdown-item, .primary-btn, .pill-btn').forEach(el => {
      el.addEventListener('mouseenter', () => {
        el.style.transform = 'translateX(4px)';
      });

      el.addEventListener('mouseleave', () => {
        el.style.transform = 'translateX(0)';
      });
    });
  }

  // Setup modal animations
  setupModalAnimations() {
    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.closeModal(modal);
        }
      });
    });
  }

  // Setup sound effects
  setupSoundEffects() {
    // Enhanced sound feedback
    const sounds = {
      move: document.getElementById('move-sound'),
      capture: document.getElementById('capture-sound'),
      check: document.getElementById('check-sound'),
      checkmate: document.getElementById('checkmate-sound')
    };

    // Play sound with volume control
    window.playSound = (soundName) => {
      const sound = sounds[soundName];
      if (sound) {
        sound.volume = 0.3;
        sound.currentTime = 0;
        sound.play().catch(err => {
          console.warn('Sound play failed:', err);
        });
      }
    };
  }

  // Animate piece hover
  animatePieceHover(piece) {
    piece.style.transition = 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)';
    piece.style.transform = 'scale(1.1) translateY(-3px)';
    piece.style.filter = 'drop-shadow(0 6px 12px rgba(0, 0, 0, 0.6))';
  }

  // Animate piece click
  animatePieceClick(piece) {
    piece.style.transition = 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)';
    piece.style.transform = 'scale(0.95)';

    setTimeout(() => {
      piece.style.transform = 'scale(1)';
    }, 150);
  }

  // Close modal with animation
  closeModal(modal) {
    const content = modal.querySelector('.modal-content');
    if (content) {
      content.style.transition = 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
      content.style.transform = 'scale(0.95)';
      content.style.opacity = '0';

      setTimeout(() => {
        modal.classList.add('hidden');
        content.style.transform = '';
        content.style.opacity = '';
      }, 300);
    }
  }

  // Show notification
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    // Enhanced notification styling
    Object.assign(notification.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      padding: '16px 24px',
      borderRadius: '12px',
      background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 0.95))',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      color: '#f1f5f9',
      fontWeight: '600',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(255, 255, 255, 0.05)',
      backdropFilter: 'blur(20px)',
      zIndex: '10000',
      animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
    });

    document.body.appendChild(notification);

    // Auto remove after 3 seconds
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(100%)';

      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  // Animate game state change
  animateGameStateChange(state) {
    const statusElement = document.getElementById('turn-indicator');
    if (statusElement) {
      statusElement.style.transition = 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
      statusElement.style.transform = 'scale(1.05)';

      setTimeout(() => {
        statusElement.style.transform = 'scale(1)';
      }, 300);
    }
  }

  // Animate move
  animateMove(from, to) {
    const fromSquare = document.querySelector(`[data-square="${from}"]`);
    const toSquare = document.querySelector(`[data-square="${to}"]`);

    if (fromSquare && toSquare) {
      const piece = fromSquare.querySelector('.piece');
      if (piece) {
        // Create floating piece animation
        const floatingPiece = piece.cloneNode(true);
        floatingPiece.style.position = 'fixed';
        floatingPiece.style.zIndex = '1000';
        floatingPiece.style.pointerEvents = 'none';
        floatingPiece.style.transition = 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)';

        const fromRect = fromSquare.getBoundingClientRect();
        const toRect = toSquare.getBoundingClientRect();

        floatingPiece.style.left = fromRect.left + 'px';
        floatingPiece.style.top = fromRect.top + 'px';

        document.body.appendChild(floatingPiece);

        requestAnimationFrame(() => {
          floatingPiece.style.left = toRect.left + 'px';
          floatingPiece.style.top = toRect.top + 'px';
        });

        setTimeout(() => {
          floatingPiece.remove();
        }, 300);
      }
    }
  }
}

// Initialize professional animations
const professionalAnimations = new ProfessionalAnimations();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => professionalAnimations.init());
} else {
  professionalAnimations.init();
}

// Export for global use
window.professionalAnimations = professionalAnimations;
window.showNotification = (message, type) => professionalAnimations.showNotification(message, type);
window.animateMove = (from, to) => professionalAnimations.animateMove(from, to);
