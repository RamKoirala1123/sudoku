/**
 * Web Worker for async Sudoku puzzle generation.
 * Prevents the main thread from blocking during puzzle generation.
 */

// Import engine inline (workers can't use ESM imports easily in Next.js)
// We duplicate the logic here to keep it self-contained

class SudokuSolverWorker {
  static isValidPlacement(board: number[], index: number, value: number): boolean {
    const row = Math.floor(index / 9);
    const col = index % 9;
    for (let c = 0; c < 9; c++) {
      const i = row * 9 + c;
      if (i !== index && board[i] === value) return false;
    }
    for (let r = 0; r < 9; r++) {
      const i = r * 9 + col;
      if (i !== index && board[i] === value) return false;
    }
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const i = (boxRow + r) * 9 + (boxCol + c);
        if (i !== index && board[i] === value) return false;
      }
    }
    return true;
  }

  private static _countInternal(board: number[], limit: number, counter: { count: number }): void {
    if (counter.count >= limit) return;
    let emptyIndex = -1;
    for (let i = 0; i < 81; i++) {
      if (board[i] === 0) { emptyIndex = i; break; }
    }
    if (emptyIndex === -1) { counter.count++; return; }
    for (let v = 1; v <= 9; v++) {
      if (counter.count >= limit) return;
      if (this.isValidPlacement(board, emptyIndex, v)) {
        board[emptyIndex] = v;
        this._countInternal(board, limit, counter);
        board[emptyIndex] = 0;
      }
    }
  }

  static hasUniqueSolution(board: number[]): boolean {
    const copy = [...board];
    const counter = { count: 0 };
    this._countInternal(copy, 2, counter);
    return counter.count === 1;
  }
}

// Difficulty settings matching Flutter
const DIFFICULTY_SETTINGS: Record<string, { givensCount: number; maxRemovalAttempts: number }> = {
  easy:      { givensCount: 42, maxRemovalAttempts: 120 },
  medium:    { givensCount: 36, maxRemovalAttempts: 200 },
  hard:      { givensCount: 30, maxRemovalAttempts: 320 },
  expert:    { givensCount: 26, maxRemovalAttempts: 450 },
  difficult: { givensCount: 26, maxRemovalAttempts: 450 },
  extreme:   { givensCount: 22, maxRemovalAttempts: 650 },
};

class SeededRandom {
  private seed: number;
  constructor(seed?: number) {
    this.seed = seed ?? Math.floor(Math.random() * 2147483647);
  }
  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }
  nextInt(n: number): number { return Math.floor(this.next() * n); }
  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.nextInt(i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}

function fillRecursive(board: number[], index: number, rng: SeededRandom): boolean {
  if (index === 81) return true;
  if (board[index] !== 0) return fillRecursive(board, index + 1, rng);
  const candidates = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  rng.shuffle(candidates);
  for (const v of candidates) {
    if (SudokuSolverWorker.isValidPlacement(board, index, v)) {
      board[index] = v;
      if (fillRecursive(board, index + 1, rng)) return true;
      board[index] = 0;
    }
  }
  return false;
}

function generatePuzzle(difficulty: string): { givens: number[]; solution: number[]; difficulty: string; seed: string } {
  const rng = new SeededRandom();
  const solution = new Array(81).fill(0);
  fillRecursive(solution, 0, rng);

  const settings = DIFFICULTY_SETTINGS[difficulty] ?? DIFFICULTY_SETTINGS.medium;
  const puzzle = [...solution];
  const cellOrder = Array.from({ length: 81 }, (_, i) => i);
  rng.shuffle(cellOrder);

  let currentGivens = 81;
  let attempts = 0;
  let cursor = 0;

  while (currentGivens > settings.givensCount && attempts < settings.maxRemovalAttempts && cursor < cellOrder.length) {
    const index = cellOrder[cursor];
    cursor++;
    attempts++;

    if (puzzle[index] === 0) continue;

    const backup = puzzle[index];
    puzzle[index] = 0;

    if (SudokuSolverWorker.hasUniqueSolution(puzzle)) {
      currentGivens--;
    } else {
      puzzle[index] = backup;
    }

    if (cursor === cellOrder.length && currentGivens > settings.givensCount) {
      rng.shuffle(cellOrder);
      cursor = 0;
    }
  }

  return {
    givens: puzzle,
    solution,
    difficulty,
    seed: `${difficulty}-${Date.now()}`,
  };
}

self.onmessage = (e: MessageEvent) => {
  const { difficulty, requestId } = e.data;
  try {
    const puzzle = generatePuzzle(difficulty);
    self.postMessage({ type: 'success', puzzle, requestId });
  } catch (err) {
    self.postMessage({ type: 'error', error: String(err), requestId });
  }
};
