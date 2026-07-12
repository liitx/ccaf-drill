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

## Development

```
python3 build.py                 # regenerate index.html from src/ + data/
node --check src/assets/app.js   # validate runtime JS
tests/run.sh                     # full Playwright suite (360 assertions)
```

- `src/` — modular generator: dataclass structs (`models.py`), authored content (`content.py`), HTML renderers (`render.py`), token-splicing assembly (`page.py`), and real CSS/JS assets (`assets/`)
- `src/assets/domain.js` — no-bare-strings registries + `QuestionCard`/`AnswerChoice` accessors (the question:answerChoices contract)
- `data/` — the 60 questions and their analysis/hints/gists/examples as JSON
- `tests/` — 8 domain spec suites on a shared harness, plus contrast/mobile audits

See `HANDOFF.md` for full project history, the verified answer key, and the war stories. Contribution conventions live in `.claude/skills/drill-conventions/SKILL.md`.
