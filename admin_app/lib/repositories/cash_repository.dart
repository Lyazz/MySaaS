import 'package:sqflite_sqlcipher/sqflite.dart';
import 'package:uuid/uuid.dart';

import '../models/cash.dart';
import 'license_guard.dart';
import '../services/api_service.dart';
import '../services/database_service.dart';
import '../services/sync_conflict_policy.dart';
import '../services/sync_service.dart';
import '../services/tenant_mode_service.dart';

class CashRepository {
  final ApiService _apiService;
  final DatabaseService _dbService = DatabaseService();
  final SyncService _syncService = SyncService();

  CashRepository(this._apiService);

  String get _tid => TenantModeService().activeTenantId;

  Future<List<CashboxSummary>> getCashboxes({bool forceRefresh = false}) async {
    final db = await _dbService.database;
    final localCashboxes = await _readLocalCashboxes(db);

    if (forceRefresh || await _syncService.isOnline) {
      try {
        final res = await _apiService.client.get('/admin/cash/cashboxes');
        final data = res.data is List ? res.data as List : const [];
        final remoteCashboxes = data
            .whereType<Map>()
            .map((e) => CashboxSummary.fromJson(e.cast<String, dynamic>()))
            .toList();
        await db.transaction((txn) async {
          await txn.delete(
            'cashboxes',
            where: "tenantId = ? AND syncStatus = 'synced'",
            whereArgs: [_tid],
          );
          for (final cashbox in remoteCashboxes) {
            await _upsertCashbox(
              txn,
              cashbox,
              syncStatus: SyncStatus.synced.name,
            );
          }
        });
        return remoteCashboxes;
      } catch (_) {}
    }

    return localCashboxes;
  }

  Future<CashboxSummary> createCashbox({
    required String name,
    bool isActive = true,
  }) async {
    LicenseWritePolicy.ensureAllowed(const WriteIntent('cashbox', 'create'));
    final db = await _dbService.database;
    final offlineId = const Uuid().v4();
    final cashbox = CashboxSummary(
      id: offlineId,
      name: name.trim(),
      isActive: isActive,
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
    );

    await _upsertCashbox(db, cashbox, syncStatus: SyncStatus.pending.name);
    await _syncService.enqueueOperation(
      entityType: 'cashbox',
      action: 'create',
      payload: {
        'offlineId': offlineId,
        'name': cashbox.name,
        'isActive': cashbox.isActive,
      },
    );
    return cashbox;
  }

  Future<CashboxSummary> updateCashbox(
    String id, {
    String? name,
    bool? isActive,
  }) async {
    LicenseWritePolicy.ensureAllowed(const WriteIntent('cashbox', 'update'));
    final trimmed = id.trim();
    if (trimmed.isEmpty) throw ArgumentError('Cashbox ID is required');
    final db = await _dbService.database;
    final current = await _findCashboxById(db, trimmed);
    if (current == null) throw Exception('Cashbox not found');

    final updated = current.copyWith(
      name: name?.trim().isNotEmpty == true ? name!.trim() : current.name,
      isActive: isActive ?? current.isActive,
      updatedAt: DateTime.now(),
    );

    await _upsertCashbox(db, updated, syncStatus: SyncStatus.pending.name);
    await _syncService.enqueueOperation(
      entityType: 'cashbox',
      action: 'update',
      payload: {
        'id': trimmed,
        if (name != null) 'name': name.trim(),
        if (isActive != null) 'isActive': isActive,
        'baseFingerprint': SyncConflictPolicies.fingerprintCashbox(current),
      },
    );
    return updated;
  }

