import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sudoku_duel/features/multiplayer/domain/mistake_rule.dart';
import 'package:sudoku_duel/features/sudoku/domain/entities/difficulty.dart';
import 'package:sudoku_duel/features/sudoku/domain/entities/game_status.dart';
import 'package:sudoku_duel/features/sudoku/domain/entities/sudoku_puzzle.dart';
import 'package:sudoku_duel/features/sudoku/domain/game/sudoku_game_controller.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUpAll(() {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(
      const MethodChannel('xyz.luan/audioplayers.global'),
      (call) async => null,
    );
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(
      const MethodChannel('xyz.luan/audioplayers'),
      (call) async => null,
    );
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(
      const MethodChannel('plugins.flutter.io/path_provider'),
      (call) async => '.',
    );
  });

  // Deterministic valid board
  final solution = List.generate(81, (i) {
    final r = i ~/ 9;
    final c = i % 9;
    return (r * 3 + r ~/ 3 + c) % 9 + 1;
  });
  final givens = List<int>.filled(81, 0);
  givens[0] = solution[0];

  final puzzle = SudokuPuzzle(
    givens: givens,
    solution: solution,
    difficulty: Difficulty.medium,
    seed: '1234',
  );

  group('Auto-Clear Notes Tests', () {
    test('Correct move clears pencil note value in same row, column, and box', () {
      final controller = SudokuGameController(
        difficulty: Difficulty.medium,
        mistakeRule: MistakeRule.standard,
      );
      controller.startWithPuzzle(puzzle);

      final correctValForCell2 = solution[2];

      controller.selectCell(1);
      controller.toggleCandidate(correctValForCell2);
      controller.toggleCandidate(9);

      controller.selectCell(10);
      controller.toggleCandidate(correctValForCell2);

      controller.selectCell(11);
      controller.toggleCandidate(correctValForCell2);

      expect(controller.state.candidates[1], contains(correctValForCell2));
      expect(controller.state.candidates[10], contains(correctValForCell2));
      expect(controller.state.candidates[11], contains(correctValForCell2));

      controller.selectCell(2);
      controller.inputNumber(correctValForCell2);

      expect(controller.state.board[2], equals(correctValForCell2));
      expect(controller.state.candidates[1]?.contains(correctValForCell2) ?? false, isFalse);
      expect(controller.state.candidates[1]?.contains(9), isTrue);
      expect(controller.state.candidates[10]?.contains(correctValForCell2) ?? false, isFalse);
      expect(controller.state.candidates[11]?.contains(correctValForCell2) ?? false, isFalse);
    });
  });

  group('Mistake Rules Tests', () {
    test('Standard rule: 3 lives, knocks out on 3 mistakes', () {
      final controller = SudokuGameController(
        difficulty: Difficulty.medium,
        mistakeRule: MistakeRule.standard,
      );
      controller.startWithPuzzle(puzzle);
      expect(controller.state.lives, equals(3));

      // Cell 1 wrong move 1
      final wrongVal = (solution[1] % 9) + 1;
      controller.selectCell(1);
      controller.inputNumber(wrongVal);
      expect(controller.state.lives, equals(2));
      expect(controller.state.status, equals(GameStatus.playing));

      // Cell 2 wrong move 2
      controller.selectCell(2);
      controller.inputNumber((solution[2] % 9) + 1);
      expect(controller.state.lives, equals(1));
      expect(controller.state.status, equals(GameStatus.playing));

      // Cell 3 wrong move 3 -> knockout
      controller.selectCell(3);
      controller.inputNumber((solution[3] % 9) + 1);
      expect(controller.state.lives, equals(0));
      expect(controller.state.status, equals(GameStatus.lost));
    });

    test('Hardcore rule: 1 life, knocks out immediately on 1 mistake', () {
      final controller = SudokuGameController(
        difficulty: Difficulty.medium,
        mistakeRule: MistakeRule.hardcore,
      );
      controller.startWithPuzzle(puzzle);
      expect(controller.state.lives, equals(1));

      controller.selectCell(1);
      controller.inputNumber((solution[1] % 9) + 1);
      expect(controller.state.lives, equals(0));
      expect(controller.state.status, equals(GameStatus.lost));
    });

    test('Casual rule: unlimited lives, +30s time penalty per mistake', () {
      final controller = SudokuGameController(
        difficulty: Difficulty.medium,
        mistakeRule: MistakeRule.casual,
      );
      controller.startWithPuzzle(puzzle);
      expect(controller.state.lives, equals(999));
      final initialElapsed = controller.state.elapsedSeconds;

      // 1st mistake
      controller.selectCell(1);
      controller.inputNumber((solution[1] % 9) + 1);
      expect(controller.state.lives, equals(999));
      expect(controller.state.elapsedSeconds, equals(initialElapsed + 30));
      expect(controller.state.status, equals(GameStatus.playing));

      // 2nd mistake
      controller.selectCell(2);
      controller.inputNumber((solution[2] % 9) + 1);
      expect(controller.state.lives, equals(999));
      expect(controller.state.elapsedSeconds, equals(initialElapsed + 60));
      expect(controller.state.status, equals(GameStatus.playing));

      // 3rd mistake - does NOT knock out!
      controller.selectCell(3);
      controller.inputNumber((solution[3] % 9) + 1);
      expect(controller.state.lives, equals(999));
      expect(controller.state.elapsedSeconds, equals(initialElapsed + 90));
      expect(controller.state.status, equals(GameStatus.playing));
    });

    test('Can directly replace an incorrect number with a new number without erasing first', () {
      final controller = SudokuGameController(
        difficulty: Difficulty.medium,
        mistakeRule: MistakeRule.casual,
      );
      controller.startWithPuzzle(puzzle);

      // Cell 1: enter wrong number first
      final wrongVal = (solution[1] % 9) + 1;
      controller.selectCell(1);
      controller.inputNumber(wrongVal);
      expect(controller.state.board[1], equals(wrongVal));
      expect(controller.state.incorrectCells, contains(1));

      // Now directly enter correct number into cell 1 without calling erase()
      final correctVal = solution[1];
      controller.inputNumber(correctVal);
      expect(controller.state.board[1], equals(correctVal));
      expect(controller.state.incorrectCells.contains(1), isFalse);
    });
  });
}
