import 'sudoku_move.dart';

/// Base type for discrete events emitted by [SudokuGameController].
///
/// The single-player UI mostly ignores these today (it just reads state
/// off the controller), but modeling actions as events — rather than only
/// as side effects of method calls — is what will make it possible to pipe
/// the exact same stream through a `GameConnection` / WebSocket layer in the
/// multiplayer version described in spec section 19, without touching the
/// Sudoku engine.
sealed class GameEvent {
  final DateTime timestamp;
  GameEvent() : timestamp = DateTime.now();
}

class GameStartedEvent extends GameEvent {}

class CellSelectedEvent extends GameEvent {
  final int cellIndex;
  CellSelectedEvent(this.cellIndex);
}

class NumberEnteredEvent extends GameEvent {
  final SudokuMove move;
  NumberEnteredEvent(this.move);
}

class MoveCorrectEvent extends GameEvent {
  final SudokuMove move;
  MoveCorrectEvent(this.move);
}

class MoveIncorrectEvent extends GameEvent {
  final SudokuMove move;
  final int livesRemaining;
  MoveIncorrectEvent(this.move, this.livesRemaining);
}

class GamePausedEvent extends GameEvent {}

class GameResumedEvent extends GameEvent {}

class GameCompletedEvent extends GameEvent {
  final int finalScore;
  final int elapsedSeconds;
  GameCompletedEvent({required this.finalScore, required this.elapsedSeconds});
}

class GameLostEvent extends GameEvent {
  final int finalScore;
  final int elapsedSeconds;
  GameLostEvent({required this.finalScore, required this.elapsedSeconds});
}

class AllNumberFilledEvent extends GameEvent {
  final int number;

  AllNumberFilledEvent(this.number);
}

class RowCompletedEvent extends GameEvent {
  final int rowIndex;
  final int triggerCellIndex; // cell where the final number was entered
  RowCompletedEvent(this.rowIndex, this.triggerCellIndex);
}

class ColumnCompletedEvent extends GameEvent {
  final int columnIndex;
  final int triggerCellIndex;
  ColumnCompletedEvent(this.columnIndex, this.triggerCellIndex);
}

class BoxCompletedEvent extends GameEvent {
  final int boxIndex; // 0..8, left-to-right, top-to-bottom
  final int triggerCellIndex;
  BoxCompletedEvent(this.boxIndex, this.triggerCellIndex);
}

/// Highlights specific cells that conflict with a recently entered number.
class ConflictingCellsEvent extends GameEvent {
  final List<int> cells; // indices of conflicting cells
  final int triggerCellIndex; // the cell where the player entered the number
  ConflictingCellsEvent(this.cells, this.triggerCellIndex);
}
