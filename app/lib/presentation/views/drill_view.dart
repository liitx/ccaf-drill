import 'package:ccaf_drill/application/drill_cubit.dart';
import 'package:ccaf_drill/domain/narrow_filter.dart';
import 'package:ccaf_drill/domain/question.dart';
import 'package:ccaf_drill/domain/topic_set.dart';
import 'package:ccaf_drill/presentation/theme/app_theme.dart';
import 'package:ccaf_drill/presentation/widgets/assist_dock.dart';
import 'package:ccaf_drill/presentation/widgets/question_card_view.dart';
import 'package:ccaf_drill/presentation/widgets/web_chip.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

/// The drill room: toolbar (Set / Narrow / View clusters), the question list
/// (All) or pager (Single), and the floating assist dock scoped to the
/// active question. Snap behavior comes free from [PageView] in Single; in
/// All the active question is whichever expanded card was touched last.
class DrillView extends StatelessWidget {
  /// Creates the drill over the loaded [questions].
  const DrillView({required this.questions, super.key});

  /// All 60 questions.
  final List<Question> questions;

  @override
  Widget build(BuildContext context) {
    final drill = context.watch<DrillCubit>().state;
    final matching = questions.where(drill.matches).toList();
    final active = drill.activeQuestion == null
        ? null
        : matching.where((q) => q.number == drill.activeQuestion).firstOrNull;
    final rail = AssistDock.isRail(MediaQuery.sizeOf(context).width);

    final dockVisible =
        active != null && drill.expanded.contains(active.number);

    return Column(
      children: [
        ContentColumn(
          child: _Toolbar(total: questions.length, matching: matching.length),
        ),
        Expanded(
          // The dock floats over the question area only — never the toolbar.
          child: Stack(
            children: [
              ContentColumn(
                child: drill.layout == DrillLayout.all
                    ? _AllList(matching: matching, railPadding: rail)
                    : _SinglePager(matching: matching),
              ),
              if (dockVisible)
                rail
                    ? Positioned(
                        right: 12,
                        top: 0,
                        bottom: 0,
                        child: Center(child: AssistDock(question: active)),
                      )
                    : Positioned(
                        left: 12,
                        right: 12,
                        bottom: 12,
                        child: Center(child: AssistDock(question: active)),
                      ),
            ],
          ),
        ),
      ],
    );
  }
}

class _AllList extends StatelessWidget {
  const _AllList({required this.matching, required this.railPadding});

  final List<Question> matching;
  final bool railPadding;

  @override
  Widget build(BuildContext context) => ListView.builder(
    // The 92px rail lives in the viewport gutter outside the 900px column
    // on wide screens (web parity); only pad when the gutter is too small.
    padding: EdgeInsets.only(
      left: 12,
      right: railPadding && MediaQuery.sizeOf(context).width < 1160 ? 120 : 12,
      bottom: 96,
    ),
    itemCount: matching.length,
    itemBuilder: (context, index) =>
        QuestionCardView(question: matching[index]),
  );
}

class _SinglePager extends StatelessWidget {
  const _SinglePager({required this.matching});

  final List<Question> matching;

