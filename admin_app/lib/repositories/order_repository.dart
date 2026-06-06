import 'dart:convert';

import 'package:sqflite_sqlcipher/sqflite.dart';
import 'package:uuid/uuid.dart';

import '../models/order.dart';
import '../services/api_service.dart';
import '../services/database_service.dart';
import '../services/sync_conflict_policy.dart';
import '../services/sync_service.dart';
import '../services/tenant_mode_service.dart';

class OrderRepository {
  final ApiService _apiService;
  final DatabaseService _dbService = DatabaseService();
  final SyncService _syncService = SyncService();

  OrderRepository(this._apiService);

  String get _tid => TenantModeService().activeTenantId;

  Future<({List<Order> items, int total, int page, int totalPages, int limit})>
  getOrdersPage({
    bool forceRefresh = false,
    String? search,
    String? status,
    DateTime? startDate,
    DateTime? endDate,
    int page = 1,
    int limit = 20,
  }) async {
    final resolvedPage = page < 1 ? 1 : page;
    final resolvedLimit = limit < 1 ? 20 : limit;

    if (forceRefresh || await _syncService.isOnline) {
      final query = <String, dynamic>{
        'page': resolvedPage,
        'limit': resolvedLimit,
        if (search != null && search.trim().isNotEmpty) 'search': search.trim(),
        if (status != null && status.trim().isNotEmpty) 'status': status.trim(),
        if (startDate != null) 'startDate': startDate.toIso8601String(),
        if (endDate != null) 'endDate': endDate.toIso8601String(),
      };

      final res = await _apiService.client.get(
        '/admin/orders',
        queryParameters: query,
      );
      final data = res.data;
      final itemsRaw = (data is Map && data['items'] is List)
          ? (data['items'] as List)
          : const [];
      final orders = itemsRaw
          .whereType<Map>()
          .map((e) => Order.fromJson(e.cast<String, dynamic>()))
          .toList();

      final total = (data is Map && data['total'] is num)
          ? (data['total'] as num).toInt()
          : orders.length;
      final pageOut = (data is Map && data['page'] is num)
          ? (data['page'] as num).toInt()
          : resolvedPage;
      final totalPages = (data is Map && data['totalPages'] is num)
          ? (data['totalPages'] as num).toInt()
          : 1;

      try {
        final db = await _dbService.database;
        await db.transaction((txn) async {
          if (pageOut == 1) {
            await txn.delete(
              'orders',
              where: "tenantId = ? AND syncStatus = 'synced'",
              whereArgs: [_tid],
            );
          }
          for (var o in orders) {
            await txn.insert('orders', {
              'id': o.id,
              'tenantId': _tid,
              'status': o.status,
              'total': o.totalAmount,
              'createdAt': o.createdAt.toIso8601String(),
              'customerName': o.customerName,
              'customerPhone': o.customerPhone,
              'shippingAddress': o.customerAddress,
              'itemsJson': jsonEncode([]),
              'syncStatus': 'synced',
            }, conflictAlgorithm: ConflictAlgorithm.replace);
          }
        });
      } catch (_) {}

      return (
        items: orders,
        total: total,
        page: pageOut,
        totalPages: totalPages < 1 ? 1 : totalPages,
        limit: resolvedLimit,
      );
    }

    final db = await _dbService.database;
    final localData = await db.query(
      'orders',
      where: 'tenantId = ?',
      whereArgs: [_tid],
      orderBy: 'createdAt DESC',
    );

    DateTime? tryParse(String? raw) {
      if (raw == null || raw.trim().isEmpty) return null;
      return DateTime.tryParse(raw);
    }

    final q = (search ?? '').trim().toLowerCase();
    final resolvedStatus = (status ?? '').trim();
    final filtered = <Order>[];

    for (final e in localData) {
      final createdAt = tryParse(e['createdAt']?.toString()) ?? DateTime.now();
      if (startDate != null && createdAt.isBefore(startDate)) continue;
      if (endDate != null && createdAt.isAfter(endDate)) continue;

      final o = Order.fromJson({
        'id': e['id'],
        'status': e['status'],
        'totalAmount': e['total'],
        'createdAt': e['createdAt'],
        'customerName': e['customerName'],
        'customerPhone': e['customerPhone'],
        'customerAddress': e['shippingAddress'],
        'items': [],
      });

      if (resolvedStatus.isNotEmpty && o.status != resolvedStatus) continue;

      if (q.isNotEmpty) {
        final blob = [
          o.id.toLowerCase(),
          o.customerName.toLowerCase(),
          o.customerPhone.toLowerCase(),
        ].join(' ');
        if (!blob.contains(q)) continue;
      }

      filtered.add(o);
    }

    final total = filtered.length;
    final totalPages = (total / resolvedLimit).ceil() > 0
        ? (total / resolvedLimit).ceil()
        : 1;
    final startIndex = (resolvedPage - 1) * resolvedLimit;
    final endIndex = (startIndex + resolvedLimit) > total
        ? total
        : (startIndex + resolvedLimit);
    final items = (startIndex >= 0 && startIndex < total)
        ? filtered.sublist(startIndex, endIndex)
        : <Order>[];

    return (
      items: items,
      total: total,
      page: resolvedPage,
      totalPages: totalPages,
      limit: resolvedLimit,
    );
  }

