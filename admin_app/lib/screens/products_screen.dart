import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../providers/products_provider.dart';
import '../models/product.dart';

class ProductsScreen extends ConsumerStatefulWidget {
  const ProductsScreen({super.key});

  @override
  ConsumerState<ProductsScreen> createState() => _ProductsScreenState();
}

class _ProductsScreenState extends ConsumerState<ProductsScreen> {
  final TextEditingController _searchController = TextEditingController();
  String _selectedCategoryId = '';
  String _selectedStatus = '';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(productsProvider.notifier).fetchProducts();
      ref.read(productsProvider.notifier).fetchCategories();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final productsState = ref.watch(productsProvider);
    final filteredProducts = _filterProducts(productsState.products);

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC), // Slate-50
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildHeader(),
            const SizedBox(height: 24),
            _buildFiltersCard(productsState.categories),
            const SizedBox(height: 24),
            if (productsState.isLoading)
              const Center(child: CircularProgressIndicator())
            else if (productsState.error != null)
              Center(child: Text('Error: ${productsState.error}'))
            else if (filteredProducts.isEmpty)
              _buildEmptyState()
            else
              _buildProductsList(filteredProducts),
          ],
        ),
      ),
    );
  }

  List<Product> _filterProducts(List<Product> products) {
    return products.where((product) {
      final matchesSearch =
          product.title.toLowerCase().contains(
            _searchController.text.toLowerCase(),
          ) ||
          product.slug.toLowerCase().contains(
            _searchController.text.toLowerCase(),
          );
      final matchesCategory =
          _selectedCategoryId.isEmpty ||
          product.category?.id == _selectedCategoryId;
      final matchesStatus =
          _selectedStatus.isEmpty ||
          (_selectedStatus == 'active' ? product.isActive : !product.isActive);

      return matchesSearch && matchesCategory && matchesStatus;
    }).toList();
  }

  Widget _buildHeader() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Products',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: Color(0xFF1E293B), // Slate-800
              ),
            ),
            const SizedBox(height: 4),
            const Text(
              'Manage your product catalog',
              style: TextStyle(
                color: Color(0xFF64748B),
                fontSize: 14,
              ), // Slate-500
            ),
          ],
        ),
        ElevatedButton.icon(
          onPressed: () {
            context.push('/products/create');
          },
          icon: const Icon(LucideIcons.plus, size: 16),
          label: const Text('Add Product'),
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF0D9488), // Teal-600
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

  Widget _buildFiltersCard(List<Category> categories) {
    return Container(
      padding: const EdgeInsets.all(20),
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
          final isWide = constraints.maxWidth > 800;
          return Flex(
            direction: isWide ? Axis.horizontal : Axis.vertical,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Search
              Expanded(
                flex: isWide ? 2 : 0,
                child: SizedBox(
                  width: isWide ? null : double.infinity,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Search',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                          color: Color(0xFF475569),
                        ),
                      ),
                      const SizedBox(height: 6),
                      TextField(
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
                            borderSide: const BorderSide(
                              color: Color(0xFFCBD5E1),
                            ),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(8),
                            borderSide: const BorderSide(
                              color: Color(0xFFCBD5E1),
                            ),
                          ),
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 0,
                          ),
                        ),
                        onChanged: (value) => setState(() {}),
                      ),
                    ],
                  ),
                ),
              ),
              SizedBox(width: 16, height: isWide ? 0 : 16),
              // Category
              Expanded(
                flex: isWide ? 1 : 0,
                child: SizedBox(
                  width: isWide ? null : double.infinity,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Category',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                          color: Color(0xFF475569),
                        ),
                      ),
                      const SizedBox(height: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        decoration: BoxDecoration(
                          border: Border.all(color: const Color(0xFFCBD5E1)),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: DropdownButtonHideUnderline(
                          child: DropdownButton<String>(
                            value: _selectedCategoryId,
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
                                (c) => DropdownMenuItem(
                                  value: c.id,
                                  child: Text(c.title),
                                ),
                              ),
                            ],
                            onChanged: (value) => setState(
                              () => _selectedCategoryId = value ?? '',
                            ),
                            style: const TextStyle(
                              color: Color(0xFF334155),
                              fontSize: 14,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              SizedBox(width: 16, height: isWide ? 0 : 16),
              // Status
              Expanded(
                flex: isWide ? 1 : 0,
                child: SizedBox(
                  width: isWide ? null : double.infinity,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Status',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                          color: Color(0xFF475569),
                        ),
                      ),
                      const SizedBox(height: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        decoration: BoxDecoration(
                          border: Border.all(color: const Color(0xFFCBD5E1)),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: DropdownButtonHideUnderline(
                          child: DropdownButton<String>(
                            value: _selectedStatus,
                            isExpanded: true,
                            icon: const Icon(
                              LucideIcons.chevronDown,
                              size: 16,
                              color: Color(0xFF64748B),
                            ),
                            items: const [
                              DropdownMenuItem(
                                value: '',
                                child: Text('All Status'),
                              ),
                              DropdownMenuItem(
                                value: 'active',
                                child: Text('Active'),
                              ),
                              DropdownMenuItem(
                                value: 'inactive',
                                child: Text('Inactive'),
                              ),
                            ],
                            onChanged: (value) =>
                                setState(() => _selectedStatus = value ?? ''),
                            style: const TextStyle(
                              color: Color(0xFF334155),
                              fontSize: 14,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          );
        },
      ),
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
      child: Column(
        children: [
          // Header Row
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            decoration: const BoxDecoration(
              color: Color(0xFFF8FAFC), // Slate-50
              border: Border(bottom: BorderSide(color: Color(0xFFE2E8F0))),
              borderRadius: BorderRadius.vertical(top: Radius.circular(12)),
            ),
            child: const Row(
              children: [
                Expanded(
                  flex: 3,
                  child: Text(
                    'PRODUCT',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF64748B),
                    ),
                  ),
                ),
                Expanded(
                  flex: 1,
                  child: Text(
                    'CATEGORY',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF64748B),
                    ),
                  ),
                ),
                Expanded(
                  flex: 1,
                  child: Text(
                    'PRICE',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF64748B),
                    ),
                  ),
                ),
                Expanded(
                  flex: 1,
                  child: Text(
                    'STOCK',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF64748B),
                    ),
                  ),
                ),
                Expanded(
                  flex: 1,
                  child: Text(
                    'STATUS',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF64748B),
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
                      color: Color(0xFF64748B),
                    ),
                    textAlign: TextAlign.right,
                  ),
                ),
              ],
            ),
          ),

          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: products.length,
            separatorBuilder: (context, index) =>
                const Divider(height: 1, color: Color(0xFFE2E8F0)),
            itemBuilder: (context, index) {
              final product = products[index];
              return Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 20,
                  vertical: 16,
                ),
                child: Row(
                  children: [
                    // Product (Image + Title)
                    Expanded(
                      flex: 3,
                      child: Row(
                        children: [
                          Container(
                            width: 36,
                            height: 36,
                            decoration: BoxDecoration(
                              color: const Color(0xFFF1F5F9), // Slate-100
                              borderRadius: BorderRadius.circular(6),
                              image: product.mainImageUrl != null
                                  ? DecorationImage(
                                      image: NetworkImage(
                                        product.mainImageUrl!,
                                      ),
                                      fit: BoxFit.cover,
                                    )
                                  : null,
                            ),
                            child: product.mainImageUrl == null
                                ? const Icon(
                                    LucideIcons.image,
                                    color: Color(0xFF94A3B8),
                                    size: 16,
                                  )
                                : null,
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  product.title,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w600,
                                    fontSize: 13,
                                    color: Color(0xFF0F172A),
                                  ),
                                  overflow: TextOverflow.ellipsis,
                                ),
                                Text(
                                  product.slug,
                                  style: const TextStyle(
                                    color: Color(0xFF64748B),
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

                    // Category
                    Expanded(
                      flex: 1,
                      child: product.category != null
                          ? Align(
                              alignment: Alignment.centerLeft,
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 2,
                                ),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF0FDF4), // Green-50
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Text(
                                  product.category!.title,
                                  style: const TextStyle(
                                    color: Color(0xFF166534),
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                  ), // Green-800
                                ),
                              ),
                            )
                          : const Text(
                              '-',
                              style: TextStyle(color: Color(0xFF94A3B8)),
                            ),
                    ),

                    // Price
                    Expanded(
                      flex: 1,
                      child: Text(
                        '\$${product.price.toStringAsFixed(2)}',
                        style: const TextStyle(
                          fontSize: 13,
                          color: Color(0xFF334155),
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),

                    // Stock
                    Expanded(
                      flex: 1,
                      child: Text(
                        '${product.stock}',
                        style: const TextStyle(
                          fontSize: 13,
                          color: Color(0xFF334155),
                        ),
                      ),
                    ),

                    // Status
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
                            color: product.isActive
                                ? const Color(0xFFF0FDF4)
                                : const Color(
                                    0xFFF1F5F9,
                                  ), // Green-50 : Slate-100
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            product.isActive ? 'Active' : 'Inactive',
                            style: TextStyle(
                              color: product.isActive
                                  ? const Color(0xFF166534)
                                  : const Color(
                                      0xFF334155,
                                    ), // Green-800 : Slate-700
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ),
                    ),

                    // Actions
                    Expanded(
                      flex: 1,
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          _ActionButton(
                            icon: LucideIcons.pencil,
                            color: const Color(0xFF0D9488), // Teal-600
                            onPressed: () =>
                                context.push('/products/${product.id}'),
                          ),
                          const SizedBox(width: 8),
                          _ActionButton(
                            icon: LucideIcons.trash2,
                            color: const Color(0xFFDC2626), // Red-600
                            onPressed: () => ref
                                .read(productsProvider.notifier)
                                .deleteProduct(product.id),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  final IconData icon;
  final Color color;
  final VoidCallback onPressed;

  const _ActionButton({
    required this.icon,
    required this.color,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onPressed,
      borderRadius: BorderRadius.circular(4),
      child: Padding(
        padding: const EdgeInsets.all(4),
        child: Icon(icon, size: 16, color: color),
      ),
    );
  }
}
