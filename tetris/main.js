"use strict";

(function () {
	const BLOCK_SIZE = 30; // px per cell when drawing to canvas
	const COLS = 10;
	const ROWS = 20;

	const SCORE_PER_LINE = [0, 100, 300, 500, 800]; // 1..4 lines
	const LINES_PER_LEVEL = 10;

	const KEY = {
		LEFT: "ArrowLeft",
		RIGHT: "ArrowRight",
		DOWN: "ArrowDown",
		DROP: " ", // Space
		ROTATE_CW: "ArrowUp",
		ROTATE_CW_ALT: "x",
		ROTATE_CCW: "z",
		PAUSE: "p",
		RESTART: "r",
	};

	const TETROMINOES = {
		I: {
			color: "#00bcd4",
			rotations: [
				[
					[0, 0, 0, 0],
					[1, 1, 1, 1],
					[0, 0, 0, 0],
					[0, 0, 0, 0],
				],
				[
					[0, 0, 1, 0],
					[0, 0, 1, 0],
					[0, 0, 1, 0],
					[0, 0, 1, 0],
				],
				[
					[0, 0, 0, 0],
					[0, 0, 0, 0],
					[1, 1, 1, 1],
					[0, 0, 0, 0],
				],
				[
					[0, 1, 0, 0],
					[0, 1, 0, 0],
					[0, 1, 0, 0],
					[0, 1, 0, 0],
				],
			],
		},
		J: {
			color: "#3f51b5",
			rotations: [
				[
					[1, 0, 0],
					[1, 1, 1],
					[0, 0, 0],
				],
				[
					[0, 1, 1],
					[0, 1, 0],
					[0, 1, 0],
				],
				[
					[0, 0, 0],
					[1, 1, 1],
					[0, 0, 1],
				],
				[
					[0, 1, 0],
					[0, 1, 0],
					[1, 1, 0],
				],
			],
		},
		L: {
			color: "#ff9800",
			rotations: [
				[
					[0, 0, 1],
					[1, 1, 1],
					[0, 0, 0],
				],
				[
					[0, 1, 0],
					[0, 1, 0],
					[0, 1, 1],
				],
				[
					[0, 0, 0],
					[1, 1, 1],
					[1, 0, 0],
				],
				[
					[1, 1, 0],
					[0, 1, 0],
					[0, 1, 0],
				],
			],
		},
		O: {
			color: "#ffeb3b",
			rotations: [
				[
					[1, 1],
					[1, 1],
				],
			],
		},
		S: {
			color: "#4caf50",
			rotations: [
				[
					[0, 1, 1],
					[1, 1, 0],
					[0, 0, 0],
				],
				[
					[0, 1, 0],
					[0, 1, 1],
					[0, 0, 1],
				],
			],
		},
		T: {
			color: "#9c27b0",
			rotations: [
				[
					[0, 1, 0],
					[1, 1, 1],
					[0, 0, 0],
				],
				[
					[0, 1, 0],
					[0, 1, 1],
					[0, 1, 0],
				],
				[
					[0, 0, 0],
					[1, 1, 1],
					[0, 1, 0],
				],
				[
					[0, 1, 0],
					[1, 1, 0],
					[0, 1, 0],
				],
			],
		},
		Z: {
			color: "#e91e63",
			rotations: [
				[
					[1, 1, 0],
					[0, 1, 1],
					[0, 0, 0],
				],
				[
					[0, 0, 1],
					[0, 1, 1],
					[0, 1, 0],
				],
			],
		},
	};

	const PIECE_TYPES = Object.keys(TETROMINOES);

	// DOM
	const canvas = document.getElementById("game");
	const ctx = canvas.getContext("2d");
	const nextCanvas = document.getElementById("next");
	const nextCtx = nextCanvas.getContext("2d");
	const scoreEl = document.getElementById("score");
	const levelEl = document.getElementById("level");
	const linesEl = document.getElementById("lines");

	// Derived sizes (actual canvas drawing uses raw width/height)
	canvas.width = COLS * BLOCK_SIZE;
	canvas.height = ROWS * BLOCK_SIZE;

	// Game state
	let board = createEmptyBoard();
	let currentPiece = null;
	let nextQueue = [];
	let dropCounterMs = 0;
	let lastTime = 0;
	let isPaused = false;
	let isGameOver = false;
	let score = 0;
	let lines = 0;
	let level = 1;

	function createEmptyBoard() {
		return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
	}

	function newBag() {
		const bag = PIECE_TYPES.slice();
		for (let i = bag.length - 1; i > 0; i -= 1) {
			const j = Math.floor(Math.random() * (i + 1));
			[bag[i], bag[j]] = [bag[j], bag[i]];
		}
		return bag;
	}

	function ensureQueue() {
		if (nextQueue.length < 7) {
			nextQueue = nextQueue.concat(newBag());
		}
	}

	function spawnPiece() {
		ensureQueue();
		const type = nextQueue.shift();
		const def = TETROMINOES[type];
		const rotationIndex = 0;
		const shape = def.rotations[rotationIndex];
		const startCol = Math.floor((COLS - shape[0].length) / 2);
		currentPiece = {
			type,
			row: 0,
			col: startCol,
			rotationIndex,
			color: def.color,
		};

		if (collides(board, currentPiece, 0, 0, rotationIndex)) {
			isGameOver = true;
		}
	}

	function rotate(piece, dir) {
		const def = TETROMINOES[piece.type];
		const nextIndex = (piece.rotationIndex + (dir > 0 ? 1 : def.rotations.length - 1)) % def.rotations.length;

		// Try wall kicks: no SRS, but basic horizontal kicks
		const kicks = [0, -1, 1, -2, 2];
		for (const kick of kicks) {
			if (!collides(board, piece, 0, kick, nextIndex)) {
				piece.rotationIndex = nextIndex;
				piece.col += kick;
				return;
			}
		}
	}

	function collides(grid, piece, dRow, dCol, rotationIndexOverride) {
		const def = TETROMINOES[piece.type];
		const shape = def.rotations[rotationIndexOverride ?? piece.rotationIndex];
		for (let r = 0; r < shape.length; r += 1) {
			for (let c = 0; c < shape[r].length; c += 1) {
				if (!shape[r][c]) continue;
				const newRow = piece.row + r + dRow;
				const newCol = piece.col + c + dCol;
				if (newCol < 0 || newCol >= COLS || newRow >= ROWS) {
					return true;
				}
				if (newRow >= 0 && grid[newRow][newCol]) {
					return true;
				}
			}
		}
		return false;
	}

	function merge(grid, piece) {
		const def = TETROMINOES[piece.type];
		const shape = def.rotations[piece.rotationIndex];
		for (let r = 0; r < shape.length; r += 1) {
			for (let c = 0; c < shape[r].length; c += 1) {
				if (!shape[r][c]) continue;
				const br = piece.row + r;
				const bc = piece.col + c;
				if (br >= 0 && br < ROWS && bc >= 0 && bc < COLS) {
					grid[br][bc] = piece.color;
				}
			}
		}
	}

	function clearLines() {
		let cleared = 0;
		for (let r = ROWS - 1; r >= 0; r -= 1) {
			if (board[r].every((cell) => cell)) {
				board.splice(r, 1);
				board.unshift(Array(COLS).fill(null));
				cleared += 1;
				r += 1; // recheck same row index after unshift
			}
		}
		if (cleared > 0) {
			lines += cleared;
			score += (SCORE_PER_LINE[cleared] || 0) * level;
			const newLevel = Math.floor(lines / LINES_PER_LEVEL) + 1;
			if (newLevel > level) level = newLevel;
			updateHUD();
		}
	}

	function dropIntervalMsForLevel(lvl) {
		// Exponential speed up; clamp minimum interval
		const base = 1000;
		const interval = Math.max(70, Math.floor(base * Math.pow(0.88, lvl - 1)));
		return interval;
	}

	function hardDrop() {
		if (!currentPiece) return;
		let steps = 0;
		while (!collides(board, currentPiece, 1, 0)) {
			currentPiece.row += 1;
			steps += 1;
		}
		score += steps * 2; // reward hard drop
		lockPiece();
	}

	function softDrop() {
		if (!currentPiece) return;
		if (!collides(board, currentPiece, 1, 0)) {
			currentPiece.row += 1;
			score += 1;
			updateHUD();
		} else {
			lockPiece();
		}
	}

	function lockPiece() {
		merge(board, currentPiece);
		clearLines();
		spawnPiece();
	}

	function updateHUD() {
		scoreEl.textContent = String(score);
		levelEl.textContent = String(level);
		linesEl.textContent = String(lines);
	}

	function drawCell(ctx, x, y, color) {
		const s = BLOCK_SIZE;
		ctx.fillStyle = color;
		ctx.fillRect(x * s, y * s, s, s);
		ctx.strokeStyle = "rgba(255,255,255,0.12)";
		ctx.lineWidth = 1;
		ctx.strokeRect(x * s + 0.5, y * s + 0.5, s - 1, s - 1);
	}

	function drawBoard() {
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		// Grid background
		ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--grid-color") || "rgba(255,255,255,0.06)";
		for (let r = 0; r < ROWS; r += 1) {
			for (let c = 0; c < COLS; c += 1) {
				ctx.strokeRect(c * BLOCK_SIZE + 0.5, r * BLOCK_SIZE + 0.5, BLOCK_SIZE - 1, BLOCK_SIZE - 1);
			}
		}

		// Board cells
		for (let r = 0; r < ROWS; r += 1) {
			for (let c = 0; c < COLS; c += 1) {
				const color = board[r][c];
				if (color) drawCell(ctx, c, r, color);
			}
		}
	}

	function computeGhost(piece) {
		const ghost = { ...piece };
		while (!collides(board, ghost, 1, 0)) {
			ghost.row += 1;
		}
		return ghost;
	}

	function drawPiece(piece, isGhost = false) {
		const def = TETROMINOES[piece.type];
		const shape = def.rotations[piece.rotationIndex];
		for (let r = 0; r < shape.length; r += 1) {
			for (let c = 0; c < shape[r].length; c += 1) {
				if (!shape[r][c]) continue;
				const x = piece.col + c;
				const y = piece.row + r;
				if (y < 0) continue; // above the visible board
				if (isGhost) {
					const ghostColor = "rgba(255, 255, 255, 0.18)";
					drawCell(ctx, x, y, ghostColor);
				} else {
					drawCell(ctx, x, y, piece.color);
				}
			}
		}
	}

	function drawNext() {
		nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
		ensureQueue();
		const type = nextQueue[0];
		const def = TETROMINOES[type];
		const shape = def.rotations[0];
		const s = 24;
		const offsetX = Math.floor((nextCanvas.width - shape[0].length * s) / 2);
		const offsetY = Math.floor((nextCanvas.height - shape.length * s) / 2);
		for (let r = 0; r < shape.length; r += 1) {
			for (let c = 0; c < shape[r].length; c += 1) {
				if (!shape[r][c]) continue;
				nextCtx.fillStyle = def.color;
				nextCtx.fillRect(offsetX + c * s, offsetY + r * s, s, s);
				nextCtx.strokeStyle = "rgba(255,255,255,0.12)";
				nextCtx.strokeRect(offsetX + c * s + 0.5, offsetY + r * s + 0.5, s - 1, s - 1);
			}
		}
	}

	function update(time = 0) {
		if (isPaused || isGameOver) {
			draw();
			return requestAnimationFrame(update);
		}
		const delta = time - lastTime;
		lastTime = time;
		dropCounterMs += delta;
		const interval = dropIntervalMsForLevel(level);
		if (dropCounterMs >= interval) {
			dropCounterMs = 0;
			if (!collides(board, currentPiece, 1, 0)) {
				currentPiece.row += 1;
			} else {
				lockPiece();
			}
		}
		draw();
		requestAnimationFrame(update);
	}

	function draw() {
		drawBoard();
		if (currentPiece) {
			const ghost = computeGhost(currentPiece);
			drawPiece(ghost, true);
			drawPiece(currentPiece, false);
		}
		drawNext();

		if (isGameOver) {
			overlayText("Game Over - Press R to Restart");
		} else if (isPaused) {
			overlayText("Paused");
		}
	}

	function overlayText(text) {
		ctx.save();
		ctx.fillStyle = "rgba(11, 16, 32, 0.6)";
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		ctx.fillStyle = "#e6edf3";
		ctx.font = "bold 20px ui-sans-serif, system-ui";
		ctx.textAlign = "center";
		ctx.fillText(text, canvas.width / 2, canvas.height / 2);
		ctx.restore();
	}

	// Controls
	document.addEventListener("keydown", (e) => {
		if (isGameOver && e.key.toLowerCase() !== KEY.RESTART) return;
		switch (e.key) {
			case KEY.LEFT:
				if (!collides(board, currentPiece, 0, -1)) currentPiece.col -= 1;
				break;
			case KEY.RIGHT:
				if (!collides(board, currentPiece, 0, 1)) currentPiece.col += 1;
				break;
			case KEY.DOWN:
				softDrop();
				break;
			case KEY.DROP:
				e.preventDefault();
				hardDrop();
				break;
			case KEY.ROTATE_CW:
			case KEY.ROTATE_CW_ALT:
				rotate(currentPiece, +1);
				break;
			case KEY.ROTATE_CCW:
				rotate(currentPiece, -1);
				break;
			case KEY.PAUSE:
				isPaused = !isPaused;
				break;
			case KEY.RESTART:
				resetGame();
				break;
		}
	});

	function resetGame() {
		board = createEmptyBoard();
		currentPiece = null;
		nextQueue = [];
		dropCounterMs = 0;
		lastTime = 0;
		isPaused = false;
		isGameOver = false;
		score = 0;
		lines = 0;
		level = 1;
		updateHUD();
		spawnPiece();
	}

	// Initialize
	updateHUD();
	spawnPiece();
	requestAnimationFrame(update);
})();