import 'package:ccaf_drill/domain/answer_letter.dart';
import 'package:ccaf_drill/domain/authored_content.dart';
import 'package:ccaf_drill/domain/confidence_tier.dart';
import 'package:ccaf_drill/domain/doc_link.dart';
import 'package:ccaf_drill/domain/topic_set.dart';
import 'package:ccaf_drill/domain/verdict.dart';
import 'package:equatable/equatable.dart';

/// One answer option (A–D) with all of its assist layers.
///
/// Mirrors the Python `Choice` dataclass (src/models.py). Field roles:
/// [text]/[plain]/[gist]/[why] render in the card and feed TTS/Ask-Claude;
/// [verdict] drives the badge, strike-through, and downfall stats.
final class Choice extends Equatable {
  /// Creates an immutable choice.
  const Choice({
    required this.letter,
    required this.text,
    required this.plain,
    required this.gist,
    required this.verdict,
    required this.why,
  });

  /// Identity within its question.
  final AnswerLetter letter;

  /// Verbatim option text.
  final String text;

  /// ◦ plain — simple-words rephrase.
  final String plain;

  /// ⌁ gist — one-line pattern-fit pseudo-code.
  final String gist;

  /// Analysis verdict (pick / runner / kill).
  final Verdict verdict;

  /// Reveal reasoning; the core of 🔊 Why.
  final String why;

  @override
  List<Object> get props => [letter, text, plain, gist, verdict, why];
}

/// The 'In practice' block: the winning mechanism made concrete.
final class WorkedExample extends Equatable {
  /// Creates an immutable example.
  const WorkedExample({
    required this.mechanism,
    required this.lead,
    required this.snippet,
  });

  /// Mechanism label pill (e.g. 'AGENT SDK · TASK TOOL PROMPT').
  final String mechanism;

  /// Lead sentence; spoken at the end of 🔊 Why.
  final String lead;

  /// Code/JSON snippet; never spoken (reads terribly aloud).
  final String snippet;

  @override
  List<Object> get props => [mechanism, lead, snippet];
}

/// One drill question, fully joined across the five data files.
///
/// The question : answerChoices relationship is the typed [choices] map —
/// exactly four entries, one per [AnswerLetter], with exactly one
/// [Verdict.pick] (enforced by repository tests). Mirrors the Python
/// `Question` dataclass (src/models.py) and the JS `QuestionCard` accessor.
final class Question extends Equatable {
  /// Creates an immutable question.
  const Question({
    required this.number,
    required this.stem,
    required this.topicSet,
    required this.winningLetter,
    required this.choices,
    required this.cue,
    required this.signals,
    required this.hintAsk,
    required this.hintFirst,
    required this.example,
    this.markedLetter,
  });

  /// 1–60 identity.
  final int number;

  /// Verbatim question text.
  final String stem;

  /// The set this question belongs to.
  final TopicSet topicSet;

  /// The correct letter.
  final AnswerLetter winningLetter;

  /// The 1:4 question : answerChoices mapping, in letter order.
  final Map<AnswerLetter, Choice> choices;

  /// One-line skim takeaway above the stem.
  final String cue;

  /// Giveaway phrases → chips + stem highlight wash.
  final List<String> signals;

  /// 'Really asking' hint (never spoils).
  final String hintAsk;

  /// 'Look first' hint (never spoils).
  final String hintFirst;

  /// The In-practice block.
  final WorkedExample example;

  /// Letter pre-marked in the team doc, if any.
  final AnswerLetter? markedLetter;

  /// The choice carrying the correct answer.
  Choice get winningChoice => choices[winningLetter]!;

  /// Choices in display order.
  List<Choice> get choiceList =>
      AnswerLetter.values.map((l) => choices[l]!).toList();

  /// Confidence tier (authored knowledge, defaults to guidance).
  ConfidenceTier get tier => AuthoredContent.tierOf(number);

  /// Wording-sensitivity note for debate-tier questions, if any.
  String? get debateNote => AuthoredContent.debateNotes[number];

  /// Doc links backing this specific question.
  List<DocLink> get docLinks =>
      AuthoredContent.questionLinks[number] ?? const [];

  /// True when the team doc's mark disagrees with the verified pick.
  bool get isDisputed => markedLetter != null && markedLetter != winningLetter;

  @override
  List<Object?> get props => [
    number,
    stem,
    topicSet,
    winningLetter,
    choices,
    cue,
    signals,
    hintAsk,
    hintFirst,
    example,
    markedLetter,
  ];
}
