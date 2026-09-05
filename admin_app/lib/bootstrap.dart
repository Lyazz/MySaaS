import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app_config.dart';
import 'models/bootstrap_config.dart';

class BootstrapNotifier extends Notifier<BootstrapConfig> {
  BootstrapNotifier([
    this._initial = const BootstrapConfig(apiBaseUrl: defaultApiBaseUrl),
  ]);

  final BootstrapConfig _initial;

  @override
  BootstrapConfig build() => _initial;

  void replace(BootstrapConfig next) {
    if (next == state) return;
    state = next;
  }
}

final bootstrapProvider = NotifierProvider<BootstrapNotifier, BootstrapConfig>(
  BootstrapNotifier.new,
);
