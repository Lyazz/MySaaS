import 'package:sqflite_sqlcipher/sqflite.dart';
import 'package:uuid/uuid.dart';

import '../models/product.dart';
import 'license_guard.dart';
import '../services/api_service.dart';
import '../services/database_service.dart';
import '../services/sync_service.dart';
import '../services/tenant_mode_service.dart';

class CategoryRepository {
  final ApiService _apiService;
  final DatabaseService _dbService = DatabaseService();
  final SyncService _syncService = SyncService();

  CategoryRepository(this._apiService);

  String get _tid => TenantModeService().activeTenantId;

  Category _fromRow(Map<String, Object?> e) => Category.fromJson({
    'id': e['id'],
    'title': e['title'],
    'slug': e['slug'],
    'imageUrl': e['imageUrl'],
    'createdAt': e['createdAt'],
    '_count': {'products': e['productCount']},
  });

  Future<List<Category>> getCategories() async {
    final db = await _dbService.database;
    final localData = await db.query(
      'categories',
      where: 'tenantId = ?',
      whereArgs: [_tid],
    );
    final localCategories = localData.map(_fromRow).toList();

    if (await _syncService.isOnline) {
      try {
        final response = await _apiService.client.get('/admin/categories');
        final List<dynamic> remoteData = response.data;
        final remoteCategories = remoteData
            .map((e) => Category.fromJson(e))
            .toList();
        await db.transaction((txn) async {
          await txn.delete(
            'categories',
            where: "tenantId = ? AND syncStatus = 'synced'",
            whereArgs: [_tid],
          );
          for (var c in remoteCategories) {
            await txn.insert('categories', {
              'id': c.id,
              'tenantId': _tid,
              'title': c.title,
              'slug': c.slug,
              'imageUrl': c.imageUrl,
              'productCount': c.productCount,
              'createdAt': c.createdAt?.toIso8601String(),
              'syncStatus': 'synced',
            }, conflictAlgorithm: ConflictAlgorithm.replace);
          }
        });
        return remoteCategories;
      } catch (_) {}
    }
    return localCategories;
  }

  Future<Category> createCategory({
    required String title,
    required String slug,
    String? imageUrl,
  }) async {
    LicenseWritePolicy.ensureAllowed(const WriteIntent('category', 'create'));
    final id = const Uuid().v4();
    final db = await _dbService.database;
    final payload = {
      'id': id,
      'title': title,
      'slug': slug,
      'imageUrl': imageUrl,
    };

    await db.insert('categories', {
      'id': id,
      'tenantId': _tid,
      'title': title,
      'slug': slug,
      'imageUrl': imageUrl,
      'productCount': 0,
      'createdAt': DateTime.now().toIso8601String(),
      'syncStatus': 'pending',
    }, conflictAlgorithm: ConflictAlgorithm.replace);
    await _syncService.enqueueOperation(
      entityType: 'category',
      action: 'create',
      payload: payload,
    );

    final rows = await db.query(
      'categories',
      where: 'id = ? AND tenantId = ?',
      whereArgs: [id, _tid],
      limit: 1,
    );
    return _fromRow(rows.first);
  }

  Future<Category> updateCategory({
    required String id,
    required String title,
    required String slug,
    String? imageUrl,
  }) async {
    LicenseWritePolicy.ensureAllowed(const WriteIntent('category', 'update'));
    final trimmed = id.trim();
    if (trimmed.isEmpty) throw ArgumentError('Category ID is required');
    final db = await _dbService.database;

    await db.update(
      'categories',
      {
        'title': title,
        'slug': slug,
        'imageUrl': imageUrl,
        'syncStatus': 'pending',
      },
      where: 'id = ? AND tenantId = ?',
      whereArgs: [trimmed, _tid],
    );
    await _syncService.enqueueOperation(
      entityType: 'category',
      action: 'update',
      payload: {
        'id': trimmed,
        'title': title,
        'slug': slug,
        'imageUrl': imageUrl,
      },
    );

    final rows = await db.query(
      'categories',
      where: 'id = ? AND tenantId = ?',
      whereArgs: [trimmed, _tid],
      limit: 1,
    );
    if (rows.isEmpty) throw Exception('Category not found');
    return _fromRow(rows.first);
  }

  Future<void> deleteCategory(String id) async {
    LicenseWritePolicy.ensureAllowed(const WriteIntent('category', 'delete'));
    final trimmed = id.trim();
    if (trimmed.isEmpty) throw ArgumentError('Category ID is required');
    final db = await _dbService.database;
    await db.update(
      'categories',
      {'syncStatus': SyncStatus.pending.name},
      where: 'id = ? AND tenantId = ?',
      whereArgs: [trimmed, _tid],
    );
    await _syncService.enqueueOperation(
      entityType: 'category',
      action: 'delete',
      payload: {'id': trimmed},
    );
  }
}
