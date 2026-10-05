import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:sudoku_duel/core/services/sudoku_sound_service.dart';

import '../../../multiplayer/domain/mistake_rule.dart';
import '../../../../core/constants/app_constants.dart';
import '../engine/sudoku_generator.dart';
import '../entities/difficulty.dart';
import '../entities/game_event.dart';
import '../entities/game_status.dart';
import '../entities/game_summary.dart';
import '../entities/sudoku_move.dart';
import '../entities/sudoku_puzzle.dart';
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
  MistakeRule _mistakeRule;

  final _eventsController = StreamController<GameEvent>.broadcast();
  final List<_MoveRecord> _moveHistory = [];

  Stream<GameEvent> get events => _eventsController.stream;
  bool get canUndo => _moveHistory.isNotEmpty && _state.status == GameStatus.playing;
  MistakeRule get mistakeRule => _mistakeRule;

  /// Invoked exactly once when a game reaches won/lost, so the presentation
  /// layer can persist it via the Statistics feature without this class
  /// needing to know that feature exists.
  void Function(GameSummary summary)? onGameEnded;

  SudokuGameController({
    required Difficulty difficulty,
    bool showMistakes = true,
    MistakeRule mistakeRule = MistakeRule.standard,
  })  : _mistakeRule = mistakeRule,
        _state = SudokuGameState.initial(difficulty)
            .copyWith(lives: mistakeRule.initialLives),
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
      lives: _mistakeRule.initialLives,
      status: GameStatus.playing,
    );

    _emitState();
    _emitEvent(GameStartedEvent());

    _startTicker();
  }

  /// Starts the game with an already created [SudokuPuzzle] (essential for
  /// multiplayer duels so both peers play the exact same puzzle).
  void startWithPuzzle(SudokuPuzzle puzzle, {MistakeRule? mistakeRule}) {
    if (mistakeRule != null) _mistakeRule = mistakeRule;
    _ticker?.cancel();
    _moveHistory.clear();

    _state = SudokuGameState.initial(puzzle.difficulty).copyWith(
      puzzle: puzzle,
      board: List<int>.from(puzzle.givens),
      lives: _mistakeRule.initialLives,
      status: GameStatus.playing,
    );

    _emitState();
    _emitEvent(GameStartedEvent());
    _startTicker();
  }

  /// Restores a previously active game session from local storage (e.g. after browser refresh)
  void restoreGameState({
    required SudokuPuzzle puzzle,
    required List<int> board,
    required Map<int, Set<int>> candidates,
    required int lives,
    required int score,
    required int elapsedSeconds,
  }) {
    _ticker?.cancel();
    _moveHistory.clear();

    _state = SudokuGameState.initial(puzzle.difficulty).copyWith(
      puzzle: puzzle,
      board: List<int>.from(board),
      candidates: Map<int, Set<int>>.from(candidates),
      lives: lives,
      score: score,
      elapsedSeconds: elapsedSeconds,
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
    // Cannot modify already correctly solved cells
    if (_state.puzzle != null &&
        _state.board[selected] == _state.puzzle!.solution[selected]) {
      return;
    }
    // If cell already contains this exact value, ignore
    if (_state.board[selected] == value) return;

    final solution = _state.puzzle!.solution;

    final isCorrect = solution[selected] == value;

    final newBoard = List<int>.from(_state.board);
    newBoard[selected] = value;

    final newCandidates = Map<int, Set<int>>.from(_state.candidates);
    newCandidates.remove(selected);

    final newIncorrect = Set<int>.from(
      _state.incorrectCells,
    );

    if (isCorrect) {
      newIncorrect.remove(selected);

      // Auto-clear notes: automatically erase that number from pencil notes
      // in the same row, column, and 3x3 box (like Sudoku.com)
      final row = selected ~/ AppConstants.boardSize;
      final col = selected % AppConstants.boardSize;
      final boxRow = (row ~/ AppConstants.boxSize) * AppConstants.boxSize;
      final boxCol = (col ~/ AppConstants.boxSize) * AppConstants.boxSize;

      final peerIndices = <int>{};
      for (int i = 0; i < AppConstants.boardSize; i++) {
        peerIndices.add(row * AppConstants.boardSize + i); // same row
        peerIndices.add(i * AppConstants.boardSize + col); // same col
      }
      for (int r = 0; r < AppConstants.boxSize; r++) {
        for (int c = 0; c < AppConstants.boxSize; c++) {
          peerIndices.add((boxRow + r) * AppConstants.boardSize + (boxCol + c)); // same box
        }
      }

      for (final peer in peerIndices) {
        if (newCandidates.containsKey(peer)) {
          final updated = Set<int>.from(newCandidates[peer]!)..remove(value);
          if (updated.isEmpty) {
            newCandidates.remove(peer);
          } else {
            newCandidates[peer] = updated;
          }
        }
      }
    } else if (_showMistakes) {
      newIncorrect.add(selected);
    }

    final move = SudokuMove(
      cellIndex: selected,
      value: value,
      wasCorrect: isCorrect,
    );

    // record move history for undo
    final prevValue = _state.board[selected];
    _moveHistory.add(_MoveRecord(
      cellIndex: selected,
      previousValue: prevValue,
      newValue: value,
      wasCorrect: isCorrect,
      isErase: false,
    ));

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
        candidates: newCandidates,
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
      final int newLives;
      final int newElapsed;

      if (_mistakeRule == MistakeRule.casual) {
        // Unlimited mistakes with time penalties (+30s per mistake)
        newLives = _state.lives;
        newElapsed = _state.elapsedSeconds + 30;
      } else {
        newLives = _state.lives - 1;
        newElapsed = _state.elapsedSeconds;
      }

      _state = _state.copyWith(
        board: newBoard,
        score: newScore,
        wrongCount: newWrong,
        lives: newLives,
        elapsedSeconds: newElapsed,
        incorrectCells: newIncorrect,
        candidates: newCandidates,
      );

      // Play error sound.
      _soundService.playCellError();

      _emitEvent(
        MoveIncorrectEvent(
          move,
          newLives,
        ),
      );

      // Identify any existing cells in the same row/column/box that contain
      // the same value — those are the actual conflicts the player caused.
      final conflicts = <int>[];
      for (int i = 0; i < newBoard.length; i++) {
        if (i == selected) continue;
        if (newBoard[i] != value) continue;

        final r = i ~/ AppConstants.boardSize;
        final c = i % AppConstants.boardSize;
        final selR = selected ~/ AppConstants.boardSize;
        final selC = selected % AppConstants.boardSize;

        final inSameRow = r == selR;
        final inSameCol = c == selC;
        final inSameBox =
            (r ~/ AppConstants.boxSize) == (selR ~/ AppConstants.boxSize) &&
                (c ~/ AppConstants.boxSize) == (selC ~/ AppConstants.boxSize);

        if (inSameRow || inSameCol || inSameBox) {
          conflicts.add(i);
        }
      }

      if (conflicts.isNotEmpty) {
        _emitEvent(ConflictingCellsEvent(conflicts, selected));
      }

      if (_mistakeRule != MistakeRule.casual && newLives <= 0) {
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

    final prevValue = _state.board[selected];
    final newBoard = List<int>.from(_state.board)..[selected] = 0;

    final newIncorrect = Set<int>.from(
      _state.incorrectCells,
    )..remove(selected);

    // preserve candidates for other cells; do not re-add candidates for the
    // cleared cell (it'll be empty).
    final newCandidates = Map<int, Set<int>>.from(_state.candidates);
    newCandidates.remove(selected);

    _state = _state.copyWith(
      board: newBoard,
      incorrectCells: newIncorrect,
      candidates: newCandidates,
    );

    // record erase (store previous value so undo can restore it)
    _moveHistory.add(_MoveRecord(
      cellIndex: selected,
      previousValue: prevValue,
      newValue: 0,
      wasCorrect: prevValue == _state.puzzle?.solution[selected],
      isErase: true,
    ));

    _emitState();
  }

  /// Toggle a pencil/candidate mark for the currently selected cell.
  void toggleCandidate(int value) {
    if (_state.status != GameStatus.playing) return;
    final selected = _state.selectedCell;
    if (selected == null) return;
    if (_state.isGivenCell(selected)) return;
    if (value < 1 || value > 9) return;

    final newCandidates = Map<int, Set<int>>.from(_state.candidates);
    final set = Set<int>.from(newCandidates[selected] ?? <int>{});
    if (set.contains(value)) {
      set.remove(value);
    } else {
      set.add(value);
    }

    if (set.isEmpty) {
      newCandidates.remove(selected);
    } else {
      newCandidates[selected] = set;
    }

    _state = _state.copyWith(candidates: newCandidates);
    _emitState();
  }

  /// Undo the most recent player move (number entry or erase).
  void undo() {
    if (_state.status != GameStatus.playing) return;
    if (_moveHistory.isEmpty) return;

    final last = _moveHistory.removeLast();

    final idx = last.cellIndex;
    final restored = last.previousValue;

    final newBoard = List<int>.from(_state.board);
    newBoard[idx] = restored;

    // recompute incorrect set
    final solution = _state.puzzle!.solution;
    final newIncorrect = <int>{};
    int newCorrectCount = 0;
    int newWrongCount = 0;
    for (int i = 0; i < newBoard.length; i++) {
      if (newBoard[i] != 0 &&
          newBoard[i] == solution[i] &&
          !_state.isGivenCell(i)) {
        newCorrectCount++;
      }
      if (newBoard[i] != 0 && newBoard[i] != solution[i]) {
        newWrongCount++;
        newIncorrect.add(i);
      }
    }

    var newScore = _state.score;
    // adjust score based on the undone move
    if (last.wasCorrect) {
      newScore = math.max(
          AppConstants.minScore, newScore - AppConstants.correctAnswerPoints);
    } else if (!last.wasCorrect && !last.isErase) {
      newScore =
          math.min(newScore + AppConstants.incorrectAnswerPenalty, 999999);
    } else if (!last.wasCorrect && last.isErase) {
      // if undoing an erase that removed an incorrect value, restore penalty reversal
      newScore =
          math.min(newScore + AppConstants.incorrectAnswerPenalty, 999999);
    }

    var newLives = _state.lives;
    if (!last.wasCorrect && _mistakeRule != MistakeRule.casual) {
      // if the undone move was incorrect and had reduced lives, restore one life
      newLives = _state.lives + 1;
    }

    _state = _state.copyWith(
      board: newBoard,
      incorrectCells: newIncorrect,
      correctCount:
          newCorrectCount, // note: copyWith doesn't accept correctCount directly
    );

    // Because SudokuGameState doesn't have direct slots for correctCount/wrongCount,
    // update score and lives via copyWith
    _state = _state.copyWith(
      board: newBoard,
      incorrectCells: newIncorrect,
      // reuse fields
      status: _state.status,
      score: newScore,
      wrongCount: newWrongCount,
      lives: newLives,
    );

    _emitState();
  }

  /// Clears all player-filled cells (leaves givens intact).
  void clearAllPlayerEntries() {
    if (_state.status != GameStatus.playing) return;

    final puzzle = _state.puzzle;
    if (puzzle == null) return;

    final newBoard = List<int>.from(puzzle.givens);

    // recompute counts
    final solution = puzzle.solution;
    int newCorrectCount = 0;
    for (int i = 0; i < newBoard.length; i++) {
      if (newBoard[i] != 0 &&
          newBoard[i] == solution[i] &&
          !puzzle.isGivenCell(i)) {
        newCorrectCount++;
      }
    }

    final newScore = newCorrectCount * AppConstants.correctAnswerPoints;

    _moveHistory.clear();

    _state = _state.copyWith(
      board: newBoard,
      incorrectCells: {},
      score: newScore,
      wrongCount: 0,
      lives: 3,
      correctCount: newCorrectCount,
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

class _MoveRecord {
  final int cellIndex;
  final int previousValue;
  final int newValue;
  final bool wasCorrect;
  final bool isErase;

  _MoveRecord({
    required this.cellIndex,
    required this.previousValue,
    required this.newValue,
    required this.wasCorrect,
    required this.isErase,
  });
}
