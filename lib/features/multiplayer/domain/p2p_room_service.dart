import 'dart:async';
import 'dart:convert';
import 'dart:math';
import 'package:flutter/foundation.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import '../../sudoku/domain/entities/sudoku_puzzle.dart';
import 'mistake_rule.dart';
import 'p2p_codec.dart';
import 'player_progress.dart';
import 'room_signaling_service.dart';

class PeerSession {
  final String peerId;
  String playerName;
  int colorIndex;
  RTCPeerConnection peerConnection;
  RTCDataChannel? dataChannel;
  bool isConnected;
  int latencyMs;

  PeerSession({
    required this.peerId,
    required this.playerName,
    required this.colorIndex,
    required this.peerConnection,
    this.dataChannel,
    this.isConnected = false,
    this.latencyMs = 0,
  });
}

class P2PRoomService extends ChangeNotifier {
  static const Map<String, dynamic> _rtcConfig = {
    'iceServers': [
      {'urls': 'stun:stun.l.google.com:19302'},
      {'urls': 'stun:stun1.l.google.com:19302'},
      {'urls': 'stun:stun2.l.google.com:19302'},
    ],
    'sdpSemantics': 'unified-plan',
  };

  bool _isHost = false;
  String _roomCode = '';
  String _localPlayerId = 'host';
  String _localPlayerName = 'Host';
  SudokuPuzzle? _puzzle;
  MistakeRule _mistakeRule = MistakeRule.standard;
  RoomSignalingService? _signalingService;

  // Host: multiple peer sessions (one per connected guest)
  final Map<String, PeerSession> _peerSessions = {};

  // Pending invite slots for host (slotId -> { peerConnection, dataChannel, candidates })
  final Map<String, Map<String, dynamic>> _pendingHostInvites = {};

  // Guest: single peer connection to Host
  RTCPeerConnection? _guestPeerConnection;
  RTCDataChannel? _guestDataChannel;

  // Connected players in the room
  final Map<String, PlayerProgress> _players = {};

  bool _isGameStarted = false;
  Timer? _pingTimer;
  int _lastPingTimestamp = 0;

  final StreamController<Map<String, dynamic>> _messagesController =
      StreamController<Map<String, dynamic>>.broadcast();

  bool get isHost => _isHost;
  String get roomCode => _roomCode;
  String get localPlayerId => _localPlayerId;
  String get localPlayerName => _localPlayerName;
  SudokuPuzzle? get puzzle => _puzzle;
  MistakeRule get mistakeRule => _mistakeRule;
  bool get isGameStarted => _isGameStarted;
  List<PlayerProgress> get playersList => _players.values.toList();
  Map<String, PlayerProgress> get players => _players;
  Stream<Map<String, dynamic>> get messages => _messagesController.stream;

  int get connectedCount =>
      _isHost ? (_peerSessions.values.where((p) => p.isConnected).length + 1) : (_players.length);

  static String generate6DigitCode() {
    final rand = Random();
    return (100000 + rand.nextInt(900000)).toString();
  }

  void setPuzzle(SudokuPuzzle puzzle) {
    _puzzle = puzzle;
  }

  void setMistakeRule(MistakeRule rule) {
    _mistakeRule = rule;
    if (_isHost) {
      _broadcastToGuests({
        'type': 'mistake_rule_changed',
        'mistakeRule': rule.name,
      });
    }
    notifyListeners();
  }

  // ---------------------------------------------------------------------------
  // HOST METHODS
  // ---------------------------------------------------------------------------

  void initializeHost({
    required String hostName,
    required SudokuPuzzle puzzle,
    String? roomCode,
    MistakeRule mistakeRule = MistakeRule.standard,
  }) {
    _isHost = true;
    _localPlayerId = 'host';
    _localPlayerName = hostName;
    _puzzle = puzzle;
    _mistakeRule = mistakeRule;
    _isGameStarted = false;
    _peerSessions.clear();
    _pendingHostInvites.clear();
    _roomCode = roomCode ?? generate6DigitCode();

    _players.clear();
    _players[_localPlayerId] = PlayerProgress(
      id: _localPlayerId,
      name: hostName,
      colorIndex: 0,
      isHost: true,
      targetToFill: 81 - puzzle.givenCount,
    );
    notifyListeners();

    _setupHostSignaling();
  }

