import 'package:ccaf_drill/application/drill_cubit.dart';
import 'package:ccaf_drill/application/tts_cubit.dart';
import 'package:ccaf_drill/domain/assists.dart';
import 'package:ccaf_drill/domain/question.dart';
import 'package:ccaf_drill/presentation/theme/app_theme.dart';
import 'package:ccaf_drill/presentation/widgets/question_card_view.dart';
import 'package:ccaf_drill/presentation/widgets/voice_settings_sheet.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

/// The floating assist dock: a vertical rail on wide layouts, a bottom pill
/// on narrow ones. Scoped to the drill's active question — the rail's top
/// accent and the card's ring share the set color, so the target is
/// unambiguous. Mirrors the web #dock.
class AssistDock extends StatelessWidget {
  /// Creates the dock over the currently active [question].
  const AssistDock({required this.question, super.key});

  /// The question the dock controls.
  final Question question;

  /// Below this the dock is a bottom pill; at or above it, a side rail.
  /// The web app keeps the pill up to 1100px, but the pill reads as
  /// "mobile" — user preference (2026-07-11) is the rail on any
  /// desktop-wide window, pill only at true mobile widths.
  static const _railBreakpoint = 600.0;

  /// Whether the rail layout applies at [width].
  static bool isRail(double width) => width >= _railBreakpoint;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final drill = context.watch<DrillCubit>().state;
    final tts = context.watch<TtsCubit>().state;
    final n = question.number;
    final revealed = drill.revealed.contains(n);
    final rail = isRail(MediaQuery.sizeOf(context).width);

    bool speaking(SpeechScope scope) =>
        tts.playingQuestion == n && tts.playingScope == scope;

    final buttons = <Widget>[
      Text('Q$n', style: context.display(15)),
      _DockButton(
        action: AssistAction.hint,
        on: drill.hinted.contains(n),
        dead: revealed,
        onTap: () => context.read<DrillCubit>().toggleHint(n),
      ),
      _DockButton(
        action: AssistAction.highlights,
        on: drill.highlightsOn,
        onTap: () => context.read<DrillCubit>().toggleHighlights(),
      ),
      _DockButton(
        action: AssistAction.gists,
        on: drill.gistsShown.contains(n),
        dead: revealed,
        onTap: () => context.read<DrillCubit>().toggleGists(n),
      ),
      _DockButton(
        action: AssistAction.example,
        on: drill.exampleShown.contains(n),
        dead: revealed,
        onTap: () => context.read<DrillCubit>().toggleExample(n),
      ),
      _DockButton(
        action: AssistAction.askClaude,
        onTap: () async {
          await copyAskClaudePacket(question);
          if (context.mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('✓ Copied — paste into Claude')),
            );
          }
        },
      ),
      if (tts.supported) ...[
        const _DockDivider(),
        _DockButton(
          action: AssistAction.speakQuestion,
          playing: speaking(SpeechScope.question),
          onTap: () =>
              context.read<TtsCubit>().play(question, SpeechScope.question),
        ),
        _DockButton(
          action: AssistAction.speakChoices,
          playing: speaking(SpeechScope.choices),
          onTap: () => context.read<TtsCubit>().play(
            question,
            SpeechScope.choices,
            plainShown: drill.choicePlainShown,
          ),
        ),
        _DockButton(
          action: AssistAction.speakWhy,
          playing: speaking(SpeechScope.revealWhy),
          dead: !revealed,
          onTap: () =>
              context.read<TtsCubit>().play(question, SpeechScope.revealWhy),
        ),
        _DockButton(
          action: AssistAction.voiceSettings,
          onTap: () => showVoiceSettingsSheet(context),
        ),
      ],
      const _DockDivider(),
      _DockButton(
        action: AssistAction.reveal,
        on: revealed,
        filled: true,
        labelOverride: revealed ? 'Hide' : 'Reveal',
        onTap: () {
          context.read<DrillCubit>().toggleRevealed(n);
          if (revealed) context.read<TtsCubit>().stop();
        },
      ),
    ];

    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: p.card,
        borderRadius: BorderRadius.circular(rail ? 14 : 999),
        border: Border.all(color: p.line),
        boxShadow: const [BoxShadow(blurRadius: 24, color: Color(0x80000000))],
      ),
      foregroundDecoration: rail
          ? BoxDecoration(
              borderRadius: BorderRadius.circular(14),
              border: Border(
                top: BorderSide(color: question.topicSet.colorDim, width: 3),
              ),
            )
          : null,
      child: rail
          ? SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: _spaced(buttons),
              ),
            )
          : SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: _spaced(buttons),
              ),
            ),
    );
  }

  List<Widget> _spaced(List<Widget> children) => [
    for (final child in children) ...[
      child,
      const SizedBox(width: 6, height: 5),
    ],
  ];
}

class _DockButton extends StatelessWidget {
  const _DockButton({
    required this.action,
    required this.onTap,
    this.on = false,
    this.dead = false,
    this.playing = false,
    this.filled = false,
    this.labelOverride,
  });

  final AssistAction action;
  final VoidCallback onTap;
  final bool on;
  final bool dead;
  final bool playing;
  final bool filled;
  final String? labelOverride;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final label = labelOverride ?? action.label;
    return Opacity(
      opacity: dead ? .4 : 1,
      child: InkWell(
        onTap: dead ? null : onTap,
        borderRadius: BorderRadius.circular(999),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          decoration: BoxDecoration(
            color: filled ? p.ink : null,
            border: Border.all(
              color: playing || on ? p.ink : p.dim,
              width: playing ? 1.6 : 1.2,
            ),
            borderRadius: BorderRadius.circular(999),
          ),
          child: Text(
            playing ? '⏹ ${label.replaceAll('🔊 ', '')}' : label,
            style: context
                .display(11)
                .copyWith(
                  color: filled
                      ? p.buttonForeground
                      : (on || playing ? p.ink : p.dim),
                ),
          ),
        ),
      ),
    );
  }
}

class _DockDivider extends StatelessWidget {
  const _DockDivider();

  @override
  Widget build(BuildContext context) =>
      Container(width: 24, height: 1, color: context.palette.line);
}
