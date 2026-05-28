import 'dart:io';

import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

class WorkspaceFileService {
  static const workspaceRootDirName = 'tenant_workspaces';
  static const legacyImagesDirName = 'app_images';
  static const imagesDirName = 'images';

  Future<Directory> workspaceRoot(String namespaceKey) async {
    final appDocDir = await getApplicationDocumentsDirectory();
    final root = Directory(
      p.join(appDocDir.path, workspaceRootDirName, namespaceKey),
    );
    if (!await root.exists()) {
      await root.create(recursive: true);
    }
    return root;
  }

  Future<Directory> imagesDirectory(String namespaceKey) async {
    final root = await workspaceRoot(namespaceKey);
    final dir = Directory(p.join(root.path, imagesDirName));
    if (!await dir.exists()) {
      await dir.create(recursive: true);
    }
    return dir;
  }

  Future<File> resolveWorkspaceFile(
    String namespaceKey,
    String relativePath,
  ) async {
    final root = await workspaceRoot(namespaceKey);
    return File(p.join(root.path, relativePath));
  }

  Future<void> clearWorkspace(String namespaceKey) async {
    final root = await workspaceRoot(namespaceKey);
    if (await root.exists()) {
      await root.delete(recursive: true);
    }
  }

  Future<void> migrateLegacyImagesIfNeeded(String namespaceKey) async {
    final appDocDir = await getApplicationDocumentsDirectory();
    final legacyDir = Directory(p.join(appDocDir.path, legacyImagesDirName));
    if (!await legacyDir.exists()) return;

    final targetDir = await imagesDirectory(namespaceKey);
    if (targetDir.listSync().isNotEmpty) return;

    for (final entity in legacyDir.listSync()) {
      if (entity is! File) continue;
      final nextPath = p.join(targetDir.path, p.basename(entity.path));
      if (!File(nextPath).existsSync()) {
        await entity.copy(nextPath);
      }
    }
  }
}
