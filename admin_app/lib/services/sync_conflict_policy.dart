import 'dart:convert';

import '../models/cash.dart';
import '../models/contact_info.dart';
import '../models/delivery_provider.dart';
import '../models/store_settings.dart';
import 'package:easy_localization/easy_localization.dart';

class SyncConflictPolicy {
  final String entityType;
  final String action;
  final String description;

  SyncConflictPolicy({
    required this.entityType,
    required this.action,
    required this.description,
  });
}

class SyncConflictPolicies {
  static final definitions = <SyncConflictPolicy>[
    SyncConflictPolicy(
      entityType: 'order',
      action: 'updateStatus',
      description: 'app.block_sync_if_the_remote_order'.tr(),
    ),
    SyncConflictPolicy(
      entityType: 'storeSettings',
      action: 'patch',
      description: 'app.block_sync_if_remote_store_set'.tr(),
    ),
    SyncConflictPolicy(
      entityType: 'contactInfo',
      action: 'update',
      description: 'app.block_sync_if_the_remote_conta'.tr(),
    ),
    SyncConflictPolicy(
      entityType: 'contactInfo',
      action: 'delete',
      description: 'app.block_sync_if_the_remote_conta2'.tr(),
    ),
    SyncConflictPolicy(
      entityType: 'cashbox',
      action: 'update',
      description: 'app.block_sync_if_remote_cashbox_m'.tr(),
    ),
    SyncConflictPolicy(
      entityType: 'deliveryProvider',
      action: 'update',
      description: 'app.block_sync_if_remote_delivery'.tr(),
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
      _fingerprint({'offered': provider.offered});

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
