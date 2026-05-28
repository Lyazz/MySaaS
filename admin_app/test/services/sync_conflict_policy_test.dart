import 'package:flutter_test/flutter_test.dart';

import 'package:admin_app/models/cash.dart';
import 'package:admin_app/models/contact_info.dart';
import 'package:admin_app/models/delivery_provider.dart';
import 'package:admin_app/models/store_settings.dart';
import 'package:admin_app/services/sync_conflict_policy.dart';

void main() {
  test(
    'defines explicit conflict policies for priority operational entities',
    () {
      final entries = SyncConflictPolicies.definitions
          .map((policy) => '${policy.entityType}:${policy.action}')
          .toSet();

      expect(entries, contains('order:updateStatus'));
      expect(entries, contains('storeSettings:patch'));
      expect(entries, contains('contactInfo:update'));
      expect(entries, contains('contactInfo:delete'));
      expect(entries, contains('cashbox:update'));
      expect(entries, contains('deliveryProvider:update'));
    },
  );

  test('store settings fingerprint changes when operational fields change', () {
    const base = StoreSettings(
      name: 'Store A',
      slug: 'store-a',
      currencyCode: 'DZD',
      currencyCountry: 'DZ',
      isCompleted: true,
      cartEnabled: true,
      codEnabled: true,
      orderIdPrefix: 'ORD',
      minimumOrderAmountDzd: 0,
    );
    final changed = base.copyWith(codEnabled: false);

    expect(
      SyncConflictPolicies.fingerprintStoreSettings(base),
      isNot(SyncConflictPolicies.fingerprintStoreSettings(changed)),
    );
  });

  test('contact info fingerprint is stable for identical values', () {
    const info = ContactInfo(
      id: 'contact-1',
      kind: 'phone',
      value: '+213555123456',
      position: 0,
      isActive: true,
      href: 'tel:+213555123456',
    );

    expect(
      SyncConflictPolicies.fingerprintContactInfo(info),
      SyncConflictPolicies.fingerprintContactInfo(
        ContactInfo.fromJson(info.toJson()),
      ),
    );
  });

  test('cashbox and delivery provider fingerprints cover activation state', () {
    final cashboxA = CashboxSummary(id: 'cash-1', name: 'Main', isActive: true);
    final cashboxB = cashboxA.copyWith(isActive: false);
    final providerA = DeliveryProvider(
      id: 'MAYSTRO',
      name: 'Maystro',
      offered: true,
      isEnabled: true,
    );
    final providerB = providerA.copyWith(isEnabled: false);

    expect(
      SyncConflictPolicies.fingerprintCashbox(cashboxA),
      isNot(SyncConflictPolicies.fingerprintCashbox(cashboxB)),
    );
    expect(
      SyncConflictPolicies.fingerprintDeliveryProvider(providerA),
      isNot(SyncConflictPolicies.fingerprintDeliveryProvider(providerB)),
    );
  });
}
