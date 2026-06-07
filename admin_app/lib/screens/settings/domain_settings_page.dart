import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../../models/custom_domain.dart';
import '../../repositories/custom_domains_repository.dart';
import '../../services/api_service.dart';
import '../../widgets/buttons/app_button.dart';
import '../../widgets/form/form_input.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../utils/app_toasts.dart';

class DomainSettingsPage extends ConsumerStatefulWidget {
  const DomainSettingsPage({super.key});

  @override
  ConsumerState<DomainSettingsPage> createState() => _DomainSettingsPageState();
}

class _DomainSettingsPageState extends ConsumerState<DomainSettingsPage> {
  final _domainCtrl = TextEditingController();
  bool _loading = true;
  bool _saving = false;
  String? _error;
  String _cnameTarget = '';
  String _tenantSubdomain = '';
  List<CustomDomain> _domains = const [];

  CustomDomainsRepository get _repo =>
      CustomDomainsRepository(ref.read(apiProvider));

  @override
  void initState() {
    super.initState();
    Future.microtask(_load);
  }

  @override
  void dispose() {
    _domainCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final snapshot = await _repo.list();
      setState(() {
        _domains = snapshot.domains;
        _cnameTarget = snapshot.cnameTarget;
        _tenantSubdomain = snapshot.tenantSubdomain;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _loading = false;
        _error = e.toString();
      });
    }
  }

  Future<void> _create() async {
    final domain = _domainCtrl.text.trim();
    if (domain.isEmpty) return;
    setState(() => _saving = true);
    try {
      await _repo.create(domain);
      _domainCtrl.clear();
      await _load();
    } catch (e) {
      if (!mounted) return;
      AppToasts.show(context, e.toString());
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _delete(String id) async {
    await _repo.delete(id);
    await _load();
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    return Scaffold(
      appBar: AppBar(title: Text('app.custom_domains'.tr())),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (_error != null) ...[Text(_error!), const SizedBox(height: 12)],
            Text(
              'app.point_your_cname_record_to'.tr(),
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 6),
            SelectableText(_cnameTarget),
            const SizedBox(height: 4),
            SelectableText('Tenant subdomain: $_tenantSubdomain'),
            const SizedBox(height: 20),
            Row(
              children: [
                Expanded(
                  child: FormInput(
                    label: 'app.new_domain'.tr(),
                    controller: _domainCtrl,
                    hint: 'www.example.com',
                  ),
                ),
                const SizedBox(width: 12),
                AppButton.primary(
                  label: _saving ? 'Adding...' : 'Add',
                  onPressed: _saving ? null : _create,
                  icon: LucideIcons.plus,
                ),
              ],
            ),
            const SizedBox(height: 20),
            ..._domains.map(
              (domain) => Card(
                child: ListTile(
                  title: Text(domain.domain),
                  subtitle: Text(domain.cnameTarget),
                  trailing: IconButton(
                    onPressed: () => _delete(domain.id),
                    icon: const Icon(LucideIcons.trash2),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
