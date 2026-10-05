import 'package:flutter/foundation.dart';
import 'web_navigation_service_io.dart'
    if (dart.library.html) 'web_navigation_service_web.dart' as impl;

/// Cross-platform navigation service that updates and reads browser URLs
/// allowing 1-click invite link sharing and instant reload auto-resume.
class WebNavigationService {
  /// Updates the browser URL bar (e.g. `https://sudoku.com/#room=123456`)
  static void setRoomUrl(String roomCode) {
    if (kIsWeb) {
      impl.WebNavigationServiceImpl.setRoomUrl(roomCode);
    }
  }

  /// Clears the room URL from the browser bar when exiting a game
  static void clearRoomUrl() {
    if (kIsWeb) {
      impl.WebNavigationServiceImpl.clearRoomUrl();
    }
  }

  /// Returns the full shareable invite URL for friends to join in 1 click
  static String getShareUrl(String roomCode) {
    return impl.WebNavigationServiceImpl.getShareUrl(roomCode);
  }

  /// Universally extracts a 6-digit room code from any URL format:
  /// - `https://site.com/#join=123456`
  /// - `https://site.com/#room=123456`
  /// - `https://site.com/#123456`
  /// - `https://site.com/?room=123456`
  /// - `https://site.com/123456`
  static String? extractRoomCode(Uri uri) {
    // 1. Query parameters (?room=123456 or ?join=123456)
    final qRoom = uri.queryParameters['room']?.trim();
    if (qRoom != null && RegExp(r'^\d{6}$').hasMatch(qRoom)) return qRoom;

    final qJoin = uri.queryParameters['join']?.trim();
    if (qJoin != null && RegExp(r'^\d{6}$').hasMatch(qJoin)) return qJoin;

    // 2. Hash / Fragment (#join=123456, #room=123456, #/room/123456, #123456)
    final fragment = uri.fragment.trim();
    if (fragment.isNotEmpty) {
      if (fragment.startsWith('join=')) {
        final code = fragment.substring('join='.length).trim();
        if (RegExp(r'^\d{6}$').hasMatch(code)) return code;
      }
      if (fragment.startsWith('room=')) {
        final code = fragment.substring('room='.length).trim();
        if (RegExp(r'^\d{6}$').hasMatch(code)) return code;
      }
      final matchInFrag = RegExp(r'\b(\d{6})\b').firstMatch(fragment);
      if (matchInFrag != null) {
        return matchInFrag.group(1);
      }
    }

    // 3. Path (/room/123456 or /123456)
    final pathMatch = RegExp(r'\b(\d{6})\b').firstMatch(uri.path);
    if (pathMatch != null) {
      return pathMatch.group(1);
    }

    return null;
  }
}
