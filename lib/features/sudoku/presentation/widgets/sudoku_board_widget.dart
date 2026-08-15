import 'package:flutter/material.dart';

import '../../../../core/constants/app_constants.dart';
import '../../../../core/theme/app_colors.dart';
import '../../domain/game/sudoku_game_state.dart';
import 'cell_widget.dart';

/// Renders the 9x9 Sudoku grid, visually divided into nine 3x3 boxes
/// (spec section 4), with row/column/box/same-number highlighting driven
/// entirely off [SudokuGameState] — no game logic lives in this widget.
class SudokuBoardWidget extends StatelessWidget {
  final SudokuGameState state;
  final ValueChanged<int> onCellTap;

  const SudokuBoardWidget(
      {super.key, required this.state, required this.onCellTap});

  @override
  Widget build(BuildContext context) {
    final palette = BoardPalette.of(Theme.of(context).brightness);
    final selected = state.selectedCell;
    final selectedValue = selected != null ? state.board[selected] : 0;

    return AspectRatio(
      aspectRatio: 1,
      child: Container(
        decoration: BoxDecoration(
          color: palette.background,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: palette.gridLineThick, width: 2),
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
              final value = state.board.isEmpty ? 0 : state.board[index];

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
                  onTap: () => onCellTap(index),
                  state: CellVisualState(
                    value: value,
                    isGiven: state.isGivenCell(index),
                    isSelected: isSelected,
                    isRelated: isRelated,
                    isSameValue: isSameValue,
                    isIncorrect: state.incorrectCells.contains(index),
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
