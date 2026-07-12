import 'dart:convert';

import 'package:ccaf_drill/application/drill_cubit.dart';
import 'package:ccaf_drill/application/tts_cubit.dart';
import 'package:ccaf_drill/domain/confidence_tier.dart';
import 'package:ccaf_drill/domain/question.dart';
import 'package:ccaf_drill/domain/verdict.dart';
import 'package:ccaf_drill/presentation/theme/app_theme.dart';
import 'package:ccaf_drill/presentation/widgets/choice_tile.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

/// One drill question card: header (flag / number / set pill / tier badge),
/// cue, signal chips, stem with giveaway wash, foldable assists, the four
/// choices, and the reveal row. The Dart mirror of the web `<article
/// class="card">` plus its state classes.
class QuestionCardView extends StatelessWidget {
  /// Creates a card for [question].
  const QuestionCardView({
    required this.question,
    this.forceRevealed = false,
    this.pickedLetter,
    super.key,
  });

  /// The question to render.
  final Question question;

  /// Render in the fully-revealed state regardless of drill state
  /// (key-view expansion and exam review clones).
  final bool forceRevealed;

  /// Tag this letter as "YOUR PICK" (exam review).
  final String? pickedLetter;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final drill = context.watch<DrillCubit>().state;
    final tts = context.watch<TtsCubit>().state;
    final n = question.number;
    final expanded = forceRevealed || drill.expanded.contains(n);
    final revealed = forceRevealed || drill.revealed.contains(n);
    final isDockTarget = !forceRevealed && drill.activeQuestion == n;
    final set = question.topicSet;

    return AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      margin: const EdgeInsets.symmetric(vertical: 5), // .card 10px gap
      decoration: BoxDecoration(
        color: p.card,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDockTarget ? set.colorDim : p.line,
          width: isDockTarget ? 1.5 : 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _Header(question: question, expanded: expanded),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  question.cue,
                  // .cue: 14px w700
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 14,
                    color: p.ink,
                  ),
                ),
                const SizedBox(height: 6),
                if (drill.highlightsOn || forceRevealed)
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: [
                      for (final signal in question.signals)
                        _SignalChip(text: signal),
                    ],
                  ),
              ],
            ),
          ),
          if (expanded)
            _Body(
              question: question,
              revealed: revealed,
              forceRevealed: forceRevealed,
              pickedLetter: pickedLetter,
              ttsTarget: tts.currentTarget,
            ),
          const SizedBox(height: 10),
        ],
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.question, required this.expanded});

  final Question question;
  final bool expanded;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final drill = context.watch<DrillCubit>().state;
    final set = question.topicSet;
    final flagged = drill.flagged.contains(question.number);

    return Row(
      children: [
        IconButton(
          tooltip: 'Flag to drill later',
          icon: Icon(
            flagged ? Icons.flag : Icons.outlined_flag,
            color: flagged ? p.flagOn : p.flagOff,
            size: 20,
          ),
          onPressed: () =>
              context.read<DrillCubit>().toggleFlag(question.number),
        ),
        Expanded(
          child: InkWell(
            onTap: () =>
                context.read<DrillCubit>().toggleExpanded(question.number),
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 10),
              child: Wrap(
                spacing: 8,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  Text('Q${question.number}', style: context.display(17)),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: set.colorDim.withValues(alpha: .18),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(
                      set.displayName,
                      style: context.display(11).copyWith(color: set.colorDim),
                    ),
                  ),
                  _TierBadge(tier: question.tier),
                  Icon(
                    expanded ? Icons.expand_less : Icons.expand_more,
                    size: 18,
                    color: p.dim,
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _TierBadge extends StatelessWidget {
  const _TierBadge({required this.tier});

  final ConfidenceTier tier;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Tooltip(
      message: tier.tooltip,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
        decoration: BoxDecoration(
          border: Border.all(color: p.line),
          borderRadius: BorderRadius.circular(4),
        ),
        child: Text(tier.label, style: context.display(9)),
      ),
    );
  }
}

class _SignalChip extends StatelessWidget {
  const _SignalChip({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: p.highlightWash,
        borderRadius: BorderRadius.circular(6),
      ),
      // .chip: 12px w600 on the highlight wash
      child: Text(
        text,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: p.ink,
        ),
      ),
    );
  }
}

class _Body extends StatelessWidget {
  const _Body({
    required this.question,
    required this.revealed,
    required this.forceRevealed,
    required this.pickedLetter,
    required this.ttsTarget,
  });

