import 'package:ccaf_drill/domain/assists.dart';

/// Exam difficulty: which assists exist during the run.
///
/// Mirrors the `AS` table in the web app (src/assets/app.js renderExQ).
enum ExamMode {
  /// Every per-question assist, including reveal and all speech.
  easy(label: 'Easy'),

  /// Hints, plain words, and question/choices speech only.
  medium(label: 'Medium'),

  /// 1:1 with the real exam: nothing but the question.
  hard(label: 'Hard — 1:1');

  const ExamMode({required this.label});

  /// Mode button label.
  final String label;

  /// Assists available in this mode (claudart Law 3: const set membership).
  Set<AssistAction> get availableAssists => _assistsByMode[this]!;
}

const Map<ExamMode, Set<AssistAction>> _assistsByMode = {
  ExamMode.easy: {
    AssistAction.hint,
    AssistAction.plainWords,
    AssistAction.gists,
    AssistAction.example,
    AssistAction.reveal,
    AssistAction.speakQuestion,
    AssistAction.speakChoices,
    AssistAction.speakWhy,
  },
  ExamMode.medium: {
    AssistAction.hint,
    AssistAction.plainWords,
    AssistAction.speakQuestion,
    AssistAction.speakChoices,
  },
  ExamMode.hard: <AssistAction>{},
};
