import 'dart:math';
import '../entities/difficulty.dart';
import '../entities/sudoku_puzzle.dart';
import 'sudoku_solver.dart';

/// Parameters passed into [SudokuGenerator.generate], kept as a plain,
/// top-level-friendly data class so generation can be dispatched to a
/// background isolate via `compute()` without capturing closures.
class GenerationRequest {
  final Difficulty difficulty;
  final int? randomSeed;
  const GenerationRequest({required this.difficulty, this.randomSeed});
}

/// Builds fully-valid, uniquely-solvable Sudoku puzzles.
///
/// Algorithm:
/// 1. Fill an empty board completely using randomized backtracking
///    (`_fillFullBoard`) to get a valid, complete solution.
/// 2. Carve cells out one at a time in random order (`_carvePuzzle`),
///    re-checking after every removal that the puzzle still has *exactly
///    one* solution (via [SudokuSolver.hasUniqueSolution]). If removing a
///    cell would create a second solution, the cell is put back.
/// 3. Stop once the target "givens" count for the requested [Difficulty]
///    is reached, or the attempt budget is exhausted — whichever comes
///    first. This guarantees every puzzle produced is uniquely solvable,
///    per spec section 3 & 20 ("Do NOT simply randomly remove numbers
///    without checking...").
class SudokuGenerator {
  /// Top-level-callable entry point (safe for `compute()`).
  static SudokuPuzzle generate(GenerationRequest request) {
    final random = Random(request.randomSeed ?? DateTime.now().microsecondsSinceEpoch);
    final solution = _fillFullBoard(random);
    final givens = _carvePuzzle(solution, request.difficulty, random);
    final seed = '${request.difficulty.name}-${random.nextInt(1 << 31)}-${DateTime.now().millisecondsSinceEpoch}';
    return SudokuPuzzle(
      givens: givens,
      solution: solution,
      difficulty: request.difficulty,
      seed: seed,
    );
  }

  /// Produces a complete, randomly-shuffled, fully valid 81-cell solution.
  static List<int> _fillFullBoard(Random random) {
    final board = List<int>.filled(81, 0);
    final success = _fillRecursive(board, 0, random);
    assert(success, 'Full board generation should never fail from an empty grid');
    return board;
  }

  static bool _fillRecursive(List<int> board, int index, Random random) {
    if (index == 81) return true;
    if (board[index] != 0) return _fillRecursive(board, index + 1, random);

    final candidates = List<int>.generate(9, (i) => i + 1)..shuffle(random);
    for (final v in candidates) {
      if (SudokuSolver.isValidPlacement(board, index, v)) {
        board[index] = v;
        if (_fillRecursive(board, index + 1, random)) return true;
        board[index] = 0;
      }
    }
    return false;
  }

  /// Removes cells from a full [solution] until it hits (or approaches) the
  /// difficulty's target given-count, guaranteeing a unique solution is
  /// preserved at every step.
  static List<int> _carvePuzzle(List<int> solution, Difficulty difficulty, Random random) {
    final puzzle = List<int>.from(solution);
    final cellOrder = List<int>.generate(81, (i) => i)..shuffle(random);

    final targetGivens = difficulty.targetGivens.clamp(17, 81);
    int currentGivens = 81;
    int attempts = 0;
    int cursor = 0;

    while (currentGivens > targetGivens &&
        attempts < difficulty.maxRemovalAttempts &&
        cursor < cellOrder.length) {
      final index = cellOrder[cursor];
      cursor++;
      attempts++;

      if (puzzle[index] == 0) continue; // already removed

      final backup = puzzle[index];
      puzzle[index] = 0;

      if (SudokuSolver.hasUniqueSolution(puzzle)) {
        currentGivens--;
      } else {
        puzzle[index] = backup; // restore, removal broke uniqueness
      }

      // If we've walked the whole shuffled order but still haven't hit the
      // target, reshuffle remaining filled cells and keep trying within the
      // attempt budget (helps push harder difficulties further).
      if (cursor == cellOrder.length && currentGivens > targetGivens) {
        cellOrder.shuffle(random);
        cursor = 0;
      }
    }

    return puzzle;
  }
}
