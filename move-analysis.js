// Move Analysis System
console.log('Move Analysis System loaded');

// Move evaluation thresholds (in centipawns)
const MOVE_THRESHOLDS = {
  EXCELLENT: 100,    // Very strong move (1 pawn advantage)
  GOOD: 50,          // Good move (0.5 pawn advantage)
  OKAY: 0,           // Decent move (neutral)
  WEAK: -50,         // Weak move (0.5 pawn disadvantage)
  BAD: -100,         // Bad move (1 pawn disadvantage)
  BLUNDER: -200      // Terrible move (2 pawn disadvantage)
};

// Compliments and feedback messages
const MOVE_FEEDBACK = {
  EXCELLENT: [
    "Brilliant move! 🌟",
    "Outstanding! 💎",
    "Masterful! 👑",
    "Perfect! 🎯",
    "Exceptional! 🏆"
  ],
  GOOD: [
    "Nice move! 👍",
    "Well played! ✨",
    "Great choice! 🌟",
    "Solid move! 💪",
    "Excellent! 🎉"
  ],
  OKAY: [
    "Good move! 👍",
    "Not bad! 😊",
    "Decent! 👌",
    "Okay move! 😊",
    "Fair play! 🤝"
  ],
  WEAK: [
    "Hmm... 🤔",
    "Interesting... 🤔",
    "Not the best... 😅",
    "Could be better... 🤔",
    "Think twice... 🤔"
  ],
  BAD: [
    "Yikes! 😬",
    "Careful! ⚠️",
    "Watch out! ⚠️",
    "Risky! 😬",
    "Hmm... 😬"
  ],
  BLUNDER: [
    "Oh no! 😱",
    "Blunder! 💀",
    "Big mistake! 😱",
    "Ouch! 😬",
    "Not good! 😱"
  ]
};

// XP rewards for different move qualities
const XP_REWARDS = {
  EXCELLENT: 15,
  GOOD: 10,
  OKAY: 5,
  WEAK: 2,
  BAD: 1,
  BLUNDER: 0
};

// Simple piece-square tables for move evaluation
const PIECE_SQUARE_TABLES = {
  p: [ // Pawn
    [0,  0,  0,  0,  0,  0,  0,  0],
    [50, 50, 50, 50, 50, 50, 50, 50],
    [10, 10, 20, 30, 30, 20, 10, 10],
    [5,  5, 10, 25, 25, 10,  5,  5],
    [0,  0,  0, 20, 20,  0,  0,  0],
    [5, -5,-10,  0,  0,-10, -5,  5],
    [5, 10, 10,-20,-20, 10, 10,  5],
    [0,  0,  0,  0,  0,  0,  0,  0]
  ],
  n: [ // Knight
    [-50,-40,-30,-30,-30,-30,-40,-50],
    [-40,-20,  0,  0,  0,  0,-20,-40],
    [-30,  0, 10, 15, 15, 10,  0,-30],
    [-30,  5, 15, 20, 20, 15,  5,-30],
    [-30,  0, 15, 20, 20, 15,  0,-30],
    [-30,  5, 10, 15, 15, 10,  5,-30],
    [-40,-20,  0,  5,  5,  0,-20,-40],
    [-50,-40,-30,-30,-30,-30,-40,-50]
  ],
  b: [ // Bishop
    [-20,-10,-10,-10,-10,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0,  5, 10, 10,  5,  0,-10],
    [-10,  5,  5, 10, 10,  5,  5,-10],
    [-10,  0, 10, 10, 10, 10,  0,-10],
    [-10, 10, 10, 10, 10, 10, 10,-10],
    [-10,  5,  0,  0,  0,  0,  5,-10],
    [-20,-10,-10,-10,-10,-10,-10,-20]
  ],
  r: [ // Rook
    [0,  0,  0,  0,  0,  0,  0,  0],
    [5, 10, 10, 10, 10, 10, 10,  5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [0,  0,  0,  5,  5,  0,  0,  0]
  ],
  q: [ // Queen
    [-20,-10,-10, -5, -5,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0,  5,  5,  5,  5,  0,-10],
    [-5,  0,  5,  5,  5,  5,  0, -5],
    [0,  0,  5,  5,  5,  5,  0, -5],
    [-10,  5,  5,  5,  5,  5,  0,-10],
    [-10,  0,  5,  0,  0,  0,  0,-10],
    [-20,-10,-10, -5, -5,-10,-10,-20]
  ],
  k: [ // King
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-20,-30,-30,-40,-40,-30,-30,-20],
    [-10,-20,-20,-20,-20,-20,-20,-10],
    [20, 20,  0,  0,  0,  0, 20, 20],
    [20, 30, 10,  0,  0, 10, 30, 20]
  ]
};

