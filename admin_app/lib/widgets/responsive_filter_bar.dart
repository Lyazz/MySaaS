import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'buttons/app_button.dart';
import '../theme/app_theme.dart';

class ResponsiveFilterBar extends StatelessWidget {
  final Widget searchField;
  final List<Widget> filters;
  final List<Widget>? actions;
  final VoidCallback? onClearFilters;
  final double breakPoint;

  const ResponsiveFilterBar({
    super.key,
    required this.searchField,
    required this.filters,
    this.actions,
    this.onClearFilters,
    this.breakPoint = 800,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final surface1 = isDark ? AppColors.surface1 : AppColors.lightSurface1;
    final borderColor = isDark ? AppColors.surfaceBorder : AppColors.lightSurfaceBorder;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: surface1,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: borderColor),
        boxShadow: isDark
            ? null
            : [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.02),
                  blurRadius: 4,
                  offset: const Offset(0, 1),
                ),
              ],
      ),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final isWide = constraints.maxWidth >= breakPoint;
          return isWide ? _buildDesktopLayout() : _buildMobileLayout(context);
        },
      ),
    );
  }

  Widget _buildDesktopLayout() {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(flex: 2, child: searchField),
        if (filters.isNotEmpty) ...[
          const SizedBox(width: 16),
          Expanded(
            flex: 3,
            child: Wrap(
              spacing: 16,
              runSpacing: 16,
              alignment: WrapAlignment.start,
              children: filters,
            ),
          ),
        ],
        if (actions != null && actions!.isNotEmpty) ...[
          const SizedBox(width: 16),
          ...actions!,
        ],
        if (onClearFilters != null) ...[
          const SizedBox(width: 16),
          IconButton(
            onPressed: onClearFilters,
            icon: const Icon(LucideIcons.x, size: 16),
            tooltip: 'admin.common.clear'.tr(),
          ),
        ],
      ],
    );
  }

  Widget _buildMobileLayout(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final borderColor = isDark ? AppColors.surfaceBorder : AppColors.lightSurfaceBorder;
    final iconColor = isDark ? AppColors.textTertiary : AppColors.lightTextTertiary;

    return Row(
      children: [
        Expanded(child: searchField),
        if (filters.isNotEmpty) ...[
          const SizedBox(width: 8),
          Container(
            decoration: BoxDecoration(
              border: Border.all(color: borderColor),
              borderRadius: BorderRadius.circular(8),
            ),
            child: IconButton(
              onPressed: () => _showFilterModal(context),
              icon: Icon(LucideIcons.listFilter, size: 20, color: iconColor),
              tooltip: 'admin.common.filters'.tr(),
              style: IconButton.styleFrom(
                padding: const EdgeInsets.all(12),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
            ),
          ),
        ],
        if (actions != null && actions!.isNotEmpty) ...[
          const SizedBox(width: 8),
          ...actions!,
        ],
      ],
    );
  }

  void _showFilterModal(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final sheetBg = isDark ? AppColors.surface2 : AppColors.lightSurface2;
    final handleColor = isDark ? AppColors.surfaceBorder : AppColors.lightSurfaceBorder;
    final textPrimary = isDark ? AppColors.textPrimary : AppColors.lightTextPrimary;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: sheetBg,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) {
        return DraggableScrollableSheet(
          initialChildSize: 0.5,
          minChildSize: 0.3,
          maxChildSize: 0.9,
          expand: false,
          builder: (context, scrollController) {
            return Column(
              children: [
                const SizedBox(height: 12),
                Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: handleColor,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(height: 16),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'admin.common.filters'.tr(),
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: textPrimary,
                        ),
                      ),
                      if (onClearFilters != null)
                        AppButton.ghost(
                          label: 'admin.common.clear'.tr(),
                          onPressed: () {
                            onClearFilters!();
                            Navigator.pop(context);
                          },
                        ),
                    ],
                  ),
                ),
                const Divider(),
                Expanded(
                  child: ListView.separated(
                    controller: scrollController,
                    padding: const EdgeInsets.all(20),
                    itemCount: filters.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 20),
                    itemBuilder: (context, index) => filters[index],
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.all(20),
                  child: SizedBox(
                    width: double.infinity,
                    child: AppButton.primary(
                      label: 'admin.common.close'.tr(),
                      onPressed: () => Navigator.pop(context),
                      fullWidth: true,
                    ),
                  ),
                ),
              ],
            );
          },
        );
      },
    );
  }
}
