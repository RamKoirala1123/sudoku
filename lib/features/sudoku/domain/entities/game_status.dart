/// Lifecycle status of a single Sudoku game.
///
/// This is deliberately generic (not "SinglePlayerStatus") so the same
/// state machine can be reused when a match involves two connected players.
enum GameStatus {
  ready,
  playing,
  paused,
  won,
  lost,
}
