import 'dart:convert';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:uuid/uuid.dart';
import 'dart:async';

import 'database_service.dart';
import 'api_service.dart';
import '../utils/image_storage_manager.dart';

enum SyncStatus { pending, syncing, synced, failed }

class SyncOperation {
  final String id;
  final String entityType;
  final String action; // 'create', 'update', 'delete'
  final Map<String, dynamic> payload;
  final SyncStatus status;
  final DateTime createdAt;

  SyncOperation({
    required this.id,
    required this.entityType,
    required this.action,
    required this.payload,
    required this.status,
    required this.createdAt,
  });

  factory SyncOperation.fromMap(Map<String, dynamic> map) {
    return SyncOperation(
      id: map['id'],
      entityType: map['entityType'],
      action: map['action'],
      payload: jsonDecode(map['payload']),
      status: SyncStatus.values.firstWhere(
        (e) => e.name == map['status'],
        orElse: () => SyncStatus.pending,
      ),
      createdAt: DateTime.parse(map['createdAt']),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'entityType': entityType,
      'action': action,
      'payload': jsonEncode(payload),
      'status': status.name,
      'createdAt': createdAt.toIso8601String(),
    };
  }
}

class SyncService {
  static final SyncService _instance = SyncService._internal();
  factory SyncService() => _instance;
  SyncService._internal();

  final _dbService = DatabaseService();
  final Connectivity _connectivity = Connectivity();
  StreamSubscription<List<ConnectivityResult>>? _connectivitySubscription;
  bool _connectivityInitialized = false;
  ApiService? _apiService; // Injected later or fetched using providers
  bool _isSyncing = false;
  bool _isOfflineTenant = false;

  void initialize(ApiService apiService, {bool isOfflineTenant = false}) {
    _apiService = apiService;
    _isOfflineTenant = isOfflineTenant;
    if (!_isOfflineTenant) {
      _ensureConnectivityListener();
      _checkAndSync();
    }
  }

  void setOfflineTenant(bool isOffline) {
    _isOfflineTenant = isOffline;
    if (_apiService == null) return;
    if (!isOffline) {
      _ensureConnectivityListener();
      _checkAndSync();
    }
  }

  void _ensureConnectivityListener() {
    if (_connectivityInitialized) return;
    _connectivityInitialized = true;

    _connectivitySubscription = _connectivity.onConnectivityChanged.listen((
      List<ConnectivityResult> results,
    ) {
      if (_isOfflineTenant) return;
      if (results.any((r) => r != ConnectivityResult.none)) {
        _checkAndSync();
      }
    });
  }

  Future<bool> get isOnline async {
    if (_isOfflineTenant) return false;
    final results = await _connectivity.checkConnectivity();
    return results.any((r) => r != ConnectivityResult.none);
  }

  /// Adds an operation to the local SQLite sync queue.
  Future<void> enqueueOperation({
    required String entityType,
    required String action,
    required Map<String, dynamic> payload,
  }) async {
    final db = await _dbService.database;
    final operation = SyncOperation(
      id: const Uuid().v4(),
      entityType: entityType,
      action: action,
      payload: payload,
      status: SyncStatus.pending,
      createdAt: DateTime.now(),
    );

    await db.insert('sync_queue', operation.toMap());

    // Try to sync immediately if it's an online tenant and we might have connectivity
    if (!_isOfflineTenant) {
      _checkAndSync();
    }
  }

  /// The main synchronization loop.
  Future<void> _checkAndSync() async {
    if (_isSyncing || _apiService == null || _isOfflineTenant) return;

    final online = await isOnline;
    if (!online) return;

    _isSyncing = true;
    try {
      final db = await _dbService.database;
      final pendingOps = await db.query(
        'sync_queue',
        where: 'status = ? OR status = ?',
        whereArgs: [SyncStatus.pending.name, SyncStatus.failed.name],
        orderBy: 'createdAt ASC',
        limit: 50, // Process in batches
      );

      for (var opMap in pendingOps) {
        final op = SyncOperation.fromMap(opMap);
        await _processOperation(op);
      }
    } finally {
      _isSyncing = false;
      // If there are still pending items, maybe trigger again later
    }
  }

