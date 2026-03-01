
// Practice Tutorial Mode with Recommended Moves

// ========================================
// PRACTICE TUTORIAL STATE MANAGEMENT
// ========================================

const PracticeTutorial = {
  active: false,
  currentStep: 0,
  currentTutorial: null,
  currentScenario: null,
  tutorials: {
    openings: {
      title: "Opening Practice",
      steps: [
        {
          title: "Italian Game - First Moves",
          content: "The Italian Game is a classic opening. Start with 1. e4 (move your pawn from e2 to e4). This controls the center and opens lines for your pieces.",
          recommendedMove: "e2e4",
          highlight: ["e2", "e4"]
        },
        {
          title: "Italian Game - Knight Development",
          content: "Now develop your Knight with 2. Nf3 (move knight from g1 to f3). This attacks the e5 pawn and prepares for castling.",
          recommendedMove: "g1f3",
          highlight: ["g1", "f3"]
        },
        {
          title: "Italian Game - Bishop Development",
          content: "Develop your Bishop with 3. Bc4 (move bishop from f1 to c4). This aims at the weak f7 square and controls the center.",
          recommendedMove: "f1c4",
          highlight: ["f1", "c4"]
        },
        {
          title: "Italian Game - Castling",
          content: "Castle your King to safety with 4. O-O (short castling). This moves your King to g1 and Rook to f1.",
          recommendedMove: "e1g1",
          highlight: ["e1", "g1"]
        },
        {
          title: "Spanish Game - First Moves",
          content: "The Spanish Game (Ruy Lopez) is another classic. Start with 1. e4 to control the center.",
          recommendedMove: "e2e4",
          highlight: ["e2", "e4"]
        },
        {
          title: "Spanish Game - Knight Development",
          content: "Develop your Knight with 2. Nf3, attacking the e5 pawn.",
          recommendedMove: "g1f3",
          highlight: ["g1", "f3"]
        },
        {
          title: "Spanish Game - Bishop to b5",
          content: "The characteristic move of the Spanish: 3. Bb5 (move bishop from f1 to b5). This puts pressure on the knight defending e5.",
          recommendedMove: "f1b5",
          highlight: ["f1", "b5"]
        }
      ]
    },
    tactics: {
      title: "Tactical Practice",
      steps: [
        {
          title: "Fork - Introduction",
          content: "A fork is when one piece attacks two or more pieces. Knights are excellent at forking. Try to find a fork in your games!",
          recommendedMove: null,
          highlight: []
        },
        {
          title: "Pin - Introduction",
          content: "A pin occurs when a piece cannot move without exposing a more valuable piece behind it. Bishops, Rooks, and Queens can create pins.",
          recommendedMove: null,
          highlight: []
        },
        {
          title: "Skewer - Introduction",
          content: "A skewer is similar to a pin, but the more valuable piece is in front. When it moves, the less valuable piece behind can be captured.",
          recommendedMove: null,
          highlight: []
        }
      ]
    },
    endgame: {
      title: "Endgame Practice",
      steps: [
        {
          title: "King and Pawn vs King",
          content: "In this basic endgame, you have a King and Pawn against the opponent's King. The key is to use your King to support the pawn's advance.",
          recommendedMove: null,
          highlight: []
        },
        {
          title: "Opposition",
          content: "The opposition is when two Kings face each other with one square between them. The player who doesn't have to move has the advantage.",
          recommendedMove: null,
          highlight: []
        },
        {
          title: "Rook Endgame Basics",
          content: "Rook endgames are common. Place your Rook behind passed pawns and keep your King active.",
          recommendedMove: null,
          highlight: []
        },
        {
          title: "Lucena Position",
          content: "The Lucena position is a winning technique where you build a bridge to escape your King from the edge.",
          recommendedMove: null,
          highlight: []
        },
        {
          title: "Philidor Position",
          content: "The Philidor position is a drawing technique against a Rook and Pawn. Keep your Rook on the third rank.",
          recommendedMove: null,
          highlight: []
        }
      ]
    },
    puzzle: {
      title: "Puzzle Practice",
      steps: [
        {
          title: "Mate in 1 - Easy",
          content: "Find the checkmate in one move! Look for your most powerful pieces and how they can attack the King.",
          recommendedMove: null,
          highlight: []
        },
        {
          title: "Mate in 2 - Medium",
          content: "Find the checkmate in two moves! You might need to set up a discovered attack or double check.",
          recommendedMove: null,
          highlight: []
        },
        {
          title: "Tactical Puzzle - Fork",
          content: "Find the fork that wins material! Knights are great for creating forks.",
          recommendedMove: null,
          highlight: []
        },
        {
          title: "Tactical Puzzle - Pin",
          content: "Use a pin to win material! Pin a piece to the King or Queen.",
          recommendedMove: null,
          highlight: []
        },
        {
          title: "Tactical Puzzle - Skewer",
          content: "Use a skewer to win material! Attack a valuable piece with a less valuable one behind it.",
          recommendedMove: null,
          highlight: []
        },
        {
          title: "Tactical Puzzle - Sacrifice",
          content: "Sometimes you need to sacrifice material to gain a positional advantage or force checkmate!",
          recommendedMove: null,
          highlight: []
        }
      ]
    }
  }
};

