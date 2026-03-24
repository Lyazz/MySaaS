import 'dart:convert';
import 'package:uuid/uuid.dart';
import 'package:sqflite_sqlcipher/sqflite.dart';

import '../models/purchase.dart';
import '../services/api_service.dart';
import '../services/database_service.dart';
import '../services/sync_service.dart';

class PurchaseRepository {
  final ApiService _apiService;
  final DatabaseService _dbService = DatabaseService();
  final SyncService _syncService = SyncService();

  PurchaseRepository(this._apiService);

  Future<List<Purchase>> getPurchases({
    bool forceRefresh = false,
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    final db = await _dbService.database;
    final localData = await db.query('purchases');

    final localPurchases = localData.map((e) {
      final itemsJson = e['itemsJson'] != null
          ? jsonDecode(e['itemsJson'].toString())
          : [];
      return Purchase.fromJson({
        'id': e['id'],
        'supplierId': e['supplierId'],
        'supplierName': e['supplierName'],
        'supplierEmail': e['supplierEmail'],
        'supplierPhone': e['supplierPhone'],
        'totalAmount': e['totalAmount'],
        'status': e['status'],
        'createdAt': e['createdAt'],
        'notes': e['notes'],
        'items': itemsJson,
      });
    }).toList();

    if (forceRefresh || await _syncService.isOnline) {
      try {
        final queryParams = <String, dynamic>{};
        if (startDate != null) {
          queryParams['startDate'] = startDate.toIso8601String();
        }
        if (endDate != null) queryParams['endDate'] = endDate.toIso8601String();

        final response = await _apiService.client.get(
          '/admin/purchases',
          queryParameters: queryParams,
        );
        final List<dynamic> remoteData = response.data;
        final remotePurchases = remoteData
            .map((e) => Purchase.fromJson(e))
            .toList();

        await db.transaction((txn) async {
          await txn.delete('purchases', where: "syncStatus = 'synced'");
          for (var p in remotePurchases) {
            final itemsJsonList = p.items
                .map(
                  (i) => {
                    'id': i.id,
                    'variantId': i.productId,
                    'variant': {
                      'product': {'title': i.productName},
                      'sku': i.sku,
                    },
                    'quantityOrdered': i.quantityOrdered,
                    'quantityReceived': i.quantityReceived,
                    'unitCost': i.unitCost,
                  },
                )
                .toList();

            await txn.insert('purchases', {
              'id': p.id,
              'supplierId': p.supplierId,
              'supplierName': p.supplierName,
              'supplierEmail': p.supplierEmail,
              'supplierPhone': p.supplierPhone,
              'totalAmount': p.totalAmount,
              'status': p.status,
              'createdAt': p.createdAt.toIso8601String(),
              'notes': p.notes,
              'itemsJson': jsonEncode(itemsJsonList),
              'syncStatus': 'synced',
            }, conflictAlgorithm: ConflictAlgorithm.replace);
          }
        });
        return remotePurchases;
      } catch (e) {
        print('Background purchase fetch failed: \$e');
      }
    }
    return localPurchases;
  }

  Future<Purchase?> getPurchase(String id) async {
    final db = await _dbService.database;
    final localData = await db.query(
      'purchases',
      where: 'id = ?',
      whereArgs: [id],
    );

    Purchase? localPurchase;
    if (localData.isNotEmpty) {
      final e = localData.first;
      final itemsJson = e['itemsJson'] != null
          ? jsonDecode(e['itemsJson'].toString())
          : [];
      localPurchase = Purchase.fromJson({
        'id': e['id'],
        'supplierId': e['supplierId'],
        'supplierName': e['supplierName'],
        'supplierEmail': e['supplierEmail'],
        'supplierPhone': e['supplierPhone'],
        'totalAmount': e['totalAmount'],
        'status': e['status'],
        'createdAt': e['createdAt'],
        'notes': e['notes'],
        'items': itemsJson,
      });
    }

    if (await _syncService.isOnline) {
      try {
        final response = await _apiService.client.get('/admin/purchases/$id');
        final remotePurchase = Purchase.fromJson(response.data);

        // Update local single
        final itemsJsonList = remotePurchase.items
            .map(
              (i) => {
                'id': i.id,
                'variantId': i.productId,
                'variant': {
                  'product': {'title': i.productName},
                  'sku': i.sku,
                },
                'quantityOrdered': i.quantityOrdered,
                'quantityReceived': i.quantityReceived,
                'unitCost': i.unitCost,
              },
            )
            .toList();

        await db.insert('purchases', {
          'id': remotePurchase.id,
          'supplierId': remotePurchase.supplierId,
          'supplierName': remotePurchase.supplierName,
          'supplierEmail': remotePurchase.supplierEmail,
          'supplierPhone': remotePurchase.supplierPhone,
          'totalAmount': remotePurchase.totalAmount,
          'status': remotePurchase.status,
          'createdAt': remotePurchase.createdAt.toIso8601String(),
          'notes': remotePurchase.notes,
          'itemsJson': jsonEncode(itemsJsonList),
          'syncStatus': 'synced',
        }, conflictAlgorithm: ConflictAlgorithm.replace);

        return remotePurchase;
      } catch (e) {
        print('Background single purchase fetch failed: \$e');
      }
    }
    return localPurchase;
  }

  Future<Purchase> createDraftPurchase(
    String supplierId,
    String supplierName,
  ) async {
    final db = await _dbService.database;
    final online = await _syncService.isOnline;

    final id = const Uuid().v4();
    final newPurchase = Purchase.fromJson({
      'id': id,
      'supplierId': supplierId,
      'supplierName': supplierName,
      'totalAmount': 0.0,
      'status': 'PENDING',
      'createdAt': DateTime.now().toIso8601String(),
      'items': [],
    });

    await db.insert('purchases', {
      'id': newPurchase.id,
      'supplierId': newPurchase.supplierId,
      'supplierName': newPurchase.supplierName,
      'totalAmount': newPurchase.totalAmount,
      'status': newPurchase.status,
      'createdAt': newPurchase.createdAt.toIso8601String(),
      'itemsJson': '[]',
      'syncStatus': online ? 'synced' : 'pending',
    });

    await _syncService.enqueueOperation(
      entityType: 'purchase',
      action: 'createDraft',
      payload: {'supplierId': supplierId, 'offlineId': id},
    );

    return newPurchase;
  }

  Future<void> addPurchaseItem(String purchaseId, PurchaseItem item) async {
    final online = await _syncService.isOnline;

    // We would ideally update the local SQLite row's JSON buffer here immediately for offline UI
    // but typically purchase editing happens mostly online.
    // We queue the action for the server.
    await _syncService.enqueueOperation(
      entityType: 'purchase',
      action: 'addItem',
      payload: {
        'purchaseId': purchaseId,
        'variantId': item.productId,
        'quantityOrdered': item.quantityOrdered,
        'unitCost': item.unitCost,
      },
    );

    // We trigger an optimistic background fetch if online so the local DB gets the real item ID
    if (online) {
      // Small delay to let sync queue trigger
      Future.delayed(const Duration(milliseconds: 500), () {
        getPurchase(purchaseId);
      });
    }
  }

  Future<void> receiveItem(
    String purchaseId,
    String itemId,
    double quantityReceived, {
    String salePriceMode = 'replace',
  }) async {
    await _syncService.enqueueOperation(
      entityType: 'purchase',
      action: 'receiveItem',
      payload: {
        'purchaseId': purchaseId,
        'salePriceMode': salePriceMode,
        'items': [
          {'itemId': itemId, 'quantityReceived': quantityReceived},
        ],
      },
    );
  }

  Future<void> updatePurchaseItem(
    String purchaseId,
    String itemId, {
    double? quantity,
    double? cost,
  }) async {
    final payload = <String, dynamic>{
      'purchaseId': purchaseId,
      'itemId': itemId,
    };
    if (quantity != null) payload['quantityOrdered'] = quantity;
    if (cost != null) payload['unitCost'] = cost;

    await _syncService.enqueueOperation(
      entityType: 'purchase',
      action: 'updateItem',
      payload: payload,
    );
  }

  Future<void> removePurchaseItem(String purchaseId, String itemId) async {
    await _syncService.enqueueOperation(
      entityType: 'purchase',
      action: 'removeItem',
      payload: {'purchaseId': purchaseId, 'itemId': itemId},
    );
  }

  Future<void> deletePurchase(String id) async {
    final db = await _dbService.database;
    await db.delete('purchases', where: 'id = ?', whereArgs: [id]);

    await _syncService.enqueueOperation(
      entityType: 'purchase',
      action: 'delete',
      payload: {'id': id},
    );
  }

  Future<void> updateStatus(String id, String status) async {
    final db = await _dbService.database;
    final online = await _syncService.isOnline;

    await db.update(
      'purchases',
      {'status': status, 'syncStatus': online ? 'synced' : 'pending'},
      where: 'id = ?',
      whereArgs: [id],
    );

    await _syncService.enqueueOperation(
      entityType: 'purchase',
      action: 'updateStatus',
      payload: {'id': id, 'status': status},
    );
  }
}
