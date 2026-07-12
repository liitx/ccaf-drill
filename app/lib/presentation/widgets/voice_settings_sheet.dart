import 'dart:async';

import 'package:ccaf_drill/application/tts_cubit.dart';
import 'package:ccaf_drill/presentation/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

/// Opens the ⚙ Voice panel: voice picker + speed chips + ▶ test button.
/// A compact card-styled dialog (mirrors the web #ttspanel: card surface,
/// hairline border, radius 12) — anchored right on wide layouts, bottom on
/// narrow ones, instead of a full-width sheet.
Future<void> showVoiceSettingsSheet(BuildContext context) {
  // Browsers report an empty voice list until late in the page's life —
  // re-query every time the panel opens.
  unawaited(context.read<TtsCubit>().refreshVoices());
  final wide = MediaQuery.sizeOf(context).width >= 1100;
  return showDialog<void>(
    context: context,
    barrierColor: Colors.transparent,
    builder: (dialogContext) => BlocProvider.value(
      value: context.read<TtsCubit>(),
      child: Align(
        alignment: wide ? const Alignment(.86, 0) : Alignment.bottomCenter,
        child: Padding(padding: const EdgeInsets.all(24), child: _VoicePanel()),
      ),
    ),
  );
}

class _VoicePanel extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final cubit = context.watch<TtsCubit>();
    final tts = cubit.state;
    final selected = tts.voices.any((v) => v.name == tts.voiceName)
        ? tts.voiceName
        : tts.voices.firstOrNull?.name;

    return Material(
      color: p.card,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        width: 320,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          border: Border.all(color: p.line),
          borderRadius: BorderRadius.circular(12),
          boxShadow: const [
            BoxShadow(blurRadius: 34, color: Color(0x80000000)),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('VOICE', style: context.display(10).copyWith(color: p.dim)),
            const SizedBox(height: 4),
            if (tts.voices.isEmpty)
              Text(
                'No voices reported yet — try reopening.',
                style: TextStyle(fontSize: 13, color: p.dim),
              )
            else
              DropdownButton<String>(
                value: selected,
                isExpanded: true,
                isDense: true,
                style: TextStyle(fontSize: 13.5, color: p.ink),
                dropdownColor: p.card,
                items: [
                  for (final voice in tts.voices)
                    DropdownMenuItem(
                      value: voice.name,
                      child: Text(voice.name),
                    ),
                ],
                onChanged: (name) {
                  if (name != null) cubit.setVoice(name);
                },
              ),
            const SizedBox(height: 12),
            Text('SPEED', style: context.display(10).copyWith(color: p.dim)),
            const SizedBox(height: 6),
            Row(
              children: [
                for (final rate in cubit.ratePresets) ...[
                  _RateChip(rate: rate, selected: tts.rate == rate),
                  const SizedBox(width: 6),
                ],
              ],
            ),
            const SizedBox(height: 14),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                OutlinedButton(
                  onPressed: cubit.speakSample,
                  child: Text('▶ TEST VOICE', style: context.display(11)),
                ),
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: Text(
                    'DONE',
                    style: context.display(11).copyWith(color: p.dim),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _RateChip extends StatelessWidget {
  const _RateChip({required this.rate, required this.selected});

  final double rate;
  final bool selected;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return InkWell(
      onTap: () => context.read<TtsCubit>().setRate(rate),
      borderRadius: BorderRadius.circular(999),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
        decoration: BoxDecoration(
          color: selected ? p.ink : null,
          border: Border.all(color: selected ? p.ink : p.dim, width: 1.5),
          borderRadius: BorderRadius.circular(999),
        ),
        child: Text(
          '$rate×',
          style: context
              .display(11)
              .copyWith(color: selected ? p.buttonForeground : p.dim),
        ),
      ),
    );
  }
}
