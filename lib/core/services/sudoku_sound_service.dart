import 'package:audioplayers/audioplayers.dart';

class SudokuSoundService {
  final AudioPlayer _player = AudioPlayer();

  Future<void> playCellError() async {
    await _player.play(
      AssetSource('sounds/error_cell.mp3'),
    );
  }

  Future<void> playCellSuccess() async {
    await _player.play(
      AssetSource('sounds/success_cell.mp3'),
    );
  }

  Future<void> playAllNumberFilled() async {
    await _player.play(
      AssetSource('sounds/number_completion.mp3'),
    );
  }

  Future<void> playCompletion() async {
    await _player.play(
      AssetSource('sounds/number_completion.mp3'),
    );
  }

  Future<void> dispose() async {
    await _player.dispose();
  }
}
