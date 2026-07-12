/// Assist and speech vocabulary shared by the drill dock and the exam bar.
///
/// Mirrors `DockAction` + `SpeechScope` in src/assets/domain.js. Enum
/// relationships are expressed as const maps (claudart Law 2) and mode
/// membership as const sets (Law 3).
library;

/// One action button on the drill dock or the exam assist bar.
enum AssistAction {
  /// 💡 What the question is really asking (never spoils).
  hint(label: '💡 Hint'),

  /// 🖍 Giveaway-phrase wash on/off for this question.
  highlights(label: '🖍 HL'),

  /// ⌁ All four choices as one-line pseudo-code.
  gists(label: '⌁ Gists'),

  /// ◦ Plain-words rephrase of the choices (exam bar only).
  plainWords(label: '◦ plain words'),

  /// The winning mechanism + snippet.
  example(label: 'In practice'),

  /// 🤖 Copy the Ask-Claude JSON packet.
  askClaude(label: '🤖 Ask'),

  /// 🔊 Read the question stem aloud.
  speakQuestion(label: '🔊 Question'),

  /// 🔊 Read the four choices aloud.
  speakChoices(label: '🔊 Choices'),

  /// 🔊 Read the full answer reasoning aloud (gated behind reveal).
  speakWhy(label: '🔊 Why'),

  /// ⚙ Voice + playback speed settings.
  voiceSettings(label: '⚙ Voice'),

  /// Reveal / hide the answer.
  reveal(label: 'Reveal');

  const AssistAction({required this.label});

  /// Button label.
  final String label;

  /// Whether this action speaks (drives TTS gating and unsupported-hiding).
  bool get isSpeak => speechScopeFor.containsKey(this);
}

/// What the TTS reads for one speak action.
enum SpeechScope {
  /// The verbatim stem.
  question,

  /// All four options (plain rephrase when a choice has plain unfolded).
  choices,

  /// The full reveal walkthrough: pick, each wrong choice, the set rule.
  revealWhy,
}

/// Speak action → what it reads (claudart Law 2: const map, exhaustive by
/// test `speechScopeFor.length == 3`).
const Map<AssistAction, SpeechScope> speechScopeFor = {
  AssistAction.speakQuestion: SpeechScope.question,
  AssistAction.speakChoices: SpeechScope.choices,
  AssistAction.speakWhy: SpeechScope.revealWhy,
};
