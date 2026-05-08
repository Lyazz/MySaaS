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
    String debugText;

    if (status == NetworkStatus.noConnection) {
      bgColor = Colors.orange.shade600;
      icon = LucideIcons.wifiOff;
      debugText = 'Offline';
    } else if (isOfflineOnly) {
      bgColor = Colors.orange.shade500;
      icon = LucideIcons.database;
      debugText = 'Local';
    } else {
      bgColor = Colors.green.shade600;
      icon = LucideIcons.wifi;
      debugText = 'Online';
    }

    return Container(
      width: double.infinity,
      color: bgColor,
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, color: Colors.white.withOpacity(0.9), size: 11),
          const SizedBox(width: 6),
          Text(
            debugText,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              color: Colors.white.withOpacity(0.92),
              fontWeight: FontWeight.w600,
              fontSize: 10,
              letterSpacing: 0.2,
            ),
          ),
          if (isOfflineOnly) ...[
            const SizedBox(width: 6),
            Text(
              'debug',
              style: TextStyle(
                color: Colors.white.withOpacity(0.72),
                fontSize: 9,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ],
      ),
    );
  }
}
