import 'package:ccaf_drill/domain/answer_letter.dart';
import 'package:ccaf_drill/domain/narrow_filter.dart';
import 'package:ccaf_drill/domain/question.dart';
import 'package:ccaf_drill/domain/topic_set.dart';
import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

/// Which drill layout is active.
enum DrillLayout {
  /// Every matching question in one scrollable list.
  all,

  /// One question per screen with prev/next.
  single,
}

/// Per-question and per-choice assist state for the drill.
///
/// Mirrors the web app's card/choice CSS state classes: every toggle is a
/// membership set keyed by question number (claudart Law 3).
final class DrillState extends Equatable {
  /// Creates drill state; [DrillState.initial] is the reset baseline.
  const DrillState({
    this.setFilter,
    this.narrow,
    this.layout = DrillLayout.all,
    this.singleIndex = 0,
    this.highlightsOn = true,
    this.flagged = const {},
    this.expanded = const {},
    this.revealed = const {},
    this.hinted = const {},
    this.gistsShown = const {},
    this.exampleShown = const {},
    this.choicePlainShown = const {},
    this.choiceGistShown = const {},
    this.activeQuestion,
  });

  /// The pristine post-reset state (flags survive reset separately).
  static const initial = DrillState();

  /// Selected topic set, or null for all 60.
  final TopicSet? setFilter;

  /// Narrow chip stacked on the set filter, if any.
  final NarrowFilter? narrow;

  /// All-list vs single-question layout.
  final DrillLayout layout;

  /// Position within the filtered list in single layout.
  final int singleIndex;

  /// Global giveaway-wash switch.
  final bool highlightsOn;

  /// ⚑ flagged question numbers (survive reset).
  final Set<int> flagged;

  /// Questions whose card body is open.
  final Set<int> expanded;

  /// Questions with the answer revealed.
  final Set<int> revealed;

  /// Questions with the hint box unfolded.
  final Set<int> hinted;

  /// Questions with all gists unfolded.
  final Set<int> gistsShown;

  /// Questions with the In-practice block unfolded.
  final Set<int> exampleShown;

  /// (question, letter) pairs with the plain rephrase unfolded.
  final Set<(int, AnswerLetter)> choicePlainShown;

  /// (question, letter) pairs with the gist unfolded.
  final Set<(int, AnswerLetter)> choiceGistShown;

  /// The question the assist dock is scoped to.
  final int? activeQuestion;

  /// Whether [q] passes the current set × narrow filter combination.
  bool matches(Question q) {
    final setOk = setFilter == null || q.topicSet == setFilter;
    final narrowOk = switch (narrow) {
      null => true,
      NarrowFilter.flagged => flagged.contains(q.number),
      NarrowFilter.disputed => q.isDisputed,
      NarrowFilter.debate => q.debateNote != null,
    };
    return setOk && narrowOk;
  }

  /// Copy with updated fields.
  DrillState copyWith({
    TopicSet? Function()? setFilter,
    NarrowFilter? Function()? narrow,
    DrillLayout? layout,
    int? singleIndex,
    bool? highlightsOn,
    Set<int>? flagged,
    Set<int>? expanded,
    Set<int>? revealed,
    Set<int>? hinted,
    Set<int>? gistsShown,
    Set<int>? exampleShown,
    Set<(int, AnswerLetter)>? choicePlainShown,
    Set<(int, AnswerLetter)>? choiceGistShown,
    int? Function()? activeQuestion,
  }) => DrillState(
    setFilter: setFilter != null ? setFilter() : this.setFilter,
    narrow: narrow != null ? narrow() : this.narrow,
    layout: layout ?? this.layout,
    singleIndex: singleIndex ?? this.singleIndex,
    highlightsOn: highlightsOn ?? this.highlightsOn,
    flagged: flagged ?? this.flagged,
    expanded: expanded ?? this.expanded,
    revealed: revealed ?? this.revealed,
    hinted: hinted ?? this.hinted,
    gistsShown: gistsShown ?? this.gistsShown,
    exampleShown: exampleShown ?? this.exampleShown,
    choicePlainShown: choicePlainShown ?? this.choicePlainShown,
    choiceGistShown: choiceGistShown ?? this.choiceGistShown,
    activeQuestion: activeQuestion != null
        ? activeQuestion()
        : this.activeQuestion,
  );

  @override
  List<Object?> get props => [
    setFilter,
    narrow,
    layout,
    singleIndex,
    highlightsOn,
    flagged,
    expanded,
    revealed,
    hinted,
    gistsShown,
    exampleShown,
    choicePlainShown,
    choiceGistShown,
    activeQuestion,
  ];
}

/// Drives all drill-view state transitions.
final class DrillCubit extends Cubit<DrillState> {
  /// Starts at the reset baseline.
  DrillCubit() : super(DrillState.initial);

  static Set<T> _toggled<T>(Set<T> set, T value) =>
      set.contains(value) ? ({...set}..remove(value)) : {...set, value};

  /// Select a set filter (null = all), clamping the single index.
  void selectSet(TopicSet? set) =>
      emit(state.copyWith(setFilter: () => set, singleIndex: 0));

  /// Toggle a narrow chip (tapping the active one clears it).
  void toggleNarrow(NarrowFilter filter) => emit(
    state.copyWith(
      narrow: () => state.narrow == filter ? null : filter,
      singleIndex: 0,
    ),
  );

  /// Switch layout.
  void setLayout(DrillLayout layout) => emit(state.copyWith(layout: layout));

  /// Move within the filtered list in single layout.
  void goToIndex(int index) => emit(state.copyWith(singleIndex: index));

  /// Flip the global highlight wash.
  void toggleHighlights() =>
      emit(state.copyWith(highlightsOn: !state.highlightsOn));

  /// ⚑ flag / unflag.
  void toggleFlag(int question) =>
      emit(state.copyWith(flagged: _toggled(state.flagged, question)));

  /// Open / close a card body; an opened card becomes the dock target.
  void toggleExpanded(int question) {
    final expanded = _toggled(state.expanded, question);
    emit(
      state.copyWith(
        expanded: expanded,
        activeQuestion: () =>
            expanded.contains(question) ? question : state.activeQuestion,
      ),
    );
  }

  /// Reveal / hide the answer.
  void toggleRevealed(int question) =>
      emit(state.copyWith(revealed: _toggled(state.revealed, question)));

  /// Toggle the hint box.
  void toggleHint(int question) =>
      emit(state.copyWith(hinted: _toggled(state.hinted, question)));

  /// Toggle all gists on a card.
  void toggleGists(int question) =>
      emit(state.copyWith(gistsShown: _toggled(state.gistsShown, question)));

  /// Toggle the In-practice block.
  void toggleExample(int question) => emit(
    state.copyWith(exampleShown: _toggled(state.exampleShown, question)),
  );

  /// Toggle one choice's plain rephrase.
  void toggleChoicePlain(int question, AnswerLetter letter) => emit(
    state.copyWith(
      choicePlainShown: _toggled(state.choicePlainShown, (question, letter)),
    ),
  );

  /// Toggle one choice's gist.
  void toggleChoiceGist(int question, AnswerLetter letter) => emit(
    state.copyWith(
      choiceGistShown: _toggled(state.choiceGistShown, (question, letter)),
    ),
  );

  /// Mark the dock's target question (scroll tracking / navigation).
  void setActiveQuestion(int? question) =>
      emit(state.copyWith(activeQuestion: () => question));

  /// Reset everything except flags (mirrors the web ↺ Reset).
  void reset() => emit(DrillState(flagged: state.flagged));
}
