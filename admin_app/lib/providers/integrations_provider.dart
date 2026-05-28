import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/integration.dart';
import '../repositories/integrations_repository.dart';
import '../services/api_service.dart';

class IntegrationsState {
  final Integration facebook;
  final Integration telegram;
  final bool isLoading;
  final String? error;

  const IntegrationsState({
    required this.facebook,
    required this.telegram,
    this.isLoading = false,
    this.error,
  });

  IntegrationsState copyWith({
    Integration? facebook,
    Integration? telegram,
    bool? isLoading,
    String? error,
  }) {
    return IntegrationsState(
      facebook: facebook ?? this.facebook,
      telegram: telegram ?? this.telegram,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }

  static IntegrationsState get initial => IntegrationsState(
    facebook: Integration.empty('facebook'),
    telegram: Integration.empty('telegram'),
  );
}

class IntegrationsNotifier extends Notifier<IntegrationsState> {
  late IntegrationsRepository _repo;

  @override
  IntegrationsState build() {
    final api = ref.watch(apiProvider);
    _repo = IntegrationsRepository(api);
    Future.microtask(fetch);
    return IntegrationsState.initial;
  }

  Future<void> fetch() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final results = await Future.wait([
        _repo.getIntegration('facebook'),
        _repo.getIntegration('telegram'),
      ]);
      state = state.copyWith(
        facebook: results[0],
        telegram: results[1],
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> save(String provider, Map<String, dynamic> config) async {
    final updated = await _repo.saveIntegration(provider, config);
    if (provider == 'facebook') {
      state = state.copyWith(facebook: updated);
    } else if (provider == 'telegram') {
      state = state.copyWith(telegram: updated);
    }
  }
}

final integrationsProvider =
    NotifierProvider<IntegrationsNotifier, IntegrationsState>(
      IntegrationsNotifier.new,
    );
