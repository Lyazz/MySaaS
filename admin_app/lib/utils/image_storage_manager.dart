import 'dart:io';
import 'package:path/path.dart' as p;
import 'package:uuid/uuid.dart';

import '../services/tenant_mode_service.dart';
import '../services/workspace_file_service.dart';

class ImageStorageManager {
  static final WorkspaceFileService _workspaceFileService =
      WorkspaceFileService();

  static String get _namespaceKey => TenantModeService().activeNamespaceKey;

  /// Gets the workspace-scoped local directory for storing images.
  static Future<Directory> _getImagesDirectory() async {
    await _workspaceFileService.migrateLegacyImagesIfNeeded(_namespaceKey);
    return _workspaceFileService.imagesDirectory(_namespaceKey);
  }

  /// Copies the chosen file to the app's document directory.
  /// Returns the relative path to the image, e.g., 'images/uuid.jpg'
  static Future<String> saveImageLocally(File file) async {
    final imagesDir = await _getImagesDirectory();
    final extension = p.extension(file.path);
    final fileName = '\${const Uuid().v4()}\$extension';
    final savedFile = await file.copy(p.join(imagesDir.path, fileName));

    return p.join(
      WorkspaceFileService.imagesDirName,
      p.basename(savedFile.path),
    );
  }

  /// Resolves a relative path (e.g., 'app_images/uuid.jpg') to an absolute File
  static Future<File> getLocalImageFile(String relativePath) async {
    final trimmed = relativePath.trim();
    if (trimmed.isEmpty) {
      return _workspaceFileService.resolveWorkspaceFile(_namespaceKey, trimmed);
    }

    final normalized =
        trimmed.startsWith('${WorkspaceFileService.legacyImagesDirName}/')
        ? trimmed.replaceFirst(
            '${WorkspaceFileService.legacyImagesDirName}/',
            '${WorkspaceFileService.imagesDirName}/',
          )
        : trimmed;

    await _workspaceFileService.migrateLegacyImagesIfNeeded(_namespaceKey);
    return _workspaceFileService.resolveWorkspaceFile(
      _namespaceKey,
      normalized,
    );
  }

  /// Deletes a local image given its relative path.
  static Future<void> deleteLocalImage(String relativePath) async {
    final file = await getLocalImageFile(relativePath);
    if (await file.exists()) {
      await file.delete();
    }
  }

  /// Helper to check if a path is an HTTP URL or a local relative path
  static bool isRemoteUrl(String path) {
    return path.startsWith('http://') || path.startsWith('https://');
  }
}
