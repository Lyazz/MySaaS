import 'dart:convert';
import 'package:uuid/uuid.dart';

import '../services/api_service.dart';
import '../services/database_service.dart';
import '../services/sync_service.dart';

class PosSaleRepository {
  final ApiService _apiService;
  final DatabaseService _dbService = DatabaseService();
  final SyncService _syncService = SyncService();

  PosSaleRepository(this._apiService);

  /// Creates a sale. Writes to SQLite and enqueue for sync.
  Future<String> createSale(Map<String, dynamic> payload) async {
    final db = await _dbService.database;
    final online = await _syncService.isOnline;

    // Generate an offline ID
    final saleId = const Uuid().v4();
    payload['offlineId'] =
        saleId; // Help backend track offline vs online if needed

    // Calculate total from payload for local reference if needed
    double total = 0.0;
    if (payload['payment'] != null && payload['payment']['total'] != null) {
      total = payload['payment']['total'].toDouble();
    } else if (payload['items'] != null) {
      // Fallback calculation
      for (var item in (payload['items'] as List)) {
        total += (item['price'] * item['quantity']);
      }
    }

    // Insert locally
    await db.insert('sales', {
      'id': saleId,
      'customerId': payload['customerId'],
      'total': total,
      'status': 'completed', // Or whatever local status is appropriate
      'createdAt': DateTime.now().toIso8601String(),
      'payloadJson': jsonEncode(payload),
      'syncStatus': online
          ? 'synced'
          : 'pending', // Simplification. SyncQueue handles real status
    });

    // Enqueue for background sync
    await _syncService.enqueueOperation(
      entityType: 'sale',
      action: 'create',
      payload: payload,
    );

    // Try to sync immediately if we mapped it to online
    if (online) {
      // We could optionally wait for the sync to finish here to return the REAL server ID
      // but for offline-first, returning the local ID immediately is faster UX.
    }

    return saleId;
  }
}