// ========================================
// PRACTICE TUTORIAL UI
// ========================================

function createPracticeTutorialUI() {
  // Check if practice tutorial section already exists
  const practiceSection = document.getElementById("practice-tutorial-section");

  if (practiceSection) {
    // Practice tutorial section already exists, just add event listeners
    const openingsBtn = document.getElementById("practice-openings-btn");
    const tacticsBtn = document.getElementById("practice-tactics-btn");

    console.log("Practice tutorial section found, buttons:", { openingsBtn, tacticsBtn });

    if (openingsBtn) {
      openingsBtn.addEventListener("click", () => {
        console.log("Openings practice button clicked");
        startPracticeTutorial("openings");
      });
    }
    if (tacticsBtn) {
      tacticsBtn.addEventListener("click", () => {
        console.log("Tactics practice button clicked");
        startPracticeTutorial("tactics");
      });
    }
    return;
  }

  // Add practice tutorial section to settings page
  const tutorialSection = document.getElementById("tutorial-section");
  if (tutorialSection) {
    const practiceTutorialSection = document.createElement("div");
    practiceTutorialSection.className = "settings-subsection";
    practiceTutorialSection.id = "practice-tutorial-section";
    practiceTutorialSection.innerHTML = `
      <h3>Practice Mode</h3>
      <div class="practice-tutorial-options">
        <button id="practice-openings-btn" class="tutorial-btn">
          <span class="tutorial-icon">🎯</span>
          <span>Opening Practice</span>
        </button>
        <button id="practice-tactics-btn" class="tutorial-btn">
          <span class="tutorial-icon">⚔️</span>
          <span>Tactical Practice</span>
        </button>
        <button id="practice-endgame-btn" class="tutorial-btn">
          <span class="tutorial-icon">👑</span>
          <span>Endgame Practice</span>
        </button>
        <button id="practice-puzzle-btn" class="tutorial-btn">
          <span class="tutorial-icon">🧩</span>
          <span>Puzzle Practice</span>
        </button>
      </div>
    `;

    tutorialSection.appendChild(practiceTutorialSection);

    // Add event listeners
    document.getElementById("practice-openings-btn").addEventListener("click", () => startPracticeTutorial("openings"));
    document.getElementById("practice-tactics-btn").addEventListener("click", () => startPracticeTutorial("tactics"));
    document.getElementById("practice-endgame-btn").addEventListener("click", () => startPracticeTutorial("endgame"));
    document.getElementById("practice-puzzle-btn").addEventListener("click", () => startPracticeTutorial("puzzle"));

    console.log("Practice tutorial section created");
  }
}

