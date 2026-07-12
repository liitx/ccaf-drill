import 'package:flutter/material.dart';

/// The drill's design tokens as a theme extension.
///
/// Values are lifted 1:1 from the web app's CSS custom properties
/// (src/assets/styles.css `:root` and `body.dark`). Dark is the default
/// theme, with an ink deliberately softened from near-white (halation).
@immutable
final class DrillPalette extends ThemeExtension<DrillPalette> {
  /// Creates a palette; use [DrillPalette.dark] / [DrillPalette.light].
  const DrillPalette({
    required this.paper,
    required this.ink,
    required this.dim,
    required this.line,
    required this.card,
    required this.soft,
    required this.hover,
    required this.stem,
    required this.killText,
    required this.buttonForeground,
    required this.link,
    required this.flagOff,
    required this.flagOn,
    required this.highlightWash,
    required this.pick,
    required this.pickBackground,
    required this.runner,
    required this.runnerBackground,
    required this.kill,
    required this.killBackground,
    required this.tier1Background,
    required this.tier1Foreground,
    required this.tier1Border,
    required this.tier2Background,
    required this.tier3Background,
    required this.tier3Foreground,
    required this.tier3Border,
    required this.markedNoteBackground,
    required this.markedNoteForeground,
  });

  /// Page background.
  final Color paper;

  /// Primary text.
  final Color ink;

  /// Secondary/dimmed text.
  final Color dim;

  /// Hairline borders.
  final Color line;

  /// Card surface.
  final Color card;

  /// Soft inset surface.
  final Color soft;

  /// Hover surface.
  final Color hover;

  /// Question stem text.
  final Color stem;

  /// Struck-through eliminated-choice text.
  final Color killText;

  /// Foreground on filled buttons.
  final Color buttonForeground;

  /// Hyperlink color.
  final Color link;

  /// Unflagged flag icon.
  final Color flagOff;

  /// Flagged flag icon.
  final Color flagOn;

  /// Translucent giveaway-phrase wash. Text color NEVER changes under it
  /// (the web app's mark-color invariant).
  final Color highlightWash;

  /// Verdict pick accent + background.
  final Color pick;

  /// Background behind a revealed pick.
  final Color pickBackground;

  /// Verdict runner accent.
  final Color runner;

  /// Background behind a revealed runner.
  final Color runnerBackground;

  /// Verdict kill accent.
  final Color kill;

  /// Background behind a revealed kill.
  final Color killBackground;

  /// DOCS-VERIFIED badge background (--t1bg).
  final Color tier1Background;

  /// DOCS-VERIFIED badge text (--t1c).
  final Color tier1Foreground;

  /// DOCS-VERIFIED badge border (--t1bd).
  final Color tier1Border;

  /// GUIDANCE badge background (--t2bg; text = dim, border = line).
  final Color tier2Background;

  /// DEBATE badge background (--t3bg).
  final Color tier3Background;

  /// DEBATE badge text (--t3c).
  final Color tier3Foreground;

  /// DEBATE badge border (--t3bd).
  final Color tier3Border;

  /// '◉ marked in your doc' tag background (--smbg).
  final Color markedNoteBackground;

  /// '◉ marked in your doc' tag text (--smc).
  final Color markedNoteForeground;

  /// Dark theme (the default) — src/assets/styles.css `body.dark`.
  static const dark = DrillPalette(
    paper: Color(0xFF0C0E0F),
    ink: Color(0xFFADB5AC),
    dim: Color(0xFF717B73),
    line: Color(0xFF232A26),
    card: Color(0xFF131715),
    soft: Color(0xFF181D1A),
    hover: Color(0xFF1D2420),
    stem: Color(0xFF98A199),
    killText: Color(0xFF68716A),
    buttonForeground: Color(0xFF0C0E0F),
    link: Color(0xFF7AAED4),
    flagOff: Color(0xFF414A44),
    flagOn: Color(0xFFD28C42),
    highlightWash: Color.fromRGBO(228, 203, 92, 0.17),
    pick: Color(0xFF54B888),
    pickBackground: Color(0xFF14211B),
    runner: Color(0xFFCDA14E),
    runnerBackground: Color(0xFF221C0F),
    kill: Color(0xFFD68078),
    killBackground: Color(0xFF251714),
    tier1Background: Color(0xFF131E29),
    tier1Foreground: Color(0xFF84B2D8),
    tier1Border: Color(0xFF28394A),
    tier2Background: Color(0xFF181F1A),
    tier3Background: Color(0xFF221723),
    tier3Foreground: Color(0xFFCB90AF),
    tier3Border: Color(0xFF3F2A39),
    markedNoteBackground: Color(0xFF2C2610),
    markedNoteForeground: Color(0xFFD6BE72),
  );

  /// Light theme — src/assets/styles.css `:root`.
  static const light = DrillPalette(
    paper: Color(0xFFFBFBF7),
    ink: Color(0xFF181F1C),
    dim: Color(0xFF5C665F),
    line: Color(0xFFE2E4DB),
    card: Color(0xFFFFFFFF),
    soft: Color(0xFFFCFCFA),
    hover: Color(0xFFF5F6F0),
    stem: Color(0xFF2A332E),
    killText: Color(0xFF767A75),
    buttonForeground: Color(0xFFFFFFFF),
    link: Color(0xFF1F6FA8),
    flagOff: Color(0xFFC9CCC2),
    flagOn: Color(0xFFD9822B),
    highlightWash: Color.fromRGBO(255, 214, 10, 0.38),
    pick: Color(0xFF1D7A4F),
    pickBackground: Color(0xFFEDF6F0),
    runner: Color(0xFF8A5A00),
    runnerBackground: Color(0xFFFBF3E0),
    kill: Color(0xFF9E3A32),
    killBackground: Color(0xFFF8EFEE),
    tier1Background: Color(0xFFE4EEF7),
    tier1Foreground: Color(0xFF1F5C8C),
    tier1Border: Color(0xFFBDD5E8),
    tier2Background: Color(0xFFF0F0EA),
    tier3Background: Color(0xFFF5E9F0),
    tier3Foreground: Color(0xFF96385E),
    tier3Border: Color(0xFFE3C2D3),
    markedNoteBackground: Color(0xFFFFF3CE),
    markedNoteForeground: Color(0xFF7A5A10),
  );

  @override
  DrillPalette copyWith() => this;

  @override
  DrillPalette lerp(DrillPalette? other, double t) =>
      t < 0.5 ? this : (other ?? this);
}
