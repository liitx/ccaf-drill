"""HTML renderers — every Python-side fragment of the page.

Each function returns finished HTML strings; page.py splices them into the
static assets by token. Templates are verbatim from the original generator,
so the emitted markup is byte-identical.
"""
import html
import json

from .constants import ANSWER_LETTERS, Token
from .content import SETS_DEFS, LINKS, TIERMETA, PATTERNS, VER, DEBATE, QLINKS, TIER


def hl(stem, sigs):
    """Wrap each signal phrase in the stem with <mark> (longest first, so
    overlapping phrases can't split each other's tags)."""
    s = html.escape(stem)
    for sig in sorted(sigs, key=len, reverse=True):
        e = html.escape(sig)
        s = s.replace(e, f'<mark>{e}</mark>')
    return s


def tierbadge(t):
    """Confidence badge (T1 DOCS-VERIFIED / T2 GUIDANCE / T3 DEBATE)."""
    tid, lab, tip = TIERMETA[t]
    return f'<span class="tier t{t}" title="{html.escape(tip)}">{lab}</span>'


def render_cards(questions):
    """One <article class="card"> per question — the master copy of all content.

    The drill view shows these directly; the exam view and the key view's
    inline expansion clone from them; the dock, TTS, and Ask-Claude scrape them.
    Returns (cards_html, disagree_count).
    """
    cards = []
    disagree = 0
    for q in questions:
        sd = SETS_DEFS[q.set_key]
        if q.disputed:
            disagree += 1
        chips = ''.join(f'<span class="chip">{html.escape(s)}</span>' for s in q.signals)
        rows = []
        for L in ANSWER_LETTERS:
            ch = q.choices[L]
            cls, lab = VER[ch.verdict]
            mk = '<span class="srcmark">◉ marked in your doc</span>' if q.marked == L else ''
            rows.append(f'''<div class="choice" data-v="{cls}" data-l="{L}">
  <div class="chead"><span class="clet">{L}</span><span class="verdict v-{cls}">{lab}</span>{mk}<button class="plainbtn" onclick="cplain(this)" title="plain-words rephrase of this choice">◦ plain</button><button class="plainbtn gistbtn" onclick="cgist(this)" title="one-line pattern-fit gist of this choice">⌁ gist</button></div>
  <div class="ctext">{html.escape(ch.text)}</div>
  <div class="cplain">{html.escape(ch.plain)}</div>
  <code class="gist">{html.escape(ch.gist)}</code>
  <div class="cwhy">{html.escape(ch.why)}</div>
</div>''')
        ex = q.example
        exblock = f'''<div class="expl"><div class="explhead"><span class="mech">{html.escape(ex.mech)}</span><span class="expllab">IN PRACTICE</span></div><div class="explead">{html.escape(ex.lead)}</div><pre class="snip">{html.escape(ex.snip)}</pre></div>'''
        linkrow = ''
        if q.links:
            ls = ' · '.join(f'<a href="{LINKS[k][1]}" target="_blank" rel="noopener">{html.escape(LINKS[k][0])}</a>' for k in q.links)
            linkrow = f'<div class="srcs">Sources: {ls}</div>'
        debband = f'<div class="debband">⚖ {html.escape(q.debate)}</div>' if q.debate else ''
        disband = ''
        if q.disputed:
            disband = f'<div class="disband">⚠ Your doc marked <b>{q.marked}</b> — verified read says <b>{q.win}</b>.</div>'
        elif q.marked:
            disband = f'<div class="agreeband">✓ Your doc marked <b>{q.marked}</b> — matches.</div>'
        cards.append(f'''<article class="card" data-set="{q.set_key}" data-n="{q.n}" data-dis="{1 if q.disputed else 0}" data-tier="{q.tier}" style="--sc:{sd.color};--scd:{sd.color_dim}">
 <div class="cardhead">
   <button class="flag" onclick="flag(this)" title="Flag to drill later">⚑</button>
   <button class="headbtn" onclick="tog(this)">
     <span class="qnum">Q{q.n}</span>
     <span class="setpill" style="--sc:{sd.color};--scd:{sd.color_dim}">{sd.name}</span>
     {tierbadge(q.tier)}
     <span class="caret">▾</span>
   </button>
 </div>
 <div class="cuewrap"><span class="cue">{html.escape(q.cue)}</span></div>
 <div class="chips">{chips}</div>
 <div class="body">
   <div class="stemlabel">Verbatim question — the <mark>highlight</mark> is what gives the set &amp; answer away</div>
   <p class="stem">{hl(q.stem, q.signals)}</p>
   
   <div class="hintbox">
     <div class="hintitem"><span class="hlab">REALLY ASKING</span><p>{html.escape(q.hint_ask)}</p></div>
     <div class="hintitem"><span class="hlab">LOOK FIRST</span><p>{html.escape(q.hint_first)}</p></div>
     <div class="hintitem"><span class="hlab">EACH CHOICE IN PLAIN WORDS</span><p class="hnote">now shown in green under each choice — no verdicts spoiled.</p></div>
   </div>
   <div class="explwrap">{exblock}</div>
   <div class="choices">{''.join(rows)}</div>
   <div class="revealrow"><button class="reveal" onclick="rev(this)">Reveal answer</button></div>
   <div class="afterreveal">{disband}{debband}{linkrow}</div>
 </div>
</article>''')
    return ''.join(cards), disagree


