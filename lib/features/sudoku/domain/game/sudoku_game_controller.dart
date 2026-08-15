import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/foundation.dart';

import '../../../../core/constants/app_constants.dart';
import '../engine/sudoku_generator.dart';
import '../engine/sudoku_solver.dart';
import '../entities/difficulty.dart';
import '../entities/game_event.dart';
import '../entities/game_status.dart';
import '../entities/game_summary.dart';
import '../entities/sudoku_move.dart';
import 'sudoku_game_state.dart';

/// Orchestrates a single game of Sudoku.
///
/// This is intentionally a plain [ChangeNotifier] rather than something
/// tied to a specific state-management package's opinions — the game logic
/// itself (validation, scoring, lives, timer semantics) lives here and in
/// `domain/engine`, completely independent of *how* the UI observes it. If
/// this project later swaps Provider for Riverpod/Bloc, only the widgets
/// that read this controller need to change, not this class.
///
/// Also emits [GameEvent]s on [events], which today the UI mostly ignores
/// but which is exactly the seam a future multiplayer `GameConnection`
/// would tap into to mirror moves to a remote opponent (spec section 19).
class SudokuGameController extends ChangeNotifier {
  SudokuGameState _state;
  Timer? _ticker;
  bool _showMistakes;

  final _eventsController = StreamController<GameEvent>.broadcast();
  Stream<GameEvent> get events => _eventsController.stream;

  /// Invoked exactly once when a game reaches won/lost, so the presentation
  /// layer can persist it via the Statistics feature without this class
  /// needing to know that feature exists.
  void Function(GameSummary summary)? onGameEnded;

  SudokuGameController({required Difficulty difficulty, bool showMistakes = true})
      : _state = SudokuGameState.initial(difficulty),
        _showMistakes = showMistakes;

  SudokuGameState get state => _state;

  void setShowMistakes(bool value) {
    _showMistakes = value;
  }

  void _emitState() => notifyListeners();

  void _emitEvent(GameEvent event) {
    if (!_eventsController.isClosed) _eventsController.add(event);
  }

  /// Generates a fresh puzzle for [difficulty] (or the controller's current
  /// difficulty) off the UI thread and starts the game.
  Future<void> startNewGame({Difficulty? difficulty}) async {
    _ticker?.cancel();
    final targetDifficulty = difficulty ?? _state.difficulty;

    final puzzle = await compute(
      SudokuGenerator.generate,
      GenerationRequest(difficulty: targetDifficulty),
    );

    _state = SudokuGameState.initial(targetDifficulty).copyWith(
      puzzle: puzzle,
      board: List<int>.from(puzzle.givens),
      status: GameStatus.playing,
    );
    _emitState();
    _emitEvent(GameStartedEvent());
    _startTicker();
  }

  Future<void> restart() => startNewGame(difficulty: _state.difficulty);

  void selectCell(int index) {
    if (_state.status != GameStatus.playing) return;
    if (index < 0 || index >= AppConstants.totalCells) return;
    _state = _state.copyWith(selectedCell: index);
    _emitState();
    _emitEvent(CellSelectedEvent(index));
  }

  /// Enters [value] (1-9) into the currently selected cell, if legal.
  void inputNumber(int value) {
    if (_state.status != GameStatus.playing) return;
    final selected = _state.selectedCell;
    if (selected == null) return;
    if (_state.isGivenCell(selected)) return; // cannot edit given cells
    if (value < 1 || value > 9) return;

    final solution = _state.puzzle!.solution;
    final isCorrect = solution[selected] == value;

    final newBoard = List<int>.from(_state.board);
    newBoard[selected] = value;

    final newIncorrect = Set<int>.from(_state.incorrectCells);
    if (isCorrect) {
      newIncorrect.remove(selected);
    } else if (_showMistakes) {
      newIncorrect.add(selected);
    }

    final move = SudokuMove(cellIndex: selected, value: value, wasCorrect: isCorrect);
    _emitEvent(NumberEnteredEvent(move));

    if (isCorrect) {
      final newScore = _state.score + AppConstants.correctAnswerPoints;
      final newCorrect = _state.correctCount + 1;
      _state = _state.copyWith(
        board: newBoard,
        score: newScore,
        correctCount: newCorrect,
        incorrectCells: newIncorrect,
      );
      _emitEvent(MoveCorrectEvent(move));

      if (_isBoardSolved(newBoard, solution)) {
        _finishGame(won: true);
        return;
      }
    } else {
      final newScore = math.max(
        AppConstants.minScore,
        _state.score - AppConstants.incorrectAnswerPenalty,
      );
      final newWrong = _state.wrongCount + 1;
      final newLives = _state.lives - 1;
      _state = _state.copyWith(
        board: newBoard,
        score: newScore,
        wrongCount: newWrong,
        lives: newLives,
        incorrectCells: newIncorrect,
      );
      _emitEvent(MoveIncorrectEvent(move, newLives));

      if (newLives <= 0) {
        _finishGame(won: false);
        return;
      }
    }

    _emitState();
  }

  void erase() {
    if (_state.status != GameStatus.playing) return;
    final selected = _state.selectedCell;
    if (selected == null) return;
    if (_state.isGivenCell(selected)) return;

    final newBoard = List<int>.from(_state.board)..[selected] = 0;
    final newIncorrect = Set<int>.from(_state.incorrectCells)..remove(selected);
    _state = _state.copyWith(board: newBoard, incorrectCells: newIncorrect);
    _emitState();
  }

  void pause() {
    if (_state.status != GameStatus.playing) return;
    _ticker?.cancel();
    _state = _state.copyWith(status: GameStatus.paused);
    _emitState();
    _emitEvent(GamePausedEvent());
  }

  void resume() {
    if (_state.status != GameStatus.paused) return;
    _state = _state.copyWith(status: GameStatus.playing);
    _emitState();
    _emitEvent(GameResumedEvent());
    _startTicker();
  }

  /// Called when the player navigates away mid-game; stops the timer
  /// without altering `status`'s terminal semantics.
  void exitGame() {
    _ticker?.cancel();
  }

  void _startTicker() {
    _ticker?.cancel();
    _ticker = Timer.periodic(const Duration(seconds: 1), (_) {
      if (_state.status != GameStatus.playing) return;
      _state = _state.copyWith(elapsedSeconds: _state.elapsedSeconds + 1);
      _emitState();
    });
  }

  bool _isBoardSolved(List<int> board, List<int> solution) {
    for (int i = 0; i < board.length; i++) {
      if (board[i] != solution[i]) return false;
    }
    return true;
  }

  void _finishGame({required bool won}) {
    _ticker?.cancel();
    _state = _state.copyWith(status: won ? GameStatus.won : GameStatus.lost);
    _emitState();

    final summary = GameSummary(
      difficulty: _state.difficulty,
      won: won,
      score: _state.score,
      elapsedSeconds: _state.elapsedSeconds,
      correctCount: _state.correctCount,
      wrongCount: _state.wrongCount,
    );

    if (won) {
      _emitEvent(GameCompletedEvent(finalScore: _state.score, elapsedSeconds: _state.elapsedSeconds));
    } else {
      _emitEvent(GameLostEvent(finalScore: _state.score, elapsedSeconds: _state.elapsedSeconds));
    }

    onGameEnded?.call(summary);
  }

  @override
  void dispose() {
    _ticker?.cancel();
    _eventsController.close();
    super.dispose();
  }
}
