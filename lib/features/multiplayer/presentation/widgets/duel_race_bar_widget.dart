import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../domain/p2p_connection_service.dart';

class DuelRaceBarWidget extends StatelessWidget {
  final String localPlayerName;
  final double localProgress;
  final int localScore;
  final int localLives;
  final OpponentProgress opponent;
  final int latencyMs;

  const DuelRaceBarWidget({
    super.key,
    required this.localPlayerName,
    required this.localProgress,
    required this.localScore,
    required this.localLives,
    required this.opponent,
    required this.latencyMs,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1F2332) : const Color(0xFFF1F3FA),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark
              ? Colors.white.withValues(alpha: 0.08)
              : Colors.black.withValues(alpha: 0.06),
        ),
      ),
      child: Column(
        children: [
          // Header info: You VS Opponent + Latency
          Row(
            children: [
              // You
              Expanded(
                child: Row(
                  children: [
                    Container(
                      width: 24,
                      height: 24,
                      decoration: const BoxDecoration(
                        color: AppColors.primary,
                        shape: BoxShape.circle,
                      ),
                      child: const Center(
                        child: Text(
                          'Y',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Flexible(
                      child: Text(
                        localPlayerName,
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 13,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(width: 6),
                    _buildMiniLives(localLives),
                  ],
                ),
              ),

              // Middle Latency / P2P badge
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: isDark
                      ? Colors.black.withValues(alpha: 0.4)
                      : Colors.white,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 6,
                      height: 6,
                      decoration: BoxDecoration(
                        color: latencyMs < 100
                            ? AppColors.success
                            : (latencyMs < 250
                                ? AppColors.warning
                                : AppColors.error),
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 4),
                    Text(
                      latencyMs > 0 ? '${latencyMs}ms P2P' : 'P2P Direct',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                        color: theme.textTheme.bodySmall?.color,
                      ),
                    ),
                  ],
                ),
              ),

              // Opponent
              Expanded(
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    _buildMiniLives(opponent.lives),
                    const SizedBox(width: 6),
                    Flexible(
                      child: Text(
                        opponent.name,
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 13,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Container(
                      width: 24,
                      height: 24,
                      decoration: const BoxDecoration(
                        color: AppColors.secondary,
                        shape: BoxShape.circle,
                      ),
                      child: const Center(
                        child: Text(
                          'O',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 12),

          // Local Player Track
          _buildTrackRow(
            label: 'YOU',
            progress: localProgress,
            score: localScore,
            color: AppColors.primary,
            trackColor: isDark
                ? Colors.white.withValues(alpha: 0.08)
                : Colors.black.withValues(alpha: 0.06),
          ),

          const SizedBox(height: 6),

          // Opponent Track
          _buildTrackRow(
            label: 'OPP',
            progress: opponent.progressPercent,
            score: opponent.score,
            color: AppColors.secondary,
            trackColor: isDark
                ? Colors.white.withValues(alpha: 0.08)
                : Colors.black.withValues(alpha: 0.06),
          ),
        ],
      ),
    );
  }

  Widget _buildTrackRow({
    required String label,
    required double progress,
    required int score,
    required Color color,
    required Color trackColor,
  }) {
    final percentInt = (progress * 100).toInt();

    return Row(
      children: [
        SizedBox(
          width: 32,
          child: Text(
            label,
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w800,
              color: color,
            ),
          ),
        ),
        Expanded(
          child: Stack(
            alignment: Alignment.centerLeft,
            children: [
              // Track background
              Container(
                height: 14,
                decoration: BoxDecoration(
                  color: trackColor,
                  borderRadius: BorderRadius.circular(7),
                ),
              ),
              // Animated progress bar fill
              LayoutBuilder(
                builder: (context, constraints) {
                  final fillWidth = (constraints.maxWidth * progress.clamp(0.0, 1.0));
                  return TweenAnimationBuilder<double>(
                    tween: Tween<double>(begin: 0, end: fillWidth),
                    duration: const Duration(milliseconds: 300),
                    curve: Curves.easeOutQuad,
                    builder: (context, width, _) {
                      return Container(
                        width: width,
                        height: 14,
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: [
                              color.withValues(alpha: 0.8),
                              color,
                            ],
                          ),
                          borderRadius: BorderRadius.circular(7),
                          boxShadow: [
                            BoxShadow(
                              color: color.withValues(alpha: 0.3),
                              blurRadius: 4,
                              offset: const Offset(0, 1),
                            ),
                          ],
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
          width: 44,
          child: Text(
            '$percentInt%',
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.bold,
            ),
            textAlign: TextAlign.right,
          ),
        ),
        const SizedBox(width: 6),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(4),
          ),
          child: Text(
            '$score',
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
        ),
      ],
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
            size: 13,
            color: isFilled ? AppColors.heartFull : Colors.grey.withValues(alpha: 0.5),
          ),
        );
      }),
    );
  }
}
