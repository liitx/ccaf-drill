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

### P1 — Foundation: exact colors + shared primitives ✅ 2026-07-11
- [x] Kill `ColorScheme.fromSeed` tinting: manual ColorScheme from
      `DrillPalette` only; compact VisualDensity + shrinkWrap targets +
      NoSplash (app_theme.dart)
- [x] `WebChip` widget (web_chip.dart): Barlow uppercase, solid/dashed
      border, radius/size variants, selected = fill + buttonForeground —
      call sites are swapped per phase P2–P7
- [x] `DashedBorderPainter` (dashed = available, solid = active semantic)
- [x] `ContentColumn`: all three views constrained to the 900px `.wrap`
      column (dock rail stays in the viewport gutter)
- [x] Density pass: cue 14, stem 13.5, chip 12 w600, choice radius 9 +
      8×11 padding + 7px gap

### P2 — Shell: tabs + top bar ✅ 2026-07-11
- [x] AppBar+chips replaced with the web top bar: `.tab`-styled WebChips
      (Barlow 16, 1.5px ink border, radius 8, on = ink fill), live
      `N flagged` note, ◐/◑ theme + ? Tour right-aligned, 2px ink rule
- [x] Site header restored: washed 'DRILL' h1 + dim subtitle

### P3 — Drill toolbar v3 ✅ 2026-07-11
- [x] Cluster labels (`SET · pick one topic`, `NARROW · stacks on the set`,
      `VIEW`) — Barlow 10.5, +1.4 tracking, dim (.cluslab)
- [x] Set pills → `WebChip` in set color (color light / colorDim dark),
      `All 60` ink chip
- [x] Narrow chips (`⚑ Flagged` / `⚠ Disputed 8` / `⚖ Debate 3` — no `+`
      prefix, matching the live markup; enum labels corrected) +
      `→ showing N of 60` readout
- [x] Joined ☰ All | ▭ Single pair: shared 1.5px ink border, inner
      divider, ink fill (no Material checkmark)
- [x] **Deliberate divergences (user request 2026-07-11):** the All/Single
      pill is a true toggle — one tap target, each click flips the layout;
      `Hide answers` ghost removed (Reveal/Hide lives in the dock), cubit
      method deleted with it
- [x] **Dock breakpoint divergence:** side rail from 600px up (web keeps
      the bottom pill until 1100px — it read as "mobile" on desktop
      windows); pill only at true mobile widths. Voice dialog anchor
      follows the same predicate
- [x] Single view: Prev / n / Next bar + card get bottom clearance above
      the pill (they were hidden underneath)
- [x] **Compact header (user request):** the big h1 + subtitle traded for a
      one-row bar — small washed title, tabs, flag note, theme, tour
- [x] **Pinned question (user request):** Single view pins Q row + cue +
      stem (QuestionStemHeader) while choices scroll under it, one card
      visual with the set-colored border
- [x] Dock rail constrained to the question area (was centering over the
      toolbar) and scrolls internally on short windows
- [x] Highlights dot-switch (9px dot, pick-green when on) in VIEW cluster
- [x] Ghost buttons: dashed `HIDE ANSWERS` / `↺ RESET` + vertical divider

### P4 — Card + choices ✅ 2026-07-11
- [x] `SetPill`: solid set-color fill (colorDim in dark) + paper text,
      radius 4, Barlow 11.5 — card header, pinned header, exam results
- [x] `TierBadge`: tier-tinted bg/border/text (t1/t2/t3 palette colors
      added to DrillPalette), Barlow 10.5 tracked
- [x] Choice minis: 1px dashed WebChips radius 5; on = solid pick outline
- [x] Reveal: full-width ink bar, uppercase; revealed = outlined HIDE
- [x] Densities landed in P1 (cue 14, stem 13.5, choice 9/8×11)

### P5 — Dock ✅ 2026-07-11
- [x] Buttons are WebChips: dashed idle / solid active / dead at 45%;
      playing pulses (1.1s fade loop); Reveal = ink fill
- [x] Rail: fixed width, 3px set-color top border, Q# header with bottom
      hairline, internal scroll on short windows; pill scrolls horizontally

### P6 — Exam ✅ 2026-07-11
- [x] Start: left-aligned soft mode cards, Hard carries the ink border
- [x] Timer Barlow w700 24px red under 10:00; palette 30×26 radius 5 with
      pick-wash answered / ink-ring current / flag-orange flagged
- [x] Assist bar: HELP/<mode> label + dashed asbtn WebChips
- [x] Results rows use SetPill

### P7 — Key view ✅ 2026-07-11
- [x] Section headers uppercase Barlow 17 with set-colored dot
- [x] Set panel body carries the 4px set-color left border
- [x] Cheat-code cards flow into a 2-col grid on wide layouts
- [ ] (deferred) sticky nav chips row + member-row hover — low value in
      the Flutter shell, revisit if missed

### P8 — Spotlight walkthrough ✅ 2026-07-11
- [x] 11-step spotlight: dim barrier with a gold-ringed cutout over live
      components, list-format tooltips (COMPONENT n / 11), Back/Exit/Next
- [x] Auto-navigation: Key → Drill, expands Q1, targets toolbar clusters,
      card header/chips, dock + 🔊 cluster, choice minis, reveal, exam tab;
      restores the starting room on exit
- [x] Launched from the tour's final CTA ('Walk me through the screen →')
      on first visit or via ? Tour
- [x] Widget test walks all 11 steps end-to-end (spotlight_test.dart)

### Verification per phase
- Side-by-side: `flutter run -d chrome` next to the hosted app, same
  viewport; screenshot pairs for Key/Drill(open card+dock)/Exam run/results
- `flutter analyze` zero + full `flutter test` after every phase
- Both themes checked (dark default, light toggle)
