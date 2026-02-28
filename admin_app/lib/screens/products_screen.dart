import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:easy_localization/easy_localization.dart';
import '../services/api_service.dart';
import '../providers/products_provider.dart';
import '../models/product.dart';
import '../utils/debouncer.dart';
import '../widgets/responsive_filter_bar.dart';
import '../widgets/responsive_paginated_table.dart';
import '../widgets/buttons/app_button.dart';
import '../widgets/form/form_input.dart';
import '../widgets/form/form_select.dart';
import '../widgets/badges/ui_badge.dart';

// Filter Notifiers
class CategoryFilterNotifier extends Notifier<String> {
  @override
  String build() => '';
  void set(String value) => state = value;
}

final productCategoryFilterProvider =
    NotifierProvider<CategoryFilterNotifier, String>(
      CategoryFilterNotifier.new,
    );

class StatusFilterNotifier extends Notifier<String> {
  @override
  String build() => '';
  void set(String value) => state = value;
}

final productStatusFilterProvider =
    NotifierProvider<StatusFilterNotifier, String>(StatusFilterNotifier.new);

class SortFilterNotifier extends Notifier<String> {
  @override
  String build() => 'recent';
  void set(String value) => state = value;
}

final productSortProvider = NotifierProvider<SortFilterNotifier, String>(
  SortFilterNotifier.new,
);

class ProductsScreen extends ConsumerStatefulWidget {
  final bool autoFetch;

  const ProductsScreen({super.key, this.autoFetch = true});

  @override
  ConsumerState<ProductsScreen> createState() => _ProductsScreenState();
}

