import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers/delivery_provider.dart';

class DeliveryScreen extends ConsumerWidget {
  const DeliveryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final deliveryState = ref.watch(deliveryProviderProvider);

    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Delivery Settings',
            style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          const Text(
            'Manage delivery providers and rates',
            style: TextStyle(color: Colors.grey),
          ),
          const SizedBox(height: 32),
          Expanded(
            child: GridView.builder(
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 3,
                crossAxisSpacing: 24,
                mainAxisSpacing: 24,
                childAspectRatio: 1.5,
              ),
              itemCount: deliveryState.providers.length,
              itemBuilder: (context, index) {
                final provider = deliveryState.providers[index];
                return Stack(
                  children: [
                    Container(
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: provider.isEnabled
                              ? Colors.teal[200]!
                              : Colors.grey[200]!,
                          width: 2,
                        ),
                        boxShadow: [
                          if (provider.isEnabled)
                            BoxShadow(
                              color: Colors.teal.withValues(alpha: 0.1),
                              blurRadius: 10,
                              offset: const Offset(0, 4),
                            ),
                        ],
                      ),
                      padding: const EdgeInsets.all(24),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: Colors.grey[100],
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Text(
                                  provider.name[0],
                                  style: const TextStyle(
                                    fontSize: 24,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 16),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      provider.name,
                                      style: const TextStyle(
                                        fontSize: 18,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                    Text(
                                      provider.description ?? '',
                                      style: TextStyle(
                                        fontSize: 12,
                                        color: Colors.grey[600],
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const Spacer(),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                provider.isEnabled ? 'Active' : 'Inactive',
                                style: TextStyle(
                                  color: provider.isEnabled
                                      ? Colors.teal
                                      : Colors.grey,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              Switch(
                                value: provider.isEnabled,
                                activeTrackColor: Colors.teal,
                                onChanged: (_) => ref
                                    .read(deliveryProviderProvider.notifier)
                                    .toggleProvider(provider.id),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    if (deliveryState.isLoading)
                      const Positioned.fill(
                        child: Center(child: CircularProgressIndicator()),
                      ),
                  ],
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
