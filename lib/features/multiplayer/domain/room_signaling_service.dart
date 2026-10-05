import 'dart:async';
import 'dart:convert';
import 'dart:math';
import 'package:flutter/foundation.dart';
import 'universal_websocket.dart';

/// Lightweight, serverless public signaling service.
/// Connects peers using a 6-digit room code via public MQTT over WebSockets.
/// Requires NO custom backend, NO API keys, and NO authentication.
class RoomSignalingService {
  static const List<String> _brokers = [
    'wss://broker.emqx.io:8084/mqtt',
    'wss://broker.hivemq.com:8000/mqtt',
  ];

  final String roomCode;
  final String clientId;
  final StreamController<Map<String, dynamic>> _messagesController =
      StreamController<Map<String, dynamic>>.broadcast();

  dynamic _socket; // dart:io or dart:html WebSocket via universal abstraction
  bool _isConnected = false;
  bool _isDisposed = false;
  Timer? _pingTimer;
  int _packetId = 1;

  Stream<Map<String, dynamic>> get messages => _messagesController.stream;
  bool get isConnected => _isConnected;

  RoomSignalingService({
    required this.roomCode,
    String? clientId,
  }) : clientId = clientId ??
            'sudoku_${DateTime.now().millisecondsSinceEpoch}_${Random().nextInt(9999)}';

  String get _topic => 'sudoku/room/$roomCode';

  /// Connects to public broker and subscribes to room topic.
  Future<bool> connect() async {
    for (final brokerUrl in _brokers) {
      if (_isDisposed) return false;
      try {
        debugPrint('[Signaling] Connecting to $brokerUrl for room $roomCode...');
        final connected = await _connectToBroker(brokerUrl);
        if (connected) {
          debugPrint('[Signaling] Connected to room $roomCode successfully!');
          return true;
        }
      } catch (e) {
        debugPrint('[Signaling] Failed to connect to $brokerUrl: $e');
      }
    }
    return false;
  }

  Future<bool> _connectToBroker(String brokerUrl) async {
    final completer = Completer<bool>();

    try {
      // Connect using WebSocket
      final ws = await _openWebSocket(brokerUrl);
      _socket = ws;

      // Send MQTT CONNECT packet
      _sendBytes(_buildConnectPacket(clientId));

      _listenToSocket(ws, (data) {
        final bytes = data is Uint8List ? data : Uint8List.fromList(data as List<int>);
        if (bytes.isEmpty) return;

        final headerType = bytes[0] & 0xF0;

        // 0x20 = CONNACK
        if (headerType == 0x20) {
          _isConnected = true;
          debugPrint('[Signaling] Broker CONNACK received. Subscribing to $_topic...');
          _sendBytes(_buildSubscribePacket(_packetId++, _topic));
          if (!completer.isCompleted) completer.complete(true);

          _startKeepAlive();
        }
        // 0x30 = PUBLISH
        else if (headerType == 0x30) {
          _handleIncomingPublish(bytes);
        }
      }, () {
        _isConnected = false;
        if (!completer.isCompleted) completer.complete(false);
      });

      return await completer.future.timeout(
        const Duration(seconds: 7),
        onTimeout: () => false,
      );
    } catch (e) {
      debugPrint('[Signaling] Error in _connectToBroker: $e');
      return false;
    }
  }

  void _handleIncomingPublish(Uint8List bytes) {
    try {
      // Decode variable length header
      int offset = 1;
      int digit;
      do {
        if (offset >= bytes.length) return;
        digit = bytes[offset++];
      } while ((digit & 0x80) != 0);

      if (offset + 2 > bytes.length) return;
      final topicLen = (bytes[offset] << 8) | bytes[offset + 1];
      offset += 2 + topicLen;

      if (offset > bytes.length) return;
      final payloadBytes = bytes.sublist(offset);
      final payloadStr = utf8.decode(payloadBytes);

      final Map<String, dynamic> json = jsonDecode(payloadStr);

      // Ignore messages sent by ourselves
      if (json['_senderId'] == clientId) return;

      _messagesController.add(json);
    } catch (e) {
      debugPrint('[Signaling] Error decoding publish message: $e');
    }
  }