  Future<List<Order>> getOrders({
    bool forceRefresh = false,
    int page = 1,
    int limit = 20,
  }) async {
    final db = await _dbService.database;
    final localData = await db.query(
      'orders',
      where: 'tenantId = ?',
      whereArgs: [_tid],
      limit: limit,
      offset: (page - 1) * limit,
    );

    final localOrders = localData.map((e) {
      final itemsJson = e['itemsJson'] != null
          ? jsonDecode(e['itemsJson'].toString())
          : [];
      return Order.fromJson({
        'id': e['id'],
        'status': e['status'],
        'totalAmount': e['total'],
        'createdAt': e['createdAt'],
        'customerName': e['customerName'],
        'customerPhone': e['customerPhone'],
        'customerAddress': e['shippingAddress'],
        'items': itemsJson,
      });
    }).toList();

    if (forceRefresh || await _syncService.isOnline) {
      try {
        final res = await _apiService.client.get(
          '/admin/orders',
          queryParameters: {'page': page, 'limit': limit},
        );
        final List<dynamic> data = res.data['data'] ?? res.data;
        final remoteOrders = data.map((e) => Order.fromJson(e)).toList();

        await db.transaction((txn) async {
          if (page == 1) {
            await txn.delete(
              'orders',
              where: "tenantId = ? AND syncStatus = 'synced'",
              whereArgs: [_tid],
            );
          }
          for (var o in remoteOrders) {
            final itemsJsonList = o.items
                .map(
                  (i) => {
                    'id': i.id,
                    'productId': i.productId,
                    'quantity': i.quantity,
                    'price': i.price,
                  },
                )
                .toList();
            await txn.insert('orders', {
              'id': o.id,
              'tenantId': _tid,
              'status': o.status,
              'total': o.totalAmount,
              'createdAt': o.createdAt.toIso8601String(),
              'customerName': o.customerName,
              'customerPhone': o.customerPhone,
              'shippingAddress': o.customerAddress,
              'itemsJson': jsonEncode(itemsJsonList),
              'syncStatus': 'synced',
            }, conflictAlgorithm: ConflictAlgorithm.replace);
          }
        });
        return remoteOrders;
      } catch (_) {}
    }
    return localOrders;
  }

