import 'package:uuid/uuid.dart';
import 'package:sqflite_sqlcipher/sqflite.dart';

import '../models/cash.dart';
import '../services/api_service.dart';
import '../services/database_service.dart';
import '../services/sync_service.dart';
import '../services/tenant_mode_service.dart';

class CashRepository {
  final ApiService _apiService;
  final DatabaseService _dbService = DatabaseService();
  final SyncService _syncService = SyncService();

  CashRepository(this._apiService);

  String get _tid => TenantModeService().activeTenantId;

  Future<List<CashboxSummary>> getCashboxes({bool forceRefresh = false}) async {
    if (forceRefresh || await _syncService.isOnline) {
      try {
        final res = await _apiService.client.get('/admin/cash/cashboxes');
        final List<dynamic> data = res.data;
        return data.map((e) => CashboxSummary.fromJson(e)).toList();
      } catch (_) {}
    }
    return [];
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
        };
        final res = await _apiService.client.get(
          '/admin/cash-sessions',
          queryParameters: query,
        );
        final List<dynamic> data = res.data;
        return data.map((e) => CashSessionSummary.fromJson(e)).toList();
      } catch (_) {}
    }

    final db = await _dbService.database;
    final whereStr = cashboxId != null
        ? 'tenantId = ? AND cashboxId = ?'
        : 'tenantId = ?';
    final whereArgs = cashboxId != null ? [_tid, cashboxId] : [_tid];

    final localData = await db.query(
      'cash_sessions',
      where: whereStr,
      whereArgs: whereArgs,
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
        };
        final res = await _apiService.client.get(
          '/admin/cash-transactions',
          queryParameters: query,
        );
        final List<dynamic> data = res.data;
        return data.map((e) => CashTransactionSummary.fromJson(e)).toList();
      } catch (_) {}
    }

    final db = await _dbService.database;
    final whereStr = sessionId != null
        ? 'tenantId = ? AND sessionId = ?'
        : 'tenantId = ?';
    final whereArgs = sessionId != null ? [_tid, sessionId] : [_tid];

    final localData = await db.query(
      'cash_transactions',
      where: whereStr,
      whereArgs: whereArgs,
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
            'createdAt': e['createdAt'],
            'note': e['note'],
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
          '/admin/cash-sessions/$sessionId/expected',
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
    );

    if (localData.isNotEmpty) {
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

    if (await _syncService.isOnline) {
      try {
        final res = await _apiService.client.get(
          '/admin/cash/sessions/$sessionId',
        );
        final remoteSession = CashSessionSummary.fromJson(res.data);

        await db.insert('cash_sessions', {
          'id': remoteSession.id,
          'tenantId': _tid,
          'cashboxId': remoteSession.cashboxId,
          'status': remoteSession.status,
          'openingFloat': remoteSession.openingFloat,
          'openedAt': remoteSession.openedAt?.toIso8601String(),
          'closedAt': remoteSession.closedAt?.toIso8601String(),
          'closingCount': remoteSession.closingCount,
          'expectedClosing': remoteSession.expectedClosing,
          'difference': remoteSession.difference,
          'note': remoteSession.note,
          'openedByUserId': remoteSession.openedByUserId,
          'closedByUserId': remoteSession.closedByUserId,
          'syncStatus': 'synced',
        }, conflictAlgorithm: ConflictAlgorithm.replace);

        return remoteSession;
      } catch (_) {}
    }
    return null;
  }

  Future<CashSessionSummary> openSession({
    required String cashboxId,
    required double openingFloat,
    String? note,
  }) async {
    final db = await _dbService.database;
    final online = await _syncService.isOnline;

    final id = const Uuid().v4();
    final newSession = CashSessionSummary(
      id: id,
      cashboxId: cashboxId,
      status: 'OPEN',
      openingFloat: openingFloat,
      openedAt: DateTime.now(),
      note: note,
    );

    await db.insert('cash_sessions', {
      'id': newSession.id,
      'tenantId': _tid,
      'cashboxId': newSession.cashboxId,
      'status': newSession.status,
      'openingFloat': newSession.openingFloat,
      'openedAt': newSession.openedAt?.toIso8601String(),
      'note': newSession.note,
      'syncStatus': online ? 'synced' : 'pending',
    });

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
    final db = await _dbService.database;
    final online = await _syncService.isOnline;

    await db.update(
      'cash_sessions',
      {
        'status': 'CLOSED',
        'closingCount': closingCount,
        'closedAt': DateTime.now().toIso8601String(),
        'note': note,
        'syncStatus': online ? 'synced' : 'pending',
      },
      where: 'id = ? AND tenantId = ?',
      whereArgs: [sessionId, _tid],
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

    final localData = await db.query(
      'cash_sessions',
      where: 'id = ? AND tenantId = ?',
      whereArgs: [sessionId, _tid],
    );
    final e = localData.first;
    return CashSessionSummary.fromJson({
      'id': e['id'],
      'cashboxId': e['cashboxId'],
      'status': e['status'],
      'openingFloat': e['openingFloat'],
      'openedAt': e['openedAt'],
      'closedAt': e['closedAt'],
      'closingCount': e['closingCount'],
      'note': e['note'],
    });
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
    final online = await _syncService.isOnline;

    final id = const Uuid().v4();
    final newTransaction = CashTransactionSummary(
      id: id,
      cashboxId: 'unknown',
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

    await db.insert('cash_transactions', {
      'id': newTransaction.id,
      'tenantId': _tid,
      'cashboxId': newTransaction.cashboxId,
      'sessionId': newTransaction.sessionId,
      'direction': newTransaction.direction,
      'type': newTransaction.type,
      'amount': newTransaction.amount,
      'currency': newTransaction.currency,
      'method': newTransaction.method,
      'note': newTransaction.note,
      'expenseCategory': newTransaction.expenseCategory,
      'reference': newTransaction.reference,
      'createdAt': newTransaction.createdAt?.toIso8601String(),
      'syncStatus': online ? 'synced' : 'pending',
    });

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
}
