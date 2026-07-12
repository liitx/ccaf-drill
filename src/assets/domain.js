/* ============================================================================
 * Domain layer — every string the runtime uses, and the accessor classes that
 * preserve the question : answerChoices relationship.
 *
 * Rules (see .claude/skills/drill-conventions):
 *   - No bare strings at call sites: state classes, action keys, storage keys,
 *     scopes, letters, verdicts, and selectors all come from these registries.
 *   - New string? Add a getter here first, then use it.
 *   - New DOM access to a card or choice? Go through QuestionCard/AnswerChoice.
 * ========================================================================== */

/** CSS state classes that live on a question card (<article class="card">). */
class CardState {
  /** Card body is expanded. */
  static get OPEN() { return 'open'; }
  /** Answer revealed: verdicts, whys, bands visible; assists inert. */
  static get REVEALED() { return 'revealed'; }
  /** Hint box unfolded (really-asking / look-first). */
  static get HINTED() { return 'hinted'; }
  /** Giveaway-phrase wash suppressed for this card. */
  static get NO_HIGHLIGHT() { return 'q-nohl'; }
  /** All four choice gists unfolded. */
  static get SHOW_GISTS() { return 'q-showgist'; }
  /** The In-practice block unfolded. */
  static get SHOW_EXAMPLE() { return 'q-showex'; }
  /** This card is the one the floating dock controls (scope ring). */
  static get DOCK_TARGET() { return 'dock-target'; }
}

/** CSS state classes that live on a single answer choice (.choice). */
class ChoiceState {
  /** ◦ plain rephrase unfolded for this choice only. */
  static get SHOW_PLAIN() { return 'showplain'; }
  /** ⌁ gist unfolded for this choice only. */
  static get SHOW_GIST() { return 'showgist'; }
}

/** CSS state classes on buttons/containers (not tied to one card). */
class ControlState {
  /** Generic toggled-on state (chips, switches, dock buttons, tabs, views). */
  static get ON() { return 'on'; }
  /** Inert while revealed / gated (pointer-events off, dimmed). */
  static get DEAD() { return 'dead'; }
  /** A speak button whose audio is currently playing (pulse animation). */
  static get PLAYING() { return 'playing'; }
  /** Selected exam mode button / picked exam choice. */
  static get SELECTED() { return 'sel'; }
  /** Element-level wash on whatever the TTS is currently reading. */
  static get SPEAKING_WASH() { return 'ttsactive'; }
  /** On <body> while the dock is visible (drill bottom padding). */
  static get DOCK_VISIBLE() { return 'dockon'; }
  /** On <body> in dark theme. */
  static get DARK() { return 'dark'; }
}

/** Exam-only state classes (timer urgency, palette cells, per-question assists). */
class ExamState {
  /** Countdown timer under 10 minutes. */
  static get TIMER_LOW() { return 'low'; }
  /** Palette cell: question answered. */
  static get ANSWERED() { return 'answered'; }
  /** Palette cell: question flagged. */
  static get FLAGGED() { return 'flagged'; }
  /** Palette cell: the question on screen. */
  static get CURRENT() { return 'cur'; }
  /** Per-question assist class on the exam question box (as-hint, as-reveal, …). */
  static assist(k) { return 'as-' + k; }
}

/** data-k action keys on dock and exam-assist buttons. */
class DockAction {
  static get HINT() { return 'hint'; }
  static get HIGHLIGHTS() { return 'hl'; }
  static get GISTS() { return 'gist'; }
  static get EXAMPLE() { return 'ex'; }
  static get ASK() { return 'ask'; }
  static get SPEAK_QUESTION() { return 'spq'; }
  static get SPEAK_CHOICES() { return 'spc'; }
  static get SPEAK_WHY() { return 'spr'; }
  static get VOICE_SETTINGS() { return 'cfg'; }
  static get REVEAL() { return 'rev'; }
  /** Exam-only assist keys sharing the same data-k mechanism. */
  static get EXAM_PLAIN() { return 'plain'; }
  static get EXAM_REVEAL() { return 'reveal'; }
  /** True when the key is one of the three speak actions. */
  static isSpeak(k) { return k === this.SPEAK_QUESTION || k === this.SPEAK_CHOICES || k === this.SPEAK_WHY; }
}

/** What the TTS reads: one scope per speak button. */
class SpeechScope {
  /** The verbatim stem. */
  static get QUESTION() { return 'q'; }
  /** All four options (plain rephrase when a choice has SHOW_PLAIN on). */
  static get CHOICES() { return 'ch'; }
  /** The full reveal walkthrough: pick, each wrong choice, set rule. */
  static get REVEAL() { return 'rev'; }
  /** Map a speak DockAction key to its scope. */
  static forDockAction(k) {
    if (k === DockAction.SPEAK_QUESTION) return this.QUESTION;
    if (k === DockAction.SPEAK_CHOICES) return this.CHOICES;
    return this.REVEAL;
  }
}

