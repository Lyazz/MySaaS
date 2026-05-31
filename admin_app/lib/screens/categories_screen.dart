import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../models/app_mode.dart';
import '../providers/auth_provider.dart';
import '../providers/categories_provider.dart';
import '../models/product.dart';
import '../theme/app_theme.dart';
import '../utils/debouncer.dart';
import '../widgets/responsive_paginated_table.dart';
import '../widgets/responsive_filter_bar.dart';
import '../widgets/form/form_input.dart';
import '../widgets/form/form_select.dart';
import '../widgets/buttons/app_button.dart';
import '../widgets/buttons/table_action_button.dart';
import '../widgets/tenant_image_widget.dart';

class CategoriesScreen extends ConsumerStatefulWidget {
  const CategoriesScreen({super.key});

  @override
  ConsumerState<CategoriesScreen> createState() => _CategoriesScreenState();
}

class _CategoriesScreenState extends ConsumerState<CategoriesScreen> {
  final TextEditingController _searchController = TextEditingController();
  final Debouncer _searchDebouncer = Debouncer(milliseconds: 300);
  String _sortBy = 'createdAt';
  String _sortOrder = 'desc';
  Category? _categoryToDelete;
  bool _showDeleteModal = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref
          .read(categoriesProvider.notifier)
          .fetchCategories(sortBy: _sortBy, sortOrder: _sortOrder);
    });
  }

  @override
  void dispose() {
    _searchDebouncer.dispose();
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final categoriesState = ref.watch(categoriesProvider);
    final filteredCategories = _filterCategories(categoriesState.categories);
    final isOfflineTenant = ref.watch(authProvider).mode == AppMode.offlineOnly;
    final isMobile = MediaQuery.of(context).size.width < 800;

    return Scaffold(
      floatingActionButton: (isMobile && !isOfflineTenant)
          ? FloatingActionButton(
              onPressed: () => context.go('/categories/create'),
              backgroundColor: AppColors.brand,
              child: const Icon(
                LucideIcons.plus,
                color: AppColors.brandContrast,
              ),
            )
          : null,
      body: Stack(
        children: [
          SingleChildScrollView(
            child: Padding(
              padding: EdgeInsets.all(isMobile ? 16 : 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (!isMobile) ...[
                    _buildHeader(),
                    const SizedBox(height: 24),
                  ],
                  _buildFiltersCard(),
                  SizedBox(height: isMobile ? 16 : 24),
                  if (categoriesState.isLoading)
                    const Center(child: CircularProgressIndicator())
                  else if (categoriesState.error != null)
                    Center(child: Text('Error: ${categoriesState.error}'))
                  else if (filteredCategories.isEmpty)
                    _buildEmptyState()
                  else
                    _buildCategoriesTable(filteredCategories),
                ],
              ),
            ),
          ),
          if (_showDeleteModal) _buildDeleteModal(),
        ],
      ),
    );
  }

  List<Category> _filterCategories(List<Category> categories) {
    return categories.where((category) {
      final matchesSearch =
          category.title.toLowerCase().contains(
            _searchController.text.toLowerCase(),
          ) ||
          category.slug.toLowerCase().contains(
            _searchController.text.toLowerCase(),
          );
      return matchesSearch;
    }).toList();
  }

  Widget _buildHeader() {
    final isOfflineTenant = ref.watch(authProvider).mode == AppMode.offlineOnly;
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Categories',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: Theme.of(context).colorScheme.onSurface,
                letterSpacing: -0.5,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Manage your product categories',
              style: TextStyle(
                fontSize: 14,
                color: Theme.of(
                  context,
                ).colorScheme.onSurface.withValues(alpha: 0.5),
              ),
            ),
          ],
        ),
        if (!isOfflineTenant)
          AppButton.primary(
            label: 'Add Category',
            icon: LucideIcons.plus,
            onPressed: () => context.go('/categories/create'),
          ),
      ],
    );
  }

  Widget _buildFiltersCard() {
    return ResponsiveFilterBar(
      searchField: FormInput(
        label: 'Search',
        controller: _searchController,
        hint: 'Search categories...',
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 16,
          vertical: 14,
        ),
        onChanged: (value) => _searchDebouncer.run(() => setState(() {})),
      ),
      filters: [
        SizedBox(
          width: 180,
          child: FormSelect<String>(
            label: 'Sort',
            value: _sortBy,
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 16,
              vertical: 14,
            ),
            items: const [
              DropdownMenuItem(value: 'createdAt', child: Text('Newest')),
              DropdownMenuItem(value: 'title', child: Text('Title')),
              DropdownMenuItem(value: 'slug', child: Text('Slug')),
              DropdownMenuItem(value: 'products', child: Text('Products')),
            ],
            onChanged: (value) {
              if (value == null) return;
              _setSort(value);
            },
          ),
        ),
      ],
      onClearFilters: () {
        setState(() {
          _searchController.clear();
          _sortBy = 'createdAt';
          _sortOrder = 'desc';
        });
        ref
            .read(categoriesProvider.notifier)
            .fetchCategories(sortBy: _sortBy, sortOrder: _sortOrder);
      },
    );
  }

  void _setSort(String field) {
    setState(() {
      if (_sortBy == field) {
        _sortOrder = _sortOrder == 'asc' ? 'desc' : 'asc';
      } else {
        _sortBy = field;
        _sortOrder = field == 'createdAt' ? 'desc' : 'asc';
      }
    });
    ref
        .read(categoriesProvider.notifier)
        .fetchCategories(sortBy: _sortBy, sortOrder: _sortOrder);
  }

  Widget _buildEmptyState() {
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
                color: Theme.of(
                  context,
                ).colorScheme.onSurface.withValues(alpha: 0.3),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'No categories found',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: Theme.of(context).colorScheme.onSurface,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Get started by creating a new category.',
              style: TextStyle(
                color: Theme.of(
                  context,
                ).colorScheme.onSurface.withValues(alpha: 0.5),
              ),
            ),
            const SizedBox(height: 24),
            if (!(ref.watch(authProvider).mode == AppMode.offlineOnly))
              AppButton.primary(
                label: 'Add Category',
                icon: LucideIcons.plus,
                onPressed: () => context.push('/categories/create'),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildCategoriesTable(List<Category> categories) {
    return ResponsivePaginatedTable<Category>(
      items: categories,
      minWidth: 900,
      header: Builder(
        builder: (context) {
          final headerStyle = TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w600,
            color: Theme.of(
              context,
            ).colorScheme.onSurface.withValues(alpha: 0.5),
            letterSpacing: 0.5,
          );
          return Row(
            children: [
              Expanded(flex: 3, child: Text('CATEGORY', style: headerStyle)),
              Expanded(flex: 1, child: Text('PRODUCTS', style: headerStyle)),
              Expanded(flex: 1, child: Text('LINKS', style: headerStyle)),
              Expanded(
                flex: 1,
                child: Text(
                  'ACTIONS',
                  style: headerStyle,
                  textAlign: TextAlign.right,
                ),
              ),
            ],
          );
        },
      ),
      rowBuilder: (context, category, index) {
        final imagePath = category.imageUrl?.trim();

        return Padding(
          padding: EdgeInsets.symmetric(
            horizontal: MediaQuery.of(context).size.width < 800 ? 12 : 24,
            vertical: 12, // Reduced vertical padding
          ),
          child: Row(
            children: [
              // Category (Image + Title + Slug)
              Expanded(
                flex: 3,
                child: Row(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: Theme.of(
                          context,
                        ).colorScheme.surfaceContainerHighest,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: Theme.of(context).colorScheme.outline,
                        ),
                      ),
                      child: imagePath == null || imagePath.isEmpty
                          ? Icon(
                              LucideIcons.image,
                              color: Theme.of(
                                context,
                              ).colorScheme.onSurface.withValues(alpha: 0.3),
                              size: 20,
                            )
                          : ClipRRect(
                              borderRadius: BorderRadius.circular(8),
                              child: TenantImageWidget(imagePath: imagePath),
                            ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            category.title,
                            style: TextStyle(
                              fontWeight: FontWeight.w600,
                              fontSize: 14,
                              color: Theme.of(context).colorScheme.onSurface,
                              letterSpacing: -0.1,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 2),
                          Text(
                            category.slug,
                            style: TextStyle(
                              color: Theme.of(
                                context,
                              ).colorScheme.onSurface.withValues(alpha: 0.5),
                              fontSize: 12,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              // Products Count
              Expanded(
                flex: 1,
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: Theme.of(
                        context,
                      ).colorScheme.surfaceContainerHighest,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      '${category.productCount} products',
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.onSurface,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
              ),

              // Links
              Expanded(
                flex: 1,
                child: Row(
                  children: [
                    _TableIconButton(
                      icon: LucideIcons.externalLink,
                      color: const Color(0xFF65A30D), // Lime-600
                      onPressed: () {
                        // Open category in web app
                      },
                      tooltip: 'Open category page',
                    ),
                    const SizedBox(width: 4),
                    _TableIconButton(
                      icon: LucideIcons.copy,
                      color: const Color(0xFF9CA3AF), // Gray-400
                      onPressed: () => _copyLink(category.slug),
                      tooltip: 'Copy category link',
                    ),
                  ],
                ),
              ),

              // Actions
              Expanded(
                flex: 1,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    TableActionButton(
                      tooltip: 'Edit',
                      icon: LucideIcons.pencil,
                      onPressed: () =>
                          context.push('/categories/${category.id}'),
                    ),
                    const SizedBox(width: 8),
                    TableActionButton(
                      tooltip: 'Delete',
                      icon: LucideIcons.trash2,
                      isDanger: true,
                      onPressed: () => _confirmDelete(category),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Future<void> _copyLink(String slug) async {
    // For now, just copy a relative link
    final url = '/category/$slug';

    await Clipboard.setData(ClipboardData(text: url));

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Category link copied to clipboard'),
          duration: Duration(seconds: 2),
        ),
      );
    }
  }

  void _confirmDelete(Category category) {
    setState(() {
      _categoryToDelete = category;
      _showDeleteModal = true;
    });
  }

  Future<void> _handleDelete() async {
    if (_categoryToDelete == null) return;

    final success = await ref
        .read(categoriesProvider.notifier)
        .deleteCategory(_categoryToDelete!.id);

    setState(() {
      _showDeleteModal = false;
      _categoryToDelete = null;
    });

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            success
                ? 'Category deleted successfully'
                : 'Failed to delete category',
          ),
          backgroundColor: success ? Colors.green : Colors.red,
        ),
      );
    }
  }

  Widget _buildDeleteModal() {
    return Container(
      color: Colors.black54,
      child: Center(
        child: Container(
          margin: const EdgeInsets.all(24),
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surface,
            borderRadius: BorderRadius.circular(12),
          ),
          constraints: const BoxConstraints(maxWidth: 400),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Delete Category',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Theme.of(context).colorScheme.onSurface,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                'Are you sure you want to delete "${_categoryToDelete?.title}"? This action cannot be undone.',
                style: TextStyle(
                  color: Theme.of(
                    context,
                  ).colorScheme.onSurface.withValues(alpha: 0.5),
                ),
              ),
              const SizedBox(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  AppButton.secondary(
                    label: 'Cancel',
                    onPressed: () {
                      setState(() {
                        _showDeleteModal = false;
                        _categoryToDelete = null;
                      });
                    },
                  ),
                  const SizedBox(width: 12),
                  AppButton.danger(label: 'Delete', onPressed: _handleDelete),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _TableIconButton extends StatefulWidget {
  final IconData icon;
  final Color color;
  final VoidCallback onPressed;
  final String tooltip;

  const _TableIconButton({
    required this.icon,
    required this.color,
    required this.onPressed,
    required this.tooltip,
  });

  @override
  State<_TableIconButton> createState() => _TableIconButtonState();
}

class _TableIconButtonState extends State<_TableIconButton> {
  bool _isHovered = false;

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      onEnter: (_) => setState(() => _isHovered = true),
      onExit: (_) => setState(() => _isHovered = false),
      child: IconButton(
        icon: Icon(widget.icon, size: 14),
        color: _isHovered ? widget.color.withValues(alpha: 0.8) : widget.color,
        onPressed: widget.onPressed,
        padding: const EdgeInsets.all(4),
        constraints: const BoxConstraints(minWidth: 24, minHeight: 24),
        tooltip: widget.tooltip,
      ),
    );
  }
}
