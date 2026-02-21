const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('high-score');
const overlay = document.getElementById('overlay');
const overlayMessage = document.getElementById('overlay-message');
const startBtn = document.getElementById('start-btn');

const GRID = 20;
const COLS = canvas.width / GRID;
const ROWS = canvas.height / GRID;

let snake, dir, nextDir, food, score, highScore, gameLoop, speed;

function init() {
  snake = [{ x: 10, y: 10 }];
  dir = { x: 1, y: 0 };
  nextDir = { x: 1, y: 0 };
  score = 0;
  speed = 120;
  highScore = parseInt(localStorage.getItem('snakeHighScore') || '0');
  scoreEl.textContent = 0;
  highScoreEl.textContent = highScore;
  spawnFood();
}

function spawnFood() {
  let pos;
  do {
    pos = {
      x: Math.floor(Math.random() * COLS),
      y: Math.floor(Math.random() * ROWS),
    };
  } while (snake.some(s => s.x === pos.x && s.y === pos.y));
  food = pos;
}

function update() {
  dir = nextDir;
  const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

  // Wall collision
  if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
    return endGame();
  }

  // Self collision
  if (snake.some(s => s.x === head.x && s.y === head.y)) {
    return endGame();
  }

  snake.unshift(head);

  if (head.x === food.x && head.y === food.y) {
    score++;
    scoreEl.textContent = score;
    if (score > highScore) {
      highScore = score;
      highScoreEl.textContent = highScore;
      localStorage.setItem('snakeHighScore', highScore);
    }
    // Speed up every 5 points
    if (score % 5 === 0 && speed > 60) {
      speed = Math.max(60, speed - 10);
      restartLoop();
    }
    spawnFood();
  } else {
    snake.pop();
  }

  draw();
}

function draw() {
  // Background
  ctx.fillStyle = '#0f0f1a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Grid dots
  ctx.fillStyle = '#1e1e33';
  for (let x = 0; x < COLS; x++) {
    for (let y = 0; y < ROWS; y++) {
      ctx.fillRect(x * GRID + GRID / 2 - 1, y * GRID + GRID / 2 - 1, 2, 2);
    }
  }

  // Food
  const fx = food.x * GRID;
  const fy = food.y * GRID;
  ctx.fillStyle = '#f87171';
  ctx.shadowColor = '#f87171';
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(fx + GRID / 2, fy + GRID / 2, GRID / 2 - 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Snake
  snake.forEach((seg, i) => {
    const ratio = 1 - i / snake.length;
    ctx.fillStyle = `rgba(74, 222, 128, ${0.4 + ratio * 0.6})`;
    ctx.shadowColor = '#4ade80';
    ctx.shadowBlur = i === 0 ? 10 : 0;
    ctx.beginPath();
    ctx.roundRect(
      seg.x * GRID + 1,
      seg.y * GRID + 1,
      GRID - 2,
      GRID - 2,
      4
    );
    ctx.fill();
  });
  ctx.shadowBlur = 0;
}

function endGame() {
  clearInterval(gameLoop);
  if (score > 0) {
    overlayMessage.textContent = `게임 오버! 점수: ${score}`;
  } else {
    overlayMessage.textContent = '게임 오버!';
  }
  startBtn.textContent = '다시하기';
  overlay.classList.remove('hidden');
}

function restartLoop() {
  clearInterval(gameLoop);
  gameLoop = setInterval(update, speed);
}

function startGame() {
  init();
  overlay.classList.add('hidden');
  draw();
  restartLoop();
}

// Input handling
const dirMap = {
  ArrowUp:    { x: 0, y: -1 },
  ArrowDown:  { x: 0, y:  1 },
  ArrowLeft:  { x: -1, y: 0 },
  ArrowRight: { x: 1,  y: 0 },
  w: { x: 0, y: -1 },
  s: { x: 0, y:  1 },
  a: { x: -1, y: 0 },
  d: { x: 1,  y: 0 },
};

document.addEventListener('keydown', e => {
  const newDir = dirMap[e.key];
  if (!newDir) return;
  e.preventDefault();
  // Prevent reversing
  if (newDir.x === -dir.x && newDir.y === -dir.y) return;
  nextDir = newDir;
});

startBtn.addEventListener('click', startGame);

// Initial draw
init();
draw();