  Future<List<CashSessionSummary>> getSessions({
    String? cashboxId,
    String? status,
    String? userId,
    DateTime? startDate,
    DateTime? endDate,
    bool forceRefresh = false,
  }) async {
    if (forceRefresh || await _syncService.isOnline) {
      try {
        final query = <String, dynamic>{
          if (cashboxId != null) 'cashboxId': cashboxId,
          if (status != null) 'status': status,
          if (userId != null) 'userId': userId,
          if (startDate != null) 'startDate': startDate.toIso8601String(),
          if (endDate != null) 'endDate': endDate.toIso8601String(),
        };
        final res = await _apiService.client.get(
          '/admin/cash/cash-sessions',
          queryParameters: query,
        );
        final data = res.data;
        final items = data is Map && data['items'] is List
            ? data['items'] as List
            : const [];
        final sessions = items
            .whereType<Map>()
            .map((e) => CashSessionSummary.fromJson(e.cast<String, dynamic>()))
            .toList();
        final db = await _dbService.database;
        await db.transaction((txn) async {
          for (final session in sessions) {
            await _upsertSession(
              txn,
              session,
              syncStatus: SyncStatus.synced.name,
            );
          }
        });
        return sessions;
      } catch (_) {}
    }

    final db = await _dbService.database;
    final where = <String>['tenantId = ?'];
    final whereArgs = <Object?>[_tid];
    if (cashboxId != null && cashboxId.trim().isNotEmpty) {
      where.add('cashboxId = ?');
      whereArgs.add(cashboxId.trim());
    }
    if (status != null && status.trim().isNotEmpty) {
      where.add('status = ?');
      whereArgs.add(status.trim().toUpperCase());
    }

    final localData = await db.query(
      'cash_sessions',
      where: where.join(' AND '),
      whereArgs: whereArgs,
      orderBy: 'openedAt DESC',
    );

    return localData
        .map(
          (e) => CashSessionSummary.fromJson({
            'id': e['id'],
            'cashboxId': e['cashboxId'],
            'status': e['status'],
            'openingFloat': e['openingFloat'],
            'openedAt': e['openedAt'],
            'closedAt': e['closedAt'],
            'closingCount': e['closingCount'],
            'expectedClosing': e['expectedClosing'],
            'difference': e['difference'],
            'note': e['note'],
            'openedByUserId': e['openedByUserId'],
            'closedByUserId': e['closedByUserId'],
          }),
        )
        .toList();
  }

  Future<List<CashTransactionSummary>> getTransactions({
    String? cashboxId,
    String? sessionId,
    String? type,
    String? direction,
    String? method,
    String? userId,
    DateTime? startDate,
    DateTime? endDate,
    bool forceRefresh = false,
  }) async {
    if (forceRefresh || await _syncService.isOnline) {
      try {
        final query = <String, dynamic>{
          if (cashboxId != null) 'cashboxId': cashboxId,
          if (sessionId != null) 'sessionId': sessionId,
          if (type != null) 'type': type,
          if (direction != null) 'direction': direction,
          if (method != null) 'method': method,
          if (userId != null) 'userId': userId,
          if (startDate != null) 'startDate': startDate.toIso8601String(),
          if (endDate != null) 'endDate': endDate.toIso8601String(),
        };
        final res = await _apiService.client.get(
          '/admin/cash/cash-transactions',
          queryParameters: query,
        );
        final data = res.data;
        final items = data is Map && data['items'] is List
            ? data['items'] as List
            : const [];
        final transactions = items
            .whereType<Map>()
            .map(
              (e) => CashTransactionSummary.fromJson(e.cast<String, dynamic>()),
            )
            .toList();
        final db = await _dbService.database;
        await db.transaction((txn) async {
          for (final tx in transactions) {
            await _upsertTransaction(
              txn,
              tx,
              syncStatus: SyncStatus.synced.name,
            );
          }
        });
        return transactions;
      } catch (_) {}
    }

    final db = await _dbService.database;
    final where = <String>['tenantId = ?'];
    final whereArgs = <Object?>[_tid];
    if (sessionId != null && sessionId.trim().isNotEmpty) {
      where.add('sessionId = ?');
      whereArgs.add(sessionId.trim());
    } else if (cashboxId != null && cashboxId.trim().isNotEmpty) {
      where.add('cashboxId = ?');
      whereArgs.add(cashboxId.trim());
    }

    final localData = await db.query(
      'cash_transactions',
      where: where.join(' AND '),
      whereArgs: whereArgs,
      orderBy: 'createdAt DESC',
    );

    return localData
        .map(
          (e) => CashTransactionSummary.fromJson({
            'id': e['id'],
            'cashboxId': e['cashboxId'],
            'sessionId': e['sessionId'],
            'direction': e['direction'],
            'type': e['type'],
            'amount': e['amount'],
            'currency': e['currency'],
            'method': e['method'],
            'customerId': e['customerId'],
            'supplierId': e['supplierId'],
            'saleId': e['saleId'],
            'orderId': e['orderId'],
            'purchaseOrderId': e['purchaseOrderId'],
            'expenseCategory': e['expenseCategory'],
            'transferGroupId': e['transferGroupId'],
            'reference': e['reference'],
            'note': e['note'],
            'createdByUserId': e['createdByUserId'],
            'createdAt': e['createdAt'],
          }),
        )
        .toList();
  }

