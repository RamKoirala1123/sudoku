import { Difficulty, DIFFICULTIES, SudokuPuzzle } from '../types';

export class SudokuSolver {
  static isValid(board: number[], index: number, value: number): boolean {
    const row = Math.floor(index / 9);
    const col = index % 9;
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;

    for (let c = 0; c < 9; c++) {
      const idx = row * 9 + c;
      if (idx !== index && board[idx] === value) return false;
    }

    for (let r = 0; r < 9; r++) {
      const idx = r * 9 + col;
      if (idx !== index && board[idx] === value) return false;
    }

    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const idx = (boxRow + r) * 9 + (boxCol + c);
        if (idx !== index && board[idx] === value) return false;
      }
    }

    return true;
  }

  static solve(board: number[]): number[] | null {
    const copy = [...board];
    if (this._solveBacktrack(copy)) return copy;
    return null;
  }

  private static _solveBacktrack(board: number[]): boolean {
    let emptyIndex = -1;
    let minCandidates = 10;
    let bestCandidates: number[] = [];

    // MRV (Minimum Remaining Values) heuristic for speed
    for (let i = 0; i < 81; i++) {
      if (board[i] === 0) {
        const candidates: number[] = [];
        for (let v = 1; v <= 9; v++) {
          if (this.isValid(board, i, v)) candidates.push(v);
        }
        if (candidates.length === 0) return false;
        if (candidates.length < minCandidates) {
          minCandidates = candidates.length;
          bestCandidates = candidates;
          emptyIndex = i;
          if (minCandidates === 1) break;
        }
      }
    }

    if (emptyIndex === -1) return true; // Solved

    for (const val of bestCandidates) {
      board[emptyIndex] = val;
      if (this._solveBacktrack(board)) return true;
      board[emptyIndex] = 0;
    }

    return false;
  }

  static countSolutions(board: number[], limit = 2): number {
    const copy = [...board];
    return this._countSolutionsBacktrack(copy, limit);
  }

  private static _countSolutionsBacktrack(board: number[], limit: number): number {
    let emptyIndex = -1;
    for (let i = 0; i < 81; i++) {
      if (board[i] === 0) {
        emptyIndex = i;
        break;
      }
    }
    if (emptyIndex === -1) return 1;

    let count = 0;
    for (let val = 1; val <= 9; val++) {
      if (this.isValid(board, emptyIndex, val)) {
        board[emptyIndex] = val;
        count += this._countSolutionsBacktrack(board, limit - count);
        board[emptyIndex] = 0;
        if (count >= limit) break;
      }
    }
    return count;
  }
}

export class SudokuGenerator {
  static generate(difficulty: Difficulty, seed?: string): SudokuPuzzle {
    const actualSeed = seed ?? Math.random().toString(36).substring(2, 10);
    // Simple LCG PRNG for deterministic generation if seed provided
    let seedVal = 0;
    for (let i = 0; i < actualSeed.length; i++) {
      seedVal = (seedVal * 31 + actualSeed.charCodeAt(i)) >>> 0;
    }
    const rand = () => {
      seedVal = (seedVal * 1664525 + 1013904223) >>> 0;
      return seedVal / 4294967296;
    };

    // 1. Generate full solved grid
    const solution = new Array(81).fill(0);
    this._fillDiagonalBoxes(solution, rand);
    SudokuSolver.solve(solution);

    // 2. Dig holes based on difficulty target
    const targetGivens = DIFFICULTIES[difficulty].givensCount;
    const givens = [...solution];

    const indices = Array.from({ length: 81 }, (_, i) => i);
    // Shuffle indices
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    let remaining = 81;
    for (const idx of indices) {
      if (remaining <= targetGivens) break;
      const original = givens[idx];
      givens[idx] = 0;

      // Ensure uniquely solvable
      if (SudokuSolver.countSolutions(givens, 2) === 1) {
        remaining--;
      } else {
        givens[idx] = original; // Put it back
      }
    }

    return {
      givens,
      solution,
      difficulty,
      seed: actualSeed,
    };
  }

  private static _fillDiagonalBoxes(board: number[], rand: () => number) {
    for (let box = 0; box < 3; box++) {
      const startRow = box * 3;
      const startCol = box * 3;
      const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9];
      for (let i = nums.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [nums[i], nums[j]] = [nums[j], nums[i]];
      }
      let nIdx = 0;
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          board[(startRow + r) * 9 + (startCol + c)] = nums[nIdx++];
        }
      }
    }
  }
}

export function generateSudoku(difficulty: Difficulty, seed?: string): SudokuPuzzle {
  return SudokuGenerator.generate(difficulty, seed);
}

