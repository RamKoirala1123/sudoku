import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../../../core/services/web_navigation_service.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../settings/presentation/settings_controller.dart';
import '../../../sudoku/domain/entities/difficulty.dart';
import '../../../sudoku/domain/entities/game_status.dart';
import '../../../sudoku/domain/game/sudoku_game_controller.dart';
import '../../../sudoku/presentation/screens/home_screen.dart';
import '../../../sudoku/presentation/widgets/icon_label_button.dart';
import '../../../sudoku/presentation/widgets/number_pad_widget.dart';
import '../../../sudoku/presentation/widgets/sudoku_board_widget.dart';
import '../../domain/game_session_service.dart';
import '../../domain/mistake_rule.dart';
import '../../domain/multiplayer_room_controller.dart';
import '../../domain/p2p_room_service.dart';
import '../../domain/player_progress.dart';
import '../widgets/floating_emoji_overlay.dart';
import '../widgets/multiplayer_race_leaderboard_widget.dart';

class MultiplayerRoomGameScreen extends StatefulWidget {
  final P2PRoomService roomService;
  final String localPlayerName;
  final bool isFreshStart;

  const MultiplayerRoomGameScreen({
    super.key,
    required this.roomService,
    required this.localPlayerName,
    this.isFreshStart = true,
  });

  @override
  State<MultiplayerRoomGameScreen> createState() =>
      _MultiplayerRoomGameScreenState();
}

class _MultiplayerRoomGameScreenState extends State<MultiplayerRoomGameScreen> {
  late final SudokuGameController _localGame;
  late final MultiplayerRoomController _roomController;
  final FocusNode _keyboardFocusNode = FocusNode();
  bool _pencilMode = false;
  bool _isSpectating = false;

  int _countdown = 3;
  bool _isCountingDown = false;
  Timer? _countdownTimer;

  @override
  void initState() {
    super.initState();
    final settings = context.read<SettingsController>().settings;
    final difficulty =
        widget.roomService.puzzle?.difficulty ?? Difficulty.medium;

    _localGame = SudokuGameController(
      difficulty: difficulty,
      showMistakes: settings.showMistakes,
      mistakeRule: widget.roomService.mistakeRule,
    );

    _roomController = MultiplayerRoomController(
      localGame: _localGame,
      roomService: widget.roomService,
    );

    _roomController.addListener(_onRoomStateChanged);

    if (widget.roomService.roomCode.isNotEmpty) {
      WebNavigationService.setRoomUrl(widget.roomService.roomCode);
    }

    if (widget.isFreshStart) {
      _startCountdown();
    } else {
      // Restore saved session on browser refresh if available
      GameSessionService.loadSession().then((session) {
        if (session != null &&
            session.isMultiplayer &&
            session.roomCode == widget.roomService.roomCode &&
            mounted) {
          _localGame.restoreGameState(
            puzzle: session.puzzle,
            board: session.board,
            candidates: session.candidates,
            lives: session.lives,
            score: session.score,
            elapsedSeconds: session.elapsedSeconds,
          );
        }
      });
    }
  }

