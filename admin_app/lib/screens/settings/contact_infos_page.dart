import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../models/contact_info.dart';
import '../../repositories/contact_infos_repository.dart';
import '../../services/api_service.dart';
import '../../theme/app_theme.dart';
import '../../widgets/buttons/app_button.dart';
import '../../widgets/form/form_input.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../utils/app_toasts.dart';

class ContactInfosPage extends ConsumerStatefulWidget {
  const ContactInfosPage({super.key});

  @override
  ConsumerState<ContactInfosPage> createState() => _ContactInfosPageState();
}

class _ContactInfosPageState extends ConsumerState<ContactInfosPage> {
  static const _supportedKinds = <String>[
    'phone',
    'email',
    'address',
    'whatsapp',
    'facebook',
    'instagram',
    'tiktok',
  ];

  final Map<String, TextEditingController> _controllers = {
    for (final kind in _supportedKinds) kind: TextEditingController(),
  };

  bool _loading = true;
  bool _saving = false;
  String? _error;
  final Map<String, ContactInfo> _byKind = {};

  ContactInfosRepository get _repo =>
      ContactInfosRepository(ref.read(apiProvider));

  @override
  void initState() {
    super.initState();
    Future.microtask(_load);
  }

  @override
  void dispose() {
    for (final controller in _controllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final items = await _repo.list();
      _byKind
        ..clear()
        ..addEntries(items.map((item) => MapEntry(item.kind, item)));
      for (final kind in _supportedKinds) {
        _controllers[kind]!.text = _byKind[kind]?.value ?? '';
      }
      setState(() => _loading = false);
    } catch (e) {
      setState(() {
        _loading = false;
        _error = e.toString();
      });
    }
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      for (var i = 0; i < _supportedKinds.length; i++) {
        final kind = _supportedKinds[i];
        final value = _controllers[kind]!.text.trim();
        final existing = _byKind[kind];
        if (value.isEmpty) {
          if (existing != null) {
            await _repo.delete(existing.id);
          }
          continue;
        }

        final payload = {
          'kind': kind,
          'value': value,
          'position': i,
          'isActive': true,
        };
        if (existing != null) {
          await _repo.update(existing.id, payload);
        } else {
          await _repo.create(payload);
        }
      }

      await _load();
      if (!mounted) return;
      AppToasts.show(context, 'app.contact_info_saved'.tr());
    } catch (e) {
      if (!mounted) return;
      AppToasts.show(context, e.toString());
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    return Scaffold(
      appBar: AppBar(
        title: Text('app.contact_information'.tr()),
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
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (_error != null) ...[
              Text(_error!, style: const TextStyle(color: AppColors.red)),
              const SizedBox(height: 12),
            ],
            _FieldBlock(
              title: 'app.primary_channels'.tr(),
              children: [
                FormInput(
                  label: 'admin.pages.sales.detail.fields.customerPhone'.tr(),
                  controller: _controllers['phone']!,
                  keyboardType: TextInputType.phone,
                ),
                const SizedBox(height: 12),
                FormInput(
                  label: 'admin.pages.users.fields.email'.tr(),
                  controller: _controllers['email']!,
                  keyboardType: TextInputType.emailAddress,
                ),
                const SizedBox(height: 12),
                FormInput(
                  label: 'admin.pages.suppliers.index.table.address'.tr(),
                  controller: _controllers['address']!,
                  maxLines: 2,
                ),
              ],
            ),
            const SizedBox(height: 16),
            _FieldBlock(
              title: 'app.social_messaging'.tr(),
              children: [
                FormInput(
                  label: 'admin.contactInfosForm.kinds.whatsapp.label'.tr(),
                  controller: _controllers['whatsapp']!,
                ),
                const SizedBox(height: 12),
                FormInput(
                  label: 'admin.contactInfosForm.kinds.facebook.label'.tr(),
                  controller: _controllers['facebook']!,
                ),
                const SizedBox(height: 12),
                FormInput(
                  label: 'admin.contactInfosForm.kinds.instagram.label'.tr(),
                  controller: _controllers['instagram']!,
                ),
                const SizedBox(height: 12),
                FormInput(
                  label: 'admin.contactInfosForm.kinds.tiktok.label'.tr(),
                  controller: _controllers['tiktok']!,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _FieldBlock extends StatelessWidget {
  final String title;
  final List<Widget> children;

  const _FieldBlock({required this.title, required this.children});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surface1 : AppColors.lightSurface1,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: isDark
              ? AppColors.surfaceBorder
              : AppColors.lightSurfaceBorder,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 16),
          ...children,
        ],
      ),
    );
  }
}