  final Question question;
  final bool revealed;
  final bool forceRevealed;
  final String? pickedLetter;
  final SpeechTarget? ttsTarget;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final drill = context.watch<DrillCubit>().state;
    final n = question.number;
    final hinted = forceRevealed || drill.hinted.contains(n);
    final showExample =
        forceRevealed || revealed || drill.exampleShown.contains(n);
    final stemBeingRead = ttsTarget?.question == n && ttsTarget?.letter == null;

    return Padding(
      padding: const EdgeInsets.fromLTRB(14, 8, 14, 4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'VERBATIM QUESTION — THE HIGHLIGHT IS WHAT GIVES THE SET & '
            'ANSWER AWAY',
            style: context.display(10).copyWith(color: p.dim),
          ),
          const SizedBox(height: 6),
          Container(
            decoration: BoxDecoration(
              color: stemBeingRead
                  ? p.link.withValues(alpha: .10)
                  : Colors.transparent,
              borderRadius: BorderRadius.circular(4),
            ),
            child: HighlightedStem(
              stem: question.stem,
              signals: drill.highlightsOn || forceRevealed
                  ? question.signals
                  : const [],
            ),
          ),
          _Fold(
            open: hinted,
            child: _HintBox(question: question),
          ),
          _Fold(
            open: showExample,
            child: _ExampleBlock(example: question.example),
          ),
          const SizedBox(height: 8),
          for (final choice in question.choiceList)
            ChoiceTile(
              question: question,
              choice: choice,
              revealed: revealed,
              forceAssists: forceRevealed,
              isYourPick: pickedLetter == choice.letter.display,
              beingRead:
                  ttsTarget?.question == n &&
                  ttsTarget?.letter == choice.letter,
            ),
          if (!forceRevealed)
            Center(
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: FilledButton(
                  onPressed: () => context.read<DrillCubit>().toggleRevealed(n),
                  child: Text(revealed ? 'Hide answer' : 'Reveal answer'),
                ),
              ),
            ),
          if (revealed) _AfterReveal(question: question),
        ],
      ),
    );
  }
}

/// Renders the stem with the translucent giveaway wash behind each signal
/// phrase. Text color never changes (the mark-color invariant).
class HighlightedStem extends StatelessWidget {
  /// Creates the stem text with [signals] washed.
  const HighlightedStem({required this.stem, required this.signals, super.key});

  /// Verbatim stem.
  final String stem;

  /// Phrases to wash (empty = no highlighting).
  final List<String> signals;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    // .stem: 13.5px in the stem color
    final base = TextStyle(fontSize: 13.5, height: 1.45, color: p.stem);
    if (signals.isEmpty) return Text(stem, style: base);

    final spans = <TextSpan>[];
    var cursor = 0;
    final lower = stem.toLowerCase();
    while (cursor < stem.length) {
      var bestStart = -1;
      var bestLen = 0;
      for (final signal in signals) {
        final idx = lower.indexOf(signal.toLowerCase(), cursor);
        if (idx >= 0 && (bestStart == -1 || idx < bestStart)) {
          bestStart = idx;
          bestLen = signal.length;
        }
      }
      if (bestStart == -1) {
        spans.add(TextSpan(text: stem.substring(cursor)));
        break;
      }
      if (bestStart > cursor) {
        spans.add(TextSpan(text: stem.substring(cursor, bestStart)));
      }
      spans.add(
        TextSpan(
          text: stem.substring(bestStart, bestStart + bestLen),
          style: TextStyle(backgroundColor: p.highlightWash),
        ),
      );
      cursor = bestStart + bestLen;
    }
    return Text.rich(TextSpan(style: base, children: spans));
  }
}

/// Animated fold, mirroring the web's max-height+opacity unfold.
class _Fold extends StatelessWidget {
  const _Fold({required this.open, required this.child});

  final bool open;
  final Widget child;

  @override
  Widget build(BuildContext context) => AnimatedSize(
    duration: const Duration(milliseconds: 280),
    curve: Curves.easeInOut,
    alignment: Alignment.topCenter,
    child: open ? child : const SizedBox(width: double.infinity),
  );
}

class _HintBox extends StatelessWidget {
  const _HintBox({required this.question});

