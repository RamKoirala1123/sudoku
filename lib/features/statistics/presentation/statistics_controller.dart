import 'package:flutter/foundation.dart';

import '../../sudoku/domain/entities/difficulty.dart';
import '../../sudoku/domain/entities/game_summary.dart';
import '../data/statistics_repository.dart';
import '../domain/statistics_models.dart';

/// Owns the in-memory copy of [PlayerStatistics] and keeps it synced to
/// disk via [StatisticsRepository]. The Sudoku engine never talks to this
/// class directly — the presentation layer wires
/// `SudokuGameController.onGameEnded` to [recordGameResult] instead, so the
/// engine stays fully decoupled from persistence (spec section 12 & 19).
class StatisticsController extends ChangeNotifier {
  final StatisticsRepository _repository;
  PlayerStatistics _statistics = PlayerStatistics.empty();
  bool _loaded = false;

  StatisticsController({StatisticsRepository? repository})
      : _repository = repository ?? StatisticsRepository();

  PlayerStatistics get statistics => _statistics;
  bool get isLoaded => _loaded;

  Future<void> load() async {
    _statistics = await _repository.load();
    _loaded = true;
    notifyListeners();
  }

  Future<void> recordGameResult(GameSummary summary) async {
    final current = _statistics.byDifficulty[summary.difficulty] ?? const DifficultyStats();

    final newBestScore = summary.won
        ? (current.bestScore == null ? summary.score : (summary.score > current.bestScore! ? summary.score : current.bestScore))
        : current.bestScore;

    final newBestTime = summary.won
        ? (current.bestTimeSeconds == null
            ? summary.elapsedSeconds
            : (summary.elapsedSeconds < current.bestTimeSeconds! ? summary.elapsedSeconds : current.bestTimeSeconds))
        : current.bestTimeSeconds;

    final updated = current.copyWith(
      gamesPlayed: current.gamesPlayed + 1,
      gamesWon: current.gamesWon + (summary.won ? 1 : 0),
      gamesLost: current.gamesLost + (summary.won ? 0 : 1),
      bestScore: newBestScore,
      bestTimeSeconds: newBestTime,
      totalCorrect: current.totalCorrect + summary.correctCount,
      totalWrong: current.totalWrong + summary.wrongCount,
    );

    _statistics = _statistics.copyWithDifficulty(summary.difficulty, updated);
    notifyListeners();
    await _repository.save(_statistics);
  }

  DifficultyStats statsFor(Difficulty difficulty) =>
      _statistics.byDifficulty[difficulty] ?? const DifficultyStats();
}
