import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../../core/services/web_navigation_service.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../multiplayer/domain/game_session_service.dart';
import '../../../multiplayer/domain/p2p_room_service.dart';
import '../../../multiplayer/presentation/screens/join_duel_screen.dart';
import '../../../multiplayer/presentation/screens/multiplayer_hub_screen.dart';
import '../../../multiplayer/presentation/screens/multiplayer_room_game_screen.dart';
import '../../../settings/presentation/screens/settings_screen.dart';
import '../../../statistics/presentation/statistics_controller.dart';
import '../../domain/entities/difficulty.dart';
import '../widgets/difficulty_button.dart';
import '../widgets/stats_summary_card.dart';
import 'game_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  SavedGameSession? _activeSession;

  @override
  void initState() {
    super.initState();
    _handleInitialRoutingAndSession();
  }

  Future<void> _handleInitialRoutingAndSession() async {
    final session = await GameSessionService.loadSession();
    final urlRoomCode = WebNavigationService.extractRoomCode(Uri.base);

    if (!mounted) return;
    setState(() => _activeSession = session);

    // 1. Auto-Resume on Page Reload:
    // If the page was reloaded while in an active multiplayer match (e.g. #room=123456)
    // immediately resume playing with zero clicks needed!
    if (session != null &&
        session.isMultiplayer &&
        (urlRoomCode == null || urlRoomCode == session.roomCode)) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) {
          _resumeSession(session);
        }
      });
      return;
    }

    // 2. Direct 1-Click Invite Link:
    // If user opened an invite URL (e.g. #join=123456 or #room=123456) and is not already
    // in that session, launch JoinDuelScreen and auto-connect with zero typing!
    if (urlRoomCode != null && urlRoomCode.isNotEmpty) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) {
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) => JoinDuelScreen(
                playerName: 'Player',
                initialInviteCode: urlRoomCode,
              ),
            ),
          ).then((_) => _checkActiveSession());
        }
      });
    }
  }

  Future<void> _checkActiveSession() async {
    final session = await GameSessionService.loadSession();
    if (mounted) {
      setState(() => _activeSession = session);
    }
  }

  void _startGame(BuildContext context, Difficulty difficulty) {
    Navigator.of(context)
        .push(
          MaterialPageRoute(builder: (_) => GameScreen(difficulty: difficulty)),
        )
        .then((_) => _checkActiveSession());
  }

  void _openMultiplayer(BuildContext context) {
    Navigator.of(context)
        .push(
          MaterialPageRoute(builder: (_) => const MultiplayerHubScreen()),
        )
        .then((_) => _checkActiveSession());
  }

  void _resumeSession(SavedGameSession session) {
    if (!session.isMultiplayer) {
      Navigator.of(context)
          .push(
            MaterialPageRoute(
              builder: (_) => GameScreen(
                difficulty: session.difficulty,
                restoredSession: session,
              ),
            ),
          )
          .then((_) => _checkActiveSession());
    } else {
      final roomService = P2PRoomService();
      if (session.role == 'host') {
        roomService.initializeHost(
          hostName: session.localPlayerName,
          puzzle: session.puzzle,
          roomCode: session.roomCode,
        );
        roomService.startMatch();
      } else {
        roomService.setPuzzle(session.puzzle);
        if (session.roomCode != null) {
          roomService.joinWith6DigitCode(
            roomCode: session.roomCode!,
            guestName: session.localPlayerName,
          );
        }
      }

      Navigator.of(context)
          .push(
            MaterialPageRoute(
              builder: (_) => MultiplayerRoomGameScreen(
                roomService: roomService,
                localPlayerName: session.localPlayerName,
                isFreshStart: false,
              ),
            ),
          )
          .then((_) => _checkActiveSession());
    }
  }

  Future<void> _discardSession() async {
    await GameSessionService.clearSession();
    if (mounted) {
      setState(() => _activeSession = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final statisticsController = context.watch<StatisticsController>();
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 520),
            child: ListView(
              padding: const EdgeInsets.fromLTRB(20, 24, 20, 32),
              children: [
                // Header
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Sudoku', style: theme.textTheme.displaySmall),
                        Text(
                          'Duel',
                          style: theme.textTheme.displaySmall
                              ?.copyWith(color: theme.colorScheme.primary),
                        ),
                      ],
                    ),
                    IconButton(
                      icon: const Icon(Icons.settings_outlined),
                      iconSize: 26,
                      onPressed: () => Navigator.of(context).push(
                        MaterialPageRoute(
                            builder: (_) => const SettingsScreen()),
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 24),

                // Active Game Resume Banner (Shown after browser refresh or saved session)
                if (_activeSession != null)
                  _buildActiveSessionBanner(_activeSession!, isDark, theme),

                // 1v1 P2P Multiplayer Card
                InkWell(
                  onTap: () => _openMultiplayer(context),
                  borderRadius: BorderRadius.circular(20),
                  child: Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: isDark
                            ? [
                                const Color(0xFF38437D),
                                const Color(0xFF272F55),
                              ]
                            : [
                                AppColors.primary,
                                const Color(0xFF7585FF),
                              ],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.primary.withValues(alpha: 0.3),
                          blurRadius: 16,
                          offset: const Offset(0, 6),
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: const Icon(
                            Icons.groups_rounded,
                            color: Colors.white,
                            size: 28,
                          ),
                        ),
                        const SizedBox(width: 16),
                        const Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Multiplayer',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              SizedBox(height: 2),
                              Text(
                                'Play live Sudoku with friends',
                                style: TextStyle(
                                  color: Colors.white70,
                                  fontSize: 13,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const Icon(
                          Icons.arrow_forward_ios_rounded,
                          color: Colors.white70,
                          size: 18,
                        ),
                      ],
                    ),
                  ),
                ),

                const SizedBox(height: 28),

                // Solo Practice Header
                Row(
                  children: [
                    const Icon(Icons.person_outline, size: 20),
                    const SizedBox(width: 8),
                    Text('Solo Practice', style: theme.textTheme.titleLarge),
                  ],
                ),
                const SizedBox(height: 12),

                ...Difficulty.values.map(
                  (d) => Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: DifficultyButton(
                      difficulty: d,
                      onTap: () => _startGame(context, d),
                    ),
                  ),
                ),

                const SizedBox(height: 16),

                // Stats Summary
                statisticsController.isLoaded
                    ? StatsSummaryCard(
                        statistics: statisticsController.statistics)
                    : const Padding(
                        padding: EdgeInsets.symmetric(vertical: 24),
                        child: Center(child: CircularProgressIndicator()),
                      ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildActiveSessionBanner(
    SavedGameSession session,
    bool isDark,
    ThemeData theme,
  ) {
    final modeTitle = session.isMultiplayer
        ? 'Room #${session.roomCode ?? "P2P"}'
        : 'Solo Practice (${session.difficulty.label})';

    final minutes = session.elapsedSeconds ~/ 60;
    final seconds = session.elapsedSeconds % 60;
    final timeStr =
        '${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';

    return Container(
      margin: const EdgeInsets.only(bottom: 20),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF222B45) : const Color(0xFFEFF4FF),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: AppColors.primary.withValues(alpha: 0.6),
          width: 2,
        ),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.15),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.primary,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.replay_rounded, size: 14, color: Colors.white),
                    SizedBox(width: 4),
                    Text(
                      'ACTIVE GAME IN PROGRESS',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ],
                ),
              ),
              IconButton(
                visualDensity: VisualDensity.compact,
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
                icon: const Icon(Icons.close, size: 20),
                tooltip: 'Discard saved match',
                onPressed: _discardSession,
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            modeTitle,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 4),
          Row(
            children: [
              Text(
                'Mistakes: ',
                style: TextStyle(
                  fontSize: 12,
                  color: isDark ? Colors.white70 : Colors.black87,
                ),
              ),
              ...List.generate(3, (i) {
                final isAlive = i < session.lives;
                return Icon(
                  isAlive ? Icons.favorite : Icons.favorite_border,
                  size: 14,
                  color: isAlive ? AppColors.heartFull : Colors.grey,
                );
              }),
              const SizedBox(width: 14),
              Text(
                'Score: ${session.score}',
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(width: 14),
              Text(
                '⏱ $timeStr',
                style: TextStyle(
                  fontSize: 12,
                  color: isDark ? Colors.white70 : Colors.black54,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: () => _resumeSession(session),
                  icon: const Icon(Icons.play_arrow_rounded),
                  label: const Text('Resume Game'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              OutlinedButton(
                onPressed: _discardSession,
                style: OutlinedButton.styleFrom(
                  padding:
                      const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: const Text('Discard'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
