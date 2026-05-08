import 'dart:async';
import 'dart:convert';
import 'dart:math';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:uuid/uuid.dart';

import 'package:dio/dio.dart' show Options;
import 'package:sqflite_sqlcipher/sqflite.dart' show ConflictAlgorithm, Sqflite;

import '../models/app_mode.dart';
import '../utils/image_storage_manager.dart';
import 'api_service.dart';
import 'database_service.dart';
import 'tenant_mode_service.dart';

enum SyncStatus { pending, syncing, synced, failed }

/// Represents a single durable outbox entry.
class SyncOperation {
  final String id;
  final String tenantId;
  final String entityType;
  final String action;
  final Map<String, dynamic> payload;
  final SyncStatus status;
  final int retryCount;
  final String? idempotencyKey;
  final DateTime createdAt;

  SyncOperation({
    required this.id,
    required this.tenantId,
    required this.entityType,
    required this.action,
    required this.payload,
    required this.status,
    required this.retryCount,
    this.idempotencyKey,
    required this.createdAt,
  });

  factory SyncOperation.fromMap(Map<String, dynamic> map) {
    return SyncOperation(
      id: map['id'] as String,
      tenantId: map['tenantId'] as String? ?? '',
      entityType: map['entityType'] as String,
      action: map['action'] as String,
      payload: jsonDecode(map['payload'] as String) as Map<String, dynamic>,
      status: SyncStatus.values.firstWhere(
        (e) => e.name == map['status'],
        orElse: () => SyncStatus.pending,
      ),
      retryCount: (map['retryCount'] as int?) ?? 0,
      idempotencyKey: map['idempotencyKey'] as String?,
      createdAt: DateTime.parse(map['createdAt'] as String),
    );
  }

  Map<String, dynamic> toMap() => {
    'id': id,
    'tenantId': tenantId,
    'entityType': entityType,
    'action': action,
    'payload': jsonEncode(payload),
    'status': status.name,
    'retryCount': retryCount,
    'idempotencyKey': idempotencyKey,
    'createdAt': createdAt.toIso8601String(),
  };
}

/// User-visible sync state exposed via stream.
class SyncState {
  final int pending;
  final int failed;
  final bool isSyncing;

  const SyncState({this.pending = 0, this.failed = 0, this.isSyncing = false});
}

class SyncService {
  static final SyncService _instance = SyncService._internal();
  factory SyncService() => _instance;
  SyncService._internal();

  static const int _maxRetries = 5;
  static const int _batchSize = 50;

  final _dbService = DatabaseService();
  final Connectivity _connectivity = Connectivity();
  final _syncStateController = StreamController<SyncState>.broadcast();

  StreamSubscription<List<ConnectivityResult>>? _connectivitySubscription;
  bool _connectivityInitialized = false;
  ApiService? _apiService;
  bool _isSyncing = false;
  AppMode _mode = AppMode.online;

  Stream<SyncState> get syncStateStream => _syncStateController.stream;

