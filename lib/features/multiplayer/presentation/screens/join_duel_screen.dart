import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../../core/services/web_navigation_service.dart';
import '../../../../core/theme/app_colors.dart';
import '../../domain/p2p_room_service.dart';
import 'multiplayer_room_game_screen.dart';

class JoinDuelScreen extends StatefulWidget {
  final String playerName;
  final String? initialInviteCode;

  const JoinDuelScreen({
    super.key,
    required this.playerName,
    this.initialInviteCode,
  });

  @override
  State<JoinDuelScreen> createState() => _JoinDuelScreenState();
}

class _JoinDuelScreenState extends State<JoinDuelScreen> {
  final P2PRoomService _roomService = P2PRoomService();
  final TextEditingController _codeController = TextEditingController();

  bool _isConnecting = false;
  bool _isConnected = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _roomService.addListener(_onRoomServiceChanged);

    final code = widget.initialInviteCode ?? WebNavigationService.extractRoomCode(Uri.base);

    if (code != null && code.isNotEmpty) {
      _codeController.text = code.trim();
      if (_codeController.text.length == 6) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          _joinRoom();
        });
      }
    }
  }

  void _onRoomServiceChanged() {
    if (_roomService.isGameStarted && mounted) {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (_) => MultiplayerRoomGameScreen(
            roomService: _roomService,
            localPlayerName: widget.playerName,
          ),
        ),
      );
    } else if (mounted) {
      setState(() {});
    }
  }

  @override
  void dispose() {
    _roomService.removeListener(_onRoomServiceChanged);
    _codeController.dispose();
    if (!_roomService.isGameStarted) {
      WebNavigationService.clearRoomUrl();
      _roomService.dispose();
    }
    super.dispose();
  }

  Future<void> _joinRoom() async {
    final code = _codeController.text.trim();
    if (code.length != 6) {
      setState(() => _errorMessage = 'Please enter a valid 6-digit room code');
      return;
    }

    setState(() {
      _isConnecting = true;
      _errorMessage = null;
    });

    try {
      await _roomService.joinWith6DigitCode(
        roomCode: code,
        guestName: widget.playerName,
      );

      if (mounted) {
        WebNavigationService.setRoomUrl(code);
        setState(() {
          _isConnecting = false;
          _isConnected = true;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isConnecting = false;
          _errorMessage = e.toString().replaceFirst('Exception: ', '');
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final players = _roomService.playersList;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Join Multiplayer Room'),
        centerTitle: true,
      ),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 500),
          child: ListView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
            children: [
              if (!_isConnected) ...[
                const Center(
                  child: Text(
                    'Enter 6-Digit Room Code',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                const SizedBox(height: 20),

                // 6-digit PIN input
                TextField(
                  controller: _codeController,
                  keyboardType: TextInputType.number,
                  maxLength: 6,
                  textAlign: TextAlign.center,
                  autofocus: true,
                  style: const TextStyle(
                    fontSize: 32,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 12.0,
                    fontFamily: 'monospace',
                  ),
                  inputFormatters: [
                    FilteringTextInputFormatter.digitsOnly,
                  ],
                  decoration: InputDecoration(
                    counterText: '',
                    hintText: '000000',
                    hintStyle: TextStyle(
                      fontSize: 32,
                      letterSpacing: 12.0,
                      color: isDark ? Colors.white24 : Colors.black26,
                    ),
                    filled: true,
                    fillColor: isDark
                        ? const Color(0xFF1E2233)
                        : const Color(0xFFF1F3FA),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(16),
                      borderSide: BorderSide(
                        color: AppColors.primary.withValues(alpha: 0.4),
                      ),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(16),
                      borderSide: const BorderSide(
                        color: AppColors.primary,
                        width: 2,
                      ),
                    ),
                  ),
                  onChanged: (val) {
                    if (val.length == 6) {
                      _joinRoom();
                    }
                  },
                ),

                if (_errorMessage != null) ...[
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.error.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.error_outline,
                            color: AppColors.error, size: 20),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            _errorMessage!,
                            style: const TextStyle(
                              color: AppColors.error,
                              fontSize: 13,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],

                const SizedBox(height: 24),

                ElevatedButton.icon(
                  onPressed: _isConnecting ? null : _joinRoom,
                  icon: _isConnecting
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Icon(Icons.login_rounded),
                  label: Text(_isConnecting ? 'Connecting to Room...' : 'Join Room'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    minimumSize: const Size(double.infinity, 50),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                ),
              ] else ...[
                // Successfully Connected Lobby Card
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: AppColors.success.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(
                      color: AppColors.success.withValues(alpha: 0.4),
                    ),
                  ),
                  child: Column(
                    children: [
                      const Icon(Icons.check_circle_outline,
                          size: 48, color: AppColors.success),
                      const SizedBox(height: 10),
                      Text(
                        'Connected to Room ${_codeController.text}!',
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: AppColors.success,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'Waiting for host to launch the match...',
                        style: TextStyle(
                          fontSize: 13,
                          color: isDark ? Colors.white70 : Colors.black87,
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 24),

                Text('Players in Room (${players.length})',
                    style: theme.textTheme.titleSmall),
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
              ],
            ],
          ),
        ),
      ),
    );
  }
}