  void _setupHostSignaling() {
    _signalingService?.dispose();
    _signalingService =
        RoomSignalingService(roomCode: _roomCode, clientId: 'host');
    _signalingService!.connect().then((ok) {
      debugPrint('[Host] Room $_roomCode signaling connected: $ok');
    });

    _signalingService!.messages.listen((msg) async {
      final type = msg['type'] as String?;
      if (type == 'join_request') {
        final guestId = msg['guestId'] as String;
        final guestName = msg['guestName'] as String;
        debugPrint(
            '[Host] Guest joining via 6-digit code: $guestName ($guestId)');
        try {
          final offerCode = await generateHostInvite();
          _signalingService?.send({
            'type': 'offer',
            'targetGuestId': guestId,
            'offer': offerCode,
          });
        } catch (e) {
          debugPrint('[Host] Error creating auto-offer: $e');
        }
      } else if (type == 'answer') {
        final answerCode = msg['answer'] as String?;
        final guestId = msg['guestId'] as String?;
        if (answerCode != null) {
          debugPrint('[Host] Received answer from guest $guestId');
          try {
            await acceptGuestAnswer(answerCode);
          } catch (e) {
            debugPrint('[Host] Error accepting answer: $e');
          }
        }
      }
    });
  }

  /// Host generates an invite code for an incoming player slot.
  Future<String> generateHostInvite({String? slotLabel}) async {
    final slotId = 'slot_${DateTime.now().millisecondsSinceEpoch}_${_pendingHostInvites.length + 1}';
    final candidates = <Map<String, dynamic>>[];
    final gatheringCompleter = Completer<void>();

    final pc = await createPeerConnection(_rtcConfig);

    pc.onIceCandidate = (candidate) {
      if (candidate.candidate != null && candidate.candidate!.isNotEmpty) {
        candidates.add({
          'candidate': candidate.candidate,
          'sdpMid': candidate.sdpMid,
          'sdpMLineIndex': candidate.sdpMLineIndex,
        });
      }
    };

    pc.onIceGatheringState = (state) {
      if (state == RTCIceGatheringState.RTCIceGatheringStateComplete) {
        if (!gatheringCompleter.isCompleted) gatheringCompleter.complete();
      }
    };

    final dc = await pc.createDataChannel(
      'sudoku_room_dc_$slotId',
      RTCDataChannelInit()..ordered = true,
    );

    final offer = await pc.createOffer({
      'offerToReceiveVideo': false,
      'offerToReceiveAudio': false,
    });
    await pc.setLocalDescription(offer);

    await gatheringCompleter.future.timeout(
      const Duration(milliseconds: 2500),
      onTimeout: () => null,
    );

    final localDesc = await pc.getLocalDescription();
    final payload = P2POfferPayload(
      sdp: localDesc?.sdp ?? offer.sdp ?? '',
      type: localDesc?.type ?? offer.type ?? 'offer',
      candidates: List.from(candidates),
      puzzle: _puzzle!,
      playerName: _localPlayerName,
      mistakeRule: _mistakeRule.name,
    );

    _pendingHostInvites[slotId] = {
      'pc': pc,
      'dc': dc,
      'candidates': candidates,
      'slotId': slotId,
    };

    _setupHostDataChannel(slotId, dc, pc);

    return P2PCodec.encodeOffer(payload);
  }

