/// Persistent-settings keys (SharedPreferences).
///
/// Mirrors `StorageKey` in src/assets/domain.js — same key strings, so a
/// future migration can read either store.
enum StorageKey {
  /// Set once the first-visit tour has been completed or skipped.
  tourDone('ccaf_tour_done'),

  /// Chosen TTS playback rate.
  ttsRate('ccaf_tts_rate'),

  /// Chosen TTS voice name.
  ttsVoice('ccaf_tts_voice');

  const StorageKey(this.key);

  /// The raw preferences key.
  final String key;
}
