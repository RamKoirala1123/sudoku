import 'difficulty.dart';

/// An immutable, generated Sudoku puzzle: the starting grid (with 0 = empty)
/// plus its unique solution.
///
/// Board representation is a flat 81-cell `List<int>` (row-major, index =
/// row * 9 + col) as required by the spec so it can later be trivially
/// serialized and synchronized between two players.
class SudokuPuzzle {
  final List<int> givens; // 0-9, 0 = empty. The starting board.
  final List<int> solution; // 1-9, fully solved reference board.
  final Difficulty difficulty;
  final String seed;

  SudokuPuzzle({
    required this.givens,
    required this.solution,
    required this.difficulty,
    required this.seed,
  })  : assert(givens.length == 81),
        assert(solution.length == 81);

  bool isGivenCell(int index) => givens[index] != 0;

  int get givenCount => givens.where((v) => v != 0).length;
  int get emptyCount => 81 - givenCount;

  Map<String, dynamic> toJson() => {
        'givens': givens,
        'solution': solution,
        'difficulty': difficulty.name,
        'seed': seed,
      };

  factory SudokuPuzzle.fromJson(Map<String, dynamic> json) => SudokuPuzzle(
        givens: List<int>.from(json['givens'] as List),
        solution: List<int>.from(json['solution'] as List),
        difficulty: Difficulty.values.firstWhere(
          (d) => d.name == json['difficulty'],
          orElse: () => Difficulty.medium,
        ),
        seed: json['seed'] as String? ?? '',
      );
}
