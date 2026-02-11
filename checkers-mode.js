// Checkers Game Mode with All Features
class CheckersMode {
    constructor() {
        this.board = [];
        this.currentPlayer = 'red';
        this.selectedPiece = null;
        this.validMoves = [];
        this.mustJump = false;
        this.jumpingPiece = null;
        this.gameOver = false;
        this.redPieces = 12;
        this.blackPieces = 12;
        this.moveHistory = [];
        this.capturedPieces = { red: 0, black: 0 };
        this.gameMode = 'bot'; // 'bot', 'online', or 'local'
        this.difficulty = 'medium';
        this.initializeBoard();
    }

    initializeBoard() {
        // Initialize 8x8 board
        this.board = Array(8).fill(null).map(() => Array(8).fill(null));

        // Place red pieces on top 3 rows
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 8; col++) {
                if ((row + col) % 2 === 1) {
                    this.board[row][col] = { color: 'red', isKing: false };
                }
            }
        }

        // Place black pieces on bottom 3 rows
        for (let row = 5; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if ((row + col) % 2 === 1) {
                    this.board[row][col] = { color: 'black', isKing: false };
                }
            }
        }
    }

    getValidMoves(row, col) {
        const piece = this.board[row][col];
        if (!piece || piece.color !== this.currentPlayer) return [];

        const moves = [];
        const directions = piece.isKing 
            ? [[-1, -1], [-1, 1], [1, -1], [1, 1]]
            : piece.color === 'red' 
                ? [[1, -1], [1, 1]]
                : [[-1, -1], [-1, 1]];

        // Check for jumps first
        const jumps = this.getJumps(row, col, piece, directions);

        if (jumps.length > 0) {
            return jumps;
        }

        // If no jumps and not forced to jump, check regular moves
        if (!this.mustJump) {
            for (const [dr, dc] of directions) {
                const newRow = row + dr;
                const newCol = col + dc;

                if (this.isValidPosition(newRow, newCol) && !this.board[newRow][newCol]) {
                    moves.push({
                        from: { row, col },
                        to: { row: newRow, col: newCol },
                        isJump: false
                    });
                }
            }
        }

        return moves;
    }

    getJumps(row, col, piece, directions) {
        const jumps = [];

        for (const [dr, dc] of directions) {
            const midRow = row + dr;
            const midCol = col + dc;
            const jumpRow = row + 2 * dr;
            const jumpCol = col + 2 * dc;

            if (this.isValidPosition(jumpRow, jumpCol) && 
                this.board[midRow][midCol] && 
                this.board[midRow][midCol].color !== piece.color &&
                !this.board[jumpRow][jumpCol]) {

                jumps.push({
                    from: { row, col },
                    to: { row: jumpRow, col: jumpCol },
                    isJump: true,
                    captured: { row: midRow, col: midCol }
                });
            }
        }

        return jumps;
    }

    isValidPosition(row, col) {
        return row >= 0 && row < 8 && col >= 0 && col < 8;
    }

    hasJumpMoves(player) {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.color === player) {
                    const directions = piece.isKing 
                        ? [[-1, -1], [-1, 1], [1, -1], [1, 1]]
                        : player === 'red' 
                            ? [[1, -1], [1, 1]]
                            : [[-1, -1], [-1, 1]];

                    const jumps = this.getJumps(row, col, piece, directions);
                    if (jumps.length > 0) return true;
                }
            }
        }
        return false;
    }

    selectPiece(row, col) {
        if (this.gameOver) return;

        const piece = this.board[row][col];

        // If a piece is jumping and we select a different piece, clear the jump
        if (this.jumpingPiece && 
            (this.jumpingPiece.row !== row || this.jumpingPiece.col !== col)) {
            this.jumpingPiece = null;
            this.mustJump = false;
        }

        // Check if we're selecting a valid piece
        if (piece && piece.color === this.currentPlayer) {
            // If there are mandatory jumps, only allow selecting pieces that can jump
            if (this.mustJump && this.jumpingPiece) {
                if (this.jumpingPiece.row !== row || this.jumpingPiece.col !== col) {
                    return;
                }
            }

            this.selectedPiece = { row, col };
            this.validMoves = this.getValidMoves(row, col);
        }
    }

    makeMove(move) {
        // Save state for undo
        this.saveState();

        const piece = this.board[move.from.row][move.from.col];

        // Move the piece
        this.board[move.to.row][move.to.col] = piece;
        this.board[move.from.row][move.from.col] = null;

        // Handle captures
        if (move.isJump) {
            const capturedPiece = this.board[move.captured.row][move.captured.col];
            this.board[move.captured.row][move.captured.col] = null;

            // Update piece count
            if (capturedPiece.color === 'red') {
                this.redPieces--;
                this.capturedPieces.black++;
            } else {
                this.blackPieces--;
                this.capturedPieces.red++;
            }

            // Check for additional jumps
            const additionalJumps = this.getJumps(move.to.row, move.to.col, piece, 
                piece.isKing ? [[-1, -1], [-1, 1], [1, -1], [1, 1]] :
                piece.color === 'red' ? [[1, -1], [1, 1]] : [[-1, -1], [-1, 1]]);

            if (additionalJumps.length > 0) {
                this.jumpingPiece = { row: move.to.row, col: move.to.col };
                this.mustJump = true;
                this.selectedPiece = { row: move.to.row, col: move.to.col };
                this.validMoves = additionalJumps;
                return { success: true, additionalJumps: true };
            }
        }

        // Check for king promotion
        if ((piece.color === 'red' && move.to.row === 7) ||
            (piece.color === 'black' && move.to.row === 0)) {
            piece.isKing = true;
        }

        // Reset jumping state
        this.jumpingPiece = null;
        this.mustJump = false;

        // Switch players
        this.currentPlayer = this.currentPlayer === 'red' ? 'black' : 'red';
        this.selectedPiece = null;
        this.validMoves = [];

        // Check if the next player must jump
        if (this.hasJumpMoves(this.currentPlayer)) {
            this.mustJump = true;
        }

        // Check for game over
        const winner = this.checkGameOver();

        return { 
            success: true, 
            gameOver: winner !== null,
            winner: winner
        };
    }

    saveState() {
        this.moveHistory.push({
            board: JSON.parse(JSON.stringify(this.board)),
            currentPlayer: this.currentPlayer,
            redPieces: this.redPieces,
            blackPieces: this.blackPieces,
            capturedPieces: {...this.capturedPieces},
            mustJump: this.mustJump,
            jumpingPiece: this.jumpingPiece ? {...this.jumpingPiece} : null
        });
    }

    undoMove() {
        if (this.moveHistory.length === 0) return false;

        const previousState = this.moveHistory.pop();
        this.board = previousState.board;
        this.currentPlayer = previousState.currentPlayer;
        this.redPieces = previousState.redPieces;
        this.blackPieces = previousState.blackPieces;
        this.capturedPieces = previousState.capturedPieces;
        this.mustJump = previousState.mustJump;
        this.jumpingPiece = previousState.jumpingPiece;
        this.selectedPiece = null;
        this.validMoves = [];
        this.gameOver = false;

        return true;
    }

    checkGameOver() {
        if (this.redPieces === 0) {
            this.gameOver = true;
            return 'black';
        }
        if (this.blackPieces === 0) {
            this.gameOver = true;
            return 'red';
        }

        // Check if current player has any valid moves
        let hasValidMove = false;
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.color === this.currentPlayer) {
                    if (this.getValidMoves(row, col).length > 0) {
                        hasValidMove = true;
                        break;
                    }
                }
            }
            if (hasValidMove) break;
        }

        if (!hasValidMove) {
            this.gameOver = true;
            return this.currentPlayer === 'red' ? 'black' : 'red';
        }

        return null;
    }

    // AI Move Logic
    getBestMove(difficulty = 'medium') {
        const allMoves = this.getAllValidMoves();
        if (allMoves.length === 0) return null;

        if (difficulty === 'easy') {
            return allMoves[Math.floor(Math.random() * allMoves.length)];
        }

        // For medium and hard, prioritize jumps
        const jumpMoves = allMoves.filter(move => move.isJump);
        if (jumpMoves.length > 0) {
            if (difficulty === 'medium') {
                return jumpMoves[Math.floor(Math.random() * jumpMoves.length)];
            }
            // Hard: evaluate jump moves
            return this.evaluateMoves(jumpMoves);
        }

        // No jumps available, evaluate regular moves
        return this.evaluateMoves(allMoves);
    }

    getAllValidMoves() {
        const moves = [];
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.color === this.currentPlayer) {
                    const pieceMoves = this.getValidMoves(row, col);
                    moves.push(...pieceMoves);
                }
            }
        }
        return moves;
    }

    evaluateMoves(moves) {
        let bestMove = moves[0];
        let bestScore = -Infinity;

        for (const move of moves) {
            let score = 0;

            // Prioritize jumps
            if (move.isJump) score += 10;

            // Prioritize king promotion
            const piece = this.board[move.from.row][move.from.col];
            if ((piece.color === 'red' && move.to.row === 7) ||
                (piece.color === 'black' && move.to.row === 0)) {
                score += 5;
            }

            // Prefer center positions
            if (move.to.col >= 2 && move.to.col <= 5) {
                score += 1;
            }

            // Prefer advancing towards promotion
            if (piece.color === 'black' && move.to.row < move.from.row) {
                score += 1;
            } else if (piece.color === 'red' && move.to.row > move.from.row) {
                score += 1;
            }

            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }

        return bestMove;
    }

    getBoardState() {
        return {
            board: this.board,
            currentPlayer: this.currentPlayer,
            selectedPiece: this.selectedPiece,
            validMoves: this.validMoves,
            mustJump: this.mustJump,
            gameOver: this.gameOver,
            redPieces: this.redPieces,
            blackPieces: this.blackPieces,
            capturedPieces: this.capturedPieces,
            gameMode: this.gameMode,
            difficulty: this.difficulty
        };
    }

    resetGame() {
        this.initializeBoard();
        this.currentPlayer = 'red';
        this.selectedPiece = null;
        this.validMoves = [];
        this.mustJump = false;
        this.jumpingPiece = null;
        this.gameOver = false;
        this.redPieces = 12;
        this.blackPieces = 12;
        this.moveHistory = [];
        this.capturedPieces = { red: 0, black: 0 };
    }

    setGameMode(mode) {
        this.gameMode = mode;
    }

    setDifficulty(difficulty) {
        this.difficulty = difficulty;
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CheckersMode;
}
