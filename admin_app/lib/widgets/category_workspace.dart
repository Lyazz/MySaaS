import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../models/product.dart';
import '../../theme/app_theme.dart';
import 'tenant_image_widget.dart';
import 'badges/ui_badge.dart';
import 'buttons/app_button.dart';

class CategoryWorkspace extends StatefulWidget {
  final List<Category> categories;
  final String searchQuery;
  final String sortBy;
  final String sortOrder;
  final Function(Category) onDeleteCategory;

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
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('app.category_link_copied_to_clipbo'.tr()),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final sortedCategories = List<Category>.from(widget.categories)
      ..sort(_compareCategories);

    final topLevelCategories =
        sortedCategories.where((c) => c.parentId == null).toList();

    final subcategoriesByParentId = <String, List<Category>>{};
    for (final category in sortedCategories) {
      if (category.parentId != null) {
        subcategoriesByParentId.putIfAbsent(category.parentId!, () => []).add(category);
      }
    }

    final query = widget.searchQuery.trim().toLowerCase();
    final filteredParentCategories = topLevelCategories.where((parent) {
      if (_categoryMatchesQuery(parent, query)) return true;
      final children = subcategoriesByParentId[parent.id] ?? [];
      return children.any((child) => _categoryMatchesQuery(child, query));
    }).toList();

    final totalPages =
        (filteredParentCategories.length / _itemsPerPage).ceil().clamp(1, 9999);
    if (_currentPage > totalPages) {
      _currentPage = totalPages;
    }

    final start = (_currentPage - 1) * _itemsPerPage;
    final end = (start + _itemsPerPage).clamp(0, filteredParentCategories.length);
    final paginatedParents = filteredParentCategories.sublist(start, end);

