/// How strongly the verified answer is backed.
///
/// Mirrors `TIERMETA` in the web generator (src/content.py).
enum ConfidenceTier {
  /// Confirmed directly against official Anthropic docs or the MCP spec.
  docsVerified(
    label: 'DOCS-VERIFIED',
    tooltip:
        'Answer confirmed directly against official Anthropic docs or the '
        'MCP spec.',
  ),

  /// Follows published best-practice guidance; no single doc line settles it.
  guidance(
    label: 'GUIDANCE',
    tooltip:
        "Follows Anthropic's published best-practice guidance; no single doc "
        'line settles it.',
  ),

  /// Two defensible choices — wording-sensitive.
  debate(
    label: 'DEBATE',
    tooltip:
        "Two defensible choices — read the stem's exact wording. "
        'Team-discussion candidate.',
  );

  const ConfidenceTier({required this.label, required this.tooltip});

  /// Badge label.
  final String label;

  /// Long-form explanation shown on hover / long-press.
  final String tooltip;

  /// 1-based tier number as used in the web app (T1/T2/T3).
  int get tierNumber => index + 1;
}
