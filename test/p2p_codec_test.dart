import 'package:flutter_test/flutter_test.dart';
import 'package:sudoku_duel/features/multiplayer/domain/p2p_codec.dart';
import 'package:sudoku_duel/features/sudoku/domain/entities/difficulty.dart';
import 'package:sudoku_duel/features/sudoku/domain/entities/sudoku_puzzle.dart';

void main() {
  group('P2PCodec Tests', () {
    test('Offer serialization and compression round-trip', () {
      final sampleGivens = List<int>.generate(81, (i) => i % 9 == 0 ? (i ~/ 9 + 1) : 0);
      final sampleSolution = List<int>.generate(81, (i) => (i % 9) + 1);
      final puzzle = SudokuPuzzle(
        givens: sampleGivens,
        solution: sampleSolution,
        difficulty: Difficulty.hard,
        seed: 'test-seed-12345',
      );

      final originalOffer = P2POfferPayload(
        sdp: 'v=0\r\no=- 12345 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\nm=application 9 DTLS/SCTP 5000\r\nc=IN IP4 127.0.0.1\r\n',
        type: 'offer',
        candidates: [
          {
            'candidate': 'candidate:1 1 UDP 2130706431 192.168.1.100 54321 typ host',
            'sdpMid': '0',
            'sdpMLineIndex': 0,
          }
        ],
        puzzle: puzzle,
        playerName: 'Alice',
      );

      // Encode
      final encoded = P2PCodec.encodeOffer(originalOffer);
      expect(encoded.startsWith('SD-OFFER:'), isTrue);

      // Decode
      final decoded = P2PCodec.decodeOffer(encoded);
      expect(decoded.playerName, equals('Alice'));
      expect(decoded.type, equals('offer'));
      expect(decoded.sdp, equals(originalOffer.sdp));
      expect(decoded.candidates.length, equals(1));
      expect(decoded.candidates.first['candidate'], contains('candidate:1'));
      expect(decoded.puzzle.difficulty, equals(Difficulty.hard));
      expect(decoded.puzzle.seed, equals('test-seed-12345'));
      expect(decoded.puzzle.givens, equals(sampleGivens));
      expect(decoded.puzzle.solution, equals(sampleSolution));
    });

    test('Answer serialization and compression round-trip', () {
      const originalAnswer = P2PAnswerPayload(
        sdp: 'v=0\r\no=- 54321 2 IN IP4 127.0.0.1\r\ns=-\r\nm=application 9 DTLS/SCTP 5000\r\n',
        type: 'answer',
        candidates: [
          {
            'candidate': 'candidate:2 1 UDP 2130706431 10.0.0.5 54322 typ host',
            'sdpMid': '0',
            'sdpMLineIndex': 0,
          }
        ],
        playerName: 'Bob',
      );

      final encoded = P2PCodec.encodeAnswer(originalAnswer);
      expect(encoded.startsWith('SD-ANSWER:'), isTrue);

      final decoded = P2PCodec.decodeAnswer(encoded);
      expect(decoded.playerName, equals('Bob'));
      expect(decoded.type, equals('answer'));
      expect(decoded.sdp, equals(originalAnswer.sdp));
      expect(decoded.candidates.length, equals(1));
    });
  });
}
