// ignore_for_file: lines_longer_than_80_chars — generated authored content
/// The 12 cheat codes — cross-set elimination rules.
///
/// Mirrors `PATTERNS` in the web generator (src/content.py).
enum PatternCode {
  /// FIX THE SOURCE.
  p1(
    title: 'FIX THE SOURCE',
    description:
        'Patches lose. Post-processing, retry loops, extra checker-agents, request classifiers = bolt-ons. The winner fixes the schema, tool contract, description, or prompt itself.',
    memberQuestions: [1, 8, 12, 15, 19, 24, 25, 42, 46],
  ),

  /// STRUCTURE SURVIVES.
  p2(
    title: 'STRUCTURE SURVIVES',
    description:
        'At every handoff, structured fields (dates, claim→source maps, error categories, issue records) beat prose. Summaries silently drop metadata.',
    memberQuestions: [3, 13, 23, 26, 29, 41, 47, 48, 50],
  ),

  /// HARD RULE → CODE.
  p3(
    title: 'HARD RULE → CODE',
    description:
        "See 'guaranteed', 'compliance', 'cannot be left to model discretion'? Prompts are out. Hooks / deterministic validation win.",
    memberQuestions: [33],
  ),

  /// SUBAGENTS ARE SEALED.
  p4(
    title: 'SUBAGENTS ARE SEALED',
    description:
        "Nothing flows between agents unless the coordinator puts it in the prompt. 'Agent got nothing' = coordinator didn't pass it. 'Reasons but never delegates' = missing Task tool.",
    memberQuestions: [2, 30, 43, 44, 45],
  ),

  /// GOALS, NOT SCRIPTS.
  p5(
    title: 'GOALS, NOT SCRIPTS',
    description:
        'Delegate outcomes + quality criteria. Step-by-step scripts and fixed plans make brittle agents. Adaptive beats pre-planned when the path is unknown.',
    memberQuestions: [20, 31, 35],
  ),

  /// SESSION TRIAGE.
  p6(
    title: 'SESSION TRIAGE',
    description:
        'Small known change → resume + inform. Compare two futures → fork_session. Know the name → --resume name. Stale data poisoning → fresh session + structured summary + fresh calls.',
    memberQuestions: [7, 14, 16, 17, 39, 57],
  ),

  /// EXTREMES DIE.
  p7(
    title: 'EXTREMES DIE',
    description:
        "'always' · 'never' · 'all' · 'entire' · 'only' · 'every call' · 'remove the tool' · 'accept it'. Absolute options are almost always kills. Balanced options acknowledging trade-offs win.",
    memberQuestions: [3, 5, 6, 13, 23, 52],
  ),

  /// MODEL IN THE LOOP.
  p8(
    title: 'MODEL IN THE LOOP',
    description:
        'Agentic loop = tool result enters the conversation, the model reasons about the next step. Decision trees, routers, and fixed pipelines are workflow answers, not agent answers.',
    memberQuestions: [22, 31, 53],
  ),

  /// DESCRIPTIONS ARE THE API.
  p9(
    title: 'DESCRIPTIONS ARE THE API',
    description:
        'Agent ignores a tool? Its description is thin. The model chooses tools by reading descriptions — enrich them with when/why/inputs/outputs.',
    memberQuestions: [25, 46],
  ),

  /// RETRY ≠ NEW INFO.
  p10(
    title: 'RETRY ≠ NEW INFO',
    description:
        'Retries fix format errors (shape, locale, datetime). They can never create missing information or teach format recognition.',
    memberQuestions: [10, 15],
  ),

  /// MATCH COST TO SLA.
  p11(
    title: 'MATCH COST TO SLA',
    description:
        'Two urgency classes = two paths (batch the patient, real-time the urgent). Batch math: interval + 24h ≤ SLA. Failures: fix only the failed IDs, fix the actual error.',
    memberQuestions: [28, 55, 58],
  ),

  /// TRUST, BUT SEGMENT.
  p12(
    title: 'TRUST, BUT SEGMENT',
    description:
        "Before automating on 'overall' accuracy, check per-segment. Route scarce human review by calibrated confidence, not randomness. Surface both numbers; don't auto-correct.",
    memberQuestions: [21, 59, 60],
  );

  const PatternCode({
    required this.title,
    required this.description,
    required this.memberQuestions,
  });

  /// Rule name (e.g. 'FIX THE SOURCE').
  final String title;

  /// One-paragraph statement of the rule.
  final String description;

  /// Question numbers this rule decides.
  final List<int> memberQuestions;

  /// Display id (P1…P12).
  String get id => name.toUpperCase();
}
