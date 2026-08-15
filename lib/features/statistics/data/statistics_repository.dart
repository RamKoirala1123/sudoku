import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/constants/app_constants.dart';
import '../domain/statistics_models.dart';

/// Local persistence for player statistics. This is the only place in the
/// app that knows statistics are stored as JSON in SharedPreferences —
/// swapping to e.g. a local database later only requires changing this
/// class.
class StatisticsRepository {
  Future<PlayerStatistics> load() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(AppConstants.prefsStatisticsKey);
    if (raw == null || raw.isEmpty) return PlayerStatistics.empty();
    try {
      final json = jsonDecode(raw) as Map<String, dynamic>;
      return PlayerStatistics.fromJson(json);
    } catch (_) {
      return PlayerStatistics.empty();
    }
  }

  Future<void> save(PlayerStatistics statistics) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(AppConstants.prefsStatisticsKey, jsonEncode(statistics.toJson()));
  }
}
