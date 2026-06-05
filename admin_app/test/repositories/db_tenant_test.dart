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
  });

  test('Database service saves and loads profile correctly with tenantId', () async {
    // 1. Reset Database
    await DatabaseService().resetForTest();

    // 2. Init TenantMode
    TenantModeService().initialize(mode: AppMode.online, tenantId: 'test-tenant');

    // 3. Create repo
    final repo = PrinterProfileRepository(ApiService());

    // 4. Create profile
    final p = PrinterProfile(
      id: 'p1',
      name: 'Printer 1',
      transport: PrinterTransport.network,
      connectionParams: {},
      capabilityParams: {},
    );
    await repo.createProfile(p);

    // 5. Get profiles
    final profiles = await repo.getProfiles();
    print('Fetched profiles: \${profiles.length}');
    expect(profiles.length, 1);

    // 6. Reset TenantMode to simulate restart but SAME tenant
    TenantModeService().initialize(mode: AppMode.online, tenantId: 'test-tenant');

    // 7. Get profiles again
    final profiles2 = await repo.getProfiles();
    print('Fetched profiles after re-init: \${profiles2.length}');
    expect(profiles2.length, 1);
  });
}
