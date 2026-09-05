import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../services/app_storage.dart';

class SettingsState {
  final ThemeMode themeMode;
  final bool notificationsEnabled;
  final String currency;

  SettingsState({
    this.themeMode = ThemeMode.system,
    this.notificationsEnabled = true,
    this.currency = 'USD',
  });

  SettingsState copyWith({
    ThemeMode? themeMode,
    bool? notificationsEnabled,
    String? currency,
  }) {
    return SettingsState(
      themeMode: themeMode ?? this.themeMode,
      notificationsEnabled: notificationsEnabled ?? this.notificationsEnabled,
      currency: currency ?? this.currency,
    );
  }
}

class SettingsNotifier extends Notifier<SettingsState> {
  bool _hydrated = false;

  @override
  SettingsState build() {
    if (!_hydrated) {
      _hydrated = true;
      _hydrateFromStorage();
    }
    return SettingsState();
  }

  Future<void> _hydrateFromStorage() async {
    final stored = await AppStorage.loadThemeMode();
    if (stored != null) {
      state = state.copyWith(themeMode: stored);
    }
  }

  void toggleTheme() {
    final next = state.themeMode == ThemeMode.light
        ? ThemeMode.dark
        : ThemeMode.light;
    state = state.copyWith(
      themeMode: state.themeMode == ThemeMode.light
          ? ThemeMode.dark
          : ThemeMode.light,
    );
    AppStorage.saveThemeMode(next);
  }

  void setThemeMode(ThemeMode mode) {
    state = state.copyWith(themeMode: mode);
    AppStorage.saveThemeMode(mode);
  }

  void toggleNotifications(bool value) {
    state = state.copyWith(notificationsEnabled: value);
  }

  void setCurrency(String currency) {
    state = state.copyWith(currency: currency);
  }
}

final settingsProvider = NotifierProvider<SettingsNotifier, SettingsState>(
  SettingsNotifier.new,
);
