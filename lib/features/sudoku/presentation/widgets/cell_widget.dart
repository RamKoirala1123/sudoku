import 'dart:math' as math;

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
  final Set<int> candidates;

  const CellVisualState({
    required this.value,
    required this.isGiven,
    required this.isSelected,
    required this.isRelated,
    required this.isSameValue,
    required this.isIncorrect,
    this.candidates = const {},
  });
}

class CellWidget extends StatelessWidget {
  static const int _errorPulseCount = 1;

  final CellVisualState state;
  final VoidCallback onTap;
  final BoardPalette palette;

  /// Used only when the board is initially loading the puzzle.
  /// The animation affects only the number, not the cell/background/border.
  final Animation<double>? initialNumberAnimation;
  final Animation<double>? highlightAnimation;
  final Offset? highlightDirection;
  final bool highlightIsError;

  const CellWidget({
    super.key,
    required this.state,
    required this.onTap,
    required this.palette,
    this.initialNumberAnimation,
    this.highlightAnimation,
    this.highlightDirection,
    this.highlightIsError = false,
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
    final textColor = (state.isIncorrect || highlightIsError)
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
            ? Padding(
                padding: const EdgeInsets.all(4.0),
                child: LayoutBuilder(builder: (context, constraints) {
                  final txtStyle =
                      Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: palette.playerText.withOpacity(0.9),
                            fontSize: 10,
                          );
                  return Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(3, (r) {
                      return Expanded(
                        child: Row(
                          children: List.generate(3, (c) {
                            final number = r * 3 + c + 1;
                            final show = state.candidates.contains(number);
                            return Expanded(
                              child: Center(
                                child: show
                                    ? Text(
                                        '$number',
                                        style: txtStyle,
                                      )
                                    : const SizedBox.shrink(),
                              ),
                            );
                          }),
                        ),
                      );
                    }),
                  );
                }),
              )
            : Stack(
                alignment: Alignment.center,
                children: [
                  // colored flowing box overlay
                  if (highlightAnimation != null)
                    AnimatedBuilder(
                      animation: highlightAnimation!,
                      builder: (context, child) {
                        final raw = highlightAnimation!.value.clamp(0.0, 1.0);
                        final dir = highlightDirection ?? Offset.zero;
                        double v;
                        if (highlightIsError) {
                          final angle = raw * _errorPulseCount * 2 * math.pi;
                          final s = 0.5 * (1 + math.sin(angle));
                          // sharpen peaks so each flash is distinct
                          v = math.pow(s, 5).toDouble();
                        } else {
                          v = raw;
                        }
                        // Subtle flowing overlay: translate from trigger,
                        // but keep scaling/opacity minimal so the effect
                        // reads as a color flow rather than an explosion.
                        final translate = Offset(
                            -dir.dx * (1 - v) * 28, -dir.dy * (1 - v) * 28);

                        final overlayColor = highlightIsError
                            ? palette.errorCell.withOpacity(0.95)
                            : palette.selectedCell.withOpacity(0.9);

                        return Opacity(
                          opacity: (highlightIsError ? 0.9 : 0.6) * v,
                          child: Transform.translate(
                            offset: translate,
                            child: Transform.scale(
                              scale: 0.92 + 0.08 * v,
                              child: Container(
                                width: double.infinity,
                                height: double.infinity,
                                decoration: BoxDecoration(
                                  color: overlayColor,
                                  boxShadow: [
                                    BoxShadow(
                                      color: (highlightIsError
                                              ? palette.errorCell
                                              : palette.selectedCell)
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
                        fontSize: 22,
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
        final raw = wave.value.clamp(0.0, 1.0);
        double v;
        if (highlightIsError) {
          final angle = raw * _errorPulseCount * 2 * math.pi;
          final s = 0.5 * (1 + math.sin(angle));
          v = math.pow(s, 4).toDouble();
        } else {
          v = raw;
        }
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
