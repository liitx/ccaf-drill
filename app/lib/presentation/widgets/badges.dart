import 'package:ccaf_drill/domain/confidence_tier.dart';
import 'package:ccaf_drill/domain/topic_set.dart';
import 'package:ccaf_drill/presentation/theme/app_theme.dart';
import 'package:flutter/material.dart';

/// The solid set-color pill (.setpill): set color fill (colorDim in dark),
/// paper-side text, radius 4, Barlow 11.5 uppercase.
class SetPill extends StatelessWidget {
  /// Creates the pill for [set].
  const SetPill({required this.set, this.fontSize = 11.5, super.key});

  /// The topic set.
  final TopicSet set;

  /// Label size (results rows use smaller).
  final double fontSize;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final dark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: dark ? set.colorDim : set.color,
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        set.displayName.toUpperCase(),
        style: context
            .display(fontSize)
            .copyWith(
              color: dark ? p.buttonForeground : Colors.white,
              letterSpacing: .8,
            ),
      ),
    );
  }
}

/// The confidence badge (.tier): tier-tinted background/border, Barlow 10.5
/// with wide tracking.
class TierBadge extends StatelessWidget {
  /// Creates the badge for [tier].
  const TierBadge({required this.tier, super.key});

  /// The confidence tier.
  final ConfidenceTier tier;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final (bg, fg, border) = switch (tier) {
      ConfidenceTier.docsVerified => (
        p.tier1Background,
        p.tier1Foreground,
        p.tier1Border,
      ),
      ConfidenceTier.guidance => (p.tier2Background, p.dim, p.line),
      ConfidenceTier.debate => (
        p.tier3Background,
        p.tier3Foreground,
        p.tier3Border,
      ),
    };
    return Tooltip(
      message: tier.tooltip,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
        decoration: BoxDecoration(
          color: bg,
          border: Border.all(color: border),
          borderRadius: BorderRadius.circular(4),
        ),
        child: Text(
          tier.label,
          style: context.display(10.5).copyWith(color: fg, letterSpacing: 1),
        ),
      ),
    );
  }
}
