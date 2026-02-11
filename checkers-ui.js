// Checkers Game UI Controller
class CheckersUI {
    constructor() {
        this.game = new CheckersMode();
        this.currentView = 'menu'; // 'menu', 'game', 'settings'
        this.isBotMode = false;
        this.botDifficulty = 'medium';
        this.isOnlineMode = false;
        this.socket = null;
        this.roomId = null;
        this.playerColor = null;
        this.opponentColor = null;
        this.chatMessages = [];
        this.moveHistory = [];
        this.gameTime = { red: 0, black: 0 };
        this.timerInterval = null;
        this.soundEnabled = true;
        this.theme = 'classic';
        this.particleEffects = true;

        this.initializeUI();
        this.bindEvents();
        this.showMenu();
    }

    initializeUI() {
        // Get DOM elements
        this.boardElement = document.getElementById('checkers-board');
        this.statusElement = document.getElementById('checkers-status');
        this.redPiecesElement = document.getElementById('red-pieces');
        this.blackPiecesElement = document.getElementById('black-pieces');
        this.redCapturedElement = document.getElementById('red-captured');
        this.blackCapturedElement = document.getElementById('black-captured');
        this.timerRedElement = document.getElementById('timer-red');
        this.timerBlackElement = document.getElementById('timer-black');
        this.chatMessagesElement = document.getElementById('chat-messages');
        this.chatInputElement = document.getElementById('chat-input');
    }

