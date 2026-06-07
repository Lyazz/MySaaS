import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../../providers/store_settings_provider.dart';
import '../../widgets/buttons/app_button.dart';
import '../../widgets/form/form_input.dart';
import '../../widgets/form/form_select.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../utils/app_toasts.dart';

class StoreAppearancePage extends ConsumerStatefulWidget {
  const StoreAppearancePage({super.key});

  @override
  ConsumerState<StoreAppearancePage> createState() =>
      _StoreAppearancePageState();
}

class _StoreAppearancePageState extends ConsumerState<StoreAppearancePage> {
  final _logoUrlCtrl = TextEditingController();
  final _faviconUrlCtrl = TextEditingController();
  final _primaryColorCtrl = TextEditingController();
  final _announcementCtrl = TextEditingController();
  String _templateKey = 'modern';
  String _language = 'fr';
  bool _useBrandColor = false;
  bool _announcementScrolling = false;
  bool _loaded = false;
  bool _saving = false;

  static const _templates = <String>[
    'classic',
    'modern',
    'street',
    'cozy',
    'cyber',
    'stationnery',
    'food',
    'wellness',
    'playful',
    'activewear',
    'chrono',
    'arena',
    'maison',
  ];

  @override
  void dispose() {
    _logoUrlCtrl.dispose();
    _faviconUrlCtrl.dispose();
    _primaryColorCtrl.dispose();
    _announcementCtrl.dispose();
    super.dispose();
  }

  void _syncFromState() {
    final settings = ref.read(storeSettingsProvider).settings;
    _logoUrlCtrl.text = settings.logoUrl ?? '';
    _faviconUrlCtrl.text = settings.faviconUrl ?? '';
    _primaryColorCtrl.text = settings.primaryColor;
    _announcementCtrl.text = settings.announcementText;
    _templateKey = settings.templateKey;
    _language = settings.language;
    _useBrandColor = settings.useBrandColor;
    _announcementScrolling = settings.announcementScrolling;
    _loaded = true;
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      await ref.read(storeSettingsProvider.notifier).patch({
        'logoUrl': _logoUrlCtrl.text.trim().isEmpty
            ? null
            : _logoUrlCtrl.text.trim(),
        'faviconUrl': _faviconUrlCtrl.text.trim().isEmpty
            ? null
            : _faviconUrlCtrl.text.trim(),
        'primaryColor': _primaryColorCtrl.text.trim(),
        'useBrandColor': _useBrandColor,
        'templateKey': _templateKey,
        'announcementText': _announcementCtrl.text,
        'announcementScrolling': _announcementScrolling,
        'language': _language,
      });
      if (!mounted) return;
      AppToasts.show(context, 'app.appearance_settings_saved'.tr());
    } catch (e) {
      if (!mounted) return;
      AppToasts.show(context, e.toString());
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(storeSettingsProvider);

    if (!state.isLoading && !_loaded) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) setState(_syncFromState);
      });
    }

    return Scaffold(
      appBar: AppBar(
        title: Text('app.storefront_appearance'.tr()),
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
                children: [
                  FormInput(
                    label: 'app.logo_url'.tr(),
                    controller: _logoUrlCtrl,
                  ),
                  const SizedBox(height: 12),
                  FormInput(
                    label: 'app.favicon_url'.tr(),
                    controller: _faviconUrlCtrl,
                  ),
                  const SizedBox(height: 12),
                  FormInput(
                    label: 'app.primary_brand_color'.tr(),
                    controller: _primaryColorCtrl,
                    hint: '#4F46E5',
                  ),
                  const SizedBox(height: 12),
                  FormSelect<String>(
                    label: 'app.template'.tr(),
                    value: _templateKey,
                    items: _templates
                        .map(
                          (key) =>
                              DropdownMenuItem(value: key, child: Text(key)),
                        )
                        .toList(),
                    onChanged: (value) {
                      if (value != null) {
                        setState(() => _templateKey = value);
                      }
                    },
                  ),
                  SizedBox(height: 12),
                  FormSelect<String>(
                    label:
                        'admin.functionalSettingsForm.localization.defaultLanguage'
                            .tr(),
                    value: _language,
                    items: [
                      DropdownMenuItem(
                        value: 'fr',
                        child: Text('i18n.locales.fr'.tr()),
                      ),
                      DropdownMenuItem(
                        value: 'en',
                        child: Text('i18n.locales.en'.tr()),
                      ),
                      DropdownMenuItem(
                        value: 'ar',
                        child: Text('i18n.locales.ar'.tr()),
                      ),
                    ],
                    onChanged: (value) {
                      if (value != null) {
                        setState(() => _language = value);
                      }
                    },
                  ),
                  const SizedBox(height: 12),
                  FormInput(
                    label: 'app.announcement_text'.tr(),
                    controller: _announcementCtrl,
                    maxLines: 2,
                  ),
                  const SizedBox(height: 16),
                  SwitchListTile(
                    title: Text('app.use_brand_color_on_the_storefr'.tr()),
                    value: _useBrandColor,
                    onChanged: (value) =>
                        setState(() => _useBrandColor = value),
                  ),
                  SwitchListTile(
                    title: Text('app.scroll_announcement_bar'.tr()),
                    value: _announcementScrolling,
                    onChanged: (value) =>
                        setState(() => _announcementScrolling = value),
                  ),
                ],
              ),
            ),
    );
  }
}
