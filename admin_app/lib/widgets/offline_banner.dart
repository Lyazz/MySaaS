import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../models/app_mode.dart';
import '../providers/auth_provider.dart';
import '../providers/network_status_provider.dart';
import '../providers/sync_provider.dart';
import '../services/sync_service.dart';
import 'package:easy_localization/easy_localization.dart';

class OfflineBanner extends ConsumerWidget {
  const OfflineBanner({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final networkStatus = ref.watch(networkStatusProvider);
    final authState = ref.watch(authProvider);
    final syncAsync = ref.watch(syncStateProvider);
    final syncState = syncAsync.asData?.value ?? const SyncState();
    final service = ref.watch(syncServiceProvider);
    final presentation = _BannerPresentation.fromState(
      modeLabel: authState.mode.label,
      skipsAuthentication: authState.mode.skipsAuthentication,
      networkStatus: networkStatus,
      syncState: syncState,
    );
    final canOpenRecovery =
        !authState.mode.skipsAuthentication &&
        (syncState.failed > 0 ||
            syncState.conflicted > 0 ||
            syncState.rejected > 0);

    return InkWell(
      onTap: canOpenRecovery
          ? () => _showRecoverySheet(context, service, syncState)
          : null,
      child: Container(
        width: double.infinity,
        color: presentation.backgroundColor,
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              presentation.icon,
              color: Colors.white.withValues(alpha: 0.9),
              size: 11,
            ),
            const SizedBox(width: 6),
            Flexible(
              child: Text(
                presentation.label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  color: Colors.white.withValues(alpha: 0.92),
                  fontWeight: FontWeight.w600,
                  fontSize: 10,
                  letterSpacing: 0.2,
                ),
              ),
            ),
            if (presentation.detail != null) ...[
              const SizedBox(width: 6),
              Flexible(
                child: Text(
                  presentation.detail!,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.72),
                    fontSize: 9,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ],
            if (canOpenRecovery) ...[
              const SizedBox(width: 8),
              Text(
                'admin.pages.purchases.index.table.manage'.tr(),
                style: TextStyle(
                  color: Colors.white.withValues(alpha: 0.9),
                  fontSize: 9,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Future<void> _showRecoverySheet(
    BuildContext context,
    SyncService service,
    SyncState syncState,
  ) async {
    final issues = await service.listIssues();
    if (!context.mounted) return;

    await showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (context) {
        final theme = Theme.of(context);
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'app.sync_recovery'.tr(),
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  syncState.conflicted > 0
                      ? 'Conflicted edits need review before they can sync cleanly.'
                      : syncState.rejected > 0
                      ? 'Rejected operations need manual correction before they can sync.'
                      : 'Failed operations stay queued on this device until they succeed or you retry them.',
                  style: theme.textTheme.bodySmall,
                ),
                const SizedBox(height: 16),
                if (issues.isEmpty)
                  Text('app.no_queued_failures'.tr())
                else
                  ...issues
                      .take(6)
                      .map(
                        (issue) => ListTile(
                          dense: true,
                          contentPadding: EdgeInsets.zero,
                          title: Text('${issue.entityType} • ${issue.action}'),
                          subtitle: Text(
                            issue.lastError?.trim().isNotEmpty == true
                                ? issue.lastError!
                                : issue.status == SyncStatus.conflicted
                                ? 'Remote data changed'
                                : issue.status == SyncStatus.rejected
                                ? 'Server rejected this operation'
                                : 'Retry count ${issue.retryCount}',
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                          trailing: issue.nextRetryAt == null
                              ? null
                              : Text(
                                  DateFormat(
                                    'HH:mm:ss',
                                  ).format(issue.nextRetryAt!),
                                  style: theme.textTheme.bodySmall,
                                ),
                        ),
                      ),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    TextButton(
                      onPressed: () => Navigator.of(context).pop(),
                      child: Text(
                        'admin.pages.cash.modals.closeSession.confirm'.tr(),
                      ),
                    ),
                    const SizedBox(width: 8),
                    FilledButton(
                      onPressed: syncState.failed == 0
                          ? null
                          : () async {
                              await service.retryFailedOperations();
                              if (context.mounted) {
                                Navigator.of(context).pop();
                              }
                            },
                      child: Text('app.retry_failed'.tr()),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _BannerPresentation {
  final Color backgroundColor;
  final IconData icon;
  final String label;
  final String? detail;

  const _BannerPresentation({
    required this.backgroundColor,
    required this.icon,
    required this.label,
    this.detail,
  });

  factory _BannerPresentation.fromState({
    required String modeLabel,
    required bool skipsAuthentication,
    required NetworkStatus networkStatus,
    required SyncState syncState,
  }) {
    if (skipsAuthentication) {
      return _BannerPresentation(
        backgroundColor: Colors.orange.shade500,
        icon: LucideIcons.database,
        label: modeLabel,
        detail: networkStatus == NetworkStatus.connected
            ? 'Cloud sync disabled'
            : 'No connection',
      );
    }

    return switch (syncState.stage) {
      SyncStage.conflicted => _BannerPresentation(
        backgroundColor: Colors.red.shade700,
        icon: LucideIcons.alertTriangle,
        label: 'app.sync_conflicted'.tr(),
        detail: '${syncState.conflicted} need review',
      ),
      SyncStage.syncing => _BannerPresentation(
        backgroundColor: Colors.blue.shade600,
        icon: LucideIcons.refreshCcw,
        label: '$modeLabel syncing',
        detail: syncState.pending > 0 ? '${syncState.pending} queued' : null,
      ),
      SyncStage.failed => _BannerPresentation(
        backgroundColor: Colors.red.shade600,
        icon: LucideIcons.alertCircle,
        label: 'app.sync_failed'.tr(),
        detail: syncState.rejected > 0
            ? '${syncState.rejected} rejected'
            : syncState.recoveryRequired > 0
            ? '${syncState.recoveryRequired} action needed'
            : syncState.nextRetryAt != null
            ? 'Retry ${DateFormat('HH:mm').format(syncState.nextRetryAt!)}'
            : '${syncState.retrying} queued retry',
      ),
      SyncStage.pending => _BannerPresentation(
        backgroundColor: networkStatus == NetworkStatus.connected
            ? Colors.teal.shade600
            : Colors.orange.shade600,
        icon: networkStatus == NetworkStatus.connected
            ? LucideIcons.clock3
            : LucideIcons.wifiOff,
        label: networkStatus == NetworkStatus.connected
            ? '$modeLabel pending'
            : 'Offline',
        detail: '${syncState.pending} pending',
      ),
      SyncStage.synced => _BannerPresentation(
        backgroundColor: networkStatus == NetworkStatus.connected
            ? Colors.green.shade600
            : Colors.orange.shade600,
        icon: networkStatus == NetworkStatus.connected
            ? LucideIcons.wifi
            : LucideIcons.wifiOff,
        label: networkStatus == NetworkStatus.connected ? modeLabel : 'Offline',
        detail: networkStatus == NetworkStatus.connected ? 'Synced' : null,
      ),
    };
  }
}
