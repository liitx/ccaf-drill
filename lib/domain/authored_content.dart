// ignore_for_file: lines_longer_than_80_chars — generated authored content
import 'package:ccaf_drill/domain/confidence_tier.dart';
import 'package:ccaf_drill/domain/doc_link.dart';

/// Authored per-question knowledge that is not derivable from data/*.json.
///
/// Mirrors `TIER`, `QLINKS`, and `DEBATE` in the web generator
/// (src/content.py). Questions absent from [tierOverrides] are
/// [ConfidenceTier.guidance].
abstract final class AuthoredContent {
  /// Non-default confidence tiers (everything else is guidance-backed).
  static const Map<int, ConfidenceTier> tierOverrides = {
    2: ConfidenceTier.docsVerified,
    5: ConfidenceTier.docsVerified,
    7: ConfidenceTier.docsVerified,
    14: ConfidenceTier.docsVerified,
    18: ConfidenceTier.debate,
    28: ConfidenceTier.debate,
    30: ConfidenceTier.docsVerified,
    37: ConfidenceTier.docsVerified,
    39: ConfidenceTier.docsVerified,
    43: ConfidenceTier.docsVerified,
    54: ConfidenceTier.docsVerified,
    55: ConfidenceTier.docsVerified,
    56: ConfidenceTier.debate,
    58: ConfidenceTier.docsVerified,
  };

  /// Doc links per question.
  static const Map<int, List<DocLink>> questionLinks = {
    2: [DocLink.subagents],
    43: [DocLink.subagents],
    30: [DocLink.subagents, DocLink.claudeCodeSubagents],
    44: [DocLink.claudeCodeSubagents],
    5: [DocLink.toolChoice],
    7: [DocLink.sessions],
    14: [DocLink.sessions],
    16: [DocLink.sessions],
    17: [DocLink.sessions],
    39: [DocLink.sessions],
    37: [DocLink.sessions],
    54: [DocLink.mcpTools],
    24: [DocLink.mcpTools, DocLink.mcpErrors],
    42: [DocLink.mcpTools, DocLink.mcpErrors],
    28: [DocLink.batchProcessing],
    55: [DocLink.batchProcessing],
    58: [DocLink.batchProcessing],
  };

  /// Wording-sensitivity notes for the debate-tier questions.
  static const Map<int, String> debateNotes = {
    18: "C vs B is wording-sensitive: 'balance fidelity with efficiency' favors structured checkpoint reports, but a stem stressing zero loss would favor the full log.",
    28: "B (6h) sits exactly at the 30h boundary with zero margin; docs note processing can slow under load, which argues for C's 4h buffer at 99.9%. 'Meets the SLA' → B. 'Most reliably meets' → C.",
    56: "A (trace entry points) vs C (parallel subagents per service). Auth is one cross-service flow, favoring A — but at 800+ files C is defensible. Watch the stem's emphasis.",
  };

  /// Tier for a question, defaulting to guidance.
  static ConfidenceTier tierOf(int question) =>
      tierOverrides[question] ?? ConfidenceTier.guidance;
}
