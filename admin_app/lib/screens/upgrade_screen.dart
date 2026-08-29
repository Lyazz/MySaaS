import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../services/database_service.dart';
import '../services/tenant_mode_service.dart';
import '../theme/app_theme.dart';
import '../widgets/buttons/app_button.dart';
import 'package:easy_localization/easy_localization.dart';

class UpgradeScreen extends ConsumerStatefulWidget {
  const UpgradeScreen({super.key});

  @override
  ConsumerState<UpgradeScreen> createState() => _UpgradeScreenState();
}

class _UpgradeScreenState extends ConsumerState<UpgradeScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _slugController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _phoneController = TextEditingController();

  bool _isUpgrading = false;
  String? _error;

  @override
  void dispose() {
    _nameController.dispose();
    _slugController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _performUpgrade() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isUpgrading = true;
      _error = null;
    });

    try {
      // 1. Gather all local offline data from SQLite (old tenant)
      final oldTenantId = TenantModeService().activeTenantId;
      final db = await DatabaseService().database;

      final products = await db.query(
        'products',
        where: 'tenantId = ?',
        whereArgs: [oldTenantId],
      );
      final categories = await db.query(
        'categories',
        where: 'tenantId = ?',
        whereArgs: [oldTenantId],
      );
      final customers = await db.query(
        'customers',
        where: 'tenantId = ?',
        whereArgs: [oldTenantId],
      );
      final orders = await db.query(
        'orders',
        where: 'tenantId = ?',
        whereArgs: [oldTenantId],
      );

      final payload = {
        'products': products,
        'categories': categories,
        'customers': customers,
        'orders': orders,
      };

      // 2. Register the new online tenant
      final newTenantName = await ref
          .read(authProvider.notifier)
          .register(
            name: _nameController.text.trim(),
            slug: _slugController.text.trim(),
            email: _emailController.text.trim(),
            password: _passwordController.text,
            phone: _phoneController.text.trim(),
          );

      if (newTenantName == null) {
        throw Exception('Registration failed.');
      }

      // 3. The authProvider.register automatically logged us in.
      // So we can now call the SyncService to push the payload to POST /api/sync/upgrade

      // We will do it directly via ApiService to POST /api/sync/upgrade
      final apiService = ref.read(apiProvider);
      await apiService.client.post('/sync/upgrade', data: payload);

      // 4. Update the local database to map the old records to the new tenant ID
      final newTenantId = TenantModeService().activeTenantId;
      await db.transaction((txn) async {
        const tables = [
          'products',
          'categories',
          'customers',
          'orders',
          'sales',
          'sync_queue',
        ];
        for (final table in tables) {
          await txn.update(
            table,
            {'tenantId': newTenantId},
            where: 'tenantId = ?',
            whereArgs: [oldTenantId],
          );
        }
      });

      if (!mounted) return;
      context.go('/');
    } catch (e) {
      setState(() {
        _error = e.toString().replaceAll('Exception: ', '');
      });
    } finally {
      if (mounted) {
        setState(() => _isUpgrading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textPrimary = isDark
        ? AppColors.textPrimary
        : AppColors.lightTextPrimary;
    final textSecondary = isDark
        ? AppColors.textSecondary
        : AppColors.lightTextSecondary;

    return Scaffold(
      appBar: AppBar(
        title: Text('app.upgrade_to_online_tier'.tr()),
        elevation: 0,
      ),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 480),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Icon(
                    LucideIcons.cloudLightning,
                    size: 64,
                    color: AppColors.blue,
                  ),
                  const SizedBox(height: 24),
                  Text(
                    'app.create_your_online_account'.tr(),
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: textPrimary,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'app.your_offline_data_will_automat'.tr(),
                    style: TextStyle(color: textSecondary),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 32),
                  if (_error != null) ...[
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.red.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: AppColors.red.withValues(alpha: 0.28),
                        ),
                      ),
                      child: Text(
                        _error!,
                        style: const TextStyle(color: AppColors.red),
                      ),
                    ),
                    const SizedBox(height: 24),
                  ],
                  TextFormField(
                    controller: _nameController,
                    decoration: InputDecoration(
                      labelText: 'admin.pages.onboarding.storeInfo.nameLabel'
                          .tr(),
                      border: OutlineInputBorder(),
                    ),
                    validator: (v) => v!.isEmpty ? 'Required' : null,
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _slugController,
                    decoration: InputDecoration(
                      labelText: 'app.store_url_slug'.tr(),
                      border: OutlineInputBorder(),
                      prefixText: 'app.swekly_com2'.tr(),
                    ),
                    validator: (v) => v!.isEmpty ? 'Required' : null,
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _emailController,
                    decoration: InputDecoration(
                      labelText: 'app.admin_email'.tr(),
                      border: OutlineInputBorder(),
                    ),
                    keyboardType: TextInputType.emailAddress,
                    validator: (v) => v!.isEmpty ? 'Required' : null,
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _phoneController,
                    decoration: InputDecoration(
                      labelText: 'app.admin_phone'.tr(),
                      border: OutlineInputBorder(),
                    ),
                    keyboardType: TextInputType.phone,
                    validator: (v) => v!.isEmpty ? 'Required' : null,
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _passwordController,
                    decoration: InputDecoration(
                      labelText: 'superAdmin.login.form.password.label'.tr(),
                      border: OutlineInputBorder(),
                    ),
                    obscureText: true,
                    validator: (v) =>
                        (v?.length ?? 0) < 8 ? 'Min 8 chars' : null,
                  ),
                  const SizedBox(height: 32),
                  AppButton.primary(
                    label: _isUpgrading ? 'Upgrading...' : 'Upgrade Now',
                    icon: LucideIcons.upload,
                    onPressed: _isUpgrading ? null : _performUpgrade,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
