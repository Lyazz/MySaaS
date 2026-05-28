import 'dart:convert';

import '../models/cash.dart';
import '../models/contact_info.dart';
import '../models/delivery_provider.dart';
import '../models/store_settings.dart';

class SyncConflictPolicy {
  final String entityType;
  final String action;
  final String description;

  const SyncConflictPolicy({
    required this.entityType,
    required this.action,
    required this.description,
  });
}

class SyncConflictPolicies {
  static const definitions = <SyncConflictPolicy>[
    SyncConflictPolicy(
      entityType: 'order',
      action: 'updateStatus',
      description:
          'Block sync if the remote order status changed since the local edit.',
    ),
    SyncConflictPolicy(
      entityType: 'storeSettings',
      action: 'patch',
      description:
          'Block sync if remote store settings diverged from the local baseline snapshot.',
    ),
    SyncConflictPolicy(
      entityType: 'contactInfo',
      action: 'update',
      description:
          'Block sync if the remote contact info changed or was deleted since the local edit.',
    ),
    SyncConflictPolicy(
      entityType: 'contactInfo',
      action: 'delete',
      description:
          'Block sync if the remote contact info changed before the local delete is replayed.',
    ),
    SyncConflictPolicy(
      entityType: 'cashbox',
      action: 'update',
      description:
          'Block sync if remote cashbox metadata diverged from the local baseline snapshot.',
    ),
    SyncConflictPolicy(
      entityType: 'deliveryProvider',
      action: 'update',
      description:
          'Block sync if remote delivery provider activation changed since the local edit.',
    ),
  ];

  static String fingerprintOrderStatus(String status) =>
      _fingerprint({'status': status.trim().toUpperCase()});

  static String fingerprintStoreSettings(StoreSettings settings) =>
      _fingerprint(settings.toJson());

  static String fingerprintContactInfo(ContactInfo info) => _fingerprint({
    'kind': info.kind,
    'label': info.label,
    'value': info.value,
    'position': info.position,
    'isActive': info.isActive,
    'href': info.href,
  });

  static String fingerprintCashbox(CashboxSummary cashbox) =>
      _fingerprint({'name': cashbox.name, 'isActive': cashbox.isActive});

  static String fingerprintDeliveryProvider(DeliveryProvider provider) =>
      _fingerprint({
        'offered': provider.offered,
        'isEnabled': provider.isEnabled,
      });

  static String fingerprintData(Map<String, dynamic> value) =>
      _fingerprint(value);

  static String _fingerprint(Map<String, dynamic> value) =>
      jsonEncode(_normalize(value));

  static dynamic _normalize(dynamic value) {
    if (value is Map) {
      final normalized = <String, dynamic>{};
      final keys = value.keys.map((key) => key.toString()).toList()..sort();
      for (final key in keys) {
        normalized[key] = _normalize(value[key]);
      }
      return normalized;
    }
    if (value is List) {
      return value.map(_normalize).toList();
    }
    return value;
  }
}