// ========================================
// PRACTICE TUTORIAL OVERLAY
// ========================================

function createPracticeTutorialOverlay() {
  console.log("Creating practice tutorial overlay...");

  const overlay = document.createElement("div");
  overlay.id = "practice-tutorial-overlay";
  overlay.className = "tutorial-overlay";
  overlay.innerHTML = `
    <div class="tutorial-card practice-card">
      <div class="tutorial-header">
        <h2 id="practice-title"></h2>
        <button class="tutorial-close" aria-label="Close tutorial">&times;</button>
      </div>
      <div class="tutorial-content">
        <p id="practice-text"></p>
        <div id="recommended-move" class="recommended-move hidden">
          <span class="move-label">Recommended Move:</span>
          <span id="move-display" class="move-display"></span>
        </div>
      </div>
      <div class="tutorial-navigation">
        <button id="practice-prev" class="tutorial-nav-btn">Previous</button>
        <div class="tutorial-dots" id="practice-dots"></div>
        <button id="practice-next" class="tutorial-nav-btn">Next</button>
      </div>
      <div class="tutorial-progress-text">
        <span id="practice-step-num">1</span> / <span id="practice-total-steps">1</span>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  console.log("Practice tutorial overlay created");

  // Add event listeners
  overlay.querySelector(".tutorial-close").addEventListener("click", closePracticeTutorial);
  document.getElementById("practice-prev").addEventListener("click", prevPracticeStep);
  document.getElementById("practice-next").addEventListener("click", nextPracticeStep);
}

// ========================================
// PRACTICE TUTORIAL CONTROLS
// ========================================

function startPracticeTutorial(tutorialId) {
  const tutorial = PracticeTutorial.tutorials[tutorialId];
  if (!tutorial) {
    console.error("Practice tutorial not found:", tutorialId);
    return;
  }

  console.log("Starting practice tutorial:", tutorial.title);

  PracticeTutorial.active = true;
  PracticeTutorial.currentStep = 0;
  PracticeTutorial.currentTutorial = tutorialId;

  // Create overlay if it doesn't exist
  let overlay = document.getElementById("practice-tutorial-overlay");
  if (!overlay) {
    createPracticeTutorialOverlay();
    overlay = document.getElementById("practice-tutorial-overlay");
  }

  if (!overlay) {
    console.error("Practice tutorial overlay not found after creation");
    return;
  }

  // Wait a tick for the DOM to be ready
  setTimeout(() => {
    updatePracticeTutorialUI();
    overlay.classList.add("active");
  }, 0);
}

function closePracticeTutorial() {
  PracticeTutorial.active = false;
  const overlay = document.getElementById("practice-tutorial-overlay");
  if (overlay) {
    overlay.classList.remove("active");
  }

  // Remove all highlights
  document.querySelectorAll(".practice-highlight").forEach(el => {
    el.classList.remove("practice-highlight");
  });
}

function nextPracticeStep() {
  const tutorial = PracticeTutorial.tutorials[PracticeTutorial.currentTutorial];
  if (!tutorial) return;

  if (PracticeTutorial.currentStep < tutorial.steps.length - 1) {
    PracticeTutorial.currentStep++;
    updatePracticeTutorialUI();
  } else {
    // Tutorial complete
    showPracticeComplete();
  }
}

function prevPracticeStep() {
  if (PracticeTutorial.currentStep > 0) {
    PracticeTutorial.currentStep--;
    updatePracticeTutorialUI();
  }
}

function updatePracticeTutorialUI() {
  const tutorial = PracticeTutorial.tutorials[PracticeTutorial.currentTutorial];
  if (!tutorial) {
    console.error("Practice tutorial not found:", PracticeTutorial.currentTutorial);
    return;
  }

  const step = tutorial.steps[PracticeTutorial.currentStep];
  if (!step) {
    console.error("Practice step not found:", PracticeTutorial.currentStep);
    return;
  }

  console.log("Updating practice tutorial UI for step:", step.title);

  // Get elements
  const titleEl = document.getElementById("practice-title");
  const textEl = document.getElementById("practice-text");
  const stepNumEl = document.getElementById("practice-step-num");
  const totalStepsEl = document.getElementById("practice-total-steps");
  const recommendedMoveEl = document.getElementById("recommended-move");
  const moveDisplayEl = document.getElementById("move-display");

  console.log("Elements found:", { titleEl, textEl, stepNumEl, totalStepsEl, recommendedMoveEl, moveDisplayEl });

  // Update content
  if (titleEl) titleEl.textContent = step.title;
  if (textEl) textEl.textContent = step.content;
  if (stepNumEl) stepNumEl.textContent = PracticeTutorial.currentStep + 1;
  if (totalStepsEl) totalStepsEl.textContent = tutorial.steps.length;

  // Update recommended move
  if (recommendedMoveEl && moveDisplayEl) {
    if (step.recommendedMove) {
      recommendedMoveEl.classList.remove("hidden");
      moveDisplayEl.textContent = step.recommendedMove;
    } else {
      recommendedMoveEl.classList.add("hidden");
    }
  }

  // Update navigation buttons
  const prevBtn = document.getElementById("practice-prev");
  const nextBtn = document.getElementById("practice-next");
  if (prevBtn) prevBtn.disabled = PracticeTutorial.currentStep === 0;
  if (nextBtn) nextBtn.textContent = PracticeTutorial.currentStep === tutorial.steps.length - 1 ? "Complete" : "Next";

  // Update dots
  const dotsContainer = document.getElementById("practice-dots");
  if (dotsContainer) {
    dotsContainer.innerHTML = "";
    tutorial.steps.forEach((_, index) => {
      const dot = document.createElement("div");
      dot.className = `tutorial-dot ${index === PracticeTutorial.currentStep ? "active" : ""}`;
      dotsContainer.appendChild(dot);
    });
  }

  // Remove old highlights
  document.querySelectorAll(".practice-highlight").forEach(el => {
    el.classList.remove("practice-highlight");
  });

  // Add new highlights
  if (step.highlight && step.highlight.length > 0) {
    step.highlight.forEach(square => {
      const squareEl = document.querySelector(`.square[data-square='${square}']`);
      if (squareEl) {
        squareEl.classList.add("practice-highlight");
      }
    });
  }
}

function showPracticeComplete() {
  const tutorial = PracticeTutorial.tutorials[PracticeTutorial.currentTutorial];
  if (!tutorial) return;

  const titleEl = document.getElementById("practice-title");
  const textEl = document.getElementById("practice-text");
  const recommendedMoveEl = document.getElementById("recommended-move");

  if (titleEl) titleEl.textContent = "Practice Complete!";
  if (textEl) textEl.textContent = `Congratulations! You've completed the ${tutorial.title}. Keep practicing to improve your chess skills!`;
  if (recommendedMoveEl) recommendedMoveEl.classList.add("hidden");

  // Hide navigation
  const prevBtn = document.getElementById("practice-prev");
  const nextBtn = document.getElementById("practice-next");
  if (prevBtn) prevBtn.style.display = "none";
  if (nextBtn) nextBtn.style.display = "none";

  // Remove all highlights
  document.querySelectorAll(".practice-highlight").forEach(el => {
    el.classList.remove("practice-highlight");
  });
}

// ========================================
// INITIALIZE PRACTICE TUTORIAL
// ========================================

function initializePracticeTutorial() {
  setTimeout(() => {
    createPracticeTutorialUI();
    console.log("Practice tutorial initialized");
  }, 500);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializePracticeTutorial);
} else {
  initializePracticeTutorial();
}

// Export for global access
window.PracticeTutorial = PracticeTutorial;
window.startPracticeTutorial = startPracticeTutorial;
