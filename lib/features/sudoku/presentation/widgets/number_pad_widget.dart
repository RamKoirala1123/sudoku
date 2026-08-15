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

  const NumberPadWidget({
    super.key,
    required this.onNumberTap,
    required this.onErase,
    required this.remainingCounts,
    this.enabled = true,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Column(
      children: [
        Row(
          children: List.generate(9, (i) {
            final number = i + 1;
            final remaining = remainingCounts[number] ?? 1;
            final isExhausted = remaining <= 0;
            return Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 2),
                child: Material(
                  color: isExhausted
                      ? colorScheme.surface.withOpacity(0.4)
                      : colorScheme.surface,
                  borderRadius: BorderRadius.circular(8),
                  elevation: 0,
                  child: InkWell(
                    borderRadius: BorderRadius.circular(8),
                    onTap: (enabled && !isExhausted)
                        ? () => onNumberTap(number)
                        : null,
                    child: Container(
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: colorScheme.onSurface.withOpacity(0.08),
                        ),
                      ),
                      alignment: Alignment.center,
                      child: Column(
                        children: [
                          Text(
                            '$number',
                            style: theme.textTheme.headlineMedium?.copyWith(
                              color: isExhausted
                                  ? colorScheme.onSurface.withOpacity(0.3)
                                  : colorScheme.primary,
                            ),
                          ),
                          Text(
                            '$remaining',
                            style: theme.textTheme.bodyMedium?.copyWith(
                              color: isExhausted
                                  ? colorScheme.onSurface.withOpacity(0.3)
                                  : colorScheme.onSurface,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            );
          }),
        ),
        // const SizedBox(height: 10),
        // SizedBox(
        //   width: double.infinity,
        //   child: OutlinedButton.icon(
        //     onPressed: enabled ? onErase : null,
        //     icon: const Icon(Icons.backspace_outlined, size: 18),
        //     label: const Text('Erase'),
        //   ),
        // ),
      ],
    );
  }
}
