import 'dart:io';
import 'dart:typed_data';

class UniversalWebSocketImpl {
  static Future<dynamic> connect(String url, {List<String>? protocols}) async {
    return await WebSocket.connect(url, protocols: protocols);
  }

  static void send(dynamic socket, Uint8List bytes) {
    if (socket is WebSocket) {
      socket.add(bytes);
    }
  }

  static void listen(
      dynamic socket, void Function(dynamic) onData, void Function() onDone) {
    if (socket is WebSocket) {
      socket.listen(
        onData,
        onDone: onDone,
        onError: (_) => onDone(),
        cancelOnError: true,
      );
    }
  }

  static void close(dynamic socket) {
    if (socket is WebSocket) {
      socket.close();
    }
  }
}
