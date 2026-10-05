import 'dart:convert';
import 'package:archive/archive.dart';
import '../../sudoku/domain/entities/sudoku_puzzle.dart';

class P2POfferPayload {
  final String sdp;
  final String type;
  final List<Map<String, dynamic>> candidates;
  final SudokuPuzzle puzzle;
  final String playerName;
  final String mistakeRule;

  const P2POfferPayload({
    required this.sdp,
    required this.type,
    required this.candidates,
    required this.puzzle,
    required this.playerName,
    this.mistakeRule = 'standard',
  });

  Map<String, dynamic> toJson() => {
        'sdp': sdp,
        'type': type,
        'candidates': candidates,
        'puzzle': {
          'givens': puzzle.givens,
          'solution': puzzle.solution,
          'difficulty': puzzle.difficulty.name,
          'seed': puzzle.seed,
        },
        'player': playerName,
        'mistakeRule': mistakeRule,
      };

  factory P2POfferPayload.fromJson(Map<String, dynamic> json) {
    final puzzleMap = json['puzzle'] as Map<String, dynamic>;
    return P2POfferPayload(
      sdp: json['sdp'] as String,
      type: json['type'] as String? ?? 'offer',
      candidates: (json['candidates'] as List? ?? [])
          .map((c) => Map<String, dynamic>.from(c as Map))
          .toList(),
      puzzle: SudokuPuzzle.fromJson(puzzleMap),
      playerName: json['player'] as String? ?? 'Host',
      mistakeRule: json['mistakeRule'] as String? ?? 'standard',
    );
  }
}

class P2PAnswerPayload {
  final String sdp;
  final String type;
  final List<Map<String, dynamic>> candidates;
  final String playerName;

  const P2PAnswerPayload({
    required this.sdp,
    required this.type,
    required this.candidates,
    required this.playerName,
  });

  Map<String, dynamic> toJson() => {
        'sdp': sdp,
        'type': type,
        'candidates': candidates,
        'player': playerName,
      };

  factory P2PAnswerPayload.fromJson(Map<String, dynamic> json) {
    return P2PAnswerPayload(
      sdp: json['sdp'] as String,
      type: json['type'] as String? ?? 'answer',
      candidates: (json['candidates'] as List? ?? [])
          .map((c) => Map<String, dynamic>.from(c as Map))
          .toList(),
      playerName: json['player'] as String? ?? 'Guest',
    );
  }
}

class P2PCodec {
  static const String offerPrefix = 'SD-OFFER:';
  static const String answerPrefix = 'SD-ANSWER:';

  static String compress(Map<String, dynamic> data) {
    final jsonStr = jsonEncode(data);
    final rawBytes = utf8.encode(jsonStr);
    final compressedBytes = const GZipEncoder().encode(rawBytes);
    return base64UrlEncode(compressedBytes);
  }

  static Map<String, dynamic> decompress(String encoded) {
    String clean = encoded.trim();
    if (clean.startsWith(offerPrefix)) {
      clean = clean.substring(offerPrefix.length).trim();
    } else if (clean.startsWith(answerPrefix)) {
      clean = clean.substring(answerPrefix.length).trim();
    }
    // Remove any newlines or spaces that could be added during copy-paste
    clean = clean.replaceAll(RegExp(r'[\r\n\s]+'), '');

    final decodedBytes = base64Url.decode(clean);
    final decompressedBytes = const GZipDecoder().decodeBytes(decodedBytes);
    final jsonStr = utf8.decode(decompressedBytes);
    return jsonDecode(jsonStr) as Map<String, dynamic>;
  }

  static String encodeOffer(P2POfferPayload offer) {
    return '$offerPrefix${compress(offer.toJson())}';
  }

  static P2POfferPayload decodeOffer(String code) {
    final map = decompress(code);
    return P2POfferPayload.fromJson(map);
  }

  static String encodeAnswer(P2PAnswerPayload answer) {
    return '$answerPrefix${compress(answer.toJson())}';
  }

  static P2PAnswerPayload decodeAnswer(String code) {
    final map = decompress(code);
    return P2PAnswerPayload.fromJson(map);
  }
}
