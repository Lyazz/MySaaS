import 'dart:convert';

Map<String, dynamic> _asStringMap(dynamic value) {
  if (value is Map<String, dynamic>) return value;
  if (value is Map) {
    return value.map((key, entryValue) => MapEntry(key.toString(), entryValue));
  }
  if (value is String) {
    final trimmed = value.trim();
    if (trimmed.isEmpty) return const {};
    try {
      return _asStringMap(jsonDecode(trimmed));
    } catch (_) {
      return const {};
    }
  }
  return const {};
}

List<dynamic> _asList(dynamic value) {
  if (value is List) return value;
  if (value is String) {
    final trimmed = value.trim();
    if (trimmed.isEmpty) return const [];
    try {
      return _asList(jsonDecode(trimmed));
    } catch (_) {
      return const [];
    }
  }
  return const [];
}

class AdminDashboardCounts {
  final int products;
  final int categories;
  final int orders;

  const AdminDashboardCounts({
    required this.products,
    required this.categories,
    required this.orders,
  });

  factory AdminDashboardCounts.fromJson(Map<String, dynamic> json) {
    int asInt(dynamic value) => int.tryParse(value?.toString() ?? '') ?? 0;
    return AdminDashboardCounts(
      products: asInt(json['products']),
      categories: asInt(json['categories']),
      orders: asInt(json['orders']),
    );
  }

  static const empty = AdminDashboardCounts(
    products: 0,
    categories: 0,
    orders: 0,
  );
}

class AdminDashboardLast7d {
  final int orders;
  final double revenue;

  const AdminDashboardLast7d({required this.orders, required this.revenue});

  factory AdminDashboardLast7d.fromJson(Map<String, dynamic> json) {
    int asInt(dynamic value) => int.tryParse(value?.toString() ?? '') ?? 0;
    double asDouble(dynamic value) =>
        double.tryParse(value?.toString() ?? '') ?? 0.0;

    return AdminDashboardLast7d(
      orders: asInt(json['orders']),
      revenue: asDouble(json['revenue']),
    );
  }

  static const empty = AdminDashboardLast7d(orders: 0, revenue: 0);
}

class AdminDashboardInventory {
  final int lowStockProducts;
  final int outOfStockProducts;

  const AdminDashboardInventory({
    required this.lowStockProducts,
    required this.outOfStockProducts,
  });

  factory AdminDashboardInventory.fromJson(Map<String, dynamic> json) {
    int asInt(dynamic value) => int.tryParse(value?.toString() ?? '') ?? 0;
    return AdminDashboardInventory(
      lowStockProducts: asInt(json['lowStockProducts']),
      outOfStockProducts: asInt(json['outOfStockProducts']),
    );
  }

  static const empty = AdminDashboardInventory(
    lowStockProducts: 0,
    outOfStockProducts: 0,
  );
}

class AdminDashboardRecentOrder {
  final String id;
  final String status;
  final double totalAmount;
  final String customerName;
  final String customerPhone;
  final DateTime createdAt;

  const AdminDashboardRecentOrder({
    required this.id,
    required this.status,
    required this.totalAmount,
    required this.customerName,
    required this.customerPhone,
    required this.createdAt,
  });

  factory AdminDashboardRecentOrder.fromJson(Map<String, dynamic> json) {
    DateTime parseDate(dynamic value) {
      final raw = value?.toString();
      if (raw == null || raw.isEmpty) return DateTime.now();
      return DateTime.tryParse(raw) ?? DateTime.now();
    }

    return AdminDashboardRecentOrder(
      id: json['id']?.toString() ?? '',
      status: json['status']?.toString() ?? '',
      totalAmount:
          double.tryParse(json['totalAmount']?.toString() ?? '') ?? 0.0,
      customerName: json['customerName']?.toString() ?? '',
      customerPhone: json['customerPhone']?.toString() ?? '',
      createdAt: parseDate(json['createdAt']),
    );
  }
}

class AdminDashboardData {
  final AdminDashboardCounts counts;
  final AdminDashboardLast7d last7d;
  final AdminDashboardInventory inventory;
  final Map<String, int> ordersByStatus;
  final List<AdminDashboardRecentOrder> recentOrders;

  const AdminDashboardData({
    required this.counts,
    required this.last7d,
    required this.inventory,
    required this.ordersByStatus,
    required this.recentOrders,
  });

  factory AdminDashboardData.fromJson(Map<String, dynamic> json) {
    final countsRaw = _asStringMap(json['counts']);
    final last7dRaw = _asStringMap(json['last7d']);
    final inventoryRaw = _asStringMap(json['inventory']);

    final ordersByStatusRaw = _asStringMap(json['ordersByStatus']);
    final ordersByStatus = <String, int>{};
    for (final entry in ordersByStatusRaw.entries) {
      final key = entry.key.toString();
      final value = int.tryParse(entry.value?.toString() ?? '') ?? 0;
      ordersByStatus[key] = value;
    }

    final recentOrders = _asList(json['recentOrders'])
        .whereType<Map>()
        .map((e) => AdminDashboardRecentOrder.fromJson(_asStringMap(e)))
        .toList();

    return AdminDashboardData(
      counts: AdminDashboardCounts.fromJson(countsRaw),
      last7d: AdminDashboardLast7d.fromJson(last7dRaw),
      inventory: AdminDashboardInventory.fromJson(inventoryRaw),
      ordersByStatus: ordersByStatus,
      recentOrders: recentOrders,
    );
  }

  static const empty = AdminDashboardData(
    counts: AdminDashboardCounts.empty,
    last7d: AdminDashboardLast7d.empty,
    inventory: AdminDashboardInventory.empty,
    ordersByStatus: {},
    recentOrders: [],
  );
}
