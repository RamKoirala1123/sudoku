/**
 * Sudoku Engine - Matches Flutter's exact algorithm:
 * 1. Fill full board using randomized backtracking (_fillFullBoard)
 * 2. Carve cells in random order, checking unique solvability after each removal
 *
 * @see lib/features/sudoku/domain/engine/sudoku_generator.dart
 * @see lib/features/sudoku/domain/engine/sudoku_solver.dart
 */

import { Difficulty, DIFFICULTIES, SudokuPuzzle } from '../types';

// ─── Solver ──────────────────────────────────────────────────────────────────

export class SudokuSolver {
  private static readonly SIZE = 9;
  private static readonly BOX = 3;

  /** Returns true if placing value at index is valid (ignores current occupant) */
  static isValidPlacement(board: number[], index: number, value: number): boolean {
    if (value < 1 || value > 9) return false;
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

  /** Alias for compatibility */
  static isValid(board: number[], index: number, value: number): boolean {
    return this.isValidPlacement(board, index, value);
  }

  /** Returns candidates for a cell (numbers 1-9 that are valid) */
  private static candidatesFor(board: number[], index: number): number[] {
    const used = new Array(10).fill(false);
    const row = Math.floor(index / 9);
    const col = index % 9;
    for (let c = 0; c < 9; c++) { const v = board[row * 9 + c]; if (v) used[v] = true; }
    for (let r = 0; r < 9; r++) { const v = board[r * 9 + col]; if (v) used[v] = true; }
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const v = board[(boxRow + r) * 9 + (boxCol + c)];
        if (v) used[v] = true;
      }
    }
    const result: number[] = [];
    for (let v = 1; v <= 9; v++) if (!used[v]) result.push(v);
    return result;
  }

  /**
   * MRV (Most Constrained Variable) - find empty cell with fewest candidates.
   * Mirrors Flutter's _findMostConstrainedCell.
   */
  private static findMostConstrained(board: number[]): { index: number; candidates: number[] } | null {
    let bestIndex = -1;
    let bestCandidates: number[] = [];
    let bestCount = 10;

    for (let i = 0; i < 81; i++) {
      if (board[i] !== 0) continue;
      const cands = this.candidatesFor(board, i);
      if (cands.length < bestCount) {
        bestCount = cands.length;
        bestIndex = i;
        bestCandidates = cands;
        if (bestCount === 0) return { index: bestIndex, candidates: [] }; // dead end
        if (bestCount === 1) break; // can't do better
      }
    }

    if (bestIndex === -1) return null; // no empty cells
    return { index: bestIndex, candidates: bestCandidates };
  }

  private static _solveInternal(board: number[]): boolean {
    const next = this.findMostConstrained(board);
    if (!next) return true; // solved — no empty cells
    const { index, candidates } = next;
    if (candidates.length === 0) return false; // dead end
    for (const v of candidates) {
      board[index] = v;
      if (this._solveInternal(board)) return true;
      board[index] = 0;
    }
    return false;
  }

  /** Solve board in-place copy, returns solved board or null */
  static solve(board: number[]): number[] | null {
    const copy = [...board];
    if (this._solveInternal(copy)) return copy;
    return null;
  }

  private static _countInternal(board: number[], limit: number, counter: { count: number }): void {
    if (counter.count >= limit) return;
    // Simple (not MRV) count — matches Flutter's _countInternal
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

  static countSolutions(board: number[], limit = 2): number {
    const copy = [...board];
    const counter = { count: 0 };
    this._countInternal(copy, limit, counter);
    return counter.count;
  }

  static hasUniqueSolution(board: number[]): boolean {
    return this.countSolutions(board, 2) === 1;
  }
}

// ─── Generator ───────────────────────────────────────────────────────────────

/** Simple seeded LCG PRNG matching JavaScript behavior */
class SeededRandom {
  private seed: number;

  constructor(seed?: number) {
    this.seed = seed ?? Math.floor(Math.random() * 2147483647);
  }

  /** Returns float in [0, 1) */
  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }

  /** Returns int in [0, n) */
  nextInt(n: number): number {
    return Math.floor(this.next() * n);
  }

  /** Fisher-Yates shuffle in-place */
  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.nextInt(i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}

export class SudokuGenerator {
  /**
   * Generate a puzzle matching Flutter's exact algorithm:
   * 1. _fillFullBoard: randomized backtracking from empty board
   * 2. _carvePuzzle: remove cells randomly, checking uniqueness each time
   *
   * @see sudoku_generator.dart SudokuGenerator.generate()
   */
  static generate(difficulty: Difficulty, seed?: number): SudokuPuzzle {
    const rng = new SeededRandom(seed);
    const solution = this._fillFullBoard(rng);
    const givens = this._carvePuzzle([...solution], difficulty, rng);
    const seedStr = `${difficulty}-${rng.nextInt(2 ** 31)}-${Date.now()}`;

    return {
      givens,
      solution,
      difficulty,
      seed: seedStr,
    };
  }

  /**
   * Fills an empty board completely using randomized backtracking.
   * Mirrors Flutter's _fillFullBoard / _fillRecursive.
   */
  private static _fillFullBoard(rng: SeededRandom): number[] {
    const board = new Array(81).fill(0);
    this._fillRecursive(board, 0, rng);
    return board;
  }

  private static _fillRecursive(board: number[], index: number, rng: SeededRandom): boolean {
    if (index === 81) return true;
    if (board[index] !== 0) return this._fillRecursive(board, index + 1, rng);

    // Shuffled candidates 1-9
    const candidates = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    rng.shuffle(candidates);

    for (const v of candidates) {
      if (SudokuSolver.isValidPlacement(board, index, v)) {
        board[index] = v;
        if (this._fillRecursive(board, index + 1, rng)) return true;
        board[index] = 0;
      }
    }
    return false;
  }

  /**
   * Removes cells from a full solution until the target given-count is reached,
   * always verifying the puzzle remains uniquely solvable.
   * Mirrors Flutter's _carvePuzzle.
   */
  private static _carvePuzzle(puzzle: number[], difficulty: Difficulty, rng: SeededRandom): number[] {
    // Target givens and max attempts from Flutter's Difficulty enum
    const targetGivens = DIFFICULTIES[difficulty].givensCount;
    const maxAttempts = DIFFICULTIES[difficulty].maxRemovalAttempts ?? 300;

    const cellOrder = Array.from({ length: 81 }, (_, i) => i);
    rng.shuffle(cellOrder);

    let currentGivens = 81;
    let attempts = 0;
    let cursor = 0;

    while (currentGivens > targetGivens && attempts < maxAttempts && cursor < cellOrder.length) {
      const index = cellOrder[cursor];
      cursor++;
      attempts++;

      if (puzzle[index] === 0) continue; // already removed

      const backup = puzzle[index];
      puzzle[index] = 0;

      if (SudokuSolver.hasUniqueSolution(puzzle)) {
        currentGivens--;
      } else {
        puzzle[index] = backup; // restore, removal broke uniqueness
      }

      // If walked full order but still haven't hit target, reshuffle remaining
      if (cursor === cellOrder.length && currentGivens > targetGivens) {
        rng.shuffle(cellOrder);
        cursor = 0;
      }
    }

    return puzzle;
  }
}

export function generateSudoku(difficulty: Difficulty, seed?: number): SudokuPuzzle {
  return SudokuGenerator.generate(difficulty, seed);
}
