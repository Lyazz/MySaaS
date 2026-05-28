import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

enum NetworkStatus { connected, disconnected }

class NetworkStatusNotifier extends Notifier<NetworkStatus> {
  StreamSubscription<List<ConnectivityResult>>? _subscription;
  bool _initialized = false;

  @override
  NetworkStatus build() {
    _initOnce();
    return NetworkStatus.disconnected;
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
    final hasConnection = results.any((r) => r != ConnectivityResult.none);
    state = hasConnection
        ? NetworkStatus.connected
        : NetworkStatus.disconnected;
  }
}

final networkStatusProvider =
    NotifierProvider<NetworkStatusNotifier, NetworkStatus>(
      NetworkStatusNotifier.new,
    );
