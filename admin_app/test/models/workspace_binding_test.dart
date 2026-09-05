import 'package:admin_app/models/bootstrap_config.dart';
import 'package:admin_app/models/workspace_binding.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test(
    'WorkspaceBinding builds a stable namespace from tenant and workspace',
    () {
      final binding = WorkspaceBinding.fromBootstrap(
        const BootstrapConfig(
          apiBaseUrl: 'https://swekly.com/api',
          tenantId: 'tenant-1',
          workspaceId: 'workspace-7',
        ),
      );

      expect(binding.isBound, isTrue);
      expect(binding.namespaceKey, isNotEmpty);
      expect(
        binding.namespaceKey,
        WorkspaceBinding(
          tenantId: 'tenant-1',
          workspaceId: 'workspace-7',
        ).namespaceKey,
      );
    },
  );

  test('WorkspaceBinding falls back to tenant-only namespace when needed', () {
    final binding = WorkspaceBinding.fromBootstrap(
      const BootstrapConfig(
        apiBaseUrl: 'https://swekly.com/api',
        tenantId: 'tenant-1',
      ),
    );

    expect(binding.isBound, isTrue);
    expect(binding.namespaceKey, isNotEmpty);
  });
}