    if (paginatedParents.isNotEmpty) {
      if (_activeParentId == null ||
          !paginatedParents.any((c) => c.id == _activeParentId)) {
        // We use Future.microtask to avoid set state during build if this triggers a rebuild loop
        // but here it's fine as long as we delay it or do it gracefully.
        // Actually it's better to just set it locally if it's missing but not call setState immediately.
        // For simplicity, we just fallback if not found in current view.
        // To be safe we just use the first item directly in local resolution.
      }
    }
    final effectiveActiveParentId = (paginatedParents.any((c) => c.id == _activeParentId)
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
        activeSubcategories =
            children.where((child) => _categoryMatchesQuery(child, query)).toList();
      }
    }

    final isMobile = MediaQuery.of(context).size.width < 1000;

    if (filteredParentCategories.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 48),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.surfaceContainerHighest,
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  LucideIcons.shapes,
                  size: 32,
                  color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.3),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'admin.pages.categories.index.empty.title'.tr(),
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'admin.pages.categories.index.empty.hint'.tr(),
                style: TextStyle(
                  color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.5),
                ),
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

    if (isMobile) {
      // For mobile, maybe just show parents and a drill-down, but for now we stack them.
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _buildParentsList(paginatedParents, effectiveActiveParentId),
          const SizedBox(height: 16),
          if (activeParent != null)
            _buildActiveParentDetails(activeParent, activeSubcategories),
        ],
      );
    }

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          flex: 6,
          child: _buildParentsList(paginatedParents, effectiveActiveParentId),
        ),
        const SizedBox(width: 24),
        Expanded(
          flex: 4,
          child: activeParent != null
              ? _buildActiveParentDetails(activeParent, activeSubcategories)
              : _buildEmptySelection(),
        ),
      ],
    );
  }

  Widget _buildParentsList(List<Category> parents, String? activeId) {
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Theme.of(context).colorScheme.outlineVariant),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          )
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'admin.pages.categories.index.workspace.parentsTitle'.tr(),
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'admin.pages.categories.index.workspace.parentsHint'.tr(),
                  style: TextStyle(
                    fontSize: 12,
                    color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.5),
                  ),
                ),
              ],
            ),
          ),
          Divider(height: 1, color: Theme.of(context).colorScheme.outlineVariant),
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: parents.length,
            separatorBuilder: (context, index) => Divider(
              height: 1,
              color: Theme.of(context).colorScheme.outlineVariant,
            ),
            itemBuilder: (context, index) {
              final category = parents[index];
              final isActive = category.id == activeId;
              return InkWell(
                onTap: () {
                  setState(() {
                    _activeParentId = category.id;
                  });
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  color: isActive
                      ? Theme.of(context).colorScheme.primary.withValues(alpha: 0.08)
                      : Colors.transparent,
                  child: Row(
                    children: [
                      Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          color: Theme.of(context).colorScheme.surfaceContainerHighest,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: Theme.of(context).colorScheme.outlineVariant),
                        ),
                        clipBehavior: Clip.antiAlias,
                        child: category.imageUrl != null && category.imageUrl!.isNotEmpty
                            ? TenantImageWidget(imagePath: category.imageUrl!)
                            : Icon(
                                LucideIcons.image,
                                size: 20,
                                color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.3),
                              ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              category.title,
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            Text(
                              category.slug,
                              style: TextStyle(
                                fontSize: 12,
                                color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.5),
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 12),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          UiBadge(
                            label: 'admin.pages.categories.index.table.productsCount'
                                .tr(namedArgs: {'count': category.productCount.toString()}),
                            tone: UiBadgeTone.slate,
                          ),
                          const SizedBox(height: 4),
                          UiBadge(
                            label: 'admin.pages.categories.index.workspace.subcategoriesCount'
                                .tr(namedArgs: {'count': category.subcategoriesCount.toString()}),
                            tone: UiBadgeTone.slate,
                          ),
                        ],
                      )
                    ],
                  ),
                ),
              );
            },
          ),
          Divider(height: 1, color: Theme.of(context).colorScheme.outlineVariant),
          // Pagination footer
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                AppButton.secondary(
                  label: '',
                  icon: LucideIcons.chevronLeft,
                  onPressed: _currentPage > 1
                      ? () => setState(() => _currentPage--)
                      : null,
                ),
                Text(
                  'admin.pages.categories.index.pagination.showing'.tr(namedArgs: {
                    'from': ((_currentPage - 1) * _itemsPerPage + 1).toString(),
                    'to': ((_currentPage - 1) * _itemsPerPage + parents.length)
                        .toString(),
                    'total': widget.categories.where((c) => c.parentId == null).length.toString() // Approximated
                  }),
                  style: TextStyle(
                    fontSize: 14,
                    color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.6),
                  ),
                ),
                AppButton.secondary(
                  label: '',
                  icon: LucideIcons.chevronRight,
                  onPressed: parents.length == _itemsPerPage
                      ? () => setState(() => _currentPage++)
                      : null,
                ),
              ],
            ),
          )
        ],
      ),
    );
  }

  Widget _buildActiveParentDetails(
      Category activeParent, List<Category> subcategories) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Theme.of(context).colorScheme.outlineVariant),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          )
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
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
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 0.5,
                        color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.5),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      activeParent.title,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w600,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    Text(
                      '/category/${activeParent.slug}',
                      style: TextStyle(
                        fontSize: 12,
                        color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.5),
                      ),
                    ),
                  ],
                ),
              ),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  _HeaderIconButton(
                    icon: LucideIcons.externalLink,
                    onPressed: () {}, // Open category
                    tooltip: 'admin.pages.categories.index.links.openCategory'.tr(),
                  ),
                  _HeaderIconButton(
                    icon: LucideIcons.copy,
                    onPressed: () => _copyLink(activeParent.slug),
                    tooltip: 'admin.pages.categories.index.links.copyCategory'.tr(),
                  ),
                  _HeaderIconButton(
                    icon: LucideIcons.pencil,
                    onPressed: () => context.push('/categories/${activeParent.id}'),
                    tooltip: 'admin.common.edit'.tr(),
                  ),
                  _HeaderIconButton(
                    icon: LucideIcons.trash,
                    color: Colors.red,
                    onPressed: () => widget.onDeleteCategory(activeParent),
                    tooltip: 'admin.common.delete'.tr(),
                  ),
                ],
              )
            ],
          ),
          const SizedBox(height: 16),
          Text(
            'admin.pages.categories.index.workspace.subcategoriesHint'.tr(),
            style: TextStyle(
              fontSize: 14,
              color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.6),
            ),
          ),
          const SizedBox(height: 16),
          if (subcategories.isEmpty)
            Container(
              padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
              decoration: BoxDecoration(
                border: Border.all(
                  color: Theme.of(context).colorScheme.outlineVariant,
                  style: BorderStyle.solid, // Should be dashed realistically
                ),
                borderRadius: BorderRadius.circular(8),
                color: Theme.of(context).colorScheme.surfaceContainerHighest.withValues(alpha: 0.3),
              ),
              alignment: Alignment.center,
              child: Text(
                'admin.pages.categories.index.workspace.noSubcategories'.tr(),
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
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
                return Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    border: Border.all(color: Theme.of(context).colorScheme.outlineVariant),
                    borderRadius: BorderRadius.circular(8),
                    color: Theme.of(context).colorScheme.surfaceContainerHighest.withValues(alpha: 0.3),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              sub.title,
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w500,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            Text(
                              sub.slug,
                              style: TextStyle(
                                fontSize: 12,
                                color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.5),
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          _HeaderIconButton(
                            icon: LucideIcons.externalLink,
                            onPressed: () {},
                            tooltip: 'admin.pages.categories.index.links.openCategory'.tr(),
                          ),
                          _HeaderIconButton(
                            icon: LucideIcons.copy,
                            onPressed: () => _copyLink(sub.slug),
                            tooltip: 'admin.pages.categories.index.links.copyCategory'.tr(),
                          ),
                          _HeaderIconButton(
                            icon: LucideIcons.pencil,
                            onPressed: () => context.push('/categories/${sub.id}'),
                            tooltip: 'admin.common.edit'.tr(),
                          ),
                          _HeaderIconButton(
                            icon: LucideIcons.trash,
                            color: Colors.red,
                            onPressed: () => widget.onDeleteCategory(sub),
                            tooltip: 'admin.common.delete'.tr(),
                          ),
                        ],
                      )
                    ],
                  ),
                );
              },
            ),
        ],
      ),
    );
  }

  Widget _buildEmptySelection() {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
      decoration: BoxDecoration(
        border: Border.all(
          color: Theme.of(context).colorScheme.outlineVariant,
        ),
        borderRadius: BorderRadius.circular(8),
        color: Theme.of(context).colorScheme.surfaceContainerHighest.withValues(alpha: 0.3),
      ),
      alignment: Alignment.center,
      child: Text(
        'admin.pages.categories.index.workspace.selectCategory'.tr(),
        style: TextStyle(
          fontSize: 14,
          color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.6),
        ),
      ),
    );
  }
}

