import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../providers/license_provider.dart';
import '../services/activation_service.dart';
import '../repositories/device_repository.dart';
import '../services/license_service.dart';

/// This device's identity, and the way back when it has no seat.
///
/// A tenant is licensed for a fixed number of devices. When the seats are taken
/// -- a replacement phone, a second counter -- the operator lands here, asks for
/// access, and an administrator decides. Without this screen the only route back
/// would be someone editing the database.
class DeviceScreen extends ConsumerStatefulWidget {
  /// Set when the user arrived from a refused login, so the screen opens on the
  /// request form rather than on the status view.
  final bool startWithRequest;

  const DeviceScreen({super.key, this.startWithRequest = false});

  @override
  ConsumerState<DeviceScreen> createState() => _DeviceScreenState();
}

class _DeviceScreenState extends ConsumerState<DeviceScreen> {
  final _reasonController = TextEditingController();

  String _hardwareId = '';
  String _deviceName = '';
  String _platform = '';

  DeviceRequest? _request;
  Timer? _pollTimer;

  bool _submitting = false;
  bool _claiming = false;
  String? _error;
  String? _notice;

  @override
  void initState() {
    super.initState();
    unawaited(_loadIdentity());
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _reasonController.dispose();
    super.dispose();
  }

  Future<void> _loadIdentity() async {
    final info = ref.read(deviceInfoProvider);
    final id = await info.getHardwareId();
    if (!mounted) return;

    setState(() {
      _hardwareId = id;
      _deviceName = info.getDeviceDisplayName();
      _platform = info.getPlatformType();
    });
  }

  Future<void> _submitRequest() async {
    setState(() {
      _submitting = true;
      _error = null;
      _notice = null;
    });

    try {
      final request = await ref
          .read(deviceRepositoryProvider)
          .requestAccess(reason: _reasonController.text);

      if (!mounted) return;
      setState(() {
        _request = request;
        _notice = 'Request sent. An administrator will review it.';
      });
      _startPolling();
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = _readable(error));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  void _startPolling() {
    _pollTimer?.cancel();
    final request = _request;
    if (request == null || !request.isPending) return;

    // A decision is a human action, so a slow poll is right: fast enough that
    // the operator is not left staring, slow enough not to hammer the server
    // from a shop counter left open all day.
    _pollTimer = Timer.periodic(const Duration(seconds: 20), (_) async {
      await _refreshRequest();
    });
  }

  Future<void> _refreshRequest() async {
    final request = _request;
    if (request == null) return;

    try {
      final updated = await ref
          .read(deviceRepositoryProvider)
          .pollRequest(request.id);

      if (!mounted || updated == null) return;

      setState(() => _request = updated);

      if (updated.isApproved && updated.claimCode != null) {
        _pollTimer?.cancel();
        await _claim(updated.claimCode!);
      } else if (updated.isDenied) {
        _pollTimer?.cancel();
      }
    } catch (_) {
      // Transient: keep polling rather than surfacing a scary error for a
      // dropped request on a shop's connection.
    }
  }

  Future<void> _claim(String claimCode) async {
    setState(() {
      _claiming = true;
      _error = null;
    });

    try {
      final repository = ref.read(deviceRepositoryProvider);
      final token = await repository.claim(claimCode);

      // Verified locally, then handed to the licence engine so the window and
      // the workspace binding update together.
      await repository.decodeLicence(token);
      await LicenseService().applyActivationToken(token);

      if (!mounted) return;
      setState(() => _notice = 'This device is now activated.');
      context.go('/login');
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = _readable(error));
    } finally {
      if (mounted) setState(() => _claiming = false);
    }
  }

  static String _readable(Object error) {
    final text = error.toString();
    return text.replaceFirst('Exception: ', '');
  }

  static String _mask(String value) {
    if (value.length <= 12) return value;
    return '${value.substring(0, 6)}…${value.substring(value.length - 6)}';
  }

  @override
  Widget build(BuildContext context) {
    final snapshot = ref.watch(licenseSnapshotProvider);
    final theme = Theme.of(context);
    final request = _request;

    return Scaffold(
      appBar: AppBar(
        title: const Text('This device'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () =>
              context.canPop() ? context.pop() : context.go('/login'),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Identity', style: theme.textTheme.titleMedium),
                  const SizedBox(height: 12),
                  _row('Name', _deviceName.isEmpty ? '…' : _deviceName),
                  _row('Platform', _platform.isEmpty ? '…' : _platform),
                  _row(
                    'Fingerprint',
                    _hardwareId.isEmpty ? '…' : _mask(_hardwareId),
                  ),
                  if (snapshot.deviceId != null)
                    _row('Registered as', _mask(snapshot.deviceId!)),
                  _row('Devices allowed', '${snapshot.maxDevices}'),
                ],
              ),
            ),
          ),

          const SizedBox(height: 16),

          if (_error != null)
            _Banner(
              text: _error!,
              background: theme.colorScheme.errorContainer,
              foreground: theme.colorScheme.onErrorContainer,
            ),
          if (_notice != null)
            _Banner(
              text: _notice!,
              background: theme.colorScheme.primaryContainer,
              foreground: theme.colorScheme.onPrimaryContainer,
            ),

          const SizedBox(height: 8),

          if (request == null || request.isDenied) ...[
            Text(
              request?.isDenied == true
                  ? 'Your last request was declined.'
                  : 'Ask an administrator to activate this device.',
              style: theme.textTheme.bodyMedium,
            ),
            if (request?.decisionNote?.trim().isNotEmpty == true) ...[
              const SizedBox(height: 6),
              Text(
                'Reason given: ${request!.decisionNote}',
                style: theme.textTheme.bodySmall,
              ),
            ],
            const SizedBox(height: 12),
            TextField(
              controller: _reasonController,
              maxLines: 2,
              decoration: const InputDecoration(
                labelText: 'Why do you need this device? (optional)',
                hintText: 'e.g. the old terminal was damaged',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 12),
            FilledButton.icon(
              onPressed: _submitting ? null : _submitRequest,
              icon: _submitting
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.send_outlined),
              label: Text(_submitting ? 'Sending…' : 'Request access'),
            ),
          ] else if (request.isPending) ...[
            Row(
              children: [
                const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Waiting for an administrator to approve this device.',
                    style: theme.textTheme.bodyMedium,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: _refreshRequest,
              icon: const Icon(Icons.refresh),
              label: const Text('Check now'),
            ),
          ] else if (request.isApproved) ...[
            Text(
              _claiming
                  ? 'Activating this device…'
                  : 'Approved. Finishing activation…',
              style: theme.textTheme.bodyMedium,
            ),
          ],

          const SizedBox(height: 24),
          TextButton(
            onPressed: () => context.go('/activate'),
            child: const Text('I have an activation code instead'),
          ),
        ],
      ),
    );
  }

  Widget _row(String label, String value) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 4),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 130,
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

class _Banner extends StatelessWidget {
  final String text;
  final Color background;
  final Color foreground;

  const _Banner({
    required this.text,
    required this.background,
    required this.foreground,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Text(text, style: TextStyle(color: foreground, fontSize: 13)),
    );
  }
}
