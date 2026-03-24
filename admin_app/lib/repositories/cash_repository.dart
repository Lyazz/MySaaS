import 'package:uuid/uuid.dart';
import 'package:sqflite_sqlcipher/sqflite.dart';

import '../models/cash.dart';
import '../services/api_service.dart';
import '../services/database_service.dart';
import '../services/sync_service.dart';

class CashRepository {
  final ApiService _apiService;
  final DatabaseService _dbService = DatabaseService();
  final SyncService _syncService = SyncService();

  CashRepository(this._apiService);

  Future<List<CashboxSummary>> getCashboxes({bool forceRefresh = false}) async {
    // For cashboxes, it's often small and static per tenant.
    // However, sessions are dynamic. We will fetch online if possible.
    if (forceRefresh || await _syncService.isOnline) {
      try {
        final res = await _apiService.client.get('/admin/cash/cashboxes');
        final List<dynamic> data = res.data;
        return data.map((e) => CashboxSummary.fromJson(e)).toList();
      } catch (e) {
        print('Background cashboxes fetch failed: \$e');
      }
    }
    // For simplicity, if offline, we might not be able to list new cashboxes.
    // Ideally we would cache these in a `cashboxes` SQLite table too,
    // but typically a POS belongs to 1 cashbox that it opens and closes.
    // For now we assume the POS has already opened a session earlier or relies on cached session details.
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
      } catch (e) {
        print('Background fetch failed: \$e');
      }
    }
    final db = await _dbService.database;
    final String where = cashboxId != null ? 'cashboxId = ?' : '';
    final List<dynamic> whereArgs = cashboxId != null ? [cashboxId] : [];

    final localData = where.isNotEmpty
        ? await db.query('cash_sessions', where: where, whereArgs: whereArgs)
        : await db.query('cash_sessions');

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
      } catch (e) {
        print('Background fetch failed: \$e');
      }
    }
    final db = await _dbService.database;
    final String where = sessionId != null ? 'sessionId = ?' : '';
    final List<dynamic> whereArgs = sessionId != null ? [sessionId] : [];

    final localData = where.isNotEmpty
        ? await db.query(
            'cash_transactions',
            where: where,
            whereArgs: whereArgs,
          )
        : await db.query('cash_transactions');

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
      where: 'id = ?',
      whereArgs: [sessionId],
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
      } catch (e) {
        print('Background session details fetch failed: \$e');
      }
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
      where: 'id = ?',
      whereArgs: [sessionId],
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
      where: 'id = ?',
      whereArgs: [sessionId],
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
    required String direction, // IN or OUT
    required String type, // MANUAL, SALE, REFUND...
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
      cashboxId: 'unknown', // typically derived server-side or from session
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