  /// Host accepts answer code from a guest to finalize their connection.
  Future<void> acceptGuestAnswer(String answerCode) async {
    final answerPayload = P2PCodec.decodeAnswer(answerCode);

    // Find first pending invite slot that hasn't established remote description
    String? targetSlotId;
    for (final entry in _pendingHostInvites.entries) {
      final pc = entry.value['pc'] as RTCPeerConnection;
      if (pc.signalingState != RTCSignalingState.RTCSignalingStateStable) {
        targetSlotId = entry.key;
        break;
      }
    }

    if (targetSlotId == null) {
      throw Exception('No pending invite slot found waiting for answer.');
    }

    final slotData = _pendingHostInvites[targetSlotId]!;
    final pc = slotData['pc'] as RTCPeerConnection;

    final remoteDesc = RTCSessionDescription(answerPayload.sdp, answerPayload.type);
    await pc.setRemoteDescription(remoteDesc);

    for (final cand in answerPayload.candidates) {
      try {
        await pc.addCandidate(RTCIceCandidate(
          cand['candidate'] as String?,
          cand['sdpMid'] as String?,
          cand['sdpMLineIndex'] as int?,
        ));
      } catch (_) {}
    }
  }

  void _setupHostDataChannel(String slotId, RTCDataChannel dc, RTCPeerConnection pc) {
    dc.onDataChannelState = (state) {
      if (state == RTCDataChannelState.RTCDataChannelOpen) {
        final guestIndex = _peerSessions.length + 1;
        final peerId = 'guest_$slotId';

        final session = PeerSession(
          peerId: peerId,
          playerName: 'Player $guestIndex',
          colorIndex: guestIndex % PlayerProgress.playerColors.length,
          peerConnection: pc,
          dataChannel: dc,
          isConnected: true,
        );

        _peerSessions[peerId] = session;
        _pendingHostInvites.remove(slotId);

        _players[peerId] = PlayerProgress(
          id: peerId,
          name: session.playerName,
          colorIndex: session.colorIndex,
          targetToFill: 81 - (_puzzle?.givenCount ?? 0),
        );

        notifyListeners();

        // Send welcome packet with assigned ID and current players list
        dc.send(RTCDataChannelMessage(jsonEncode({
          'type': 'welcome',
          'assignedId': peerId,
          'assignedColorIndex': session.colorIndex,
          'players': _players.values.map((p) => p.toJson()).toList(),
          'isGameStarted': _isGameStarted,
          'mistakeRule': _mistakeRule.name,
        })));

        // Broadcast to all other guests that a new player joined
        _broadcastToGuests({
          'type': 'player_joined',
          'player': _players[peerId]!.toJson(),
        }, excludePeerId: peerId);

        _startPingTicker();
      } else if (state == RTCDataChannelState.RTCDataChannelClosed) {
        final peerId = 'guest_$slotId';
        _peerSessions.remove(peerId);
        _players.remove(peerId);
        notifyListeners();

        _broadcastToGuests({
          'type': 'player_left',
          'playerId': peerId,
        });
      }
    };

    dc.onMessage = (RTCDataChannelMessage msg) {
      try {
        final data = jsonDecode(msg.text) as Map<String, dynamic>;
        _handleHostIncomingMessage(slotId, data);
      } catch (e) {
        debugPrint('Error parsing message from guest: $e');
      }
    };
  }

