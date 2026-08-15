import 'package:flutter/foundation.dart';

import '../data/settings_repository.dart';
import '../domain/app_settings.dart';

class SettingsController extends ChangeNotifier {
  final SettingsRepository _repository;
  AppSettings _settings = const AppSettings();
  bool _loaded = false;

  SettingsController({SettingsRepository? repository}) : _repository = repository ?? SettingsRepository();

  AppSettings get settings => _settings;
  bool get isLoaded => _loaded;

  Future<void> load() async {
    _settings = await _repository.load();
    _loaded = true;
    notifyListeners();
  }

  Future<void> _update(AppSettings Function(AppSettings) updater) async {
    _settings = updater(_settings);
    notifyListeners();
    await _repository.save(_settings);
  }

  Future<void> setSoundEnabled(bool value) => _update((s) => s.copyWith(soundEnabled: value));
  Future<void> setVibrationEnabled(bool value) => _update((s) => s.copyWith(vibrationEnabled: value));
  Future<void> setDarkMode(bool value) => _update((s) => s.copyWith(darkMode: value));
  Future<void> setShowMistakes(bool value) => _update((s) => s.copyWith(showMistakes: value));
  Future<void> setConfirmRestart(bool value) => _update((s) => s.copyWith(confirmRestart: value));
}
