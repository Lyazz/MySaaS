import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../models/license_status.dart';
import '../providers/license_provider.dart';
import '../services/license_service.dart';
import '../services/monotonic_clock.dart';

/// Explains the licence state and offers the ways out of it.
///
/// Reachable from the banner. Deliberately not a route the router forces anyone
/// onto: a locked device keeps working in read-only, and hijacking navigation
/// would take away the reading and exporting the operator is entitled to.
class LicenseScreen extends ConsumerStatefulWidget {
  const LicenseScreen({super.key});

  @override
  ConsumerState<LicenseScreen> createState() => _LicenseScreenState();
}

class _LicenseScreenState extends ConsumerState<LicenseScreen> {
  bool _checking = false;

  Future<void> _retry() async {
    setState(() => _checking = true);
    try {
      await LicenseService().heartbeat(force: true);
    } finally {
      if (mounted) setState(() => _checking = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final snapshot = ref.watch(licenseSnapshotProvider);
    final state = ref.watch(licenseStateProvider);
    final now = MonotonicClock.instance.now();
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Device licence'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.canPop() ? context.pop() : context.go('/'),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          _StatusCard(state: state, snapshot: snapshot, now: now),
          const SizedBox(height: 20),

          if (MonotonicClock.instance.isClockSuspect)
            Card(
              color: theme.colorScheme.errorContainer,
              child: const Padding(
                padding: EdgeInsets.all(16),
                child: Row(
                  children: [
                    Icon(Icons.access_time),
                    SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        "This device's clock looks wrong. Correct the date and "
                        'time, then check again.',
                      ),
                    ),
                  ],
                ),
              ),
            ),

          const SizedBox(height: 12),
          _DetailRow('Device', snapshot.deviceId ?? '—'),
          _DetailRow('Licence expires', _fmt(snapshot.licenseExpiresAt)),
          _DetailRow('Read-only after', _fmt(snapshot.graceUntil)),
          _DetailRow('Last contact', _fmt(snapshot.lastHeartbeatAt)),
          _DetailRow('Devices allowed', '${snapshot.maxDevices}'),
          if (snapshot.subscriptionIsTrialing)
            _DetailRow('Trial ends', _fmt(snapshot.trialEnd)),

          const SizedBox(height: 24),
          FilledButton.icon(
            onPressed: _checking ? null : _retry,
            icon: _checking
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.refresh),
            label: Text(_checking ? 'Checking…' : 'Check now'),
          ),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: () => context.go('/activate'),
            icon: const Icon(Icons.vpn_key_outlined),
            label: const Text('Enter an activation code'),
          ),
        ],
      ),
    );
  }

  static String _fmt(DateTime? value) {
    if (value == null) return '—';
    final local = value.toLocal();
    final d = local.day.toString().padLeft(2, '0');
    final m = local.month.toString().padLeft(2, '0');
    final h = local.hour.toString().padLeft(2, '0');
    final min = local.minute.toString().padLeft(2, '0');
    return '$d/$m/${local.year} $h:$min';
  }
}

class _StatusCard extends StatelessWidget {
  final LicenseState state;
  final LicenseSnapshot snapshot;
  final DateTime now;

  const _StatusCard({
    required this.state,
    required this.snapshot,
    required this.now,
  });

  @override
  Widget build(BuildContext context) {
    final (title, body, icon) = switch (state) {
      LicenseState.valid => (
        'Active',
        'This device is licensed and can work offline until the date below.',
        Icons.verified_outlined,
      ),
      LicenseState.grace => (
        'Expiring',
        'Connect to the internet to renew. Everything still works until the '
            'read-only date below.',
        Icons.warning_amber_rounded,
      ),
      LicenseState.lockedExpired => (
        'Read-only',
        'This device could not renew its licence in time. You can still view '
            'and export everything, and finish work that was already open. '
            'Nothing has been deleted.',
        Icons.lock_outline,
      ),
      LicenseState.lockedRevoked => (
        'Deactivated',
        snapshot.revokedReason?.trim().isNotEmpty == true
            ? 'An administrator deactivated this device: '
                  '${snapshot.revokedReason}. Your data is untouched.'
            : 'An administrator deactivated this device. Your data is untouched.',
        Icons.block,
      ),
      LicenseState.lockedSuspended => (
        'Account suspended',
        'This account is suspended. The device stays read-only until it is '
            'restored. Nothing has been deleted.',
        Icons.pause_circle_outline,
      ),
      LicenseState.unactivated => (
        'Not activated',
        'This device has not been activated yet.',
        Icons.devices_other,
      ),
    };

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, size: 28),
                const SizedBox(width: 12),
                Text(title, style: Theme.of(context).textTheme.titleLarge),
              ],
            ),
            const SizedBox(height: 12),
            Text(body, style: Theme.of(context).textTheme.bodyMedium),
          ],
        ),
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  final String label;
  final String value;

  const _DetailRow(this.label, this.value);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 150,
            child: Text(
              label,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
          ),
          Expanded(
            child: Text(value, style: Theme.of(context).textTheme.bodyMedium),
          ),
        ],
      ),
    );
  }
}
