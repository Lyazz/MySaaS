import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../models/subscription_tier.dart';
import '../providers/auth_provider.dart';
import '../providers/settings_provider.dart';
import '../providers/workspace_provider.dart';
import '../theme/app_theme.dart';
import '../utils/feature_access.dart';
import 'package:easy_localization/easy_localization.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final settingsState = ref.watch(settingsProvider);
    final notifier = ref.read(settingsProvider.notifier);
    final workspace = ref.watch(workspaceProvider);
    final auth = ref.watch(authProvider);
    final isOfflineTier = !auth.subscriptionTier.unlocksHostedFeatures;
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
          FeatureAccess.isLockedForTier(auth.subscriptionTier, lockedFeature);

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
          Text( 'admin.tours.sidebar.steps.settings.title'.tr(),
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.w700,
              color: textPrimary,
            ),
          ),
          const SizedBox(height: 6),
          Text( 'app.manage_local_admin_preferences'.tr(),
            style: TextStyle(fontSize: 14, color: textMuted),
          ),
          const SizedBox(height: 24),
          section('App', [
            SwitchListTile(
              title: Text( 'app.dark_mode'.tr(),
                style: TextStyle(
                  fontWeight: FontWeight.w600,
                  color: textPrimary,
                ),
              ),
              subtitle: Text( 'app.enable_the_dark_admin_theme'.tr(),
                style: TextStyle(color: textMuted),
              ),
              value: settingsState.themeMode == ThemeMode.dark,
              onChanged: (_) => notifier.toggleTheme(),
            ),
            Divider(height: 1, color: borderColor),
            ListTile(
              title: Text( 'app.provisioned_workspace'.tr(),
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
            ListTile(
              title: Text( 'app.reprovision_workspace'.tr(),
                style: TextStyle(
                  fontWeight: FontWeight.w600,
                  color: textPrimary,
                ),
              ),
              subtitle: Text( 'app.clear_local_tenant_data_on_thi'.tr(),
                style: TextStyle(color: textMuted, height: 1.35),
              ),
              leading: const Icon(LucideIcons.rotateCcw, color: AppColors.red),
              trailing: Icon(
                LucideIcons.chevronRight,
                size: 18,
                color: textMuted,
              ),
              onTap: () async {
                final confirm = await showDialog<bool>(
                  context: context,
                  builder: (dialogContext) => AlertDialog(
                    title: Text( 'app.reprovision_workspace'.tr()),
                    content: Text( 'app.this_clears_the_local_workspac'.tr(),
                    ),
                    actions: [
                      TextButton(
                        onPressed: () => Navigator.of(dialogContext).pop(false),
                        child: Text( 'admin.common.cancel'.tr()),
                      ),
                      FilledButton(
                        onPressed: () => Navigator.of(dialogContext).pop(true),
                        child: Text( 'app.clear_and_reprovision'.tr()),
                      ),
                    ],
                  ),
                );

                if (confirm != true || !context.mounted) return;
                await ref
                    .read(authProvider.notifier)
                    .logout(clearProvisioning: true);
                if (!context.mounted) return;
                context.go('/activate');
              },
            ),
            Divider(height: 1, color: borderColor),
            tile(
              title: 'app.printers'.tr(),
              subtitle: 'app.manage_receipt_and_device_prin'.tr(),
              icon: LucideIcons.printer,
              route: '/settings/printers',
            ),
          ]),
          const SizedBox(height: 24),
          section('Admin Operations', [
            tile(
              title: 'app.store_settings'.tr(),
              subtitle: 'app.order_prefixes_checkout_rules'.tr(),
              icon: LucideIcons.store,
              route: '/settings/store',
            ),
            Divider(height: 1, color: borderColor),
            tile(
              title: 'app.contact_information'.tr(),
              subtitle: 'app.manage_phone_email_address_and'.tr(),
              icon: LucideIcons.contact,
              route: '/settings/contact',
            ),
            Divider(height: 1, color: borderColor),
            tile(
              title: 'app.setup_checklist'.tr(),
              subtitle: 'app.track_onboarding_progress_for'.tr(),
              icon: LucideIcons.clipboardCheck,
              route: '/onboarding',
            ),
          ]),
          const SizedBox(height: 24),
          section('Hosted Storefront', [
            tile(
              title: 'admin.tours.settings.steps.appearance.title'.tr(),
              subtitle: 'app.theme_logo_color_language_and'.tr(),
              icon: LucideIcons.palette,
              route: '/settings/appearance',
              lockedFeature: OnlineTierFeature.appearance,
            ),
            Divider(height: 1, color: borderColor),
            tile(
              title: 'admin.pages.settings.homepage.metaTitle'.tr(),
              subtitle: 'app.hero_carousel_and_storefront_h'.tr(),
              icon: LucideIcons.layoutTemplate,
              route: '/settings/homepage',
              lockedFeature: OnlineTierFeature.homepage,
            ),
            Divider(height: 1, color: borderColor),
            tile(
              title: 'admin.settingsHub.links.legal'.tr(),
              subtitle: 'app.terms_privacy_returns_and_publ'.tr(),
              icon: LucideIcons.fileText,
              route: '/settings/legal',
              lockedFeature: OnlineTierFeature.legal,
            ),
            Divider(height: 1, color: borderColor),
            tile(
              title: 'app.custom_domains'.tr(),
              subtitle: 'app.attach_a_custom_domain_to_the'.tr(),
              icon: LucideIcons.globe,
              route: '/settings/domains',
              lockedFeature: OnlineTierFeature.domains,
            ),
            Divider(height: 1, color: borderColor),
            tile(
              title: 'app.storefront_preview'.tr(),
              subtitle: 'app.open_the_existing_hosted_store'.tr(),
              icon: LucideIcons.monitorPlay,
              route: '/storefront/preview',
              lockedFeature: OnlineTierFeature.preview,
            ),
            Divider(height: 1, color: borderColor),
            tile(
              title: 'app.template_builder'.tr(),
              subtitle: 'app.open_the_web_based_template_bu'.tr(),
              icon: LucideIcons.layoutGrid,
              route: '/storefront/builder',
              lockedFeature: OnlineTierFeature.builder,
            ),
            Divider(height: 1, color: borderColor),
            tile(
              title: 'app.landing_page_builder'.tr(),
              subtitle: 'app.open_the_web_based_marketing_l'.tr(),
              icon: LucideIcons.brush,
              route: '/storefront/landing-builder',
              lockedFeature: OnlineTierFeature.landingBuilder,
            ),
          ]),
          const SizedBox(height: 24),
          section('Cloud', [
            tile(
              title: 'admin.settingsHub.links.integrations'.tr(),
              subtitle: 'app.cloud_connected_integrations_a'.tr(),
              icon: LucideIcons.plug,
              route: '/integrations',
              lockedFeature: OnlineTierFeature.integrations,
            ),
            Divider(height: 1, color: borderColor),
            tile(
              title: 'app.billing_subscription'.tr(),
              subtitle: 'app.usage_plans_and_payment_submis2'.tr(),
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
              child: Text( 'app.this_tenant_is_on_an_offline_o'.tr(),
                style: TextStyle(color: textPrimary, height: 1.45),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
