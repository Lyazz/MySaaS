import 'dart:io';
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as p;
import 'package:uuid/uuid.dart';

class ImageStorageManager {
  static const String _imagesDirName = 'app_images';

  /// Gets the local directory for storing images. Creates it if it doesn't exist.
  static Future<Directory> _getImagesDirectory() async {
    final appDocDir = await getApplicationDocumentsDirectory();
    final imagesDir = Directory(p.join(appDocDir.path, _imagesDirName));
    if (!await imagesDir.exists()) {
      await imagesDir.create(recursive: true);
    }
    return imagesDir;
  }

  /// Copies the chosen file to the app's document directory.
  /// Returns the relative path to the image, e.g., 'app_images/uuid.jpg'
  static Future<String> saveImageLocally(File file) async {
    final imagesDir = await _getImagesDirectory();
    final extension = p.extension(file.path);
    final fileName = '\${const Uuid().v4()}\$extension';
    final savedFile = await file.copy(p.join(imagesDir.path, fileName));

    // Return the relative path (directory name + file name)
    return p.join(_imagesDirName, p.basename(savedFile.path));
  }

  /// Resolves a relative path (e.g., 'app_images/uuid.jpg') to an absolute File
  static Future<File> getLocalImageFile(String relativePath) async {
    final appDocDir = await getApplicationDocumentsDirectory();
    return File(p.join(appDocDir.path, relativePath));
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
