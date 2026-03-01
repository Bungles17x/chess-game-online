
// Interactive Practice Mode with Move Validation

// ========================================
// INTERACTIVE PRACTICE STATE
// ========================================

const InteractivePractice = {
  active: false,
  currentScenario: null,
  currentStep: 0,
  recommendedMove: null,
  moveHistory: [],
  scenarios: {
    italianOpening: {
      title: "Italian Game",
      description: "Learn the classic Italian Game opening",
      steps: [
        {
          recommendedMove: "e2e4",
          explanation: "Start with 1. e4 to control the center and open lines for your pieces.",
          fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
        },
        {
          recommendedMove: "g1f3",
          explanation: "Develop your Knight to f3, attacking the e5 pawn and preparing for castling.",
          fen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"
        },
        {
          recommendedMove: "f1c4",
          explanation: "Develop your Bishop to c4, aiming at the weak f7 square and controlling the center.",
          fen: "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 2"
        },
        {
          recommendedMove: "e1g1",
          explanation: "Castle your King to safety with O-O (short castling).",
          fen: "r1bqk1nr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3"
        }
      ]
    },
    spanishOpening: {
      title: "Spanish Game",
      description: "Master the Ruy Lopez opening",
      steps: [
        {
          recommendedMove: "e2e4",
          explanation: "Start with 1. e4 to control the center.",
          fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
        },
        {
          recommendedMove: "g1f3",
          explanation: "Develop your Knight to f3, attacking the e5 pawn.",
          fen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"
        },
        {
          recommendedMove: "f1b5",
          explanation: "The characteristic move of the Spanish: Bb5 puts pressure on the knight defending e5.",
          fen: "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 2"
        }
      ]
    },
    forkTactics: {
      title: "Fork Tactics",
      description: "Learn to use forks to win material",
      steps: [
        {
          recommendedMove: "f3e5",
          explanation: "The Knight forks the Queen and Rook! This is a winning tactic.",
          fen: "r4rk1/ppp2ppp/8/3n4/4P3/5N2/PPPP1PPP/R1BQK2R w KQ - 0 1"
        }
      ]
    },
    pinTactics: {
      title: "Pin Tactics",
      description: "Use pins to restrict enemy pieces",
      steps: [
        {
          recommendedMove: "d1h5",
          explanation: "The Queen pins the Knight to the King, preventing it from moving.",
          fen: "r1bqk2r/pppp1ppp/2n2n2/4p2Q/2B1P3/5N2/PPPP1PPP/RNB1K2R b KQkq - 0 1"
        }
      ]
    }
  }
};

// ========================================
// INTERACTIVE PRACTICE UI
// ========================================

function createInteractivePracticeUI() {
  // Check if interactive practice section already exists
  const practiceSection = document.getElementById("interactive-practice-section");

  if (practiceSection) {
    // Add event listeners to scenario buttons
    const scenarioButtons = practiceSection.querySelectorAll(".scenario-btn");
    scenarioButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        const scenarioId = btn.dataset.scenario;
        startInteractiveScenario(scenarioId);
      });
    });
    return;
  }

  // Create interactive practice section
  const tutorialSection = document.getElementById("tutorial-section");
  if (tutorialSection) {
    const interactiveSection = document.createElement("div");
    interactiveSection.className = "settings-subsection";
    interactiveSection.id = "interactive-practice-section";
    interactiveSection.innerHTML = `
      <h3>Interactive Practice</h3>
      <p class="practice-description">Practice your moves with real-time feedback. Make the recommended moves to learn!</p>
      <div class="scenarios-grid">
        <button class="scenario-btn" data-scenario="italianOpening">
          <span class="scenario-icon">🎯</span>
          <span class="scenario-title">Italian Game</span>
          <span class="scenario-description">Classic opening practice</span>
        </button>
        <button class="scenario-btn" data-scenario="spanishOpening">
          <span class="scenario-icon">🏰</span>
          <span class="scenario-title">Spanish Game</span>
          <span class="scenario-description">Ruy Lopez opening</span>
        </button>
        <button class="scenario-btn" data-scenario="forkTactics">
          <span class="scenario-icon">⚔️</span>
          <span class="scenario-title">Fork Tactics</span>
          <span class="scenario-description">Win material with forks</span>
        </button>
        <button class="scenario-btn" data-scenario="pinTactics">
          <span class="scenario-icon">📌</span>
          <span class="scenario-title">Pin Tactics</span>
          <span class="scenario-description">Restrict enemy pieces</span>
        </button>
      </div>
      <div id="practice-feedback" class="practice-feedback hidden"></div>
    `;

    tutorialSection.appendChild(interactiveSection);

    // Add event listeners
    const scenarioButtons = interactiveSection.querySelectorAll(".scenario-btn");
    scenarioButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        const scenarioId = btn.dataset.scenario;
        startInteractiveScenario(scenarioId);
      });
    });

    console.log("Interactive practice section created");
  }
}

