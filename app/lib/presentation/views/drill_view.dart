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

    return Stack(
      children: [
        ContentColumn(
          child: Column(
            children: [
              _Toolbar(total: questions.length, matching: matching.length),
              Expanded(
                child: drill.layout == DrillLayout.all
                    ? _AllList(matching: matching, railPadding: rail)
                    : _SinglePager(matching: matching),
              ),
            ],
          ),
        ),
        if (active != null && drill.expanded.contains(active.number))
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

    return Column(
      children: [
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: QuestionCardView(question: question),
          ),
        ),
        Padding(
          padding: const EdgeInsets.all(8),
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
    final cubit = context.read<DrillCubit>();
    final drill = context.watch<DrillCubit>().state;
    final filtered = drill.setFilter != null || drill.narrow != null;

    return Padding(
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'SET · pick one topic',
            style: context.display(10).copyWith(color: p.dim),
          ),
          const SizedBox(height: 4),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              ChoiceChip(
                label: Text('✓ ALL $total'),
                selected: drill.setFilter == null,
                onSelected: (_) => cubit.selectSet(null),
              ),
              for (final set in TopicSet.values)
                ChoiceChip(
                  label: Text(set.shortName),
                  selected: drill.setFilter == set,
                  selectedColor: set.colorDim.withValues(alpha: .25),
                  onSelected: (_) =>
                      cubit.selectSet(drill.setFilter == set ? null : set),
                ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: [
                    for (final filter in NarrowFilter.values)
                      FilterChip(
                        label: Text(filter.label),
                        selected: drill.narrow == filter,
                        onSelected: (_) => cubit.toggleNarrow(filter),
                      ),
                    if (filtered)
                      Padding(
                        padding: const EdgeInsets.only(top: 8),
                        child: Text(
                          '→ showing $matching of $total',
                          style: TextStyle(fontSize: 12.5, color: p.dim),
                        ),
                      ),
                  ],
                ),
              ),
              SegmentedButton<DrillLayout>(
                segments: const [
                  ButtonSegment(value: DrillLayout.all, label: Text('☰ All')),
                  ButtonSegment(
                    value: DrillLayout.single,
                    label: Text('▭ Single'),
                  ),
                ],
                selected: {drill.layout},
                onSelectionChanged: (selection) =>
                    cubit.setLayout(selection.single),
              ),
              const SizedBox(width: 8),
              TextButton(
                onPressed: cubit.hideAllAnswers,
                child: const Text('Hide answers'),
              ),
              TextButton(onPressed: cubit.reset, child: const Text('↺ Reset')),
            ],
          ),
        ],
      ),
    );
  }
}
