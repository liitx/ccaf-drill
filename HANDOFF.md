# CCA-F Drill — Project Handoff

**For:** Liitx (Aksana) + any future Claude session, model, or agent continuing this work. **Read this file first**, then `.claude/skills/drill-conventions/SKILL.md` (the working rules), then skim `UI_PARITY.md` (design decisions + deliberate divergences).
**Live site:** https://liitx.github.io/ccaf-drill/ — the **Flutter web app built from this repo** (root-level Flutter project), served by GitHub Pages from `main:/docs`.
**Source of truth:** this repo. `data/*.json` holds all 60 questions + analysis; `lib/` is the app; `docs/` is the built site (never hand-edit).
**History:** the project began as a Python-generated single-file web app; it was ported 1:1 to Flutter/Dart and the generator was retired on 2026-07-11. The last commit with the web app intact is git tag **`web-final`** — everything about the old generator, its Playwright suites, and its war stories lives there and in git history. Nothing in the current tree depends on it.

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
P1 FIX THE SOURCE · P2 STRUCTURE SURVIVES · P3 HARD RULE→CODE · P4 SUBAGENTS ARE SEALED · P5 GOALS NOT SCRIPTS · P6 SESSION TRIAGE · P7 EXTREMES DIE · P8 MODEL IN THE LOOP · P9 DESCRIPTIONS ARE THE API · P10 RETRY≠NEW INFO · P11 MATCH COST TO SLA · P12 TRUST BUT SEGMENT. (Full text + member questions live in the `PatternCode` enum, lib/domain/pattern_code.dart, and render in the Key.)

### Disputed 8
The source doc arrived with 10 answers marked. **8 disagree with the verified pick: Q2, 12, 15, 17, 18, 22, 41, 42** — every disagreement is the same trap (bolt-on patch over structural fix). Q29 and Q35 were marked and agree. These 8 are the highest-yield drill list.

### Confidence tiers
- **T1 DOCS-VERIFIED (11):** Q2, 5, 7, 14, 30, 37, 39, 43, 54, 55, 58 — confirmed via web search against official docs/spec (tool_choice, Batch API 24h/50%/custom_id, MCP `isError`, Agent SDK sessions/fork/subagents/allowedTools).
- **T3 DEBATE (3):** Q18, 28, 56 — wording-sensitive, two defensible reads.
- Everything else **T2 GUIDANCE** (published best practice).

### Team-taxonomy comparison (done)
Converged with the team's own pattern write-up. Their gaps: no batch/eval category; their "structure > prompt" rule wrongly kills few-shot winners (Q8, 9, 15, 19, 34); their "throw out immediately" heuristic misfires on Q49.

## 3. Architecture (current — Flutter, root-level project)

```
pubspec.yaml, analysis_options.yaml     very_good_analysis + missing_enum_constant_in_switch: error
lib/domain/        enhanced enums carry the domain: TopicSet (name/colors/fingerprint/rule/vary/links),
                   Verdict (jsonCode/badge/spokenTag), AnswerLetter, ConfidenceTier, PatternCode (12 cheat
                   codes), DocLink, AssistAction + SpeechScope (const-Map related), ExamMode (const-Set
                   assist membership), StorageKey, NarrowFilter, AppRoom + AuthoredContent maps
                   + entities: Question / Choice / WorkedExample — Question.choices:
                   Map<AnswerLetter, Choice> is the typed question:choices contract (exactly one
                   Verdict.pick, enforced by tests)
lib/data/          AssetQuestionRepository — joins the five data JSONs once, returns an immutable list
lib/application/   cubits: DrillCubit (filters/assists/flags), ExamCubit (pause-aware timing, palette,
                   downfall analytics), TtsCubit (three speech scripts, voice+rate persistence,
                   follow-along targets), SettingsCubit (theme, tour-done behind a `loaded` gate)
lib/presentation/  theme/DrillPalette (exact tokens from the original design, incl. tier + marked-note
                   colors) · widgets: WebChip (dashed=available / solid=active / fill=selected),
                   SetPill, TierBadge, QuestionCardView (+bodyOnly), ChoiceTile, AssistDock (side rail
                   ≥600px w/ set-colored scope ring, bottom pill on mobile), voice panel ·
                   views: Key / Drill (pinned QuestionStemHeader in Single) / Exam / tour + 11-step
                   spotlight walkthrough (ring glides between targets)
data/*.json        questions, analysis (verdicts/whys/cues/signals), hints, gists, examples — bundled
                   as Flutter assets directly
docs/              production web build (--base-href /ccaf-drill/, .nojekyll) — the Pages source
deploy.sh          flutter build web + restage docs/
```

Content enums (`TopicSet`, `PatternCode`, `DocLink`, `AuthoredContent`) were **generated from the retired generator's content module** — zero retranscription; the strings are the originals.

## 4. Feature inventory (current app)

