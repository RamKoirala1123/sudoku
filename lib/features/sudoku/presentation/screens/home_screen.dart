import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../settings/presentation/screens/settings_screen.dart';
import '../../../statistics/presentation/statistics_controller.dart';
import '../../domain/entities/difficulty.dart';
import '../widgets/difficulty_button.dart';
import '../widgets/stats_summary_card.dart';
import 'game_screen.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  void _startGame(BuildContext context, Difficulty difficulty) {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => GameScreen(difficulty: difficulty)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final statisticsController = context.watch<StatisticsController>();

    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 24, 20, 32),
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Sudoku', style: theme.textTheme.displaySmall),
                    Text(
                      'Duel',
                      style: theme.textTheme.displaySmall?.copyWith(color: theme.colorScheme.primary),
                    ),
                  ],
                ),
                IconButton(
                  icon: const Icon(Icons.settings_outlined),
                  iconSize: 26,
                  onPressed: () => Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const SettingsScreen()),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 28),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: null,
                icon: const Icon(Icons.person_rounded, size: 20),
                label: const Text('SINGLE PLAYER'),
                style: ElevatedButton.styleFrom(
                  disabledBackgroundColor: theme.colorScheme.primary,
                  disabledForegroundColor: Colors.white,
                ),
              ),
            ),
            const SizedBox(height: 6),
            Text(
              'Multiplayer is coming soon',
              style: theme.textTheme.bodyMedium,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            Text('Difficulty', style: theme.textTheme.titleLarge),
            const SizedBox(height: 12),
            ...Difficulty.values.map(
              (d) => Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: DifficultyButton(difficulty: d, onTap: () => _startGame(context, d)),
              ),
            ),
            const SizedBox(height: 12),
            statisticsController.isLoaded
                ? StatsSummaryCard(statistics: statisticsController.statistics)
                : const Padding(
                    padding: EdgeInsets.symmetric(vertical: 24),
                    child: Center(child: CircularProgressIndicator()),
                  ),
          ],
        ),
      ),
    );
  }
}
