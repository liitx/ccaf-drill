/// The Narrow toolbar chips — they COMBINE with the selected topic set.
///
/// Mirrors the web toolbar's focus filters (CURFOC in src/assets/app.js).
enum NarrowFilter {
  /// ⚑ Questions the user flagged.
  flagged(label: '+ ⚑ Flagged'),

  /// ⚠ The 8 questions where the team doc's mark disagrees with the
  /// verified pick.
  disputed(label: '+ ⚠ Disputed 8'),

  /// ⚖ The 3 wording-sensitive debate questions.
  debate(label: '+ ⚖ Debate 3');

  const NarrowFilter({required this.label});

  /// Chip label.
  final String label;
}
