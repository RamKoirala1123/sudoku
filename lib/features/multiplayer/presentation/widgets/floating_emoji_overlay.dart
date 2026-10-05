import 'dart:math';
import 'package:flutter/material.dart';

class FloatingEmojiOverlay extends StatefulWidget {
  final Stream<String> emojiStream;
  final Widget child;

  const FloatingEmojiOverlay({
    super.key,
    required this.emojiStream,
    required this.child,
  });

  @override
  State<FloatingEmojiOverlay> createState() => _FloatingEmojiOverlayState();
}

class _EmojiItem {
  final String id;
  final String emoji;
  final double startX; // normalized 0.1 to 0.9

  _EmojiItem({
    required this.id,
    required this.emoji,
    required this.startX,
  });
}

class _FloatingEmojiOverlayState extends State<FloatingEmojiOverlay>
    with TickerProviderStateMixin {
  final List<_EmojiItem> _emojis = [];
  final Random _random = Random();

  @override
  void initState() {
    super.initState();
    widget.emojiStream.listen((emoji) {
      if (!mounted) return;
      _spawnEmoji(emoji);
    });
  }

  void _spawnEmoji(String emoji) {
    final item = _EmojiItem(
      id: UniqueKey().toString(),
      emoji: emoji,
      startX: 0.2 + _random.nextDouble() * 0.6,
    );

    setState(() {
      _emojis.add(item);
    });

    Future.delayed(const Duration(milliseconds: 1800), () {
      if (mounted) {
        setState(() {
          _emojis.removeWhere((e) => e.id == item.id);
        });
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        widget.child,
        ..._emojis.map((item) => _SingleFloatingEmoji(
              key: ValueKey(item.id),
              emoji: item.emoji,
              startX: item.startX,
            )),
      ],
    );
  }
}

class _SingleFloatingEmoji extends StatefulWidget {
  final String emoji;
  final double startX;

  const _SingleFloatingEmoji({
    super.key,
    required this.emoji,
    required this.startX,
  });

  @override
  State<_SingleFloatingEmoji> createState() => _SingleFloatingEmojiState();
}

class _SingleFloatingEmojiState extends State<_SingleFloatingEmoji>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _translateAnimation;
  late final Animation<double> _opacityAnimation;
  late final Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1700),
    );

    _translateAnimation = Tween<double>(begin: 0.0, end: -350.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOutCubic),
    );

    _opacityAnimation = TweenSequence<double>([
      TweenSequenceItem(tween: Tween(begin: 0.0, end: 1.0), weight: 15),
      TweenSequenceItem(tween: Tween(begin: 1.0, end: 1.0), weight: 60),
      TweenSequenceItem(tween: Tween(begin: 1.0, end: 0.0), weight: 25),
    ]).animate(_controller);

    _scaleAnimation = TweenSequence<double>([
      TweenSequenceItem(tween: Tween(begin: 0.5, end: 1.4), weight: 20),
      TweenSequenceItem(tween: Tween(begin: 1.4, end: 1.0), weight: 20),
      TweenSequenceItem(tween: Tween(begin: 1.0, end: 1.1), weight: 60),
    ]).animate(_controller);

    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    final leftPos = size.width * widget.startX;

    return AnimatedBuilder(
      animation: _controller,
      builder: (context, _) {
        return Positioned(
          left: leftPos,
          bottom: 120 - _translateAnimation.value,
          child: Opacity(
            opacity: _opacityAnimation.value,
            child: Transform.scale(
              scale: _scaleAnimation.value,
              child: Text(
                widget.emoji,
                style: const TextStyle(fontSize: 48),
              ),
            ),
          ),
        );
      },
    );
  }
}
