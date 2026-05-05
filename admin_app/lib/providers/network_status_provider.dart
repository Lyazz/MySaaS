import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/app_mode.dart';
import 'auth_provider.dart';

enum NetworkStatus { online, offlineTenant, noConnection }

class NetworkStatusNotifier extends Notifier<NetworkStatus> {
  StreamSubscription<List<ConnectivityResult>>? _subscription;
  bool _initialized = false;

  @override
  NetworkStatus build() {
    _initOnce();
    final authState = ref.watch(authProvider);
    return authState.mode == AppMode.offlineOnly
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
    if (authState.mode == AppMode.offlineOnly) {
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
