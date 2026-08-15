/// User-configurable preferences (spec section 15).
class AppSettings {
  final bool soundEnabled;
  final bool vibrationEnabled;
  final bool darkMode;
  final bool showMistakes;
  final bool confirmRestart;

  const AppSettings({
    this.soundEnabled = true,
    this.vibrationEnabled = true,
    this.darkMode = false,
    this.showMistakes = true,
    this.confirmRestart = true,
  });

  AppSettings copyWith({
    bool? soundEnabled,
    bool? vibrationEnabled,
    bool? darkMode,
    bool? showMistakes,
    bool? confirmRestart,
  }) {
    return AppSettings(
      soundEnabled: soundEnabled ?? this.soundEnabled,
      vibrationEnabled: vibrationEnabled ?? this.vibrationEnabled,
      darkMode: darkMode ?? this.darkMode,
      showMistakes: showMistakes ?? this.showMistakes,
      confirmRestart: confirmRestart ?? this.confirmRestart,
    );
  }

  Map<String, dynamic> toJson() => {
        'soundEnabled': soundEnabled,
        'vibrationEnabled': vibrationEnabled,
        'darkMode': darkMode,
        'showMistakes': showMistakes,
        'confirmRestart': confirmRestart,
      };

  factory AppSettings.fromJson(Map<String, dynamic> json) => AppSettings(
        soundEnabled: json['soundEnabled'] as bool? ?? true,
        vibrationEnabled: json['vibrationEnabled'] as bool? ?? true,
        darkMode: json['darkMode'] as bool? ?? false,
        showMistakes: json['showMistakes'] as bool? ?? true,
        confirmRestart: json['confirmRestart'] as bool? ?? true,
      );
}
