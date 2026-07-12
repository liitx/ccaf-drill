# CCA-F Drill — Project Handoff

**For:** Liitx (Aksana) + any future Claude session or Claude Code instance continuing this work.
**Live site:** https://liitx.github.io/ccaf-drill/ (GitHub Pages, repo `liitx/ccaf-drill`, public, `index.html` at main root)
**Artifact:** one self-contained HTML file (~490KB), no dependencies, no build step at runtime.
**Source of truth:** this repo (generator in `src/`, data in `data/`, tests in `tests/`). The old `ccaf-drill-source.zip` container archive is obsolete since the 2026-07-11 modular refactor.

---

## 1. Intent

Study tool for the Anthropic **CCA-F exam** (Claude Certification Associate – Foundations), built from the team's `Claude_Practice_Questions.docx` (60 questions, 4 choices each, 10 answers pre-marked in the source images). Design goals, in priority order:

1. **Pattern-first learning** — the exam's core trap is choosing bolt-on workarounds over structural fixes. The tool teaches recognition (giveaway phrases → set → rule) before recall.
2. **ADHD-friendly** — skim-first everywhere: cues, highlight chips, one-line gists, plain-words rephrases; every assist individually toggleable; minimal forced reading.
3. **Independent analysis** — answers were derived and verified BEFORE comparing to the team's marks, so disagreements are signal, not contamination.
4. **1:1 exam rehearsal** — simulator matches the real thing (60Q/120min, proctored on Skilljar, 720/1000 scaled pass; one-question-per-screen is the best-supported read of Skilljar's player but is NOT publicly documented — confirm with someone who sat it).

## 2. The intellectual content (do not lose this)

### Answer key (my verified/derived picks, all 60)
Q1:B Q2:B Q3:A Q4:D Q5:D Q6:C Q7:C Q8:D Q9:C Q10:B Q11:C Q12:D Q13:D Q14:C Q15:A Q16:D Q17:C Q18:C Q19:D Q20:A Q21:C Q22:D Q23:C Q24:A Q25:B Q26:C Q27:B Q28:B Q29:B Q30:D Q31:B Q32:B Q33:C Q34:D Q35:D Q36:C Q37:C Q38:B Q39:A Q40:D Q41:D Q42:D Q43:A Q44:C Q45:B Q46:D Q47:C Q48:C Q49:D Q50:C Q51:C Q52:B Q53:C Q54:A Q55:B Q56:A Q57:D Q58:A Q59:C Q60:D

### The 6 sets
- **E — Extraction & Schema** (10): 1, 5, 8, 9, 10, 15, 19, 34, 40, 59
- **V — Evals, Review & Batch** (5): 21, 28, 55, 58, 60
- **M — Multi-Agent Orchestration** (15): 2, 3, 12, 13, 18, 20, 23, 26, 29, 30, 35, 41, 43, 44, 45
- **C — Claude Code: Sessions & Exploration** (13): 7, 11, 14, 16, 17, 27, 31, 36, 38, 39, 51, 52, 56
- **S — Support Agent: Tools & Escalation** (14): 4, 6, 22, 24, 32, 33, 37, 42, 47, 48, 49, 50, 53, 57
- **T — MCP & Tool Design** (3): 25, 46, 54

### The 12 cheat codes (cross-set elimination rules)
P1 FIX THE SOURCE · P2 STRUCTURE SURVIVES · P3 HARD RULE→CODE · P4 SUBAGENTS ARE SEALED · P5 GOALS NOT SCRIPTS · P6 SESSION TRIAGE · P7 EXTREMES DIE · P8 MODEL IN THE LOOP · P9 DESCRIPTIONS ARE THE API · P10 RETRY≠NEW INFO · P11 MATCH COST TO SLA · P12 TRUST BUT SEGMENT. (Full text + member questions live in `analysis`/generator data and render in the Key.)

### Disputed 8
The source doc arrived with 10 answers marked. **8 disagree with the verified pick: Q2, 12, 15, 17, 18, 22, 41, 42** — every disagreement is the same trap (bolt-on patch over structural fix). Q29 and Q35 were marked and agree. These 8 are the highest-yield drill list.

### Confidence tiers
- **T1 DOCS-VERIFIED (11):** Q2, 5, 7, 14, 30, 37, 39, 43, 54, 55, 58 — confirmed via web search against official docs/spec (tool_choice, Batch API 24h/50%/custom_id, MCP `isError`, Agent SDK sessions/fork/subagents/allowedTools).
- **T3 DEBATE (3):** Q18, 28, 56 — wording-sensitive, two defensible reads.
- Everything else **T2 GUIDANCE** (published best practice).

### Team-taxonomy comparison (done)
Converged with the team's own pattern write-up. Their gaps: no batch/eval category; their "structure > prompt" rule wrongly kills few-shot winners (Q8, 9, 15, 19, 34); their "throw out immediately" heuristic misfires on Q49.

## 3. Architecture

**Generator (modular, 2026-07-11 refactor):** `python3 build.py` assembles `index.html` from `src/` + `data/`. Never hand-edit the HTML.

- `build.py` — entry point.
- `src/constants.py` — `ANSWER_LETTERS`, `Verdict` enum (css_class/badge), `Token` enum for template placeholders.
- `src/assets/domain.js` — **no-bare-strings layer** (2026-07-11): registry classes with static getters (`CardState`, `ChoiceState`, `ControlState`, `ExamState`, `DockAction`, `SpeechScope`, `StorageKey`, `Verdict`, `AnswerLetter`, `Dom`) plus the relationship accessors `QuestionCard`/`AnswerChoice` (the explicit question:answerChoices 1:4 mapping — exam, TTS, Ask-Claude, key expansion all read cards through them). Rules + workflow live in `.claude/skills/drill-conventions/SKILL.md`; grep gate: zero `classList.*('` literals in app.js.
- `src/models.py` — dataclass structs (`Question`, `Choice`, `Example`, `SetDef`) joining the five data files; every field is classified by use case (`[render]` / `[logic]` / `[tts]` / `[export]`).
- `src/content.py` — authored knowledge: SETS, KEYS (fingerprint/rule/vary), TIER, DEBATE, QLINKS, LINKS, 12 PATTERNS, verdict labels. Exposed as `SETS_DEFS` structs.
- `src/render.py` — all Python-side HTML: drill cards, key panels, guide, cheat codes, toolbar pills, JS data payloads. `context()` returns token→string.
- `src/page.py` — splices rendered fragments into the static assets by plain `str.replace` tokens (`__CARDS__`, `__ANSWERS_JS__`, …). **No f-string page template anymore** — the brace-doubling/escape-bug class (§7.2) is structurally gone.
- `src/assets/` — `head.html`, `styles.css`, `body.html`, `app.js`, `tail.html`. CSS and JS are real files: edit normally, `node --check src/assets/app.js` directly.
- `data/` — `questions.json` (60 stems+choices, verbatim), `analysis.json` (verdicts/whys/cues/signals), `hints.json`, `gists.json`, `examples.json`.

The refactor was verified **byte-identical**: old and new pipelines produced the same `index.html` before the old generator was deleted.

### Flutter port (`app/`, 2026-07-11)
1:1 Dart port, enum-first per the claudart Type System Laws. `app/lib/domain/` = enhanced enums (TopicSet/Verdict/AnswerLetter/ConfidenceTier/PatternCode/DocLink/AssistAction+SpeechScope/ExamMode/StorageKey/NarrowFilter/AppRoom) + `Question`/`Choice`/`WorkedExample` entities; `data/` = parse-once `AssetQuestionRepository` over the same `data/*.json` (symlinked as assets); `application/` = drill/exam/tts/settings cubits; `presentation/` = theme from styles.css tokens + Key/Drill/Exam/tour views, dock rail ≥1100px. Content-bearing enums were **generated from src/content.py** (no retranscription). Tests: enum matrices as exhaustive switch expressions, repository invariants (4 choices, one pick), cubit behavior, widget smoke, and `test/parity/web_parity_test.dart` which diffs the answer key against `../index.html`. Audited via a claudart session (handoff archived in `~/dev/dev_tools/claude/ccaf-drill/`); findings applied: AppRoom enum, unmodifiable choices, TTS script tests. Known gap: the 11-step spotlight walkthrough is web-only (Dart ships the 4-slide tour).

## 4. Feature inventory (current state)

### Key view
Collapsed-by-default sections with sticky colored nav chips: **How to use this tool** (bulleted guide incl. Disputed-8 explanation and dock docs) → **Cheat codes** (Q-number buttons jump to Drill scoped to that question's set) → six set panels (fingerprint / one rule / member table). Table rows expand **inline** (clone of the drill card body in revealed state + "Open in Drill ↗"). No answer column, no show/hide-answers bar (removed by request). No footer (removed by request).

### Drill view
- **Toolbar v3** (post-UX-research redesign): three labeled clusters — **Set** (single-select chips, ✓-filled in set color) · **Narrow** ("+"-prefixed chips that genuinely COMBINE with the set: Flagged / Disputed 8 / Debate 3, tap again to clear, live "showing N of 60" readout) · **View** (joined segmented ☰All|▭Single, Highlights dot-switch, divider, ghost actions Hide answers / ↺ Reset). Control-type differentiation per Nielsen/HIG/Material: chips=filters, segmented=exclusive modes, switch=state, ghost=one-shot actions.
- **Floating help dock v4**: at ≥1100px viewports it is a **right-side vertical rail** (92px, vertically centered — the 900px content column leaves a free gutter there, so nothing reflows); below 1100px it stays the bottom-fixed pill, mobile rules unchanged. Buttons: 💡 Hint · 🖍 HL · ⌁ Gists · In practice · 🤖 Ask · 🔊 Question / Choices / Why · Reveal. **Scope binding:** the active card gets `.dock-target` (a box-shadow ring in its set's color) and the rail's top border + Q-label match — dockSync owns both. **Gentle snap** (All view, >560px): a debounced scroll-end handler (`snapToCard`) magnetizes the active card to its `scroll-margin-top` alignment when it settles within 90px; it is JS, NOT CSS scroll-snap (CSS snap containers re-snap on layout change and would fight `keepCardAnchored` — same war as native scroll anchoring). `keepCardAnchored`/`keepAnchored` set an 800ms `SNAPHOLD` so folds never trigger snap drift.
- **Text-to-speech** (Web Speech API, no deps): 🔊 Question reads the stem, 🔊 Choices reads all four options (uses the plain rephrase for a choice whose ◦ plain is on), 🔊 Why reads the full reveal reasoning — correct letter + its why, each wrong choice tagged close-second/eliminate + its why, the in-practice lead, the set rule. 🔊 Why is `.dead` until revealed (dock) / until the reveal assist is on (exam); hiding the answer stops and re-gates it. Speech is scraped from the card DOM at click time (`speakText`), same pattern as Ask Claude. Utterances are chunked ≤~190 chars (`ttsChunks`) around Chrome's silent long-utterance cutoff; `TTSID` sequencing prevents stale onend callbacks from resurrecting a cancelled queue. Tap again = stop; tab switch, single-view nav, exam nav, reset, and hide-answers all `ttsStop()`. Unsupported browsers: speak buttons hidden at init. Exam: Easy gets all three speak buttons, Medium gets question+choices, Hard none.
- **TTS v2 (voice/speed/follow-along):** ⚙ Voice in the dock opens a fixed settings panel (`#ttspanel`) — voice `<select>` (**Google US / UK Female / UK Male only** when Chrome exposes them, ranked in that order; falls back to all English voices in browsers/sessions without Google voices — note Playwright-launched Chrome uses a fresh profile and never loads Google network voices, so automated verification of the Google branch uses the exact real voice names in the smoke18 stub) + rate chips 0.8/1/1.2/1.5× + test button; persisted via `safeGet/safeSet` (`ccaf_tts_voice`, `ccaf_tts_rate`). Speech is segment-based (`speakSegs` → `ttsQueueFrom`): each spoken chunk carries its source element + offsets, `normMap` maps whitespace-normalized text back to raw DOM offsets, and on utterance start a **CSS Custom Highlight** (`::highlight(ttsline)`, word-level `ttsword` via `onboundary` where the voice reports it) paints the sentence being read — zero DOM mutation, text color never changes (mark invariant safe); non-Highlight-API browsers get an element-level `.ttsactive` wash. Panel hides with the dock.
- **No-shift system:** all assist content (hintbox, plains, gists, in-practice) uses animated **fold** (max-height+opacity ~280ms) instead of display toggling, and every toggle/reveal anchors the **active card's top edge** to the same viewport pixel — the text being read never moves; new content unfolds below. `keepCardAnchored` is the primitive; native scroll anchoring is disabled (`overflow-anchor:none`).
- Per-choice ◦ plain / ⌁ gist mini-toggles remain in each choice. In-Practice sits under the stem, above choices. Reveal shows everything and inerts the assists (dock buttons `.dead`, minis pointer-events:none). Flags (⚑) persist through Reset; everything else resets.
- **🤖 Ask Claude** (dock): copies instruction + full JSON packet (verbatim question, choices with plain/gist/verdict/why, signals, cue, hint, correct answer, tier, set rule, in-practice). Instruction demands: plain simple language, code lines <45 chars (no horizontal scroll), one line per wrong choice, memory hook, no restating JSON. **No apostrophes in that string** (see gotchas).

### Exam view
Modes: **Easy** (5 per-question assist toggles incl. reveal) / **Medium** (hint+plain) / **Hard** (1:1, nothing). 120:00 countdown; pause hides the question and freezes both clocks; resume = same question; per-question timing excludes pauses; 60-cell palette (answered/flagged/current); picking a choice smooth-scrolls Next into view, navigation returns to top; auto-submit at 0:00. Results: score %, scaled/1000 vs 720, sets ranked weakest-first with bars + avg time, **downfall analysis** (miss concentration by set + whether wrong picks were close-2nds vs kills + blanks nudge), 60-row review (flags carried in, per-question times, your-pick tag) with expandable detail = drill-body clone + per-set how-to-think.

### Onboarding
- **4-slide tour** on first visit (safe-storage persisted; degrades gracefully where localStorage is blocked — never crashes): three rooms → study loop → training wheels → badges/colors. Skippable; "? Tour" tab button replays it.
- Final CTA "Walk me through the screen →" launches the **10-step spotlight**: highlight ring + tooltip over live components (tabs → three toolbar clusters → card header → cue/chips → dock → per-choice minis → Reveal → Exam tab). Auto-navigates views, cleans up after itself, restores prior view on mid-exit, finishes in the Key guide. Mobile: tooltip pinned bottom.

### Theming & mobile
- Dark default. Palette deliberately muted per user's eyes: `--paper:#0C0E0F`, `--ink:#ADB5AC` (softened twice from near-white — halation), `--stemc:#98A199`, wash `rgba(228,203,92,.17)`. **Highlight = translucent wash; text color NEVER changes** (mark-color invariant, test-enforced across 7 states). Light mode intact; all 84 audited elements pass contrast in both themes.
- Mobile (≤560px): 44px tap targets (HIG/WCAG 2.5.5), 16px body floor, nav chrome un-stuck (only exam timer bar stays pinned), palette 44×42, dock buttons 44px with horizontal scroll.

## 5. Test infrastructure

Playwright + Chromium, local: `npm install playwright --no-save && npx playwright install chromium`. Run everything: `tests/run.sh`. One file: `node tests/<name>.spec.js`.

`tests/harness.js` is the shared struct: `chromium/devices`, `URL` (built index.html), `A` assert, `run(name, fn)` sequential suite runner, `withServer(fn)` (spawns http.server 8931 for localStorage-origin suites). Each spec file groups the former smoke suites by domain — bodies preserved verbatim in the 2026-07-11 consolidation (360 assertions before = 360 after):

| Spec | Former suites | Covers |
|---|---|---|
| core.spec.js (85) | smoke 1/2/9/10/11 | tabs, key rows+sections, flags, filters, theme, guide, Ask-Claude payload, CSP guards |
| drill.spec.js (49) | smoke 3/6/7/8 | hint flow, no-spoil, dock toggles, per-choice gists, in-practice, anchoring, reset |
| toolbar.spec.js (27) | smoke 15/5 | toolbar v3 control languages, Set×Narrow, mark-color invariant, exam modes |
| exam.spec.js (31) | smoke 4 | full exam simulation: timer, pause, palette, submit, analytics, review clones |
| dock.spec.js (67) | smoke 16/18 | dock lifecycle, pixel-still anchoring, TTS (stubbed speechSynthesis), side rail, scope binding, snap, voice panel |
| onboarding.spec.js (33) | smoke 13/14 | tour first-visit + persistence (auto http server), spotlight end-to-end (11 steps) |
| isolation.spec.js (51) | smoke 17 | state-isolation matrix: every toggle changes ONLY its designated state |
| mobile.spec.js (17) | smoke 12 | iPhone 12 + touch: overflow, sticky overlap, tap/font floors, pinned timer |
| audits/contrast.js | — | WCAG audit, 80 elements × both themes |
| audits/mobile_audit.js | — | raw sweep at 320/375/414 |
| harness.html | — | sandboxed iframe mimicking the claude.ai artifact CSP |

**Testing lessons burned in (keep honoring these):**
- **Vacuous passes are the #1 failure mode.** Caught ≥3 times: a syntax error killing the whole page script made click-tests "pass" (nothing happened); existence checks passed on invisible elements; a patch script crashing before write left the old file "passing." Rules: assert zero pageerrors in every suite; assert rendered size (`getBoundingClientRect().height > 0`), not existence or computed display; verify a patch actually landed before trusting a green run.
- Fold-animated elements need ~320–400ms waits before height assertions; they're in-flow, so `offsetParent` no longer distinguishes hidden (use height+opacity).
- `activeCard()` is viewport-aware — tests must scroll the target card into view before dock actions, like a real user.
- Smooth-scroll is global; scroll-position assertions need settle-polling or instant-behavior calls.

## 6. Deployment

- Repo: `liitx/ccaf-drill` (public). Pages from main branch root. Deployed via **Claude Code on Liitx's machine** (her `gh` auth; no tokens in chat — decided deliberately after weighing the trade-off).
- **Update flow:** drop new `index.html` into the local repo → tell Claude Code: "replace index.html, commit, push" → Pages redeploys in ~1 min. `ccaf-drill-update.zip` always contains just the fresh `index.html`.
- No GitHub MCP connector exists in the registry (checked); Google Drive/Gmail/Calendar are the only connected tools and can't touch GitHub.
- liitx.com domain exists but was deliberately not used (owner chose plain Pages; subdomain-CNAME plan documented in chat if ever wanted: `drill.liitx.com CNAME liitx.github.io`).

## 7. Gotchas & war stories (each cost real debugging time)

1. **claude.ai artifact sandbox blocks `javascript:` URLs** — and containers may intercept `<a>` clicks entirely. All in-page navigation now uses `<button>` elements + a delegated document-level click listener on `data-jumpset`/`data-jump`. Guard test enforces zero handler-anchors. The artifact preview ≠ the real browser; harness.html approximates it, but the live site is the final gate.
2. **String-escaping in the generator**: the page is one giant Python f-string. `\n` must be `\\n`, braces doubled, and one apostrophe (`tool's`) once terminated a JS string and silently killed the entire app script. An invisible **soft-hyphen** (U+00AD) inside a hex color invalidated a CSS custom property (transparent cards). Validate after every build: extract the `<script>` and run `node --check`.
3. **CSS specificity trap**: `body.dark mark` (0,1,2) beats `.exstem mark` (0,1,1) — caused dark-on-dark text wherever highlight backgrounds were stripped. Root fix: highlights are a translucent wash and mark text is always `color:inherit`. Never reintroduce text-color changes on marks.
4. **Browser scroll anchoring fights manual compensation** (double-adjustment jumps) — it's disabled globally; `keepCardAnchored`/`keepAnchored` are the only authorities.
5. **Anchor the reading position, not the clicked control** — animated folds grow content for ~280ms after an instant compensation, so button-anchored reveal drifted 368px. Card-top anchoring is immune to internal growth.
6. **Clone visibility**: cloned card bodies need the `open` class (`card open revealed hinted` wrapper) or they render at zero height — exam-review details were invisible for several rounds because a test asserted existence instead of size.
7. Skilljar one-per-screen is an informed assumption, not documented fact.
8. **Stale focus rings read as phantom "highlights"** on clicked buttons (dark theme makes the default ring look like a state). Fixed: pointer clicks blur buttons (`e.detail > 0` guard preserves keyboard focus), `:focus-visible` provides the accessible keyboard ring. smoke17 asserts `document.activeElement === body` after every click.

## 8. Possible next steps (unrequested, if ever wanted)
- Persist flags/exam history via localStorage (safe wrappers already exist) now that it lives on Pages.
- Confirm real exam navigation with a teammate; one-line flip if it's scroll-based.
- Keyboard shortcuts (1–4 pick, R reveal, arrows navigate) — cheap on the existing structure.
- Spaced-repetition ordering for the Flagged list.
