import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../../models/homepage_settings.dart';
import '../../repositories/homepage_settings_repository.dart';
import '../../services/api_service.dart';
import '../../widgets/buttons/app_button.dart';
import '../../widgets/form/form_input.dart';
import 'package:easy_localization/easy_localization.dart';

class HomepageSettingsPage extends ConsumerStatefulWidget {
  const HomepageSettingsPage({super.key});

  @override
  ConsumerState<HomepageSettingsPage> createState() =>
      _HomepageSettingsPageState();
}

class _HomepageSettingsPageState extends ConsumerState<HomepageSettingsPage> {
  final _slideTitleCtrl = TextEditingController();
  final _slideSubtitleCtrl = TextEditingController();
  final _slideImageCtrl = TextEditingController();
  final _slideButtonTextCtrl = TextEditingController();
  final _slideButtonHrefCtrl = TextEditingController();
  final _browseEyebrowCtrl = TextEditingController();
  final _browseTitleCtrl = TextEditingController();
  final _arrivalsEyebrowCtrl = TextEditingController();
  final _arrivalsTitleCtrl = TextEditingController();
  final _arrivalsLimitCtrl = TextEditingController();
  final _bestEyebrowCtrl = TextEditingController();
  final _bestTitleCtrl = TextEditingController();
  final _bestLimitCtrl = TextEditingController();

  bool _browseEnabled = true;
  bool _arrivalsEnabled = true;
  bool _bestEnabled = false;
  bool _loading = true;
  bool _saving = false;
  String? _error;
  HomepageSettings? _settings;

  HomepageSettingsRepository get _repo =>
      HomepageSettingsRepository(ref.read(apiProvider));

  @override
  void initState() {
    super.initState();
    Future.microtask(_load);
  }

