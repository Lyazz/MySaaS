import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../providers/auth_provider.dart';
import '../providers/settings_provider.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final settingsState = ref.watch(settingsProvider);
    final notifier = ref.read(settingsProvider.notifier);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'App Settings',
            style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          Text(
            'Manage your application preferences',
            style: TextStyle(color: Colors.grey[600], fontSize: 14),
          ),
          const SizedBox(height: 32),
          _buildSectionHeader('Appearance'),
          const SizedBox(height: 16),
          Card(
            elevation: 0,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
              side: BorderSide(color: Colors.grey[200]!),
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
                      color: Colors.purple.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
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
          Card(
            elevation: 0,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
              side: BorderSide(color: Colors.grey[200]!),
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
                      color: Colors.red.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
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
          Card(
            elevation: 0,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
              side: BorderSide(color: Colors.grey[200]!),
            ),
            child: Column(
              children: [
                ListTile(
                  title: const Text(
                    'Currency',
                    style: TextStyle(fontWeight: FontWeight.w500),
                  ),
                  subtitle: Text(settingsState.currency),
                  leading: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.green.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
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
                    'Language',
                    style: TextStyle(fontWeight: FontWeight.w500),
                  ),
                  subtitle: const Text('English (US)'),
                  leading: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.blue.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
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
          Card(
            elevation: 0,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
              side: BorderSide(color: Colors.grey[200]!),
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
                  color: Colors.red.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
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
