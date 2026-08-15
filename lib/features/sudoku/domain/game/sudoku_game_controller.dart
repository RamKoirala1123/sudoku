import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:sudoku_duel/core/services/sudoku_sound_service.dart';

import '../../../../core/constants/app_constants.dart';
import '../engine/sudoku_generator.dart';
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
  final SudokuSoundService _soundService = SudokuSoundService();

  SudokuGameState _state;
  Timer? _ticker;
  bool _showMistakes;

  final _eventsController = StreamController<GameEvent>.broadcast();

  Stream<GameEvent> get events => _eventsController.stream;

  /// Invoked exactly once when a game reaches won/lost, so the presentation
  /// layer can persist it via the Statistics feature without this class
  /// needing to know that feature exists.
  void Function(GameSummary summary)? onGameEnded;

  SudokuGameController({
    required Difficulty difficulty,
    bool showMistakes = true,
  })  : _state = SudokuGameState.initial(difficulty),
        _showMistakes = showMistakes;

  SudokuGameState get state => _state;

  void setShowMistakes(bool value) {
    _showMistakes = value;
  }

  void _emitState() => notifyListeners();

  void _emitEvent(GameEvent event) {
    if (!_eventsController.isClosed) {
      _eventsController.add(event);
    }
  }

  /// Generates a fresh puzzle for [difficulty] (or the controller's current
  /// difficulty) off the UI thread and starts the game.
  Future<void> startNewGame({Difficulty? difficulty}) async {
    _ticker?.cancel();

    final targetDifficulty = difficulty ?? _state.difficulty;

    final puzzle = await compute(
      SudokuGenerator.generate,
      GenerationRequest(
        difficulty: targetDifficulty,
      ),
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

  Future<void> restart() {
    return startNewGame(
      difficulty: _state.difficulty,
    );
  }

  void selectCell(int index) {
    if (_state.status != GameStatus.playing) return;

    if (index < 0 || index >= AppConstants.totalCells) {
      return;
    }

    _state = _state.copyWith(
      selectedCell: index,
    );

    _emitState();
    _emitEvent(CellSelectedEvent(index));
  }

  /// Enters [value] (1-9) into the currently selected cell, if legal.
  void inputNumber(int value) {
    if (_state.status != GameStatus.playing) return;

    final selected = _state.selectedCell;

    if (selected == null) return;
    if (_state.isGivenCell(selected)) return;
    if (value < 1 || value > 9) return;
    // Only allow entering a number into an empty cell. If the cell already
    // contains a player-filled value (correct or incorrect), require the
    // player to erase it first.
    if (_state.board[selected] != 0) return;

    final solution = _state.puzzle!.solution;

    final isCorrect = solution[selected] == value;

    final newBoard = List<int>.from(_state.board);
    newBoard[selected] = value;

    final newIncorrect = Set<int>.from(
      _state.incorrectCells,
    );

    if (isCorrect) {
      newIncorrect.remove(selected);
    } else if (_showMistakes) {
      newIncorrect.add(selected);
    }

    final move = SudokuMove(
      cellIndex: selected,
      value: value,
      wasCorrect: isCorrect,
    );

    _emitEvent(
      NumberEnteredEvent(move),
    );

    // ----------------------------------------------------------
    // CORRECT NUMBER
    // ----------------------------------------------------------
    if (isCorrect) {
      final newScore = _state.score + AppConstants.correctAnswerPoints;

      final newCorrect = _state.correctCount + 1;

      _state = _state.copyWith(
        board: newBoard,
        score: newScore,
        correctCount: newCorrect,
        incorrectCells: newIncorrect,
      );

      // Emit row/column/box completion events when this correct move
      // causes a full row/column/box to match the solution. This lets the
      // UI animate waves regardless of whether the entry completed all
      // instances of the same number.
      final row = selected ~/ AppConstants.boardSize;
      final col = selected % AppConstants.boardSize;

      if (_isRowCompleted(row, newBoard, solution)) {
        debugPrint('RowCompletedEvent emitted for row=$row trigger=$selected');
        _emitEvent(RowCompletedEvent(row, selected));
      }

      if (_isColumnCompleted(col, newBoard, solution)) {
        debugPrint(
            'ColumnCompletedEvent emitted for col=$col trigger=$selected');
        _emitEvent(ColumnCompletedEvent(col, selected));
      }

      final box = (row ~/ AppConstants.boxSize) * AppConstants.boxSize +
          (col ~/ AppConstants.boxSize);
      if (_isBoxCompleted(box, newBoard, solution)) {
        debugPrint('BoxCompletedEvent emitted for box=$box trigger=$selected');
        _emitEvent(BoxCompletedEvent(box, selected));
      }

      // Check completion BEFORE normal success sound.
      //
      // This prevents the final number from playing both:
      // success.mp3
      // and completion.mp3
      if (_isBoardSolved(newBoard, solution)) {
        _soundService.playCompletion();

        _emitEvent(
          MoveCorrectEvent(move),
        );

        _finishGame(won: true);
        return;
      }

      // Check whether all instances of this number have been filled.
      //
      // Example:
      // If the player just placed the final 7 required by
      // the solution, play the special "all 7s filled" sound.
      if (_isNumberCompleted(
        newBoard,
        solution,
        value,
      )) {
        _soundService.playAllNumberFilled();

        _emitEvent(
          AllNumberFilledEvent(value),
        );
      } else {
        // Normal correct number.
        _soundService.playCellSuccess();

        _emitEvent(
          MoveCorrectEvent(move),
        );
      }
    }

    // ----------------------------------------------------------
    // INCORRECT NUMBER
    // ----------------------------------------------------------
    else {
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

      // Play error sound.
      _soundService.playCellError();

      _emitEvent(
        MoveIncorrectEvent(
          move,
          newLives,
        ),
      );

      if (newLives <= 0) {
        _finishGame(won: false);
        return;
      }
    }

    _emitState();
  }

  bool _isRowCompleted(int row, List<int> board, List<int> solution) {
    final start = row * AppConstants.boardSize;
    for (int i = 0; i < AppConstants.boardSize; i++) {
      if (board[start + i] != solution[start + i]) return false;
    }
    return true;
  }

  bool _isColumnCompleted(int col, List<int> board, List<int> solution) {
    for (int r = 0; r < AppConstants.boardSize; r++) {
      final idx = r * AppConstants.boardSize + col;
      if (board[idx] != solution[idx]) return false;
    }
    return true;
  }

  bool _isBoxCompleted(int boxIndex, List<int> board, List<int> solution) {
    final boxRow = boxIndex ~/ AppConstants.boxSize;
    final boxCol = boxIndex % AppConstants.boxSize;

    final startRow = boxRow * AppConstants.boxSize;
    final startCol = boxCol * AppConstants.boxSize;

    for (int r = 0; r < AppConstants.boxSize; r++) {
      for (int c = 0; c < AppConstants.boxSize; c++) {
        final idx = (startRow + r) * AppConstants.boardSize + (startCol + c);
        if (board[idx] != solution[idx]) return false;
      }
    }

    return true;
  }

  void erase() {
    if (_state.status != GameStatus.playing) return;

    final selected = _state.selectedCell;

    if (selected == null) return;
    if (_state.isGivenCell(selected)) return;

    // Don't allow erasing a cell that already contains the correct
    // solution value. Players must not remove correctly filled cells.
    if (_state.puzzle != null &&
        _state.board[selected] == _state.puzzle!.solution[selected]) {
      return;
    }

    final newBoard = List<int>.from(_state.board)..[selected] = 0;

    final newIncorrect = Set<int>.from(
      _state.incorrectCells,
    )..remove(selected);

    _state = _state.copyWith(
      board: newBoard,
      incorrectCells: newIncorrect,
    );

    _emitState();
  }

  void pause() {
    if (_state.status != GameStatus.playing) return;

    _ticker?.cancel();

    _state = _state.copyWith(
      status: GameStatus.paused,
    );

    _emitState();
    _emitEvent(GamePausedEvent());
  }

  void resume() {
    if (_state.status != GameStatus.paused) return;

    _state = _state.copyWith(
      status: GameStatus.playing,
    );

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

    _ticker = Timer.periodic(
      const Duration(seconds: 1),
      (_) {
        if (_state.status != GameStatus.playing) {
          return;
        }

        _state = _state.copyWith(
          elapsedSeconds: _state.elapsedSeconds + 1,
        );

        _emitState();
      },
    );
  }

  bool _isBoardSolved(
    List<int> board,
    List<int> solution,
  ) {
    for (int i = 0; i < board.length; i++) {
      if (board[i] != solution[i]) {
        return false;
      }
    }

    return true;
  }

  /// Returns true when every cell that should contain [value]
  /// according to the solution has already been filled correctly.
  ///
  /// Example:
  ///
  /// If the solution contains nine 7s, this returns true only
  /// after all nine 7 cells contain 7.
  bool _isNumberCompleted(
    List<int> board,
    List<int> solution,
    int value,
  ) {
    for (int i = 0; i < board.length; i++) {
      if (solution[i] == value && board[i] != value) {
        return false;
      }
    }

    return true;
  }

  void _finishGame({
    required bool won,
  }) {
    _ticker?.cancel();

    _state = _state.copyWith(
      status: won ? GameStatus.won : GameStatus.lost,
    );

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
      _emitEvent(
        GameCompletedEvent(
          finalScore: _state.score,
          elapsedSeconds: _state.elapsedSeconds,
        ),
      );
    } else {
      _emitEvent(
        GameLostEvent(
          finalScore: _state.score,
          elapsedSeconds: _state.elapsedSeconds,
        ),
      );
    }

    onGameEnded?.call(summary);
  }

  @override
  void dispose() {
    _ticker?.cancel();

    _eventsController.close();

    _soundService.dispose();

    super.dispose();
  }
}
