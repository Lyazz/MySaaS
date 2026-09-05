import 'dart:io';

import 'package:admin_app/utils/auth_error.dart';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';

RequestOptions _options([String path = '/login']) =>
    RequestOptions(path: path, baseUrl: 'https://example.test/api');

DioException _badResponse(int status, {Object? body}) {
  final options = _options();
  return DioException(
    requestOptions: options,
    type: DioExceptionType.badResponse,
    response: Response<dynamic>(
      requestOptions: options,
      statusCode: status,
      data: body,
    ),
  );
}

void main() {
  group('AuthErrorMapper.classify', () {
    test('maps HTTP status codes', () {
      expect(
        AuthErrorMapper.classify(_badResponse(401)),
        AuthErrorKind.invalidCredentials,
      );
      expect(
        AuthErrorMapper.classify(_badResponse(400)),
        AuthErrorKind.invalidRequest,
      );
      expect(
        AuthErrorMapper.classify(_badResponse(422)),
        AuthErrorKind.invalidRequest,
      );
      expect(
        AuthErrorMapper.classify(_badResponse(403)),
        AuthErrorKind.forbidden,
      );
      expect(
        AuthErrorMapper.classify(_badResponse(404)),
        AuthErrorKind.notFound,
      );
      expect(
        AuthErrorMapper.classify(_badResponse(409)),
        AuthErrorKind.conflict,
      );
      expect(AuthErrorMapper.classify(_badResponse(500)), AuthErrorKind.server);
      expect(AuthErrorMapper.classify(_badResponse(503)), AuthErrorKind.server);
    });

    test('maps transport failures', () {
      for (final type in const [
        DioExceptionType.connectionTimeout,
        DioExceptionType.sendTimeout,
        DioExceptionType.receiveTimeout,
      ]) {
        expect(
          AuthErrorMapper.classify(
            DioException(requestOptions: _options(), type: type),
          ),
          AuthErrorKind.timeout,
        );
      }

      expect(
        AuthErrorMapper.classify(
          DioException(
            requestOptions: _options(),
            type: DioExceptionType.connectionError,
          ),
        ),
        AuthErrorKind.noConnection,
      );
      expect(
        AuthErrorMapper.classify(
          DioException(
            requestOptions: _options(),
            type: DioExceptionType.badCertificate,
          ),
        ),
        AuthErrorKind.badCertificate,
      );
      expect(
        AuthErrorMapper.classify(
          DioException(
            requestOptions: _options(),
            type: DioExceptionType.unknown,
            error: const SocketException('no route'),
          ),
        ),
        AuthErrorKind.noConnection,
      );
      expect(
        AuthErrorMapper.classify(const SocketException('down')),
        AuthErrorKind.noConnection,
      );
    });

    test('recognises the offline-mode rejection from ApiService', () {
      final offline = DioException(
        requestOptions: _options(),
        type: DioExceptionType.cancel,
        message: 'Offline tenant mode: network request blocked for /login',
      );
      expect(AuthErrorMapper.classify(offline), AuthErrorKind.offlineMode);

      final cancelled = DioException(
        requestOptions: _options(),
        type: DioExceptionType.cancel,
        message: 'cancelled by caller',
      );
      expect(AuthErrorMapper.classify(cancelled), AuthErrorKind.cancelled);
    });

    test('falls back to unknown', () {
      expect(AuthErrorMapper.classify(null), AuthErrorKind.unknown);
      expect(
        AuthErrorMapper.classify(Exception('boom')),
        AuthErrorKind.unknown,
      );
      expect(
        AuthErrorMapper.classify(_badResponse(302)),
        AuthErrorKind.unknown,
      );
    });

    test('passes an AuthFailure through unchanged', () {
      const failure = AuthFailure(AuthErrorKind.offlineMode, 'local only');
      expect(AuthErrorMapper.classify(failure), AuthErrorKind.offlineMode);
      expect(identical(AuthErrorMapper.toFailure(failure), failure), isTrue);
    });
  });

  group('AuthErrorMapper.serverMessage', () {
    test('reads the Express auth error shape', () {
      expect(
        AuthErrorMapper.serverMessage(
          _badResponse(
            409,
            body: {'statusCode': 409, 'statusMessage': 'Tenant URL is taken'},
          ),
        ),
        'Tenant URL is taken',
      );
    });

    test('falls back to message and error keys', () {
      expect(
        AuthErrorMapper.serverMessage(
          _badResponse(400, body: {'message': 'Missing required fields'}),
        ),
        'Missing required fields',
      );
      expect(
        AuthErrorMapper.serverMessage(
          _badResponse(400, body: {'error': 'Invalid slug format'}),
        ),
        'Invalid slug format',
      );
    });

    test('ignores non-map and empty bodies', () {
      expect(AuthErrorMapper.serverMessage(_badResponse(500)), isNull);
      expect(
        AuthErrorMapper.serverMessage(_badResponse(500, body: '<html>')),
        isNull,
      );
      expect(
        AuthErrorMapper.serverMessage(
          _badResponse(400, body: {'statusMessage': '   '}),
        ),
        isNull,
      );
      expect(AuthErrorMapper.serverMessage(Exception('boom')), isNull);
    });
  });

  group('AuthErrorMapper.toFailure', () {
    test('surfaces the backend wording for actionable errors', () {
      final failure = AuthErrorMapper.toFailure(
        _badResponse(
          409,
          body: {'statusCode': 409, 'statusMessage': 'Tenant URL is taken'},
        ),
      );

      expect(failure.kind, AuthErrorKind.conflict);
      expect(failure.statusCode, 409);
      expect(failure.message, 'Tenant URL is taken');
    });

    test('never leaks server wording for credentials or 5xx', () {
      final credentials = AuthErrorMapper.toFailure(
        _badResponse(401, body: {'statusMessage': 'Invalid credentials'}),
      );
      final server = AuthErrorMapper.toFailure(
        _badResponse(500, body: {'statusMessage': 'Internal Server Error'}),
      );

      expect(credentials.message, isNot(contains('Invalid credentials')));
      expect(server.message, isNot(contains('Internal Server Error')));
    });

    test('never returns a raw DioException dump', () {
      final message = AuthErrorMapper.messageFor(_badResponse(401));
      expect(message, isNot(contains('DioException')));
      expect(message, isNot(contains('status code')));
    });
  });
}
