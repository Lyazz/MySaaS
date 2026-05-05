import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../models/app_mode.dart';
import '../providers/auth_provider.dart';
import '../providers/network_status_provider.dart';

class OfflineBanner extends ConsumerWidget {
  const OfflineBanner({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final status = ref.watch(networkStatusProvider);
    final mode = ref.watch(authProvider).mode;
    final isOfflineOnly = mode == AppMode.offlineOnly;

    Color bgColor;
    IconData icon;
    String tenantText = isOfflineOnly
        ? 'Account: Free (Offline)'
        : 'Account: Paid (Syncing)';
    String connectionText;

    if (status == NetworkStatus.noConnection) {
      bgColor = Colors.orange.shade600;
      icon = LucideIcons.wifiOff;
      connectionText = 'Internet: Disconnected';
    } else if (isOfflineOnly) {
      bgColor = Colors.blue.shade600;
      icon = LucideIcons.database;
      connectionText = 'Internet: Connected (Local Mode)';
    } else {
      bgColor = Colors.green.shade600;
      icon = LucideIcons.wifi;
      connectionText = 'Internet: Connected & Syncing';
    }

    return Container(
      width: double.infinity,
      color: bgColor,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: SafeArea(
        bottom: false,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: Colors.white, size: 16),
            const SizedBox(width: 8),
            Text(
              '$tenantText  |  $connectionText',
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w600,
                fontSize: 13,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
