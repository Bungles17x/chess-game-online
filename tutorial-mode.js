// Tutorial Mode System

// ========================================
// TUTORIAL STATE MANAGEMENT
// ========================================

const TutorialMode = {
  active: false,
  currentStep: 0,
  completedSteps: new Set(),
  tutorials: {
    basics: {
      title: "Chess Basics",
      steps: [
        {
          title: "Welcome to Chess!",
          content: "Chess is a strategy game played on an 8x8 board. Each player starts with 16 pieces.",
          highlight: null,
          action: null
        },
        {
          title: "The Board",
          content: "The board has 64 squares alternating between light and dark colors. Files are labeled a-h, ranks 1-8.",
          highlight: ".chessboard",
          action: null
        },
        {
          title: "The King ♔",
          content: "The King is the most important piece. It can move one square in any direction. Protect your King at all costs!",
          highlight: ".piece[data-type='k'][data-color='w']",
          action: null
        },
        {
          title: "The Queen ♕",
          content: "The Queen is the most powerful piece. It can move any number of squares horizontally, vertically, or diagonally.",
          highlight: ".piece[data-type='q'][data-color='w']",
          action: null
        },
        {
          title: "The Rook ♖",
          content: "The Rook moves any number of squares horizontally or vertically. Great for controlling open files.",
          highlight: ".piece[data-type='r'][data-color='w']",
          action: null
        },
        {
          title: "The Bishop ♗",
          content: "The Bishop moves diagonally any number of squares. Each player starts with one light-squared and one dark-squared Bishop.",
          highlight: ".piece[data-type='b'][data-color='w']",
          action: null
        },
        {
          title: "The Knight ♘",
          content: "The Knight moves in an L-shape: two squares in one direction, then one square perpendicular. It can jump over other pieces!",
          highlight: ".piece[data-type='n'][data-color='w']",
          action: null
        },
        {
          title: "The Pawn ♙",
          content: "Pawns move forward one square (two on their first move). They capture diagonally forward. Pawns can promote when reaching the opposite end.",
          highlight: ".piece[data-type='p'][data-color='w']",
          action: null
        },
        {
          title: "Special Moves - Castling",
          content: "Castling is a special move involving the King and Rook. The King moves two squares toward a Rook, and the Rook jumps to the other side. Can only be done if neither piece has moved and no pieces are between them.",
          highlight: null,
          action: null
        },
        {
          title: "Special Moves - En Passant",
          content: "En Passant is a special pawn capture. When a pawn moves two squares from its starting position and lands beside an enemy pawn, the enemy pawn can capture it as if it had moved only one square.",
          highlight: null,
          action: null
        },
        {
          title: "Check and Checkmate",
          content: "When the King is under attack, it's in 'check'. You must get out of check. 'Checkmate' is when the King is in check with no legal moves - game over!",
          highlight: null,
          action: null
        },
        {
          title: "Winning the Game",
          content: "You win by checkmating your opponent's King, or if your opponent resigns. A draw can occur by stalemate, threefold repetition, or the 50-move rule.",
          highlight: null,
          action: null
        }
      ]
    },
    strategies: {
      title: "Basic Strategies",
      steps: [
        {
          title: "Control the Center",
          content: "The center squares (d4, d5, e4, e5) are crucial. Pieces in the center have more mobility and control more squares.",
          highlight: ".square[data-square='d4'], .square[data-square='d5'], .square[data-square='e4'], .square[data-square='e5']",
          action: null
        },
        {
          title: "Develop Your Pieces",
          content: "Move your Knights and Bishops early to active squares. Don't move the same piece multiple times in the opening.",
          highlight: ".piece[data-type='n'], .piece[data-type='b']",
          action: null
        },
        {
          title: "King Safety",
          content: "Castle early to get your King to safety behind pawn walls. Don't leave your King exposed in the center!",
          highlight: ".piece[data-type='k']",
          action: null
        },
        {
          title: "Connect Your Rooks",
          content: "Develop your pieces so your Rooks can see each other with no pieces between them. Connected Rooks are powerful.",
          highlight: ".piece[data-type='r']",
          action: null
        },
        {
          title: "Don't Blunder",
          content: "Always check for captures and threats before moving. Look at the whole board, not just your intended move.",
          highlight: null,
          action: null
        }
      ]
    }
  }
};

