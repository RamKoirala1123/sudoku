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

  const CellWidget({
    super.key,
    required this.state,
    required this.onTap,
    required this.palette,
  });

  Color get _backgroundColor {
    if (state.isIncorrect) return palette.errorCell;
    if (state.isSelected) return palette.selectedCell;
    if (state.isSameValue && state.value != 0) return palette.sameNumberCell;
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
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 160),
        curve: Curves.easeOut,
        color: _backgroundColor,
        alignment: Alignment.center,
        child: AnimatedSwitcher(
          duration: const Duration(milliseconds: 140),
          transitionBuilder: (child, animation) => ScaleTransition(scale: animation, child: child),
          child: state.value == 0
              ? const SizedBox.shrink(key: ValueKey('empty'))
              : Text(
                  '${state.value}',
                  key: ValueKey('${state.value}-${state.isIncorrect}'),
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: state.isGiven ? FontWeight.w700 : FontWeight.w600,
                    color: textColor,
                  ),
                ),
        ),
      ),
    );
  }
}