    bindEvents() {
        // Game controls
        document.getElementById('new-game-btn')?.addEventListener('click', () => this.newGame());
        document.getElementById('undo-btn')?.addEventListener('click', () => this.undoMove());
        document.getElementById('hint-btn')?.addEventListener('click', () => this.showHint());
        document.getElementById('resign-btn')?.addEventListener('click', () => this.resign());
        document.getElementById('save-game-btn')?.addEventListener('click', () => this.saveGame());
        document.getElementById('load-game-btn')?.addEventListener('click', () => this.loadGame());

        // Mode selection
        document.getElementById('bot-mode-btn')?.addEventListener('click', () => this.startBotGame());
        document.getElementById('online-mode-btn')?.addEventListener('click', () => this.startOnlineGame());
        document.getElementById('local-mode-btn')?.addEventListener('click', () => this.startLocalGame());

        // Difficulty selection
        document.getElementById('difficulty-easy')?.addEventListener('click', () => this.setDifficulty('easy'));
        document.getElementById('difficulty-medium')?.addEventListener('click', () => this.setDifficulty('medium'));
        document.getElementById('difficulty-hard')?.addEventListener('click', () => this.setDifficulty('hard'));

        // Chat
        document.getElementById('send-chat-btn')?.addEventListener('click', () => this.sendChatMessage());
        this.chatInputElement?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendChatMessage();
        });

        // Navigation
        document.getElementById('back-to-menu-btn')?.addEventListener('click', () => this.showMenu());
        document.getElementById('settings-btn')?.addEventListener('click', () => this.showSettings());

        // Theme
        document.getElementById('theme-classic')?.addEventListener('click', () => this.setTheme('classic'));
        document.getElementById('theme-modern')?.addEventListener('click', () => this.setTheme('modern'));
        document.getElementById('theme-minimal')?.addEventListener('click', () => this.setTheme('minimal'));

        // Sound toggle
        document.getElementById('sound-toggle')?.addEventListener('change', (e) => {
            this.soundEnabled = e.target.checked;
        });

        // Particle effects toggle
        document.getElementById('particles-toggle')?.addEventListener('change', (e) => {
            this.particleEffects = e.target.checked;
        });
    }

    showMenu() {
        this.currentView = 'menu';
        this.hideAllViews();
        document.getElementById('menu-view')?.classList.remove('hidden');
        this.stopTimer();
    }

    showGame() {
        this.currentView = 'game';
        this.hideAllViews();
        document.getElementById('game-view')?.classList.remove('hidden');
        this.render();
        this.startTimer();
    }

    showSettings() {
        this.currentView = 'settings';
        this.hideAllViews();
        document.getElementById('settings-view')?.classList.remove('hidden');
    }

    hideAllViews() {
        document.querySelectorAll('.view').forEach(view => view.classList.add('hidden'));
    }

    startBotGame() {
        this.isBotMode = true;
        this.isOnlineMode = false;
        this.game.setGameMode('bot');
        this.game.setDifficulty(this.botDifficulty);
        this.newGame();
        this.showGame();
    }

    startOnlineGame() {
        this.isBotMode = false;
        this.isOnlineMode = true;
        this.game.setGameMode('online');
        this.connectToServer();
        this.showGame();
    }

    startLocalGame() {
        this.isBotMode = false;
        this.isOnlineMode = false;
        this.game.setGameMode('local');
        this.newGame();
        this.showGame();
    }

    newGame() {
        if (confirm('Start a new game? Current progress will be lost.')) {
            this.game.resetGame();
            this.moveHistory = [];
            this.gameTime = { red: 0, black: 0 };
            this.render();
            this.startTimer();

            // If bot mode and bot plays first, make bot move
            if (this.isBotMode && this.game.currentPlayer === 'black') {
                setTimeout(() => this.makeBotMove(), 500);
            }
        }
    }

    render() {
        this.renderBoard();
        this.updateStatus();
        this.updateStats();
        this.updateTimer();
    }

    renderBoard() {
        if (!this.boardElement) return;

        this.boardElement.innerHTML = '';
        const state = this.game.getBoardState();

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const square = document.createElement('div');
                const isDark = (row + col) % 2 === 1;

                square.className = `checkers-square ${isDark ? 'dark' : 'light'}`;
                square.dataset.row = row;
                square.dataset.col = col;

                // Check if this square is selected
                if (state.selectedPiece && 
                    state.selectedPiece.row === row && 
                    state.selectedPiece.col === col) {
                    square.classList.add('selected');
                }

                // Check if this is a valid move destination
                const isValidMove = state.validMoves.some(move => 
                    move.to.row === row && move.to.col === col
                );
                if (isValidMove) {
                    square.classList.add('valid-move');
                    square.addEventListener('click', () => this.handleSquareClick(row, col));
                }

                // Add piece if present
                const piece = state.board[row][col];
                if (piece) {
                    const pieceElement = document.createElement('div');
                    pieceElement.className = `checkers-piece ${piece.color}`;
                    if (piece.isKing) {
                        pieceElement.classList.add('king');
                    }
                    square.appendChild(pieceElement);

                    if (!isValidMove) {
                        square.addEventListener('click', () => this.handleSquareClick(row, col));
                    }
                }

                this.boardElement.appendChild(square);
            }
        }
    }

    handleSquareClick(row, col) {
        const state = this.game.getBoardState();

        // Check if it's player's turn (not bot)
        if (this.isBotMode && state.currentPlayer === 'black') {
            return;
        }

        // Check if clicking on a valid move
        const validMove = state.validMoves.find(move => 
            move.to.row === row && move.to.col === col
        );

        if (validMove) {
            this.executeMove(validMove);
        } else {
            // Try to select a piece
            this.game.selectPiece(row, col);
            this.render();
        }
    }

    executeMove(move) {
        const result = this.game.makeMove(move);

        if (result.success) {
            this.moveHistory.push(move);
            this.playSound(result.additionalJumps ? 'capture' : 'move');

            if (this.particleEffects && move.isJump) {
                this.createCaptureEffect(move.captured.row, move.captured.col);
            }

            // Check for game over
            if (result.gameOver) {
                this.showGameOver(result.winner);
                this.stopTimer();
            } else if (!result.additionalJumps) {
                // If bot mode and it's bot's turn, make bot move
                if (this.isBotMode && this.game.currentPlayer === 'black') {
                    setTimeout(() => this.makeBotMove(), 500);
                }

                // If online mode, send move to opponent
                if (this.isOnlineMode && this.socket) {
                    this.socket.emit('checkersMove', {
                        roomId: this.roomId,
                        move: move
                    });
                }
            }

            this.render();
        }
    }

    makeBotMove() {
        const move = this.game.getBestMove(this.botDifficulty);
        if (move) {
            this.executeMove(move);
        }
    }

    undoMove() {
        // In bot mode, undo two moves (player + bot)
        const movesToUndo = this.isBotMode ? 2 : 1;

        for (let i = 0; i < movesToUndo; i++) {
            if (!this.game.undoMove()) break;
            this.moveHistory.pop();
        }

        this.render();
    }

    showHint() {
        const state = this.game.getBoardState();
        if (state.validMoves.length === 0) {
            this.showAlert('No valid moves available');
            return;
        }

        // Find the best move
        let bestMove = state.validMoves[0];
        for (const move of state.validMoves) {
            if (move.isJump) {
                bestMove = move;
                break;
            }
        }

        // Highlight the suggested move
        const squares = this.boardElement.querySelectorAll('.checkers-square');
        squares.forEach(square => {
            const row = parseInt(square.dataset.row);
            const col = parseInt(square.dataset.col);

            if ((row === bestMove.from.row && col === bestMove.from.col) ||
                (row === bestMove.to.row && col === bestMove.to.col)) {
                square.style.boxShadow = 'inset 0 0 0 4px var(--gold)';
            }
        });

        // Remove highlight after 2 seconds
        setTimeout(() => {
            squares.forEach(square => {
                square.style.boxShadow = '';
            });
        }, 2000);
    }

    resign() {
        if (confirm('Are you sure you want to resign?')) {
            const winner = this.game.currentPlayer === 'red' ? 'Black' : 'Red';
            this.game.gameOver = true;
            this.showGameOver(winner);
            this.stopTimer();

            if (this.isOnlineMode && this.socket) {
                this.socket.emit('checkersResign', {
                    roomId: this.roomId,
                    winner: winner
                });
            }
        }
    }

    saveGame() {
        const gameState = {
            board: this.game.board,
            currentPlayer: this.game.currentPlayer,
            redPieces: this.game.redPieces,
            blackPieces: this.game.blackPieces,
            capturedPieces: this.game.capturedPieces,
            moveHistory: this.moveHistory,
            gameTime: this.gameTime,
            gameMode: this.game.gameMode,
            difficulty: this.game.difficulty,
            timestamp: new Date().toISOString()
        };

        const savedGames = JSON.parse(localStorage.getItem('checkersSavedGames') || '[]');
        savedGames.push(gameState);
        localStorage.setItem('checkersSavedGames', JSON.stringify(savedGames));

        this.showAlert('Game saved successfully!');
    }

    loadGame() {
        const savedGames = JSON.parse(localStorage.getItem('checkersSavedGames') || '[]');
        if (savedGames.length === 0) {
            this.showAlert('No saved games found');
            return;
        }

        // Load the most recent game
        const gameState = savedGames[savedGames.length - 1];

        this.game.board = gameState.board;
        this.game.currentPlayer = gameState.currentPlayer;
        this.game.redPieces = gameState.redPieces;
        this.game.blackPieces = gameState.blackPieces;
        this.game.capturedPieces = gameState.capturedPieces;
        this.game.gameMode = gameState.gameMode;
        this.game.difficulty = gameState.difficulty;
        this.moveHistory = gameState.moveHistory;
        this.gameTime = gameState.gameTime;

        this.isBotMode = gameState.gameMode === 'bot';
        this.isOnlineMode = gameState.gameMode === 'online';

        this.render();
        this.showGame();
    }

    setDifficulty(difficulty) {
        this.botDifficulty = difficulty;
        this.game.setDifficulty(difficulty);

        // Update UI
        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById(`difficulty-${difficulty}`)?.classList.add('active');
    }

    setTheme(theme) {
        this.theme = theme;
        document.body.className = `${theme}-theme`;

        // Save preference
        localStorage.setItem('checkersTheme', theme);
    }

    startTimer() {
        this.stopTimer();
        this.timerInterval = setInterval(() => {
            if (this.game.gameOver) return;

            const currentPlayer = this.game.currentPlayer;
            this.gameTime[currentPlayer]++;
            this.updateTimer();
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    updateTimer() {
        if (this.timerRedElement) {
            const minutes = Math.floor(this.gameTime.red / 60);
            const seconds = this.gameTime.red % 60;
            this.timerRedElement.textContent = 
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }

        if (this.timerBlackElement) {
            const minutes = Math.floor(this.gameTime.black / 60);
            const seconds = this.gameTime.black % 60;
            this.timerBlackElement.textContent = 
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    updateStatus() {
        const state = this.game.getBoardState();
        const playerName = state.currentPlayer === 'red' ? 'Red' : 'Black';

        if (this.statusElement) {
            this.statusElement.className = `checkers-status ${state.currentPlayer}-turn`;

            if (state.mustJump) {
                this.statusElement.classList.add('must-jump');
                this.statusElement.textContent = `${playerName} must jump!`;
            } else {
                this.statusElement.textContent = `${playerName}'s Turn`;
            }

            if (state.gameOver) {
                this.statusElement.textContent = `Game Over - ${playerName} wins!`;
            }
        }
    }

    updateStats() {
        const state = this.game.getBoardState();

        if (this.redPiecesElement) {
            this.redPiecesElement.textContent = state.redPieces;
        }
        if (this.blackPiecesElement) {
            this.blackPiecesElement.textContent = state.blackPieces;
        }
        if (this.redCapturedElement) {
            this.redCapturedElement.textContent = state.capturedPieces.red;
        }
        if (this.blackCapturedElement) {
            this.blackCapturedElement.textContent = state.capturedPieces.black;
        }
    }

    sendChatMessage() {
        if (!this.chatInputElement || !this.chatMessagesElement) return;

        const message = this.chatInputElement.value.trim();
        if (!message) return;

        const chatMessage = {
            text: message,
            sender: 'player',
            timestamp: new Date().toISOString()
        };

        this.chatMessages.push(chatMessage);
        this.renderChatMessage(chatMessage);

        this.chatInputElement.value = '';

        // If online mode, send message to opponent
        if (this.isOnlineMode && this.socket) {
            this.socket.emit('checkersChat', {
                roomId: this.roomId,
                message: chatMessage
            });
        }
    }

    renderChatMessage(message) {
        if (!this.chatMessagesElement) return;

        const messageElement = document.createElement('div');
        messageElement.className = `chat-message ${message.sender}`;
        messageElement.innerHTML = `
            <span class="chat-sender">${message.sender === 'player' ? 'You' : 'Opponent'}:</span>
            <span class="chat-text">${message.text}</span>
            <span class="chat-time">${new Date(message.timestamp).toLocaleTimeString()}</span>
        `;

        this.chatMessagesElement.appendChild(messageElement);
        this.chatMessagesElement.scrollTop = this.chatMessagesElement.scrollHeight;
    }

    connectToServer() {
        // This would connect to your WebSocket server
        // Implementation depends on your server setup
        if (typeof io !== 'undefined') {
            this.socket = io();

            this.socket.on('checkersRoomJoined', (data) => {
                this.roomId = data.roomId;
                this.playerColor = data.color;
                this.opponentColor = data.color === 'red' ? 'black' : 'red';
                this.showAlert(`Joined room as ${this.playerColor}`);
            });

            this.socket.on('checkersMove', (data) => {
                if (data.roomId === this.roomId) {
                    this.executeMove(data.move);
                }
            });

            this.socket.on('checkersChat', (data) => {
                if (data.roomId === this.roomId) {
                    this.chatMessages.push(data.message);
                    this.renderChatMessage(data.message);
                }
            });

            this.socket.on('checkersResign', (data) => {
                if (data.roomId === this.roomId) {
                    this.showGameOver(data.winner);
                }
            });

            this.socket.on('checkersOpponentDisconnected', () => {
                this.showAlert('Opponent disconnected');
                this.game.gameOver = true;
            });
        }
    }

    createCaptureEffect(row, col) {
        if (!this.boardElement) return;

        const square = this.boardElement.querySelector(
            `.checkers-square[data-row="${row}"][data-col="${col}"]`
        );

        if (!square) return;

        const particles = document.createElement('div');
        particles.className = 'capture-particles';
        square.appendChild(particles);

        // Create particle elements
        for (let i = 0; i < 8; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.setProperty('--angle', `${(i / 8) * 360}deg`);
            particles.appendChild(particle);
        }

        // Remove particles after animation
        setTimeout(() => {
            particles.remove();
        }, 500);
    }

    playSound(type) {
        if (!this.soundEnabled) return;

        const soundElement = document.getElementById(`${type}-sound`);
        if (soundElement) {
            soundElement.currentTime = 0;
            soundElement.play().catch(() => {});
        }
    }

    showGameOver(winner) {
        this.showAlert(`Game Over! ${winner} wins!`);

        // Save game to history
        const gameResult = {
            winner: winner,
            moves: this.moveHistory.length,
            gameTime: this.gameTime.red + this.gameTime.black,
            timestamp: new Date().toISOString()
        };

        const gameHistory = JSON.parse(localStorage.getItem('checkersGameHistory') || '[]');
        gameHistory.push(gameResult);
        localStorage.setItem('checkersGameHistory', JSON.stringify(gameHistory));
    }

    showAlert(message) {
        const alertBox = document.getElementById('alert-box');
        const alertMessage = document.getElementById('alert-message');

        if (alertBox && alertMessage) {
            alertMessage.textContent = message;
            alertBox.classList.remove('hidden');

            setTimeout(() => {
                alertBox.classList.add('hidden');
            }, 3000);
        }
    }
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.checkersUI = new CheckersUI();
});