// ========================================
// TUTORIAL UI
// ========================================

function createTutorialUI() {
  // Create tutorial button in settings
  const settingsPanel = document.getElementById("settings-panel") || 
                       document.querySelector(".settings-panel") ||
                       document.querySelector("[data-settings]");

  if (settingsPanel) {
    const tutorialSection = document.createElement("div");
    tutorialSection.className = "settings-section tutorial-section";
    tutorialSection.innerHTML = `
      <h3>Tutorial Mode</h3>
      <div class="tutorial-options">
        <button id="tutorial-basics-btn" class="tutorial-btn">
          <span class="tutorial-icon">📚</span>
          <span>Learn Basics</span>
        </button>
        <button id="tutorial-strategies-btn" class="tutorial-btn">
          <span class="tutorial-icon">🎯</span>
          <span>Learn Strategies</span>
        </button>
      </div>
      <div class="tutorial-progress">
        <div class="progress-label">Progress</div>
        <div class="progress-bar">
          <div class="progress-fill" id="tutorial-progress"></div>
        </div>
      </div>
    `;
    settingsPanel.appendChild(tutorialSection);

    // Add event listeners
    document.getElementById("tutorial-basics-btn").addEventListener("click", () => startTutorial("basics"));
    document.getElementById("tutorial-strategies-btn").addEventListener("click", () => startTutorial("strategies"));
  }
}

// ========================================
// TUTORIAL OVERLAY
// ========================================

