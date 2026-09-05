import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../models/delivery_provider.dart';
import '../providers/delivery_provider.dart';
import '../providers/store_settings_provider.dart';
import '../theme/app_theme.dart';
import '../widgets/buttons/app_button.dart';
import '../widgets/delivery_credential_field.dart';
import 'package:easy_localization/easy_localization.dart';
import '../utils/app_toasts.dart';

class DeliveryScreen extends ConsumerWidget {
  const DeliveryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final deliveryState = ref.watch(deliveryProviderProvider);
    final storeSettingsState = ref.watch(storeSettingsProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textPrimary = isDark
        ? AppColors.textPrimary
        : AppColors.lightTextPrimary;
    final textMuted = isDark ? AppColors.textMuted : AppColors.lightTextMuted;
    final surface1 = isDark ? AppColors.surface1 : AppColors.lightSurface1;
    final borderColor = isDark
        ? AppColors.surfaceBorder
        : AppColors.lightSurfaceBorder;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'app.delivery_settings'.tr(),
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: textPrimary,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'app.manage_delivery_providers_and'.tr(),
            style: TextStyle(color: textMuted),
          ),
          const SizedBox(height: 20),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: surface1,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: borderColor),
            ),
            child: Row(
              children: [
                Icon(LucideIcons.store, size: 18, color: textMuted),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Allow store pickup',
                        style: TextStyle(
                          fontWeight: FontWeight.w600,
                          color: textPrimary,
                        ),
                      ),
                      Text(
                        'Let customers collect their order in person',
                        style: TextStyle(fontSize: 12, color: textMuted),
                      ),
                    ],
                  ),
                ),
                Switch(
                  value: storeSettingsState.settings.storePickupEnabled,
                  onChanged: storeSettingsState.isLoading
                      ? null
                      : (next) => ref
                            .read(storeSettingsProvider.notifier)
                            .patch({'storePickupEnabled': next}),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          if (deliveryState.isLoading && deliveryState.providers.isEmpty)
            const Center(child: CircularProgressIndicator())
          else
            Wrap(
              spacing: 16,
              runSpacing: 16,
              children: [
                for (final provider in deliveryState.providers)
                  _DeliveryProviderCard(provider: provider),
              ],
            ),
        ],
      ),
    );
  }
}

class _DeliveryProviderCard extends ConsumerStatefulWidget {
  final DeliveryProvider provider;

  const _DeliveryProviderCard({required this.provider});

  @override
  ConsumerState<_DeliveryProviderCard> createState() =>
      _DeliveryProviderCardState();
}

class _DeliveryProviderCardState extends ConsumerState<_DeliveryProviderCard> {
  bool _expanded = false;
  bool _saving = false;
  late Map<String, TextEditingController> _controllers;
  final Set<String> _clearedSecrets = {};

  @override
  void initState() {
    super.initState();
    _controllers = _buildControllers(widget.provider);
  }

