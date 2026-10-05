enum MistakeRule {
  standard('Standard (3 Mistakes)', 3, 'Knockout on 3 mistakes'),
  hardcore('Hardcore (1 Mistake)', 1, 'Sudden death on 1 mistake'),
  casual('Casual (Unlimited)', 999, '+30s penalty per mistake');

  final String label;
  final int initialLives;
  final String description;

  const MistakeRule(this.label, this.initialLives, this.description);
}