  Future<Order?> getOrder(String id) async {
    final resolvedId = await _resolveOrderId(id);
    try {
      final res = await _apiService.client.get('/admin/orders/$resolvedId');
      final o = Order.fromJson(res.data);

      final db = await _dbService.database;
      final itemsJsonList = o.items
          .map(
            (i) => {
              'id': i.id,
              'productId': i.productId,
              'quantity': i.quantity,
              'price': i.price,
              if (i.lineTotal != null) 'lineTotal': i.lineTotal,
              if (i.productTitle != null) 'productTitle': i.productTitle,
              if (i.variantLabel != null) 'variantLabel': i.variantLabel,
            },
          )
          .toList();
      await db.insert('orders', {
        'id': o.id,
        'tenantId': _tid,
        'status': o.status,
        'total': o.totalAmount,
        'createdAt': o.createdAt.toIso8601String(),
        'customerName': o.customerName,
        'customerPhone': o.customerPhone,
        'shippingAddress': o.customerAddress,
        'itemsJson': jsonEncode(itemsJsonList),
        'syncStatus': 'synced',
      }, conflictAlgorithm: ConflictAlgorithm.replace);

      return o;
    } catch (_) {}

    final db = await _dbService.database;
    final localData = await db.query(
      'orders',
      where: 'id = ? AND tenantId = ?',
      whereArgs: [resolvedId, _tid],
    );
    if (localData.isNotEmpty) {
      final e = localData.first;
      final itemsJson = e['itemsJson'] != null
          ? jsonDecode(e['itemsJson'].toString())
          : [];
      final localOrder = Order.fromJson({
        'id': e['id'],
        'status': e['status'],
        'totalAmount': e['total'],
        'createdAt': e['createdAt'],
        'customerName': e['customerName'],
        'customerPhone': e['customerPhone'],
        'customerAddress': e['shippingAddress'],
        'items': itemsJson,
      });
      return _withLocalPreviousOrders(db, localOrder);
    }

    return null;
  }

  Future<Order> _withLocalPreviousOrders(Database db, Order order) async {
    final normalizedPhone = _normalizeAlgerianPhone(
      order.customerPhoneNormalized ?? order.customerPhone,
    );
    if (normalizedPhone == null) {
      return order.copyWith(
        previousOrders: const [],
        previousOrdersMatch: const PreviousOrdersMatch(type: 'none'),
      );
    }

    final rows = await db.query(
      'orders',
      where: 'tenantId = ? AND id != ?',
      whereArgs: [_tid, order.id],
      orderBy: 'createdAt DESC',
    );

    final previousOrders = <Order>[];
    for (final row in rows) {
      final phone = row['customerPhone']?.toString() ?? '';
      if (_normalizeAlgerianPhone(phone) != normalizedPhone) continue;
      final itemsJson = row['itemsJson'] != null
          ? jsonDecode(row['itemsJson'].toString())
          : [];
      previousOrders.add(
        Order.fromJson({
          'id': row['id'],
          'status': row['status'],
          'totalAmount': row['total'],
          'createdAt': row['createdAt'],
          'customerName': row['customerName'],
          'customerPhone': row['customerPhone'],
          'customerPhoneNormalized': normalizedPhone,
          'customerAddress': row['shippingAddress'],
          'items': itemsJson,
        }),
      );
    }

    return order.copyWith(
      previousOrders: previousOrders,
      previousOrdersMatch: PreviousOrdersMatch(
        type: 'phone',
        phoneNormalized: normalizedPhone,
      ),
    );
  }

  String? _normalizeAlgerianPhone(String? value) {
    final digits = (value ?? '').replaceAll(RegExp(r'\D'), '');
    if (RegExp(r'^0[567]\d{8}$').hasMatch(digits)) {
      return '213${digits.substring(1)}';
    }
    if (RegExp(r'^[567]\d{8}$').hasMatch(digits)) {
      return '213$digits';
    }
    if (RegExp(r'^213[567]\d{8}$').hasMatch(digits)) {
      return digits;
    }
    if (RegExp(r'^00213[567]\d{8}$').hasMatch(digits)) {
      return digits.substring(2);
    }
    return null;
  }

  Future<void> updateCallStatus(String id, String status) async {
    final resolvedId = await _resolveOrderId(id);

    if (await _syncService.isOnline) {
      try {
        await _apiService.client.patch(
          '/admin/orders/$resolvedId',
          data: {'callStatus': status},
        );
      } catch (_) {}
    }

    await _syncService.enqueueOperation(
      entityType: 'order',
      action: 'updateCallStatus',
      payload: {'id': resolvedId, 'callStatus': status},
    );
  }

