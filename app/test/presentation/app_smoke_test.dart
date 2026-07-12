// Widget smoke: the app boots on real data, tabs switch, a drill card
// expands, reveal shows the verdict badge, and the exam starts.
// Rendered-size lessons from the web suite apply: assert visible content,
// not mere existence.
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

  testWidgets('boots into Key, switches rooms, drills Q1', (tester) async {
    tester.view.physicalSize = const Size(1400, 1000);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);

    // Pre-warm the repository so the FutureBuilder resolves on first pump
    // (the loading spinner animates forever and defeats pumpAndSettle).
    final repository = AssetQuestionRepository();
    await tester.runAsync(repository.loadQuestions);
    await tester.pumpWidget(CcafDrillApp(repository: repository));
    await tester.pumpAndSettle();

    // Key room by default.
    expect(find.text('How to use this tool'), findsOneWidget);

    // Drill room: toolbar + Q1 card.
    await tester.tap(find.text('DRILL'));
    await tester.pumpAndSettle();
    // Web .fbtn 'All 60', uppercased by WebChip.
    expect(find.text('ALL 60'), findsOneWidget);
    expect(find.text('Q1'), findsWidgets);

    // Expand Q1 → reveal → verdict badge appears.
    await tester.tap(find.text('Q1').first);
    await tester.pumpAndSettle();
    expect(find.text('Reveal answer'), findsOneWidget);
    await tester.ensureVisible(find.text('Reveal answer'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Reveal answer'));
    await tester.pumpAndSettle();
    expect(find.text('✓ PICK'), findsOneWidget);
    expect(find.text('Hide answer'), findsOneWidget);

    // Exam room: start screen with the three modes.
    await tester.tap(find.text('EXAM'));
    await tester.pumpAndSettle();
    expect(find.text('Easy'), findsOneWidget);
    expect(find.text('Hard — 1:1'), findsOneWidget);
  });
}
