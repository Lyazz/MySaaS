import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../models/app_mode.dart';
import '../providers/auth_provider.dart';
import '../providers/settings_provider.dart';
import '../providers/workspace_provider.dart';
import '../theme/app_theme.dart';
import '../utils/feature_access.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final settingsState = ref.watch(settingsProvider);
    final notifier = ref.read(settingsProvider.notifier);
    final workspace = ref.watch(workspaceProvider);
    final auth = ref.watch(authProvider);
    final isOfflineTier = auth.mode == AppMode.offlineOnly;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final surface1 = isDark ? AppColors.surface1 : AppColors.lightSurface1;
    final borderColor = isDark
        ? AppColors.surfaceBorder
        : AppColors.lightSurfaceBorder;
    final textPrimary = isDark
        ? AppColors.textPrimary
        : AppColors.lightTextPrimary;
    final textMuted = isDark ? AppColors.textMuted : AppColors.lightTextMuted;

    Widget section(String title, List<Widget> children) => Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title.toUpperCase(),
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w700,
            color: textMuted,
            letterSpacing: 1,
          ),
        ),
        const SizedBox(height: 12),
        Container(
          decoration: BoxDecoration(
            color: surface1,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: borderColor),
          ),
          child: Column(children: children),
        ),
      ],
    );

    Widget tile({
      required String title,
      required String subtitle,
      required IconData icon,
      String? route,
      OnlineTierFeature? lockedFeature,
      bool enabled = true,
    }) {
      final locked =
          lockedFeature != null &&
          FeatureAccess.isLockedForMode(auth.mode, lockedFeature);

      return ListTile(
        enabled: enabled && !locked,
        title: Text(
          title,
          style: TextStyle(
            fontWeight: FontWeight.w600,
            color: locked ? textMuted : textPrimary,
          ),
        ),
        subtitle: Text(
          locked ? '$subtitle\nAvailable on online tiers.' : subtitle,
          style: TextStyle(color: textMuted, height: 1.35),
        ),
        leading: Icon(icon, color: locked ? textMuted : AppColors.brand),
        trailing: Icon(
          locked ? LucideIcons.lock : LucideIcons.chevronRight,
          size: 18,
          color: textMuted,
        ),
        onTap: route == null
            ? null
            : () => context.push(
                locked ? '/locked/${lockedFeature.name}' : route,
              ),
      );
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Settings',
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.w700,
              color: textPrimary,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            'Manage local admin preferences, operational settings, and hosted storefront access.',
            style: TextStyle(fontSize: 14, color: textMuted),
          ),
          const SizedBox(height: 24),
          section('App', [
            SwitchListTile(
              title: Text(
                'Dark Mode',
                style: TextStyle(
                  fontWeight: FontWeight.w600,
                  color: textPrimary,
                ),
              ),
              subtitle: Text(
                'Enable the dark admin theme.',
                style: TextStyle(color: textMuted),
              ),
              value: settingsState.themeMode == ThemeMode.dark,
              onChanged: (_) => notifier.toggleTheme(),
            ),
            Divider(height: 1, color: borderColor),
            ListTile(
              title: Text(
                'Provisioned workspace',
                style: TextStyle(
                  fontWeight: FontWeight.w600,
                  color: textPrimary,
                ),
              ),
              subtitle: Text(
                '${workspace.apiBaseUrl}\nManaged by secure provisioning.',
                style: TextStyle(color: textMuted, height: 1.35),
              ),
              leading: const Icon(
                LucideIcons.shieldCheck,
                color: AppColors.brand,
              ),
            ),
            Divider(height: 1, color: borderColor),
            tile(
              title: 'Printers',
              subtitle: 'Manage receipt and device printing.',
              icon: LucideIcons.printer,
              route: '/settings/printers',
            ),
          ]),
          const SizedBox(height: 24),
          section('Admin Operations', [
            tile(
              title: 'Store Settings',
              subtitle:
                  'Order prefixes, checkout rules, and operational defaults.',
              icon: LucideIcons.store,
              route: '/settings/store',
            ),
            Divider(height: 1, color: borderColor),
            tile(
              title: 'Contact Information',
              subtitle: 'Manage phone, email, address, and social links.',
              icon: LucideIcons.contact,
              route: '/settings/contact',
            ),
            Divider(height: 1, color: borderColor),
            tile(
              title: 'Setup Checklist',
              subtitle: 'Track onboarding progress for this tenant.',
              icon: LucideIcons.clipboardCheck,
              route: '/onboarding',
            ),
          ]),
          const SizedBox(height: 24),
          section('Hosted Storefront', [
            tile(
              title: 'Appearance',
              subtitle: 'Theme, logo, color, language, and announcement bar.',
              icon: LucideIcons.palette,
              route: '/settings/appearance',
              lockedFeature: OnlineTierFeature.appearance,
            ),
            Divider(height: 1, color: borderColor),
            tile(
              title: 'Homepage',
              subtitle: 'Hero carousel and storefront homepage sections.',
              icon: LucideIcons.layoutTemplate,
              route: '/settings/homepage',
              lockedFeature: OnlineTierFeature.homepage,
            ),
            Divider(height: 1, color: borderColor),
            tile(
              title: 'Legal Pages',
              subtitle: 'Terms, privacy, returns, and public contact pages.',
              icon: LucideIcons.fileText,
              route: '/settings/legal',
              lockedFeature: OnlineTierFeature.legal,
            ),
            Divider(height: 1, color: borderColor),
            tile(
              title: 'Custom Domains',
              subtitle: 'Attach a custom domain to the hosted storefront.',
              icon: LucideIcons.globe,
              route: '/settings/domains',
              lockedFeature: OnlineTierFeature.domains,
            ),
            Divider(height: 1, color: borderColor),
            tile(
              title: 'Storefront Preview',
              subtitle: 'Open the existing hosted storefront preview.',
              icon: LucideIcons.monitorPlay,
              route: '/storefront/preview',
              lockedFeature: OnlineTierFeature.preview,
            ),
            Divider(height: 1, color: borderColor),
            tile(
              title: 'Template Builder',
              subtitle: 'Open the web-based template builder.',
              icon: LucideIcons.layoutGrid,
              route: '/storefront/builder',
              lockedFeature: OnlineTierFeature.builder,
            ),
            Divider(height: 1, color: borderColor),
            tile(
              title: 'Landing Page Builder',
              subtitle: 'Open the web-based marketing landing page builder.',
              icon: LucideIcons.brush,
              route: '/storefront/landing-builder',
              lockedFeature: OnlineTierFeature.landingBuilder,
            ),
          ]),
          const SizedBox(height: 24),
          section('Cloud', [
            tile(
              title: 'Integrations',
              subtitle: 'Cloud-connected integrations and notifications.',
              icon: LucideIcons.plug,
              route: '/integrations',
              lockedFeature: OnlineTierFeature.integrations,
            ),
            Divider(height: 1, color: borderColor),
            tile(
              title: 'Billing & Subscription',
              subtitle: 'Usage, plans, and payment submission.',
              icon: LucideIcons.creditCard,
              route: '/billing',
              lockedFeature: OnlineTierFeature.billing,
            ),
          ]),
          if (isOfflineTier) ...[
            const SizedBox(height: 20),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.brand.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: AppColors.brand.withValues(alpha: 0.14),
                ),
              ),
              child: Text(
                'This tenant is provisioned for offline-only operation. Hosted storefront and cloud features stay visible here but remain locked until the tenant upgrades to an online tier.',
                style: TextStyle(color: textPrimary, height: 1.45),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
