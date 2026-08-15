import 'package:flutter/material.dart';

class TimerWidget extends StatelessWidget {
  final int elapsedSeconds;
  const TimerWidget({super.key, required this.elapsedSeconds});

  String get _formatted {
    final m = (elapsedSeconds ~/ 60).toString().padLeft(2, '0');
    final s = (elapsedSeconds % 60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(Icons.timer_outlined, size: 18, color: theme.colorScheme.onSurface.withOpacity(0.6)),
        const SizedBox(width: 6),
        Text(
          _formatted,
          style: theme.textTheme.titleMedium?.copyWith(
            fontFeatures: const [FontFeature.tabularFigures()],
          ),
        ),
      ],
    );
  }
}

/// Shows the running score plus a brief, non-intrusive floating "+10"/"-5"
/// pop whenever [lastDelta] changes (spec section 6: "subtle feedback
/// rather than intrusive popups").
class ScoreWidget extends StatefulWidget {
  final int score;
  final int? lastDelta;
  final Object? deltaToken; // changes every time a delta should replay

  const ScoreWidget({
    super.key,
    required this.score,
    required this.lastDelta,
    required this.deltaToken,
  });

  @override
  State<ScoreWidget> createState() => _ScoreWidgetState();
}

class _ScoreWidgetState extends State<ScoreWidget> with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<Offset> _offset;
  late final Animation<double> _fade;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: const Duration(milliseconds: 700));
    _offset = Tween(begin: const Offset(0, 0.2), end: const Offset(0, -0.9))
        .animate(CurvedAnimation(parent: _controller, curve: Curves.easeOut));
    _fade = Tween(begin: 1.0, end: 0.0)
        .animate(CurvedAnimation(parent: _controller, curve: const Interval(0.4, 1.0)));
  }

  @override
  void didUpdateWidget(covariant ScoreWidget oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.deltaToken != oldWidget.deltaToken && widget.lastDelta != null) {
      _controller.forward(from: 0);
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final delta = widget.lastDelta;
    final positive = (delta ?? 0) >= 0;

    return Stack(
      clipBehavior: Clip.none,
      alignment: Alignment.center,
      children: [
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.star_rounded, size: 18, color: theme.colorScheme.secondary),
            const SizedBox(width: 6),
            Text('${widget.score}', style: theme.textTheme.titleMedium),
          ],
        ),
        if (delta != null)
          Positioned(
            top: -4,
            child: FadeTransition(
              opacity: _fade,
              child: SlideTransition(
                position: _offset,
                child: Text(
                  positive ? '+$delta' : '$delta',
                  style: theme.textTheme.labelLarge?.copyWith(
                    color: positive ? Colors.green : Colors.redAccent,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }
}
