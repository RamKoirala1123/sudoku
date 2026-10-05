// ignore_for_file: avoid_web_libraries_in_flutter
import 'dart:html' as html;

class WebNavigationServiceImpl {
  static void setRoomUrl(String roomCode) {
    try {
      html.window.history.replaceState(null, '', '#room=$roomCode');
    } catch (_) {}
  }

  static void clearRoomUrl() {
    try {
      final path = html.window.location.pathname ?? '/';
      html.window.history.replaceState(null, '', path);
    } catch (_) {}
  }

  static String getShareUrl(String roomCode) {
    try {
      final loc = html.window.location;
      return '${loc.protocol}//${loc.host}${loc.pathname}#join=$roomCode';
    } catch (_) {
      final uri = Uri.base;
      return '${uri.scheme}://${uri.authority}${uri.path}#join=$roomCode';
    }
  }
}