// ========================================
// SCENARIO MANAGEMENT
// ========================================

function startInteractiveScenario(scenarioId) {
  const scenario = InteractivePractice.scenarios[scenarioId];
  if (!scenario) {
    console.error("Scenario not found:", scenarioId);
    return;
  }

  console.log("Starting scenario:", scenario.title);

  // Save scenario info to localStorage
  localStorage.setItem("currentPracticeScenario", JSON.stringify({
    id: scenarioId,
    step: 0,
    active: true
  }));

  // Redirect to main board page
  window.location.href = "index.html";
}

function loadScenarioPosition(scenarioId, stepIndex) {
  const scenario = InteractivePractice.scenarios[scenarioId];
  if (!scenario || !scenario.steps[stepIndex]) return;

  const step = scenario.steps[stepIndex];

  // Load the FEN position (this would integrate with your chess engine)
  if (window.loadFEN) {
    window.loadFEN(step.fen);
  }

  // Update current step
  InteractivePractice.currentStep = stepIndex;
  InteractivePractice.recommendedMove = step.recommendedMove;

  // Show explanation
  showStepExplanation(step.explanation);
}

function showScenarioInfo(scenario) {
  const feedbackEl = document.getElementById("practice-feedback");
  if (feedbackEl) {
    feedbackEl.innerHTML = `
      <div class="scenario-info">
        <h4>${scenario.title}</h4>
        <p>${scenario.description}</p>
        <div class="step-indicator">Step ${InteractivePractice.currentStep + 1} of ${scenario.steps.length}</div>
      </div>
    `;
    feedbackEl.classList.remove("hidden");
  }
}

function showStepExplanation(explanation) {
  const feedbackEl = document.getElementById("practice-feedback");
  if (feedbackEl) {
    const infoEl = feedbackEl.querySelector(".scenario-info");
    if (infoEl) {
      const explanationEl = infoEl.querySelector(".explanation");
      if (explanationEl) {
        explanationEl.textContent = explanation;
      } else {
        const newExplanationEl = document.createElement("p");
        newExplanationEl.className = "explanation";
        newExplanationEl.textContent = explanation;
        infoEl.appendChild(newExplanationEl);
      }

      // Update step indicator
      const stepIndicator = infoEl.querySelector(".step-indicator");
      if (stepIndicator) {
        const scenario = InteractivePractice.scenarios[InteractivePractice.currentScenario];
        stepIndicator.textContent = `Step ${InteractivePractice.currentStep + 1} of ${scenario.steps.length}`;
      }
    }
  }
}

function highlightRecommendedMove(move) {
  // Remove old highlights
  document.querySelectorAll(".recommended-move-highlight").forEach(el => {
    el.classList.remove("recommended-move-highlight");
  });

  if (!move) return;

  // Parse the move (e.g., "e2e4")
  const fromSquare = move.substring(0, 2);
  const toSquare = move.substring(2, 4);

  // Highlight the squares
  const fromEl = document.querySelector(`.square[data-square='${fromSquare}']`);
  const toEl = document.querySelector(`.square[data-square='${toSquare}']`);

  if (fromEl) fromEl.classList.add("recommended-move-highlight");
  if (toEl) toEl.classList.add("recommended-move-highlight");
}

