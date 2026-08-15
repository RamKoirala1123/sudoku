import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../settings_controller.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<SettingsController>();
    final settings = controller.settings;

    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: ListView(
        padding: const EdgeInsets.symmetric(vertical: 8),
        children: [
          _SettingsSwitchTile(
            icon: Icons.volume_up_outlined,
            title: 'Sound',
            value: settings.soundEnabled,
            onChanged: controller.setSoundEnabled,
          ),
          _SettingsSwitchTile(
            icon: Icons.vibration_rounded,
            title: 'Vibration',
            value: settings.vibrationEnabled,
            onChanged: controller.setVibrationEnabled,
          ),
          _SettingsSwitchTile(
            icon: Icons.dark_mode_outlined,
            title: 'Dark Mode',
            value: settings.darkMode,
            onChanged: controller.setDarkMode,
          ),
          _SettingsSwitchTile(
            icon: Icons.visibility_outlined,
            title: 'Show Mistakes',
            subtitle: 'Highlight incorrect numbers immediately',
            value: settings.showMistakes,
            onChanged: controller.setShowMistakes,
          ),
          _SettingsSwitchTile(
            icon: Icons.replay_rounded,
            title: 'Confirm Restart',
            subtitle: 'Ask before restarting a puzzle',
            value: settings.confirmRestart,
            onChanged: controller.setConfirmRestart,
          ),
        ],
      ),
    );
  }
}

class _SettingsSwitchTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? subtitle;
  final bool value;
  final ValueChanged<bool> onChanged;

  const _SettingsSwitchTile({
    required this.icon,
    required this.title,
    required this.value,
    required this.onChanged,
    this.subtitle,
  });

  @override
  Widget build(BuildContext context) {
    return SwitchListTile(
      secondary: Icon(icon),
      title: Text(title),
      subtitle: subtitle != null ? Text(subtitle!) : null,
      value: value,
      onChanged: onChanged,
    );
  }
}
