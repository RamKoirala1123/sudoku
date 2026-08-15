import 'package:flutter/material.dart';
import '../../../statistics/domain/statistics_models.dart';

class StatsSummaryCard extends StatelessWidget {
  final PlayerStatistics statistics;
  const StatsSummaryCard({super.key, required this.statistics});

  String _formatTime(int? seconds) {
    if (seconds == null) return '--:--';
    final m = (seconds ~/ 60).toString().padLeft(2, '0');
    final s = (seconds % 60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Statistics', style: theme.textTheme.titleLarge),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: _StatTile(label: 'Games Played', value: '${statistics.totalGamesPlayed}'),
                ),
                Expanded(
                  child: _StatTile(label: 'Games Won', value: '${statistics.totalGamesWon}'),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _StatTile(label: 'Best Time', value: _formatTime(statistics.bestTimeOverallSeconds)),
                ),
                Expanded(
                  child: _StatTile(label: 'Best Score', value: '${statistics.bestScoreOverall ?? '--'}'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _StatTile extends StatelessWidget {
  final String label;
  final String value;
  const _StatTile({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(value, style: theme.textTheme.headlineMedium),
        const SizedBox(height: 2),
        Text(label, style: theme.textTheme.bodyMedium),
      ],
    );
  }
}
