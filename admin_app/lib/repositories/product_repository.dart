import 'dart:convert';
import 'package:sqflite_sqlcipher/sqflite.dart';

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

  Map<String, Object?> _toDbRow(Product p) {
    final optionsJson = p.options.map((o) => {
      'id': o.id, 'name': o.name, 'displayType': o.displayType,
      'position': o.position,
      'values': o.values.map((v) => {'id': v.id, 'label': v.label, 'position': v.position, 'meta': v.meta}).toList(),
    }).toList();
    final variantsJson = p.variants.map((v) => {
      'id': v.id, 'price': v.price, 'compareAtPrice': v.compareAtPrice,
      'cost': v.cost, 'stock': v.stock, 'sku': v.sku, 'skuLocked': v.skuLocked,
      'barcode': v.barcode, 'isActive': v.isActive, 'trackInventory': v.trackInventory,
      'safetyStock': v.safetyStock, 'reserved': v.reserved, 'images': v.images,
      'optionValues': v.optionValues.map((ov) => {
        'optionId': ov.optionId, 'optionValueId': ov.optionValueId,
        'option': ov.option != null ? {'id': ov.option!.id, 'name': ov.option!.name} : null,
        'optionValue': ov.optionValue != null ? {'id': ov.optionValue!.id, 'label': ov.optionValue!.label} : null,
      }).toList(),
    }).toList();
    return {
      'id': p.id, 'tenantId': _tid,
      'title': p.title, 'slug': p.slug,
      'miniDescription': p.miniDescription, 'description': p.description,
      'price': p.price, 'stock': p.stock,
      'lowStockThreshold': p.lowStockThreshold,
      'isActive': p.isActive ? 1 : 0,
      'categoryId': p.category?.id, 'mainImageUrl': p.mainImageUrl,
      'syncStatus': 'synced',
      'optionsJson': jsonEncode(optionsJson),
      'variantsJson': jsonEncode(variantsJson),
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
        final remoteProducts = remoteData.map((e) => Product.fromJson(e)).toList();
        await db.transaction((txn) async {
          await txn.delete(
            'products',
            where: "tenantId = ? AND syncStatus = 'synced'",
            whereArgs: [_tid],
          );
          for (var p in remoteProducts) {
            await txn.insert('products', _toDbRow(p), conflictAlgorithm: ConflictAlgorithm.replace);
          }
        });
        return remoteProducts;
      } catch (_) {}
    }
    return localProducts;
  }

  Future<Product?> getProductById(String id, {bool forceRefresh = false}) async {
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
        final response = await _apiService.client.get('/admin/products/$trimmed');
        final remote = Product.fromJson(response.data);
        await db.insert('products', _toDbRow(remote), conflictAlgorithm: ConflictAlgorithm.replace);
        return remote;
      } catch (_) {}
    }
    return local;
  }
}
