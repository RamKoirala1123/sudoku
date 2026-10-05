'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  Difficulty,
  MistakeRule,
  MoveRecord,
  SudokuGameState,
  SudokuPuzzle,
} from '../types';
import { SudokuGenerator } from './engine';
import { soundService } from '../sound/soundService';

function makeLives(rule: MistakeRule): number {
  return rule === 'hardcore' ? 1 : rule === 'casual' ? 999 : 3;
}

const INITIAL_STATE: SudokuGameState = {
  puzzle: null,
  board: new Array(81).fill(0),
  selectedCell: null,
  candidates: {},
  incorrectCells: [],
  status: 'playing',
  score: 0,
  wrongCount: 0,
  correctCount: 0,
  lives: 3,
  elapsedSeconds: 0,
  difficulty: 'medium',
  mistakeRule: 'standard',
};

export function useSudokuGame(initialDifficulty: Difficulty = 'medium', initialRule: MistakeRule = 'standard') {
  const [state, setState] = useState<SudokuGameState>({
    ...INITIAL_STATE,
    lives: makeLives(initialRule),
    difficulty: initialDifficulty,
    mistakeRule: initialRule,
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [pencilMode, setPencilMode] = useState(false);
  const [lastDelta, setLastDelta] = useState<number | null>(null);
  const moveHistoryRef = useRef<MoveRecord[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Timer ticker — only runs when status === 'playing'
  useEffect(() => {
    if (state.status === 'playing' && state.puzzle) {
      timerRef.current = setInterval(() => {
        setState((s) => ({ ...s, elapsedSeconds: s.elapsedSeconds + 1 }));
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state.status, state.puzzle]);

  /**
   * Generates a puzzle asynchronously using a Web Worker to avoid blocking the UI.
   * Falls back to synchronous generation if workers are unavailable.
   */
  const generateAsync = useCallback((difficulty: Difficulty): Promise<SudokuPuzzle> => {
    return new Promise((resolve, reject) => {
      if (typeof Worker === 'undefined') {
        // Fallback: synchronous (may block briefly)
        try {
          const puzzle = SudokuGenerator.generate(difficulty);
          resolve(puzzle);
        } catch (e) {
          reject(e);
        }
        return;
      }

      try {
        const worker = new Worker(
          new URL('./sudokuWorker.ts', import.meta.url),
          { type: 'module' }
        );
        const requestId = Math.random().toString(36).slice(2);
        const timeout = setTimeout(() => {
          worker.terminate();
          // Fallback to sync if worker times out
          try {
            resolve(SudokuGenerator.generate(difficulty));
          } catch (e) {
            reject(e);
          }
        }, 8000);

        worker.onmessage = (e) => {
          if (e.data.requestId !== requestId) return;
          clearTimeout(timeout);
          worker.terminate();
          if (e.data.type === 'success') {
            resolve(e.data.puzzle as SudokuPuzzle);
          } else {
            reject(new Error(e.data.error));
          }
        };

        worker.onerror = (err) => {
          clearTimeout(timeout);
          worker.terminate();
          // Fallback on error
          try {
            resolve(SudokuGenerator.generate(difficulty));
          } catch (e) {
            reject(e);
          }
        };

        worker.postMessage({ difficulty, requestId });
      } catch {
        // Worker creation failed — synchronous fallback
        try {
          resolve(SudokuGenerator.generate(difficulty));
        } catch (e) {
          reject(e);
        }
      }
    });
  }, []);

  const startNewGame = useCallback((difficulty?: Difficulty, rule?: MistakeRule) => {
    const diff = difficulty ?? state.difficulty;
    const mRule = rule ?? state.mistakeRule;
    moveHistoryRef.current = [];

    setIsGenerating(true);
    // Reset state immediately to show loading
    setState((prev) => ({
      ...INITIAL_STATE,
      puzzle: null,
      board: new Array(81).fill(0),
      status: 'playing',
      lives: makeLives(mRule),
      difficulty: diff,
      mistakeRule: mRule,
    }));

    generateAsync(diff).then((p) => {
      const givensCount = p.givens.filter((v) => v !== 0).length;
      setState({
        puzzle: p,
        board: [...p.givens],
        selectedCell: null,
        candidates: {},
        incorrectCells: [],
        status: 'playing',
        score: 0,
        wrongCount: 0,
        correctCount: givensCount,
        lives: makeLives(mRule),
        elapsedSeconds: 0,
        difficulty: diff,
        mistakeRule: mRule,
      });
    }).catch(() => {
      // Emergency synchronous fallback
      const p = SudokuGenerator.generate(diff);
      const givensCount = p.givens.filter((v) => v !== 0).length;
      setState({
        puzzle: p,
        board: [...p.givens],
        selectedCell: null,
        candidates: {},
        incorrectCells: [],
        status: 'playing',
        score: 0,
        wrongCount: 0,
        correctCount: givensCount,
        lives: makeLives(mRule),
        elapsedSeconds: 0,
        difficulty: diff,
        mistakeRule: mRule,
      });
    }).finally(() => {
      setIsGenerating(false);
    });
  }, [state.difficulty, state.mistakeRule, generateAsync]);

  const startWithPuzzle = useCallback((puzzle: SudokuPuzzle, rule?: MistakeRule) => {
    const mRule = rule ?? state.mistakeRule;
    moveHistoryRef.current = [];
    const givensCount = puzzle.givens.filter((v) => v !== 0).length;

    setState({
      puzzle,
      board: [...puzzle.givens],
      selectedCell: null,
      candidates: {},
      incorrectCells: [],
      status: 'playing',
      score: 0,
      wrongCount: 0,
      correctCount: givensCount,
      lives: makeLives(mRule),
      elapsedSeconds: 0,
      difficulty: puzzle.difficulty,
      mistakeRule: mRule,
    });
  }, [state.mistakeRule]);

  const selectCell = useCallback((index: number | null) => {
    setState((s) => ({ ...s, selectedCell: index }));
  }, []);

  const inputNumber = useCallback((val: number) => {
    setState((current) => {
      if (current.status !== 'playing') return current;
      const selected = current.selectedCell;
      if (selected === null || selected < 0 || selected >= 81) return current;

      const puzzle = current.puzzle;
      if (!puzzle) return current;

      // Given cells are locked
      if (puzzle.givens[selected] !== 0) return current;

      // Already correctly filled cells are locked
      if (current.board[selected] === puzzle.solution[selected]) return current;

      // ----------------------------------------------------
      // PENCIL / NOTE MODE
      // ----------------------------------------------------
      if (pencilMode) {
        soundService.playPlace();
        const currentList = current.candidates[selected] ?? [];
        const nextList = currentList.includes(val)
          ? currentList.filter((n) => n !== val)
          : [...currentList, val].sort((a, b) => a - b);

        const newCandidates = { ...current.candidates };
        if (nextList.length === 0) {
          delete newCandidates[selected];
        } else {
          newCandidates[selected] = nextList;
        }

        return { ...current, candidates: newCandidates };
      }

      // ----------------------------------------------------
      // DIRECT NUMBER PLACEMENT (replaces any existing wrong answer)
      // Flutter allows replacing incorrect numbers directly
      // ----------------------------------------------------
      const isCorrect = puzzle.solution[selected] === val;
      const prevVal = current.board[selected];
      const newBoard = [...current.board];
      newBoard[selected] = val;

      // Clear pencil marks on current cell
      const newCandidates = { ...current.candidates };
      delete newCandidates[selected];

      const newIncorrect = current.incorrectCells.filter((i) => i !== selected);

      // Record move for Undo
      moveHistoryRef.current.push({
        cellIndex: selected,
        previousValue: prevVal,
        newValue: val,
        wasCorrect: isCorrect,
        isErase: false,
      });

      if (isCorrect) {
        soundService.playSuccess();
        setLastDelta(50);

        // AUTO-CLEAR NOTES: erase this number from peers in same row, col, 3x3 box
        const row = Math.floor(selected / 9);
        const col = selected % 9;
        const boxRow = Math.floor(row / 3) * 3;
        const boxCol = Math.floor(col / 3) * 3;

        const peerIndices = new Set<number>();
        for (let i = 0; i < 9; i++) {
          peerIndices.add(row * 9 + i);
          peerIndices.add(i * 9 + col);
        }
        for (let r = 0; r < 3; r++) {
          for (let c = 0; c < 3; c++) {
            peerIndices.add((boxRow + r) * 9 + (boxCol + c));
          }
        }

        for (const peer of peerIndices) {
          if (newCandidates[peer]?.includes(val)) {
            const updated = newCandidates[peer].filter((n) => n !== val);
            if (updated.length === 0) {
              delete newCandidates[peer];
            } else {
              newCandidates[peer] = updated;
            }
          }
        }

        // Check if board solved
        const isSolved = newBoard.every((cell, idx) => cell === puzzle.solution[idx]);
        if (isSolved) {
          soundService.playCompletion();
          confetti({
            particleCount: 120,
            spread: 80,
            origin: { y: 0.6 },
          });
          return {
            ...current,
            board: newBoard,
            candidates: newCandidates,
            incorrectCells: newIncorrect,
            correctCount: current.correctCount + 1,
            score: current.score + 100,
            status: 'won',
          };
        }

        // Check if all instances of this number filled
        const allThisNumFilled = newBoard.filter((c) => c === val).length === 9;
        if (allThisNumFilled) {
          soundService.playNumberCompleted();
        }

        return {
          ...current,
          board: newBoard,
          candidates: newCandidates,
          incorrectCells: newIncorrect,
          correctCount: current.correctCount + 1,
          score: current.score + 50,
        };
      } else {
        // INCORRECT MOVE
        soundService.playError();
        setLastDelta(-20);
        newIncorrect.push(selected);

        let newLives = current.lives;
        let newElapsed = current.elapsedSeconds;

        if (current.mistakeRule === 'casual') {
          newElapsed += 30;
        } else {
          newLives -= 1;
        }

        const newWrong = current.wrongCount + 1;
        const isLost = current.mistakeRule !== 'casual' && newLives <= 0;

        return {
          ...current,
          board: newBoard,
          candidates: newCandidates,
          incorrectCells: newIncorrect,
          wrongCount: newWrong,
          lives: newLives,
          elapsedSeconds: newElapsed,
          score: Math.max(0, current.score - 20),
          status: isLost ? 'lost' : 'playing',
        };
      }
    });
  }, [pencilMode]);

  const erase = useCallback(() => {
    setState((current) => {
      if (current.status !== 'playing') return current;
      const selected = current.selectedCell;
      if (selected === null) return current;

      const puzzle = current.puzzle;
      if (!puzzle) return current;

      if (puzzle.givens[selected] !== 0) return current;
      if (current.board[selected] === puzzle.solution[selected]) return current;

      const prev = current.board[selected];
      if (prev === 0 && !current.candidates[selected]) return current;

      soundService.playPlace();
      const newBoard = [...current.board];
      newBoard[selected] = 0;

      const newCandidates = { ...current.candidates };
      delete newCandidates[selected];

      const newIncorrect = current.incorrectCells.filter((i) => i !== selected);

      moveHistoryRef.current.push({
        cellIndex: selected,
        previousValue: prev,
        newValue: 0,
        wasCorrect: false,
        isErase: true,
      });

      return {
        ...current,
        board: newBoard,
        candidates: newCandidates,
        incorrectCells: newIncorrect,
      };
    });
  }, []);

  const undo = useCallback(() => {
    if (moveHistoryRef.current.length === 0) return;
    const last = moveHistoryRef.current.pop()!;

    setState((current) => {
      const newBoard = [...current.board];
      newBoard[last.cellIndex] = last.previousValue;

      const puzzle = current.puzzle;
      const newIncorrect = current.incorrectCells.filter((i) => i !== last.cellIndex);
      if (last.previousValue !== 0 && puzzle && last.previousValue !== puzzle.solution[last.cellIndex]) {
        newIncorrect.push(last.cellIndex);
      }

      let newLives = current.lives;
      if (!last.wasCorrect && !last.isErase && current.mistakeRule !== 'casual') {
        newLives = Math.min(
          current.mistakeRule === 'hardcore' ? 1 : 3,
          current.lives + 1
        );
      }

      return {
        ...current,
        board: newBoard,
        incorrectCells: newIncorrect,
        lives: newLives,
      };
    });
  }, []);

  const remainingCounts = [1, 2, 3, 4, 5, 6, 7, 8, 9].reduce((acc, num) => {
    const count = state.board.filter((v) => v === num).length;
    acc[num] = Math.max(0, 9 - count);
    return acc;
  }, {} as Record<number, number>);

  const minutes = Math.floor(state.elapsedSeconds / 60);
  const seconds = state.elapsedSeconds % 60;
  const timeFormatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  const maxMistakes = state.mistakeRule === 'hardcore' ? 1 : state.mistakeRule === 'casual' ? 999 : 3;
  const isKnockedOut = state.status === 'lost';
  const isFinished = state.status === 'won';

  return {
    state,
    gameState: {
      ...state,
      isKnockedOut,
      isFinished,
      maxMistakes,
      mistakes: state.wrongCount,
    },
    isGenerating,
    selectedCell: state.selectedCell,
    isNotesMode: pencilMode,
    pencilMode,
    setPencilMode,
    toggleNotesMode: () => setPencilMode((p) => !p),
    selectCell,
    inputNumber,
    erase,
    eraseCell: erase,
    undo,
    startNewGame,
    startWithPuzzle,
    pause: () => setState((s) => (s.status === 'playing' ? { ...s, status: 'paused' } : s)),
    resume: () => setState((s) => (s.status === 'paused' ? { ...s, status: 'playing' } : s)),
    restart: () => {
      if (state.puzzle) {
        startWithPuzzle(state.puzzle, state.mistakeRule);
      } else {
        startNewGame(state.difficulty, state.mistakeRule);
      }
    },
    remainingCounts,
    timeFormatted,
    lastDelta,
    isKnockedOut,
    isFinished,
    maxMistakes,
  };
}
