import 'dart:io';
import 'package:dio/dio.dart';
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as p;

class LogoCacheService {
  final Dio _dio = Dio();

  Future<File?> cacheLogo(String url) async {
    try {
      final dir = await getApplicationDocumentsDirectory();
      final cacheDir = Directory(p.join(dir.path, 'logo_cache'));
      if (!await cacheDir.exists()) {
        await cacheDir.create(recursive: true);
      }
      
      final fileName = 'receipt_logo_${url.hashCode}.png';
      final file = File(p.join(cacheDir.path, fileName));
      
      if (await file.exists()) {
        return file;
      }
      
      // Delete old logos to save space
      final files = cacheDir.listSync();
      for (final f in files) {
        if (f is File) {
          await f.delete();
        }
      }

      await _dio.download(url, file.path);
      return file;
    } catch (e) {
      print('Error caching logo: $e');
      return null;
    }
  }

  Future<File?> getCachedLogo(String url) async {
    try {
      final dir = await getApplicationDocumentsDirectory();
      final cacheDir = Directory(p.join(dir.path, 'logo_cache'));
      final fileName = 'receipt_logo_${url.hashCode}.png';
      final file = File(p.join(cacheDir.path, fileName));
      if (await file.exists()) {
        return file;
      }
      return null;
    } catch (e) {
      return null;
    }
  }
}

final logoCacheService = LogoCacheService();
