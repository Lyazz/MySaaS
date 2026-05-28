import 'package:admin_app/models/bootstrap_config.dart';
import 'package:admin_app/services/workspace_data_cleaner.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('WorkspaceDataCleaner clears all namespace-scoped stores', () async {
    String? clearedDatabase;
    String? clearedFiles;
    String? clearedCache;

    final cleaner = WorkspaceDataCleaner(
      clearDatabase: (namespaceKey) async => clearedDatabase = namespaceKey,
      clearFiles: (namespaceKey) async => clearedFiles = namespaceKey,
      clearCache: (namespaceKey) async => clearedCache = namespaceKey,
    );

    const bootstrap = BootstrapConfig(
      apiBaseUrl: 'https://swekly.com/api',
      tenantId: 'tenant-1',
      workspaceId: 'workspace-7',
    );

    await cleaner.clearProvisionedWorkspace(bootstrap);

    expect(clearedDatabase, isNotNull);
    expect(clearedFiles, clearedDatabase);
    expect(clearedCache, clearedDatabase);
  });
}
