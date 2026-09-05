import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../models/license_status.dart';
import '../providers/license_provider.dart';

/// Surfaces the licence state above the app shell.
///
/// Sits beside `OfflineBanner` and says something deliberately different:
/// offline is a connectivity fact, this is an entitlement one. Conflating them
/// would tell an offline-but-licensed shop that something is wrong when nothing
/// is.
class LicenseBanner extends ConsumerWidget {
  const LicenseBanner({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final snapshot = ref.watch(licenseSnapshotProvider);
    final state = ref.watch(licenseStateProvider);

    // Valid and unactivated both render nothing: unactivated devices are sent to
    // the activation screen by the router, so a banner would be noise.
    if (state == LicenseState.valid || state == LicenseState.unactivated) {
      // A trial still deserves a countdown, even while perfectly healthy.
      final trialDays = snapshot.trialDaysRemainingAt(DateTime.now().toUtc());
      if (trialDays == null) return const SizedBox.shrink();

      return _Banner(
        icon: Icons.schedule,
        tone: trialDays <= 3 ? _Tone.warning : _Tone.info,
        message: trialDays == 0
            ? 'Trial ends today'
            : 'Trial — $trialDays ${trialDays == 1 ? 'day' : 'days'} left',
        actionLabel: 'View',
        onAction: () => context.go('/license'),
      );
    }

    switch (state) {
      case LicenseState.grace:
        final remaining = snapshot.remainingAt(DateTime.now().toUtc());
        final days = remaining == null ? 0 : remaining.inDays;
        return _Banner(
          icon: Icons.warning_amber_rounded,
          tone: _Tone.warning,
          message: days <= 0
              ? 'Licence expires today — connect to renew'
              : 'Licence expired — $days ${days == 1 ? 'day' : 'days'} before this device becomes read-only',
          actionLabel: 'Renew',
          onAction: () => context.go('/license'),
        );

      case LicenseState.lockedRevoked:
        return _Banner(
          icon: Icons.block,
          tone: _Tone.danger,
          message: snapshot.revokedReason?.trim().isNotEmpty == true
              ? 'This device was deactivated: ${snapshot.revokedReason}'
              : 'This device was deactivated by an administrator',
          actionLabel: 'Details',
          onAction: () => context.go('/license'),
        );

      case LicenseState.lockedSuspended:
        return _Banner(
          icon: Icons.pause_circle_outline,
          tone: _Tone.danger,
          message: 'This account is suspended — read-only until it is restored',
          actionLabel: 'Details',
          onAction: () => context.go('/license'),
        );

      case LicenseState.lockedExpired:
        return _Banner(
          icon: Icons.lock_outline,
          tone: _Tone.danger,
          // Says plainly that nothing was lost. That is the single most
          // important thing an operator needs to know at this moment.
          message: 'Read-only — connect to renew. Your data is safe.',
          actionLabel: 'Renew',
          onAction: () => context.go('/license'),
        );

      case LicenseState.valid:
      case LicenseState.unactivated:
        return const SizedBox.shrink();
    }
  }
}

enum _Tone { info, warning, danger }

class _Banner extends StatelessWidget {
  final IconData icon;
  final _Tone tone;
  final String message;
  final String actionLabel;
  final VoidCallback onAction;

  const _Banner({
    required this.icon,
    required this.tone,
    required this.message,
    required this.actionLabel,
    required this.onAction,
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    final (background, foreground) = switch (tone) {
      _Tone.info => (scheme.primaryContainer, scheme.onPrimaryContainer),
      _Tone.warning => (const Color(0xFFFEF3C7), const Color(0xFF92400E)),
      _Tone.danger => (scheme.errorContainer, scheme.onErrorContainer),
    };

    return Material(
      color: background,
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Row(
            children: [
              Icon(icon, size: 18, color: foreground),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  message,
                  style: TextStyle(
                    color: foreground,
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              TextButton(
                onPressed: onAction,
                style: TextButton.styleFrom(
                  foregroundColor: foreground,
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  minimumSize: const Size(0, 32),
                ),
                child: Text(actionLabel),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
