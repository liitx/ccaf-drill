import 'dart:async';

import 'package:ccaf_drill/domain/storage_key.dart';
import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// App-level settings: theme + first-visit tour persistence.
final class SettingsState extends Equatable {
  /// Creates settings state (dark is the product default).
  const SettingsState({
    this.darkMode = true,
    this.tourDone = false,
    this.loaded = false,
  });

  /// Dark theme active.
  final bool darkMode;

  /// The first-visit tour has been completed or skipped.
  final bool tourDone;

  /// Persisted values have been read — gate anything that must not act on
  /// defaults (the tour would flash for returning users otherwise).
  final bool loaded;

  /// Copy with updates.
  SettingsState copyWith({bool? darkMode, bool? tourDone, bool? loaded}) =>
      SettingsState(
        darkMode: darkMode ?? this.darkMode,
        tourDone: tourDone ?? this.tourDone,
        loaded: loaded ?? this.loaded,
      );

  @override
  List<Object> get props => [darkMode, tourDone, loaded];
}

/// Loads/persists settings via SharedPreferences (same keys as the web app).
final class SettingsCubit extends Cubit<SettingsState> {
  /// Creates the cubit and loads persisted values.
  SettingsCubit() : super(const SettingsState()) {
    unawaited(_load());
  }

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    emit(
      state.copyWith(
        tourDone: prefs.getString(StorageKey.tourDone.key) == '1',
        loaded: true,
      ),
    );
  }

  /// Flip light/dark.
  void toggleTheme() => emit(state.copyWith(darkMode: !state.darkMode));

  /// Persist that the tour is done (web-compatible '1' marker).
  Future<void> markTourDone() async {
    emit(state.copyWith(tourDone: true));
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(StorageKey.tourDone.key, '1');
  }
}
