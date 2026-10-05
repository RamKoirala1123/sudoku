import 'package:flutter_test/flutter_test.dart';
import 'package:sudoku_duel/features/sudoku/domain/engine/sudoku_generator.dart';
import 'package:sudoku_duel/features/sudoku/domain/engine/sudoku_solver.dart';
import 'package:sudoku_duel/features/sudoku/domain/entities/difficulty.dart';

void main() {
  group('SudokuSolver', () {
    test('solves a valid, solvable board', () {
      final board = List<int>.filled(81, 0);
      final solved = SudokuSolver.solve(board);
      expect(solved, isNotNull);
      expect(SudokuSolver.isComplete(solved!), isTrue);
    });

    test('detects invalid placement due to row conflict', () {
      final board = List<int>.filled(81, 0);
      board[0] = 5;
      expect(SudokuSolver.isValidPlacement(board, 3, 5), isFalse);
    });

    test('detects invalid placement due to box conflict', () {
      final board = List<int>.filled(81, 0);
      board[0] = 7;
      expect(SudokuSolver.isValidPlacement(board, 10, 7), isFalse);
    });

    test('countSolutions returns 1 for a fully solved board', () {
      final solved = SudokuSolver.solve(List<int>.filled(81, 0))!;
      expect(SudokuSolver.countSolutions(solved), 1);
    });

    test('an empty board has more than one solution', () {
      final board = List<int>.filled(81, 0);
      expect(SudokuSolver.hasUniqueSolution(board), isFalse);
    });
  });

  group('SudokuGenerator', () {
    for (final difficulty in Difficulty.values) {
      test('${difficulty.name}: generates a valid, uniquely-solvable puzzle', () {
        final puzzle = SudokuGenerator.generate(
          GenerationRequest(difficulty: difficulty, randomSeed: 42),
        );

        // Solution must be a complete, valid board.
        expect(SudokuSolver.isComplete(puzzle.solution), isTrue);

        // Every given cell in the puzzle must match the solution.
        for (int i = 0; i < 81; i++) {
          if (puzzle.givens[i] != 0) {
            expect(puzzle.givens[i], puzzle.solution[i]);
          }
        }

        // The puzzle (with its empties) must have exactly one solution.
        expect(SudokuSolver.hasUniqueSolution(puzzle.givens), isTrue);

        // Solving the puzzle from its givens must reproduce the solution.
        final resolved = SudokuSolver.solve(puzzle.givens);
        expect(resolved, puzzle.solution);
      });
    }

    test('harder difficulties produce fewer or equal given cells than easier ones', () {
      final easy = SudokuGenerator.generate(
        const GenerationRequest(difficulty: Difficulty.easy, randomSeed: 7),
      );
      final extreme = SudokuGenerator.generate(
        const GenerationRequest(difficulty: Difficulty.extreme, randomSeed: 7),
      );
      expect(extreme.givenCount, lessThanOrEqualTo(easy.givenCount));
    });
  });
}
