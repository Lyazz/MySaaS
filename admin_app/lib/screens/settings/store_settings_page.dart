import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../../providers/store_settings_provider.dart';
import '../../widgets/form/form_input.dart';
import '../../widgets/buttons/app_button.dart';

class StoreSettingsPage extends ConsumerStatefulWidget {
  const StoreSettingsPage({super.key});

  @override
  ConsumerState<StoreSettingsPage> createState() => _StoreSettingsPageState();
}

class _StoreSettingsPageState extends ConsumerState<StoreSettingsPage>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  bool _saving = false;
  bool _loaded = false;

  // General
  final _nameCtrl = TextEditingController();
  final _slugCtrl = TextEditingController();

  // Contact
  final _phoneCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _addressCtrl = TextEditingController();
  final _facebookCtrl = TextEditingController();
  final _instagramCtrl = TextEditingController();
  final _tiktokCtrl = TextEditingController();

  // Functional
  bool _hideOptionalAddress = false;
  bool _enableWishlist = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _nameCtrl.dispose();
    _slugCtrl.dispose();
    _phoneCtrl.dispose();
    _emailCtrl.dispose();
    _addressCtrl.dispose();
    _facebookCtrl.dispose();
    _instagramCtrl.dispose();
    _tiktokCtrl.dispose();
    super.dispose();
  }

  void _syncFromState() {
    final s = ref.read(storeSettingsProvider).settings;
    _nameCtrl.text = s.name;
    _slugCtrl.text = s.slug;
    _phoneCtrl.text = s.phone;
    _emailCtrl.text = s.email;
    _addressCtrl.text = s.address;
    _facebookCtrl.text = s.facebookUrl;
    _instagramCtrl.text = s.instagramUrl;
    _tiktokCtrl.text = s.tiktokUrl;
    _hideOptionalAddress = s.hideOptionalAddress;
    _enableWishlist = s.enableWishlist;
    _loaded = true;
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      await ref.read(storeSettingsProvider.notifier).patch({
        'name': _nameCtrl.text.trim(),
        'phone': _phoneCtrl.text.trim(),
        'email': _emailCtrl.text.trim(),
        'address': _addressCtrl.text.trim(),
        'facebookUrl': _facebookCtrl.text.trim(),
        'instagramUrl': _instagramCtrl.text.trim(),
        'tiktokUrl': _tiktokCtrl.text.trim(),
        'hideOptionalAddress': _hideOptionalAddress,
        'enableWishlist': _enableWishlist,
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Settings saved')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final settingsState = ref.watch(storeSettingsProvider);

    if (!settingsState.isLoading && !_loaded) {
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
            child: AppButton(
              label: _saving ? 'Saving...' : 'Save',
              onPressed: _saving ? null : _save,
              icon: LucideIcons.save,
            ),
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'General'),
            Tab(text: 'Contact'),
            Tab(text: 'Functional'),
          ],
        ),
      ),
      body: settingsState.isLoading
          ? const Center(child: CircularProgressIndicator())
          : TabBarView(
              controller: _tabController,
              children: [
                _buildGeneral(),
                _buildContact(),
                _buildFunctional(),
              ],
            ),
    );
  }

  Widget _buildGeneral() => SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            FormInput(label: 'Store name', controller: _nameCtrl),
            const SizedBox(height: 12),
            FormInput(
              label: 'Slug',
              controller: _slugCtrl,
              enabled: false,
            ),
          ],
        ),
      );

  Widget _buildContact() => SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            FormInput(
              label: 'Phone',
              controller: _phoneCtrl,
              keyboardType: TextInputType.phone,
            ),
            const SizedBox(height: 12),
            FormInput(
              label: 'Email',
              controller: _emailCtrl,
              keyboardType: TextInputType.emailAddress,
            ),
            const SizedBox(height: 12),
            FormInput(
              label: 'Address',
              controller: _addressCtrl,
              maxLines: 2,
            ),
            const SizedBox(height: 20),
            FormInput(label: 'Facebook URL', controller: _facebookCtrl),
            const SizedBox(height: 12),
            FormInput(label: 'Instagram URL', controller: _instagramCtrl),
            const SizedBox(height: 12),
            FormInput(label: 'TikTok URL', controller: _tiktokCtrl),
          ],
        ),
      );

  Widget _buildFunctional() => SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            SwitchListTile(
              title: const Text('Hide optional address field at checkout'),
              subtitle: const Text('Simplifies the order form for customers'),
              value: _hideOptionalAddress,
              onChanged: (v) => setState(() => _hideOptionalAddress = v),
            ),
            SwitchListTile(
              title: const Text('Enable wishlist'),
              subtitle: const Text(
                  'Allow customers to save products to a wishlist'),
              value: _enableWishlist,
              onChanged: (v) => setState(() => _enableWishlist = v),
            ),
          ],
        ),
      );
}
