import 'difficulty.dart';

/// A terminal summary of one completed (won or lost) game.
///
/// This is the hand-off point between the Sudoku engine and the
/// Statistics feature — the engine has no idea `StatisticsRepository`
/// exists, it just emits this value object via a callback.
class GameSummary {
  final Difficulty difficulty;
  final bool won;
  final int score;
  final int elapsedSeconds;
  final int correctCount;
  final int wrongCount;

  const GameSummary({
    required this.difficulty,
    required this.won,
    required this.score,
    required this.elapsedSeconds,
    required this.correctCount,
    required this.wrongCount,
  });
}
