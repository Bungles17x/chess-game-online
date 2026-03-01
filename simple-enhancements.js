// Simple Game Enhancements
// Easy-to-use features without complexity

// Timer, undo, redo, and hint functionality has been removed

// ============================================
// Simple Statistics
// ============================================

function getStats() {
  const saved = localStorage.getItem('simpleChessStats');
  return saved ? JSON.parse(saved) : {
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    draws: 0
  };
}

function saveStats(stats) {
  localStorage.setItem('simpleChessStats', JSON.stringify(stats));
}

function updateStats(result) {
  const stats = getStats();
  stats.gamesPlayed++;

  if (result === 'win') {
    stats.wins++;
  } else if (result === 'loss') {
    stats.losses++;
  } else {
    stats.draws++;
  }

  saveStats(stats);
}

function displayStats() {
  const stats = getStats();
  const winRate = stats.gamesPlayed > 0 
    ? ((stats.wins / stats.gamesPlayed) * 100).toFixed(1) 
    : 0;

  const statsDiv = document.getElementById('simple-stats');
  if (!statsDiv) return;

  statsDiv.innerHTML = `
    <div class="stat-item">
      <span>Games: ${stats.gamesPlayed}</span>
    </div>
    <div class="stat-item">
      <span>Wins: ${stats.wins}</span>
    </div>
    <div class="stat-item">
      <span>Losses: ${stats.losses}</span>
    </div>
    <div class="stat-item">
      <span>Draws: ${stats.draws}</span>
    </div>
    <div class="stat-item">
      <span>Win Rate: ${winRate}%</span>
    </div>
  `;
}

// ============================================
// Initialize Simple Enhancements
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  // Add stats display to side panel
  const sidePanel = document.querySelector('.side-panel');
  if (sidePanel) {
    // Add stats display
    const statsDiv = document.createElement('div');
    statsDiv.className = 'simple-stats';
    statsDiv.id = 'simple-stats';
    sidePanel.appendChild(statsDiv);

    // Hook into game events for statistics
    const originalGameOver = game.game_over.bind(game);
    game.game_over = function() {
      const isOver = originalGameOver();
      if (isOver) {
        if (game.in_checkmate()) {
          const winner = game.turn() === 'w' ? 'Black' : 'White';
          updateStats(winner === 'White' ? 'win' : 'loss');
        } else if (game.in_draw()) {
          updateStats('draw');
        }
        displayStats();
      }
      return isOver;
    };

    const originalInitBoard = initBoard;
    initBoard = function() {
      originalInitBoard();
      displayStats();
    };
  }
});
