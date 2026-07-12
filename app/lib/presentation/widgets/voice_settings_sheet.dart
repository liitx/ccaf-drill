import 'dart:async';

import 'package:ccaf_drill/application/tts_cubit.dart';
import 'package:ccaf_drill/presentation/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

/// Opens the ⚙ Voice panel: voice picker + speed chips + test button.
/// Mirrors the web #ttspanel.
Future<void> showVoiceSettingsSheet(BuildContext context) {
  // Browsers report an empty voice list until late in the page's life —
  // re-query every time the panel opens.
  unawaited(context.read<TtsCubit>().refreshVoices());
  return showModalBottomSheet<void>(
    context: context,
    builder: (sheetContext) => BlocProvider.value(
      value: context.read<TtsCubit>(),
      child: const _VoiceSettings(),
    ),
  );
}

class _VoiceSettings extends StatelessWidget {
  const _VoiceSettings();

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final cubit = context.watch<TtsCubit>();
    final tts = cubit.state;

    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('VOICE', style: context.display(11).copyWith(color: p.dim)),
          const SizedBox(height: 6),
          if (tts.voices.isEmpty)
            Text(
              'No voices reported by this platform.',
              style: TextStyle(color: p.dim),
            )
          else
            DropdownButton<String>(
              value: tts.voices.contains(tts.voiceName)
                  ? tts.voiceName
                  : tts.voices.first,
              isExpanded: true,
              items: [
                for (final voice in tts.voices)
                  DropdownMenuItem(value: voice, child: Text(voice)),
              ],
              onChanged: (voice) {
                if (voice != null) cubit.setVoice(voice);
              },
            ),
          const SizedBox(height: 14),
          Text('SPEED', style: context.display(11).copyWith(color: p.dim)),
          const SizedBox(height: 6),
          Wrap(
            spacing: 8,
            children: [
              for (final rate in cubit.ratePresets)
                ChoiceChip(
                  label: Text('$rate×'),
                  selected: tts.rate == rate,
                  onSelected: (_) => cubit.setRate(rate),
                ),
            ],
          ),
        ],
      ),
    );
  }
}
