// Extreme Visual Effects System
// Advanced visual enhancements with WebGL and particle effects

// ============================================
// PARTICLE SYSTEM
// ============================================

class ParticleSystem {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.maxParticles = 1000;
    this.animationId = null;
  }

  createParticle(x, y, options = {}) {
    const particle = {
      x,
      y,
      vx: (Math.random() - 0.5) * (options.speed || 5),
      vy: (Math.random() - 0.5) * (options.speed || 5),
      life: options.life || 1,
      maxLife: options.life || 1,
      size: options.size || 3,
      color: options.color || '#ffffff',
      alpha: options.alpha || 1,
      gravity: options.gravity || 0,
      friction: options.friction || 0.98
    };

    this.particles.push(particle);
    return particle;
  }

  createExplosion(x, y, options = {}) {
    const count = options.count || 50;
    const colors = options.colors || ['#ff0000', '#ff6600', '#ffff00'];

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 / count) * i;
      const speed = options.speed || 5;

      this.createParticle(x, y, {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: options.life || 1,
        size: options.size || 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        gravity: options.gravity || 0.1,
        friction: options.friction || 0.95
      });
    }
  }

  createTrail(x, y, options = {}) {
    const particle = this.createParticle(x, y, {
      life: options.life || 0.5,
      size: options.size || 2,
      color: options.color || '#ffffff',
      alpha: options.alpha || 0.5,
      vx: 0,
      vy: 0
    });

    return particle;
  }

  update(deltaTime) {
    this.particles = this.particles.filter(p => p.life > 0);

    this.particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.vx *= p.friction;
      p.vy *= p.friction;
      p.life -= deltaTime;
      p.alpha = p.life / p.maxLife;
    });
  }

  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.particles.forEach(p => {
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size * p.alpha, 0, Math.PI * 2);
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = p.alpha;
      this.ctx.fill();
      this.ctx.globalAlpha = 1;
    });
  }

  start() {
    const animate = (timestamp) => {
      const deltaTime = (timestamp - (this.lastTime || timestamp)) / 1000;
      this.lastTime = timestamp;

      this.update(deltaTime);
      this.render();

      this.animationId = requestAnimationFrame(animate);
    };

    this.animationId = requestAnimationFrame(animate);
  }

  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  clear() {
    this.particles = [];
  }
}

// ============================================
// GLOW EFFECTS
// ============================================

class GlowEffects {
  constructor() {
    this.glowElements = new Map();
  }

  addGlow(element, options = {}) {
    const glow = {
      color: options.color || '#3b82f6',
      intensity: options.intensity || 20,
      spread: options.spread || 10,
      animation: options.animation || 'pulse',
      duration: options.duration || 2000,
      element
    };

    this.glowElements.set(element, glow);
    this.applyGlow(element, glow);

    if (glow.animation) {
      this.animateGlow(element, glow);
    }
  }

  applyGlow(element, glow) {
    element.style.boxShadow = `
      0 0 ${glow.intensity}px ${glow.spread}px ${glow.color},
      0 0 ${glow.intensity * 2}px ${glow.spread * 2}px ${glow.color}
    `;
  }

  animateGlow(element, glow) {
    const animate = () => {
      if (!this.glowElements.has(element)) return;

      const time = Date.now();
      const phase = (time % glow.duration) / glow.duration;
      const intensity = glow.intensity * (0.5 + Math.sin(phase * Math.PI * 2) * 0.5);

      element.style.boxShadow = `
        0 0 ${intensity}px ${glow.spread}px ${glow.color},
        0 0 ${intensity * 2}px ${glow.spread * 2}px ${glow.color}
      `;

      requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }

  removeGlow(element) {
    this.glowElements.delete(element);
    element.style.boxShadow = '';
  }

  clearAll() {
    this.glowElements.forEach((glow, element) => {
      element.style.boxShadow = '';
    });
    this.glowElements.clear();
  }
}

// ============================================
// 3D TRANSFORMATIONS
// ============================================

class Transform3D {
  constructor(element) {
    this.element = element;
    this.rotation = { x: 0, y: 0, z: 0 };
    this.scale = { x: 1, y: 1, z: 1 };
    this.translation = { x: 0, y: 0, z: 0 };
    this.perspective = 1000;
  }

  setRotation(x, y, z) {
    this.rotation = { x, y, z };
    this.applyTransform();
    return this;
  }

  setScale(x, y, z) {
    this.scale = { x, y, z };
    this.applyTransform();
    return this;
  }

  setTranslation(x, y, z) {
    this.translation = { x, y, z };
    this.applyTransform();
    return this;
  }

  setPerspective(perspective) {
    this.perspective = perspective;
    this.applyTransform();
    return this;
  }

  applyTransform() {
    const transform = `
      perspective(${this.perspective}px)
      rotateX(${this.rotation.x}deg)
      rotateY(${this.rotation.y}deg)
      rotateZ(${this.rotation.z}deg)
      scaleX(${this.scale.x})
      scaleY(${this.scale.y})
      scaleZ(${this.scale.z})
      translateX(${this.translation.x}px)
      translateY(${this.translation.y}px)
      translateZ(${this.translation.z}px)
    `;

    this.element.style.transform = transform;
  }

