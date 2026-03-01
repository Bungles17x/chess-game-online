
// Auto-advance to next step in practice mode

// Advance to next step in practice mode
function advanceToNextStep() {
  console.log("Advancing to next step");
  if (!window.InteractivePractice || !window.InteractivePractice.active) {
    console.log("Practice mode not active, cannot advance");
    return;
  }

  const scenarioId = window.InteractivePractice.currentScenario;
  const currentStep = window.InteractivePractice.currentStep;
  const scenario = window.InteractivePractice.scenarios[scenarioId];

  console.log("Current state:", {
    scenarioId,
    currentStep,
    totalSteps: scenario ? scenario.steps.length : 0
  });

  if (!scenario) {
    console.error("Scenario not found:", scenarioId);
    return;
  }

  const nextStep = currentStep + 1;

  if (nextStep < scenario.steps.length) {
    console.log("Loading next step:", nextStep);
    
    // Ensure practice mode is active
    window.InteractivePractice.active = true;
    
    // Load next step
    window.InteractivePractice.currentStep = nextStep;
    window.InteractivePractice.recommendedMove = scenario.steps[nextStep].recommendedMove;

    // Load new position if available
    const stepData = scenario.steps[nextStep];
    console.log("Next step data:", stepData);
    
    if (stepData.fen && window.game) {
      console.log("Loading FEN:", stepData.fen);
      window.game.load(stepData.fen);
      console.log("FEN loaded successfully");
      
      if (window.renderBoard) {
        window.renderBoard();
        console.log("Board rendered");
      }
    }

    // Update info panel
    showPracticeScenarioInfo(scenario, nextStep);

    // Highlight recommended move
    if (stepData.recommendedMove) {
      highlightRecommendedMove(stepData.recommendedMove);
    }

    // Save progress to localStorage
    localStorage.setItem("currentPracticeScenario", JSON.stringify({
      id: scenarioId,
      step: nextStep,
      active: true
    }));
    
    console.log("Next step loaded successfully");
  } else {
    // Scenario complete!
    showScenarioComplete(scenario);
  }
}

// Show scenario complete message
function showScenarioComplete(scenario) {
  const infoPanel = document.getElementById("practice-info-panel");
  if (infoPanel) {
    infoPanel.innerHTML = `
      <div class="practice-header">
        <h3>🎉 Congratulations!</h3>
        <button class="close-practice" onclick="closePracticeMode()">×</button>
      </div>
      <div class="practice-content">
        <p class="practice-explanation">You have completed the ${scenario.title} scenario!</p>
        <button class="btn btn-primary" onclick="closePracticeMode()">Close Practice</button>
      </div>
    `;
  }

  // Clear practice mode
  localStorage.removeItem("currentPracticeScenario");
  if (window.InteractivePractice) {
    window.InteractivePractice.active = false;
  }
}
