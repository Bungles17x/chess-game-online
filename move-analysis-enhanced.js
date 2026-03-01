// Enhanced Move Analysis System with Centralized XP Management
// This file analyzes moves and uses the centralized XP system for awarding XP

// Prevent the script from being loaded multiple times
if (window.moveAnalysisEnhancedLoaded) {
  console.log('[Move Analysis Enhanced] Script already loaded, skipping...');
} else {
  window.moveAnalysisEnhancedLoaded = true;

  // Load the enhanced CSS file
  const moveFeedbackCSS = document.createElement('link');
  moveFeedbackCSS.rel = 'stylesheet';
  moveFeedbackCSS.href = 'move-feedback-enhanced.css';
  document.head.appendChild(moveFeedbackCSS);

  // Constants for move evaluation
  const PIECE_VALUES = {
    'p': 100,
    'n': 320,
    'b': 330,
    'r': 500,
    'q': 900,
    'k': 20000
  };

  const MOVE_THRESHOLDS = {
    EXCELLENT: 100,
    GOOD: 50,
    OKAY: 0,
    WEAK: -50,
    BAD: -100
  };

  const MOVE_FEEDBACK = {
    'EXCELLENT': [
      '🏆 Excellent move! +25 XP',
      '⭐ Brilliant! +25 XP',
      '💎 Perfect! +25 XP',
      '👑 Outstanding! +25 XP',
      '🎯 Masterful! +25 XP',
      '🌟 Grandmaster level! +25 XP',
      '🔥 Magnificent! +25 XP',
      '✨ Incredible! +25 XP',
      '🎪 Superb! +25 XP',
      '🚀 Fantastic! +25 XP',
      '💪 Powerful! +25 XP',
      '🎉 Phenomenal! +25 XP',
      '🏅 World-class! +25 XP',
      '👏 Spectacular! +25 XP',
      '🎨 Artistic! +25 XP'
    ],
    'GOOD': [
      '✓ Good move! +15 XP',
      '👍 Well played! +15 XP',
      '😊 Nice! +15 XP',
      '💪 Solid move! +15 XP',
      '🎯 Great choice! +15 XP',
      '⚡ Strong move! +15 XP',
      '🧠 Well calculated! +15 XP',
      '📍 Good position! +15 XP',
      '💡 Smart move! +15 XP',
      '👏 Well done! +15 XP',
      '✨ Promising! +15 XP',
      '🎖️ Commendable! +15 XP',
      '🔝 Impressive! +15 XP',
      '⭐ Admirable! +15 XP',
      '🎪 Skillful! +15 XP'
    ],
    'OKAY': [
      '→ Okay move +10 XP',
      '✓ Decent +10 XP',
      '👌 Acceptable +10 XP',
      '😐 Not bad +10 XP',
      '🤔 Reasonable +10 XP',
      '✓ Fair move +10 XP',
      '📋 Standard play +10 XP',
      '📝 Normal move +10 XP',
      '👍 Alright +10 XP',
      '✓ Passable +10 XP',
      '🔄 Routine +10 XP',
      '📍 Adequate +10 XP',
      '🎯 Decent choice +10 XP',
      '✓ Satisfactory +10 XP',
      '📊 Average +10 XP'
    ],
    'WEAK': [
      '⚠️ Look for better squares +5 XP',
      '🔍 Consider developing pieces +5 XP',
      '🤔 Control the center +5 XP',
      '👀 Watch for threats +5 XP',
      '📉 Consider safety +5 XP',
      '🎯 Improve piece placement +5 XP',
      '🤔 Think ahead +5 XP',
      '⚡ Too passive? +5 XP',
      '🌫️ Unclear plan +5 XP',
      '📉 Weakening position +5 XP',
      '👀 Check opponent threats +5 XP',
      '😟 Consider alternatives +5 XP',
      '🤔 Too committal? +5 XP',
      '📉 Not optimal +5 XP',
      '🎯 Find better squares +5 XP'
    ],
    'BAD': [
      '❌ Missed tactics +2 XP',
      '⚠️ Piece hanging +2 XP',
      '🚫 Lost material +2 XP',
      '🔍 Better moves exist +2 XP',
      '❌ Ignoring threats +2 XP',
      '⚠️ Weakens structure +2 XP',
      '❌ Missed opportunity +2 XP',
      '🚫 Poor development +2 XP',
      '😞 Lost tempo +2 XP',
      '❌ Not principled +2 XP',
      '⚠️ Positional damage +2 XP',
      '❌ Missed tactic +2 XP',
      '🚫 Too aggressive +2 XP',
      '⚠️ King unsafe +2 XP',
      '❌ Strategic error +2 XP'
    ],
    'BLUNDER': [
      '💀 Lost piece! +1 XP',
      '🚨 Missed checkmate! +1 XP',
      '❌ King in danger! +1 XP',
      '💥 Material lost! +1 XP',
      '🚫 Huge blunder! +1 XP',
      '⚠️ Game-losing move! +1 XP',
      '🔥 Missed winning tactic! +1 XP',
      '💥 Disaster! +1 XP',
      '❌ Missed forced win! +1 XP',
      '📉 Lost winning position! +1 XP',
      '💀 Critical error! +1 XP',
      '🚨 Missed simple tactic! +1 XP',
      '❌ Blundered piece! +1 XP',
      '💥 Ruined position! +1 XP',
      '🚫 Horrible mistake! +1 XP'
    ]
  };

  // Simple position evaluation
  function evaluateBoard(game) {
    const board = game.board();
    let totalEvaluation = 0;

    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const piece = board[i][j];
        if (piece) {
          const pieceValue = PIECE_VALUES[piece.type];

          // Add to total (positive for white, negative for black)
          totalEvaluation += piece.color === 'w' ?
            pieceValue :
            -pieceValue;
        }
      }
    }

    return totalEvaluation;
  }

  // Evaluate a move
  function evaluateMove(game, move) {
    try {
      const originalPosition = game.fen();
      const beforeEvaluation = evaluateBoard(game);

      // Create a copy of the game to analyze without affecting the actual game
      const tempGame = new Chess(originalPosition);

      // Make the move on the copy
      tempGame.move(move);

      // Evaluate new position
      const afterEvaluation = evaluateBoard(tempGame);

      // Determine which color made the move (opposite of current turn)
      const movedColor = game.turn() === 'w' ? 'b' : 'w';

      // Calculate move quality (positive is good for the player who made the move)
      let evaluationDiff = movedColor === 'w' ?
        (afterEvaluation - beforeEvaluation) :
        (beforeEvaluation - afterEvaluation);

      // Add some randomness to prevent all moves being rated the same
      const randomFactor = (Math.random() - 0.5) * 20; // -10 to +10 centipawns
      evaluationDiff += randomFactor;

      return evaluationDiff;
    } catch (error) {
      console.error('[Move Analysis Enhanced] Error evaluating move:', error);
      return 0; // Return neutral evaluation if there's an error
    }
  }

  // Get move quality category
  function getMoveQuality(evaluation) {
    if (evaluation >= MOVE_THRESHOLDS.EXCELLENT) return 'EXCELLENT';
    if (evaluation >= MOVE_THRESHOLDS.GOOD) return 'GOOD';
    if (evaluation >= MOVE_THRESHOLDS.OKAY) return 'OKAY';
    if (evaluation >= MOVE_THRESHOLDS.WEAK) return 'WEAK';
    if (evaluation >= MOVE_THRESHOLDS.BAD) return 'BAD';
    return 'BLUNDER';
  }

  // Get random feedback message
  function getFeedbackMessage(quality) {
    const messages = MOVE_FEEDBACK[quality];
    return messages[Math.floor(Math.random() * messages.length)];
  }

  // Analyze move and show feedback (optimized and async)
  function analyzeAndShowFeedback(game, move) {
    try {
      console.log('[Move Analysis Enhanced] Analyzing move:', move);

      if (!game || !move) {
        console.error('[Move Analysis Enhanced] Invalid game or move object');
        return null;
      }

      // Use requestAnimationFrame to prevent blocking the UI
      requestAnimationFrame(() => {
        const evaluation = evaluateMove(game, move);
        console.log('[Move Analysis Enhanced] Move evaluation:', evaluation);

        const quality = getMoveQuality(evaluation);
        console.log('[Move Analysis Enhanced] Move quality:', quality);

        const feedback = getFeedbackMessage(quality);
        console.log('[Move Analysis Enhanced] Feedback message:', feedback);

        // Show feedback popup
        if (typeof showMoveFeedback === 'function') {
          showMoveFeedback(feedback, quality);
        }

        // Award XP for the move using the centralized XP system
        // Only award XP for player moves (white in bot mode)
        // The script.js already filters to only call this for white moves in bot mode
        if (window.xpSystem && typeof window.xpSystem.awardMoveXP === 'function') {
          // Use the XP rewards defined in this file
          const XP_REWARDS = {
            'EXCELLENT': 25,
            'GOOD': 15,
            'OKAY': 10,
            'WEAK': 5,
            'BAD': 2,
            'BLUNDER': 1
          };
          const xpReward = XP_REWARDS[quality];
          console.log('[Move Analysis Enhanced] XP reward:', xpReward);

          if (xpReward > 0) {
            window.xpSystem.awardMoveXP(xpReward, quality);
          }
        } else {
          console.log('[Move Analysis Enhanced] XP system not available');
        }
      });

      return {
        quality: 'analyzing',
        evaluation: 0,
        feedback: 'Analyzing...',
        xpReward: 0
      };
    } catch (error) {
      console.error('[Move Analysis Enhanced] Error in analyzeAndShowFeedback:', error);
      return null;
    }
  }

  // Show move feedback popup
  function showMoveFeedback(message, quality) {
    // Create feedback element
    const feedback = document.createElement('div');
    feedback.className = `move-feedback ${quality.toLowerCase()}`;
    
    // Parse the message to separate the text from the XP amount
    const parts = message.split(' +');
    const text = parts[0];
    const xpAmount = parts.length > 1 ? '+' + parts[1] : '';
    
    // Create text element
    const textElement = document.createElement('span');
    textElement.textContent = text;
    feedback.appendChild(textElement);
    
    // Create XP amount element if present
    if (xpAmount) {
      const xpElement = document.createElement('span');
      xpElement.className = 'xp-amount';
      xpElement.textContent = xpAmount;
      feedback.appendChild(xpElement);
    }

    // Add to document body for better positioning
    document.body.appendChild(feedback);

    // Remove after animation
    setTimeout(() => {
      feedback.remove();
    }, 2000);
  }

  // Make functions globally available
  window.analyzeAndShowFeedback = analyzeAndShowFeedback;
  window.showMoveFeedback = showMoveFeedback;

  console.log('[Move Analysis Enhanced] Enhanced move analysis system loaded successfully');
}
