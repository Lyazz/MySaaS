import 'dart:async';
import 'dart:convert';
import 'dart:math';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/foundation.dart';
import 'package:uuid/uuid.dart';

import 'package:dio/dio.dart' show DioException, Options;
import 'package:sqflite_sqlcipher/sqflite.dart'
    show ConflictAlgorithm, DatabaseExecutor, Sqflite;

import '../models/app_mode.dart';
import '../utils/image_storage_manager.dart';
import 'api_service.dart';
import 'database_service.dart';
import 'sync_conflict_policy.dart';
import 'tenant_mode_service.dart';

enum SyncStatus { pending, syncing, synced, failed, conflicted, rejected }

enum SyncStage { synced, pending, syncing, failed, conflicted }

enum _SyncFailureDisposition { retryable, conflicted, rejected }

class SyncConflictDetected implements Exception {
  final String message;

  SyncConflictDetected(this.message);

  @override
  String toString() => message;
}

class SyncUnsupportedOperation implements Exception {
  final String entityType;
  final String action;

  SyncUnsupportedOperation(this.entityType, this.action);

  @override
  String toString() => 'Cannot sync $entityType:$action';
}

/// Represents a single durable outbox entry.
class SyncOperation {
  final String id;
  final String tenantId;
  final String workspaceId;
  final String entityType;
  final String action;
  final Map<String, dynamic> payload;
  final SyncStatus status;
  final int retryCount;
  final String? idempotencyKey;
  final String? lastError;
  final DateTime? lastAttemptAt;
  final DateTime? nextRetryAt;
  final DateTime createdAt;

  SyncOperation({
    required this.id,
    required this.tenantId,
    required this.workspaceId,
    required this.entityType,
    required this.action,
    required this.payload,
    required this.status,
    required this.retryCount,
    this.idempotencyKey,
    this.lastError,
    this.lastAttemptAt,
    this.nextRetryAt,
    required this.createdAt,
  });

  factory SyncOperation.fromMap(Map<String, dynamic> map) {
    return SyncOperation(
      id: map['id'] as String,
      tenantId: map['tenantId'] as String? ?? '',
      workspaceId: map['workspaceId'] as String? ?? '',
      entityType: map['entityType'] as String,
      action: map['action'] as String,
      payload: jsonDecode(map['payload'] as String) as Map<String, dynamic>,
      status: SyncStatus.values.firstWhere(
        (e) => e.name == map['status'],
        orElse: () => SyncStatus.pending,
      ),
      retryCount: (map['retryCount'] as int?) ?? 0,
      idempotencyKey: map['idempotencyKey'] as String?,
      lastError: map['lastError'] as String?,
      lastAttemptAt: _tryParseDateTime(map['lastAttemptAt']),
      nextRetryAt: _tryParseDateTime(map['nextRetryAt']),
      createdAt: DateTime.parse(map['createdAt'] as String),
    );
  }

  static DateTime? _tryParseDateTime(dynamic value) {
    final raw = value?.toString().trim();
    if (raw == null || raw.isEmpty) return null;
    return DateTime.tryParse(raw);
  }

  Map<String, dynamic> toMap() => {
    'id': id,
    'tenantId': tenantId,
    'workspaceId': workspaceId,
    'entityType': entityType,
    'action': action,
    'payload': jsonEncode(payload),
    'status': status.name,
    'retryCount': retryCount,
    'idempotencyKey': idempotencyKey,
    'lastError': lastError,
    'lastAttemptAt': lastAttemptAt?.toIso8601String(),
    'nextRetryAt': nextRetryAt?.toIso8601String(),
    'createdAt': createdAt.toIso8601String(),
  };
}

class SyncIssue {
  final String id;
  final String entityType;
  final String action;
  final SyncStatus status;
  final int retryCount;
  final String? lastError;
  final DateTime createdAt;
  final DateTime? lastAttemptAt;
  final DateTime? nextRetryAt;

  const SyncIssue({
    required this.id,
    required this.entityType,
    required this.action,
    required this.status,
    required this.retryCount,
    required this.createdAt,
    this.lastError,
    this.lastAttemptAt,
    this.nextRetryAt,
  });

  factory SyncIssue.fromOperation(SyncOperation operation) {
    return SyncIssue(
      id: operation.id,
      entityType: operation.entityType,
      action: operation.action,
      status: operation.status,
      retryCount: operation.retryCount,
      lastError: operation.lastError,
      createdAt: operation.createdAt,
      lastAttemptAt: operation.lastAttemptAt,
      nextRetryAt: operation.nextRetryAt,
    );
  }
}

/// User-visible sync state exposed via stream.
class SyncState {
  final int pending;
  final int failed;
  final int retrying;
  final int recoveryRequired;
  final int conflicted;
  final int rejected;
  final bool isSyncing;
  final DateTime? nextRetryAt;
  final String? latestError;

  const SyncState({
    this.pending = 0,
    this.failed = 0,
    this.retrying = 0,
    this.recoveryRequired = 0,
    this.conflicted = 0,
    this.rejected = 0,
    this.isSyncing = false,
    this.nextRetryAt,
    this.latestError,
  });

  SyncStage get stage {
    if (conflicted > 0) return SyncStage.conflicted;
    if (isSyncing) return SyncStage.syncing;
    if (failed > 0 || rejected > 0) return SyncStage.failed;
    if (pending > 0) return SyncStage.pending;
    return SyncStage.synced;
  }
}

class SyncService {
  static final SyncService _instance = SyncService._internal();
  factory SyncService() => _instance;
  SyncService._internal();

  static const int _maxRetries = 5;
  static const int _batchSize = 50;

  /// How long to wait before sweeping rows left `pending` after a pass.
  static const Duration _idleSweepDelay = Duration(seconds: 5);
  static const Map<String, Set<String>> _supportedOperations = {
    'sale': {'create'},
    'customer': {'create', 'update'},
    'product': {'create', 'update', 'delete'},
    'category': {'create', 'update', 'delete'},
    'user': {'create', 'update', 'delete'},
    'supplier': {'create', 'update', 'delete'},
    'order': {
      'create',
      'updateStatus',
      'updateCallStatus',
      'updateInternalNotes',
    },
    'storeSettings': {'patch'},
    'contactInfo': {'create', 'update', 'delete'},
    'customerPayment': {'create'},
    // printerProfile / receiptLayout are deliberately absent: they describe
    // hardware attached to this one terminal, they have no table or route on
    // the server, and every queued operation used to 404 into `rejected`.
    'staffRole': {'create', 'update', 'delete'},
    'cashbox': {'create', 'update'},
    'cashSession': {'open', 'close'},
    'cashTransaction': {'create'},
    'deliveryProvider': {'update'},
    'purchase': {
      'createDraft',
      'addItem',
      'receiveItem',
      'updateItem',
      'removeItem',
      'delete',
      'updateStatus',
    },
  };

  @visibleForTesting
  static bool disableSupplementalRefreshForTests = false;

  @visibleForTesting
  static void resetTestOverrides() {
    disableSupplementalRefreshForTests = false;
  }

  final _dbService = DatabaseService();
  final Connectivity _connectivity = Connectivity();
  final _syncStateController = StreamController<SyncState>.broadcast();

  StreamSubscription<List<ConnectivityResult>>? _connectivitySubscription;
  bool _connectivityInitialized = false;
  Timer? _retryTimer;
  ApiService? _apiService;
  bool _isSyncing = false;
  /// Completes when the in-flight sync pass finishes; null when idle.
  Future<void>? _activePass;
  AppMode _mode = AppMode.online;

  String get _activeWorkspaceId => TenantModeService().activeWorkspaceId ?? '';

  Stream<SyncState> get syncStateStream => _syncStateController.stream;

  void initialize(ApiService apiService, {required AppMode mode}) {
    _apiService = apiService;
    _mode = mode;
    unawaited(_bootstrap());
  }

  /// Recovers work stranded by a crash before reporting state or syncing.
  Future<void> _bootstrap() async {
    await _reclaimStrandedOperations();
    await _emitState();
    if (_mode.allowsNetworkRequests) {
      _ensureConnectivityListener();
      await _scheduleNextRetry();
      unawaited(_checkAndSync());
    }
  }

  /// Moves rows left in [SyncStatus.syncing] back to [SyncStatus.pending],
  /// returning how many were recovered.
  ///
  /// A row only reaches `syncing` while an attempt is in flight. If the process
  /// dies mid-attempt (crash, force close, OS kill) nothing ever moves it on,
  /// and because the sync pass only selects `pending`/`failed` rows the queued
  /// write would be stranded forever — invisible in the UI and never retried.
  ///
  /// Only safe while no attempt of ours is running, so it no-ops if a pass is
  /// already in progress rather than reclaiming a live attempt.
  Future<int> _reclaimStrandedOperations({bool force = false}) async {
    if (_isSyncing && !force) return 0;
    try {
      final db = await _dbService.database;
      return await db.update(
        'sync_queue',
        {
          'status': SyncStatus.pending.name,
          'lastError': null,
          'nextRetryAt': null,
        },
        where: 'tenantId = ? AND workspaceId = ? AND status = ?',
        whereArgs: [
          TenantModeService().activeTenantId,
          _activeWorkspaceId,
          SyncStatus.syncing.name,
        ],
      );
    } catch (error) {
      debugPrint('SyncService: failed to reclaim stranded operations: $error');
      return 0;
    }
  }

  /// Detaches the service from its API handle and stops future work.
  ///
  /// Awaits a pass that is already running rather than returning immediately:
  /// callers reset in order to tear the database down — logout, tenant switch,
  /// reprovisioning — and a pass mid-flight still holds it. Clearing
  /// `_isSyncing` up front also used to release the guard under a live pass,
  /// letting a second one start against the workspace being torn down.
  Future<void> reset() async {
    _apiService = null;
    _retryTimer?.cancel();
    _retryTimer = null;
    final pass = _activePass;
    if (pass != null) {
      try {
        await pass;
      } catch (_) {
        // The pass logs its own failures; reset only cares that it stopped.
      }
    }
    _isSyncing = false;
    await _emitState();
  }

