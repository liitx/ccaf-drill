import 'dart:convert';

import 'package:ccaf_drill/domain/answer_letter.dart';
import 'package:ccaf_drill/domain/question.dart';
import 'package:ccaf_drill/domain/question_repository.dart';
import 'package:ccaf_drill/domain/topic_set.dart';
import 'package:ccaf_drill/domain/verdict.dart';
import 'package:flutter/services.dart';

/// Loads the five data files (bundled from the repo's data/ directory) and
/// joins them into [Question] structs — the Dart mirror of
/// `load_questions` in the web generator (src/models.py).
///
/// Parsing happens once; every later call returns the same immutable list
/// (claudart Law 4).
final class AssetQuestionRepository implements QuestionRepository {
  /// Creates a repository reading from [bundle] (defaults to [rootBundle]).
  AssetQuestionRepository({AssetBundle? bundle})
    : _bundle = bundle ?? rootBundle;

  final AssetBundle _bundle;
  List<Question>? _cache;

  static const _dir = 'data';

  @override
  Future<List<Question>> loadQuestions() async {
    if (_cache != null) return _cache!;
    final questions =
        json.decode(await _bundle.loadString('$_dir/questions.json'))
            as List<dynamic>;
    final analysis = await _loadMap('analysis.json');
    final examples = await _loadMap('examples.json');
    final hintsFile = await _loadMap('hints.json');
    final gists = await _loadMap('gists.json');
    final hints = hintsFile['hints']! as Map<String, dynamic>;
    final plains = hintsFile['plain']! as Map<String, dynamic>;

    _cache = List.unmodifiable(
      questions.map((raw) {
        final q = raw as Map<String, dynamic>;
        final number = q['n'] as int;
        final key = '$number';
        final a = analysis[key]! as Map<String, dynamic>;
        final verdicts = a['v'] as Map<String, dynamic>;
        final choiceTexts = q['choices'] as Map<String, dynamic>;
        final plain = plains[key]! as Map<String, dynamic>;
        final gist = gists[key]! as Map<String, dynamic>;
        final hint = hints[key]! as Map<String, dynamic>;
        final example = examples[key]! as Map<String, dynamic>;
        final marked = q['marked'] as String?;

        return Question(
          number: number,
          stem: q['stem'] as String,
          topicSet: TopicSet.fromJsonKey(a['set'] as String),
          winningLetter: AnswerLetter.fromDisplay(a['win'] as String),
          choices: Map.unmodifiable({
            for (final letter in AnswerLetter.values)
              letter: _choice(letter, choiceTexts, plain, gist, verdicts),
          }),
          cue: a['cue'] as String,
          signals: List.unmodifiable(
            (a['sig'] as List<dynamic>).cast<String>(),
          ),
          hintAsk: hint['ask'] as String,
          hintFirst: hint['first'] as String,
          example: WorkedExample(
            mechanism: example['mech'] as String,
            lead: example['lead'] as String,
            snippet: example['snip'] as String,
          ),
          markedLetter: (marked == null || marked.isEmpty)
              ? null
              : AnswerLetter.fromDisplay(marked),
        );
      }),
    );
    return _cache!;
  }

  Future<Map<String, dynamic>> _loadMap(String file) async =>
      json.decode(await _bundle.loadString('$_dir/$file'))
          as Map<String, dynamic>;

  Choice _choice(
    AnswerLetter letter,
    Map<String, dynamic> texts,
    Map<String, dynamic> plain,
    Map<String, dynamic> gist,
    Map<String, dynamic> verdicts,
  ) {
    final v = verdicts[letter.display]! as Map<String, dynamic>;
    return Choice(
      letter: letter,
      text: texts[letter.display] as String,
      plain: plain[letter.display] as String,
      gist: gist[letter.display] as String,
      verdict: Verdict.fromJsonCode(v['verdict'] as String),
      why: v['why'] as String,
    );
  }
}