  Future<CashSessionExpectedClosing> getExpectedClosing(
    String sessionId,
  ) async {
    if (await _syncService.isOnline) {
      try {
        final res = await _apiService.client.get(
          '/admin/cash/cash-sessions/$sessionId/expected',
        );
        return CashSessionExpectedClosing.fromJson(res.data);
      } catch (_) {}
    }
    return CashSessionExpectedClosing(
      sessionId: sessionId,
      openingFloat: 0,
      inSum: 0,
      outSum: 0,
      expectedClosing: 0,
      expectedByMethod: {},
    );
  }

  Future<CashSessionSummary?> getSessionDetails(String sessionId) async {
    final db = await _dbService.database;
    final localData = await db.query(
      'cash_sessions',
      where: 'id = ? AND tenantId = ?',
      whereArgs: [sessionId, _tid],
      limit: 1,
    );
    if (localData.isEmpty) return null;
    final e = localData.first;
    return CashSessionSummary.fromJson({
      'id': e['id'],
      'cashboxId': e['cashboxId'],
      'status': e['status'],
      'openingFloat': e['openingFloat'],
      'openedAt': e['openedAt'],
      'closedAt': e['closedAt'],
      'closingCount': e['closingCount'],
      'expectedClosing': e['expectedClosing'],
      'difference': e['difference'],
      'note': e['note'],
      'openedByUserId': e['openedByUserId'],
      'closedByUserId': e['closedByUserId'],
    });
  }

  Future<CashSessionSummary> openSession({
    required String cashboxId,
    required double openingFloat,
    String? note,
  }) async {
    LicenseWritePolicy.ensureAllowed(const WriteIntent('cashSession', 'open'));
    final db = await _dbService.database;
    final id = const Uuid().v4();
    final openedAt = DateTime.now();
    final newSession = CashSessionSummary(
      id: id,
      cashboxId: cashboxId,
      status: 'OPEN',
      openingFloat: openingFloat,
      openedAt: openedAt,
      note: note,
    );

    await _upsertSession(db, newSession, syncStatus: SyncStatus.pending.name);
    await db.update(
      'cashboxes',
      {
        'openSessionId': id,
        'openSessionOpenedAt': openedAt.toIso8601String(),
        'openSessionOpeningFloat': openingFloat,
      },
      where: 'id = ? AND tenantId = ?',
      whereArgs: [cashboxId, _tid],
    );

    await _syncService.enqueueOperation(
      entityType: 'cashSession',
      action: 'open',
      payload: {
        'offlineId': id,
        'cashboxId': cashboxId,
        'openingFloat': openingFloat,
        'note': note,
      },
    );

    return newSession;
  }

  Future<CashSessionSummary> closeSession({
    required String sessionId,
    required double closingCount,
    String? note,
  }) async {
    LicenseWritePolicy.ensureAllowed(const WriteIntent('cashSession', 'close'));
    final db = await _dbService.database;
    final current = await getSessionDetails(sessionId);
    if (current == null) throw Exception('Cash session not found');

    final updated = CashSessionSummary(
      id: current.id,
      cashboxId: current.cashboxId,
      status: 'CLOSED',
      openingFloat: current.openingFloat,
      openedAt: current.openedAt,
      closedAt: DateTime.now(),
      closingCount: closingCount,
      expectedClosing: current.expectedClosing,
      difference: current.difference,
      note: note,
      openedByUserId: current.openedByUserId,
      closedByUserId: current.closedByUserId,
    );

    await _upsertSession(db, updated, syncStatus: SyncStatus.pending.name);
    await db.update(
      'cashboxes',
      {
        'openSessionId': null,
        'openSessionOpenedAt': null,
        'openSessionOpeningFloat': null,
      },
      where: 'id = ? AND tenantId = ?',
      whereArgs: [current.cashboxId, _tid],
    );

    await _syncService.enqueueOperation(
      entityType: 'cashSession',
      action: 'close',
      payload: {
        'sessionId': sessionId,
        'closingCount': closingCount,
        'closedNote': note,
      },
    );

    return updated;
  }

  Future<CashTransactionSummary> addTransaction({
    required String sessionId,
    required String direction,
    required String type,
    required double amount,
    String? note,
    String? expenseCategory,
    String? reference,
  }) async {
    final db = await _dbService.database;
    final session = await getSessionDetails(sessionId);
    if (session == null) throw Exception('Cash session not found');

    LicenseWritePolicy.ensureAllowed(
      WriteIntent(
        'cashTransaction',
        'create',
        finishesOpenWork: session.status == 'OPEN',
      ),
    );

    final id = const Uuid().v4();
    final newTransaction = CashTransactionSummary(
      id: id,
      cashboxId: session.cashboxId,
      sessionId: sessionId,
      direction: direction,
      type: type,
      amount: amount,
      currency: 'DZD',
      method: 'CASH',
      note: note,
      expenseCategory: expenseCategory,
      reference: reference,
      createdAt: DateTime.now(),
    );

    await _upsertTransaction(
      db,
      newTransaction,
      syncStatus: SyncStatus.pending.name,
    );
    await _syncService.enqueueOperation(
      entityType: 'cashTransaction',
      action: 'create',
      payload: {
        'offlineId': id,
        'sessionId': sessionId,
        'direction': direction,
        'type': type,
        'amount': amount,
        'note': note,
        'expenseCategory': expenseCategory,
        'reference': reference,
      },
    );

    return newTransaction;
  }