  void _handleHostIncomingMessage(String slotId, Map<String, dynamic> data) {
    final type = data['type'] as String?;
    final senderId = data['playerId'] as String? ?? 'guest_$slotId';

    if (type == 'ping') {
      final session = _peerSessions[senderId];
      session?.dataChannel?.send(
        RTCDataChannelMessage(jsonEncode({'type': 'pong', 'time': data['time']})),
      );
      return;
    } else if (type == 'pong') {
      final session = _peerSessions[senderId];
      if (session != null) {
        final sentTime = data['time'] as int? ?? 0;
        if (sentTime > 0) {
          session.latencyMs = DateTime.now().millisecondsSinceEpoch - sentTime;
          if (_players.containsKey(senderId)) {
            _players[senderId] = _players[senderId]!.copyWith(latencyMs: session.latencyMs);
            notifyListeners();
          }
        }
      }
      return;
    } else if (type == 'set_name') {
      final newName = data['name'] as String? ?? 'Player';
      final session = _peerSessions[senderId];
      if (session != null) session.playerName = newName;
      if (_players.containsKey(senderId)) {
        _players[senderId] = _players[senderId]!.copyWith(name: newName);
      }
      notifyListeners();
      // Forward to other guests
      _broadcastToGuests(data, excludePeerId: senderId);
      return;
    } else if (type == 'progress') {
      if (_players.containsKey(senderId)) {
        _players[senderId] = _players[senderId]!.copyWith(
          filledCount: data['filledCount'] as int?,
          progressPercent: (data['progressPercent'] as num?)?.toDouble(),
          score: data['score'] as int?,
          lives: data['lives'] as int?,
          mistakes: data['mistakes'] as int?,
          isCompleted: data['isCompleted'] as bool?,
          isDefeated: data['isDefeated'] as bool?,
        );
        _updateRanks();
        notifyListeners();
      }
      // Forward progress to all other guests!
      _broadcastToGuests(data, excludePeerId: senderId);
    } else if (type == 'emoji') {
      if (_players.containsKey(senderId)) {
        _players[senderId] = _players[senderId]!.copyWith(
          recentEmoji: data['emoji'] as String?,
        );
        notifyListeners();
      }
      // Broadcast emoji to all other guests!
      _broadcastToGuests(data, excludePeerId: senderId);
    }

    if (!_messagesController.isClosed) {
      _messagesController.add(data);
    }
  }

  void _broadcastToGuests(Map<String, dynamic> data, {String? excludePeerId}) {
    final raw = jsonEncode(data);
    for (final session in _peerSessions.values) {
      if (session.peerId != excludePeerId &&
          session.isConnected &&
          session.dataChannel?.state == RTCDataChannelState.RTCDataChannelOpen) {
        session.dataChannel!.send(RTCDataChannelMessage(raw));
      }
    }
  }

  /// Host triggers the start of the match for all connected peers
  void startMatch() {
    if (!_isHost) return;
    _isGameStarted = true;
    _broadcastToGuests({
      'type': 'start_game',
      'mistakeRule': _mistakeRule.name,
    });
    notifyListeners();
  }

  // ---------------------------------------------------------------------------
  // GUEST METHODS
  // ---------------------------------------------------------------------------

  /// Connect to room using 6-digit room code with zero manual answer exchange
  Future<void> joinWith6DigitCode({
    required String roomCode,
    required String guestName,
  }) async {
    _isHost = false;
    _roomCode = roomCode.trim();
    _localPlayerId =
        'guest_${DateTime.now().millisecondsSinceEpoch}_${Random().nextInt(999)}';
    _localPlayerName = guestName;
    _isGameStarted = false;

    _signalingService?.dispose();
    _signalingService =
        RoomSignalingService(roomCode: _roomCode, clientId: _localPlayerId);

    final ok = await _signalingService!.connect();
    if (!ok) {
      throw Exception(
          'Could not connect to room network for $_roomCode. Check your network.');
    }

    final completer = Completer<void>();

    _signalingService!.messages.listen((msg) async {
      final type = msg['type'] as String?;
      if (type == 'offer') {
        final target = msg['targetGuestId'] as String?;
        if (target == _localPlayerId) {
          debugPrint('[Guest] Received host offer for room $_roomCode!');
          try {
            final offerCode = msg['offer'] as String;
            final answerCode =
                await joinGuestWithOffer(offerCode, playerName: guestName);
            _signalingService?.send({
              'type': 'answer',
              'guestId': _localPlayerId,
              'answer': answerCode,
            });
            if (!completer.isCompleted) completer.complete();
          } catch (e) {
            debugPrint('[Guest] Error processing offer: $e');
            if (!completer.isCompleted) completer.completeError(e);
          }
        }
      }
    });

    // Send join request to host
    _signalingService!.send({
      'type': 'join_request',
      'guestId': _localPlayerId,
      'guestName': guestName,
    });

    return await completer.future.timeout(
      const Duration(seconds: 15),
      onTimeout: () {
        if (_players.length <= 1 &&
            (_guestDataChannel == null ||
                _guestDataChannel?.state !=
                    RTCDataChannelState.RTCDataChannelOpen)) {
          throw Exception(
              'Room $_roomCode not found. Ensure the host is in the lobby.');
        }
      },
    );
  }

