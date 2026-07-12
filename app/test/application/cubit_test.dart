// Cubit behavior: combinable filters, reset-keeps-flags, exam state machine.
import 'package:bloc_test/bloc_test.dart';
import 'package:ccaf_drill/application/drill_cubit.dart';
import 'package:ccaf_drill/application/exam_cubit.dart';
import 'package:ccaf_drill/data/asset_question_repository.dart';
import 'package:ccaf_drill/domain/answer_letter.dart';
import 'package:ccaf_drill/domain/assists.dart';
import 'package:ccaf_drill/domain/exam_mode.dart';
import 'package:ccaf_drill/domain/narrow_filter.dart';
import 'package:ccaf_drill/domain/question.dart';
import 'package:ccaf_drill/domain/topic_set.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  late List<Question> questions;

  setUpAll(() async {
    questions = await AssetQuestionRepository().loadQuestions();
  });

  group('DrillCubit', () {
    test('set × narrow filters COMBINE (M ∩ disputed = {2,12,18,41})', () {
      final cubit = DrillCubit()
        ..selectSet(TopicSet.multiAgent)
        ..toggleNarrow(NarrowFilter.disputed);
      final matching = questions
          .where(cubit.state.matches)
          .map((q) => q.number);
      expect(matching, [2, 12, 18, 41]);
    });

    test('tapping the active narrow chip clears it', () {
      final cubit = DrillCubit()
        ..toggleNarrow(NarrowFilter.debate)
        ..toggleNarrow(NarrowFilter.debate);
      expect(cubit.state.narrow, isNull);
    });

    test('reset clears assists but keeps flags (web ↺ Reset parity)', () {
      final cubit = DrillCubit()
        ..toggleFlag(7)
        ..toggleExpanded(7)
        ..toggleRevealed(7)
        ..toggleHint(7)
        ..toggleChoicePlain(7, AnswerLetter.b)
        ..reset();
      expect(cubit.state.flagged, {7});
      expect(cubit.state.revealed, isEmpty);
      expect(cubit.state.hinted, isEmpty);
      expect(cubit.state.expanded, isEmpty);
      expect(cubit.state.choicePlainShown, isEmpty);
    });

    blocTest<DrillCubit, DrillState>(
      'opening a card makes it the dock target',
      build: DrillCubit.new,
      act: (cubit) => cubit.toggleExpanded(12),
      verify: (cubit) => expect(cubit.state.activeQuestion, 12),
    );
  });

  group('ExamCubit', () {
    test('start → pick → navigate resets assists; answers survive', () {
      final cubit = ExamCubit(questions: questions)
        ..start(ExamMode.easy)
        ..toggleAssist(AssistAction.hint)
        ..pick(AnswerLetter.b)
        ..navigate(1);
      expect(cubit.state.assistsOn, isEmpty);
      expect(cubit.state.answers[1], AnswerLetter.b);
      expect(cubit.state.currentIndex, 1);
      cubit.restart();
    });

    test('perfect run scores 60/60 and 1000 scaled', () {
      final cubit = ExamCubit(questions: questions)..start(ExamMode.hard);
      for (var i = 0; i < 60; i++) {
        cubit
          ..goTo(i)
          ..pick(questions[i].winningLetter);
      }
      cubit.submit();
      expect(cubit.correctCount, 60);
      expect(cubit.scaledScore, 1000);
      expect(cubit.state.phase, ExamPhase.finished);
      expect(cubit.downfall.blanks, 0);
      cubit.restart();
    });

    test('downfall classifies wrong picks by verdict', () {
      final cubit = ExamCubit(questions: questions)..start(ExamMode.hard);
      // Pick a known runner on Q1 (web key: Q1 win=B).
      final q1 = questions.first;
      final runner = q1.choiceList.firstWhere((c) => c.verdict.jsonCode == 'R');
      cubit
        ..pick(runner.letter)
        ..submit();
      expect(cubit.downfall.runnerPicks, 1);
      expect(cubit.downfall.blanks, 59);
      cubit.restart();
    });

    test('pause freezes the countdown', () async {
      final cubit = ExamCubit(questions: questions)
        ..start(ExamMode.hard)
        ..pause();
      final before = cubit.state.remainingSeconds;
      await Future<void>.delayed(const Duration(milliseconds: 1500));
      expect(cubit.state.remainingSeconds, before);
      expect(cubit.state.phase, ExamPhase.paused);
      cubit.restart();
    });
  });
}
