import 'package:ccaf_drill/application/drill_cubit.dart';
import 'package:ccaf_drill/presentation/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

/// GlobalKeys for every component the spotlight walkthrough rings.
/// Widgets opt in by attaching these (Q1-only for card internals, matching
/// the web walkthrough which always demonstrates on Q1).
abstract final class SpotlightTargets {
  /// The Key/Drill/Exam tab cluster.
  static final tabs = GlobalKey(debugLabel: 'spot-tabs');

  /// Drill toolbar: SET cluster.
  static final setCluster = GlobalKey(debugLabel: 'spot-sets');

  /// Drill toolbar: NARROW cluster.
  static final narrowCluster = GlobalKey(debugLabel: 'spot-narrow');

  /// Drill toolbar: VIEW cluster.
  static final viewCluster = GlobalKey(debugLabel: 'spot-view');

  /// Q1 card header row.
  static final cardHeader = GlobalKey(debugLabel: 'spot-cardhead');

  /// Q1 cue + signal chips zone.
  static final cardChips = GlobalKey(debugLabel: 'spot-chips');

  /// The assist dock.
  static final dock = GlobalKey(debugLabel: 'spot-dock');

  /// The dock's 🔊 Question button.
  static final dockSpeak = GlobalKey(debugLabel: 'spot-speak');

  /// Q1 choice A header (per-choice minis).
  static final choiceHead = GlobalKey(debugLabel: 'spot-choicehead');

  /// Q1 reveal bar.
  static final reveal = GlobalKey(debugLabel: 'spot-reveal');

  /// The EXAM tab chip.
  static final examTab = GlobalKey(debugLabel: 'spot-examtab');
}

/// One walkthrough step: where the ring goes, the list-format copy
/// (mirrors the web SPOT_STEPS), and what must happen before it shows.
final class SpotlightStep {
  /// Creates a step.
  const SpotlightStep({
    required this.target,
    required this.title,
    required this.bullets,
    this.prep,
  });

  /// The ringed component.
  final GlobalKey target;

  /// Step headline.
  final String title;

  /// (bold lead, rest) pairs — one fact per line.
  final List<(String, String)> bullets;

  /// Runs before the step renders (room switches, card expansion).
  final void Function(BuildContext context)? prep;
}

/// Launches the 11-step walkthrough. [switchRoom] flips the shell tab
/// (0 = Key, 1 = Drill, 2 = Exam); [currentRoom] is restored on exit.
void startSpotlight(
  BuildContext context, {
  required void Function(int index) switchRoom,
  required int currentRoom,
}) {
  final overlay = Overlay.of(context);
  late OverlayEntry entry;
  entry = OverlayEntry(
    builder: (_) => _SpotlightOverlay(
      hostContext: context,
      switchRoom: switchRoom,
      onFinished: () {
        switchRoom(currentRoom);
        entry.remove();
      },
    ),
  );
  overlay.insert(entry);
}