  @override
  Widget build(BuildContext context) {
    final cubit = context.read<DrillCubit>();
    final drill = context.watch<DrillCubit>().state;
    if (matching.isEmpty) {
      return const Center(child: Text('No questions match this filter.'));
    }
    final index = drill.singleIndex.clamp(0, matching.length - 1);
    final question = matching[index];
    // A single-view question is always open + dock-targeted (web parity).
    if (!drill.expanded.contains(question.number)) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        cubit
          ..toggleExpanded(question.number)
          ..setActiveQuestion(question.number);
      });
    }

    final width = MediaQuery.sizeOf(context).width;
    final rail = AssistDock.isRail(width);
    final p = context.palette;

    return Column(
      children: [
        Expanded(
          // One card visual: the question header stays pinned while the
          // choices scroll underneath it.
          child: Padding(
            padding: EdgeInsets.only(
              left: 12,
              right: rail && width < 1160 ? 120 : 12,
              top: 8,
            ),
            child: Container(
              clipBehavior: Clip.antiAlias,
              decoration: BoxDecoration(
                color: p.card,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: question.topicSet.colorDim,
                  width: 1.5,
                ),
              ),
              child: Column(
                children: [
                  QuestionStemHeader(question: question),
                  Expanded(
                    child: SingleChildScrollView(
                      padding: EdgeInsets.only(bottom: rail ? 12 : 96),
                      child: QuestionCardView(
                        question: question,
                        bodyOnly: true,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
        Padding(
          // The Prev / n / Next bar must stay visible above the bottom pill.
          padding: EdgeInsets.fromLTRB(8, 8, 8, rail ? 8 : 84),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              OutlinedButton(
                onPressed: index > 0 ? () => cubit.goToIndex(index - 1) : null,
                child: const Text('← Prev'),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Text('${index + 1} / ${matching.length}'),
              ),
              OutlinedButton(
                onPressed: index < matching.length - 1
                    ? () => cubit.goToIndex(index + 1)
                    : null,
                child: const Text('Next →'),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _Toolbar extends StatelessWidget {
  const _Toolbar({required this.total, required this.matching});

  final int total;
  final int matching;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final dark = Theme.of(context).brightness == Brightness.dark;
    final cubit = context.read<DrillCubit>();
    final drill = context.watch<DrillCubit>().state;
    final filtered = drill.setFilter != null || drill.narrow != null;

    return Container(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 10),
      decoration: BoxDecoration(
        border: Border(bottom: BorderSide(color: p.line)),
      ),
      child: Wrap(
        spacing: 26,
        runSpacing: 10,
        children: [
          _Cluster(
            label: 'Set',
            sublabel: '· pick one topic',
            children: [
              WebChip(
                label: 'All $total',
                selected: drill.setFilter == null,
                onTap: () => cubit.selectSet(null),
              ),
              for (final set in TopicSet.values)
                WebChip(
                  label: set.shortName,
                  selected: drill.setFilter == set,
                  accent: dark ? set.colorDim : set.color,
                  onTap: () =>
                      cubit.selectSet(drill.setFilter == set ? null : set),
                ),
            ],
          ),
          _Cluster(
            label: 'Narrow',
            sublabel: '· stacks on the set',
            children: [
              for (final filter in NarrowFilter.values)
                WebChip(
                  label: filter.label,
                  selected: drill.narrow == filter,
                  onTap: () => cubit.toggleNarrow(filter),
                ),
              if (filtered)
                Text(
                  '→ showing $matching of $total',
                  style: context.display(12).copyWith(color: p.dim),
                ),
            ],
          ),
          _Cluster(
            label: 'View',
            children: [
              _JoinedSegment(layout: drill.layout),
              _DotSwitch(
                label: 'Highlights',
                on: drill.highlightsOn,
                onTap: cubit.toggleHighlights,
              ),
              Container(width: 1, height: 22, color: p.line),
              WebChip(
                label: '↺ Reset',
                dashed: true,
                borderWidth: 1,
                padding: const EdgeInsets.symmetric(
                  horizontal: 13,
                  vertical: 4,
                ),
                onTap: cubit.reset,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// One toolbar cluster: uppercase tracking label over a chip row
/// (.cluster / .cluslab / .clusrow).
class _Cluster extends StatelessWidget {
  const _Cluster({required this.label, required this.children, this.sublabel});

  final String label;
  final String? sublabel;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text.rich(
          TextSpan(
            style: context
                .display(10.5)
                .copyWith(color: p.dim, letterSpacing: 1.4),
            children: [
              TextSpan(text: label.toUpperCase()),
              if (sublabel != null)
                TextSpan(
                  text: ' $sublabel',
                  style: const TextStyle(letterSpacing: .3),
                ),
            ],
          ),
        ),
        const SizedBox(height: 5),
        Wrap(
          spacing: 6,
          runSpacing: 6,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: children,
        ),
      ],
    );
  }
}

/// The ☰ All | ▭ Single layout control — a true toggle: the whole pill is
/// one tap target and every click flips the state (the active half is
/// filled ink; .seg visual, toggle behavior by user request).
class _JoinedSegment extends StatelessWidget {
  const _JoinedSegment({required this.layout});

  final DrillLayout layout;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final cubit = context.read<DrillCubit>();
    final next = layout == DrillLayout.all
        ? DrillLayout.single
        : DrillLayout.all;

    Widget half(String label, DrillLayout value, {bool divider = false}) {
      final on = layout == value;
      return AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 4),
        decoration: BoxDecoration(
          color: on ? p.ink : null,
          border: divider
              ? Border(left: BorderSide(color: p.ink, width: 1.5))
              : null,
        ),
        child: Text(
          label.toUpperCase(),
          style: context
              .display(12.5)
              .copyWith(color: on ? p.buttonForeground : p.ink),
        ),
      );
    }

    return InkWell(
      onTap: () => cubit.setLayout(next),
      borderRadius: BorderRadius.circular(999),
      child: Container(
        decoration: BoxDecoration(
          border: Border.all(color: p.ink, width: 1.5),
          borderRadius: BorderRadius.circular(999),
        ),
        clipBehavior: Clip.antiAlias,
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            half('☰ All', DrillLayout.all),
            half('▭ Single', DrillLayout.single, divider: true),
          ],
        ),
      ),
    );
  }
}

/// The Highlights dot-switch (.switch / .dot): pill with a 9px dot that
/// goes pick-green when on.
class _DotSwitch extends StatelessWidget {
  const _DotSwitch({
    required this.label,
    required this.on,
    required this.onTap,
  });

  final String label;
  final bool on;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(999),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 4),
        decoration: BoxDecoration(
          border: Border.all(color: p.line, width: 1.5),
          borderRadius: BorderRadius.circular(999),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 9,
              height: 9,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: on ? p.pick : p.line,
              ),
            ),
            const SizedBox(width: 7),
            Text(
              label.toUpperCase(),
              style: context.display(12.5).copyWith(color: on ? p.ink : p.dim),
            ),
          ],
        ),
      ),
    );
  }
}