  /// Guest joins with Host's offer code
  Future<String> joinGuestWithOffer(
    String offerCode, {
    required String playerName,
  }) async {
    _isHost = false;
    _localPlayerName = playerName;
    _localPlayerId = 'guest_${DateTime.now().millisecondsSinceEpoch}';
    _isGameStarted = false;

    final offerPayload = P2PCodec.decodeOffer(offerCode);
    _puzzle = offerPayload.puzzle;
    try {
      _mistakeRule = MistakeRule.values.firstWhere(
        (r) => r.name == offerPayload.mistakeRule,
        orElse: () => MistakeRule.standard,
      );
    } catch (_) {
      _mistakeRule = MistakeRule.standard;
    }

    _players.clear();
    // Prepopulate host
    _players['host'] = PlayerProgress(
      id: 'host',
      name: offerPayload.playerName,
      colorIndex: 0,
      isHost: true,
      targetToFill: 81 - _puzzle!.givenCount,
    );

    _guestPeerConnection = await createPeerConnection(_rtcConfig);
    final gatheringCompleter = Completer<void>();
    final candidates = <Map<String, dynamic>>[];

    _guestPeerConnection!.onIceCandidate = (candidate) {
      if (candidate.candidate != null && candidate.candidate!.isNotEmpty) {
        candidates.add({
          'candidate': candidate.candidate,
          'sdpMid': candidate.sdpMid,
          'sdpMLineIndex': candidate.sdpMLineIndex,
        });
      }
    };

    _guestPeerConnection!.onIceGatheringState = (state) {
      if (state == RTCIceGatheringState.RTCIceGatheringStateComplete) {
        if (!gatheringCompleter.isCompleted) gatheringCompleter.complete();
      }
    };

    _guestPeerConnection!.onDataChannel = (channel) {
      _guestDataChannel = channel;
      _setupGuestDataChannel(channel);
    };

    final remoteDesc = RTCSessionDescription(offerPayload.sdp, offerPayload.type);
    await _guestPeerConnection!.setRemoteDescription(remoteDesc);

    for (final cand in offerPayload.candidates) {
      try {
        await _guestPeerConnection!.addCandidate(RTCIceCandidate(
          cand['candidate'] as String?,
          cand['sdpMid'] as String?,
          cand['sdpMLineIndex'] as int?,
        ));
      } catch (_) {}
    }

    final answer = await _guestPeerConnection!.createAnswer({
      'offerToReceiveVideo': false,
      'offerToReceiveAudio': false,
    });
    await _guestPeerConnection!.setLocalDescription(answer);

    await gatheringCompleter.future.timeout(
      const Duration(milliseconds: 2500),
      onTimeout: () => null,
    );

    final localDesc = await _guestPeerConnection!.getLocalDescription();
    final answerPayload = P2PAnswerPayload(
      sdp: localDesc?.sdp ?? answer.sdp ?? '',
      type: localDesc?.type ?? answer.type ?? 'answer',
      candidates: List.from(candidates),
      playerName: playerName,
    );

    return P2PCodec.encodeAnswer(answerPayload);
  }

  void _setupGuestDataChannel(RTCDataChannel channel) {
    channel.onDataChannelState = (state) {
      if (state == RTCDataChannelState.RTCDataChannelOpen) {
        // Send nickname to host
        channel.send(RTCDataChannelMessage(jsonEncode({
          'type': 'set_name',
          'playerId': _localPlayerId,
          'name': _localPlayerName,
        })));
        _startPingTicker();
        notifyListeners();
      } else if (state == RTCDataChannelState.RTCDataChannelClosed) {
        _stopPingTicker();
        notifyListeners();
      }
    };

    channel.onMessage = (RTCDataChannelMessage msg) {
      try {
        final data = jsonDecode(msg.text) as Map<String, dynamic>;
        _handleGuestIncomingMessage(data);
      } catch (e) {
        debugPrint('Error parsing message from host: $e');
      }
    };
  }

