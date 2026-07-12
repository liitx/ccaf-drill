import 'package:ccaf_drill/presentation/theme/drill_palette.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// ThemeData builders wiring [DrillPalette] + the web app's two typefaces
/// (Barlow Condensed for display chrome, Public Sans for body text).
abstract final class AppTheme {
  /// Dark theme — the default, matching the web app.
  static ThemeData dark() => _build(DrillPalette.dark, Brightness.dark);

  /// Light theme.
  static ThemeData light() => _build(DrillPalette.light, Brightness.light);

  static ThemeData _build(DrillPalette p, Brightness brightness) {
    // Exact palette only — no fromSeed: Material's seeded tonal mixes tint
    // chips/surfaces away from the web colors (UI_PARITY.md finding #3).
    final scheme = ColorScheme(
      brightness: brightness,
      primary: p.ink,
      onPrimary: p.buttonForeground,
      secondary: p.pick,
      onSecondary: p.buttonForeground,
      error: p.kill,
      onError: p.buttonForeground,
      surface: p.card,
      onSurface: p.ink,
      outline: p.line,
      surfaceContainerHighest: p.soft,
      onSurfaceVariant: p.dim,
    );
    final base = ThemeData(
      brightness: brightness,
      scaffoldBackgroundColor: p.paper,
      colorScheme: scheme,
      dividerColor: p.line,
      splashFactory: NoSplash.splashFactory,
      // Web density: compact paddings, no 48px Material inflation
      visualDensity: VisualDensity.compact,
      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
      useMaterial3: true,
    );
    return base.copyWith(
      textTheme: GoogleFonts.publicSansTextTheme(
        base.textTheme,
      ).apply(bodyColor: p.ink, displayColor: p.ink),
      dialogTheme: base.dialogTheme.copyWith(backgroundColor: p.card),
      extensions: [p],
    );
  }
}

/// Convenience accessor: `context.palette`.
extension DrillPaletteContext on BuildContext {
  /// The active [DrillPalette].
  DrillPalette get palette => Theme.of(this).extension<DrillPalette>()!;

  /// Display typeface (Barlow Condensed) at [size].
  TextStyle display(double size, {FontWeight weight = FontWeight.w600}) =>
      GoogleFonts.barlowCondensed(
        fontSize: size,
        fontWeight: weight,
        letterSpacing: 0.5,
        color: palette.ink,
      );
}
