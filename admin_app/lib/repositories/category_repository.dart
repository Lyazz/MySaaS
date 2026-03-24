import 'package:sqflite_sqlcipher/sqflite.dart';

import '../models/product.dart'; // Contains Category
import '../services/api_service.dart';
import '../services/database_service.dart';
import '../services/sync_service.dart';

class CategoryRepository {
  final ApiService _apiService;
  final DatabaseService _dbService = DatabaseService();
  final SyncService _syncService = SyncService();

  CategoryRepository(this._apiService);

  Future<List<Category>> getCategories() async {
    final db = await _dbService.database;

    // 1. Fetch Local
    final localData = await db.query('categories');
    final localCategories = localData.map((e) {
      return Category.fromJson({
        'id': e['id'],
        'title': e['title'],
        'slug': e['slug'],
        'imageUrl': e['imageUrl'],
        'createdAt': e['createdAt'],
        '_count': {'products': e['productCount']},
      });
    }).toList();

    // 2. Fetch Remote if online
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
          ); // Categories are usually small, safe to full replace
          for (var c in remoteCategories) {
            await txn.insert('categories', {
              'id': c.id,
              'title': c.title,
              'slug': c.slug,
              'imageUrl': c.imageUrl,
              'productCount': c.productCount,
              'createdAt': c.createdAt?.toIso8601String(),
            }, conflictAlgorithm: ConflictAlgorithm.replace);
          }
        });
        return remoteCategories;
      } catch (e) {
        print('Background category fetch failed: \$e');
      }
    }

    return localCategories;
  }
}