  void _handleGuestIncomingMessage(Map<String, dynamic> data) {
    final type = data['type'] as String?;

    if (type == 'welcome') {
      _localPlayerId = data['assignedId'] as String? ?? _localPlayerId;
      final assignedColor = data['assignedColorIndex'] as int? ?? 1;

      final incomingList = data['players'] as List? ?? [];
      for (final item in incomingList) {
        final p = PlayerProgress.fromJson(Map<String, dynamic>.from(item as Map));
        _players[p.id] = p;
      }

      // Ensure local player progress exists
      _players[_localPlayerId] = PlayerProgress(
        id: _localPlayerId,
        name: _localPlayerName,
        colorIndex: assignedColor,
        isHost: false,
        targetToFill: 81 - (_puzzle?.givenCount ?? 0),
      );

      if (data['isGameStarted'] == true) {
        _isGameStarted = true;
      }
      if (data['mistakeRule'] != null) {
        try {
          _mistakeRule = MistakeRule.values.firstWhere(
            (r) => r.name == data['mistakeRule'],
            orElse: () => _mistakeRule,
          );
        } catch (_) {}
      }
      notifyListeners();
    } else if (type == 'start_game') {
      _isGameStarted = true;
      if (data['mistakeRule'] != null) {
        try {
          _mistakeRule = MistakeRule.values.firstWhere(
            (r) => r.name == data['mistakeRule'],
            orElse: () => _mistakeRule,
          );
        } catch (_) {}
      }
      notifyListeners();
    } else if (type == 'mistake_rule_changed') {
      final ruleName = data['mistakeRule'] as String?;
      if (ruleName != null) {
        try {
          _mistakeRule = MistakeRule.values.firstWhere(
            (r) => r.name == ruleName,
            orElse: () => _mistakeRule,
          );
          notifyListeners();
        } catch (_) {}
      }
    } else if (type == 'player_joined') {
      final pMap = data['player'] as Map<String, dynamic>;
      final p = PlayerProgress.fromJson(pMap);
      _players[p.id] = p;
      notifyListeners();
    } else if (type == 'player_left') {
      final pid = data['playerId'] as String?;
      if (pid != null) {
        _players.remove(pid);
        notifyListeners();
      }
    } else if (type == 'progress') {
      final pid = data['playerId'] as String?;
      if (pid != null && _players.containsKey(pid)) {
        _players[pid] = _players[pid]!.copyWith(
          filledCount: data['filledCount'] as int?,
          progressPercent: (data['progressPercent'] as num?)?.toDouble(),
          score: data['score'] as int?,
          lives: data['lives'] as int?,
          mistakes: data['mistakes'] as int?,
          isCompleted: data['isCompleted'] as bool?,
          isDefeated: data['isDefeated'] as bool?,
        );
        _updateRanks();
        notifyListeners();
      }
    } else if (type == 'emoji') {
      final pid = data['playerId'] as String?;
      if (pid != null && _players.containsKey(pid)) {
        _players[pid] = _players[pid]!.copyWith(
          recentEmoji: data['emoji'] as String?,
        );
        notifyListeners();
      }
    } else if (type == 'ping') {
      _guestDataChannel?.send(
        RTCDataChannelMessage(jsonEncode({'type': 'pong', 'time': data['time']})),
      );
      return;
    } else if (type == 'pong') {
      final sentTime = data['time'] as int? ?? 0;
      if (sentTime > 0) {
        final latency = DateTime.now().millisecondsSinceEpoch - sentTime;
        if (_players.containsKey(_localPlayerId)) {
          _players[_localPlayerId] = _players[_localPlayerId]!.copyWith(latencyMs: latency);
          notifyListeners();
        }
      }
      return;
    }

    if (!_messagesController.isClosed) {
      _messagesController.add(data);
    }
  }

