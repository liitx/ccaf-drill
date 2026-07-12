"""Authored domain content — knowledge that lives in this repo, not in data/*.json.

Everything here was derived during the original analysis (see HANDOFF.md §2):
the six sets, the confidence tiers, the disputed answers, the 12 cheat codes,
and the doc links that back the verified answers.
"""
from .constants import Verdict
from .models import SetDef

# The six topic sets, declared directly as structs (order = display order).
SETS_DEFS = {
    'E': SetDef(
        key='E',
        name='Extraction & Schema',
        color='#2E7D6B',
        color_dim='#5BC4A8',
        fingerprint='“Your extraction pipeline…”, a JSON schema, and a defect rate: inconsistent values, hallucinated fields, or validation failures.',
        rule='Fix it where the data is born. Add structure the schema was missing, or demonstrate the target format with few-shot examples. Never patch downstream (post-processing, verifier LLMs, retries) and never force the model to guess (required fields, bigger model).',
        vary='What varies is WHICH structure is missing: a field that can hold two values, permission to say null, a format demo, an escape hatch for an open-ended enum, or a self-check field.',
        links=('toolchoice',),
    ),
    'V': SetDef(
        key='V',
        name='Evals, Review & Batch',
        color='#8A5A00',
        color_dim='#D9A94B',
        fingerprint='Numbers doing the talking: percentages, SLA hours, reviewer capacity, “most cost-effective”, Batch API.',
        rule='Do the arithmetic before judging vibes. Batch interval + 24h ≤ SLA. Split urgent from patient. Fix only what failed, and fix the actual error. Never trust an aggregate metric — segment it, and route scarce review by calibrated confidence.',
        vary='What varies is the resource being budgeted: hours (28, 58), dollars (55), reviewer attention (60), or trust (21, 59).',
        links=('batch',),
    ),
    'M': SetDef(
        key='M',
        name='Multi-Agent Orchestration',
        color='#5A4FB5',
        color_dim='#A79BF0',
        fingerprint='A cast of named agents — coordinator, web search, document analysis, synthesis — and something breaking between them.',
        rule='Two tensions, two rules. (1) Handoff loss: subagents are sealed; whatever must survive a handoff travels as structured data the coordinator explicitly passes. (2) Delegation style: give subagents goals + quality criteria, never step-by-step scripts.',
        vary='What varies is WHAT got lost (dates, citations, findings, the delegation itself) or WHERE control sits (over-scripted subagent, coordinator doing too little or too much).',
        links=('subagents', 'ccsub'),
    ),
    'C': SetDef(
        key='C',
        name='Claude Code: Sessions & Exploration',
        color='#B04A2F',
        color_dim='#E58B6B',
        fingerprint='Claude Code tool names (Grep, Read, Edit), file counts, minutes elapsed, or session verbs: resume, fork, continue, /clear.',
        rule='Exploration: targeted and incremental — trace structure from entry points; never bulk-read, never start blind-fresh. Sessions: small known change → resume + inform. Two futures from one past → fork. Know the name → --resume it. Degrading context → subagents or a scratchpad file.',
        vary='What varies is the failure mode: stale files, rot mid-session, an un-anchorable Edit, or picking the right resume/fork/fresh move.',
        links=('sessions', 'ccsub'),
    ),
    'S': SetDef(
        key='S',
        name='Support Agent: Tools & Escalation',
        color='#1F6FA8',
        color_dim='#74B6E4',
        fingerprint='lookup_order / process_refund / escalate_to_human, a quoted frustrated customer, refund dollar amounts.',
        rule='Escalation is judgment-guided by criteria (customer asks, policy exception, no progress) — except hard compliance thresholds, which get code/hooks, never a louder prompt. Handoffs are structured summaries, not transcripts. Context gets compacted to the fields that matter.',
        vary='What varies is the trigger: explicit human demand (honor it), instantly-fixable issue (offer both paths), hard $ threshold (hook), stale data (fresh session + summary).',
        links=('mcptools', 'mcperr'),
    ),
    'T': SetDef(
        key='T',
        name='MCP & Tool Design',
        color='#96385E',
        color_dim='#DE8FB4',
        fingerprint='Tool descriptions quoted in the stem, tools being ignored, uniform “Operation failed” errors, isError.',
        rule='The description and the error payload ARE the interface. An ignored tool has a thin description — enrich it. An unusable error is missing structure — errorCategory + isRetryable + guidance at the source. Never remove competing tools or coach around it in the prompt.',
        vary='What varies is which half of the interface is starving the model: the description (25, 46) or the error contract (54, and S-set cousins 24, 42).',
        links=('mcptools', 'mcperr'),
    ),
}


LINKS = {
 'sessions': ('Agent SDK · Sessions (continue / resume / fork)', 'https://platform.claude.com/docs/en/agent-sdk/sessions'),
 'subagents': ('Agent SDK · Subagents (isolation, Task/Agent tool)', 'https://platform.claude.com/docs/en/agent-sdk/subagents'),
 'ccsub': ('Claude Code · Subagents', 'https://code.claude.com/docs/en/sub-agents'),
 'toolchoice': ('Tool use · tool_choice modes', 'https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/implement-tool-use'),
 'mcptools': ('MCP spec · Tools & isError pattern', 'https://modelcontextprotocol.io/specification/2025-06-18/server/tools'),
 'batch': ('Batch processing · 24h window, 50%, custom_id', 'https://platform.claude.com/docs/en/build-with-claude/batch-processing'),
 'mcperr': ('MCP error responses that help the model recover', 'https://alpic.ai/blog/better-mcp-tool-call-error-responses-ai-recover-gracefully'),
}

