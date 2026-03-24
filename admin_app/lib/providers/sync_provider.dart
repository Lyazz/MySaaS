import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../services/api_service.dart';
import '../services/sync_service.dart';
import 'auth_provider.dart';

final syncServiceProvider = Provider<SyncService>((ref) {
  final api = ref.watch(apiProvider);
  final auth = ref.watch(authProvider);

  final service = SyncService();
  service.initialize(
    api,
    isOfflineTenant: auth.user?.isOfflineTenant ?? false,
  );
  return service;
});