  @override
  void didUpdateWidget(covariant _DeliveryProviderCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.provider.id != widget.provider.id) {
      for (final c in _controllers.values) {
        c.dispose();
      }
      _controllers = _buildControllers(widget.provider);
      _clearedSecrets.clear();
    }
  }

  Map<String, TextEditingController> _buildControllers(
    DeliveryProvider provider,
  ) {
    return {
      for (final field in provider.credentialFields)
        field.key: TextEditingController(
          text: field.secret
              ? ''
              : (provider.account?.config[field.key]?.toString() ?? ''),
        ),
    };
  }

  @override
  void dispose() {
    for (final c in _controllers.values) {
      c.dispose();
    }
    super.dispose();
  }

  bool get _hasCredentials => widget.provider.credentialFields.isNotEmpty;

  bool get _meetsRequiredFields =>
      widget.provider.credentialFields.where((f) => f.required).every((f) {
        if (f.secret) {
          final cleared = _clearedSecrets.contains(f.key);
          final typed = _controllers[f.key]!.text.trim().isNotEmpty;
          final alreadySaved = widget.provider.account?.secrets[f.key] == true;
          return typed || (alreadySaved && !cleared);
        }
        return _controllers[f.key]!.text.trim().isNotEmpty;
      });

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      final config = <String, String>{};
      for (final field in widget.provider.credentialFields) {
        final typed = _controllers[field.key]!.text.trim();
        if (!field.secret) {
          config[field.key] = typed;
          continue;
        }
        if (_clearedSecrets.contains(field.key)) {
          config[field.key] = '';
        } else if (typed.isNotEmpty) {
          config[field.key] = typed;
        }
      }

      await ref
          .read(deliveryProviderProvider.notifier)
          .saveAccount(
            widget.provider.id,
            isActive: _meetsRequiredFields,
            config: config,
          );

      if (mounted) {
        AppToasts.success(context, '${widget.provider.name} saved');
        setState(() {
          _clearedSecrets.clear();
          _expanded = false;
        });
      }
    } catch (e) {
      if (mounted) AppToasts.error(context, 'Failed to save: $e');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _setOffered(bool offered) async {
    try {
      await ref
          .read(deliveryProviderProvider.notifier)
          .setOffered(widget.provider.id, offered);
    } catch (e) {
      if (mounted) AppToasts.error(context, 'Failed to update: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final provider = widget.provider;
    final surface1 = isDark ? AppColors.surface1 : AppColors.lightSurface1;
    final surface3 = isDark ? AppColors.surface3 : AppColors.lightSurface3;
    final borderColor = isDark
        ? AppColors.surfaceBorder
        : AppColors.lightSurfaceBorder;
    final textPrimary = isDark
        ? AppColors.textPrimary
        : AppColors.lightTextPrimary;
    final textMuted = isDark ? AppColors.textMuted : AppColors.lightTextMuted;

    return Container(
      constraints: const BoxConstraints(maxWidth: 420, minWidth: 300),
      decoration: BoxDecoration(
        color: surface1,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: provider.isActive
              ? Theme.of(context).colorScheme.primary.withValues(alpha: 0.4)
              : borderColor,
          width: 2,
        ),
      ),
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: surface3,
                  borderRadius: BorderRadius.circular(12),
                ),
                alignment: Alignment.center,
                child: Text(
                  provider.name.isEmpty ? '?' : provider.name[0],
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: textPrimary,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      provider.name,
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.bold,
                        color: textPrimary,
                      ),
                    ),
                    Text(
                      provider.isActive ? 'Active' : 'Inactive',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: provider.isActive
                            ? Theme.of(context).colorScheme.primary
                            : textMuted,
                      ),
                    ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    'Offered',
                    style: TextStyle(fontSize: 10, color: textMuted),
                  ),
                  Switch(value: provider.offered, onChanged: _setOffered),
                ],
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (!_hasCredentials)
            Row(
              children: [
                Icon(LucideIcons.plugZap, size: 16, color: textMuted),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'No credentials needed for this carrier',
                    style: TextStyle(fontSize: 12, color: textMuted),
                  ),
                ),
              ],
            )
          else ...[
            AppButton.secondary(
              label: _expanded ? 'Cancel' : 'Manage connection',
              icon: _expanded ? null : LucideIcons.keyRound,
              fullWidth: true,
              onPressed: () => setState(() => _expanded = !_expanded),
            ),
            if (_expanded) ...[
              const SizedBox(height: 16),
              for (final field in provider.credentialFields)
                Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: DeliveryCredentialFieldInput(
                    field: field,
                    controller: _controllers[field.key]!,
                    isSaved: provider.account?.secrets[field.key] == true,
                    isCleared: _clearedSecrets.contains(field.key),
                    onClear: () => setState(() {
                      _clearedSecrets.add(field.key);
                      _controllers[field.key]!.clear();
                    }),
                  ),
                ),
              AppButton.primary(
                label: 'Save',
                icon: LucideIcons.save,
                fullWidth: true,
                loading: _saving,
                onPressed: _saving ? null : _save,
              ),
            ],
          ],
        ],
      ),
    );
  }
}