# tier: 1 = docs-verified, 2 = guidance-backed, 3 = debate
TIER = {n: 2 for n in range(1, 61)}
for n in [2, 5, 7, 14, 30, 37, 39, 43, 54, 55, 58]: TIER[n] = 1
for n in [18, 28, 56]: TIER[n] = 3

QLINKS = {
 2: ['subagents'], 43: ['subagents'], 30: ['subagents', 'ccsub'], 44: ['ccsub'],
 5: ['toolchoice'], 7: ['sessions'], 14: ['sessions'], 16: ['sessions'], 17: ['sessions'],
 39: ['sessions'], 37: ['sessions'], 54: ['mcptools'], 24: ['mcptools', 'mcperr'], 42: ['mcptools', 'mcperr'],
 28: ['batch'], 55: ['batch'], 58: ['batch'],
}

DEBATE = {
 18: "C vs B is wording-sensitive: 'balance fidelity with efficiency' favors structured checkpoint reports, but a stem stressing zero loss would favor the full log.",
 28: "B (6h) sits exactly at the 30h boundary with zero margin; docs note processing can slow under load, which argues for C's 4h buffer at 99.9%. 'Meets the SLA' → B. 'Most reliably meets' → C.",
 56: "A (trace entry points) vs C (parallel subagents per service). Auth is one cross-service flow, favoring A — but at 800+ files C is defensible. Watch the stem's emphasis.",
}

TIERMETA = {
 1: ('T1', 'DOCS-VERIFIED', 'Answer confirmed directly against official Anthropic docs or the MCP spec.'),
 2: ('T2', 'GUIDANCE', "Follows Anthropic's published best-practice guidance; no single doc line settles it."),
 3: ('T3', 'DEBATE', 'Two defensible choices — read the stem\'s exact wording. Team-discussion candidate.'),
}



PATTERNS = [
 ("P1","FIX THE SOURCE","Patches lose. Post-processing, retry loops, extra checker-agents, request classifiers = bolt-ons. The winner fixes the schema, tool contract, description, or prompt itself.","1 · 8 · 12 · 15 · 19 · 24 · 25 · 42 · 46"),
 ("P2","STRUCTURE SURVIVES","At every handoff, structured fields (dates, claim→source maps, error categories, issue records) beat prose. Summaries silently drop metadata.","3 · 13 · 23 · 26 · 29 · 41 · 47 · 48 · 50"),
 ("P3","HARD RULE → CODE","See 'guaranteed', 'compliance', 'cannot be left to model discretion'? Prompts are out. Hooks / deterministic validation win.","33"),
 ("P4","SUBAGENTS ARE SEALED","Nothing flows between agents unless the coordinator puts it in the prompt. 'Agent got nothing' = coordinator didn't pass it. 'Reasons but never delegates' = missing Task tool.","2 · 30 · 43 · 44 · 45"),
 ("P5","GOALS, NOT SCRIPTS","Delegate outcomes + quality criteria. Step-by-step scripts and fixed plans make brittle agents. Adaptive beats pre-planned when the path is unknown.","20 · 31 · 35"),
 ("P6","SESSION TRIAGE","Small known change → resume + inform. Compare two futures → fork_session. Know the name → --resume name. Stale data poisoning → fresh session + structured summary + fresh calls.","7 · 14 · 16 · 17 · 39 · 57"),
 ("P7","EXTREMES DIE","'always' · 'never' · 'all' · 'entire' · 'only' · 'every call' · 'remove the tool' · 'accept it'. Absolute options are almost always kills. Balanced options acknowledging trade-offs win.","3 · 5 · 6 · 13 · 23 · 52"),
 ("P8","MODEL IN THE LOOP","Agentic loop = tool result enters the conversation, the model reasons about the next step. Decision trees, routers, and fixed pipelines are workflow answers, not agent answers.","22 · 31 · 53"),
 ("P9","DESCRIPTIONS ARE THE API","Agent ignores a tool? Its description is thin. The model chooses tools by reading descriptions — enrich them with when/why/inputs/outputs.","25 · 46"),
 ("P10","RETRY ≠ NEW INFO","Retries fix format errors (shape, locale, datetime). They can never create missing information or teach format recognition.","10 · 15"),
 ("P11","MATCH COST TO SLA","Two urgency classes = two paths (batch the patient, real-time the urgent). Batch math: interval + 24h ≤ SLA. Failures: fix only the failed IDs, fix the actual error.","28 · 55 · 58"),
 ("P12","TRUST, BUT SEGMENT","Before automating on 'overall' accuracy, check per-segment. Route scarce human review by calibrated confidence, not randomness. Surface both numbers; don't auto-correct.","21 · 59 · 60"),
]


# Verdict rendering: analysis verdict code -> (css class, badge label).
VER = {v.value: (v.css_class, v.badge) for v in Verdict}

