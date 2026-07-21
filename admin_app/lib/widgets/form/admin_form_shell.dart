import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../theme/app_theme.dart';

class AdminFormShell extends StatelessWidget {
  final String title;
  final String subtitle;
  final String? error;
  final Widget child;
  final bool isEditing;
  final String backPath;
  final String backLabel;

  const AdminFormShell({
    super.key,
    required this.title,
    required this.subtitle,
    required this.child,
    this.isEditing = false,
    this.error,
    this.backPath = '/products',
    this.backLabel = 'Back',
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final contentBg = isDark ? AppColors.contentBg : AppColors.lightContentBg;
    final surface1 = isDark ? AppColors.surface1 : AppColors.lightSurface1;
    final borderColor = isDark
        ? AppColors.surfaceBorder
        : AppColors.lightSurfaceBorder;
    final textPrimary = isDark
        ? AppColors.textPrimary
        : AppColors.lightTextPrimary;
    final textSecondary = isDark
        ? AppColors.textSecondary
        : AppColors.lightTextSecondary;
    final textTertiary = isDark
        ? AppColors.textTertiary
        : AppColors.lightTextTertiary;

    return Scaffold(
      backgroundColor: contentBg,
      body: SafeArea(
        child: Center(
          child: Container(
            constraints: const BoxConstraints(maxWidth: 800),
            padding: EdgeInsets.all(
              MediaQuery.of(context).size.width > 600 ? 24 : 12,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (MediaQuery.of(context).size.width > 600) ...[
                  Row(
                    children: [
                      Flexible(
                        child: InkWell(
                          onTap: () {
                            if (context.canPop()) {
                              context.pop();
                            } else {
                              context.go(backPath);
                            }
                          },
                          child: Text(
                            backLabel,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              color: textSecondary,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                      ),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 8),
                        child: Icon(
                          LucideIcons.chevronRight,
                          size: 14,
                          color: textTertiary,
                        ),
                      ),
                      Flexible(
                        child: Text(
                          title,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(color: textTertiary),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              title,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: 24,
                                fontWeight: FontWeight.bold,
                                color: textPrimary,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              subtitle,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                color: textSecondary,
                                fontSize: 14,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                ] else ...[
                  Row(
                    children: [
                      IconButton(
                        icon: Icon(LucideIcons.arrowLeft, color: textPrimary),
                        onPressed: () => context.pop(),
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(),
                      ),
                      const SizedBox(width: 16),
                      Text(
                        title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: textPrimary,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                ],

                if (error != null)
                  Container(
                    padding: const EdgeInsets.all(12),
                    margin: const EdgeInsets.only(bottom: 24),
                    decoration: BoxDecoration(
                      color: AppColors.redSurface,
                      border: Border.all(
                        color: AppColors.red.withValues(alpha: 0.3),
                      ),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      error!,
                      style: const TextStyle(
                        color: AppColors.redText,
                        fontSize: 14,
                      ),
                    ),
                  ),

                Expanded(
                  child: Container(
                    decoration: BoxDecoration(
                      color: surface1,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: borderColor),
                      boxShadow: isDark
                          ? null
                          : [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.05),
                                blurRadius: 4,
                                offset: const Offset(0, 1),
                              ),
                            ],
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: child,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
