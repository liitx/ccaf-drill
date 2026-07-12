# UI/UX Parity: Flutter app vs hosted web app

Goal: the Flutter app should be visually indistinguishable from
https://liitx.github.io/ccaf-drill/. Reference for every value below is
`src/assets/styles.css` (the selector is cited). Check items off as they land;
each phase maps to one planner task.

## Compare/contrast findings

| # | Area | Web (styles.css) | Flutter today | Gap |
|---|---|---|---|---|
| 1 | Content column | `.wrap` max-width 900px centered, padding 16/16/90 | full-width ListView | **high** |
| 2 | Tabs | `.tab`: Barlow 16px uppercase, 1.5px ink border, radius 8, 6×16 padding; `.on` = ink fill, paper text | Material ChoiceChips (rounded, tonal fill, checkmark) in an AppBar | **high** |
| 3 | Color system | exact palette vars only | `ColorScheme.fromSeed` tints chips/surfaces with Material color mixes | **high** |
| 4 | Set filter pills | `.fbtn`: Barlow 12.5px uppercase, 1.5px border **in set color**, radius 999, 3×10 padding; `.on` = set-color fill + `--btnfg` text | ChoiceChip with translucent selectedColor, default typography | **high** |
| 5 | Narrow chips / switch | `+`-prefixed dashed-style chips; Highlights is a **dot-switch** (`.switch` pill with green dot) | FilterChips; highlights lives in the dock only | med |
| 6 | View segmented | `.vseg` joined ☰All\|▭Single buttons, shared border | Material SegmentedButton (own shape/checkmark) | med |
| 7 | Card | `.card`: radius 12, 1px `--line`, margin 10/0; `.setpill`: **solid** set-color bg (colorDim in dark), white/paper text, radius 4, 11.5px Barlow; `.cue` 14px w700 | radius 12 ✓, but setpill = translucent wash + colored text; cue 15px | med |
| 8 | Stem | `.stem` 13.5px `--stemc`; label `.stemlabel` 10px uppercase dim; `<mark>` wash, text color never changes | 15px; wash ✓ invariant ✓ | low |
| 9 | Choices | `.choice`: radius 9, padding 8×11, `--soft` bg; verdict badge Barlow 11px; `.plainbtn` minis: **1px dashed** border, radius 5, height 20 | radius 8, padding 10; minis solid-border pills | med |
| 10 | Reveal button | `.reveal`: **full-width**, Barlow 15px uppercase, ink fill (revealed = card bg + ink text) | centered FilledButton, sentence case | **high** |
| 11 | Dock | `.dockbtn`: **1.5px dashed** border when off, solid when on, uppercase Barlow 12px, radius 999, min-height 32; rail 92px, top border 3px set color, `.dockq` label bordered-bottom | solid borders always; no dashed idle state; sizes approximate | med |
| 12 | Key view | `.ksechead` Barlow 17px uppercase w/ colored dot, `.keypanel` left border in set color, member rows = table (Q / giveaway / variation) with hover | Material ExpansionTiles, no left border, no table feel | med |
| 13 | Exam start | `.modebtn`: bordered card, radius 10, **left-aligned** b-title + dim description, selected = ink border | centered OutlinedButtons | med |
| 14 | Exam run | `.extimer` Barlow w700 24px; `.pal` cells 30×26 radius 5 (answered = pick wash, current = ink border); `.asbtn` dashed uppercase | timer 20px; palette 26×22 radius 4; FilterChips for assists | med |
| 15 | Results | set rows: colored `setpill` + bar + pct + avg time; downfall panel; review rows ✓/✗ | close, but pills/typography off per #7 | low |
| 16 | Fonts | Barlow Condensed everywhere chrome-like (buttons, labels, badges, timer), Public Sans body | Barlow only via `context.display`; Material widgets use theme default | **high** |
| 17 | Density | compact paddings (6–14px), 44px floors only on mobile | Material defaults inflate everything (48px targets, chip padding) | **high** |
| 18 | Bottom padding | `body.dockon #view-drill` padding-bottom 96px so the pill never covers content | list bottom padding 96 ✓ | done |

**Root theme insight:** most gaps trace to two decisions — (a) using stock
Material chips/buttons instead of web-styled primitives, and (b)
`ColorScheme.fromSeed` tinting. Fixing those two at the base fixes half the
table at once.

## Functional bug (fixed 2026-07-11)

- [x] **Voice picker empty on Chrome** — browsers populate
      `speechSynthesis` voices asynchronously; `TtsCubit` queried once at
      startup. Now: `refreshVoices()` retries ×4 and re-runs every time the
      ⚙ Voice panel opens (`voice_settings_sheet.dart`).
