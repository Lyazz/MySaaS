import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../providers/auth_provider.dart';
import '../providers/settings_provider.dart';
import '../providers/workspace_provider.dart';
import '../widgets/form/form_input.dart';
import '../widgets/dialogs/app_dialog.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final settingsState = ref.watch(settingsProvider);
    final notifier = ref.read(settingsProvider.notifier);
    final workspace = ref.watch(workspaceProvider);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'App Settings',
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.w600,
              letterSpacing: -0.5,
              color: Color(0xFF0F172A),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Manage your application preferences',
            style: TextStyle(fontSize: 14, color: Colors.grey[500]),
          ),
          const SizedBox(height: 32),
          _buildSectionHeader('App Settings'),
          const SizedBox(height: 16),
          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.grey[200]!),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.02),
                  blurRadius: 10,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Column(
              children: [
                SwitchListTile(
                  title: const Text(
                    'Dark Mode',
                    style: TextStyle(fontWeight: FontWeight.w500),
                  ),
                  subtitle: const Text('Enable dark theme for the application'),
                  secondary: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFAE8FF), // Purple 50
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(
                      LucideIcons.moon,
                      color: Colors.purple,
                      size: 20,
                    ),
                  ),
                  value: settingsState.themeMode == ThemeMode.dark,
                  onChanged: (value) {
                    notifier.toggleTheme();
                  },
                ),
              ],
            ),
          ),
          const SizedBox(height: 32),
          _buildSectionHeader('Notifications'),
          const SizedBox(height: 16),
          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.grey[200]!),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.02),
                  blurRadius: 10,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Column(
              children: [
                SwitchListTile(
                  title: const Text(
                    'Push Notifications',
                    style: TextStyle(fontWeight: FontWeight.w500),
                  ),
                  subtitle: const Text(
                    'Receive alerts for new orders and low stock',
                  ),
                  secondary: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFEE2E2), // Red 50
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(
                      LucideIcons.bell,
                      color: Colors.red,
                      size: 20,
                    ),
                  ),
                  value: settingsState.notificationsEnabled,
                  onChanged: (value) {
                    notifier.toggleNotifications(value);
                  },
                ),
              ],
            ),
          ),
          const SizedBox(height: 32),
          _buildSectionHeader('General'),
          const SizedBox(height: 16),
          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.grey[200]!),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.02),
                  blurRadius: 10,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Column(
              children: [
                ListTile(
                  title: const Text(
                    'Workspace',
                    style: TextStyle(fontWeight: FontWeight.w500),
                  ),
                  subtitle: Text(workspace.apiBaseUrl),
                  leading: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: const Color(0xFFDBEAFE), // Blue 50
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(
                      LucideIcons.link,
                      color: Colors.blue,
                      size: 20,
                    ),
                  ),
                  trailing: const Icon(LucideIcons.chevronRight, size: 20),
                  onTap: () async {
                    final controller = TextEditingController(
                      text: workspace.apiBaseUrl,
                    );
                    final ok = await showDialog<bool>(
                      context: context,
                      builder: (ctx) => AppDialog(
                        title: 'Workspace URL',
                        description:
                            'Change the API base URL used by this admin app.',
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
                      await ref
                          .read(workspaceProvider.notifier)
                          .setWorkspaceUrl(controller.text);
                    } catch (e) {
                      if (!context.mounted) return;
                      ScaffoldMessenger.of(
                        context,
                      ).showSnackBar(SnackBar(content: Text(e.toString())));
                    }
                  },
                ),
                const Divider(height: 1),
                ListTile(
                  title: const Text(
                    'Currency',
                    style: TextStyle(fontWeight: FontWeight.w500),
                  ),
                  subtitle: Text(settingsState.currency),
                  leading: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: const Color(0xFFDCFCE7), // Green 50
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(
                      LucideIcons.dollarSign,
                      color: Colors.green,
                      size: 20,
                    ),
                  ),
                  trailing: const Icon(LucideIcons.chevronRight, size: 20),
                  onTap: () {
                    // Show currency picker
                  },
                ),
                const Divider(height: 1),
                ListTile(
                  title: const Text(
                    'Printers',
                    style: TextStyle(fontWeight: FontWeight.w500),
                  ),
                  subtitle: const Text('Manage receipt printers'),
                  leading: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFEDD5), // Orange 50
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(
                      LucideIcons.printer,
                      color: Colors.orange,
                      size: 20,
                    ),
                  ),
                  trailing: const Icon(LucideIcons.chevronRight, size: 20),
                  onTap: () {
                    context.go('/settings/printers');
                  },
                ),
                const Divider(height: 1),
                ListTile(
                  title: const Text(
                    'Store Settings',
                    style: TextStyle(fontWeight: FontWeight.w500),
                  ),
                  subtitle: const Text('Name, contact info, functional options'),
                  leading: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: const Color(0xFFD1FAE5),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(LucideIcons.store, color: Colors.green, size: 20),
                  ),
                  trailing: const Icon(LucideIcons.chevronRight, size: 20),
                  onTap: () => context.push('/settings/store'),
                ),
                const Divider(height: 1),
                ListTile(
                  title: const Text(
                    'Language',
                    style: TextStyle(fontWeight: FontWeight.w500),
                  ),
                  subtitle: const Text('English (US)'),
                  leading: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: const Color(0xFFDBEAFE), // Blue 50
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(
                      LucideIcons.languages,
                      color: Colors.blue,
                      size: 20,
                    ),
                  ),
                  trailing: const Icon(LucideIcons.chevronRight, size: 20),
                  onTap: () {
                    // Show language picker
                  },
                ),
              ],
            ),
          ),
          const SizedBox(height: 32),
          _buildSectionHeader('Account'),
          const SizedBox(height: 16),
          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.grey[200]!),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.02),
                  blurRadius: 10,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: ListTile(
              title: const Text(
                'Log Out',
                style: TextStyle(
                  fontWeight: FontWeight.w500,
                  color: Colors.red,
                ),
              ),
              leading: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEE2E2), // Red 50
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(
                  LucideIcons.logOut,
                  color: Colors.red,
                  size: 20,
                ),
              ),
              onTap: () {
                ref.read(authProvider.notifier).logout();
                context.go('/login');
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Text(
      title.toUpperCase(),
      style: TextStyle(
        fontSize: 12,

        fontWeight: FontWeight.w600,
        color: Colors.grey[500],
        letterSpacing: 1,
      ),
    );
  }
}
