import '../models/bootstrap_config.dart';
import '../models/workspace_binding.dart';
import 'database_service.dart';
import 'workspace_cache_service.dart';
import 'workspace_file_service.dart';

typedef WorkspaceNamespaceClearer = Future<void> Function(String namespaceKey);

class WorkspaceDataCleaner {
  WorkspaceDataCleaner({
    DatabaseService? databaseService,
    WorkspaceFileService? fileService,
    WorkspaceCacheService? cacheService,
    WorkspaceNamespaceClearer? clearDatabase,
    WorkspaceNamespaceClearer? clearFiles,
    WorkspaceNamespaceClearer? clearCache,
  }) : _databaseService = databaseService ?? DatabaseService(),
       _fileService = fileService ?? WorkspaceFileService(),
       _cacheService = cacheService ?? WorkspaceCacheService(),
       _clearDatabase = clearDatabase,
       _clearFiles = clearFiles,
       _clearCache = clearCache;

  final DatabaseService _databaseService;
  final WorkspaceFileService _fileService;
  final WorkspaceCacheService _cacheService;
  final WorkspaceNamespaceClearer? _clearDatabase;
  final WorkspaceNamespaceClearer? _clearFiles;
  final WorkspaceNamespaceClearer? _clearCache;

  Future<void> clearProvisionedWorkspace(BootstrapConfig bootstrap) async {
    final binding = WorkspaceBinding.fromBootstrap(bootstrap);
    if (!binding.isBound) return;

    await (_clearDatabase ?? _databaseService.clearWorkspaceDatabase)(
      binding.namespaceKey,
    );
    await (_clearFiles ?? _fileService.clearWorkspace)(binding.namespaceKey);
    await (_clearCache ?? _cacheService.clearWorkspace)(binding.namespaceKey);
  }
}
