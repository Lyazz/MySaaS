import 'dart:convert';

import '../models/sale.dart';
import '../services/api_service.dart';
import '../services/database_service.dart';
import '../services/sync_service.dart';
import '../services/tenant_mode_service.dart';

class SalesPage {
  final List<Sale> items;
  final int total;
  final int page;
  final int totalPages;
  final int limit;

  const SalesPage({
    required this.items,
    required this.total,
    required this.page,
    required this.totalPages,
    required this.limit,
  });
}

class SaleRepository {
  final ApiService _apiService;
  final DatabaseService _dbService = DatabaseService();
  final SyncService _syncService = SyncService();

  SaleRepository(this._apiService);

  String get _tid => TenantModeService().activeTenantId;

  Future<SalesPage> listSales({
    String? search,
    DateTime? startDate,
    DateTime? endDate,
    int page = 1,
    int limit = 25,
    bool forceRefresh = false,
  }) async {
    final resolvedPage = page < 1 ? 1 : page;
    final resolvedLimit = limit < 1 ? 25 : limit;

    if (forceRefresh || await _syncService.isOnline) {
      final query = <String, dynamic>{
        'page': resolvedPage,
        'limit': resolvedLimit,
        if (search != null && search.trim().isNotEmpty) 'search': search.trim(),
        if (startDate != null) 'startDate': startDate.toIso8601String(),
        if (endDate != null) 'endDate': endDate.toIso8601String(),
      };

      final res = await _apiService.client.get(
        '/admin/sales',
        queryParameters: query,
      );
      final data = res.data;

      final itemsRaw = (data is Map && data['items'] is List)
          ? (data['items'] as List)
          : (data is List ? data : const []);

      final items = itemsRaw
          .whereType<Map>()
          .map((e) => Sale.fromJson(e.cast<String, dynamic>()))
          .toList();

      final total = (data is Map && data['total'] is num)
          ? (data['total'] as num).toInt()
          : items.length;
      final pageOut = (data is Map && data['page'] is num)
          ? (data['page'] as num).toInt()
          : resolvedPage;
      final totalPages = (data is Map && data['totalPages'] is num)
          ? (data['totalPages'] as num).toInt()
          : 1;

      return SalesPage(
        items: items,
        total: total,
        page: pageOut,
        totalPages: totalPages < 1 ? 1 : totalPages,
        limit: resolvedLimit,
      );
    }

    final db = await _dbService.database;

    final customersRows = await db.query(
      'customers',
      where: 'tenantId = ?',
      whereArgs: [_tid],
    );
    final customerById = <String, Map<String, Object?>>{};
    for (final row in customersRows) {
      final id = row['id']?.toString();
      if (id != null && id.isNotEmpty) customerById[id] = row;
    }

    final rows = await db.query(
      'sales',
      where: 'tenantId = ?',
      whereArgs: [_tid],
      orderBy: 'createdAt DESC',
    );

    DateTime? tryParseDate(String? raw) {
      if (raw == null || raw.trim().isEmpty) return null;
      return DateTime.tryParse(raw);
    }

    final q = (search ?? '').trim().toLowerCase();
    final filtered = <Sale>[];

    for (final row in rows) {
      final createdAt = tryParseDate(row['createdAt']?.toString());
      if (startDate != null &&
          createdAt != null &&
          createdAt.isBefore(startDate)) {
        continue;
      }
      if (endDate != null && createdAt != null && createdAt.isAfter(endDate)) {
        continue;
      }

      final customerId = row['customerId']?.toString();
      final customerRow = (customerId != null)
          ? customerById[customerId]
          : null;
      final customerName = customerRow?['name']?.toString() ?? '';
      final customerPhone = customerRow?['phone']?.toString() ?? '';

      final sale = Sale.fromJson({
        'id': row['id'],
        'customerName': customerName,
        'customerPhone': customerPhone,
        'totalAmount': row['total'],
        'status': row['status'],
        'updatedAt': row['createdAt'],
        'type': 'POS',
      });

      if (q.isNotEmpty) {
        final blob = [
          sale.id.toLowerCase(),
          sale.customerName.toLowerCase(),
          sale.customerPhone.toLowerCase(),
        ].join(' ');
        if (!blob.contains(q)) continue;
      }

      filtered.add(sale);
    }

    final total = filtered.length;
    final totalPages = (total / resolvedLimit).ceil() > 0
        ? (total / resolvedLimit).ceil()
        : 1;
    final start = (resolvedPage - 1) * resolvedLimit;
    final end = (start + resolvedLimit) > total
        ? total
        : (start + resolvedLimit);
    final items = (start >= 0 && start < total)
        ? filtered.sublist(start, end)
        : <Sale>[];

    return SalesPage(
      items: items,
      total: total,
      page: resolvedPage,
      totalPages: totalPages,
      limit: resolvedLimit,
    );
  }

  Future<Map<String, dynamic>?> getLocalSalePayload(String saleId) async {
    final db = await _dbService.database;
    final res = await db.query(
      'sales',
      where: 'id = ? AND tenantId = ?',
      whereArgs: [saleId, _tid],
      limit: 1,
    );
    if (res.isEmpty) return null;
    final row = res.first;
    final payloadJson = row['payloadJson']?.toString();
    final payload = (payloadJson != null && payloadJson.trim().isNotEmpty)
        ? jsonDecode(payloadJson)
        : null;
    if (payload is! Map) return null;
    return payload.cast<String, dynamic>();
  }

  Future<void> refundSale({
    required String saleId,
    required String cashboxId,
    String method = 'CASH',
    String? reference,
    String? note,
    double? amount,
  }) async {
    await _apiService.client.patch(
      '/admin/sales/$saleId/status',
      data: {
        'status': 'REFUNDED',
        'refund': {
          'cashboxId': cashboxId,
          'method': method,
          if (reference != null && reference.trim().isNotEmpty)
            'reference': reference.trim(),
          if (note != null && note.trim().isNotEmpty) 'note': note.trim(),
          if (amount != null) 'amount': amount,
        },
      },
    );
  }
}
