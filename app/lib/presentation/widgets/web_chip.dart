import 'package:ccaf_drill/presentation/theme/app_theme.dart';
import 'package:flutter/material.dart';

/// The web app's chip/button primitive, replacing Material chips in chrome.
///
/// Encodes the design language from src/assets/styles.css:
/// - **dashed border = available toggle, solid = active** (`.dockbtn`,
///   `.plainbtn`, `.asbtn`)
/// - selected = fill in [accent] (or ink) with `buttonForeground` text
///   (`.fbtn.on`, `.tab.on`, `.reveal`)
/// - Barlow Condensed uppercase, letter-spaced, compact padding
class WebChip extends StatelessWidget {
  /// Creates a web-styled chip.
  const WebChip({
    required this.label,
    required this.onTap,
    this.selected = false,
    this.enabled = true,
    this.dashed = false,
    this.accent,
    this.fontSize = 12.5,
    this.radius = 999,
    this.borderWidth = 1.5,
    this.padding = const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
    this.expand = false,
    super.key,
  });

  /// Uppercased automatically (web chrome is always uppercase).
  final String label;

  /// Tap handler (ignored while disabled).
  final VoidCallback onTap;

  /// Selected = filled with [accent]/ink + buttonForeground text.
  final bool selected;

  /// Disabled renders at 45% opacity with taps off (`.dead`).
  final bool enabled;

  /// Idle border style: dashed marks an available toggle.
  final bool dashed;

  /// Border/fill color; defaults to the palette ink (dim when dashed idle).
  final Color? accent;

  /// Label size (web chrome uses 11–16px Barlow).
  final double fontSize;

  /// Corner radius (999 pill, 8 tab, 5 mini).
  final double radius;

  /// Border width (web uses 1px minis, 1.5px chrome).
  final double borderWidth;

  /// Inner padding.
  final EdgeInsets padding;

  /// Stretch to the parent width (the full-width Reveal bar).
  final bool expand;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final color = accent ?? (dashed && !selected ? p.dim : p.ink);
    final child = Container(
      width: expand ? double.infinity : null,
      alignment: expand ? Alignment.center : null,
      padding: padding,
      decoration: selected
          ? BoxDecoration(
              color: color,
              borderRadius: BorderRadius.circular(radius),
              border: Border.all(color: color, width: borderWidth),
            )
          : dashed
          ? null // dashed border painted below
          : BoxDecoration(
              borderRadius: BorderRadius.circular(radius),
              border: Border.all(color: color, width: borderWidth),
            ),
      child: Text(
        label.toUpperCase(),
        style: context
            .display(fontSize, weight: FontWeight.w500)
            .copyWith(color: selected ? p.buttonForeground : color),
      ),
    );

    return Opacity(
      opacity: enabled ? 1 : .45,
      child: InkWell(
        onTap: enabled ? onTap : null,
        borderRadius: BorderRadius.circular(radius),
        child: dashed && !selected
            ? CustomPaint(
                foregroundPainter: DashedBorderPainter(
                  color: color,
                  strokeWidth: borderWidth,
                  radius: radius,
                ),
                child: child,
              )
            : child,
      ),
    );
  }
}

/// Paints a dashed rounded-rect border (CSS `border-style: dashed`).
class DashedBorderPainter extends CustomPainter {
  /// Creates the painter.
  const DashedBorderPainter({
    required this.color,
    required this.strokeWidth,
    required this.radius,
    this.dashLength = 4,
    this.gapLength = 3,
  });

  /// Stroke color.
  final Color color;

  /// Stroke width.
  final double strokeWidth;

  /// Corner radius (clamped to the box).
  final double radius;

  /// Dash segment length.
  final double dashLength;

  /// Gap between dashes.
  final double gapLength;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth;
    final r = radius.clamp(0, size.shortestSide / 2).toDouble();
    final path = Path()
      ..addRRect(
        RRect.fromRectAndRadius(Offset.zero & size, Radius.circular(r)),
      );
    for (final metric in path.computeMetrics()) {
      var distance = 0.0;
      while (distance < metric.length) {
        canvas.drawPath(
          metric.extractPath(distance, distance + dashLength),
          paint,
        );
        distance += dashLength + gapLength;
      }
    }
  }

  @override
  bool shouldRepaint(DashedBorderPainter oldDelegate) =>
      color != oldDelegate.color ||
      strokeWidth != oldDelegate.strokeWidth ||
      radius != oldDelegate.radius;
}

/// The web `.wrap`: content constrained to a 900px centered column.
class ContentColumn extends StatelessWidget {
  /// Wraps [child] in the column.
  const ContentColumn({required this.child, super.key});

  /// The view content.
  final Widget child;

  @override
  Widget build(BuildContext context) => Center(
    child: ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 900),
      child: child,
    ),
  );
}
