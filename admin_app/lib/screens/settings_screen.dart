import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../providers/auth_provider.dart';
import '../providers/settings_provider.dart';
import '../providers/workspace_provider.dart';
import '../widgets/form/form_input.dart';
import '../widgets/dialogs/app_dialog.dart';
import '../theme/app_theme.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final settingsState = ref.watch(settingsProvider);
    final notifier = ref.read(settingsProvider.notifier);
    final workspace = ref.watch(workspaceProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final surface1 = isDark ? AppColors.surface1 : AppColors.lightSurface1;
    final borderColor = isDark ? AppColors.surfaceBorder : AppColors.lightSurfaceBorder;
    final textPrimary = isDark ? AppColors.textPrimary : AppColors.lightTextPrimary;
    final textMuted = isDark ? AppColors.textMuted : AppColors.lightTextMuted;

    Widget card(List<Widget> children) => Container(
          decoration: BoxDecoration(
            color: surface1,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: borderColor),
            boxShadow: isDark
                ? null
                : [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.02),
                      blurRadius: 10,
                      offset: const Offset(0, 2),
                    ),
                  ],
          ),
          child: Column(children: children),
        );

    Widget iconBadge({required IconData icon, required Color bg, required Color fg}) =>
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(10)),
          child: Icon(icon, color: fg, size: 20),
        );

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'App Settings',
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.w600,
              letterSpacing: -0.5,
              color: textPrimary,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Manage your application preferences',
            style: TextStyle(fontSize: 14, color: textMuted),
          ),
          const SizedBox(height: 32),
          _sectionHeader('App Settings', textMuted),
          const SizedBox(height: 16),
          card([
            SwitchListTile(
              title: Text('Dark Mode', style: TextStyle(fontWeight: FontWeight.w500, color: textPrimary)),
              subtitle: Text('Enable dark theme for the application', style: TextStyle(color: textMuted)),
              secondary: iconBadge(
                icon: LucideIcons.moon,
                bg: isDark ? const Color(0xFF2D1B52) : const Color(0xFFFAE8FF),
                fg: isDark ? const Color(0xFFD8B4FE) : Colors.purple,
              ),
              activeThumbColor: AppColors.brandContrast,
              activeTrackColor: AppColors.brand,
              value: settingsState.themeMode == ThemeMode.dark,
              onChanged: (_) => notifier.toggleTheme(),
            ),
          ]),
          const SizedBox(height: 32),
          _sectionHeader('Notifications', textMuted),
          const SizedBox(height: 16),
          card([
            SwitchListTile(
              title: Text('Push Notifications', style: TextStyle(fontWeight: FontWeight.w500, color: textPrimary)),
              subtitle: Text('Receive alerts for new orders and low stock', style: TextStyle(color: textMuted)),
              secondary: iconBadge(
                icon: LucideIcons.bell,
                bg: isDark ? AppColors.redSurface : const Color(0xFFFEE2E2),
                fg: isDark ? AppColors.redText : Colors.red,
              ),
              activeThumbColor: AppColors.brandContrast,
              activeTrackColor: AppColors.brand,
              value: settingsState.notificationsEnabled,
              onChanged: notifier.toggleNotifications,
            ),
          ]),
          const SizedBox(height: 32),
          _sectionHeader('General', textMuted),
          const SizedBox(height: 16),
          card([
            ListTile(
              title: Text('Workspace', style: TextStyle(fontWeight: FontWeight.w500, color: textPrimary)),
              subtitle: Text(workspace.apiBaseUrl, style: TextStyle(color: textMuted)),
              leading: iconBadge(
                icon: LucideIcons.link,
                bg: isDark ? AppColors.blueSurface : const Color(0xFFDBEAFE),
                fg: isDark ? AppColors.blueText : Colors.blue,
              ),
              trailing: Icon(LucideIcons.chevronRight, size: 20, color: textMuted),
              onTap: () async {
                final controller = TextEditingController(text: workspace.apiBaseUrl);
                final ok = await showDialog<bool>(
                  context: context,
                  builder: (ctx) => AppDialog(
                    title: 'Workspace URL',
                    description: 'Change the API base URL used by this admin app.',
                    content: FormInput(
                      label: 'Workspace URL',
                      controller: controller,
                      hint: 'https://your-tenant.platform.com',
                    ),
                    secondaryLabel: 'Cancel',
                    onSecondary: () => Navigator.of(ctx).pop(false),
                    primaryLabel: 'Save',
                    onPrimary: () => Navigator.of(ctx).pop(true),
                  ),
                );
                if (ok != true) return;
                try {
                  await ref.read(workspaceProvider.notifier).setWorkspaceUrl(controller.text);
                } catch (e) {
                  if (!context.mounted) return;
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
                }
              },
            ),
            Divider(height: 1, color: borderColor),
            ListTile(
              title: Text('Currency', style: TextStyle(fontWeight: FontWeight.w500, color: textPrimary)),
              subtitle: Text(settingsState.currency, style: TextStyle(color: textMuted)),
              leading: iconBadge(
                icon: LucideIcons.dollarSign,
                bg: isDark ? AppColors.greenSurface : const Color(0xFFDCFCE7),
                fg: isDark ? AppColors.greenText : Colors.green,
              ),
              trailing: Icon(LucideIcons.chevronRight, size: 20, color: textMuted),
              onTap: () {},
            ),
            Divider(height: 1, color: borderColor),
            ListTile(
              title: Text('Printers', style: TextStyle(fontWeight: FontWeight.w500, color: textPrimary)),
              subtitle: Text('Manage receipt printers', style: TextStyle(color: textMuted)),
              leading: iconBadge(
                icon: LucideIcons.printer,
                bg: isDark ? AppColors.amberSurface : const Color(0xFFFFEDD5),
                fg: isDark ? AppColors.amberText : Colors.orange,
              ),
              trailing: Icon(LucideIcons.chevronRight, size: 20, color: textMuted),
              onTap: () => context.go('/settings/printers'),
            ),
            Divider(height: 1, color: borderColor),
            ListTile(
              title: Text('Store Settings', style: TextStyle(fontWeight: FontWeight.w500, color: textPrimary)),
              subtitle: Text('Name, contact info, functional options', style: TextStyle(color: textMuted)),
              leading: iconBadge(
                icon: LucideIcons.store,
                bg: isDark ? AppColors.greenSurface : const Color(0xFFD1FAE5),
                fg: isDark ? AppColors.greenText : Colors.green,
              ),
              trailing: Icon(LucideIcons.chevronRight, size: 20, color: textMuted),
              onTap: () => context.push('/settings/store'),
            ),
            Divider(height: 1, color: borderColor),
            ListTile(
              title: Text('Setup Checklist', style: TextStyle(fontWeight: FontWeight.w500, color: textPrimary)),
              subtitle: Text('Track your store setup progress', style: TextStyle(color: textMuted)),
              leading: iconBadge(
                icon: LucideIcons.clipboardCheck,
                bg: isDark ? AppColors.greenSurface : const Color(0xFFD1FAE5),
                fg: isDark ? AppColors.greenText : Colors.green,
              ),
              trailing: Icon(LucideIcons.chevronRight, size: 20, color: textMuted),
              onTap: () => context.push('/onboarding'),
            ),
            Divider(height: 1, color: borderColor),
            ListTile(
              title: Text('Language', style: TextStyle(fontWeight: FontWeight.w500, color: textPrimary)),
              subtitle: Text('English (US)', style: TextStyle(color: textMuted)),
              leading: iconBadge(
                icon: LucideIcons.languages,
                bg: isDark ? AppColors.blueSurface : const Color(0xFFDBEAFE),
                fg: isDark ? AppColors.blueText : Colors.blue,
              ),
              trailing: Icon(LucideIcons.chevronRight, size: 20, color: textMuted),
              onTap: () {},
            ),
          ]),
          const SizedBox(height: 32),
          _sectionHeader('Account', textMuted),
          const SizedBox(height: 16),
          card([
            ListTile(
              title: const Text('Log Out', style: TextStyle(fontWeight: FontWeight.w500, color: Colors.red)),
              leading: iconBadge(
                icon: LucideIcons.logOut,
                bg: isDark ? AppColors.redSurface : const Color(0xFFFEE2E2),
                fg: isDark ? AppColors.redText : Colors.red,
              ),
              onTap: () {
                ref.read(authProvider.notifier).logout();
                context.go('/login');
              },
            ),
          ]),
        ],
      ),
    );
  }

  Widget _sectionHeader(String title, Color color) {
    return Text(
      title.toUpperCase(),
      style: TextStyle(
        fontSize: 12,
        fontWeight: FontWeight.w600,
        color: color,
        letterSpacing: 1,
      ),
    );
  }
}
