import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/delivery_provider.dart';
import '../repositories/delivery_provider_repository.dart';
import '../services/api_service.dart';

class DeliveryState {
  final List<DeliveryProvider> providers;
  final bool isLoading;

  DeliveryState({this.providers = const [], this.isLoading = false});

  DeliveryState copyWith({List<DeliveryProvider>? providers, bool? isLoading}) {
    return DeliveryState(
      providers: providers ?? this.providers,
      isLoading: isLoading ?? this.isLoading,
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
    state = state.copyWith(isLoading: true);
    try {
      final providers = await _repo.getProviders(forceRefresh: forceRefresh);
      state = state.copyWith(providers: providers, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false);
    }
  }

  Future<void> toggleProvider(String id) async {
    state = state.copyWith(isLoading: true);
    await Future.delayed(const Duration(milliseconds: 300));
    final updatedProviders = state.providers.map((p) {
      if (p.id == id) {
        return p.copyWith(isEnabled: !p.isEnabled);
      }
      return p;
    }).toList();
    state = state.copyWith(providers: updatedProviders, isLoading: false);
  }
}

final deliveryProviderProvider =
    NotifierProvider<DeliveryNotifier, DeliveryState>(DeliveryNotifier.new);
