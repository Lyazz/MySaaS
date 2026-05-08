import 'dart:convert';

import 'package:sqflite_sqlcipher/sqflite.dart';
import 'package:uuid/uuid.dart';

import '../models/product.dart';
import '../services/api_service.dart';
import '../services/database_service.dart';
import '../services/sync_service.dart';
import '../services/tenant_mode_service.dart';

class ProductRepository {
  final ApiService _apiService;
  final DatabaseService _dbService = DatabaseService();
  final SyncService _syncService = SyncService();

  ProductRepository(this._apiService);

  String get _tid => TenantModeService().activeTenantId;

  Product _fromDbRow(Map<String, Object?> row) {
    final optionsList = row['optionsJson'] != null
        ? jsonDecode(row['optionsJson'].toString())
        : [];
    final variantsList = row['variantsJson'] != null
        ? jsonDecode(row['variantsJson'].toString())
        : [];
    return Product.fromJson({
      'id': row['id'],
      'title': row['title'],
      'slug': row['slug'],
      'miniDescription': row['miniDescription'],
      'description': row['description'],
      'price': row['price'],
      'stock': row['stock'],
      'lowStockThreshold': row['lowStockThreshold'],
      'isActive': row['isActive'] == 1,
      'categoryId': row['categoryId'],
      'images': row['mainImageUrl'] != null ? [row['mainImageUrl']] : [],
      'options': optionsList,
      'variants': variantsList,
    });
  }

  Map<String, Object?> _toDbRow(Product p, {String syncStatus = 'synced'}) {
    final optionsJson = p.options
        .map(
          (o) => {
            'id': o.id,
            'name': o.name,
            'displayType': o.displayType,
            'position': o.position,
            'values': o.values
                .map(
                  (v) => {
                    'id': v.id,
                    'label': v.label,
                    'position': v.position,
                    'meta': v.meta,
                  },
                )
                .toList(),
          },
        )
        .toList();
    final variantsJson = p.variants
        .map(
          (v) => {
            'id': v.id,
            'price': v.price,
            'compareAtPrice': v.compareAtPrice,
            'cost': v.cost,
            'stock': v.stock,
            'sku': v.sku,
            'skuLocked': v.skuLocked,
            'barcode': v.barcode,
            'isActive': v.isActive,
            'trackInventory': v.trackInventory,
            'safetyStock': v.safetyStock,
            'reserved': v.reserved,
            'images': v.images,
            'optionValues': v.optionValues
                .map(
                  (ov) => {
                    'optionId': ov.optionId,
                    'optionValueId': ov.optionValueId,
                    'option': ov.option != null
                        ? {'id': ov.option!.id, 'name': ov.option!.name}
                        : null,
                    'optionValue': ov.optionValue != null
                        ? {
                            'id': ov.optionValue!.id,
                            'label': ov.optionValue!.label,
                          }
                        : null,
                  },
                )
                .toList(),
          },
        )
        .toList();
    return {
      'id': p.id,
      'tenantId': _tid,
      'title': p.title,
      'slug': p.slug,
      'miniDescription': p.miniDescription,
      'description': p.description,
      'price': p.price,
      'stock': p.stock,
      'lowStockThreshold': p.lowStockThreshold,
      'isActive': p.isActive ? 1 : 0,
      'categoryId': p.categoryId ?? p.category?.id,
      'mainImageUrl': p.mainImageUrl,
      'syncStatus': syncStatus,
      'optionsJson': jsonEncode(optionsJson),
      'variantsJson': jsonEncode(variantsJson),
    };
  }

  Map<String, Object?> _rowFromPayload(
    String id,
    Map<String, dynamic> data, {
    required String syncStatus,
  }) {
    final images = data['images'] is List ? data['images'] as List : const [];
    return {
      'id': id,
      'tenantId': _tid,
      'title': data['title']?.toString() ?? '',
      'slug': data['slug']?.toString() ?? '',
      'miniDescription': data['miniDescription']?.toString(),
      'description': data['description']?.toString(),
      'price': _double(data['price']),
      'stock': _int(data['stock']),
      'lowStockThreshold': _int(data['lowStockThreshold'], fallback: 5),
      'isActive': data['isActive'] == false ? 0 : 1,
      'categoryId': data['categoryId']?.toString(),
      'mainImageUrl': images.isNotEmpty ? images.first.toString() : null,
      'syncStatus': syncStatus,
      'optionsJson': jsonEncode(data['options'] is List ? data['options'] : []),
      'variantsJson': jsonEncode(
        data['variants'] is List ? data['variants'] : [],
      ),
    };
  }

