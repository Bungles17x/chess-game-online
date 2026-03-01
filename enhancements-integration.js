// Enhancements Integration
// This file integrates all game enhancements with the main game logic

// ============================================
// Initialize Enhancements
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  // Initialize timer display
  initializeTimerDisplay();

  // Initialize control buttons
  initializeControlButtons();

  // Initialize statistics display
  initializeStatisticsDisplay();

  // Initialize keyboard shortcuts help
  initializeShortcutsHelp();

  // Hook into game events
  hookIntoGameEvents();
});

// ============================================
// Timer Display Initialization
// ============================================

function initializeTimerDisplay() {
  const sidePanel = document.querySelector('.side-panel');
  if (!sidePanel) return;

  // Create timer container
  const timerContainer = document.createElement('div');
  timerContainer.className = 'timer-container';
  timerContainer.innerHTML = `
    <div class="timer" id="white-timer">
      <div class="timer-label">White</div>
      <div class="timer-display">10:00</div>
    </div>
    <div class="timer" id="black-timer">
      <div class="timer-label">Black</div>
      <div class="timer-display">10:00</div>
    </div>
  `;

  sidePanel.insertBefore(timerContainer, sidePanel.firstChild);

  // Add time control selector
  const timeControlDiv = document.createElement('div');
  timeControlDiv.className = 'time-control-selector';
  timeControlDiv.innerHTML = `
    <label for="time-control">Time Control:</label>
    <select id="time-control">
      <option value="1|0">Bullet (1+0)</option>
      <option value="2|1">Bullet (2+1)</option>
      <option value="3|0">Blitz (3+0)</option>
      <option value="3|2">Blitz (3+2)</option>
      <option value="5|0">Blitz (5+0)</option>
      <option value="5|3">Blitz (5+3)</option>
      <option value="10|0" selected>Rapid (10+0)</option>
      <option value="10|5">Rapid (10+5)</option>
      <option value="15|10">Rapid (15+10)</option>
      <option value="30|0">Classical (30+0)</option>
    </select>
  `;

  sidePanel.insertBefore(timeControlDiv, timerContainer.nextSibling);

  // Handle time control changes
  document.getElementById('time-control').addEventListener('change', (e) => {
    chessTimer.setTimeControl(e.target.value);
  });
}

// ============================================
// Control Buttons Initialization
// ============================================

function initializeControlButtons() {
  const sidePanel = document.querySelector('.side-panel');
  if (!sidePanel) return;

  // Create controls container
  const controlsContainer = document.createElement('div');
  controlsContainer.className = 'controls-container';
  controlsContainer.innerHTML = `
    <button class="control-btn undo-btn" id="undo-btn" title="Undo move (Z)">
      ↩ Undo
    </button>
    <button class="control-btn redo-btn" id="redo-btn" title="Redo move (Y)">
      ↪ Redo
    </button>
    <button class="control-btn hint-btn" id="hint-btn" title="Show hint (H)">
      💡 Hint
    </button>
    <button class="control-btn save-btn" id="save-btn" title="Save game (S)">
      💾 Save
    </button>
    <button class="control-btn" id="load-btn" title="Load game">
      📂 Load
    </button>
    <button class="control-btn" id="shortcuts-btn" title="Keyboard shortcuts">
      ⌨️ Shortcuts
    </button>
  `;

  sidePanel.appendChild(controlsContainer);

  // Add event listeners
  document.getElementById('undo-btn').addEventListener('click', () => {
    if (undoRedo.undo()) {
      popup('Move undone', 'blue');
    }
  });

  document.getElementById('redo-btn').addEventListener('click', () => {
    if (undoRedo.redo()) {
      popup('Move redone', 'blue');
    }
  });

  document.getElementById('hint-btn').addEventListener('click', () => {
    hintSystem.showHint();
  });

  document.getElementById('save-btn').addEventListener('click', () => {
    keyboardShortcuts.saveGame();
  });

  document.getElementById('load-btn').addEventListener('click', () => {
    keyboardShortcuts.loadGame();
  });

  document.getElementById('shortcuts-btn').addEventListener('click', () => {
    const help = document.querySelector('.shortcuts-help');
    help.classList.toggle('show');
  });
}

// ============================================
// Statistics Display Initialization
// ============================================

function initializeStatisticsDisplay() {
  const sidePanel = document.querySelector('.side-panel');
  if (!sidePanel) return;

  // Create stats container
  const statsContainer = document.createElement('div');
  statsContainer.className = 'stats-container';
  statsContainer.id = 'game-stats';
  statsContainer.innerHTML = `
    <div class="stat-item">
      <span class="stat-label">Games</span>
      <span class="stat-value">0</span>
    </div>
    <div class="stat-item">
      <span class="stat-label">Wins</span>
      <span class="stat-value">0</span>
    </div>
    <div class="stat-item">
      <span class="stat-label">Losses</span>
      <span class="stat-value">0</span>
    </div>
    <div class="stat-item">
      <span class="stat-label">Draws</span>
      <span class="stat-value">0</span>
    </div>
    <div class="stat-item">
      <span class="stat-label">Win Rate</span>
      <span class="stat-value">0%</span>
    </div>
    <div class="stat-item">
      <span class="stat-label">Best Streak</span>
      <span class="stat-value">0</span>
    </div>
  `;

  sidePanel.appendChild(statsContainer);

  // Load and display initial stats
  const stats = new GameStatistics();
  stats.displayStats();
}

