# CCA-F Drill — Pattern Key + 60Q + Exam Simulator

Study tool for the Anthropic **CCA-F exam** (Claude Certification Associate – Foundations). One self-contained HTML file, no runtime dependencies.

**Live:** https://liitx.github.io/ccaf-drill/

## Features

### Key — learn the patterns
- **How-to-use guide** and **12 cheat codes** (cross-set elimination rules); Q-number buttons jump straight into the Drill
- Six color-coded **set panels**: fingerprint, the one rule, what varies, every member question in an expandable table
- Confidence badges on every answer: **DOCS-VERIFIED / GUIDANCE / DEBATE**, with backing doc links

### Drill — practice with help
- All 60 questions with per-question assists: **💡 Hint** (never spoils), **🖍 highlight wash** on giveaway phrases, **⌁ gists** (each choice as one-line pseudo-code), **◦ plain** rephrases, **In practice** (winning mechanism + snippet), **Reveal** (verdicts + why every choice wins or loses)
- **Floating help dock**: a side rail on wide screens (bottom pill on small ones) scoped to the question you're on — Q label and a matching color ring on the card. Gentle snap-scroll keeps the active question aligned
- **🔊 Audio**: read the question, the choices, or (after Reveal) the full answer reasoning aloud — with follow-along sentence/word highlighting, voice picker (Google US/UK voices), and playback speed control. Settings persist
- **🤖 Ask Claude**: copies a self-explaining JSON packet of the question for a worked-example walkthrough
- Combinable filters (set × ⚑ Flagged / ⚠ Disputed 8 / ⚖ Debate 3), All/Single view, flags that survive reset
- **No-shift system**: assists unfold in place and the text you're reading never moves

### Exam — 1:1 rehearsal
- 60 questions / 120 minutes, one per screen, pause/resume, per-question timing, 60-cell palette, auto-submit
- **Easy / Medium / Hard** modes control which assists exist (audio included in Easy/Medium)
- Results: score + scaled/1000 vs the 720 pass line, sets ranked weakest-first, **downfall analysis** (close-2nd picks vs outright kills), full 60-row review with expandable detail

### Onboarding
- 4-slide first-visit tour + a 10-step **spotlight walkthrough** over the live UI (replay via "? Tour")
- Dark theme default, WCAG-audited contrast in both themes, mobile-friendly (44px targets)

## The app (`app/`)

**This Flutter/Dart app IS the hosted site** — the original single-file web
generator was retired on 2026-07-11 (recoverable at git tag `web-final`).
Built enum-first:

- **Enhanced enums** carry the domain: `TopicSet` (colors, fingerprint, rule), `Verdict`, `AnswerLetter`, `ConfidenceTier`, `PatternCode` (the 12 cheat codes), `DocLink`, `AssistAction`/`SpeechScope` (const-map related), `ExamMode` (const-set assist membership), `StorageKey` (same keys as the web app)
- `Question.choices: Map<AnswerLetter, Choice>` — the question:answerChoices contract in the type system; repository tests prove 60 questions × 4 choices × exactly one pick
- flutter_bloc cubits (drill / exam / TTS / settings), `flutter_tts` audio with the same three speech scripts, shared theme tokens from `styles.css`
- Tests: enum matrices as compiler-checked exhaustive switches, cubit tests, widget smoke + spotlight walkthrough, and an answer-key gate pinned to the verified key from HANDOFF §2

```
cd app
flutter test          # matrices + invariants + answer-key gate + smoke
flutter run -d chrome # or -d macos
./deploy.sh           # build + stage docs/ (the GitHub Pages source)
```

Deploying = run `app/deploy.sh`, commit `docs/`, push. Pages serves
`main:/docs`. Question content lives in `data/*.json`.

Audited via a [claudart](https://github.com/liitx/claudart) session against its Type System Laws (enum-first, const maps, const sets, parse-once, matrix tests); all findings applied.

See `HANDOFF.md` for full project history, the verified answer key, and the war stories. Contribution conventions live in `.claude/skills/drill-conventions/SKILL.md`.
