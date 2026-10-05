import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import 'host_duel_screen.dart';
import 'join_duel_screen.dart';

class MultiplayerHubScreen extends StatefulWidget {
  const MultiplayerHubScreen({super.key});

  @override
  State<MultiplayerHubScreen> createState() => _MultiplayerHubScreenState();
}

class _MultiplayerHubScreenState extends State<MultiplayerHubScreen> {
  final TextEditingController _nameController =
      TextEditingController(text: 'Player');

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Multiplayer'),
        centerTitle: true,
        elevation: 0,
      ),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 460),
          child: ListView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
            children: [
              // Nickname Field
              Text('Your Name', style: theme.textTheme.titleSmall),
              const SizedBox(height: 8),
              TextField(
                controller: _nameController,
                maxLength: 15,
                decoration: InputDecoration(
                  prefixIcon: const Icon(Icons.person_outline),
                  hintText: 'Enter your name',
                  filled: true,
                  fillColor: isDark
                      ? const Color(0xFF1E2233)
                      : const Color(0xFFF1F3FA),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: BorderSide.none,
                  ),
                  counterText: '',
                ),
              ),

              const SizedBox(height: 28),

              // Host Game Card
              _buildOptionCard(
                context: context,
                title: 'Host a Game',
                subtitle: 'Choose difficulty and rules, invite friends with a 6-digit code',
                icon: Icons.add_circle_outline_rounded,
                color: AppColors.primary,
                buttonLabel: 'Create Room',
                onTap: () {
                  final name = _nameController.text.trim().isEmpty
                      ? 'Host'
                      : _nameController.text.trim();
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => HostDuelScreen(playerName: name),
                    ),
                  );
                },
              ),

              const SizedBox(height: 16),

              // Join Game Card
              _buildOptionCard(
                context: context,
                title: 'Join a Game',
                subtitle: 'Enter a 6-digit room code from a friend to start playing',
                icon: Icons.group_add_outlined,
                color: AppColors.secondary,
                buttonLabel: 'Join with Code',
                onTap: () {
                  final name = _nameController.text.trim().isEmpty
                      ? 'Guest'
                      : _nameController.text.trim();
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => JoinDuelScreen(playerName: name),
                    ),
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildOptionCard({
    required BuildContext context,
    required String title,
    required String subtitle,
    required IconData icon,
    required Color color,
    required String buttonLabel,
    required VoidCallback onTap,
  }) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1B1E29) : Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: color.withValues(alpha: 0.25),
          width: 1.5,
        ),
        boxShadow: [
          BoxShadow(
            color: color.withValues(alpha: 0.06),
            blurRadius: 14,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: color, size: 24),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      style: theme.textTheme.bodySmall?.copyWith(fontSize: 12),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: onTap,
            style: ElevatedButton.styleFrom(
              backgroundColor: color,
              foregroundColor: Colors.white,
              minimumSize: const Size(double.infinity, 44),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              elevation: 0,
            ),
            child: Text(
              buttonLabel,
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
    );
  }
}
