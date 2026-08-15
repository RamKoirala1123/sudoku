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
  final Animation<double>? highlightAnimation;
  final Offset? highlightDirection;

  const CellWidget({
    super.key,
    required this.state,
    required this.onTap,
    required this.palette,
    this.initialNumberAnimation,
    this.highlightAnimation,
    this.highlightDirection,
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
            : Stack(
                alignment: Alignment.center,
                children: [
                  // colored flowing box overlay
                  if (highlightAnimation != null)
                    AnimatedBuilder(
                      animation: highlightAnimation!,
                      builder: (context, child) {
                        final v = highlightAnimation!.value.clamp(0.0, 1.0);
                        final dir = highlightDirection ?? Offset.zero;
                        // Subtle flowing overlay: translate from trigger,
                        // but keep scaling/opacity minimal so the effect
                        // reads as a color flow rather than an explosion.
                        final translate = Offset(
                            -dir.dx * (1 - v) * 28, -dir.dy * (1 - v) * 28);

                        return Opacity(
                          opacity: 0.6 * v,
                          child: Transform.translate(
                            offset: translate,
                            child: Transform.scale(
                              scale: 0.92 + 0.08 * v,
                              child: Container(
                                width: double.infinity,
                                height: double.infinity,
                                decoration: BoxDecoration(
                                  color: palette.selectedCell.withOpacity(0.9),
                                  boxShadow: [
                                    BoxShadow(
                                      color: palette.selectedCell
                                          .withOpacity(0.25 * v),
                                      blurRadius: 6.0 + 6.0 * v,
                                      spreadRadius: 0.25 * v,
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        );
                      },
                    ),

                  _buildAnimatedNumber(
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
                ],
              ),
      ),
    );
  }

  Widget _buildAnimatedNumber(Widget number) {
    final wave = highlightAnimation;
    if (wave == null) return _buildNumber(number);

    return AnimatedBuilder(
      animation: wave,
      child: _buildNumber(number),
      builder: (context, child) {
        final v = wave.value.clamp(0.0, 1.0);
        final op = (0.7 + 0.25 * v).clamp(0.0, 1.0) as double;
        return Opacity(
          opacity: op,
          child: Transform.scale(
            scale: 1.0 + 0.08 * v,
            child: child,
          ),
        );
      },
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
