import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../../providers/store_settings_provider.dart';
import '../../widgets/buttons/app_button.dart';
import '../../widgets/form/form_input.dart';
import '../../widgets/form/form_select.dart';
import 'package:easy_localization/easy_localization.dart';

class LegalPagesPage extends ConsumerStatefulWidget {
  const LegalPagesPage({super.key});

  @override
  ConsumerState<LegalPagesPage> createState() => _LegalPagesPageState();
}

class _LegalPagesPageState extends ConsumerState<LegalPagesPage> {
  static const _pages = <String>['terms', 'privacy', 'returns', 'contact'];

  String _pageKey = 'terms';
  bool _enabled = false;
  bool _loaded = false;
  bool _saving = false;

  final _titleFrCtrl = TextEditingController();
  final _titleEnCtrl = TextEditingController();
  final _titleArCtrl = TextEditingController();
  final _contentFrCtrl = TextEditingController();
  final _contentEnCtrl = TextEditingController();
  final _contentArCtrl = TextEditingController();

  @override
  void dispose() {
    _titleFrCtrl.dispose();
    _titleEnCtrl.dispose();
    _titleArCtrl.dispose();
    _contentFrCtrl.dispose();
    _contentEnCtrl.dispose();
    _contentArCtrl.dispose();
    super.dispose();
  }

  void _syncFromState() {
    final settings = ref.read(storeSettingsProvider).settings;
    final legalPages = settings.legalPages;
    final page = legalPages[_pageKey] is Map
        ? Map<String, dynamic>.from(legalPages[_pageKey] as Map)
        : const <String, dynamic>{};
    final title = page['title'] is Map
        ? Map<String, dynamic>.from(page['title'] as Map)
        : const <String, dynamic>{};
    final content = page['content'] is Map
        ? Map<String, dynamic>.from(page['content'] as Map)
        : const <String, dynamic>{};
    _enabled = page['enabled'] == true;
    _titleFrCtrl.text = title['fr']?.toString() ?? '';
    _titleEnCtrl.text = title['en']?.toString() ?? '';
    _titleArCtrl.text = title['ar']?.toString() ?? '';
    _contentFrCtrl.text = content['fr']?.toString() ?? '';
    _contentEnCtrl.text = content['en']?.toString() ?? '';
    _contentArCtrl.text = content['ar']?.toString() ?? '';
    _loaded = true;
  }

  Map<String, dynamic> _mergedPayload() {
    final settings = ref.read(storeSettingsProvider).settings;
    final payload = Map<String, dynamic>.from(settings.legalPages);
    payload[_pageKey] = {
      'enabled': _enabled,
      'title': {
        'fr': _titleFrCtrl.text,
        'en': _titleEnCtrl.text,
        'ar': _titleArCtrl.text,
      },
      'content': {
        'fr': _contentFrCtrl.text,
        'en': _contentEnCtrl.text,
        'ar': _contentArCtrl.text,
      },
    };
    return payload;
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      await ref.read(storeSettingsProvider.notifier).patch({
        'legalPages': _mergedPayload(),
      });
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text( 'app.legal_pages_saved'.tr())));
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
        title: Text( 'admin.settingsHub.links.legal'.tr()),
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
                  FormSelect<String>(
                    label: 'app.page'.tr(),
                    value: _pageKey,
                    items: _pages
                        .map(
                          (key) =>
                              DropdownMenuItem(value: key, child: Text(key)),
                        )
                        .toList(),
                    onChanged: (value) {
                      if (value == null) return;
                      setState(() {
                        _pageKey = value;
                        _loaded = false;
                      });
                    },
                  ),
                  const SizedBox(height: 12),
                  SwitchListTile(
                    title: Text( 'app.publish_this_legal_page'.tr()),
                    value: _enabled,
                    onChanged: (value) => setState(() => _enabled = value),
                  ),
                  const SizedBox(height: 12),
                  _LocalizedBlock(
                    title: 'app.titles'.tr(),
                    frController: _titleFrCtrl,
                    enController: _titleEnCtrl,
                    arController: _titleArCtrl,
                    multiline: false,
                  ),
                  const SizedBox(height: 16),
                  _LocalizedBlock(
                    title: 'app.content'.tr(),
                    frController: _contentFrCtrl,
                    enController: _contentEnCtrl,
                    arController: _contentArCtrl,
                    multiline: true,
                  ),
                ],
              ),
            ),
    );
  }
}

class _LocalizedBlock extends StatelessWidget {
  final String title;
  final TextEditingController frController;
  final TextEditingController enController;
  final TextEditingController arController;
  final bool multiline;

  const _LocalizedBlock({
    required this.title,
    required this.frController,
    required this.enController,
    required this.arController,
    required this.multiline,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0x1A64748B)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 16),
          FormInput(
            label: 'i18n.locales.fr'.tr(),
            controller: frController,
            maxLines: multiline ? 5 : 1,
          ),
          const SizedBox(height: 12),
          FormInput(
            label: 'i18n.locales.en'.tr(),
            controller: enController,
            maxLines: multiline ? 5 : 1,
          ),
          const SizedBox(height: 12),
          FormInput(
            label: 'i18n.locales.ar'.tr(),
            controller: arController,
            maxLines: multiline ? 5 : 1,
          ),
        ],
      ),
    );
  }
}