  /// Broadcasts a message to everyone in the 6-digit room.
  void send(Map<String, dynamic> message) {
    if (_socket == null || _isDisposed) return;
    try {
      final copy = Map<String, dynamic>.from(message);
      copy['_senderId'] = clientId;
      copy['_timestamp'] = DateTime.now().millisecondsSinceEpoch;

      final jsonStr = jsonEncode(copy);
      final packet = _buildPublishPacket(_topic, jsonStr);
      _sendBytes(packet);
    } catch (e) {
      debugPrint('[Signaling] Error sending message: $e');
    }
  }

  void _startKeepAlive() {
    _pingTimer?.cancel();
    _pingTimer = Timer.periodic(const Duration(seconds: 25), (_) {
      if (_socket != null && _isConnected) {
        // PINGREQ = 0xC0, 0x00
        _sendBytes([0xC0, 0x00]);
      }
    });
  }

  void dispose() {
    _isDisposed = true;
    _isConnected = false;
    _pingTimer?.cancel();
    _closeWebSocket(_socket);
    _messagesController.close();
  }

  // ---------------------------------------------------------------------------
  // MQTT PACKET BUILDERS
  // ---------------------------------------------------------------------------

  List<int> _buildConnectPacket(String clientId) {
    final variableHeader = [
      0x00, 0x04, 0x4D, 0x51, 0x54, 0x54, // "MQTT"
      0x04, // Level 4 (3.1.1)
      0x02, // Clean session
      0x00, 0x3C, // Keep alive (60s)
    ];
    final clientBytes = utf8.encode(clientId);
    final payload = [
      (clientBytes.length >> 8) & 0xFF,
      clientBytes.length & 0xFF,
      ...clientBytes,
    ];
    final remainingLength = variableHeader.length + payload.length;
    return [0x10, remainingLength, ...variableHeader, ...payload];
  }

  List<int> _buildSubscribePacket(int packetId, String topic) {
    final topicBytes = utf8.encode(topic);
    final variableHeader = [(packetId >> 8) & 0xFF, packetId & 0xFF];
    final payload = [
      (topicBytes.length >> 8) & 0xFF,
      topicBytes.length & 0xFF,
      ...topicBytes,
      0x00, // QoS 0
    ];
    final remainingLength = variableHeader.length + payload.length;
    return [0x82, remainingLength, ...variableHeader, ...payload];
  }

  List<int> _buildPublishPacket(String topic, String message) {
    final topicBytes = utf8.encode(topic);
    final messageBytes = utf8.encode(message);
    final variableHeader = [
      (topicBytes.length >> 8) & 0xFF,
      topicBytes.length & 0xFF,
      ...topicBytes,
    ];
    final remainingLength = variableHeader.length + messageBytes.length;

    final lenBytes = <int>[];
    int rem = remainingLength;
    do {
      int byte = rem % 128;
      rem ~/= 128;
      if (rem > 0) byte |= 0x80;
      lenBytes.add(byte);
    } while (rem > 0);

    return [0x30, ...lenBytes, ...variableHeader, ...messageBytes];
  }

  // ---------------------------------------------------------------------------
  // WEBSOCKET PLATFORM WRAPPER
  // ---------------------------------------------------------------------------

  Future<dynamic> _openWebSocket(String url) async {
    // Both web and native Dart support WebSocket.connect
    return await WebSocketChannelAdapter.connect(url, protocols: ['mqtt']);
  }

  void _sendBytes(List<int> bytes) {
    if (_socket != null) {
      WebSocketChannelAdapter.send(_socket, Uint8List.fromList(bytes));
    }
  }

  void _listenToSocket(dynamic socket, void Function(dynamic) onData, void Function() onDone) {
    WebSocketChannelAdapter.listen(socket, onData, onDone);
  }

  void _closeWebSocket(dynamic socket) {
    if (socket != null) {
      WebSocketChannelAdapter.close(socket);
    }
  }
}

/// Helper adapter to handle WebSocket across Web and IO without compilation errors.
class WebSocketChannelAdapter {
  static Future<dynamic> connect(String url, {List<String>? protocols}) async {
    // Dynamic dispatch so code compiles on both web and native
    return await UniversalWebSocket.connect(url, protocols: protocols);
  }

  static void send(dynamic socket, Uint8List bytes) {
    UniversalWebSocket.send(socket, bytes);
  }

  static void listen(dynamic socket, void Function(dynamic) onData, void Function() onDone) {
    UniversalWebSocket.listen(socket, onData, onDone);
  }

  static void close(dynamic socket) {
    UniversalWebSocket.close(socket);
  }
}