  Future<void> _processOperation(SyncOperation op) async {
    final db = await _dbService.database;

    // Mark as syncing
    await db.update(
      'sync_queue',
      {'status': SyncStatus.syncing.name},
      where: 'id = ?',
      whereArgs: [op.id],
    );

    try {
      // Pre-flight image uploads
      op = await _processImagesInPayload(op);

      await _executeApiCall(op);

      // On success, delete from queue
      await db.delete('sync_queue', where: 'id = ?', whereArgs: [op.id]);
    } catch (e) {
      // Mark as failed to retry later
      print('Sync failed for operation \${op.id}: \$e');
      await db.update(
        'sync_queue',
        {'status': SyncStatus.failed.name},
        where: 'id = ?',
        whereArgs: [op.id],
      );
    }
  }

  Future<SyncOperation> _processImagesInPayload(SyncOperation op) async {
    if (_apiService == null) return op;

    bool payloadChanged = false;
    final Map<String, dynamic> newPayload = Map.from(op.payload);

    // Recursive function to find and upload local images
    Future<dynamic> processValue(dynamic value) async {
      if (value is String) {
        if (value.startsWith('app_images/')) {
          try {
            final file = await ImageStorageManager.getLocalImageFile(value);
            if (await file.exists()) {
              final remoteUrl = await _apiService!.uploadImage(file.path);
              if (remoteUrl != null) {
                payloadChanged = true;
                // Delete local file after successful upload
                await ImageStorageManager.deleteLocalImage(value);
                return remoteUrl;
              }
            }
          } catch (e) {
            print("Error uploading image: \$e");
          }
        }
        return value;
      } else if (value is Map<String, dynamic>) {
        final newMap = <String, dynamic>{};
        for (var entry in value.entries) {
          newMap[entry.key] = await processValue(entry.value);
        }
        return newMap;
      } else if (value is List) {
        final newList = [];
        for (var item in value) {
          newList.add(await processValue(item));
        }
        return newList;
      }
      return value;
    }

    final processedPayload =
        await processValue(newPayload) as Map<String, dynamic>;

    if (payloadChanged) {
      final newOp = SyncOperation(
        id: op.id,
        entityType: op.entityType,
        action: op.action,
        payload: processedPayload,
        status: op.status,
        createdAt: op.createdAt,
      );

      // Update the DB with the new payload so we don't re-upload if api call fails
      final db = await _dbService.database;
      await db.update(
        'sync_queue',
        {'payload': jsonEncode(processedPayload)},
        where: 'id = ?',
        whereArgs: [op.id],
      );
      return newOp;
    }

    return op;
  }