  void initialize(ApiService apiService, {required AppMode mode}) {
    _apiService = apiService;
    _mode = mode;
    if (_mode != AppMode.offlineOnly) {
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
      if (_mode == AppMode.offlineOnly) return;
      if (results.any((r) => r != ConnectivityResult.none)) {
        _checkAndSync();
      }
    });
  }

  Future<bool> get isOnline async {
    if (_mode == AppMode.offlineOnly) return false;
    final results = await _connectivity.checkConnectivity();
    return results.any((r) => r != ConnectivityResult.none);
  }

  /// Enqueues a durable outbox operation scoped to the active tenant.
  /// An idempotency key is generated automatically so retries are safe.
  Future<void> enqueueOperation({
    required String entityType,
    required String action,
    required Map<String, dynamic> payload,
    String? idempotencyKey,
  }) async {
    final tenantId = TenantModeService().activeTenantId;
    if (tenantId.trim().isEmpty) {
      throw StateError(
        'Cannot enqueue sync operation without an active tenant',
      );
    }
    final db = await _dbService.database;
    final operation = SyncOperation(
      id: const Uuid().v4(),
      tenantId: tenantId,
      entityType: entityType,
      action: action,
      payload: payload,
      status: SyncStatus.pending,
      retryCount: 0,
      idempotencyKey: idempotencyKey ?? const Uuid().v4(),
      createdAt: DateTime.now(),
    );
    await db.insert('sync_queue', operation.toMap());
    await _emitState();
    if (_mode != AppMode.offlineOnly) {
      _checkAndSync();
    }
  }

  Future<void> _checkAndSync() async {
    if (_isSyncing || _apiService == null || _mode == AppMode.offlineOnly) {
      return;
    }
    final online = await isOnline;
    if (!online) return;

    _isSyncing = true;
    await _emitState(syncing: true);
    try {
      final tenantId = TenantModeService().activeTenantId;
      final db = await _dbService.database;

      final pendingOps = await db.query(
        'sync_queue',
        where: 'tenantId = ? AND (status = ? OR status = ?) AND retryCount < ?',
        whereArgs: [
          tenantId,
          SyncStatus.pending.name,
          SyncStatus.failed.name,
          _maxRetries,
        ],
        orderBy: 'createdAt ASC',
        limit: _batchSize,
      );

      for (final opMap in pendingOps) {
        await _processOperation(
          SyncOperation.fromMap(opMap.cast<String, dynamic>()),
        );
      }
      if (tenantId.trim().isNotEmpty) {
        await _pullRemoteChanges(tenantId);
      }
    } finally {
      _isSyncing = false;
      await _emitState();
    }
  }

  Future<void> _processOperation(SyncOperation op) async {
    final db = await _dbService.database;

    await db.update(
      'sync_queue',
      {'status': SyncStatus.syncing.name},
      where: 'id = ? AND tenantId = ?',
      whereArgs: [op.id, op.tenantId],
    );

    try {
      final resolved = await _processImagesInPayload(op);
      await _executeApiCall(resolved);
      await _markLocalOperationSynced(resolved);
      await db.delete(
        'sync_queue',
        where: 'id = ? AND tenantId = ?',
        whereArgs: [op.id, op.tenantId],
      );
    } catch (e) {
      final newRetryCount = op.retryCount + 1;
      final backoffSeconds = _backoffSeconds(newRetryCount);

      await db.update(
        'sync_queue',
        {'status': SyncStatus.failed.name, 'retryCount': newRetryCount},
        where: 'id = ? AND tenantId = ?',
        whereArgs: [op.id, op.tenantId],
      );

      // Schedule retry with exponential backoff (non-blocking).
      if (newRetryCount < _maxRetries) {
        Future.delayed(Duration(seconds: backoffSeconds), _checkAndSync);
      }
    }
  }

  int _backoffSeconds(int retryCount) {
    // 2^n seconds with jitter, capped at 5 minutes.
    final base = pow(2, retryCount).toInt();
    final jitter = Random().nextInt(base.clamp(1, 30));
    return min(base + jitter, 300);
  }

  Future<SyncOperation> _processImagesInPayload(SyncOperation op) async {
    if (_apiService == null) return op;

    bool changed = false;
    final newPayload = Map<String, dynamic>.from(op.payload);

    Future<dynamic> process(dynamic value) async {
      if (value is String && value.startsWith('app_images/')) {
        try {
          final file = await ImageStorageManager.getLocalImageFile(value);
          if (await file.exists()) {
            final remoteUrl = await _apiService!.uploadImage(file.path);
            if (remoteUrl != null) {
              changed = true;
              await ImageStorageManager.deleteLocalImage(value);
              return remoteUrl;
            }
          }
        } catch (_) {}
        return value;
      } else if (value is Map<String, dynamic>) {
        final out = <String, dynamic>{};
        for (final e in value.entries) {
          out[e.key] = await process(e.value);
        }
        return out;
      } else if (value is List) {
        return [for (final item in value) await process(item)];
      }
      return value;
    }

    final processed = await process(newPayload) as Map<String, dynamic>;

    if (!changed) return op;

    final db = await _dbService.database;
    await db.update(
      'sync_queue',
      {'payload': jsonEncode(processed)},
      where: 'id = ? AND tenantId = ?',
      whereArgs: [op.id, op.tenantId],
    );

    return SyncOperation(
      id: op.id,
      tenantId: op.tenantId,
      entityType: op.entityType,
      action: op.action,
      payload: processed,
      status: op.status,
      retryCount: op.retryCount,
      idempotencyKey: op.idempotencyKey,
      createdAt: op.createdAt,
    );
  }

  Future<void> _executeApiCall(SyncOperation op) async {
    if (_apiService == null) throw StateError('ApiService not initialized');

    final client = _apiService!.client;
    final id = op.payload['id'];
    final idem = op.idempotencyKey;
    final headers = idem != null ? {'Idempotency-Key': idem} : null;

    Options? opts = headers != null ? Options(headers: headers) : null;

    switch (op.entityType) {
      case 'sale':
        if (op.action == 'create') {
          await client.post(
            '/admin/pos/sales',
            data: op.payload,
            options: opts,
          );
        }
      case 'customer':
        if (op.action == 'create') {
          await client.post(
            '/admin/customers',
            data: op.payload,
            options: opts,
          );
        } else if (op.action == 'update') {
          await client.put('/admin/customers/$id', data: op.payload);
        }
      case 'product':
        if (op.action == 'create') {
          await client.post('/admin/products', data: op.payload, options: opts);
        } else if (op.action == 'update') {
          await client.put('/admin/products/$id', data: op.payload);
        } else if (op.action == 'delete') {
          await client.delete('/admin/products/$id');
        }
      case 'category':
        if (op.action == 'create') {
          await client.post(
            '/admin/categories',
            data: op.payload,
            options: opts,
          );
        } else if (op.action == 'update') {
          await client.put('/admin/categories/$id', data: op.payload);
        } else if (op.action == 'delete') {
          await client.delete('/admin/categories/$id');
        }
      case 'user':
        if (op.action == 'create') {
          await client.post('/admin/users', data: op.payload, options: opts);
        } else if (op.action == 'update') {
          await client.patch('/admin/users/$id', data: op.payload);
        } else if (op.action == 'delete') {
          await client.delete('/admin/users/$id');
        }
      case 'supplier':
        if (op.action == 'create') {
          await client.post(
            '/admin/suppliers',
            data: op.payload,
            options: opts,
          );
        } else if (op.action == 'update') {
          await client.put('/admin/suppliers/$id', data: op.payload);
        } else if (op.action == 'delete') {
          await client.delete('/admin/suppliers/$id');
        }
      case 'order':
        if (op.action == 'updateStatus') {
          await client.patch('/admin/orders/$id', data: op.payload);
        }
      case 'customerPayment':
        if (op.action == 'create') {
          final customerId = op.payload['customerId'];
          await client.post(
            '/admin/customers/$customerId/payments',
            data: op.payload,
            options: opts,
          );
        }
      case 'receiptLayout':
        if (op.action == 'create') {
          await client.post(
            '/admin/receipt-layouts',
            data: op.payload,
            options: opts,
          );
        } else if (op.action == 'update') {
          await client.put('/admin/receipt-layouts/$id', data: op.payload);
        } else if (op.action == 'delete') {
          await client.delete('/admin/receipt-layouts/$id');
        }
      case 'printerProfile':
        if (op.action == 'create') {
          await client.post(
            '/admin/printer-profiles',
            data: op.payload,
            options: opts,
          );
        } else if (op.action == 'update') {
          await client.put('/admin/printer-profiles/$id', data: op.payload);
        } else if (op.action == 'delete') {
          await client.delete('/admin/printer-profiles/$id');
        }
      case 'staffRole':
        if (op.action == 'create') {
          await client.post(
            '/admin/staff-roles',
            data: op.payload,
            options: opts,
          );
        } else if (op.action == 'update') {
          await client.patch('/admin/staff-roles/$id', data: op.payload);
        } else if (op.action == 'delete') {
          await client.delete('/admin/staff-roles/$id');
        }
      case 'cashSession':
        if (op.action == 'open') {
          final cashboxId = op.payload['cashboxId'];
          await client.post(
            '/admin/cash/cashboxes/$cashboxId/sessions/open',
            data: op.payload,
            options: opts,
          );
        } else if (op.action == 'close') {
          final sessionId = op.payload['sessionId'];
          await client.post(
            '/admin/cash/cash-sessions/$sessionId/close',
            data: op.payload,
          );
        }
      case 'cashTransaction':
        if (op.action == 'create') {
          await client.post(
            '/admin/cash/cash-transactions',
            data: op.payload,
            options: opts,
          );
        }
      case 'purchase':
        final pid = op.payload['purchaseId'];
        if (op.action == 'createDraft') {
          await client.post(
            '/admin/purchases',
            data: op.payload,
            options: opts,
          );
        } else if (op.action == 'addItem') {
          await client.post(
            '/admin/purchases/$pid/items',
            data: op.payload,
            options: opts,
          );
        } else if (op.action == 'receiveItem') {
          await client.post('/admin/purchases/$pid/receive', data: op.payload);
        } else if (op.action == 'updateItem') {
          final iid = op.payload['itemId'];
          await client.put(
            '/admin/purchases/$pid/items/$iid',
            data: op.payload,
          );
        } else if (op.action == 'removeItem') {
          final iid = op.payload['itemId'];
          await client.delete('/admin/purchases/$pid/items/$iid');
        } else if (op.action == 'delete') {
          await client.delete('/admin/purchases/$id');
        } else if (op.action == 'updateStatus') {
          await client.patch('/admin/purchases/$id/status', data: op.payload);
        }
      default:
        throw UnimplementedError('Cannot sync ${op.entityType}');
    }
  }

  Future<String?> _readMetadata(String tenantId, String key) async {
    final db = await _dbService.database;
    final rows = await db.query(
      'sync_metadata',
      columns: ['value'],
      where: 'tenantId = ? AND key = ?',
      whereArgs: [tenantId, key],
      limit: 1,
    );
    return rows.isEmpty ? null : rows.first['value']?.toString();
  }

  Future<void> _writeMetadata(
    String tenantId,
    String key,
    String? value,
  ) async {
    final db = await _dbService.database;
    await db.insert('sync_metadata', {
      'tenantId': tenantId,
      'key': key,
      'value': value,
      'updatedAt': DateTime.now().toIso8601String(),
    }, conflictAlgorithm: ConflictAlgorithm.replace);
  }

  Future<void> _pullRemoteChanges(String tenantId) async {
    if (_apiService == null) return;

    try {
      final since = await _readMetadata(tenantId, 'lastPullAt');
      final response = await _apiService!.client.get(
        '/admin/sync/pull',
        queryParameters: {
          if (since != null && since.trim().isNotEmpty) 'since': since,
        },
      );
      final data = response.data;
      if (data is! Map) return;

      final changes = data['changes'];
      if (changes is! Map) return;

      final db = await _dbService.database;
      await db.transaction((txn) async {
        for (final raw in _asList(changes['categories'])) {
          final c = _asMap(raw);
          if (c == null) continue;
          final id = _string(c['id']);
          if (id.isEmpty) continue;
          if (await _hasPendingLocalRow(txn, 'categories', tenantId, id)) {
            continue;
          }
          final countRaw = c['_count'];
          final count = countRaw is Map
              ? _int(countRaw['products'])
              : _int(c['productCount']);
          await txn.insert('categories', {
            'id': id,
            'tenantId': tenantId,
            'title': _string(c['title']),
            'slug': _string(c['slug']),
            'imageUrl': c['imageUrl']?.toString(),
            'productCount': count,
            'createdAt': c['createdAt']?.toString(),
            'syncStatus': SyncStatus.synced.name,
          }, conflictAlgorithm: ConflictAlgorithm.replace);
        }

        for (final raw in _asList(changes['products'])) {
          final p = _asMap(raw);
          if (p == null) continue;
          final id = _string(p['id']);
          if (id.isEmpty) continue;
          if (await _hasPendingLocalRow(txn, 'products', tenantId, id)) {
            continue;
          }
          final images = _asList(p['images']);
          await txn.insert('products', {
            'id': id,
            'tenantId': tenantId,
            'title': _string(p['title']),
            'slug': _string(p['slug']),
            'miniDescription': p['miniDescription']?.toString(),
            'description': p['description']?.toString(),
            'price': _double(p['price']),
            'stock': _int(p['stock']),
            'lowStockThreshold': _int(p['lowStockThreshold'], fallback: 5),
            'isActive': p['isActive'] == true ? 1 : 0,
            'categoryId': p['categoryId']?.toString(),
            'mainImageUrl': images.isNotEmpty ? images.first.toString() : null,
            'syncStatus': SyncStatus.synced.name,
            'optionsJson': jsonEncode(_asList(p['options'])),
            'variantsJson': jsonEncode(_asList(p['variants'])),
          }, conflictAlgorithm: ConflictAlgorithm.replace);
        }

        for (final raw in _asList(changes['customers'])) {
          final c = _asMap(raw);
          if (c == null) continue;
          final id = _string(c['id']);
          if (id.isEmpty) continue;
          if (await _hasPendingLocalRow(txn, 'customers', tenantId, id)) {
            continue;
          }
          await txn.insert('customers', {
            'id': id,
            'tenantId': tenantId,
            'name': _string(c['name']),
            'email': c['email']?.toString(),
            'phone': c['phone']?.toString(),
            'address': c['address']?.toString(),
            'totalSpent': _double(c['totalSpent']),
            'ordersCount': _int(c['ordersCount']),
            'syncStatus': SyncStatus.synced.name,
          }, conflictAlgorithm: ConflictAlgorithm.replace);
        }

        for (final raw in _asList(changes['orders'])) {
          final o = _asMap(raw);
          if (o == null) continue;
          final id = _string(o['id']);
          if (id.isEmpty) continue;
          if (await _hasPendingLocalRow(txn, 'orders', tenantId, id)) {
            continue;
          }
          await txn.insert('orders', {
            'id': id,
            'tenantId': tenantId,
            'status': _string(o['status']),
            'total': _double(o['totalAmount']),
            'createdAt': o['createdAt']?.toString(),
            'customerName': o['customerName']?.toString(),
            'customerPhone': o['customerPhone']?.toString(),
            'shippingAddress': o['customerAddress']?.toString(),
            'itemsJson': jsonEncode(_asList(o['items'])),
            'syncStatus': SyncStatus.synced.name,
          }, conflictAlgorithm: ConflictAlgorithm.replace);
        }

        for (final raw in _asList(changes['sales'])) {
          final s = _asMap(raw);
          if (s == null) continue;
          final id = _string(s['id']);
          if (id.isEmpty) continue;
          if (await _hasPendingLocalRow(txn, 'sales', tenantId, id)) {
            continue;
          }
          await txn.insert('sales', {
            'id': id,
            'tenantId': tenantId,
            'customerId': s['customerId']?.toString(),
            'total': _double(s['totalAmount']),
            'status': _string(s['status']),
            'createdAt': s['createdAt']?.toString(),
            'payloadJson': jsonEncode({
              'items': _asList(s['items']),
              'customerName': s['customerName'],
              'customerPhone': s['customerPhone'],
              'type': s['type'],
            }),
            'syncStatus': SyncStatus.synced.name,
          }, conflictAlgorithm: ConflictAlgorithm.replace);
        }
      });

      final serverTime = data['serverTime']?.toString();
      if (serverTime != null && serverTime.trim().isNotEmpty) {
        await _writeMetadata(tenantId, 'lastPullAt', serverTime);
      }
    } catch (_) {
      // Pull failures must not block queued writes; the next connectivity tick retries.
    }
  }

  List<dynamic> _asList(dynamic value) => value is List ? value : const [];

  Map<String, dynamic>? _asMap(dynamic value) {
    if (value is Map<String, dynamic>) return value;
    if (value is Map) return value.cast<String, dynamic>();
    return null;
  }

  Future<bool> _hasPendingLocalRow(
    dynamic txn,
    String table,
    String tenantId,
    String id,
  ) async {
    final rows = await txn.query(
      table,
      columns: ['syncStatus'],
      where: 'id = ? AND tenantId = ?',
      whereArgs: [id, tenantId],
      limit: 1,
    );
    if (rows.isEmpty) return false;
    return rows.first['syncStatus']?.toString() != SyncStatus.synced.name;
  }

  String _string(dynamic value) => value?.toString() ?? '';

  int _int(dynamic value, {int fallback = 0}) {
    if (value is int) return value;
    if (value is num) return value.toInt();
    return int.tryParse(value?.toString() ?? '') ?? fallback;
  }

  double _double(dynamic value) {
    if (value is num) return value.toDouble();
    return double.tryParse(value?.toString() ?? '') ?? 0;
  }

  Future<void> _markLocalOperationSynced(SyncOperation op) async {
    final table = switch (op.entityType) {
      'sale' => 'sales',
      'customer' => 'customers',
      'product' => 'products',
      'category' => 'categories',
      'user' => 'users',
      'supplier' => 'suppliers',
      'order' => 'orders',
      'receiptLayout' => 'receipt_layouts',
      'printerProfile' => 'printer_profiles',
      'staffRole' => 'staff_roles',
      'purchase' => 'purchases',
      _ => null,
    };
    if (table == null) return;

    final localId =
        (op.payload['offlineId'] ??
                op.payload['id'] ??
                op.payload['purchaseId'])
            ?.toString()
            .trim();
    if (localId == null || localId.isEmpty) return;

    final db = await _dbService.database;
    await db.update(
      table,
      {'syncStatus': SyncStatus.synced.name},
      where: 'id = ? AND tenantId = ?',
      whereArgs: [localId, op.tenantId],
    );
  }

  Future<void> _emitState({bool syncing = false}) async {
    try {
      final tenantId = TenantModeService().activeTenantId;
      final db = await _dbService.database;
      final pending =
          Sqflite.firstIntValue(
            await db.rawQuery(
              "SELECT COUNT(*) FROM sync_queue WHERE tenantId = ? AND status = ?",
              [tenantId, SyncStatus.pending.name],
            ),
          ) ??
          0;
      final failed =
          Sqflite.firstIntValue(
            await db.rawQuery(
              "SELECT COUNT(*) FROM sync_queue WHERE tenantId = ? AND status = ? AND retryCount < ?",
              [tenantId, SyncStatus.failed.name, _maxRetries],
            ),
          ) ??
          0;
      _syncStateController.add(
        SyncState(
          pending: pending,
          failed: failed,
          isSyncing: syncing || _isSyncing,
        ),
      );
    } catch (_) {}
  }

  void dispose() {
    _connectivitySubscription?.cancel();
    _syncStateController.close();
  }
}
