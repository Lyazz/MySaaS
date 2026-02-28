import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/store_settings.dart';
import '../services/api_service.dart';

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
  @override
  StoreSettingsState build() {
    return const StoreSettingsState(settings: StoreSettings.empty, isLoading: false);
  }

  Future<void> fetchStoreSettings() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final api = ref.read(apiProvider);
      final response = await api.client.get('/admin/store-settings');
      final raw = (response.data as Map?)?.cast<String, dynamic>() ?? const {};
      final settings = StoreSettings.fromJson(raw);
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

