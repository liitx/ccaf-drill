/// Analysis verdict for one answer choice.
///
/// Mirrors the Python `Verdict` enum (src/constants.py) and the JS registry
/// (src/assets/domain.js): the value stored in data/analysis.json is
/// [jsonCode]; [badge] is the label shown on reveal; [spokenTag] is how the
/// TTS answer walkthrough introduces a wrong choice.
enum Verdict {
  /// The correct answer.
  pick(jsonCode: 'W', badge: '✓ PICK', spokenTag: 'correct'),

  /// Close 2nd — plausible but loses.
  runner(jsonCode: 'R', badge: '△ CLOSE 2nd', spokenTag: 'close second'),

  /// Eliminate.
  kill(jsonCode: 'X', badge: '✕ OUT', spokenTag: 'eliminate');

  const Verdict({
    required this.jsonCode,
    required this.badge,
    required this.spokenTag,
  });

  /// Single-letter code in data/analysis.json.
  final String jsonCode;

  /// Badge text shown once the answer is revealed.
  final String badge;

  /// How the TTS walkthrough labels this verdict.
  final String spokenTag;

  /// Resolve a verdict from its data-file code.
  static Verdict fromJsonCode(String code) =>
      values.firstWhere((v) => v.jsonCode == code);
}