  Future<void> updateInternalNotes(String id, String notes) async {
    final resolvedId = await _resolveOrderId(id);

    if (await _syncService.isOnline) {
      try {
        await _apiService.client.patch(
          '/admin/orders/$resolvedId',
          data: {'internalNotes': notes},
        );
      } catch (_) {}
    }

    await _syncService.enqueueOperation(
      entityType: 'order',
      action: 'updateInternalNotes',
      payload: {'id': resolvedId, 'internalNotes': notes},
    );
  }

  Future<void> updateStatus(String id, String status) async {
    final db = await _dbService.database;
    final resolvedId = await _resolveOrderId(id);
    final currentRows = await db.query(
      'orders',
      columns: ['status'],
      where: 'id = ? AND tenantId = ?',
      whereArgs: [resolvedId, _tid],
      limit: 1,
    );
    final currentStatus = currentRows.isEmpty
        ? 'PENDING'
        : currentRows.first['status']?.toString() ?? 'PENDING';

    await db.update(
      'orders',
      {'status': status, 'syncStatus': SyncStatus.pending.name},
      where: 'id = ? AND tenantId = ?',
      whereArgs: [resolvedId, _tid],
    );

    await _syncService.enqueueOperation(
      entityType: 'order',
      action: 'updateStatus',
      payload: {
        'id': resolvedId,
        'status': status,
        'baseFingerprint': SyncConflictPolicies.fingerprintOrderStatus(
          currentStatus,
        ),
      },
    );
  }

  Future<Map<String, dynamic>> createOrder(Map<String, dynamic> payload) async {
    final db = await _dbService.database;
    final offlineId = const Uuid().v4();
    final items = _normalizeItems(payload['items']);
    final total = items.fold<double>(
      0,
      (sum, item) =>
          sum +
          (double.tryParse(item['price']?.toString() ?? '0') ?? 0) *
              (int.tryParse(item['quantity']?.toString() ?? '0') ?? 0),
    );

    await db.insert('orders', {
      'id': offlineId,
      'tenantId': _tid,
      'status': 'PENDING',
      'total': total,
      'createdAt': DateTime.now().toIso8601String(),
      'customerName': payload['customerName']?.toString() ?? '',
      'customerPhone': payload['customerPhone']?.toString() ?? '',
      'shippingAddress':
          payload['shippingAddressLine1']?.toString() ??
          payload['customerAddress']?.toString() ??
          '',
      'itemsJson': jsonEncode(items),
      'syncStatus': SyncStatus.pending.name,
    }, conflictAlgorithm: ConflictAlgorithm.replace);

    await _syncService.enqueueOperation(
      entityType: 'order',
      action: 'create',
      payload: {...payload, 'offlineId': offlineId, 'items': items},
    );

    return {'success': true, 'orderId': offlineId, 'offline': true};
  }

  Future<String> _resolveOrderId(String id) async {
    final trimmed = id.trim();
    if (trimmed.isEmpty) return trimmed;
    final db = await _dbService.database;
    final aliasRows = await db.query(
      'entity_aliases',
      columns: ['remoteId'],
      where: 'tenantId = ? AND entityType = ? AND localId = ?',
      whereArgs: [_tid, 'order', trimmed],
      limit: 1,
    );
    if (aliasRows.isEmpty) return trimmed;
    return aliasRows.first['remoteId']?.toString() ?? trimmed;
  }

  List<Map<String, dynamic>> _normalizeItems(dynamic rawItems) {
    if (rawItems is! List) return const [];
    return rawItems.whereType<Map>().map((item) {
      final map = Map<String, dynamic>.from(item);
      return {
        'productId': map['productId'],
        'variantId': map['variantId'],
        'quantity': map['quantity'],
        'price': map['price'],
      };
    }).toList();
  }
}
