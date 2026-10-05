export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert' | 'difficult' | 'extreme';

export type MistakeRule = 'standard' | 'hardcore' | 'casual';

export interface MistakeRuleInfo {
  id: MistakeRule;
  label: string;
  initialLives: number;
  description: string;
}

export const MISTAKE_RULES: Record<MistakeRule, MistakeRuleInfo> = {
  standard: {
    id: 'standard',
    label: 'Standard',
    initialLives: 3,
    description: '3 Mistakes (Knockout)',
  },
  hardcore: {
    id: 'hardcore',
    label: 'Hardcore',
    initialLives: 1,
    description: '1 Mistake (Sudden Death)',
  },
  casual: {
    id: 'casual',
    label: 'Casual',
    initialLives: 999,
    description: 'Unlimited mistakes with +30s time penalty',
  },
};

export interface DifficultyInfo {
  id: Difficulty;
  label: string;
  givensCount: number;
  maxRemovalAttempts: number;
}

// Matches Flutter's Difficulty enum: targetGivens and maxRemovalAttempts
// @see lib/features/sudoku/domain/entities/difficulty.dart
export const DIFFICULTIES: Record<Difficulty, DifficultyInfo> = {
  easy:      { id: 'easy',      label: 'Easy',      givensCount: 42, maxRemovalAttempts: 120 },
  medium:    { id: 'medium',    label: 'Medium',    givensCount: 36, maxRemovalAttempts: 200 },
  hard:      { id: 'hard',      label: 'Hard',      givensCount: 30, maxRemovalAttempts: 320 },
  expert:    { id: 'expert',    label: 'Expert',    givensCount: 26, maxRemovalAttempts: 450 },
  difficult: { id: 'difficult', label: 'Difficult', givensCount: 26, maxRemovalAttempts: 450 },
  extreme:   { id: 'extreme',   label: 'Extreme',   givensCount: 22, maxRemovalAttempts: 650 },
};

export interface SudokuPuzzle {
  givens: number[];
  solution: number[];
  difficulty: Difficulty;
  seed: string;
}

export type GameStatus = 'playing' | 'paused' | 'won' | 'lost';

export interface MoveRecord {
  cellIndex: number;
  previousValue: number;
  newValue: number;
  wasCorrect: boolean;
  isErase: boolean;
}

export interface WaveAnimationData {
  id: number;
  triggerIndex: number;
  cells: number[];
  isError?: boolean;
}

export interface ShakeAnimationData {
  id: number;
  cellIndices: number[];
}

export interface SudokuGameState {
  puzzle: SudokuPuzzle | null;
  board: number[];
  selectedCell: number | null;
  candidates: Record<number, number[]>; // cellIndex -> list of candidate numbers
  incorrectCells: number[];
  status: GameStatus;
  score: number;
  wrongCount: number;
  correctCount: number;
  lives: number;
  elapsedSeconds: number;
  difficulty: Difficulty;
  mistakeRule: MistakeRule;
  waveAnimation?: WaveAnimationData | null;
  shakeAnimation?: ShakeAnimationData | null;
  conflictHighlight?: { id: number; cellIndices: number[] } | null;
}

export interface PlayerProgress {
  id: string;
  name: string;
  colorIndex: number;
  color?: string;
  isHost?: boolean;
  targetToFill: number;
  filledCount: number;
  progressPercent: number;
  progress?: number;
  score: number;
  lives: number;
  mistakes: number;
  isCompleted: boolean;
  isFinished?: boolean;
  isDefeated: boolean;
  isKnockedOut?: boolean;
  recentEmoji?: string;
  latencyMs: number;
  rank: number;
  timeFormatted?: string;
  accuracyPercent?: number;
  cellsPerMinute?: number;
}

export interface SavedGameSession {
  isMultiplayer: boolean;
  roomCode?: string;
  role: 'host' | 'guest' | 'single';
  localPlayerId: string;
  localPlayerName: string;
  difficulty: Difficulty;
  puzzle: SudokuPuzzle;
  board: number[];
  candidates: Record<number, number[]>;
  lives: number;
  score: number;
  elapsedSeconds: number;
  mistakeRule: MistakeRule;
  timestamp: number;
}
