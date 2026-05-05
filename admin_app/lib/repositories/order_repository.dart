import 'dart:convert';
import 'package:sqflite_sqlcipher/sqflite.dart';

import '../models/order.dart';
import '../services/api_service.dart';
import '../services/database_service.dart';
import '../services/sync_service.dart';

class OrderRepository {
  final ApiService _apiService;
  final DatabaseService _dbService = DatabaseService();
  final SyncService _syncService = SyncService();

  OrderRepository(this._apiService);

  Future<({
    List<Order> items,
    int total,
    int page,
    int totalPages,
    int limit,
  })> getOrdersPage({
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

      // Update local cache (best-effort)
      try {
        final db = await _dbService.database;
        await db.transaction((txn) async {
          if (pageOut == 1) {
            await txn.delete('orders', where: "syncStatus = 'synced'");
          }
          for (var o in orders) {
            await txn.insert('orders', {
              'id': o.id,
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

    // Offline/local
    final db = await _dbService.database;
    final localData = await db.query('orders', orderBy: 'createdAt DESC');

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
            await txn.delete('orders', where: "syncStatus = 'synced'");
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
      } catch (e) {
        print('Background order fetch failed: \$e');
      }
    }
    return localOrders;
  }

  Future<Order?> getOrder(String id) async {
    if (await _syncService.isOnline) {
      try {
        final res = await _apiService.client.get('/admin/orders/$id');
        final o = Order.fromJson(res.data);

        final db = await _dbService.database;
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
        await db.insert('orders', {
          'id': o.id,
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
      } catch (e) {
        print('Background single order fetch failed: \$e');
      }
    }

    final db = await _dbService.database;
    final localData = await db.query(
      'orders',
      where: 'id = ?',
      whereArgs: [id],
    );
    if (localData.isNotEmpty) {
      final e = localData.first;
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
    }

    return null;
  }

  Future<void> updateStatus(String id, String status) async {
    final db = await _dbService.database;
    final online = await _syncService.isOnline;

    await db.update(
      'orders',
      {'status': status, 'syncStatus': online ? 'synced' : 'pending'},
      where: 'id = ?',
      whereArgs: [id],
    );

    await _syncService.enqueueOperation(
      entityType: 'order',
      action: 'updateStatus',
      payload: {'id': id, 'status': status},
    );
  }

  Future<Map<String, dynamic>> createOrder(Map<String, dynamic> payload) async {
    try {
      final res = await _apiService.client.post('/admin/orders', data: payload);
      final data = res.data;
      if (data is Map && data['orderId'] != null) {
        return Map<String, dynamic>.from(data);
      }
      throw Exception('createOrder: missing orderId in response');
    } catch (e) {
      print('Order creation failed: $e');
      rethrow;
    }
  }
}
