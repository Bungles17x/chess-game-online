
// Practice Mode Integration - Fixed Version
// This file integrates the interactive practice mode with the game

// Store the original handleSquareClick function
let originalHandleSquareClick = null;

// Override handleSquareClick to add practice mode validation
function overrideHandleSquareClick() {
  if (typeof handleSquareClick !== 'undefined') {
    originalHandleSquareClick = handleSquareClick;

    // Override AI move function to prevent AI moves during practice mode
    const originalMakeAIMove = window.makeAIMove;
    if (originalMakeAIMove) {
      window.makeAIMove = function() {
        if (window.InteractivePractice && window.InteractivePractice.active) {
          console.log("AI move blocked - practice mode is active");
          return;
        }
        return originalMakeAIMove.apply(this, arguments);
      };
      console.log("AI move function overridden for practice mode");
    }

    window.handleSquareClick = function(square) {
      if (!square) return;

      // Check if practice mode is active FIRST
      const isPracticeMode = window.InteractivePractice && window.InteractivePractice.active;
      const hasPracticeScenario = localStorage.getItem("currentPracticeScenario");

      if (isPracticeMode || hasPracticeScenario) {
        console.log("Practice mode active, validating move", { isPracticeMode, hasPracticeScenario });

        // Load practice scenario if not active
        if (!isPracticeMode && hasPracticeScenario) {
          console.log("Practice mode not active but scenario found, loading...");
          loadPracticeScenario();
        }

        // Get the move being attempted
        if (selectedSquare && square) {
          const attemptedMove = selectedSquare + square;
          const recommendedMove = window.InteractivePractice.recommendedMove;

          console.log("Move validation:", {
            attempted: attemptedMove,
            recommended: recommendedMove
          });

          // Validate the move
          if (attemptedMove !== recommendedMove) {
            // Wrong move - show feedback and don't allow it
            console.log("Wrong move detected");
            showMoveFeedback(false, "That's not the recommended move. Try again!");
            return; // Don't execute the move
          }

          console.log("Correct move detected");

          // Correct move - allow it and advance
          showMoveFeedback(true, "Excellent! That's the recommended move.");

          // Auto-advance to next step after a short delay
          setTimeout(() => {
            advanceToNextStep();
          }, 500);

          // Allow the move to execute
          return originalHandleSquareClick(square);
        }

        // If in practice mode but no square selected, don't execute the move
        console.log("Practice mode: No square selected, blocking move");
        return;
      }

      // Call the original function for non-practice mode
      return originalHandleSquareClick(square);
    };

    console.log("Practice mode integration: handleSquareClick overridden");
    
    // Verify the override
    if (window.handleSquareClick !== originalHandleSquareClick) {
      console.log("✓ Override successful: handleSquareClick has been replaced");
    } else {
      console.error("✗ Override failed: handleSquareClick was not replaced");
    }
  } else {
    console.error("handleSquareClick is not defined, cannot override");
  }
}

// Show move feedback
function showMoveFeedback(isCorrect, message) {
  const feedbackEl = document.getElementById("practice-feedback");
  if (feedbackEl) {
    const infoEl = feedbackEl.querySelector(".scenario-info");
    if (infoEl) {
      infoEl.textContent = message;
      infoEl.style.color = isCorrect ? "#4CAF50" : "#f44336";
    }
  } else {
    // Create feedback element
    const newFeedbackEl = document.createElement("div");
    newFeedbackEl.className = "practice-feedback";
    newFeedbackEl.innerHTML = `
      <div class="scenario-info" style="color: ${isCorrect ? "#4CAF50" : "#f44336"}">${message}</div>
    `;
    document.querySelector(".side-panel").prepend(newFeedbackEl);

    setTimeout(() => {
      newFeedbackEl.remove();
    }, 3000);
  }
}

// Load practice scenario from localStorage
function loadPracticeScenario() {
  const scenarioData = localStorage.getItem("currentPracticeScenario");
  if (!scenarioData) return;

  const { id, step, active } = JSON.parse(scenarioData);
  if (!active) return;

  console.log("Loading practice scenario:", id, "step:", step);

  // Get scenario data
  if (window.InteractivePractice && window.InteractivePractice.scenarios) {
    const scenario = window.InteractivePractice.scenarios[id];
    if (!scenario) {
      console.error("Scenario not found:", id);
      return;
    }

    // Set up practice mode
    window.InteractivePractice.active = true;
    window.InteractivePractice.currentScenario = id;
    window.InteractivePractice.currentStep = step;
    window.InteractivePractice.recommendedMove = scenario.steps[step].recommendedMove;

    console.log("Practice mode activated:", {
      active: window.InteractivePractice.active,
      scenario: id,
      step: step,
      recommendedMove: window.InteractivePractice.recommendedMove
    });

    console.log("Practice mode setup:", {
      active: window.InteractivePractice.active,
      scenario: id,
      step: step,
      recommendedMove: window.InteractivePractice.recommendedMove
    });

    // Load the position
    const stepData = scenario.steps[step];
    console.log("Loading FEN:", stepData.fen);
    if (stepData.fen && window.game) {
      window.game.load(stepData.fen);
      console.log("FEN loaded successfully");
      if (window.renderBoard) {
        window.renderBoard();
        console.log("Board rendered");
      }
    } else {
      console.error("Cannot load position:", {
        hasFen: !!stepData.fen,
        hasGame: !!window.game
      });
    }

    // Show scenario info
    showPracticeScenarioInfo(scenario, step);

    // Highlight recommended move
    if (stepData.recommendedMove) {
      highlightRecommendedMove(stepData.recommendedMove);
    }
  }
}

