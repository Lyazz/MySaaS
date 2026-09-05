import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/delivery_provider.dart';
import '../repositories/delivery_provider_repository.dart';
import '../services/api_service.dart';

class DeliveryState {
  final List<DeliveryProvider> providers;
  final bool isLoading;
  final String? error;

  DeliveryState({
    this.providers = const [],
    this.isLoading = false,
    this.error,
  });

  DeliveryState copyWith({
    List<DeliveryProvider>? providers,
    bool? isLoading,
    String? error,
  }) {
    return DeliveryState(
      providers: providers ?? this.providers,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

class DeliveryNotifier extends Notifier<DeliveryState> {
  late DeliveryProviderRepository _repo;

  @override
  DeliveryState build() {
    final api = ref.watch(apiProvider);
    _repo = DeliveryProviderRepository(api);
    Future.microtask(() => loadProviders());
    return DeliveryState();
  }

  Future<void> loadProviders({bool forceRefresh = false}) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final providers = await _repo.getProviders(forceRefresh: forceRefresh);
      state = state.copyWith(
        providers: providers,
        isLoading: false,
        error: null,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> setOffered(String id, bool offered) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final updated = await _repo.setOffered(id, offered);
      _applyUpdate(updated);
      state = state.copyWith(isLoading: false, error: null);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      rethrow;
    }
  }

  Future<void> saveAccount(
    String provider, {
    bool? offered,
    bool? isActive,
    Map<String, String>? config,
  }) async {
    final updated = await _repo.saveAccount(
      provider,
      offered: offered,
      isActive: isActive,
      config: config,
    );
    _applyUpdate(updated);
  }

  void _applyUpdate(DeliveryProvider updated) {
    final providers = [
      for (final provider in state.providers)
        if (provider.id == updated.id) updated else provider,
    ];
    state = state.copyWith(providers: providers);
  }
}

final deliveryProviderProvider =
    NotifierProvider<DeliveryNotifier, DeliveryState>(DeliveryNotifier.new);
