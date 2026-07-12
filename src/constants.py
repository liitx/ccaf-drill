"""Generator-side constants — the Python mirror of assets/domain.js.

Anything enumerated here must stay in sync with the JS registries: the
letters, verdict codes, and template tokens are the contract between the
build (Python) and the runtime (JS + DOM data attributes).
"""
from enum import Enum

# The four answer letters, in display order — the only Python enumeration.
ANSWER_LETTERS = ('A', 'B', 'C', 'D')


class Verdict(str, Enum):
    """Analysis verdict codes as stored in data/analysis.json.

    The value is the raw JSON code; css_class becomes the data-v attribute
    (matching JS Verdict.PICK/RUNNER/KILL) and badge is the rendered label.
    """
    PICK = 'W'      # the correct answer
    RUNNER = 'R'    # close 2nd — plausible but loses
    KILL = 'X'      # eliminate

    @property
    def css_class(self):
        """data-v value on the rendered choice (consumed by JS Verdict)."""
        return {Verdict.PICK: 'pick', Verdict.RUNNER: 'runner', Verdict.KILL: 'kill'}[self]

    @property
    def badge(self):
        """Verdict badge text shown on reveal."""
        return {Verdict.PICK: '✓ PICK', Verdict.RUNNER: '△ CLOSE 2nd', Verdict.KILL: '✕ OUT'}[self]


class Token(str, Enum):
    """Placeholder tokens page.py replaces inside body.html / app.js."""
    CARDS = '__CARDS__'
    N_DISAGREE = '__N_DISAGREE__'
    FILTER_BUTTONS = '__FILTERBTNS__'
    KEY_SECTIONS = '__KEY_SECTIONS__'
    KEYNAV_CHIPS = '__KEYNAV_CHIPS__'
    TIER1_COUNT = '__T1__'
    TIER3_COUNT = '__T3__'
    ANSWERS_JS = '__ANSWERS_JS__'
    QMETA_JS = '__QMETA_JS__'
    SETMETA_JS = '__SETMETA_JS__'
