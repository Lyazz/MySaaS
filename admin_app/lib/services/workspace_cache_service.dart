import 'package:flutter_cache_manager/flutter_cache_manager.dart';

class WorkspaceCacheService {
  // Singleton: all callers share the same cache managers so there is no
  // in-memory divergence between _PosSafeNetworkImage and OfflineImageWidget.
  static final WorkspaceCacheService _instance =
      WorkspaceCacheService._internal();
  factory WorkspaceCacheService() => _instance;
  WorkspaceCacheService._internal();

  final Map<String, CacheManager> _cacheManagers = {};

  CacheManager imageCacheManager(String namespaceKey) {
    return _cacheManagers.putIfAbsent(
      namespaceKey,
      () => CacheManager(
        Config(
          'workspace-image-cache-$namespaceKey',
          // 7 days: short enough that stale / failed cached responses
          // (e.g. 403s stored while offline) are re-fetched within a week.
          stalePeriod: const Duration(days: 7),
          maxNrOfCacheObjects: 400,
        ),
      ),
    );
  }

  Future<void> clearWorkspace(String namespaceKey) async {
    final manager = imageCacheManager(namespaceKey);
    await manager.emptyCache();
    // Remove from the in-memory map so the next call creates a fresh manager.
    _cacheManagers.remove(namespaceKey);
  }
}
