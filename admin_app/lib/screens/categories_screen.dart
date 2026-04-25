import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../services/api_service.dart';
import '../providers/auth_provider.dart';
import '../providers/categories_provider.dart';
import '../models/product.dart';
import '../utils/debouncer.dart';
import '../widgets/responsive_paginated_table.dart';
import '../widgets/responsive_filter_bar.dart';
import '../widgets/form/form_input.dart';
import '../widgets/form/form_select.dart';
import '../widgets/buttons/app_button.dart';

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
    final isOfflineTenant = ref.watch(authProvider).user?.isOfflineTenant ?? false;
    final isMobile = MediaQuery.of(context).size.width < 800;

    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB), // Gray-50
      floatingActionButton: (isMobile && !isOfflineTenant)
          ? FloatingActionButton(
              onPressed: () => context.go('/categories/create'),
              backgroundColor: const Color(0xFF14B8A6), // Teal-500
              child: const Icon(LucideIcons.plus, color: Colors.white),
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
    final isOfflineTenant = ref.watch(authProvider).user?.isOfflineTenant ?? false;
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Categories',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: Color(0xFF111827), // Gray-900
                letterSpacing: -0.5,
              ),
            ),
            SizedBox(height: 4),
            Text(
              'Manage your product categories',
              style: TextStyle(
                fontSize: 14,
                color: Color(0xFF6B7280),
              ), // Gray-500
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
              decoration: const BoxDecoration(
                color: Color(0xFFF1F5F9), // Slate-100
                shape: BoxShape.circle,
              ),
              child: const Icon(
                LucideIcons.shapes,
                size: 32,
                color: Color(0xFF94A3B8),
              ), // Slate-400
            ),
            const SizedBox(height: 16),
            const Text(
              'No categories found',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: Color(0xFF1E293B), // Slate-800
              ),
            ),
            const SizedBox(height: 4),
            const Text(
              'Get started by creating a new category.',
              style: TextStyle(color: Color(0xFF64748B)), // Slate-500
            ),
            const SizedBox(height: 24),
            if (!(ref.watch(authProvider).user?.isOfflineTenant ?? false))
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
      header: const Row(
        children: [
          Expanded(
            flex: 3,
            child: Text(
              'CATEGORY',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: Color(0xFF6B7280), // Gray-500
                letterSpacing: 0.5,
              ),
            ),
          ),
          Expanded(
            flex: 1,
            child: Text(
              'PRODUCTS',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: Color(0xFF6B7280),
                letterSpacing: 0.5,
              ),
            ),
          ),
          Expanded(
            flex: 1,
            child: Text(
              'LINKS',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: Color(0xFF6B7280),
                letterSpacing: 0.5,
              ),
            ),
          ),
          Expanded(
            flex: 1,
            child: Text(
              'ACTIONS',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: Color(0xFF6B7280),
                letterSpacing: 0.5,
              ),
              textAlign: TextAlign.right,
            ),
          ),
        ],
      ),
      rowBuilder: (context, category, index) {
        final rawImageUrl = category.imageUrl;
        final imageUrl = rawImageUrl == null
            ? null
            : ref.read(apiProvider).resolvePublicUrl(rawImageUrl);

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
                        color: const Color(0xFFF9FAFB), // Gray-50
                        borderRadius: BorderRadius.circular(
                          8,
                        ), // Slightly more rounded
                        border: Border.all(
                          color: const Color(0xFFE5E7EB),
                        ), // Gray-200
                        image: imageUrl != null
                            ? DecorationImage(
                                image: NetworkImage(imageUrl),
                                fit: BoxFit.cover,
                              )
                            : null,
                      ),
                      child: imageUrl == null
                          ? const Icon(
                              LucideIcons.image,
                              color: Color(0xFF9CA3AF), // Gray-400
                              size: 20,
                            )
                          : null,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            category.title,
                            style: const TextStyle(
                              fontWeight: FontWeight.w600,
                              fontSize: 14,
                              color: Color(0xFF111827), // Gray-900
                              letterSpacing: -0.1,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 2),
                          Text(
                            category.slug,
                            style: const TextStyle(
                              color: Color(0xFF6B7280), // Gray-500
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
                      color: const Color(0xFFF3F4F6), // Gray-100
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      '${category.productCount} products',
                      style: const TextStyle(
                        color: Color(0xFF374151), // Gray-700
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
                      color: const Color(0xFF0D9488), // Teal-600
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
                    AppButton.secondary(
                      label: 'Edit',
                      icon: LucideIcons.pencil,
                      size: AppButtonSize.sm,
                      onPressed: () =>
                          context.push('/categories/${category.id}'),
                    ),
                    const SizedBox(width: 8),
                    AppButton.danger(
                      label: 'Delete',
                      icon: LucideIcons.trash2,
                      size: AppButtonSize.sm,
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
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
          ),
          constraints: const BoxConstraints(maxWidth: 400),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Delete Category',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 12),
              Text(
                'Are you sure you want to delete "${_categoryToDelete?.title}"? This action cannot be undone.',
                style: const TextStyle(color: Color(0xFF64748B)),
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
        color: _isHovered ? widget.color.withOpacity(0.8) : widget.color,
        onPressed: widget.onPressed,
        padding: const EdgeInsets.all(4),
        constraints: const BoxConstraints(minWidth: 24, minHeight: 24),
        tooltip: widget.tooltip,
      ),
    );
  }
}
