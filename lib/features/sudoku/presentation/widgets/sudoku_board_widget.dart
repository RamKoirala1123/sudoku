import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../../../core/constants/app_constants.dart';
import '../../../../core/theme/app_colors.dart';
import '../../domain/game/sudoku_game_state.dart';
import '../../domain/entities/game_event.dart';
import 'cell_widget.dart';

/// Renders the 9x9 Sudoku grid, visually divided into nine 3x3 boxes.
/// Initial given numbers animate individually while the grid and cell
/// backgrounds remain static.
class SudokuBoardWidget extends StatefulWidget {
  final SudokuGameState state;
  final ValueChanged<int> onCellTap;
  final Stream? events;

  const SudokuBoardWidget({
    super.key,
    required this.state,
    required this.onCellTap,
    this.events,
  });

  @override
  State<SudokuBoardWidget> createState() => _SudokuBoardWidgetState();
}

class _SudokuBoardWidgetState extends State<SudokuBoardWidget>
    with TickerProviderStateMixin {
  late final AnimationController _controller;
  AnimationController? _waveController;
  Map<int, Animation<double>> _cellWaveAnimations = {};
  Map<int, Offset> _cellHighlightOffsets = {};
  StreamSubscription? _eventsSub;

  @override
  void initState() {
    super.initState();

    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..forward();

    if (widget.events != null) {
      _eventsSub = widget.events!.listen((event) {
        debugPrint('SudokuBoardWidget received event: ${event.runtimeType}');
        if (event is RowCompletedEvent) {
          debugPrint(
              'RowCompletedEvent: row=${event.rowIndex} trigger=${event.triggerCellIndex}');
          _startWave(_cellsInRow(event.rowIndex), event.triggerCellIndex);
        } else if (event is ColumnCompletedEvent) {
          debugPrint(
              'ColumnCompletedEvent: col=${event.columnIndex} trigger=${event.triggerCellIndex}');
          _startWave(_cellsInColumn(event.columnIndex), event.triggerCellIndex);
        } else if (event is BoxCompletedEvent) {
          debugPrint(
              'BoxCompletedEvent: box=${event.boxIndex} trigger=${event.triggerCellIndex}');
          _startWave(_cellsInBox(event.boxIndex), event.triggerCellIndex);
        }
      });
    }
  }

  @override
  void dispose() {
    _eventsSub?.cancel();
    _waveController?.dispose();
    _controller.dispose();
    super.dispose();
  }

  List<int> _cellsInRow(int row) {
    final start = row * AppConstants.boardSize;
    return List<int>.generate(AppConstants.boardSize, (i) => start + i);
  }

  List<int> _cellsInColumn(int col) {
    return List<int>.generate(
        AppConstants.boardSize, (r) => r * AppConstants.boardSize + col);
  }

  List<int> _cellsInBox(int boxIndex) {
    final boxRow = boxIndex ~/ AppConstants.boxSize;
    final boxCol = boxIndex % AppConstants.boxSize;
    final startRow = boxRow * AppConstants.boxSize;
    final startCol = boxCol * AppConstants.boxSize;

    final cells = <int>[];
    for (int r = 0; r < AppConstants.boxSize; r++) {
      for (int c = 0; c < AppConstants.boxSize; c++) {
        cells.add((startRow + r) * AppConstants.boardSize + (startCol + c));
      }
    }
    return cells;
  }

  void _startWave(List<int> cells, int triggerIndex) {
    _waveController?.dispose();

    _waveController = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 600));

    // Compute Euclidean distance of each cell from trigger to stagger intervals
    final distances = <int, double>{};
    for (final cell in cells) {
      final r = cell ~/ AppConstants.boardSize;
      final c = cell % AppConstants.boardSize;
      final tr = triggerIndex ~/ AppConstants.boardSize;
      final tc = triggerIndex % AppConstants.boardSize;
      final dx = (c - tc).toDouble();
      final dy = (r - tr).toDouble();
      final dist = math.sqrt(dx * dx + dy * dy);
      distances[cell] = dist;
    }

    final maxDistance = distances.values.isEmpty
        ? 1.0
        : distances.values.reduce((a, b) => a > b ? a : b);

    _cellWaveAnimations = {};
    _cellHighlightOffsets = {};
    for (final cell in cells) {
      final d = distances[cell]!;
      final start = (d / (maxDistance + 0.0001)) * 0.48;
      final end = (start + 0.33).clamp(0.0, 1.0);

      _cellWaveAnimations[cell] = CurvedAnimation(
        parent: _waveController!,
        curve: Interval(start, end, curve: Curves.easeInOut),
      );

      // compute normalized direction from trigger cell to this cell for translate effect
      final r = cell ~/ AppConstants.boardSize;
      final c = cell % AppConstants.boardSize;
      final tr = triggerIndex ~/ AppConstants.boardSize;
      final tc = triggerIndex % AppConstants.boardSize;
      final dx = (c - tc).toDouble();
      final dy = (r - tr).toDouble();
      final dist = math.sqrt(dx * dx + dy * dy);
      final dir = dist == 0 ? Offset.zero : Offset(dx / dist, dy / dist);
      _cellHighlightOffsets[cell] = dir;
    }

    debugPrint(
        'Starting wave for ${cells.length} cells from trigger=$triggerIndex');
    setState(() {});

    _waveController!.forward(from: 0.0).whenComplete(() {
      _cellWaveAnimations = {};
      _cellHighlightOffsets = {};
      _waveController?.dispose();
      _waveController = null;
      setState(() {});
    });
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
                    candidates: widget.state.candidates[index] ?? {},
                  ),
                  highlightAnimation: _cellWaveAnimations[index],
                  highlightDirection: _cellHighlightOffsets[index],
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}
