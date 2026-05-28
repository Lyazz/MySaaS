import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:url_launcher/url_launcher.dart';

import '../providers/store_settings_provider.dart';
import '../providers/workspace_provider.dart';
import '../theme/app_theme.dart';
import '../widgets/buttons/app_button.dart';

class StorefrontToolsScreen extends ConsumerWidget {
  final String mode;

  const StorefrontToolsScreen({super.key, required this.mode});

  String _adminBaseUrl(String apiBaseUrl) {
    final uri = Uri.parse(apiBaseUrl);
    return uri
        .replace(path: '', query: null, fragment: null)
        .toString()
        .replaceAll(RegExp(r'/$'), '');
  }

  String _pathForMode() {
    switch (mode) {
      case 'preview':
        return '/admin/preview';
      case 'builder':
        return '/admin/template-builder';
      case 'landing-builder':
        return '/admin/marketing/landing-page/new';
      default:
        return '/admin/preview';
    }
  }

  String _titleForMode() {
    switch (mode) {
      case 'preview':
        return 'Storefront Preview';
      case 'builder':
        return 'Template Builder';
      case 'landing-builder':
        return 'Landing Page Builder';
      default:
        return 'Storefront Tools';
    }
  }

  String _descriptionForMode() {
    switch (mode) {
      case 'preview':
        return 'Open the hosted storefront preview in the web admin.';
      case 'builder':
        return 'Open the existing web-based template builder.';
      case 'landing-builder':
        return 'Open the web-based marketing landing page builder.';
      default:
        return 'Open the hosted storefront tools in the web admin.';
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final workspace = ref.watch(workspaceProvider);
    final store = ref.watch(storeSettingsProvider).settings;
    final origin = _adminBaseUrl(workspace.apiBaseUrl);
    final adminToolUrl = '$origin${_pathForMode()}';
    final storefrontUrl = store.slug.isEmpty
        ? origin
        : '$origin/shop/${store.slug}';
    final isDark = Theme.of(context).brightness == Brightness.dark;

    Future<void> openUrl(String raw) async {
      final uri = Uri.tryParse(raw);
      if (uri == null) return;
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }

    return Scaffold(
      appBar: AppBar(title: Text(_titleForMode())),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 620),
            child: Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: isDark ? AppColors.surface1 : AppColors.lightSurface1,
                borderRadius: BorderRadius.circular(20),
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
                    _descriptionForMode(),
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                  const SizedBox(height: 16),
                  SelectableText(adminToolUrl),
                  const SizedBox(height: 8),
                  SelectableText(storefrontUrl),
                  const SizedBox(height: 20),
                  AppButton.primary(
                    label: 'Open Web Admin Tool',
                    onPressed: () => openUrl(adminToolUrl),
                    icon: LucideIcons.externalLink,
                    fullWidth: true,
                  ),
                  const SizedBox(height: 12),
                  AppButton.secondary(
                    label: 'Open Storefront',
                    onPressed: () => openUrl(storefrontUrl),
                    icon: LucideIcons.store,
                    fullWidth: true,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
