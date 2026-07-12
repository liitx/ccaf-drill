// Enum test matrices (claudart law: |variants| × |getters| assertions).
// Expected values are written as exhaustive switch expressions so the
// compiler itself proves every variant has a row — adding a variant without
// extending the matrix is a build error, not a coverage gap.
import 'package:ccaf_drill/domain/answer_letter.dart';
import 'package:ccaf_drill/domain/assists.dart';
import 'package:ccaf_drill/domain/authored_content.dart';
import 'package:ccaf_drill/domain/confidence_tier.dart';
import 'package:ccaf_drill/domain/doc_link.dart';
import 'package:ccaf_drill/domain/exam_mode.dart';
import 'package:ccaf_drill/domain/narrow_filter.dart';
import 'package:ccaf_drill/domain/pattern_code.dart';
import 'package:ccaf_drill/domain/storage_key.dart';
import 'package:ccaf_drill/domain/topic_set.dart';
import 'package:ccaf_drill/domain/verdict.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('AnswerLetter matrix (4 × 1 + roundtrip)', () {
    String expectedDisplay(AnswerLetter l) => switch (l) {
      AnswerLetter.a => 'A',
      AnswerLetter.b => 'B',
      AnswerLetter.c => 'C',
      AnswerLetter.d => 'D',
    };

    for (final letter in AnswerLetter.values) {
      test('$letter display + fromDisplay roundtrip', () {
        expect(letter.display, expectedDisplay(letter));
        expect(AnswerLetter.fromDisplay(letter.display), letter);
      });
    }
  });

  group('Verdict matrix (3 × 3 + roundtrip)', () {
    (String, String, String) expected(Verdict v) => switch (v) {
      Verdict.pick => ('W', '✓ PICK', 'correct'),
      Verdict.runner => ('R', '△ CLOSE 2nd', 'close second'),
      Verdict.kill => ('X', '✕ OUT', 'eliminate'),
    };

    for (final verdict in Verdict.values) {
      test('$verdict jsonCode/badge/spokenTag + roundtrip', () {
        final (code, badge, tag) = expected(verdict);
        expect(verdict.jsonCode, code);
        expect(verdict.badge, badge);
        expect(verdict.spokenTag, tag);
        expect(Verdict.fromJsonCode(verdict.jsonCode), verdict);
      });
    }
  });

  group('ConfidenceTier matrix (3 × 3)', () {
    (String, int) expected(ConfidenceTier t) => switch (t) {
      ConfidenceTier.docsVerified => ('DOCS-VERIFIED', 1),
      ConfidenceTier.guidance => ('GUIDANCE', 2),
      ConfidenceTier.debate => ('DEBATE', 3),
    };

    for (final tier in ConfidenceTier.values) {
      test('$tier label/tierNumber/tooltip', () {
        final (label, number) = expected(tier);
        expect(tier.label, label);
        expect(tier.tierNumber, number);
        expect(tier.tooltip, isNotEmpty);
      });
    }
  });

  group('TopicSet matrix (6 × 8 + roundtrip)', () {
    (String, String, String) expected(TopicSet s) => switch (s) {
      TopicSet.extraction => ('E', 'Extraction & Schema', 'Extraction'),
      TopicSet.evals => ('V', 'Evals, Review & Batch', 'Evals, Review'),
      TopicSet.multiAgent => (
        'M',
        'Multi-Agent Orchestration',
        'Multi-Agent Orchestration',
      ),
      TopicSet.claudeCode => (
        'C',
        'Claude Code: Sessions & Exploration',
        'Claude Code',
      ),
      TopicSet.supportAgent => (
        'S',
        'Support Agent: Tools & Escalation',
        'Support Agent',
      ),
      TopicSet.mcpTools => ('T', 'MCP & Tool Design', 'MCP'),
    };

    for (final set in TopicSet.values) {
      test('$set key/name/shortName/content fields', () {
        final (key, name, short) = expected(set);
        expect(set.jsonKey, key);
        expect(set.displayName, name);
        expect(set.shortName, short);
        expect(set.fingerprint, isNotEmpty);
        expect(set.rule, isNotEmpty);
        expect(set.vary, isNotEmpty);
        expect(set.docLinks, isNotEmpty);
        expect(TopicSet.fromJsonKey(set.jsonKey), set);
      });
    }
  });

  group('DocLink matrix (7 × 2)', () {
    for (final link in DocLink.values) {
      test('$link label + https url', () {
        expect(link.label, isNotEmpty);
        expect(link.url, startsWith('https://'));
      });
    }
    test('all seven links present', () {
      expect(DocLink.values, hasLength(7));
    });
  });

  group('PatternCode matrix (12 × 4)', () {
    for (final pattern in PatternCode.values) {
      test('$pattern id/title/description/members', () {
        expect(pattern.id, 'P${pattern.index + 1}');
        expect(pattern.title, isNotEmpty);
        expect(pattern.description, isNotEmpty);
        expect(pattern.memberQuestions, isNotEmpty);
        expect(
          pattern.memberQuestions,
          everyElement(allOf(greaterThanOrEqualTo(1), lessThanOrEqualTo(60))),
        );
      });
    }
    test('all twelve cheat codes present', () {
      expect(PatternCode.values, hasLength(12));
    });
  });

  group('AssistAction matrix (11 × 2) + speech map exhaustiveness', () {
    bool expectedIsSpeak(AssistAction a) => switch (a) {
      AssistAction.speakQuestion ||
      AssistAction.speakChoices ||
      AssistAction.speakWhy => true,
      AssistAction.hint ||
      AssistAction.highlights ||
      AssistAction.gists ||
      AssistAction.plainWords ||
      AssistAction.example ||
      AssistAction.askClaude ||
      AssistAction.voiceSettings ||
      AssistAction.reveal => false,
    };

    for (final action in AssistAction.values) {
      test('$action label + isSpeak', () {
        expect(action.label, isNotEmpty);
        expect(action.isSpeak, expectedIsSpeak(action));
      });
    }
    test('speechScopeFor covers every SpeechScope exactly once', () {
      expect(speechScopeFor, hasLength(SpeechScope.values.length));
      expect(speechScopeFor.values.toSet(), SpeechScope.values.toSet());
    });
  });

  group('ExamMode matrix (3 × 2)', () {
    for (final mode in ExamMode.values) {
      test('$mode label + assist membership', () {
        expect(mode.label, isNotEmpty);
        expect(mode.availableAssists, isA<Set<AssistAction>>());
      });
    }
    test('easy ⊃ medium ⊃ hard, reveal-speech only in easy', () {
      expect(
        ExamMode.medium.availableAssists.difference(
          ExamMode.easy.availableAssists,
        ),
        isEmpty,
      );
      expect(ExamMode.hard.availableAssists, isEmpty);
      expect(ExamMode.easy.availableAssists, contains(AssistAction.speakWhy));
      expect(
        ExamMode.medium.availableAssists,
        isNot(contains(AssistAction.speakWhy)),
      );
    });
  });

  group('StorageKey matrix (3 × 1)', () {
    for (final key in StorageKey.values) {
      test('$key uses the shared ccaf_ prefix (web-store compatible)', () {
        expect(key.key, startsWith('ccaf_'));
      });
    }
  });

  group('NarrowFilter matrix (3 × 1)', () {
    for (final filter in NarrowFilter.values) {
      test('$filter label', () {
        // Web parity: chips read '⚑ Flagged' etc. — no '+' prefix
        // (src/assets/body.html #tg-focus).
        expect(filter.label, isNotEmpty);
        expect(filter.label, isNot(startsWith('+')));
      });
    }
  });

  group('AuthoredContent maps', () {
    test('tier overrides: 11 docs-verified + 3 debate', () {
      final overrides = AuthoredContent.tierOverrides.values;
      expect(
        overrides.where((t) => t == ConfidenceTier.docsVerified),
        hasLength(11),
      );
      expect(overrides.where((t) => t == ConfidenceTier.debate), hasLength(3));
    });
    test('debate notes exist exactly for the debate-tier questions', () {
      final debateQuestions = AuthoredContent.tierOverrides.entries
          .where((e) => e.value == ConfidenceTier.debate)
          .map((e) => e.key)
          .toSet();
      expect(AuthoredContent.debateNotes.keys.toSet(), debateQuestions);
    });
    test('default tier is guidance', () {
      expect(AuthoredContent.tierOf(1), ConfidenceTier.guidance);
    });
  });
}
