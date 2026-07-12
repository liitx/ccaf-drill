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
import 'package:ccaf_drill/presentation/widgets/web_chip.dart';
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
      body: Column(
        children: [
          ContentColumn(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const _SiteHeader(),
                  TabChrome(
                    room: _room,
                    onChanged: (room) {
                      context.read<TtsCubit>().stop();
                      setState(() => _room = room);
                    },
                  ),
                ],
              ),
            ),
          ),
          Expanded(
            child: switch (_room) {
              AppRoom.key => KeyView(questions: widget.questions),
              AppRoom.drill => DrillView(questions: widget.questions),
              AppRoom.exam => const ExamView(),
            },
          ),
        ],
      ),
    );
  }
}

/// The web header: uppercase Barlow title with the washed 'drill' word and
/// the dim subtitle (h1 / h1 em / .sub in styles.css).
class _SiteHeader extends StatelessWidget {
  const _SiteHeader();

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text.rich(
          TextSpan(
            style: context.display(30, weight: FontWeight.w700),
            children: [
              const TextSpan(text: 'CCA-F '),
              TextSpan(
                text: 'DRILL',
                style: TextStyle(backgroundColor: p.highlightWash),
              ),
              const TextSpan(text: ' · PATTERN KEY + 60Q'),
            ],
          ),
        ),
        const SizedBox(height: 2),
        Text(
          'Key = one panel per set: how to recognize it, the one rule, and '
          'every member question lined up. Drill = flag questions, answer '
          'in your head, hit one Reveal — verdicts appear inline.',
          style: TextStyle(fontSize: 13.5, color: p.dim),
        ),
      ],
    );
  }
}

/// The web .tabs bar: Key/Drill/Exam tab buttons, the flag-count note,
/// then the ◐ theme and ? Tour buttons, over a 2px ink rule.
class TabChrome extends StatelessWidget {
  /// Creates the tab strip.
  const TabChrome({required this.room, required this.onChanged, super.key});

  /// Selected room.
  final AppRoom room;

  /// Room change callback (stops speech, mirrors the web tab()).
  final ValueChanged<AppRoom> onChanged;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final settings = context.watch<SettingsCubit>().state;
    final flagged = context.watch<DrillCubit>().state.flagged.length;

    return Container(
      padding: const EdgeInsets.only(top: 10, bottom: 8),
      decoration: BoxDecoration(
        border: Border(bottom: BorderSide(color: p.ink, width: 2)),
      ),
      child: Row(
        children: [
          for (final candidate in AppRoom.values)
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: WebChip(
                label: candidate.label,
                selected: room == candidate,
                fontSize: 16,
                radius: 8,
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 6,
                ),
                onTap: () => onChanged(candidate),
              ),
            ),
          const Spacer(),
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: Text(
              '$flagged flagged',
              style: TextStyle(fontSize: 12.5, color: p.dim),
            ),
          ),
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: WebChip(
              label: settings.darkMode ? '◑ Light' : '◐ Dark',
              fontSize: 16,
              radius: 8,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              onTap: () => context.read<SettingsCubit>().toggleTheme(),
            ),
          ),
          WebChip(
            label: '? Tour',
            fontSize: 16,
            radius: 8,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            onTap: () => showOnboardingTour(context),
          ),
        ],
      ),
    );
  }
}