  // ---------------------------------------------------------------------------
  // SHARED BROADCAST & SYNC
  // ---------------------------------------------------------------------------

  void sendProgressUpdate({
    required int filledCount,
    required double progressPercent,
    required int score,
    required int lives,
    required int mistakes,
    required bool isCompleted,
    required bool isDefeated,
  }) {
    // Update local state
    if (_players.containsKey(_localPlayerId)) {
      _players[_localPlayerId] = _players[_localPlayerId]!.copyWith(
        filledCount: filledCount,
        progressPercent: progressPercent,
        score: score,
        lives: lives,
        mistakes: mistakes,
        isCompleted: isCompleted,
        isDefeated: isDefeated,
      );
      _updateRanks();
      notifyListeners();
    }

    final packet = {
      'type': 'progress',
      'playerId': _localPlayerId,
      'filledCount': filledCount,
      'progressPercent': progressPercent,
      'score': score,
      'lives': lives,
      'mistakes': mistakes,
      'isCompleted': isCompleted,
      'isDefeated': isDefeated,
    };

    if (_isHost) {
      _broadcastToGuests(packet);
    } else {
      _guestDataChannel?.send(RTCDataChannelMessage(jsonEncode(packet)));
    }
  }

  void sendEmojiReaction(String emoji) {
    if (_players.containsKey(_localPlayerId)) {
      _players[_localPlayerId] = _players[_localPlayerId]!.copyWith(recentEmoji: emoji);
      notifyListeners();
    }

    final packet = {
      'type': 'emoji',
      'playerId': _localPlayerId,
      'emoji': emoji,
    };

    if (_isHost) {
      _broadcastToGuests(packet);
    } else {
      _guestDataChannel?.send(RTCDataChannelMessage(jsonEncode(packet)));
    }
  }

  void _updateRanks() {
    final list = _players.values.toList();
    // Sort: completed first, then highest progress %, then highest score, then least mistakes
    list.sort((a, b) {
      if (a.isCompleted && !b.isCompleted) return -1;
      if (!a.isCompleted && b.isCompleted) return 1;
      final cmpProgress = b.progressPercent.compareTo(a.progressPercent);
      if (cmpProgress != 0) return cmpProgress;
      final cmpScore = b.score.compareTo(a.score);
      if (cmpScore != 0) return cmpScore;
      return a.mistakes.compareTo(b.mistakes);
    });

    for (int i = 0; i < list.length; i++) {
      _players[list[i].id] = list[i].copyWith(rank: i + 1);
    }
  }

  void _startPingTicker() {
    _pingTimer?.cancel();
    _pingTimer = Timer.periodic(const Duration(seconds: 3), (_) {
      _lastPingTimestamp = DateTime.now().millisecondsSinceEpoch;
      final pingMsg = jsonEncode({'type': 'ping', 'time': _lastPingTimestamp});

      if (_isHost) {
        for (final s in _peerSessions.values) {
          if (s.isConnected &&
              s.dataChannel?.state == RTCDataChannelState.RTCDataChannelOpen) {
            s.dataChannel!.send(RTCDataChannelMessage(pingMsg));
          }
        }
      } else {
        if (_guestDataChannel?.state == RTCDataChannelState.RTCDataChannelOpen) {
          _guestDataChannel!.send(RTCDataChannelMessage(pingMsg));
        }
      }
    });
  }

  void _stopPingTicker() {
    _pingTimer?.cancel();
    _pingTimer = null;
  }

  @override
  void dispose() {
    _stopPingTicker();
    for (final s in _peerSessions.values) {
      try {
        s.dataChannel?.close();
        s.peerConnection.close();
      } catch (_) {}
    }
    for (final pending in _pendingHostInvites.values) {
      try {
        (pending['dc'] as RTCDataChannel?)?.close();
        (pending['pc'] as RTCPeerConnection?)?.close();
      } catch (_) {}
    }
    _guestDataChannel?.close();
    _guestPeerConnection?.close();
    _signalingService?.dispose();
    _messagesController.close();
    super.dispose();
  }
}
