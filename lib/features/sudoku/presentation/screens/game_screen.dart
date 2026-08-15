import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../settings/presentation/settings_controller.dart';
import '../../../statistics/presentation/statistics_controller.dart';
import '../../domain/entities/difficulty.dart';
import '../../domain/entities/game_status.dart';
import '../../domain/game/sudoku_game_controller.dart';
import '../../domain/game/sudoku_game_state.dart';
import '../widgets/game_result_overlay.dart';
import '../widgets/lives_widget.dart';
import '../widgets/number_pad_widget.dart';
import '../widgets/pause_dialog.dart';
import '../widgets/restart_confirm_dialog.dart';
import '../widgets/sudoku_board_widget.dart';
import '../widgets/timer_score_widgets.dart';

class GameScreen extends StatefulWidget {
  final Difficulty difficulty;
  const GameScreen({super.key, required this.difficulty});

  @override
  State<GameScreen> createState() => _GameScreenState();
}

class _GameScreenState extends State<GameScreen> {
  late final SudokuGameController _controller;
  int? _lastDelta;
  Object _deltaToken = Object();
  int _previousScore = 0;

  @override
  void initState() {
    super.initState();
    final settings = context.read<SettingsController>().settings;
    _controller = SudokuGameController(
        difficulty: widget.difficulty, showMistakes: settings.showMistakes);
    _controller.onGameEnded = (summary) {
      context.read<StatisticsController>().recordGameResult(summary);
    };
    _controller.addListener(_onControllerChanged);
    _controller.startNewGame();
  }

  void _onControllerChanged() {
    final score = _controller.state.score;
    if (score != _previousScore) {
      setState(() {
        _lastDelta = score - _previousScore;
        _deltaToken = Object();
        _previousScore = score;
      });
    } else {
      setState(() {});
    }
  }

  @override
  void dispose() {
    _controller.removeListener(_onControllerChanged);
    _controller.exitGame();
    _controller.dispose();
    super.dispose();
  }

  Map<int, int> _remainingCounts(List<int> board) {
    final counts = <int, int>{for (var v = 1; v <= 9; v++) v: 9};
    if (board.isEmpty) return counts;
    for (final v in board) {
      if (v != 0) counts[v] = (counts[v] ?? 9) - 1;
    }
    return counts;
  }

  Future<void> _handlePauseTap() async {
    _controller.pause();
    final action = await showDialog<String>(
      context: context,
      barrierDismissible: false,
      builder: (_) => PauseDialog(
        onResume: () => Navigator.of(context).pop('resume'),
        onRestart: () => Navigator.of(context).pop('restart'),
        onExit: () => Navigator.of(context).pop('exit'),
      ),
    );

    if (!mounted) return;
    switch (action) {
      case 'restart':
        await _handleRestart(skipConfirmIfPaused: true);
        break;
      case 'exit':
        Navigator.of(context).pop();
        break;
      case 'resume':
      default:
        _controller.resume();
    }
  }

  Future<void> _handleRestart({bool skipConfirmIfPaused = false}) async {
    final settings = context.read<SettingsController>().settings;
    if (settings.confirmRestart) {
      final confirmed = await showDialog<bool>(
        context: context,
        builder: (_) => const RestartConfirmDialog(),
      );
      if (confirmed != true) {
        if (skipConfirmIfPaused) _controller.resume();
        return;
      }
    }
    await _controller.restart();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, _) {
        final state = _controller.state;
        final theme = Theme.of(context);

        return PopScope(
          canPop: state.status != GameStatus.playing,
          onPopInvokedWithResult: (didPop, _) {
            if (!didPop) _controller.pause();
          },
          child: Scaffold(
            body: SafeArea(
              child: state.puzzle == null
                  ? const Center(child: CircularProgressIndicator())
                  : Stack(
                      children: [
                        Padding(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 20, vertical: 12),
                          child: Column(
                            children: [
                              Row(
                                children: [
                                  IconButton(
                                    icon: const Icon(
                                        Icons.arrow_back_ios_new_rounded,
                                        size: 20),
                                    onPressed: () {
                                      _controller.pause();
                                      Navigator.of(context).maybePop();
                                    },
                                  ),
                                  Expanded(
                                    child: Text(
                                      state.difficulty.label,
                                      textAlign: TextAlign.center,
                                      style: theme.textTheme.titleMedium,
                                    ),
                                  ),
                                  IconButton(
                                    icon: const Icon(Icons.pause_rounded,
                                        size: 22),
                                    onPressed:
                                        state.status == GameStatus.playing
                                            ? _handlePauseTap
                                            : null,
                                  ),
                                ],
                              ),
                              const SizedBox(height: 4),
                              Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceBetween,
                                children: [
                                  LivesWidget(lives: state.lives),
                                  TimerWidget(
                                      elapsedSeconds: state.elapsedSeconds),
                                  ScoreWidget(
                                    score: state.score,
                                    lastDelta: _lastDelta,
                                    deltaToken: _deltaToken,
                                  ),
                                ],
                              ),
                              const SizedBox(height: 18),
                              SudokuBoardWidget(
                                state: state,
                                onCellTap: _controller.selectCell,
                              ),
                              const SizedBox(height: 20),
                              NumberPadWidget(
                                enabled: state.status == GameStatus.playing,
                                remainingCounts: _remainingCounts(state.board),
                                onNumberTap: _controller.inputNumber,
                                onErase: _controller.erase,
                              ),
                            ],
                          ),
                        ),
                        if (state.status == GameStatus.won ||
                            state.status == GameStatus.lost)
                          _buildResult(context, state),
                      ],
                    ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildResult(BuildContext context, SudokuGameState state) {
    return Container(
      color: Colors.black.withOpacity(0.45),
      width: double.infinity,
      height: double.infinity,
      child: GameResultOverlay(
        won: state.status == GameStatus.won,
        difficulty: state.difficulty,
        score: state.score,
        elapsedSeconds: state.elapsedSeconds,
        mistakes: state.wrongCount,
        correct: state.correctCount,
        onPlayAgain: () async {
          await _controller.restart();
        },
        onHome: () => Navigator.of(context).popUntil((route) => route.isFirst),
      ),
    );
  }
}
