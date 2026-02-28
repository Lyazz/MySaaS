import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';

import 'ui_badge.dart';

class OrderStatusBadge extends StatelessWidget {
  final String status;

  const OrderStatusBadge({super.key, required this.status});

  static UiBadgeTone toneFor(String status) {
    switch (status.trim().toUpperCase()) {
      case 'PENDING':
        return UiBadgeTone.amber;
      case 'CONFIRMED':
        return UiBadgeTone.indigo;
      case 'SHIPPED':
        return UiBadgeTone.teal;
      case 'DELIVERED':
        return UiBadgeTone.emerald;
      case 'CANCELLED':
        return UiBadgeTone.red;
      case 'RETURNED':
        return UiBadgeTone.slate;
      default:
        return UiBadgeTone.slate;
    }
  }

  @override
  Widget build(BuildContext context) {
    final normalized = status.trim().isEmpty ? 'UNKNOWN' : status.trim();

    final label = switch (normalized.trim().toUpperCase()) {
      'PENDING' => 'admin.orderStatus.pending'.tr(),
      'CONFIRMED' => 'admin.orderStatus.confirmed'.tr(),
      'SHIPPED' => 'admin.orderStatus.shipped'.tr(),
      'DELIVERED' => 'admin.orderStatus.delivered'.tr(),
      'CANCELLED' => 'admin.orderStatus.cancelled'.tr(),
      'RETURNED' => 'admin.orderStatus.returned'.tr(),
      _ => normalized,
    };
    return UiBadge(
      label: label,
      tone: toneFor(normalized),
      uppercase: true,
    );
  }
}

class PurchaseStatusBadge extends StatelessWidget {
  final String status;

  const PurchaseStatusBadge({super.key, required this.status});

  static UiBadgeTone toneFor(String status) {
    switch (status.trim().toLowerCase()) {
      case 'completed':
      case 'received':
        return UiBadgeTone.emerald;
      case 'pending':
      case 'ordered':
        return UiBadgeTone.amber;
      case 'cancelled':
        return UiBadgeTone.red;
      default:
        return UiBadgeTone.slate;
    }
  }

  @override
  Widget build(BuildContext context) {
    final normalized = status.trim().isEmpty ? 'UNKNOWN' : status.trim();
    return UiBadge(
      label: normalized,
      tone: toneFor(normalized),
      uppercase: true,
    );
  }
}

class ActiveBadge extends StatelessWidget {
  final bool isActive;

  const ActiveBadge({super.key, required this.isActive});

  @override
  Widget build(BuildContext context) {
    return UiBadge(
      label: isActive ? 'admin.common.active'.tr() : 'admin.common.inactive'.tr(),
      tone: isActive ? UiBadgeTone.emerald : UiBadgeTone.slate,
    );
  }
}

class SaleTypeBadge extends StatelessWidget {
  final String type;

  const SaleTypeBadge({super.key, required this.type});

  static UiBadgeTone toneFor(String type) {
    switch (type.trim().toUpperCase()) {
      case 'ORDER':
        return UiBadgeTone.indigo;
      case 'POS':
        return UiBadgeTone.teal;
      default:
        return UiBadgeTone.slate;
    }
  }

  @override
  Widget build(BuildContext context) {
    final normalized = type.trim().isEmpty ? 'UNKNOWN' : type.trim();
    return UiBadge(
      label: normalized,
      tone: toneFor(normalized),
      uppercase: true,
    );
  }
}

class SaleStatusBadge extends StatelessWidget {
  final String status;

  const SaleStatusBadge({super.key, required this.status});

  static UiBadgeTone toneFor(String status) {
    switch (status.trim().toUpperCase()) {
      case 'PENDING':
        return UiBadgeTone.amber;
      case 'CONFIRMED':
        return UiBadgeTone.indigo;
      case 'SHIPPED':
        return UiBadgeTone.teal;
      case 'DELIVERED':
      case 'COMPLETED':
        return UiBadgeTone.emerald;
      case 'CANCELLED':
        return UiBadgeTone.red;
      case 'RETURNED':
        return UiBadgeTone.slate;
      default:
        return UiBadgeTone.slate;
    }
  }

  @override
  Widget build(BuildContext context) {
    final normalized = status.trim().isEmpty ? 'UNKNOWN' : status.trim();

    final label = switch (normalized.trim().toUpperCase()) {
      'PENDING' => 'admin.orderStatus.pending'.tr(),
      'CONFIRMED' => 'admin.orderStatus.confirmed'.tr(),
      'SHIPPED' => 'admin.orderStatus.shipped'.tr(),
      'DELIVERED' => 'admin.orderStatus.delivered'.tr(),
      'COMPLETED' => 'admin.pages.sales.index.table.completed'.tr(),
      'CANCELLED' => 'admin.orderStatus.cancelled'.tr(),
      'RETURNED' => 'admin.orderStatus.returned'.tr(),
      _ => normalized,
    };
    return UiBadge(
      label: label,
      tone: toneFor(normalized),
      uppercase: true,
    );
  }
}
