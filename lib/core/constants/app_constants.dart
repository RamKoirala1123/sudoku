/// Global, non-visual constants used across the app.
class AppConstants {
  AppConstants._();

  static const String appName = 'Sudoku Duel';

  // Scoring rules (see feature spec section 6 & 20).
  static const int correctAnswerPoints = 10;
  static const int incorrectAnswerPenalty = 5;
  static const int minScore = 0;

  // Lives / mistakes system (section 7 & 20).
  static const int startingLives = 3;

  // Board dimensions.
  static const int boardSize = 9;
  static const int boxSize = 3;
  static const int totalCells = boardSize * boardSize;

  // Persistence keys.
  static const String prefsStatisticsKey = 'sudoku_duel.statistics.v1';
  static const String prefsSettingsKey = 'sudoku_duel.settings.v1';
  static const String prefsSavedGameKey = 'sudoku_duel.saved_game.v1';
}
