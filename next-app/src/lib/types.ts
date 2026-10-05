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
}

export const DIFFICULTIES: Record<Difficulty, DifficultyInfo> = {
  easy: { id: 'easy', label: 'Easy', givensCount: 38 },
  medium: { id: 'medium', label: 'Medium', givensCount: 32 },
  hard: { id: 'hard', label: 'Hard', givensCount: 28 },
  expert: { id: 'expert', label: 'Expert', givensCount: 24 },
  difficult: { id: 'difficult', label: 'Difficult', givensCount: 24 },
  extreme: { id: 'extreme', label: 'Extreme', givensCount: 22 },
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
