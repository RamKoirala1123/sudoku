import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import '../../sudoku/domain/entities/sudoku_puzzle.dart';
import 'p2p_codec.dart';

enum P2PConnectionState {
  initial,
  gatheringOffer,
  offerReady,
  gatheringAnswer,
  answerReady,
  connecting,
  connected,
  disconnected,
  error,
}

class OpponentProgress {
  final String name;
  final int filledCount;
  final int totalGivens;
  final int totalCells;
  final int score;
  final int lives;
  final int mistakes;
  final double progressPercent;
  final int? lastCellIndex;
  final int? lastCellValue;
  final bool isCompleted;
  final bool isDefeated;
  final int latencyMs;
  final String? recentEmoji;

  const OpponentProgress({
    this.name = 'Opponent',
    this.filledCount = 0,
    this.totalGivens = 0,
    this.totalCells = 81,
    this.score = 0,
    this.lives = 3,
    this.mistakes = 0,
    this.progressPercent = 0.0,
    this.lastCellIndex,
    this.lastCellValue,
    this.isCompleted = false,
    this.isDefeated = false,
    this.latencyMs = 0,
    this.recentEmoji,
  });

  OpponentProgress copyWith({
    String? name,
    int? filledCount,
    int? totalGivens,
    int? totalCells,
    int? score,
    int? lives,
    int? mistakes,
    double? progressPercent,
    int? lastCellIndex,
    int? lastCellValue,
    bool? isCompleted,
    bool? isDefeated,
    int? latencyMs,
    String? recentEmoji,
  }) {
    return OpponentProgress(
      name: name ?? this.name,
      filledCount: filledCount ?? this.filledCount,
      totalGivens: totalGivens ?? this.totalGivens,
      totalCells: totalCells ?? this.totalCells,
      score: score ?? this.score,
      lives: lives ?? this.lives,
      mistakes: mistakes ?? this.mistakes,
      progressPercent: progressPercent ?? this.progressPercent,
      lastCellIndex: lastCellIndex ?? this.lastCellIndex,
      lastCellValue: lastCellValue ?? this.lastCellValue,
      isCompleted: isCompleted ?? this.isCompleted,
      isDefeated: isDefeated ?? this.isDefeated,
      latencyMs: latencyMs ?? this.latencyMs,
      recentEmoji: recentEmoji ?? this.recentEmoji,
    );
  }
}

class P2PConnectionService extends ChangeNotifier {
  RTCPeerConnection? _peerConnection;
  RTCDataChannel? _dataChannel;

  P2PConnectionState _status = P2PConnectionState.initial;
  String? _errorMessage;

  SudokuPuzzle? _puzzle;
  String _localPlayerName = 'Player 1';
  String _remotePlayerName = 'Opponent';
  bool _isHost = false;

  final List<Map<String, dynamic>> _gatheredCandidates = [];
  Timer? _pingTimer;
  int _lastPingTimestamp = 0;
  int _currentLatencyMs = 0;

  final StreamController<Map<String, dynamic>> _messagesController =
      StreamController<Map<String, dynamic>>.broadcast();

  P2PConnectionState get status => _status;
  String? get errorMessage => _errorMessage;
  SudokuPuzzle? get puzzle => _puzzle;
  String get localPlayerName => _localPlayerName;
  String get remotePlayerName => _remotePlayerName;
  bool get isHost => _isHost;
  int get latencyMs => _currentLatencyMs;
  Stream<Map<String, dynamic>> get messages => _messagesController.stream;

  static const Map<String, dynamic> _rtcConfig = {
    'iceServers': [
      {'urls': 'stun:stun.l.google.com:19302'},
      {'urls': 'stun:stun1.l.google.com:19302'},
      {'urls': 'stun:stun2.l.google.com:19302'},
    ],
    'sdpSemantics': 'unified-plan',
  };

  void _setStatus(P2PConnectionState newStatus) {
    _status = newStatus;
    notifyListeners();
  }

