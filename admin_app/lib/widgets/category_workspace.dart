import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../models/product.dart';
import '../../theme/app_theme.dart';
import 'tenant_image_widget.dart';
import 'badges/ui_badge.dart';
import 'buttons/app_button.dart';
import '../utils/app_toasts.dart';

class CategoryWorkspace extends StatefulWidget {
  final List<Category> categories;
  final String searchQuery;
  final String sortBy;
  final String sortOrder;
  final Future<void> Function(Category) onDeleteCategory;

  const CategoryWorkspace({
    super.key,
    required this.categories,
    required this.searchQuery,
    required this.sortBy,
    required this.sortOrder,
    required this.onDeleteCategory,
  });

  @override
  State<CategoryWorkspace> createState() => _CategoryWorkspaceState();
}

class _CategoryWorkspaceState extends State<CategoryWorkspace> {
  int _currentPage = 1;
  final int _itemsPerPage = 25;
  String? _activeParentId;

  @override
  void didUpdateWidget(covariant CategoryWorkspace oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.searchQuery != widget.searchQuery ||
        oldWidget.sortBy != widget.sortBy ||
        oldWidget.sortOrder != widget.sortOrder) {
      _currentPage = 1;
    }
  }

  int _compareCategories(Category a, Category b) {
    final dir = widget.sortOrder == 'asc' ? 1 : -1;
    switch (widget.sortBy) {
      case 'title':
        return a.title.compareTo(b.title) * dir;
      case 'slug':
        return a.slug.compareTo(b.slug) * dir;
      case 'products':
        return a.productCount.compareTo(b.productCount) * dir;
      case 'createdAt':
      default:
        final aDate = a.createdAt?.millisecondsSinceEpoch ?? 0;
        final bDate = b.createdAt?.millisecondsSinceEpoch ?? 0;
        return aDate.compareTo(bDate) * dir;
    }
  }

  bool _categoryMatchesQuery(Category category, String query) {
    final normalized = query.trim().toLowerCase();
    if (normalized.isEmpty) return true;
    return category.title.toLowerCase().contains(normalized) ||
        category.slug.toLowerCase().contains(normalized);
  }

  void _copyLink(String slug) {
    final url = '/category/$slug';
    Clipboard.setData(ClipboardData(text: url));
    AppToasts.show(
      context,
      'app.category_link_copied_to_clipbo'.tr(),
      duration: const Duration(seconds: 2),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final sortedCategories = List<Category>.from(widget.categories)
      ..sort(_compareCategories);

    final topLevelCategories = sortedCategories
        .where((c) => c.parentId == null)
        .toList();

    final subcategoriesByParentId = <String, List<Category>>{};
    for (final category in sortedCategories) {
      if (category.parentId != null) {
        subcategoriesByParentId
            .putIfAbsent(category.parentId!, () => [])
            .add(category);
      }
    }

    final query = widget.searchQuery.trim().toLowerCase();
    final filteredParentCategories = topLevelCategories.where((parent) {
      if (_categoryMatchesQuery(parent, query)) return true;
      final children = subcategoriesByParentId[parent.id] ?? [];
      return children.any((child) => _categoryMatchesQuery(child, query));
    }).toList();

    final totalPages = (filteredParentCategories.length / _itemsPerPage)
        .ceil()
        .clamp(1, 9999);
    if (_currentPage > totalPages) {
      _currentPage = totalPages;
    }

    final start = (_currentPage - 1) * _itemsPerPage;
    final end = (start + _itemsPerPage).clamp(
      0,
      filteredParentCategories.length,
    );
    final paginatedParents = filteredParentCategories.sublist(start, end);

    final effectiveActiveParentId =
        (paginatedParents.any((c) => c.id == _activeParentId)
        ? _activeParentId
        : (paginatedParents.isNotEmpty ? paginatedParents.first.id : null));

    final activeParent = topLevelCategories
        .where((c) => c.id == effectiveActiveParentId)
        .firstOrNull;

    List<Category> activeSubcategories = [];
    if (activeParent != null) {
      final children = subcategoriesByParentId[activeParent.id] ?? [];
      if (query.isEmpty || _categoryMatchesQuery(activeParent, query)) {
        activeSubcategories = children;
      } else {
        activeSubcategories = children
            .where((child) => _categoryMatchesQuery(child, query))
            .toList();
      }
    }

    final isMobile = MediaQuery.of(context).size.width < 1000;

    // Empty state
    if (filteredParentCategories.isEmpty) {
      return _buildEmptyState(isDark);
    }

    if (isMobile) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _buildParentsList(
            paginatedParents,
            effectiveActiveParentId,
            filteredParentCategories.length,
            isDark,
          ),
          const SizedBox(height: 16),
          if (activeParent != null)
            _buildActiveParentDetails(
              activeParent,
              activeSubcategories,
              isDark,
            ),
        ],
      );
    }

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          flex: 6,
          child: _buildParentsList(
            paginatedParents,
            effectiveActiveParentId,
            filteredParentCategories.length,
            isDark,
          ),
        ),
        const SizedBox(width: 24),
        Expanded(
          flex: 4,
          child: activeParent != null
              ? _buildActiveParentDetails(
                  activeParent,
                  activeSubcategories,
                  isDark,
                )
              : _buildEmptySelection(isDark),
        ),
      ],
    );
  }

  // ── Empty state ───────────────────────────────────────────────────────────
  Widget _buildEmptyState(bool isDark) {
    final textPrimary = isDark
        ? AppColors.textPrimary
        : AppColors.lightTextPrimary;
    final textTertiary = isDark
        ? AppColors.textTertiary
        : AppColors.lightTextTertiary;

    return _UiCard(
      isDark: isDark,
      padding: const EdgeInsets.symmetric(vertical: 48, horizontal: 24),
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(LucideIcons.shapes, size: 48, color: textTertiary),
            const SizedBox(height: 12),
            Text(
              'admin.pages.categories.index.empty.title'.tr(),
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: textPrimary,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'admin.pages.categories.index.empty.hint'.tr(),
              style: TextStyle(fontSize: 13, color: textTertiary),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            AppButton.primary(
              label: 'admin.pages.categories.index.empty.newCategory'.tr(),
              icon: LucideIcons.plus,
              onPressed: () => context.push('/categories/create'),
            ),
          ],
        ),
      ),
    );
  }

  // ── Parents list panel ────────────────────────────────────────────────────
  Widget _buildParentsList(
    List<Category> parents,
    String? activeId,
    int totalCount,
    bool isDark,
  ) {
    final surfaceBorder = isDark
        ? AppColors.surfaceBorder
        : AppColors.lightSurfaceBorder;
    final textPrimary = isDark
        ? AppColors.textPrimary
        : AppColors.lightTextPrimary;
    final textTertiary = isDark
        ? AppColors.textTertiary
        : AppColors.lightTextTertiary;
    final brandColor = isDark ? AppColors.brand : AppColors.lightBrand;

    return _UiCard(
      isDark: isDark,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Panel header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'admin.pages.categories.index.workspace.parentsTitle'.tr(),
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: textPrimary,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'admin.pages.categories.index.workspace.parentsHint'.tr(),
                  style: TextStyle(fontSize: 12, color: textTertiary),
                ),
              ],
            ),
          ),

          Divider(height: 1, color: surfaceBorder),

          // Category rows
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: parents.length,
            separatorBuilder: (context, index) =>
                Divider(height: 1, color: surfaceBorder),
            itemBuilder: (context, index) {
              final category = parents[index];
              final isActive = category.id == activeId;
              return _CategoryRow(
                category: category,
                isActive: isActive,
                isDark: isDark,
                brandColor: brandColor,
                surfaceBorder: surfaceBorder,
                onTap: () => setState(() => _activeParentId = category.id),
              );
            },
          ),

          Divider(height: 1, color: surfaceBorder),

          // Pagination footer
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                AppButton.secondary(
                  label: '',
                  icon: LucideIcons.chevronLeft,
                  size: AppButtonSize.sm,
                  onPressed: _currentPage > 1
                      ? () => setState(() => _currentPage--)
                      : null,
                ),
                Text(
                  'admin.pages.categories.index.pagination.showing'.tr(
                    namedArgs: {
                      'from': ((_currentPage - 1) * _itemsPerPage + 1)
                          .toString(),
                      'to':
                          ((_currentPage - 1) * _itemsPerPage + parents.length)
                              .toString(),
                      'total': totalCount.toString(),
                    },
                  ),
                  style: TextStyle(
                    fontSize: 13,
                    color: isDark
                        ? AppColors.textSecondary
                        : AppColors.lightTextSecondary,
                  ),
                ),
                AppButton.secondary(
                  label: '',
                  icon: LucideIcons.chevronRight,
                  size: AppButtonSize.sm,
                  onPressed: parents.length == _itemsPerPage
                      ? () => setState(() => _currentPage++)
                      : null,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ── Detail panel (subcategories) ──────────────────────────────────────────
  Widget _buildActiveParentDetails(
    Category activeParent,
    List<Category> subcategories,
    bool isDark,
  ) {
    final textPrimary = isDark
        ? AppColors.textPrimary
        : AppColors.lightTextPrimary;
    final textSecondary = isDark
        ? AppColors.textSecondary
        : AppColors.lightTextSecondary;
    final textTertiary = isDark
        ? AppColors.textTertiary
        : AppColors.lightTextTertiary;

    return _UiCard(
      isDark: isDark,
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Detail header row
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'admin.pages.categories.index.workspace.subcategoriesTitle'
                          .tr()
                          .toUpperCase(),
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 0.6,
                        color: textTertiary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      activeParent.title,
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w600,
                        color: textPrimary,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    Text(
                      '/category/${activeParent.slug}',
                      style: TextStyle(fontSize: 12, color: textTertiary),
                    ),
                  ],
                ),
              ),
              // Action icon buttons — matches Nuxt .p-2 .rounded-md style
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  _ActionIconButton(
                    icon: LucideIcons.externalLink,
                    tooltip: 'admin.pages.categories.index.links.openCategory'
                        .tr(),
                    isDark: isDark,
                    onPressed: () {},
                  ),
                  _ActionIconButton(
                    icon: LucideIcons.copy,
                    tooltip: 'admin.pages.categories.index.links.copyCategory'
                        .tr(),
                    isDark: isDark,
                    onPressed: () => _copyLink(activeParent.slug),
                  ),
                  _ActionIconButton(
                    icon: LucideIcons.pencil,
                    tooltip: 'admin.common.edit'.tr(),
                    isDark: isDark,
                    onPressed: () =>
                        context.push('/categories/${activeParent.id}'),
                  ),
                  _ActionIconButton(
                    icon: LucideIcons.trash,
                    tooltip: 'admin.common.delete'.tr(),
                    isDark: isDark,
                    isDestructive: true,
                    onPressed: () => widget.onDeleteCategory(activeParent),
                  ),
                ],
              ),
            ],
          ),

          const SizedBox(height: 12),
          Text(
            'admin.pages.categories.index.workspace.subcategoriesHint'.tr(),
            style: TextStyle(fontSize: 13, color: textSecondary),
          ),
          const SizedBox(height: 16),

          // Subcategory list
          if (subcategories.isEmpty)
            _DashedBox(
              isDark: isDark,
              child: Text(
                'admin.pages.categories.index.workspace.noSubcategories'.tr(),
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                  color: textPrimary,
                ),
                textAlign: TextAlign.center,
              ),
            )
          else
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: subcategories.length,
              separatorBuilder: (context, index) => const SizedBox(height: 8),
              itemBuilder: (context, index) {
                final sub = subcategories[index];
                return _SubcategoryRow(
                  subcategory: sub,
                  isDark: isDark,
                  onCopy: () => _copyLink(sub.slug),
                  onEdit: () => context.push('/categories/${sub.id}'),
                  onDelete: () => widget.onDeleteCategory(sub),
                );
              },
            ),
        ],
      ),
    );
  }

  // ── Empty selection placeholder ───────────────────────────────────────────
  Widget _buildEmptySelection(bool isDark) {
    return _DashedBox(
      isDark: isDark,
      child: Text(
        'admin.pages.categories.index.workspace.selectCategory'.tr(),
        style: TextStyle(
          fontSize: 13,
          color: isDark
              ? AppColors.textSecondary
              : AppColors.lightTextSecondary,
        ),
        textAlign: TextAlign.center,
      ),
    );
  }
}