  @override
  void dispose() {
    _slideTitleCtrl.dispose();
    _slideSubtitleCtrl.dispose();
    _slideImageCtrl.dispose();
    _slideButtonTextCtrl.dispose();
    _slideButtonHrefCtrl.dispose();
    _browseEyebrowCtrl.dispose();
    _browseTitleCtrl.dispose();
    _arrivalsEyebrowCtrl.dispose();
    _arrivalsTitleCtrl.dispose();
    _arrivalsLimitCtrl.dispose();
    _bestEyebrowCtrl.dispose();
    _bestTitleCtrl.dispose();
    _bestLimitCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final settings = await _repo.get();
      _settings = settings;
      final slide = settings.carousel.isNotEmpty
          ? settings.carousel.first
          : const HomepageSlide(imageUrl: '', title: '');
      _slideTitleCtrl.text = slide.title;
      _slideSubtitleCtrl.text = slide.subtitle;
      _slideImageCtrl.text = slide.imageUrl;
      _slideButtonTextCtrl.text = slide.buttonText;
      _slideButtonHrefCtrl.text = slide.buttonHref;
      _browseEyebrowCtrl.text = settings.browseByCategory.eyebrow;
      _browseTitleCtrl.text = settings.browseByCategory.title;
      _arrivalsEyebrowCtrl.text = settings.newArrivals.eyebrow;
      _arrivalsTitleCtrl.text = settings.newArrivals.title;
      _arrivalsLimitCtrl.text = (settings.newArrivals.limit ?? 6).toString();
      _bestEyebrowCtrl.text = settings.bestSellers.eyebrow;
      _bestTitleCtrl.text = settings.bestSellers.title;
      _bestLimitCtrl.text = (settings.bestSellers.limit ?? 6).toString();
      _browseEnabled = settings.browseByCategory.enabled;
      _arrivalsEnabled = settings.newArrivals.enabled;
      _bestEnabled = settings.bestSellers.enabled;
      setState(() => _loading = false);
    } catch (e) {
      setState(() {
        _loading = false;
        _error = e.toString();
      });
    }
  }

  Future<void> _save() async {
    if (_settings == null) return;
    setState(() => _saving = true);
    try {
      final existingCarousel = _settings!.carousel.toList();
      final firstSlide = HomepageSlide(
        imageUrl: _slideImageCtrl.text.trim(),
        title: _slideTitleCtrl.text.trim(),
        subtitle: _slideSubtitleCtrl.text.trim(),
        buttonText: _slideButtonTextCtrl.text.trim(),
        buttonHref: _slideButtonHrefCtrl.text.trim(),
      );
      if (existingCarousel.isEmpty) {
        existingCarousel.add(firstSlide);
      } else {
        existingCarousel[0] = firstSlide;
      }

      _settings = await _repo.patch({
        'carousel': existingCarousel.map((item) => item.toJson()).toList(),
        'sections': {
          'browseByCategory': {
            'enabled': _browseEnabled,
            'eyebrow': _browseEyebrowCtrl.text.trim(),
            'title': _browseTitleCtrl.text.trim(),
          },
          'newArrivals': {
            'enabled': _arrivalsEnabled,
            'eyebrow': _arrivalsEyebrowCtrl.text.trim(),
            'title': _arrivalsTitleCtrl.text.trim(),
            'limit': int.tryParse(_arrivalsLimitCtrl.text.trim()) ?? 6,
          },
          'bestSellers': {
            'enabled': _bestEnabled,
            'eyebrow': _bestEyebrowCtrl.text.trim(),
            'title': _bestTitleCtrl.text.trim(),
            'limit': int.tryParse(_bestLimitCtrl.text.trim()) ?? 6,
          },
        },
      });
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text( 'app.homepage_settings_saved'.tr())));
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
    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    return Scaffold(
      appBar: AppBar(
        title: Text( 'admin.pages.settings.homepage.title'.tr()),
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
          children: [
            if (_error != null) ...[Text(_error!), const SizedBox(height: 12)],
            FormInput(label: 'app.hero_image_url'.tr(), controller: _slideImageCtrl),
            const SizedBox(height: 12),
            FormInput(label: 'app.hero_title'.tr(), controller: _slideTitleCtrl),
            const SizedBox(height: 12),
            FormInput(
              label: 'app.hero_subtitle'.tr(),
              controller: _slideSubtitleCtrl,
              maxLines: 2,
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: FormInput(
                    label: 'app.hero_button_text'.tr(),
                    controller: _slideButtonTextCtrl,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: FormInput(
                    label: 'app.hero_button_link'.tr(),
                    controller: _slideButtonHrefCtrl,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            _HomepageSectionCard(
              title: 'admin.homepageSettingsForm.sections.browseByCategory.title'.tr(),
              enabled: _browseEnabled,
              onChanged: (value) => setState(() => _browseEnabled = value),
              eyebrowController: _browseEyebrowCtrl,
              titleController: _browseTitleCtrl,
            ),
            const SizedBox(height: 16),
            _HomepageSectionCard(
              title: 'admin.homepageSettingsForm.sections.newArrivals.title'.tr(),
              enabled: _arrivalsEnabled,
              onChanged: (value) => setState(() => _arrivalsEnabled = value),
              eyebrowController: _arrivalsEyebrowCtrl,
              titleController: _arrivalsTitleCtrl,
              limitController: _arrivalsLimitCtrl,
            ),
            const SizedBox(height: 16),
            _HomepageSectionCard(
              title: 'admin.homepageSettingsForm.sections.bestSellers.title'.tr(),
              enabled: _bestEnabled,
              onChanged: (value) => setState(() => _bestEnabled = value),
              eyebrowController: _bestEyebrowCtrl,
              titleController: _bestTitleCtrl,
              limitController: _bestLimitCtrl,
            ),
          ],
        ),
      ),
    );
  }
}

class _HomepageSectionCard extends StatelessWidget {
  final String title;
  final bool enabled;
  final ValueChanged<bool> onChanged;
  final TextEditingController eyebrowController;
  final TextEditingController titleController;
  final TextEditingController? limitController;

  const _HomepageSectionCard({
    required this.title,
    required this.enabled,
    required this.onChanged,
    required this.eyebrowController,
    required this.titleController,
    this.limitController,
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
        children: [
          SwitchListTile(
            title: Text(title),
            value: enabled,
            onChanged: onChanged,
          ),
          FormInput(label: 'app.eyebrow'.tr(), controller: eyebrowController),
          const SizedBox(height: 12),
          FormInput(label: 'admin.pages.categories.index.sort.title'.tr(), controller: titleController),
          if (limitController != null) ...[
            const SizedBox(height: 12),
            FormInput(
              label: 'admin.homepageSettingsForm.fields.limit'.tr(),
              controller: limitController!,
              keyboardType: TextInputType.number,
            ),
          ],
        ],
      ),
    );
  }
}
