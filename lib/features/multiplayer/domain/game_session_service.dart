import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../../sudoku/domain/entities/difficulty.dart';
import '../../sudoku/domain/entities/sudoku_puzzle.dart';

class SavedGameSession {
  final bool isMultiplayer;
  final String? roomCode;
  final String role; // 'host' or 'guest' or 'single'
  final String localPlayerId;
  final String localPlayerName;
  final Difficulty difficulty;
  final SudokuPuzzle puzzle;
  final List<int> board;
  final Map<int, Set<int>> candidates;
  final int lives;
  final int score;
  final int elapsedSeconds;
  final int timestamp;

  const SavedGameSession({
    required this.isMultiplayer,
    this.roomCode,
    required this.role,
    required this.localPlayerId,
    required this.localPlayerName,
    required this.difficulty,
    required this.puzzle,
    required this.board,
    required this.candidates,
    required this.lives,
    required this.score,
    required this.elapsedSeconds,
    required this.timestamp,
  });

  Map<String, dynamic> toJson() {
    return {
      'isMultiplayer': isMultiplayer,
      'roomCode': roomCode,
      'role': role,
      'localPlayerId': localPlayerId,
      'localPlayerName': localPlayerName,
      'difficulty': difficulty.name,
      'puzzle': puzzle.toJson(),
      'board': board,
      'candidates': candidates.map((k, v) => MapEntry(k.toString(), v.toList())),
      'lives': lives,
      'score': score,
      'elapsedSeconds': elapsedSeconds,
      'timestamp': timestamp,
    };
  }

  factory SavedGameSession.fromJson(Map<String, dynamic> json) {
    final puzzleMap = json['puzzle'] as Map<String, dynamic>;
    final puzzle = SudokuPuzzle.fromJson(puzzleMap);

    final rawCandidates = json['candidates'] as Map<String, dynamic>? ?? {};
    final candidates = <int, Set<int>>{};
    rawCandidates.forEach((key, val) {
      final index = int.tryParse(key);
      if (index != null && val is List) {
        candidates[index] = val.map((e) => e as int).toSet();
      }
    });

    return SavedGameSession(
      isMultiplayer: json['isMultiplayer'] as bool? ?? false,
      roomCode: json['roomCode'] as String?,
      role: json['role'] as String? ?? 'single',
      localPlayerId: json['localPlayerId'] as String? ?? 'player',
      localPlayerName: json['localPlayerName'] as String? ?? 'Player',
      difficulty: Difficulty.values.firstWhere(
        (d) => d.name == json['difficulty'],
        orElse: () => Difficulty.medium,
      ),
      puzzle: puzzle,
      board: List<int>.from(json['board'] as List),
      candidates: candidates,
      lives: json['lives'] as int? ?? 3,
      score: json['score'] as int? ?? 0,
      elapsedSeconds: json['elapsedSeconds'] as int? ?? 0,
      timestamp: json['timestamp'] as int? ?? 0,
    );
  }
}

class GameSessionService {
  static const String _sessionKey = 'sudoku_active_game_session';

  /// Saves the current session to local storage / SharedPreferences
  static Future<void> saveSession(SavedGameSession session) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final jsonStr = jsonEncode(session.toJson());
      await prefs.setString(_sessionKey, jsonStr);
    } catch (_) {}
  }

  /// Loads the active session if one exists and is recent (within 6 hours)
  static Future<SavedGameSession?> loadSession() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final jsonStr = prefs.getString(_sessionKey);
      if (jsonStr == null || jsonStr.isEmpty) return null;

      final Map<String, dynamic> map = jsonDecode(jsonStr);
      final session = SavedGameSession.fromJson(map);

      // Verify expiration (6 hours)
      final ageMs = DateTime.now().millisecondsSinceEpoch - session.timestamp;
      if (ageMs > 6 * 60 * 60 * 1000) {
        await clearSession();
        return null;
      }

      return session;
    } catch (_) {
      return null;
    }
  }

  /// Clears the active session when game ends or user exits
  static Future<void> clearSession() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_sessionKey);
    } catch (_) {}
  }
}
