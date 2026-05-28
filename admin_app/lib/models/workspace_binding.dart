import 'dart:convert';

import 'bootstrap_config.dart';

class WorkspaceBinding {
  final String tenantId;
  final String? workspaceId;

  const WorkspaceBinding({required this.tenantId, this.workspaceId});

  factory WorkspaceBinding.fromBootstrap(BootstrapConfig bootstrap) {
    return WorkspaceBinding(
      tenantId: bootstrap.tenantId.trim(),
      workspaceId: bootstrap.workspaceId?.trim().isNotEmpty == true
          ? bootstrap.workspaceId!.trim()
          : null,
    );
  }

  bool get isBound => tenantId.isNotEmpty;

  String get namespaceKey {
    final encoded = base64Url.encode(
      utf8.encode('$tenantId::${workspaceId ?? ''}'),
    );
    return encoded.replaceAll('=', '');
  }
}
