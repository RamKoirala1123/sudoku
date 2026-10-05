import 'dart:async';
import 'package:flutter/foundation.dart';
import '../../sudoku/domain/entities/game_event.dart';
import '../../sudoku/domain/entities/game_status.dart';
import '../../sudoku/domain/game/sudoku_game_controller.dart';
import 'game_session_service.dart';
import 'p2p_room_service.dart';
import 'player_progress.dart';

class MultiplayerRoomController extends ChangeNotifier {
  final SudokuGameController localGame;
  final P2PRoomService roomService;

  StreamSubscription? _localEventsSub;
  StreamSubscription? _roomMessagesSub;

  final StreamController<Map<String, dynamic>> _emojiStreamController =
      StreamController<Map<String, dynamic>>.broadcast();

  PlayerProgress? _winner;
  bool _allPlayersDefeated = false;

  Stream<Map<String, dynamic>> get emojiStream => _emojiStreamController.stream;
  PlayerProgress? get winner => _winner;
  bool get allPlayersDefeated => _allPlayersDefeated;
  bool get isMatchOver => _winner != null || _allPlayersDefeated;

  List<PlayerProgress> get leaderboard {
    final list = roomService.playersList;
    list.sort((a, b) => a.rank.compareTo(b.rank));
    return list;
  }

  PlayerProgress? get localPlayerProgress =>
      roomService.players[roomService.localPlayerId];

  MultiplayerRoomController({
    required this.localGame,
    required this.roomService,
  }) {
    _init();
  }

  void _init() {
    localGame.addListener(_onLocalGameChanged);

    _localEventsSub = localGame.events.listen((event) {
      if (event is MoveCorrectEvent ||
          event is MoveIncorrectEvent ||
          event is NumberEnteredEvent) {
        _syncLocalProgress();
        _saveSession();
      }
    });

    _roomMessagesSub = roomService.messages.listen(_onRoomMessage);

    if (roomService.puzzle != null) {
      localGame.startWithPuzzle(
        roomService.puzzle!,
        mistakeRule: roomService.mistakeRule,
      );
    }

    _syncLocalProgress();
    _saveSession();
  }

  void _onLocalGameChanged() {
    final localStatus = localGame.state.status;

    if (localStatus == GameStatus.won) {
      _winner ??= localPlayerProgress;
      _syncLocalProgress();
      GameSessionService.clearSession();
    } else if (localStatus == GameStatus.lost) {
      _syncLocalProgress();
      _checkMatchConditions();
    }

    _saveSession();
    notifyListeners();
  }

  void _saveSession() {
    final state = localGame.state;
    final puzzle = state.puzzle;
    if (puzzle == null) return;
    if (isMatchOver) return;

    GameSessionService.saveSession(
      SavedGameSession(
        isMultiplayer: true,
        roomCode: roomService.roomCode,
        role: roomService.isHost ? 'host' : 'guest',
        localPlayerId: roomService.localPlayerId,
        localPlayerName: roomService.localPlayerName,
        difficulty: puzzle.difficulty,
        puzzle: puzzle,
        board: List<int>.from(state.board),
        candidates: Map<int, Set<int>>.from(state.candidates),
        lives: state.lives,
        score: state.score,
        elapsedSeconds: state.elapsedSeconds,
        timestamp: DateTime.now().millisecondsSinceEpoch,
      ),
    );
  }

  void _checkMatchConditions() {
    final list = leaderboard;
    if (list.isEmpty) return;

    // If every single player in the room ran out of lives (mistakes >= 3)
    final allDefeated = list.every((p) => (p.lives <= 0) || p.isDefeated);
    if (allDefeated && !_allPlayersDefeated && _winner == null) {
      _allPlayersDefeated = true;
      GameSessionService.clearSession();
      notifyListeners();
    }
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

    final isCompleted = state.status == GameStatus.won;
    final isDefeated = state.status == GameStatus.lost;

    roomService.sendProgressUpdate(
      filledCount: correctFilled,
      progressPercent: percent,
      score: state.score,
      lives: state.lives,
      mistakes: state.wrongCount,
      isCompleted: isCompleted,
      isDefeated: isDefeated,
    );
  }

  void _onRoomMessage(Map<String, dynamic> data) {
    final type = data['type'] as String?;

    if (type == 'progress') {
      final isCompleted = data['isCompleted'] as bool? ?? false;
      final pid = data['playerId'] as String?;

      if (isCompleted && _winner == null && pid != null) {
        _winner = roomService.players[pid];
        GameSessionService.clearSession();
        notifyListeners();
      }

      _checkMatchConditions();
    } else if (type == 'emoji') {
      final emoji = data['emoji'] as String? ?? '🔥';
      final pid = data['playerId'] as String? ?? '';
      final senderName = roomService.players[pid]?.name ?? 'Player';

      _emojiStreamController.add({
        'emoji': emoji,
        'sender': senderName,
      });
    }
  }

  void sendReaction(String emoji) {
    roomService.sendEmojiReaction(emoji);
    _emojiStreamController.add({
      'emoji': emoji,
      'sender': roomService.localPlayerName,
    });
  }

  @override
  void dispose() {
    _localEventsSub?.cancel();
    _roomMessagesSub?.cancel();
    _emojiStreamController.close();
    localGame.removeListener(_onLocalGameChanged);
    super.dispose();
  }
}
