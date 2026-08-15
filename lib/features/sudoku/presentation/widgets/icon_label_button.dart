import 'package:flutter/material.dart';

/// A compact icon button with a label stacked below it.
/// Used for the toolbar buttons (Undo, Pencil, Erase).
class IconLabelButton extends StatelessWidget {
  final Widget icon;
  final String label;
  final VoidCallback? onPressed;
  final String? tooltip;

  const IconLabelButton({
    super.key,
    required this.icon,
    required this.label,
    this.onPressed,
    this.tooltip,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final textStyle = theme.textTheme.bodySmall;
    final disabledColor = theme.disabledColor;

    return Tooltip(
      message: tooltip ?? label,
      child: InkWell(
        onTap: onPressed,
        borderRadius: BorderRadius.circular(8),
        child: Padding(
          padding: const EdgeInsets.symmetric(
            horizontal: 8,
            vertical: 4,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const SizedBox(height: 4),
              icon,
              const SizedBox(height: 4),
              Text(
                label,
                style: textStyle?.copyWith(
                  color: onPressed == null ? disabledColor : null,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
