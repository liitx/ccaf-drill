// Parity gate: the Dart app and the deployed web app must agree on the
// answer key. Reads the web build's embedded ANS payload straight out of
// ../index.html and compares it with the parsed questions.
import 'dart:convert';
import 'dart:io';

import 'package:ccaf_drill/data/asset_question_repository.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('answer key matches the web build 1:1', () async {
    final html = File('../index.html').readAsStringSync();
    final match = RegExp(r'const ANS = (\{.*?\});').firstMatch(html);
    expect(match, isNotNull, reason: 'ANS payload not found in index.html');
    final webKey = (json.decode(match!.group(1)!) as Map<String, dynamic>)
        .cast<String, String>();

    final questions = await AssetQuestionRepository().loadQuestions();
    expect(questions, hasLength(webKey.length));
    for (final q in questions) {
      expect(
        q.winningLetter.display,
        webKey['${q.number}'],
        reason: 'Q${q.number} disagrees with the web answer key',
      );
    }
  });
}
