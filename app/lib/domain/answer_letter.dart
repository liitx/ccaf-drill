/// The four answer letters — the only place they are enumerated.
///
/// Mirrors `ANSWER_LETTERS` (src/constants.py) and `AnswerLetter.ALL`
/// (src/assets/domain.js) in the web app.
enum AnswerLetter {
  /// Option A.
  a,

  /// Option B.
  b,

  /// Option C.
  c,

  /// Option D.
  d;

  /// Uppercase display/data-file form ('A'…'D').
  String get display => name.toUpperCase();

  /// Resolve a letter from its data-file form.
  static AnswerLetter fromDisplay(String letter) =>
      values.firstWhere((l) => l.display == letter);
}
