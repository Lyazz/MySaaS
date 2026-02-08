import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final apiProvider = Provider<ApiService>((ref) => ApiService());

class ApiService {
  static String _resolveBaseUrl() {
    if (Platform.isMacOS || Platform.isWindows || Platform.isLinux) {
      return 'http://localhost:3000/api';
    }

    return 'http://192.168.1.4:3000/api';
  }

  final Dio _dio = Dio(
    BaseOptions(
      baseUrl: _resolveBaseUrl(),
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ),
  );

  ApiService() {
    _dio.interceptors.add(
      LogInterceptor(responseBody: true, requestBody: true),
    );
  }

  Dio get client => _dio;

  /// Resolves relative URLs like `/uploads/...` against the API host
  /// (e.g. `http://localhost:3000/api` -> `http://localhost:3000/uploads/...`).
  ///
  /// Use this for image/file URLs returned by the backend.
  String resolvePublicUrl(String url) {
    final trimmed = url.trim();
    if (trimmed.isEmpty) return trimmed;

    final lower = trimmed.toLowerCase();
    if (lower.startsWith('http://') || lower.startsWith('https://')) {
      return trimmed;
    }

    final base = Uri.parse(_dio.options.baseUrl);
    final origin = base.replace(path: '', query: null, fragment: null);

    if (trimmed.startsWith('/')) {
      return origin.resolve(trimmed).toString();
    }
    return origin.resolve('/$trimmed').toString();
  }

  void setToken(String? token) {
    if (token != null) {
      _dio.options.headers['Authorization'] = 'Bearer $token';
    } else {
      _dio.options.headers.remove('Authorization');
    }
  }

  Future<String?> uploadImage(String filePath) async {
    try {
      final formData = FormData.fromMap({
        'file': await MultipartFile.fromFile(filePath),
      });

      final response = await _dio.post('/upload', data: formData);
      return response.data['url'];
    } catch (e) {
      return null;
    }
  }
}
