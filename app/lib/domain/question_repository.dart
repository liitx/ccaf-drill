import 'package:ccaf_drill/domain/question.dart';

/// Source of the 60 questions.
///
/// Implementations parse once and return the same immutable list thereafter
/// (claudart Law 4: parse once, pass immutable).
// ignore: one_member_abstracts — the seam exists for test fakes.
abstract interface class QuestionRepository {
  /// All questions in data-file order (defines card order everywhere).
  Future<List<Question>> loadQuestions();
}
