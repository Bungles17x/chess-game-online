// Move Analysis System - Fixed Version

// Prevent the script from being loaded multiple times
if (window.moveAnalysisLoaded) {
  console.log('[Move Analysis] Script already loaded, skipping...');
} else {
  window.moveAnalysisLoaded = true;

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

  const XP_REWARDS = {
    'EXCELLENT': 25,
    'GOOD': 15,
    'OKAY': 10,
    'WEAK': 5,
    'BAD': 2,
    'BLUNDER': 1
  };

  const MOVE_FEEDBACK = {
    'EXCELLENT': [
      'Excellent move!',
      'Brilliant!',
      'Perfect!',
      'Outstanding!',
      'Masterful!'
    ],
    'GOOD': [
      'Good move!',
      'Well played!',
      'Nice!',
      'Solid move!',
      'Great choice!'
    ],
    'OKAY': [
      'Okay move',
      'Decent',
      'Acceptable',
      'Not bad',
      'Reasonable'
    ],
    'WEAK': [
      'Weak move',
      'Could be better',
      'Consider alternatives',
      'Not ideal',
      'Suboptimal'
    ],
    'BAD': [
      'Bad move',
      'Mistake',
      'Poor choice',
      'Better options available',
      'Inaccurate'
    ],
    'BLUNDER': [
      'Blunder!',
      'Big mistake!',
      'Terrible move!',
      'Disaster!',
      'Huge error!'
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
      console.error('Error evaluating move:', error);
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
      console.log('Analyzing move:', move);

      if (!game || !move) {
        console.error('Invalid game or move object');
        return null;
      }

      // Use requestAnimationFrame to prevent blocking the UI
      requestAnimationFrame(() => {
        const evaluation = evaluateMove(game, move);
        console.log('Move evaluation:', evaluation);

        const quality = getMoveQuality(evaluation);
        console.log('Move quality:', quality);

        const feedback = getFeedbackMessage(quality);
        console.log('Feedback message:', feedback);

        // Show feedback popup
        if (typeof showMoveFeedback === 'function') {
          showMoveFeedback(feedback, quality);
        }

        // Award XP for the move
        // The script.js already filters to only call this for white moves in bot mode
        const xpReward = XP_REWARDS[quality];
        console.log('XP reward:', xpReward);

        if (xpReward > 0) {
          awardMoveXP(xpReward, quality);
        }
      });

      return {
        quality: 'analyzing',
        evaluation: 0,
        feedback: 'Analyzing...',
        xpReward: 0
      };
    } catch (error) {
      console.error('Error in analyzeAndShowFeedback:', error);
      return null;
    }
  }

  // Show move feedback popup
  function showMoveFeedback(message, quality) {
    // Create feedback element
    const feedback = document.createElement('div');
    feedback.className = `move-feedback ${quality.toLowerCase()}`;
    feedback.textContent = message;

    // Position it near the board
    const boardElement = document.querySelector('.chessboard') || document.body;
    boardElement.appendChild(feedback);

    // Remove after animation
    setTimeout(() => {
      feedback.remove();
    }, 2000);
  }

  // Award XP for a move
  function awardMoveXP(amount, quality) {
    try {
      console.log('Awarding XP:', amount, quality);

      // Load player data
      let playerData = JSON.parse(localStorage.getItem("chessPlayerData") || "{}");

      // Initialize if not exists
      if (!playerData.xp) playerData.xp = 0;
      if (!playerData.level) playerData.level = 1;

      // Add XP
      const oldLevel = playerData.level;
      playerData.xp += amount;

      // Check for level up - simple formula: 1000 XP per level
      const newLevel = Math.floor(playerData.xp / 1000) + 1;
      playerData.level = newLevel;

      // Save player data
      localStorage.setItem("chessPlayerData", JSON.stringify(playerData));
      console.log('Player data saved:', playerData);

      // Also update currentUser object in localStorage
      let currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");
      if (currentUser) {
        // Initialize if not exists
        if (!currentUser.xp) currentUser.xp = 0;
        if (!currentUser.level) currentUser.level = 1;
        if (!currentUser.stats) currentUser.stats = {};

        // Add XP to currentUser
        currentUser.xp += amount;

        // Check for level up - simple formula: 1000 XP per level
        const newLevel = Math.floor(currentUser.xp / 1000) + 1;
        currentUser.level = newLevel;

        // Update stats
        if (currentUser.stats.movesPlayed === undefined) {
          currentUser.stats.movesPlayed = 0;
        }
        currentUser.stats.movesPlayed++;

        // Save currentUser
        localStorage.setItem("currentUser", JSON.stringify(currentUser));
        console.log('Current user updated:', currentUser);

        // Show XP notification
        setTimeout(() => {
          if (typeof showXPNotification === 'function') {
            // Calculate XP in current level for the notification
            const xpInCurrentLevel = currentUser.xp - ((currentUser.level - 1) * 1000);
            showXPNotification(amount, quality, xpInCurrentLevel, 1000, currentUser.level);
          } else {
            console.log('showXPNotification not available');
          }
        }, 100);

        // If level changed, show animation
        if (currentUser.level > oldLevel) {
          setTimeout(() => {
            // Load level-up.js if not available
            if (typeof showLevelUpAnimation !== 'function') {
              const levelUpScript = document.createElement('script');
              levelUpScript.src = 'level-up.js';
              document.head.appendChild(levelUpScript);
              levelUpScript.onload = () => {
                if (typeof showLevelUpAnimation === 'function') {
                  showLevelUpAnimation(oldLevel, currentUser.level);
                }
              };
            } else {
              showLevelUpAnimation(oldLevel, currentUser.level);
            }
          }, 200);
        }
      }
    } catch (error) {
      console.error('Error in awardMoveXP:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        amount: amount,
        quality: quality
      });
    }
  }

  // Make functions globally available
  window.analyzeAndShowFeedback = analyzeAndShowFeedback;
  window.showMoveFeedback = showMoveFeedback;
  window.awardMoveXP = awardMoveXP;
}
