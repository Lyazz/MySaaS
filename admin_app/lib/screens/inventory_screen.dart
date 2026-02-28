import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../services/api_service.dart';
import '../providers/products_provider.dart';
import '../models/product.dart';
import '../widgets/responsive_paginated_table.dart';
import '../widgets/responsive_filter_bar.dart';
import '../utils/debouncer.dart';
import '../widgets/form/form_input.dart';

class InventoryScreen extends ConsumerStatefulWidget {
  const InventoryScreen({super.key});

  @override
  ConsumerState<InventoryScreen> createState() => _InventoryScreenState();
}

class _InventoryScreenState extends ConsumerState<InventoryScreen> {
  final TextEditingController _searchController = TextEditingController();
  final Debouncer _searchDebouncer = Debouncer(milliseconds: 300);

  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(productsProvider.notifier).fetchProducts());
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
    final products = productsState.products;

    // Filter products based on search
    final filteredProducts = products.where((product) {
      final query = _searchController.text.toLowerCase();
      return product.title.toLowerCase().contains(query) ||
          (product.sku?.toLowerCase().contains(query) ?? false);
    }).toList();

    final isMobile = MediaQuery.of(context).size.width < 800;

    return Padding(
      padding: EdgeInsets.all(isMobile ? 16 : 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildHeader(),
          const SizedBox(height: 24),
          Expanded(
            child: productsState.isLoading
                ? const Center(child: CircularProgressIndicator())
                : _buildInventoryTable(filteredProducts),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    return ResponsiveFilterBar(
      searchField: FormInput(
        label: 'Search',
        controller: _searchController,
        hint: 'Search products by name or SKU...',
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 16,
          vertical: 14,
        ),
        onChanged: (value) => _searchDebouncer.run(() => setState(() {})),
      ),
      filters: const [],
      onClearFilters: () {
        setState(() {
          _searchController.clear();
        });
      },
    );
  }

  Widget _buildInventoryTable(List<Product> products) {
    return ResponsivePaginatedTable<Product>(
      items: products,
      minWidth: 900,
      header: const Row(
        children: [
          Expanded(
            flex: 3,
            child: Text(
              'Product',
              style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
            ),
          ),
          Expanded(
            flex: 2,
            child: Text(
              'SKU',
              style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
            ),
          ),
          Expanded(
            flex: 1,
            child: Text(
              'Stock',
              style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
            ),
          ),
          Expanded(
            flex: 1,
            child: Text(
              'Status',
              style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
            ),
          ),
          SizedBox(width: 48), // Actions space
        ],
      ),
      rowBuilder: (context, product, index) {
        // Low-stock threshold (basic): < 10
        final isLowStock = product.stock < 10;
        final rawImageUrl = product.mainImageUrl;
        final imageUrl = rawImageUrl == null
            ? null
            : ref.read(apiProvider).resolvePublicUrl(rawImageUrl);

        return Padding(
          padding: EdgeInsets.symmetric(
            horizontal: MediaQuery.of(context).size.width < 800 ? 12 : 24,
            vertical: MediaQuery.of(context).size.width < 800 ? 12 : 16,
          ),
          child: Row(
            children: [
              Expanded(
                flex: 3,
                child: Row(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: Colors.grey[100],
                        borderRadius: BorderRadius.circular(6),
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
                              size: 20,
                              color: Colors.grey,
                            )
                          : null,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        product.title,
                        style: const TextStyle(fontWeight: FontWeight.w500),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ),
              Expanded(
                flex: 2,
                child: Text(
                  product.variants.isNotEmpty
                      ? 'Multiple'
                      : (product.slug), // Using slug as dummy SKU if none
                  style: TextStyle(color: Colors.grey[600], fontSize: 13),
                ),
              ),
              Expanded(
                flex: 1,
                child: Row(
                  children: [
                    Text(
                      '${product.stock}',
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        color: isLowStock ? Colors.orange : Colors.black,
                      ),
                    ),
                    if (isLowStock)
                      const Padding(
                        padding: EdgeInsets.only(left: 4),
                        child: Icon(
                          LucideIcons.alertTriangle,
                          size: 14,
                          color: Colors.orange,
                        ),
                      ),
                  ],
                ),
              ),
              Expanded(
                flex: 1,
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 2,
                  ),
                  decoration: BoxDecoration(
                    color: product.isActive
                        ? Colors.green.withValues(alpha: 0.1)
                        : Colors.grey.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(99),
                  ),
                  child: Text(
                    product.isActive ? 'Active' : 'Draft',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: product.isActive ? Colors.green : Colors.grey[600],
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),
              ),
              IconButton(
                onPressed: () {
                  // Open quick edit dialog
                },
                icon: const Icon(LucideIcons.pencil, size: 16),
                color: Colors.grey[600],
              ),
            ],
          ),
        );
      },
    );
  }
}

extension ProductSku on Product {
  // Helper to get a display SKU
  String? get sku => variants.isNotEmpty ? variants.first.sku : null;
}
