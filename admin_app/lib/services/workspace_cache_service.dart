import 'package:flutter_cache_manager/flutter_cache_manager.dart';

class WorkspaceCacheService {
  final Map<String, CacheManager> _cacheManagers = {};

  CacheManager imageCacheManager(String namespaceKey) {
    return _cacheManagers.putIfAbsent(
      namespaceKey,
      () => CacheManager(
        Config(
          'workspace-image-cache-$namespaceKey',
          stalePeriod: const Duration(days: 30),
          maxNrOfCacheObjects: 400,
        ),
      ),
    );
  }

  Future<void> clearWorkspace(String namespaceKey) async {
    final manager = imageCacheManager(namespaceKey);
    await manager.emptyCache();
  }
}
