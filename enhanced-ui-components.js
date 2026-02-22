// Enhanced UI Components for Modern Chess
// This file contains advanced UI components and interactions

// -----------------------------------------------------
// NOTIFICATION SYSTEM
// -----------------------------------------------------
const notificationSystem = {
  container: null,

  // Initialize notification system
  initialize() {
    this.container = document.getElementById('notification-container');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'notification-container';
      this.container.className = 'notification-container';
      document.body.appendChild(this.container);
    }
  },

  // Show a notification
  show(message, type = 'info', duration = 3000) {
    if (!this.container) this.initialize();

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
      <span class="notification-message">${message}</span>
      <button class="notification-close">&times;</button>
    `;

    this.container.appendChild(notification);

    // Animate in
    setTimeout(() => notification.classList.add('show'), 10);

    // Handle close button
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => this.hide(notification));

    // Auto hide after duration
    if (duration > 0) {
      setTimeout(() => this.hide(notification), duration);
    }

    return notification;
  },

  // Hide a notification
  hide(notification) {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  },

  // Show success notification
  success(message, duration) {
    return this.show(message, 'success', duration);
  },

  // Show error notification
  error(message, duration) {
    return this.show(message, 'error', duration);
  },

  // Show warning notification
  warning(message, duration) {
    return this.show(message, 'warning', duration);
  },

  // Show info notification
  info(message, duration) {
    return this.show(message, 'info', duration);
  }
};

// -----------------------------------------------------
// TOOLTIP SYSTEM
// -----------------------------------------------------
const tooltipSystem = {
  currentTooltip: null,

  // Initialize tooltip system
  initialize() {
    document.addEventListener('mouseover', (e) => {
      const target = e.target.closest('[data-tooltip]');
      if (target) {
        this.show(target, target.dataset.tooltip);
      }
    });

    document.addEventListener('mouseout', (e) => {
      const target = e.target.closest('[data-tooltip]');
      if (target) {
        this.hide();
      }
    });
  },

  // Show tooltip
  show(element, text) {
    this.hide();

    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.textContent = text;

    document.body.appendChild(tooltip);

    const rect = element.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();

    let top = rect.top - tooltipRect.height - 10;
    let left = rect.left + (rect.width - tooltipRect.width) / 2;

    // Adjust if tooltip goes off screen
    if (top < 10) {
      top = rect.bottom + 10;
    }

    if (left < 10) {
      left = 10;
    } else if (left + tooltipRect.width > window.innerWidth - 10) {
      left = window.innerWidth - tooltipRect.width - 10;
    }

    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;

    this.currentTooltip = tooltip;
  },

  // Hide tooltip
  hide() {
    if (this.currentTooltip) {
      this.currentTooltip.remove();
      this.currentTooltip = null;
    }
  }
};

// -----------------------------------------------------
// CONFIRMATION DIALOG
// -----------------------------------------------------
const confirmDialog = {
  // Show confirmation dialog
  show(message, onConfirm, onCancel) {
    const dialog = document.createElement('div');
    dialog.className = 'confirm-dialog-overlay';
    dialog.innerHTML = `
      <div class="confirm-dialog">
        <div class="confirm-dialog-message">${message}</div>
        <div class="confirm-dialog-buttons">
          <button class="confirm-dialog-btn confirm-dialog-cancel">Cancel</button>
          <button class="confirm-dialog-btn confirm-dialog-confirm">Confirm</button>
        </div>
      </div>
    `;

    document.body.appendChild(dialog);

    const confirmBtn = dialog.querySelector('.confirm-dialog-confirm');
    const cancelBtn = dialog.querySelector('.confirm-dialog-cancel');

    confirmBtn.addEventListener('click', () => {
      dialog.classList.add('hide');
      setTimeout(() => {
        dialog.remove();
        if (onConfirm) onConfirm();
      }, 300);
    });

    cancelBtn.addEventListener('click', () => {
      dialog.classList.add('hide');
      setTimeout(() => {
        dialog.remove();
        if (onCancel) onCancel();
      }, 300);
    });

    // Animate in
    setTimeout(() => dialog.classList.add('show'), 10);
  }
};

// -----------------------------------------------------
// LOADING SPINNER
// -----------------------------------------------------
const loadingSpinner = {
  // Show loading spinner
  show(message = 'Loading...') {
    const existing = document.querySelector('.loading-spinner-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'loading-spinner-overlay';
    overlay.innerHTML = `
      <div class="loading-spinner">
        <div class="spinner"></div>
        <div class="loading-message">${message}</div>
      </div>
    `;

    document.body.appendChild(overlay);
    return overlay;
  },

  // Hide loading spinner
  hide() {
    const overlay = document.querySelector('.loading-spinner-overlay');
    if (overlay) {
      overlay.classList.add('hide');
      setTimeout(() => overlay.remove(), 300);
    }
  }
};

// -----------------------------------------------------
// PROGRESS BAR
// -----------------------------------------------------
const progressBar = {
  // Create a progress bar
  create(container, options = {}) {
    const {
      value = 0,
      max = 100,
      showLabel = true,
      color = 'var(--accent-color)',
      animated = true
    } = options;

    const bar = document.createElement('div');
    bar.className = 'progress-bar';
    if (animated) bar.classList.add('animated');

    bar.innerHTML = `
      <div class="progress-bar-fill" style="width: ${value}%; background-color: ${color}"></div>
      ${showLabel ? `<div class="progress-bar-label">${value}%</div>` : ''}
    `;

    if (container) {
      container.appendChild(bar);
    }

    return bar;
  },

  // Update progress bar value
  update(bar, value, max = 100) {
    const fill = bar.querySelector('.progress-bar-fill');
    const label = bar.querySelector('.progress-bar-label');

    const percentage = Math.min(100, Math.max(0, (value / max) * 100));
    fill.style.width = `${percentage}%`;

    if (label) {
      label.textContent = `${Math.round(percentage)}%`;
    }
  }
};

// -----------------------------------------------------
// TOGGLE SWITCH
// -----------------------------------------------------
const toggleSwitch = {
  // Create a toggle switch
  create(options = {}) {
    const {
      checked = false,
      label = '',
      onChange = null
    } = options;

    const container = document.createElement('div');
    container.className = 'toggle-switch-container';

    container.innerHTML = `
      ${label ? `<label class="toggle-switch-label">${label}</label>` : ''}
      <label class="toggle-switch">
        <input type="checkbox" class="toggle-switch-input" ${checked ? 'checked' : ''}>
        <span class="toggle-switch-slider"></span>
      </label>
    `;

    const input = container.querySelector('.toggle-switch-input');

    if (onChange) {
      input.addEventListener('change', (e) => {
        onChange(e.target.checked);
      });
    }

    return {
      element: container,
      input: input,
      getValue: () => input.checked,
      setValue: (value) => { input.checked = value; }
    };
  }
};

// -----------------------------------------------------
// RATING SYSTEM
// -----------------------------------------------------
const ratingSystem = {
  // Create a rating component
  create(options = {}) {
    const {
      rating = 0,
      max = 5,
      readonly = false,
      onChange = null
    } = options;

    const container = document.createElement('div');
    container.className = 'rating-container';

    for (let i = 1; i <= max; i++) {
      const star = document.createElement('span');
      star.className = 'rating-star';
      star.innerHTML = i <= rating ? '★' : '☆';
      star.dataset.value = i;

      if (!readonly) {
        star.addEventListener('click', () => {
          this.update(container, i);
          if (onChange) onChange(i);
        });

        star.addEventListener('mouseenter', () => {
          this.preview(container, i);
        });

        star.addEventListener('mouseleave', () => {
          this.preview(container, rating);
        });
      }

      container.appendChild(star);
    }

    return {
      element: container,
      getValue: () => parseInt(container.dataset.rating || 0),
      setValue: (value) => this.update(container, value)
    };
  },

  // Update rating display
  update(container, rating) {
    container.dataset.rating = rating;
    const stars = container.querySelectorAll('.rating-star');
    stars.forEach((star, index) => {
      star.innerHTML = index < rating ? '★' : '☆';
    });
  },

  // Preview rating on hover
  preview(container, rating) {
    const stars = container.querySelectorAll('.rating-star');
    stars.forEach((star, index) => {
      star.innerHTML = index < rating ? '★' : '☆';
    });
  }
};

// Initialize all enhanced UI components when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  notificationSystem.initialize();
  tooltipSystem.initialize();
});