  Future<List<Product>> getProducts({bool forceRefresh = false}) async {
    final db = await _dbService.database;
    final localData = await db.query(
      'products',
      where: 'tenantId = ?',
      whereArgs: [_tid],
    );
    final localProducts = localData.map(_fromDbRow).toList();

    if (forceRefresh || await _syncService.isOnline) {
      try {
        final response = await _apiService.client.get('/admin/products');
        final List<dynamic> remoteData = response.data;
        final remoteProducts = remoteData
            .map((e) => Product.fromJson(e))
            .toList();
        await db.transaction((txn) async {
          await txn.delete(
            'products',
            where: "tenantId = ? AND syncStatus = 'synced'",
            whereArgs: [_tid],
          );
          for (var p in remoteProducts) {
            await txn.insert(
              'products',
              _toDbRow(p),
              conflictAlgorithm: ConflictAlgorithm.replace,
            );
          }
        });
        return remoteProducts;
      } catch (_) {}
    }
    return localProducts;
  }

  Future<Product?> getProductById(
    String id, {
    bool forceRefresh = false,
  }) async {
    final trimmed = id.trim();
    if (trimmed.isEmpty) return null;

    final db = await _dbService.database;
    final localData = await db.query(
      'products',
      where: 'id = ? AND tenantId = ?',
      whereArgs: [trimmed, _tid],
      limit: 1,
    );
    Product? local = localData.isNotEmpty ? _fromDbRow(localData.first) : null;

    if (forceRefresh || await _syncService.isOnline) {
      try {
        final response = await _apiService.client.get(
          '/admin/products/$trimmed',
        );
        final remote = Product.fromJson(response.data);
        await db.insert(
          'products',
          _toDbRow(remote),
          conflictAlgorithm: ConflictAlgorithm.replace,
        );
        return remote;
      } catch (_) {}
    }
    return local;
  }

  Future<Product> createProduct(Map<String, dynamic> data) async {
    final id = (data['id']?.toString().trim().isNotEmpty == true)
        ? data['id'].toString().trim()
        : const Uuid().v4();
    final payload = Map<String, dynamic>.from(data)..['id'] = id;
    final db = await _dbService.database;

    await db.insert(
      'products',
      _rowFromPayload(id, payload, syncStatus: 'pending'),
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
    await _syncService.enqueueOperation(
      entityType: 'product',
      action: 'create',
      payload: payload,
    );

    final rows = await db.query(
      'products',
      where: 'id = ? AND tenantId = ?',
      whereArgs: [id, _tid],
      limit: 1,
    );
    return _fromDbRow(rows.first);
  }

  Future<Product> updateProduct(String id, Map<String, dynamic> data) async {
    final trimmed = id.trim();
    if (trimmed.isEmpty) throw ArgumentError('Product ID is required');
    final db = await _dbService.database;
    final existing = await db.query(
      'products',
      where: 'id = ? AND tenantId = ?',
      whereArgs: [trimmed, _tid],
      limit: 1,
    );
    if (existing.isEmpty) throw Exception('Product not found');

    final update = <String, Object?>{'syncStatus': 'pending'};
    if (data.containsKey('title')) update['title'] = data['title']?.toString();
    if (data.containsKey('slug')) update['slug'] = data['slug']?.toString();
    if (data.containsKey('miniDescription')) {
      update['miniDescription'] = data['miniDescription']?.toString();
    }
    if (data.containsKey('description')) {
      update['description'] = data['description']?.toString();
    }
    if (data.containsKey('price')) update['price'] = _double(data['price']);
    if (data.containsKey('stock')) update['stock'] = _int(data['stock']);
    if (data.containsKey('lowStockThreshold')) {
      update['lowStockThreshold'] = _int(
        data['lowStockThreshold'],
        fallback: 5,
      );
    }
    if (data.containsKey('isActive')) {
      update['isActive'] = data['isActive'] == false ? 0 : 1;
    }
    if (data.containsKey('categoryId')) {
      update['categoryId'] = data['categoryId']?.toString();
    }
    if (data['images'] is List) {
      final images = data['images'] as List;
      update['mainImageUrl'] = images.isNotEmpty
          ? images.first.toString()
          : null;
    }

    await db.update(
      'products',
      update,
      where: 'id = ? AND tenantId = ?',
      whereArgs: [trimmed, _tid],
    );
    final payload = Map<String, dynamic>.from(data)..['id'] = trimmed;
    await _syncService.enqueueOperation(
      entityType: 'product',
      action: 'update',
      payload: payload,
    );

    final rows = await db.query(
      'products',
      where: 'id = ? AND tenantId = ?',
      whereArgs: [trimmed, _tid],
      limit: 1,
    );
    return _fromDbRow(rows.first);
  }

  Future<void> deleteProduct(String id) async {
    final trimmed = id.trim();
    if (trimmed.isEmpty) throw ArgumentError('Product ID is required');
    final db = await _dbService.database;
    await db.delete(
      'products',
      where: 'id = ? AND tenantId = ?',
      whereArgs: [trimmed, _tid],
    );
    await _syncService.enqueueOperation(
      entityType: 'product',
      action: 'delete',
      payload: {'id': trimmed},
    );
  }

  int _int(dynamic value, {int fallback = 0}) {
    if (value is int) return value;
    if (value is num) return value.toInt();
    return int.tryParse(value?.toString() ?? '') ?? fallback;
  }

  double _double(dynamic value) {
    if (value is num) return value.toDouble();
    return double.tryParse(value?.toString() ?? '') ?? 0;
  }
}