// Show practice scenario info on main board
function showPracticeScenarioInfo(scenario, stepIndex) {
  console.log("Showing practice scenario info:", {
    scenario: scenario.title,
    step: stepIndex,
    totalSteps: scenario.steps.length
  });

  // Create or update practice info panel
  let infoPanel = document.getElementById("practice-info-panel");
  if (!infoPanel) {
    console.log("Creating new practice info panel");
    infoPanel = document.createElement("div");
    infoPanel.id = "practice-info-panel";
    infoPanel.className = "practice-info-panel";
    document.querySelector(".side-panel").prepend(infoPanel);
  } else {
    console.log("Updating existing practice info panel");
  }

  const stepData = scenario.steps[stepIndex];
  console.log("Step data:", stepData);

  infoPanel.innerHTML = `
    <div class="practice-header">
      <h3>${scenario.title}</h3>
      <button class="close-practice" onclick="closePracticeMode()">×</button>
    </div>
    <div class="practice-content">
      <p class="practice-explanation">${stepData.explanation}</p>
      <div class="practice-progress">Step ${stepIndex + 1} of ${scenario.steps.length}</div>
    </div>
  `;
}

// Highlight recommended move on board
function highlightRecommendedMove(move) {
  console.log("Highlighting recommended move:", move);
  if (!move) {
    console.log("No move to highlight");
    return;
  }

  // Parse the move (e.g., "e2e4")
  const fromSquare = move.substring(0, 2);
  const toSquare = move.substring(2, 4);

  console.log("Squares to highlight:", { from: fromSquare, to: toSquare });

  // Highlight the squares
  const fromEl = document.querySelector(`.square[data-square='${fromSquare}']`);
  const toEl = document.querySelector(`.square[data-square='${toSquare}']`);

  console.log("Found elements:", { fromEl: !!fromEl, toEl: !!toEl });

  if (fromEl) fromEl.classList.add("recommended-move-highlight");
  if (toEl) toEl.classList.add("recommended-move-highlight");

  console.log("Highlight added");
}

// Close practice mode
function closePracticeMode() {
  console.log("Closing practice mode");

  // Clear practice mode state
  if (window.InteractivePractice) {
    window.InteractivePractice.active = false;
    window.InteractivePractice.currentScenario = null;
    window.InteractivePractice.currentStep = 0;
    window.InteractivePractice.recommendedMove = null;
  }

  // Clear localStorage
  localStorage.removeItem("currentPracticeScenario");

  const infoPanel = document.getElementById("practice-info-panel");
  if (infoPanel) {
    infoPanel.remove();
  }

  // Remove highlights
  document.querySelectorAll(".recommended-move-highlight").forEach(el => {
    el.classList.remove("recommended-move-highlight");
  });

  // Reset game
  if (window.game) {
    window.game.reset();
    if (window.renderBoard) {
      window.renderBoard();
    }
  }
}

// Test function to verify practice mode
window.testPracticeMode = function() {
  console.log("=== Practice Mode Test ===");
  console.log("InteractivePractice exists:", !!window.InteractivePractice);
  console.log("Practice mode active:", window.InteractivePractice?.active);
  console.log("Current scenario:", window.InteractivePractice?.currentScenario);
  console.log("Current step:", window.InteractivePractice?.currentStep);
  console.log("Recommended move:", window.InteractivePractice?.recommendedMove);
  console.log("Has practice scenario:", !!localStorage.getItem("currentPracticeScenario"));
  console.log("handleSquareClick is overridden:", window.handleSquareClick !== originalHandleSquareClick);
  console.log("========================");
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    console.log("Attempting to override handleSquareClick...");
    console.log("handleSquareClick exists:", typeof handleSquareClick !== 'undefined');
    overrideHandleSquareClick();
    loadPracticeScenario();
    console.log("Practice mode integration initialized");
    console.log("handleSquareClick is now:", typeof window.handleSquareClick);
  }, 3000);
});

// Also initialize immediately if DOM is already loaded
if (document.readyState !== 'loading') {
  setTimeout(() => {
    console.log("Attempting to override handleSquareClick (immediate)...");
    console.log("handleSquareClick exists:", typeof handleSquareClick !== 'undefined');
    overrideHandleSquareClick();
    loadPracticeScenario();
    console.log("Practice mode integration initialized (immediate)");
    console.log("handleSquareClick is now:", typeof window.handleSquareClick);
  }, 3000);
}
