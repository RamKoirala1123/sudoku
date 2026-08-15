/// Pure Sudoku solving logic. Contains zero Flutter dependencies so it can
/// be unit-tested in isolation and reused unchanged if the game engine is
/// ever moved to a server for multiplayer play.
///
/// Board representation: flat `List<int>` of length 81, row-major
/// (`index = row * 9 + col`), 0 = empty, 1-9 = filled.
class SudokuSolver {
  static const int size = 9;
  static const int box = 3;

  /// Returns `true` if [board] is a fully valid, completely filled Sudoku
  /// solution (no empty cells, no rule violations).
  static bool isComplete(List<int> board) {
    if (board.any((v) => v == 0)) return false;
    return isValidBoard(board);
  }

  /// Returns `true` if none of the *filled* cells in [board] violate Sudoku
  /// row/column/box constraints. Empty cells (0) are ignored.
  static bool isValidBoard(List<int> board) {
    for (int i = 0; i < size; i++) {
      if (_hasDuplicate(_rowValues(board, i))) return false;
      if (_hasDuplicate(_colValues(board, i))) return false;
      if (_hasDuplicate(_boxValues(board, i))) return false;
    }
    return true;
  }

  /// Whether placing [value] at [index] is legal given the current [board]
  /// (ignoring whatever value currently occupies [index]).
  static bool isValidPlacement(List<int> board, int index, int value) {
    if (value < 1 || value > 9) return false;
    final row = index ~/ size;
    final col = index % size;
    for (int c = 0; c < size; c++) {
      final i = row * size + c;
      if (i != index && board[i] == value) return false;
    }
    for (int r = 0; r < size; r++) {
      final i = r * size + col;
      if (i != index && board[i] == value) return false;
    }
    final boxRow = (row ~/ box) * box;
    final boxCol = (col ~/ box) * box;
    for (int r = boxRow; r < boxRow + box; r++) {
      for (int c = boxCol; c < boxCol + box; c++) {
        final i = r * size + c;
        if (i != index && board[i] == value) return false;
      }
    }
    return true;
  }

  /// Attempts to solve [board] (0 = empty) in place on a copy, returning the
  /// solved board, or `null` if unsolvable. Uses a most-constrained-cell
  /// (fewest candidates) heuristic for speed.
  static List<int>? solve(List<int> board) {
    final working = List<int>.from(board);
    if (_solveInternal(working)) return working;
    return null;
  }

  /// Counts solutions up to [limit] (default 2, which is all that's needed
  /// to verify uniqueness cheaply — we don't care if there are 2 or 200,
  /// only whether there's more than 1).
  static int countSolutions(List<int> board, {int limit = 2}) {
    final working = List<int>.from(board);
    final counter = _SolutionCounter(limit: limit);
    _countInternal(working, counter);
    return counter.count;
  }

  static bool hasUniqueSolution(List<int> board) => countSolutions(board, limit: 2) == 1;

  // ---- internal ----

  static bool _solveInternal(List<int> board) {
    final next = _findMostConstrainedCell(board);
    if (next == null) return true; // no empty cells left => solved
    final (index, candidates) = next;
    if (candidates.isEmpty) return false;
    for (final v in candidates) {
      board[index] = v;
      if (_solveInternal(board)) return true;
      board[index] = 0;
    }
    return false;
  }

  static void _countInternal(List<int> board, _SolutionCounter counter) {
    if (counter.done) return;
    final next = _findMostConstrainedCell(board);
    if (next == null) {
      counter.count++;
      return;
    }
    final (index, candidates) = next;
    for (final v in candidates) {
      if (counter.done) return;
      board[index] = v;
      _countInternal(board, counter);
      board[index] = 0;
    }
  }

  /// Finds the empty cell with the fewest legal candidates (MRV heuristic),
  /// which dramatically prunes the search tree vs. naive left-to-right
  /// backtracking. Returns null if the board has no empty cells.
  static (int, List<int>)? _findMostConstrainedCell(List<int> board) {
    int bestIndex = -1;
    List<int> bestCandidates = const [];
    int bestCount = 10;

    for (int i = 0; i < board.length; i++) {
      if (board[i] != 0) continue;
      final candidates = _candidatesFor(board, i);
      if (candidates.length < bestCount) {
        bestCount = candidates.length;
        bestIndex = i;
        bestCandidates = candidates;
        if (bestCount == 0) return (bestIndex, bestCandidates); // dead end, bail fast
        if (bestCount == 1) break; // can't do better than a single candidate
      }
    }

    if (bestIndex == -1) return null;
    return (bestIndex, bestCandidates);
  }

  static List<int> _candidatesFor(List<int> board, int index) {
    final used = List<bool>.filled(10, false);
    final row = index ~/ size;
    final col = index % size;
    for (int c = 0; c < size; c++) {
      final v = board[row * size + c];
      if (v != 0) used[v] = true;
    }
    for (int r = 0; r < size; r++) {
      final v = board[r * size + col];
      if (v != 0) used[v] = true;
    }
    final boxRow = (row ~/ box) * box;
    final boxCol = (col ~/ box) * box;
    for (int r = boxRow; r < boxRow + box; r++) {
      for (int c = boxCol; c < boxCol + box; c++) {
        final v = board[r * size + c];
        if (v != 0) used[v] = true;
      }
    }
    final result = <int>[];
    for (int v = 1; v <= 9; v++) {
      if (!used[v]) result.add(v);
    }
    return result;
  }

  static List<int> _rowValues(List<int> board, int row) =>
      List.generate(size, (c) => board[row * size + c]).where((v) => v != 0).toList();

  static List<int> _colValues(List<int> board, int col) =>
      List.generate(size, (r) => board[r * size + col]).where((v) => v != 0).toList();

  static List<int> _boxValues(List<int> board, int boxIndex) {
    final boxRow = (boxIndex ~/ box) * box;
    final boxCol = (boxIndex % box) * box;
    final values = <int>[];
    for (int r = boxRow; r < boxRow + box; r++) {
      for (int c = boxCol; c < boxCol + box; c++) {
        final v = board[r * size + c];
        if (v != 0) values.add(v);
      }
    }
    return values;
  }

  static bool _hasDuplicate(List<int> values) => values.toSet().length != values.length;
}

class _SolutionCounter {
  final int limit;
  int count = 0;
  _SolutionCounter({required this.limit});
  bool get done => count >= limit;
}
