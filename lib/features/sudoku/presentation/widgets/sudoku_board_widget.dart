import 'package:flutter/material.dart';

import '../../../../core/constants/app_constants.dart';
import '../../../../core/theme/app_colors.dart';
import '../../domain/game/sudoku_game_state.dart';
import 'cell_widget.dart';

/// Renders the 9x9 Sudoku grid, visually divided into nine 3x3 boxes.
/// Initial given numbers animate individually while the grid and cell
/// backgrounds remain static.
class SudokuBoardWidget extends StatefulWidget {
  final SudokuGameState state;
  final ValueChanged<int> onCellTap;

  const SudokuBoardWidget({
    super.key,
    required this.state,
    required this.onCellTap,
  });

  @override
  State<SudokuBoardWidget> createState() => _SudokuBoardWidgetState();
}

class _SudokuBoardWidgetState extends State<SudokuBoardWidget>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();

    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  /// Creates a staggered animation for each cell.
  ///
  /// The animation is passed to CellWidget, so only the number gets animated.
  Animation<double> _cellAnimation(int index) {
    final totalCells = AppConstants.totalCells;

    final start = (index / totalCells) * 0.8;
    final end = start + 0.2;

    return CurvedAnimation(
      parent: _controller,
      curve: Interval(
        start.clamp(0.0, 1.0),
        end.clamp(0.0, 1.0),
        curve: Curves.easeOutBack,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final palette = BoardPalette.of(
      Theme.of(context).brightness,
    );

    final selected = widget.state.selectedCell;

    final selectedValue = selected != null ? widget.state.board[selected] : 0;

    return AspectRatio(
      aspectRatio: 1,
      child: Container(
        decoration: BoxDecoration(
          color: palette.background,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: palette.gridLineThick,
            width: 2,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.06),
              blurRadius: 24,
              offset: const Offset(0, 12),
            ),
          ],
        ),
        clipBehavior: Clip.antiAlias,
        child: ClipRRect(
          borderRadius: BorderRadius.circular(18),
          child: GridView.builder(
            physics: const NeverScrollableScrollPhysics(),
            padding: EdgeInsets.zero,
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: AppConstants.boardSize,
            ),
            itemCount: AppConstants.totalCells,
            itemBuilder: (context, index) {
              final row = index ~/ AppConstants.boardSize;
              final col = index % AppConstants.boardSize;

              final value =
                  widget.state.board.isEmpty ? 0 : widget.state.board[index];

              final isSelected = selected == index;

              final isRelated = selected != null &&
                  !isSelected &&
                  (row == selected ~/ AppConstants.boardSize ||
                      col == selected % AppConstants.boardSize ||
                      (row ~/ AppConstants.boxSize ==
                              (selected ~/ AppConstants.boardSize) ~/
                                  AppConstants.boxSize &&
                          col ~/ AppConstants.boxSize ==
                              (selected % AppConstants.boardSize) ~/
                                  AppConstants.boxSize));

              final isSameValue =
                  selectedValue != 0 && value == selectedValue && !isSelected;

              final isGiven = widget.state.isGivenCell(index);

              return Container(
                decoration: BoxDecoration(
                  border: Border(
                    right: col == AppConstants.boardSize - 1
                        ? BorderSide.none
                        : BorderSide(
                            color: (col + 1) % AppConstants.boxSize == 0
                                ? palette.gridLineThick
                                : palette.gridLineThin,
                            width: (col + 1) % AppConstants.boxSize == 0
                                ? 1.5
                                : 0.6,
                          ),
                    bottom: row == AppConstants.boardSize - 1
                        ? BorderSide.none
                        : BorderSide(
                            color: (row + 1) % AppConstants.boxSize == 0
                                ? palette.gridLineThick
                                : palette.gridLineThin,
                            width: (row + 1) % AppConstants.boxSize == 0
                                ? 1.5
                                : 0.6,
                          ),
                  ),
                ),
                child: CellWidget(
                  palette: palette,
                  onTap: () => widget.onCellTap(index),

                  // Only animate initial given numbers.
                  // The animation is applied inside CellWidget
                  // directly to the number.
                  initialNumberAnimation:
                      isGiven && value != 0 ? _cellAnimation(index) : null,

                  state: CellVisualState(
                    value: value,
                    isGiven: isGiven,
                    isSelected: isSelected,
                    isRelated: isRelated,
                    isSameValue: isSameValue,
                    isIncorrect: widget.state.incorrectCells.contains(index),
                  ),
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}