// Piece values
const PIECE_VALUES = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000
};

// Evaluate board position (optimized)
function evaluateBoard(game) {
  let totalEvaluation = 0;
  const board = game.board();

  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const piece = board[i][j];
      if (piece) {
        const pieceValue = PIECE_VALUES[piece.type];
        const squareTable = PIECE_SQUARE_TABLES[piece.type];

        // Get position value based on piece color
        const positionValue = piece.color === 'w' ? 
          squareTable[i][j] : 
          squareTable[7 - i][j];

        // Add to total (positive for white, negative for black)
        totalEvaluation += piece.color === 'w' ? 
          (pieceValue + positionValue) : 
          -(pieceValue + positionValue);
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
    // If white moved, we want positive evaluation to be good for white
    // If black moved, we want negative evaluation to be good for black
    let evaluationDiff = movedColor === 'w' ? 
      (afterEvaluation - beforeEvaluation) : 
      (beforeEvaluation - afterEvaluation);

    // Add some randomness to prevent all moves being rated the same
    // This makes the feedback more varied and interesting
    const randomFactor = (Math.random() - 0.5) * 20; // -10 to +10 centipawns
    evaluationDiff += randomFactor;

    console.log('Move evaluation details:', {
      movedColor,
      beforeEvaluation,
      afterEvaluation,
      evaluationDiff,
      randomFactor
    });

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
      showMoveFeedback(feedback, quality);

      // Award XP for the move
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
  try {
    console.log('Showing feedback:', message, quality);

    if (!message || !quality) {
      console.error('Invalid message or quality');
      return;
    }

    const colors = {
      EXCELLENT: '#ffd700',
      GOOD: '#22c55e',
      OKAY: '#3b82f6',
      WEAK: '#f59e0b',
      BAD: '#ef4444',
      BLUNDER: '#dc2626'
    };

    // Remove any existing feedback
    const existingFeedback = document.querySelector('.move-feedback-popup');
    if (existingFeedback) {
      existingFeedback.remove();
    }

    const feedbackElement = document.createElement('div');
    feedbackElement.className = 'move-feedback-popup';
    feedbackElement.style.cssText = `
      position: fixed !important;
      bottom: 30px !important;
      right: 30px !important;
      transform: none !important;
      background: rgba(0, 0, 0, 0.95) !important;
      color: ${colors[quality]} !important;
      padding: 20px 40px !important;
      border-radius: 12px !important;
      font-size: 24px !important;
      font-weight: bold !important;
      z-index: 2147483647 !important;
      animation: slideInRight 2s ease-out forwards !important;
      text-align: center !important;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6) !important;
      border: 2px solid ${colors[quality]} !important;
      pointer-events: none !important;
      font-family: Arial, sans-serif !important;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5) !important;
    `;

    feedbackElement.textContent = message;

    // Ensure document body exists
    if (!document.body) {
      console.error('Document body not found');
      return;
    }

    document.body.appendChild(feedbackElement);

    console.log('Feedback element added to DOM');

    setTimeout(() => {
      if (feedbackElement && feedbackElement.parentNode) {
        feedbackElement.remove();
        console.log('Feedback element removed');
      }
    }, 2000);
  } catch (error) {
    console.error('Error in showMoveFeedback:', error);
  }
}

// Award XP for move
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

    // Check for level up
    const xpNeeded = 1000 * playerData.level + 500 * Math.max(0, playerData.level - 1);
    while (playerData.xp >= xpNeeded) {
      playerData.level++;
      playerData.xp -= xpNeeded;
    }

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

      // Check for level up
      const xpNeeded = 1000 * currentUser.level + 500 * Math.max(0, currentUser.level - 1);
      while (currentUser.xp >= xpNeeded) {
        currentUser.level++;
        currentUser.xp -= xpNeeded;
      }

      // Update stats
      if (currentUser.stats.movesPlayed === undefined) {
        currentUser.stats.movesPlayed = 0;
      }
      currentUser.stats.movesPlayed++;

      // Save currentUser
      localStorage.setItem("currentUser", JSON.stringify(currentUser));
      console.log('Current user updated:', currentUser);

      // Also update in chessUsers array
      const users = JSON.parse(localStorage.getItem("chessUsers") || "[]");
      const userIndex = users.findIndex(u => u.username === currentUser.username);
      if (userIndex !== -1) {
        users[userIndex] = currentUser;
        localStorage.setItem("chessUsers", JSON.stringify(users));
        console.log('User updated in chessUsers array');
      }
    }

    // Load xp-notification.js if not available
    if (typeof showXPNotification !== 'function') {
      const xpNotificationScript = document.createElement('script');
      xpNotificationScript.src = 'xp-notification.js';
      document.head.appendChild(xpNotificationScript);
    }

    // Load level-up.js if not available
    if (typeof showLevelUpAnimation !== 'function') {
      const levelUpScript = document.createElement('script');
      levelUpScript.src = 'level-up.js';
      document.head.appendChild(levelUpScript);
    }

    // Show XP notification
    setTimeout(() => {
      if (typeof showXPNotification === 'function') {
        console.log('Calling showXPNotification with:', amount, quality);
        // Map move quality to notification type
        let notificationType = 'normal';
        if (quality === 'EXCELLENT') {
          notificationType = 'win';
        } else if (quality === 'GOOD') {
          notificationType = 'normal';
        } else if (quality === 'OKAY') {
          notificationType = 'normal';
        } else if (quality === 'WEAK') {
          notificationType = 'loss';
        } else if (quality === 'BAD') {
          notificationType = 'loss';
        } else if (quality === 'BLUNDER') {
          notificationType = 'loss';
        }

        showXPNotification(amount, notificationType, playerData.xp, xpNeeded, playerData.level);
      } else {
        console.log('showXPNotification not available');
      }
    }, 100);

    // If level changed, show animation
    if (playerData.level > oldLevel) {
      setTimeout(() => {
        if (typeof showLevelUpAnimation === 'function') {
          showLevelUpAnimation(oldLevel, playerData.level);
        } else {
          console.log('showLevelUpAnimation not available');
        }
      }, 200);
    }
  } catch (error) {
    console.error('Error in awardMoveXP:', error);
  }
}

// Add CSS animation for feedback
const moveAnalysisStyle = document.createElement('style');
moveAnalysisStyle.textContent = `
  @keyframes fadeInOut {
    0% {
      opacity: 0;
      transform: translate(-50%, -50%) scale(0.5);
    }
    15% {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1.1);
    }
    25% {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1);
    }
    75% {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1);
    }
    100% {
      opacity: 0;
      transform: translate(-50%, -50%) scale(0.8);
    }
  }

  @keyframes slideInRight {
    0% {
      opacity: 0;
      transform: translateX(100px);
    }
    15% {
      opacity: 1;
      transform: translateX(0);
    }
    85% {
      opacity: 1;
      transform: translateX(0);
    }
    100% {
      opacity: 0;
      transform: translateX(100px);
    }
  }

  .move-feedback {
    background: rgba(0, 0, 0, 0.7) !important;
    backdrop-filter: blur(10px);
  }
`;
document.head.appendChild(moveAnalysisStyle);
console.log('CSS animation added to document');

// Make functions globally available
window.analyzeAndShowFeedback = analyzeAndShowFeedback;
window.evaluateMove = evaluateMove;
window.getMoveQuality = getMoveQuality;