  animateRotation(x, y, z, duration = 1000) {
    const startRotation = { ...this.rotation };
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = this.easeInOutCubic(progress);

      this.rotation = {
        x: startRotation.x + (x - startRotation.x) * eased,
        y: startRotation.y + (y - startRotation.y) * eased,
        z: startRotation.z + (z - startRotation.z) * eased
      };

      this.applyTransform();

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
    return this;
  }

  animateScale(x, y, z, duration = 1000) {
    const startScale = { ...this.scale };
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = this.easeInOutCubic(progress);

      this.scale = {
        x: startScale.x + (x - startScale.x) * eased,
        y: startScale.y + (y - startScale.y) * eased,
        z: startScale.z + (z - startScale.z) * eased
      };

      this.applyTransform();

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
    return this;
  }

  animateTranslation(x, y, z, duration = 1000) {
    const startTranslation = { ...this.translation };
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = this.easeInOutCubic(progress);

      this.translation = {
        x: startTranslation.x + (x - startTranslation.x) * eased,
        y: startTranslation.y + (y - startTranslation.y) * eased,
        z: startTranslation.z + (z - startTranslation.z) * eased
      };

      this.applyTransform();

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
    return this;
  }

  easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
}

// ============================================
// MORPHING EFFECTS
// ============================================

class MorphingEffects {
  constructor() {
    this.morphingElements = new Map();
  }

  morph(element, targetStyles, duration = 1000) {
    const startStyles = this.getCurrentStyles(element, Object.keys(targetStyles));
    const startTime = Date.now();

    const morph = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = this.easeInOutCubic(progress);

      Object.keys(targetStyles).forEach(property => {
        const startValue = startStyles[property];
        const targetValue = targetStyles[property];
        const currentValue = this.interpolateValue(startValue, targetValue, eased);

        element.style[property] = currentValue;
      });

      if (progress < 1) {
        requestAnimationFrame(morph);
      } else {
        this.morphingElements.delete(element);
      }
    };

    this.morphingElements.set(element, morph);
    requestAnimationFrame(morph);
  }

  getCurrentStyles(element, properties) {
    const styles = {};
    const computed = window.getComputedStyle(element);

    properties.forEach(property => {
      styles[property] = computed[property];
    });

    return styles;
  }

  interpolateValue(start, end, progress) {
    // Handle numeric values
    const startNum = parseFloat(start);
    const endNum = parseFloat(end);

    if (!isNaN(startNum) && !isNaN(endNum)) {
      return startNum + (endNum - startNum) * progress + (end.replace(/[0-9.-]/g, '') || '');
    }

    // Handle colors
    if (start.startsWith('#') && end.startsWith('#')) {
      return this.interpolateColor(start, end, progress);
    }

    return end;
  }

  interpolateColor(start, end, progress) {
    const startRGB = this.hexToRgb(start);
    const endRGB = this.hexToRgb(end);

    const r = Math.round(startRGB.r + (endRGB.r - startRGB.r) * progress);
    const g = Math.round(startRGB.g + (endRGB.g - startRGB.g) * progress);
    const b = Math.round(startRGB.b + (endRGB.b - startRGB.b) * progress);

    return `rgb(${r}, ${g}, ${b})`;
  }

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  }

  easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
}

// ============================================
// WAVE EFFECTS
// ============================================

class WaveEffects {
  constructor(element) {
    this.element = element;
    this.waves = [];
    this.animationId = null;
  }

  createWave(options = {}) {
    const wave = {
      amplitude: options.amplitude || 20,
      frequency: options.frequency || 0.02,
      speed: options.speed || 0.1,
      phase: options.phase || 0,
      color: options.color || '#3b82f6',
      width: options.width || 2,
      opacity: options.opacity || 1
    };

    this.waves.push(wave);
    return wave;
  }

  start() {
    const animate = (timestamp) => {
      this.render(timestamp);
      this.animationId = requestAnimationFrame(animate);
    };

    this.animationId = requestAnimationFrame(animate);
  }

  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  render(timestamp) {
    const canvas = this.element;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    this.waves.forEach(wave => {
      ctx.beginPath();
      ctx.strokeStyle = wave.color;
      ctx.lineWidth = wave.width;
      ctx.globalAlpha = wave.opacity;

      for (let x = 0; x < width; x++) {
        const y = height / 2 + 
                 Math.sin(x * wave.frequency + wave.phase) * wave.amplitude;

        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.stroke();
      wave.phase += wave.speed;
    });

    ctx.globalAlpha = 1;
  }

  clear() {
    this.waves = [];
  }
}

// ============================================
// INITIALIZATION
// ============================================

// Export classes
window.ParticleSystem = ParticleSystem;
window.GlowEffects = GlowEffects;
window.Transform3D = Transform3D;
window.MorphingEffects = MorphingEffects;
window.WaveEffects = WaveEffects;

// Initialize instances
window.particleSystem = null;
window.glowEffects = null;
window.morphingEffects = null;

function initializeExtremeVisualEffects() {
  // Initialize glow effects
  window.glowEffects = new GlowEffects();

  // Initialize morphing effects
  window.morphingEffects = new MorphingEffects();

  console.log('[Extreme Visual Effects] Initialized');
}

// Auto-initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeExtremeVisualEffects);
} else {
  initializeExtremeVisualEffects();
}
