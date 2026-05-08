import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../models/integration.dart';
import '../providers/integrations_provider.dart';
import '../widgets/form/form_input.dart';
import '../widgets/buttons/app_button.dart';
import '../theme/app_theme.dart';

class IntegrationsScreen extends ConsumerWidget {
  const IntegrationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(integrationsProvider);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Integrations',
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.w600,
              color: Color(0xFF0F172A),
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            'Connect third-party services to your store',
            style: TextStyle(fontSize: 14, color: Color(0xFF64748B)),
          ),
          const SizedBox(height: 24),
          if (state.isLoading)
            const Center(child: CircularProgressIndicator())
          else
            Wrap(
              spacing: 16,
              runSpacing: 16,
              children: [
                _IntegrationCard(
                  integration: state.facebook,
                  name: 'Facebook Pixel',
                  description:
                      'Track conversions and retarget customers via Facebook Ads.',
                  icon: LucideIcons.facebook,
                  iconColor: const Color(0xFF3B82F6),
                  iconBg: const Color(0xFFEFF6FF),
                  configFields: const [
                    _FieldDef(
                        key: 'pixelId', label: 'Pixel ID', hint: '1234567890'),
                    _FieldDef(
                        key: 'accessToken',
                        label: 'Conversion API Token',
                        hint: 'EAA...'),
                  ],
                ),
                _IntegrationCard(
                  integration: state.telegram,
                  name: 'Telegram Notifications',
                  description:
                      'Receive new order alerts directly in a Telegram chat.',
                  icon: LucideIcons.send,
                  iconColor: const Color(0xFF0EA5E9),
                  iconBg: const Color(0xFFE0F2FE),
                  configFields: const [
                    _FieldDef(
                        key: 'botToken',
                        label: 'Bot Token',
                        hint: '110201543:AAHd...'),
                    _FieldDef(
                        key: 'chatId', label: 'Chat ID', hint: '-100123456'),
                  ],
                ),
              ],
            ),
        ],
      ),
    );
  }
}

class _FieldDef {
  final String key;
  final String label;
  final String hint;

  const _FieldDef({
    required this.key,
    required this.label,
    required this.hint,
  });
}

class _IntegrationCard extends ConsumerStatefulWidget {
  final Integration integration;
  final String name;
  final String description;
  final IconData icon;
  final Color iconColor;
  final Color iconBg;
  final List<_FieldDef> configFields;

  const _IntegrationCard({
    required this.integration,
    required this.name,
    required this.description,
    required this.icon,
    required this.iconColor,
    required this.iconBg,
    required this.configFields,
  });

  @override
  ConsumerState<_IntegrationCard> createState() => _IntegrationCardState();
}

class _IntegrationCardState extends ConsumerState<_IntegrationCard> {
  bool _expanded = false;
  bool _saving = false;
  late final Map<String, TextEditingController> _controllers;

  @override
  void initState() {
    super.initState();
    _controllers = {
      for (final f in widget.configFields)
        f.key: TextEditingController(
          text: widget.integration.config[f.key]?.toString() ?? '',
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

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      final config = {
        for (final f in widget.configFields)
          f.key: _controllers[f.key]!.text.trim(),
        'isActive': true,
      };
      await ref
          .read(integrationsProvider.notifier)
          .save(widget.integration.provider, config);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('${widget.name} saved')),
        );
        setState(() => _expanded = false);
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
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isActive = widget.integration.isActive;

    return Container(
      constraints: const BoxConstraints(maxWidth: 480, minWidth: 300),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surface1 : AppColors.lightSurface1,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: isDark ? AppColors.surfaceBorder : AppColors.lightSurfaceBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(20),
            child: Row(
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: widget.iconBg,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(widget.icon, color: widget.iconColor, size: 24),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        widget.name,
                        style: const TextStyle(
                            fontWeight: FontWeight.w600, fontSize: 15),
                      ),
                      Text(
                        widget.description,
                        style: const TextStyle(
                            fontSize: 12, color: Color(0xFF64748B)),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: isActive
                        ? const Color(0xFFD1FAE5)
                        : const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    isActive ? 'Active' : 'Inactive',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w500,
                      color: isActive
                          ? const Color(0xFF059669)
                          : const Color(0xFF94A3B8),
                    ),
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
            child: OutlinedButton(
              onPressed: () => setState(() => _expanded = !_expanded),
              child: Text(_expanded
                  ? 'Cancel'
                  : (isActive ? 'Manage' : 'Connect')),
            ),
          ),
          if (_expanded) ...[
            const Divider(height: 1),
            Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                children: [
                  ...widget.configFields.map(
                    (f) => Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: FormInput(
                        label: f.label,
                        controller: _controllers[f.key]!,
                        hint: f.hint,
                      ),
                    ),
                  ),
                  AppButton(
                    label: _saving ? 'Saving...' : 'Save',
                    onPressed: _saving ? null : _save,
                    icon: LucideIcons.save,
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}