def render_keypanels(questions):
    """One expandable panel per set: fingerprint / rule / variation + member table."""
    panels = []
    for k, sd in SETS_DEFS.items():
        members = [q for q in questions if q.set_key == k]
        rows = []
        for q in members:
            give = q.signals[0]
            rows.append(f'''<tr class="krow" onclick="kexp({q.n})" title="Expand Q{q.n} inline">
  <td class="kq">Q{q.n}</td>
  <td class="kg"><mark>{html.escape(give)}</mark></td>
  <td class="kv">{html.escape(q.cue)}</td>
</tr>
<tr class="kexprow" id="kexprow{q.n}" style="display:none"><td colspan="3"><div class="kexpbody" id="kexp{q.n}"></div></td></tr>''')
        links = ' · '.join(f'<a href="{LINKS[l][1]}" target="_blank" rel="noopener">{html.escape(LINKS[l][0])}</a>' for l in sd.links)
        panels.append(f'''<div class="keypanel" style="--sc:{sd.color};--scd:{sd.color_dim}">
 <div class="keygrid">
   <div class="kblock"><div class="klab">Fingerprint — you're in this set when you see</div><p>{html.escape(sd.fingerprint)}</p></div>
   <div class="kblock"><div class="klab">The one rule</div><p>{html.escape(sd.rule)}</p></div>
   <div class="kblock"><div class="klab">What varies between questions</div><p>{html.escape(sd.vary)}</p></div>
 </div>
 <table class="keytable">
  <thead><tr><th>Q</th><th>Giveaway phrase</th><th>This question's variation</th></tr></thead>
  <tbody>{''.join(rows)}</tbody>
 </table>
 <div class="srcs">Backing docs: {links}</div>
</div>''')
    return panels


def render_filterbtns(questions):
    """Set filter pills for the drill toolbar (name shortened before ':'/'&')."""
    setcounts = {}
    for q in questions:
        setcounts[q.set_key] = setcounts.get(q.set_key, 0) + 1
    return ''.join(
        f'<button class="fbtn" data-f="{k}" style="--sc:{sd.color};--scd:{sd.color_dim}" onclick="filt(this)">{sd.name.split(":")[0].split("&")[0].strip()} <b>{setcounts[k]}</b></button>'
        for k, sd in SETS_DEFS.items()
    ), setcounts


def _qlinks(qstr):
    """Q-number jump buttons inside a cheat-code card (CSP-safe: buttons, not hrefs)."""
    return ' · '.join(f"<button class=\"qlink\" data-jumpset=\"{x.strip()}\">{x.strip()}</button>" for x in qstr.split('·'))


def render_patcards():
    """The 12 cheat-code cards."""
    return ''.join(
        f"<div class=\"pat\"><div class=\"pid\">{pid}</div><div class=\"pname\">{name}</div><div class=\"pdesc\">{html.escape(desc)}</div><div class=\"pqs\">Q {_qlinks(qs_)}</div></div>"
        for pid, name, desc, qs_ in PATTERNS
    )


# --- Key view: collapsible sections + sticky nav chips ---

