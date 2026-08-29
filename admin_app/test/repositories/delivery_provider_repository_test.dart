import 'dart:convert';
import 'dart:typed_data';

import 'package:admin_app/models/app_mode.dart';
import 'package:admin_app/repositories/delivery_provider_repository.dart';
import 'package:admin_app/services/api_service.dart';
import 'package:admin_app/services/database_service.dart';
import 'package:admin_app/services/tenant_mode_service.dart';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

/// `flutter test` globally blocks real `HttpClient` sockets (any real
/// network call fails with a 400), so this fakes Dio's transport layer
/// directly instead of standing up a real server — see
/// `sync_integration_test.dart` for the real-server variant used under
/// `integration_test/`, which runs on-device instead of in the test VM.
class _FakeAdapter implements HttpClientAdapter {
  Map<String, dynamic>? lastRequestBody;
  ResponseBody Function(RequestOptions options, Map<String, dynamic> body)?
  handler;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    final bytes = <int>[];
    if (requestStream != null) {
      await for (final chunk in requestStream) {
        bytes.addAll(chunk);
      }
    }
    final raw = utf8.decode(bytes);
    final body = raw.isEmpty
        ? <String, dynamic>{}
        : (jsonDecode(raw) as Map).cast<String, dynamic>();
    lastRequestBody = body;

    return handler!(options, body);
  }

  @override
  void close({bool force = false}) {}
}

void main() {
  late _FakeAdapter adapter;
  late ApiService api;

  Map<String, dynamic> adminViewJson({
    required bool offered,
    required bool isActive,
    Map<String, dynamic> config = const {},
    Map<String, bool> secrets = const {},
  }) {
    return {
      'provider': 'MAYSTRO',
      'name': 'Maystro',
      'supports': {
        'quote': true,
        'createShipment': true,
        'track': true,
        'webhooks': true,
      },
      'credentialFields': [
        {
          'key': 'apiToken',
          'label': 'API Token',
          'required': true,
          'secret': true,
        },
        {
          'key': 'storeId',
          'label': 'Store ID',
          'required': false,
          'secret': false,
        },
      ],
      'offered': offered,
      'account': {
        'isActive': isActive,
        'updatedAt': DateTime.now().toIso8601String(),
        'config': config,
        'secrets': secrets,
      },
    };
  }

  ResponseBody jsonResponse(Map<String, dynamic> json) {
    final bytes = utf8.encode(jsonEncode(json));
    return ResponseBody.fromBytes(
      bytes,
      200,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
  }

  setUpAll(() {
    sqfliteFfiInit();
    databaseFactory = databaseFactoryFfi;
    DatabaseService.databasesPathProvider = () async => inMemoryDatabasePath;
    DatabaseService.databaseOpener =
        (
          path, {
          version,
          onConfigure,
          onCreate,
          onDowngrade,
          onOpen,
          onUpgrade,
          password,
          readOnly = false,
          singleInstance = true,
        }) => databaseFactory.openDatabase(
          inMemoryDatabasePath,
          options: OpenDatabaseOptions(
            version: version,
            onConfigure: onConfigure,
            onCreate: onCreate,
            onDowngrade: onDowngrade,
            onOpen: onOpen,
            onUpgrade: onUpgrade,
            singleInstance: false,
          ),
        );
    TenantModeService().initialize(
      mode: AppMode.online,
      tenantId: 'test-tenant',
    );
  });

  setUp(() {
    adapter = _FakeAdapter();
    api = ApiService(baseUrl: 'http://fake.local/api');
    api.client.httpClientAdapter = adapter;
    adapter.handler = (options, body) => jsonResponse(
      adminViewJson(
        offered: body['offered'] ?? true,
        isActive: body['isActive'] ?? false,
        config: const {'storeId': 'S1'},
        secrets: const {'apiToken': true},
      ),
    );
  });

  test('saveAccount omits keys that were not provided', () async {
    final repo = DeliveryProviderRepository(api);

    await repo.saveAccount('MAYSTRO', isActive: true);

    expect(adapter.lastRequestBody, {'isActive': true});
  });

  test(
    'saveAccount forwards config as-is, including empty-string clears',
    () async {
      final repo = DeliveryProviderRepository(api);

      await repo.saveAccount(
        'MAYSTRO',
        isActive: true,
        config: {'apiToken': '', 'storeId': 'S1'},
      );

      expect(adapter.lastRequestBody?['config'], {
        'apiToken': '',
        'storeId': 'S1',
      });
    },
  );

  test(
    'saveAccount parses the response into credentialFields and account',
    () async {
      final repo = DeliveryProviderRepository(api);

      final updated = await repo.saveAccount(
        'MAYSTRO',
        isActive: true,
        config: {'apiToken': 'secret123', 'storeId': 'S1'},
      );

      expect(updated.id, 'MAYSTRO');
      expect(updated.credentialFields.length, 2);
      expect(updated.credentialFields.first.secret, isTrue);
      expect(updated.isActive, isTrue);
      // The real secret value is never echoed back — only a boolean flag.
      expect(updated.account?.secrets['apiToken'], isTrue);
      expect(updated.account?.config.containsKey('apiToken'), isFalse);
      expect(updated.account?.config['storeId'], 'S1');
    },
  );
}
