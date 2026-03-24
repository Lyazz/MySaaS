import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'dart:async';

import 'auth_provider.dart';

enum NetworkStatus { online, offlineTenant, noConnection }

class NetworkStatusNotifier extends Notifier<NetworkStatus> {
  StreamSubscription<List<ConnectivityResult>>? _subscription;
  bool _initialized = false;

  @override
  NetworkStatus build() {
    _initOnce();

    // Watch auth state to rebuild when tenant plan changes or user logs in/out
    final authState = ref.watch(authProvider);
    final isOfflineTenant = authState.user?.isOfflineTenant ?? false;

    // We assume default status until the async check finishes
    return isOfflineTenant
        ? NetworkStatus.offlineTenant
        : NetworkStatus.noConnection;
  }

  void _initOnce() {
    if (_initialized) return;
    _initialized = true;

    final connectivity = Connectivity();
    _subscription = connectivity.onConnectivityChanged.listen(_checkStatus);
    connectivity.checkConnectivity().then(_checkStatus);

    ref.onDispose(() {
      _subscription?.cancel();
      _subscription = null;
    });
  }

  void _checkStatus(List<ConnectivityResult> results) {
    final authState = ref.read(authProvider);
    final isOfflineTenant = authState.user?.isOfflineTenant ?? false;

    if (isOfflineTenant) {
      state = NetworkStatus.offlineTenant;
      return;
    }

    final hasConnection = results.any((r) => r != ConnectivityResult.none);
    state = hasConnection ? NetworkStatus.online : NetworkStatus.noConnection;
  }
}

final networkStatusProvider =
    NotifierProvider<NetworkStatusNotifier, NetworkStatus>(
      NetworkStatusNotifier.new,
    );
