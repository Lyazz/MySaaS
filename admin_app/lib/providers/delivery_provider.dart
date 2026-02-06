import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/delivery_provider.dart';

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
  @override
  DeliveryState build() {
    return DeliveryState(
      providers: [
        DeliveryProvider(
          id: 'YALIDINE',
          name: 'Yalidine Express',
          description: 'National delivery network',
          isEnabled: true,
        ),
        DeliveryProvider(
          id: 'MAYSTRO',
          name: 'Maystro Delivery',
          description: 'E-commerce logistics',
          isEnabled: false,
        ),
        DeliveryProvider(
          id: 'SELF',
          name: 'Self Delivery',
          description: 'Internal fleet management',
          isEnabled: true,
        ),
      ],
    );
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
