import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:easy_localization/easy_localization.dart';

import '../models/app_mode.dart';
import '../providers/auth_provider.dart';
import '../providers/sidebar_provider.dart';
import '../providers/store_settings_provider.dart';
import '../theme/app_theme.dart';
import '../utils/feature_access.dart';
import '../providers/workspace_provider.dart';
import 'package:cached_network_image/cached_network_image.dart';

class Sidebar extends ConsumerWidget {
  const Sidebar({super.key});

  bool _canRead(AuthState auth, String resource) {
    final user = auth.user;
    if (user == null) return false;
    if (user.role != 'staff') return true;

    final perms = auth.staffPermissions;
    if (perms.isEmpty) return resource == 'orders';
    return perms.contains('$resource:read');
  }

  bool _isTenantAdmin(AuthState auth) {
    final user = auth.user;
    if (user == null) return false;
    return user.role == 'owner' || user.role == 'admin';
  }

  bool _canReadAnySettings(AuthState auth) {
    return _canRead(auth, 'storeSettings') ||
        _canRead(auth, 'homepageSettings') ||
        _isTenantAdmin(auth);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isCollapsed = ref.watch(sidebarProvider);
    final authState = ref.watch(authProvider);
    final workspaceState = ref.watch(workspaceProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final sidebarBg = isDark ? AppColors.sidebarBg : AppColors.lightSidebarBg;
    final borderColor = isDark
        ? AppColors.surfaceBorder
        : AppColors.lightSidebarBorder;

    String? resolveLogoUrl(String? url) {
      if (url == null || url.isEmpty) return null;
      if (url.startsWith('http://') || url.startsWith('https://')) return url;
      final uri = Uri.tryParse(workspaceState.apiBaseUrl);
      if (uri != null) {
        final base =
            '${uri.scheme}://${uri.host}${uri.hasPort ? ':${uri.port}' : ''}';
        return url.startsWith('/') ? '$base$url' : '$base/$url';
      }
      return url;
    }

    final String? resolvedLogoUrl = resolveLogoUrl(
      ref.watch(storeSettingsProvider).settings.logoUrl,
    );

    return AnimatedContainer(
      duration: const Duration(milliseconds: 300),
      width: isCollapsed ? 64 : 220,
      decoration: BoxDecoration(
        color: sidebarBg,
        border: Border(right: BorderSide(color: borderColor)),
      ),
      child: Column(
        children: [
          _buildHeader(context, isCollapsed, ref, isDark, resolvedLogoUrl),
          Expanded(
            child: SingleChildScrollView(
              padding: EdgeInsets.symmetric(
                vertical: 10,
                horizontal: isCollapsed ? 8 : 10,
              ),
              child: Column(
                children: [
                  _buildNavGroup(
                    title: 'admin.nav.overview'.tr(),
                    isCollapsed: isCollapsed,
                    isDark: isDark,
                    items: [
                      if (_canRead(authState, 'dashboard'))
                        _NavItem(
                          route: '/',
                          label: 'admin.nav.dashboard'.tr(),
                          icon: LucideIcons.layoutDashboard,
                        ),
                    ],
                    context: context,
                  ),
                  const SizedBox(height: 12),
                  _buildNavGroup(
                    title: 'admin.nav.sales'.tr(),
                    isCollapsed: isCollapsed,
                    isDark: isDark,
                    items: [
                      if (_canRead(authState, 'orders'))
                        _NavItem(
                          route: '/orders',
                          label: 'admin.nav.orders'.tr(),
                          icon: LucideIcons.shoppingBag,
                        ),
                      if (_canRead(authState, 'pos'))
                        _NavItem(
                          route: '/pos',
                          label: 'admin.nav.pos'.tr(),
                          icon: LucideIcons.monitor,
                        ),
                      if (_canRead(authState, 'delivery'))
                        _NavItem(
                          route: '/delivery',
                          label: 'app.admin_nav_deliveryitem'.tr().tr(),
                          icon: LucideIcons.truck,
                        ),
                      if (_canRead(authState, 'sales'))
                        _NavItem(
                          route: '/sales',
                          label: 'app.admin_nav_salesitem'.tr().tr(),
                          icon: LucideIcons.barChart,
                        ),
                      if (_canRead(authState, 'cash'))
                        _NavItem(
                          route: '/cash',
                          label: 'admin.nav.cash'.tr(),
                          icon: LucideIcons.wallet,
                        ),
                    ],
                    context: context,
                  ),
                  const SizedBox(height: 12),
                  _buildNavGroup(
                    title: 'admin.nav.catalog'.tr(),
                    isCollapsed: isCollapsed,
                    isDark: isDark,
                    items: [
                      if (_canRead(authState, 'products'))
                        _NavItem(
                          route: '/products',
                          label: 'admin.nav.products'.tr(),
                          icon: LucideIcons.package,
                        ),
                      if (_canRead(authState, 'categories'))
                        _NavItem(
                          route: '/categories',
                          label: 'admin.nav.categories'.tr(),
                          icon: LucideIcons.tags,
                        ),
                      if (_canRead(authState, 'inventory'))
                        _NavItem(
                          route: '/inventory',
                          label: 'admin.nav.inventory'.tr(),
                          icon: LucideIcons.warehouse,
                        ),
                      if (_canRead(authState, 'suppliers'))
                        _NavItem(
                          route: '/suppliers',
                          label: 'admin.nav.suppliers'.tr(),
                          icon: LucideIcons.truck,
                        ),
                      if (_canRead(authState, 'purchases'))
                        _NavItem(
                          route: '/purchases',
                          label: 'admin.nav.purchases'.tr(),
                          icon: LucideIcons.shoppingCart,
                        ),
                    ],
                    context: context,
                  ),
                  const SizedBox(height: 12),
                  _buildNavGroup(
                    title: 'app.admin_nav_storeparameters'.tr().tr(),
                    isCollapsed: isCollapsed,
                    isDark: isDark,
                    items: [
                      if (_canRead(authState, 'customers'))
                        _NavItem(
                          route: '/customers',
                          label: 'admin.nav.customers'.tr(),
                          icon: LucideIcons.users,
                        ),
                      if (_canReadAnySettings(authState))
                        _NavItem(
                          route: '/settings',
                          label: 'admin.nav.settings'.tr(),
                          icon: LucideIcons.palette,
                        ),
                      if (_isTenantAdmin(authState))
                        _NavItem(
                          route: '/users',
                          label: 'admin.nav.users'.tr(),
                          icon: LucideIcons.users,
                        ),
                      if (_canRead(authState, 'integrations'))
                        _NavItem(
                          route: '/integrations',
                          label: 'admin.nav.integrations'.tr(),
                          icon: LucideIcons.plug,
                          disabled: FeatureAccess.isLockedForTier(
                            authState.subscriptionTier,
                            OnlineTierFeature.integrations,
                          ),
                          disabledReason: FeatureAccess.infoFor(
                            OnlineTierFeature.integrations,
                          ).description,
                        ),
                      if (_canRead(authState, 'billing'))
                        _NavItem(
                          route: '/billing',
                          label: 'admin.nav.billing'.tr(),
                          icon: LucideIcons.creditCard,
                          disabled: FeatureAccess.isLockedForTier(
                            authState.subscriptionTier,
                            OnlineTierFeature.billing,
                          ),
                          disabledReason: FeatureAccess.infoFor(
                            OnlineTierFeature.billing,
                          ).description,
                        ),
                    ],
                    context: context,
                  ),
                ],
              ),
            ),
          ),
          _buildUserSection(context, ref, isCollapsed, isDark),
        ],
      ),
    );
  }

  Widget _buildHeader(
    BuildContext context,
    bool isCollapsed,
    WidgetRef ref,
    bool isDark,
    String? resolvedLogoUrl,
  ) {
    final storeState = ref.watch(storeSettingsProvider);
    final storeName = storeState.settings.name.isNotEmpty
        ? storeState.settings.name
        : 'Swekly';
    final storeSlug = storeState.settings.slug;
    final initial = storeName.isNotEmpty ? storeName[0].toUpperCase() : 'S';
    final borderColor = isDark
        ? AppColors.surfaceBorder
        : AppColors.lightSidebarBorder;
    final textPrimary = isDark
        ? AppColors.textPrimary
        : AppColors.lightTextPrimary;
    final textTertiary = isDark
        ? AppColors.textTertiary
        : AppColors.lightTextTertiary;

    return Container(
      height: 52,
      padding: EdgeInsets.symmetric(horizontal: isCollapsed ? 0 : 12),
      decoration: BoxDecoration(
        border: Border(bottom: BorderSide(color: borderColor)),
      ),
      child: Row(
        mainAxisAlignment: isCollapsed
            ? MainAxisAlignment.center
            : MainAxisAlignment.start,
        children: [
          if (resolvedLogoUrl != null && resolvedLogoUrl.isNotEmpty)
            Container(
              width: 28,
              height: 28,
              decoration: BoxDecoration(borderRadius: BorderRadius.circular(7)),
              clipBehavior: Clip.antiAlias,
              child: CachedNetworkImage(
                imageUrl: resolvedLogoUrl,
                fit: BoxFit.contain,
                errorWidget: (context, url, error) =>
                    _buildInitialsLogo(context, initial),
              ),
            )
          else
            _buildInitialsLogo(context, initial),
          if (!isCollapsed) ...[
            const SizedBox(width: 10),
            Flexible(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    storeName,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: textPrimary,
                      fontSize: 12.5,
                      fontWeight: FontWeight.w600,
                      height: 1.2,
                    ),
                  ),
                  if (storeSlug.isNotEmpty)
                    Text(
                      '$storeSlug.swekly.com',
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: textTertiary,
                        fontSize: 10,
                        height: 1.3,
                      ),
                    ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildInitialsLogo(BuildContext context, String initial) {
    return Container(
      width: 28,
      height: 28,
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.primary,
        borderRadius: BorderRadius.circular(7),
      ),
      alignment: Alignment.center,
      child: Text(
        initial,
        style: TextStyle(
          color: Theme.of(context).colorScheme.onPrimary,
          fontWeight: FontWeight.bold,
          fontSize: 12,
        ),
      ),
    );
  }

  Widget _buildNavGroup({
    required String title,
    required List<_NavItem> items,
    required bool isCollapsed,
    required bool isDark,
    required BuildContext context,
  }) {
    final borderColor = isDark
        ? AppColors.surfaceBorder
        : AppColors.lightSidebarBorder;
    final labelColor = isDark
        ? AppColors.textTertiary
        : AppColors.lightTextTertiary;

    return Column(
      crossAxisAlignment: isCollapsed
          ? CrossAxisAlignment.center
          : CrossAxisAlignment.start,
      children: [
        if (!isCollapsed)
          Padding(
            padding: const EdgeInsets.only(left: 8, bottom: 4, top: 4),
            child: Text(
              title.toUpperCase(),
              style: TextStyle(
                color: labelColor,
                fontSize: 9,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.12,
              ),
            ),
          )
        else
          Container(
            margin: const EdgeInsets.symmetric(vertical: 6, horizontal: 8),
            height: 1,
            color: borderColor,
          ),
        ...items.map(
          (item) => _buildNavItem(context, item, isCollapsed, isDark),
        ),
      ],
    );
  }

  Widget _buildNavItem(
    BuildContext context,
    _NavItem item,
    bool isCollapsed,
    bool isDark,
  ) {
    final String location = GoRouterState.of(context).uri.toString();
    final bool isActive = item.route == '/'
        ? location == '/'
        : (location == item.route || location.startsWith('${item.route}/'));

    final activeColor = isDark
        ? AppColors.sidebarActiveColor
        : AppColors.lightSidebarActiveColor;
    final inactiveIconColor = isDark
        ? AppColors.textTertiary
        : AppColors.lightTextTertiary;
    final inactiveLabelColor = isDark
        ? AppColors.textSecondary
        : AppColors.lightTextSecondary;
    final hoverColor = isDark
        ? AppColors.navHoverBg
        : AppColors.lightNavHoverBg;

    Widget content = Container(
      height: 32,
      padding: EdgeInsets.symmetric(horizontal: isCollapsed ? 0 : 10),
      margin: const EdgeInsets.only(bottom: 1),
      decoration: isActive
          ? BoxDecoration(
              color: Theme.of(
                context,
              ).colorScheme.primary.withValues(alpha: 0.10),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                color: Theme.of(
                  context,
                ).colorScheme.primary.withValues(alpha: 0.16),
              ),
            )
          : BoxDecoration(borderRadius: BorderRadius.circular(8)),
      child: Row(
        mainAxisAlignment: isCollapsed
            ? MainAxisAlignment.center
            : MainAxisAlignment.start,
        children: [
          Icon(
            item.icon,
            size: 15,
            color: item.disabled
                ? inactiveIconColor.withValues(alpha: 0.45)
                : (isActive ? activeColor : inactiveIconColor),
          ),
          if (!isCollapsed) ...[
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                item.label,
                style: TextStyle(
                  color: item.disabled
                      ? inactiveLabelColor.withValues(alpha: 0.55)
                      : (isActive ? activeColor : inactiveLabelColor),
                  fontSize: 12.5,
                  fontWeight: isActive ? FontWeight.w600 : FontWeight.w500,
                ),
              ),
            ),
            if (item.disabled)
              Icon(
                LucideIcons.lock,
                size: 12,
                color: inactiveIconColor.withValues(alpha: 0.5),
              ),
          ],
        ],
      ),
    );

    if (isCollapsed) {
      final tooltipBg = isDark
          ? const Color(0xFF1E293B)
          : const Color(0xFF334155);
      content = Tooltip(
        message: item.disabled && item.disabledReason != null
            ? '${item.label}\n${item.disabledReason}'
            : item.label,
        preferBelow: false,
        verticalOffset: 0,
        margin: const EdgeInsets.only(left: 16),
        decoration: BoxDecoration(
          color: tooltipBg,
          borderRadius: BorderRadius.circular(4),
          border: Border.all(color: Colors.white10),
        ),
        textStyle: const TextStyle(
          color: Colors.white,
          fontSize: 11,
          fontWeight: FontWeight.w500,
        ),
        child: content,
      );
    }

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: item.disabled
            ? null
            : () {
                if (Scaffold.of(context).hasDrawer &&
                    Scaffold.of(context).isDrawerOpen) {
                  Navigator.of(context).pop();
                }
                context.go(item.route);
              },
        hoverColor: hoverColor,
        borderRadius: BorderRadius.circular(8),
        child: content,
      ),
    );
  }

  Widget _buildUserSection(
    BuildContext context,
    WidgetRef ref,
    bool isCollapsed,
    bool isDark,
  ) {
    final auth = ref.watch(authProvider);
    final user = auth.user;
    final email = user?.email ?? '—';
    final role = user?.role ?? '—';
    final emailInitial = (user?.email ?? 'A')[0].toUpperCase();

    final borderColor = isDark
        ? AppColors.surfaceBorder
        : AppColors.lightSidebarBorder;
    final textPrimary = isDark
        ? AppColors.textPrimary
        : AppColors.lightTextPrimary;
    final textTertiary = isDark
        ? AppColors.textTertiary
        : AppColors.lightTextTertiary;
    final hoverColor = isDark
        ? AppColors.navHoverBg
        : AppColors.lightNavHoverBg;

    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        border: Border(top: BorderSide(color: borderColor)),
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(8),
        child: InkWell(
          borderRadius: BorderRadius.circular(8),
          hoverColor: hoverColor,
          onTap: isCollapsed
              ? () async {
                  final auth = ref.read(authProvider);
                  final clearProvisioning = auth.mode.skipsAuthentication;
                  await ref
                      .read(authProvider.notifier)
                      .logout(clearProvisioning: clearProvisioning);
                  if (!context.mounted) return;
                  context.go(clearProvisioning ? '/activate' : '/login');
                }
              : null,
          child: Padding(
            padding: EdgeInsets.symmetric(
              horizontal: 8,
              vertical: isCollapsed ? 4 : 6,
            ),
            child: Row(
              mainAxisAlignment: isCollapsed
                  ? MainAxisAlignment.center
                  : MainAxisAlignment.start,
              children: [
                Container(
                  width: 28,
                  height: 28,
                  decoration: BoxDecoration(
                    color: Theme.of(
                      context,
                    ).colorScheme.primary.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(99),
                    border: Border.all(
                      color: Theme.of(
                        context,
                      ).colorScheme.primary.withValues(alpha: 0.30),
                    ),
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    emailInitial,
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.primary,
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                if (!isCollapsed) ...[
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          email,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            color: textPrimary,
                            fontSize: 11.5,
                            fontWeight: FontWeight.w500,
                            height: 1.3,
                          ),
                        ),
                        Text(
                          role,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            color: textTertiary,
                            fontSize: 10,
                            height: 1.3,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _NavItem {
  final String route;
  final String label;
  final IconData icon;
  final bool disabled;
  final String? disabledReason;

  _NavItem({
    required this.route,
    required this.label,
    required this.icon,
    this.disabled = false,
    this.disabledReason,
  });
}
