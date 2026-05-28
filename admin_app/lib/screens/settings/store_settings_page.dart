import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../../providers/store_settings_provider.dart';
import '../../theme/app_theme.dart';
import '../../widgets/buttons/app_button.dart';
import '../../widgets/form/form_input.dart';

class StoreSettingsPage extends ConsumerStatefulWidget {
  const StoreSettingsPage({super.key});

  @override
  ConsumerState<StoreSettingsPage> createState() => _StoreSettingsPageState();
}

class _StoreSettingsPageState extends ConsumerState<StoreSettingsPage> {
  final _nameCtrl = TextEditingController();
  final _slugCtrl = TextEditingController();
  final _currencyCodeCtrl = TextEditingController();
  final _currencyCountryCtrl = TextEditingController();
  final _orderIdPrefixCtrl = TextEditingController();
  final _minimumOrderAmountCtrl = TextEditingController();
  bool _cartEnabled = true;
  bool _codEnabled = true;
  bool _hideOptionalAddress = false;
  bool _loaded = false;
  bool _saving = false;

  @override
  void dispose() {
    _nameCtrl.dispose();
    _slugCtrl.dispose();
    _currencyCodeCtrl.dispose();
    _currencyCountryCtrl.dispose();
    _orderIdPrefixCtrl.dispose();
    _minimumOrderAmountCtrl.dispose();
    super.dispose();
  }

  void _syncFromState() {
    final settings = ref.read(storeSettingsProvider).settings;
    _nameCtrl.text = settings.name;
    _slugCtrl.text = settings.slug;
    _currencyCodeCtrl.text = settings.currencyCode;
    _currencyCountryCtrl.text = settings.currencyCountry;
    _orderIdPrefixCtrl.text = settings.orderIdPrefix;
    _minimumOrderAmountCtrl.text = settings.minimumOrderAmountDzd.toString();
    _cartEnabled = settings.cartEnabled;
    _codEnabled = settings.codEnabled;
    _hideOptionalAddress = settings.hideOptionalAddress;
    _loaded = true;
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      await ref.read(storeSettingsProvider.notifier).patch({
        'name': _nameCtrl.text.trim(),
        'currencyCode': _currencyCodeCtrl.text.trim().toUpperCase(),
        'currencyCountry': _currencyCountryCtrl.text.trim().toUpperCase(),
        'orderIdPrefix': _orderIdPrefixCtrl.text.trim().toUpperCase(),
        'minimumOrderAmountDzd':
            int.tryParse(_minimumOrderAmountCtrl.text.trim()) ?? 0,
        'cartEnabled': _cartEnabled,
        'codEnabled': _codEnabled,
        'hideOptionalAddress': _hideOptionalAddress,
      });
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Store settings saved')));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(storeSettingsProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final surface = isDark ? AppColors.surface1 : AppColors.lightSurface1;
    final borderColor = isDark
        ? AppColors.surfaceBorder
        : AppColors.lightSurfaceBorder;
    final textPrimary = isDark
        ? AppColors.textPrimary
        : AppColors.lightTextPrimary;
    final textMuted = isDark ? AppColors.textMuted : AppColors.lightTextMuted;

    if (!state.isLoading && !_loaded) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) setState(_syncFromState);
      });
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Store Settings'),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: AppButton.primary(
              label: _saving ? 'Saving...' : 'Save',
              onPressed: _saving ? null : _save,
              icon: LucideIcons.save,
            ),
          ),
        ],
      ),
      body: state.isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _SectionCard(
                    title: 'Store Identity',
                    description:
                        'Operational settings used across orders and admin flows.',
                    child: Column(
                      children: [
                        FormInput(label: 'Store name', controller: _nameCtrl),
                        const SizedBox(height: 12),
                        FormInput(
                          label: 'Store slug',
                          controller: _slugCtrl,
                          enabled: false,
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Expanded(
                              child: FormInput(
                                label: 'Currency code',
                                controller: _currencyCodeCtrl,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: FormInput(
                                label: 'Currency country',
                                controller: _currencyCountryCtrl,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  _SectionCard(
                    title: 'Checkout Rules',
                    description:
                        'Configure default order behavior for local and online admin flows.',
                    child: Column(
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: FormInput(
                                label: 'Order ID prefix',
                                controller: _orderIdPrefixCtrl,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: FormInput(
                                label: 'Minimum order amount (DZD)',
                                controller: _minimumOrderAmountCtrl,
                                keyboardType: TextInputType.number,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        SwitchListTile(
                          title: const Text('Enable cart'),
                          subtitle: Text(
                            'Allow storefront visitors to build a cart before checkout.',
                            style: TextStyle(color: textMuted),
                          ),
                          value: _cartEnabled,
                          onChanged: (value) =>
                              setState(() => _cartEnabled = value),
                        ),
                        SwitchListTile(
                          title: const Text('Enable cash on delivery'),
                          subtitle: Text(
                            'Keep COD ordering active for the storefront.',
                            style: TextStyle(color: textMuted),
                          ),
                          value: _codEnabled,
                          onChanged: (value) =>
                              setState(() => _codEnabled = value),
                        ),
                        SwitchListTile(
                          title: const Text('Hide optional address field'),
                          subtitle: Text(
                            'Simplify checkout when detailed address is not required.',
                            style: TextStyle(color: textMuted),
                          ),
                          value: _hideOptionalAddress,
                          onChanged: (value) =>
                              setState(() => _hideOptionalAddress = value),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: surface,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: borderColor),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(LucideIcons.shieldCheck, size: 18),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            'Provisioning and workspace binding are managed outside this screen. Workspace URLs are no longer editable from normal app settings.',
                            style: TextStyle(
                              fontSize: 13,
                              height: 1.45,
                              color: textPrimary,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  final String title;
  final String description;
  final Widget child;

  const _SectionCard({
    required this.title,
    required this.description,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final surface = isDark ? AppColors.surface1 : AppColors.lightSurface1;
    final borderColor = isDark
        ? AppColors.surfaceBorder
        : AppColors.lightSurfaceBorder;
    final textPrimary = isDark
        ? AppColors.textPrimary
        : AppColors.lightTextPrimary;
    final textMuted = isDark ? AppColors.textMuted : AppColors.lightTextMuted;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: textPrimary,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            description,
            style: TextStyle(fontSize: 13, height: 1.45, color: textMuted),
          ),
          const SizedBox(height: 18),
          child,
        ],
      ),
    );
  }
}
