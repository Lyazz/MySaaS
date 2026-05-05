import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../services/api_service.dart';
import '../services/database_service.dart';
import '../services/sync_service.dart';
import '../services/tenant_mode_service.dart';

final databaseServiceProvider = Provider<DatabaseService>((ref) {
  return DatabaseService();
});

final syncServiceProvider = Provider<SyncService>((ref) {
  final api = ref.watch(apiProvider);
  final mode = TenantModeService().mode;
  final service = SyncService();
  service.initialize(api, mode: mode);
  return service;
});
