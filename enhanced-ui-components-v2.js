// Enhanced UI Components V2
// Advanced user interface components

// ============================================
// PROGRESS INDICATORS
// ============================================

class ProgressIndicator {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      color: options.color || '#3b82f6',
      backgroundColor: options.backgroundColor || '#e5e7eb',
      height: options.height || '4px',
      borderRadius: options.borderRadius || '2px',
      animationDuration: options.animationDuration || '300ms',
      ...options
    };

    this.progress = 0;
    this.element = this.create();
  }

  create() {
    const wrapper = document.createElement('div');
    wrapper.className = 'progress-indicator-wrapper';
    wrapper.style.cssText = `
      width: 100%;
      height: ${this.options.height};
      background-color: ${this.options.backgroundColor};
      border-radius: ${this.options.borderRadius};
      overflow: hidden;
      position: relative;
    `;

    const bar = document.createElement('div');
    bar.className = 'progress-indicator-bar';
    bar.style.cssText = `
      width: 0%;
      height: 100%;
      background-color: ${this.options.color};
      border-radius: ${this.options.borderRadius};
      transition: width ${this.options.animationDuration} ease-out;
    `;

    wrapper.appendChild(bar);
    this.container.appendChild(wrapper);

    this.barElement = bar;
    return wrapper;
  }

  setProgress(value) {
    this.progress = Math.max(0, Math.min(100, value));
    this.barElement.style.width = `${this.progress}%`;
  }

  getProgress() {
    return this.progress;
  }

  reset() {
    this.setProgress(0);
  }

  destroy() {
    this.element.remove();
  }
}

// ============================================
// LOADING SPINNER
// ============================================

class LoadingSpinner {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      size: options.size || '40px',
      color: options.color || '#3b82f6',
      borderWidth: options.borderWidth || '3px',
      speed: options.speed || '1s',
      ...options
    };

    this.element = this.create();
  }

  create() {
    const spinner = document.createElement('div');
    spinner.className = 'loading-spinner';
    spinner.style.cssText = `
      width: ${this.options.size};
      height: ${this.options.size};
      border: ${this.options.borderWidth} solid ${this.options.color};
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin ${this.options.speed} linear infinite;
    `;

    this.container.appendChild(spinner);
    return spinner;
  }

  show() {
    this.element.style.display = 'block';
  }

  hide() {
    this.element.style.display = 'none';
  }

  destroy() {
    this.element.remove();
  }
}

// ============================================
// MODAL DIALOG
// ============================================

class ModalDialog {
  constructor(options = {}) {
    this.options = {
      title: options.title || '',
      content: options.content || '',
      buttons: options.buttons || [],
      closable: options.closable !== false,
      closeOnOverlay: options.closeOnOverlay !== false,
      className: options.className || '',
      onOpen: options.onOpen,
      onClose: options.onClose,
      ...options
    };

    this.element = this.create();
    this.isOpen = false;
  }

