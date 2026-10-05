import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../../core/services/web_navigation_service.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../sudoku/domain/engine/sudoku_generator.dart';
import '../../../sudoku/domain/entities/difficulty.dart';
import '../../domain/mistake_rule.dart';
import '../../domain/p2p_room_service.dart';
import 'multiplayer_room_game_screen.dart';

class HostDuelScreen extends StatefulWidget {
  final String playerName;

  const HostDuelScreen({super.key, required this.playerName});

  @override
  State<HostDuelScreen> createState() => _HostDuelScreenState();
}

class _HostDuelScreenState extends State<HostDuelScreen> {
  final P2PRoomService _roomService = P2PRoomService();

  Difficulty _difficulty = Difficulty.medium;
  MistakeRule _mistakeRule = MistakeRule.standard;
  bool _isRoomCreated = false;
  bool _isGeneratingInvite = false;

  @override
  void initState() {
    super.initState();
    _roomService.addListener(_onRoomServiceChanged);
  }

  void _onRoomServiceChanged() {
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    _roomService.removeListener(_onRoomServiceChanged);
    if (!_roomService.isGameStarted) {
      WebNavigationService.clearRoomUrl();
      _roomService.dispose();
    }
    super.dispose();
  }

  Future<void> _createRoom() async {
    setState(() => _isGeneratingInvite = true);

    try {
      final puzzle = await compute(
        SudokuGenerator.generate,
        GenerationRequest(difficulty: _difficulty),
      );

      _roomService.initializeHost(
        hostName: widget.playerName,
        puzzle: puzzle,
        mistakeRule: _mistakeRule,
      );

      WebNavigationService.setRoomUrl(_roomService.roomCode);

      if (mounted) {
        setState(() {
          _isRoomCreated = true;
          _isGeneratingInvite = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isGeneratingInvite = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to create room: $e')),
        );
      }
    }
  }

  void _startGame() {
    if (_roomService.connectedCount < 2) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Need at least 2 players to start!')),
      );
      return;
    }

    _roomService.startMatch();

