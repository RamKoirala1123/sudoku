import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'core/constants/app_constants.dart';
import 'core/theme/app_theme.dart';
import 'features/settings/presentation/settings_controller.dart';
import 'features/statistics/presentation/statistics_controller.dart';
import 'features/sudoku/presentation/screens/home_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const SudokuDuelApp());
}

class SudokuDuelApp extends StatefulWidget {
  const SudokuDuelApp({super.key});

  @override
  State<SudokuDuelApp> createState() => _SudokuDuelAppState();
}

class _SudokuDuelAppState extends State<SudokuDuelApp> {
  late final SettingsController _settingsController;
  late final StatisticsController _statisticsController;

  @override
  void initState() {
    super.initState();
    _settingsController = SettingsController()..load();
    _statisticsController = StatisticsController()..load();
  }

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider.value(value: _settingsController),
        ChangeNotifierProvider.value(value: _statisticsController),
      ],
      child: Consumer<SettingsController>(
        builder: (context, settingsController, _) {
          return MaterialApp(
            title: AppConstants.appName,
            debugShowCheckedModeBanner: false,
            theme: AppTheme.light,
            darkTheme: AppTheme.dark,
            themeMode: settingsController.settings.darkMode ? ThemeMode.dark : ThemeMode.light,
            home: const HomeScreen(),
          );
        },
      ),
    );
  }
}
