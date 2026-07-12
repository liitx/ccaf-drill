import 'package:ccaf_drill/application/drill_cubit.dart';
import 'package:ccaf_drill/application/exam_cubit.dart';
import 'package:ccaf_drill/application/settings_cubit.dart';
import 'package:ccaf_drill/application/tts_cubit.dart';
import 'package:ccaf_drill/data/asset_question_repository.dart';
import 'package:ccaf_drill/domain/question.dart';
import 'package:ccaf_drill/domain/question_repository.dart';
import 'package:ccaf_drill/presentation/theme/app_theme.dart';
import 'package:ccaf_drill/presentation/views/drill_view.dart';
import 'package:ccaf_drill/presentation/views/exam_view.dart';
import 'package:ccaf_drill/presentation/views/key_view.dart';
import 'package:ccaf_drill/presentation/views/onboarding_tour.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

void main() {
  runApp(const CcafDrillApp());
}

/// Root widget: loads the questions once, then provides the cubits and the
/// three-room shell (Key / Drill / Exam).
class CcafDrillApp extends StatefulWidget {
  /// Creates the app; [repository] is injectable for tests.
  const CcafDrillApp({this.repository, super.key});

  /// Question source (defaults to the bundled assets).
  final QuestionRepository? repository;

  @override
  State<CcafDrillApp> createState() => _CcafDrillAppState();
}

class _CcafDrillAppState extends State<CcafDrillApp> {
  late final Future<List<Question>> _questions =
      (widget.repository ?? AssetQuestionRepository()).loadQuestions();

  @override
  Widget build(BuildContext context) => FutureBuilder<List<Question>>(
    // Parse once at startup; the repository caches the immutable list.
    future: _questions,
    builder: (context, snapshot) {
      final questions = snapshot.data;
      if (questions == null) {
        return const MaterialApp(
          home: Scaffold(body: Center(child: CircularProgressIndicator())),
        );
      }
      return MultiBlocProvider(
        providers: [
          BlocProvider(create: (_) => SettingsCubit()),
          BlocProvider(create: (_) => DrillCubit()),
          BlocProvider(create: (_) => TtsCubit()),
          BlocProvider(create: (_) => ExamCubit(questions: questions)),
        ],
        child: BlocBuilder<SettingsCubit, SettingsState>(
          builder: (context, settings) => MaterialApp(
            title: 'CCA-F Drill',
            debugShowCheckedModeBanner: false,
            theme: AppTheme.light(),
            darkTheme: AppTheme.dark(),
            themeMode: settings.darkMode ? ThemeMode.dark : ThemeMode.light,
            home: HomeShell(questions: questions),
          ),
        ),
      );
    },
  );
}

/// The three rooms of the app (Law 1: finite set → enum, never bare
/// strings; the body switch below is compiler-checked exhaustive).
enum AppRoom {
  /// Learn the patterns.
  key(label: 'KEY'),

  /// Practice with assists.
  drill(label: 'DRILL'),

  /// The 1:1 timed rehearsal.
  exam(label: 'EXAM');

  const AppRoom({required this.label});

  /// Tab label.
  final String label;
}

/// The three-room shell with the Key / Drill / Exam tabs, theme toggle,
/// and ? Tour replay.
class HomeShell extends StatefulWidget {
  /// Creates the shell over the loaded [questions].
  const HomeShell({required this.questions, super.key});

  /// All 60 questions.
  final List<Question> questions;

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  AppRoom _room = AppRoom.key;
  bool _tourChecked = false;

  @override
  Widget build(BuildContext context) {
    final settings = context.watch<SettingsCubit>().state;
    if (!_tourChecked && settings.loaded && !settings.tourDone) {
      _tourChecked = true;
      WidgetsBinding.instance.addPostFrameCallback(
        (_) => showOnboardingTour(context),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Text('CCA-F DRILL', style: context.display(18)),
        actions: [
          TextButton(
            onPressed: () => showOnboardingTour(context),
            child: const Text('? Tour'),
          ),
          IconButton(
            tooltip: 'Toggle theme',
            onPressed: () => context.read<SettingsCubit>().toggleTheme(),
            icon: Icon(settings.darkMode ? Icons.light_mode : Icons.dark_mode),
          ),
        ],
        bottom: TabChrome(
          room: _room,
          onChanged: (room) {
            context.read<TtsCubit>().stop();
            setState(() => _room = room);
          },
        ),
      ),
      body: switch (_room) {
        AppRoom.key => KeyView(questions: widget.questions),
        AppRoom.drill => DrillView(questions: widget.questions),
        AppRoom.exam => const ExamView(),
      },
    );
  }
}

/// The Key / Drill / Exam tab strip.
class TabChrome extends StatelessWidget implements PreferredSizeWidget {
  /// Creates the tab strip.
  const TabChrome({required this.room, required this.onChanged, super.key});

  /// Selected room.
  final AppRoom room;

  /// Room change callback (stops speech, mirrors the web tab()).
  final ValueChanged<AppRoom> onChanged;

  @override
  Size get preferredSize => const Size.fromHeight(44);

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 6),
    child: Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        for (final candidate in AppRoom.values)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4),
            child: ChoiceChip(
              label: Text(candidate.label),
              selected: room == candidate,
              onSelected: (_) => onChanged(candidate),
            ),
          ),
      ],
    ),
  );
}
