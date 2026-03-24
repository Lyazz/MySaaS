import 'package:sqflite_sqlcipher/sqflite.dart';

import '../models/delivery_provider.dart';
import '../services/api_service.dart';
import '../services/database_service.dart';
import '../services/sync_service.dart';

class DeliveryProviderRepository {
  final ApiService _apiService;
  final DatabaseService _dbService = DatabaseService();
  final SyncService _syncService = SyncService();

  DeliveryProviderRepository(this._apiService);

  Future<List<DeliveryProvider>> getProviders({
    bool forceRefresh = false,
  }) async {
    final db = await _dbService.database;
    final localData = await db.query('delivery_providers');

    final localProviders = localData
        .map(
          (e) => DeliveryProvider.fromMap({
            'id': e['id'],
            'name': e['name'],
            'description': e['description'],
            'isEnabled': e['isEnabled'] == 1,
          }),
        )
        .toList();

    if (forceRefresh || await _syncService.isOnline) {
      try {
        final res = await _apiService.client.get('/admin/delivery-providers');
        final List<dynamic> remoteData = res.data;
        final remoteProviders = remoteData
            .map((e) => DeliveryProvider.fromMap(e))
            .toList();

        await db.transaction((txn) async {
          await txn.delete(
            'delivery_providers',
            where: "syncStatus = 'synced'",
          );
          for (var p in remoteProviders) {
            await txn.insert('delivery_providers', {
              'id': p.id,
              'name': p.name,
              'description': p.description,
              'isEnabled': p.isEnabled ? 1 : 0,
              'syncStatus': 'synced',
            }, conflictAlgorithm: ConflictAlgorithm.replace);
          }
        });
        return remoteProviders;
      } catch (e) {
        print('Background delivery provider fetch failed: \$e');
      }
    }
    return localProviders;
  }
}
