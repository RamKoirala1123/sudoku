/// A single, immutable player action against a board.
///
/// Representing moves as discrete, serializable-friendly objects (rather than
/// just mutating a grid in place) is what will let a future multiplayer mode
/// broadcast moves between `Game Connection` endpoints without any changes to
/// the engine itself — see spec section 19.
class SudokuMove {
  final int cellIndex;
  final int value; // 1-9, or 0 to represent an erase.
  final bool isErase;
  final bool wasCorrect;
  final DateTime timestamp;

  SudokuMove({
    required this.cellIndex,
    required this.value,
    required this.wasCorrect,
    this.isErase = false,
    DateTime? timestamp,
  }) : timestamp = timestamp ?? DateTime.now();

  Map<String, dynamic> toJson() => {
        'cellIndex': cellIndex,
        'value': value,
        'isErase': isErase,
        'wasCorrect': wasCorrect,
        'timestamp': timestamp.toIso8601String(),
      };
}
