import 'package:flutter/material.dart';

class PlayerProgress {
  final String id;
  final String name;
  final int colorIndex;
  final bool isHost;
  final double progressPercent;
  final int filledCount;
  final int targetToFill;
  final int score;
  final int lives;
  final int mistakes;
  final bool isCompleted;
  final bool isDefeated;
  final int rank;
  final String? recentEmoji;
  final int latencyMs;

  const PlayerProgress({
    required this.id,
    required this.name,
    this.colorIndex = 0,
    this.isHost = false,
    this.progressPercent = 0.0,
    this.filledCount = 0,
    this.targetToFill = 81,
    this.score = 0,
    this.lives = 3,
    this.mistakes = 0,
    this.isCompleted = false,
    this.isDefeated = false,
    this.rank = 1,
    this.recentEmoji,
    this.latencyMs = 0,
  });

  static const List<Color> playerColors = [
    Color(0xFF5B6CFF), // Indigo / Blue (Local)
    Color(0xFFFF8A65), // Coral / Orange
    Color(0xFF26A69A), // Teal
    Color(0xFFAB47BC), // Purple
    Color(0xFFFFA726), // Amber
    Color(0xFFEC407A), // Pink
    Color(0xFF42A5F5), // Light Blue
    Color(0xFF66BB6A), // Green
  ];

  Color get color => playerColors[colorIndex % playerColors.length];

  PlayerProgress copyWith({
    String? id,
    String? name,
    int? colorIndex,
    bool? isHost,
    double? progressPercent,
    int? filledCount,
    int? targetToFill,
    int? score,
    int? lives,
    int? mistakes,
    bool? isCompleted,
    bool? isDefeated,
    int? rank,
    String? recentEmoji,
    int? latencyMs,
  }) {
    return PlayerProgress(
      id: id ?? this.id,
      name: name ?? this.name,
      colorIndex: colorIndex ?? this.colorIndex,
      isHost: isHost ?? this.isHost,
      progressPercent: progressPercent ?? this.progressPercent,
      filledCount: filledCount ?? this.filledCount,
      targetToFill: targetToFill ?? this.targetToFill,
      score: score ?? this.score,
      lives: lives ?? this.lives,
      mistakes: mistakes ?? this.mistakes,
      isCompleted: isCompleted ?? this.isCompleted,
      isDefeated: isDefeated ?? this.isDefeated,
      rank: rank ?? this.rank,
      recentEmoji: recentEmoji ?? this.recentEmoji,
      latencyMs: latencyMs ?? this.latencyMs,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'colorIndex': colorIndex,
        'isHost': isHost,
        'progressPercent': progressPercent,
        'filledCount': filledCount,
        'targetToFill': targetToFill,
        'score': score,
        'lives': lives,
        'mistakes': mistakes,
        'isCompleted': isCompleted,
        'isDefeated': isDefeated,
        'rank': rank,
        'recentEmoji': recentEmoji,
      };

  factory PlayerProgress.fromJson(Map<String, dynamic> json) => PlayerProgress(
        id: json['id'] as String? ?? 'player',
        name: json['name'] as String? ?? 'Player',
        colorIndex: json['colorIndex'] as int? ?? 1,
        isHost: json['isHost'] as bool? ?? false,
        progressPercent: (json['progressPercent'] as num?)?.toDouble() ?? 0.0,
        filledCount: json['filledCount'] as int? ?? 0,
        targetToFill: json['targetToFill'] as int? ?? 81,
        score: json['score'] as int? ?? 0,
        lives: json['lives'] as int? ?? 3,
        mistakes: json['mistakes'] as int? ?? 0,
        isCompleted: json['isCompleted'] as bool? ?? false,
        isDefeated: json['isDefeated'] as bool? ?? false,
        rank: json['rank'] as int? ?? 1,
        recentEmoji: json['recentEmoji'] as String?,
        latencyMs: json['latencyMs'] as int? ?? 0,
      );
}
