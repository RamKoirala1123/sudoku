import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';

/// Visual state flags for a single cell, computed by the board widget from
/// [SudokuGameState] so this widget stays purely presentational.
class CellVisualState {
  final int value; // 0 = empty
  final bool isGiven;
  final bool isSelected;
  final bool isRelated; // same row/col/box as selection
  final bool isSameValue; // shares selected cell's value
  final bool isIncorrect;

  const CellVisualState({
    required this.value,
    required this.isGiven,
    required this.isSelected,
    required this.isRelated,
    required this.isSameValue,
    required this.isIncorrect,
  });
}

class CellWidget extends StatelessWidget {
  final CellVisualState state;
  final VoidCallback onTap;
  final BoardPalette palette;

  /// Used only when the board is initially loading the puzzle.
  /// The animation affects only the number, not the cell/background/border.
  final Animation<double>? initialNumberAnimation;

  const CellWidget({
    super.key,
    required this.state,
    required this.onTap,
    required this.palette,
    this.initialNumberAnimation,
  });

  Color get _backgroundColor {
    if (state.isSelected) return palette.selectedCell;
    if (state.isIncorrect) return palette.errorCell;
    if (state.isSameValue && state.value != 0) {
      return palette.sameNumberCell;
    }
    if (state.isRelated) return palette.relatedCell;

    return Colors.transparent;
  }

  @override
  Widget build(BuildContext context) {
    final textColor = state.isIncorrect
        ? palette.errorText
        : state.isGiven
            ? palette.givenText
            : palette.playerText;

    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Container(
        color: _backgroundColor,
        alignment: Alignment.center,
        child: state.value == 0
            ? const SizedBox.shrink(
                key: ValueKey('empty'),
              )
            : _buildNumber(
                Text(
                  '${state.value}',
                  key: ValueKey(
                    '${state.value}-${state.isIncorrect}',
                  ),
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight:
                        state.isGiven ? FontWeight.w700 : FontWeight.w600,
                    color: textColor,
                  ),
                ),
              ),
      ),
    );
  }

  Widget _buildNumber(Widget number) {
    final animation = initialNumberAnimation;

    // Normal gameplay:
    // Keep the existing AnimatedSwitcher animation.
    if (animation == null) {
      return AnimatedSwitcher(
        duration: const Duration(milliseconds: 140),
        transitionBuilder: (child, animation) {
          return ScaleTransition(
            scale: animation,
            child: child,
          );
        },
        child: number,
      );
    }

    // Initial puzzle animation:
    // Animate ONLY the number.
    return AnimatedBuilder(
      animation: animation,
      child: number,
      builder: (context, child) {
        final value = animation.value.clamp(0.0, 1.0);

        return Opacity(
          opacity: value,
          child: Transform.scale(
            scale: value,
            child: child,
          ),
        );
      },
    );
  }
}
