import 'package:ccaf_drill/domain/pattern_code.dart';
import 'package:ccaf_drill/domain/question.dart';
import 'package:ccaf_drill/domain/topic_set.dart';
import 'package:ccaf_drill/presentation/theme/app_theme.dart';
import 'package:ccaf_drill/presentation/widgets/question_card_view.dart';
import 'package:ccaf_drill/presentation/widgets/web_chip.dart';
import 'package:flutter/material.dart';

/// The Key room: how-to-use guide, the 12 cheat codes, and one panel per
/// set (fingerprint / rule / variation + member table with inline
/// expansion). Mirrors the web Key view.
class KeyView extends StatelessWidget {
  /// Creates the key over the loaded [questions].
  const KeyView({required this.questions, super.key});

  /// All 60 questions.
  final List<Question> questions;

  @override
  Widget build(BuildContext context) => ContentColumn(
    child: ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 90),
      children: [
        const _GuideSection(),
        const _CheatCodesSection(),
        for (final set in TopicSet.values)
          _SetPanel(
            set: set,
            members: questions.where((q) => q.topicSet == set).toList(),
          ),
      ],
    ),
  );
}

class _GuideSection extends StatelessWidget {
  const _GuideSection();

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    Widget bullet(String bold, String rest) => Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Text.rich(
        TextSpan(
          style: TextStyle(fontSize: 13.5, height: 1.4, color: p.ink),
          children: [
            TextSpan(
              text: bold,
              style: const TextStyle(fontWeight: FontWeight.w700),
            ),
            TextSpan(text: ' — $rest'),
          ],
        ),
      ),
    );

    return ExpansionTile(
      title: Text('How to use this tool', style: context.display(16)),
      childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
      children: [
        bullet('Key', 'this page: cheat codes + one panel per set.'),
        bullet('Drill', 'study all 60 with per-question assists.'),
        bullet('Exam', '1:1 simulation: 60 Q / 120 min, one per screen.'),
        bullet('💡 Hint', 'what is really being asked. Never spoils.'),
        bullet(
          '🔊 Listen',
          'question, choices, or the full answer '
              'reasoning read aloud with follow-along highlighting.',
        ),
        bullet('🤖 Ask Claude', 'copies a JSON packet for a walkthrough.'),
        bullet(
          '⚠ Disputed 8',
          'Q2, 12, 15, 17, 18, 22, 41, 42 — the team '
              'doc mark disagrees with the verified pick. Drill these first.',
        ),
      ],
    );
  }
}

class _CheatCodesSection extends StatelessWidget {
  const _CheatCodesSection();

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return ExpansionTile(
      title: Text(
        'Cheat codes — the 12 meta-patterns',
        style: context.display(16),
      ),
      childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
      children: [
        for (final pattern in PatternCode.values)
          Container(
            width: double.infinity,
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: p.soft,
              border: Border.all(color: p.line),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${pattern.id} · ${pattern.title}',
                  style: context.display(13),
                ),
                const SizedBox(height: 4),
                Text(
                  pattern.description,
                  style: TextStyle(fontSize: 13, color: p.ink),
                ),
                const SizedBox(height: 4),
                Text(
                  'Q ${pattern.memberQuestions.join(' · ')}',
                  style: TextStyle(fontSize: 12, color: p.dim),
                ),
              ],
            ),
          ),
      ],
    );
  }
}

class _SetPanel extends StatelessWidget {
  const _SetPanel({required this.set, required this.members});

  final TopicSet set;
  final List<Question> members;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    Widget block(String label, String text) => Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: context.display(10).copyWith(color: p.dim)),
          Text(text, style: TextStyle(fontSize: 13.5, color: p.ink)),
        ],
      ),
    );

    return ExpansionTile(
      leading: CircleAvatar(radius: 6, backgroundColor: set.colorDim),
      title: Text(
        '${set.displayName} · ${members.length} questions',
        style: context.display(16),
      ),
      childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
      children: [
        block("Fingerprint — you're in this set when you see", set.fingerprint),
        block('The one rule', set.rule),
        block('What varies between questions', set.vary),
        for (final q in members) _MemberRow(question: q),
      ],
    );
  }
}

class _MemberRow extends StatelessWidget {
  const _MemberRow({required this.question});

  final Question question;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return ExpansionTile(
      dense: true,
      tilePadding: EdgeInsets.zero,
      title: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 42,
            child: Text('Q${question.number}', style: context.display(13)),
          ),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 6,
                    vertical: 2,
                  ),
                  decoration: BoxDecoration(
                    color: p.highlightWash,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    question.signals.first,
                    style: TextStyle(fontSize: 12, color: p.ink),
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  question.cue,
                  style: TextStyle(fontSize: 12.5, color: p.dim),
                ),
              ],
            ),
          ),
        ],
      ),
      children: [QuestionCardView(question: question, forceRevealed: true)],
    );
  }
}