  /// Host flow step 1: Generates WebRTC offer, gathers ICE candidates, and returns
  /// a self-contained compressed Invite Code.
  Future<String> createHostOffer(SudokuPuzzle puzzle,
      {String playerName = 'Player 1'}) async {
    _isHost = true;
    _puzzle = puzzle;
    _localPlayerName = playerName;
    _errorMessage = null;
    _gatheredCandidates.clear();
    _setStatus(P2PConnectionState.gatheringOffer);

    try {
      await _cleanupConnection();
      _peerConnection = await createPeerConnection(_rtcConfig);

      final gatheringCompleter = Completer<void>();

      _peerConnection!.onIceCandidate = (candidate) {
        if (candidate.candidate != null && candidate.candidate!.isNotEmpty) {
          _gatheredCandidates.add({
            'candidate': candidate.candidate,
            'sdpMid': candidate.sdpMid,
            'sdpMLineIndex': candidate.sdpMLineIndex,
          });
        }
      };

      _peerConnection!.onIceGatheringState = (state) {
        if (state == RTCIceGatheringState.RTCIceGatheringStateComplete) {
          if (!gatheringCompleter.isCompleted) {
            gatheringCompleter.complete();
          }
        }
      };

      // Create Data Channel on Host
      final dcInit = RTCDataChannelInit()..ordered = true;
      _dataChannel =
          await _peerConnection!.createDataChannel('sudoku_duel_dc', dcInit);
      _setupDataChannel(_dataChannel!);

      // Create Offer
      final offer = await _peerConnection!.createOffer({
        'offerToReceiveVideo': false,
        'offerToReceiveAudio': false,
      });
      await _peerConnection!.setLocalDescription(offer);

      // Wait for ICE candidates gathering (or max 2.5 seconds timeout)
      await gatheringCompleter.future.timeout(
        const Duration(milliseconds: 2500),
        onTimeout: () => null,
      );

      final localDesc = await _peerConnection!.getLocalDescription();
      final payload = P2POfferPayload(
        sdp: localDesc?.sdp ?? offer.sdp ?? '',
        type: localDesc?.type ?? offer.type ?? 'offer',
        candidates: List.from(_gatheredCandidates),
        puzzle: puzzle,
        playerName: playerName,
      );

      _setStatus(P2PConnectionState.offerReady);
      return P2PCodec.encodeOffer(payload);
    } catch (e) {
      _errorMessage = 'Failed to create host room: $e';
      _setStatus(P2PConnectionState.error);
      rethrow;
    }
  }

  /// Host flow step 2: Accepts Guest's Answer Code to complete connection.
  Future<void> acceptGuestAnswer(String answerCode) async {
    if (_peerConnection == null) {
      throw Exception('PeerConnection is not initialized.');
    }
    _setStatus(P2PConnectionState.connecting);

    try {
      final answerPayload = P2PCodec.decodeAnswer(answerCode);
      _remotePlayerName = answerPayload.playerName;

      final remoteDesc =
          RTCSessionDescription(answerPayload.sdp, answerPayload.type);
      await _peerConnection!.setRemoteDescription(remoteDesc);

      // Add candidates
      for (final cand in answerPayload.candidates) {
        try {
          await _peerConnection!.addCandidate(RTCIceCandidate(
            cand['candidate'] as String?,
            cand['sdpMid'] as String?,
            cand['sdpMLineIndex'] as int?,
          ));
        } catch (_) {}
      }
      notifyListeners();
    } catch (e) {
      _errorMessage = 'Failed to connect with opponent answer: $e';
      _setStatus(P2PConnectionState.error);
      rethrow;
    }
  }

