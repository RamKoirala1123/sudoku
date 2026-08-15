import 'package:flutter/material.dart';
import '../../domain/entities/difficulty.dart';

class DifficultyButton extends StatelessWidget {
  final Difficulty difficulty;
  final VoidCallback onTap;

  const DifficultyButton({super.key, required this.difficulty, required this.onTap});

  Color _accentFor(Difficulty d, ColorScheme scheme) {
    switch (d) {
      case Difficulty.easy:
        return const Color(0xFF3DDC97);
      case Difficulty.medium:
        return const Color(0xFF4FC3F7);
      case Difficulty.hard:
        return const Color(0xFFFFC24B);
      case Difficulty.difficult:
        return const Color(0xFFFF8A65);
      case Difficulty.extreme:
        return const Color(0xFFFF5D6C);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final accent = _accentFor(difficulty, theme.colorScheme);

    return Material(
      color: theme.colorScheme.surface,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: theme.colorScheme.onSurface.withOpacity(0.06)),
          ),
          child: Row(
            children: [
              Container(
                width: 10,
                height: 10,
                decoration: BoxDecoration(color: accent, shape: BoxShape.circle),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Text(difficulty.label, style: theme.textTheme.titleMedium),
              ),
              Icon(Icons.chevron_right_rounded, color: theme.colorScheme.onSurface.withOpacity(0.4)),
            ],
          ),
        ),
      ),
    );
  }
}
