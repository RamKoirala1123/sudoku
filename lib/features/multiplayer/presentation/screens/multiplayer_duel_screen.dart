import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../settings/presentation/settings_controller.dart';
import '../../../sudoku/domain/engine/sudoku_generator.dart';
import '../../../sudoku/domain/entities/difficulty.dart';
import '../../../sudoku/domain/game/sudoku_game_controller.dart';
import '../../../sudoku/presentation/widgets/icon_label_button.dart';
import '../../../sudoku/presentation/widgets/number_pad_widget.dart';
import '../../../sudoku/presentation/widgets/sudoku_board_widget.dart';
import '../../domain/p2p_connection_service.dart';
import '../../domain/sudoku_duel_controller.dart';
import '../widgets/duel_race_bar_widget.dart';
import '../widgets/floating_emoji_overlay.dart';

class MultiplayerDuelScreen extends StatefulWidget {
  final P2PConnectionService p2pService;
  final String localPlayerName;

  const MultiplayerDuelScreen({
    super.key,
    required this.p2pService,
    required this.localPlayerName,
  });

  @override
  State<MultiplayerDuelScreen> createState() => _MultiplayerDuelScreenState();
}

class _MultiplayerDuelScreenState extends State<MultiplayerDuelScreen> {
  late final SudokuGameController _localGame;
  late final SudokuDuelController _duelController;
  final FocusNode _keyboardFocusNode = FocusNode();
  bool _pencilMode = false;

  @override
  void initState() {
    super.initState();
    final settings = context.read<SettingsController>().settings;
    final difficulty =
        widget.p2pService.puzzle?.difficulty ?? Difficulty.medium;

    _localGame = SudokuGameController(
      difficulty: difficulty,
      showMistakes: settings.showMistakes,
    );

    _duelController = SudokuDuelController(
      localGame: _localGame,
      p2pService: widget.p2pService,
    );

    _duelController.addListener(_onDuelStateChanged);
  }

  void _onDuelStateChanged() {
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    _keyboardFocusNode.dispose();
    _duelController.removeListener(_onDuelStateChanged);
    _duelController.dispose();
    _localGame.dispose();
    widget.p2pService.dispose();
    super.dispose();
  }

  void _handleKeyEvent(KeyEvent event) {
    if (event is! KeyDownEvent) return;

    final state = _localGame.state;
    final selected = state.selectedCell;

    // Digits 1-9
    final logical = event.logicalKey;
    if (logical == LogicalKeyboardKey.digit1 ||
        logical == LogicalKeyboardKey.numpad1) {
      _handleNumberInput(1);
    } else if (logical == LogicalKeyboardKey.digit2 ||
        logical == LogicalKeyboardKey.numpad2) {
      _handleNumberInput(2);
    } else if (logical == LogicalKeyboardKey.digit3 ||
        logical == LogicalKeyboardKey.numpad3) {
      _handleNumberInput(3);
    } else if (logical == LogicalKeyboardKey.digit4 ||
        logical == LogicalKeyboardKey.numpad4) {
      _handleNumberInput(4);
    } else if (logical == LogicalKeyboardKey.digit5 ||
        logical == LogicalKeyboardKey.numpad5) {
      _handleNumberInput(5);
    } else if (logical == LogicalKeyboardKey.digit6 ||
        logical == LogicalKeyboardKey.numpad6) {
      _handleNumberInput(6);
    } else if (logical == LogicalKeyboardKey.digit7 ||
        logical == LogicalKeyboardKey.numpad7) {
      _handleNumberInput(7);
    } else if (logical == LogicalKeyboardKey.digit8 ||
        logical == LogicalKeyboardKey.numpad8) {
      _handleNumberInput(8);
    } else if (logical == LogicalKeyboardKey.digit9 ||
        logical == LogicalKeyboardKey.numpad9) {
      _handleNumberInput(9);
    } else if (logical == LogicalKeyboardKey.backspace ||
        logical == LogicalKeyboardKey.delete) {
      _localGame.erase();
    } else if (logical == LogicalKeyboardKey.keyP ||
        logical == LogicalKeyboardKey.keyN) {
      setState(() => _pencilMode = !_pencilMode);
    } else if (logical == LogicalKeyboardKey.arrowUp) {
      if (selected != null && selected >= 9) {
        _localGame.selectCell(selected - 9);
      }
    } else if (logical == LogicalKeyboardKey.arrowDown) {
      if (selected != null && selected < 72) {
        _localGame.selectCell(selected + 9);
      }
    } else if (logical == LogicalKeyboardKey.arrowLeft) {
      if (selected != null && selected % 9 > 0) {
        _localGame.selectCell(selected - 1);
      }
    } else if (logical == LogicalKeyboardKey.arrowRight) {
      if (selected != null && selected % 9 < 8) {
        _localGame.selectCell(selected + 1);
      }
    }
  }

  void _handleNumberInput(int digit) {
    if (_pencilMode) {
      _localGame.toggleCandidate(digit);
    } else {
      _localGame.inputNumber(digit);
    }
  }

