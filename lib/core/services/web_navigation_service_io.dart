class WebNavigationServiceImpl {
  static void setRoomUrl(String roomCode) {}

  static void clearRoomUrl() {}

  static String getShareUrl(String roomCode) {
    final uri = Uri.base;
    if (uri.scheme.isNotEmpty && uri.authority.isNotEmpty) {
      return '${uri.scheme}://${uri.authority}${uri.path}#join=$roomCode';
    }
    return 'https://sudoku.com/#join=$roomCode';
  }
}
