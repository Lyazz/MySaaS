import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../models/admin_notification.dart';
import '../providers/notifications_provider.dart';
import '../theme/app_theme.dart';

class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(adminNotificationsProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final textPrimary = isDark
        ? AppColors.textPrimary
        : AppColors.lightTextPrimary;
    final textSecondary = isDark
        ? AppColors.textSecondary
        : AppColors.lightTextSecondary;
    final textTertiary = isDark
        ? AppColors.textTertiary
        : AppColors.lightTextTertiary;
    final borderColor = isDark
        ? AppColors.surfaceBorder
        : AppColors.lightSurfaceBorder;
    final surface1 = isDark ? AppColors.surface1 : AppColors.lightSurface1;
    final surface2 = isDark ? AppColors.surface2 : AppColors.lightSurface2;

    return Scaffold(
      backgroundColor: isDark ? AppColors.contentBg : AppColors.lightContentBg,
      body: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(24, 32, 24, 24),
              child: Row(
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [AppColors.brand, Color(0xFF86EFAC)],
                      ),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: const Icon(
                      LucideIcons.bell,
                      size: 24,
                      color: AppColors.brandContrast,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'All Notifications',
                          style: TextStyle(
                            color: textPrimary,
                            fontSize: 24,
                            fontWeight: FontWeight.w700,
                            letterSpacing: -0.5,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Manage and view your store activity.',
                          style: TextStyle(color: textSecondary, fontSize: 14),
                        ),
                      ],
                    ),
                  ),
                  if (state.unreadCount > 0)
                    ElevatedButton.icon(
                      onPressed: () {
                        ref
                            .read(adminNotificationsProvider.notifier)
                            .markAllRead();
                      },
                      icon: const Icon(LucideIcons.checkCheck, size: 16),
                      label: const Text('Mark all read'),
                    ),
                ],
              ),
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            sliver: state.isLoading && state.items.isEmpty
                ? const SliverToBoxAdapter(
                    child: Center(
                      child: Padding(
                        padding: EdgeInsets.all(40),
                        child: CircularProgressIndicator(),
                      ),
                    ),
                  )
                : state.items.isEmpty
                ? SliverToBoxAdapter(
                    child: Center(
                      child: Padding(
                        padding: const EdgeInsets.all(60),
                        child: Column(
                          children: [
                            Icon(
                              LucideIcons.bellOff,
                              size: 48,
                              color: textTertiary,
                            ),
                            const SizedBox(height: 16),
                            Text(
                              'No notifications',
                              style: TextStyle(
                                color: textPrimary,
                                fontSize: 18,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  )
                : SliverList(
                    delegate: SliverChildBuilderDelegate((context, index) {
                      final item = state.items[index];
                      final isUnread = item.isUnread;

                      return Card(
                        margin: const EdgeInsets.only(bottom: 8),
                        color: isUnread
                            ? AppColors.brand.withValues(alpha: 0.05)
                            : surface1,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                          side: BorderSide(
                            color: isUnread
                                ? AppColors.brand.withValues(alpha: 0.3)
                                : borderColor,
                          ),
                        ),
                        child: InkWell(
                          borderRadius: BorderRadius.circular(12),
                          onTap: () async {
                            await ref
                                .read(adminNotificationsProvider.notifier)
                                .markRead(item.id);
                            if (!context.mounted) return;

                            final route = item.data['route']?.trim();
                            if (route != null && route.isNotEmpty) {
                              context.go(route);
                              return;
                            }
                            final orderId = item.data['orderId']?.trim();
                            if (orderId != null && orderId.isNotEmpty) {
                              context.go('/orders/$orderId');
                            }
                          },
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Container(
                                  width: 40,
                                  height: 40,
                                  decoration: BoxDecoration(
                                    color: isUnread
                                        ? AppColors.brand.withValues(
                                            alpha: 0.15,
                                          )
                                        : surface2,
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: Icon(
                                    _iconFor(item),
                                    size: 18,
                                    color: isUnread
                                        ? AppColors.brand
                                        : textSecondary,
                                  ),
                                ),
                                const SizedBox(width: 16),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        children: [
                                          Expanded(
                                            child: Text(
                                              item.title,
                                              style: TextStyle(
                                                color: textPrimary,
                                                fontSize: 15,
                                                fontWeight: isUnread
                                                    ? FontWeight.w700
                                                    : FontWeight.w600,
                                              ),
                                            ),
                                          ),
                                          if (isUnread) ...[
                                            Container(
                                              width: 8,
                                              height: 8,
                                              decoration: const BoxDecoration(
                                                color: AppColors.brand,
                                                shape: BoxShape.circle,
                                              ),
                                            ),
                                            const SizedBox(width: 8),
                                          ],
                                          Text(
                                            DateFormat(
                                              'MMM d, y, HH:mm',
                                            ).format(item.createdAt),
                                            style: TextStyle(
                                              color: textTertiary,
                                              fontSize: 12,
                                            ),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 6),
                                      Text(
                                        item.body,
                                        style: TextStyle(
                                          color: textSecondary,
                                          fontSize: 14,
                                          height: 1.4,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      );
                    }, childCount: state.items.length),
                  ),
          ),
          const SliverPadding(padding: EdgeInsets.only(bottom: 40)),
        ],
      ),
    );
  }

  IconData _iconFor(AdminNotification item) {
    if (item.type == 'ORDER_CREATED' || item.entityType == 'ORDER') {
      return LucideIcons.shoppingBag;
    }
    if (item.entityType == 'PRODUCT') return LucideIcons.package;
    if (item.entityType == 'CUSTOMER') return LucideIcons.user;
    if (item.entityType == 'PAYMENT') return LucideIcons.creditCard;
    return LucideIcons.bell;
  }
}
