import 'package:flutter/material.dart';
import '../../domain/entities/difficulty.dart';

/// A full-screen-ish result card shown on win or loss (spec sections 7 & 9).
/// Purely presentational — receives already-computed stats.
class GameResultOverlay extends StatelessWidget {
  final bool won;
  final Difficulty difficulty;
  final int score;
  final int elapsedSeconds;
  final int mistakes;
  final int correct;
  final VoidCallback onPlayAgain;
  final VoidCallback onHome;

  const GameResultOverlay({
    super.key,
    required this.won,
    required this.difficulty,
    required this.score,
    required this.elapsedSeconds,
    required this.mistakes,
    required this.correct,
    required this.onPlayAgain,
    required this.onHome,
  });

  String get _formattedTime {
    final m = (elapsedSeconds ~/ 60).toString().padLeft(2, '0');
    final s = (elapsedSeconds % 60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1),
      duration: const Duration(milliseconds: 450),
      curve: Curves.easeOutBack,
      builder: (context, value, child) => Opacity(
        opacity: value.clamp(0, 1),
        child: Transform.scale(scale: 0.85 + (0.15 * value.clamp(0, 1)), child: child),
      ),
      child: Center(
        child: Card(
          margin: const EdgeInsets.symmetric(horizontal: 32),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(28, 32, 28, 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  won ? '🎉' : '💔',
                  style: const TextStyle(fontSize: 40),
                ),
                const SizedBox(height: 8),
                Text(
                  won ? 'YOU WON!' : 'GAME OVER',
                  style: theme.textTheme.headlineMedium?.copyWith(
                    color: won ? theme.colorScheme.primary : theme.colorScheme.error,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 4),
                Text('Difficulty: ${difficulty.label.toUpperCase()}', style: theme.textTheme.bodyMedium),
                const SizedBox(height: 20),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    _Stat(label: 'Score', value: '$score'),
                    _Stat(label: 'Time', value: _formattedTime),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    _Stat(label: 'Mistakes', value: '$mistakes'),
                    _Stat(label: 'Correct', value: '$correct'),
                  ],
                ),
                const SizedBox(height: 28),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(onPressed: onPlayAgain, child: const Text('PLAY AGAIN')),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton(onPressed: onHome, child: const Text('HOME')),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  final String label;
  final String value;
  const _Stat({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      children: [
        Text(value, style: theme.textTheme.titleLarge),
        const SizedBox(height: 2),
        Text(label, style: theme.textTheme.bodyMedium),
      ],
    );
  }
}