class _ProductsScreenState extends ConsumerState<ProductsScreen> {
  final TextEditingController _searchController = TextEditingController();
  final Debouncer _searchDebouncer = Debouncer(milliseconds: 300);
  Set<String> _selectedProductIds = {};

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (widget.autoFetch) {
        ref.read(productsProvider.notifier).fetchProducts();
        ref.read(productsProvider.notifier).fetchCategories();
      }
      // Reset filters on entry
      ref.read(productCategoryFilterProvider.notifier).set('');
      ref.read(productStatusFilterProvider.notifier).set('');
      ref.read(productSortProvider.notifier).set('recent');
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
    final productsState = ref.watch(productsProvider);
    final filteredProducts = _filterProducts(productsState.products);
    final categories = ref.watch(productsProvider).categories;
    final isMobile = MediaQuery.of(context).size.width < 800;

    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB), // Gray-50
      floatingActionButton: isMobile
          ? FloatingActionButton(
              onPressed: () => context.go('/products/create'),
              backgroundColor: const Color(0xFF0F172A), // Slate-900
              child: const Icon(LucideIcons.plus, color: Colors.white),
            )
          : null,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (!isMobile) ...[
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 24, 24, 16),
              child: _buildHeader(),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: _buildActionsRow(),
            ),
            const SizedBox(height: 16),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: _buildFilters(categories, isMobile: isMobile),
            ),
          ] else
            Padding(
              padding: const EdgeInsets.all(12),
              child: _buildFilters(categories, isMobile: isMobile),
            ),
          SizedBox(height: isMobile ? 12 : 16),
          Expanded(
            child: Padding(
              padding: EdgeInsets.symmetric(horizontal: isMobile ? 12 : 24),
              child: productsState.isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : productsState.error != null
                  ? Center(
                      child: Text(
                        '${'admin.common.error'.tr()}: ${productsState.error}',
                      ),
                    )
                  : filteredProducts.isEmpty
                  ? _buildEmptyState()
                  : _buildProductsList(filteredProducts),
            ),
          ),
          SizedBox(height: isMobile ? 12 : 16),
        ],
      ),
    );
  }

  List<Product> _filterProducts(List<Product> products) {
    final selectedCategoryId = ref.watch(productCategoryFilterProvider);
    final selectedStatus = ref.watch(productStatusFilterProvider);
    final sortBy = ref.watch(productSortProvider);

    var filtered = products.where((product) {
      final matchesSearch =
          product.title.toLowerCase().contains(
            _searchController.text.toLowerCase(),
          ) ||
          product.slug.toLowerCase().contains(
            _searchController.text.toLowerCase(),
          );
      final matchesCategory =
          selectedCategoryId.isEmpty ||
          product.category?.id == selectedCategoryId;
      final matchesStatus =
          selectedStatus.isEmpty ||
          (selectedStatus == 'lowStock'
              ? product.stock > 0 && product.stock <= product.lowStockThreshold
              : (selectedStatus == 'active'
                    ? product.isActive
                    : !product.isActive));

      return matchesSearch && matchesCategory && matchesStatus;
    }).toList();

    // Apply sorting
    switch (sortBy) {
      case 'title':
        filtered.sort((a, b) => a.title.compareTo(b.title));
        break;
      case 'price':
        filtered.sort((a, b) => b.price.compareTo(a.price));
        break;
      case 'stock':
        filtered.sort((a, b) => b.stock.compareTo(a.stock));
        break;
      case 'status':
        filtered.sort(
          (a, b) => (b.isActive ? 1 : 0).compareTo(a.isActive ? 1 : 0),
        );
        break;
      case 'recent':
      default:
        // Sort by ID (typically chronological)
        filtered.sort((a, b) => b.id.compareTo(a.id));
        break;
    }

    return filtered;
  }

  Widget _buildHeader() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'admin.pages.products.index.title'.tr(),
              style: const TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: Color(0xFF111827), // Gray-900
                letterSpacing: -0.5,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'admin.pages.products.index.subtitle'.tr(),
              style: const TextStyle(
                fontSize: 14,
                color: Color(0xFF6B7280),
              ), // Gray-500
            ),
          ],
        ),
        AppButton.primary(
          label: 'admin.pages.products.index.addProduct'.tr(),
          icon: LucideIcons.plus,
          onPressed: () => context.go('/products/create'),
        ),
      ],
    );
  }

  Widget _buildActionsRow() {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: Row(
        children: [
          // Action Buttons in Toolbar? Maybe keep them separately or integrate?
          // The design shows Search + Sort + View Toggle usually.
          // Products screen has bulk actions. Let's keep them but style better if needed.
          // Actually, let's keep the user's bulk actions but in a nice row.
          // The previous "Actions Row" was a mix. Let's use the new Toolbar style for Search/Sort/Filter and keep Actions separate or above?
          // The products screen has a LOT of filters.
          // Let's stick to the previous layout but update the style of the "Actions Row" to be cleaner.
          _ActionToolbarButton(
            icon: LucideIcons.upload,
            label: 'admin.pages.products.index.bulk.export'.tr(),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(
                    'admin.common.featureComingSoon'.tr(
                      namedArgs: {
                        'feature': 'admin.pages.products.index.bulk.export'
                            .tr(),
                      },
                    ),
                  ),
                ),
              );
            },
          ),
          const SizedBox(width: 8),
          _ActionToolbarButton(
            icon: LucideIcons.download,
            label: 'admin.pages.products.index.bulk.import'.tr(),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(
                    'admin.common.featureComingSoon'.tr(
                      namedArgs: {
                        'feature': 'admin.pages.products.index.bulk.import'
                            .tr(),
                      },
                    ),
                  ),
                ),
              );
            },
          ),
          if (_selectedProductIds.isNotEmpty) ...[
            const SizedBox(width: 8),
            _ActionToolbarButton(
              icon: LucideIcons.edit,
              label: 'admin.pages.products.index.bulk.update'.tr(),
              onPressed: () {
                // ...
              },
              color: const Color(0xFF0F172A),
              textColor: Colors.white,
            ),
          ],
          const Spacer(),
          // Sort Dropdown
          Row(
            children: [
              Text(
                'admin.pages.products.index.sort.sortBy'.tr(),
                style: const TextStyle(fontSize: 13, color: Color(0xFF6B7280)),
              ),
              const SizedBox(width: 8),
              SizedBox(
                width: 150,
                child: Consumer(
                  builder: (context, ref, _) {
                    final sortBy = ref.watch(productSortProvider);
                    return FormSelect<String>(
                      label: 'admin.pages.products.index.sort.sortBy'.tr(),
                      showLabel: false,
                      value: sortBy,
                      fillColor: const Color(0xFFF3F4F6),
                      borderless: true,
                      borderRadius: 6,
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 10,
                      ),
                      items: [
                        DropdownMenuItem(
                          value: 'recent',
                          child: Text(
                            'admin.pages.products.index.sort.newest'.tr(),
                          ),
                        ),
                        DropdownMenuItem(
                          value: 'title',
                          child: Text(
                            'admin.pages.products.index.sort.title'.tr(),
                          ),
                        ),
                        DropdownMenuItem(
                          value: 'price',
                          child: Text(
                            'admin.pages.products.index.sort.price'.tr(),
                          ),
                        ),
                        DropdownMenuItem(
                          value: 'stock',
                          child: Text(
                            'admin.pages.products.index.sort.stock'.tr(),
                          ),
                        ),
                        DropdownMenuItem(
                          value: 'status',
                          child: Text(
                            'admin.pages.products.index.sort.status'.tr(),
                          ),
                        ),
                      ],
                      onChanged: (value) => ref
                          .read(productSortProvider.notifier)
                          .set(value ?? 'recent'),
                    );
                  },
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildFilters(List<Category> categories, {bool isMobile = false}) {
    return ResponsiveFilterBar(
      searchField: FormInput(
        label: 'admin.pages.products.index.filters.searchLabel'.tr(),
        controller: _searchController,
        hint: 'admin.pages.products.index.filters.searchPlaceholder'.tr(),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 16,
          vertical: 14,
        ),
        onChanged: (value) => _searchDebouncer.run(() => setState(() {})),
      ),
      filters: [
        // Category
        SizedBox(
          width: 180,
          child: Consumer(
            builder: (context, ref, _) {
              final selectedCategory = ref.watch(productCategoryFilterProvider);
              return FormSelect<String>(
                label: 'admin.pages.products.index.filters.category'.tr(),
                value: selectedCategory,
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 14,
                ),
                items: [
                  DropdownMenuItem(
                    value: '',
                    child: Text(
                      'admin.pages.products.index.filters.allCategories'.tr(),
                    ),
                  ),
                  ...categories.map(
                    (c) => DropdownMenuItem(value: c.id, child: Text(c.title)),
                  ),
                ],
                onChanged: (value) => ref
                    .read(productCategoryFilterProvider.notifier)
                    .set(value ?? ''),
              );
            },
          ),
        ),
        // Status
        SizedBox(
          width: 140,
          child: Consumer(
            builder: (context, ref, _) {
              final selectedStatus = ref.watch(productStatusFilterProvider);
              return FormSelect<String>(
                label: 'admin.pages.products.index.filters.status'.tr(),
                value: selectedStatus,
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 14,
                ),
                items: [
                  DropdownMenuItem(
                    value: '',
                    child: Text(
                      'admin.pages.products.index.filters.allStatus'.tr(),
                    ),
                  ),
                  DropdownMenuItem(
                    value: 'active',
                    child: Text('admin.common.active'.tr()),
                  ),
                  DropdownMenuItem(
                    value: 'inactive',
                    child: Text('admin.common.inactive'.tr()),
                  ),
                  DropdownMenuItem(
                    value: 'lowStock',
                    child: Text(
                      'admin.pages.products.index.filters.lowStock'.tr(),
                    ),
                  ),
                ],
                onChanged: (value) => ref
                    .read(productStatusFilterProvider.notifier)
                    .set(value ?? ''),
              );
            },
          ),
        ),
      ],
      actions: isMobile
          ? [
              Container(
                decoration: BoxDecoration(
                  border: Border.all(color: const Color(0xFFE5E7EB)),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: IconButton(
                  onPressed: () => _showMobileOperations(),
                  icon: const Icon(
                    LucideIcons.moreHorizontal,
                    size: 20,
                    color: Color(0xFF64748B),
                  ),
                  tooltip: 'admin.common.actions'.tr(),
                  style: IconButton.styleFrom(
                    padding: const EdgeInsets.all(12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                ),
              ),
            ]
          : null,
      onClearFilters: () {
        setState(() {
          _searchController.clear();
        });
        ref.read(productCategoryFilterProvider.notifier).set('');
        ref.read(productStatusFilterProvider.notifier).set('');
        ref.read(productSortProvider.notifier).set('recent');
      },
    );
  }

  void _showMobileOperations() {
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
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'admin.common.actions'.tr(),
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF0F172A),
                        ),
                      ),
                      IconButton(
                        icon: const Icon(LucideIcons.x, size: 20),
                        onPressed: () => Navigator.pop(context),
                      ),
                    ],
                  ),
                ),
                const Divider(),

                // Actions List
                Expanded(
                  child: ListView(
                    controller: scrollController,
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                    children: [
                      ListTile(
                        leading: const Icon(
                          LucideIcons.plus,
                          color: Color(0xFF0F172A),
                        ),
                        title: Text(
                          'admin.pages.products.index.addProduct'.tr(),
                        ),
                        onTap: () {
                          context.pop();
                          context.go('/products/create');
                        },
                      ),
                      ListTile(
                        leading: const Icon(
                          LucideIcons.arrowUpDown,
                          color: Color(0xFF64748B),
                        ),
                        title: Text(
                          'admin.pages.products.index.sort.sortBy'.tr(),
                        ),
                        trailing: SizedBox(
                          width: 160,
                          child: Consumer(
                            builder: (context, ref, _) {
                              final sortBy = ref.watch(productSortProvider);
                              return FormSelect<String>(
                                label: 'admin.pages.products.index.sort.sortBy'
                                    .tr(),
                                showLabel: false,
                                value: sortBy,
                                borderless: true,
                                filled: false,
                                icon: const Icon(
                                  LucideIcons.chevronDown,
                                  size: 16,
                                ),
                                contentPadding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 6,
                                ),
                                items: [
                                  DropdownMenuItem(
                                    value: 'recent',
                                    child: Text(
                                      'admin.pages.products.index.sort.newest'
                                          .tr(),
                                    ),
                                  ),
                                  DropdownMenuItem(
                                    value: 'title',
                                    child: Text(
                                      'admin.pages.products.index.sort.title'
                                          .tr(),
                                    ),
                                  ),
                                  DropdownMenuItem(
                                    value: 'price',
                                    child: Text(
                                      'admin.pages.products.index.sort.price'
                                          .tr(),
                                    ),
                                  ),
                                  DropdownMenuItem(
                                    value: 'stock',
                                    child: Text(
                                      'admin.pages.products.index.sort.stock'
                                          .tr(),
                                    ),
                                  ),
                                  DropdownMenuItem(
                                    value: 'status',
                                    child: Text(
                                      'admin.pages.products.index.sort.status'
                                          .tr(),
                                    ),
                                  ),
                                ],
                                onChanged: (value) {
                                  ref
                                      .read(productSortProvider.notifier)
                                      .set(value ?? 'recent');
                                },
                              );
                            },
                          ),
                        ),
                      ),
                      ListTile(
                        leading: const Icon(
                          LucideIcons.upload,
                          color: Color(0xFF64748B),
                        ),
                        title: Text(
                          'admin.pages.products.index.bulk.export'.tr(),
                        ),
                        onTap: () {
                          context.pop();
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text(
                                'admin.common.featureComingSoon'.tr(
                                  namedArgs: {
                                    'feature':
                                        'admin.pages.products.index.bulk.export'
                                            .tr(),
                                  },
                                ),
                              ),
                            ),
                          );
                        },
                      ),
                      ListTile(
                        leading: const Icon(
                          LucideIcons.download,
                          color: Color(0xFF64748B),
                        ),
                        title: Text(
                          'admin.pages.products.index.bulk.import'.tr(),
                        ),
                        onTap: () {
                          context.pop();
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text(
                                'admin.common.featureComingSoon'.tr(
                                  namedArgs: {
                                    'feature':
                                        'admin.pages.products.index.bulk.import'
                                            .tr(),
                                  },
                                ),
                              ),
                            ),
                          );
                        },
                      ),
                      if (_selectedProductIds.isNotEmpty) ...[
                        const Divider(),
                        ListTile(
                          leading: const Icon(
                            LucideIcons.edit,
                            color: Color(0xFF64748B),
                          ),
                          title: Text(
                            '${'admin.pages.products.index.bulk.update'.tr()} — ${'admin.pages.products.index.bulk.selected'.tr(namedArgs: {'count': _selectedProductIds.length.toString()})}',
                          ),
                          onTap: () {
                            context.pop();
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(
                                  'admin.common.featureComingSoon'.tr(
                                    namedArgs: {
                                      'feature':
                                          'admin.pages.products.index.bulk.update'
                                              .tr(),
                                    },
                                  ),
                                ),
                              ),
                            );
                          },
                        ),
                      ],
                    ],
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
                color: const Color(0xFFF1F5F9), // Slate-100
                shape: BoxShape.circle,
              ),
              child: const Icon(
                LucideIcons.package,
                size: 32,
                color: Color(0xFF94A3B8),
              ), // Slate-400
            ),
            const SizedBox(height: 16),
            Text(
              'admin.pages.products.index.empty.title'.tr(),
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: Color(0xFF1E293B), // Slate-800
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'admin.pages.products.index.empty.hint'.tr(),
              style: const TextStyle(color: Color(0xFF64748B)), // Slate-500
            ),
            const SizedBox(height: 24),
            AppButton.primary(
              label: 'admin.pages.products.index.empty.newProduct'.tr(),
              icon: LucideIcons.plus,
              onPressed: () => context.push('/products/create'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildProductsList(List<Product> products) {
    return ResponsivePaginatedTable<Product>(
      items: products,
      minWidth: 1280,
      header: _buildProductsTableHeader(products),
      rowBuilder: (context, product, index) =>
          _buildProductRow(context, product),
    );
  }

  Widget _buildProductsTableHeader(List<Product> products) {
    final visibleIds = products.map((p) => p.id).toSet();
    final selectedVisibleCount = _selectedProductIds
        .where(visibleIds.contains)
        .length;
    final allSelected =
        products.isNotEmpty && selectedVisibleCount == products.length;
    final noneSelected = selectedVisibleCount == 0;

    return Row(
      children: [
        SizedBox(
          width: 44,
          child: Checkbox(
            tristate: true,
            value: allSelected ? true : (noneSelected ? false : null),
            onChanged: (next) {
              setState(() {
                if (next == true) {
                  _selectedProductIds = visibleIds;
                } else {
                  _selectedProductIds = {};
                }
              });
            },
          ),
        ),
        Expanded(
          flex: 4,
          child: Text(
            'admin.pages.products.index.table.product'.tr(),
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: Color(0xFF64748B),
              letterSpacing: 0.5,
            ),
          ),
        ),
        Expanded(
          flex: 2,
          child: Text(
            'admin.pages.products.index.table.category'.tr(),
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: Color(0xFF6B7280),
              letterSpacing: 0.5,
            ),
          ),
        ),
        Expanded(
          flex: 1,
          child: Align(
            alignment: Alignment.centerRight,
            child: Text(
              'admin.pages.products.index.table.price'.tr(),
              style: const TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: Color(0xFF6B7280),
                letterSpacing: 0.5,
              ),
              textAlign: TextAlign.right,
            ),
          ),
        ),
        Expanded(
          flex: 1,
          child: Align(
            alignment: Alignment.centerRight,
            child: Text(
              'admin.pages.products.index.table.stock'.tr(),
              style: const TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: Color(0xFF6B7280),
                letterSpacing: 0.5,
              ),
              textAlign: TextAlign.right,
            ),
          ),
        ),
        Expanded(
          flex: 1,
          child: Align(
            alignment: Alignment.center,
            child: Text(
              'admin.pages.products.index.table.status'.tr(),
              style: const TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: Color(0xFF6B7280),
                letterSpacing: 0.5,
              ),
              textAlign: TextAlign.center,
            ),
          ),
        ),
        Expanded(
          flex: 3,
          child: Text(
            'admin.pages.products.index.table.links'.tr(),
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: Color(0xFF6B7280),
              letterSpacing: 0.5,
            ),
          ),
        ),
        Expanded(
          flex: 3,
          child: Align(
            alignment: Alignment.centerRight,
            child: Text(
              'admin.pages.products.index.table.actions'.tr(),
              style: const TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: Color(0xFF6B7280),
                letterSpacing: 0.5,
              ),
              textAlign: TextAlign.right,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildStockCell(Product product) {
    if (product.stock == 0) {
      // Out of stock — red badge
      return UiBadge(
        label: 'admin.pages.products.index.table.outOfStock'.tr(),
        tone: UiBadgeTone.red,
        textAlign: TextAlign.center,
      );
    }
    if (product.stock <= product.lowStockThreshold) {
      // Low stock — amber badge with warning icon
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: UiBadge.backgroundColor(UiBadgeTone.amber),
          borderRadius: BorderRadius.circular(UiBadge.radius),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              LucideIcons.alertTriangle,
              size: 11,
              color: UiBadge.foregroundColor(UiBadgeTone.amber),
            ),
            const SizedBox(width: 4),
            Text(
              '${product.stock}',
              style: UiBadge.textStyle.copyWith(
                color: UiBadge.foregroundColor(UiBadgeTone.amber),
              ),
            ),
          ],
        ),
      );
    }
    // Normal stock — plain number
    return Text(
      '${product.stock}',
      style: const TextStyle(
        fontSize: 14,
        color: Color(0xFF374151),
        fontWeight: FontWeight.w500,
      ),
      textAlign: TextAlign.right,
    );
  }

  Widget _buildProductRow(BuildContext context, Product product) {
    final rawImageUrl = product.mainImageUrl;
    final imageUrl = rawImageUrl == null
        ? null
        : ref.read(apiProvider).resolvePublicUrl(rawImageUrl);
    final isSelected = _selectedProductIds.contains(product.id);

    return Container(
      color: isSelected ? const Color(0xFFF0FDFA) : null, // Teal-50-ish
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      child: Row(
        children: [
          SizedBox(
            width: 44,
            child: Checkbox(
              value: isSelected,
              onChanged: (next) {
                setState(() {
                  if (next == true) {
                    _selectedProductIds.add(product.id);
                  } else {
                    _selectedProductIds.remove(product.id);
                  }
                });
              },
            ),
          ),
          Expanded(
            flex: 4,
            child: Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: const Color(0xFFF9FAFB),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: const Color(0xFFE5E7EB),
                      width: 1,
                    ),
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
                          color: Color(0xFF94A3B8),
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
                        product.title,
                        style: const TextStyle(
                          fontWeight: FontWeight.w600,
                          fontSize: 14,
                          color: Color(0xFF111827),
                          letterSpacing: -0.1,
                        ),
                        overflow: TextOverflow.ellipsis,
                        maxLines: 1,
                      ),
                      const SizedBox(height: 3),
                      Text(
                        product.slug,
                        style: const TextStyle(
                          color: Color(0xFF6B7280),
                          fontSize: 12,
                        ),
                        overflow: TextOverflow.ellipsis,
                        maxLines: 1,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            flex: 2,
            child: Align(
              alignment: Alignment.centerLeft,
              child: product.category != null
                  ? UiBadge(
                      label: product.category!.title,
                      tone: UiBadgeTone.emerald,
                      maxWidth: 170,
                    )
                  : Text(
                      'admin.pages.products.index.table.uncategorized'.tr(),
                      style: const TextStyle(
                        color: Color(0xFF9CA3AF),
                        fontSize: 13,
                      ),
                    ),
            ),
          ),
          Expanded(
            flex: 1,
            child: Align(
              alignment: Alignment.centerRight,
              child: Text(
                '\$${product.price.toStringAsFixed(2)}',
                style: const TextStyle(
                  fontSize: 14,
                  color: Color(0xFF111827),
                  fontWeight: FontWeight.w600,
                  letterSpacing: -0.2,
                ),
                textAlign: TextAlign.right,
              ),
            ),
          ),
          Expanded(
            flex: 1,
            child: Align(
              alignment: Alignment.centerRight,
              child: _buildStockCell(product),
            ),
          ),
          Expanded(
            flex: 1,
            child: Align(
              alignment: Alignment.center,
              child: UiBadge(
                label: product.isActive
                    ? 'admin.common.active'.tr()
                    : 'admin.common.inactive'.tr(),
                tone: product.isActive
                    ? UiBadgeTone.emerald
                    : UiBadgeTone.slate,
                maxWidth: 110,
                textAlign: TextAlign.center,
              ),
            ),
          ),
          Expanded(
            flex: 3,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    SizedBox(
                      width: 60,
                      child: Text(
                        '${'admin.pages.products.index.links.product'.tr()}:',
                        style: const TextStyle(
                          fontSize: 11,
                          color: Color(0xFF9CA3AF), // Gray-400
                        ),
                      ),
                    ),
                    _LinkButton(
                      icon: LucideIcons.externalLink,
                      color: const Color(0xFF0D9488), // Teal-600
                      tooltip: 'admin.pages.products.index.links.openProduct'
                          .tr(),
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text(
                              'admin.common.featureComingSoon'.tr(
                                namedArgs: {
                                  'feature':
                                      'admin.pages.products.index.links.openProduct'
                                          .tr(),
                                },
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                    _LinkButton(
                      icon: LucideIcons.copy,
                      color: const Color(0xFF9CA3AF), // Gray-400
                      tooltip: 'admin.pages.products.index.links.copyProduct'
                          .tr(),
                      onPressed: () async {
                        await Clipboard.setData(
                          ClipboardData(
                            text: 'https://example.com/p/${product.slug}',
                          ),
                        );
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text('admin.common.copied'.tr())),
                          );
                        }
                      },
                    ),
                  ],
                ),
                Row(
                  children: [
                    SizedBox(
                      width: 60,
                      child: Text(
                        '${'admin.pages.products.index.links.landing'.tr()}:',
                        style: const TextStyle(
                          fontSize: 11,
                          color: Color(0xFF9CA3AF), // Gray-400
                        ),
                      ),
                    ),
                    _LinkButton(
                      icon: LucideIcons.externalLink,
                      color: const Color(0xFF0D9488), // Teal-600
                      tooltip: 'admin.pages.products.index.links.openLanding'
                          .tr(),
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text(
                              'admin.common.featureComingSoon'.tr(
                                namedArgs: {
                                  'feature':
                                      'admin.pages.products.index.links.openLanding'
                                          .tr(),
                                },
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                    _LinkButton(
                      icon: LucideIcons.copy,
                      color: const Color(0xFF9CA3AF), // Gray-400
                      tooltip: 'admin.pages.products.index.links.copyLanding'
                          .tr(),
                      onPressed: () async {
                        await Clipboard.setData(
                          ClipboardData(
                            text:
                                'https://example.com/p/${product.slug}?mode=landing',
                          ),
                        );
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text('admin.common.copied'.tr())),
                          );
                        }
                      },
                    ),
                  ],
                ),
              ],
            ),
          ),
          Expanded(
            flex: 3,
            child: Align(
              alignment: Alignment.centerRight,
              child: Wrap(
                spacing: 8,
                runSpacing: 8,
                alignment: WrapAlignment.end,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  AppButton.secondary(
                    label: 'admin.common.edit'.tr(),
                    icon: LucideIcons.pencil,
                    size: AppButtonSize.sm,
                    onPressed: () => context.push('/products/${product.id}'),
                  ),
                  AppButton.danger(
                    label: 'admin.common.delete'.tr(),
                    icon: LucideIcons.trash2,
                    size: AppButtonSize.sm,
                    onPressed: () => ref
                        .read(productsProvider.notifier)
                        .deleteProduct(product.id),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _LinkButton extends StatefulWidget {
  final IconData icon;
  final Color color;
  final VoidCallback onPressed;
  final String tooltip;

  const _LinkButton({
    required this.icon,
    required this.color,
    required this.onPressed,
    required this.tooltip,
  });

  @override
  State<_LinkButton> createState() => _LinkButtonState();
}

class _LinkButtonState extends State<_LinkButton> {
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

class _ActionToolbarButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback? onPressed;
  final Color? color;
  final Color? textColor;

  const _ActionToolbarButton({
    required this.icon,
    required this.label,
    required this.onPressed,
    this.color,
    this.textColor,
  });

  @override
  Widget build(BuildContext context) {
    return AppButton.secondary(label: label, icon: icon, onPressed: onPressed);
  }
}
