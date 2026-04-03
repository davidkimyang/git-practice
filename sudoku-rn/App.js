import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  SafeAreaView,
  Vibration,
} from 'react-native';
import { DIFFICULTY, generateSolution, createPuzzle, isSolved } from './utils/sudoku';

const BOARD_SIZE = Math.min(Dimensions.get('window').width, 420) - 24;
const CELL_SIZE = Math.floor(BOARD_SIZE / 9);

const RED = '#e94560';
const BLUE = '#1a6fc4';

// ─── 색 테마 ────────────────────────────────────────────────────────────────
const C = {
  bg: '#f0f4f8',
  boardBg: '#fff',
  cellBg: '#fff',
  cellGiven: '#e8edf2',
  cellSelected: RED,
  cellHighlight: '#fde8ec',
  cellSameNum: '#f9c0cb',
  cellError: '#ffe0e0',
  textGiven: '#111',
  textUser: BLUE,
  textSelected: '#fff',
  textError: '#cc0000',
  border: '#bbb',
  boxBorder: RED,
  numBtnBg: '#fff',
  numBtnText: BLUE,
  eraseBtnText: '#888',
  timerText: RED,
  title: RED,
};

// ─── 셀 컴포넌트 ─────────────────────────────────────────────────────────────
function Cell({ value, isGiven, isSelected, isHighlighted, isSameNum, isError, onPress }) {
  const bg = isSelected ? C.cellSelected
    : isError ? C.cellError
    : isSameNum ? C.cellSameNum
    : isHighlighted ? C.cellHighlight
    : isGiven ? C.cellGiven
    : C.cellBg;

  const color = isSelected ? C.textSelected
    : isError ? C.textError
    : isGiven ? C.textGiven
    : C.textUser;

  return (
    <TouchableOpacity
      style={[styles.cell, { backgroundColor: bg }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {value !== 0 && (
        <Text style={[styles.cellText, { color }]}>{value}</Text>
      )}
    </TouchableOpacity>
  );
}

// ─── 메인 앱 ─────────────────────────────────────────────────────────────────
export default function App() {
  const [board, setBoard] = useState([]);
  const [solution, setSolution] = useState([]);
  const [given, setGiven] = useState([]);
  const [selected, setSelected] = useState(null); // [row, col]
  const [diff, setDiff] = useState('easy');
  const [hintsLeft, setHintsLeft] = useState(3);
  const [seconds, setSeconds] = useState(0);
  const [message, setMessage] = useState(null); // { text, type }
  const [solved, setSolved] = useState(false);

  const timerRef = useRef(null);
  const msgTimerRef = useRef(null);

  // ── 타이머 ────────────────────────────────────────────────────────────────
  const startTimer = useCallback(() => {
    timerRef.current = setInterval(() => {
      setSeconds(s => s + 1);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    clearInterval(timerRef.current);
  }, []);

  // ── 새 게임 ───────────────────────────────────────────────────────────────
  const newGame = useCallback((level) => {
    const lvl = level || diff;
    const sol = generateSolution();
    const puzzle = createPuzzle(sol, DIFFICULTY[lvl]);
    const giv = puzzle.map(row => row.map(v => v !== 0));

    setSolution(sol);
    setBoard(puzzle.map(row => [...row]));
    setGiven(giv);
    setSelected(null);
    setHintsLeft(3);
    setSeconds(0);
    setSolved(false);
    setMessage(null);

    stopTimer();
    clearInterval(timerRef.current);
    setSeconds(0);
    startTimer();
  }, [diff, startTimer, stopTimer]);

  useEffect(() => {
    newGame('easy');
    return () => {
      clearInterval(timerRef.current);
      clearTimeout(msgTimerRef.current);
    };
  }, []);

  // ── 메시지 ────────────────────────────────────────────────────────────────
  const showMessage = (text, type) => {
    setMessage({ text, type });
    clearTimeout(msgTimerRef.current);
    if (type !== 'success') {
      msgTimerRef.current = setTimeout(() => setMessage(null), 3000);
    }
  };

  // ── 입력 ──────────────────────────────────────────────────────────────────
  const inputNumber = useCallback((num) => {
    if (!selected || solved) return;
    const [row, col] = selected;
    if (given[row]?.[col]) return;

    const newBoard = board.map(r => [...r]);
    newBoard[row][col] = num;
    setBoard(newBoard);

    if (num !== 0 && isSolved(newBoard, solution)) {
      stopTimer();
      setSolved(true);
      Vibration.vibrate(200);
      showMessage('축하합니다! 스도쿠를 완성했습니다!', 'success');
    }
  }, [selected, solved, given, board, solution, stopTimer]);

  // ── 힌트 ──────────────────────────────────────────────────────────────────
  const giveHint = useCallback(() => {
    if (hintsLeft <= 0) { showMessage('힌트를 모두 사용했습니다!', 'error'); return; }

    let target = null;
    if (selected) {
      const [r, c] = selected;
      if (!given[r]?.[c] && board[r][c] !== solution[r][c]) target = [r, c];
    }
    if (!target) {
      const empties = [];
      for (let r = 0; r < 9; r++)
        for (let c = 0; c < 9; c++)
          if (!given[r][c] && board[r][c] !== solution[r][c]) empties.push([r, c]);
      if (!empties.length) return;
      target = empties[Math.floor(Math.random() * empties.length)];
    }

    const [row, col] = target;
    const newBoard = board.map(r => [...r]);
    newBoard[row][col] = solution[row][col];
    setBoard(newBoard);
    setSelected(target);
    setHintsLeft(h => h - 1);

    if (isSolved(newBoard, solution)) {
      stopTimer();
      setSolved(true);
      showMessage('축하합니다! 스도쿠를 완성했습니다!', 'success');
    }
  }, [hintsLeft, selected, given, board, solution, stopTimer]);

  // ── 검사 ──────────────────────────────────────────────────────────────────
  const checkBoard = useCallback(() => {
    let errors = 0, empty = 0;
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++) {
        if (board[r][c] === 0) empty++;
        else if (!given[r][c] && board[r][c] !== solution[r][c]) errors++;
      }
    if (empty > 0) showMessage(`빈 칸 ${empty}개 / 오류 ${errors}개`, errors > 0 ? 'error' : 'info');
    else if (errors > 0) showMessage(`오류가 ${errors}개 있습니다.`, 'error');
    else { stopTimer(); setSolved(true); showMessage('완벽합니다!', 'success'); }
  }, [board, given, solution, stopTimer]);

  // ── 하이라이트 계산 ───────────────────────────────────────────────────────
  const getHighlight = useCallback((r, c) => {
    if (!selected) return {};
    const [sr, sc] = selected;
    const selNum = board[sr]?.[sc] ?? 0;
    if (r === sr && c === sc) return { isSelected: true };
    const sameBox = Math.floor(r / 3) === Math.floor(sr / 3) && Math.floor(c / 3) === Math.floor(sc / 3);
    const highlighted = r === sr || c === sc || sameBox;
    const sameNum = selNum !== 0 && board[r][c] === selNum;
    return { isHighlighted: highlighted, isSameNum: sameNum };
  }, [selected, board]);

  const isError = (r, c) =>
    !given[r]?.[c] && board[r]?.[c] !== 0 && board[r]?.[c] !== solution[r]?.[c];

  // ── 타이머 포맷 ───────────────────────────────────────────────────────────
  const timerText = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

  // ── 난이도 변경 ───────────────────────────────────────────────────────────
  const changeDiff = (level) => {
    setDiff(level);
    newGame(level);
  };

  // ── 렌더 ──────────────────────────────────────────────────────────────────
  if (!board.length) return null;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.container}>

        {/* 타이틀 */}
        <Text style={styles.title}>SUDOKU</Text>

        {/* 난이도 + 타이머 */}
        <View style={styles.controls}>
          <View style={styles.diffRow}>
            {['easy', 'medium', 'hard'].map(level => (
              <TouchableOpacity
                key={level}
                style={[styles.diffBtn, diff === level && styles.diffBtnActive]}
                onPress={() => changeDiff(level)}
              >
                <Text style={[styles.diffBtnText, diff === level && styles.diffBtnTextActive]}>
                  {level === 'easy' ? '쉬움' : level === 'medium' ? '보통' : '어려움'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.timer}>{timerText}</Text>
        </View>

        {/* 보드 */}
        <View style={styles.board}>
          {board.map((row, r) =>
            row.map((val, c) => {
              const hl = getHighlight(r, c);
              const rightBorder = (c + 1) % 3 === 0 && c < 8;
              const bottomBorder = (r + 1) % 3 === 0 && r < 8;
              return (
                <View
                  key={`${r}-${c}`}
                  style={[
                    styles.cellWrap,
                    rightBorder && styles.cellBoxRight,
                    bottomBorder && styles.cellBoxBottom,
                  ]}
                >
                  <Cell
                    value={val}
                    isGiven={given[r][c]}
                    isError={isError(r, c)}
                    onPress={() => setSelected([r, c])}
                    {...hl}
                  />
                </View>
              );
            })
          )}
        </View>

        {/* 메시지 */}
        {message && (
          <View style={[styles.message, styles[`msg_${message.type}`]]}>
            <Text style={[styles.messageText, styles[`msgText_${message.type}`]]}>
              {message.text}
            </Text>
          </View>
        )}

        {/* 숫자 패드 */}
        <View style={styles.numpad}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
            <TouchableOpacity key={n} style={styles.numBtn} onPress={() => inputNumber(n)}>
              <Text style={styles.numBtnText}>{n}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.numBtn} onPress={() => inputNumber(0)}>
            <Text style={[styles.numBtnText, { color: C.eraseBtnText, fontSize: 13 }]}>지우기</Text>
          </TouchableOpacity>
        </View>

        {/* 액션 버튼 */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: RED }]} onPress={() => newGame()}>
            <Text style={styles.actionBtnText}>새 게임</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: BLUE }]} onPress={giveHint}>
            <Text style={styles.actionBtnText}>힌트 ({hintsLeft})</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.checkBtn]} onPress={checkBoard}>
            <Text style={[styles.actionBtnText, { color: '#555' }]}>검사</Text>
          </TouchableOpacity>
        </View>

      </View>
    </SafeAreaView>
  );
}

