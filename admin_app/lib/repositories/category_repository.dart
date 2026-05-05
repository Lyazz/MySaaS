import 'package:sqflite_sqlcipher/sqflite.dart';

import '../models/product.dart';
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

  Future<List<Category>> getCategories() async {
    final db = await _dbService.database;
    final localData = await db.query(
      'categories',
      where: 'tenantId = ?',
      whereArgs: [_tid],
    );
    final localCategories = localData.map((e) => Category.fromJson({
      'id': e['id'], 'title': e['title'], 'slug': e['slug'],
      'imageUrl': e['imageUrl'], 'createdAt': e['createdAt'],
      '_count': {'products': e['productCount']},
    })).toList();

    if (await _syncService.isOnline) {
      try {
        final response = await _apiService.client.get('/admin/categories');
        final List<dynamic> remoteData = response.data;
        final remoteCategories = remoteData.map((e) => Category.fromJson(e)).toList();
        await db.transaction((txn) async {
          await txn.delete('categories', where: 'tenantId = ?', whereArgs: [_tid]);
          for (var c in remoteCategories) {
            await txn.insert('categories', {
              'id': c.id, 'tenantId': _tid,
              'title': c.title, 'slug': c.slug,
              'imageUrl': c.imageUrl,
              'productCount': c.productCount,
              'createdAt': c.createdAt?.toIso8601String(),
            }, conflictAlgorithm: ConflictAlgorithm.replace);
          }
        });
        return remoteCategories;
      } catch (_) {}
    }
    return localCategories;
  }
}