// ── Category row item ─────────────────────────────────────────────────────
class _CategoryRow extends StatelessWidget {
  final Category category;
  final bool isActive;
  final bool isDark;
  final Color brandColor;
  final Color surfaceBorder;
  final VoidCallback onTap;

  const _CategoryRow({
    required this.category,
    required this.isActive,
    required this.isDark,
    required this.brandColor,
    required this.surfaceBorder,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final textPrimary = isDark
        ? AppColors.textPrimary
        : AppColors.lightTextPrimary;
    final textTertiary = isDark
        ? AppColors.textTertiary
        : AppColors.lightTextTertiary;
    final surface3 = isDark ? AppColors.surface3 : AppColors.lightSurface3;

    return InkWell(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        color: isActive
            ? brandColor.withValues(alpha: 0.08)
            : Colors.transparent,
        child: Row(
          children: [
            // Thumbnail
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: surface3,
                borderRadius: BorderRadius.circular(6),
                border: Border.all(color: surfaceBorder),
              ),
              clipBehavior: Clip.antiAlias,
              child: category.imageUrl != null && category.imageUrl!.isNotEmpty
                  ? TenantImageWidget(imagePath: category.imageUrl!)
                  : Icon(LucideIcons.image, size: 18, color: textTertiary),
            ),
            const SizedBox(width: 12),
            // Title + slug
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    category.title,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: textPrimary,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  Text(
                    category.slug,
                    style: TextStyle(fontSize: 12, color: textTertiary),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            // Badges
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              mainAxisSize: MainAxisSize.min,
              children: [
                UiBadge(
                  label: 'admin.pages.categories.index.table.productsCount'.tr(
                    namedArgs: {'count': category.productCount.toString()},
                  ),
                  tone: isDark ? UiBadgeTone.slateDark : UiBadgeTone.slate,
                ),
                const SizedBox(height: 4),
                UiBadge(
                  label:
                      'admin.pages.categories.index.workspace.subcategoriesCount'
                          .tr(
                            namedArgs: {
                              'count': category.subcategoriesCount.toString(),
                            },
                          ),
                  tone: isDark ? UiBadgeTone.slateDark : UiBadgeTone.slate,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

// ── Subcategory row item ──────────────────────────────────────────────────
class _SubcategoryRow extends StatelessWidget {
  final Category subcategory;
  final bool isDark;
  final VoidCallback onCopy;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  const _SubcategoryRow({
    required this.subcategory,
    required this.isDark,
    required this.onCopy,
    required this.onEdit,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    final textPrimary = isDark
        ? AppColors.textPrimary
        : AppColors.lightTextPrimary;
    final textTertiary = isDark
        ? AppColors.textTertiary
        : AppColors.lightTextTertiary;
    final surfaceBorder = isDark
        ? AppColors.surfaceBorder
        : AppColors.lightSurfaceBorder;
    final surface2 = isDark ? AppColors.surface2 : AppColors.lightSurface2;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        border: Border.all(color: surfaceBorder),
        borderRadius: BorderRadius.circular(8),
        color: surface2,
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  subcategory.title,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                    color: textPrimary,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                Text(
                  subcategory.slug,
                  style: TextStyle(fontSize: 12, color: textTertiary),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              _ActionIconButton(
                icon: LucideIcons.externalLink,
                tooltip: 'admin.pages.categories.index.links.openCategory'.tr(),
                isDark: isDark,
                onPressed: () {},
              ),
              _ActionIconButton(
                icon: LucideIcons.copy,
                tooltip: 'admin.pages.categories.index.links.copyCategory'.tr(),
                isDark: isDark,
                onPressed: onCopy,
              ),
              _ActionIconButton(
                icon: LucideIcons.pencil,
                tooltip: 'admin.common.edit'.tr(),
                isDark: isDark,
                onPressed: onEdit,
              ),
              _ActionIconButton(
                icon: LucideIcons.trash,
                tooltip: 'admin.common.delete'.tr(),
                isDark: isDark,
                isDestructive: true,
                onPressed: onDelete,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// ── Action icon button (matches Nuxt: p-2 rounded-md transition-colors) ───
class _ActionIconButton extends StatefulWidget {
  final IconData icon;
  final String tooltip;
  final bool isDark;
  final bool isDestructive;
  final VoidCallback onPressed;

  const _ActionIconButton({
    required this.icon,
    required this.tooltip,
    required this.isDark,
    required this.onPressed,
    this.isDestructive = false,
  });

  @override
  State<_ActionIconButton> createState() => _ActionIconButtonState();
}

class _ActionIconButtonState extends State<_ActionIconButton> {
  bool _hovered = false;

  @override
  Widget build(BuildContext context) {
    final textTertiary = widget.isDark
        ? AppColors.textTertiary
        : AppColors.lightTextTertiary;

    Color iconColor;
    Color bgColor;

    if (_hovered && widget.isDestructive) {
      iconColor = AppColors.red;
      bgColor = AppColors.red.withValues(alpha: 0.08);
    } else if (_hovered) {
      iconColor = widget.isDark
          ? AppColors.textPrimary
          : AppColors.lightTextPrimary;
      bgColor = widget.isDark
          ? AppColors.navHoverBg
          : AppColors.lightNavHoverBg;
    } else {
      iconColor = textTertiary;
      bgColor = Colors.transparent;
    }

    return Tooltip(
      message: widget.tooltip,
      child: MouseRegion(
        onEnter: (_) => setState(() => _hovered = true),
        onExit: (_) => setState(() => _hovered = false),
        child: GestureDetector(
          onTap: widget.onPressed,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 120),
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: bgColor,
              borderRadius: BorderRadius.circular(6),
            ),
            child: Icon(widget.icon, size: 15, color: iconColor),
          ),
        ),
      ),
    );
  }
}

// ── Dashed bordered placeholder box ──────────────────────────────────────
class _DashedBox extends StatelessWidget {
  final bool isDark;
  final Widget child;

  const _DashedBox({required this.isDark, required this.child});

  @override
  Widget build(BuildContext context) {
    final surfaceBorder = isDark
        ? AppColors.surfaceBorder
        : AppColors.lightSurfaceBorder;
    final surface2 = isDark ? AppColors.surface2 : AppColors.lightSurface2;

    return CustomPaint(
      painter: _DashedBorderPainter(color: surfaceBorder),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
        decoration: BoxDecoration(
          color: surface2.withValues(alpha: 0.5),
          borderRadius: BorderRadius.circular(8),
        ),
        alignment: Alignment.center,
        child: child,
      ),
    );
  }
}

class _DashedBorderPainter extends CustomPainter {
  final Color color;

  _DashedBorderPainter({required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = 1
      ..style = PaintingStyle.stroke;

    const dashWidth = 5.0;
    const dashSpace = 4.0;
    const radius = Radius.circular(8);

    final rrect = RRect.fromRectAndRadius(
      Rect.fromLTWH(0, 0, size.width, size.height),
      radius,
    );

    final path = Path()..addRRect(rrect);
    final metrics = path.computeMetrics();

    for (final metric in metrics) {
      double distance = 0;
      while (distance < metric.length) {
        canvas.drawPath(
          metric.extractPath(distance, distance + dashWidth),
          paint,
        );
        distance += dashWidth + dashSpace;
      }
    }
  }

  @override
  bool shouldRepaint(covariant _DashedBorderPainter oldDelegate) =>
      oldDelegate.color != color;
}

// ── Shared ui-card ────────────────────────────────────────────────────────
class _UiCard extends StatelessWidget {
  final bool isDark;
  final Widget child;
  final EdgeInsets padding;

  const _UiCard({
    required this.isDark,
    required this.child,
    this.padding = EdgeInsets.zero,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: isDark ? AppColors.surface1 : AppColors.lightSurface1,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark
              ? AppColors.surfaceBorder
              : AppColors.lightSurfaceBorder,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: child,
    );
  }
}
