// Enhanced Animations System
// Provides smooth, performant animations for the chess game

class AnimationManager {
  constructor() {
    this.animations = new Map();
    this.animationFrame = null;
    this.lastTime = 0;
  }

  // Add an animation to the queue
  addAnimation(element, properties, duration = 300, easing = 'ease-out') {
    const id = Date.now() + Math.random();
    this.animations.set(id, {
      element,
      properties,
      duration,
      easing,
      startTime: performance.now(),
      startValues: this.getCurrentValues(element, properties),
      id
    });

    if (!this.animationFrame) {
      this.startAnimationLoop();
    }

    return id;
  }

  // Get current values of properties
  getCurrentValues(element, properties) {
    const values = {};
    const style = window.getComputedStyle(element);

    Object.keys(properties).forEach(key => {
      if (key === 'transform') {
        values[key] = style.transform;
      } else if (key === 'opacity') {
        values[key] = parseFloat(style.opacity);
      } else {
        values[key] = parseFloat(style[key]) || 0;
      }
    });

    return values;
  }

  // Easing functions
  easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  easeOutElastic(t) {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  }

  // Animation loop
  startAnimationLoop() {
    const animate = (currentTime) => {
      this.lastTime = currentTime;

      this.animations.forEach((animation, id) => {
        const elapsed = currentTime - animation.startTime;
        const progress = Math.min(elapsed / animation.duration, 1);
        const easedProgress = this.getEasedProgress(progress, animation.easing);

        this.updateElement(animation, easedProgress);

        if (progress >= 1) {
          this.animations.delete(id);
        }
      });

      if (this.animations.size > 0) {
        this.animationFrame = requestAnimationFrame(animate);
      } else {
        this.animationFrame = null;
      }
    };

    this.animationFrame = requestAnimationFrame(animate);
  }

  // Get eased progress value
  getEasedProgress(progress, easing) {
    switch (easing) {
      case 'ease-out-cubic':
        return this.easeOutCubic(progress);
      case 'ease-in-out-cubic':
        return this.easeInOutCubic(progress);
      case 'ease-out-elastic':
        return this.easeOutElastic(progress);
      default:
        return progress;
    }
  }

  // Update element with animated values
  updateElement(animation, progress) {
    const { element, properties, startValues } = animation;

    Object.keys(properties).forEach(key => {
      const startValue = startValues[key];
      const endValue = properties[key];
      const currentValue = this.interpolate(startValue, endValue, progress);

      if (key === 'transform') {
        element.style.transform = currentValue;
      } else if (key === 'opacity') {
        element.style.opacity = currentValue;
      } else {
        element.style[key] = currentValue + 'px';
      }
    });
  }

  // Interpolate between values
  interpolate(start, end, progress) {
    if (typeof start === 'string' && typeof end === 'string') {
      // Handle transform values
      if (start.includes('translate')) {
        const startMatches = start.match(/translate\(([^)]+)\)/);
        const endMatches = end.match(/translate\(([^)]+)\)/);
        if (startMatches && endMatches) {
          const startValues = startMatches[1].split(',').map(v => parseFloat(v.trim()));
          const endValues = endMatches[1].split(',').map(v => parseFloat(v.trim()));
          const currentValues = startValues.map((v, i) => 
            v + (endValues[i] - v) * progress
          );
          return `translate(${currentValues.join(', ')})`;
        }
      }
      return end;
    }
    return start + (end - start) * progress;
  }

  // Cancel a specific animation
  cancelAnimation(id) {
    this.animations.delete(id);
  }

  // Cancel all animations for an element
  cancelElementAnimations(element) {
    for (const [id, animation] of this.animations) {
      if (animation.element === element) {
        this.animations.delete(id);
      }
    }
  }
}

// Piece movement animation
function animatePieceMove(pieceElement, fromSquare, toSquare, callback) {
  const fromRect = fromSquare.getBoundingClientRect();
  const toRect = toSquare.getBoundingClientRect();

  const deltaX = toRect.left - fromRect.left;
  const deltaY = toRect.top - fromRect.top;

  pieceElement.style.transition = 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
  pieceElement.style.transform = `translate(${deltaX}px, ${deltaY}px)`;

  setTimeout(() => {
    pieceElement.style.transition = '';
    pieceElement.style.transform = '';
    if (callback) callback();
  }, 300);
}

// Piece capture animation
function animatePieceCapture(pieceElement, callback) {
  pieceElement.style.transition = 'all 0.5s ease-out';
  pieceElement.style.transform = 'scale(0) rotate(180deg)';
  pieceElement.style.opacity = '0';

  setTimeout(() => {
    pieceElement.style.transition = '';
    pieceElement.style.transform = '';
    pieceElement.style.opacity = '';
    if (callback) callback();
  }, 500);
}

// Piece promotion animation
function animatePiecePromotion(pieceElement, newPiece, callback) {
  pieceElement.style.transition = 'all 0.6s ease-out';
  pieceElement.style.transform = 'scale(1.3) rotateY(180deg)';
  pieceElement.style.opacity = '0';

  setTimeout(() => {
    pieceElement.style.display = 'none';
    newPiece.style.display = 'block';
    newPiece.style.transition = 'all 0.6s ease-out';
    newPiece.style.transform = 'scale(1.3) rotateY(180deg)';
    newPiece.style.opacity = '0';

    requestAnimationFrame(() => {
      newPiece.style.transform = 'scale(1) rotateY(360deg)';
      newPiece.style.opacity = '1';

      setTimeout(() => {
        newPiece.style.transition = '';
        newPiece.style.transform = '';
        newPiece.style.opacity = '';
        if (callback) callback();
      }, 600);
    });
  }, 600);
}

// Check animation
function animateCheck(kingElement) {
  kingElement.classList.add('checking');

  setTimeout(() => {
    kingElement.classList.remove('checking');
  }, 1500);
}

// Checkmate animation
function animateCheckmate(kingElement) {
  kingElement.parentElement.classList.add('checkmate');

  setTimeout(() => {
    kingElement.parentElement.classList.remove('checkmate');
  }, 3000);
}

// Square highlight animation
function animateSquareHighlight(squareElement, type = 'highlight') {
  squareElement.classList.add(type);

  setTimeout(() => {
    squareElement.classList.remove(type);
  }, 1000);
}

// Initialize animation manager
const animationManager = new AnimationManager();

// Export functions for global use
window.animatePieceMove = animatePieceMove;
window.animatePieceCapture = animatePieceCapture;
window.animatePiecePromotion = animatePiecePromotion;
window.animateCheck = animateCheck;
window.animateCheckmate = animateCheckmate;
window.animateSquareHighlight = animateSquareHighlight;
window.animationManager = animationManager;
