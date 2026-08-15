import '../entities/difficulty.dart';
import '../entities/game_status.dart';
import '../entities/sudoku_puzzle.dart';

/// A snapshot of everything needed to render or resume a game.
///
/// This is the "single source of truth" the spec calls for (section 13):
/// nothing important is allowed to live only inside a widget's local state.
/// [SudokuGameController] owns mutation; this class is treated as
/// effectively immutable — the controller replaces its `_state` field with
/// a `copyWith`'d instance on every change and notifies listeners.
class SudokuGameState {
  final SudokuPuzzle? puzzle;
  final List<int> board; // current player-visible board, 0 = empty
  final Difficulty difficulty;
  final GameStatus status;

  final int score;
  final int correctCount;
  final int wrongCount;
  final int lives;
  final int elapsedSeconds;

  final int? selectedCell;

  /// Cells the player has entered that are currently wrong (relative to the
  /// solution), tracked so the UI can flash/highlight them when
  /// "Show Mistakes" is enabled.
  final Set<int> incorrectCells;

  const SudokuGameState({
    required this.puzzle,
    required this.board,
    required this.difficulty,
    required this.status,
    required this.score,
    required this.correctCount,
    required this.wrongCount,
    required this.lives,
    required this.elapsedSeconds,
    required this.selectedCell,
    required this.incorrectCells,
  });

  factory SudokuGameState.initial(Difficulty difficulty) => SudokuGameState(
        puzzle: null,
        board: const [],
        difficulty: difficulty,
        status: GameStatus.ready,
        score: 0,
        correctCount: 0,
        wrongCount: 0,
        lives: 3,
        elapsedSeconds: 0,
        selectedCell: null,
        incorrectCells: const {},
      );

  bool get isGameActive => status == GameStatus.playing;
  bool get isGameOver => status == GameStatus.won || status == GameStatus.lost;

  bool isGivenCell(int index) => puzzle?.isGivenCell(index) ?? false;

  SudokuGameState copyWith({
    SudokuPuzzle? puzzle,
    List<int>? board,
    Difficulty? difficulty,
    GameStatus? status,
    int? score,
    int? correctCount,
    int? wrongCount,
    int? lives,
    int? elapsedSeconds,
    int? selectedCell,
    bool clearSelectedCell = false,
    Set<int>? incorrectCells,
  }) {
    return SudokuGameState(
      puzzle: puzzle ?? this.puzzle,
      board: board ?? this.board,
      difficulty: difficulty ?? this.difficulty,
      status: status ?? this.status,
      score: score ?? this.score,
      correctCount: correctCount ?? this.correctCount,
      wrongCount: wrongCount ?? this.wrongCount,
      lives: lives ?? this.lives,
      elapsedSeconds: elapsedSeconds ?? this.elapsedSeconds,
      selectedCell: clearSelectedCell ? null : (selectedCell ?? this.selectedCell),
      incorrectCells: incorrectCells ?? this.incorrectCells,
    );
  }
}
