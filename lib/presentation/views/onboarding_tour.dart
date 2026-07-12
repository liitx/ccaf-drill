import 'package:ccaf_drill/application/settings_cubit.dart';
import 'package:ccaf_drill/presentation/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

/// One tour slide: kicker, headline, and skimmable bullets.
final class TourSlide {
  /// Creates a slide.
  const TourSlide({
    required this.kicker,
    required this.title,
    required this.bullets,
  });

  /// Small eyebrow label.
  final String kicker;

  /// Headline.
  final String title;

  /// (bold lead, rest) bullet pairs.
  final List<(String, String)> bullets;
}

/// The 4-slide first-visit tour (replayable via the ? Tour button).
/// Content mirrors the web tour, list-formatted per the onboarding redesign.
const tourSlides = [
  TourSlide(
    kicker: 'WELCOME',
    title: 'One tool, three rooms',
    bullets: [
      ('Key', 'learn the patterns'),
      ('Drill', 'practice with help'),
      ('Exam', 'the 1:1 rehearsal'),
    ],
  ),
  TourSlide(
    kicker: 'THE LOOP',
    title: 'Four moves, repeat',
    bullets: [
      ('Skim', 'the cue + yellow giveaway chips'),
      ('Guess', 'commit before revealing'),
      ('Reveal', 'why every choice wins or loses'),
      ('Flag', 'anything shaky for the next pass'),
    ],
  ),
  TourSlide(
    kicker: 'TRAINING WHEELS',
    title: 'Stuck? Every question has help',
    bullets: [
      ('💡 Hint', 'what is really asked. Never spoils'),
      ('⌁ Gists', 'each choice as one-line code'),
      ('◦ plain', 'a choice in simple words'),
      ('🔊 Listen', 'hear it read aloud, words highlight as it reads'),
      ('🤖 Ask Claude', 'copies the question for a walkthrough'),
    ],
  ),
  TourSlide(
    kicker: 'READ THE COLORS',
    title: 'Badges in ten seconds',
    bullets: [
      ('Colored pills', 'topic sets, same color everywhere'),
      ('✓ PICK · ✕ OUT', 'correct vs eliminated'),
      ('DOCS-VERIFIED', 'beats GUIDANCE beats DEBATE'),
    ],
  ),
];

/// Shows the tour dialog; marks it done on finish or skip. The final
/// slide's CTA launches the spotlight walkthrough via [onWalkthrough].
Future<void> showOnboardingTour(
  BuildContext context, {
  VoidCallback? onWalkthrough,
}) async {
  final settings = context.read<SettingsCubit>();
  final walkthrough = await showDialog<bool>(
    context: context,
    barrierDismissible: false,
    builder: (_) => const _TourDialog(),
  );
  await settings.markTourDone();
  if ((walkthrough ?? false) && onWalkthrough != null) onWalkthrough();
}

class _TourDialog extends StatefulWidget {
  const _TourDialog();

  @override
  State<_TourDialog> createState() => _TourDialogState();
}

class _TourDialogState extends State<_TourDialog> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final slide = tourSlides[_index];
    final last = _index == tourSlides.length - 1;

    return AlertDialog(
      title: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '${slide.kicker} · ${_index + 1}/${tourSlides.length}',
            style: context.display(10).copyWith(color: p.dim),
          ),
          Text(slide.title, style: context.display(20)),
        ],
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (final (lead, rest) in slide.bullets)
            Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: Text.rich(
                TextSpan(
                  style: TextStyle(fontSize: 14, color: p.ink),
                  children: [
                    TextSpan(
                      text: lead,
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                    TextSpan(text: ' — $rest'),
                  ],
                ),
              ),
            ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context, false),
          child: const Text('Skip'),
        ),
        if (_index > 0)
          TextButton(
            onPressed: () => setState(() => _index--),
            child: const Text('← Back'),
          ),
        if (last)
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Walk me through the screen →'),
          )
        else
          FilledButton(
            onPressed: () => setState(() => _index++),
            child: const Text('Next →'),
          ),
        if (last)
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Done'),
          ),
      ],
    );
  }
}
