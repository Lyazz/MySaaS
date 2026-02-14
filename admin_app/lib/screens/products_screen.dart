import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../services/api_service.dart';
import '../providers/products_provider.dart';
import '../models/product.dart';
import '../utils/debouncer.dart';
import '../widgets/responsive_filter_bar.dart';

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
  const ProductsScreen({super.key});

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
      ref.read(productsProvider.notifier).fetchProducts();
      ref.read(productsProvider.notifier).fetchCategories();
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
                  ? Center(child: Text('Error: ${productsState.error}'))
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
          (selectedStatus == 'active' ? product.isActive : !product.isActive);

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
        const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Products',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: Color(0xFF111827), // Gray-900
                letterSpacing: -0.5,
              ),
            ),
            SizedBox(height: 4),
            Text(
              'Manage your product catalog',
              style: TextStyle(
                fontSize: 14,
                color: Color(0xFF6B7280),
              ), // Gray-500
            ),
          ],
        ),
        ElevatedButton.icon(
          onPressed: () => context.go('/products/create'),
          icon: const Icon(LucideIcons.plus, size: 16),
          label: const Text('Add Product'),
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF0F172A), // Slate-900
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8),
            ),
            elevation: 0,
          ),
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
            label: 'Export',
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Export CSV - Coming soon')),
              );
            },
          ),
          const SizedBox(width: 8),
          _ActionToolbarButton(
            icon: LucideIcons.download,
            label: 'Import',
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Import CSV - Coming soon')),
              );
            },
          ),
          if (_selectedProductIds.isNotEmpty) ...[
            const SizedBox(width: 8),
            _ActionToolbarButton(
              icon: LucideIcons.edit,
              label: 'Bulk Edit',
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
              const Text(
                'Sort by:',
                style: TextStyle(fontSize: 13, color: Color(0xFF6B7280)),
              ),
              const SizedBox(width: 8),
              Container(
                height: 36,
                padding: const EdgeInsets.symmetric(horizontal: 12),
                decoration: BoxDecoration(
                  color: const Color(0xFFF3F4F6),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: DropdownButtonHideUnderline(
                  child: Consumer(
                    builder: (context, ref, _) {
                      final sortBy = ref.watch(productSortProvider);
                      return DropdownButton<String>(
                        value: sortBy,
                        icon: const Icon(
                          LucideIcons.chevronDown,
                          size: 14,
                          color: Color(0xFF6B7280),
                        ),
                        items: const [
                          DropdownMenuItem(
                            value: 'recent',
                            child: Text('Recent'),
                          ),
                          DropdownMenuItem(
                            value: 'title',
                            child: Text('Title'),
                          ),
                          DropdownMenuItem(
                            value: 'price',
                            child: Text('Price'),
                          ),
                          DropdownMenuItem(
                            value: 'stock',
                            child: Text('Stock'),
                          ),
                          DropdownMenuItem(
                            value: 'status',
                            child: Text('Status'),
                          ),
                        ],
                        onChanged: (value) => ref
                            .read(productSortProvider.notifier)
                            .set(value ?? 'recent'),
                        style: const TextStyle(
                          color: Color(0xFF374151),
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                        ),
                      );
                    },
                  ),
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
      searchField: TextField(
        controller: _searchController,
        decoration: InputDecoration(
          hintText: 'Search products...',
          prefixIcon: const Icon(
            LucideIcons.search,
            size: 16,
            color: Color(0xFF94A3B8),
          ),
          filled: true,
          fillColor: Colors.white,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: const BorderSide(color: Color(0xFFE5E7EB)),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: const BorderSide(color: Color(0xFFE5E7EB)),
          ),
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 12,
            vertical: 0,
          ),
        ),
        onChanged: (value) => _searchDebouncer.run(() => setState(() {})),
      ),
      filters: [
        // Category
        Container(
          width: 180,
          padding: const EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(
            border: Border.all(color: const Color(0xFFE5E7EB)),
            borderRadius: BorderRadius.circular(8),
            color: Colors.white,
          ),
          child: DropdownButtonHideUnderline(
            child: Consumer(
              builder: (context, ref, _) {
                final selectedCategory = ref.watch(
                  productCategoryFilterProvider,
                );
                return DropdownButton<String>(
                  value: selectedCategory,
                  isExpanded: true,
                  icon: const Icon(
                    LucideIcons.chevronDown,
                    size: 16,
                    color: Color(0xFF64748B),
                  ),
                  items: [
                    const DropdownMenuItem(
                      value: '',
                      child: Text('All Categories'),
                    ),
                    ...categories.map(
                      (c) =>
                          DropdownMenuItem(value: c.id, child: Text(c.title)),
                    ),
                  ],
                  onChanged: (value) => ref
                      .read(productCategoryFilterProvider.notifier)
                      .set(value ?? ''),
                  style: const TextStyle(
                    color: Color(0xFF374151),
                    fontSize: 13,
                  ),
                );
              },
            ),
          ),
        ),
        // Status
        Container(
          width: 140,
          padding: const EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(
            border: Border.all(color: const Color(0xFFE5E7EB)),
            borderRadius: BorderRadius.circular(8),
            color: Colors.white,
          ),
          child: DropdownButtonHideUnderline(
            child: Consumer(
              builder: (context, ref, _) {
                final selectedStatus = ref.watch(productStatusFilterProvider);
                return DropdownButton<String>(
                  value: selectedStatus,
                  isExpanded: true,
                  icon: const Icon(
                    LucideIcons.chevronDown,
                    size: 16,
                    color: Color(0xFF64748B),
                  ),
                  items: const [
                    DropdownMenuItem(value: '', child: Text('All Status')),
                    DropdownMenuItem(value: 'active', child: Text('Active')),
                    DropdownMenuItem(
                      value: 'inactive',
                      child: Text('Inactive'),
                    ),
                  ],
                  onChanged: (value) => ref
                      .read(productStatusFilterProvider.notifier)
                      .set(value ?? ''),
                  style: const TextStyle(
                    color: Color(0xFF374151),
                    fontSize: 13,
                  ),
                );
              },
            ),
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
                  tooltip: 'More actions',
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
                      const Text(
                        'Actions',
                        style: TextStyle(
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
                        title: const Text('Add Product'),
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
                        title: const Text('Sort By'),
                        trailing: DropdownButtonHideUnderline(
                          child: Consumer(
                            builder: (context, ref, _) {
                              final sortBy = ref.watch(productSortProvider);
                              return DropdownButton<String>(
                                value: sortBy,
                                items: const [
                                  DropdownMenuItem(
                                    value: 'recent',
                                    child: Text('Recent'),
                                  ),
                                  DropdownMenuItem(
                                    value: 'title',
                                    child: Text('Title'),
                                  ),
                                  DropdownMenuItem(
                                    value: 'price',
                                    child: Text('Price'),
                                  ),
                                  DropdownMenuItem(
                                    value: 'stock',
                                    child: Text('Stock'),
                                  ),
                                  DropdownMenuItem(
                                    value: 'status',
                                    child: Text('Status'),
                                  ),
                                ],
                                onChanged: (value) {
                                  ref
                                      .read(productSortProvider.notifier)
                                      .set(value ?? 'recent');
                                },
                                style: const TextStyle(
                                  color: Color(0xFF374151),
                                  fontSize: 13,
                                ),
                                icon: const Icon(
                                  LucideIcons.chevronDown,
                                  size: 16,
                                ),
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
                        title: const Text('Export CSV'),
                        onTap: () {
                          context.pop();
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Export CSV - Coming soon'),
                            ),
                          );
                        },
                      ),
                      ListTile(
                        leading: const Icon(
                          LucideIcons.download,
                          color: Color(0xFF64748B),
                        ),
                        title: const Text('Import CSV'),
                        onTap: () {
                          context.pop();
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Import CSV - Coming soon'),
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
                            'Bulk Edit (${_selectedProductIds.length})',
                          ),
                          onTap: () {
                            context.pop();
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(
                                  'Bulk edit ${_selectedProductIds.length} products - Coming soon',
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
                    child: ElevatedButton(
                      onPressed: () => Navigator.pop(context),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF0F172A),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                      child: const Text('Close'),
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
            const Text(
              'No products found',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: Color(0xFF1E293B), // Slate-800
              ),
            ),
            const SizedBox(height: 4),
            const Text(
              'Try adjusting your filters or create a new product.',
              style: TextStyle(color: Color(0xFF64748B)), // Slate-500
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: () {
                context.push('/products/create');
              },
              icon: const Icon(LucideIcons.plus, size: 16),
              label: const Text('New Product'),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF0D9488),
                foregroundColor: Colors.white,
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildProductsList(List<Product> products) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: SingleChildScrollView(
        scrollDirection: Axis.vertical,
        child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: DataTable(
            horizontalMargin: 16,
            columnSpacing: 16,
            headingRowHeight: 48,
            dataRowHeight: 64,
            headingRowColor: WidgetStateProperty.all(const Color(0xFFF9FAFB)),
            border: const TableBorder(
              horizontalInside: BorderSide(color: Color(0xFFE5E7EB), width: 1),
            ),
            showCheckboxColumn: true,
            columns: const [
              DataColumn(
                label: Text(
                  'PRODUCT',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF64748B),
                    letterSpacing: 0.5,
                  ),
                ),
              ),
              DataColumn(
                label: Text(
                  'CATEGORY',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF6B7280),
                    letterSpacing: 0.5,
                  ),
                ),
              ),
              DataColumn(
                label: Text(
                  'PRICE',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF6B7280),
                    letterSpacing: 0.5,
                  ),
                ),
              ),
              DataColumn(
                label: Text(
                  'STOCK',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF6B7280),
                    letterSpacing: 0.5,
                  ),
                ),
              ),
              DataColumn(
                label: Text(
                  'STATUS',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF6B7280),
                    letterSpacing: 0.5,
                  ),
                ),
              ),
              DataColumn(
                label: Text(
                  'LINKS',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF6B7280),
                    letterSpacing: 0.5,
                  ),
                ),
              ),
              DataColumn(
                label: Text(
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
            rows: _buildProductRows(products),
          ),
        ),
      ),
    );
  }

  List<DataRow> _buildProductRows(List<Product> products) {
    return products.map((product) {
      final rawImageUrl = product.mainImageUrl;
      final imageUrl = rawImageUrl == null
          ? null
          : ref.read(apiProvider).resolvePublicUrl(rawImageUrl);
      final isSelected = _selectedProductIds.contains(product.id);

      return DataRow(
        selected: isSelected,
        onSelectChanged: (selected) {
          setState(() {
            if (selected ?? false) {
              _selectedProductIds.add(product.id);
            } else {
              _selectedProductIds.remove(product.id);
            }
          });
        },
        cells: [
          // Product cell (image + title + slug)
          DataCell(
            SizedBox(
              width: 250,
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
          ),

          // Category cell
          DataCell(
            Container(
              width: 120, // Constrain width
              alignment: Alignment.centerLeft,
              child: product.category != null
                  ? Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xFFD1FAE5),
                        borderRadius: BorderRadius.circular(9999),
                      ),
                      child: Text(
                        product.category!.title,
                        style: const TextStyle(
                          color: Color(0xFF065F46),
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                        overflow: TextOverflow.ellipsis,
                        maxLines: 1,
                      ),
                    )
                  : const Text(
                      '-',
                      style: TextStyle(color: Color(0xFF9CA3AF), fontSize: 13),
                    ),
            ),
          ),

          // Price cell
          DataCell(
            SizedBox(
              width: 80,
              child: Text(
                '\$${product.price.toStringAsFixed(2)}',
                style: const TextStyle(
                  fontSize: 14,
                  color: Color(0xFF111827),
                  fontWeight: FontWeight.w600,
                  letterSpacing: -0.2,
                ),
              ),
            ),
          ),

          // Stock cell
          DataCell(
            SizedBox(
              width: 60,
              child: Text(
                '${product.stock}',
                style: const TextStyle(
                  fontSize: 14,
                  color: Color(0xFF374151),
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ),

          // Status cell
          DataCell(
            SizedBox(
              width: 80,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: product.isActive
                      ? const Color(0xFFD1FAE5)
                      : const Color(0xFFF3F4F6),
                  borderRadius: BorderRadius.circular(9999),
                ),
                child: Text(
                  product.isActive ? 'Active' : 'Inactive',
                  style: TextStyle(
                    color: product.isActive
                        ? const Color(0xFF065F46)
                        : const Color(0xFF1F2937),
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                  overflow: TextOverflow.ellipsis,
                  maxLines: 1,
                  textAlign: TextAlign.center,
                ),
              ),
            ),
          ),

          // Links cell
          DataCell(
            SizedBox(
              width: 180,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Product Link
                  Row(
                    children: [
                      const SizedBox(
                        width: 50,
                        child: Text(
                          'Product:',
                          style: TextStyle(
                            fontSize: 11,
                            color: Color(0xFF9CA3AF), // Gray-400
                          ),
                        ),
                      ),
                      _LinkButton(
                        icon: LucideIcons.externalLink,
                        color: const Color(0xFF0D9488), // Teal-600
                        tooltip: 'Open Product',
                        onPressed: () {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('Open product ${product.slug}'),
                            ),
                          );
                        },
                      ),
                      _LinkButton(
                        icon: LucideIcons.copy,
                        color: const Color(0xFF9CA3AF), // Gray-400
                        tooltip: 'Copy Product Link',
                        onPressed: () async {
                          await Clipboard.setData(
                            ClipboardData(
                              text: 'https://example.com/p/${product.slug}',
                            ),
                          );
                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('Product link copied'),
                              ),
                            );
                          }
                        },
                      ),
                    ],
                  ),
                  // Landing Link
                  Row(
                    children: [
                      const SizedBox(
                        width: 50,
                        child: Text(
                          'Landing:',
                          style: TextStyle(
                            fontSize: 11,
                            color: Color(0xFF9CA3AF), // Gray-400
                          ),
                        ),
                      ),
                      _LinkButton(
                        icon: LucideIcons.externalLink,
                        color: const Color(0xFF0D9488), // Teal-600
                        tooltip: 'Open Landing Page',
                        onPressed: () {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text(
                                'Open landing page for ${product.slug}',
                              ),
                            ),
                          );
                        },
                      ),
                      _LinkButton(
                        icon: LucideIcons.copy,
                        color: const Color(0xFF9CA3AF), // Gray-400
                        tooltip: 'Copy Landing Link',
                        onPressed: () async {
                          await Clipboard.setData(
                            ClipboardData(
                              text:
                                  'https://example.com/p/${product.slug}?mode=landing',
                            ),
                          );
                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('Landing link copied'),
                              ),
                            );
                          }
                        },
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),

          // Actions cell
          DataCell(
            SizedBox(
              width: 140,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton.icon(
                    onPressed: () => context.push('/products/${product.id}'),
                    icon: const Icon(LucideIcons.pencil, size: 14),
                    label: const Text('Edit'),
                    style: TextButton.styleFrom(
                      foregroundColor: const Color(0xFF0D9488), // Teal-600
                      textStyle: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                      ),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                    ),
                  ),
                  TextButton.icon(
                    onPressed: () => ref
                        .read(productsProvider.notifier)
                        .deleteProduct(product.id),
                    icon: const Icon(LucideIcons.trash2, size: 14),
                    label: const Text('Delete'),
                    style: TextButton.styleFrom(
                      foregroundColor: const Color(0xFFDC2626), // Red-600
                      textStyle: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                      ),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      );
    }).toList();
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
    final isEnabled = onPressed != null;

    return OutlinedButton.icon(
      onPressed: onPressed,
      icon: Icon(icon, size: 14),
      label: Text(label),
      style: OutlinedButton.styleFrom(
        foregroundColor:
            textColor ??
            (isEnabled ? const Color(0xFF334155) : const Color(0xFF94A3B8)),
        side: BorderSide(
          color: isEnabled ? const Color(0xFFCBD5E1) : const Color(0xFFE2E8F0),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        backgroundColor: color ?? Colors.white,
      ),
    );
  }
}
