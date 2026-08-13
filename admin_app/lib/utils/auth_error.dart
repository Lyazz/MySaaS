import 'dart:io';

import 'package:dio/dio.dart';
import 'package:easy_localization/easy_localization.dart';

/// Classification of a failure raised while talking to the auth endpoints.
enum AuthErrorKind {
  /// The install runs in local-only mode, so the request never left the device.
  offlineMode,

  /// The request was cancelled before completing.
  cancelled,

  /// The device could not reach the API at all.
  noConnection,

  /// The API was reachable but did not answer in time.
  timeout,

  /// TLS handshake failed.
  badCertificate,

  /// 401 — wrong email/password, or an expired session.
  invalidCredentials,

  /// 400 / 422 — the server rejected the payload.
  invalidRequest,

  /// 403 — the account or action is not allowed.
  forbidden,

  /// 404 — endpoint or record missing.
  notFound,

  /// 409 — conflicting state (slug taken, duplicate email across tenants).
  conflict,

  /// 5xx — the API blew up.
  server,

  /// Anything we could not classify.
  unknown,
}

/// A failure with a message that is safe to render directly in the UI.
///
/// Screens used to show `error.toString()`, which surfaced raw Dio dumps like
/// `DioException [bad response]: ... status code of 401`. Throw this instead so
/// every auth surface shows a localized, human sentence.
class AuthFailure implements Exception {
  final AuthErrorKind kind;
  final String message;
  final int? statusCode;

  const AuthFailure(this.kind, this.message, {this.statusCode});

  @override
  String toString() => message;
}

/// Translates transport/server errors into [AuthFailure]s.
class AuthErrorMapper {
  const AuthErrorMapper._();

  /// Marker used by [ApiService]'s offline guard when it rejects a request.
  static const String offlineRejectionMarker = 'Offline tenant mode';

  /// Classifies [error] without touching localization, so it can be unit
  /// tested without an initialized `EasyLocalization`.
  static AuthErrorKind classify(Object? error) {
    if (error is AuthFailure) return error.kind;

    if (error is DioException) {
      switch (error.type) {
        case DioExceptionType.cancel:
          final message = error.message ?? '';
          return message.contains(offlineRejectionMarker)
              ? AuthErrorKind.offlineMode
              : AuthErrorKind.cancelled;
        case DioExceptionType.connectionTimeout:
        case DioExceptionType.sendTimeout:
        case DioExceptionType.receiveTimeout:
          return AuthErrorKind.timeout;
        case DioExceptionType.connectionError:
          return AuthErrorKind.noConnection;
        case DioExceptionType.badCertificate:
          return AuthErrorKind.badCertificate;
        case DioExceptionType.badResponse:
          return _kindForStatus(error.response?.statusCode);
        case DioExceptionType.unknown:
          if (error.error is SocketException) return AuthErrorKind.noConnection;
          return AuthErrorKind.unknown;
      }
    }

    if (error is SocketException) return AuthErrorKind.noConnection;

    return AuthErrorKind.unknown;
  }

  static AuthErrorKind _kindForStatus(int? status) {
    if (status == null) return AuthErrorKind.unknown;
    if (status == 401) return AuthErrorKind.invalidCredentials;
    if (status == 403) return AuthErrorKind.forbidden;
    if (status == 404) return AuthErrorKind.notFound;
    if (status == 409) return AuthErrorKind.conflict;
    if (status >= 500) return AuthErrorKind.server;
    if (status >= 400) return AuthErrorKind.invalidRequest;
    return AuthErrorKind.unknown;
  }

  /// Reads the message the backend sent, if any.
  ///
  /// The Express auth module answers with `{ statusCode, statusMessage }`;
  /// other modules use `error` or `message`.
  static String? serverMessage(Object? error) {
    if (error is! DioException) return null;
    final data = error.response?.data;
    if (data is! Map) return null;

    for (final key in const ['statusMessage', 'message', 'error']) {
      final value = data[key];
      if (value is String && value.trim().isNotEmpty) return value.trim();
    }
    return null;
  }

  /// Builds a user-facing failure for [error].
  ///
  /// [invalidCredentialsKey] lets a caller override the 401 wording (login says
  /// "invalid email or password", a token refresh says "session expired").
  static AuthFailure toFailure(
    Object? error, {
    String invalidCredentialsKey = 'auth.login.errors.invalidCredentials',
  }) {
    if (error is AuthFailure) return error;

    final kind = classify(error);
    final status = error is DioException ? error.response?.statusCode : null;
    final fromServer = serverMessage(error);

    // Prefer the backend's own wording when it is specific and actionable
    // (e.g. "Tenant URL is already taken"). Credentials and 5xx errors get the
    // localized generic text instead — server wording there is either a
    // security-sensitive detail or an internal stack message.
    final useServerMessage =
        fromServer != null &&
        const {
          AuthErrorKind.invalidRequest,
          AuthErrorKind.forbidden,
          AuthErrorKind.notFound,
          AuthErrorKind.conflict,
        }.contains(kind);

    final message = useServerMessage
        ? fromServer
        : _localizedMessage(kind, invalidCredentialsKey);

    return AuthFailure(kind, message, statusCode: status);
  }

  /// Convenience wrapper returning just the message.
  static String messageFor(
    Object? error, {
    String invalidCredentialsKey = 'auth.login.errors.invalidCredentials',
  }) => toFailure(error, invalidCredentialsKey: invalidCredentialsKey).message;

  static String _localizedMessage(
    AuthErrorKind kind,
    String invalidCredentialsKey,
  ) {
    return switch (kind) {
      AuthErrorKind.offlineMode => 'auth.errors.offlineMode'.tr(),
      AuthErrorKind.cancelled => 'auth.errors.cancelled'.tr(),
      AuthErrorKind.noConnection => 'auth.errors.noConnection'.tr(),
      AuthErrorKind.timeout => 'auth.errors.timeout'.tr(),
      AuthErrorKind.badCertificate => 'auth.errors.badCertificate'.tr(),
      AuthErrorKind.invalidCredentials => invalidCredentialsKey.tr(),
      AuthErrorKind.invalidRequest => 'auth.errors.invalidRequest'.tr(),
      AuthErrorKind.forbidden => 'auth.errors.forbidden'.tr(),
      AuthErrorKind.notFound => 'auth.errors.notFound'.tr(),
      AuthErrorKind.conflict => 'auth.errors.conflict'.tr(),
      AuthErrorKind.server => 'auth.errors.server'.tr(),
      AuthErrorKind.unknown => 'auth.errors.unknown'.tr(),
    };
  }
}