class _HeaderIconButton extends StatefulWidget {
  final IconData icon;
  final VoidCallback onPressed;
  final Color? color;
  final String tooltip;

  const _HeaderIconButton({
    required this.icon,
    required this.onPressed,
    this.color,
    required this.tooltip,
  });

  @override
  State<_HeaderIconButton> createState() => _HeaderIconButtonState();
}

class _HeaderIconButtonState extends State<_HeaderIconButton> {
  bool _isHovered = false;

  @override
  Widget build(BuildContext context) {
    final baseColor = widget.color ?? Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.5);

    return Tooltip(
      message: widget.tooltip,
      child: MouseRegion(
        onEnter: (_) => setState(() => _isHovered = true),
        onExit: (_) => setState(() => _isHovered = false),
        child: InkWell(
          onTap: widget.onPressed,
          borderRadius: BorderRadius.circular(6),
          child: Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: _isHovered
                  ? (widget.color != null
                      ? widget.color!.withValues(alpha: 0.1)
                      : Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.05))
                  : Colors.transparent,
              borderRadius: BorderRadius.circular(6),
            ),
            child: Icon(
              widget.icon,
              size: 16,
              color: _isHovered
                  ? (widget.color ?? Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.8))
                  : baseColor,
            ),
          ),
        ),
      ),
    );
  }
}
