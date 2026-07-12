// ignore_for_file: lines_longer_than_80_chars — generated authored content
import 'dart:ui';

import 'package:ccaf_drill/domain/doc_link.dart';

/// The six topic sets — the color-coded backbone of the whole tool.
///
/// A question belongs to exactly one set. The set carries the recognition
/// fingerprint, the one elimination rule (also spoken by TTS "Why"), and the
/// docs that back it. Mirrors `SETS_DEFS` in the web generator (src/content.py).
enum TopicSet {
  /// Extraction & Schema.
  extraction(
    jsonKey: 'E',
    displayName: 'Extraction & Schema',
    color: Color(0xFF2E7D6B),
    colorDim: Color(0xFF5BC4A8),
    fingerprint:
        '“Your extraction pipeline…”, a JSON schema, and a defect rate: inconsistent values, hallucinated fields, or validation failures.',
    rule:
        'Fix it where the data is born. Add structure the schema was missing, or demonstrate the target format with few-shot examples. Never patch downstream (post-processing, verifier LLMs, retries) and never force the model to guess (required fields, bigger model).',
    vary:
        'What varies is WHICH structure is missing: a field that can hold two values, permission to say null, a format demo, an escape hatch for an open-ended enum, or a self-check field.',
    docLinks: [DocLink.toolChoice],
  ),

  /// Evals, Review & Batch.
  evals(
    jsonKey: 'V',
    displayName: 'Evals, Review & Batch',
    color: Color(0xFF8A5A00),
    colorDim: Color(0xFFD9A94B),
    fingerprint:
        'Numbers doing the talking: percentages, SLA hours, reviewer capacity, “most cost-effective”, Batch API.',
    rule:
        'Do the arithmetic before judging vibes. Batch interval + 24h ≤ SLA. Split urgent from patient. Fix only what failed, and fix the actual error. Never trust an aggregate metric — segment it, and route scarce review by calibrated confidence.',
    vary:
        'What varies is the resource being budgeted: hours (28, 58), dollars (55), reviewer attention (60), or trust (21, 59).',
    docLinks: [DocLink.batchProcessing],
  ),

  /// Multi-Agent Orchestration.
  multiAgent(
    jsonKey: 'M',
    displayName: 'Multi-Agent Orchestration',
    color: Color(0xFF5A4FB5),
    colorDim: Color(0xFFA79BF0),
    fingerprint:
        'A cast of named agents — coordinator, web search, document analysis, synthesis — and something breaking between them.',
    rule:
        'Two tensions, two rules. (1) Handoff loss: subagents are sealed; whatever must survive a handoff travels as structured data the coordinator explicitly passes. (2) Delegation style: give subagents goals + quality criteria, never step-by-step scripts.',
    vary:
        'What varies is WHAT got lost (dates, citations, findings, the delegation itself) or WHERE control sits (over-scripted subagent, coordinator doing too little or too much).',
    docLinks: [DocLink.subagents, DocLink.claudeCodeSubagents],
  ),

  /// Claude Code: Sessions & Exploration.
  claudeCode(
    jsonKey: 'C',
    displayName: 'Claude Code: Sessions & Exploration',
    color: Color(0xFFB04A2F),
    colorDim: Color(0xFFE58B6B),
    fingerprint:
        'Claude Code tool names (Grep, Read, Edit), file counts, minutes elapsed, or session verbs: resume, fork, continue, /clear.',
    rule:
        'Exploration: targeted and incremental — trace structure from entry points; never bulk-read, never start blind-fresh. Sessions: small known change → resume + inform. Two futures from one past → fork. Know the name → --resume it. Degrading context → subagents or a scratchpad file.',
    vary:
        'What varies is the failure mode: stale files, rot mid-session, an un-anchorable Edit, or picking the right resume/fork/fresh move.',
    docLinks: [DocLink.sessions, DocLink.claudeCodeSubagents],
  ),

  /// Support Agent: Tools & Escalation.
  supportAgent(
    jsonKey: 'S',
    displayName: 'Support Agent: Tools & Escalation',
    color: Color(0xFF1F6FA8),
    colorDim: Color(0xFF74B6E4),
    fingerprint:
        'lookup_order / process_refund / escalate_to_human, a quoted frustrated customer, refund dollar amounts.',
    rule:
        'Escalation is judgment-guided by criteria (customer asks, policy exception, no progress) — except hard compliance thresholds, which get code/hooks, never a louder prompt. Handoffs are structured summaries, not transcripts. Context gets compacted to the fields that matter.',
    vary:
        r'What varies is the trigger: explicit human demand (honor it), instantly-fixable issue (offer both paths), hard $ threshold (hook), stale data (fresh session + summary).',
    docLinks: [DocLink.mcpTools, DocLink.mcpErrors],
  ),

  /// MCP & Tool Design.
  mcpTools(
    jsonKey: 'T',
    displayName: 'MCP & Tool Design',
    color: Color(0xFF96385E),
    colorDim: Color(0xFFDE8FB4),
    fingerprint:
        'Tool descriptions quoted in the stem, tools being ignored, uniform “Operation failed” errors, isError.',
    rule:
        'The description and the error payload ARE the interface. An ignored tool has a thin description — enrich it. An unusable error is missing structure — errorCategory + isRetryable + guidance at the source. Never remove competing tools or coach around it in the prompt.',
    vary:
        'What varies is which half of the interface is starving the model: the description (25, 46) or the error contract (54, and S-set cousins 24, 42).',
    docLinks: [DocLink.mcpTools, DocLink.mcpErrors],
  );

  const TopicSet({
    required this.jsonKey,
    required this.displayName,
    required this.color,
    required this.colorDim,
    required this.fingerprint,
    required this.rule,
    required this.vary,
    required this.docLinks,
  });

  /// Single-letter key used in data/analysis.json ('E','V','M','C','S','T').
  final String jsonKey;

  /// Full display name (pills, key panels, exam results).
  final String displayName;

  /// Light-theme accent.
  final Color color;

  /// Dark-theme accent (also the dock scope ring).
  final Color colorDim;

  /// "You're in this set when you see…" (key panel).
  final String fingerprint;

  /// The one rule; spoken at the end of the TTS answer walkthrough.
  final String rule;

  /// What varies between member questions (key panel).
  final String vary;

  /// Doc links backing the set.
  final List<DocLink> docLinks;

  /// Short name for filter pills (text before ':' / '&').
  String get shortName => displayName.split(':').first.split('&').first.trim();

  /// Resolve a set from its data-file key.
  static TopicSet fromJsonKey(String key) =>
      values.firstWhere((s) => s.jsonKey == key);
}