// ============================================
// Keyboard Shortcuts Help Initialization
// ============================================

function initializeShortcutsHelp() {
  // Create shortcuts help modal
  const shortcutsHelp = document.createElement('div');
  shortcutsHelp.className = 'shortcuts-help';
  shortcutsHelp.innerHTML = `
    <h3>⌨️ Keyboard Shortcuts</h3>
    <div class="shortcuts-list">
      <div class="shortcut-item">
        <span class="shortcut-key">Z</span>
        <span class="shortcut-description">Undo move</span>
      </div>
      <div class="shortcut-item">
        <span class="shortcut-key">Y</span>
        <span class="shortcut-description">Redo move</span>
      </div>
      <div class="shortcut-item">
        <span class="shortcut-key">H</span>
        <span class="shortcut-description">Show hint</span>
      </div>
      <div class="shortcut-item">
        <span class="shortcut-key">R</span>
        <span class="shortcut-description">Reset game</span>
      </div>
      <div class="shortcut-item">
        <span class="shortcut-key">S</span>
        <span class="shortcut-description">Save game</span>
      </div>
      <div class="shortcut-item">
        <span class="shortcut-key">←</span>
        <span class="shortcut-description">Previous move</span>
      </div>
      <div class="shortcut-item">
        <span class="shortcut-key">→</span>
        <span class="shortcut-description">Next move</span>
      </div>
      <div class="shortcut-item">
        <span class="shortcut-key">Esc</span>
        <span class="shortcut-description">Hide hint</span>
      </div>
    </div>
    <button class="control-btn" style="margin-top: 15px; width: 100%;" onclick="this.parentElement.classList.remove('show')">
      Close
    </button>
  `;

  document.body.appendChild(shortcutsHelp);
}

// ============================================
// Hook Into Game Events
// ============================================

function hookIntoGameEvents() {
  // Hook into move execution
  const originalMove = game.move.bind(game);
  game.move = function(move) {
    const result = originalMove(move);
    if (result) {
      // Save state for undo/redo
      undoRedo.saveState();

      // Update timer
      if (result.captured) {
        gameStats.recordCapture();
      }

      // Start timer if not running
      if (!chessTimer.isRunning) {
        chessTimer.start();
      }

      // Add increment after move
      chessTimer.addIncrement(result.color);
    }
    return result;
  };

  // Hook into game over
  const originalGameOver = game.game_over.bind(game);
  game.game_over = function() {
    const isOver = originalGameOver();
    if (isOver) {
      chessTimer.stop();

      // Determine game result
      if (game.in_checkmate()) {
        const winner = game.turn() === 'w' ? 'Black' : 'White';
        popup(`Checkmate! ${winner} wins!`, 'green');
        gameStats.recordGame(winner === 'White' ? 'win' : 'loss');
      } else if (game.in_draw()) {
        popup('Draw!', 'yellow');
        gameStats.recordGame('draw');
      } else {
        popup('Game Over', 'yellow');
      }
    }
    return isOver;
  };

  // Hook into board reset
  const originalInitBoard = initBoard;
  initBoard = function() {
    originalInitBoard();
    chessTimer.reset();
    undoRedo.clear();
    hintSystem.hideHint();
  };
}

// ============================================
// Update Timer Display on Turn Change
// ============================================

const originalUpdateTurnIndicator = updateTurnIndicator;
updateTurnIndicator = function() {
  originalUpdateTurnIndicator();

  const turn = game.turn();
  const whiteTimer = document.getElementById('white-timer');
  const blackTimer = document.getElementById('black-timer');

  if (whiteTimer && blackTimer) {
    whiteTimer.classList.toggle('active', turn === 'w');
    blackTimer.classList.toggle('active', turn === 'b');
  }
};

// ============================================
// Update Control Buttons State
// ============================================

function updateControlButtonsState() {
  const undoBtn = document.getElementById('undo-btn');
  const redoBtn = document.getElementById('redo-btn');

  if (undoBtn) {
    undoBtn.disabled = !undoRedo.canUndo();
  }

  if (redoBtn) {
    redoBtn.disabled = !undoRedo.canRedo();
  }
}

// Call updateControlButtonsState after each move
setInterval(updateControlButtonsState, 1000);

// ============================================
// Theme Support
// ============================================

function applyTheme(theme) {
  const timerContainer = document.querySelector('.timer-container');
  if (timerContainer) {
    if (theme === 'dark') {
      timerContainer.classList.add('dark-theme');
    } else {
      timerContainer.classList.remove('dark-theme');
    }
  }
}

// Listen for theme changes
document.getElementById('theme-toggle')?.addEventListener('click', () => {
  const isDark = document.body.classList.contains('dark-mode');
  applyTheme(isDark ? 'dark' : 'light');
});

// Initialize theme on load
const isDark = document.body.classList.contains('dark-mode');
applyTheme(isDark ? 'dark' : 'light');
