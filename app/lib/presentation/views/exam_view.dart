import 'package:ccaf_drill/application/exam_cubit.dart';
import 'package:ccaf_drill/application/tts_cubit.dart';
import 'package:ccaf_drill/domain/assists.dart';
import 'package:ccaf_drill/domain/exam_mode.dart';
import 'package:ccaf_drill/domain/question.dart';
import 'package:ccaf_drill/presentation/theme/app_theme.dart';
import 'package:ccaf_drill/presentation/widgets/question_card_view.dart';
import 'package:ccaf_drill/presentation/widgets/web_chip.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

/// The exam room: start screen → timed run (one question per screen,
/// palette, pause, assists per mode) → results (score, weakest sets,
/// downfall analysis, full review). Mirrors the web Exam view.
class ExamView extends StatelessWidget {
  /// Creates the exam view.
  const ExamView({super.key});

  @override
  Widget build(BuildContext context) {
    final phase = context.watch<ExamCubit>().state.phase;
    return ContentColumn(
      child: switch (phase) {
        ExamPhase.notStarted => const _StartScreen(),
        ExamPhase.running || ExamPhase.paused => const _RunScreen(),
        ExamPhase.finished => const _ResultsScreen(),
      },
    );
  }
}

class _StartScreen extends StatelessWidget {
  const _StartScreen();

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text('Exam simulation', style: context.display(24)),
          const SizedBox(height: 4),
          Text(
            '60 questions · 120 minutes · one per screen · 720/1000 passes',
            style: TextStyle(color: p.dim),
          ),
          const SizedBox(height: 20),
          for (final mode in ExamMode.values)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: OutlinedButton(
                onPressed: () => context.read<ExamCubit>().start(mode),
                child: SizedBox(
                  width: 260,
                  child: Column(
                    children: [
                      Text(mode.label, style: context.display(15)),
                      Text(
                        mode.availableAssists.isEmpty
                            ? 'exactly like the real exam'
                            : '${mode.availableAssists.length} assist '
                                  'toggles per question',
                        style: TextStyle(fontSize: 12, color: p.dim),
                      ),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _RunScreen extends StatelessWidget {
  const _RunScreen();

  static String _clock(int seconds) {
    final m = seconds ~/ 60;
    final s = seconds % 60;
    return '$m:${s.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final cubit = context.watch<ExamCubit>();
    final exam = cubit.state;
    final question = cubit.currentQuestion;
    final paused = exam.phase == ExamPhase.paused;

    if (paused) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text('Paused — clocks frozen', style: context.display(20)),
            const SizedBox(height: 12),
            FilledButton(
              onPressed: () => context.read<ExamCubit>().resume(),
              child: const Text('Resume'),
            ),
          ],
        ),
      );
    }

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          child: Row(
            children: [
              Text(
                _clock(exam.remainingSeconds),
                style: context
                    .display(20)
                    .copyWith(
                      color: exam.remainingSeconds <= 600 ? p.kill : p.ink,
                    ),
              ),
              const SizedBox(width: 12),
              Text('Q ${exam.currentIndex + 1} / 60'),
              const Spacer(),
              IconButton(
                tooltip: 'Pause',
                onPressed: () => context.read<ExamCubit>().pause(),
                icon: const Icon(Icons.pause),
              ),
              IconButton(
                tooltip: 'Flag',
                onPressed: () => context.read<ExamCubit>().toggleFlag(),
                icon: Icon(
                  Icons.flag,
                  color: exam.flagged.contains(question.number)
                      ? p.flagOn
                      : p.flagOff,
                ),
              ),
              FilledButton(
                onPressed: () => _confirmSubmit(context),
                child: const Text('Submit'),
              ),
            ],
          ),
        ),
        _Palette(exam: exam),
        Expanded(child: _QuestionPane(question: question)),
        Padding(
          padding: const EdgeInsets.all(8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              OutlinedButton(
                onPressed: exam.currentIndex > 0
                    ? () => context.read<ExamCubit>().navigate(-1)
                    : null,
                child: const Text('← Previous'),
              ),
              OutlinedButton(
                onPressed: exam.currentIndex < 59
                    ? () => context.read<ExamCubit>().navigate(1)
                    : null,
                child: const Text('Next →'),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Future<void> _confirmSubmit(BuildContext context) async {
    final cubit = context.read<ExamCubit>();
    final unanswered = 60 - cubit.state.answers.length;
    if (unanswered == 0) {
      cubit.submit();
      return;
    }
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        content: Text(
          '$unanswered unanswered question'
          '${unanswered > 1 ? 's' : ''}. Submit anyway?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('Keep going'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(dialogContext, true),
            child: const Text('Submit'),
          ),
        ],
      ),
    );
    if (confirmed ?? false) cubit.submit();
  }
}

class _Palette extends StatelessWidget {
  const _Palette({required this.exam});