  final Question question;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    Widget item(String label, String text) => Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: context.display(10).copyWith(color: p.dim)),
          Text(text, style: TextStyle(fontSize: 14, color: p.ink)),
        ],
      ),
    );
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(top: 8),
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: p.soft,
        border: Border.all(color: p.line),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          item('REALLY ASKING', question.hintAsk),
          item('LOOK FIRST', question.hintFirst),
        ],
      ),
    );
  }
}

class _ExampleBlock extends StatelessWidget {
  const _ExampleBlock({required this.example});

  final WorkedExample example;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(top: 8),
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        border: Border.all(color: p.pick.withValues(alpha: .5)),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  border: Border.all(color: p.line),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(example.mechanism, style: context.display(10)),
              ),
              const SizedBox(width: 8),
              Text(
                'IN PRACTICE',
                style: context.display(10).copyWith(color: p.dim),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(example.lead, style: TextStyle(fontSize: 14, color: p.ink)),
          const SizedBox(height: 6),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: p.soft,
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text(
              example.snippet,
              style: TextStyle(
                fontFamily: 'monospace',
                fontSize: 12.5,
                color: p.ink,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _AfterReveal extends StatelessWidget {
  const _AfterReveal({required this.question});

  final Question question;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    Widget band(String text, Color border) => Container(
      width: double.infinity,
      margin: const EdgeInsets.only(top: 6),
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        border: Border.all(color: border),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(text, style: TextStyle(fontSize: 13.5, color: p.ink)),
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (question.isDisputed)
          band(
            '⚠ Your doc marked ${question.markedLetter!.display} — verified '
            'read says ${question.winningLetter.display}.',
            p.runner,
          )
        else if (question.markedLetter != null)
          band(
            '✓ Your doc marked ${question.markedLetter!.display} — matches.',
            p.pick,
          ),
        if (question.debateNote != null)
          band('⚖ ${question.debateNote}', p.dim),
        if (question.docLinks.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(top: 6),
            child: Wrap(
              spacing: 10,
              children: [
                Text(
                  'Sources:',
                  style: TextStyle(fontSize: 12.5, color: p.dim),
                ),
                for (final link in question.docLinks)
                  Text(
                    link.label,
                    style: TextStyle(fontSize: 12.5, color: p.link),
                  ),
              ],
            ),
          ),
      ],
    );
  }
}

/// Copies the Ask-Claude packet for [question] to the clipboard — the same
/// JSON contract as the web app's askClaude (src/assets/app.js).
Future<void> copyAskClaudePacket(Question question) async {
  final choices = {
    for (final c in question.choiceList)
      c.letter.display: {
        'text': c.text,
        'plain_words': c.plain,
        'pattern_gist': c.gist,
        'verdict': switch (c.verdict) {
          Verdict.pick => 'CORRECT',
          Verdict.runner => 'close 2nd — plausible but loses',
          Verdict.kill => 'eliminate',
        },
        'why': c.why,
      },
  };
  final payload = {
    'source':
        'CCA-F practice drill (Anthropic Claude Certification – '
        'Foundations)',
    'question_number': question.number,
    'pattern_set': question.topicSet.displayName,
    'set_rule': question.topicSet.rule,
    'confidence_tier': question.tier.tooltip,
    'skim_cue': question.cue,
    'signal_phrases': question.signals,
    'question_verbatim': question.stem,
    'really_asking': question.hintAsk,
    'look_first': question.hintFirst,
    'choices': choices,
    'correct_answer': question.winningLetter.display,
    'in_practice': {
      'mechanism': question.example.mechanism,
      'lead': question.example.lead,
      'snippet': question.example.snippet,
    },
  };
  const instruction =
      'Teach me this one CCA-F practice question. My study tool packed '
      'everything you need into the JSON below. Rules: use plain, simple '
      'language. Short lines. Examples over explanations. Give me: (1) the '
      'pattern in one short sentence. (2) a tiny concrete example for the '
      'correct answer - code or JSON, keep every line under 45 characters '
      'so nothing scrolls sideways. (3) one line per wrong choice: what '
      'makes it tempting, then the simple reason it loses. (4) a one-line '
      'memory hook to recall this pattern on the exam. Do not repeat the '
      'JSON back. Do not add generic exam advice. Keep the whole reply '
      'short - this is a learning aid, not an essay.';
  final encoded = const JsonEncoder.withIndent(' ').convert(payload);
  await Clipboard.setData(
    ClipboardData(text: '$instruction\n\n```json\n$encoded\n```'),
  );
}