List<SpotlightStep> _steps(void Function(int) switchRoom) => [
  SpotlightStep(
    target: SpotlightTargets.tabs,
    title: 'The three rooms',
    bullets: const [
      ('Key', 'learn the patterns'),
      ('Drill', 'practice with help'),
      ('Exam', 'the 1:1 rehearsal'),
    ],
    prep: (context) => switchRoom(0),
  ),
  SpotlightStep(
    target: SpotlightTargets.setCluster,
    title: 'Sets — pick a topic',
    bullets: const [
      ('6 colored sets', 'tap a pill, study that group'),
      ('Same colors everywhere', 'Key, cards, exam results'),
    ],
    prep: (context) => switchRoom(1),
  ),
  SpotlightStep(
    target: SpotlightTargets.narrowCluster,
    title: 'Narrow — stacks on your set',
    bullets: const [
      ('Chips stack', 'on the set above'),
      ('⚑ Flagged', 'your flagged questions'),
      ('⚠ Disputed 8', 'the team doc marked these wrong. Drill first'),
      ('Tap again', 'to clear'),
    ],
  ),
  SpotlightStep(
    target: SpotlightTargets.viewCluster,
    title: 'View — layout + actions',
    bullets: const [
      ('☰ All / ▭ Single', 'one tap flips the layout'),
      ('Highlights switch', 'giveaway wash on/off'),
      ('↺ Reset', 'clean slate. Flags survive'),
    ],
  ),
  SpotlightStep(
    target: SpotlightTargets.cardHeader,
    title: 'A question card',
    bullets: const [
      ('⚑', 'flag for later'),
      ('Colored pill', 'its set'),
      ('Badge', 'confidence: DOCS-VERIFIED > GUIDANCE > DEBATE'),
    ],
    prep: (context) {
      final drill = context.read<DrillCubit>();
      if (!drill.state.expanded.contains(1)) drill.toggleExpanded(1);
    },
  ),
  SpotlightStep(
    target: SpotlightTargets.cardChips,
    title: 'Skim first, read later',
    bullets: const [
      ('Bold line', 'the one-sentence takeaway'),
      ('Yellow chips', 'the giveaway phrases'),
      ('Spot them', 'skip the wall of text'),
    ],
  ),
  SpotlightStep(
    target: SpotlightTargets.dock,
    title: 'The floating help dock',
    bullets: const [
      ('Follows your question', 'watch the Q number + card ring'),
      ('💡 Hint', 'what is really asked. Never spoils'),
      ('🖍 HL · ⌁ Gists', 'highlights · choices as code'),
      ('In practice', 'winning mechanism + snippet'),
      ('🤖 Ask', 'copies the question for Claude'),
    ],
  ),
  SpotlightStep(
    target: SpotlightTargets.dockSpeak,
    title: 'Listen instead of read',
    bullets: const [
      ('🔊 Question / Choices', 'reads it aloud'),
      ('🔊 Why', 'the full answer, spoken. Unlocks on Reveal'),
      ('⚙ Voice', 'pick voice + speed'),
      ('Words highlight', 'as it reads. Tap 🔊 again = stop'),
    ],
  ),
  SpotlightStep(
    target: SpotlightTargets.choiceHead,
    title: 'Per-choice toggles',
    bullets: const [
      ('◦ plain', 'simple words'),
      ('⌁ gist', 'one-line code'),
      ('Toggle', 'just the choice you are stuck on'),
    ],
  ),
  SpotlightStep(
    target: SpotlightTargets.reveal,
    title: 'Reveal — the full answer',
    bullets: const [
      ('✓ pick · ✕ eliminated', 'struck through'),
      ('Why each choice loses', 'plus the in-practice example'),
      ('Help toggles gray out', 'already showing'),
    ],
  ),
  SpotlightStep(
    target: SpotlightTargets.examTab,
    title: 'When you are ready: Exam',
    bullets: const [
      ('60 Q · 120 min', 'one per screen'),
      ('Easy/Medium/Hard', 'how much help exists'),
      ('Results', 'rank your weakest set + how you miss'),
    ],
  ),
];

class _SpotlightOverlay extends StatefulWidget {
  const _SpotlightOverlay({
    required this.hostContext,
    required this.switchRoom,
    required this.onFinished,
  });

  final BuildContext hostContext;
  final void Function(int) switchRoom;
  final VoidCallback onFinished;

  @override
  State<_SpotlightOverlay> createState() => _SpotlightOverlayState();
}

class _SpotlightOverlayState extends State<_SpotlightOverlay> {
  late final List<SpotlightStep> steps = _steps(widget.switchRoom);
  int _index = 0;
  Rect? _target;

  @override
  void initState() {
    super.initState();
    _enter(0);
  }

