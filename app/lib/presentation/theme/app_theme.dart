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
    final base = ThemeData(
      brightness: brightness,
      scaffoldBackgroundColor: p.paper,
      colorScheme: ColorScheme.fromSeed(
        seedColor: p.pick,
        brightness: brightness,
        surface: p.card,
      ),
      dividerColor: p.line,
      useMaterial3: true,
    );
    return base.copyWith(
      textTheme: GoogleFonts.publicSansTextTheme(
        base.textTheme,
      ).apply(bodyColor: p.ink, displayColor: p.ink),
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
