// ── Sudoku Game ──────────────────────────────────────────────────────────────

const DIFFICULTY = { easy: 36, medium: 46, hard: 54 }; // 제거할 칸 수

let board = [];        // 현재 보드 (0 = 빈칸)
let solution = [];     // 정답 보드
let given = [];        // 주어진 칸 여부
let selected = null;   // 선택된 [row, col]
let difficulty = 'easy';
let hintsLeft = 3;
let timerInterval = null;
let seconds = 0;

// ── 퍼즐 생성 ─────────────────────────────────────────────────────────────────

function generateSolution() {
  const grid = Array.from({ length: 9 }, () => Array(9).fill(0));
  fillGrid(grid);
  return grid;
}

function fillGrid(grid) {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (grid[row][col] === 0) {
        const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        for (const num of nums) {
          if (isValid(grid, row, col, num)) {
            grid[row][col] = num;
            if (fillGrid(grid)) return true;
            grid[row][col] = 0;
          }
        }
        return false;
      }
    }
  }
  return true;
}

function isValid(grid, row, col, num) {
  // 행 검사
  if (grid[row].includes(num)) return false;
  // 열 검사
  for (let r = 0; r < 9; r++) {
    if (grid[r][col] === num) return false;
  }
  // 3x3 박스 검사
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = boxRow; r < boxRow + 3; r++) {
    for (let c = boxCol; c < boxCol + 3; c++) {
      if (grid[r][c] === num) return false;
    }
  }
  return true;
}

function createPuzzle(sol, removals) {
  const puzzle = sol.map(row => [...row]);
  let removed = 0;
  const positions = shuffle([...Array(81).keys()]);
  for (const pos of positions) {
    if (removed >= removals) break;
    const row = Math.floor(pos / 9);
    const col = pos % 9;
    puzzle[row][col] = 0;
    removed++;
  }
  return puzzle;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ── 게임 초기화 ───────────────────────────────────────────────────────────────

function newGame() {
  solution = generateSolution();
  board = createPuzzle(solution, DIFFICULTY[difficulty]);
  given = board.map(row => row.map(v => v !== 0));
  selected = null;
  hintsLeft = 3;
  document.getElementById('hint-count').textContent = hintsLeft;
  hideMessage();
  resetTimer();
  startTimer();
  renderBoard();
}

// ── 렌더링 ────────────────────────────────────────────────────────────────────

function renderBoard() {
  const boardEl = document.getElementById('board');
  boardEl.innerHTML = '';

  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const cell = document.createElement('div');
      cell.classList.add('cell');
      cell.dataset.row = row;
      cell.dataset.col = col;

      if (given[row][col]) {
        cell.classList.add('given');
        cell.textContent = board[row][col];
      } else if (board[row][col] !== 0) {
        cell.textContent = board[row][col];
      }

      cell.addEventListener('click', () => selectCell(row, col));
      boardEl.appendChild(cell);
    }
  }

  applyHighlights();
}

function applyHighlights() {
  const cells = document.querySelectorAll('.cell');
  const [selRow, selCol] = selected || [-1, -1];
  const selNum = selected ? board[selRow][selCol] : 0;

  cells.forEach(cell => {
    const r = parseInt(cell.dataset.row);
    const c = parseInt(cell.dataset.col);

    cell.classList.remove('selected', 'highlighted', 'same-num', 'error');

    if (selected && r === selRow && c === selCol) {
      cell.classList.add('selected');
      return;
    }

    if (selected) {
      const sameBox =
        Math.floor(r / 3) === Math.floor(selRow / 3) &&
        Math.floor(c / 3) === Math.floor(selCol / 3);

      if (r === selRow || c === selCol || sameBox) {
        cell.classList.add('highlighted');
      }

      if (selNum !== 0 && board[r][c] === selNum) {
        cell.classList.add('same-num');
      }
    }

    // 오류 표시
    if (!given[r][c] && board[r][c] !== 0 && board[r][c] !== solution[r][c]) {
      cell.classList.add('error');
    }
  });
}

function updateCell(row, col) {
  const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
  if (!cell) return;
  cell.textContent = board[row][col] !== 0 ? board[row][col] : '';
}

// ── 입력 처리 ─────────────────────────────────────────────────────────────────

function selectCell(row, col) {
  selected = [row, col];
  applyHighlights();
}

