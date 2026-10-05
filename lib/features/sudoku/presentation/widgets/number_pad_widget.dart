import 'package:flutter/material.dart';

/// The numeric input pad below the board (spec section 5). Disables a
/// number once it's been fully placed 9 times so the player gets subtle
/// feedback about what's left, without any game logic living here — the
/// remaining-count map is computed by the caller.
class NumberPadWidget extends StatelessWidget {
  final ValueChanged<int> onNumberTap;
  final VoidCallback onErase;
  final Map<int, int> remainingCounts; // value -> cells left to place
  final bool enabled;
  final bool isGrid;

  const NumberPadWidget({
    super.key,
    required this.onNumberTap,
    required this.onErase,
    required this.remainingCounts,
    this.enabled = true,
    this.isGrid = false,
  });

  Widget _buildNumberButton(BuildContext context, int number) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final remaining = remainingCounts[number] ?? 1;
    final isExhausted = remaining <= 0;

    return Material(
      color: isExhausted
          ? colorScheme.surface.withValues(alpha: 0.4)
          : colorScheme.surface,
      borderRadius: BorderRadius.circular(10),
      elevation: 0,
      child: InkWell(
        borderRadius: BorderRadius.circular(10),
        onTap: (enabled && !isExhausted) ? () => onNumberTap(number) : null,
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: colorScheme.onSurface.withValues(alpha: 0.1),
            ),
          ),
          alignment: Alignment.center,
          padding: EdgeInsets.symmetric(vertical: isGrid ? 8 : 4),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                '$number',
                style: theme.textTheme.headlineMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                  fontSize: isGrid ? 28 : 22,
                  color: isExhausted
                      ? colorScheme.onSurface.withValues(alpha: 0.3)
                      : colorScheme.primary,
                ),
              ),
              Text(
                '$remaining',
                style: theme.textTheme.bodySmall?.copyWith(
                  fontSize: 10,
                  color: isExhausted
                      ? colorScheme.onSurface.withValues(alpha: 0.3)
                      : colorScheme.onSurface.withValues(alpha: 0.7),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (isGrid) {
      return GridView.builder(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 3,
          mainAxisSpacing: 8,
          crossAxisSpacing: 8,
          childAspectRatio: 1.25,
        ),
        itemCount: 9,
        itemBuilder: (context, i) => _buildNumberButton(context, i + 1),
      );
    }

    return Row(
      children: List.generate(9, (i) {
        final number = i + 1;
        return Expanded(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 2),
            child: _buildNumberButton(context, number),
          ),
        );
      }),
    );
  }
}
