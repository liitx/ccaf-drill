import json, html

qs = json.load(open('questions.json'))
an = json.load(open('analysis.json'))
EX = json.load(open('examples.json'))
HP = json.load(open('hints.json'))
GIST = json.load(open('gists.json'))
HINTS = HP['hints']; PLAIN = HP['plain']

SETS = {
 'E': ('Extraction & Schema', '#2E7D6B', '#5BC4A8'),
 'V': ('Evals, Review & Batch', '#8A5A00', '#D9A94B'),
 'M': ('Multi-Agent Orchestration', '#5A4FB5', '#A79BF0'),
 'C': ('Claude Code: Sessions & Exploration', '#B04A2F', '#E58B6B'),
 'S': ('Support Agent: Tools & Escalation', '#1F6FA8', '#74B6E4'),
 'T': ('MCP & Tool Design', '#96385E', '#DE8FB4'),
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

KEYS = {
 'E': dict(
   fp='“Your extraction pipeline…”, a JSON schema, and a defect rate: inconsistent values, hallucinated fields, or validation failures.',
   rule='Fix it where the data is born. Add structure the schema was missing, or demonstrate the target format with few-shot examples. Never patch downstream (post-processing, verifier LLMs, retries) and never force the model to guess (required fields, bigger model).',
   vary='What varies is WHICH structure is missing: a field that can hold two values, permission to say null, a format demo, an escape hatch for an open-ended enum, or a self-check field.',
   links=['toolchoice']),
 'V': dict(
   fp='Numbers doing the talking: percentages, SLA hours, reviewer capacity, “most cost-effective”, Batch API.',
   rule='Do the arithmetic before judging vibes. Batch interval + 24h ≤ SLA. Split urgent from patient. Fix only what failed, and fix the actual error. Never trust an aggregate metric — segment it, and route scarce review by calibrated confidence.',
   vary='What varies is the resource being budgeted: hours (28, 58), dollars (55), reviewer attention (60), or trust (21, 59).',
   links=['batch']),
 'M': dict(
   fp='A cast of named agents — coordinator, web search, document analysis, synthesis — and something breaking between them.',
   rule='Two tensions, two rules. (1) Handoff loss: subagents are sealed; whatever must survive a handoff travels as structured data the coordinator explicitly passes. (2) Delegation style: give subagents goals + quality criteria, never step-by-step scripts.',
   vary='What varies is WHAT got lost (dates, citations, findings, the delegation itself) or WHERE control sits (over-scripted subagent, coordinator doing too little or too much).',
   links=['subagents', 'ccsub']),
 'C': dict(
   fp='Claude Code tool names (Grep, Read, Edit), file counts, minutes elapsed, or session verbs: resume, fork, continue, /clear.',
   rule='Exploration: targeted and incremental — trace structure from entry points; never bulk-read, never start blind-fresh. Sessions: small known change → resume + inform. Two futures from one past → fork. Know the name → --resume it. Degrading context → subagents or a scratchpad file.',
   vary='What varies is the failure mode: stale files, rot mid-session, an un-anchorable Edit, or picking the right resume/fork/fresh move.',
   links=['sessions', 'ccsub']),
 'S': dict(
   fp='lookup_order / process_refund / escalate_to_human, a quoted frustrated customer, refund dollar amounts.',
   rule='Escalation is judgment-guided by criteria (customer asks, policy exception, no progress) — except hard compliance thresholds, which get code/hooks, never a louder prompt. Handoffs are structured summaries, not transcripts. Context gets compacted to the fields that matter.',
   vary='What varies is the trigger: explicit human demand (honor it), instantly-fixable issue (offer both paths), hard $ threshold (hook), stale data (fresh session + summary).',
   links=['mcptools', 'mcperr']),
 'T': dict(
   fp='Tool descriptions quoted in the stem, tools being ignored, uniform “Operation failed” errors, isError.',
   rule='The description and the error payload ARE the interface. An ignored tool has a thin description — enrich it. An unusable error is missing structure — errorCategory + isRetryable + guidance at the source. Never remove competing tools or coach around it in the prompt.',
   vary='What varies is which half of the interface is starving the model: the description (25, 46) or the error contract (54, and S-set cousins 24, 42).',
   links=['mcptools', 'mcperr']),
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

VER = {'W': ('pick', '✓ PICK'), 'R': ('runner', '△ CLOSE 2nd'), 'X': ('kill', '✕ OUT')}

def hl(stem, sigs):
    s = html.escape(stem)
    for sig in sorted(sigs, key=len, reverse=True):
        e = html.escape(sig)
        s = s.replace(e, f'<mark>{e}</mark>')
    return s

def tierbadge(t):
    tid, lab, tip = TIERMETA[t]
    return f'<span class="tier t{t}" title="{html.escape(tip)}">{lab}</span>'

# ---------- drill cards ----------
cards = []
disagree = []
for q in qs:
    n = q['n']; a = an[str(n)]
    sname, scol, scd = SETS[a['set']]
    marked = q['marked']
    dis = marked and marked != a['win']
    if dis: disagree.append(n)
    chips = ''.join(f'<span class="chip">{html.escape(s)}</span>' for s in a['sig'])
    rows = []
    for L in 'ABCD':
        v = a['v'][L]; cls, lab = VER[v['verdict']]
        mk = '<span class="srcmark">◉ marked in your doc</span>' if marked == L else ''
        rows.append(f'''<div class="choice" data-v="{cls}" data-l="{L}">
  <div class="chead"><span class="clet">{L}</span><span class="verdict v-{cls}">{lab}</span>{mk}<button class="plainbtn" onclick="cplain(this)" title="plain-words rephrase of this choice">◦ plain</button><button class="plainbtn gistbtn" onclick="cgist(this)" title="one-line pattern-fit gist of this choice">⌁ gist</button></div>
  <div class="ctext">{html.escape(q["choices"][L])}</div>
  <div class="cplain">{html.escape(PLAIN[str(n)][L])}</div>
  <code class="gist">{html.escape(GIST[str(n)][L])}</code>
  <div class="cwhy">{html.escape(v["why"])}</div>
</div>''')
    ex = EX[str(n)]
    exblock = f'''<div class="expl"><div class="explhead"><span class="mech">{html.escape(ex["mech"])}</span><span class="expllab">IN PRACTICE</span></div><div class="explead">{html.escape(ex["lead"])}</div><pre class="snip">{html.escape(ex["snip"])}</pre></div>'''
    linkrow = ''
    if n in QLINKS:
        ls = ' · '.join(f'<a href="{LINKS[k][1]}" target="_blank" rel="noopener">{html.escape(LINKS[k][0])}</a>' for k in QLINKS[n])
        linkrow = f'<div class="srcs">Sources: {ls}</div>'
    debband = f'<div class="debband">⚖ {html.escape(DEBATE[n])}</div>' if n in DEBATE else ''
    disband = ''
    if dis:
        disband = f'<div class="disband">⚠ Your doc marked <b>{marked}</b> — verified read says <b>{a["win"]}</b>.</div>'
    elif marked:
        disband = f'<div class="agreeband">✓ Your doc marked <b>{marked}</b> — matches.</div>'
    cards.append(f'''<article class="card" data-set="{a['set']}" data-n="{n}" data-dis="{1 if dis else 0}" data-tier="{TIER[n]}">
 <div class="cardhead">
   <button class="flag" onclick="flag(this)" title="Flag to drill later">⚑</button>
   <button class="headbtn" onclick="tog(this)">
     <span class="qnum">Q{n}</span>
     <span class="setpill" style="--sc:{scol};--scd:{scd}">{sname}</span>
     {tierbadge(TIER[n])}
     <span class="caret">▾</span>
   </button>
 </div>
 <div class="cuewrap"><span class="cue">{html.escape(a['cue'])}</span></div>
 <div class="chips">{chips}</div>
 <div class="body">
   <div class="stemlabel">Verbatim question — the <mark>highlight</mark> is what gives the set &amp; answer away</div>
   <p class="stem">{hl(q['stem'], a['sig'])}</p>
   
   <div class="hintbox">
     <div class="hintitem"><span class="hlab">REALLY ASKING</span><p>{html.escape(HINTS[str(n)]['ask'])}</p></div>
     <div class="hintitem"><span class="hlab">LOOK FIRST</span><p>{html.escape(HINTS[str(n)]['first'])}</p></div>
     <div class="hintitem"><span class="hlab">EACH CHOICE IN PLAIN WORDS</span><p class="hnote">now shown in green under each choice — no verdicts spoiled.</p></div>
   </div>
   <div class="explwrap">{exblock}</div>
   <div class="choices">{''.join(rows)}</div>
   <div class="revealrow"><button class="reveal" onclick="rev(this)">Reveal answer</button></div>
   <div class="afterreveal">{disband}{debband}{linkrow}</div>
 </div>
</article>''')

# ---------- key view ----------
keypanels = []
for k, (sname, scol, scd) in SETS.items():
    kd = KEYS[k]
    members = [q for q in qs if an[str(q['n'])]['set'] == k]
    rows = []
    for q in members:
        a = an[str(q['n'])]
        give = a['sig'][0]
        rows.append(f'''<tr class="krow" onclick="kexp({q['n']})" title="Expand Q{q['n']} inline">
  <td class="kq">Q{q['n']}</td>
  <td class="kg"><mark>{html.escape(give)}</mark></td>
  <td class="kv">{html.escape(a['cue'])}</td>
</tr>
<tr class="kexprow" id="kexprow{q['n']}" style="display:none"><td colspan="3"><div class="kexpbody" id="kexp{q['n']}"></div></td></tr>''')
    links = ' · '.join(f'<a href="{LINKS[l][1]}" target="_blank" rel="noopener">{html.escape(LINKS[l][0])}</a>' for l in kd['links'])
    keypanels.append(f'''<div class="keypanel" style="--sc:{scol};--scd:{scd}">
 <div class="keygrid">
   <div class="kblock"><div class="klab">Fingerprint — you're in this set when you see</div><p>{html.escape(kd['fp'])}</p></div>
   <div class="kblock"><div class="klab">The one rule</div><p>{html.escape(kd['rule'])}</p></div>
   <div class="kblock"><div class="klab">What varies between questions</div><p>{html.escape(kd['vary'])}</p></div>
 </div>
 <table class="keytable">
  <thead><tr><th>Q</th><th>Giveaway phrase</th><th>This question's variation</th></tr></thead>
  <tbody>{''.join(rows)}</tbody>
 </table>
 <div class="srcs">Backing docs: {links}</div>
</div>''')

setcounts = {}
for q in qs: setcounts[an[str(q['n'])]['set']] = setcounts.get(an[str(q['n'])]['set'], 0) + 1
filterbtns = ''.join(f'<button class="fbtn" data-f="{k}" style="--sc:{SETS[k][1]};--scd:{SETS[k][2]}" onclick="filt(this)">{SETS[k][0].split(":")[0].split("&")[0].strip()} <b>{setcounts[k]}</b></button>' for k in SETS)
def qlinks(qstr):
    return ' · '.join(f"<button class=\"qlink\" data-jumpset=\"{x.strip()}\">{x.strip()}</button>" for x in qstr.split('·'))
patcards = ''.join(f"<div class=\"pat\"><div class=\"pid\">{pid}</div><div class=\"pname\">{name}</div><div class=\"pdesc\">{html.escape(desc)}</div><div class=\"pqs\">Q {qlinks(qs_)}</div></div>" for pid,name,desc,qs_ in PATTERNS)

GUIDE = f"""
<div class="keygrid">
 <div class="kblock"><div class="klab">Three views</div><ul class="kul">
  <li><b>Key</b> — this page: cheat codes, one panel per set, every question mapped.</li>
  <li><b>Drill</b> — study all 60 with per-question assists. ☰ All (scroll) or ▭ Single (one at a time), both scoped to the filter pill.</li>
  <li><b>Exam</b> — 1:1 simulation: 60 Q / 120 min, one per screen, pause/resume, per-question timing. Easy / Medium / Hard set how many assists exist.</li>
  <li><b>↺ Reset</b> — clean Drill state (keeps your flags).</li>
 </ul></div>
 <div class="kblock"><div class="klab">The floating help dock (Drill + Exam Easy)</div><ul class="kul">
  <li>Open a question and the <b>dock appears at the bottom</b> — it controls whichever question you're on (watch the Q number).</li>
  <li><b>💡 Hint</b> — what's really being asked + where to look first. Never spoils.</li>
  <li><b>🖍 Highlights</b> — the yellow giveaway wash, per question or all.</li>
  <li><b>⌁ Gists</b> — each choice as one-line pseudo-code; per choice (⌁ gist) or per card.</li>
  <li><b>In practice</b> — the winning mechanism + real snippet (nudges toward the answer).</li>
  <li><b>◦ plain</b> — one choice's simple rephrase.</li>
  <li><b>Reveal</b> — everything: verdicts, whys, bands. Assist toggles go inert while revealed.</li>
 </ul></div>
 <div class="kblock"><div class="klab">Badges: confidence tiers</div><ul class="kul">
  <li><span class="tier t1">DOCS-VERIFIED</span> confirmed against official Anthropic docs / MCP spec (11 Qs, sources linked).</li>
  <li><span class="tier t2">GUIDANCE</span> follows published best practice; no single doc line settles it.</li>
  <li><span class="tier t3">DEBATE</span> two defensible reads — wording-sensitive (Q18, 28, 56).</li>
 </ul></div>
 <div class="kblock"><div class="klab">⚠ Disputed 8 — what it means</div><ul class="kul">
  <li>Your team's source doc arrived with 10 answers already marked.</li>
  <li>On <b>8 of them (Q2, 12, 15, 17, 18, 22, 41, 42)</b> the doc-verified pick disagrees with that mark.</li>
  <li>Every disagreement is the same trap: bolt-on patch over structural fix.</li>
  <li>The <b>⚠ Disputed</b> pill in Drill filters to exactly these — highest-yield review in the deck. (Q29, Q35 were marked and agree.)</li>
 </ul></div>
 <div class="kblock"><div class="klab">Flags & metrics</div><ul class="kul">
  <li><b>⚑ Flag</b> any question in Drill or mid-Exam → personal drill list (Drill's ⚑ Flagged filter; flags carry into exam results).</li>
  <li>Exam results rank sets weakest-first and time every question (pauses excluded).</li>
  <li>Miss-style diagnosis: close-2nd picks vs outright-kill picks.</li>
 </ul></div>
 <div class="kblock"><div class="klab">🤖 Ask Claude</div><ul class="kul">
  <li>Every Drill question has an <b>Ask Claude</b> button.</li>
  <li>It copies a self-explaining JSON packet (question + all metadata + a short instruction) to your clipboard.</li>
  <li>Paste it into Claude for a focused, worked-example walkthrough of that one question.</li>
 </ul></div>
</div>"""
codes_body = f"""<p class="hint2">Cross-set elimination rules. Most questions collapse to two choices from the cheat code alone. Q-numbers jump to Drill.</p>
<div class="pats">{patcards}</div>"""
sec_list = [("guide", "How to use this tool — features & badges", "", GUIDE),
            ("codes", "Cheat codes — the 12 meta-patterns", "", codes_body)]
for (k2, (sn2, sc2, sd2)), panel in zip(SETS.items(), keypanels):
    cnt = setcounts[k2]
    sec_list.append((f"set{k2}", sn2, f"--sc:{sc2};--scd:{sd2}", f'<span class="kcount">{cnt} questions · fingerprint, rule, and every member in one table</span>' + panel))
key_sections = ""
keynav_chips = ""
for i, (sid, title, style, body) in enumerate(sec_list):
    key_sections += f"""<div class="ksec" id="ksec{i}" {'style="'+style+'"' if style else ''}>
 <button class="ksechead" onclick="ksec({i})"><span class="ksecdot"></span><span class="ksectitle">{html.escape(title)}</span><span class="caret">▾</span></button>
 <div class="ksecbody">{body}</div>
</div>"""
    short = title.split(" — ")[0]
    chip_style = f' style="{style}"' if style else ''
    chip_cls = 'fbtn' if style else 'fbtn dark'
    keynav_chips += f'<button class="{chip_cls}" id="knavc{i}"{chip_style} onclick="ksecgo({i})">{html.escape(short)}</button>'

answers_js = json.dumps({str(q['n']): an[str(q['n'])]['win'] for q in qs})
qmeta_js = json.dumps({str(q['n']): {'s': an[str(q['n'])]['set'], 'w': an[str(q['n'])]['win']} for q in qs})
setmeta_js = json.dumps({k: {'name': v[0], 'c': v[1], 'cd': v[2], 'rule': KEYS[k]['rule'], 'fp': KEYS[k]['fp']} for k, v in SETS.items()})

t1 = sum(1 for v in TIER.values() if v == 1); t3 = sum(1 for v in TIER.values() if v == 3)

page = f'''<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>CCA-F Drill · Pattern Key + 60Q</title>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Public+Sans:ital,wght@0,400;0,600;0,700;1,400&display=swap" rel="stylesheet">
<style>
:root{{
 --paper:#FBFBF7; --ink:#181F1C; --dim:#5C665F; --line:#E2E4DB; --card:#FFFFFF; --soft:#FCFCFA; --hover:#F5F6F0; --stemc:#2A332E; --killtext:#767A75; --btnfg:#FFFFFF; --linkc:#1F6FA8; --flagoff:#C9CCC2; --flagon:#D9822B; --t1bg:#E4EEF7; --t1c:#1F5C8C; --t1bd:#BDD5E8; --t2bg:#F0F0EA; --t3bg:#F5E9F0; --t3c:#96385E; --t3bd:#E3C2D3; --disbg:#FFF6DE; --disbd:#E5C878; --agreebd:#C3DECD; --smbg:#FFF3CE; --smc:#7A5A10; --hlwash:rgba(255,214,10,.38);
 --mark:#FFE566;
 --pick:#1D7A4F; --pickbg:#EDF6F0; --run:#8A5A00; --runbg:#FBF3E0; --kill:#9E3A32; --killbg:#F8EFEE;
 --disp:'Barlow Condensed',sans-serif; --body:'Public Sans',system-ui,sans-serif;
}}
*{{box-sizing:border-box}} html{{scroll-behavior:smooth}}
button{{color:inherit}}
body{{transition:background .25s,color .25s}}
body.dark{{
 --paper:#0C0E0F; --ink:#ADB5AC; --dim:#717B73; --line:#232A26; --card:#131715; --soft:#181D1A; --hover:#1D2420;
 --stemc:#98A199; --killtext:#68716A; --btnfg:#0C0E0F; --linkc:#7AAED4; --flagoff:#414A44; --flagon:#D28C42;
 --pick:#54B888; --pickbg:#14211B; --run:#CDA14E; --runbg:#221C0F; --kill:#D68078; --killbg:#251714;
 --t1bg:#131E29; --t1c:#84B2D8; --t1bd:#28394A; --t2bg:#181F1A; --t3bg:#221723; --t3c:#CB90AF; --t3bd:#3F2A39;
 --disbg:#221D0E; --disbd:#4A3E1B; --agreebd:#27412F; --smbg:#2C2610; --smc:#D6BE72;
 --hlwash:rgba(228,203,92,.17);
}}
body.dark .setpill{{background:var(--scd,var(--sc));color:var(--btnfg)}}
body.dark .fbtn{{color:var(--scd,var(--sc));border-color:var(--scd,var(--sc))}}
body.dark .fbtn.on{{background:var(--scd,var(--sc));color:var(--btnfg)}}
body.dark .keypanel{{border-left-color:var(--scd,var(--sc))}}
body.dark .v-runner{{border-color:#4A3F22}}
body.dark .v-kill{{border-color:#4A2E2A}}

body{{margin:0;background:var(--paper);color:var(--ink);font-family:var(--body);font-size:15px;line-height:1.45;overflow-anchor:none}}
button:focus{{outline:none}}
button:focus-visible{{outline:2px solid var(--linkc);outline-offset:2px}}
a{{color:var(--linkc)}}
mark{{background:var(--hlwash);padding:0 3px;border-radius:2px;font-weight:600;color:inherit}}
.wrap{{max-width:900px;margin:0 auto;padding:16px 16px 90px}}
header h1{{font-family:var(--disp);font-weight:700;font-size:clamp(28px,5.5vw,40px);letter-spacing:.5px;margin:4px 0 2px;text-transform:uppercase}}
header h1 em{{font-style:normal;background:var(--hlwash);padding:0 6px;border-radius:3px}}
.sub{{color:var(--dim);margin:0;max-width:66ch;font-size:13.5px}}
.tabs{{position:sticky;top:0;z-index:9;background:var(--paper);display:flex;gap:8px;padding:10px 0 8px;border-bottom:2px solid var(--ink)}}
.tab{{font-family:var(--disp);font-size:16px;letter-spacing:1px;text-transform:uppercase;border:1.5px solid var(--ink);background:var(--card);color:var(--ink);border-radius:8px;padding:6px 16px;cursor:pointer}}
.tab.on{{background:var(--ink);color:var(--paper)}}
.tabnote{{align-self:center;color:var(--dim);font-size:12.5px;margin-left:auto}}
#themebtn{{margin-left:8px;font-size:14px}}
.view{{display:none}} .view.on{{display:block}}

/* tiers */
.tier{{font-family:var(--disp);font-size:10.5px;letter-spacing:1px;border-radius:4px;padding:1px 6px;white-space:nowrap}}
.tier.t1{{background:var(--t1bg);color:var(--t1c);border:1px solid var(--t1bd)}}
.tier.t2{{background:var(--t2bg);color:var(--dim);border:1px solid var(--line)}}
.tier.t3{{background:var(--t3bg);color:var(--t3c);border:1px solid var(--t3bd)}}
.tierkey{{display:flex;gap:14px;flex-wrap:wrap;margin:10px 0 0;font-size:12.5px;color:var(--dim)}}
.tierkey span.tier{{margin-right:4px}}

/* key view */
.keynav{{position:sticky;top:52px;z-index:7;background:var(--paper);display:flex;gap:6px;flex-wrap:wrap;padding:8px 0;border-bottom:1px solid var(--line)}}
.ksec{{border:1px solid var(--line);border-left:4px solid var(--sc,var(--ink));background:var(--card);border-radius:12px;margin:10px 0;overflow:hidden;scroll-margin-top:130px}}
.ksechead{{display:flex;align-items:center;gap:10px;width:100%;text-align:left;background:none;border:0;padding:12px 14px;cursor:pointer;color:var(--ink);font-family:var(--disp);font-size:17px;letter-spacing:.6px;text-transform:uppercase}}
.ksecdot{{width:9px;height:9px;border-radius:50%;background:var(--sc,var(--dim))}}
.ksectitle{{flex:1}}
.ksec .ksecbody{{display:none;padding:0 14px 14px;border-top:1px dashed var(--line)}}
.ksec.open .ksecbody{{display:block}}
.ksec.open .ksechead .caret{{transform:rotate(180deg)}}
.keypanel{{border:0;padding:10px 0 0;margin:0;background:transparent}}
.kexprow td{{padding:0 !important;border-bottom:1px solid var(--line)}}
.kexpbody{{padding:8px 6px}}
.kexpbody .card{{border:0;background:transparent;margin:0}}
.kexplink{{font-family:var(--disp);font-size:12px;letter-spacing:.6px;text-transform:uppercase}}

.keyhead{{display:flex;align-items:center;gap:10px;margin-bottom:8px}}
.setpill{{font-family:var(--disp);font-size:11.5px;letter-spacing:.8px;text-transform:uppercase;color:#fff;background:var(--sc);border-radius:4px;padding:2px 8px;white-space:nowrap}}
.setpill.big{{font-size:14px;padding:3px 10px}}
.kcount{{color:var(--dim);font-family:var(--disp);letter-spacing:.5px;font-size:13px}}
.keygrid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px;margin-bottom:10px}}
.kblock{{background:var(--soft);border:1px solid var(--line);border-radius:8px;padding:8px 10px}}
.kblock p{{margin:3px 0 0;font-size:13px}}
.kul{{margin:4px 0 0;padding-left:16px;font-size:12.5px}}
.kul li{{margin:3px 0}}
.klab{{font-family:var(--disp);font-size:11px;letter-spacing:1.2px;text-transform:uppercase;color:var(--dim)}}
.keytable{{width:100%;border-collapse:collapse;font-size:12.5px}}
.keytable th{{font-family:var(--disp);font-size:11px;letter-spacing:1px;text-transform:uppercase;color:var(--dim);text-align:left;padding:4px 6px;border-bottom:1.5px solid var(--line)}}
.keytable td{{padding:5px 6px;border-bottom:1px solid var(--line);vertical-align:top}}
.keytable tbody tr{{cursor:pointer}} .keytable tbody tr:hover{{background:var(--hover)}}
.kq{{font-family:var(--disp);font-weight:700;font-size:14px;white-space:nowrap}}
.ka{{text-align:center;white-space:nowrap;width:52px}}
.ansdot{{font-family:var(--disp);font-weight:700}}
.ansdot.shown{{color:var(--pick)}}
.keyansbar{{margin:12px 0 2px;display:flex;gap:10px;align-items:center}}
.util{{font-family:var(--disp);font-size:13px;letter-spacing:.6px;text-transform:uppercase;border:1.5px solid var(--ink);background:var(--card);color:var(--ink);border-radius:999px;padding:4px 12px;cursor:pointer}}
.utilnote{{color:var(--dim);font-size:12.5px}}

/* drill view */
.toolbar{{position:sticky;top:52px;background:var(--paper);z-index:8;padding:8px 0 10px;border-bottom:1px solid var(--line);display:flex;flex-wrap:wrap;column-gap:26px;row-gap:10px}}
.cluster{{display:flex;flex-direction:column;gap:5px}}
.cluslab{{font-family:var(--disp);font-size:10.5px;letter-spacing:1.4px;text-transform:uppercase;color:var(--dim)}}
.cluslab i{{font-style:normal;letter-spacing:.3px;text-transform:none;opacity:.8}}
.clusrow{{display:flex;gap:6px;flex-wrap:wrap;align-items:center}}
.fbtn.on::before{{content:'✓ '}}
.fbtn.foc::before{{content:'+ ';opacity:.6}}
.fbtn.foc.on{{background:var(--run);border-color:var(--run);color:var(--btnfg)}}
.fbtn.foc.on::before{{content:'✓ ';opacity:1}}
.showing{{font-size:12px;color:var(--dim);margin-left:6px;font-family:var(--disp);letter-spacing:.5px}}
.seg{{display:inline-flex;border:1.5px solid var(--ink);border-radius:999px;overflow:hidden}}
.segbtn{{border:0;background:none;color:var(--ink);font-family:var(--disp);font-size:12.5px;letter-spacing:.4px;text-transform:uppercase;padding:4px 13px;cursor:pointer}}
.segbtn.on{{background:var(--ink);color:var(--paper)}}
.segbtn + .segbtn{{border-left:1.5px solid var(--ink)}}
.switch{{display:inline-flex;align-items:center;gap:7px;border:1.5px solid var(--line);background:var(--card);color:var(--dim);border-radius:999px;padding:4px 13px;font-family:var(--disp);font-size:12.5px;letter-spacing:.4px;text-transform:uppercase;cursor:pointer}}
.switch .dot{{width:9px;height:9px;border-radius:50%;background:var(--line)}}
.switch.on{{color:var(--ink)}}
.switch.on .dot{{background:var(--pick)}}
.vdiv{{width:1px;height:22px;background:var(--line)}}
.ghost{{border:1px dashed var(--dim);background:none;color:var(--dim);border-radius:999px;padding:4px 13px;font-family:var(--disp);font-size:12.5px;letter-spacing:.4px;text-transform:uppercase;cursor:pointer}}
.ghost:hover{{color:var(--ink);border-color:var(--ink)}}
.asslab{{font-family:var(--disp);font-size:10.5px;letter-spacing:1.2px;text-transform:uppercase;color:var(--dim);margin:2px 0 4px}}
.fbtn{{font-family:var(--disp);font-size:12.5px;letter-spacing:.4px;text-transform:uppercase;border:1.5px solid var(--sc,#666);color:var(--sc,#333);background:var(--card);border-radius:999px;padding:3px 10px;cursor:pointer}}
.fbtn b{{opacity:.6}} .fbtn.on{{background:var(--sc,#333);color:var(--btnfg)}}
.fbtn.dark{{--sc:var(--ink);--scd:var(--ink)}}
.card{{border:1px solid var(--line);background:var(--card);border-radius:12px;margin:10px 0;overflow:hidden;scroll-margin-top:175px}}
.cardhead{{display:flex;align-items:stretch}}
.flag{{border:0;background:none;font-size:17px;color:var(--flagoff);cursor:pointer;padding:10px 2px 0 12px;align-self:flex-start}}
.flag.on{{color:var(--flagon)}}
.headbtn{{display:flex;align-items:center;gap:9px;flex:1;text-align:left;background:none;border:0;padding:10px 14px 2px 6px;cursor:pointer;font-family:var(--body);color:var(--ink)}}
.qnum{{font-family:var(--disp);font-weight:700;font-size:18px;min-width:40px}}
.caret{{margin-left:auto;color:var(--dim);transition:transform .15s}}
.card.open .caret{{transform:rotate(180deg)}}
.cuewrap{{padding:2px 14px 0 40px}} .cue{{font-weight:700;font-size:14px}}
.chips{{padding:4px 14px 12px 40px;display:flex;flex-wrap:wrap;gap:5px}}
.chip{{background:var(--hlwash);font-size:12px;font-weight:600;padding:1px 7px;border-radius:3px;color:var(--ink)}}
.body{{display:none;border-top:1px dashed var(--line);padding:12px 14px 16px}}
.card.open .body{{display:block}}
.stemlabel{{font-family:var(--disp);font-size:11px;letter-spacing:1.2px;text-transform:uppercase;color:var(--dim)}}
.stem{{margin:6px 0 12px;font-size:13.5px;color:var(--stemc)}}
.choice{{border:1px solid var(--line);border-radius:9px;padding:8px 11px;margin:7px 0;background:var(--soft)}}
.chead{{display:flex;align-items:center;gap:8px;margin-bottom:2px}}
.clet{{font-family:var(--disp);font-weight:700;font-size:15px}}
.verdict{{font-family:var(--disp);font-size:11px;letter-spacing:1px;padding:1px 7px;border-radius:4px;display:none}}
.v-pick{{background:var(--pick);color:var(--btnfg)}}
.v-runner{{background:var(--runbg);color:var(--run);border:1px solid #E5CE9C}}
.v-kill{{background:var(--killbg);color:var(--kill);border:1px solid #E4C2BE}}
.srcmark{{font-size:11px;color:var(--smc);background:var(--smbg);border-radius:4px;padding:1px 6px;display:none}}
.ctext{{font-size:13px}}
.cwhy{{display:none;font-size:12.5px;font-weight:600;margin-top:4px}}
.revealrow{{margin-top:10px}}
.reveal{{font-family:var(--disp);font-size:15px;letter-spacing:.8px;text-transform:uppercase;border:1.5px solid var(--ink);background:var(--ink);color:var(--paper);border-radius:8px;padding:6px 18px;cursor:pointer;width:100%}}
.afterreveal{{display:none;margin-top:10px}}
.card.revealed .verdict, .card.revealed .cwhy, .card.revealed .srcmark{{display:inline-block}}
.card.revealed .cwhy{{display:block}}
.card.revealed .afterreveal{{display:block}}
.card.revealed .choice[data-v="pick"]{{border-color:var(--agreebd);background:var(--pickbg)}}
.card.revealed .choice[data-v="kill"] .ctext{{color:var(--killtext);text-decoration:line-through;text-decoration-color:var(--kill);text-decoration-thickness:1.5px;opacity:.85}}
.card.revealed .choice[data-v="pick"] .cwhy{{color:var(--pick)}}
.card.revealed .choice[data-v="kill"] .cwhy{{color:var(--kill)}}
.card.revealed .choice[data-v="runner"] .cwhy{{color:var(--run)}}
.card.revealed .reveal{{background:var(--card);color:var(--ink)}}
.disband{{background:var(--disbg);border:1px solid var(--disbd);border-radius:8px;padding:6px 10px;font-size:13px;margin-bottom:8px}}
.agreeband{{background:var(--pickbg);border:1px solid var(--agreebd);border-radius:8px;padding:6px 10px;font-size:13px;margin-bottom:8px}}
.debband{{background:var(--t3bg);border:1px solid var(--t3bd);border-radius:8px;padding:6px 10px;font-size:13px;margin-bottom:8px}}
.srcs{{font-size:12px;color:var(--dim);margin-top:6px}}
.expl{{border:1px solid var(--line);border-left:3px solid var(--pick);border-radius:9px;background:var(--soft);padding:9px 11px;margin-top:10px}}
.explhead{{display:flex;align-items:center;gap:8px;margin-bottom:4px}}
.expllab{{font-family:var(--disp);font-size:10.5px;letter-spacing:1.4px;color:var(--dim)}}
.mech{{font-family:var(--disp);font-size:11.5px;letter-spacing:.8px;text-transform:uppercase;background:var(--t1bg);color:var(--t1c);border:1px solid var(--t1bd);border-radius:4px;padding:1px 7px}}
.explead{{font-size:12.5px;margin-bottom:6px}}
.snip{{margin:0;font-family:ui-monospace,'SF Mono',Menlo,Consolas,monospace;font-size:11.5px;line-height:1.5;white-space:pre-wrap;word-break:break-word;background:var(--card);border:1px solid var(--line);border-radius:6px;padding:8px 10px;color:var(--stemc)}}
.codeshead{{font-family:var(--disp);text-transform:uppercase;font-size:21px;letter-spacing:1px;margin:18px 0 4px;border-bottom:2px solid var(--ink);padding-bottom:4px}}
.hint2{{color:var(--dim);font-size:13px;margin:4px 0 12px}}
.pats{{display:grid;grid-template-columns:repeat(auto-fill,minmax(255px,1fr));gap:10px}}
.pat{{border:1px solid var(--line);background:var(--card);border-radius:10px;padding:10px 12px}}
.pid{{font-family:var(--disp);font-size:12px;letter-spacing:1.5px;color:var(--dim)}}
.pname{{font-family:var(--disp);font-weight:700;font-size:18px;letter-spacing:.5px}}
.pdesc{{font-size:12.5px;margin-top:3px}}
.pqs{{font-size:12px;color:var(--dim);margin-top:6px;font-family:var(--disp);letter-spacing:.5px}}
.pqs a{{text-decoration:none}}
.qlink{{background:none;border:0;padding:0 1px;color:var(--linkc);font:inherit;font-family:var(--disp);letter-spacing:.5px;cursor:pointer}}
.qlink:hover{{text-decoration:underline}}
button.kexplink{{font-size:12.5px;letter-spacing:.6px;text-transform:uppercase;margin-top:6px}}
.hintrow{{margin:2px 0 10px;display:flex;gap:6px;flex-wrap:wrap}}
.hintbtn{{flex:1 1 0;min-width:118px;height:30px;font-family:var(--disp);font-size:12.5px;letter-spacing:.6px;text-transform:uppercase;border:1.5px dashed var(--dim);color:var(--dim);background:none;border-radius:8px;padding:0 8px;cursor:pointer;white-space:nowrap}}
.card.revealed .plainbtn{{pointer-events:none;opacity:.45;border-style:solid}}
.hintbox{{border:1px dashed var(--line);border-radius:9px;background:var(--soft);padding:9px 11px;max-height:0;opacity:0;overflow:hidden;margin:0;padding-top:0;padding-bottom:0;border-top-width:0;border-bottom-width:0;transition:max-height .28s ease,opacity .22s ease,margin .28s ease,padding .28s ease}}
.card.hinted .hintbox, .card.revealed .hintbox{{max-height:420px;opacity:1;margin:0 0 12px;padding:9px 11px;border-top-width:1px;border-bottom-width:1px}}

.hintitem{{margin:4px 0}} .hintitem p{{margin:2px 0 0;font-size:13px}}
.hlab{{font-family:var(--disp);font-size:10.5px;letter-spacing:1.4px;color:var(--dim)}}
.hnote{{color:var(--dim);font-style:italic}}
.cplain{{font-size:12.5px;color:var(--pick);max-height:0;opacity:0;overflow:hidden;margin:0;padding-top:0;padding-bottom:0;border-top-width:0;border-bottom-width:0;transition:max-height .28s ease,opacity .22s ease,margin .28s ease,padding .28s ease}}
.cplain::before{{content:"◦ plain: ";font-family:var(--disp);letter-spacing:.5px;font-size:11px}}
.card.hinted .cplain, .card.revealed .cplain, .choice.showplain .cplain, .exqbox.as-plain .cplain{{max-height:220px;opacity:1;margin-top:3px}}
.plainbtn{{font-family:var(--disp);font-size:11px;letter-spacing:.6px;border:1px dashed var(--dim);color:var(--dim);background:none;border-radius:5px;height:20px;padding:0 8px;cursor:pointer;white-space:nowrap}}
.plainbtn:first-of-type{{margin-left:auto}}
.choice.showgist .gistbtn{{border-style:solid;color:var(--pick);border-color:var(--pick)}}
.choice.showplain .plainbtn{{border-style:solid;color:var(--pick);border-color:var(--pick)}}
.gist{{font-family:ui-monospace,'SF Mono',Menlo,Consolas,monospace;font-size:11px;background:var(--card);border:1px solid var(--line);border-radius:5px;padding:3px 8px;color:var(--stemc);white-space:pre-wrap;word-break:break-word;max-height:0;opacity:0;overflow:hidden;margin:0;padding-top:0;padding-bottom:0;border-top-width:0;border-bottom-width:0;transition:max-height .28s ease,opacity .22s ease,margin .28s ease,padding .28s ease}}
.card.revealed .gist, .card.q-showgist .gist, .choice.showgist .gist, .exqbox.as-gist .gist{{max-height:160px;opacity:1;margin-top:5px;padding:3px 8px;border-top-width:1px;border-bottom-width:1px}}
.explwrap{{max-height:0;opacity:0;overflow:hidden;margin:0;padding-top:0;padding-bottom:0;border-top-width:0;border-bottom-width:0;transition:max-height .28s ease,opacity .22s ease,margin .28s ease,padding .28s ease}}
.card.revealed .explwrap, .card.q-showex .explwrap{{max-height:1400px;opacity:1}}
.hintbtn.on{{border-style:solid;color:var(--ink);border-color:var(--ink)}}
.claudebtn{{border-style:solid;border-color:var(--t1bd);color:var(--t1c);background:var(--t1bg)}}
.card.revealed .choice[data-v="pick"] .gist{{border-color:var(--pick);color:var(--pick)}}
/* exam */
.exintro,.expausebox{{border:1px solid var(--line);background:var(--card);border-radius:12px;padding:20px;margin-top:16px;text-align:center}}
.exstart{{font-family:var(--disp);font-size:18px;letter-spacing:1px;text-transform:uppercase;border:1.5px solid var(--ink);background:var(--ink);color:var(--paper);border-radius:10px;padding:10px 26px;cursor:pointer;margin-top:8px}}
.exbar{{position:sticky;top:52px;z-index:8;background:var(--paper);display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--line)}}
.extimer{{font-family:var(--disp);font-weight:700;font-size:24px;letter-spacing:1px;min-width:92px}}
.extimer.low{{color:var(--kill)}}
.exq{{font-family:var(--disp);font-size:16px;letter-spacing:.5px;color:var(--dim)}}
.expause,.exflag,.exsubmit,.exnavbtn{{font-family:var(--disp);font-size:13.5px;letter-spacing:.6px;text-transform:uppercase;border:1.5px solid var(--ink);background:var(--card);color:var(--ink);border-radius:8px;padding:5px 12px;cursor:pointer}}
.exsubmit{{margin-left:auto;background:var(--ink);color:var(--paper)}}
.exflag.on{{background:var(--flagon);border-color:var(--flagon);color:var(--btnfg)}}
.expalette{{display:flex;flex-wrap:wrap;gap:4px;padding:8px 0;border-bottom:1px solid var(--line)}}
.pal{{width:30px;height:26px;font-family:var(--disp);font-size:12px;border:1px solid var(--line);background:var(--card);color:var(--dim);border-radius:5px;cursor:pointer}}
.pal.answered{{background:var(--pickbg);border-color:var(--agreebd);color:var(--pick)}}
.pal.flagged{{border-color:var(--flagon);color:var(--flagon)}}
.pal.cur{{outline:2px solid var(--ink)}}
.exqbox{{border:1px solid var(--line);background:var(--card);border-radius:12px;padding:16px;margin-top:12px}}
.exstem{{font-size:14.5px;color:var(--stemc);margin:0 0 14px}}
.exstem mark{{background:none;font-weight:inherit;color:inherit;padding:0}}
.exchoice{{display:flex;gap:10px;align-items:flex-start;border:1px solid var(--line);background:var(--soft);border-radius:9px;padding:10px 12px;margin:8px 0;cursor:pointer;font-size:13.5px}}
.exchoice:hover{{border-color:var(--dim)}}
.exchoice.sel{{border-color:var(--ink);background:var(--hover)}}
.exchoice .exlet{{font-family:var(--disp);font-weight:700;font-size:15px;min-width:18px}}
.exnav{{display:flex;justify-content:space-between;margin-top:12px}}
.dnav{{display:flex;justify-content:space-between;align-items:center;margin-top:12px}}
/* results */
.resgrid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:12px 0}}
.rescard{{border:1px solid var(--line);background:var(--card);border-radius:10px;padding:10px 12px;text-align:center}}
.rescard b{{font-family:var(--disp);font-size:30px;display:block;line-height:1.1}}
.rescard span{{font-size:12px;color:var(--dim)}}
.setrow{{display:flex;align-items:center;gap:10px;margin:6px 0}}
.setrow .setpill{{min-width:170px;text-align:center}}
.bar{{flex:1;height:14px;background:var(--soft);border:1px solid var(--line);border-radius:7px;overflow:hidden}}
.bar i{{display:block;height:100%;background:var(--pick)}}
.setrow.bad .bar i{{background:var(--kill)}}
.setpct{{font-family:var(--disp);font-weight:700;min-width:110px;font-size:14px}}
.downfall{{border:1px solid var(--t3bd);background:var(--t3bg);border-radius:10px;padding:12px 14px;margin:14px 0;font-size:13.5px}}
.downfall b{{color:var(--t3c)}}
.resq{{border:1px solid var(--line);background:var(--card);border-radius:10px;margin:8px 0;overflow:hidden}}
.resq.wrong{{border-color:var(--kill)}}
.resqhead{{display:flex;align-items:center;gap:10px;width:100%;text-align:left;background:none;border:0;padding:9px 12px;cursor:pointer;color:var(--ink);font-family:var(--body)}}
.resmark{{font-family:var(--disp);font-weight:700;font-size:15px;min-width:52px}}
.resmark.ok{{color:var(--pick)}} .resmark.no{{color:var(--kill)}}
.restime{{margin-left:auto;font-family:var(--disp);color:var(--dim);font-size:13px;white-space:nowrap}}
.resflag{{color:var(--flagon)}}
.resdetail{{display:none;border-top:1px dashed var(--line);padding:10px 12px}}
.resq.open .resdetail{{display:block}}
.youpick{{font-size:11px;font-family:var(--disp);letter-spacing:.8px;background:var(--disbg);border:1px solid var(--disbd);border-radius:4px;padding:1px 6px;margin-left:6px}}
.setexpl{{border:1px solid var(--line);border-left:3px solid var(--sc);background:var(--soft);border-radius:8px;padding:8px 11px;margin:8px 0 2px;font-size:12.5px}}
.setexpl .klab{{display:block;margin-bottom:2px}}
.modes{{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:10px}}
.modebtn{{border:1.5px solid var(--line);background:var(--soft);color:var(--ink);border-radius:10px;padding:10px 14px;cursor:pointer;max-width:220px;text-align:left}}
.modebtn b{{font-family:var(--disp);font-size:17px;letter-spacing:.6px;text-transform:uppercase;display:block}}
.modebtn span{{font-size:12px;color:var(--dim)}}
.modebtn.sel,.modebtn:hover{{border-color:var(--ink)}}
.exassist{{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}}
.asbtn{{font-family:var(--disp);font-size:12px;letter-spacing:.6px;text-transform:uppercase;border:1px dashed var(--dim);color:var(--dim);background:none;border-radius:6px;padding:3px 10px;cursor:pointer}}
.asbtn.on{{border-style:solid;color:var(--ink);border-color:var(--ink)}}
.exhintbox,.exexpl{{display:none;border:1px dashed var(--line);border-radius:9px;background:var(--soft);padding:9px 11px;margin:10px 0;font-size:13px}}
.exqbox.as-hint .exhintbox{{display:block}}
.exqbox.as-ex .exexpl{{display:block}}
.exqbox .exwhy{{display:none}}
.exqbox.as-reveal .exwhy{{display:block}}
.exqbox.as-reveal .exchoice.iscorrect{{border-color:var(--pick);background:var(--pickbg)}}
.exqbox .exwhy{{font-size:12.5px;font-weight:600;margin-top:4px}}
.exqbox .exchoice.iscorrect .exwhy{{color:var(--pick)}}
.exqbox .exchoice:not(.iscorrect) .exwhy{{color:var(--kill)}}
.exchoice{{flex-direction:column;gap:2px}}
.exchoice .exrow{{display:flex;gap:10px;align-items:flex-start}}
@media (max-width:560px){{ .setrow .setpill{{min-width:110px;font-size:10px}} .setpct{{min-width:84px}} }}
.card.q-nohl mark{{background:none;font-weight:inherit;padding:0}}
.card.q-nohl .chips{{display:none}}
@media (max-width:560px){{
 /* type scale — 16px floor per iOS/Android readability guidance */
 body{{font-size:16px;line-height:1.55}}
 .stem{{font-size:15px}} .ctext{{font-size:15px}} .cplain,.cwhy{{font-size:14px}}
 .cue{{font-size:15px}} .chip{{font-size:13px}} .kul{{font-size:14px}} .kblock p{{font-size:14px}}
 .keytable{{font-size:13.5px}} .gist,.snip{{font-size:12.5px}}
 .stemlabel,.klab,.expllab{{font-size:12px}} .exstem{{font-size:15.5px}}
 /* breathing room */
 .wrap{{padding:14px 14px 80px}}
 .body{{padding:14px 14px 18px}}
 .ksechead{{padding:14px 12px;font-size:15.5px}} .ksecbody{{padding:0 12px 14px}}
 .choice{{padding:12px 12px;margin:10px 0}}
 .kexpbody{{padding:10px 2px}}
 .keytable td{{padding:10px 6px}}
 .cuewrap,.chips{{padding-left:14px}} .keygrid{{grid-template-columns:1fr}}
 /* 44px tap targets (Apple HIG / WCAG 2.5.5), ≥8px gaps (Material) */
 .tabs{{flex-wrap:wrap;position:static;gap:8px}} .tab{{font-size:14px;padding:0 14px;min-height:44px}}
 #themebtn{{margin-left:4px}} .tabnote{{margin-left:0;flex-basis:100%;order:9}}
 #keynav{{position:static;gap:8px}} #view-drill .toolbar{{position:static;gap:8px}}
 .fbtn{{min-height:40px;font-size:13px;padding:0 14px;display:inline-flex;align-items:center}}
 .keyhead{{flex-wrap:wrap}}
 .exbar{{flex-wrap:wrap;top:0;gap:8px;padding:10px 0}} .exsubmit{{margin-left:0}}
 .expause,.exflag,.exsubmit,.exnavbtn{{min-height:44px;padding:0 16px;font-size:14px}}
 .exnav{{gap:10px}} .exnavbtn{{flex:1}}
 .expalette{{gap:7px}}
 .pal{{width:44px;height:42px;font-size:14px}}
 .exchoice{{padding:14px 14px;margin:10px 0;font-size:15px}}
 .exassist{{gap:8px}} .asbtn{{min-height:40px;padding:0 14px;font-size:12.5px}}
 .modebtn{{max-width:none;width:100%;padding:14px 16px}}
 .hintrow{{gap:8px}} .hintbtn{{height:44px;min-width:46%;font-size:13px}}
 .plainbtn{{height:32px;font-size:12.5px;padding:0 12px}}
 .reveal{{padding:13px 18px;font-size:16px}}
 .flag{{font-size:22px;padding:12px 4px 0 14px}}
 .hintbox,.expl{{padding:12px}}
 .util{{min-height:40px;padding:0 16px}}
 .exstart{{width:100%;padding:14px}}
 .card{{scroll-margin-top:12px}} .ksec{{scroll-margin-top:8px}}
 .rescard b{{font-size:26px}}
 .resqhead{{padding:12px;min-height:44px}}
 .headbtn{{min-height:44px;padding-top:8px}}
 .segbtn{{min-height:40px;padding:0 18px;font-size:13px}}
 .switch,.ghost{{min-height:40px;padding:0 16px;font-size:13px}}
}}
.tour{{position:fixed;inset:0;background:rgba(6,8,8,.72);z-index:50;display:flex;align-items:center;justify-content:center;padding:16px}}
.tourbox{{position:relative;background:var(--card);border:1px solid var(--line);border-radius:14px;max-width:520px;width:100%;padding:22px 20px 16px;max-height:88vh;overflow:auto}}
.tourskip{{position:absolute;top:10px;right:12px;background:none;border:0;color:var(--dim);font-family:var(--disp);font-size:13px;letter-spacing:.6px;cursor:pointer;padding:8px}}
.tourkicker{{font-family:var(--disp);font-size:11px;letter-spacing:1.6px;color:var(--dim)}}
.tourh{{font-family:var(--disp);font-size:24px;letter-spacing:.5px;text-transform:uppercase;margin:4px 0 12px}}
.tourstep{{display:none}} .tourstep.on{{display:block}}
.tourrooms{{display:flex;flex-direction:column;gap:10px}}
.tourroom{{display:flex;gap:12px;align-items:flex-start;border:1px solid var(--line);border-radius:10px;padding:10px 12px;background:var(--soft)}}
.tourroom p{{margin:2px 0 0;font-size:13.5px}}
.tdemo{{pointer-events:none;min-height:34px;display:inline-flex;align-items:center}}
.tourol,.tourul{{margin:4px 0 0;padding-left:20px;font-size:14px}}
.tourol li,.tourul li{{margin:8px 0}}
.tournote{{font-size:12.5px;color:var(--dim);margin:10px 0 0}}
.tournav{{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:16px;border-top:1px dashed var(--line);padding-top:12px}}
.tourdots{{display:flex;gap:7px}}
.tourdots i{{width:8px;height:8px;border-radius:50%;background:var(--line)}}
.tourdots i.on{{background:var(--ink)}}
@media (max-width:560px){{ .tourh{{font-size:20px}} .tourbox{{padding:18px 14px 12px}} }}
#dock{{position:fixed;left:50%;transform:translateX(-50%);bottom:14px;z-index:40;display:flex;gap:6px;align-items:center;background:var(--card);border:1px solid var(--line);border-radius:999px;padding:7px 12px;box-shadow:0 12px 34px rgba(0,0,0,.5);max-width:calc(100vw - 16px);overflow-x:auto;-webkit-overflow-scrolling:touch}}
.dockq{{font-family:var(--disp);font-weight:700;font-size:14px;color:var(--ink);padding:0 4px;white-space:nowrap}}
.dockbtn{{flex:0 0 auto;border:1.5px dashed var(--dim);color:var(--dim);background:none;border-radius:999px;padding:5px 12px;font-family:var(--disp);font-size:12px;letter-spacing:.5px;text-transform:uppercase;cursor:pointer;white-space:nowrap}}
.dockbtn.on{{border-style:solid;color:var(--ink);border-color:var(--ink)}}
.dockbtn.dead{{pointer-events:none;opacity:.4;border-style:solid}}
.dockclaude{{border-style:solid;border-color:var(--t1bd);color:var(--t1c);background:var(--t1bg)}}
.dockrev{{border:1.5px solid var(--ink);background:var(--ink);color:var(--paper)}}
body.dockon #view-drill{{padding-bottom:96px}}
@media (max-width:560px){{ #dock{{bottom:10px;padding:8px 10px}} .dockbtn{{min-height:44px;display:inline-flex;align-items:center}} }}
#spot{{position:fixed;inset:0;z-index:60;pointer-events:none}}
.spotring{{position:absolute;border:2px solid var(--mark);border-radius:10px;box-shadow:0 0 0 9999px rgba(6,8,8,.66);transition:all .25s ease;pointer-events:none}}
.spottip{{position:absolute;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px 14px 10px;max-width:340px;pointer-events:auto;box-shadow:0 8px 30px rgba(0,0,0,.4)}}
.spott{{font-family:var(--disp);font-size:17px;letter-spacing:.5px;text-transform:uppercase;margin:2px 0 6px}}
.spotp{{font-size:13.5px;margin:0}}
.spottip .tournav{{margin-top:10px;padding-top:8px}}
@media (max-width:560px){{ .spottip{{left:10px !important;right:10px !important;max-width:none;bottom:12px !important;top:auto !important}} }}
</style></head><body>
<div class="wrap">
<header>
 <h1>CCA-F <em>drill</em> · pattern key + 60Q</h1>
 <p class="sub">Key = one panel per set: how to recognize it, the one rule, and every member question lined up so the variations are visible. Drill = flag questions, answer in your head, hit one Reveal — verdicts appear inline.</p>
 <div class="tierkey">
   <span><span class="tier t1">DOCS-VERIFIED</span>{t1} answers confirmed against official docs/spec</span>
   <span><span class="tier t2">GUIDANCE</span>backed by published best practice</span>
   <span><span class="tier t3">DEBATE</span>{t3} wording-sensitive — two defensible reads</span>
 </div>
</header>

<nav class="tabs">
 <button class="tab on" data-v="key" onclick="tab(this)">Key</button>
 <button class="tab" data-v="drill" onclick="tab(this)">Drill</button>
 <button class="tab" data-v="exam" onclick="tab(this)">Exam</button>
 <span class="tabnote" id="flagnote">0 flagged</span>
 <button class="tab" id="themebtn" onclick="theme()" title="Toggle dark mode" style="padding:6px 12px">◐ Dark</button>
 <button class="tab" id="helpbtn" onclick="tourOpen()" title="How this tool works" style="padding:6px 12px">? Tour</button>
</nav>

<section class="view on" id="view-key">
 <div class="keynav" id="keynav">{keynav_chips}</div>
 {key_sections}
</section>

<section class="view" id="view-drill">
 <div class="toolbar">
  <div class="cluster" id="tg-sets"><span class="cluslab">Set <i>· pick one topic</i></span>
   <div class="clusrow">
    <button class="fbtn dark on" data-f="all" onclick="filt(this)">All 60</button>
    {filterbtns}
   </div>
  </div>
  <div class="cluster" id="tg-focus"><span class="cluslab">Narrow <i>· stacks on the set</i></span>
   <div class="clusrow">
    <button class="fbtn dark foc" data-f="flag" onclick="filt(this)">⚑ Flagged</button>
    <button class="fbtn dark foc" data-f="dis" onclick="filt(this)">⚠ Disputed {len(disagree)}</button>
    <button class="fbtn dark foc" data-f="t3" onclick="filt(this)">⚖ Debate {t3}</button>
    <span class="showing" id="showing"></span>
   </div>
  </div>
  <div class="cluster" id="tg-view"><span class="cluslab">View</span>
   <div class="clusrow">
    <div class="seg" role="group" aria-label="layout">
      <button class="segbtn on" id="vAll" onclick="dview('all')">☰ All</button>
      <button class="segbtn" id="vSingle" onclick="dview('single')">▭ Single</button>
    </div>
    <button class="switch on" id="hlbtn" onclick="hilite()"><span class="dot"></span>Highlights</button>
    <span class="vdiv"></span>
    <button class="ghost" onclick="hideAll()">Hide answers</button>
    <button class="ghost" onclick="resetDrill()">↺ Reset</button>
   </div>
  </div>
 </div>
 {''.join(cards)}
 <div class="dnav" id="dnav" style="display:none">
   <button class="exnavbtn" onclick="dnav(-1)">← Previous</button>
   <span class="exq" id="dpos"></span>
   <button class="exnavbtn" onclick="dnav(1)">Next →</button>
 </div>
</section>

<section class="view" id="view-exam">
 <div id="exam-start">
   <div class="exintro">
     <h2 class="codeshead">Exam simulation — 1:1 CCA-F format</h2>
     <p class="hint2">60 questions · 120 minutes · one question per screen (Skilljar-style) · pause/resume · flag for review. Per-question time is tracked; pauses don't count against the question you're on. Results include set analytics and a downfall analysis.</p>
     <div class="modes">
       <button class="modebtn" onclick="exStart('easy')"><b>Easy</b><span>toggle hints, plain words, gists, in-practice, and reveal answer per question</span></button>
       <button class="modebtn" onclick="exStart('medium')"><b>Medium</b><span>hints + plain-words paraphrasing only</span></button>
       <button class="modebtn sel" onclick="exStart('hard')"><b>Hard — 1:1</b><span>exactly like the real exam: nothing but the question</span></button>
     </div>
   </div>
 </div>
 <div id="exam-run" style="display:none">
   <div class="exbar">
     <span class="extimer" id="extimer">120:00</span>
     <button class="expause" id="expausebtn" onclick="exPause()">⏸ Pause</button>
     <span class="exq" id="exqlabel">Q 1 / 60</span>
     <button class="exflag" id="exflagbtn" onclick="exFlag()">⚑ Flag</button>
     <button class="exsubmit" onclick="exSubmit(false)">Submit exam</button>
   </div>
   <div class="expalette" id="expalette"></div>
   <div class="exassist" id="exassist"></div>
   <div class="exqbox" id="exqbox"></div>
   <div class="exnav">
     <button class="exnavbtn" id="exprev" onclick="exNav(-1)">← Previous</button>
     <button class="exnavbtn" id="exnext" onclick="exNav(1)">Next →</button>
   </div>
 </div>
 <div id="exam-pause" style="display:none">
   <div class="expausebox">
     <h2 class="codeshead">Paused</h2>
     <p class="hint2">Question hidden while paused. The clock — and this question's timer — are stopped. Resuming assumes you're still on the same question.</p>
     <button class="exstart" onclick="exResume()">▶ Resume</button>
   </div>
 </div>
 <div id="exam-results" style="display:none"></div>
</section>

<div id="tour" class="tour" style="display:none" role="dialog" aria-label="How this tool works">
 <div class="tourbox">
  <button class="tourskip" onclick="tourDone()">Skip ✕</button>
  <div class="tourstep on" data-s="0">
    <div class="tourkicker">WELCOME · 30-SECOND TOUR</div>
    <h2 class="tourh">One tool, three rooms</h2>
    <div class="tourrooms">
      <div class="tourroom"><span class="tab on tdemo">Key</span><p><b>Learn</b> the patterns — cheat codes + one panel per topic set.</p></div>
      <div class="tourroom"><span class="tab tdemo">Drill</span><p><b>Practice</b> all 60 questions with training wheels you control.</p></div>
      <div class="tourroom"><span class="tab tdemo">Exam</span><p><b>Rehearse</b> — 60 Q / 120 min, exactly like the real thing.</p></div>
    </div>
  </div>
  <div class="tourstep" data-s="1">
    <div class="tourkicker">THE STUDY LOOP</div>
    <h2 class="tourh">Four moves, repeat</h2>
    <ol class="tourol">
      <li><b>Key:</b> open a set panel — read its fingerprint + one rule.</li>
      <li><b>Drill</b> that set: try each question, tap <b>Reveal</b> to check.</li>
      <li><b>⚑ Flag</b> your misses — then drill the Flagged filter.</li>
      <li><b>Exam</b> when ready — results rank your weakest set for round two.</li>
    </ol>
  </div>
  <div class="tourstep" data-s="2">
    <div class="tourkicker">TRAINING WHEELS</div>
    <h2 class="tourh">Stuck? Every question has help buttons</h2>
    <ul class="tourul">
      <li><b>💡 Hint</b> — what the question is <i>really</i> asking. Never spoils.</li>
      <li><b>⌁ Gists</b> — each choice as one line of pseudo-code.</li>
      <li><b>◦ plain</b> — a choice rephrased in simple words.</li>
      <li><b>Reveal</b> — the answer + why every other choice loses.</li>
      <li><b>🤖 Ask Claude</b> — copies the question for a walkthrough in Claude.</li>
    </ul>
    <p class="tournote">In Exam mode, Easy / Medium / Hard decides how many of these exist.</p>
  </div>
  <div class="tourstep" data-s="3">
    <div class="tourkicker">READ THE COLORS</div>
    <h2 class="tourh">Badges in ten seconds</h2>
    <ul class="tourul">
      <li>Colored pills = <b>topic sets</b> — same color everywhere.</li>
      <li><span class="verdict v-pick" style="display:inline-block">✓ PICK</span> correct · <span class="verdict v-kill" style="display:inline-block">✕ OUT</span> eliminated (struck through).</li>
      <li><span class="tier t1">DOCS-VERIFIED</span> answer confirmed against official Anthropic docs.</li>
      <li><b>⚠ Disputed 8</b> — the 8 questions your team's doc had marked wrong. Drill these first.</li>
    </ul>
  </div>
  <div class="tournav">
    <button class="exnavbtn" id="tprev" onclick="tourGo(-1)">← Back</button>
    <span class="tourdots" id="tdots"></span>
    <button class="exnavbtn" id="tnext" onclick="tourGo(1)">Next →</button>
  </div>
 </div>
</div>

<div id="dock" style="display:none" aria-label="Help tools for the current question">
 <span class="dockq" id="dockq">Q1</span>
 <button class="dockbtn" data-k="hint" onclick="dockAssist(this)">💡 Hint</button>
 <button class="dockbtn" data-k="hl" onclick="dockAssist(this)">🖍 HL</button>
 <button class="dockbtn" data-k="gist" onclick="dockAssist(this)">⌁ Gists</button>
 <button class="dockbtn" data-k="ex" onclick="dockAssist(this)">In practice</button>
 <button class="dockbtn dockclaude" data-k="ask" onclick="dockAssist(this)">🤖 Ask</button>
 <button class="dockbtn dockrev" data-k="rev" onclick="dockAssist(this)">Reveal</button>
</div>

<div id="spot" style="display:none">
 <div class="spotring" id="spotring"></div>
 <div class="spottip" id="spottip">
  <div class="tourkicker" id="spotstep"></div>
  <h3 class="spott" id="spottitle"></h3>
  <p class="spotp" id="spottext"></p>
  <div class="tournav">
    <button class="exnavbtn" id="sprev" onclick="spotGo(-1)">← Back</button>
    <button class="tourskip" style="position:static" onclick="spotEnd(false)">Exit</button>
    <button class="exnavbtn" id="snext" onclick="spotGo(1)">Next →</button>
  </div>
 </div>
</div>

</div>
<script>
const ANS = {answers_js};
function theme(){{
 const d = document.body.classList.toggle('dark');
 document.getElementById('themebtn').textContent = d ? '◑ Light' : '◐ Dark';
}}
theme(); // dark by default; button switches to light
function tab(btn){{
 document.querySelectorAll('.tab[data-v]').forEach(b=>b.classList.remove('on'));
 btn.classList.add('on');
 document.querySelectorAll('.view').forEach(v=>v.classList.remove('on'));
 document.getElementById('view-'+btn.dataset.v).classList.add('on');
 dockSync();
}}
let LASTQ = null;
function keepCardAnchored(c, fn){{
 const t = c.getBoundingClientRect().top;
 fn();
 const d = c.getBoundingClientRect().top - t;
 if (d) window.scrollBy({{top: d, left: 0, behavior: 'instant'}});
}}
function activeCard(){{
 if (!document.getElementById('view-drill').classList.contains('on')) return null;
 const cards = [...document.querySelectorAll('#view-drill .card')].filter(c => c.style.display !== 'none' && c.classList.contains('open'));
 if (!cards.length) return null;
 if (DMODE === 'single') return cards[0];
 if (LASTQ) {{ const c = cards.find(x => x.dataset.n === String(LASTQ)); if (c) {{ const r = c.getBoundingClientRect(); if (r.bottom > 60 && r.top < window.innerHeight) return c; }} }}
 const line = window.innerHeight * 0.33;
 let best = null, bd = 1e9;
 for (const c of cards) {{ const r = c.getBoundingClientRect(); if (r.top <= line && r.bottom >= 60) return c; const d = Math.abs(r.top - line); if (d < bd) {{ bd = d; best = c; }} }}
 return best;
}}
function dockSync(){{
 const dock = document.getElementById('dock');
 const c = activeCard();
 if (!c) {{ dock.style.display = 'none'; document.body.classList.remove('dockon'); return; }}
 dock.style.display = 'flex';
 document.body.classList.add('dockon');
 document.getElementById('dockq').textContent = 'Q' + c.dataset.n;
 const revealed = c.classList.contains('revealed');
 const st = {{ hint: c.classList.contains('hinted'), hl: !c.classList.contains('q-nohl'), gist: c.classList.contains('q-showgist'), ex: c.classList.contains('q-showex') }};
 dock.querySelectorAll('.dockbtn').forEach(b => {{
   const k = b.dataset.k;
   if (k in st) b.classList.toggle('on', st[k]);
   if (['hint','gist','ex'].includes(k)) b.classList.toggle('dead', revealed);
   if (k === 'rev') b.textContent = revealed ? 'Hide' : 'Reveal';
 }});
}}
function dockAssist(b){{
 const c = activeCard();
 if (!c) return;
 LASTQ = c.dataset.n;
 const k = b.dataset.k;
 if (k === 'ask') {{ askClaude(b, parseInt(c.dataset.n, 10)); return; }}
 keepCardAnchored(c, () => {{
   if (k === 'hint') c.classList.toggle('hinted');
   else if (k === 'hl') c.classList.toggle('q-nohl');
   else if (k === 'gist') c.classList.toggle('q-showgist');
   else if (k === 'ex') c.classList.toggle('q-showex');
   else if (k === 'rev') {{
     c.classList.toggle('revealed');
     c.querySelector('.reveal').textContent = c.classList.contains('revealed') ? 'Hide answer' : 'Reveal answer';
   }}
 }});
 dockSync();
}}
let dockScrollTick = false;
window.addEventListener('scroll', () => {{
 if (dockScrollTick) return;
 dockScrollTick = true;
 requestAnimationFrame(() => {{ dockScrollTick = false; if (document.getElementById('view-drill').classList.contains('on')) dockSync(); }});
}}, {{passive: true}});
function keepAnchored(el, fn){{
 const t = el.getBoundingClientRect().top;
 fn();
 const d = el.getBoundingClientRect().top - t;
 if (d) window.scrollBy({{top: d, left: 0, behavior: 'instant'}});
}}
function listTop(){{ document.querySelector('#view-drill .toolbar').scrollIntoView({{behavior:'instant', block:'start'}}); window.scrollBy({{top:-80, behavior:'instant'}}); }}
function tog(b){{const c=b.closest('.card'); c.classList.toggle('open'); LASTQ=c.dataset.n; dockSync();}}
function rev(b){{
 const c = b.closest('.card');
 keepCardAnchored(c, () => {{
   c.classList.toggle('revealed');
   b.textContent = c.classList.contains('revealed') ? 'Hide answer' : 'Reveal answer';
 }});
 LASTQ = c.dataset.n;
 dockSync();}}
function hint(b){{ keepAnchored(b, () => {{ b.classList.toggle('on'); b.closest('.card').classList.toggle('hinted'); }}); }}
function cplain(b){{ keepAnchored(b, () => b.closest('.choice').classList.toggle('showplain')); }}
function cgist(b){{ keepAnchored(b, () => b.closest('.choice').classList.toggle('showgist')); }}
function qtog(b,cls){{ keepAnchored(b, () => {{ b.classList.toggle('on'); b.closest('.card').classList.toggle(cls); }}); }}
function qhl(b){{
 keepAnchored(b, () => {{
   const c = b.closest('.card');
   const off = c.classList.toggle('q-nohl');
   b.textContent = '🖍 Highlights: ' + (off ? 'off' : 'on');
 }});
}}
function hilite(){{
 const btn = document.getElementById('hlbtn');
 const turnOff = btn.classList.contains('on');
 btn.classList.toggle('on', !turnOff);
 document.querySelectorAll('#view-drill .card').forEach(c => {{
   c.classList.toggle('q-nohl', turnOff);
   const b = c.querySelector('.hintrow button:nth-child(2)');
   if (b) b.textContent = '🖍 Highlights: ' + (turnOff ? 'off' : 'on');
 }});
}}
function hideAll(){{document.querySelectorAll('.card.revealed').forEach(c=>{{c.classList.remove('revealed');c.querySelector('.reveal').textContent='Reveal answer';}}); listTop();}}
function flag(b){{
 b.classList.toggle('on');
 const n = document.querySelectorAll('.flag.on').length;
 document.getElementById('flagnote').textContent = n + ' flagged';
}}
let CURF = 'all', CURFOC = null, DMODE = 'all', DIDX = 0;
function matchesF(c){{
 const setOk = CURF === 'all' || c.dataset.set === CURF;
 let focOk = true;
 if (CURFOC === 'flag') focOk = c.querySelector('.flag').classList.contains('on');
 else if (CURFOC === 'dis') focOk = c.dataset.dis === '1';
 else if (CURFOC === 't3') focOk = c.dataset.tier === '3';
 return setOk && focOk;
}}
function applyDrill(){{ requestAnimationFrame(dockSync);
 const cards = [...document.querySelectorAll('#view-drill .card')];
 const matched = cards.filter(c => matchesF(c));
 if (DMODE === 'all') {{
   cards.forEach(c => c.style.display = matchesF(c) ? '' : 'none');
   document.getElementById('dnav').style.display = 'none';
 }} else {{
   DIDX = Math.min(DIDX, Math.max(0, matched.length - 1));
   cards.forEach(c => c.style.display = 'none');
   if (matched.length) {{ const cur = matched[DIDX]; cur.style.display = ''; cur.classList.add('open'); }}
   const nav = document.getElementById('dnav');
   nav.style.display = matched.length ? 'flex' : 'none';
   document.getElementById('dpos').textContent = matched.length ? `${{DIDX+1}} / ${{matched.length}}${{(CURF!=='all'||CURFOC)?' (filtered)':''}}` : '';
 }}
 const sh = document.getElementById('showing');
 if (sh) sh.textContent = (CURF !== 'all' || CURFOC) ? '→ showing ' + matched.length + ' of 60' : '';
}}
function filt(btn){{
 const f = btn.dataset.f;
 if (!f) return;
 if (['flag','dis','t3'].includes(f)) {{
   CURFOC = (CURFOC === f) ? null : f;
   document.querySelectorAll('.fbtn.foc').forEach(b => b.classList.toggle('on', b.dataset.f === CURFOC));
 }} else {{
   CURF = f;
   document.querySelectorAll('.fbtn[data-f]:not(.foc)').forEach(b => b.classList.toggle('on', b.dataset.f === f));
 }}
 DIDX = 0;
 applyDrill(); listTop();
}}
function dview(m){{
 DMODE = m;
 document.getElementById('vAll').classList.toggle('on', m==='all');
 document.getElementById('vSingle').classList.toggle('on', m==='single');
 applyDrill(); listTop();
}}
function dnav(d){{
 const max = [...document.querySelectorAll('#view-drill .card')].filter(c => matchesF(c)).length;
 DIDX = Math.min(max-1, Math.max(0, DIDX + d));
 applyDrill(); listTop();
}}
function resetDrill(){{
 DMODE = 'all';
 document.getElementById('vAll').classList.add('on');
 document.getElementById('vSingle').classList.remove('on');
 document.querySelectorAll('#view-drill .card').forEach(c => {{
   c.classList.remove('open','revealed','hinted','q-nohl','q-showgist','q-showex');
   c.querySelectorAll('.choice').forEach(ch => ch.classList.remove('showplain','showgist'));
   c.querySelectorAll('.hintbtn.on').forEach(b => b.classList.remove('on'));
   const hb = c.querySelector('.hintrow button:nth-child(2)'); if (hb) hb.textContent = '🖍 Highlights: on';
   c.querySelector('.reveal').textContent = 'Reveal answer';
 }});
 document.getElementById('hlbtn').classList.add('on');
 document.querySelectorAll('.fbtn[data-f]').forEach(b=>b.classList.remove('on'));
 document.querySelector('.fbtn[data-f="all"]').classList.add('on');
 CURF = 'all'; CURFOC = null; DIDX = 0;
 applyDrill(); listTop();
}}
function askClaude(btn, n){{
 const card = document.querySelector('.card[data-n="'+n+'"]');
 const t = sel => {{ const e = card.querySelector(sel); return e ? e.textContent.trim() : null; }};
 const choices = {{}};
 for (const L of ['A','B','C','D']) {{
   const c = card.querySelector('.choice[data-l="'+L+'"]');
   choices[L] = {{
     text: c.querySelector('.ctext').textContent.trim(),
     plain_words: c.querySelector('.cplain').textContent.trim(),
     pattern_gist: c.querySelector('.gist').textContent.trim(),
     verdict: {{pick:'CORRECT', runner:'close 2nd — plausible but loses', kill:'eliminate'}}[c.dataset.v],
     why: c.querySelector('.cwhy').textContent.trim()
   }};
 }}
 const hintItems = card.querySelectorAll('.hintbox .hintitem p');
 const payload = {{
   source: 'CCA-F practice drill (Anthropic Claude Certification – Foundations)',
   question_number: n,
   pattern_set: SETMETA[QMETA[n].s].name,
   set_rule: SETMETA[QMETA[n].s].rule,
   confidence_tier: {{'1':'verified against official Anthropic docs/spec','2':'follows published Anthropic guidance','3':'debated — two defensible reads'}}[card.dataset.tier],
   skim_cue: t('.cue'),
   signal_phrases: [...card.querySelectorAll('.chips .chip')].map(c => c.textContent.trim()),
   question_verbatim: t('.stem'),
   really_asking: hintItems[0] ? hintItems[0].textContent.trim() : null,
   look_first: hintItems[1] ? hintItems[1].textContent.trim() : null,
   choices: choices,
   correct_answer: QMETA[n].w,
   in_practice: {{ mechanism: t('.mech'), lead: t('.explead'), snippet: t('.snip') }}
 }};
 const instruction = 'Teach me this one CCA-F practice question. My study tool packed everything you need into the JSON below. Rules: use plain, simple language. Short lines. Examples over explanations. Give me: (1) the pattern in one short sentence. (2) a tiny concrete example for the correct answer - code or JSON, keep every line under 45 characters so nothing scrolls sideways. (3) one line per wrong choice: what makes it tempting, then the simple reason it loses. (4) a one-line memory hook to recall this pattern on the exam. Do not repeat the JSON back. Do not add generic exam advice. Keep the whole reply short - this is a learning aid, not an essay.'
 const text = instruction + '\\n\\n```json\\n' + JSON.stringify(payload, null, 1) + '\\n```';
 const done = ok => {{ const old = btn.textContent; btn.textContent = ok ? '✓ Copied — paste into Claude' : '✗ copy failed'; setTimeout(()=>btn.textContent = old, 1800); }};
 if (navigator.clipboard && navigator.clipboard.writeText) {{
   navigator.clipboard.writeText(text).then(()=>done(true), ()=>{{ fallbackCopy(text) ? done(true) : done(false); }});
 }} else {{ fallbackCopy(text) ? done(true) : done(false); }}
 window.__lastClaudePayload = text;
}}
function fallbackCopy(text){{
 const ta = document.createElement('textarea');
 ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
 document.body.appendChild(ta); ta.select();
 let ok = false; try {{ ok = document.execCommand('copy'); }} catch(e) {{}}
 document.body.removeChild(ta); return ok;
}}
function jumpSet(n){{
 const setk = QMETA[n].s;
 document.querySelector('.tab[data-v="drill"]').click();
 CURFOC = null;
 document.querySelectorAll('.fbtn.foc').forEach(b=>b.classList.remove('on'));
 document.querySelectorAll('.fbtn[data-f]:not(.foc)').forEach(b=>b.classList.toggle('on', b.dataset.f===setk));
 CURF = setk;
 if (DMODE === 'single') {{
   const matched = [...document.querySelectorAll('#view-drill .card')].filter(c => matchesF(c));
   DIDX = Math.max(0, matched.findIndex(c => c.dataset.n === String(n)));
   applyDrill(); listTop();
 }} else {{
   applyDrill();
   const c = document.querySelector('.card[data-n="'+n+'"]');
   if(c){{ c.classList.add('open'); scrollUnderToolbar(c); }}
 }}
}}
function scrollUnderToolbar(el){{
 const tb = document.querySelector('#view-drill .toolbar');
 const sticky = getComputedStyle(tb).position === 'sticky';
 el.scrollIntoView({{behavior:'instant', block:'start'}});
 if (sticky) {{
   const d = el.getBoundingClientRect().top - (tb.getBoundingClientRect().bottom + 8);
   if (Math.abs(d) > 2) window.scrollBy({{top: d, behavior: 'instant'}});
 }}
}}
function jump(n){{
 document.querySelector('.tab[data-v="drill"]').click();
 CURFOC = null;
 document.querySelectorAll('.fbtn.foc').forEach(b=>b.classList.remove('on'));
 document.querySelectorAll('.fbtn[data-f]:not(.foc)').forEach(b=>b.classList.toggle('on', b.dataset.f==='all'));
 CURF='all';
 if (DMODE === 'single') {{ DIDX = n - 1; applyDrill(); listTop(); }}
 else {{
   applyDrill();
   const c = document.querySelector('.card[data-n="'+n+'"]');
   if(c){{ c.classList.add('open'); scrollUnderToolbar(c); }}
 }}
}}
const QMETA = {qmeta_js};
const SETMETA = {setmeta_js};
const ORDER = Array.from({{length:60}},(_,i)=>i+1);
let EX = null;
function fmt(s){{ s=Math.max(0,Math.round(s)); const m=Math.floor(s/60), ss=s%60; return m+':' + String(ss).padStart(2,'0'); }}
function exStart(mode){{
  EX = {{ mode: mode || (EX && EX.mode) || 'hard', answers:{{}}, flags:new Set(), times:{{}}, cur:0, remaining:7200, running:true, qStart:Date.now(), tick:null }};
  document.getElementById('exam-start').style.display='none';
  document.getElementById('exam-results').style.display='none';
  document.getElementById('exam-run').style.display='';
  buildPalette(); renderExQ(); startTick();
}}
function startTick(){{
  EX.tick = setInterval(()=>{{
    EX.remaining--;
    const t = document.getElementById('extimer');
    t.textContent = fmt(EX.remaining);
    t.classList.toggle('low', EX.remaining <= 600);
    if(EX.remaining<=0) exSubmit(true);
  }},1000);
}}
function bankTime(){{ const n=ORDER[EX.cur]; EX.times[n]=(EX.times[n]||0)+(Date.now()-EX.qStart)/1000; EX.qStart=Date.now(); }}
function exPause(){{
  if(!EX.running) return;
  bankTime(); clearInterval(EX.tick); EX.running=false;
  document.getElementById('exam-run').style.display='none';
  document.getElementById('exam-pause').style.display='';
}}
function exResume(){{
  document.getElementById('exam-pause').style.display='none';
  document.getElementById('exam-run').style.display='';
  EX.running=true; EX.qStart=Date.now(); startTick();
}}
function buildPalette(){{
  document.getElementById('expalette').innerHTML = ORDER.map((n,i)=>`<button class="pal" id="pal${{n}}" onclick="exGoto(${{i}})">${{n}}</button>`).join('');
}}
function palSync(){{
  ORDER.forEach((n,i)=>{{
    const p=document.getElementById('pal'+n);
    p.classList.toggle('answered', n in EX.answers);
    p.classList.toggle('flagged', EX.flags.has(n));
    p.classList.toggle('cur', i===EX.cur);
  }});
}}
function renderExQ(){{
  const n = ORDER[EX.cur];
  const card = document.querySelector('.card[data-n="'+n+'"]');
  const stem = card.querySelector('.stem').innerHTML;
  const win = QMETA[n].w;
  let ch='';
  for(const L of ['A','B','C','D']){{
    const cEl = card.querySelector('.choice[data-l="'+L+'"]');
    const txt = cEl.querySelector('.ctext').textContent;
    const plain = cEl.querySelector('.cplain').textContent;
    const gist = cEl.querySelector('.gist').textContent;
    const why = cEl.querySelector('.cwhy').textContent;
    ch += `<div class="exchoice ${{EX.answers[n]===L?'sel':''}} ${{L===win?'iscorrect':''}}" onclick="exPick('${{L}}')">
      <div class="exrow"><span class="exlet">${{L}}</span><span>${{txt}}</span></div>
      <div class="cplain">${{plain}}</div><code class="gist">${{gist}}</code><div class="exwhy">${{why}}</div></div>`;
  }}
  const hint = card.querySelector('.hintbox');
  const expl = card.querySelector('.expl');
  const extra = `<div class="exhintbox">${{hint.innerHTML}}</div><div class="exexpl">${{expl.innerHTML}}</div>`;
  const qbox = document.getElementById('exqbox');
  qbox.className = 'exqbox'; // assist toggles reset per question (exPick restores its own)
  qbox.innerHTML = `<p class="exstem">${{stem}}</p>${{extra}}${{ch}}`;
  // assist bar per mode; toggles reset per question
  const AS = {{easy:[['hint','💡 hint'],['plain','◦ plain words'],['gist','⌁ gists'],['ex','in practice'],['reveal','reveal answer']], medium:[['hint','💡 hint'],['plain','◦ plain words']], hard:[]}};
  const asBtns = (AS[EX.mode]||[]).map(([k,l])=>`<button class="asbtn" data-k="${{k}}" onclick="exAssist(this)">${{l}}</button>`).join('');
  document.getElementById('exassist').innerHTML = asBtns ? '<span class="tglab">Help<br><i>' + EX.mode + ' mode</i></span>' + asBtns : '';
  document.getElementById('exqlabel').textContent = `Q ${{EX.cur+1}} / 60`;
  document.getElementById('exflagbtn').classList.toggle('on', EX.flags.has(n));
  document.getElementById('exprev').disabled = EX.cur===0;
  document.getElementById('exnext').disabled = EX.cur===59;
  palSync();
}}
function exAssist(b){{
  const k=b.dataset.k;
  b.classList.toggle('on');
  document.getElementById('exqbox').classList.toggle('as-'+k, b.classList.contains('on'));
}}
function exPick(L){{
  const box=document.getElementById('exqbox');
  const keep=['as-hint','as-plain','as-gist','as-ex','as-reveal'].filter(c=>box.classList.contains(c));
  EX.answers[ORDER[EX.cur]]=L; renderExQ();
  const nb=document.getElementById('exqbox');
  keep.forEach(c=>nb.classList.add(c));
  keep.forEach(c=>{{const btn=document.querySelector('.asbtn[data-k="'+c.slice(3)+'"]'); if(btn) btn.classList.add('on');}});
  document.querySelector('.exnav').scrollIntoView({{behavior:'smooth', block:'end'}});
}}
function exFlag(){{ const n=ORDER[EX.cur]; EX.flags.has(n)?EX.flags.delete(n):EX.flags.add(n); renderExQ(); }}
function exNav(d){{ bankTime(); EX.cur=Math.min(59,Math.max(0,EX.cur+d)); renderExQ(); window.scrollTo({{top:0}}); }}
function exGoto(i){{ bankTime(); EX.cur=i; renderExQ(); window.scrollTo({{top:0}}); }}
function exSubmit(auto){{
  const un = 60-Object.keys(EX.answers).length;
  if(!auto && un>0 && !confirm(un+' unanswered question'+(un>1?'s':'')+'. Submit anyway?')) return;
  bankTime(); clearInterval(EX.tick); EX.running=false;
  document.getElementById('exam-run').style.display='none';
  renderResults(auto);
}}
function renderResults(auto){{
  const res = document.getElementById('exam-results');
  let correct=0; const perSet={{}};
  for(const n of ORDER){{
    const m=QMETA[n]; perSet[m.s]=perSet[m.s]||{{c:0,t:0,miss:[],time:0}};
    perSet[m.s].t++; perSet[m.s].time+=EX.times[n]||0;
    if(EX.answers[n]===m.w){{correct++;perSet[m.s].c++;}} else perSet[m.s].miss.push(n);
  }}
  const pct=Math.round(correct/60*100);
  const scaled=Math.round(correct/60*1000);
  const used=7200-EX.remaining;
  const ranked=Object.entries(perSet).sort((a,b)=>(a[1].c/a[1].t)-(b[1].c/b[1].t));
  // downfall: verdict types of wrong picks
  let killPicks=0, runnerPicks=0, blanks=0;
  const missAll=[];
  for(const n of ORDER){{ if(EX.answers[n]!==QMETA[n].w){{ missAll.push(n);
    if(!EX.answers[n]) blanks++;
    else {{ const v=document.querySelector('.card[data-n="'+n+'"] .choice[data-l="'+EX.answers[n]+'"]').dataset.v;
      if(v==='runner') runnerPicks++; else killPicks++; }} }} }}
  const worst=ranked.filter(([k,v])=>v.miss.length>0).slice(0,2);
  let downfall='';
  if(missAll.length===0) downfall='<div class="downfall"><b>Clean sheet.</b> Nothing to diagnose — go book the real thing.</div>';
  else {{
    const w0=worst[0]; const wname=SETMETA[w0[0]].name;
    let picktale='';
    if(runnerPicks>killPicks) picktale=`Most wrong picks (${{runnerPicks}}) were the <b>close 2nd</b> — you see the pattern but stop one step early. Drill the why-lines that separate pick from runner-up.`;
    else if(killPicks>0) picktale=`Most wrong picks (${{killPicks}}) were <b>outright kills</b> — distractor patterns (bolt-ons, extremes, myths) are still landing. Re-run the cheat codes before the why-lines.`;
    if(blanks>0) picktale+=` ${{blanks}} left blank — on the real exam, always answer; there's no penalty for guessing.`;
    downfall=`<div class="downfall"><b>Likely downfall: ${{wname}}</b> — ${{w0[1].miss.length}} of ${{w0[1].t}} missed (${{Math.round(w0[1].c/w0[1].t*100)}}%). ${{picktale}}<br><br><span class="klab">HOW TO THINK ABOUT THIS SET</span>${{SETMETA[w0[0]].rule}}</div>`;
  }}
  const setRows=ranked.map(([k,v])=>{{
    const p=Math.round(v.c/v.t*100);
    return `<div class="setrow ${{p<70?'bad':''}}"><span class="setpill" style="--sc:${{SETMETA[k].c}};--scd:${{SETMETA[k].cd}}">${{SETMETA[k].name}}</span><div class="bar"><i style="width:${{p}}%"></i></div><span class="setpct">${{p}}% (${{v.c}}/${{v.t}})</span><span class="restime">avg ${{fmt(v.time/v.t)}}/q</span></div>`;
  }}).join('');
  const qRows=ORDER.map(n=>{{
    const m=QMETA[n]; const ok=EX.answers[n]===m.w;
    const yourA=EX.answers[n]||'—';
    return `<div class="resq ${{ok?'':'wrong'}}" id="resq${{n}}">
      <button class="resqhead" onclick="resTog(${{n}})">
        <span class="resmark ${{ok?'ok':'no'}}">${{ok?'✓':'✗'}} Q${{n}}</span>
        <span class="setpill" style="--sc:${{SETMETA[m.s].c}};--scd:${{SETMETA[m.s].cd}}">${{SETMETA[m.s].name}}</span>
        ${{EX.flags.has(n)?'<span class="resflag">⚑</span>':''}}
        <span>you: <b>${{yourA}}</b> · correct: <b>${{m.w}}</b></span>
        <span class="restime">${{fmt(EX.times[n]||0)}}</span>
      </button>
      <div class="resdetail" data-n="${{n}}"></div>
    </div>`;
  }}).join('');
  res.innerHTML=`
   <h2 class="codeshead">${{auto?'Time expired — auto-submitted':'Exam complete'}} <span class='exq'>· mode: ${{EX.mode}}</span></h2>
   <div class="resgrid">
     <div class="rescard"><b>${{pct}}%</b><span>${{correct}}/60 correct</span></div>
     <div class="rescard"><b>${{scaled}}</b><span>scaled /1000 · pass = 720</span></div>
     <div class="rescard"><b>${{fmt(used)}}</b><span>time used of 120:00</span></div>
     <div class="rescard"><b>${{EX.flags.size}}</b><span>flagged for review</span></div>
   </div>
   <h2 class="codeshead">Sets ranked — weakest first</h2>
   ${{setRows}}
   ${{downfall}}
   <h2 class="codeshead">Question review</h2>
   <p class="hint2">⚑ flags carried in. Expand any row: your pick is tagged, all four choices show their pattern-fit gist + plain words + why, and the correct one carries the In-Practice snippet. Below each: the generic way to think about that set.</p>
   ${{qRows}}
   <div style="margin-top:14px"><button class="exstart" onclick="exStart(EX.mode)">Retake exam (same mode)</button> <button class="exstart" onclick="document.getElementById('exam-results').style.display='none';document.getElementById('exam-start').style.display=''">Change mode</button></div>`;
  res.style.display='';
  res.scrollIntoView({{behavior:'smooth'}});
}}
function resTog(n){{
  const rq=document.getElementById('resq'+n);
  rq.classList.toggle('open');
  const d=rq.querySelector('.resdetail');
  if(rq.classList.contains('open') && !d.dataset.built){{
    const body=document.querySelector('.card[data-n="'+n+'"] .body').cloneNode(true);
    body.querySelectorAll('.hintrow,.hintbox,.revealrow').forEach(e=>e.remove());
    const wrap=document.createElement('div');
    wrap.className='card open revealed hinted';
    wrap.style.border='none'; wrap.style.background='transparent';
    wrap.appendChild(body);
    const you=EX.answers[n];
    if(you) {{ const c=wrap.querySelector('.choice[data-l="'+you+'"] .chead'); if(c) c.insertAdjacentHTML('beforeend','<span class="youpick">YOUR PICK</span>'); }}
    const m=QMETA[n];
    wrap.insertAdjacentHTML('beforeend',`<div class="setexpl" style="--sc:${{SETMETA[m.s].c}}"><span class="klab">HOW TO THINK — ${{SETMETA[m.s].name.toUpperCase()}}</span>${{SETMETA[m.s].rule}}</div>`);
    d.appendChild(wrap); d.dataset.built='1';
  }}
}}
const SPOT_STEPS = [
 {{sel:'.tabs', t:'The three rooms', p:'Key = learn the patterns. Drill = practice with help. Exam = the 1:1 rehearsal. ? Tour replays this anytime; the ◐ button flips light/dark.',
   prep:()=>{{}} }},
 {{sel:'#tg-sets', t:'Sets — pick a topic', p:'Every question belongs to one of 6 colored sets. Tap a pill to study just that group. The colors match everywhere: Key panels, question cards, exam results.',
   prep:()=>{{ document.querySelector('.tab[data-v="drill"]').click(); resetDrill(); }} }},
 {{sel:'#tg-focus', t:'Narrow — stacks on your set', p:'These + chips COMBINE with the set above: Extraction + ⚑ Flagged = your flagged Extraction questions. ⚠ Disputed 8 = the ones your team\u2019s doc had wrong — drill these first. Tap again to clear.',
   prep:()=>{{}} }},
 {{sel:'#tg-view', t:'View — layout, highlights, actions', p:'The joined ☰ All / ▭ Single control picks the layout. The Highlights switch (green dot = on) controls the giveaway wash everywhere. Past the divider: one-shot actions — Hide answers and ↺ Reset (your flags survive).',
   prep:()=>{{}} }},
 {{sel:'.card[data-n="1"] .cardhead', t:'A question card', p:'⚑ flags it for later. The colored pill = its set. The badge = answer confidence: DOCS-VERIFIED beats GUIDANCE beats DEBATE.',
   prep:()=>{{ document.querySelector('.card[data-n="1"]').classList.add('open'); }} }},
 {{sel:'.card[data-n="1"] .chips', t:'Skim first, read later', p:'The bold line is the one-sentence takeaway. The yellow chips are the exact phrases in the question that give the answer away — spot these and you often skip the wall of text.',
   prep:()=>{{}} }},
 {{sel:'#dock', t:'The floating help dock', p:'It follows whichever question you\u2019re on — the Q number shows which. 💡 Hint = what\u2019s really asked (never spoils). 🖍 HL = highlights for this question. ⌁ Gists = choices as one-line code. In practice = the winning mechanism + snippet. 🤖 Ask copies the question for Claude. Reveal = the full answer. It floats, so the page never jumps under your finger.',
   prep:()=>{{ LASTQ='1'; dockSync(); }} }},
 {{sel:'.card[data-n="1"] .choice[data-l="A"] .chead', t:'Per-choice toggles', p:'Each answer choice has its own ◦ plain (simple-words rephrase) and ⌁ gist (one-line code sketch). Toggle just the one you\u2019re stuck on.',
   prep:()=>{{}} }},
 {{sel:'.card[data-n="1"] .reveal', t:'Reveal — the full answer', p:'One tap shows everything: ✓ the pick, ✕ eliminated choices struck through, why each loses, and the in-practice example. The help toggles gray out — they\u2019re already showing.',
   prep:()=>{{}} }},
 {{sel:'.tab[data-v="exam"]', t:'When you\u2019re ready: Exam', p:'60 questions, 120 minutes, one per screen — Easy/Medium/Hard controls how many help tools exist. Results rank your weakest set and tell you HOW you miss (close-2nds vs outright kills). That report is your next drill list.',
   prep:()=>{{}} }},
];
let spotIdx = 0, spotPrevState = null;
function spotStart(){{
 spotPrevState = {{ view: document.querySelector('.tab.on[data-v]').dataset.v }};
 spotIdx = 0;
 document.getElementById('spot').style.display = 'block';
 spotShow();
}}
function spotShow(){{
 const s = SPOT_STEPS[spotIdx];
 s.prep();
 const el = document.querySelector(s.sel);
 el.scrollIntoView({{behavior:'instant', block:'center'}});
 requestAnimationFrame(() => {{
   const r = el.getBoundingClientRect();
   const ring = document.getElementById('spotring');
   ring.style.left = (r.left - 6) + 'px';
   ring.style.top = (r.top - 6) + 'px';
   ring.style.width = (r.width + 12) + 'px';
   ring.style.height = (r.height + 12) + 'px';
   const tip = document.getElementById('spottip');
   document.getElementById('spotstep').textContent = 'COMPONENT ' + (spotIdx + 1) + ' / ' + SPOT_STEPS.length;
   document.getElementById('spottitle').textContent = s.t;
   document.getElementById('spottext').textContent = s.p;
   document.getElementById('sprev').style.visibility = spotIdx === 0 ? 'hidden' : 'visible';
   document.getElementById('snext').textContent = spotIdx === SPOT_STEPS.length - 1 ? 'Finish ✓' : 'Next →';
   if (window.innerWidth > 560) {{
     const below = r.bottom + 16;
     const tipH = tip.offsetHeight || 170;
     tip.style.left = Math.max(10, Math.min(r.left, window.innerWidth - 360)) + 'px';
     tip.style.top = (below + tipH < window.innerHeight ? below : Math.max(10, r.top - tipH - 16)) + 'px';
     tip.style.bottom = 'auto';
   }}
 }});
}}
function spotGo(d){{
 if (spotIdx === SPOT_STEPS.length - 1 && d === 1) {{ spotEnd(true); return; }}
 spotIdx = Math.min(SPOT_STEPS.length - 1, Math.max(0, spotIdx + d));
 spotShow();
}}
function spotEnd(finished){{
 document.getElementById('spot').style.display = 'none';
 // restore what the walkthrough touched
 const c1 = document.querySelector('.card[data-n="1"]');
 c1.classList.remove('open','revealed');
 c1.querySelector('.reveal').textContent = 'Reveal answer';
 if (finished) {{ document.querySelector('.tab[data-v="key"]').click(); ksecgo(0); }}
 else if (spotPrevState) {{ document.querySelector('.tab[data-v="' + spotPrevState.view + '"]').click(); }}
 window.scrollTo({{top:0, behavior:'instant'}});
}}
window.addEventListener('resize', () => {{ if (document.getElementById('spot').style.display !== 'none') spotShow(); }});
const TOUR_STEPS = 4;
let tourStep = 0;
function safeGet(k){{ try {{ return window.localStorage.getItem(k); }} catch(e) {{ return null; }} }}
function safeSet(k, v){{ try {{ window.localStorage.setItem(k, v); }} catch(e) {{}} }}
function tourRender(){{
 document.querySelectorAll('.tourstep').forEach(s => s.classList.toggle('on', +s.dataset.s === tourStep));
 document.getElementById('tdots').innerHTML = Array.from({{length: TOUR_STEPS}}, (_, i) => '<i class="' + (i === tourStep ? 'on' : '') + '"></i>').join('');
 document.getElementById('tprev').style.visibility = tourStep === 0 ? 'hidden' : 'visible';
 document.getElementById('tnext').textContent = tourStep === TOUR_STEPS - 1 ? 'Walk me through the screen →' : 'Next →';
}}
function tourGo(d){{
 if (tourStep === TOUR_STEPS - 1 && d === 1) {{
   tourDone();
   spotStart();
   return;
 }}
 tourStep = Math.min(TOUR_STEPS - 1, Math.max(0, tourStep + d));
 tourRender();
}}
function tourOpen(){{ tourStep = 0; tourRender(); document.getElementById('tour').style.display = 'flex'; }}
function tourDone(){{ document.getElementById('tour').style.display = 'none'; safeSet('ccaf_tour_done', '1'); }}
function ksec(i){{ document.getElementById('ksec'+i).classList.toggle('open'); }}
function ksecgo(i){{
 document.querySelectorAll('.ksec.open').forEach(s => s.classList.remove('open'));
 const s = document.getElementById('ksec'+i);
 s.classList.add('open');
 const nav = document.getElementById('keynav');
 const navSticky = getComputedStyle(nav).position === 'sticky';
 const off = () => navSticky ? nav.getBoundingClientRect().bottom : 0;
 const y = window.scrollY + s.getBoundingClientRect().top - off() - 8;
 window.scrollTo({{top: Math.max(0, y), behavior: 'instant'}});
 const d = s.getBoundingClientRect().top - (off() + 8);
 if (Math.abs(d) > 2) window.scrollBy({{top: d, behavior: 'instant'}});
}}
function kexp(n){{
 const row = document.getElementById('kexprow'+n);
 const open = row.style.display !== 'none';
 row.style.display = open ? 'none' : '';
 if (!open) {{
   const d = document.getElementById('kexp'+n);
   if (!d.dataset.built) {{
     const body = document.querySelector('.card[data-n="'+n+'"] .body').cloneNode(true);
     body.querySelectorAll('.hintrow,.hintbox,.revealrow').forEach(e=>e.remove());
     const wrap = document.createElement('div');
     wrap.className = 'card open revealed hinted';
     wrap.appendChild(body);
     wrap.insertAdjacentHTML('beforeend', '<button class="kexplink qlink" data-jump="'+n+'">Open in Drill ↗</button>');
     d.appendChild(wrap); d.dataset.built = '1';
   }}
 }}
}}
if (!safeGet('ccaf_tour_done')) tourOpen();
document.addEventListener('click', function(e){{
 const btn = e.target.closest('button');
 if (btn && e.detail > 0) btn.blur(); // pointer clicks only; keyboard activation keeps focus
 const js = e.target.closest('[data-jumpset]');
 if (js) {{ e.preventDefault(); jumpSet(parseInt(js.dataset.jumpset, 10)); return; }}
 const j = e.target.closest('[data-jump]');
 if (j) {{ e.preventDefault(); jump(parseInt(j.dataset.jump, 10)); }}
}});

</script>
</body></html>'''

open('/mnt/user-data/outputs/CCA-F_Drill_Key_and_60Q.html', 'w').write(page)
print('written', len(page))
