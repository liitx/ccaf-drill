import 'package:ccaf_drill/application/drill_cubit.dart';
import 'package:ccaf_drill/domain/question.dart';
import 'package:ccaf_drill/domain/verdict.dart';
import 'package:ccaf_drill/presentation/theme/app_theme.dart';
import 'package:ccaf_drill/presentation/theme/drill_palette.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

/// One answer choice row: letter, verdict badge (revealed), verbatim text
/// (struck through for revealed kills), per-choice ◦ plain / ⌁ gist
/// mini-toggles, and the why-line on reveal. Mirrors the web `.choice`.
class ChoiceTile extends StatelessWidget {
  /// Creates a tile for [choice] of [question].
  const ChoiceTile({
    required this.question,
    required this.choice,
    required this.revealed,
    this.forceAssists = false,
    this.isYourPick = false,
    this.beingRead = false,
    super.key,
  });

  /// Owning question.
  final Question question;

  /// The choice to render.
  final Choice choice;

  /// Whether verdicts and whys are visible.
  final bool revealed;

  /// Show plain + gist regardless of toggles (clones).
  final bool forceAssists;

  /// Tag with "YOUR PICK" (exam review).
  final bool isYourPick;

  /// TTS is reading this choice right now → follow-along wash.
  final bool beingRead;

  Color _verdictColor(DrillPalette p) => switch (choice.verdict) {
    Verdict.pick => p.pick,
    Verdict.runner => p.runner,
    Verdict.kill => p.kill,
  };

  Color _verdictBackground(DrillPalette p) => switch (choice.verdict) {
    Verdict.pick => p.pickBackground,
    Verdict.runner => p.runnerBackground,
    Verdict.kill => p.killBackground,
  };

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final drill = context.watch<DrillCubit>().state;
    final key = (question.number, choice.letter);
    final showPlain = forceAssists || drill.choicePlainShown.contains(key);
    final showGist =
        forceAssists ||
        drill.choiceGistShown.contains(key) ||
        drill.gistsShown.contains(question.number);
    final struck = revealed && choice.verdict == Verdict.kill;

    return Container(
      width: double.infinity,
      // .choice: radius 9, padding 8x11, 7px gap
      margin: const EdgeInsets.only(bottom: 7),
      padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 8),
      decoration: BoxDecoration(
        color: beingRead
            ? p.link.withValues(alpha: .10)
            : revealed
            ? _verdictBackground(p)
            : p.soft,
        border: Border.all(
          color: revealed ? _verdictColor(p).withValues(alpha: .5) : p.line,
        ),
        borderRadius: BorderRadius.circular(9),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(choice.letter.display, style: context.display(15)),
              const SizedBox(width: 8),
              if (revealed)
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 6,
                    vertical: 1,
                  ),
                  decoration: BoxDecoration(
                    border: Border.all(color: _verdictColor(p)),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    choice.verdict.badge,
                    style: context
                        .display(10)
                        .copyWith(color: _verdictColor(p)),
                  ),
                ),
              if (isYourPick) ...[
                const SizedBox(width: 6),
                Text(
                  'YOUR PICK',
                  style: context.display(10).copyWith(color: p.runner),
                ),
              ],
              const Spacer(),
              if (!forceAssists) ...[
                _MiniToggle(
                  label: '◦ plain',
                  on: drill.choicePlainShown.contains(key),
                  enabled: !revealed,
                  onTap: () => context.read<DrillCubit>().toggleChoicePlain(
                    question.number,
                    choice.letter,
                  ),
                ),
                const SizedBox(width: 4),
                _MiniToggle(
                  label: '⌁ gist',
                  on: showGist,
                  enabled: !revealed,
                  onTap: () => context.read<DrillCubit>().toggleChoiceGist(
                    question.number,
                    choice.letter,
                  ),
                ),
              ],
            ],
          ),
          const SizedBox(height: 4),
          Text(
            choice.text,
            style: TextStyle(
              fontSize: 13.5,
              height: 1.4,
              color: struck ? p.killText : p.ink,
              decoration: struck ? TextDecoration.lineThrough : null,
            ),
          ),
          _Fold(
            open: showPlain,
            child: Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(
                '◦ ${choice.plain}',
                style: TextStyle(fontSize: 13.5, color: p.pick),
              ),
            ),
          ),
          _Fold(
            open: showGist,
            child: Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(
                choice.gist,
                style: TextStyle(
                  fontFamily: 'monospace',
                  fontSize: 12.5,
                  color: p.dim,
                ),
              ),
            ),
          ),
          _Fold(
            open: revealed,
            child: Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Text(
                choice.why,
                style: TextStyle(fontSize: 13.5, color: _verdictColor(p)),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _MiniToggle extends StatelessWidget {
  const _MiniToggle({
    required this.label,
    required this.on,
    required this.enabled,
    required this.onTap,
  });

  final String label;
  final bool on;
  final bool enabled;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return InkWell(
      onTap: enabled ? onTap : null,
      borderRadius: BorderRadius.circular(999),
      child: Opacity(
        opacity: enabled ? 1 : .4,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
          decoration: BoxDecoration(
            border: Border.all(color: on ? p.ink : p.dim),
            borderRadius: BorderRadius.circular(999),
          ),
          child: Text(
            label,
            style: TextStyle(fontSize: 11, color: on ? p.ink : p.dim),
          ),
        ),
      ),
    );
  }
}

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
