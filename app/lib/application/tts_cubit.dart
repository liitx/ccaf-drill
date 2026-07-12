import 'dart:async';

import 'package:ccaf_drill/domain/answer_letter.dart';
import 'package:ccaf_drill/domain/assists.dart';
import 'package:ccaf_drill/domain/question.dart';
import 'package:ccaf_drill/domain/storage_key.dart';
import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// What part of a question a speech segment belongs to, for the
/// follow-along wash in the UI.
final class SpeechTarget extends Equatable {
  /// Creates a target; [letter] is null for the stem / example / set rule.
  const SpeechTarget({required this.question, this.letter, this.isWhy = false});

  /// Question number.
  final int question;

  /// The choice being read, if any.
  final AnswerLetter? letter;

  /// True when reading a choice's reasoning rather than its text.
  final bool isWhy;

  @override
  List<Object?> get props => [question, letter, isWhy];
}

/// One utterance: the text plus where to paint the follow-along wash.
final class SpeechSegment extends Equatable {
  /// Creates a segment.
  const SpeechSegment(this.text, {this.target});

  /// The text handed to the platform TTS.
  final String text;

  /// Where the wash goes while this segment plays (null = nowhere).
  final SpeechTarget? target;

  @override
  List<Object?> get props => [text, target];
}

/// Playback state.
final class TtsState extends Equatable {
  /// Creates TTS state.
  const TtsState({
    this.playingQuestion,
    this.playingScope,
    this.currentTarget,
    this.rate = 1,
    this.voiceName,
    this.voices = const [],
    this.supported = true,
  });

  /// Question whose audio is playing, or null when idle.
  final int? playingQuestion;

  /// Scope being read, or null when idle.
  final SpeechScope? playingScope;

  /// Target of the segment currently being spoken.
  final SpeechTarget? currentTarget;

  /// Playback rate (0.8–1.4, matching the web presets).
  final double rate;

  /// Chosen voice, if any.
  final String? voiceName;

  /// Available voice names (Google US/UK filter applied when present).
  final List<String> voices;

  /// False when the platform has no TTS.
  final bool supported;

  /// Whether anything is playing.
  bool get isPlaying => playingQuestion != null;

  /// Copy with updates; sentinel closures allow explicit nulls.
  TtsState copyWith({
    int? Function()? playingQuestion,
    SpeechScope? Function()? playingScope,
    SpeechTarget? Function()? currentTarget,
    double? rate,
    String? Function()? voiceName,
    List<String>? voices,
    bool? supported,
  }) => TtsState(
    playingQuestion: playingQuestion != null
        ? playingQuestion()
        : this.playingQuestion,
    playingScope: playingScope != null ? playingScope() : this.playingScope,
    currentTarget: currentTarget != null ? currentTarget() : this.currentTarget,
    rate: rate ?? this.rate,
    voiceName: voiceName != null ? voiceName() : this.voiceName,
    voices: voices ?? this.voices,
    supported: supported ?? this.supported,
  );

  @override
  List<Object?> get props => [
    playingQuestion,
    playingScope,
    currentTarget,
    rate,
    voiceName,
    voices,
    supported,
  ];
}

/// Text-to-speech: builds the same three speech scripts as the web app
/// (speakSegs in src/assets/app.js) and plays them segment by segment so the
/// UI can wash the segment being read. A new play cancels the previous one;
/// the generation counter [_playId] keeps stale completions from advancing a
/// cancelled queue (the web app's TTSID pattern).
final class TtsCubit extends Cubit<TtsState> {
  /// Creates the cubit; [tts] is injectable for tests.
  TtsCubit({FlutterTts? tts})
    : _tts = tts ?? FlutterTts(),
      super(const TtsState()) {
    unawaited(_init());
  }

  final FlutterTts _tts;
  int _playId = 0;

  static const _rates = [0.8, 1.0, 1.2, 1.4];

  /// The selectable rate presets (mirrors the web chips).
  List<double> get ratePresets => _rates;

