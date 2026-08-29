import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:admin_app/models/printer_profile.dart';
import 'package:admin_app/providers/printer_profiles_provider.dart';
import 'package:admin_app/services/database_service.dart';
import 'package:admin_app/services/sync_service.dart';
import 'package:admin_app/models/bootstrap_config.dart';
import 'package:admin_app/models/app_mode.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:admin_app/providers/auth_provider.dart';
import 'package:admin_app/bootstrap.dart';
import '../helpers/fake_connectivity.dart';

void main() {
  late Directory tempDbDir;
  late void Function() restoreConnectivity;

  setUpAll(() async {
    sqfliteFfiInit();
    databaseFactory = databaseFactoryFfi;
    // A real directory, not `:memory:`: the service namespaces each workspace
    // into a subdirectory it has to create, which `:memory:` cannot host.
    tempDbDir = await Directory.systemTemp.createTemp('printer-persistence');
    DatabaseService.databasesPathProvider = () async => tempDbDir.path;

    // Reported as offline on purpose. This test is about local persistence, and
    // the previous mock claimed wifi — which sent every repository call at a
    // localhost API that is not listening, so the test sat through connect
    // timeouts and sync backoff for minutes before failing.
    restoreConnectivity = installFakeConnectivity().restore;

    SharedPreferences.setMockInitialValues({});
  });

  tearDownAll(() async {
    restoreConnectivity();
    await SyncService().reset();
    await DatabaseService().resetForTest();
    DatabaseService.resetTestOverrides();
    await tempDbDir.delete(recursive: true);
  });

  // A plain `test`, not `testWidgets`: this exercises repositories and the
  // database, no widgets. `testWidgets` runs the body inside a FakeAsync zone
  // where real file and database I/O never completes, which is why this hung
  // for minutes instead of failing or passing.
  test('printer profile persists across provider container restarts', () async {
    await DatabaseService().resetForTest();

    final bootstrap = BootstrapConfig(
      apiBaseUrl: 'http://localhost',
      mode: AppMode.online,
      tenantId: 'test-tenant',
    );

    // First container
    ProviderContainer container = ProviderContainer(
      overrides: [
        bootstrapProvider.overrideWith(() => BootstrapNotifier(bootstrap)),
      ],
    );

    // AuthProvider initializes TenantModeService internally
    container.read(authProvider);

    // Add profile
    final profile = PrinterProfile(
      id: 'test-printer-1',
      name: 'Receipt Printer',
      transport: PrinterTransport.network,
      connectionParams: {'ip': '192.168.1.100', 'port': 9100},
      capabilityParams: {'paperWidth': 80},
    );

    await container.read(printerProfilesProvider.notifier).addProfile(profile);

    final state1 = container.read(printerProfilesProvider);
    expect(state1.profiles.length, 1);

    // Dispose container (simulating app restart)
    container.dispose();

    // Second container
    final container2 = ProviderContainer(
      overrides: [
        bootstrapProvider.overrideWith(() => BootstrapNotifier(bootstrap)),
      ],
    );

    // AuthProvider initializes TenantModeService
    container2.read(authProvider);

    // Load profiles (simulating opening settings page)
    await container2.read(printerProfilesProvider.notifier).loadProfiles();

    final state2 = container2.read(printerProfilesProvider);
    expect(state2.profiles.length, 1);

    container2.dispose();
  });
}
