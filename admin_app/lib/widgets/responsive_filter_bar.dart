import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'buttons/app_button.dart';

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
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)), // Slate-200
        boxShadow: [
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

          if (isWide) {
            return _buildDesktopLayout();
          } else {
            return _buildMobileLayout(context);
          }
        },
      ),
    );
  }

  Widget _buildDesktopLayout() {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Search takes avail space or fixed width?
        // Usually search is main, filters are secondary.
        // Let's make search expand a bit more.
        Expanded(flex: 2, child: searchField),
        if (filters.isNotEmpty) ...[
          const SizedBox(width: 16),
          // Filters take rest of space
          Expanded(
            flex: 3,
            child: Wrap(
              spacing: 16,
              runSpacing: 16,
              alignment: WrapAlignment.start,
              children: filters.map((filter) {
                // Determine if we should wrap filters in specialized containers or just render them.
                // Assuming filters are already sized widgets (like SizedBox(width: 200, child: Dropdown...))
                // OR we can wrap them in flexible containers.
                // For simplified usage, let's assume 'filters' are fully formed widgets.
                // But typically in the previous code they were Expanded.
                // We needs widgets that have intrinsic width or specific width.
                return filter;
              }).toList(),
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
    return Row(
      children: [
        Expanded(child: searchField),
        if (filters.isNotEmpty) ...[
          const SizedBox(width: 8),
          Container(
            decoration: BoxDecoration(
              border: Border.all(color: const Color(0xFFE2E8F0)),
              borderRadius: BorderRadius.circular(8),
            ),
            child: IconButton(
              onPressed: () => _showFilterModal(context),
              icon: const Icon(
                LucideIcons.listFilter,
                size: 20,
                color: Color(0xFF64748B),
              ),
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
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
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
                // Modal Handle
                const SizedBox(height: 12),
                Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.grey[300],
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(height: 16),

                // Title
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

                // Filter List
                Expanded(
                  child: ListView.separated(
                    controller: scrollController,
                    padding: const EdgeInsets.all(20),
                    itemCount: filters.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 20),
                    itemBuilder: (context, index) {
                      return filters[index];
                    },
                  ),
                ),

                // Close Button
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
