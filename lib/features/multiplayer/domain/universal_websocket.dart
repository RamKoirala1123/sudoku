import 'dart:typed_data';
import 'universal_websocket_io.dart'
    if (dart.library.html) 'universal_websocket_web.dart' as impl;

abstract class UniversalWebSocket {
  static Future<dynamic> connect(String url, {List<String>? protocols}) =>
      impl.UniversalWebSocketImpl.connect(url, protocols: protocols);

  static void send(dynamic socket, Uint8List bytes) =>
      impl.UniversalWebSocketImpl.send(socket, bytes);

  static void listen(
          dynamic socket, void Function(dynamic) onData, void Function() onDone) =>
      impl.UniversalWebSocketImpl.listen(socket, onData, onDone);

  static void close(dynamic socket) =>
      impl.UniversalWebSocketImpl.close(socket);
}