  final ExamState exam;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      child: Wrap(
        spacing: 3,
        runSpacing: 3,
        children: [
          for (var n = 1; n <= 60; n++)
            InkWell(
              onTap: () => context.read<ExamCubit>().goTo(n - 1),
              child: Container(
                width: 26,
                height: 22,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: exam.answers.containsKey(n)
                      ? p.pick.withValues(alpha: .25)
                      : p.soft,
                  border: Border.all(
                    color: exam.currentIndex == n - 1
                        ? p.ink
                        : exam.flagged.contains(n)
                        ? p.flagOn
                        : p.line,
                  ),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text('$n', style: TextStyle(fontSize: 10, color: p.ink)),
              ),
            ),
        ],
      ),
    );
  }
}

class _QuestionPane extends StatelessWidget {
  const _QuestionPane({required this.question});

  final Question question;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final cubit = context.watch<ExamCubit>();
    final exam = cubit.state;
    final revealed = exam.assistsOn.contains(AssistAction.reveal);
    final available = exam.mode.availableAssists;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Exam stems are 1:1 plain — no highlight wash.
          Text(
            question.stem,
            style: TextStyle(fontSize: 15.5, height: 1.45, color: p.stem),
          ),
          const SizedBox(height: 8),
          if (available.isNotEmpty)
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                for (final assist in AssistAction.values)
                  if (available.contains(assist))
                    _ExamAssistChip(assist: assist, question: question),
              ],
            ),
          if (exam.assistsOn.contains(AssistAction.hint)) ...[
            const SizedBox(height: 8),
            Text(
              'REALLY ASKING: ${question.hintAsk}',
              style: TextStyle(fontSize: 13.5, color: p.dim),
            ),
            Text(
              'LOOK FIRST: ${question.hintFirst}',
              style: TextStyle(fontSize: 13.5, color: p.dim),
            ),
          ],
          if (exam.assistsOn.contains(AssistAction.example)) ...[
            const SizedBox(height: 8),
            Text(
              question.example.lead,
              style: TextStyle(fontSize: 13.5, color: p.ink),
            ),
          ],
          const SizedBox(height: 10),
          for (final choice in question.choiceList)
            _ExamChoice(
              question: question,
              choice: choice,
              revealed: revealed,
              showPlain: exam.assistsOn.contains(AssistAction.plainWords),
              showGist: exam.assistsOn.contains(AssistAction.gists),
            ),
        ],
      ),
    );
  }
}

class _ExamAssistChip extends StatelessWidget {
  const _ExamAssistChip({required this.assist, required this.question});

  final AssistAction assist;
  final Question question;

  @override
  Widget build(BuildContext context) {
    final cubit = context.read<ExamCubit>();
    final exam = context.watch<ExamCubit>().state;
    final tts = context.watch<TtsCubit>().state;
    final revealed = exam.assistsOn.contains(AssistAction.reveal);

    if (assist.isSpeak) {
      final scope = speechScopeFor[assist]!;
      final dead = assist == AssistAction.speakWhy && !revealed;
      final playing =
          tts.playingQuestion == question.number && tts.playingScope == scope;
      return FilterChip(
        label: Text(playing ? '⏹ stop' : assist.label),
        selected: playing,
        onSelected: dead
            ? null
            : (_) => context.read<TtsCubit>().play(question, scope),
      );
    }
    return FilterChip(
      label: Text(assist.label),
      selected: exam.assistsOn.contains(assist),
      onSelected: (_) {
        cubit.toggleAssist(assist);
        if (assist == AssistAction.reveal &&
            exam.assistsOn.contains(AssistAction.reveal)) {
          context.read<TtsCubit>().stop();
        }
      },
    );
  }
}

class _ExamChoice extends StatelessWidget {
  const _ExamChoice({
    required this.question,
    required this.choice,
    required this.revealed,
    required this.showPlain,
    required this.showGist,
  });

  final Question question;
  final Choice choice;
  final bool revealed;
  final bool showPlain;
  final bool showGist;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final exam = context.watch<ExamCubit>().state;
    final selected = exam.answers[question.number] == choice.letter;
    final isCorrect = revealed && choice.letter == question.winningLetter;