    Navigator.of(context).pushReplacement(
      MaterialPageRoute(
        builder: (_) => MultiplayerRoomGameScreen(
          roomService: _roomService,
          localPlayerName: widget.playerName,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final players = _roomService.playersList;
    final roomCode = _roomService.roomCode;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Host Multiplayer Room'),
        centerTitle: true,
      ),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 560),
          child: ListView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
            children: [
              if (!_isRoomCreated) ...[
                // Difficulty Selection
                Text('Select Difficulty', style: theme.textTheme.titleMedium),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: Difficulty.values.map((d) {
                    final isSelected = d == _difficulty;
                    return ChoiceChip(
                      label: Text(d.label),
                      selected: isSelected,
                      onSelected: (selected) {
                        if (selected) setState(() => _difficulty = d);
                      },
                    );
                  }).toList(),
                ),

                const SizedBox(height: 20),

                // Mistake Rule Selection
                Text('Mistake Rule', style: theme.textTheme.titleMedium),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: MistakeRule.values.map((rule) {
                    final isSelected = rule == _mistakeRule;
                    return ChoiceChip(
                      label: Text(rule.label),
                      selected: isSelected,
                      onSelected: (selected) {
                        if (selected) setState(() => _mistakeRule = rule);
                      },
                    );
                  }).toList(),
                ),
                const SizedBox(height: 6),
                Text(
                  _mistakeRule.description,
                  style: TextStyle(
                    fontSize: 12,
                    color: isDark ? Colors.white60 : Colors.black54,
                    fontStyle: FontStyle.italic,
                  ),
                ),

                const SizedBox(height: 28),

                ElevatedButton.icon(
                  onPressed: _isGeneratingInvite ? null : _createRoom,
                  icon: _isGeneratingInvite
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Icon(Icons.meeting_room),
                  label: Text(_isGeneratingInvite
                      ? 'Creating 6-Digit Room...'
                      : 'Create Room & Get 6-Digit Code'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    minimumSize: const Size(double.infinity, 48),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                ),
              ] else ...[
                // Big 6-Digit Room Code Card
                Container(
                  padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 20),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: isDark
                          ? [const Color(0xFF252B43), const Color(0xFF1E2233)]
                          : [const Color(0xFFEEF2FF), const Color(0xFFE0E7FF)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: AppColors.primary.withValues(alpha: 0.35),
                      width: 1.5,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.primary.withValues(alpha: 0.1),
                        blurRadius: 16,
                        offset: const Offset(0, 6),
                      ),
                    ],
                  ),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.tag_rounded, size: 20, color: AppColors.primary),
                          const SizedBox(width: 6),
                          Text(
                            'ROOM CODE',
                            style: TextStyle(
                              letterSpacing: 2.0,
                              fontWeight: FontWeight.bold,
                              fontSize: 13,
                              color: isDark ? Colors.white70 : Colors.black87,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),

                      // Giant 6-digit PIN display
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: List.generate(6, (index) {
                          final digit = index < roomCode.length ? roomCode[index] : '-';
                          return Container(
                            margin: EdgeInsets.only(
                              left: 4,
                              right: index == 2 ? 14 : 4,
                            ),
                            width: 44,
                            height: 54,
                            decoration: BoxDecoration(
                              color: isDark ? const Color(0xFF181B26) : Colors.white,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: AppColors.primary.withValues(alpha: 0.5),
                                width: 2,
                              ),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withValues(alpha: 0.05),
                                  blurRadius: 6,
                                  offset: const Offset(0, 3),
                                ),
                              ],
                            ),
                            child: Center(
                              child: Text(
                                digit,
                                style: const TextStyle(
                                  fontSize: 26,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.primary,
                                ),
                              ),
                            ),
                          );
                        }),
                      ),

                      const SizedBox(height: 12),

                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: AppColors.primary.withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Text(
                              _difficulty.label,
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                                color: AppColors.primary,
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: AppColors.secondary.withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Text(
                              _mistakeRule.label,
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                                color: AppColors.secondary,
                              ),
                            ),
                          ),
                        ],
                      ),

                      const SizedBox(height: 18),

                      // Single Clean Copy Invite Link Button
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton.icon(
                          onPressed: () {
                            final url = WebNavigationService.getShareUrl(roomCode);
                            Clipboard.setData(ClipboardData(text: url));
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('⚡ Invite link copied! Send to friends to join instantly.'),
                                duration: Duration(seconds: 2),
                              ),
                            );
                          },
                          icon: const Icon(Icons.copy_rounded, size: 18),
                          label: const Text('Copy Invite Link'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 24),

                // Connected Players Card
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Players in Lobby (${players.length})',
                        style: theme.textTheme.titleSmall),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: AppColors.success.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 7,
                            height: 7,
                            decoration: const BoxDecoration(
                              color: AppColors.success,
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 5),
                          const Text(
                            'Listening for guests',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: AppColors.success,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),

                ...players.map((p) => Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.symmetric(
                          horizontal: 14, vertical: 10),
                      decoration: BoxDecoration(
                        color: isDark
                            ? const Color(0xFF1E2233)
                            : const Color(0xFFF1F3FA),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: p.color.withValues(alpha: 0.3),
                        ),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 28,
                            height: 28,
                            decoration: BoxDecoration(
                              color: p.color,
                              shape: BoxShape.circle,
                            ),
                            child: Center(
                              child: Text(
                                p.name.isNotEmpty
                                    ? p.name[0].toUpperCase()
                                    : 'P',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 13,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Row(
                              children: [
                                Text(
                                  p.name,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 14,
                                  ),
                                ),
                                if (p.isHost) ...[
                                  const SizedBox(width: 6),
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: Colors.amber.withValues(alpha: 0.2),
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: const Text(
                                      '👑 HOST',
                                      style: TextStyle(
                                        fontSize: 10,
                                        fontWeight: FontWeight.bold,
                                        color: Colors.amber,
                                      ),
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ),
                          const Icon(Icons.check_circle,
                              color: AppColors.success, size: 20),
                        ],
                      ),
                    )),

                const SizedBox(height: 28),

                ElevatedButton.icon(
                  onPressed: _roomService.connectedCount >= 2 ? _startGame : null,
                  icon: const Icon(Icons.play_arrow),
                  label: Text(_roomService.connectedCount >= 2
                      ? 'Launch Game for All ${_roomService.connectedCount} Players!'
                      : 'Waiting for players to enter code (Min 2)...'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.success,
                    foregroundColor: Colors.white,
                    minimumSize: const Size(double.infinity, 50),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