  void _startCountdown() {
    setState(() {
      _countdown = 3;
      _isCountingDown = true;
    });

    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      if (_countdown > 1) {
        setState(() => _countdown--);
      } else if (_countdown == 1) {
        setState(() => _countdown = 0); // "GO!"
        Future.delayed(const Duration(milliseconds: 700), () {
          if (mounted) {
            setState(() => _isCountingDown = false);
          }
        });
        timer.cancel();
      }
    });
  }

  void _onRoomStateChanged() {
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    _countdownTimer?.cancel();
    WebNavigationService.clearRoomUrl();
    _keyboardFocusNode.dispose();
    _roomController.removeListener(_onRoomStateChanged);
    _roomController.dispose();
    _localGame.dispose();
    widget.roomService.dispose();
    super.dispose();
  }

  void _handleKeyEvent(KeyEvent event) {
    if (event is! KeyDownEvent || _isCountingDown) return;

    final state = _localGame.state;
    final selected = state.selectedCell;

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
    if (_isCountingDown) return;
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

  void _leaveRoomAndGoHome() {
    _countdownTimer?.cancel();
    WebNavigationService.clearRoomUrl();
    GameSessionService.clearSession();
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const HomeScreen()),
      (route) => false,
    );
  }

  void _showLeaveConfirmation() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Leave Room?'),
        content: const Text('Leaving will exit the multiplayer race.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Stay'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.of(ctx).pop();
              _leaveRoomAndGoHome();
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.error,
            ),
            child: const Text('Leave Room'),
          ),
        ],
      ),
    );
  }

  void _showHelpDialog() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Keyboard Shortcuts'),
        content: const Text(
          '• Keys 1-9: Place number\n'
          '• Backspace/Delete: Clear cell\n'
          '• Arrow Keys: Navigate grid\n'
          '• P or N: Toggle Pencil mode\n'
          '• P2P Multi-Opponent: Sub-30ms live sync with all players!',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Got it'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final gameState = _localGame.state;
    final players = _roomController.leaderboard;
    final winner = _roomController.winner;
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return KeyboardListener(
      focusNode: _keyboardFocusNode,
      autofocus: true,
      onKeyEvent: _handleKeyEvent,
      child: Scaffold(
        body: SafeArea(
          child: FloatingEmojiOverlay(
            emojiStream:
                _roomController.emojiStream.map((e) => e['emoji'] as String),
            child: Stack(
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
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              // Top Navigation & Stats Bar (Sudoku.com style)
                              _buildTopBar(gameState, isWideScreen),

                              if (_isSpectating) ...[
                                const SizedBox(height: 10),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 14, vertical: 8),
                                  decoration: BoxDecoration(
                                    color: AppColors.error.withValues(alpha: 0.12),
                                    borderRadius: BorderRadius.circular(10),
                                    border: Border.all(
                                      color: AppColors.error.withValues(alpha: 0.35),
                                    ),
                                  ),
                                  child: Row(
                                    children: [
                                      const Icon(Icons.remove_red_eye_outlined,
                                          size: 16, color: AppColors.error),
                                      const SizedBox(width: 8),
                                      const Expanded(
                                        child: Text(
                                          'Spectating Match (Knocked Out by Mistakes)',
                                          style: TextStyle(
                                            color: AppColors.error,
                                            fontWeight: FontWeight.bold,
                                            fontSize: 12,
                                          ),
                                        ),
                                      ),
                                      TextButton(
                                        onPressed: _leaveRoomAndGoHome,
                                        style: TextButton.styleFrom(
                                          visualDensity: VisualDensity.compact,
                                          foregroundColor: AppColors.error,
                                        ),
                                        child: const Text('Leave'),
                                      ),
                                    ],
                                  ),
                                ),
                              ],

                              const SizedBox(height: 14),

                              // Main Game Area (BIG Board + Side Panel or Mobile Stack)
                              if (isWideScreen)
                                _buildWideDesktopLayout(gameState, isDark)
                              else
                                _buildMobileLayout(gameState, isDark),

                              const SizedBox(height: 24),

                              // ===============================================
                              // PLAYERS STATS & RACE LEADERBOARD AT THE BOTTOM
                              // ===============================================
                              MultiplayerRaceLeaderboardWidget(
                                players: players,
                                localPlayerId: widget.roomService.localPlayerId,
                              ),

                              const SizedBox(height: 16),
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                ),

                // Winner / Game Finished Overlay
                if (winner != null || _roomController.allPlayersDefeated)
                  _buildGameOverOverlay(winner, players,
                      _roomController.allPlayersDefeated, context)
                else if (gameState.status == GameStatus.lost && !_isSpectating)
                  _buildKnockedOutOverlay(context, players),

                // 3 2 1 Countdown Overlay
                if (_isCountingDown)
                  _buildCountdownOverlay(isDark),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTopBar(dynamic gameState, bool isWideScreen) {
    final diffLabel = widget.roomService.puzzle?.difficulty.label ?? 'Medium';

    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        // Left: Back button + Difficulty
        Row(
          children: [
            IconButton(
              icon: const Icon(Icons.arrow_back),
              tooltip: 'Leave Room',
              onPressed: _showLeaveConfirmation,
            ),
            const SizedBox(width: 4),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                diffLabel,
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 13,
                  color: AppColors.primary,
                ),
              ),
            ),
          ],
        ),

        // Center / Info (Mistakes, Score, Timer)
        Row(
          children: [
            // Mistakes / Rule Display
            if (widget.roomService.mistakeRule == MistakeRule.casual) ...[
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: (gameState.wrongCount > 0 ? AppColors.warning : AppColors.primary)
                      .withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.warning_amber_rounded,
                        size: 15,
                        color: gameState.wrongCount > 0
                            ? AppColors.warning
                            : AppColors.primary),
                    const SizedBox(width: 4),
                    Text(
                      'Mistakes: ${gameState.wrongCount} (+${gameState.wrongCount * 30}s)',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: gameState.wrongCount > 0
                            ? AppColors.warning
                            : AppColors.primary,
                      ),
                    ),
                  ],
                ),
              ),
            ] else ...[
              Row(
                children: [
                  const Text('Mistakes: ',
                      style:
                          TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                  ...List.generate(widget.roomService.mistakeRule.initialLives, (i) {
                    final isAlive = i < gameState.lives;
                    return Icon(
                      isAlive ? Icons.favorite : Icons.favorite_border,
                      size: 16,
                      color: isAlive ? AppColors.heartFull : Colors.grey,
                    );
                  }),
                ],
              ),
            ],
            const SizedBox(width: 14),
            // Score
            Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                'Score: ${gameState.score}',
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 13,
                  color: AppColors.primary,
                ),
              ),
            ),
            const SizedBox(width: 14),
            // Timer
            Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(
                children: [
                  const Icon(Icons.timer_outlined,
                      size: 16, color: AppColors.primary),
                  const SizedBox(width: 4),
                  Text(
                    _formatTime(gameState.elapsedSeconds),
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontFamily: 'monospace',
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),

        // Right: Audio Mute/Unmute + Theme Dark/Light + Keyboard Shortcuts
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Consumer<SettingsController>(
              builder: (context, settingsController, _) {
                final soundOn = settingsController.settings.soundEnabled;
                return IconButton(
                  icon: Icon(
                    soundOn
                        ? Icons.volume_up_rounded
                        : Icons.volume_off_rounded,
                    size: 21,
                  ),
                  tooltip: soundOn ? 'Mute Sound' : 'Unmute Sound',
                  onPressed: () =>
                      settingsController.setSoundEnabled(!soundOn),
                );
              },
            ),
            Consumer<SettingsController>(
              builder: (context, settingsController, _) {
                final isDarkTheme = settingsController.settings.darkMode;
                return IconButton(
                  icon: Icon(
                    isDarkTheme
                        ? Icons.light_mode_rounded
                        : Icons.dark_mode_rounded,
                    size: 21,
                  ),
                  tooltip: isDarkTheme
                      ? 'Switch to Light Theme'
                      : 'Switch to Dark Theme',
                  onPressed: () =>
                      settingsController.setDarkMode(!isDarkTheme),
                );
              },
            ),
            IconButton(
              icon: const Icon(Icons.help_outline, size: 21),
              tooltip: 'Keyboard Shortcuts',
              onPressed: _showHelpDialog,
            ),
          ],
        ),
      ],
    );
  }

  /// Sudoku.com-style Desktop Layout: HUGE board on the left, side controls on the right
  Widget _buildWideDesktopLayout(dynamic gameState, bool isDark) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Sudoku Board (Left side - Sudoku.com proportioned)
        Expanded(
          flex: 6,
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(
                maxWidth: 490,
                maxHeight: 490,
              ),
              child: AspectRatio(
                aspectRatio: 1.0,
                child: SudokuBoardWidget(
                  state: gameState,
                  onCellTap: (index) => _localGame.selectCell(index),
                  events: _localGame.events,
                ),
              ),
            ),
          ),
        ),

        const SizedBox(width: 24),

        // Side Controls (Right side - Just like Sudoku.com)
        Expanded(
          flex: 4,
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 290),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Tool Actions (Undo, Erase, Pencil)
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    IconLabelButton(
                      icon: const Icon(Icons.undo_rounded, size: 24),
                      label: 'Undo',
                      onPressed:
                          _localGame.canUndo ? () => _localGame.undo() : null,
                    ),
                    IconLabelButton(
                      icon: const Icon(Icons.backspace_outlined, size: 24),
                      label: 'Erase',
                      onPressed: gameState.selectedCell != null
                          ? () => _localGame.erase()
                          : null,
                    ),
                    IconLabelButton(
                      icon: Icon(
                        Icons.edit_outlined,
                        size: 24,
                        color: _pencilMode ? AppColors.primary : null,
                      ),
                      label: _pencilMode ? 'Pencil ON' : 'Pencil',
                      onPressed: () =>
                          setState(() => _pencilMode = !_pencilMode),
                    ),
                  ],
                ),

                const SizedBox(height: 20),

                // 3x3 Keypad (Just like Sudoku.com Desktop!)
                NumberPadWidget(
                  enabled: gameState.isGameActive && !_isCountingDown,
                  isGrid: true,
                  remainingCounts: _remainingCounts(gameState.board),
                  onNumberTap: _handleNumberInput,
                  onErase: () => _localGame.erase(),
                ),

                const SizedBox(height: 18),

                // Quick Reactions Bar
                _buildQuickReactionsBar(),
              ],
            ),
          ),
        ),
      ],
    );
  }

  /// Mobile / Narrow Screen Layout: Large board filling width + bottom controls
  Widget _buildMobileLayout(dynamic gameState, bool isDark) {
    return Column(
      children: [
        // Top Mini Stats Bar (Mistakes & Score)
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  const Text('Mistakes: ',
                      style:
                          TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                  ...List.generate(3, (i) {
                    final isAlive = i < gameState.lives;
                    return Icon(
                      isAlive ? Icons.favorite : Icons.favorite_border,
                      size: 15,
                      color: isAlive ? AppColors.heartFull : Colors.grey,
                    );
                  }),
                ],
              ),
              Text(
                'Score: ${gameState.score}',
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 13,
                  color: AppColors.primary,
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 8),

        // Sudoku Board
        ConstrainedBox(
          constraints: const BoxConstraints(
            maxWidth: 480,
            maxHeight: 480,
          ),
          child: AspectRatio(
            aspectRatio: 1.0,
            child: SudokuBoardWidget(
              state: gameState,
              onCellTap: (index) => _localGame.selectCell(index),
              events: _localGame.events,
            ),
          ),
        ),

        const SizedBox(height: 12),

        // Action Buttons (Undo, Erase, Pencil)
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
          children: [
            IconLabelButton(
              icon: const Icon(Icons.undo_rounded),
              label: 'Undo',
              onPressed:
                  _localGame.canUndo ? () => _localGame.undo() : null,
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
                color: _pencilMode ? AppColors.primary : null,
              ),
              label: _pencilMode ? 'Pencil ON' : 'Pencil',
              onPressed: () => setState(() => _pencilMode = !_pencilMode),
            ),
          ],
        ),

        const SizedBox(height: 12),

        // Number Pad (Horizontal Row on Mobile)
        NumberPadWidget(
          enabled: gameState.isGameActive && !_isCountingDown,
          isGrid: false,
          remainingCounts: _remainingCounts(gameState.board),
          onNumberTap: _handleNumberInput,
          onErase: () => _localGame.erase(),
        ),

        const SizedBox(height: 8),

        // Quick Reactions Bar
        _buildQuickReactionsBar(),
      ],
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
            onTap: () => _roomController.sendReaction(emoji),
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

  Widget _buildGameOverOverlay(PlayerProgress? winner,
      List<PlayerProgress> standings, bool allDefeated, BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final isLocalWinner = winner?.id == widget.roomService.localPlayerId;

    return Container(
      color: Colors.black.withValues(alpha: 0.8),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 440),
          child: Container(
            margin: const EdgeInsets.all(24),
            padding: const EdgeInsets.all(26),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF1B1E29) : Colors.white,
              borderRadius: BorderRadius.circular(24),
              boxShadow: [
                BoxShadow(
                  color: allDefeated
                      ? AppColors.error.withValues(alpha: 0.35)
                      : (isLocalWinner
                          ? AppColors.success.withValues(alpha: 0.3)
                          : AppColors.primary.withValues(alpha: 0.3)),
                  blurRadius: 30,
                  spreadRadius: 4,
                ),
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  allDefeated
                      ? Icons.heart_broken_rounded
                      : Icons.emoji_events_rounded,
                  size: 68,
                  color: allDefeated ? AppColors.error : AppColors.warning,
                ),
                const SizedBox(height: 10),
                Text(
                  allDefeated
                      ? 'ALL PLAYERS KNOCKED OUT! 💀'
                      : (isLocalWinner
                          ? 'YOU WON 1ST PLACE! 🏆'
                          : '${winner?.name ?? "Player"} WON! 🏆'),
                  style: theme.textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: allDefeated
                        ? AppColors.error
                        : (isLocalWinner
                            ? AppColors.success
                            : AppColors.primary),
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 6),
                Text(
                  allDefeated
                      ? 'All players made 3 mistakes and ran out of lives! The match has concluded.'
                      : (isLocalWinner
                          ? 'You solved the puzzle before everyone else!'
                          : '${winner?.name ?? "Winner"} finished first! Check final standings below:'),
                  style: theme.textTheme.bodyMedium,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 20),

                // Final Standings Podium
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: isDark
                        ? const Color(0xFF13151D)
                        : const Color(0xFFF1F3FA),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Column(
                    children: standings.map((p) {
                      String badge = '#${p.rank}';
                      if (p.rank == 1) badge = '🥇';
                      if (p.rank == 2) badge = '🥈';
                      if (p.rank == 3) badge = '🥉';

                      return Padding(
                        padding: const EdgeInsets.symmetric(vertical: 4),
                        child: Row(
                          children: [
                            SizedBox(width: 24, child: Text(badge)),
                            Container(
                              width: 12,
                              height: 12,
                              decoration: BoxDecoration(
                                color: p.color,
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                p.id == widget.roomService.localPlayerId
                                    ? '${p.name} (You)'
                                    : p.name,
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 13,
                                ),
                              ),
                            ),
                            Text(
                              '${(p.progressPercent * 100).toInt()}% • Score: ${p.score}',
                              style: const TextStyle(fontSize: 12),
                            ),
                          ],
                        ),
                      );
                    }).toList(),
                  ),
                ),

                const SizedBox(height: 24),

                ElevatedButton(
                  onPressed: _leaveRoomAndGoHome,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    minimumSize: const Size(double.infinity, 44),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: const Text('Back to Home'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildCountdownOverlay(bool isDark) {
    final text = _countdown > 0 ? '$_countdown' : 'GO!';
    final isGo = _countdown == 0;

    return Container(
      color: Colors.black.withValues(alpha: 0.7),
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 130,
              height: 130,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: isDark ? const Color(0xFF1E2235) : Colors.white,
                boxShadow: [
                  BoxShadow(
                    color: (isGo ? AppColors.success : AppColors.primary)
                        .withValues(alpha: 0.5),
                    blurRadius: 36,
                    spreadRadius: 6,
                  ),
                ],
                border: Border.all(
                  color: isGo ? AppColors.success : AppColors.primary,
                  width: 4,
                ),
              ),
              child: Center(
                child: AnimatedSwitcher(
                  duration: const Duration(milliseconds: 250),
                  transitionBuilder: (child, anim) => ScaleTransition(
                    scale: anim,
                    child: child,
                  ),
                  child: Text(
                    text,
                    key: ValueKey(text),
                    style: TextStyle(
                      fontSize: isGo ? 48 : 64,
                      fontWeight: FontWeight.w900,
                      color: isGo ? AppColors.success : AppColors.primary,
                      letterSpacing: 1.5,
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 24),
            Text(
              isGo ? 'RACE STARTED! ⚡' : 'GET READY! 🏁',
              style: const TextStyle(
                color: Colors.white,
                fontSize: 22,
                fontWeight: FontWeight.bold,
                letterSpacing: 2.0,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              isGo
                  ? 'First to finish wins the match!'
                  : 'Starting for all players simultaneously',
              style: TextStyle(
                color: Colors.white.withValues(alpha: 0.85),
                fontSize: 14,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildKnockedOutOverlay(
      BuildContext context, List<PlayerProgress> players) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final mistakeRule = widget.roomService.mistakeRule;
    final mistakeCount = mistakeRule == MistakeRule.hardcore ? 1 : 3;

    return Container(
      color: Colors.black.withValues(alpha: 0.8),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 420),
          child: Container(
            margin: const EdgeInsets.all(24),
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 28),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF1E2235) : Colors.white,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(
                color: AppColors.error.withValues(alpha: 0.5),
                width: 2,
              ),
              boxShadow: [
                BoxShadow(
                  color: AppColors.error.withValues(alpha: 0.25),
                  blurRadius: 30,
                  spreadRadius: 4,
                ),
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.error.withValues(alpha: 0.15),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.heart_broken_rounded,
                    size: 64,
                    color: AppColors.error,
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  'GAME OVER',
                  style: theme.textTheme.headlineMedium?.copyWith(
                    fontWeight: FontWeight.w900,
                    letterSpacing: 2,
                    color: AppColors.error,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  'You made $mistakeCount mistake${mistakeCount > 1 ? "s" : ""} and were knocked out!',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'The match is still running for other players.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 12,
                    color: isDark ? Colors.white60 : Colors.black54,
                  ),
                ),
                const SizedBox(height: 20),

                // Live standings preview
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: isDark
                        ? const Color(0xFF13151D)
                        : const Color(0xFFF1F3FA),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Match Standings:',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 8),
                      ...players.map((p) {
                        final isLocal =
                            p.id == widget.roomService.localPlayerId;
                        return Padding(
                          padding: const EdgeInsets.symmetric(vertical: 3),
                          child: Row(
                            children: [
                              Container(
                                width: 10,
                                height: 10,
                                decoration: BoxDecoration(
                                  color: p.color,
                                  shape: BoxShape.circle,
                                ),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  isLocal
                                      ? '${p.name} (Knocked Out)'
                                      : p.name,
                                  style: TextStyle(
                                    fontWeight: isLocal
                                        ? FontWeight.bold
                                        : FontWeight.normal,
                                    fontSize: 12,
                                    color: isLocal ? AppColors.error : null,
                                  ),
                                ),
                              ),
                              Text(
                                '${(p.progressPercent * 100).toInt()}%',
                                style: const TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                        );
                      }),
                    ],
                  ),
                ),

                const SizedBox(height: 24),

                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () {
                          setState(() => _isSpectating = true);
                        },
                        icon: const Icon(Icons.remove_red_eye_outlined,
                            size: 18),
                        label: const Text('Spectate'),
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: _leaveRoomAndGoHome,
                        icon: const Icon(Icons.exit_to_app, size: 18),
                        label: const Text('Leave Room'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.error,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
