// ignore_for_file: avoid_web_libraries_in_flutter
import 'dart:async';
import 'dart:html' as html;
import 'dart:typed_data';

class UniversalWebSocketImpl {
  static Future<dynamic> connect(String url, {List<String>? protocols}) async {
    final completer = Completer<html.WebSocket>();

    final ws = protocols != null && protocols.isNotEmpty
        ? html.WebSocket(url, protocols)
        : html.WebSocket(url);

    ws.binaryType = 'arraybuffer';

    ws.onOpen.first.then((_) {
      if (!completer.isCompleted) completer.complete(ws);
    });

    ws.onError.first.then((e) {
      if (!completer.isCompleted) completer.completeError(e);
    });

    return await completer.future.timeout(
      const Duration(seconds: 6),
      onTimeout: () => ws,
    );
  }

  static void send(dynamic socket, Uint8List bytes) {
    if (socket is html.WebSocket && socket.readyState == html.WebSocket.OPEN) {
      socket.sendByteBuffer(bytes.buffer);
    }
  }

  static void listen(
      dynamic socket, void Function(dynamic) onData, void Function() onDone) {
    if (socket is html.WebSocket) {
      socket.onMessage.listen((event) {
        final data = event.data;
        if (data is ByteBuffer) {
          onData(Uint8List.view(data));
        } else if (data is Uint8List) {
          onData(data);
        } else if (data is List<int>) {
          onData(Uint8List.fromList(data));
        }
      });

      socket.onClose.listen((_) => onDone());
      socket.onError.listen((_) => onDone());
    }
  }

  static void close(dynamic socket) {
    if (socket is html.WebSocket) {
      socket.close();
    }
  }
}
