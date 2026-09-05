import 'dart:convert';
import 'dart:io';

import 'package:admin_app/models/app_mode.dart';
import 'package:admin_app/models/cash.dart';
import 'package:admin_app/providers/cash_provider.dart';
import 'package:admin_app/providers/pos_provider.dart';
import 'package:admin_app/providers/printer_profiles_provider.dart';
import 'package:admin_app/services/database_service.dart';
import 'package:admin_app/services/sync_service.dart';
import 'package:admin_app/services/tenant_mode_service.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

/// The server posts a POS sale's SALE_PAYMENT movement through the cash ledger,
/// and refuses it with 409 `CASH_SESSION_REQUIRED` unless the till has an open
/// session — rolling back the sale created in the same transaction. Taking the
/// sale anyway banks it locally, prints a receipt, and then strands it in the
/// sync recovery list where a retry can only reproduce the same 409.
void main() {
  late Directory tempDbDir;
  late DatabaseOpener originalDatabaseOpener;

  CashboxSummary cashbox(String id, {bool open = false}) => CashboxSummary(
    id: id,
    name: 'Till $id',
    isActive: true,
    openSession: open
        ? CashOpenSession(id: 'session-$id', openingFloat: 0)
        : null,
  );

  ProviderContainer containerWith(List<CashboxSummary> cashboxes) {
    final container = ProviderContainer(
      overrides: [
        cashProvider.overrideWith(
          () => CashNotifier(CashState(cashboxes: cashboxes)),
        ),
        // The real notifier kicks off a profile fetch from `build()`. Nothing
        // here prints, so keep it inert rather than doing unrelated database
        // work on every checkout.
        printerProfilesProvider.overrideWith(_IdlePrinterProfiles.new),
      ],
    );
    addTearDown(container.dispose);
    return container;
  }

  Future<List<Map<String, Object?>>> queuedSales() async {
    final db = await DatabaseService().database;
    return db.query(
      'sync_queue',
      where: 'entityType = ? AND action = ?',
      whereArgs: ['sale', 'create'],
    );
  }

  setUpAll(() async {
    sqfliteFfiInit();
    tempDbDir = await Directory.systemTemp.createTemp('pos-session-gate-db');

    final factory = databaseFactoryFfi;
    originalDatabaseOpener = DatabaseService.databaseOpener;
    DatabaseService.databasesPathProvider = () async => tempDbDir.path;
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
        }) {
          return factory.openDatabase(
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
        };
  });

  setUp(() async {
    await tempDbDir.create(recursive: true);
    await DatabaseService().resetForTest();
    TenantModeService().initialize(
      mode: AppMode.hybrid,
      tenantId: 'tenant-1',
      workspaceId: 'workspace-1',
    );
    await SyncService().reset();
  });

  tearDown(() async {
    await SyncService().reset();
    await DatabaseService().resetForTest();
  });

  tearDownAll(() async {
    DatabaseService.databaseOpener = originalDatabaseOpener;
    DatabaseService.resetTestOverrides();
    await tempDbDir.delete(recursive: true);
  });

  test('a sale is refused while no till has an open session', () async {
    final container = containerWith([cashbox('a'), cashbox('b')]);
    final notifier = container.read(posProvider.notifier);
    notifier.addCustomItem(name: 'Desk sale', price: 1000);

    expect(await notifier.checkout(), isFalse);

    final state = container.read(posProvider);
    expect(state.error, isNotNull);
    expect(state.isLoading, isFalse);
    // The cart survives, so the cashier can open a session and ring the same
    // basket up rather than keying it in again.
    expect(state.cart, hasLength(1));
    expect(await queuedSales(), isEmpty);
  });

  test('a sale is refused when no cashbox exists at all', () async {
    final container = containerWith(const []);
    final notifier = container.read(posProvider.notifier);
    notifier.addCustomItem(name: 'Desk sale', price: 1000);

    expect(await notifier.checkout(), isFalse);
    expect(container.read(posProvider).error, isNotNull);
    expect(await queuedSales(), isEmpty);
  });

  test(
    'a sale is refused while two tills are open and none is assigned',
    () async {
      // Guessing here books the money into another cashier's drawer, and the
      // server would accept it: it silently falls back to the first active
      // cashbox when the request names none.
      final container = containerWith([
        cashbox('a', open: true),
        cashbox('b', open: true),
      ]);
      final notifier = container.read(posProvider.notifier);
      notifier.addCustomItem(name: 'Desk sale', price: 1000);

      expect(await notifier.checkout(), isFalse);
      expect(container.read(posProvider).error, isNotNull);
      expect(await queuedSales(), isEmpty);
    },
  );

  test('a sale posts against the single open till', () async {
    final container = containerWith([
      cashbox('till-open', open: true),
      cashbox('till-closed'),
    ]);
    final notifier = container.read(posProvider.notifier);
    notifier.addCustomItem(name: 'Desk sale', price: 1000);

    expect(await notifier.checkout(), isTrue);

    final queued = await queuedSales();
    expect(queued, hasLength(1));
    final payload =
        jsonDecode(queued.single['payload'] as String) as Map<String, dynamic>;
    // Named explicitly rather than left to the server's fallback, which would
    // pick the first active cashbox regardless of which till is open.
    expect(payload['cashboxId'], 'till-open');
    expect(container.read(posProvider).cart, isEmpty);
  });
}

class _IdlePrinterProfiles extends PrinterProfilesNotifier {
  @override
  PrinterProfilesState build() => PrinterProfilesState();
}