  void _enter(int index) {
    setState(() {
      _index = index;
      _target = null;
    });
    final step = steps[index];
    // Prep (room switches, card expansion) must run outside this build
    // pass; then one more frame so the target exists before measuring.
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      if (widget.hostContext.mounted) step.prep?.call(widget.hostContext);
      await WidgetsBinding.instance.endOfFrame;
      final targetContext = step.target.currentContext;
      if (targetContext != null && targetContext.mounted) {
        try {
          await Scrollable.ensureVisible(targetContext, alignment: .3);
        } on Object {
          // Target left the tree mid-navigation; the ring just centers.
        }
      }
      if (!mounted) return;
      final box = step.target.currentContext?.findRenderObject() as RenderBox?;
      setState(() {
        _target = (box != null && box.hasSize)
            ? box.localToGlobal(Offset.zero) & box.size
            : null;
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final step = steps[_index];
    final screen = MediaQuery.sizeOf(context);
    final ring = _target?.inflate(6);
    final last = _index == steps.length - 1;

    // Tooltip below the ring when there is room, else above.
    const tipWidth = 360.0;
    const tipEstimatedHeight = 240.0;
    final below =
        ring == null || ring.bottom + tipEstimatedHeight < screen.height;
    final tipTop = ring == null
        ? screen.height / 2 - tipEstimatedHeight / 2
        : below
        ? ring.bottom + 12
        : (ring.top - tipEstimatedHeight - 12).clamp(12.0, screen.height);
    final tipLeft = ring == null
        ? screen.width / 2 - tipWidth / 2
        : ring.left.clamp(12.0, screen.width - tipWidth - 12);

    return Stack(
      children: [
        // Dimmed barrier with a cutout + ring over the target.
        Positioned.fill(
          child: IgnorePointer(
            child: CustomPaint(painter: _RingPainter(ring: ring)),
          ),
        ),
        // Swallow taps outside the tooltip so the tour stays modal.
        Positioned.fill(
          child: GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: () {},
          ),
        ),
        Positioned(
          top: tipTop,
          left: tipLeft,
          width: tipWidth,
          child: Material(
            color: p.card,
            borderRadius: BorderRadius.circular(12),
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                border: Border.all(color: p.line),
                borderRadius: BorderRadius.circular(12),
                boxShadow: const [
                  BoxShadow(blurRadius: 30, color: Color(0xAA000000)),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'COMPONENT ${_index + 1} / ${steps.length}',
                    style: context
                        .display(10.5)
                        .copyWith(color: p.dim, letterSpacing: 1.4),
                  ),
                  const SizedBox(height: 4),
                  Text(step.title.toUpperCase(), style: context.display(19)),
                  const SizedBox(height: 8),
                  for (final (lead, rest) in step.bullets)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 5),
                      child: Text.rich(
                        TextSpan(
                          style: TextStyle(fontSize: 13.5, color: p.ink),
                          children: [
                            TextSpan(
                              text: lead,
                              style: const TextStyle(
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            TextSpan(text: ' — $rest'),
                          ],
                        ),
                      ),
                    ),
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 8,
                    runSpacing: 6,
                    alignment: WrapAlignment.spaceBetween,
                    children: [
                      OutlinedButton(
                        onPressed: _index > 0 ? () => _enter(_index - 1) : null,
                        child: const Text('← Back'),
                      ),
                      TextButton(
                        onPressed: widget.onFinished,
                        child: Text('Exit', style: TextStyle(color: p.dim)),
                      ),
                      FilledButton(
                        onPressed: last
                            ? widget.onFinished
                            : () => _enter(_index + 1),
                        child: Text(last ? 'Finish' : 'Next →'),
                      ),
                    ],
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

/// Dims everything except a rounded cutout, ringed in the highlight gold
/// (the web #spotring).
class _RingPainter extends CustomPainter {
  const _RingPainter({required this.ring});

  final Rect? ring;

  static const _gold = Color(0xFFE4CB5C);

  @override
  void paint(Canvas canvas, Size size) {
    final dim = Paint()..color = const Color(0x99000000);
    if (ring == null) {
      canvas.drawRect(Offset.zero & size, dim);
      return;
    }
    final hole = RRect.fromRectAndRadius(ring!, const Radius.circular(10));
    final cover = Path.combine(
      PathOperation.difference,
      Path()..addRect(Offset.zero & size),
      Path()..addRRect(hole),
    );
    canvas
      ..drawPath(cover, dim)
      ..drawRRect(
        hole,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = 2.5
          ..color = _gold,
      );
  }

  @override
  bool shouldRepaint(_RingPainter oldDelegate) => ring != oldDelegate.ring;
}