  Future<List<CashboxSummary>> _readLocalCashboxes(Database db) async {
    final rows = await db.query(
      'cashboxes',
      where: 'tenantId = ?',
      whereArgs: [_tid],
      orderBy: 'createdAt ASC',
    );
    return rows.map(_rowToCashbox).toList();
  }

  Future<CashboxSummary?> _findCashboxById(Database db, String id) async {
    final rows = await db.query(
      'cashboxes',
      where: 'id = ? AND tenantId = ?',
      whereArgs: [id, _tid],
      limit: 1,
    );
    return rows.isEmpty ? null : _rowToCashbox(rows.first);
  }

  CashboxSummary _rowToCashbox(Map<String, Object?> row) {
    final openSessionId = row['openSessionId']?.toString();
    return CashboxSummary.fromJson({
      'id': row['id'],
      'name': row['name'],
      'isActive': row['isActive'] == 1,
      'createdAt': row['createdAt'],
      'updatedAt': row['updatedAt'],
      'openSession': openSessionId == null || openSessionId.isEmpty
          ? null
          : {
              'id': openSessionId,
              'openedAt': row['openSessionOpenedAt'],
              'openingFloat': row['openSessionOpeningFloat'] ?? 0,
            },
    });
  }

  Future<void> _upsertCashbox(
    DatabaseExecutor db,
    CashboxSummary cashbox, {
    required String syncStatus,
  }) async {
    await db.insert('cashboxes', {
      'id': cashbox.id,
      'tenantId': _tid,
      'name': cashbox.name,
      'isActive': cashbox.isActive ? 1 : 0,
      'createdAt': cashbox.createdAt?.toIso8601String(),
      'updatedAt': cashbox.updatedAt?.toIso8601String(),
      'openSessionId': cashbox.openSession?.id,
      'openSessionOpenedAt': cashbox.openSession?.openedAt?.toIso8601String(),
      'openSessionOpeningFloat': cashbox.openSession?.openingFloat,
      'syncStatus': syncStatus,
    }, conflictAlgorithm: ConflictAlgorithm.replace);
  }

  Future<void> _upsertSession(
    DatabaseExecutor db,
    CashSessionSummary session, {
    required String syncStatus,
  }) async {
    await db.insert('cash_sessions', {
      'id': session.id,
      'tenantId': _tid,
      'cashboxId': session.cashboxId,
      'status': session.status,
      'openingFloat': session.openingFloat,
      'openedAt': session.openedAt?.toIso8601String(),
      'closedAt': session.closedAt?.toIso8601String(),
      'closingCount': session.closingCount,
      'expectedClosing': session.expectedClosing,
      'difference': session.difference,
      'note': session.note,
      'openedByUserId': session.openedByUserId,
      'closedByUserId': session.closedByUserId,
      'syncStatus': syncStatus,
    }, conflictAlgorithm: ConflictAlgorithm.replace);
  }

  Future<void> _upsertTransaction(
    DatabaseExecutor db,
    CashTransactionSummary tx, {
    required String syncStatus,
  }) async {
    await db.insert('cash_transactions', {
      'id': tx.id,
      'tenantId': _tid,
      'cashboxId': tx.cashboxId,
      'sessionId': tx.sessionId,
      'direction': tx.direction,
      'type': tx.type,
      'amount': tx.amount,
      'currency': tx.currency,
      'method': tx.method,
      'customerId': tx.customerId,
      'supplierId': tx.supplierId,
      'saleId': tx.saleId,
      'orderId': tx.orderId,
      'purchaseOrderId': tx.purchaseOrderId,
      'expenseCategory': tx.expenseCategory,
      'transferGroupId': tx.transferGroupId,
      'reference': tx.reference,
      'note': tx.note,
      'createdByUserId': tx.createdByUserId,
      'createdAt': tx.createdAt?.toIso8601String(),
      'syncStatus': syncStatus,
    }, conflictAlgorithm: ConflictAlgorithm.replace);
  }
}
