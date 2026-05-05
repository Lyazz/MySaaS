import 'dart:async';
import 'dart:convert';
import 'dart:math';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:uuid/uuid.dart';

import 'package:dio/dio.dart' show Options;
import 'package:sqflite_sqlcipher/sqflite.dart' show Sqflite;

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

  const SyncState({
    this.pending = 0,
    this.failed = 0,
    this.isSyncing = false,
  });
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
    _connectivitySubscription = _connectivity.onConnectivityChanged.listen(
      (List<ConnectivityResult> results) {
        if (_mode == AppMode.offlineOnly) return;
        if (results.any((r) => r != ConnectivityResult.none)) {
          _checkAndSync();
        }
      },
    );
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
        await _processOperation(SyncOperation.fromMap(
          opMap.cast<String, dynamic>(),
        ));
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
      where: 'id = ?',
      whereArgs: [op.id],
    );

    try {
      final resolved = await _processImagesInPayload(op);
      await _executeApiCall(resolved);
      await db.delete('sync_queue', where: 'id = ?', whereArgs: [op.id]);
    } catch (e) {
      final newRetryCount = op.retryCount + 1;
      final backoffSeconds = _backoffSeconds(newRetryCount);

      await db.update(
        'sync_queue',
        {
          'status': SyncStatus.failed.name,
          'retryCount': newRetryCount,
        },
        where: 'id = ?',
        whereArgs: [op.id],
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
      where: 'id = ?',
      whereArgs: [op.id],
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
          await client.post('/admin/pos/sales', data: op.payload, options: opts);
        }
      case 'customer':
        if (op.action == 'create') {
          await client.post('/admin/customers', data: op.payload, options: opts);
        } else if (op.action == 'update') {
          await client.put('/admin/customers/$id', data: op.payload);
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
          await client.post('/admin/suppliers', data: op.payload, options: opts);
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
          await client.post('/admin/receipt-layouts', data: op.payload, options: opts);
        } else if (op.action == 'update') {
          await client.put('/admin/receipt-layouts/$id', data: op.payload);
        } else if (op.action == 'delete') {
          await client.delete('/admin/receipt-layouts/$id');
        }
      case 'printerProfile':
        if (op.action == 'create') {
          await client.post('/admin/printer-profiles', data: op.payload, options: opts);
        } else if (op.action == 'update') {
          await client.put('/admin/printer-profiles/$id', data: op.payload);
        } else if (op.action == 'delete') {
          await client.delete('/admin/printer-profiles/$id');
        }
      case 'staffRole':
        if (op.action == 'create') {
          await client.post('/admin/staff-roles', data: op.payload, options: opts);
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
          await client.post('/admin/purchases', data: op.payload, options: opts);
        } else if (op.action == 'addItem') {
          await client.post('/admin/purchases/$pid/items', data: op.payload, options: opts);
        } else if (op.action == 'receiveItem') {
          await client.post('/admin/purchases/$pid/receive', data: op.payload);
        } else if (op.action == 'updateItem') {
          final iid = op.payload['itemId'];
          await client.put('/admin/purchases/$pid/items/$iid', data: op.payload);
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

  Future<void> _emitState({bool syncing = false}) async {
    try {
      final tenantId = TenantModeService().activeTenantId;
      final db = await _dbService.database;
      final pending = Sqflite.firstIntValue(await db.rawQuery(
        "SELECT COUNT(*) FROM sync_queue WHERE tenantId = ? AND status = ?",
        [tenantId, SyncStatus.pending.name],
      )) ?? 0;
      final failed = Sqflite.firstIntValue(await db.rawQuery(
        "SELECT COUNT(*) FROM sync_queue WHERE tenantId = ? AND status = ? AND retryCount < ?",
        [tenantId, SyncStatus.failed.name, _maxRetries],
      )) ?? 0;
      _syncStateController.add(SyncState(
        pending: pending,
        failed: failed,
        isSyncing: syncing || _isSyncing,
      ));
    } catch (_) {}
  }

  void dispose() {
    _connectivitySubscription?.cancel();
    _syncStateController.close();
  }
}
