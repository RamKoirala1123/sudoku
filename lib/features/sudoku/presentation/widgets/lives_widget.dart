import 'package:flutter/material.dart';
import '../../../../core/constants/app_constants.dart';
import '../../../../core/theme/app_colors.dart';

/// Displays remaining lives as hearts (spec section 7), animating the
/// transition from full to empty when a life is lost.
class LivesWidget extends StatelessWidget {
  final int lives;

  const LivesWidget({super.key, required this.lives});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final emptyColor = isDark ? AppColors.heartEmptyDark : AppColors.heartEmptyLight;

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(AppConstants.startingLives, (i) {
        final filled = i < lives;
        return Padding(
          padding: const EdgeInsets.only(left: 2),
          child: AnimatedSwitcher(
            duration: const Duration(milliseconds: 250),
            transitionBuilder: (child, anim) => ScaleTransition(scale: anim, child: child),
            child: Icon(
              filled ? Icons.favorite : Icons.favorite_border,
              key: ValueKey(filled),
              color: filled ? AppColors.heartFull : emptyColor,
              size: 20,
            ),
          ),
        );
      }),
    );
  }
}