  Future<void> _init() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final rate = prefs.getDouble(StorageKey.ttsRate.key) ?? 1.0;
      final voice = prefs.getString(StorageKey.ttsVoice.key);
      final raw = await _tts.getVoices;
      final all = (raw as List<dynamic>? ?? [])
          .map((v) => (v as Map<Object?, Object?>).cast<String, Object?>())
          .where((v) => '${v['locale']}'.toLowerCase().startsWith('en'))
          .map((v) => '${v['name']}')
          .toList();
      final google = all
          .where(
            (n) => RegExp(
              '^google (us|uk) english',
              caseSensitive: false,
            ).hasMatch(n),
          )
          .toList();
      emit(
        state.copyWith(
          rate: rate.clamp(0.8, 1.4),
          voiceName: () => voice,
          voices: google.isNotEmpty ? google : all,
        ),
      );
      await _tts.awaitSpeakCompletion(true);
    } on Exception {
      emit(state.copyWith(supported: false));
    }
  }

  /// Build the speech script for [scope] over [question] — 1:1 with the web
  /// app's speakSegs.
  List<SpeechSegment> script(
    Question question,
    SpeechScope scope, {
    Set<(int, AnswerLetter)> plainShown = const {},
  }) {
    final n = question.number;
    switch (scope) {
      case SpeechScope.question:
        return [
          SpeechSegment('Question $n.', target: SpeechTarget(question: n)),
          SpeechSegment(question.stem, target: SpeechTarget(question: n)),
        ];
      case SpeechScope.choices:
        return [
          for (final choice in question.choiceList) ...[
            SpeechSegment(
              'Option ${choice.letter.display}.',
              target: SpeechTarget(question: n, letter: choice.letter),
            ),
            SpeechSegment(
              plainShown.contains((n, choice.letter))
                  ? choice.plain
                  : choice.text,
              target: SpeechTarget(question: n, letter: choice.letter),
            ),
          ],
        ];
      case SpeechScope.revealWhy:
        final win = question.winningLetter;
        return [
          SpeechSegment(
            'Question $n. Correct answer: ${win.display}.',
            target: SpeechTarget(question: n, letter: win, isWhy: true),
          ),
          SpeechSegment(
            question.winningChoice.why,
            target: SpeechTarget(question: n, letter: win, isWhy: true),
          ),
          for (final choice in question.choiceList)
            if (choice.letter != win) ...[
              SpeechSegment(
                'Option ${choice.letter.display}, '
                '${choice.verdict.spokenTag}. ${choice.why}',
                target: SpeechTarget(
                  question: n,
                  letter: choice.letter,
                  isWhy: true,
                ),
              ),
            ],
          SpeechSegment(
            'In practice. ${question.example.lead}',
            target: SpeechTarget(question: n),
          ),
          SpeechSegment('The set rule: ${question.topicSet.rule}'),
        ];
    }
  }

  /// Play [scope] for [question]; tapping the same scope again stops.
  Future<void> play(
    Question question,
    SpeechScope scope, {
    Set<(int, AnswerLetter)> plainShown = const {},
  }) async {
    if (!state.supported) return;
    if (state.playingQuestion == question.number &&
        state.playingScope == scope) {
      await stop();
      return;
    }
    await stop();
    final id = ++_playId;
    emit(
      state.copyWith(
        playingQuestion: () => question.number,
        playingScope: () => scope,
      ),
    );
    final segments = script(question, scope, plainShown: plainShown);
    await _tts.setSpeechRate(_platformRate(state.rate));
    final voice = state.voiceName;
    if (voice != null && state.voices.contains(voice)) {
      await _tts.setVoice({'name': voice, 'locale': 'en-US'});
    }
    for (final segment in segments) {
      if (id != _playId) return;
      emit(state.copyWith(currentTarget: () => segment.target));
      await _tts.speak(segment.text);
    }
    if (id == _playId) await stop();
  }

  /// flutter_tts rates are platform-normalized around 0.5; map the web's
  /// 1.0× baseline onto it.
  double _platformRate(double webRate) => 0.5 * webRate;

  /// Stop playback and clear the wash.
  Future<void> stop() async {
    _playId++;
    if (state.supported) {
      try {
        await _tts.stop();
      } on Exception {
        // Losing the platform channel mid-stop is not actionable.
      }
    }
    emit(
      state.copyWith(
        playingQuestion: () => null,
        playingScope: () => null,
        currentTarget: () => null,
      ),
    );
  }

  /// Set + persist the playback rate.
  Future<void> setRate(double rate) async {
    emit(state.copyWith(rate: rate));
    final prefs = await SharedPreferences.getInstance();
    await prefs.setDouble(StorageKey.ttsRate.key, rate);
  }

  /// Set + persist the voice.
  Future<void> setVoice(String name) async {
    emit(state.copyWith(voiceName: () => name));
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(StorageKey.ttsVoice.key, name);
  }

  @override
  Future<void> close() async {
    await stop();
    return super.close();
  }
}
