"""Domain structs for the CCA-F drill generator.

Every field is classified by use case:
  [render]  emitted into HTML (drill card, key table, exam clone)
  [logic]   drives filtering, state, or scoring at runtime
  [tts]     spoken by the 🔊 buttons (scraped from the rendered DOM)
  [export]  included in the 🤖 Ask Claude JSON packet (scraped from the DOM)
[tts] and [export] always ride on a [render] field — the page scrapes cards
at runtime, so anything spoken or exported must first be rendered.
"""
from dataclasses import dataclass
from pathlib import Path
import json

from .constants import ANSWER_LETTERS

DATA_DIR = Path(__file__).resolve().parent.parent / 'data'


@dataclass(frozen=True)
class Example:
    """The 'In practice' block: the winning mechanism made concrete."""
    mech: str   # [render] mechanism label pill (e.g. 'AGENT SDK · TASK TOOL PROMPT')
    lead: str   # [render][tts] lead sentence; spoken at the end of 🔊 Why
    snip: str   # [render][export] code/JSON snippet; never spoken (reads terribly aloud)


@dataclass(frozen=True)
class Choice:
    """One answer option (A–D) with all of its assist layers."""
    letter: str    # [logic] identity; the data-l DOM hook for dock, exam, and tts
    text: str      # [render][tts][export] verbatim choice text
    plain: str     # [render][tts][export] ◦ plain — simple-words rephrase
    gist: str      # [render][export] ⌁ gist — one-line pattern-fit pseudo-code
    verdict: str   # [logic] 'W' pick | 'R' close-2nd | 'X' kill → badge, strike, downfall stats
    why: str       # [render][tts][export] reveal reasoning; the core of 🔊 Why


@dataclass(frozen=True)
class Question:
    """One drill question, fully joined across the five data files."""
    n: int                      # [logic] 1–60 identity; data-n DOM hook everywhere
    stem: str                   # [render][tts][export] verbatim question text
    set_key: str                # [logic] E/V/M/C/S/T — filtering, colors, exam scoring
    win: str                    # [logic][export] correct letter; drives 🔊 Why script
    marked: str                 # [logic] letter pre-marked in the team doc ('' if none)
    tier: int                   # [logic] 1 docs-verified / 2 guidance / 3 debate → badge + filter
    cue: str                    # [render][export] one-line skim takeaway above the stem
    signals: tuple              # [render][export] giveaway phrases → chips + stem <mark> wash
    choices: dict               # [render] letter → Choice
    hint_ask: str               # [render][export] 'really asking' hint (never spoils)
    hint_first: str             # [render][export] 'look first' hint (never spoils)
    example: Example            # [render] the In-practice block
    debate: str                 # [render] T3 wording-sensitivity note ('' unless tier 3)
    links: tuple                # [render] doc-link keys shown after reveal

    @property
    def disputed(self):
        """[logic] True when the team doc's mark disagrees with the verified pick."""
        return bool(self.marked) and self.marked != self.win


@dataclass(frozen=True)
class SetDef:
    """One of the six topic sets — the color-coded backbone of the whole tool."""
    key: str           # [logic] E/V/M/C/S/T — data-set hook, filters, exam scoring
    name: str          # [render] full display name (pills, key panels, results)
    color: str         # [render] light-theme accent (--sc)
    color_dim: str     # [render] dark-theme accent (--scd); also the dock scope ring
    fingerprint: str   # [render] 'you're in this set when you see…' (key panel)
    rule: str          # [render][tts][export] the one rule; spoken at the end of 🔊 Why
    vary: str          # [render] what varies between member questions (key panel)
    links: tuple       # [render] doc-link keys backing the set


def load_questions(tier, debate, qlinks):
    """Join questions/analysis/hints/gists/examples into Question structs.

    Order is preserved from questions.json — it defines card order everywhere.
    tier/debate/qlinks come from content.py (authored, not data-file, knowledge).
    """
    qs = json.load(open(DATA_DIR / 'questions.json'))
    an = json.load(open(DATA_DIR / 'analysis.json'))
    ex = json.load(open(DATA_DIR / 'examples.json'))
    hp = json.load(open(DATA_DIR / 'hints.json'))
    gist = json.load(open(DATA_DIR / 'gists.json'))
    hints, plain = hp['hints'], hp['plain']

    out = []
    for q in qs:
        n = q['n']
        k = str(n)
        a = an[k]
        choices = {
            L: Choice(
                letter=L,
                text=q['choices'][L],
                plain=plain[k][L],
                gist=gist[k][L],
                verdict=a['v'][L]['verdict'],
                why=a['v'][L]['why'],
            )
            for L in ANSWER_LETTERS
        }
        out.append(Question(
            n=n,
            stem=q['stem'],
            set_key=a['set'],
            win=a['win'],
            marked=q['marked'] or '',
            tier=tier[n],
            cue=a['cue'],
            signals=tuple(a['sig']),
            choices=choices,
            hint_ask=hints[k]['ask'],
            hint_first=hints[k]['first'],
            example=Example(mech=ex[k]['mech'], lead=ex[k]['lead'], snip=ex[k]['snip']),
            debate=debate.get(n, ''),
            links=tuple(qlinks.get(n, ())),
        ))
    return out