  create() {
    const overlay = document.createElement('div');
    overlay.className = `modal-overlay ${this.options.className}`;
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.3s ease, visibility 0.3s ease;
    `;

    const modal = document.createElement('div');
    modal.className = 'modal-dialog';
    modal.style.cssText = `
      background: white;
      border-radius: 8px;
      padding: 24px;
      max-width: 500px;
      width: 90%;
      max-height: 90vh;
      overflow-y: auto;
      transform: scale(0.9);
      transition: transform 0.3s ease;
    `;

    if (this.options.title) {
      const title = document.createElement('h2');
      title.className = 'modal-title';
      title.style.cssText = `
        margin: 0 0 16px 0;
        font-size: 24px;
        font-weight: 600;
      `;
      title.textContent = this.options.title;
      modal.appendChild(title);
    }

    if (this.options.content) {
      const content = document.createElement('div');
      content.className = 'modal-content';
      content.innerHTML = this.options.content;
      modal.appendChild(content);
    }

    if (this.options.buttons.length > 0) {
      const buttons = document.createElement('div');
      buttons.className = 'modal-buttons';
      buttons.style.cssText = `
        display: flex;
        gap: 12px;
        justify-content: flex-end;
        margin-top: 24px;
      `;

      this.options.buttons.forEach(button => {
        const btn = document.createElement('button');
        btn.className = `modal-button ${button.className || ''}`;
        btn.textContent = button.text;
        btn.style.cssText = `
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          background-color: ${button.primary ? '#3b82f6' : '#e5e7eb'};
          color: ${button.primary ? 'white' : '#1f2937'};
        `;

        btn.addEventListener('click', () => {
          if (button.onClick) button.onClick();
          if (button.closeOnClick !== false) this.close();
        });

        buttons.appendChild(btn);
      });

      modal.appendChild(buttons);
    }

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    this.overlayElement = overlay;
    this.modalElement = modal;

    if (this.options.closable) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay && this.options.closeOnOverlay) {
          this.close();
        }
      });
    }

    return overlay;
  }

  open() {
    this.isOpen = true;
    this.overlayElement.style.opacity = '1';
    this.overlayElement.style.visibility = 'visible';
    this.modalElement.style.transform = 'scale(1)';

    if (this.options.onOpen) {
      this.options.onOpen();
    }
  }

  close() {
    this.isOpen = false;
    this.overlayElement.style.opacity = '0';
    this.overlayElement.style.visibility = 'hidden';
    this.modalElement.style.transform = 'scale(0.9)';

    if (this.options.onClose) {
      this.options.onClose();
    }
  }

  destroy() {
    this.element.remove();
  }
}

// ============================================
// TOOLTIP
// ============================================

class Tooltip {
  constructor(element, content, options = {}) {
    this.element = element;
    this.content = content;
    this.options = {
      position: options.position || 'top',
      delay: options.delay || 200,
      className: options.className || '',
      ...options
    };

    this.tooltip = null;
    this.showTimeout = null;
    this.hideTimeout = null;

    this.setup();
  }

  setup() {
    this.element.addEventListener('mouseenter', () => {
      this.showTimeout = setTimeout(() => this.show(), this.options.delay);
    });

    this.element.addEventListener('mouseleave', () => {
      clearTimeout(this.showTimeout);
      this.hideTimeout = setTimeout(() => this.hide(), this.options.delay);
    });
  }

  show() {
    if (this.tooltip) return;

    const tooltip = document.createElement('div');
    tooltip.className = `tooltip ${this.options.className}`;
    tooltip.textContent = this.content;
    tooltip.style.cssText = `
      position: fixed;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      pointer-events: none;
      z-index: 10000;
      white-space: nowrap;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      opacity: 0;
      transition: opacity 0.2s ease;
    `;

    document.body.appendChild(tooltip);
    this.position(tooltip);

    requestAnimationFrame(() => {
      tooltip.style.opacity = '1';
    });

    this.tooltip = tooltip;
  }

  hide() {
    if (!this.tooltip) return;

    this.tooltip.style.opacity = '0';
    setTimeout(() => {
      if (this.tooltip) {
        this.tooltip.remove();
        this.tooltip = null;
      }
    }, 200);
  }

  position(tooltip) {
    const rect = this.element.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();

    let top, left;

    switch (this.options.position) {
      case 'top':
        top = rect.top - tooltipRect.height - 8;
        left = rect.left + (rect.width - tooltipRect.width) / 2;
        break;
      case 'bottom':
        top = rect.bottom + 8;
        left = rect.left + (rect.width - tooltipRect.width) / 2;
        break;
      case 'left':
        top = rect.top + (rect.height - tooltipRect.height) / 2;
        left = rect.left - tooltipRect.width - 8;
        break;
      case 'right':
        top = rect.top + (rect.height - tooltipRect.height) / 2;
        left = rect.right + 8;
        break;
    }

    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;
  }

  updateContent(content) {
    this.content = content;
    if (this.tooltip) {
      this.tooltip.textContent = content;
      this.position(this.tooltip);
    }
  }

  destroy() {
    clearTimeout(this.showTimeout);
    clearTimeout(this.hideTimeout);
    this.hide();
  }
}

// ============================================
// DROPDOWN MENU
// ============================================

class DropdownMenu {
  constructor(trigger, options = {}) {
    this.trigger = trigger;
    this.options = {
      items: options.items || [],
      align: options.align || 'left',
      className: options.className || '',
      onSelect: options.onSelect,
      ...options
    };

    this.menu = null;
    this.isOpen = false;

    this.setup();
  }

  setup() {
    this.trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggle();
    });

    document.addEventListener('click', () => {
      if (this.isOpen) this.close();
    });
  }

  create() {
    const menu = document.createElement('div');
    menu.className = `dropdown-menu ${this.options.className}`;
    menu.style.cssText = `
      position: absolute;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      padding: 8px 0;
      min-width: 180px;
      z-index: 10000;
      opacity: 0;
      visibility: hidden;
      transform: translateY(-10px);
      transition: all 0.2s ease;
    `;

    this.options.items.forEach(item => {
      const menuItem = document.createElement('div');
      menuItem.className = 'dropdown-menu-item';
      menuItem.style.cssText = `
        padding: 8px 16px;
        cursor: pointer;
        font-size: 14px;
        color: #1f2937;
        transition: background-color 0.15s ease;
      `;

      if (item.icon) {
        const icon = document.createElement('span');
        icon.className = 'dropdown-menu-item-icon';
        icon.style.cssText = `
          margin-right: 8px;
          font-size: 16px;
        `;
        icon.textContent = item.icon;
        menuItem.appendChild(icon);
      }

      const text = document.createElement('span');
      text.textContent = item.text;
      menuItem.appendChild(text);

      menuItem.addEventListener('mouseenter', () => {
        menuItem.style.backgroundColor = '#f3f4f6';
      });

      menuItem.addEventListener('mouseleave', () => {
        menuItem.style.backgroundColor = 'transparent';
      });

      menuItem.addEventListener('click', () => {
        if (this.options.onSelect) {
          this.options.onSelect(item);
        }
        this.close();
      });

      menu.appendChild(menuItem);
    });

    return menu;
  }

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  open() {
    if (!this.menu) {
      this.menu = this.create();
      document.body.appendChild(this.menu);
    }

    const rect = this.trigger.getBoundingClientRect();
    const menuRect = this.menu.getBoundingClientRect();

    let left;
    if (this.options.align === 'left') {
      left = rect.left;
    } else if (this.options.align === 'right') {
      left = rect.right - menuRect.width;
    } else {
      left = rect.left + (rect.width - menuRect.width) / 2;
    }

    this.menu.style.top = `${rect.bottom + 8}px`;
    this.menu.style.left = `${left}px`;
    this.menu.style.opacity = '1';
    this.menu.style.visibility = 'visible';
    this.menu.style.transform = 'translateY(0)';

    this.isOpen = true;
  }

  close() {
    if (!this.menu) return;

    this.menu.style.opacity = '0';
    this.menu.style.visibility = 'hidden';
    this.menu.style.transform = 'translateY(-10px)';

    this.isOpen = false;
  }

  destroy() {
    if (this.menu) {
      this.menu.remove();
      this.menu = null;
    }
  }
}

// ============================================
// EXPORT
// ============================================

window.ProgressIndicator = ProgressIndicator;
window.LoadingSpinner = LoadingSpinner;
window.ModalDialog = ModalDialog;
window.Tooltip = Tooltip;
window.DropdownMenu = DropdownMenu;
