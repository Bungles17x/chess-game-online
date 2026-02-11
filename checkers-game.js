// Checkers Game UI Controller
class CheckersGameUI {
    constructor() {
        this.game = new CheckersGame();
        this.moveHistory = [];
        this.redCaptured = 0;
        this.blackCaptured = 0;
        this.initializeUI();
        this.bindEvents();
        this.render();
    }

    initializeUI() {
        this.boardElement = document.getElementById('checkers-board');
        this.statusElement = document.getElementById('checkers-status');
        this.redPiecesElement = document.getElementById('red-pieces');
        this.blackPiecesElement = document.getElementById('black-pieces');
        this.redCapturedElement = document.getElementById('red-captured');
        this.blackCapturedElement = document.getElementById('black-captured');
    }

    bindEvents() {
        document.getElementById('new-game-btn').addEventListener('click', () => this.newGame());
        document.getElementById('undo-btn').addEventListener('click', () => this.undoMove());
        document.getElementById('hint-btn').addEventListener('click', () => this.showHint());
        document.getElementById('resign-btn').addEventListener('click', () => this.resign());
        document.getElementById('back-to-menu-btn').addEventListener('click', () => {
            window.location.href = 'index.html';
        });
        document.getElementById('alert-close').addEventListener('click', () => {
            document.getElementById('alert-box').classList.add('hidden');
        });
    }

    render() {
        this.renderBoard();
        this.updateStatus();
        this.updateStats();
    }

    renderBoard() {
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
        if (this.game.gameOver) return;

        const state = this.game.getBoardState();

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
        // Save state for undo
        this.saveState();

        // Execute the move
        this.game.makeMove(move);

        // Update captured count
        if (move.isJump) {
            const capturedPiece = move.captured;
            if (this.game.board[capturedPiece.row][capturedPiece.col]) {
                // Piece was captured
                if (this.game.currentPlayer === 'red') {
                    this.blackCaptured++;
                } else {
                    this.redCaptured++;
                }
            }
        }

        // Check for game over
        if (this.game.gameOver) {
            this.showGameOver(this.game.currentPlayer === 'red' ? 'Black' : 'Red');
        }

        this.render();
    }

    saveState() {
        const state = this.game.getBoardState();
        this.moveHistory.push({
            board: JSON.parse(JSON.stringify(state.board)),
            currentPlayer: state.currentPlayer,
            redPieces: state.redPieces,
            blackPieces: state.blackPieces,
            redCaptured: this.redCaptured,
            blackCaptured: this.blackCaptured,
            mustJump: this.game.mustJump,
            jumpingPiece: this.game.jumpingPiece ? {...this.game.jumpingPiece} : null
        });
    }

    undoMove() {
        if (this.moveHistory.length === 0) {
            this.showAlert('No moves to undo');
            return;
        }

        const previousState = this.moveHistory.pop();
        this.game.board = previousState.board;
        this.game.currentPlayer = previousState.currentPlayer;
        this.game.redPieces = previousState.redPieces;
        this.game.blackPieces = previousState.blackPieces;
        this.redCaptured = previousState.redCaptured;
        this.blackCaptured = previousState.blackCaptured;
        this.game.mustJump = previousState.mustJump;
        this.game.jumpingPiece = previousState.jumpingPiece;
        this.game.selectedPiece = null;
        this.game.validMoves = [];
        this.game.gameOver = false;

        this.render();
    }

    showHint() {
        if (this.game.gameOver) return;

        const state = this.game.getBoardState();
        if (state.validMoves.length === 0) {
            this.showAlert('No valid moves available');
            return;
        }

        // Find the best move (prioritize jumps)
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
        }
    }

    newGame() {
        if (confirm('Start a new game? Current progress will be lost.')) {
            this.game = new CheckersGame();
            this.moveHistory = [];
            this.redCaptured = 0;
            this.blackCaptured = 0;
            this.render();
        }
    }

    updateStatus() {
        const state = this.game.getBoardState();
        const playerName = state.currentPlayer === 'red' ? 'Red' : 'Black';

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

    updateStats() {
        const state = this.game.getBoardState();
        this.redPiecesElement.textContent = state.redPieces;
        this.blackPiecesElement.textContent = state.blackPieces;
        this.redCapturedElement.textContent = this.redCaptured;
        this.blackCapturedElement.textContent = this.blackCaptured;
    }

    showGameOver(winner) {
        this.showAlert(`Game Over! ${winner} wins!`);
    }

    showAlert(message) {
        const alertBox = document.getElementById('alert-box');
        const alertMessage = document.getElementById('alert-message');
        alertMessage.textContent = message;
        alertBox.classList.remove('hidden');
    }
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new CheckersGameUI();
});
