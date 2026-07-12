---
name: drill-conventions
description: Conventions for any change to the ccaf-drill codebase. Read BEFORE editing lib/, data/, test/, or docs/ — covers the enum-first rule, the question:choices contract, the build/test/deploy workflow, and the naming standards. Triggers on any feature, fix, or refactor in this repo.
---

# ccaf-drill conventions (Flutter era)

This repo IS the Flutter app (root-level pubspec) and the hosted site. The original
web generator was retired 2026-07-11 (git tag `web-final` has it intact).

## Architecture

```
lib/domain/       enhanced enums (TopicSet, Verdict, AnswerLetter,
                      ConfidenceTier, PatternCode, DocLink, AssistAction+
                      SpeechScope, ExamMode, StorageKey, NarrowFilter,
                      AppRoom) + Question/Choice/WorkedExample entities
lib/data/         AssetQuestionRepository — parse once, immutable
lib/application/  cubits: drill, exam, tts, settings
lib/presentation/ theme (DrillPalette tokens), views, WebChip/SetPill/
                      TierBadge primitives, spotlight walkthrough
data/*.json           the 60 questions + analysis/hints/gists/examples
docs/                 built site (GitHub Pages source) — never hand-edit
deploy.sh         flutter build web + restage docs/
HANDOFF.md            history, verified answer key, war stories
```

## Rules

1. **Enum-first, no bare strings** (claudart Law 1): any finite set becomes
   an enum with documented fields; relationships are `const Map`,
   membership is `const Set`. `missing_enum_constant_in_switch: error` is
   on — switches stay exhaustive.
2. **question:choices contract**: `Question.choices: Map<AnswerLetter,
   Choice>` with exactly one `Verdict.pick` — repository tests enforce it;
   never bypass the entities with raw JSON access.
3. **Palette only**: colors come from `DrillPalette` (exact web tokens);
   never `fromSeed`, never inline hex in widgets.
4. **Web-design primitives**: chrome uses `WebChip` (dashed = available,
   solid = active, fill = selected), `SetPill`, `TierBadge` — not stock
   Material chips.
5. **Naming + docs**: names say what a thing IS; every public class and
   member gets a doc comment (`public_member_api_docs` is on).
6. **Tests with every change**: enum matrices as exhaustive switch
   expressions (a new variant without a row is a compile error), cubit
   tests, widget assertions on visible content. The answer-key gate
   (`test/parity/answer_key_test.dart`) must never be weakened.

## Workflow (every change)

```
flutter analyze        # zero issues, always
flutter test           # all green, always
./deploy.sh            # only when shipping: rebuilds docs/
```
Commit as liitx (never the Toyota identity — check `git config user.email`).
Deploy = commit docs/ + push; Pages serves main:/docs in ~1 min.