function inputNumber(num) {
  if (!selected) return;
  const [row, col] = selected;
  if (given[row][col]) return;

  board[row][col] = num;
  updateCell(row, col);
  applyHighlights();

  if (isSolved()) {
    stopTimer();
    showMessage('축하합니다! 스도쿠를 완성했습니다!', 'success');
  }
}

function isSolved() {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] !== solution[r][c]) return false;
    }
  }
  return true;
}

// ── 힌트 ──────────────────────────────────────────────────────────────────────

function giveHint() {
  if (hintsLeft <= 0) {
    showMessage('힌트를 모두 사용했습니다!', 'error-msg');
    return;
  }

  // 선택된 빈 칸에 힌트 제공, 없으면 랜덤 빈 칸
  let target = null;
  if (selected) {
    const [r, c] = selected;
    if (!given[r][c] && board[r][c] !== solution[r][c]) target = [r, c];
  }

  if (!target) {
    const empties = [];
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        if (!given[r][c] && board[r][c] !== solution[r][c]) empties.push([r, c]);
    if (empties.length === 0) return;
    target = empties[Math.floor(Math.random() * empties.length)];
  }

  const [row, col] = target;
  board[row][col] = solution[row][col];
  selected = [row, col];
  hintsLeft--;
  document.getElementById('hint-count').textContent = hintsLeft;
  updateCell(row, col);
  applyHighlights();

  if (isSolved()) {
    stopTimer();
    showMessage('축하합니다! 스도쿠를 완성했습니다!', 'success');
  }
}

// ── 검사 ──────────────────────────────────────────────────────────────────────

function checkBoard() {
  let errors = 0;
  let empty = 0;
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === 0) empty++;
      else if (!given[r][c] && board[r][c] !== solution[r][c]) errors++;
    }
  }

  if (empty > 0) {
    showMessage(`빈 칸: ${empty}개 / 오류: ${errors}개`, errors > 0 ? 'error-msg' : 'info');
  } else if (errors > 0) {
    showMessage(`오류가 ${errors}개 있습니다. 다시 확인해보세요!`, 'error-msg');
  } else {
    stopTimer();
    showMessage('완벽합니다! 모든 칸이 올바릅니다!', 'success');
  }
  applyHighlights();
}

// ── 타이머 ────────────────────────────────────────────────────────────────────

function resetTimer() {
  stopTimer();
  seconds = 0;
  document.getElementById('timer').textContent = '00:00';
}

function startTimer() {
  timerInterval = setInterval(() => {
    seconds++;
    const m = String(Math.floor(seconds / 60)).padStart(2, '0');
    const s = String(seconds % 60).padStart(2, '0');
    document.getElementById('timer').textContent = `${m}:${s}`;
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
}

// ── 메시지 ────────────────────────────────────────────────────────────────────

function showMessage(text, type) {
  const el = document.getElementById('message');
  el.textContent = text;
  el.className = `message ${type}`;
  clearTimeout(el._timeout);
  if (type !== 'success') {
    el._timeout = setTimeout(() => hideMessage(), 3000);
  }
}

function hideMessage() {
  const el = document.getElementById('message');
  el.className = 'message hidden';
}

// ── 이벤트 바인딩 ─────────────────────────────────────────────────────────────

document.getElementById('new-game-btn').addEventListener('click', newGame);
document.getElementById('hint-btn').addEventListener('click', giveHint);
document.getElementById('check-btn').addEventListener('click', checkBoard);

document.querySelectorAll('.num-btn').forEach(btn => {
  btn.addEventListener('click', () => inputNumber(parseInt(btn.dataset.num)));
});

document.querySelectorAll('.diff-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    difficulty = btn.dataset.level;
    newGame();
  });
});

// 키보드 입력
document.addEventListener('keydown', (e) => {
  if (e.key >= '1' && e.key <= '9') inputNumber(parseInt(e.key));
  if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') inputNumber(0);

  // 방향키 이동
  if (!selected) return;
  const [r, c] = selected;
  if (e.key === 'ArrowUp' && r > 0) { selected = [r - 1, c]; applyHighlights(); }
  if (e.key === 'ArrowDown' && r < 8) { selected = [r + 1, c]; applyHighlights(); }
  if (e.key === 'ArrowLeft' && c > 0) { selected = [r, c - 1]; applyHighlights(); }
  if (e.key === 'ArrowRight' && c < 8) { selected = [r, c + 1]; applyHighlights(); }
});

// ── 시작 ──────────────────────────────────────────────────────────────────────
newGame();
