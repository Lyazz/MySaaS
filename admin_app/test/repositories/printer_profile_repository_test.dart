import 'package:flutter_test/flutter_test.dart';
import 'package:admin_app/models/printer_profile.dart';
import 'package:admin_app/repositories/printer_profile_repository.dart';
import 'package:admin_app/services/database_service.dart';
import 'package:admin_app/services/tenant_mode_service.dart';
import 'package:admin_app/models/app_mode.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';
import 'package:admin_app/services/api_service.dart';

void main() {
  setUpAll(() {
    sqfliteFfiInit();
    databaseFactory = databaseFactoryFfi;
    DatabaseService.databasesPathProvider = () async => inMemoryDatabasePath;
    DatabaseService.databaseOpener = (path,
            {version,
            onConfigure,
            onCreate,
            onDowngrade,
            onOpen,
            onUpgrade,
            password,
            readOnly = false,
            singleInstance = true}) =>
        databaseFactory.openDatabase(
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
    TenantModeService().initialize(mode: AppMode.online, tenantId: 'test-tenant');
  });

  test('create and load printer profile', () async {
    final repo = PrinterProfileRepository(ApiService());
    final profile = PrinterProfile(
      id: '',
      name: 'Test Printer',
      transport: PrinterTransport.network,
      connectionParams: {'ip': '192.168.1.100', 'port': 9100},
      capabilityParams: {'paperWidth': 80, 'cut': true},
    );

    final created = await repo.createProfile(profile);
    expect(created.id, isNotEmpty);
    expect(created.name, 'Test Printer');

    final profiles = await repo.getProfiles();
    expect(profiles.length, 1);
    expect(profiles.first.id, created.id);
    expect(profiles.first.name, 'Test Printer');
    expect(profiles.first.connectionParams['ip'], '192.168.1.100');
  });
}
