import 'dart:async';

import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../models/app_mode.dart';
import '../providers/auth_provider.dart';
import '../providers/settings_provider.dart';
import '../providers/sidebar_provider.dart';
import '../providers/store_settings_provider.dart';
import '../providers/sync_provider.dart';
import '../providers/workspace_provider.dart';
import '../services/notification_service.dart';
import '../theme/app_theme.dart';
import '../utils/app_toasts.dart';
import 'admin_notifications_button.dart';
import 'language_switcher_button.dart';
import 'responsive_layout.dart';
import 'sidebar.dart';
import 'license_banner.dart';
import 'offline_banner.dart';
import 'package:url_launcher/url_launcher.dart';

class AppShell extends ConsumerStatefulWidget {
  final Widget child;

  const AppShell({super.key, required this.child});

  @override
  ConsumerState<AppShell> createState() => _AppShellState();
}

class _AppShellState extends ConsumerState<AppShell> {
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();
  StreamSubscription? _notificationSub;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _notificationSub = ref.read(notificationServiceProvider).events.listen((
        event,
      ) {
        if (!mounted || event.id.isEmpty) return;
        AppToasts.show(
          context,
          event.title,
          description: event.body,
          duration: const Duration(seconds: 5),
          icon: const Icon(LucideIcons.bell),
        );
      });
    });
  }

  @override
  void dispose() {
    _notificationSub?.cancel();
    super.dispose();
  }

  String _buildStorefrontUrl({
    required String apiBaseUrl,
    required String storeSlug,
  }) {
    final uri = Uri.tryParse(apiBaseUrl);
    if (uri == null) return apiBaseUrl;

    final baseUri = uri.replace(path: '', query: null, fragment: null);
    final normalizedSlug = storeSlug.trim();
    if (normalizedSlug.isEmpty || baseUri.host.isEmpty) {
      return baseUri.toString().replaceAll(RegExp(r'/$'), '');
    }

    final hostParts = baseUri.host.split('.');
    final alreadyPrefixed =
        hostParts.isNotEmpty && hostParts.first == normalizedSlug;
    final tenantHost = alreadyPrefixed
        ? baseUri.host
        : '$normalizedSlug.${baseUri.host}';

    return baseUri
        .replace(host: tenantHost)
        .toString()
        .replaceAll(RegExp(r'/$'), '');
  }

  @override
  Widget build(BuildContext context) {
    ref.watch(syncServiceProvider);
    return ResponsiveLayout(
      mobile: _buildMobileLayout(),
      desktop: _buildDesktopLayout(),
    );
  }

  Widget _buildMobileLayout() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final topbarBg = isDark ? AppColors.contentBg : AppColors.lightTopbarBg;
    final borderColor = isDark
        ? AppColors.surfaceBorder
        : AppColors.lightSidebarBorder;
    final textPrimary = isDark
        ? AppColors.textPrimary
        : AppColors.lightTextPrimary;
    final textSecondary = isDark
        ? AppColors.textSecondary
        : AppColors.lightTextSecondary;
    final backPath = _backFallbackPath(context);

    return Scaffold(
      key: _scaffoldKey,
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(52),
        child: Container(
          height: 52 + MediaQuery.of(context).padding.top,
          padding: EdgeInsets.only(top: MediaQuery.of(context).padding.top),
          decoration: BoxDecoration(
            color: topbarBg,
            border: Border(bottom: BorderSide(color: borderColor)),
          ),
          child: Row(
            children: [
              const SizedBox(width: 4),
              IconButton(
                icon: Icon(LucideIcons.menu, size: 18, color: textSecondary),
                onPressed: () => _scaffoldKey.currentState?.openDrawer(),
              ),
              if (backPath != null) ...[
                IconButton(
                  icon: Icon(
                    LucideIcons.arrowLeft,
                    size: 18,
                    color: textSecondary,
                  ),
                  onPressed: () => _navigateBack(context, backPath),
                ),
              ],
              const SizedBox(width: 4),
              Container(width: 1, height: 16, color: borderColor),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  _getPageTitle(context),
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: textPrimary,
                    letterSpacing: -0.01,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const LanguageSwitcherButton(compact: true),
              const SizedBox(width: 4),
              const AdminNotificationsButton(compact: true),
              _buildThemeToggle(isDark, textSecondary, borderColor),
              const SizedBox(width: 8),
            ],
          ),
        ),
      ),
      drawerEnableOpenDragGesture: true,
      drawer: const Sidebar(),
      body: Column(
        children: [
          const LicenseBanner(),
          const OfflineBanner(),
          Expanded(child: widget.child),
        ],
      ),
    );
  }

  Widget _buildDesktopLayout() {
    return Scaffold(
      body: Row(
        children: [
          const Sidebar(),
          Expanded(
            child: Column(
              children: [
                const LicenseBanner(),
                const OfflineBanner(),
                _buildDesktopHeader(),
                Expanded(child: widget.child),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDesktopHeader() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final topbarBg = isDark ? AppColors.contentBg : AppColors.lightTopbarBg;
    final borderColor = isDark
        ? AppColors.surfaceBorder
        : AppColors.lightSidebarBorder;
    final textPrimary = isDark
        ? AppColors.textPrimary
        : AppColors.lightTextPrimary;
    final textSecondary = isDark
        ? AppColors.textSecondary
        : AppColors.lightTextSecondary;
    final textTertiary = isDark
        ? AppColors.textTertiary
        : AppColors.lightTextTertiary;
    final hoverBg = isDark ? AppColors.navHoverBg : AppColors.lightNavHoverBg;
    final backPath = _backFallbackPath(context);

    final storeState = ref.watch(storeSettingsProvider);
    final storeSlug = storeState.settings.slug;
    final workspaceState = ref.watch(workspaceProvider);

    final storefrontUrl = _buildStorefrontUrl(
      apiBaseUrl: workspaceState.apiBaseUrl,
      storeSlug: storeSlug,
    );

    return Container(
      height: 52,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        color: topbarBg,
        border: Border(bottom: BorderSide(color: borderColor)),
      ),
      child: Row(
        children: [
          // Sidebar toggle
          _TopbarIconButton(
            icon: LucideIcons.panelLeft,
            color: textTertiary,
            hoverBg: hoverBg,
            hoverColor: textPrimary,
            borderColor: borderColor,
            onPressed: () => ref.read(sidebarProvider.notifier).toggle(),
          ),
          if (backPath != null) ...[
            const SizedBox(width: 8),
            _TopbarIconButton(
              icon: LucideIcons.arrowLeft,
              color: textTertiary,
              hoverBg: hoverBg,
              hoverColor: textPrimary,
              borderColor: borderColor,
              onPressed: () => _navigateBack(context, backPath),
            ),
          ],
          const SizedBox(width: 10),
          Container(width: 1, height: 16, color: borderColor),
          const SizedBox(width: 12),
          // Page title
          Expanded(
            child: Text(
              _getPageTitle(context),
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: textPrimary,
                letterSpacing: -0.01,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ),
          // Right actions
          Row(
            children: [
              // View store
              _TopbarTextButton(
                icon: LucideIcons.externalLink,
                label: 'app.admin_actions_viewstore'.tr().tr(),
                color: textSecondary,
                hoverBg: hoverBg,
                hoverColor: textPrimary,
                borderColor: borderColor,
                onPressed: () async {
                  final uri = Uri.tryParse(storefrontUrl);
                  if (uri != null) {
                    await launchUrl(uri, mode: LaunchMode.externalApplication);
                  }
                },
              ),
              const SizedBox(width: 4),
              const AdminNotificationsButton(),
              const SizedBox(width: 4),
              const LanguageSwitcherButton(),
              const SizedBox(width: 4),
              _buildThemeToggle(isDark, textSecondary, borderColor),
              const SizedBox(width: 8),
              Container(width: 1, height: 16, color: borderColor),
              const SizedBox(width: 8),
              // Logout
              _TopbarTextButton(
                icon: LucideIcons.logOut,
                label: 'admin.actions.logout'.tr(),
                color: textSecondary,
                hoverBg: hoverBg,
                hoverColor: textPrimary,
                borderColor: borderColor,
                onPressed: () => _confirmLogout(context),
              ),
            ],
          ),
        ],
      ),
    );
  }

  void _navigateBack(BuildContext context, String fallbackPath) {
    if (context.canPop()) {
      context.pop();
      return;
    }

    context.go(fallbackPath);
  }

  String? _backFallbackPath(BuildContext context) {
    final location = GoRouterState.of(context).uri.path;
    if (location == '/products/create' || location.startsWith('/products/')) {
      return '/products';
    }
    if (location == '/orders/create' || location.startsWith('/orders/')) {
      return '/orders';
    }
    if (location.startsWith('/sales/')) return '/sales';
    if (location == '/purchases/create' || location.startsWith('/purchases/')) {
      return '/purchases';
    }
    if (location == '/categories/create' ||
        location.startsWith('/categories/')) {
      return '/categories';
    }
    if (location == '/suppliers/create' || location.startsWith('/suppliers/')) {
      return '/suppliers';
    }
    if (location == '/customers/create' ||
        location.startsWith('/customers/edit/') ||
        location.startsWith('/customers/')) {
      return '/customers';
    }
    if (location.startsWith('/cash/')) return '/cash';
    if (location.startsWith('/settings/')) return '/settings';
    if (location.startsWith('/storefront/')) return '/settings';
    if (location.startsWith('/locked/')) return '/';
    return null;
  }

  Widget _buildThemeToggle(bool isDark, Color iconColor, Color borderColor) {
    final settings = ref.watch(settingsProvider);
    final isCurrentlyDark =
        settings.themeMode == ThemeMode.dark ||
        (settings.themeMode == ThemeMode.system &&
            Theme.of(context).brightness == Brightness.dark);
    final hoverBg = isDark ? AppColors.navHoverBg : AppColors.lightNavHoverBg;
    final hoverColor = isDark
        ? AppColors.textPrimary
        : AppColors.lightTextPrimary;

    return _TopbarIconButton(
      icon: isCurrentlyDark ? LucideIcons.sun : LucideIcons.moon,
      color: iconColor,
      hoverBg: hoverBg,
      hoverColor: hoverColor,
      borderColor: borderColor,
      onPressed: () => ref.read(settingsProvider.notifier).toggleTheme(),
    );
  }

  void _confirmLogout(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final surfaceBg = isDark ? AppColors.surface2 : AppColors.lightSurface2;
    final borderColor = isDark
        ? AppColors.surfaceBorder
        : AppColors.lightSurfaceBorder;
    final textPrimary = isDark
        ? AppColors.textPrimary
        : AppColors.lightTextPrimary;
    final textSecondary = isDark
        ? AppColors.textSecondary
        : AppColors.lightTextSecondary;

    showDialog(
      context: context,
      builder: (ctx) => Dialog(
        backgroundColor: surfaceBg,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: borderColor),
        ),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: AppColors.red.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(
                      LucideIcons.logOut,
                      size: 16,
                      color: AppColors.red,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Text(
                    'app.admin_actions_logoutconfirmtit'.tr().tr(),
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: textPrimary,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                'app.admin_actions_logoutconfirmmes'.tr().tr(),
                style: TextStyle(
                  fontSize: 13,
                  color: textSecondary,
                  height: 1.5,
                ),
              ),
              const SizedBox(height: 20),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton(
                    onPressed: () => Navigator.of(ctx).pop(),
                    style: TextButton.styleFrom(
                      foregroundColor: textSecondary,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 8,
                      ),
                    ),
                    child: Text(
                      'admin.common.cancel'.tr(),
                      style: const TextStyle(fontSize: 12),
                    ),
                  ),
                  const SizedBox(width: 8),
                  ElevatedButton(
                    onPressed: () async {
                      Navigator.of(ctx).pop();
                      final auth = ref.read(authProvider);
                      final clearProvisioning = auth.mode.skipsAuthentication;
                      await ref
                          .read(authProvider.notifier)
                          .logout(clearProvisioning: clearProvisioning);
                      if (!context.mounted) return;
                      context.go(clearProvisioning ? '/activate' : '/login');
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.red,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 8,
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                      elevation: 0,
                      textStyle: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    child: Text('admin.actions.logout'.tr()),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _getPageTitle(BuildContext context) {
    final String location = GoRouterState.of(context).uri.toString();
    if (location == '/' || location.startsWith('/dashboard')) {
      return 'admin.nav.dashboard'.tr();
    }
    if (location == '/products') return 'admin.nav.products'.tr();
    if (location == '/products/create') {
      return 'admin.pages.products.create.title'.tr();
    }
    if (location.startsWith('/products/')) {
      return 'admin.pages.products.edit.title'.tr();
    }
    if (location == '/orders') return 'admin.nav.orders'.tr();
    if (location.startsWith('/orders/')) {
      return 'admin.pages.orders.detail.metaTitle'.tr();
    }
    if (location == '/inventory') return 'admin.nav.inventory'.tr();
    if (location == '/sales') return 'admin.pages.sales.index.title'.tr();
    if (location.startsWith('/sales/')) {
      return 'admin.pages.sale.detail.metaTitle'.tr();
    }
    if (location == '/purchases') {
      return 'admin.pages.purchases.index.title'.tr();
    }
    if (location == '/purchases/create') {
      return 'admin.pages.purchases.create.title'.tr();
    }
    if (location.startsWith('/purchases/')) {
      return 'admin.pages.purchases.detail.metaTitle'.tr();
    }
    if (location == '/pos') return 'admin.nav.pos'.tr();
    if (location == '/delivery') return 'admin.nav.delivery'.tr();
    if (location == '/billing') return 'admin.nav.billing'.tr();
    if (location == '/integrations') return 'admin.nav.integrations'.tr();
    if (location == '/cash') return 'admin.nav.cash'.tr();
    if (location.startsWith('/cash/')) {
      return 'admin.pages.cash.cashbox.titleFallback'.tr();
    }
    if (location == '/categories') {
      return 'admin.pages.categories.index.title'.tr();
    }
    if (location == '/categories/create') {
      return 'admin.pages.categories.create.title'.tr();
    }
    if (location.startsWith('/categories/')) {
      return 'admin.pages.categories.edit.title'.tr();
    }
    if (location == '/suppliers') {
      return 'admin.pages.suppliers.index.title'.tr();
    }
    if (location == '/suppliers/create') {
      return 'admin.pages.suppliers.create.title'.tr();
    }
    if (location.startsWith('/suppliers/')) {
      return 'admin.pages.suppliers.edit.title'.tr();
    }
    if (location == '/customers') {
      return 'admin.pages.customers.index.title'.tr();
    }
    if (location == '/customers/create') {
      return 'admin.pages.customers.create.title'.tr();
    }
    if (location.startsWith('/customers/edit/')) {
      return 'admin.pages.customers.edit.title'.tr();
    }
    if (location.startsWith('/customers/')) {
      return 'admin.pages.customers.detail.fallbackTitle'.tr();
    }
    if (location == '/users') return 'admin.nav.users'.tr();
    if (location == '/settings') return 'admin.nav.settings'.tr();
    if (location == '/settings/printers') return 'Printers';
    if (location == '/settings/store') return 'Store Settings';
    if (location == '/settings/contact') return 'Contact Information';
    if (location == '/settings/appearance') return 'Storefront Appearance';
    if (location == '/settings/homepage') return 'Homepage Settings';
    if (location == '/settings/legal') return 'Legal Pages';
    if (location == '/settings/domains') return 'Custom Domains';
    if (location == '/storefront/preview') return 'Storefront Preview';
    if (location == '/storefront/builder') return 'Template Builder';
    if (location == '/storefront/landing-builder') {
      return 'Landing Page Builder';
    }
    if (location.startsWith('/locked/')) return 'Feature Locked';
    return 'admin.nav.dashboard'.tr();
  }
}

class _TopbarIconButton extends StatefulWidget {
  final IconData icon;
  final Color color;
  final Color hoverBg;
  final Color hoverColor;
  final Color borderColor;
  final VoidCallback onPressed;

  const _TopbarIconButton({
    required this.icon,
    required this.color,
    required this.hoverBg,
    required this.hoverColor,
    required this.borderColor,
    required this.onPressed,
  });

  @override
  State<_TopbarIconButton> createState() => _TopbarIconButtonState();
}

class _TopbarIconButtonState extends State<_TopbarIconButton> {
  bool _hovered = false;

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      cursor: SystemMouseCursors.click,
      onEnter: (_) => setState(() => _hovered = true),
      onExit: (_) => setState(() => _hovered = false),
      child: GestureDetector(
        onTap: widget.onPressed,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          width: 32,
          height: 32,
          decoration: BoxDecoration(
            color: _hovered ? widget.hoverBg : Colors.transparent,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: widget.borderColor),
          ),
          child: Icon(
            widget.icon,
            size: 16,
            color: _hovered ? widget.hoverColor : widget.color,
          ),
        ),
      ),
    );
  }
}

class _TopbarTextButton extends StatefulWidget {
  final IconData icon;
  final String label;
  final Color color;
  final Color hoverBg;
  final Color hoverColor;
  final Color borderColor;
  final VoidCallback onPressed;

  const _TopbarTextButton({
    required this.icon,
    required this.label,
    required this.color,
    required this.hoverBg,
    required this.hoverColor,
    required this.borderColor,
    required this.onPressed,
  });

  @override
  State<_TopbarTextButton> createState() => _TopbarTextButtonState();
}

class _TopbarTextButtonState extends State<_TopbarTextButton> {
  bool _hovered = false;

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      cursor: SystemMouseCursors.click,
      onEnter: (_) => setState(() => _hovered = true),
      onExit: (_) => setState(() => _hovered = false),
      child: GestureDetector(
        onTap: widget.onPressed,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          decoration: BoxDecoration(
            color: _hovered ? widget.hoverBg : Colors.transparent,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: widget.borderColor),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                widget.icon,
                size: 14,
                color: _hovered ? widget.hoverColor : widget.color,
              ),
              const SizedBox(width: 6),
              Text(
                widget.label,
                style: TextStyle(
                  fontSize: 11.5,
                  fontWeight: FontWeight.w500,
                  color: _hovered ? widget.hoverColor : widget.color,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
