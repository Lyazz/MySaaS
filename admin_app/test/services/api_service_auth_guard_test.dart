import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:admin_app/bootstrap.dart';
import 'package:admin_app/models/app_mode.dart';
import 'package:admin_app/models/bootstrap_config.dart';
import 'package:admin_app/providers/auth_provider.dart';
import 'package:admin_app/services/api_service.dart';
import 'package:admin_app/services/database_service.dart';
import 'package:admin_app/utils/auth_error.dart';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

/// Answers requests from an in-memory routing table, so no socket is opened.
class _StubAdapter implements HttpClientAdapter {
  _StubAdapter(this.responder);

  final ResponseBody Function(RequestOptions options) responder;
  final List<String> requestedPaths = [];

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    requestedPaths.add(options.path);
    return responder(options);
  }

  @override
  void close({bool force = false}) {}
}

ResponseBody _json(Map<String, dynamic> body, int status) {
  return ResponseBody.fromString(
    jsonEncode(body),
    status,
    headers: {
      Headers.contentTypeHeader: [Headers.jsonContentType],
    },
  );
}

void main() {
  group('ApiService.isUnauthenticatedPath', () {
    test('covers the endpoints reachable without a session', () {
      expect(ApiService.isUnauthenticatedPath('/login'), isTrue);
      expect(ApiService.isUnauthenticatedPath('/register'), isTrue);
      expect(
        ApiService.isUnauthenticatedPath('/provisioning/activate'),
        isTrue,
      );
    });

    test('ignores query strings and surrounding whitespace', () {
      expect(ApiService.isUnauthenticatedPath('/login?next=/orders'), isTrue);
      expect(ApiService.isUnauthenticatedPath(' /login '), isTrue);
    });

    test('does not cover authenticated endpoints', () {
      expect(ApiService.isUnauthenticatedPath('/me'), isFalse);
      expect(ApiService.isUnauthenticatedPath('/orders'), isFalse);
      expect(ApiService.isUnauthenticatedPath('/logout'), isFalse);
    });
  });

  group('ApiService.redactSecrets', () {
    test('masks credentials in logged request bodies', () {
      final line = ApiService.redactSecrets(
        '{email: owner@example.com, password: hunter2, hardwareId: abc}',
      );

      expect(line, isNot(contains('hunter2')));
      expect(line, contains('owner@example.com'));
    });

    test('masks tokens and authorization headers', () {
      expect(
        ApiService.redactSecrets('authorization: Bearer eyJhbGciOi'),
        isNot(contains('eyJhbGciOi')),
      );
      expect(
        ApiService.redactSecrets('{token: eyJhbGciOi, activationToken: xyz}'),
        allOf(isNot(contains('eyJhbGciOi')), isNot(contains('xyz'))),
      );
    });

    test('leaves ordinary log lines alone', () {
      const line = '*** Request ***\nuri: https://example.test/api/orders';
      expect(ApiService.redactSecrets(line), line);
    });
  });

  group('token handling', () {
    test('hasToken tracks the Authorization header', () {
      final api = ApiService(baseUrl: 'https://example.test/api');
      expect(api.hasToken, isFalse);

      api.setToken('abc');
      expect(api.hasToken, isTrue);
      expect(api.client.options.headers['Authorization'], 'Bearer abc');

      api.setToken(null);
      expect(api.hasToken, isFalse);
    });

    test('blank tokens are treated as no token', () {
      final api = ApiService(baseUrl: 'https://example.test/api');
      api.setToken('   ');
      expect(api.hasToken, isFalse);
    });
  });

  group('401 handling', () {
    late ProviderContainer container;
    late _StubAdapter adapter;
    late Directory tempDir;

    // AuthNotifier boots SyncService, which touches the local database. Point
    // it at an ffi-backed temp file so these tests do not need a real device.
    setUp(() async {
      sqfliteFfiInit();
      tempDir = await Directory.systemTemp.createTemp('auth-guard-test');
      DatabaseService.databasesPathProvider = () async => tempDir.path;
      DatabaseService.databaseOpener =
          (
            String path, {
            int? version,
            OnDatabaseConfigureFn? onConfigure,
            OnDatabaseCreateFn? onCreate,
            OnDatabaseVersionChangeFn? onUpgrade,
            OnDatabaseVersionChangeFn? onDowngrade,
            OnDatabaseOpenFn? onOpen,
            String? password,
            bool readOnly = false,
            bool singleInstance = true,
          }) => databaseFactoryFfi.openDatabase(
            path,
            options: OpenDatabaseOptions(
              version: version,
              onConfigure: onConfigure,
              onCreate: onCreate,
              onUpgrade: onUpgrade,
              onDowngrade: onDowngrade,
              onOpen: onOpen,
              readOnly: readOnly,
              singleInstance: singleInstance,
            ),
          );
    });

    tearDown(() async {
      await DatabaseService().resetForTest();
      DatabaseService.resetTestOverrides();
      if (tempDir.existsSync()) tempDir.deleteSync(recursive: true);
    });

    ProviderContainer buildContainer(
      ResponseBody Function(RequestOptions options) responder, {
      String? authToken,
    }) {
      final container = ProviderContainer(
        overrides: [
          bootstrapProvider.overrideWith(
            () => BootstrapNotifier(
              BootstrapConfig(
                apiBaseUrl: 'https://example.test/api',
                mode: AppMode.online,
                tenantId: 'tenant-1',
                workspaceId: 'workspace-1',
                authToken: authToken,
              ),
            ),
          ),
        ],
      );
      addTearDown(container.dispose);

      adapter = _StubAdapter(responder);
      container.read(apiProvider).client.httpClientAdapter = adapter;
      return container;
    }

    test('a failed sign-in does not tear down the existing session', () async {
      // A provisioned install with a live session: the user signs out of the
      // form's perspective by mistyping a password. That must not clear the
      // workspace — see the interceptor guard in ApiService.
      container = buildContainer((options) {
        if (options.path == '/login') {
          return _json({
            'statusCode': 401,
            'statusMessage': 'Invalid credentials',
          }, 401);
        }
        return _json({
          'success': true,
          'user': {
            'id': 'user-1',
            'email': 'owner@example.com',
            'role': 'admin',
            'tenantId': 'tenant-1',
          },
          'tenant': {'id': 'tenant-1', 'isOffline': false},
        }, 200);
      }, authToken: 'existing-token');

      final notifier = container.read(authProvider.notifier);
      expect(container.read(authProvider).token, 'existing-token');

      await expectLater(
        notifier.login('owner@example.com', 'wrong-password'),
        throwsA(
          isA<AuthFailure>().having(
            (failure) => failure.kind,
            'kind',
            AuthErrorKind.invalidCredentials,
          ),
        ),
      );

      expect(container.read(authProvider).token, 'existing-token');
      expect(container.read(authProvider).error, isNotNull);
      expect(container.read(authProvider).error, isNot(contains('DioException')));
    });

    test('login rejects a response without a token', () async {
      container = buildContainer(
        (options) => _json({'success': true}, 200),
      );

      await expectLater(
        container.read(authProvider.notifier).login('owner@example.com', 'pw'),
        throwsA(isA<AuthFailure>()),
      );
      expect(container.read(authProvider).token, isNull);
    });

    test('local-only installs fail before touching the network', () async {
      final offlineContainer = ProviderContainer(
        overrides: [
          bootstrapProvider.overrideWith(
            () => BootstrapNotifier(
              const BootstrapConfig(
                apiBaseUrl: 'https://example.test/api',
                mode: AppMode.offlineOnly,
                tenantId: 'tenant-1',
                workspaceId: 'workspace-1',
              ),
            ),
          ),
        ],
      );
      addTearDown(offlineContainer.dispose);

      final stub = _StubAdapter((options) => _json({}, 200));
      offlineContainer.read(apiProvider).client.httpClientAdapter = stub;

      await expectLater(
        offlineContainer
            .read(authProvider.notifier)
            .login('owner@example.com', 'pw'),
        throwsA(
          isA<AuthFailure>().having(
            (failure) => failure.kind,
            'kind',
            AuthErrorKind.offlineMode,
          ),
        ),
      );
      expect(stub.requestedPaths, isEmpty);
    });
  });
}
