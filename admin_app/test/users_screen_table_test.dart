import 'package:admin_app/models/admin_user.dart';
import 'package:admin_app/models/staff_role.dart';
import 'package:admin_app/providers/admin_users_provider.dart';
import 'package:admin_app/providers/staff_roles_provider.dart';
import 'package:admin_app/providers/cash_provider.dart';
import 'package:admin_app/screens/users_screen.dart';
import 'package:admin_app/widgets/buttons/app_button.dart';
import 'package:admin_app/widgets/responsive_paginated_table.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';

import 'helpers/pump_localized_app.dart';

class MockStaffRolesNotifier extends StaffRolesNotifier {
  final StaffRolesState _mockState;
  MockStaffRolesNotifier(this._mockState) : super(_mockState);

  @override
  StaffRolesState build() => _mockState;

  @override
  Future<void> fetchRoles({bool forceRefresh = false}) async {}
}

class MockCashNotifier extends CashNotifier {
  final CashState _mockState;
  MockCashNotifier(this._mockState) : super(_mockState);

  @override
  CashState build() => _mockState;

  @override
  Future<void> fetchCashboxes({bool forceRefresh = false}) async {}
}

void main() {
  setUpAll(() async {
    await initializeDateFormatting('en');
  });

  testWidgets('UsersScreen renders ResponsivePaginatedTable for tabs', (
    WidgetTester tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(1100, 700));
    addTearDown(() async {
      await tester.binding.setSurfaceSize(null);
    });

    final roles = [
      StaffRole(id: 'role_1', name: 'Cashier', permissions: const []),
    ];

    final users = [
      AdminUser(
        id: 'u1',
        email: 'admin@tenant.com',
        role: 'admin',
        isActive: true,
        staffRoleId: null,
      ),
      AdminUser(
        id: 'u2',
        email: 'cashier@tenant.com',
        role: 'staff',
        isActive: false,
        staffRoleId: 'role_1',
      ),
    ];

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          adminUsersProvider.overrideWith(
            () => AdminUsersNotifier(
              AdminUsersState(
                users: users,
                isLoading: false,
                error: null,
                includeInactive: true,
              ),
            ),
          ),
          staffRolesProvider.overrideWith(
            () => MockStaffRolesNotifier(
              StaffRolesState(roles: roles, isLoading: false, error: null),
            ),
          ),
          cashProvider.overrideWith(
            () => MockCashNotifier(
              CashState(cashboxes: [], isLoadingCashboxes: false, error: null),
            ),
          ),
        ],
        child: buildLocalizedTestApp(home: const UsersScreen(autoFetch: false)),
      ),
    );
    await tester.pumpAndSettle();

    expect(
      find.byWidgetPredicate((w) => w is ResponsivePaginatedTable),
      findsOneWidget,
    );
    expect(find.text('Email'), findsOneWidget);
    expect(find.byTooltip('Edit'), findsNWidgets(2));

    await tester.tap(find.text('Roles (staff)'));
    await tester.pumpAndSettle();

    expect(
      find.byWidgetPredicate((w) => w is ResponsivePaginatedTable),
      findsOneWidget,
    );
    expect(find.text('Name'), findsOneWidget);
    expect(find.byTooltip('Edit'), findsOneWidget);
    expect(find.byTooltip('Delete'), findsOneWidget);
  });
}