# Static how-to-use guide (first Key section).
GUIDE = """
<div class="keygrid">
 <div class="kblock"><div class="klab">Three views</div><ul class="kul">
  <li><b>Key</b> — this page: cheat codes, one panel per set, every question mapped.</li>
  <li><b>Drill</b> — study all 60 with per-question assists. ☰ All (scroll) or ▭ Single (one at a time), both scoped to the filter pill.</li>
  <li><b>Exam</b> — 1:1 simulation: 60 Q / 120 min, one per screen, pause/resume, per-question timing. Easy / Medium / Hard set how many assists exist.</li>
  <li><b>↺ Reset</b> — clean Drill state (keeps your flags).</li>
 </ul></div>
 <div class="kblock"><div class="klab">The floating help dock (Drill + Exam Easy)</div><ul class="kul">
  <li>Open a question and the <b>dock appears at the side</b> (bottom on smaller screens) — it controls whichever question you're on: watch the Q number, and the matching colored outline on the card itself.</li>
  <li><b>💡 Hint</b> — what's really being asked + where to look first. Never spoils.</li>
  <li><b>🖍 Highlights</b> — the yellow giveaway wash, per question or all.</li>
  <li><b>⌁ Gists</b> — each choice as one-line pseudo-code; per choice (⌁ gist) or per card.</li>
  <li><b>In practice</b> — the winning mechanism + real snippet (nudges toward the answer).</li>
  <li><b>◦ plain</b> — one choice's simple rephrase.</li>
  <li><b>Reveal</b> — everything: verdicts, whys, bands. Assist toggles go inert while revealed.</li>
  <li><b>🔊 Question / Choices / Why</b> — reads it aloud. "Why" speaks the full reasoning (correct pick, each wrong choice, the set rule) and unlocks after Reveal. Tap again to stop.</li>
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


def render_key_sections(questions, keypanels, setcounts):
    """Assemble the Key view: guide → cheat codes → six set panels.
    Returns (key_sections_html, keynav_chips_html)."""
    import html as _h
    codes_body = f"""<p class="hint2">Cross-set elimination rules. Most questions collapse to two choices from the cheat code alone. Q-numbers jump to Drill.</p>
<div class="pats">{render_patcards()}</div>"""
    sec_list = [("guide", "How to use this tool — features & badges", "", GUIDE),
                ("codes", "Cheat codes — the 12 meta-patterns", "", codes_body)]
    for (k2, sd), panel in zip(SETS_DEFS.items(), keypanels):
        cnt = setcounts[k2]
        sec_list.append((f"set{k2}", sd.name, f"--sc:{sd.color};--scd:{sd.color_dim}", f'<span class="kcount">{cnt} questions · fingerprint, rule, and every member in one table</span>' + panel))
    key_sections = ""
    keynav_chips = ""
    for i, (sid, title, style, body) in enumerate(sec_list):
        key_sections += f"""<div class="ksec" id="ksec{i}" {'style="'+style+'"' if style else ''}>
 <button class="ksechead" onclick="ksec({i})"><span class="ksecdot"></span><span class="ksectitle">{_h.escape(title)}</span><span class="caret">▾</span></button>
 <div class="ksecbody">{body}</div>
</div>"""
        short = title.split(" — ")[0]
        chip_style = f' style="{style}"' if style else ''
        chip_cls = 'fbtn' if style else 'fbtn dark'
        keynav_chips += f'<button class="{chip_cls}" id="knavc{i}"{chip_style} onclick="ksecgo({i})">{_h.escape(short)}</button>'
    return key_sections, keynav_chips


# --- JS data payloads + token context ---

def context(questions):
    """Everything page.py needs: token -> replacement string."""
    cards_html, n_disagree = render_cards(questions)
    keypanels = render_keypanels(questions)
    filterbtns, setcounts = render_filterbtns(questions)
    key_sections, keynav_chips = render_key_sections(questions, keypanels, setcounts)
    t1 = sum(1 for q in questions if q.tier == 1)
    t3 = sum(1 for q in questions if q.tier == 3)
    return {
        Token.CARDS: cards_html,
        Token.N_DISAGREE: str(n_disagree),
        Token.FILTER_BUTTONS: filterbtns,
        Token.KEY_SECTIONS: key_sections,
        Token.KEYNAV_CHIPS: keynav_chips,
        Token.TIER1_COUNT: str(t1),
        Token.TIER3_COUNT: str(t3),
        Token.ANSWERS_JS: json.dumps({str(q.n): q.win for q in questions}),
        Token.QMETA_JS: json.dumps({str(q.n): {'s': q.set_key, 'w': q.win} for q in questions}),
        Token.SETMETA_JS: json.dumps({k: {'name': sd.name, 'c': sd.color, 'cd': sd.color_dim, 'rule': sd.rule, 'fp': sd.fingerprint} for k, sd in SETS_DEFS.items()}),
    }