function createTutorialOverlay() {
  const overlay = document.createElement("div");
  overlay.id = "tutorial-overlay";
  overlay.className = "tutorial-overlay";
  overlay.innerHTML = `
    <div class="tutorial-card">
      <div class="tutorial-header">
        <h2 id="tutorial-title"></h2>
        <button class="tutorial-close" aria-label="Close tutorial">&times;</button>
      </div>
      <div class="tutorial-content">
        <p id="tutorial-text"></p>
      </div>
      <div class="tutorial-navigation">
        <button id="tutorial-prev" class="tutorial-nav-btn">Previous</button>
        <div class="tutorial-dots" id="tutorial-dots"></div>
        <button id="tutorial-next" class="tutorial-nav-btn">Next</button>
      </div>
      <div class="tutorial-progress-text">
        <span id="tutorial-step-num">1</span> / <span id="tutorial-total-steps">1</span>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Add event listeners
  overlay.querySelector(".tutorial-close").addEventListener("click", closeTutorial);
  document.getElementById("tutorial-prev").addEventListener("click", prevTutorialStep);
  document.getElementById("tutorial-next").addEventListener("click", nextTutorialStep);

  // Close on escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && TutorialMode.active) {
      closeTutorial();
    }
  });
}

// ========================================
// TUTORIAL CONTROLS
// ========================================

function startTutorial(tutorialId) {
  const tutorial = TutorialMode.tutorials[tutorialId];
  if (!tutorial) return;

  TutorialMode.active = true;
  TutorialMode.currentStep = 0;
  TutorialMode.currentTutorial = tutorialId;

  // Create overlay if it doesn't exist
  if (!document.getElementById("tutorial-overlay")) {
    createTutorialOverlay();
  }

  updateTutorialUI();
  document.getElementById("tutorial-overlay").classList.add("active");
}

function closeTutorial() {
  TutorialMode.active = false;
  const overlay = document.getElementById("tutorial-overlay");
  if (overlay) {
    overlay.classList.remove("active");
  }

  // Remove all highlights
  document.querySelectorAll(".tutorial-highlight").forEach(el => {
    el.classList.remove("tutorial-highlight");
  });
}

function nextTutorialStep() {
  const tutorial = TutorialMode.tutorials[TutorialMode.currentTutorial];
  if (!tutorial) return;

  if (TutorialMode.currentStep < tutorial.steps.length - 1) {
    TutorialMode.currentStep++;
    updateTutorialUI();
  } else {
    // Tutorial complete
    showTutorialComplete();
  }
}

function prevTutorialStep() {
  if (TutorialMode.currentStep > 0) {
    TutorialMode.currentStep--;
    updateTutorialUI();
  }
}

function updateTutorialUI() {
  const tutorial = TutorialMode.tutorials[TutorialMode.currentTutorial];
  if (!tutorial) return;

  const step = tutorial.steps[TutorialMode.currentStep];

  // Update content
  document.getElementById("tutorial-title").textContent = step.title;
  document.getElementById("tutorial-text").textContent = step.content;
  document.getElementById("tutorial-step-num").textContent = TutorialMode.currentStep + 1;
  document.getElementById("tutorial-total-steps").textContent = tutorial.steps.length;

  // Update navigation buttons
  document.getElementById("tutorial-prev").disabled = TutorialMode.currentStep === 0;
  document.getElementById("tutorial-next").textContent = 
    TutorialMode.currentStep === tutorial.steps.length - 1 ? "Complete" : "Next";

  // Update dots
  const dotsContainer = document.getElementById("tutorial-dots");
  dotsContainer.innerHTML = "";
  tutorial.steps.forEach((_, index) => {
    const dot = document.createElement("div");
    dot.className = `tutorial-dot ${index === TutorialMode.currentStep ? "active" : ""}`;
    dotsContainer.appendChild(dot);
  });

  // Remove old highlights
  document.querySelectorAll(".tutorial-highlight").forEach(el => {
    el.classList.remove("tutorial-highlight");
  });

  // Add new highlight
  if (step.highlight) {
    const highlighted = document.querySelectorAll(step.highlight);
    highlighted.forEach(el => {
      el.classList.add("tutorial-highlight");
    });
  }
}

function showTutorialComplete() {
  const tutorial = TutorialMode.tutorials[TutorialMode.currentTutorial];
  if (!tutorial) return;

  // Mark tutorial as complete
  TutorialMode.completedSteps.add(TutorialMode.currentTutorial);

  // Update progress
  updateTutorialProgress();

  // Show completion message
  const overlay = document.getElementById("tutorial-overlay");
  const content = overlay.querySelector(".tutorial-content");
  content.innerHTML = `
    <div class="tutorial-complete">
      <div class="complete-icon">✅</div>
      <h3>Tutorial Complete!</h3>
      <p>You've completed the ${tutorial.title} tutorial.</p>
      <button class="tutorial-btn tutorial-restart" data-tutorial="${TutorialMode.currentTutorial}">
        Review Tutorial
      </button>
    </div>
  `;

  // Hide navigation
  overlay.querySelector(".tutorial-navigation").style.display = "none";
  overlay.querySelector(".tutorial-progress-text").style.display = "none";

  // Add restart button listener
  content.querySelector(".tutorial-restart").addEventListener("click", () => {
    overlay.querySelector(".tutorial-navigation").style.display = "flex";
    overlay.querySelector(".tutorial-progress-text").style.display = "block";
    startTutorial(TutorialMode.currentTutorial);
  });
}

function updateTutorialProgress() {
  const total = Object.keys(TutorialMode.tutorials).length;
  const completed = TutorialMode.completedSteps.size;
  const percentage = (completed / total) * 100;

  const progressBar = document.getElementById("tutorial-progress");
  if (progressBar) {
    progressBar.style.width = `${percentage}%`;
  }
}

// ========================================
// INITIALIZATION
// ========================================

function initializeTutorialMode() {
  console.log("[Tutorial Mode] Initializing...");

  // Wait for settings panel to be available
  const checkInterval = setInterval(() => {
    const settingsPanel = document.getElementById("settings-panel") || 
                         document.querySelector(".settings-panel") ||
                         document.querySelector("[data-settings]");

    if (settingsPanel) {
      clearInterval(checkInterval);
      createTutorialUI();
      console.log("[Tutorial Mode] Initialized successfully!");
    }
  }, 500);

  // Timeout after 10 seconds
  setTimeout(() => clearInterval(checkInterval), 10000);
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeTutorialMode);
} else {
  initializeTutorialMode();
}

// Export for global access
window.TutorialMode = TutorialMode;
window.startTutorial = startTutorial;
window.closeTutorial = closeTutorial;