// ========================================
// MOVE VALIDATION
// ========================================

function validateMove(move) {
  if (!InteractivePractice.active) return true;

  const recommendedMove = InteractivePractice.recommendedMove;
  if (!recommendedMove) return true;

  // Compare the move with the recommended move
  if (move === recommendedMove) {
    // Correct move!
    showMoveFeedback(true, "Excellent! That\'s the recommended move.");
    advanceToNextStep();
    return true;
  } else {
    // Wrong move - reject it
    showMoveFeedback(false, "That\'s not the recommended move. Try again!");
    return false;
  }
}

function showMoveFeedback(isCorrect, message) {
  const feedbackEl = document.getElementById("practice-feedback");
  if (feedbackEl) {
    const infoEl = feedbackEl.querySelector(".scenario-info");
    if (infoEl) {
      const feedbackDiv = infoEl.querySelector(".move-feedback");
      if (feedbackDiv) {
        feedbackDiv.remove();
      }

      const newFeedback = document.createElement("div");
      newFeedback.className = `move-feedback ${isCorrect ? "correct" : "incorrect"}`;
      newFeedback.textContent = message;
      infoEl.appendChild(newFeedback);

      // Auto-hide after 3 seconds
      setTimeout(() => {
        newFeedback.remove();
      }, 3000);
    }
  }
}

function advanceToNextStep() {
  const scenario = InteractivePractice.scenarios[InteractivePractice.currentScenario];
  if (!scenario) return;

  const nextStep = InteractivePractice.currentStep + 1;

  if (nextStep < scenario.steps.length) {
    // Load next step
    setTimeout(() => {
      loadScenarioPosition(InteractivePractice.currentScenario, nextStep);
    }, 1000);
  } else {
    // Scenario complete!
    showScenarioComplete(scenario);
  }
}

function showScenarioComplete(scenario) {
  const feedbackEl = document.getElementById("practice-feedback");
  if (feedbackEl) {
    feedbackEl.innerHTML = `
      <div class="scenario-complete">
        <h4>🎉 Congratulations!</h4>
        <p>You\'ve completed the ${scenario.title} scenario!</p>
        <button class="btn btn-primary" onclick="closeInteractivePractice()">Close</button>
      </div>
    `;
  }

  InteractivePractice.active = false;
}

function closeInteractivePractice() {
  InteractivePractice.active = false;
  const feedbackEl = document.getElementById("practice-feedback");
  if (feedbackEl) {
    feedbackEl.classList.add("hidden");
  }

  // Remove highlights
  document.querySelectorAll(".recommended-move-highlight").forEach(el => {
    el.classList.remove("recommended-move-highlight");
  });
}

// ========================================
// CHESS ENGINE INTEGRATION
// ========================================

// Hook into the chess engine's move function
function hookIntoChessEngine() {
  // Find the chess engine's move function and wrap it
  // This will depend on your specific chess engine implementation

  // Example (adjust based on your actual code):
  if (window.chess && window.chess.move) {
    const originalMove = window.chess.move.bind(window.chess);
    window.chess.move = function(move) {
      const isValid = validateMove(move);
      if (!isValid) {
        return null; // Reject the move
      }
      return originalMove(move);
    };
  }

  // Alternative: Hook into the UI move handler
  if (window.makeMove) {
    const originalMakeMove = window.makeMove.bind(window);
    window.makeMove = function(from, to) {
      const move = from + to;
      const isValid = validateMove(move);
      if (!isValid) {
        // Show feedback and don't make the move
        return false;
      }
      return originalMakeMove(from, to);
    };
  }
}

// ========================================
// INITIALIZATION
// ========================================

// Initialize when DOM is ready
function initializeInteractivePractice() {
  setTimeout(() => {
    createInteractivePracticeUI();
    hookIntoChessEngine();
    console.log("Interactive practice mode initialized");
  }, 500);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeInteractivePractice);
} else {
  initializeInteractivePractice();
}

// Export for global access
window.InteractivePractice = InteractivePractice;
window.validateMove = validateMove;
window.closeInteractivePractice = closeInteractivePractice;