    return InkWell(
      onTap: () => context.read<ExamCubit>().pick(choice.letter),
      child: Container(
        width: double.infinity,
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: isCorrect ? p.pickBackground : p.soft,
          border: Border.all(
            color: selected ? p.ink : (isCorrect ? p.pick : p.line),
            width: selected ? 1.6 : 1,
          ),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text.rich(
              TextSpan(
                style: TextStyle(fontSize: 14.5, color: p.ink),
                children: [
                  TextSpan(
                    text: '${choice.letter.display}  ',
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                  TextSpan(text: choice.text),
                ],
              ),
            ),
            if (showPlain)
              Text(
                '◦ ${choice.plain}',
                style: TextStyle(fontSize: 13, color: p.pick),
              ),
            if (showGist)
              Text(
                choice.gist,
                style: TextStyle(
                  fontFamily: 'monospace',
                  fontSize: 12.5,
                  color: p.dim,
                ),
              ),
            if (revealed)
              Text(choice.why, style: TextStyle(fontSize: 13, color: p.dim)),
          ],
        ),
      ),
    );
  }
}

class _ResultsScreen extends StatelessWidget {
  const _ResultsScreen();

  static String _missStyle(
    ({int runnerPicks, int killPicks, int blanks}) downfall,
  ) {
    if (downfall.runnerPicks > downfall.killPicks) {
      return 'Most wrong picks were the close 2nd — you see the pattern '
          'but stop one step early.';
    }
    if (downfall.killPicks > 0) {
      return 'Most wrong picks were outright kills — distractor patterns '
          'are still landing.';
    }
    return 'No wrong picks — clean run.';
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final cubit = context.watch<ExamCubit>();
    final exam = cubit.state;
    final correct = cubit.correctCount;
    final scaled = cubit.scaledScore;
    final downfall = cubit.downfall;
    final worst = cubit.setResults.first;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text(
          '$correct / 60 — scaled $scaled / 1000 '
          '(${scaled >= 720 ? 'PASS' : 'below the 720 pass line'})'
          '${exam.autoSubmitted ? ' · auto-submitted at 0:00' : ''}',
          style: context.display(20),
        ),
        const SizedBox(height: 12),
        Text(
          'SETS, WEAKEST FIRST',
          style: context.display(11).copyWith(color: p.dim),
        ),
        const SizedBox(height: 6),
        for (final row in cubit.setResults)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 3),
            child: Row(
              children: [
                SizedBox(
                  width: 220,
                  child: Text(
                    row.topicSet.displayName,
                    style: TextStyle(
                      fontSize: 13,
                      color: row.topicSet.colorDim,
                    ),
                  ),
                ),
                Expanded(
                  child: LinearProgressIndicator(
                    value: row.percent / 100,
                    color: row.topicSet.colorDim,
                    backgroundColor: p.soft,
                  ),
                ),
                SizedBox(
                  width: 120,
                  child: Text(
                    ' ${row.percent}% (${row.correct}/${row.total})',
                    style: TextStyle(fontSize: 12.5, color: p.dim),
                  ),
                ),
              ],
            ),
          ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            border: Border.all(color: p.line),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Text(
            'Likely downfall: ${worst.topicSet.displayName} — '
            '${worst.missed.length} of ${worst.total} missed. '
            '${_missStyle(downfall)}'
            '${downfall.blanks > 0 ? ' ${downfall.blanks} left blank — '
                      'always answer; there is no penalty for guessing.' : ''}'
            '\n\nHOW TO THINK ABOUT THIS SET\n${worst.topicSet.rule}',
            style: TextStyle(fontSize: 13.5, height: 1.4, color: p.ink),
          ),
        ),
        const SizedBox(height: 12),
        Text('REVIEW', style: context.display(11).copyWith(color: p.dim)),
        for (final question in cubit.questions)
          _ReviewRow(question: question, exam: exam),
        const SizedBox(height: 12),
        Center(
          child: OutlinedButton(
            onPressed: () => context.read<ExamCubit>().restart(),
            child: const Text('Back to start'),
          ),
        ),
      ],
    );
  }
}

class _ReviewRow extends StatelessWidget {
  const _ReviewRow({required this.question, required this.exam});

  final Question question;
  final ExamState exam;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final picked = exam.answers[question.number];
    final correct = picked == question.winningLetter;
    final seconds = exam.secondsPerQuestion[question.number] ?? 0;

    return ExpansionTile(
      dense: true,
      leading: Text(
        correct ? '✓' : '✗',
        style: TextStyle(color: correct ? p.pick : p.kill, fontSize: 16),
      ),
      title: Text(
        'Q${question.number} · ${question.topicSet.shortName} · '
        'you: ${picked?.display ?? '—'} · ${seconds}s'
        '${exam.flagged.contains(question.number) ? ' · ⚑' : ''}',
        style: TextStyle(fontSize: 13.5, color: p.ink),
      ),
      children: [
        QuestionCardView(
          question: question,
          forceRevealed: true,
          pickedLetter: picked?.display,
        ),
      ],
    );
  }
}
