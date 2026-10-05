import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:sudoku_duel/features/sudoku/presentation/widgets/icon_label_button.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../settings/presentation/settings_controller.dart';
import '../../../statistics/presentation/statistics_controller.dart';
import '../../domain/entities/difficulty.dart';
import '../../domain/entities/game_status.dart';
import '../../domain/game/sudoku_game_controller.dart';
import '../../domain/game/sudoku_game_state.dart';
import '../../../multiplayer/domain/game_session_service.dart';
import '../widgets/game_result_overlay.dart';
import '../widgets/lives_widget.dart';
import '../widgets/number_pad_widget.dart';
import '../widgets/pause_dialog.dart';
import '../widgets/restart_confirm_dialog.dart';
import '../widgets/sudoku_board_widget.dart';
import '../widgets/timer_score_widgets.dart';

class GameScreen extends StatefulWidget {
  final Difficulty difficulty;
  final SavedGameSession? restoredSession;

  const GameScreen({
    super.key,
    required this.difficulty,
    this.restoredSession,
  });

  @override
  State<GameScreen> createState() => _GameScreenState();
}

class _GameScreenState extends State<GameScreen> {
  late final SudokuGameController _controller;
  bool _pencilMode = false;
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
      GameSessionService.clearSession();
      context.read<StatisticsController>().recordGameResult(summary);
    };
    _controller.addListener(_onControllerChanged);

    if (widget.restoredSession != null) {
      _controller.restoreGameState(
        puzzle: widget.restoredSession!.puzzle,
        board: widget.restoredSession!.board,
        candidates: widget.restoredSession!.candidates,
        lives: widget.restoredSession!.lives,
        score: widget.restoredSession!.score,
        elapsedSeconds: widget.restoredSession!.elapsedSeconds,
      );
    } else {
      _controller.startNewGame();
    }
  }

  void _saveSession() {
    final s = _controller.state;
    if (s.puzzle == null || s.status != GameStatus.playing) return;
    GameSessionService.saveSession(
      SavedGameSession(
        isMultiplayer: false,
        role: 'single',
        localPlayerId: 'player',
        localPlayerName: 'Player',
        difficulty: s.difficulty,
        puzzle: s.puzzle!,
        board: s.board,
        candidates: s.candidates,
        lives: s.lives,
        score: s.score,
        elapsedSeconds: s.elapsedSeconds,
        timestamp: DateTime.now().millisecondsSinceEpoch,
      ),
    );
  }

  void _onControllerChanged() {
    _saveSession();
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
        await GameSessionService.clearSession();
        if (mounted) Navigator.of(context).pop();
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
    await GameSessionService.clearSession();
    await _controller.restart();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, _) {
        final state = _controller.state;

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
                        LayoutBuilder(
                          builder: (context, constraints) {
                            final isWideScreen = constraints.maxWidth >= 768;

                            return Center(
                              child: ConstrainedBox(
                                constraints: BoxConstraints(
                                  maxWidth: isWideScreen ? 920 : 500,
                                ),
                                child: SingleChildScrollView(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 16, vertical: 12),
                                  child: Column(
                                    children: [
                                      // Top Bar (Difficulty, Controls, Pause)
                                      Row(
                                        mainAxisAlignment:
                                            MainAxisAlignment.spaceBetween,
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
                                          Container(
                                            padding: const EdgeInsets.symmetric(
                                                horizontal: 12, vertical: 5),
                                            decoration: BoxDecoration(
                                              color: AppColors.primary
                                                  .withValues(alpha: 0.12),
                                              borderRadius:
                                                  BorderRadius.circular(10),
                                            ),
                                            child: Text(
                                              state.difficulty.label,
                                              style: const TextStyle(
                                                fontWeight: FontWeight.bold,
                                                fontSize: 14,
                                                color: AppColors.primary,
                                              ),
                                            ),
                                          ),
                                          Row(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              Consumer<SettingsController>(
                                                builder: (context, settingsController, _) {
                                                  final soundOn =
                                                      settingsController.settings.soundEnabled;
                                                  return IconButton(
                                                    icon: Icon(
                                                      soundOn
                                                          ? Icons.volume_up_rounded
                                                          : Icons.volume_off_rounded,
                                                      size: 22,
                                                    ),
                                                    tooltip: soundOn
                                                        ? 'Mute Sound'
                                                        : 'Unmute Sound',
                                                    onPressed: () =>
                                                        settingsController
                                                            .setSoundEnabled(!soundOn),
                                                  );
                                                },
                                              ),
                                              Consumer<SettingsController>(
                                                builder: (context, settingsController, _) {
                                                  final isDarkTheme =
                                                      settingsController.settings.darkMode;
                                                  return IconButton(
                                                    icon: Icon(
                                                      isDarkTheme
                                                          ? Icons.light_mode_rounded
                                                          : Icons.dark_mode_rounded,
                                                      size: 22,
                                                    ),
                                                    tooltip: isDarkTheme
                                                        ? 'Switch to Light Theme'
                                                        : 'Switch to Dark Theme',
                                                    onPressed: () =>
                                                        settingsController
                                                            .setDarkMode(!isDarkTheme),
                                                  );
                                                },
                                              ),
                                              IconButton(
                                                icon: const Icon(Icons.pause_rounded,
                                                    size: 24),
                                                onPressed:
                                                    state.status == GameStatus.playing
                                                        ? _handlePauseTap
                                                        : null,
                                              ),
                                            ],
                                          ),
                                        ],
                                      ),

                                      const SizedBox(height: 14),

                                      // Stats Bar (Mistakes, Timer, Score)
                                      Padding(
                                        padding: const EdgeInsets.symmetric(
                                            horizontal: 4),
                                        child: Row(
                                          mainAxisAlignment:
                                              MainAxisAlignment.spaceBetween,
                                          children: [
                                            LivesWidget(lives: state.lives),
                                            TimerWidget(
                                                elapsedSeconds:
                                                    state.elapsedSeconds),
                                            ScoreWidget(
                                              score: state.score,
                                              lastDelta: _lastDelta,
                                              deltaToken: _deltaToken,
                                            ),
                                          ],
                                        ),
                                      ),

                                      const SizedBox(height: 16),

                                      if (isWideScreen)
                                        Row(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            // Board (Left - Sudoku.com proportioned)
                                            Expanded(
                                              flex: 6,
                                              child: Center(
                                                child: ConstrainedBox(
                                                  constraints:
                                                      const BoxConstraints(
                                                    maxWidth: 490,
                                                    maxHeight: 490,
                                                  ),
                                                  child: AspectRatio(
                                                    aspectRatio: 1.0,
                                                    child: SudokuBoardWidget(
                                                      state: state,
                                                      onCellTap:
                                                          _controller.selectCell,
                                                      events: _controller.events,
                                                    ),
                                                  ),
                                                ),
                                              ),
                                            ),

                                            const SizedBox(width: 24),

                                            // Side Controls (Right)
                                            Expanded(
                                              flex: 4,
                                              child: ConstrainedBox(
                                                constraints: const BoxConstraints(
                                                    maxWidth: 290),
                                                child: Column(
                                                  crossAxisAlignment:
                                                      CrossAxisAlignment.stretch,
                                                  children: [
                                                    Row(
                                                      mainAxisAlignment:
                                                          MainAxisAlignment
                                                              .spaceEvenly,
                                                      children: [
                                                        IconLabelButton(
                                                          icon: const Icon(
                                                              Icons.undo_rounded),
                                                          label: 'Undo',
                                                          tooltip: 'Undo',
                                                          onPressed: state.status ==
                                                                  GameStatus.playing
                                                              ? _controller.undo
                                                              : null,
                                                        ),
                                                        IconLabelButton(
                                                          icon: const Icon(Icons
                                                              .auto_fix_normal_outlined),
                                                          label: 'Erase',
                                                          tooltip: 'Erase',
                                                          onPressed:
                                                              _controller.erase,
                                                        ),
                                                        IconLabelButton(
                                                          icon: Icon(
                                                            _pencilMode
                                                                ? Icons.edit_note
                                                                : Icons.edit,
                                                            color: _pencilMode
                                                                ? AppColors
                                                                    .primary
                                                                : null,
                                                          ),
                                                          label: _pencilMode
                                                              ? 'Pencil ON'
                                                              : 'Pencil',
                                                          tooltip: 'Pencil',
                                                          onPressed: () {
                                                            setState(() {
                                                              _pencilMode =
                                                                  !_pencilMode;
                                                            });
                                                          },
                                                        ),
                                                      ],
                                                    ),
                                                    const SizedBox(height: 20),
                                                    NumberPadWidget(
                                                      enabled: state.status ==
                                                          GameStatus.playing,
                                                      isGrid: true,
                                                      remainingCounts:
                                                          _remainingCounts(
                                                              state.board),
                                                      onNumberTap: (value) {
                                                        if (_pencilMode) {
                                                          _controller
                                                              .toggleCandidate(
                                                                  value);
                                                        } else {
                                                          _controller
                                                              .inputNumber(value);
                                                        }
                                                      },
                                                      onErase: _controller.erase,
                                                    ),
                                                  ],
                                                ),
                                              ),
                                            ),
                                          ],
                                        )
                                      else ...[
                                        // Narrow Mobile layout
                                        Center(
                                          child: ConstrainedBox(
                                            constraints: const BoxConstraints(
                                              maxWidth: 480,
                                              maxHeight: 480,
                                            ),
                                            child: AspectRatio(
                                              aspectRatio: 1.0,
                                              child: SudokuBoardWidget(
                                                state: state,
                                                onCellTap:
                                                    _controller.selectCell,
                                                events: _controller.events,
                                              ),
                                            ),
                                          ),
                                        ),
                                        const SizedBox(height: 14),
                                        Row(
                                          mainAxisAlignment:
                                              MainAxisAlignment.spaceEvenly,
                                          children: [
                                            IconLabelButton(
                                              icon: const Icon(
                                                  Icons.undo_rounded),
                                              label: 'Undo',
                                              tooltip: 'Undo',
                                              onPressed: state.status ==
                                                      GameStatus.playing
                                                  ? _controller.undo
                                                  : null,
                                            ),
                                            IconLabelButton(
                                              icon: Icon(
                                                _pencilMode
                                                    ? Icons.edit_note
                                                    : Icons.edit,
                                                color: _pencilMode
                                                    ? AppColors.primary
                                                    : null,
                                              ),
                                              label: _pencilMode
                                                  ? 'Pencil ON'
                                                  : 'Pencil',
                                              tooltip: 'Pencil',
                                              onPressed: () {
                                                setState(() {
                                                  _pencilMode = !_pencilMode;
                                                });
                                              },
                                            ),
                                            IconLabelButton(
                                              icon: const Icon(Icons
                                                  .auto_fix_normal_outlined),
                                              label: 'Erase',
                                              tooltip: 'Erase',
                                              onPressed: _controller.erase,
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: 20),
                                        NumberPadWidget(
                                          enabled: state.status ==
                                              GameStatus.playing,
                                          remainingCounts:
                                              _remainingCounts(state.board),
                                          onNumberTap: (value) {
                                            if (_pencilMode) {
                                              _controller
                                                  .toggleCandidate(value);
                                            } else {
                                              _controller.inputNumber(value);
                                            }
                                          },
                                          onErase: _controller.erase,
                                        ),
                                      ],
                                    ],
                                  ),
                                ),
                              ),
                            );
                          },
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
      color: Colors.black.withValues(alpha: 0.45),
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