// ─── 스타일 ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: C.title,
    letterSpacing: 6,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  diffRow: { flexDirection: 'row', gap: 6 },
  diffBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fff',
  },
  diffBtnActive: { backgroundColor: RED, borderColor: RED },
  diffBtnText: { fontSize: 12, color: '#555' },
  diffBtnTextActive: { color: '#fff', fontWeight: 'bold' },
  timer: { fontSize: 18, fontWeight: 'bold', color: C.timerText, fontVariant: ['tabular-nums'] },

  // 보드
  board: {
    width: BOARD_SIZE,
    height: BOARD_SIZE,
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderWidth: 2.5,
    borderColor: RED,
    borderRadius: 4,
    backgroundColor: C.boardBg,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  cellWrap: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRightWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: C.border,
  },
  cellBoxRight: { borderRightWidth: 2, borderRightColor: RED },
  cellBoxBottom: { borderBottomWidth: 2, borderBottomColor: RED },
  cell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellText: {
    fontSize: CELL_SIZE * 0.52,
    fontWeight: '700',
  },

  // 메시지
  message: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  messageText: { fontWeight: 'bold', fontSize: 14, textAlign: 'center' },
  msg_success: { backgroundColor: '#e6f9e6', borderColor: '#6bcc6b' },
  msgText_success: { color: '#1a7a1a' },
  msg_error: { backgroundColor: '#fff0f0', borderColor: '#ff9999' },
  msgText_error: { color: '#cc0000' },
  msg_info: { backgroundColor: '#e8f0fb', borderColor: '#a0c4f1' },
  msgText_info: { color: BLUE },

  // 숫자패드
  numpad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
  },
  numBtn: {
    width: '17%',
    paddingVertical: 14,
    backgroundColor: C.numBtnBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  numBtnText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: C.numBtnText,
  },

  // 액션 버튼
  actionRow: { flexDirection: 'row', gap: 10, width: '100%' },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  checkBtn: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  actionBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
