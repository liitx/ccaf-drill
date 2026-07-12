import 'dart:async';

import 'package:ccaf_drill/domain/answer_letter.dart';
import 'package:ccaf_drill/domain/assists.dart';
import 'package:ccaf_drill/domain/exam_mode.dart';
import 'package:ccaf_drill/domain/question.dart';
import 'package:ccaf_drill/domain/topic_set.dart';
import 'package:ccaf_drill/domain/verdict.dart';
import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

/// Where the exam flow is.
enum ExamPhase {
  /// Mode-selection start screen.
  notStarted,

  /// A run is in progress.
  running,

  /// The run is paused (question hidden, both clocks frozen).
  paused,

  /// Submitted — results are available.
  finished,
}

/// Per-set results row.
final class SetResult extends Equatable {
  /// Creates a set result.
  const SetResult({
    required this.topicSet,
    required this.correct,
    required this.total,
    required this.missed,
    required this.secondsSpent,
  });

  /// The set.
  final TopicSet topicSet;

  /// Correct answers.
  final int correct;

  /// Member questions.
  final int total;

  /// Missed question numbers.
  final List<int> missed;

  /// Total seconds spent on member questions.
  final int secondsSpent;

  /// Percentage 0–100.
  int get percent => (correct / total * 100).round();

  @override
  List<Object> get props => [topicSet, correct, total, missed, secondsSpent];
}

/// The whole exam state machine (mirrors EX in src/assets/app.js).
final class ExamState extends Equatable {
  /// Creates exam state.
  const ExamState({
    this.phase = ExamPhase.notStarted,
    this.mode = ExamMode.hard,
    this.currentIndex = 0,
    this.remainingSeconds = totalSeconds,
    this.answers = const {},
    this.flagged = const {},
    this.secondsPerQuestion = const {},
    this.assistsOn = const {},
    this.autoSubmitted = false,
  });

  /// 120 minutes.
  static const totalSeconds = 7200;

  /// Where the flow is.
  final ExamPhase phase;

  /// Selected difficulty.
  final ExamMode mode;

  /// 0-based index of the question on screen.
  final int currentIndex;

  /// Countdown remaining.
  final int remainingSeconds;

  /// Picked answers by question number.
  final Map<int, AnswerLetter> answers;

  /// Flagged question numbers.
  final Set<int> flagged;

  /// Per-question time (pauses excluded) by question number.
  final Map<int, int> secondsPerQuestion;

  /// Assist toggles for the current question (reset on navigation).
  final Set<AssistAction> assistsOn;

  /// Whether the run ended by the clock hitting zero.
  final bool autoSubmitted;

  /// Copy with updates.
  ExamState copyWith({
    ExamPhase? phase,
    ExamMode? mode,
    int? currentIndex,
    int? remainingSeconds,
    Map<int, AnswerLetter>? answers,
    Set<int>? flagged,
    Map<int, int>? secondsPerQuestion,
    Set<AssistAction>? assistsOn,
    bool? autoSubmitted,
  }) => ExamState(
    phase: phase ?? this.phase,
    mode: mode ?? this.mode,
    currentIndex: currentIndex ?? this.currentIndex,
    remainingSeconds: remainingSeconds ?? this.remainingSeconds,
    answers: answers ?? this.answers,
    flagged: flagged ?? this.flagged,
    secondsPerQuestion: secondsPerQuestion ?? this.secondsPerQuestion,
    assistsOn: assistsOn ?? this.assistsOn,
    autoSubmitted: autoSubmitted ?? this.autoSubmitted,
  );

  @override
  List<Object> get props => [
    phase,
    mode,
    currentIndex,
    remainingSeconds,
    answers,
    flagged,
    secondsPerQuestion,
    assistsOn,
    autoSubmitted,
  ];
}

/// Runs the 1:1 exam simulation: 60 questions, 120 minutes, pause freezes
/// both clocks, per-question timing excludes pauses, auto-submit at 0:00.
final class ExamCubit extends Cubit<ExamState> {
  /// Creates the cubit over the loaded [questions].
  ExamCubit({required this.questions}) : super(const ExamState());

  /// All 60 questions in exam order.
  final List<Question> questions;

  Timer? _ticker;
  int _questionSeconds = 0;

  /// The question on screen.
  Question get currentQuestion => questions[state.currentIndex];

