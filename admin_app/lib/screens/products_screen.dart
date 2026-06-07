import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:easy_localization/easy_localization.dart';
import '../models/app_mode.dart';
import '../providers/auth_provider.dart';
import '../providers/products_provider.dart';
import '../models/product.dart';
import '../utils/debouncer.dart';
import '../utils/tenant_currency.dart';
import '../widgets/responsive_filter_bar.dart';
import '../widgets/responsive_paginated_table.dart';
import '../widgets/buttons/app_button.dart';
import '../widgets/buttons/table_action_button.dart';
import '../widgets/form/form_input.dart';
import '../widgets/form/form_select.dart';
import '../widgets/badges/ui_badge.dart';
import '../theme/app_theme.dart';
import '../providers/store_settings_provider.dart';
import '../widgets/tenant_image_widget.dart';
import '../utils/app_toasts.dart';

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
    final isOfflineTenant = ref.watch(authProvider).mode == AppMode.offlineOnly;
    final isMobile = MediaQuery.of(context).size.width < 800;

    return Scaffold(
      floatingActionButton: (isMobile && !isOfflineTenant)
          ? FloatingActionButton(
              onPressed: () => context.go('/products/create'),
              backgroundColor: Theme.of(context).colorScheme.primary,
              child: Icon(
                LucideIcons.plus,
                color: Theme.of(context).colorScheme.onPrimary,
              ),
            )
          : null,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (!isMobile) ...[
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 24, 24, 12),
              child: _buildHeader(),
            ),
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
    final isOfflineTenant = ref.watch(authProvider).mode == AppMode.offlineOnly;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textPrimary = isDark ? AppColors.textPrimary : AppColors.lightTextPrimary;
    final textSecondary = isDark ? AppColors.textSecondary : AppColors.lightTextSecondary;

    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'admin.pages.products.index.title'.tr(),
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: textPrimary,
                letterSpacing: -0.5,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'admin.pages.products.index.subtitle'.tr(),
              style: TextStyle(
                fontSize: 14,
                color: textSecondary,
              ),
            ),
          ],
        ),
        if (!isOfflineTenant)
          AppButton.primary(
            label: 'app.admin_pages_products_index_add'.tr().tr(),
            icon: LucideIcons.plus,
            onPressed: () => context.go('/products/create'),
          ),
      ],
    );
  }

  Widget _buildFilters(List<Category> categories, {bool isMobile = false}) {
    final selectedCategoryId = ref.watch(productCategoryFilterProvider);
    final selectedStatus = ref.watch(productStatusFilterProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final surfaceBorder = isDark ? AppColors.surfaceBorder : AppColors.lightSurfaceBorder;
    final textTertiary = isDark ? AppColors.textTertiary : AppColors.lightTextTertiary;

    final activeFilterChips = isMobile
        ? const <Widget>[]
        : _buildActiveFilterChips(
            categories,
            selectedCategoryId: selectedCategoryId,
            selectedStatus: selectedStatus,
          );

    return ResponsiveFilterBar(
      searchField: FormInput(
        label: 'app.admin_pages_products_index_fil4'.tr().tr(),
        controller: _searchController,
        hint: 'admin.pages.products.index.filters.searchPlaceholder'.tr(),
        showLabel: isMobile,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 14,
          vertical: 12,
        ),
        onChanged: (value) => _searchDebouncer.run(() => setState(() {})),
      ),
      filters: [
        // Category
        SizedBox(
          width: isMobile ? double.infinity : 220,
          child: Consumer(
            builder: (context, ref, _) {
              final selectedCategory = ref.watch(productCategoryFilterProvider);
              return FormSelect<String>(
                showLabel: false,
                label: 'admin.pages.products.index.filters.category'.tr(),
                value: selectedCategory,
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 12,
                ),
                items: [
                  DropdownMenuItem(
                    value: '',
                    child: Text('app.admin_pages_products_index_fil'.tr().tr()),
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
          width: isMobile ? double.infinity : 180,
          child: Consumer(
            builder: (context, ref, _) {
              final selectedStatus = ref.watch(productStatusFilterProvider);
              return FormSelect<String>(
                showLabel: false,
                label: 'admin.pages.products.index.filters.status'.tr(),
                value: selectedStatus,
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 12,
                ),
                items: [
                  DropdownMenuItem(
                    value: '',
                    child: Text(
                      'app.admin_pages_products_index_fil2'.tr().tr(),
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
                      'app.admin_pages_products_index_fil3'.tr().tr(),
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
                  border: Border.all(color: surfaceBorder),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: IconButton(
                  onPressed: () => _showMobileOperations(),
                  icon: Icon(
                    LucideIcons.moreHorizontal,
                    size: 20,
                    color: textTertiary,
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
          : _buildDesktopToolbarActions(),
      collapseDesktopFilters: true,
      activeFilterCount:
          (selectedCategoryId.isNotEmpty ? 1 : 0) +
          (selectedStatus.isNotEmpty ? 1 : 0),
      activeFilterChips: activeFilterChips,
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

  List<Widget> _buildDesktopToolbarActions() {
    return [
      if (_selectedProductIds.isNotEmpty) ...[
        AppButton.neutral(
          label: 'admin.pages.products.index.bulk.update'.tr(),
          icon: LucideIcons.edit,
          onPressed: () =>
              _showComingSoon('admin.pages.products.index.bulk.update'.tr()),
        ),
        const SizedBox(width: 8),
      ],
      _buildImportExportMenu(),
      const SizedBox(width: 12),
      _buildSortSelect(),
    ];
  }

  Widget _buildImportExportMenu() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textTertiary = isDark ? AppColors.textTertiary : AppColors.lightTextTertiary;

    return PopupMenuButton<String>(
      tooltip: 'admin.common.actions'.tr(),
      position: PopupMenuPosition.under,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      onSelected: (value) {
        if (value == 'export') {
          _showComingSoon('admin.pages.products.index.bulk.export'.tr());
        } else if (value == 'import') {
          _showComingSoon('admin.pages.products.index.bulk.import'.tr());
        }
      },
      itemBuilder: (context) => [
        PopupMenuItem(
          value: 'export',
          child: Row(
            children: [
              Icon(
                LucideIcons.upload,
                size: 16,
                color: textTertiary,
              ),
              const SizedBox(width: 8),
              Text('admin.pages.products.index.bulk.export'.tr()),
            ],
          ),
        ),
        PopupMenuItem(
          value: 'import',
          child: Row(
            children: [
              Icon(
                LucideIcons.download,
                size: 16,
                color: textTertiary,
              ),
              const SizedBox(width: 8),
              Text('admin.pages.products.index.bulk.import'.tr()),
            ],
          ),
        ),
      ],
      child: IgnorePointer(
        child: AppButton.secondary(
          label: 'CSV',
          icon: LucideIcons.arrowDownUp,
          trailing: const Icon(LucideIcons.chevronDown, size: 14),
          onPressed: () {},
        ),
      ),
    );
  }

  Widget _buildSortSelect() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textSecondary = isDark ? AppColors.textSecondary : AppColors.lightTextSecondary;

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          'app.admin_pages_products_index_sor'.tr().tr(),
          style: TextStyle(fontSize: 13, color: textSecondary),
        ),
        const SizedBox(width: 8),
        SizedBox(
          width: 150,
          child: Consumer(
            builder: (context, ref, _) {
              final sortBy = ref.watch(productSortProvider);
              return FormSelect<String>(
                label: 'app.admin_pages_products_index_sor'.tr().tr(),
                showLabel: false,
                value: sortBy,
                borderRadius: 6,
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 10,
                ),
                items: [
                  DropdownMenuItem(
                    value: 'recent',
                    child: Text('admin.pages.products.index.sort.newest'.tr()),
                  ),
                  DropdownMenuItem(
                    value: 'title',
                    child: Text('admin.pages.products.index.sort.title'.tr()),
                  ),
                  DropdownMenuItem(
                    value: 'price',
                    child: Text('admin.pages.products.index.sort.price'.tr()),
                  ),
                  DropdownMenuItem(
                    value: 'stock',
                    child: Text('admin.pages.products.index.sort.stock'.tr()),
                  ),
                  DropdownMenuItem(
                    value: 'status',
                    child: Text('admin.pages.products.index.sort.status'.tr()),
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
    );
  }

  List<Widget> _buildActiveFilterChips(
    List<Category> categories, {
    required String selectedCategoryId,
    required String selectedStatus,
  }) {
    final chips = <Widget>[];
    final selectedCategory = categories
        .where((category) => category.id == selectedCategoryId)
        .firstOrNull;

    if (selectedCategory != null) {
      chips.add(
        _ActiveFilterChip(
          label: selectedCategory.title,
          onDeleted: () =>
              ref.read(productCategoryFilterProvider.notifier).set(''),
        ),
      );
    }

    if (selectedStatus.isNotEmpty) {
      chips.add(
        _ActiveFilterChip(
          label: _statusFilterLabel(selectedStatus),
          onDeleted: () =>
              ref.read(productStatusFilterProvider.notifier).set(''),
        ),
      );
    }

    return chips;
  }

  String _statusFilterLabel(String status) {
    return switch (status) {
      'active' => 'admin.common.active'.tr(),
      'inactive' => 'admin.common.inactive'.tr(),
      'lowStock' => 'app.admin_pages_products_index_fil3'.tr().tr(),
      _ => status,
    };
  }

  void _showComingSoon(String feature) {
    AppToasts.show(
      context,
      'app.admin_common_featurecomingsoon'.tr().tr(
        namedArgs: {'feature': feature},
      ),
    );
  }

  void _showMobileOperations() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textPrimary = isDark ? AppColors.textPrimary : AppColors.lightTextPrimary;
    final textTertiary = isDark ? AppColors.textTertiary : AppColors.lightTextTertiary;
    final surfaceBorder = isDark ? AppColors.surfaceBorder : AppColors.lightSurfaceBorder;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: isDark
          ? AppColors.surface2
          : AppColors.lightSurface2,
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
                    color: surfaceBorder,
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
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: textPrimary,
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
                      if (!(ref.read(authProvider).mode == AppMode.offlineOnly))
                        ListTile(
                          leading: Icon(
                            LucideIcons.plus,
                            color: textPrimary,
                          ),
                          title: Text(
                            'app.admin_pages_products_index_add'.tr().tr(),
                          ),
                          onTap: () {
                            context.pop();
                            context.go('/products/create');
                          },
                        ),
                      ListTile(
                        leading: Icon(
                          LucideIcons.arrowUpDown,
                          color: textTertiary,
                        ),
                        title: Text(
                          'app.admin_pages_products_index_sor'.tr().tr(),
                        ),
                        trailing: SizedBox(
                          width: 160,
                          child: Consumer(
                            builder: (context, ref, _) {
                              final sortBy = ref.watch(productSortProvider);
                              return FormSelect<String>(
                                label: 'app.admin_pages_products_index_sor'
                                    .tr()
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
                        leading: Icon(
                          LucideIcons.upload,
                          color: textTertiary,
                        ),
                        title: Text(
                          'admin.pages.products.index.bulk.export'.tr(),
                        ),
                        onTap: () {
                          context.pop();
                          AppToasts.show(
                            context,
                            'app.admin_common_featurecomingsoon'.tr().tr(
                              namedArgs: {
                                'feature':
                                    'admin.pages.products.index.bulk.export'
                                        .tr(),
                              },
                            ),
                          );
                        },
                      ),
                      ListTile(
                        leading: Icon(
                          LucideIcons.download,
                          color: textTertiary,
                        ),
                        title: Text(
                          'admin.pages.products.index.bulk.import'.tr(),
                        ),
                        onTap: () {
                          context.pop();
                          AppToasts.show(
                            context,
                            'app.admin_common_featurecomingsoon'.tr().tr(
                              namedArgs: {
                                'feature':
                                    'admin.pages.products.index.bulk.import'
                                        .tr(),
                              },
                            ),
                          );
                        },
                      ),
                      if (_selectedProductIds.isNotEmpty) ...[
                        const Divider(),
                        ListTile(
                          leading: Icon(
                            LucideIcons.edit,
                            color: textTertiary,
                          ),
                          title: Text(
                            '${'admin.pages.products.index.bulk.update'.tr()} — ${'admin.pages.products.index.bulk.selected'.tr(namedArgs: {'count': _selectedProductIds.length.toString()})}',
                          ),
                          onTap: () {
                            context.pop();
                            AppToasts.show(
                              context,
                              'app.admin_common_featurecomingsoon'.tr().tr(
                                namedArgs: {
                                  'feature':
                                      'admin.pages.products.index.bulk.update'
                                          .tr(),
                                },
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
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textPrimary = isDark ? AppColors.textPrimary : AppColors.lightTextPrimary;
    final textMuted = isDark ? AppColors.textMuted : AppColors.lightTextMuted;
    final textTertiary = isDark ? AppColors.textTertiary : AppColors.lightTextTertiary;

    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 48),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: isDark ? AppColors.surface3 : AppColors.lightSurface3,
                shape: BoxShape.circle,
              ),
              child: Icon(
                LucideIcons.package,
                size: 32,
                color: textMuted,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'admin.pages.products.index.empty.title'.tr(),
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: textPrimary,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'admin.pages.products.index.empty.hint'.tr(),
              style: TextStyle(color: textTertiary),
            ),
            const SizedBox(height: 24),
            if (!(ref.watch(authProvider).mode == AppMode.offlineOnly))
              AppButton.primary(
                label: 'app.admin_pages_products_index_emp'.tr().tr(),
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
    
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textTertiary = isDark ? AppColors.textTertiary : AppColors.lightTextTertiary;
    final textSecondary = isDark ? AppColors.textSecondary : AppColors.lightTextSecondary;

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
            'admin.pages.products.index.table.product'.tr().toUpperCase(),
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: textTertiary,
              letterSpacing: 0.5,
            ),
          ),
        ),
        Expanded(
          flex: 3,
          child: Text(
            'admin.pages.products.index.table.category'.tr().toUpperCase(),
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: textTertiary,
              letterSpacing: 0.5,
            ),
          ),
        ),
        Expanded(
          flex: 3,
          child: Align(
            alignment: Alignment.centerLeft,
            child: Text(
              'admin.pages.products.index.table.price'.tr().toUpperCase(),
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: textTertiary,
                letterSpacing: 0.5,
              ),
            ),
          ),
        ),
        Expanded(
          flex: 2,
          child: Align(
            alignment: Alignment.centerLeft,
            child: Text(
              'admin.pages.products.index.table.stock'.tr().toUpperCase(),
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: textTertiary,
                letterSpacing: 0.5,
              ),
            ),
          ),
        ),
        Expanded(
          flex: 2,
          child: Align(
            alignment: Alignment.centerLeft,
            child: Text(
              'admin.pages.products.index.table.status'.tr().toUpperCase(),
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: textTertiary,
                letterSpacing: 0.5,
              ),
            ),
          ),
        ),
        Expanded(
          flex: 1,
          child: Align(
            alignment: Alignment.center,
            child: Text(
              'admin.pages.products.index.table.links'.tr().toUpperCase(),
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: textTertiary,
                letterSpacing: 0.5,
              ),
              textAlign: TextAlign.center,
            ),
          ),
        ),
        Expanded(
          flex: 2,
          child: Align(
            alignment: Alignment.centerRight,
            child: Text(
              'admin.pages.products.index.table.actions'.tr().toUpperCase(),
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: textTertiary,
                letterSpacing: 0.5,
              ),
              textAlign: TextAlign.right,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildStockCell(BuildContext context, Product product) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textPrimary = isDark ? AppColors.textPrimary : AppColors.lightTextPrimary;

    if (product.stock == 0) {
      // Out of stock — red badge
      return UiBadge(
        label: 'app.admin_pages_products_index_tab'.tr().tr(),
        tone: UiBadgeTone.red,
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
      style: TextStyle(
        fontSize: 13,
        color: textPrimary,
        fontWeight: FontWeight.w500,
      ),
    );
  }

  Widget _buildProductRow(BuildContext context, Product product) {
    final money = tenantCurrencyFormatter(
      ref.watch(storeSettingsProvider).settings,
    );
    final imagePath = product.mainImageUrl?.trim();
    final isSelected = _selectedProductIds.contains(product.id);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textPrimary = isDark ? AppColors.textPrimary : AppColors.lightTextPrimary;
    final textSecondary = isDark ? AppColors.textSecondary : AppColors.lightTextSecondary;
    final textMuted = isDark ? AppColors.textMuted : AppColors.lightTextMuted;
    final textTertiary = isDark ? AppColors.textTertiary : AppColors.lightTextTertiary;
    final surfaceBorder = isDark ? AppColors.surfaceBorder : AppColors.lightSurfaceBorder;

    return Container(
      color: isSelected
          ? Theme.of(context).colorScheme.primary.withValues(alpha: 0.06)
          : null,
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 13),
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
                  width: 28,
                  height: 28,
                  decoration: BoxDecoration(
                    color: isDark
                        ? AppColors.surface3
                        : AppColors.lightSurface3,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: surfaceBorder,
                      width: 1,
                    ),
                  ),
                  child: imagePath == null || imagePath.isEmpty
                      ? Icon(
                          LucideIcons.image,
                          color: textMuted,
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
                        product.title,
                        style: TextStyle(
                          fontWeight: FontWeight.w600,
                          fontSize: 13,
                          color: textPrimary,
                          letterSpacing: -0.1,
                        ),
                        overflow: TextOverflow.ellipsis,
                        maxLines: 1,
                      ),
                      const SizedBox(height: 3),
                      Text(
                        product.slug,
                        style: TextStyle(
                          color: textSecondary,
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
            flex: 3,
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
                      style: TextStyle(
                        color: textMuted,
                        fontSize: 13,
                      ),
                    ),
            ),
          ),
          Expanded(
            flex: 3,
            child: Align(
              alignment: Alignment.centerLeft,
              child: _buildPriceCell(product, money, isDark),
            ),
          ),
          Expanded(
            flex: 2,
            child: Align(
              alignment: Alignment.centerLeft,
              child: _buildStockCell(context, product),
            ),
          ),
          Expanded(
            flex: 2,
            child: Align(
              alignment: Alignment.centerLeft,
              child: Row(
                mainAxisSize: MainAxisSize.max,
                children: [
                  Transform.scale(
                    scale: 0.75,
                    child: Switch(
                      value: product.isActive,
                      activeThumbColor: Colors.white,
                      activeTrackColor: const Color(0xFF84CC16), // Lime-500
                      onChanged: (val) {
                        // Assuming you have a method to toggle status in the provider
                        // ref.read(productsProvider.notifier).toggleStatus(product.id, val);
                      },
                    ),
                  ),
                  const SizedBox(width: 2),
                  Flexible(
                    child: Text(
                      product.isActive
                          ? 'admin.common.active'.tr()
                          : 'admin.common.inactive'.tr(),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 13,
                        color: product.isActive
                            ? const Color(0xFF15803D)
                            : textTertiary,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          Expanded(
            flex: 1,
            child: Align(
              alignment: Alignment.center,
              child: PopupMenuButton<String>(
                icon: Icon(
                  LucideIcons.globe,
                  color: textTertiary,
                  size: 18,
                ),
                position: PopupMenuPosition.under,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
                itemBuilder: (context) => [
                  PopupMenuItem(
                    value: 'open_product',
                    child: Row(
                      children: [
                        Icon(
                          LucideIcons.externalLink,
                          size: 16,
                          color: textTertiary,
                        ),
                        const SizedBox(width: 8),
                        Text('app.admin_pages_products_index_lin'.tr().tr()),
                      ],
                    ),
                  ),
                  PopupMenuItem(
                    value: 'copy_product',
                    child: Row(
                      children: [
                        Icon(
                          LucideIcons.copy,
                          size: 16,
                          color: textTertiary,
                        ),
                        const SizedBox(width: 8),
                        Text('app.admin_pages_products_index_lin2'.tr().tr()),
                      ],
                    ),
                  ),
                  const PopupMenuDivider(),
                  PopupMenuItem(
                    value: 'open_landing',
                    child: Row(
                      children: [
                        Icon(
                          LucideIcons.externalLink,
                          size: 16,
                          color: textTertiary,
                        ),
                        const SizedBox(width: 8),
                        Text('app.admin_pages_products_index_lin3'.tr().tr()),
                      ],
                    ),
                  ),
                  PopupMenuItem(
                    value: 'copy_landing',
                    child: Row(
                      children: [
                        Icon(
                          LucideIcons.copy,
                          size: 16,
                          color: textTertiary,
                        ),
                        const SizedBox(width: 8),
                        Text('app.admin_pages_products_index_lin4'.tr().tr()),
                      ],
                    ),
                  ),
                ],
                onSelected: (value) async {
                  if (value == 'copy_product') {
                    await Clipboard.setData(
                      ClipboardData(
                        text: 'https://example.com/product/${product.slug}',
                      ),
                    );
                    if (context.mounted) {
                      AppToasts.show(context, 'admin.common.copied'.tr());
                    }
                  } else if (value == 'copy_landing') {
                    await Clipboard.setData(
                      ClipboardData(
                        text:
                            'https://example.com/product/${product.slug}?mode=landing',
                      ),
                    );
                    if (context.mounted) {
                      AppToasts.show(context, 'admin.common.copied'.tr());
                    }
                  } else {
                    if (context.mounted) {
                      AppToasts.show(
                        context,
                        'app.admin_common_featurecomingsoon'.tr().tr(
                          namedArgs: {'feature': value},
                        ),
                      );
                    }
                  }
                },
              ),
            ),
          ),
          Expanded(
            flex: 2,
            child: Align(
              alignment: Alignment.centerRight,
              child: Wrap(
                spacing: 8,
                runSpacing: 8,
                alignment: WrapAlignment.end,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  TableActionButton(
                    tooltip: 'admin.common.edit'.tr(),
                    icon: LucideIcons.pencil,
                    onPressed: () => context.push('/products/${product.id}'),
                  ),
                  TableActionButton(
                    tooltip: 'admin.common.delete'.tr(),
                    icon: LucideIcons.trash2,
                    isDanger: true,
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

  Widget _buildPriceCell(Product product, NumberFormat money, bool isDark) {
    final bool hasPromotion =
        product.promotionalPrice != null && product.promotionalPrice! > 0;
    final textMuted = isDark ? AppColors.textMuted : AppColors.lightTextMuted;
    final textPrimary = isDark ? AppColors.textPrimary : AppColors.lightTextPrimary;

    if (hasPromotion) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Row(
            children: [
              Text(
                money.format(product.promotionalPrice!),
                style: const TextStyle(
                  fontSize: 13,
                  color: Color(0xFF84CC16), // Lime-500
                  fontWeight: FontWeight.w600,
                  letterSpacing: -0.2,
                ),
              ),
              const SizedBox(width: 6),
              Text(
                money.format(product.price),
                style: TextStyle(
                  fontSize: 12,
                  color: textMuted,
                  decoration: TextDecoration.lineThrough,
                ),
              ),
            ],
          ),
          if (product.promotionEndDate != null)
            Padding(
              padding: const EdgeInsets.only(top: 2.0),
              child: Text(
                'exp. ${DateFormat('dd/MM/yyyy').format(product.promotionEndDate!)}',
                style: TextStyle(fontSize: 11, color: textMuted),
              ),
            ),
        ],
      );
    }

    return Text(
      money.format(product.price),
      style: TextStyle(
        fontSize: 13,
        color: textPrimary,
        fontWeight: FontWeight.w600,
        letterSpacing: -0.2,
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
        color: _isHovered ? widget.color.withValues(alpha: 0.8) : widget.color,
        onPressed: widget.onPressed,
        padding: const EdgeInsets.all(4),
        constraints: const BoxConstraints(minWidth: 24, minHeight: 24),
        tooltip: widget.tooltip,
      ),
    );
  }
}

class _ActiveFilterChip extends StatelessWidget {
  final String label;
  final VoidCallback onDeleted;

  const _ActiveFilterChip({required this.label, required this.onDeleted});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textTertiary = isDark ? AppColors.textTertiary : AppColors.lightTextTertiary;
    return Container(
      constraints: const BoxConstraints(maxWidth: 180),
      padding: const EdgeInsets.only(left: 10, right: 4, top: 6, bottom: 6),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surface2 : AppColors.lightSurface2,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(
          color: isDark
              ? AppColors.surfaceBorder
              : AppColors.lightSurfaceBorder,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Flexible(
            child: Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: textTertiary,
              ),
            ),
          ),
          const SizedBox(width: 4),
          InkWell(
            onTap: onDeleted,
            borderRadius: BorderRadius.circular(999),
            child: Padding(
              padding: const EdgeInsets.all(2),
              child: Icon(LucideIcons.x, size: 12, color: textTertiary),
            ),
          ),
        ],
      ),
    );
  }
}
