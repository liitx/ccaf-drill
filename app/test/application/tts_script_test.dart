// TtsCubit.script coverage (claudart audit finding 2): one group per
// SpeechScope, matrix-style — the switch over scopes is exhaustive, so a
// new scope without a test row is a compile error here.
import 'package:ccaf_drill/application/tts_cubit.dart';
import 'package:ccaf_drill/data/asset_question_repository.dart';
import 'package:ccaf_drill/domain/answer_letter.dart';
import 'package:ccaf_drill/domain/assists.dart';
import 'package:ccaf_drill/domain/question.dart';
import 'package:ccaf_drill/domain/verdict.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  late Question q1;
  late TtsCubit cubit;

  setUpAll(() async {
    final questions = await AssetQuestionRepository().loadQuestions();
    q1 = questions.first;
    cubit = TtsCubit();
  });

  tearDownAll(() => cubit.close());

  List<SpeechSegment> scriptFor(
    SpeechScope scope, {
    Set<(int, AnswerLetter)> plainShown = const {},
  }) => cubit.script(q1, scope, plainShown: plainShown);

  // Exhaustive: every scope must have expectations (compile-checked).
  ({int minSegments, String firstText}) expected(SpeechScope scope) =>
      switch (scope) {
        SpeechScope.question => (minSegments: 2, firstText: 'Question 1.'),
        SpeechScope.choices => (minSegments: 8, firstText: 'Option A.'),
        SpeechScope.revealWhy => (
          minSegments: 6,
          firstText: 'Question 1. Correct answer: ${q1.winningLetter.display}.',
        ),
      };

  for (final scope in SpeechScope.values) {
    test('$scope: opening segment + segment count', () {
      final script = scriptFor(scope);
      final want = expected(scope);
      expect(script.first.text, want.firstText);
      expect(script.length, greaterThanOrEqualTo(want.minSegments));
      expect(script.every((s) => s.text.isNotEmpty), isTrue);
    });
  }

  test('question scope: stem segment targets the stem (no letter)', () {
    final script = scriptFor(SpeechScope.question);
    expect(script.last.text, q1.stem);
    expect(script.last.target, const SpeechTarget(question: 1));
  });

  test('choices scope: all four options in letter order', () {
    final script = scriptFor(SpeechScope.choices);
    final prefixes = script
        .where((s) => s.text.startsWith('Option '))
        .map((s) => s.text)
        .toList();
    expect(prefixes, ['Option A.', 'Option B.', 'Option C.', 'Option D.']);
    // Each option segment targets its choice for the follow-along wash.
    for (final letter in AnswerLetter.values) {
      expect(
        script.any((s) => s.target?.letter == letter),
        isTrue,
        reason: '$letter has no wash target',
      );
    }
  });

  test('choices scope: plain rephrase substitutes when toggled', () {
    final withPlain = scriptFor(
      SpeechScope.choices,
      plainShown: {(1, AnswerLetter.a)},
    );
    final choiceA = q1.choices[AnswerLetter.a]!;
    expect(withPlain.map((s) => s.text), contains(choiceA.plain));
    expect(withPlain.map((s) => s.text), isNot(contains(choiceA.text)));
  });

  test('revealWhy: pick first, wrong choices tagged, set rule last', () {
    final script = scriptFor(SpeechScope.revealWhy);
    final texts = script.map((s) => s.text).toList();
    // The winning choice's why comes right after the verdict announcement.
    expect(texts[1], q1.winningChoice.why);
    // Every wrong choice is introduced with its verdict's spoken tag.
    for (final choice in q1.choiceList) {
      if (choice.letter == q1.winningLetter) continue;
      expect(
        texts.any(
          (t) => t.startsWith(
            'Option ${choice.letter.display}, ${choice.verdict.spokenTag}.',
          ),
        ),
        isTrue,
        reason: '${choice.letter} missing its ${choice.verdict} tag',
      );
    }
    // The winning choice is never spoken as a wrong option.
    expect(
      texts.any((t) => t.startsWith('Option ${q1.winningLetter.display},')),
      isFalse,
    );
    expect(texts.last, 'The set rule: ${q1.topicSet.rule}');
    expect(texts[texts.length - 2], 'In practice. ${q1.example.lead}');
  });

  test('revealWhy: why segments are flagged isWhy for the wash', () {
    final script = scriptFor(SpeechScope.revealWhy);
    final whyTargets = script.where((s) => s.target?.isWhy ?? false);
    // Verdict announcement + winning why + 3 wrong choices ≥ 5 segments.
    expect(whyTargets.length, greaterThanOrEqualTo(5));
  });

  test('wrong-choice ordering matches Verdict spoken tags 1:1', () {
    // Cross-check with the verdict enum: runner reads 'close second',
    // kill reads 'eliminate' — never swapped.
    final script = scriptFor(SpeechScope.revealWhy);
    for (final choice in q1.choiceList) {
      if (choice.letter == q1.winningLetter) continue;
      final tag = switch (choice.verdict) {
        Verdict.pick => fail('wrong choice cannot be the pick'),
        Verdict.runner => 'close second',
        Verdict.kill => 'eliminate',
      };
      expect(
        script.any((s) => s.text.contains('${choice.letter.display}, $tag.')),
        isTrue,
      );
    }
  });
}