/** localStorage keys (always accessed through safeGet/safeSet). */
class StorageKey {
  /** '1' once the first-visit tour has been completed or skipped. */
  static get TOUR_DONE() { return 'ccaf_tour_done'; }
  /** Chosen TTS playback rate ('0.8'…'1.4'). */
  static get TTS_RATE() { return 'ccaf_tts_rate'; }
  /** Chosen TTS voice name. */
  static get TTS_VOICE() { return 'ccaf_tts_voice'; }
}

/** data-v verdict values on a rendered choice. */
class Verdict {
  /** The correct answer. */
  static get PICK() { return 'pick'; }
  /** Close 2nd — plausible but loses. */
  static get RUNNER() { return 'runner'; }
  /** Eliminate. */
  static get KILL() { return 'kill'; }
}

/** The four answer letters — the only place they are enumerated. */
class AnswerLetter {
  static get ALL() { return ['A', 'B', 'C', 'D']; }
}

/** Element ids the runtime touches, as lazy getters (resolved per access). */
class Dom {
  static byId(id) { return document.getElementById(id); }
  static get dock() { return this.byId('dock'); }
  static get dockLabel() { return this.byId('dockq'); }
  static get voicePanel() { return this.byId('ttspanel'); }
  static get voiceSelect() { return this.byId('ttsvoice'); }
  static get drillView() { return this.byId('view-drill'); }
  static get examQuestionBox() { return this.byId('exqbox'); }
  static get examAssistBar() { return this.byId('exassist'); }
  static get examRunScreen() { return this.byId('exam-run'); }
  static get examStartScreen() { return this.byId('exam-start'); }
  static get examResultsScreen() { return this.byId('exam-results'); }
  static get examPauseOverlay() { return this.byId('exam-pause'); }
  static get tourOverlay() { return this.byId('tour'); }
  static get spotlightOverlay() { return this.byId('spot'); }
  static get highlightsSwitch() { return this.byId('hlbtn'); }
}

/**
 * Read-model over one rendered question card — the authoritative handle on the
 * question : answerChoices relationship. All 60 cards are rendered once in the
 * drill view; the exam, key expansion, TTS, and Ask-Claude all read through
 * this class instead of hand-building selectors.
 */
class QuestionCard {
  /** @param {Element} el the <article class="card"> element */
  constructor(el) { this.el = el; }

  /** CSS selector for a card by number, optionally scoped to a descendant. */
  static selector(n, descendant) { return '.card[data-n="' + n + '"]' + (descendant ? ' ' + descendant : ''); }
  /** Look a card up by its question number (1–60). */
  static byNumber(n) { return new QuestionCard(document.querySelector(QuestionCard.selector(n))); }
  /** Wrap the card that contains an arbitrary descendant element. */
  static containing(el) { return new QuestionCard(el.closest('.card')); }

  /** Question number, as a number. */
  get number() { return parseInt(this.el.dataset.n, 10); }
  /** Set key (E/V/M/C/S/T). */
  get setKey() { return this.el.dataset.set; }
  /** Correct letter, from the build-time QMETA payload. */
  get winningLetter() { return QMETA[this.number].w; }
  /** The verbatim stem element. */
  get stemEl() { return this.el.querySelector('.stem'); }
  /** The In-practice lead-sentence element (may be null). */
  get exampleLeadEl() { return this.el.querySelector('.explead'); }
  /** Whether the answer is currently revealed. */
  get isRevealed() { return this.el.classList.contains(CardState.REVEALED); }

  /** One AnswerChoice by letter — the question:answerChoice edge. */
  choice(letter) { return new AnswerChoice(this.el.querySelector(AnswerChoice.selector(letter)), letter); }
  /** All four choices in letter order — the 1:4 mapping. */
  get choices() { return AnswerLetter.ALL.map(L => this.choice(L)); }
  /** The choice carrying the correct answer. */
  get winningChoice() { return this.choice(this.winningLetter); }
}

/** Read-model over one answer choice inside a QuestionCard. */
class AnswerChoice {
  /** @param {Element} el the .choice element @param {string} letter A–D */
  constructor(el, letter) { this.el = el; this.letter = letter; }

  /** CSS selector for a choice by letter (relative to its card). */
  static selector(letter) { return '.choice[data-l="' + letter + '"]'; }

  /** Verdict for this choice (Verdict.PICK/RUNNER/KILL). */
  get verdict() { return this.el.dataset.v; }
  /** Verbatim option text element. */
  get textEl() { return this.el.querySelector('.ctext'); }
  /** ◦ plain rephrase element. */
  get plainEl() { return this.el.querySelector('.cplain'); }
  /** ⌁ gist element. */
  get gistEl() { return this.el.querySelector('.gist'); }
  /** Reveal reasoning element (spoken by 🔊 Why). */
  get whyEl() { return this.el.querySelector('.cwhy'); }
  /** Whether the plain rephrase is currently unfolded. */
  get isPlainShown() { return this.el.classList.contains(ChoiceState.SHOW_PLAIN); }
}
