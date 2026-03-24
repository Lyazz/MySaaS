import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/store_settings.dart';
import '../services/api_service.dart';
import '../repositories/store_settings_repository.dart';

class StoreSettingsState {
  final StoreSettings settings;
  final bool isLoading;
  final String? error;

  const StoreSettingsState({
    required this.settings,
    required this.isLoading,
    this.error,
  });

  StoreSettingsState copyWith({
    StoreSettings? settings,
    bool? isLoading,
    String? error,
  }) {
    return StoreSettingsState(
      settings: settings ?? this.settings,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

class StoreSettingsNotifier extends Notifier<StoreSettingsState> {
  late final StoreSettingsRepository _repo;

  @override
  StoreSettingsState build() {
    final api = ref.watch(apiProvider);
    _repo = StoreSettingsRepository(api);
    Future.microtask(() => fetchStoreSettings());
    return const StoreSettingsState(
      settings: StoreSettings.empty,
      isLoading: true,
    );
  }

  Future<void> fetchStoreSettings({bool forceRefresh = false}) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final settings = await _repo.getStoreSettings(forceRefresh: forceRefresh);
      state = state.copyWith(settings: settings, isLoading: false, error: null);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }
}

final storeSettingsProvider =
    NotifierProvider<StoreSettingsNotifier, StoreSettingsState>(
      StoreSettingsNotifier.new,
    );