- [x] **Chosen voice not applied** — `setVoice` was sent a hardcoded
      `'en-US'` locale; UK voices are `en-GB` so the plugin silently kept
      the default. Voices now carry `(name, locale)` and echo the exact
      locale back.
- [x] **Playback speed inert on web** — rate was scaled ×0.5 (the
      mobile/desktop plugin convention); web expects 1.0 = normal. Now
      `kIsWeb ? rate : 0.5 * rate`.
- [x] **▶ test voice missing** — restored (`TtsCubit.speakSample`).
- [x] **Full-width bottom sheet on web** — replaced with a compact 320px
      card dialog (web #ttspanel styling: card bg, hairline border, radius
      12), anchored right of center on ≥1100px, bottom on narrow.

## Plan — phases, check off as we land them

### P1 — Foundation: exact colors + shared primitives (unblocks everything)
- [ ] Kill `ColorScheme.fromSeed` tinting: build the ColorScheme manually
      from `DrillPalette` values only
- [ ] `WebChip` widget: Barlow uppercase, configurable border width/style
      (solid/dashed), radius 999/8/5 variants, on = fill + `buttonForeground`
      text — replaces every ChoiceChip/FilterChip/OutlinedButton in chrome
- [ ] `DashedBorder` painter (dock idle buttons, ◦ plain / ⌁ gist minis,
      exam asbtns use dashed = available, solid = active — a real semantic
      in the web design)
- [ ] Constrain all views to a 900px centered column (`.wrap`)
- [ ] Density pass: paddings/font sizes from the table above (cue 14, stem
      13.5, choice padding 8×11 radius 9, etc.)

### P2 — Shell: tabs + top bar
- [ ] Replace AppBar+chips with the web top bar: `.tab` styled buttons
      (uppercase Barlow 16, 1.5px ink border, radius 8, on = ink fill),
      flag count, ◐ theme button, ? Tour — right-aligned like the web

### P3 — Drill toolbar v3
- [ ] Cluster labels (`SET · pick one topic`, `NARROW · stacks on the set`,
      `VIEW`) in 10px uppercase dim
- [ ] Set pills → `WebChip` in set color (border idle, fill selected)
- [ ] Narrow chips with `+` prefix and combinable readout (`→ showing N of 60`)
- [ ] Joined ☰ All | ▭ Single segmented pair (shared 1.5px border, no
      Material checkmark)
- [ ] Highlights dot-switch (green dot = on) moved into the VIEW cluster
- [ ] Ghost buttons: `HIDE ANSWERS` / `↺ RESET` uppercase text buttons

### P4 — Card + choices
- [ ] `.setpill` solid fill (color light / colorDim dark) + paper text,
      radius 4, 11.5px
- [ ] Verdict badges + tier badge sizes per `.verdict`/`.tier`
- [ ] Choice tiles: radius 9, 8×11 padding; minis as 20px-high dashed
      `WebChip`s (`◦ plain`, `⌁ gist`)
- [ ] Reveal: full-width ink-filled uppercase bar; revealed = outlined
      "HIDE ANSWER"
- [ ] Stem label row + 13.5px stem + tighter hintbox/example blocks

### P5 — Dock
- [ ] Idle buttons dashed 1.5px `--dim`, active solid `--ink`, playing =
      pulse (AnimatedOpacity loop), reveal button ink-filled
- [ ] Rail: exactly 92px wide, 3px set-color top border, `Q#` header with
      bottom hairline; bottom pill scrolls horizontally under 1100px

### P6 — Exam
- [ ] Start: left-aligned bordered mode cards w/ description, Hard
      pre-selected ink border
- [ ] Timer Barlow w700 24px, red under 10:00; palette 30×26 radius 5 cells
- [ ] Assist bar: dashed `.asbtn` chips + `Help / <mode> mode` label
- [ ] Results: setpill-styled rows + bars, review rows match web density

### P7 — Key view
- [ ] Section headers: uppercase Barlow 17 with set-colored dot + sticky
      nav chips row
- [ ] Set panels: 4px left border in set color; member rows as a 3-column
      table (Q / giveaway wash / variation) with row hover
- [ ] Cheat-code cards in a 2-col grid ≥760px

### Verification per phase
- Side-by-side: `flutter run -d chrome` next to the hosted app, same
  viewport; screenshot pairs for Key/Drill(open card+dock)/Exam run/results
- `flutter analyze` zero + full `flutter test` after every phase
- Both themes checked (dark default, light toggle)
