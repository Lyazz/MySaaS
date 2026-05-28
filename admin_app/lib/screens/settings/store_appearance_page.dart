import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../../providers/store_settings_provider.dart';
import '../../widgets/buttons/app_button.dart';
import '../../widgets/form/form_input.dart';
import '../../widgets/form/form_select.dart';

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
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Appearance settings saved')),
      );
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

    if (!state.isLoading && !_loaded) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) setState(_syncFromState);
      });
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Storefront Appearance'),
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
                  FormInput(label: 'Logo URL', controller: _logoUrlCtrl),
                  const SizedBox(height: 12),
                  FormInput(label: 'Favicon URL', controller: _faviconUrlCtrl),
                  const SizedBox(height: 12),
                  FormInput(
                    label: 'Primary brand color',
                    controller: _primaryColorCtrl,
                    hint: '#4F46E5',
                  ),
                  const SizedBox(height: 12),
                  FormSelect<String>(
                    label: 'Template',
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
                  const SizedBox(height: 12),
                  FormSelect<String>(
                    label: 'Default language',
                    value: _language,
                    items: const [
                      DropdownMenuItem(value: 'fr', child: Text('French')),
                      DropdownMenuItem(value: 'en', child: Text('English')),
                      DropdownMenuItem(value: 'ar', child: Text('Arabic')),
                    ],
                    onChanged: (value) {
                      if (value != null) {
                        setState(() => _language = value);
                      }
                    },
                  ),
                  const SizedBox(height: 12),
                  FormInput(
                    label: 'Announcement text',
                    controller: _announcementCtrl,
                    maxLines: 2,
                  ),
                  const SizedBox(height: 16),
                  SwitchListTile(
                    title: const Text('Use brand color on the storefront'),
                    value: _useBrandColor,
                    onChanged: (value) =>
                        setState(() => _useBrandColor = value),
                  ),
                  SwitchListTile(
                    title: const Text('Scroll announcement bar'),
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
