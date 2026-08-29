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

class AdminDashboardRevenue {
  final double total;
  final double orders;
  final double pos;

  const AdminDashboardRevenue({
    required this.total,
    required this.orders,
    required this.pos,
  });

  factory AdminDashboardRevenue.fromJson(Map<String, dynamic> json) {
    double asDouble(dynamic value) =>
        double.tryParse(value?.toString() ?? '') ?? 0.0;
    return AdminDashboardRevenue(
      total: asDouble(json['total']),
      orders: asDouble(json['orders']),
      pos: asDouble(json['pos']),
    );
  }

  static const empty = AdminDashboardRevenue(total: 0, orders: 0, pos: 0);
}

class AdminDashboardTrend {
  final String date;
  final int ordersCount;
  final double ordersRevenue;
  final double posRevenue;
  final double totalRevenue;

  const AdminDashboardTrend({
    required this.date,
    required this.ordersCount,
    required this.ordersRevenue,
    required this.posRevenue,
    required this.totalRevenue,
  });

  factory AdminDashboardTrend.fromJson(Map<String, dynamic> json) {
    return AdminDashboardTrend(
      date: json['date']?.toString() ?? '',
      ordersCount: int.tryParse(json['ordersCount']?.toString() ?? '') ?? 0,
      ordersRevenue:
          double.tryParse(json['ordersRevenue']?.toString() ?? '') ?? 0.0,
      posRevenue: double.tryParse(json['posRevenue']?.toString() ?? '') ?? 0.0,
      totalRevenue:
          double.tryParse(json['totalRevenue']?.toString() ?? '') ?? 0.0,
    );
  }
}

class AdminDashboardTopProduct {
  final String productId;
  final String title;
  final int quantity;
  final double revenue;

  const AdminDashboardTopProduct({
    required this.productId,
    required this.title,
    required this.quantity,
    required this.revenue,
  });

  factory AdminDashboardTopProduct.fromJson(Map<String, dynamic> json) {
    return AdminDashboardTopProduct(
      productId: json['productId']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      quantity: int.tryParse(json['quantity']?.toString() ?? '') ?? 0,
      revenue: double.tryParse(json['revenue']?.toString() ?? '') ?? 0.0,
    );
  }
}

class AdminDashboardTopCategory {
  final String categoryId;
  final String title;
  final int quantity;
  final double revenue;

  const AdminDashboardTopCategory({
    required this.categoryId,
    required this.title,
    required this.quantity,
    required this.revenue,
  });

  factory AdminDashboardTopCategory.fromJson(Map<String, dynamic> json) {
    return AdminDashboardTopCategory(
      categoryId: json['categoryId']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      quantity: int.tryParse(json['quantity']?.toString() ?? '') ?? 0,
      revenue: double.tryParse(json['revenue']?.toString() ?? '') ?? 0.0,
    );
  }
}

class AdminDashboardCriticalStock {
  final String productId;
  final String title;
  final int stock;
  final int lowStockThreshold;

  const AdminDashboardCriticalStock({
    required this.productId,
    required this.title,
    required this.stock,
    required this.lowStockThreshold,
  });

  factory AdminDashboardCriticalStock.fromJson(Map<String, dynamic> json) {
    return AdminDashboardCriticalStock(
      productId: json['productId']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      stock: int.tryParse(json['stock']?.toString() ?? '') ?? 0,
      lowStockThreshold:
          int.tryParse(json['lowStockThreshold']?.toString() ?? '') ?? 0,
    );
  }
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
  final AdminDashboardRevenue revenue;
  final Map<String, int> ordersByStatus;
  final List<AdminDashboardRecentOrder> recentOrders;
  final List<AdminDashboardTrend> trends;
  final List<AdminDashboardTopProduct> topProducts;
  final List<AdminDashboardTopCategory> topCategories;
  final List<AdminDashboardCriticalStock> criticalStock;

  const AdminDashboardData({
    required this.counts,
    required this.last7d,
    required this.inventory,
    required this.revenue,
    required this.ordersByStatus,
    required this.recentOrders,
    required this.trends,
    required this.topProducts,
    required this.topCategories,
    required this.criticalStock,
  });

  factory AdminDashboardData.fromJson(Map<String, dynamic> json) {
    final countsRaw = _asStringMap(json['counts']);
    final last7dRaw = _asStringMap(json['last7d']);
    final inventoryRaw = _asStringMap(json['inventory']);
    final revenueRaw = _asStringMap(json['revenue']);

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

    final trends = _asList(json['trends'])
        .whereType<Map>()
        .map((e) => AdminDashboardTrend.fromJson(_asStringMap(e)))
        .toList();

    final topProducts = _asList(json['topProducts'])
        .whereType<Map>()
        .map((e) => AdminDashboardTopProduct.fromJson(_asStringMap(e)))
        .toList();

    final topCategories = _asList(json['topCategories'])
        .whereType<Map>()
        .map((e) => AdminDashboardTopCategory.fromJson(_asStringMap(e)))
        .toList();

    final criticalStock = _asList(json['criticalStock'])
        .whereType<Map>()
        .map((e) => AdminDashboardCriticalStock.fromJson(_asStringMap(e)))
        .toList();

    return AdminDashboardData(
      counts: AdminDashboardCounts.fromJson(countsRaw),
      last7d: AdminDashboardLast7d.fromJson(last7dRaw),
      inventory: AdminDashboardInventory.fromJson(inventoryRaw),
      revenue: AdminDashboardRevenue.fromJson(revenueRaw),
      ordersByStatus: ordersByStatus,
      recentOrders: recentOrders,
      trends: trends,
      topProducts: topProducts,
      topCategories: topCategories,
      criticalStock: criticalStock,
    );
  }

  static const empty = AdminDashboardData(
    counts: AdminDashboardCounts.empty,
    last7d: AdminDashboardLast7d.empty,
    inventory: AdminDashboardInventory.empty,
    revenue: AdminDashboardRevenue.empty,
    ordersByStatus: {},
    recentOrders: [],
    trends: [],
    topProducts: [],
    topCategories: [],
    criticalStock: [],
  );
}