  Map<int, int> _remainingCounts(List<int> board) {
    final counts = <int, int>{for (var v = 1; v <= 9; v++) v: 9};
    if (board.isEmpty) return counts;
    for (final v in board) {
      if (v != 0) counts[v] = (counts[v] ?? 9) - 1;
    }
    return counts;
  }

  String _formatTime(int totalSeconds) {
    final m = (totalSeconds ~/ 60).toString().padLeft(2, '0');
    final s = (totalSeconds % 60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  Future<void> _handleRematch() async {
    final currentDiff =
        widget.p2pService.puzzle?.difficulty ?? Difficulty.medium;
    final newPuzzle = await compute(
      SudokuGenerator.generate,
      GenerationRequest(difficulty: currentDiff),
    );
    _duelController.requestRematch(newPuzzle);
  }

  @override
  Widget build(BuildContext context) {
    final gameState = _localGame.state;
    final opponent = _duelController.opponent;
    final result = _duelController.result;

    final puzzle = gameState.puzzle;
    double localProgress = 0.0;
    if (puzzle != null) {
      final totalGivens = puzzle.givenCount;
      final targetToFill = 81 - totalGivens;
      int correctFilled = 0;
      for (int i = 0; i < 81; i++) {
        if (!puzzle.isGivenCell(i) && gameState.board[i] == puzzle.solution[i]) {
          correctFilled++;
        }
      }
      localProgress = targetToFill > 0
          ? (correctFilled / targetToFill).clamp(0.0, 1.0)
          : 1.0;
    }

    return KeyboardListener(
      focusNode: _keyboardFocusNode,
      autofocus: true,
      onKeyEvent: _handleKeyEvent,
      child: Scaffold(
        body: SafeArea(
          child: FloatingEmojiOverlay(
            emojiStream: _duelController.floatingEmojis,
            child: Stack(
              children: [
                Center(
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 540),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 8),
                      child: Column(
                        children: [
                          // Top Navigation Bar
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              IconButton(
                                icon: const Icon(Icons.arrow_back),
                                onPressed: () {
                                  showDialog(
                                    context: context,
                                    builder: (ctx) => AlertDialog(
                                      title: const Text('Leave Duel?'),
                                      content: const Text(
                                          'Leaving will forfeit the duel match for you.'),
                                      actions: [
                                        TextButton(
                                          onPressed: () =>
                                              Navigator.of(ctx).pop(),
                                          child: const Text('Stay'),
                                        ),
                                        ElevatedButton(
                                          onPressed: () {
                                            Navigator.of(ctx).pop();
                                            Navigator.of(context).pop();
                                          },
                                          style: ElevatedButton.styleFrom(
                                            backgroundColor: AppColors.error,
                                          ),
                                          child: const Text('Forfeit & Leave'),
                                        ),
                                      ],
                                    ),
                                  );
                                },
                              ),
                              Row(
                                children: [
                                  const Icon(Icons.timer_outlined, size: 16),
                                  const SizedBox(width: 4),
                                  Text(
                                    _formatTime(gameState.elapsedSeconds),
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontFamily: 'monospace',
                                      fontSize: 15,
                                    ),
                                  ),
                                ],
                              ),
                              IconButton(
                                icon: const Icon(Icons.help_outline),
                                tooltip: 'Keyboard Controls',
                                onPressed: () {
                                  showDialog(
                                    context: context,
                                    builder: (ctx) => AlertDialog(
                                      title: const Text('Controls & Shortcuts'),
                                      content: const Text(
                                        '• Keys 1-9: Place number\n'
                                        '• Backspace/Delete: Clear cell\n'
                                        '• Arrow Keys: Navigate grid\n'
                                        '• P or N: Toggle Pencil mode\n'
                                        '• Direct Serverless P2P: Real-time sync with 0 server lag!',
                                      ),
                                      actions: [
                                        TextButton(
                                          onPressed: () =>
                                              Navigator.of(ctx).pop(),
                                          child: const Text('Got it'),
                                        ),
                                      ],
                                    ),
                                  );
                                },
                              ),
                            ],
                          ),

                          const SizedBox(height: 6),

                          // Race Bar Tracker
                          DuelRaceBarWidget(
                            localPlayerName: widget.localPlayerName,
                            localProgress: localProgress,
                            localScore: gameState.score,
                            localLives: gameState.lives,
                            opponent: opponent,
                            latencyMs: widget.p2pService.latencyMs,
                          ),

                          const SizedBox(height: 10),

                          // Quick Reactions Bar
                          _buildQuickReactionsBar(),

                          const SizedBox(height: 8),

                          // Main Board
                          Expanded(
                            child: Center(
                              child: AspectRatio(
                                aspectRatio: 1.0,
                                child: SudokuBoardWidget(
                                  state: gameState,
                                  onCellTap: (index) =>
                                      _localGame.selectCell(index),
                                  events: _localGame.events,
                                ),
                              ),
                            ),
                          ),

                          const SizedBox(height: 8),

                          // Action Buttons (Undo, Erase, Pencil)
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                            children: [
                              IconLabelButton(
                                icon: const Icon(Icons.undo_rounded),
                                label: 'Undo',
                                onPressed: _localGame.canUndo
                                    ? () => _localGame.undo()
                                    : null,
                              ),
                              IconLabelButton(
                                icon: const Icon(Icons.backspace_outlined),
                                label: 'Erase',
                                onPressed: gameState.selectedCell != null
                                    ? () => _localGame.erase()
                                    : null,
                              ),
                              IconLabelButton(
                                icon: Icon(
                                  Icons.edit_outlined,
                                  color: _pencilMode
                                      ? AppColors.primary
                                      : null,
                                ),
                                label: _pencilMode ? 'Pencil ON' : 'Pencil',
                                onPressed: () => setState(
                                    () => _pencilMode = !_pencilMode),
                              ),
                            ],
                          ),

                          const SizedBox(height: 10),

                          // Number Pad
                          NumberPadWidget(
                            enabled: gameState.isGameActive,
                            remainingCounts:
                                _remainingCounts(gameState.board),
                            onNumberTap: _handleNumberInput,
                            onErase: () => _localGame.erase(),
                          ),

                          const SizedBox(height: 6),
                        ],
                      ),
                    ),
                  ),
                ),

                // Post-Match Result Overlay
                if (result != DuelResult.inProgress)
                  _buildDuelResultOverlay(result, context),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildQuickReactionsBar() {
    final emojis = ['🔥', '👏', '⚡', '🤯', '😎', '🎯'];

    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: emojis.map((emoji) {
        return Padding(
          padding: const EdgeInsets.symmetric(horizontal: 4),
          child: InkWell(
            onTap: () => _duelController.sendReaction(emoji),
            borderRadius: BorderRadius.circular(16),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: Theme.of(context).brightness == Brightness.dark
                    ? Colors.white.withValues(alpha: 0.08)
                    : Colors.black.withValues(alpha: 0.04),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                emoji,
                style: const TextStyle(fontSize: 18),
              ),
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildDuelResultOverlay(DuelResult result, BuildContext context) {
    final isWon = result == DuelResult.won;
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      color: Colors.black.withValues(alpha: 0.75),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 420),
          child: Container(
            margin: const EdgeInsets.all(24),
            padding: const EdgeInsets.all(28),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF1B1E29) : Colors.white,
              borderRadius: BorderRadius.circular(24),
              boxShadow: [
                BoxShadow(
                  color: isWon
                      ? AppColors.success.withValues(alpha: 0.25)
                      : AppColors.error.withValues(alpha: 0.25),
                  blurRadius: 30,
                  spreadRadius: 4,
                ),
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  isWon
                      ? Icons.emoji_events_rounded
                      : Icons.sentiment_very_dissatisfied,
                  size: 72,
                  color: isWon ? AppColors.warning : AppColors.error,
                ),
                const SizedBox(height: 12),
                Text(
                  isWon ? 'DUEL VICTORY!' : 'DUEL DEFEAT',
                  style: theme.textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: isWon ? AppColors.success : AppColors.error,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  _duelController.duelEndReason ??
                      (isWon
                          ? 'You won the duel race!'
                          : 'Opponent won the duel.'),
                  style: theme.textTheme.bodyMedium,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 24),

                // Side-by-side match comparison
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: isDark
                        ? const Color(0xFF13151D)
                        : const Color(0xFFF1F3FA),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Row(
                    children: [
                      // You
                      Expanded(
                        child: Column(
                          children: [
                            Text(
                              widget.localPlayerName,
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 13,
                              ),
                            ),
                            const SizedBox(height: 6),
                            Text('Score: ${_localGame.state.score}',
                                style: const TextStyle(fontSize: 12)),
                            Text('Lives: ${_localGame.state.lives}/3',
                                style: const TextStyle(fontSize: 12)),
                            Text('Mistakes: ${_localGame.state.wrongCount}',
                                style: const TextStyle(fontSize: 12)),
                          ],
                        ),
                      ),
                      Container(
                        height: 50,
                        width: 1,
                        color: Colors.grey.withValues(alpha: 0.3),
                      ),
                      // Opponent
                      Expanded(
                        child: Column(
                          children: [
                            Text(
                              _duelController.opponent.name,
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 13,
                              ),
                            ),
                            const SizedBox(height: 6),
                            Text('Score: ${_duelController.opponent.score}',
                                style: const TextStyle(fontSize: 12)),
                            Text('Lives: ${_duelController.opponent.lives}/3',
                                style: const TextStyle(fontSize: 12)),
                            Text('Mistakes: ${_duelController.opponent.mistakes}',
                                style: const TextStyle(fontSize: 12)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 24),

                // Buttons
                if (widget.p2pService.isHost)
                  ElevatedButton.icon(
                    onPressed: _handleRematch,
                    icon: const Icon(Icons.refresh),
                    label: const Text('Play Rematch (New Puzzle)'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      minimumSize: const Size(double.infinity, 46),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  )
                else
                  Text(
                    'Waiting for host to start rematch...',
                    style: theme.textTheme.bodySmall,
                  ),

                const SizedBox(height: 10),

                OutlinedButton(
                  onPressed: () {
                    Navigator.of(context).pop();
                  },
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size(double.infinity, 44),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: const Text('Exit to Home'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
