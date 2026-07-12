// Repository invariants: the question : answerChoices contract, verified
// against the real bundled data files (same JSONs the web build uses).
import 'package:ccaf_drill/data/asset_question_repository.dart';
import 'package:ccaf_drill/domain/answer_letter.dart';
import 'package:ccaf_drill/domain/question.dart';
import 'package:ccaf_drill/domain/topic_set.dart';
import 'package:ccaf_drill/domain/verdict.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  late List<Question> questions;

  setUpAll(() async {
    questions = await AssetQuestionRepository().loadQuestions();
  });

  test('loads exactly 60 questions, numbered 1–60 in order', () {
    expect(questions, hasLength(60));
    expect(questions.map((q) => q.number), List.generate(60, (i) => i + 1));
  });

  test('every question has exactly 4 choices, one per letter', () {
    for (final q in questions) {
      expect(q.choices.keys.toSet(), AnswerLetter.values.toSet());
    }
  });

  test('every question has exactly one pick, matching winningLetter', () {
    for (final q in questions) {
      final picks = q.choices.values.where((c) => c.verdict == Verdict.pick);
      expect(picks, hasLength(1), reason: 'Q${q.number}');
      expect(picks.single.letter, q.winningLetter, reason: 'Q${q.number}');
      expect(q.winningChoice.verdict, Verdict.pick);
    }
  });

  test('set sizes match the verified key (10/5/15/13/14/3)', () {
    int count(TopicSet s) => questions.where((q) => q.topicSet == s).length;
    expect(count(TopicSet.extraction), 10);
    expect(count(TopicSet.evals), 5);
    expect(count(TopicSet.multiAgent), 15);
    expect(count(TopicSet.claudeCode), 13);
    expect(count(TopicSet.supportAgent), 14);
    expect(count(TopicSet.mcpTools), 3);
  });

  test('the disputed 8 are exactly Q2,12,15,17,18,22,41,42', () {
    final disputed = questions.where((q) => q.isDisputed).map((q) => q.number);
    expect(disputed, [2, 12, 15, 17, 18, 22, 41, 42]);
  });

  test('all text fields non-empty; stems carry their signal phrases', () {
    for (final q in questions) {
      expect(q.stem, isNotEmpty, reason: 'Q${q.number}');
      expect(q.cue, isNotEmpty);
      expect(q.hintAsk, isNotEmpty);
      expect(q.hintFirst, isNotEmpty);
      expect(q.signals, isNotEmpty);
      for (final signal in q.signals) {
        // Case-insensitive: Q21's 'before deploying' is capitalized in the
        // stem (same latent quirk exists in the web app's exact-case hl()).
        expect(
          q.stem.toLowerCase(),
          contains(signal.toLowerCase()),
          reason: 'Q${q.number}: "$signal"',
        );
      }
      for (final c in q.choices.values) {
        expect(c.text, isNotEmpty);
        expect(c.plain, isNotEmpty);
        expect(c.gist, isNotEmpty);
        expect(c.why, isNotEmpty);
      }
    }
  });

  test('parse once: second load returns the identical list', () async {
    final repo = AssetQuestionRepository();
    final first = await repo.loadQuestions();
    final second = await repo.loadQuestions();
    expect(identical(first, second), isTrue);
  });
}