  /// Guest flow: Accepts Host's Offer Code, gathers ICE candidates, and returns
  /// a self-contained compressed Answer Code.
  Future<String> joinGuestWithOffer(String offerCode,
      {String playerName = 'Player 2'}) async {
    _isHost = false;
    _localPlayerName = playerName;
    _errorMessage = null;
    _gatheredCandidates.clear();
    _setStatus(P2PConnectionState.gatheringAnswer);

    try {
      await _cleanupConnection();
      final offerPayload = P2PCodec.decodeOffer(offerCode);
      _puzzle = offerPayload.puzzle;
      _remotePlayerName = offerPayload.playerName;

      _peerConnection = await createPeerConnection(_rtcConfig);

      final gatheringCompleter = Completer<void>();

      _peerConnection!.onIceCandidate = (candidate) {
        if (candidate.candidate != null && candidate.candidate!.isNotEmpty) {
          _gatheredCandidates.add({
            'candidate': candidate.candidate,
            'sdpMid': candidate.sdpMid,
            'sdpMLineIndex': candidate.sdpMLineIndex,
          });
        }
      };

      _peerConnection!.onIceGatheringState = (state) {
        if (state == RTCIceGatheringState.RTCIceGatheringStateComplete) {
          if (!gatheringCompleter.isCompleted) {
            gatheringCompleter.complete();
          }
        }
      };

      // Listen for Data Channel from Host
      _peerConnection!.onDataChannel = (channel) {
        _dataChannel = channel;
        _setupDataChannel(channel);
      };

      // Set Remote Description (Host Offer)
      final remoteDesc =
          RTCSessionDescription(offerPayload.sdp, offerPayload.type);
      await _peerConnection!.setRemoteDescription(remoteDesc);

      // Add offer ICE candidates
      for (final cand in offerPayload.candidates) {
        try {
          await _peerConnection!.addCandidate(RTCIceCandidate(
            cand['candidate'] as String?,
            cand['sdpMid'] as String?,
            cand['sdpMLineIndex'] as int?,
          ));
        } catch (_) {}
      }

      // Create Answer
      final answer = await _peerConnection!.createAnswer({
        'offerToReceiveVideo': false,
        'offerToReceiveAudio': false,
      });
      await _peerConnection!.setLocalDescription(answer);

      // Wait for ICE candidates gathering (or max 2.5 seconds timeout)
      await gatheringCompleter.future.timeout(
        const Duration(milliseconds: 2500),
        onTimeout: () => null,
      );

      final localDesc = await _peerConnection!.getLocalDescription();
      final answerPayload = P2PAnswerPayload(
        sdp: localDesc?.sdp ?? answer.sdp ?? '',
        type: localDesc?.type ?? answer.type ?? 'answer',
        candidates: List.from(_gatheredCandidates),
        playerName: playerName,
      );

      _setStatus(P2PConnectionState.answerReady);
      return P2PCodec.encodeAnswer(answerPayload);
    } catch (e) {
      _errorMessage = 'Invalid invite code or connection error: $e';
      _setStatus(P2PConnectionState.error);
      rethrow;
    }
  }

  void _setupDataChannel(RTCDataChannel channel) {
    channel.onDataChannelState = (state) {
      if (state == RTCDataChannelState.RTCDataChannelOpen) {
        _setStatus(P2PConnectionState.connected);
        _startPingTicker();
        // Send handshake greetings
        sendMessage({
          'type': 'handshake',
          'name': _localPlayerName,
        });
      } else if (state == RTCDataChannelState.RTCDataChannelClosed) {
        _stopPingTicker();
        _setStatus(P2PConnectionState.disconnected);
      }
    };

    channel.onMessage = (RTCDataChannelMessage message) {
      try {
        final data = jsonDecode(message.text) as Map<String, dynamic>;
        final type = data['type'] as String?;

        if (type == 'ping') {
          sendMessage({'type': 'pong', 'time': data['time']});
          return;
        } else if (type == 'pong') {
          final sentTime = data['time'] as int? ?? 0;
          if (sentTime > 0) {
            _currentLatencyMs =
                DateTime.now().millisecondsSinceEpoch - sentTime;
            notifyListeners();
          }
          return;
        } else if (type == 'handshake') {
          _remotePlayerName = data['name'] as String? ?? 'Opponent';
          notifyListeners();
        }

        if (!_messagesController.isClosed) {
          _messagesController.add(data);
        }
      } catch (e) {
        debugPrint('Error parsing WebRTC message: $e');
      }
    };
  }

  void _startPingTicker() {
    _pingTimer?.cancel();
    _pingTimer = Timer.periodic(const Duration(seconds: 3), (_) {
      if (_status == P2PConnectionState.connected && _dataChannel != null) {
        _lastPingTimestamp = DateTime.now().millisecondsSinceEpoch;
        sendMessage({'type': 'ping', 'time': _lastPingTimestamp});
      }
    });
  }

  void _stopPingTicker() {
    _pingTimer?.cancel();
    _pingTimer = null;
  }

  void sendMessage(Map<String, dynamic> data) {
    if (_dataChannel != null &&
        _dataChannel!.state == RTCDataChannelState.RTCDataChannelOpen) {
      _dataChannel!.send(RTCDataChannelMessage(jsonEncode(data)));
    }
  }

  Future<void> _cleanupConnection() async {
    _stopPingTicker();
    try {
      await _dataChannel?.close();
      await _peerConnection?.close();
    } catch (_) {}
    _dataChannel = null;
    _peerConnection = null;
  }

  @override
  void dispose() {
    _cleanupConnection();
    _messagesController.close();
    super.dispose();
  }
}
