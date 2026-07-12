// Spotlight walkthrough: launched from the tour CTA, steps through all 11
// components with auto-navigation (Key → Drill → exam tab), finishes clean.
import 'package:ccaf_drill/data/asset_question_repository.dart';
import 'package:ccaf_drill/main.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUpAll(() {
    GoogleFonts.config.allowRuntimeFetching = false;
    SharedPreferences.setMockInitialValues({'ccaf_tour_done': '1'});
  });

  testWidgets('tour CTA launches the 11-step walkthrough', (tester) async {
    tester.view.physicalSize = const Size(1400, 1000);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);

    final repository = AssetQuestionRepository();
    await tester.runAsync(repository.loadQuestions);
    await tester.pumpWidget(CcafDrillApp(repository: repository));
    await tester.pumpAndSettle();

    // Replay the tour, skip to the last slide, take the CTA.
    await tester.tap(find.text('? TOUR'));
    await tester.pumpAndSettle();
    for (var i = 0; i < 3; i++) {
      await tester.tap(find.text('Next →'));
      await tester.pumpAndSettle();
    }
    await tester.tap(find.text('Walk me through the screen →'));
    await tester.pumpAndSettle();

    // Walk all 11 steps; every step must render its numbered tooltip.
    for (var step = 1; step <= 11; step++) {
      expect(
        find.text('COMPONENT $step / 11'),
        findsOneWidget,
        reason: 'step $step tooltip missing',
      );
      await tester.tap(find.text(step == 11 ? 'Finish' : 'Next →'));
      await tester.pumpAndSettle();
    }

    // Overlay gone, restored to the Key room.
    expect(find.textContaining('COMPONENT'), findsNothing);
    expect(find.text('HOW TO USE THIS TOOL'), findsOneWidget);
  });
}
