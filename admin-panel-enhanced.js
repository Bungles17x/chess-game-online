// Admin Panel - Enhanced Version
(function() {
  "use strict";

  // Check if current user is admin
  function isAdmin() {
    try {
      const currentUser = localStorage.getItem('currentUser');
      if (!currentUser) return false;
      const user = JSON.parse(currentUser);
      if (!user || !user.username) return false;
      const username = user.username.toLowerCase();
      return username === 'bungles17x' || username === '674121bruh';
    } catch (e) {
      return false;
    }
  }

  // Get the game instance from script.js
  function getGame() {
    // Try to access the game from the global scope
    // The game is defined in script.js but we need to access it
    // Since it's a const, we'll need to find it through the window object
    
    // Try window.game first (if it was exposed)
    if (window.game) {
      return window.game;
    }
    
    // Try to find game in the global scope by looking at the script
    // We can access it through the chess.js library which is loaded
    if (typeof Chess !== 'undefined') {
      // Try to get the game from the board element's data
      const board = document.getElementById('chessboard');
      if (board) {
        // The game instance is stored in the closure but we can't access it directly
        // We'll need to work around this by checking if game is in the global scope
        // For now, let's return null and handle it differently
      }
    }
    
    // As a last resort, try to access the game through the window object
    // by checking all properties
    for (let key in window) {
      try {
        if (window[key] && typeof window[key] === 'object' && window[key].move && window[key].moves) {
          // This looks like a Chess game instance
          return window[key];
        }
      } catch (e) {
        // Skip properties that can't be accessed
      }
    }
    
    return null;
  }

  // Initialize admin features
  function initAdminPanel() {
    if (!isAdmin()) {
      console.log('[Admin Panel] Not logged in as admin');
      return;
    }

    console.log('[Admin Panel] Initializing for admin user');

    // Wait for dropdown to be available
    const checkDropdown = setInterval(() => {
      const dropdown = document.querySelector('.dropdown-content');
      if (dropdown) {
        clearInterval(checkDropdown);
        addAdminButtons(dropdown);
      }
    }, 100);

    // Stop checking after 5 seconds
    setTimeout(() => clearInterval(checkDropdown), 5000);
  }

  // Add admin buttons to dropdown
  function addAdminButtons(dropdown) {
    console.log('[Admin Panel] Buttons added');

    // Check if admin cheats button already exists
    if (!document.getElementById('admin-cheat-btn')) {
      // Admin Cheats Button
      const cheatsBtn = document.createElement('button');
      cheatsBtn.id = 'admin-cheat-btn';
      cheatsBtn.className = 'dropdown-item';
      cheatsBtn.textContent = '🎮 Admin Cheats';
      cheatsBtn.addEventListener('click', openCheatsModal);
      dropdown.appendChild(cheatsBtn);
    }
  }



  // Cheats Modal
  function openCheatsModal() {
    // Check if modal already exists
    let modal = document.getElementById('admin-cheats-modal');
    if (modal) {
      modal.classList.remove('hidden');
      return;
    }

    // Create modal
    modal = document.createElement('div');
    modal.id = 'admin-cheats-modal';
    modal.className = 'modal hidden';
    modal.innerHTML = `
      <div class="modal-content">
        <h2>🎮 Admin Cheats</h2>
        <div class="cheat-grid">
          <div class="cheat-toggle">
            <label class="toggle-label">Free Move</label>
            <label class="switch">
              <input type="checkbox" id="free-move-toggle">
              <span class="slider round"></span>
            </label>
          </div>
          <div class="cheat-toggle">
            <label class="toggle-label">God Mode</label>
            <label class="switch">
              <input type="checkbox" id="god-mode-toggle">
              <span class="slider round"></span>
            </label>
          </div>
          <div class="cheat-toggle">
            <label class="toggle-label">Infinite Time</label>
            <label class="switch">
              <input type="checkbox" id="infinite-time-toggle">
              <span class="slider round"></span>
            </label>
          </div>
          <div class="cheat-toggle">
            <label class="toggle-label">Auto Win</label>
            <label class="switch">
              <input type="checkbox" id="auto-win-toggle">
              <span class="slider round"></span>
            </label>
          </div>
        </div>
        <div class="cheat-actions">
          <button class="cheat-btn" onclick="window.adminCheatUndo()">↩️ Undo</button>
          <button class="cheat-btn" onclick="window.adminCheatRedo()">↪️ Redo</button>
          <button class="cheat-btn" onclick="window.adminCheatReset()">🔄 Reset</button>
          <button class="cheat-btn" onclick="window.adminCheatKill()">💀 Kill</button>
          <button class="cheat-btn" onclick="window.adminCheatSpawn()">➕ Spawn</button>
          <button class="cheat-btn" onclick="window.adminCheatTime()">⏰ Time</button>
        </div>
        <button id="admin-cheats-close" class="primary-btn">Close</button>
      </div>
    `;
    document.body.appendChild(modal);

    // Close button
    document.getElementById('admin-cheats-close').addEventListener('click', () => {
      modal.classList.add('hidden');
    });
    
    // Free Move Toggle
    document.getElementById('free-move-toggle').addEventListener('change', (e) => {
      window.freeMoveEnabled = e.target.checked;
      console.log('[Admin Cheat] Free Move:', window.freeMoveEnabled ? 'ON' : 'OFF');
      
      if (window.freeMoveEnabled) {
        const game = getGame();
        if (game) {
          // Store original turn function
          window.originalTurn = game.turn;
          
          // Store the current turn value
          window.currentTurnValue = window.originalTurn.call(game);
          
          // Disable anti-cheat move timing check
          if (typeof checkMoveTiming !== 'undefined') {
            window.originalCheckMoveTiming = checkMoveTiming;
            window.checkMoveTiming = function() {
              return { valid: true };
            };
          }
          
          // Track if we're in a player interaction
          window.isPlayerInteraction = false;
          
          // Override turn function to return player's color during player interaction
          game.turn = function() {
            // In bot mode, return player's color during player interaction
            // But return actual turn for bot moves
            if (gameMode === 'bot' && window.isPlayerInteraction) {
              return playerColor;
            }
            // Always return the actual turn value
            return window.currentTurnValue;
          };
          
          // Store the turn function as a method, not a property
          Object.defineProperty(game, 'turn', {
            get: function() {
              if (gameMode === 'bot' && window.isPlayerInteraction) {
                return playerColor;
              }
              return window.currentTurnValue;
            },
            configurable: true
          });
          
          // Override handleSquareClick to set isPlayerInteraction flag
          const originalHandleSquareClick = window.handleSquareClick;
          if (originalHandleSquareClick) {
            window.handleSquareClick = function(square) {
              window.isPlayerInteraction = true;
              const result = originalHandleSquareClick.call(this, square);
              window.isPlayerInteraction = false;
              return result;
            };
          }
          
          // Override aiMove to ensure it doesn't use player interaction flag
          const originalAiMove = window.aiMove;
          if (originalAiMove) {
            window.aiMove = function() {
              window.isPlayerInteraction = false;
              return originalAiMove.call(this);
            };
          }
          // Store original functions
          window.originalMoves = game.moves;
          window.originalMove = game.move;
          
          // Override to return all squares as legal moves
          game.moves = function(options) {
            if (options && options.square) {
              // When checking moves for a specific square, return all squares
              const allSquares = [];
              const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
              for (let rank = 1; rank <= 8; rank++) {
                for (const file of files) {
                  allSquares.push({ to: file + rank, from: options.square });
                }
              }
              return allSquares;
            }
            // Otherwise return original moves
            return window.originalMoves.call(this, options);
          };
                    
          // Override to allow any move by directly manipulating the board
          game.move = function(move) {
            // Get the piece to move
            const piece = this.get(move.from);
            if (!piece) return null;
            
            // Remove piece from original square
            this.remove(move.from);
            
            // Handle captures
            const capturedPiece = this.get(move.to);
            if (capturedPiece) {
              move.captured = capturedPiece.type;
            }
            
            // Put piece on destination square
            this.put(piece, move.to);
            
            // Update turn in both our tracking and chess.js
            window.currentTurnValue = window.currentTurnValue === 'w' ? 'b' : 'w';
            
            // Return move object
            move.color = piece.color;
            move.piece = piece.type;
            move.flags = 'n'; // normal move
            
            // Generate SAN (Standard Algebraic Notation) for logging
            // Format: piece + destination (e.g., "e4", "Nf3", "Qd8")
            const pieceSymbols = {
              'p': '',
              'n': 'N',
              'b': 'B',
              'r': 'R',
              'q': 'Q',
              'k': 'K'
            };
            move.san = pieceSymbols[piece.type] + move.to;
            
            return move;
          };
        }
      } else {
        // Restore original functions
        const game = getGame();
        if (game) {
          if (window.originalMoves) game.moves = window.originalMoves;
          if (window.originalMove) game.move = window.originalMove;
          if (window.originalTurn) game.turn = window.originalTurn;
          if (window.originalCheckMoveTiming) checkMoveTiming = window.originalCheckMoveTiming;
        }
      }
      
      alert(`Free Move ${window.freeMoveEnabled ? 'enabled' : 'disabled'}! You can now move pieces anywhere.`);
    });
    
    // God Mode Toggle
    document.getElementById('god-mode-toggle').addEventListener('change', (e) => {
      window.godModeEnabled = e.target.checked;
      console.log('[Admin Cheat] God Mode:', window.godModeEnabled ? 'ON' : 'OFF');
      
      if (window.godModeEnabled) {
        // Prevent checkmate and stalemate
        const game = getGame();
        if (game) {
          // Store original functions
          window.originalInCheckmate = game.in_checkmate;
          window.originalInStalemate = game.in_stalemate;
          window.originalInDraw = game.in_draw;
          
          // Override to always return false
          game.in_checkmate = function() { return false; };
          game.in_stalemate = function() { return false; };
          game.in_draw = function() { return false; };
        }
      } else {
        // Restore original functions
        const game = getGame();
        if (game) {
          if (window.originalInCheckmate) game.in_checkmate = window.originalInCheckmate;
          if (window.originalInStalemate) game.in_stalemate = window.originalInStalemate;
          if (window.originalInDraw) game.in_draw = window.originalInDraw;
        }
      }
      
      alert(`God Mode ${window.godModeEnabled ? 'enabled' : 'disabled'}!`);
    });
    
    // Infinite Time Toggle
    document.getElementById('infinite-time-toggle').addEventListener('change', (e) => {
      window.infiniteTimeEnabled = e.target.checked;
      console.log('[Admin Cheat] Infinite Time:', window.infiniteTimeEnabled ? 'ON' : 'OFF');
      
      if (window.infiniteTimeEnabled) {
        // Store original times
        if (!window.originalWhiteTime) window.originalWhiteTime = window.whiteTime;
        if (!window.originalBlackTime) window.originalBlackTime = window.blackTime;
        // Set to infinity
        window.whiteTime = Infinity;
        window.blackTime = Infinity;
        
        // Override time decrement function
        if (typeof decrementTime === 'function') {
          window.originalDecrementTime = decrementTime;
          window.decrementTime = function() {
            // Don't decrement time when infinite
            return;
          };
        }
      } else {
        // Restore original times
        window.whiteTime = window.originalWhiteTime || 600000;
        window.blackTime = window.originalBlackTime || 600000;
        
        // Restore time decrement function
        if (window.originalDecrementTime) {
          window.decrementTime = window.originalDecrementTime;
        }
      }
      
      alert(`Infinite Time ${window.infiniteTimeEnabled ? 'enabled' : 'disabled'}!`);
    });
    
    // Auto Win Toggle
    document.getElementById('auto-win-toggle').addEventListener('change', (e) => {
      if (e.target.checked) {
        window.adminCheatWin();
        e.target.checked = false;
      }
    });
  }

  // Cheat functions - Enhanced
  window.adminCheatUndo = function() {
    console.log('[Admin Cheat] Undo move triggered');
    const game = getGame();
    if (game && typeof game.undo === 'function') {
      game.undo();
      // Update the board display
      if (typeof renderPosition === 'function') {
        renderPosition();
      }
      // Update turn indicator
      if (typeof updateTurnIndicator === 'function') {
        updateTurnIndicator();
      }
      alert('Move undone!');
    } else {
      alert('Game not available or undo not supported');
    }
  };

  window.adminCheatRedo = function() {
    console.log('[Admin Cheat] Redo move triggered');
    const game = getGame();
    if (game && typeof game.redo === 'function') {
      game.redo();
      // Update the board display
      if (typeof renderPosition === 'function') {
        renderPosition();
      }
      // Update turn indicator
      if (typeof updateTurnIndicator === 'function') {
        updateTurnIndicator();
      }
      alert('Move redone!');
    } else {
      alert('Redo not available in current game');
    }
  };

  window.adminCheatReset = function() {
    console.log('[Admin Cheat] Reset game triggered');
    // Try to call initBoard function from script.js
    if (typeof initBoard === 'function') {
      initBoard();
      alert('Game reset!');
    } else {
      // Fallback: manually reset the game
      const game = getGame();
      if (game && typeof game.reset === 'function') {
        game.reset();
        if (typeof renderPosition === 'function') {
          renderPosition();
        }
        if (typeof updateTurnIndicator === 'function') {
          updateTurnIndicator();
        }
        alert('Game reset!');
      } else if (typeof resetBtn !== 'undefined' && resetBtn) {
        resetBtn.click();
      } else {
        alert('Reset function not available');
      }
    }
  };

  window.adminCheatWin = function() {
    console.log('[Admin Cheat] Auto win triggered');
    // Check if in bot mode
    if (window.gameMode === 'bot' || !window.socket) {
      // In bot mode - directly trigger win
      const game = getGame();
      if (game) {
        // Set game to checkmate state
        game.put({ type: 'k', color: 'b' }, 'a8');
        game.put({ type: 'k', color: 'w' }, 'b6');
        game.put({ type: 'q', color: 'w' }, 'a7');
        if (typeof renderPosition === 'function') {
          renderPosition();
        }
        alert('Auto win activated! (Bot mode)');
      } else {
        alert('Game not available');
      }
    } else if (window.socket && window.socket.readyState === WebSocket.OPEN) {
      // Online mode - use server message
      window.socket.send(JSON.stringify({ type: 'checkmate' }));
      alert('Auto win activated!');
    } else {
      alert('Socket not connected - cannot activate auto win');
    }
  };

  window.adminCheatKill = function() {
    console.log('[Admin Cheat] Kill piece triggered');
    const square = prompt('Enter square to kill piece (e.g., e4):');
    if (square) {
      // Check if in bot mode or socket not connected
      if (window.gameMode === 'bot' || !window.socket || window.socket.readyState !== WebSocket.OPEN) {
        // Client-side kill for bot mode
        const game = getGame();
        if (game && typeof game.remove === 'function') {
          const piece = game.get(square);
          if (piece) {
            game.remove(square);
            // Update the board display
            if (typeof renderPosition === 'function') {
              renderPosition();
            }
            alert(`Piece at ${square} removed! (Bot mode)`);
          } else {
            alert(`No piece at ${square}`);
          }
        } else {
          alert('Game not available');
        }
      } else {
        // Server-side kill for online mode
        window.socket.send(JSON.stringify({ type: 'killPiece', square }));
        alert(`Kill piece command sent for ${square}!`);
      }
    }
  };

  window.adminCheatSpawn = function() {
    console.log('[Admin Cheat] Spawn piece triggered');
    const piece = prompt('Enter piece to spawn (e.g., wP for white pawn, bQ for black queen):');
    const square = prompt('Enter square (e.g., e4):');
    if (piece && square) {
      const game = getGame();
      if (game && typeof game.put === 'function') {
        // Parse piece code (e.g., wP = white pawn)
        const color = piece[0].toLowerCase() === 'w' ? 'w' : 'b';
        const type = piece[1].toLowerCase();

        try {
          game.put({ type, color }, square);
          // Update the board display
          if (typeof renderPosition === 'function') {
            renderPosition();
          }
          // Update turn indicator
          if (typeof updateTurnIndicator === 'function') {
            updateTurnIndicator();
          }
          const mode = window.gameMode === 'bot' ? ' (Bot mode)' : '';
          alert(`Spawned ${piece} at ${square}!${mode}`);
        } catch (e) {
          alert(`Error spawning piece: ${e.message}`);
        }
      } else {
        alert('Game not available');
      }
    }
  };

  window.adminCheatTime = function() {
    console.log('[Admin Cheat] Add time triggered');
    const minutes = prompt('Enter minutes to add:');
    if (minutes && !isNaN(minutes)) {
      // Add time to both players
      if (window.whiteTime) window.whiteTime += parseInt(minutes) * 60000;
      if (window.blackTime) window.blackTime += parseInt(minutes) * 60000;
      console.log('[Admin Cheat] Added', minutes, 'minutes');
      alert(`Added ${minutes} minutes to both players!`);
    }
  };

  window.adminCheatTimer = function() {
    console.log('[Admin Cheat] Stop timer triggered');
    if (typeof timerInterval !== 'undefined') {
      clearInterval(timerInterval);
      alert('Timer stopped!');
    } else {
      alert('Timer not available');
    }
  };

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdminPanel);
  } else {
    initAdminPanel();
  }
})();
