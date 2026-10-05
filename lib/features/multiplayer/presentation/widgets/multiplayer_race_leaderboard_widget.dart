import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../domain/player_progress.dart';

class MultiplayerRaceLeaderboardWidget extends StatefulWidget {
  final List<PlayerProgress> players;
  final String localPlayerId;

  const MultiplayerRaceLeaderboardWidget({
    super.key,
    required this.players,
    required this.localPlayerId,
  });

  @override
  State<MultiplayerRaceLeaderboardWidget> createState() =>
      _MultiplayerRaceLeaderboardWidgetState();
}

class _MultiplayerRaceLeaderboardWidgetState
    extends State<MultiplayerRaceLeaderboardWidget> {
  bool _isExpanded = false;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final sortedPlayers = List<PlayerProgress>.from(widget.players)
      ..sort((a, b) => a.rank.compareTo(b.rank));

    final localPlayer = sortedPlayers.firstWhere(
      (p) => p.id == widget.localPlayerId,
      orElse: () => sortedPlayers.isNotEmpty
          ? sortedPlayers.first
          : const PlayerProgress(id: '', name: 'You'),
    );

    // If more than 3 players, can toggle between top 3 + you and full list
    final displayedPlayers = (_isExpanded || sortedPlayers.length <= 3)
        ? sortedPlayers
        : sortedPlayers.take(3).toList();

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E2233) : const Color(0xFFF1F3FA),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark
              ? Colors.white.withValues(alpha: 0.08)
              : Colors.black.withValues(alpha: 0.06),
        ),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Header Bar
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  const Icon(Icons.leaderboard, size: 16, color: AppColors.primary),
                  const SizedBox(width: 6),
                  Text(
                    '${sortedPlayers.length} Players Racing',
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: localPlayer.color.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      'Your Rank: #${localPlayer.rank}',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: localPlayer.color,
                      ),
                    ),
                  ),
                  if (sortedPlayers.length > 3) ...[
                    const SizedBox(width: 4),
                    InkWell(
                      onTap: () => setState(() => _isExpanded = !_isExpanded),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 4),
                        child: Icon(
                          _isExpanded
                              ? Icons.keyboard_arrow_up
                              : Icons.keyboard_arrow_down,
                          size: 18,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ],
          ),

          const SizedBox(height: 8),

          // Player Race Cards/Rows (Responsive: horizontal cards on wide screen, vertical list on mobile)
          LayoutBuilder(
            builder: (context, constraints) {
              final isWide = constraints.maxWidth >= 600;
              if (isWide) {
                final colCount = constraints.maxWidth >= 950
                    ? 4
                    : (constraints.maxWidth >= 720 ? 3 : 2);
                final itemWidth =
                    (constraints.maxWidth - (colCount - 1) * 10) / colCount;
                return Wrap(
                  spacing: 10,
                  runSpacing: 8,
                  children: displayedPlayers.map((player) {
                    final isLocal = player.id == widget.localPlayerId;
                    return SizedBox(
                      width: itemWidth,
                      child: _buildPlayerTrackCard(player, isLocal, isDark),
                    );
                  }).toList(),
                );
              }

              return Column(
                children: displayedPlayers.map((player) {
                  final isLocal = player.id == widget.localPlayerId;
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 6),
                    child: _buildPlayerTrackRow(player, isLocal, isDark),
                  );
                }).toList(),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildPlayerTrackCard(
      PlayerProgress player, bool isLocal, bool isDark) {
    final percentInt = (player.progressPercent * 100).toInt();

    String rankBadge;
    if (player.rank == 1) {
      rankBadge = '🥇';
    } else if (player.rank == 2) {
      rankBadge = '🥈';
    } else if (player.rank == 3) {
      rankBadge = '🥉';
    } else {
      rankBadge = '#${player.rank}';
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: isLocal
            ? player.color.withValues(alpha: isDark ? 0.22 : 0.12)
            : (isDark ? const Color(0xFF242838) : Colors.white),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: isLocal
              ? player.color.withValues(alpha: 0.6)
              : (isDark
                  ? Colors.white.withValues(alpha: 0.08)
                  : Colors.black.withValues(alpha: 0.06)),
          width: isLocal ? 1.5 : 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Text(rankBadge, style: const TextStyle(fontSize: 14)),
              const SizedBox(width: 6),
              Container(
                width: 20,
                height: 20,
                decoration: BoxDecoration(
                  color: player.color,
                  shape: BoxShape.circle,
                ),
                child: Center(
                  child: Text(
                    player.name.isNotEmpty ? player.name[0].toUpperCase() : 'P',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  player.name,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: isLocal ? FontWeight.bold : FontWeight.w600,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              if (isLocal) ...[
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                  decoration: BoxDecoration(
                    color: player.color,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: const Text(
                    'YOU',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 8,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                const SizedBox(width: 4),
              ],
            ],
          ),
          const SizedBox(height: 6),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _buildMiniLives(player.lives),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                decoration: BoxDecoration(
                  color: player.color.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  '${player.score} pts',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    color: player.color,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              Expanded(
                child: Stack(
                  children: [
                    Container(
                      height: 8,
                      decoration: BoxDecoration(
                        color: isDark
                            ? Colors.white.withValues(alpha: 0.08)
                            : Colors.black.withValues(alpha: 0.06),
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ),
                    LayoutBuilder(
                      builder: (context, constraints) {
                        final fillWidth = constraints.maxWidth *
                            player.progressPercent.clamp(0.0, 1.0);
                        return TweenAnimationBuilder<double>(
                          tween: Tween<double>(begin: 0, end: fillWidth),
                          duration: const Duration(milliseconds: 300),
                          curve: Curves.easeOutQuad,
                          builder: (context, width, _) {
                            return Container(
                              width: width,
                              height: 8,
                              decoration: BoxDecoration(
                                gradient: LinearGradient(
                                  colors: [
                                    player.color.withValues(alpha: 0.8),
                                    player.color,
                                  ],
                                ),
                                borderRadius: BorderRadius.circular(4),
                              ),
                            );
                          },
                        );
                      },
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 6),
              Text(
                '$percentInt%',
                style: const TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildPlayerTrackRow(
      PlayerProgress player, bool isLocal, bool isDark) {
    final percentInt = (player.progressPercent * 100).toInt();

    String rankBadge;
    if (player.rank == 1) {
      rankBadge = '🥇';
    } else if (player.rank == 2) {
      rankBadge = '🥈';
    } else if (player.rank == 3) {
      rankBadge = '🥉';
    } else {
      rankBadge = '#${player.rank}';
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: isLocal
            ? player.color.withValues(alpha: isDark ? 0.2 : 0.1)
            : Colors.transparent,
        borderRadius: BorderRadius.circular(8),
        border: isLocal
            ? Border.all(color: player.color.withValues(alpha: 0.4), width: 1)
            : null,
      ),
      child: Column(
        children: [
          Row(
            children: [
              // Rank
              SizedBox(
                width: 24,
                child: Text(
                  rankBadge,
                  style: const TextStyle(fontSize: 12),
                ),
              ),

              // Color Dot / Initial
              Container(
                width: 18,
                height: 18,
                decoration: BoxDecoration(
                  color: player.color,
                  shape: BoxShape.circle,
                ),
                child: Center(
                  child: Text(
                    player.name.isNotEmpty ? player.name[0].toUpperCase() : 'P',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 6),

              // Player Name + Badges
              Expanded(
                child: Row(
                  children: [
                    Flexible(
                      child: Text(
                        player.name,
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight:
                              isLocal ? FontWeight.bold : FontWeight.w500,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    if (isLocal) ...[
                      const SizedBox(width: 4),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 4, vertical: 1),
                        decoration: BoxDecoration(
                          color: player.color,
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: const Text(
                          'YOU',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 8,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                    if (player.isHost) ...[
                      const SizedBox(width: 4),
                      const Text('👑', style: TextStyle(fontSize: 10)),
                    ],
                  ],
                ),
              ),

              // Lives
              _buildMiniLives(player.lives),

              const SizedBox(width: 8),

              // Score
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                decoration: BoxDecoration(
                  color: player.color.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  '${player.score}',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    color: player.color,
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 4),

          // Race Track Progress Bar
          Row(
            children: [
              Expanded(
                child: Stack(
                  children: [
                    Container(
                      height: 10,
                      decoration: BoxDecoration(
                        color: isDark
                            ? Colors.white.withValues(alpha: 0.08)
                            : Colors.black.withValues(alpha: 0.06),
                        borderRadius: BorderRadius.circular(5),
                      ),
                    ),
                    LayoutBuilder(
                      builder: (context, constraints) {
                        final fillWidth =
                            constraints.maxWidth * player.progressPercent.clamp(0.0, 1.0);
                        return TweenAnimationBuilder<double>(
                          tween: Tween<double>(begin: 0, end: fillWidth),
                          duration: const Duration(milliseconds: 300),
                          curve: Curves.easeOutQuad,
                          builder: (context, width, _) {
                            return Container(
                              width: width,
                              height: 10,
                              decoration: BoxDecoration(
                                gradient: LinearGradient(
                                  colors: [
                                    player.color.withValues(alpha: 0.8),
                                    player.color,
                                  ],
                                ),
                                borderRadius: BorderRadius.circular(5),
                              ),
                            );
                          },
                        );
                      },
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              SizedBox(
                width: 32,
                child: Text(
                  '$percentInt%',
                  style: const TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                  ),
                  textAlign: TextAlign.right,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildMiniLives(int lives) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(3, (index) {
        final isFilled = index < lives;
        return Padding(
          padding: const EdgeInsets.symmetric(horizontal: 1),
          child: Icon(
            isFilled ? Icons.favorite : Icons.favorite_border,
            size: 11,
            color: isFilled
                ? AppColors.heartFull
                : Colors.grey.withValues(alpha: 0.4),
          ),
        );
      }),
    );
  }
}
