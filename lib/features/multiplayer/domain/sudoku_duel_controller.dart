import 'dart:async';
import 'package:flutter/foundation.dart';
import '../../sudoku/domain/entities/game_event.dart';
import '../../sudoku/domain/entities/game_status.dart';
import '../../sudoku/domain/entities/sudoku_puzzle.dart';
import '../../sudoku/domain/game/sudoku_game_controller.dart';
import 'p2p_connection_service.dart';

enum DuelResult {
  inProgress,
  won,
  lost,
  draw,
  opponentLeft,
}

class SudokuDuelController extends ChangeNotifier {
  final SudokuGameController localGame;
  final P2PConnectionService p2pService;

  OpponentProgress _opponentProgress;
  DuelResult _result = DuelResult.inProgress;
  String? _duelEndReason;
  StreamSubscription? _p2pSubscription;
  StreamSubscription? _localEventsSubscription;

  final StreamController<String> _emojiFloatingController =
      StreamController<String>.broadcast();

  Stream<String> get floatingEmojis => _emojiFloatingController.stream;
  OpponentProgress get opponent => _opponentProgress;
  DuelResult get result => _result;
  String? get duelEndReason => _duelEndReason;

  SudokuDuelController({
    required this.localGame,
    required this.p2pService,
  }) : _opponentProgress = OpponentProgress(name: p2pService.remotePlayerName) {
    _initListeners();
    // Start local game with shared puzzle
    if (p2pService.puzzle != null) {
      localGame.startWithPuzzle(p2pService.puzzle!);
    }
    _syncLocalProgress();
  }

  void _initListeners() {
    localGame.addListener(_onLocalGameChanged);

    _localEventsSubscription = localGame.events.listen((event) {
      if (event is MoveCorrectEvent ||
          event is MoveIncorrectEvent ||
          event is NumberEnteredEvent) {
        _syncLocalProgress();
      }
    });

    _p2pSubscription = p2pService.messages.listen(_onP2PMessage);
  }

  void _onLocalGameChanged() {
    final localStatus = localGame.state.status;
    if (_result == DuelResult.inProgress) {
      if (localStatus == GameStatus.won) {
        _result = DuelResult.won;
        _duelEndReason = 'You completed the puzzle first!';
        _syncLocalProgress();
        notifyListeners();
      } else if (localStatus == GameStatus.lost) {
        _result = DuelResult.lost;
        _duelEndReason = 'You ran out of lives!';
        _syncLocalProgress();
        notifyListeners();
      }
    }
    notifyListeners();
  }

  void _syncLocalProgress() {
    final state = localGame.state;
    final puzzle = state.puzzle;
    if (puzzle == null) return;

    final totalGivens = puzzle.givenCount;
    final targetToFill = 81 - totalGivens;

    int correctFilled = 0;
    for (int i = 0; i < 81; i++) {
      if (!puzzle.isGivenCell(i) && state.board[i] == puzzle.solution[i]) {
        correctFilled++;
      }
    }

    final double percent = targetToFill > 0
        ? (correctFilled / targetToFill).clamp(0.0, 1.0)
        : 1.0;

    p2pService.sendMessage({
      'type': 'progress',
      'filledCount': correctFilled,
      'targetToFill': targetToFill,
      'progressPercent': percent,
      'score': state.score,
      'lives': state.lives,
      'mistakes': state.wrongCount,
      'isCompleted': state.status == GameStatus.won,
      'isDefeated': state.status == GameStatus.lost,
      'lastCellIndex': state.selectedCell,
    });
  }

  void _onP2PMessage(Map<String, dynamic> data) {
    final type = data['type'] as String?;

    if (type == 'progress') {
      final isCompleted = data['isCompleted'] as bool? ?? false;
      final isDefeated = data['isDefeated'] as bool? ?? false;

      _opponentProgress = _opponentProgress.copyWith(
        name: p2pService.remotePlayerName,
        filledCount: data['filledCount'] as int? ?? _opponentProgress.filledCount,
        progressPercent: (data['progressPercent'] as num?)?.toDouble() ??
            _opponentProgress.progressPercent,
        score: data['score'] as int? ?? _opponentProgress.score,
        lives: data['lives'] as int? ?? _opponentProgress.lives,
        mistakes: data['mistakes'] as int? ?? _opponentProgress.mistakes,
        lastCellIndex: data['lastCellIndex'] as int?,
        isCompleted: isCompleted,
        isDefeated: isDefeated,
        latencyMs: p2pService.latencyMs,
      );

      // Check win/loss triggers from opponent
      if (_result == DuelResult.inProgress) {
        if (isCompleted) {
          _result = DuelResult.lost;
          _duelEndReason = '${p2pService.remotePlayerName} finished the puzzle first!';
          localGame.pause();
        } else if (isDefeated) {
          _result = DuelResult.won;
          _duelEndReason = '${p2pService.remotePlayerName} ran out of lives!';
        }
      }

      notifyListeners();
    } else if (type == 'emoji') {
      final emoji = data['emoji'] as String? ?? '🔥';
      _opponentProgress = _opponentProgress.copyWith(recentEmoji: emoji);
      _emojiFloatingController.add(emoji);
      notifyListeners();
    } else if (type == 'rematch_new_puzzle') {
      final puzzleMap = data['puzzle'] as Map<String, dynamic>;
      final newPuzzle = SudokuPuzzle.fromJson(puzzleMap);
      _startRematchWithPuzzle(newPuzzle);
    }
  }

  void sendReaction(String emoji) {
    p2pService.sendMessage({
      'type': 'emoji',
      'emoji': emoji,
    });
    _emojiFloatingController.add(emoji);
  }

  void requestRematch(SudokuPuzzle newPuzzle) {
    if (p2pService.isHost) {
      p2pService.sendMessage({
        'type': 'rematch_new_puzzle',
        'puzzle': newPuzzle.toJson(),
      });
      _startRematchWithPuzzle(newPuzzle);
    }
  }

  void _startRematchWithPuzzle(SudokuPuzzle puzzle) {
    _result = DuelResult.inProgress;
    _duelEndReason = null;
    _opponentProgress = OpponentProgress(name: p2pService.remotePlayerName);
    localGame.startWithPuzzle(puzzle);
    _syncLocalProgress();
    notifyListeners();
  }

  @override
  void dispose() {
    _localEventsSubscription?.cancel();
    _p2pSubscription?.cancel();
    _emojiFloatingController.close();
    localGame.removeListener(_onLocalGameChanged);
    super.dispose();
  }
}
