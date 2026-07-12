// Answer-key gate: the bundled data must match the verified key from
// HANDOFF.md §2 (independently derived + doc-checked before the team's
// marks were consulted). Replaces the old web_parity test that diffed
// against the retired generated index.html.
import 'package:ccaf_drill/data/asset_question_repository.dart';
import 'package:flutter_test/flutter_test.dart';

/// The verified key, pinned verbatim from HANDOFF.md §2.
const verifiedAnswerKey = <int, String>{
  1: 'B',
  2: 'B',
  3: 'A',
  4: 'D',
  5: 'D',
  6: 'C',
  7: 'C',
  8: 'D',
  9: 'C',
  10: 'B',
  11: 'C',
  12: 'D',
  13: 'D',
  14: 'C',
  15: 'A',
  16: 'D',
  17: 'C',
  18: 'C',
  19: 'D',
  20: 'A',
  21: 'C',
  22: 'D',
  23: 'C',
  24: 'A',
  25: 'B',
  26: 'C',
  27: 'B',
  28: 'B',
  29: 'B',
  30: 'D',
  31: 'B',
  32: 'B',
  33: 'C',
  34: 'D',
  35: 'D',
  36: 'C',
  37: 'C',
  38: 'B',
  39: 'A',
  40: 'D',
  41: 'D',
  42: 'D',
  43: 'A',
  44: 'C',
  45: 'B',
  46: 'D',
  47: 'C',
  48: 'C',
  49: 'D',
  50: 'C',
  51: 'C',
  52: 'B',
  53: 'C',
  54: 'A',
  55: 'B',
  56: 'A',
  57: 'D',
  58: 'A',
  59: 'C',
  60: 'D',
};

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('bundled data matches the verified 60-question answer key', () async {
    final questions = await AssetQuestionRepository().loadQuestions();
    expect(questions, hasLength(verifiedAnswerKey.length));
    for (final q in questions) {
      expect(
        q.winningLetter.display,
        verifiedAnswerKey[q.number],
        reason: 'Q${q.number} disagrees with the verified key',
      );
    }
  });
}
