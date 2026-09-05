import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:path_provider/path_provider.dart';

import '../services/database_service.dart';
import '../services/tenant_mode_service.dart';

/// Exports this workspace so a super admin can move it onto an online tier.
///
/// Replaces the old `UpgradeScreen`, which registered a brand-new tenant from
/// the device and then rewrote `tenantId` on every local table -- a cross-tenant
/// data move decided entirely by the client, against an endpoint that no longer
/// exists.
///
/// This screen deliberately does **not** upload. The migration endpoints are
/// super-admin only, which is what stops a staff account from putting its own
/// tenant on a paid tier for free. It also suits the actual situation: a tenant
/// on the offline-only tier may have no usable connection at all, so producing a
/// file the operator can hand over is more dependable than streaming batches.
class MigrationScreen extends ConsumerStatefulWidget {
  const MigrationScreen({super.key});

  @override
  ConsumerState<MigrationScreen> createState() => _MigrationScreenState();
}

/// Domains the server's importer accepts, in dependency order.
const _exportDomains = <String, String>{
  'categories': 'categories',
  'products': 'products',
  'customers': 'customers',
  'suppliers': 'suppliers',
};

class _MigrationScreenState extends ConsumerState<MigrationScreen> {
  Map<String, int>? _counts;
  String? _exportPath;
  String? _error;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _loadCounts();
  }

  String get _tenantId => TenantModeService().activeTenantId;

  Future<void> _loadCounts() async {
    setState(() {
      _busy = true;
      _error = null;
    });

    try {
      final db = await DatabaseService().database;
      final counts = <String, int>{};

      for (final entry in _exportDomains.entries) {
        final rows = await db.rawQuery(
          'SELECT COUNT(*) AS n FROM ${entry.value} WHERE tenantId = ?',
          [_tenantId],
        );
        counts[entry.key] = (rows.first['n'] as int?) ?? 0;
      }

      if (!mounted) return;
      setState(() => _counts = counts);
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _export() async {
    setState(() {
      _busy = true;
      _error = null;
      _exportPath = null;
    });

    try {
      final db = await DatabaseService().database;
      final batches = <Map<String, dynamic>>[];
      final declared = <String, int>{};

      for (final entry in _exportDomains.entries) {
        final rows = await db.query(
          entry.value,
          where: 'tenantId = ?',
          whereArgs: [_tenantId],
        );

        // Strip local bookkeeping. Ids are deliberately not sent: the server
        // keys on the tenant-scoped natural key, so a re-import is idempotent
        // and no local id can collide with something already on the server.
        final cleaned = rows.map((row) {
          final copy = Map<String, dynamic>.from(row);
          copy.remove('id');
          copy.remove('tenantId');
          copy.remove('syncStatus');
          return copy;
        }).toList();

        declared[entry.key] = cleaned.length;
        if (cleaned.isNotEmpty) {
          batches.add({'domain': entry.key, 'rows': cleaned});
        }
      }

      final payload = {
        'formatVersion': 1,
        'tenantId': _tenantId,
        'exportedAt': DateTime.now().toUtc().toIso8601String(),
        'declaredCounts': declared,
        'batches': batches,
      };

      final directory = await getApplicationDocumentsDirectory();
      final stamp = DateTime.now().toUtc().toIso8601String().replaceAll(
        ':',
        '-',
      );
      final file = File('${directory.path}/swekly-migration-$stamp.json');
      await file.writeAsString(
        const JsonEncoder.withIndent('  ').convert(payload),
      );

      if (!mounted) return;
      setState(() {
        _exportPath = file.path;
        _counts = declared;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final counts = _counts;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Move to an online plan'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.canPop() ? context.pop() : context.go('/'),
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
                  Text('How this works', style: theme.textTheme.titleMedium),
                  const SizedBox(height: 8),
                  Text(
                    'Export your shop data to a file, then send it to Swekly '
                    'support. They import it and switch your account to the '
                    'online plan.\n\n'
                    'Nothing on this device is changed or deleted. You keep '
                    'working normally until the switch is done.',
                    style: theme.textTheme.bodyMedium,
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 20),
          Text('What will be exported', style: theme.textTheme.titleMedium),
          const SizedBox(height: 8),

          if (counts == null)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 12),
              child: LinearProgressIndicator(),
            )
          else
            ...counts.entries.map(
              (entry) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Row(
                  children: [
                    SizedBox(
                      width: 140,
                      child: Text(
                        entry.key,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ),
                    Text('${entry.value}', style: theme.textTheme.bodyMedium),
                  ],
                ),
              ),
            ),

          if (_error != null) ...[
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: theme.colorScheme.errorContainer,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                _error!,
                style: TextStyle(color: theme.colorScheme.onErrorContainer),
              ),
            ),
          ],

          if (_exportPath != null) ...[
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: theme.colorScheme.primaryContainer,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Export saved',
                    style: theme.textTheme.titleSmall?.copyWith(
                      color: theme.colorScheme.onPrimaryContainer,
                    ),
                  ),
                  const SizedBox(height: 6),
                  SelectableText(
                    _exportPath!,
                    style: TextStyle(
                      fontFamily: 'monospace',
                      fontSize: 12,
                      color: theme.colorScheme.onPrimaryContainer,
                    ),
                  ),
                  const SizedBox(height: 8),
                  TextButton.icon(
                    onPressed: () async {
                      await Clipboard.setData(
                        ClipboardData(text: _exportPath!),
                      );
                      if (!context.mounted) return;
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Path copied')),
                      );
                    },
                    icon: const Icon(Icons.copy, size: 16),
                    label: const Text('Copy path'),
                  ),
                ],
              ),
            ),
          ],

          const SizedBox(height: 24),
          FilledButton.icon(
            onPressed: _busy ? null : _export,
            icon: _busy
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.download_outlined),
            label: Text(_busy ? 'Working…' : 'Export my data'),
          ),
        ],
      ),
    );
  }
}