  Future<void> _executeApiCall(SyncOperation op) async {
    if (_apiService == null) throw Exception("ApiService not initialized");

    final client = _apiService!.client;
    String endpoint = '';

    // Define REST mapping based on entity and action
    switch (op.entityType) {
      case 'sale':
        endpoint = '/admin/pos/sales';
        if (op.action == 'create') {
          await client.post(endpoint, data: op.payload);
        }
        break;
      case 'customer':
        endpoint = '/admin/customers';
        if (op.action == 'create') {
          await client.post(endpoint, data: op.payload);
        } else if (op.action == 'update') {
          final id = op.payload['id'];
          await client.put('$endpoint/$id', data: op.payload);
        }
        break;
      case 'user':
        endpoint = '/admin/users';
        if (op.action == 'create') {
          await client.post(endpoint, data: op.payload);
        } else if (op.action == 'update') {
          final id = op.payload['id'];
          await client.patch('$endpoint/$id', data: op.payload);
        } else if (op.action == 'delete') {
          final id = op.payload['id'];
          await client.delete('$endpoint/$id');
        }
        break;
      case 'supplier':
        endpoint = '/admin/suppliers';
        if (op.action == 'create') {
          await client.post(endpoint, data: op.payload);
        } else if (op.action == 'update') {
          final id = op.payload['id'];
          await client.put('$endpoint/$id', data: op.payload);
        } else if (op.action == 'delete') {
          final id = op.payload['id'];
          await client.delete('$endpoint/$id');
        }
        break;
      case 'order':
        endpoint = '/admin/orders';
        if (op.action == 'updateStatus') {
          final id = op.payload['id'];
          await client.patch('$endpoint/$id', data: op.payload);
        }
        break;
      case 'customerPayment':
        if (op.action == 'create') {
          final customerId = op.payload['customerId'];
          // Or wherever the payment backend is mapped
          await client.post(
            '/admin/customers/$customerId/payments',
            data: op.payload,
          );
        }
        break;
      case 'receiptLayout':
        endpoint = '/admin/receipt-layouts';
        if (op.action == 'create') {
          await client.post(endpoint, data: op.payload);
        } else if (op.action == 'update') {
          final id = op.payload['id'];
          await client.put('$endpoint/$id', data: op.payload);
        } else if (op.action == 'delete') {
          final id = op.payload['id'];
          await client.delete('$endpoint/$id');
        }
        break;
      case 'printerProfile':
        endpoint = '/admin/printer-profiles';
        if (op.action == 'create') {
          await client.post(endpoint, data: op.payload);
        } else if (op.action == 'update') {
          final id = op.payload['id'];
          await client.put('$endpoint/$id', data: op.payload);
        } else if (op.action == 'delete') {
          final id = op.payload['id'];
          await client.delete('$endpoint/$id');
        }
        break;
      case 'staffRole':
        endpoint = '/admin/staff-roles';
        if (op.action == 'create') {
          await client.post(endpoint, data: op.payload);
        } else if (op.action == 'update') {
          final id = op.payload['id'];
          await client.patch('$endpoint/$id', data: op.payload);
        } else if (op.action == 'delete') {
          final id = op.payload['id'];
          await client.delete('$endpoint/$id');
        }
        break;
      case 'cashSession':
        if (op.action == 'open') {
          final cashboxId = op.payload['cashboxId'];
          await client.post(
            '/admin/cash/cashboxes/$cashboxId/sessions/open',
            data: op.payload,
          );
        } else if (op.action == 'close') {
          final sessionId = op.payload['sessionId'];
          await client.post(
            '/admin/cash/cash-sessions/$sessionId/close',
            data: op.payload,
          );
        }
        break;
      case 'cashTransaction':
        if (op.action == 'create') {
          await client.post('/admin/cash/cash-transactions', data: op.payload);
        }
        break;
      case 'purchase':
        endpoint = '/admin/purchases';
        if (op.action == 'createDraft') {
          await client.post(endpoint, data: op.payload);
        } else if (op.action == 'addItem') {
          final pid = op.payload['purchaseId'];
          await client.post('$endpoint/$pid/items', data: op.payload);
        } else if (op.action == 'receiveItem') {
          final pid = op.payload['purchaseId'];
          await client.post('$endpoint/$pid/receive', data: op.payload);
        } else if (op.action == 'updateItem') {
          final pid = op.payload['purchaseId'];
          final iid = op.payload['itemId'];
          await client.put('$endpoint/$pid/items/$iid', data: op.payload);
        } else if (op.action == 'removeItem') {
          final pid = op.payload['purchaseId'];
          final iid = op.payload['itemId'];
          await client.delete('$endpoint/$pid/items/$iid');
        } else if (op.action == 'delete') {
          final id = op.payload['id'];
          await client.delete('$endpoint/$id');
        } else if (op.action == 'updateStatus') {
          final id = op.payload['id'];
          await client.patch('$endpoint/$id/status', data: op.payload);
        }
        break;
      // Add more entity mappings here as Repositories are built
      default:
        print('Warning: Unhandled sync entity type: ${op.entityType}');
        // We throw so it goes to 'failed' rather than getting silently deleted
        throw UnimplementedError('Cannot sync ${op.entityType}');
    }
  }
}
