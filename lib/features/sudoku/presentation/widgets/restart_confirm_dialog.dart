import 'package:flutter/material.dart';

class RestartConfirmDialog extends StatelessWidget {
  const RestartConfirmDialog({super.key});

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Restart puzzle?'),
      content: const Text('Are you sure you want to restart this puzzle? Your current progress will be lost.'),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(false),
          child: const Text('CANCEL'),
        ),
        FilledButton(
          onPressed: () => Navigator.of(context).pop(true),
          child: const Text('RESTART'),
        ),
      ],
    );
  }
}