- **Key**: how-to-use guide, 12 cheat-code cards (2-col grid wide), six set panels (4px set-color left border; fingerprint / one rule / variation; member rows expand to a fully-revealed card inline).
- **Drill**: toolbar v3 (SET / NARROW / VIEW clusters; set-colored pills; combinable Set×Narrow with live "showing N of 60"; All|Single one-tap toggle; Highlights dot-switch; ↺ Reset keeps flags). Cards: cue, signal chips, washed stem (text color never changes — mark invariant), foldable hint box (3 rows) + In-practice (mech pill/lead/snippet), per-choice ◦ plain / ⌁ gist dashed minis, full-width ink Reveal, disputed/agree/debate bands + sources, "◉ marked in your doc" tag on reveal. **Single view pins the question header** while choices scroll. Assist dock: rail from 600px (deliberate divergence — the old app switched at 1100), Q label + set-colored top border + matching card ring, dashed/solid/pulse button states, Reveal ink-filled.
- **Audio (TTS)**: 🔊 Question / Choices / Why (Why gated behind Reveal, reads pick → tagged wrong choices → in-practice lead → set rule), follow-along wash on the segment being read, ⚙ Voice panel (Google US/UK voices when present with exact-locale matching, 0.8–1.4× speed, ▶ test), settings persisted. Web rate scale differs from mobile (kIsWeb branch).
- **Exam**: Easy/Medium/Hard (assist sets from `ExamMode`), 120:00 timer (24px, red <10:00), pause freezes both clocks, 30×26 palette (answered wash / flag-orange border / current outline ring — border and ring coexist so flagging updates instantly), auto-submit, results (scaled/1000 vs 720, weakest-first set bars, downfall analysis, 60-row review with expandable revealed cards + YOUR PICK tag).
- **Onboarding**: 4-slide list-format tour (first visit, ? Tour replays) → "Walk me through the screen →" launches the 11-step spotlight (gold ring glides between live components, auto room switching, restores prior room).
- **Ask Claude**: clipboard JSON packet, same contract as the original app.
- Dark default + light theme, 900px content column, exact palette (no Material fromSeed tinting).

## 5. Testing

`flutter analyze` must be zero issues; `flutter test` all green. Suites:
- `test/domain/enum_matrix_test.dart` — |variants|×|getters| matrices written as **exhaustive switch expressions**: adding an enum variant without a matrix row is a compile error, not a coverage gap.
- `test/data/` — repository invariants: 60 questions, 4 choices each, exactly one pick, set sizes (10/5/15/13/14/3), the disputed 8, signals present in stems (case-insensitive — Q21's 'before deploying' is capitalized in the stem, a known data quirk).
- `test/parity/answer_key_test.dart` — the verified 60-answer key from §2, pinned as a literal. **Never weaken this.**
- `test/application/` — cubit behavior (combinable filters, reset-keeps-flags, exam timing/pause, downfall classification) + the three TTS speech scripts per scope.
- `test/presentation/` — widget smoke (boot, rooms, expand, reveal) + the full 11-step spotlight walk.

Lessons that carried over from the web era: assert **visible content**, not widget existence; watch for test-font (Ahem) layout overflows — rows that fit real fonts can overflow in tests, which is a real resilience signal; `WidgetsBinding.endOfFrame` needs `scheduleFrame()` first or it deadlocks under test pumps.

## 6. Deployment

- Repo `liitx/ccaf-drill`, public. Pages serves `main:/docs`.
- Ship = `./deploy.sh` (builds with `--base-href /ccaf-drill/`, restages `docs/` incl. `.nojekyll`) → commit → push. Live in ~1 min. If Pages ever serves a Jekyll-rendered README, its build predates the source flip — force one: `gh api -X POST repos/liitx/ccaf-drill/pages/builds`.
- **Git identity: commits must be authored `liitx <liitx@users.noreply.github.com>`** — global git config is liitx; only `~/dev/apps/dc-flutter` uses the Toyota identity. Check `git config user.email` before committing; `gh auth status` alone is NOT enough (it controls push credentials, not authorship). This bit us once; history had to be rewritten.

## 7. Gotchas & war stories (current era)

1. **Voice selection must echo the exact locale** — flutter_tts silently keeps the default voice if the locale doesn't match (UK voices are en-GB; a hardcoded en-US made picks no-ops). Voices are `(name, locale)` records.
2. **TTS rate scales differ per platform**: web 1.0 = normal, mobile/desktop 0.5 = normal (`kIsWeb` branch in `_applyRateAndVoice`).
3. **Browsers populate speechSynthesis voices late** — `refreshVoices()` retries and re-runs when the ⚙ panel opens; a single startup query races to an empty list.
4. **Exam palette semantics**: flagged owns the border, current is a separate outline ring (boxShadow). Merging them makes flag-the-current-question look broken.
5. **SettingsCubit `loaded` gate**: acting on defaults before SharedPreferences resolves re-shows the tour to returning users.
6. **shared_preferences on web prefixes keys with `flutter.`** — the old app's localStorage values don't carry over (tour shows once post-migration; old flags were session-only anyway).
7. Deliberate divergences from the original design are recorded in `UI_PARITY.md` — don't "fix" them back: one-tap All/Single toggle, no Hide-answers ghost, 600px rail breakpoint, compact one-row header, pinned Single-view question.
8. Skilljar one-per-screen is an informed assumption, not documented fact.
9. The claudart audit session for this repo is archived in `~/dev/dev_tools/claude/ccaf-drill/` (Type System Laws conformance; findings applied).

## 8. Possible next steps (unrequested, if ever wanted)
- Persist flags/exam history via shared_preferences.
- Keyboard shortcuts (1–4 pick, R reveal, arrows navigate).
- Spaced-repetition ordering for the Flagged list.
- iOS/macOS builds are configured and compile; TTS word-level follow-along is richer there via flutter_tts progress callbacks.
