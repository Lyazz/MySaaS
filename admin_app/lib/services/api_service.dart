import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../bootstrap.dart';
import '../models/provisioning_payload.dart';
import '../providers/auth_provider.dart';
import '../utils/image_storage_manager.dart';
import 'tenant_mode_service.dart';

final apiProvider = Provider<ApiService>((ref) {
  final bootstrap = ref.watch(bootstrapProvider);
  final api = ApiService(baseUrl: bootstrap.apiBaseUrl);

  api.client.interceptors.add(
    InterceptorsWrapper(
      onError: (DioException error, ErrorInterceptorHandler handler) {
        if (error.response?.statusCode == 401 &&
            !ApiService.isUnauthenticatedPath(error.requestOptions.path) &&
            api.hasToken) {
          // An authenticated call came back 401: the session is gone, so drop
          // it. Unauthenticated endpoints are excluded on purpose — a failed
          // sign-in attempt answers 401 too, and logging out there would wipe
          // the provisioned local workspace just because someone mistyped
          // their password.
          //
          // Session expiry, unlike a deliberate sign-out, keeps the local
          // database: the queued writes in it are the user's, not the
          // session's, and an expired token is the normal way a long offline
          // stretch ends.
          ref.read(authProvider.notifier).handleSessionExpired();
        }
        handler.next(error);
      },
    ),
  );

  return api;
});

class ApiService {
  static final String _defaultBaseUrl = 'https://swekly.com/api';

  /// Endpoints that are reachable without a session. A 401 from one of these
  /// means "these credentials are wrong", never "your session expired".
  static const Set<String> unauthenticatedPaths = {
    '/login',
    '/register',
    '/provisioning/activate',
  };

  static bool isUnauthenticatedPath(String path) {
    final normalized = path.trim().split('?').first;
    return unauthenticatedPaths.contains(normalized);
  }

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

    // Request/response bodies carry passwords, JWTs and activation tokens.
    // Log them in debug builds only, and mask the sensitive values even there.
    if (kDebugMode) {
      _dio.interceptors.add(
        LogInterceptor(
          responseBody: true,
          requestBody: true,
          logPrint: (Object object) => debugPrint(redactSecrets('$object')),
        ),
      );
    }
  }

  static final RegExp _secretPattern = RegExp(
    r'((?:password|passwordhash|token|activationtoken|authorization)"?\s*[:=]\s*)("?)([^,}\]"\n]+)',
    caseSensitive: false,
  );

  /// Masks credential-looking values inside a log line.
  static String redactSecrets(String line) {
    return line.replaceAllMapped(
      _secretPattern,
      (match) => '${match[1]}${match[2]}***',
    );
  }

  Dio get client => _dio;

  String get baseUrl => _dio.options.baseUrl;

  void setBaseUrl(String baseUrl) {
    _dio.options.baseUrl = baseUrl.trim();
  }

  bool _isLoopbackHost(String host) {
    final normalized = host.trim().toLowerCase();
    return normalized == 'localhost' ||
        normalized.endsWith('.localhost') ||
        normalized == '127.0.0.1' ||
        normalized == '0.0.0.0' ||
        normalized == '::1' ||
        normalized == '[::1]';
  }

  /// Resolves relative URLs like `/uploads/...` against the API host
  /// (e.g. `http://localhost:3000/api` -> `http://localhost:3000/uploads/...`).
  ///
  /// Use this for image/file URLs returned by the backend.
  String resolvePublicUrl(String url) {
    final trimmed = url.trim();
    if (trimmed.isEmpty) return trimmed;
    if (ImageStorageManager.isLocalImagePath(trimmed)) return trimmed;

    final lower = trimmed.toLowerCase();
    if (lower.startsWith('http://') || lower.startsWith('https://')) {
      try {
        final absolute = Uri.parse(trimmed);
        final base = Uri.parse(_dio.options.baseUrl);
        final shouldRewriteLoopbackHost =
            _isLoopbackHost(absolute.host) &&
            base.host.trim().isNotEmpty &&
            absolute.host.trim().toLowerCase() !=
                base.host.trim().toLowerCase();

        if (shouldRewriteLoopbackHost) {
          return absolute.replace(host: base.host).toString();
        }
      } catch (_) {}
      return trimmed;
    }

    final base = Uri.parse(_dio.options.baseUrl);
    final origin = base.replace(path: '', query: null, fragment: null);

    if (trimmed.startsWith('/')) {
      return origin.resolve(trimmed).toString();
    }
    return origin.resolve('/$trimmed').toString();
  }

  /// Whether an `Authorization` header is currently attached.
  bool get hasToken => _dio.options.headers.containsKey('Authorization');

  void setToken(String? token) {
    if (token != null && token.trim().isNotEmpty) {
      _dio.options.headers['Authorization'] = 'Bearer ${token.trim()}';
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
      Map<String, dynamic>.from(provisioning),
    );
  }

  Future<String?> uploadImage(String filePath) async {
    try {
      final formData = FormData.fromMap({
        'file': await MultipartFile.fromFile(filePath),
      });

      final response = await _dio.post(
        '/upload',
        data: formData,
        options: Options(contentType: 'multipart/form-data'),
      );
      return response.data['url'];
    } catch (e) {
      return null;
    }
  }

  Future<String?> uploadPickedFile(XFile file) async {
    try {
      final bytes = await file.readAsBytes();
      final filename = file.name.trim().isNotEmpty
          ? file.name.trim()
          : 'upload-${DateTime.now().microsecondsSinceEpoch}.jpg';
      return uploadImageBytes(bytes, filename: filename);
    } catch (_) {
      return null;
    }
  }

  String _extractUploadErrorMessage(Object error) {
    if (error is DioException) {
      final data = error.response?.data;
      if (data is Map) {
        final message = data['error'] ?? data['message'];
        if (message is String && message.trim().isNotEmpty) {
          return message.trim();
        }
      }
      final message = error.message?.trim();
      if (message != null && message.isNotEmpty) {
        return message;
      }
    }
    final text = error.toString().trim();
    if (text.isNotEmpty) return text;
    return 'Upload failed';
  }

  Future<String?> uploadImageBytes(
    Uint8List bytes, {
    required String filename,
  }) async {
    try {
      return await uploadImageBytesOrThrow(bytes, filename: filename);
    } catch (_) {
      return null;
    }
  }

  Future<String> uploadImageBytesOrThrow(
    Uint8List bytes, {
    required String filename,
  }) async {
    try {
      final safeFilename = filename.trim().isNotEmpty
          ? filename.trim()
          : 'upload-${DateTime.now().microsecondsSinceEpoch}.jpg';
      final formData = FormData.fromMap({
        'file': MultipartFile.fromBytes(bytes, filename: safeFilename),
      });

      final response = await _dio.post(
        '/upload',
        data: formData,
        options: Options(contentType: 'multipart/form-data'),
      );
      final url = response.data['url']?.toString().trim() ?? '';
      if (url.isEmpty) {
        throw Exception('Upload completed but no image URL was returned.');
      }
      return url;
    } catch (error) {
      throw Exception(_extractUploadErrorMessage(error));
    }
  }
}