  void _ensureConnectivityListener() {
    if (_connectivityInitialized) return;
    _connectivityInitialized = true;
    _connectivitySubscription = _connectivity.onConnectivityChanged.listen((
      List<ConnectivityResult> results,
    ) {
      if (!_mode.allowsNetworkRequests) return;
      if (results.any((r) => r != ConnectivityResult.none)) {
        _checkAndSync();
      }
    });
  }

  Future<bool> get isOnline async {
    if (!_mode.allowsNetworkRequests) return false;
    final results = await _connectivity.checkConnectivity();
    return results.any((r) => r != ConnectivityResult.none);
  }

  Future<List<SyncIssue>> listIssues() async {
    final tenantId = TenantModeService().activeTenantId;
    final workspaceId = _activeWorkspaceId;
    final db = await _dbService.database;
    final rows = await db.query(
      'sync_queue',
      where: 'tenantId = ? AND workspaceId = ? AND status IN (?, ?, ?)',
      whereArgs: [
        tenantId,
        workspaceId,
        SyncStatus.failed.name,
        SyncStatus.conflicted.name,
        SyncStatus.rejected.name,
      ],
      orderBy: 'createdAt ASC',
    );
    return rows
        .map(
          (row) => SyncIssue.fromOperation(
            SyncOperation.fromMap(row.cast<String, dynamic>()),
          ),
        )
        .toList();
  }

  Future<void> retryFailedOperations({bool resetRetryBudget = true}) async {
    final tenantId = TenantModeService().activeTenantId;
    final workspaceId = _activeWorkspaceId;
    final db = await _dbService.database;
    // `rejected` is included: it is terminal for the automatic loop, but a user
    // asking to retry is the manual correction path out of it. `conflicted` is
    // deliberately excluded — replaying it would silently overwrite the remote
    // change that caused the conflict.
    await db.update(
      'sync_queue',
      {
        'status': SyncStatus.pending.name,
        if (resetRetryBudget) 'retryCount': 0,
        'lastError': null,
        'nextRetryAt': null,
      },
      where: 'tenantId = ? AND workspaceId = ? AND status IN (?, ?)',
      whereArgs: [
        tenantId,
        workspaceId,
        SyncStatus.failed.name,
        SyncStatus.rejected.name,
      ],
    );
    await _emitState();
    if (_mode.allowsNetworkRequests) {
      _retryTimer?.cancel();
      _retryTimer = null;
      _checkAndSync();
    }
  }