  /// Start a run in [mode].
  void start(ExamMode mode) {
    _questionSeconds = 0;
    emit(ExamState(phase: ExamPhase.running, mode: mode));
    _startTicker();
  }

  void _startTicker() {
    _ticker?.cancel();
    _ticker = Timer.periodic(const Duration(seconds: 1), (_) => _tick());
  }

  void _tick() {
    if (state.phase != ExamPhase.running) return;
    _questionSeconds++;
    final remaining = state.remainingSeconds - 1;
    if (remaining <= 0) {
      submit(auto: true);
      return;
    }
    emit(state.copyWith(remainingSeconds: remaining));
  }

  void _bankTime() {
    final n = currentQuestion.number;
    emit(
      state.copyWith(
        secondsPerQuestion: {
          ...state.secondsPerQuestion,
          n: (state.secondsPerQuestion[n] ?? 0) + _questionSeconds,
        },
      ),
    );
    _questionSeconds = 0;
  }

  /// Pick an answer for the current question.
  void pick(AnswerLetter letter) => emit(
    state.copyWith(answers: {...state.answers, currentQuestion.number: letter}),
  );

  /// Flag / unflag the current question.
  void toggleFlag() {
    final n = currentQuestion.number;
    emit(
      state.copyWith(
        flagged: state.flagged.contains(n)
            ? ({...state.flagged}..remove(n))
            : {...state.flagged, n},
      ),
    );
  }

  /// Toggle one assist for the current question.
  void toggleAssist(AssistAction assist) => emit(
    state.copyWith(
      assistsOn: state.assistsOn.contains(assist)
          ? ({...state.assistsOn}..remove(assist))
          : {...state.assistsOn, assist},
    ),
  );

  /// Navigate to a 0-based question index (assists reset per question).
  void goTo(int index) {
    if (index < 0 || index >= questions.length) return;
    _bankTime();
    emit(state.copyWith(currentIndex: index, assistsOn: const {}));
  }

  /// Next / previous.
  void navigate(int delta) => goTo(state.currentIndex + delta);

  /// Pause: hides the question, freezes both clocks.
  void pause() => emit(state.copyWith(phase: ExamPhase.paused));

  /// Resume on the same question.
  void resume() => emit(state.copyWith(phase: ExamPhase.running));

  /// Submit the run.
  void submit({bool auto = false}) {
    _bankTime();
    _ticker?.cancel();
    emit(state.copyWith(phase: ExamPhase.finished, autoSubmitted: auto));
  }

  /// Back to the start screen.
  void restart() {
    _ticker?.cancel();
    emit(const ExamState());
  }

  /// Correct count.
  int get correctCount =>
      questions.where((q) => state.answers[q.number] == q.winningLetter).length;

  /// Scaled score out of 1000 (720 passes).
  int get scaledScore => (correctCount / questions.length * 1000).round();

  /// Per-set results, weakest first.
  List<SetResult> get setResults {
    final rows = TopicSet.values.map((set) {
      final members = questions.where((q) => q.topicSet == set).toList();
      final missed = members
          .where((q) => state.answers[q.number] != q.winningLetter)
          .map((q) => q.number)
          .toList();
      return SetResult(
        topicSet: set,
        correct: members.length - missed.length,
        total: members.length,
        missed: missed,
        secondsSpent: members.fold(
          0,
          (sum, q) => sum + (state.secondsPerQuestion[q.number] ?? 0),
        ),
      );
    }).toList()..sort((a, b) => a.percent.compareTo(b.percent));
    return rows;
  }

  /// Downfall stats: how wrong picks distribute over runner/kill, plus
  /// blanks (mirrors the web downfall analysis).
  ({int runnerPicks, int killPicks, int blanks}) get downfall {
    var runnerPicks = 0;
    var killPicks = 0;
    var blanks = 0;
    for (final q in questions) {
      final picked = state.answers[q.number];
      if (picked == null) {
        blanks++;
      } else if (picked != q.winningLetter) {
        if (q.choices[picked]!.verdict == Verdict.runner) {
          runnerPicks++;
        } else {
          killPicks++;
        }
      }
    }
    return (runnerPicks: runnerPicks, killPicks: killPicks, blanks: blanks);
  }

  @override
  Future<void> close() {
    _ticker?.cancel();
    return super.close();
  }
}
