/// The five supported difficulty levels.
///
/// Difficulty is currently modeled purely by the number of "given" (pre-filled)
/// cells. This is intentionally kept as a single tunable knob so a smarter
/// technique-based estimator (e.g. "requires X-Wing", "requires naked pairs")
/// can be layered in later without changing any call sites — see
/// [SudokuGenerator.generate] and [DifficultyEstimate].
enum Difficulty {
  easy,
  medium,
  hard,
  difficult,
  extreme;

  String get label {
    switch (this) {
      case Difficulty.easy:
        return 'Easy';
      case Difficulty.medium:
        return 'Medium';
      case Difficulty.hard:
        return 'Hard';
      case Difficulty.difficult:
        return 'Difficult';
      case Difficulty.extreme:
        return 'Extreme';
    }
  }

  /// Target number of pre-filled ("given") cells out of 81.
  /// Lower givens => more empty cells => harder puzzle.
  int get targetGivens {
    switch (this) {
      case Difficulty.easy:
        return 42;
      case Difficulty.medium:
        return 36;
      case Difficulty.hard:
        return 30;
      case Difficulty.difficult:
        return 26;
      case Difficulty.extreme:
        return 22;
    }
  }

  /// A soft ceiling on generation attempts before the generator accepts the
  /// closest puzzle it managed to carve out. Harder puzzles need many more
  /// removal attempts to hold onto a unique solution, so they get a larger
  /// budget.
  int get maxRemovalAttempts {
    switch (this) {
      case Difficulty.easy:
        return 120;
      case Difficulty.medium:
        return 200;
      case Difficulty.hard:
        return 320;
      case Difficulty.difficult:
        return 450;
      case Difficulty.extreme:
        return 650;
    }
  }
}