  /// Enqueues a durable outbox operation scoped to the active tenant.
  /// An idempotency key is generated automatically so retries are safe.
  Future<void> enqueueOperation({
    required String entityType,
    required String action,
    required Map<String, dynamic> payload,
    String? idempotencyKey,
  }) async {
    if (!_isSupportedOperation(entityType, action)) {
      throw SyncUnsupportedOperation(entityType, action);
    }
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
      workspaceId: _activeWorkspaceId,
      entityType: entityType,
      action: action,
      payload: payload,
      status: SyncStatus.pending,
      retryCount: 0,
      idempotencyKey: idempotencyKey ?? const Uuid().v4(),
      lastError: null,
      lastAttemptAt: null,
      nextRetryAt: null,
      createdAt: DateTime.now(),
    );
    await db.insert('sync_queue', operation.toMap());
    await _emitState();
    if (_mode.allowsNetworkRequests) {
      _checkAndSync();
    }
  }

  bool _isSupportedOperation(String entityType, String action) {
    return _supportedOperations[entityType]?.contains(action) == true;
  }

  /// [pullRemote] draws down remote changes and refreshes the supplemental
  /// domains after the outbox drains. Sweeps that exist only to re-attempt
  /// queued writes pass false: they can fire every few seconds, and a full pull
  /// plus twelve domain refreshes on each one would be a lot of traffic for no
  /// new information.
  Future<void> _checkAndSync({bool pullRemote = true}) async {
    if (_isSyncing || _apiService == null || !_mode.allowsNetworkRequests) {
      return;
    }
    final online = await isOnline;
    if (!online) {
      await _emitState();
      return;
    }

    _isSyncing = true;
    final passDone = Completer<void>();
    _activePass = passDone.future;
    _retryTimer?.cancel();
    _retryTimer = null;
    await _emitState(syncing: true);
    try {
      // `force` is correct here: we just took the `_isSyncing` guard, and it
      // was false a moment ago, so any `syncing` row is left over from a
      // previous process that died rather than a live attempt.
      await _reclaimStrandedOperations(force: true);
      final tenantId = TenantModeService().activeTenantId;
      final workspaceId = _activeWorkspaceId;
      final db = await _dbService.database;

      final pendingOps = await db.query(
        'sync_queue',
        where:
            'tenantId = ? AND workspaceId = ? AND (status = ? OR (status = ? AND retryCount < ? AND (nextRetryAt IS NULL OR nextRetryAt <= ?)))',
        whereArgs: [
          tenantId,
          workspaceId,
          SyncStatus.pending.name,
          SyncStatus.failed.name,
          _maxRetries,
          DateTime.now().toIso8601String(),
        ],
        // Strict FIFO. `nextRetryAt` gates *eligibility* in the WHERE clause;
        // ordering by it would push a retried create behind writes queued after
        // it, so a dependent update could reach the server before its parent.
        orderBy: 'createdAt ASC, id ASC',
        limit: _batchSize,
      );

      for (final opMap in pendingOps) {
        await _processOperation(
          SyncOperation.fromMap(opMap.cast<String, dynamic>()),
        );
      }
      if (pullRemote && tenantId.trim().isNotEmpty) {
        await _pullRemoteChanges(tenantId);
        if (!disableSupplementalRefreshForTests) {
          await _refreshSupplementalDomains(tenantId);
        }
      }
    } catch (error, stackTrace) {
      debugPrint('SyncService: fatal sync failure: $error');
      debugPrint('$stackTrace');
    } finally {
      _isSyncing = false;
      _activePass = null;
      if (!passDone.isCompleted) passDone.complete();
      await _scheduleNextRetry();
      await _emitState();
    }
  }

  Future<void> _processOperation(SyncOperation op) async {
    final db = await _dbService.database;

    await db.update(
      'sync_queue',
      {
        'status': SyncStatus.syncing.name,
        'lastAttemptAt': DateTime.now().toIso8601String(),
        'lastError': null,
      },
      where: 'id = ? AND tenantId = ? AND workspaceId = ?',
      whereArgs: [op.id, op.tenantId, op.workspaceId],
    );

    try {
      if (!_isSupportedOperation(op.entityType, op.action)) {
        throw SyncUnsupportedOperation(op.entityType, op.action);
      }
      final withResolvedAliases = await _resolveOperationAliases(op);
      final blockedBy = await _findBlockingDependency(withResolvedAliases);
      if (blockedBy != null) {
        // Not a failure: hand the row back to the queue untouched so it is
        // retried once its parent create has synced. Burning a retry here
        // would eventually strand the write.
        await db.update(
          'sync_queue',
          {'status': SyncStatus.pending.name},
          where: 'id = ? AND tenantId = ? AND workspaceId = ?',
          whereArgs: [op.id, op.tenantId, op.workspaceId],
        );
        debugPrint(
          'SyncService: deferring ${op.entityType}:${op.action} — $blockedBy',
        );
        return;
      }
      final resolved = await _processImagesInPayload(withResolvedAliases);
      final conflict = await _preflightConflictCheck(resolved);
      if (conflict != null) {
        throw SyncConflictDetected(conflict);
      }
      final responseData = await _executeApiCall(resolved);
      await _applySuccessfulSync(resolved, responseData);
      await db.delete(
        'sync_queue',
        where: 'id = ? AND tenantId = ? AND workspaceId = ?',
        whereArgs: [op.id, op.tenantId, op.workspaceId],
      );
    } catch (e) {
      final disposition = _classifySyncFailure(e);
      final newRetryCount = op.retryCount + 1;
      if (disposition == _SyncFailureDisposition.conflicted) {
        await db.update(
          'sync_queue',
          {
            'status': SyncStatus.conflicted.name,
            'lastError': e.toString(),
            'nextRetryAt': null,
          },
          where: 'id = ? AND tenantId = ? AND workspaceId = ?',
          whereArgs: [op.id, op.tenantId, op.workspaceId],
        );
        await _markLocalOperationConflicted(op);
      } else if (disposition == _SyncFailureDisposition.rejected) {
        await db.update(
          'sync_queue',
          {
            'status': SyncStatus.rejected.name,
            'lastError': _syncErrorMessage(e),
            'nextRetryAt': null,
          },
          where: 'id = ? AND tenantId = ? AND workspaceId = ?',
          whereArgs: [op.id, op.tenantId, op.workspaceId],
        );
        await _markLocalOperationRejected(op);
      } else {
        final backoffSeconds = _backoffSeconds(newRetryCount);
        final nextRetryAt = DateTime.now().add(
          Duration(seconds: backoffSeconds),
        );
        await db.update(
          'sync_queue',
          {
            'status': SyncStatus.failed.name,
            'retryCount': newRetryCount,
            'lastError': e.toString(),
            'nextRetryAt': newRetryCount < _maxRetries
                ? nextRetryAt.toIso8601String()
                : null,
          },
          where: 'id = ? AND tenantId = ? AND workspaceId = ?',
          whereArgs: [op.id, op.tenantId, op.workspaceId],
        );

        if (newRetryCount < _maxRetries) {
          await _scheduleNextRetry();
        }
      }
    }
  }

  _SyncFailureDisposition _classifySyncFailure(Object error) {
    if (error is SyncConflictDetected) {
      return _SyncFailureDisposition.conflicted;
    }
    if (error is SyncUnsupportedOperation) {
      return _SyncFailureDisposition.rejected;
    }
    if (error is DioException) {
      final status = error.response?.statusCode;
      if (status == 409) return _SyncFailureDisposition.conflicted;
      if (status == 400 || status == 403 || status == 404 || status == 422) {
        return _SyncFailureDisposition.rejected;
      }
      return _SyncFailureDisposition.retryable;
    }
    return _SyncFailureDisposition.retryable;
  }

  String _syncErrorMessage(Object error) {
    if (error is DioException) {
      final data = error.response?.data;
      if (data is Map) {
        final message =
            data['statusMessage'] ?? data['message'] ?? data['error'];
        if (message != null && message.toString().trim().isNotEmpty) {
          return message.toString();
        }
      }
      final message = error.message?.trim();
      if (message != null && message.isNotEmpty) return message;
    }
    return error.toString();
  }

  Future<void> _scheduleNextRetry() async {
    _retryTimer?.cancel();
    _retryTimer = null;
    if (_apiService == null || !_mode.allowsNetworkRequests) return;
    // Scheduling only decides when to wake up next. It runs from the `finally`
    // of a sync pass, so it can be reading the queue exactly as a logout or
    // tenant switch closes the database underneath it. A failure here must not
    // escape as an unhandled async error — skipping one wake-up is harmless,
    // and the next connectivity change or enqueue schedules another.
    try {
      await _scheduleNextRetryUnguarded();
    } catch (error) {
      debugPrint('SyncService: could not schedule next retry: $error');
    }
  }

  Future<void> _scheduleNextRetryUnguarded() async {
    final tenantId = TenantModeService().activeTenantId;
    final workspaceId = _activeWorkspaceId;
    final db = await _dbService.database;
    final rows = await db.query(
      'sync_queue',
      columns: ['nextRetryAt'],
      where:
          'tenantId = ? AND workspaceId = ? AND status = ? AND retryCount < ? AND nextRetryAt IS NOT NULL',
      whereArgs: [tenantId, workspaceId, SyncStatus.failed.name, _maxRetries],
      orderBy: 'nextRetryAt ASC',
      limit: 1,
    );
    final nextRetryAt = rows.isEmpty
        ? null
        : SyncOperation._tryParseDateTime(rows.first['nextRetryAt']);

    var delay = nextRetryAt?.difference(DateTime.now());
    // A wake driven by a failed row's backoff is a real retry, so it pulls.
    var pullRemote = delay != null;

    // A pass can end with rows still `pending`: work deferred behind an
    // unsynced parent, or a queue longer than `_batchSize`. Those rows have no
    // `nextRetryAt` of their own, so without this they would sit untouched
    // until connectivity happened to flap. Such a sweep only needs to drain the
    // outbox — it carries no reason to re-pull remote state.
    if (delay == null || delay > _idleSweepDelay) {
      final pending =
          Sqflite.firstIntValue(
            await db.rawQuery(
              'SELECT COUNT(*) FROM sync_queue WHERE tenantId = ? AND workspaceId = ? AND status = ?',
              [tenantId, workspaceId, SyncStatus.pending.name],
            ),
          ) ??
          0;
      if (pending > 0) {
        delay = _idleSweepDelay;
        pullRemote = false;
      }
    }

    if (delay == null) return;
    if (delay <= Duration.zero) {
      unawaited(_checkAndSync(pullRemote: pullRemote));
      return;
    }
    _retryTimer = Timer(delay, () => _checkAndSync(pullRemote: pullRemote));
  }

  /// Payload fields that carry a reference to another syncable entity, keyed by
  /// the entity type that owns the referenced id. Used both to rewrite local
  /// ids into remote ids and to detect references that cannot be sent yet.
  static const Map<String, Map<String, String>> _dependencyFields = {
    'order': {'id': 'order'},
    'user': {'staffRoleId': 'staffRole', 'cashboxId': 'cashbox'},
    'sale': {'customerId': 'customer', 'orderId': 'order'},
    'customerPayment': {'customerId': 'customer', 'saleId': 'sale'},
    'purchase': {
      'id': 'purchase',
      'purchaseId': 'purchase',
      'supplierId': 'supplier',
    },
    'cashSession': {'cashboxId': 'cashbox', 'sessionId': 'cashSession'},
    'cashTransaction': {
      'cashboxId': 'cashbox',
      'sessionId': 'cashSession',
      'customerId': 'customer',
      'supplierId': 'supplier',
      'saleId': 'sale',
      'orderId': 'order',
      'purchaseOrderId': 'purchase',
    },
  };

  Future<SyncOperation> _resolveOperationAliases(SyncOperation op) async {
    final payload = Map<String, dynamic>.from(op.payload);
    var changed = false;

    final fields = _dependencyFields[op.entityType] ?? const <String, String>{};
    for (final entry in fields.entries) {
      final current = payload[entry.key]?.toString().trim();
      if (current == null || current.isEmpty) continue;
      final resolved = await _resolveEntityAlias(
        entry.value,
        current,
        tenantId: op.tenantId,
      );
      if (resolved == current) continue;
      payload[entry.key] = resolved;
      changed = true;
    }

    if (!changed) return op;

    final db = await _dbService.database;
    await db.update(
      'sync_queue',
      {'payload': jsonEncode(payload)},
      where: 'id = ? AND tenantId = ? AND workspaceId = ?',
      whereArgs: [op.id, op.tenantId, op.workspaceId],
    );

    return SyncOperation(
      id: op.id,
      tenantId: op.tenantId,
      workspaceId: op.workspaceId,
      entityType: op.entityType,
      action: op.action,
      payload: payload,
      status: op.status,
      retryCount: op.retryCount,
      idempotencyKey: op.idempotencyKey,
      lastError: op.lastError,
      lastAttemptAt: op.lastAttemptAt,
      nextRetryAt: op.nextRetryAt,
      createdAt: op.createdAt,
    );
  }

  /// Returns a description of the dependency blocking [op], or null if it can
  /// be sent now.
  ///
  /// After alias resolution a reference that still points at a local id means
  /// the parent entity does not exist on the server yet. Sending it anyway
  /// draws a 400/404/422, which [_classifySyncFailure] treats as `rejected` —
  /// a terminal state that silently drops the write. So if some other queued
  /// operation is still going to create that entity, defer instead of sending.
  Future<String?> _findBlockingDependency(SyncOperation op) async {
    final fields = _dependencyFields[op.entityType] ?? const <String, String>{};
    if (fields.isEmpty) return null;

    for (final entry in fields.entries) {
      // A create's own `id` cannot block it: `_hasPendingCreateFor` excludes
      // the operation being processed. That keeps the genuine case working —
      // an `order:updateStatus` on an order whose `order:create` is still
      // queued must wait for it.
      final value = op.payload[entry.key]?.toString().trim();
      if (value == null || value.isEmpty) continue;
      if (await _hasPendingCreateFor(entry.value, value, op)) {
        return '${entry.value} "$value" has not synced yet';
      }
    }
    return null;
  }

  /// Actions that bring an entity into existence server-side. Only these can
  /// block a dependent operation — matching on *any* operation carrying the
  /// same id would make two queued updates of one entity block each other,
  /// deadlocking both.
  static const Set<String> _creatingActions = {'create', 'createDraft', 'open'};

  /// True when a non-terminal queued operation is still going to create the
  /// [entityType] row identified locally by [localId].
  ///
  /// Scoped to [op]'s own tenant and workspace, and excluding [op] itself so an
  /// operation whose own local id appears in one of its reference fields never
  /// blocks itself.
  Future<bool> _hasPendingCreateFor(
    String entityType,
    String localId,
    SyncOperation op,
  ) async {
    final actions = _creatingActions.toList();
    final db = await _dbService.database;
    final rows = await db.query(
      'sync_queue',
      columns: ['payload'],
      where:
          'tenantId = ? AND workspaceId = ? AND entityType = ? AND id != ? '
          'AND action IN (${List.filled(actions.length, '?').join(', ')}) '
          'AND status IN (?, ?, ?)',
      whereArgs: [
        op.tenantId,
        op.workspaceId,
        entityType,
        op.id,
        ...actions,
        SyncStatus.pending.name,
        SyncStatus.failed.name,
        SyncStatus.syncing.name,
      ],
    );

    for (final row in rows) {
      final Map<String, dynamic> payload;
      try {
        payload = jsonDecode(row['payload'] as String) as Map<String, dynamic>;
      } catch (_) {
        continue;
      }
      final candidate = (payload['offlineId'] ?? payload['id'])
          ?.toString()
          .trim();
      if (candidate != null && candidate == localId) return true;
    }
    return false;
  }

  /// Scoped by the operation's own [tenantId] rather than the ambient active
  /// tenant: a tenant switch mid-pass must never resolve one tenant's local id
  /// against another tenant's alias table.
  Future<String> _resolveEntityAlias(
    String entityType,
    String id, {
    required String tenantId,
  }) async {
    final db = await _dbService.database;
    final rows = await db.query(
      'entity_aliases',
      columns: ['remoteId'],
      where: 'tenantId = ? AND entityType = ? AND localId = ?',
      whereArgs: [tenantId, entityType, id],
      limit: 1,
    );
    if (rows.isEmpty) return id;
    return rows.first['remoteId']?.toString() ?? id;
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
      if (value is String && ImageStorageManager.isLocalImagePath(value)) {
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
      where: 'id = ? AND tenantId = ? AND workspaceId = ?',
      whereArgs: [op.id, op.tenantId, op.workspaceId],
    );

    return SyncOperation(
      id: op.id,
      tenantId: op.tenantId,
      workspaceId: op.workspaceId,
      entityType: op.entityType,
      action: op.action,
      payload: processed,
      status: op.status,
      retryCount: op.retryCount,
      idempotencyKey: op.idempotencyKey,
      lastError: op.lastError,
      lastAttemptAt: op.lastAttemptAt,
      nextRetryAt: op.nextRetryAt,
      createdAt: op.createdAt,
    );
  }

  Future<dynamic> _executeApiCall(SyncOperation op) async {
    if (_apiService == null) throw StateError('ApiService not initialized');

    final client = _apiService!.client;
    final id = op.payload['id'];
    final idem = op.idempotencyKey;
    final headers = idem != null ? {'Idempotency-Key': idem} : null;
    final opts = headers != null ? Options(headers: headers) : null;

    switch (op.entityType) {
      case 'sale':
        if (op.action == 'create') {
          return (await client.post(
            '/admin/pos/sales',
            data: op.payload,
            options: opts,
          )).data;
        }
        break;
      case 'customer':
        if (op.action == 'create') {
          return (await client.post(
            '/admin/customers',
            data: op.payload,
            options: opts,
          )).data;
        }
        if (op.action == 'update') {
          // PATCH, not PUT: the customers router exposes only
          // `patch('/:id')`, so a PUT 404s. A 404 classifies as `rejected`,
          // which is terminal — every customer edit made in the app was
          // discarded while the local row kept showing the new value.
          return (await client.patch(
            '/admin/customers/$id',
            data: op.payload,
          )).data;
        }
        break;
      case 'product':
        if (op.action == 'create') {
          return (await client.post(
            '/admin/products',
            data: op.payload,
            options: opts,
          )).data;
        }
        if (op.action == 'update') {
          return (await client.put(
            '/admin/products/$id',
            data: op.payload,
          )).data;
        }
        if (op.action == 'delete') {
          return (await client.delete('/admin/products/$id')).data;
        }
        break;
      case 'category':
        if (op.action == 'create') {
          return (await client.post(
            '/admin/categories',
            data: op.payload,
            options: opts,
          )).data;
        }
        if (op.action == 'update') {
          return (await client.put(
            '/admin/categories/$id',
            data: op.payload,
          )).data;
        }
        if (op.action == 'delete') {
          return (await client.delete('/admin/categories/$id')).data;
        }
        break;
      case 'user':
        if (op.action == 'create') {
          return (await client.post(
            '/admin/users',
            data: op.payload,
            options: opts,
          )).data;
        }
        if (op.action == 'update') {
          return (await client.patch(
            '/admin/users/$id',
            data: op.payload,
          )).data;
        }
        if (op.action == 'delete') {
          return (await client.delete('/admin/users/$id')).data;
        }
        break;
      case 'supplier':
        if (op.action == 'create') {
          return (await client.post(
            '/admin/suppliers',
            data: op.payload,
            options: opts,
          )).data;
        }
        if (op.action == 'update') {
          return (await client.put(
            '/admin/suppliers/$id',
            data: op.payload,
          )).data;
        }
        if (op.action == 'delete') {
          return (await client.delete('/admin/suppliers/$id')).data;
        }
        break;
      case 'order':
        if (op.action == 'create') {
          return (await client.post(
            '/admin/orders',
            data: _stripSyncOnlyFields(op.payload, const {'offlineId'}),
            options: opts,
          )).data;
        }
        if (op.action == 'updateStatus') {
          return (await client.patch(
            '/admin/orders/$id',
            data: _stripSyncOnlyFields(op.payload, const {'baseFingerprint'}),
          )).data;
        }
        if (op.action == 'updateCallStatus') {
          return (await client.patch(
            '/admin/orders/$id',
            data: {'callStatus': op.payload['callStatus']},
          )).data;
        }
        if (op.action == 'updateInternalNotes') {
          return (await client.patch(
            '/admin/orders/$id',
            data: {'internalNotes': op.payload['internalNotes']},
          )).data;
        }
        break;
      case 'storeSettings':
        if (op.action == 'patch') {
          final patch = op.payload['patch'];
          return (await client.patch(
            '/admin/store-settings',
            data: patch is Map<String, dynamic>
                ? patch
                : patch is Map
                ? patch.cast<String, dynamic>()
                : const <String, dynamic>{},
          )).data;
        }
        break;
      case 'contactInfo':
        if (op.action == 'create') {
          return (await client.post(
            '/admin/contact-infos',
            data: _stripSyncOnlyFields(op.payload, const {'offlineId'}),
            options: opts,
          )).data;
        }
        if (op.action == 'update') {
          return (await client.patch(
            '/admin/contact-infos/$id',
            data: _stripSyncOnlyFields(op.payload, const {
              'id',
              'baseFingerprint',
            }),
          )).data;
        }
        if (op.action == 'delete') {
          return (await client.delete('/admin/contact-infos/$id')).data;
        }
        break;
      case 'customerPayment':
        if (op.action == 'create') {
          final customerId = op.payload['customerId'];
          return (await client.post(
            '/admin/customers/$customerId/payments',
            data: op.payload,
            options: opts,
          )).data;
        }
        break;
      case 'staffRole':
        if (op.action == 'create') {
          return (await client.post(
            '/admin/staff-roles',
            data: op.payload,
            options: opts,
          )).data;
        }
        if (op.action == 'update') {
          return (await client.patch(
            '/admin/staff-roles/$id',
            data: op.payload,
          )).data;
        }
        if (op.action == 'delete') {
          return (await client.delete('/admin/staff-roles/$id')).data;
        }
        break;
      case 'cashbox':
        if (op.action == 'create') {
          return (await client.post(
            '/admin/cash/cashboxes',
            data: _stripSyncOnlyFields(op.payload, const {'offlineId'}),
            options: opts,
          )).data;
        }
        if (op.action == 'update') {
          return (await client.patch(
            '/admin/cash/cashboxes/$id',
            data: _stripSyncOnlyFields(op.payload, const {
              'id',
              'baseFingerprint',
            }),
          )).data;
        }
        break;
      case 'cashSession':
        if (op.action == 'open') {
          final cashboxId = op.payload['cashboxId'];
          return (await client.post(
            '/admin/cash/cashboxes/$cashboxId/sessions/open',
            data: _stripSyncOnlyFields(op.payload, const {'offlineId'}),
            options: opts,
          )).data;
        }
        if (op.action == 'close') {
          final sessionId = op.payload['sessionId'];
          return (await client.post(
            '/admin/cash/cash-sessions/$sessionId/close',
            data: op.payload,
          )).data;
        }
        break;
      case 'cashTransaction':
        if (op.action == 'create') {
          return (await client.post(
            '/admin/cash/cash-transactions',
            data: _stripSyncOnlyFields(op.payload, const {'offlineId'}),
            options: opts,
          )).data;
        }
        break;
      case 'deliveryProvider':
        if (op.action == 'update') {
          return (await client.put(
            '/admin/delivery/providers/$id/account',
            data: _stripSyncOnlyFields(op.payload, const {
              'id',
              'baseFingerprint',
            }),
          )).data;
        }
        break;
      case 'purchase':
        final pid = op.payload['purchaseId'];
        if (op.action == 'createDraft') {
          return (await client.post(
            '/admin/purchases',
            data: op.payload,
            options: opts,
          )).data;
        }
        if (op.action == 'addItem') {
          return (await client.post(
            '/admin/purchases/$pid/items',
            data: op.payload,
            options: opts,
          )).data;
        }
        if (op.action == 'receiveItem') {
          return (await client.post(
            '/admin/purchases/$pid/receive',
            data: op.payload,
          )).data;
        }
        if (op.action == 'updateItem') {
          final iid = op.payload['itemId'];
          return (await client.put(
            '/admin/purchases/$pid/items/$iid',
            data: op.payload,
          )).data;
        }
        if (op.action == 'removeItem') {
          final iid = op.payload['itemId'];
          return (await client.delete('/admin/purchases/$pid/items/$iid')).data;
        }
        if (op.action == 'delete') {
          return (await client.delete('/admin/purchases/$id')).data;
        }
        if (op.action == 'updateStatus') {
          return (await client.patch(
            '/admin/purchases/$id/status',
            data: op.payload,
          )).data;
        }
        break;
    }

    throw SyncUnsupportedOperation(op.entityType, op.action);
  }

  Map<String, dynamic> _stripSyncOnlyFields(
    Map<String, dynamic> payload,
    Set<String> keys,
  ) {
    final cleaned = Map<String, dynamic>.from(payload);
    for (final key in keys) {
      cleaned.remove(key);
    }
    return cleaned;
  }

  Future<String?> _preflightConflictCheck(SyncOperation op) async {
    if (_apiService == null) return null;
    final baseFingerprint = op.payload['baseFingerprint']?.toString();
    if (baseFingerprint == null || baseFingerprint.isEmpty) return null;

    final client = _apiService!.client;
    final id = op.payload['id']?.toString() ?? '';

    switch (op.entityType) {
      case 'order':
        if (op.action != 'updateStatus' || id.isEmpty) return null;
        final res = await client.get('/admin/orders/$id');
        final data = _asMap(res.data);
        if (data == null) return null;
        final remoteFingerprint = SyncConflictPolicies.fingerprintData({
          'status': _string(data['status']).trim().toUpperCase(),
        });
        return remoteFingerprint == baseFingerprint
            ? null
            : 'Remote order status changed';
      case 'storeSettings':
        if (op.action != 'patch') return null;
        final res = await client.get('/admin/store-settings');
        final data = _asMap(res.data);
        if (data == null) return null;
        final remoteFingerprint = SyncConflictPolicies.fingerprintData(
          _storeSettingsComparable(data),
        );
        return remoteFingerprint == baseFingerprint
            ? null
            : 'Remote store settings changed';
      case 'contactInfo':
        final res = await client.get('/admin/contact-infos');
        final payload = _asMap(res.data);
        final items = _asList(payload?['items']);
        Map<String, dynamic>? remote;
        for (final item in items.whereType<Map>()) {
          final candidate = item.cast<String, dynamic>();
          if (_string(candidate['id']) == id) {
            remote = candidate;
            break;
          }
        }
        if (op.action == 'delete' && remote == null) return null;
        if (remote == null) return 'Remote contact info changed';
        final remoteFingerprint = SyncConflictPolicies.fingerprintData({
          'kind': _string(remote['kind']),
          'label': remote['label']?.toString(),
          'value': _string(remote['value']),
          'position': _int(remote['position']),
          'isActive': remote['isActive'] == true,
          'href': remote['href']?.toString(),
        });
        return remoteFingerprint == baseFingerprint
            ? null
            : 'Remote contact info changed';
      case 'cashbox':
        if (op.action != 'update' || id.isEmpty) return null;
        final res = await client.get('/admin/cash/cashboxes');
        Map<String, dynamic>? remote;
        for (final item in _asList(res.data).whereType<Map>()) {
          final candidate = item.cast<String, dynamic>();
          if (_string(candidate['id']) == id) {
            remote = candidate;
            break;
          }
        }
        if (remote == null) return 'Remote cashbox changed';
        final remoteFingerprint = SyncConflictPolicies.fingerprintData({
          'name': _string(remote['name']),
          'isActive': remote['isActive'] == true,
        });
        return remoteFingerprint == baseFingerprint
            ? null
            : 'Remote cashbox changed';
      case 'deliveryProvider':
        if (op.action != 'update' || id.isEmpty) return null;
        final res = await client.get('/admin/delivery/providers');
        Map<String, dynamic>? remote;
        for (final item in _asList(res.data).whereType<Map>()) {
          final candidate = item.cast<String, dynamic>();
          if (_string(candidate['provider']).toUpperCase() == id) {
            remote = candidate;
            break;
          }
        }
        if (remote == null) return 'Remote delivery provider changed';
        final account = _asMap(remote['account']);
        final remoteFingerprint = SyncConflictPolicies.fingerprintData({
          'offered': remote['offered'] == true,
          'isEnabled':
              remote['offered'] == true && account?['isActive'] == true,
        });
        return remoteFingerprint == baseFingerprint
            ? null
            : 'Remote delivery provider changed';
    }

    return null;
  }

  Future<void> _applySuccessfulSync(
    SyncOperation op,
    dynamic responseData,
  ) async {
    final db = await _dbService.database;
    final localId = (op.payload['offlineId'] ?? op.payload['id'])?.toString();

    switch (op.entityType) {
      case 'customer':
        if (op.action == 'create' && localId != null && localId.isNotEmpty) {
          final data = _asMap(responseData);
          final remoteId = _string(data?['id']);
          if (data != null && remoteId.isNotEmpty) {
            await _replaceSyncedRow(
              db: db,
              table: 'customers',
              tenantId: op.tenantId,
              entityType: op.entityType,
              localId: localId,
              remoteId: remoteId,
              values: {
                'name': _string(data['name'] ?? op.payload['name']),
                'phone':
                    data['phone']?.toString() ??
                    op.payload['phone']?.toString(),
                'email':
                    data['email']?.toString() ??
                    op.payload['email']?.toString(),
                'address':
                    data['address']?.toString() ??
                    op.payload['address']?.toString(),
                'totalSpent': _double(data['totalSpent']),
                'ordersCount': _int(data['ordersCount']),
              },
            );
            return;
          }
        }
        break;
      case 'supplier':
        if (op.action == 'create' && localId != null && localId.isNotEmpty) {
          final data = _asMap(responseData);
          final remoteId = _string(data?['id']);
          if (data != null && remoteId.isNotEmpty) {
            await _replaceSyncedRow(
              db: db,
              table: 'suppliers',
              tenantId: op.tenantId,
              entityType: op.entityType,
              localId: localId,
              remoteId: remoteId,
              values: {
                'name': _string(data['name'] ?? op.payload['name']),
                'phone':
                    data['phone']?.toString() ??
                    op.payload['phone']?.toString(),
                'email':
                    data['email']?.toString() ??
                    op.payload['email']?.toString(),
                'address':
                    data['address']?.toString() ??
                    op.payload['address']?.toString(),
                'notes':
                    data['notes']?.toString() ??
                    op.payload['notes']?.toString(),
              },
            );
            return;
          }
        }
        break;
      case 'storeSettings':
        final data = _asMap(responseData);
        if (data != null) {
          await db.insert('store_settings', {
            'id': 'singleton_${op.tenantId}',
            'tenantId': op.tenantId,
            'name': _string(data['name']),
            'slug': _string(data['slug']),
            'logoUrl': data['logoUrl']?.toString(),
            'faviconUrl': data['faviconUrl']?.toString(),
            'primaryColor': _string(data['primaryColor']),
            'useBrandColor': data['useBrandColor'] == true ? 1 : 0,
            'templateKey': _string(data['templateKey']),
            'announcementText': _string(data['announcementText']),
            'announcementScrolling': data['announcementScrolling'] == true
                ? 1
                : 0,
            'language': _string(data['language']),
            'cartEnabled': data['cartEnabled'] == false ? 0 : 1,
            'codEnabled': data['codEnabled'] == false ? 0 : 1,
            'orderIdPrefix': _string(data['orderIdPrefix']),
            'minimumOrderAmountDzd': _int(data['minimumOrderAmountDzd']),
            'hideOptionalAddress': data['hideOptionalAddress'] == true ? 1 : 0,
            'currencyCode': _string(data['currencyCode']),
            'currencyCountry': _string(data['currencyCountry']),
            'isCompleted': data['isCompleted'] == true ? 1 : 0,
            'legalPagesJson': jsonEncode(
              _asMap(data['legalPages']) ?? const {},
            ),
            'syncStatus': SyncStatus.synced.name,
          }, conflictAlgorithm: ConflictAlgorithm.replace);
          return;
        }
        break;
      case 'contactInfo':
        if (localId != null && localId.isNotEmpty) {
          final data = _asMap(responseData);
          if (data != null) {
            await _replaceSyncedRow(
              db: db,
              table: 'contact_infos',
              tenantId: op.tenantId,
              entityType: op.entityType,
              localId: localId,
              remoteId: _string(data['id']),
              values: {
                'kind': _string(data['kind']),
                'label': data['label']?.toString(),
                'value': _string(data['value']),
                'position': _int(data['position']),
                'isActive': data['isActive'] == true ? 1 : 0,
                'href': data['href']?.toString(),
                'createdAt': data['createdAt']?.toString(),
                'updatedAt': data['updatedAt']?.toString(),
              },
            );
            return;
          }
        }
        break;
      case 'cashbox':
        if (localId != null && localId.isNotEmpty) {
          final data = _asMap(responseData);
          if (data != null) {
            await _replaceSyncedRow(
              db: db,
              table: 'cashboxes',
              tenantId: op.tenantId,
              entityType: op.entityType,
              localId: localId,
              remoteId: _string(data['id']),
              values: {
                'name': _string(data['name']),
                'isActive': data['isActive'] == true ? 1 : 0,
                'createdAt': data['createdAt']?.toString(),
                'updatedAt': data['updatedAt']?.toString(),
                'openSessionId': null,
                'openSessionOpenedAt': null,
                'openSessionOpeningFloat': null,
              },
            );
            return;
          }
        }
        break;
      case 'order':
        if (op.action == 'create' && localId != null && localId.isNotEmpty) {
          final data = _asMap(responseData);
          final order = _asMap(data?['order']) ?? data;
          final remoteId = _string(order?['id'] ?? data?['orderId']);
          if (order != null && remoteId.isNotEmpty) {
            await _replaceSyncedRow(
              db: db,
              table: 'orders',
              tenantId: op.tenantId,
              entityType: op.entityType,
              localId: localId,
              remoteId: remoteId,
              values: {
                'status': _string(order['status']),
                'total': _double(order['totalAmount']),
                'createdAt': order['createdAt']?.toString(),
                'customerName': order['customerName']?.toString(),
                'customerPhone': order['customerPhone']?.toString(),
                'shippingAddress':
                    order['customerAddress']?.toString() ??
                    order['shippingAddressLine1']?.toString(),
                'itemsJson': jsonEncode(_asList(order['items'])),
              },
            );
            return;
          }
        }
        if (op.action == 'updateStatus' ||
            op.action == 'updateCallStatus' ||
            op.action == 'updateInternalNotes') {
          await _updateLocalOperationStatus(op, SyncStatus.synced);
          return;
        }
        break;
      case 'deliveryProvider':
        final data = _asMap(responseData);
        if (data != null) {
          final account = _asMap(data['account']);
          await db.update(
            'delivery_providers',
            {
              'name': _string(data['name']),
              'description': _deliverySupportsDescription(data['supports']),
              'offered': data['offered'] == true ? 1 : 0,
              'isEnabled':
                  data['offered'] == true && account?['isActive'] == true
                  ? 1
                  : 0,
              'syncStatus': SyncStatus.synced.name,
            },
            where: 'id = ? AND tenantId = ?',
            whereArgs: [op.payload['id'], op.tenantId],
          );
          return;
        }
        break;
      case 'purchase':
        if (op.action == 'createDraft' &&
            localId != null &&
            localId.isNotEmpty) {
          final data = _asMap(responseData);
          final remoteId = _string(data?['id'] ?? data?['purchaseId']);
          if (remoteId.isNotEmpty) {
            await _storeEntityAlias(
              db: db,
              tenantId: op.tenantId,
              entityType: op.entityType,
              localId: localId,
              remoteId: remoteId,
            );
          }
        }
        break;
      case 'cashSession':
        if (op.action == 'open' && localId != null && localId.isNotEmpty) {
          final data = _asMap(responseData);
          final session = _asMap(data?['session']) ?? data;
          final remoteId = _string(session?['id'] ?? data?['sessionId']);
          if (remoteId.isNotEmpty) {
            await _storeEntityAlias(
              db: db,
              tenantId: op.tenantId,
              entityType: op.entityType,
              localId: localId,
              remoteId: remoteId,
            );
          }
        }
        break;
      case 'customerPayment':
        if (op.action == 'create' && localId != null && localId.isNotEmpty) {
          final data = _asMap(responseData);
          final remoteId = _string(data?['id']);
          if (remoteId.isNotEmpty) {
            await _storeEntityAlias(
              db: db,
              tenantId: op.tenantId,
              entityType: op.entityType,
              localId: localId,
              remoteId: remoteId,
            );
          }
        }
        break;
      case 'staffRole':
        if (op.action == 'create' && localId != null && localId.isNotEmpty) {
          final data = _asMap(responseData);
          final remoteId = _string(data?['id']);
          if (remoteId.isNotEmpty) {
            await _storeEntityAlias(
              db: db,
              tenantId: op.tenantId,
              entityType: op.entityType,
              localId: localId,
              remoteId: remoteId,
            );
          }
        }
        break;
      case 'sale':
        if (op.action == 'create' && localId != null && localId.isNotEmpty) {
          final data = _asMap(responseData);
          final remoteId = _string(data?['id'] ?? data?['saleId']);
          if (remoteId.isNotEmpty) {
            await _storeEntityAlias(
              db: db,
              tenantId: op.tenantId,
              entityType: op.entityType,
              localId: localId,
              remoteId: remoteId,
            );
          }
        }
        break;
    }

    if (op.action == 'delete') {
      await _deleteLocalOperationRow(op);
      return;
    }
    await _updateLocalOperationStatus(op, SyncStatus.synced);
  }

  Future<void> _replaceSyncedRow({
    required dynamic db,
    required String table,
    required String tenantId,
    required String entityType,
    required String localId,
    required String remoteId,
    required Map<String, dynamic> values,
  }) async {
    await db.delete(
      table,
      where: 'id = ? AND tenantId = ?',
      whereArgs: [localId, tenantId],
    );
    await db.insert(table, {
      'id': remoteId,
      'tenantId': tenantId,
      ...values,
      'syncStatus': SyncStatus.synced.name,
    }, conflictAlgorithm: ConflictAlgorithm.replace);
    if (remoteId != localId) {
      await _storeEntityAlias(
        db: db,
        tenantId: tenantId,
        entityType: entityType,
        localId: localId,
        remoteId: remoteId,
      );
    }
  }

  Future<void> _storeEntityAlias({
    required dynamic db,
    required String tenantId,
    required String entityType,
    required String localId,
    required String remoteId,
  }) async {
    if (remoteId == localId || remoteId.trim().isEmpty) return;
    await db.insert('entity_aliases', {
      'tenantId': tenantId,
      'entityType': entityType,
      'localId': localId,
      'remoteId': remoteId,
      'createdAt': DateTime.now().toIso8601String(),
    }, conflictAlgorithm: ConflictAlgorithm.replace);
  }

  Map<String, dynamic> _storeSettingsComparable(Map<String, dynamic> data) => {
    'name': _string(data['name']),
    'slug': _string(data['slug']),
    'logoUrl': data['logoUrl']?.toString(),
    'faviconUrl': data['faviconUrl']?.toString(),
    'primaryColor': _string(data['primaryColor']),
    'useBrandColor': data['useBrandColor'] == true,
    'templateKey': _string(data['templateKey']),
    'announcementText': _string(data['announcementText']),
    'announcementScrolling': data['announcementScrolling'] == true,
    'language': _string(data['language']),
    'cartEnabled': data['cartEnabled'] != false,
    'codEnabled': data['codEnabled'] != false,
    'orderIdPrefix': _string(data['orderIdPrefix']),
    'minimumOrderAmountDzd': _int(data['minimumOrderAmountDzd']),
    'hideOptionalAddress': data['hideOptionalAddress'] == true,
    'currencyCode': _string(data['currencyCode']),
    'currencyCountry': _string(data['currencyCountry']),
    'legalPages': _asMap(data['legalPages']) ?? const <String, dynamic>{},
  };

  String? _deliverySupportsDescription(dynamic raw) {
    final supports = _asMap(raw);
    if (supports == null) return null;
    final tags = <String>[
      if (supports['quote'] == true) 'rates',
      if (supports['createShipment'] == true) 'shipments',
      if (supports['track'] == true) 'tracking',
      if (supports['webhooks'] == true) 'webhooks',
    ];
    return tags.isEmpty ? null : tags.join(' • ');
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
          if (await _markConflictIfLocalDirty(
            txn,
            'categories',
            tenantId,
            id,
          )) {
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
          if (await _markConflictIfLocalDirty(txn, 'products', tenantId, id)) {
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
          if (await _markConflictIfLocalDirty(txn, 'customers', tenantId, id)) {
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
          if (await _markConflictIfLocalDirty(txn, 'orders', tenantId, id)) {
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
          if (await _markConflictIfLocalDirty(txn, 'sales', tenantId, id)) {
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
    } catch (error) {
      // Pull failures must not block queued writes; the next connectivity tick
      // retries. Logged rather than swallowed so a persistently failing pull is
      // diagnosable instead of looking like an idle sync.
      debugPrint('SyncService: remote pull failed: $error');
    }
  }

  Future<void> _refreshSupplementalDomains(String tenantId) async {
    if (_apiService == null) return;

    final refreshers = <Future<void> Function()>[
      () => _refreshUsers(tenantId),
      () => _refreshSuppliers(tenantId),
      () => _refreshPurchases(tenantId),
      () => _refreshStoreSettings(tenantId),
      () => _refreshContactInfos(tenantId),
      () => _refreshCashboxes(tenantId),
      () => _refreshCashSessions(tenantId),
      () => _refreshCashTransactions(tenantId),
      () => _refreshDeliveryProviders(tenantId),
      () => _refreshStaffRoles(tenantId),
    ];

    for (final refresh in refreshers) {
      // Re-checked every iteration, not just once up front: the loop awaits ten
      // round trips, and a logout or tenant switch part-way through clears
      // `_apiService`. Each refresher dereferences it with `!`, so continuing
      // would throw a null-check error per remaining domain and keep writing
      // the previous tenant's data into a database that is being torn down.
      if (_apiService == null || !_mode.allowsNetworkRequests) return;
      try {
        await refresh();
      } catch (error, stackTrace) {
        debugPrint('SyncService: supplemental refresh failed: $error');
        debugPrint('$stackTrace');
      }
    }
  }

  Future<void> _refreshUsers(String tenantId) async {
    final response = await _apiService!.client.get(
      '/admin/users',
      queryParameters: const {'includeInactive': 'true'},
    );
    final rows = _asList(response.data);
    final db = await _dbService.database;
    await db.transaction((txn) async {
      await txn.delete(
        'users',
        where: "tenantId = ? AND syncStatus = 'synced'",
        whereArgs: [tenantId],
      );
      for (final raw in rows.whereType<Map>()) {
        final user = raw.cast<String, dynamic>();
        final id = _string(user['id']);
        if (id.isEmpty) continue;
        if (await _markConflictIfLocalDirty(txn, 'users', tenantId, id)) {
          continue;
        }
        await txn.insert('users', {
          'id': id,
          'tenantId': tenantId,
          'email': _string(user['email']),
          'role': _string(user['role']),
          'isActive': user['isActive'] == true ? 1 : 0,
          'cashboxId': user['cashboxId']?.toString(),
          'staffRoleId': user['staffRoleId']?.toString(),
          'createdAt': user['createdAt']?.toString(),
          'updatedAt': user['updatedAt']?.toString(),
          'syncStatus': SyncStatus.synced.name,
        }, conflictAlgorithm: ConflictAlgorithm.replace);
      }
    });
  }

  Future<void> _refreshSuppliers(String tenantId) async {
    final response = await _apiService!.client.get('/admin/suppliers');
    final rows = _asList(response.data);
    final db = await _dbService.database;
    await db.transaction((txn) async {
      await txn.delete(
        'suppliers',
        where: "tenantId = ? AND syncStatus = 'synced'",
        whereArgs: [tenantId],
      );
      for (final raw in rows.whereType<Map>()) {
        final supplier = raw.cast<String, dynamic>();
        final id = _string(supplier['id']);
        if (id.isEmpty) continue;
        if (await _markConflictIfLocalDirty(txn, 'suppliers', tenantId, id)) {
          continue;
        }
        await txn.insert('suppliers', {
          'id': id,
          'tenantId': tenantId,
          'name': _string(supplier['name']),
          'phone': supplier['phone']?.toString(),
          'email': supplier['email']?.toString(),
          'address': supplier['address']?.toString(),
          'notes': supplier['notes']?.toString(),
          'syncStatus': SyncStatus.synced.name,
        }, conflictAlgorithm: ConflictAlgorithm.replace);
      }
    });
  }

  Future<void> _refreshPurchases(String tenantId) async {
    final response = await _apiService!.client.get('/admin/purchases');
    final rows = _asList(response.data);
    final db = await _dbService.database;
    await db.transaction((txn) async {
      await txn.delete(
        'purchases',
        where: "tenantId = ? AND syncStatus = 'synced'",
        whereArgs: [tenantId],
      );
      for (final raw in rows.whereType<Map>()) {
        final purchase = raw.cast<String, dynamic>();
        final id = _string(purchase['id']);
        if (id.isEmpty) continue;
        if (await _markConflictIfLocalDirty(txn, 'purchases', tenantId, id)) {
          continue;
        }
        await txn.insert('purchases', {
          'id': id,
          'tenantId': tenantId,
          'supplierId': purchase['supplierId']?.toString(),
          'supplierName': purchase['supplierName']?.toString(),
          'supplierEmail': purchase['supplierEmail']?.toString(),
          'supplierPhone': purchase['supplierPhone']?.toString(),
          'totalAmount': _double(purchase['totalAmount']),
          'status': _string(purchase['status']),
          'createdAt': purchase['createdAt']?.toString(),
          'notes': purchase['notes']?.toString(),
          'itemsJson': jsonEncode(_asList(purchase['items'])),
          'syncStatus': SyncStatus.synced.name,
        }, conflictAlgorithm: ConflictAlgorithm.replace);
      }
    });
  }

  Future<void> _refreshStoreSettings(String tenantId) async {
    final response = await _apiService!.client.get('/admin/store-settings');
    final data = _asMap(response.data);
    if (data == null) return;
    final db = await _dbService.database;
    // Same guard every other refresher applies: an unsynced local edit must not
    // be overwritten by the server copy. `updateSettings` writes the row as
    // `pending` before queueing its patch, so without this a patch waiting on a
    // retry would have the user's visible edit silently reverted.
    if (await _markConflictIfLocalDirty(
      db,
      'store_settings',
      tenantId,
      'singleton_$tenantId',
    )) {
      return;
    }
    await db.insert('store_settings', {
      'id': 'singleton_$tenantId',
      'tenantId': tenantId,
      'name': _string(data['name']),
      'slug': _string(data['slug']),
      'logoUrl': data['logoUrl']?.toString(),
      'faviconUrl': data['faviconUrl']?.toString(),
      'primaryColor': _string(data['primaryColor']),
      'useBrandColor': data['useBrandColor'] == true ? 1 : 0,
      'templateKey': _string(data['templateKey']),
      'announcementText': _string(data['announcementText']),
      'announcementScrolling': data['announcementScrolling'] == true ? 1 : 0,
      'language': _string(data['language']),
      'cartEnabled': data['cartEnabled'] == false ? 0 : 1,
      'codEnabled': data['codEnabled'] == false ? 0 : 1,
      'orderIdPrefix': _string(data['orderIdPrefix']),
      'minimumOrderAmountDzd': _int(data['minimumOrderAmountDzd']),
      'hideOptionalAddress': data['hideOptionalAddress'] == true ? 1 : 0,
      'currencyCode': _string(data['currencyCode']),
      'currencyCountry': _string(data['currencyCountry']),
      'isCompleted': data['isCompleted'] == true ? 1 : 0,
      'legalPagesJson': jsonEncode(_asMap(data['legalPages']) ?? const {}),
      'syncStatus': SyncStatus.synced.name,
    }, conflictAlgorithm: ConflictAlgorithm.replace);
  }

  Future<void> _refreshContactInfos(String tenantId) async {
    final response = await _apiService!.client.get('/admin/contact-infos');
    final payload = _asMap(response.data);
    final rows = _asList(payload?['items']);
    final db = await _dbService.database;
    await db.transaction((txn) async {
      await txn.delete(
        'contact_infos',
        where: "tenantId = ? AND syncStatus = 'synced'",
        whereArgs: [tenantId],
      );
      for (final raw in rows.whereType<Map>()) {
        final info = raw.cast<String, dynamic>();
        final id = _string(info['id']);
        if (id.isEmpty) continue;
        if (await _markConflictIfLocalDirty(
          txn,
          'contact_infos',
          tenantId,
          id,
        )) {
          continue;
        }
        await txn.insert('contact_infos', {
          'id': id,
          'tenantId': tenantId,
          'kind': _string(info['kind']),
          'label': info['label']?.toString(),
          'value': _string(info['value']),
          'position': _int(info['position']),
          'isActive': info['isActive'] == true ? 1 : 0,
          'href': info['href']?.toString(),
          'createdAt': info['createdAt']?.toString(),
          'updatedAt': info['updatedAt']?.toString(),
          'syncStatus': SyncStatus.synced.name,
        }, conflictAlgorithm: ConflictAlgorithm.replace);
      }
    });
  }

  Future<void> _refreshCashboxes(String tenantId) async {
    final response = await _apiService!.client.get('/admin/cash/cashboxes');
    final rows = _asList(response.data);
    final db = await _dbService.database;
    await db.transaction((txn) async {
      await txn.delete(
        'cashboxes',
        where: "tenantId = ? AND syncStatus = 'synced'",
        whereArgs: [tenantId],
      );
      for (final raw in rows.whereType<Map>()) {
        final cashbox = raw.cast<String, dynamic>();
        final id = _string(cashbox['id']);
        if (id.isEmpty) continue;
        if (await _markConflictIfLocalDirty(txn, 'cashboxes', tenantId, id)) {
          continue;
        }
        final open = _asMap(cashbox['openSession']);
        await txn.insert('cashboxes', {
          'id': id,
          'tenantId': tenantId,
          'name': _string(cashbox['name']),
          'isActive': cashbox['isActive'] == true ? 1 : 0,
          'createdAt': cashbox['createdAt']?.toString(),
          'updatedAt': cashbox['updatedAt']?.toString(),
          'openSessionId': open?['id']?.toString(),
          'openSessionOpenedAt': open?['openedAt']?.toString(),
          'openSessionOpeningFloat': open == null
              ? null
              : _double(open['openingFloat']),
          'syncStatus': SyncStatus.synced.name,
        }, conflictAlgorithm: ConflictAlgorithm.replace);
      }
    });
  }

  Future<void> _refreshCashSessions(String tenantId) async {
    final response = await _apiService!.client.get('/admin/cash/cash-sessions');
    final payload = _asMap(response.data);
    final rows = _asList(payload?['items']);
    final db = await _dbService.database;
    await db.transaction((txn) async {
      await txn.delete(
        'cash_sessions',
        where: "tenantId = ? AND syncStatus = 'synced'",
        whereArgs: [tenantId],
      );
      for (final raw in rows.whereType<Map>()) {
        final session = raw.cast<String, dynamic>();
        final id = _string(session['id']);
        if (id.isEmpty) continue;
        if (await _markConflictIfLocalDirty(
          txn,
          'cash_sessions',
          tenantId,
          id,
        )) {
          continue;
        }
        await txn.insert('cash_sessions', {
          'id': id,
          'tenantId': tenantId,
          'cashboxId': _string(session['cashboxId']),
          'status': _string(session['status']),
          'openingFloat': _double(session['openingFloat']),
          'openedAt': session['openedAt']?.toString(),
          'closedAt': session['closedAt']?.toString(),
          'closingCount': session['closingCount'] == null
              ? null
              : _double(session['closingCount']),
          'expectedClosing': session['expectedClosing'] == null
              ? null
              : _double(session['expectedClosing']),
          'difference': session['difference'] == null
              ? null
              : _double(session['difference']),
          'note': session['note']?.toString(),
          'openedByUserId': session['openedByUserId']?.toString(),
          'closedByUserId': session['closedByUserId']?.toString(),
          'syncStatus': SyncStatus.synced.name,
        }, conflictAlgorithm: ConflictAlgorithm.replace);
      }
    });
  }

  Future<void> _refreshCashTransactions(String tenantId) async {
    final response = await _apiService!.client.get(
      '/admin/cash/cash-transactions',
    );
    final payload = _asMap(response.data);
    final rows = _asList(payload?['items']);
    final db = await _dbService.database;
    await db.transaction((txn) async {
      await txn.delete(
        'cash_transactions',
        where: "tenantId = ? AND syncStatus = 'synced'",
        whereArgs: [tenantId],
      );
      for (final raw in rows.whereType<Map>()) {
        final transaction = raw.cast<String, dynamic>();
        final id = _string(transaction['id']);
        if (id.isEmpty) continue;
        if (await _markConflictIfLocalDirty(
          txn,
          'cash_transactions',
          tenantId,
          id,
        )) {
          continue;
        }
        await txn.insert('cash_transactions', {
          'id': id,
          'tenantId': tenantId,
          'cashboxId': _string(transaction['cashboxId']),
          'sessionId': _string(transaction['sessionId']),
          'direction': _string(transaction['direction']),
          'type': _string(transaction['type']),
          'amount': _double(transaction['amount']),
          'currency': _string(transaction['currency']),
          'method': _string(transaction['method']),
          'customerId': transaction['customerId']?.toString(),
          'supplierId': transaction['supplierId']?.toString(),
          'saleId': transaction['saleId']?.toString(),
          'orderId': transaction['orderId']?.toString(),
          'purchaseOrderId': transaction['purchaseOrderId']?.toString(),
          'expenseCategory': transaction['expenseCategory']?.toString(),
          'transferGroupId': transaction['transferGroupId']?.toString(),
          'reference': transaction['reference']?.toString(),
          'note': transaction['note']?.toString(),
          'createdByUserId': transaction['createdByUserId']?.toString(),
          'createdAt': transaction['createdAt']?.toString(),
          'syncStatus': SyncStatus.synced.name,
        }, conflictAlgorithm: ConflictAlgorithm.replace);
      }
    });
  }

  Future<void> _refreshDeliveryProviders(String tenantId) async {
    final response = await _apiService!.client.get('/admin/delivery/providers');
    final rows = _asList(response.data);
    final db = await _dbService.database;
    await db.transaction((txn) async {
      await txn.delete(
        'delivery_providers',
        where: "tenantId = ? AND syncStatus = 'synced'",
        whereArgs: [tenantId],
      );
      final deliveryProviderColumns = await _tableInfo(
        txn,
        'delivery_providers',
      );
      for (final raw in rows.whereType<Map>()) {
        final provider = raw.cast<String, dynamic>();
        final id = _string(provider['provider']).toUpperCase();
        if (id.isEmpty) continue;
        if (await _markConflictIfLocalDirty(
          txn,
          'delivery_providers',
          tenantId,
          id,
        )) {
          continue;
        }
        final account = _asMap(provider['account']);
        final values = _withRequiredColumnDefaults(deliveryProviderColumns, {
          'id': id,
          'tenantId': tenantId,
          'name': _string(provider['name']),
          'description': _deliverySupportsDescription(provider['supports']),
          'offered': provider['offered'] == true ? 1 : 0,
          'isEnabled':
              provider['offered'] == true && account?['isActive'] == true
              ? 1
              : 0,
          'updatedAt': provider['updatedAt']?.toString(),
          'syncStatus': SyncStatus.synced.name,
        });
        await txn.insert(
          'delivery_providers',
          values,
          conflictAlgorithm: ConflictAlgorithm.replace,
        );
      }
    });
  }

  Future<void> _refreshStaffRoles(String tenantId) async {
    final response = await _apiService!.client.get('/admin/staff-roles');
    final rows = _asList(response.data);
    final db = await _dbService.database;
    await db.transaction((txn) async {
      await txn.delete(
        'staff_roles',
        where: "tenantId = ? AND syncStatus = 'synced'",
        whereArgs: [tenantId],
      );
      for (final raw in rows.whereType<Map>()) {
        final role = raw.cast<String, dynamic>();
        final id = _string(role['id']);
        if (id.isEmpty) continue;
        if (await _markConflictIfLocalDirty(txn, 'staff_roles', tenantId, id)) {
          continue;
        }
        await txn.insert('staff_roles', {
          'id': id,
          'tenantId': tenantId,
          'name': _string(role['name']),
          'permissionsJson': jsonEncode(_asList(role['permissions'])),
          'syncStatus': SyncStatus.synced.name,
        }, conflictAlgorithm: ConflictAlgorithm.replace);
      }
    });
  }

  List<dynamic> _asList(dynamic value) => value is List ? value : const [];

  Map<String, dynamic>? _asMap(dynamic value) {
    if (value is Map<String, dynamic>) return value;
    if (value is Map) return value.cast<String, dynamic>();
    return null;
  }

  Future<List<Map<String, Object?>>> _tableInfo(
    DatabaseExecutor db,
    String table,
  ) {
    return db.rawQuery('PRAGMA table_info($table)');
  }

  Map<String, Object?> _withRequiredColumnDefaults(
    List<Map<String, Object?>> columns,
    Map<String, Object?> values,
  ) {
    final result = Map<String, Object?>.from(values);
    for (final column in columns) {
      final name = column['name']?.toString();
      if (name == null || name.isEmpty || result.containsKey(name)) continue;
      final isRequired = column['notnull'] == 1;
      final hasDefault = column['dflt_value'] != null;
      final isPrimaryKey = column['pk'] == 1;
      if (!isRequired || hasDefault || isPrimaryKey) continue;

      final type = (column['type']?.toString() ?? '').toUpperCase();
      if (type.contains('INT')) {
        result[name] = 0;
      } else if (type.contains('REAL') ||
          type.contains('NUM') ||
          type.contains('DEC') ||
          type.contains('DOUBLE') ||
          type.contains('FLOAT')) {
        result[name] = 0.0;
      } else {
        result[name] = '';
      }
    }
    return result;
  }

  Future<bool> _markConflictIfLocalDirty(
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
    final status = rows.first['syncStatus']?.toString();
    if (status == SyncStatus.synced.name) return false;
    await txn.update(
      table,
      {'syncStatus': SyncStatus.conflicted.name},
      where: 'id = ? AND tenantId = ?',
      whereArgs: [id, tenantId],
    );
    return true;
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

  Future<void> _markLocalOperationConflicted(SyncOperation op) async {
    await _updateLocalOperationStatus(op, SyncStatus.conflicted);
  }

  Future<void> _markLocalOperationRejected(SyncOperation op) async {
    await _updateLocalOperationStatus(op, SyncStatus.rejected);
  }

  Future<void> _deleteLocalOperationRow(SyncOperation op) async {
    final table = _tableForEntityType(op.entityType);
    if (table == null) return;
    final localId = _localIdForOperation(op);
    if (localId == null || localId.isEmpty) return;

    final db = await _dbService.database;
    await db.delete(
      table,
      where: 'id = ? AND tenantId = ?',
      whereArgs: [localId, op.tenantId],
    );
  }

  Future<void> _updateLocalOperationStatus(
    SyncOperation op,
    SyncStatus status,
  ) async {
    final table = _tableForEntityType(op.entityType);
    if (table == null) return;

    final localId = _localIdForOperation(op);
    if (localId == null || localId.isEmpty) return;

    final db = await _dbService.database;
    await db.update(
      table,
      {'syncStatus': status.name},
      where: 'id = ? AND tenantId = ?',
      whereArgs: [localId, op.tenantId],
    );
  }

  String? _tableForEntityType(String entityType) {
    return switch (entityType) {
      'sale' => 'sales',
      'customer' => 'customers',
      'product' => 'products',
      'category' => 'categories',
      'user' => 'users',
      'supplier' => 'suppliers',
      'order' => 'orders',
      'storeSettings' => 'store_settings',
      'contactInfo' => 'contact_infos',
      'receiptLayout' => 'receipt_layouts',
      'printerProfile' => 'printer_profiles',
      'staffRole' => 'staff_roles',
      'cashbox' => 'cashboxes',
      'cashSession' => 'cash_sessions',
      'cashTransaction' => 'cash_transactions',
      'deliveryProvider' => 'delivery_providers',
      'purchase' => 'purchases',
      _ => null,
    };
  }

  String? _localIdForOperation(SyncOperation op) {
    return (op.payload['offlineId'] ??
            op.payload['id'] ??
            op.payload['purchaseId'])
        ?.toString()
        .trim();
  }

  Future<void> _emitState({bool syncing = false}) async {
    try {
      final tenantId = TenantModeService().activeTenantId;
      final workspaceId = _activeWorkspaceId;
      final db = await _dbService.database;
      final pending =
          Sqflite.firstIntValue(
            await db.rawQuery(
              "SELECT COUNT(*) FROM sync_queue WHERE tenantId = ? AND workspaceId = ? AND status = ?",
              [tenantId, workspaceId, SyncStatus.pending.name],
            ),
          ) ??
          0;
      final failed =
          Sqflite.firstIntValue(
            await db.rawQuery(
              "SELECT COUNT(*) FROM sync_queue WHERE tenantId = ? AND workspaceId = ? AND status = ?",
              [tenantId, workspaceId, SyncStatus.failed.name],
            ),
          ) ??
          0;
      final retrying =
          Sqflite.firstIntValue(
            await db.rawQuery(
              "SELECT COUNT(*) FROM sync_queue WHERE tenantId = ? AND workspaceId = ? AND status = ? AND retryCount < ?",
              [tenantId, workspaceId, SyncStatus.failed.name, _maxRetries],
            ),
          ) ??
          0;
      final recoveryRequired = failed - retrying;
      final rejected =
          Sqflite.firstIntValue(
            await db.rawQuery(
              "SELECT COUNT(*) FROM sync_queue WHERE tenantId = ? AND workspaceId = ? AND status = ?",
              [tenantId, workspaceId, SyncStatus.rejected.name],
            ),
          ) ??
          0;
      final conflictedQueue =
          Sqflite.firstIntValue(
            await db.rawQuery(
              "SELECT COUNT(*) FROM sync_queue WHERE tenantId = ? AND workspaceId = ? AND status = ?",
              [tenantId, workspaceId, SyncStatus.conflicted.name],
            ),
          ) ??
          0;
      final nextRetryRows = await db.query(
        'sync_queue',
        columns: ['nextRetryAt'],
        where:
            'tenantId = ? AND workspaceId = ? AND status = ? AND retryCount < ? AND nextRetryAt IS NOT NULL',
        whereArgs: [tenantId, workspaceId, SyncStatus.failed.name, _maxRetries],
        orderBy: 'nextRetryAt ASC',
        limit: 1,
      );
      final latestIssueRows = await db.query(
        'sync_queue',
        columns: ['lastError'],
        where:
            'tenantId = ? AND workspaceId = ? AND status IN (?, ?, ?) AND lastError IS NOT NULL',
        whereArgs: [
          tenantId,
          workspaceId,
          SyncStatus.failed.name,
          SyncStatus.conflicted.name,
          SyncStatus.rejected.name,
        ],
        orderBy: 'lastAttemptAt DESC, createdAt DESC',
        limit: 1,
      );
      final conflictedRows = await _countConflictedRows(db, tenantId);
      _syncStateController.add(
        SyncState(
          pending: pending,
          failed: failed,
          retrying: retrying,
          recoveryRequired:
              (recoveryRequired < 0 ? 0 : recoveryRequired) + rejected,
          conflicted: conflictedQueue + conflictedRows,
          rejected: rejected,
          isSyncing: syncing || _isSyncing,
          nextRetryAt: nextRetryRows.isEmpty
              ? null
              : SyncOperation._tryParseDateTime(
                  nextRetryRows.first['nextRetryAt'],
                ),
          latestError: latestIssueRows.isEmpty
              ? null
              : latestIssueRows.first['lastError']?.toString(),
        ),
      );
    } catch (_) {}
  }

  Future<int> _countConflictedRows(dynamic db, String tenantId) async {
    const tables = <String>[
      'categories',
      'products',
      'customers',
      'sales',
      'users',
      'suppliers',
      'purchases',
      'store_settings',
      'contact_infos',
      'printer_profiles',
      'receipt_layouts',
      'cashboxes',
      'cash_sessions',
      'cash_transactions',
      'customer_payments',
      'orders',
      'delivery_providers',
      'staff_roles',
    ];

    var total = 0;
    for (final table in tables) {
      total +=
          Sqflite.firstIntValue(
            await db.rawQuery(
              'SELECT COUNT(*) FROM $table WHERE tenantId = ? AND syncStatus = ?',
              [tenantId, SyncStatus.conflicted.name],
            ),
          ) ??
          0;
    }
    return total;
  }

  void dispose() {
    _connectivitySubscription?.cancel();
    _retryTimer?.cancel();
    _syncStateController.close();
  }
}
