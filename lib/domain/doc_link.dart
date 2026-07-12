// ignore_for_file: lines_longer_than_80_chars — generated authored content
/// Official documentation links backing verified answers.
///
/// Mirrors `LINKS` in the web generator (src/content.py).
enum DocLink {
  /// Agent SDK · Sessions (continue / resume / fork).
  sessions(
    label: 'Agent SDK · Sessions (continue / resume / fork)',
    url: 'https://platform.claude.com/docs/en/agent-sdk/sessions',
  ),

  /// Agent SDK · Subagents (isolation, Task/Agent tool).
  subagents(
    label: 'Agent SDK · Subagents (isolation, Task/Agent tool)',
    url: 'https://platform.claude.com/docs/en/agent-sdk/subagents',
  ),

  /// Claude Code · Subagents.
  claudeCodeSubagents(
    label: 'Claude Code · Subagents',
    url: 'https://code.claude.com/docs/en/sub-agents',
  ),

  /// Tool use · tool_choice modes.
  toolChoice(
    label: 'Tool use · tool_choice modes',
    url:
        'https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/implement-tool-use',
  ),

  /// MCP spec · Tools & isError pattern.
  mcpTools(
    label: 'MCP spec · Tools & isError pattern',
    url:
        'https://modelcontextprotocol.io/specification/2025-06-18/server/tools',
  ),

  /// Batch processing · 24h window, 50%, custom_id.
  batchProcessing(
    label: 'Batch processing · 24h window, 50%, custom_id',
    url:
        'https://platform.claude.com/docs/en/build-with-claude/batch-processing',
  ),

  /// MCP error responses that help the model recover.
  mcpErrors(
    label: 'MCP error responses that help the model recover',
    url:
        'https://alpic.ai/blog/better-mcp-tool-call-error-responses-ai-recover-gracefully',
  );

  const DocLink({required this.label, required this.url});

  /// Human-readable link label.
  final String label;

  /// Absolute URL.
  final String url;
}
