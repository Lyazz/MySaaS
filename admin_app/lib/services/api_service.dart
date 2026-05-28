import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../bootstrap.dart';
import '../models/provisioning_payload.dart';
import 'tenant_mode_service.dart';

final apiProvider = Provider<ApiService>((ref) {
  final bootstrap = ref.watch(bootstrapProvider);
  return ApiService(baseUrl: bootstrap.apiBaseUrl);
});

class ApiService {
  static final String _defaultBaseUrl = 'https://swekly.com/api';

  final Dio _dio = Dio(
    BaseOptions(
      baseUrl: _defaultBaseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ),
  );

  ApiService({String? baseUrl}) {
    final resolved = (baseUrl ?? '').trim();
    if (resolved.isNotEmpty) {
      _dio.options.baseUrl = resolved;
    }

    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          final path = options.path;
          if (!TenantModeService().isRequestAllowed(path)) {
            handler.reject(
              DioException(
                requestOptions: options,
                type: DioExceptionType.cancel,
                message:
                    'Offline tenant mode: network request blocked for $path',
              ),
            );
            return;
          }
          handler.next(options);
        },
      ),
    );

    _dio.interceptors.add(
      LogInterceptor(responseBody: true, requestBody: true),
    );
  }

  Dio get client => _dio;

  String get baseUrl => _dio.options.baseUrl;

  void setBaseUrl(String baseUrl) {
    _dio.options.baseUrl = baseUrl.trim();
  }

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

  Future<ProvisioningPayload> activateProvisioningCode(
    String activationCode,
  ) async {
    final response = await _dio.post(
      '/provisioning/activate',
      data: {'activationCode': activationCode.trim()},
    );
    final data = response.data;
    if (data is! Map) {
      throw Exception('Invalid provisioning response');
    }

    final provisioning = data['provisioning'];
    if (provisioning is! Map) {
      throw Exception('Provisioning response is missing workspace data');
    }

    return ProvisioningPayload.fromJson(
      Map<String, dynamic>.from(provisioning as Map),
    );
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
