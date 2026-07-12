---
name: drill-conventions
description: Conventions for any change to the ccaf-drill codebase. Read BEFORE editing src/, data/, or tests/ — covers the no-bare-strings rule, the registry classes, the question:answerChoices accessors, the build/test workflow, and the naming standards. Triggers on any feature, fix, or refactor in this repo.
---

# ccaf-drill conventions

## Architecture (edit sources, never index.html)

```
build.py                 entry: python3 build.py → index.html
src/constants.py         Python constants: ANSWER_LETTERS, Verdict enum, Token enum
src/models.py            dataclass structs (Question, Choice, Example, SetDef); fields
                         classified [render]/[logic]/[tts]/[export]
src/content.py           authored knowledge: sets, tiers, cheat codes, doc links
src/render.py            all Python-side HTML; context() returns Token → string
src/page.py              splices assets by token replacement (plain str.replace)
src/assets/domain.js     JS registries + QuestionCard/AnswerChoice accessors
src/assets/app.js        runtime behavior (uses domain.js, never bare strings)
src/assets/*.html|css    static markup and styles
data/*.json              the 60 questions + analysis + hints + gists + examples
tests/*.spec.js          Playwright suites on tests/harness.js; tests/run.sh runs all
HANDOFF.md               project history, answer key, gotchas — keep it current
```

## Rule 1 — no bare strings

Every string with meaning lives in exactly one registry. At a call site, always
use the getter; never retype the literal.

| Kind | Registry (JS, src/assets/domain.js) | Python mirror |
|---|---|---|
| Card state classes | `CardState` (OPEN, REVEALED, HINTED, …) | — |
| Choice state classes | `ChoiceState` (SHOW_PLAIN, SHOW_GIST) | — |
| Control states | `ControlState` (ON, DEAD, PLAYING, …) | — |
| Exam states | `ExamState` (+ `ExamState.assist(k)`) | — |
| Action keys (data-k) | `DockAction` (+ `isSpeak(k)`) | — |
| TTS scopes | `SpeechScope` (+ `forDockAction(k)`) | — |
| localStorage keys | `StorageKey` | — |
| Verdicts (data-v) | `Verdict` | `constants.Verdict` (css_class/badge) |
| Answer letters | `AnswerLetter.ALL` | `constants.ANSWER_LETTERS` |
| Element ids | `Dom` getters | — |
| Template tokens | — | `constants.Token` |

Adding a new stateful string: add a documented getter to the right registry
FIRST, then use it. If no registry fits, create a new class in domain.js with a
JSDoc block explaining the family.

## Rule 2 — the question:answerChoices relationship

The 60 `.card[data-n]` articles are the single source of truth; exam, key
expansion, TTS, and Ask-Claude all read through the accessors:

- `QuestionCard.byNumber(n)` / `QuestionCard.containing(el)` / `new QuestionCard(el)`
- `card.choices` → 4 `AnswerChoice` in letter order (the 1:4 mapping)
- `card.choice(letter)`, `card.winningChoice`, `card.winningLetter`, `card.stemEl`
- `choice.verdict / textEl / plainEl / gistEl / whyEl / isPlainShown`
- Declarative selectors (spotlight configs, tests): `QuestionCard.selector(n, descendant)`, `AnswerChoice.selector(letter)`

Never hand-build a `.card[data-n=…]` or `.choice[data-l=…]` selector at a call
site. If an accessor is missing, add a getter to `QuestionCard`/`AnswerChoice`.

## Rule 3 — naming and comments

- Class/function/variable names say what the thing IS, not how it works
  (`winningChoice`, not `getW`). No abbreviations a new reader can't expand.
- Every class and function gets a doc comment (JSDoc in JS, docstring in
  Python) stating purpose and, for structs, the use-case tag of each field.
- Comments state constraints the code can't show — never restate the code.

## Rule 4 — build and verify (every change)

1. `python3 build.py` — regenerates index.html
2. `node --check src/assets/domain.js src/assets/app.js` — syntax gate
3. Targeted spec for the touched area (`node tests/dock.spec.js`, …), then
   `tests/run.sh` for the full 360-assertion suite before finishing
4. Generator-internal refactors must be proven **byte-identical**
   (`shasum index.html` before/after)
5. Grep gate for regressions:
   `grep -n "classList\.\(add\|remove\|toggle\|contains\)('" src/assets/app.js`
   must return nothing

## Rule 5 — testing lessons (vacuous passes are the #1 failure mode)

- Assert zero pageerrors in every suite.
- Assert rendered size (`getBoundingClientRect().height > 0`), never
  existence or `display`/`offsetParent` on fold-animated elements.
- Fold animations need ~320–400ms waits; scroll assertions need settle-polling.
- New behavior = new assertions in the matching spec, built on
  `tests/harness.js` (`run`, `A`, `URL`, `withServer`).
