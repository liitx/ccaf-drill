# CCA-F Drill — Project Handoff

**For:** Liitx (Aksana) + any future Claude session or Claude Code instance continuing this work.
**Live site:** https://liitx.github.io/ccaf-drill/ (GitHub Pages, repo `liitx/ccaf-drill`, public, `index.html` at main root)
**Artifact:** one self-contained HTML file (~490KB), no dependencies, no build step at runtime.
**Source of truth for regeneration:** `ccaf-drill-source.zip` (generator + data + full test suites). The build container is ephemeral — this zip IS the project.

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

**Generator:** `build2.py` (Python) reads five JSON data files and emits the entire single-file app. Never hand-edit the HTML — edit the generator/data and rebuild (`python3 build2.py`).

- `questions.json` — all 60 stems + choices, verbatim 1:1 from the docx (programmatically verified: every stem/choice string must appear in the output; content check is part of regression).
- `analysis.json` — per question: set, winning letter, per-choice verdicts (`pick`/`runner`/`kill`) + why-lines, skim cue, giveaway signal phrases, tier, disputed flag.
- `hints.json` — per question: "really asking" + "look first" (never spoils) + 240 neutral plain-words rephrases (one per choice).
- `gists.json` — 240 one-line pseudo-code pattern-fit gists (one per choice).
- `examples.json` — 60 "In practice" blocks: mechanism label, lead sentence, code/JSON snippet for the winning approach.

**Output:** `/mnt/user-data/outputs/CCA-F_Drill_Key_and_60Q.html` → deployed as `index.html`.

## 4. Feature inventory (current state)

### Key view
Collapsed-by-default sections with sticky colored nav chips: **How to use this tool** (bulleted guide incl. Disputed-8 explanation and dock docs) → **Cheat codes** (Q-number buttons jump to Drill scoped to that question's set) → six set panels (fingerprint / one rule / member table). Table rows expand **inline** (clone of the drill card body in revealed state + "Open in Drill ↗"). No answer column, no show/hide-answers bar (removed by request). No footer (removed by request).

### Drill view
- **Toolbar v3** (post-UX-research redesign): three labeled clusters — **Set** (single-select chips, ✓-filled in set color) · **Narrow** ("+"-prefixed chips that genuinely COMBINE with the set: Flagged / Disputed 8 / Debate 3, tap again to clear, live "showing N of 60" readout) · **View** (joined segmented ☰All|▭Single, Highlights dot-switch, divider, ghost actions Hide answers / ↺ Reset). Control-type differentiation per Nielsen/HIG/Material: chips=filters, segmented=exclusive modes, switch=state, ghost=one-shot actions.
- **Floating help dock** (bottom-fixed pill): appears when a question is open, labeled with the question it controls (Q-number), follows scroll (All view) / navigation (Single view). Buttons: 💡 Hint · 🖍 HL · ⌁ Gists · In practice · 🤖 Ask · Reveal. Fixed position = physically cannot shift.
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

All in `/home/claude` in the container; **archived in `ccaf-drill-source.zip`**. Playwright + Chromium. Run: `node smokeN.js`. Every suite pre-seeds `localStorage.ccaf_tour_done='1'` via `addInitScript` (or the tour overlay intercepts clicks).

| Suite | Covers |
|---|---|
| smoke.js (33) | Core: tabs, key rows, flags, filters (combinable-aware), jump positioning, mobile overflow |
| smoke2.js | Key tables, highlight wash, theme toggle |
| smoke3.js (12) | Hint flow (dock-based), no-spoil guarantees, 240 plains/60 hintboxes |
| smoke4.js (31) | Full exam simulation: timer, pause timing, palette, flags, submit, analytics, review clones (rect-height assertions) |
| smoke5.js (12) | **Mark-color invariant** (7 states × themes), scoped toggles, exam modes |
| smoke6.js (10) | Drill toggles via dock, exam scroll behavior (pick→Next, nav→top) |
| smoke7.js (13) | Per-choice gists, dock button sizing, reveal-shows-everything, dead-while-revealed |
| smoke8.js (14) | In-Practice position, scroll-jump regressions, single/all views, reset, card-top anchoring for reveal |
| smoke9.js | Key sections, guide content, inline row expansion (rendered-size checks) |
| smoke10.js (20) | Guide bullets, set-scoped cheat links, Ask Claude payload (clipboard read, JSON parse, field presence, instruction contract) |
| smoke11.js (10) | **CSP guards**: zero `javascript:` hrefs / inline-handler anchors, chip color consistency, sticky-clearance |
| smoke12.js (17) | Mobile (iPhone 12 + touch): overflow, sticky overlap, 40px/28px tap floors, 16px font floor, pinned timer |
| smoke13.js (17) | Tour: first-visit, persistence (needs http server: `cd outputs && cp <app> index.html && python3 -m http.server 8931`), storage-blocked resilience, mobile fit |
| smoke14.js (16) | Toolbar clusters, spotlight end-to-end (ring tracking through all 10 steps), cleanup, mid-exit restore |
| smoke15.js (15) | Toolbar v3 control languages, **combinable Set×Narrow** (M∩Disputed = {2,12,18,41}), switch state, reset |
| smoke16.js (22) | **Dock**: lifecycle, pixel-still card anchoring through all toggles, fold animation, state sync, scroll tracking, Ask-from-dock |
| smoke17.js (51) | **State-isolation matrix**: every component toggle (dock ×5, per-choice ×2, in-card reveal, toolbar chips/switch, exam assists ×5) asserts ONLY its designated state changes — fingerprint diff over card classes, mark backgrounds, chips, dock states, filters — plus reversibility, neighbor-card immunity, exam-stem stays highlight-free, and no lingering button focus |
| contrast.js | WCAG audit, 84 elements × both themes |
| mobile_audit.js | Raw sweep at 320/375/414: overflow culprits, sticky overlap, tiny taps |
| harness.html | Sandboxed iframe (`allow-scripts` only) mimicking the claude.ai artifact CSP — use for anything click/navigation related |

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
