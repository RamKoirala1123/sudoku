import '../../sudoku/domain/entities/difficulty.dart';

/// Stats tracked for one difficulty level.
class DifficultyStats {
  final int gamesPlayed;
  final int gamesWon;
  final int gamesLost;
  final int? bestScore;
  final int? bestTimeSeconds;
  final int totalCorrect;
  final int totalWrong;

  const DifficultyStats({
    this.gamesPlayed = 0,
    this.gamesWon = 0,
    this.gamesLost = 0,
    this.bestScore,
    this.bestTimeSeconds,
    this.totalCorrect = 0,
    this.totalWrong = 0,
  });

  DifficultyStats copyWith({
    int? gamesPlayed,
    int? gamesWon,
    int? gamesLost,
    int? bestScore,
    int? bestTimeSeconds,
    int? totalCorrect,
    int? totalWrong,
  }) {
    return DifficultyStats(
      gamesPlayed: gamesPlayed ?? this.gamesPlayed,
      gamesWon: gamesWon ?? this.gamesWon,
      gamesLost: gamesLost ?? this.gamesLost,
      bestScore: bestScore ?? this.bestScore,
      bestTimeSeconds: bestTimeSeconds ?? this.bestTimeSeconds,
      totalCorrect: totalCorrect ?? this.totalCorrect,
      totalWrong: totalWrong ?? this.totalWrong,
    );
  }

  Map<String, dynamic> toJson() => {
        'gamesPlayed': gamesPlayed,
        'gamesWon': gamesWon,
        'gamesLost': gamesLost,
        'bestScore': bestScore,
        'bestTimeSeconds': bestTimeSeconds,
        'totalCorrect': totalCorrect,
        'totalWrong': totalWrong,
      };

  factory DifficultyStats.fromJson(Map<String, dynamic> json) => DifficultyStats(
        gamesPlayed: json['gamesPlayed'] as int? ?? 0,
        gamesWon: json['gamesWon'] as int? ?? 0,
        gamesLost: json['gamesLost'] as int? ?? 0,
        bestScore: json['bestScore'] as int?,
        bestTimeSeconds: json['bestTimeSeconds'] as int?,
        totalCorrect: json['totalCorrect'] as int? ?? 0,
        totalWrong: json['totalWrong'] as int? ?? 0,
      );
}

/// All persisted player statistics, keyed by difficulty.
class PlayerStatistics {
  final Map<Difficulty, DifficultyStats> byDifficulty;

  const PlayerStatistics({required this.byDifficulty});

  factory PlayerStatistics.empty() => PlayerStatistics(
        byDifficulty: {for (final d in Difficulty.values) d: const DifficultyStats()},
      );

  int get totalGamesPlayed => byDifficulty.values.fold(0, (sum, s) => sum + s.gamesPlayed);
  int get totalGamesWon => byDifficulty.values.fold(0, (sum, s) => sum + s.gamesWon);

  int? get bestScoreOverall {
    final scores = byDifficulty.values.map((s) => s.bestScore).whereType<int>();
    return scores.isEmpty ? null : scores.reduce((a, b) => a > b ? a : b);
  }

  int? get bestTimeOverallSeconds {
    final times = byDifficulty.values.map((s) => s.bestTimeSeconds).whereType<int>();
    return times.isEmpty ? null : times.reduce((a, b) => a < b ? a : b);
  }

  PlayerStatistics copyWithDifficulty(Difficulty difficulty, DifficultyStats stats) {
    final updated = Map<Difficulty, DifficultyStats>.from(byDifficulty);
    updated[difficulty] = stats;
    return PlayerStatistics(byDifficulty: updated);
  }

  Map<String, dynamic> toJson() => {
        for (final entry in byDifficulty.entries) entry.key.name: entry.value.toJson(),
      };

  factory PlayerStatistics.fromJson(Map<String, dynamic> json) {
    final map = <Difficulty, DifficultyStats>{};
    for (final d in Difficulty.values) {
      final raw = json[d.name];
      map[d] = raw is Map<String, dynamic>
          ? DifficultyStats.fromJson(raw)
          : (raw is Map ? DifficultyStats.fromJson(Map<String, dynamic>.from(raw)) : const DifficultyStats());
    }
    return PlayerStatistics(byDifficulty: map);
  }
}
