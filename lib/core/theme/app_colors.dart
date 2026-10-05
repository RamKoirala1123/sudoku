import 'package:flutter/material.dart';

/// Centralized color roles so the board / UI never hard-codes ad-hoc colors.
/// Keeping this as a single source of truth makes it trivial to re-skin the
/// app (e.g. for a future "opponent" color in multiplayer) without touching
/// widget code.
class AppColors {
  AppColors._();

  // Brand.
  static const Color primary = Color(0xFF5B6CFF);
  static const Color primaryDark = Color(0xFF7C8CFF);
  static const Color secondary = Color(0xFFFF8A65);

  // Light theme surfaces.
  static const Color lightBackground = Color(0xFFF6F7FB);
  static const Color lightSurface = Color(0xFFFFFFFF);
  static const Color lightSurfaceAlt = Color(0xFFEDEFF7);

  // Dark theme surfaces.
  static const Color darkBackground = Color(0xFF11131A);
  static const Color darkSurface = Color(0xFF1B1E29);
  static const Color darkSurfaceAlt = Color(0xFF242836);

  // Board semantics — shared meaning between light & dark, brightness-tuned
  // via BoardPalette below.
  static const Color success = Color(0xFF3DDC97);
  static const Color error = Color(0xFFFF5D6C);
  static const Color warning = Color(0xFFFFC24B);

  static const Color heartFull = Color(0xFFFF5D6C);
  static const Color heartEmptyLight = Color(0xFFDADFEA);
  static const Color heartEmptyDark = Color(0xFF3A3F52);
}

/// Board-specific palette resolved per-brightness, used by the Sudoku board
/// and cell widgets so they never branch on Theme.of(context).brightness
/// directly in a dozen places.
class BoardPalette {
  final Color background;
  final Color boxAltBackground;
  final Color gridLineThin;
  final Color gridLineThick;
  final Color givenText;
  final Color playerText;
  final Color selectedCell;
  final Color relatedCell;
  final Color sameNumberCell;
  final Color errorCell;
  final Color errorText;

  const BoardPalette({
    required this.background,
    required this.boxAltBackground,
    required this.gridLineThin,
    required this.gridLineThick,
    required this.givenText,
    required this.playerText,
    required this.selectedCell,
    required this.relatedCell,
    required this.sameNumberCell,
    required this.errorCell,
    required this.errorText,
  });

  static const light = BoardPalette(
    background: Colors.white,
    boxAltBackground: Color(0xFFF1F3FA),
    gridLineThin: Color(0xFFD6DCED),
    gridLineThick: Color(0xFF344861),
    givenText: Color(0xFF1E2233),
    playerText: Color(0xFF0072E3),
    selectedCell: Color(0xFFBBDEFB),
    relatedCell: Color(0xFFE8F0FE),
    sameNumberCell: Color(0xFFCCE5FF),
    errorCell: Color(0xFFFFCDD2),
    errorText: AppColors.error,
  );

  static const dark = BoardPalette(
    background: Color(0xFF1B1E29),
    boxAltBackground: Color(0xFF20232F),
    gridLineThin: Color(0xFF2E3445),
    gridLineThick: Color(0xFF7A869E),
    givenText: Color(0xFFF3F4FA),
    playerText: Color(0xFF4D9CFF),
    selectedCell: Color(0xFF32486E),
    relatedCell: Color(0xFF232A3B),
    sameNumberCell: Color(0xFF2E3F5F),
    errorCell: Color(0xFF4C222B),
    errorText: Color(0xFFFF8A93),
  );

  static BoardPalette of(Brightness b) => b == Brightness.dark ? dark : light;
}
