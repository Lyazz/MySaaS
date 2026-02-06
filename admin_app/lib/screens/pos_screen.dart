import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kDebugMode;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:intl/intl.dart';
import '../services/api_service.dart';
import '../models/customer.dart';
import '../models/product.dart';
import '../providers/pos_provider.dart';
import '../providers/customers_provider.dart';

class PosScreen extends ConsumerStatefulWidget {
  const PosScreen({super.key});

  @override
  ConsumerState<PosScreen> createState() => _PosScreenState();
}

class _PosScreenState extends ConsumerState<PosScreen> {
  final TextEditingController _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final posState = ref.watch(posProvider);

    return Scaffold(
      body: LayoutBuilder(
        builder: (context, constraints) {
          if (constraints.maxWidth < 900) {
            return _buildMobileLayout(posState);
          } else {
            return _buildDesktopLayout(posState);
          }
        },
      ),
    );
  }

  Widget _buildDesktopLayout(PosState posState) {
    return Row(
      children: [
        // Left: Product Catalog
        Expanded(flex: 2, child: _buildProductCatalog(posState)),
        // Right: Cart
        Expanded(
          flex: 1,
          child: Container(
            decoration: BoxDecoration(
              color: Colors.white,
              border: Border(left: BorderSide(color: Colors.grey[200]!)),
            ),
            child: _buildCartContent(posState),
          ),
        ),
      ],
    );
  }

  Widget _buildMobileLayout(PosState posState) {
    return Stack(
      children: [
        // Full screen catalog
        _buildProductCatalog(posState, isMobile: true),
        // Sticky Cart Summary Bottom Bar
        Positioned(
          left: 0,
          right: 0,
          bottom: 0,
          child: _buildMobileCartSummary(posState),
        ),
      ],
    );
  }

  Widget _buildProductCatalog(PosState posState, {bool isMobile = false}) {
    if (posState.error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Text(
            'Error: ${posState.error}',
            style: const TextStyle(color: Colors.red),
            textAlign: TextAlign.center,
          ),
        ),
      );
    }

    final selectedCategoryId = posState.selectedCategoryId;

    return Column(
      children: [
        // Search bar (only show when in products view)
        if (selectedCategoryId != null)
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                IconButton(
                  icon: const Icon(LucideIcons.arrowLeft),
                  onPressed: () =>
                      ref.read(posProvider.notifier).selectCategory(null),
                ),
                Expanded(
                  child: TextField(
                    controller: _searchController,
                    decoration: InputDecoration(
                      hintText: 'Search products...',
                      prefixIcon: const Icon(LucideIcons.search),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: BorderSide.none,
                      ),
                      filled: true,
                      fillColor: Colors.white,
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 12,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        // Grid: Categories or Products
        Expanded(
          child: selectedCategoryId == null
              ? _buildCategoryGrid(posState, isMobile)
              : _buildProductGrid(posState, selectedCategoryId, isMobile),
        ),
      ],
    );
  }

  Widget _buildCategoryGrid(PosState posState, bool isMobile) {
    return GridView.builder(
      padding: EdgeInsets.fromLTRB(16, 16, 16, isMobile ? 100 : 16),
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: isMobile ? 2 : 3,
        childAspectRatio: 1.0,
        crossAxisSpacing: 16,
        mainAxisSpacing: 16,
      ),
      itemCount: posState.categories.length,
      itemBuilder: (context, index) {
        final category = posState.categories[index];
        return _buildCategoryCard(category);
      },
    );
  }

  Widget _buildProductGrid(
    PosState posState,
    String categoryId,
    bool isMobile,
  ) {
    if (posState.isLoading && posState.products.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    final categoryProducts = posState.products
        .where((p) => (p.categoryId ?? p.category?.id) == categoryId)
        .toList();

    if (categoryProducts.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(LucideIcons.package, size: 64, color: Colors.grey[300]),
            const SizedBox(height: 16),
            Text(
              'No active products in this category',
              style: TextStyle(color: Colors.grey[500], fontSize: 16),
            ),
            if (kDebugMode) ...[
              const SizedBox(height: 12),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Text(
                  'Debug: loaded=${posState.products.length}, selectedCategoryId=$categoryId',
                  style: TextStyle(color: Colors.grey[400], fontSize: 12),
                  textAlign: TextAlign.center,
                ),
              ),
            ],
          ],
        ),
      );
    }

    return GridView.builder(
      padding: EdgeInsets.fromLTRB(16, 0, 16, isMobile ? 100 : 16),
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: isMobile ? 2 : 3,
        childAspectRatio: 0.8,
        crossAxisSpacing: 16,
        mainAxisSpacing: 16,
      ),
      itemCount: categoryProducts.length,
      itemBuilder: (context, index) {
        final product = categoryProducts[index];
        return _buildProductCard(product);
      },
    );
  }

  Widget _buildCategoryCard(Category category) {
    return GestureDetector(
      onTap: () => ref.read(posProvider.notifier).selectCategory(category.id),
      child: Card(
        elevation: 2,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Category Image
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                color: Colors.grey[100],
                borderRadius: BorderRadius.circular(8),
              ),
              child: category.imageUrl != null
                  ? ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: Image.network(
                        ref.read(apiProvider).resolvePublicUrl(category.imageUrl!),
                        width: 64,
                        height: 64,
                        fit: BoxFit.cover,
                        errorBuilder: (context, error, stackTrace) {
                          return Icon(
                            LucideIcons.image,
                            size: 32,
                            color: Colors.grey[400],
                          );
                        },
                      ),
                    )
                  : Icon(LucideIcons.image, size: 32, color: Colors.grey[400]),
            ),
            const SizedBox(height: 12),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8),
              child: Text(
                category.title,
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
                textAlign: TextAlign.center,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCartContent(PosState posState) {
    return Column(
      children: [
        // Header with Clear Cart button
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            border: Border(bottom: BorderSide(color: Colors.grey[200]!)),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Current Sale',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              IconButton(
                icon: const Icon(LucideIcons.trash2, color: Colors.red),
                onPressed: () => ref.read(posProvider.notifier).clearCart(),
              ),
            ],
          ),
        ),
        // Client Selector
        _buildClientSelector(posState),
        // Cart Items
        Expanded(
          child: posState.cart.isEmpty
              ? _buildEmptyCart()
              : ListView.separated(
                  itemCount: posState.cart.length,
                  separatorBuilder: (context, index) => const Divider(),
                  itemBuilder: (context, index) {
                    final item = posState.cart[index];
                    return ListTile(
                      title: Text(item.name),
                      subtitle: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          if (item.variantTitle != null)
                            Text(
                              item.variantTitle!,
                              style: TextStyle(
                                color: Colors.grey[600],
                                fontSize: 12,
                              ),
                            ),
                          Text(NumberFormat.simpleCurrency().format(item.price)),
                        ],
                      ),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          IconButton(
                            icon: const Icon(
                              LucideIcons.minusCircle,
                              size: 20,
                              color: Colors.grey,
                            ),
                            onPressed: () => ref
                                .read(posProvider.notifier)
                                .updateQuantity(
                                  item.productId,
                                  item.variantId,
                                  item.quantity - 1,
                                ),
                          ),
                          Text(
                            '${item.quantity}',
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                          IconButton(
                            icon: const Icon(
                              LucideIcons.plusCircle,
                              size: 20,
                              color: Colors.teal,
                            ),
                            onPressed: () => ref
                                .read(posProvider.notifier)
                                .updateQuantity(
                                  item.productId,
                                  item.variantId,
                                  item.quantity + 1,
                                ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
        ),
        _buildCartFooter(posState),
      ],
    );
  }

  Widget _buildClientSelector(PosState posState) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        border: Border(bottom: BorderSide(color: Colors.grey[200]!)),
      ),
      child: Consumer(
        builder: (context, ref, child) {
          final customersState = ref.watch(customersProvider);
          final customers = customersState.customers;

          return Autocomplete<Customer>(
            optionsBuilder: (TextEditingValue textEditingValue) {
              if (textEditingValue.text.isEmpty) {
                return customers;
              }
              return customers.where((customer) {
                return customer.name.toLowerCase().contains(
                  textEditingValue.text.toLowerCase(),
                );
              });
            },
            displayStringForOption: (customer) => customer.name,
            onSelected: (customer) {
              ref.read(posProvider.notifier).selectCustomer(customer);
            },
            fieldViewBuilder:
                (context, controller, focusNode, onFieldSubmitted) {
                  if (posState.selectedCustomer != null &&
                      controller.text.isEmpty) {
                    controller.text = posState.selectedCustomer!.name;
                  }
                  return TextField(
                    controller: controller,
                    focusNode: focusNode,
                    decoration: InputDecoration(
                      hintText: 'Select Client',
                      prefixIcon: const Icon(LucideIcons.user, size: 18),
                      suffixIcon: posState.selectedCustomer != null
                          ? IconButton(
                              icon: const Icon(LucideIcons.x, size: 16),
                              onPressed: () {
                                ref
                                    .read(posProvider.notifier)
                                    .selectCustomer(null);
                                controller.clear();
                              },
                            )
                          : null,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 10,
                      ),
                    ),
                  );
                },
          );
        },
      ),
    );
  }

  Widget _buildCartFooter(PosState posState) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.grey[50],
        border: Border(top: BorderSide(color: Colors.grey[200]!)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Total',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
              ),
              Text(
                NumberFormat.simpleCurrency().format(posState.total),
                style: const TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: Colors.teal,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            height: 50,
            child: ElevatedButton(
              onPressed: posState.cart.isEmpty
                  ? null
                  : () {
                      ref.read(posProvider.notifier).checkout();
                      if (Navigator.canPop(context)) {
                        Navigator.pop(context); // Close mobile sheet if open
                      }
                    },
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.teal,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              child: posState.isLoading
                  ? const CircularProgressIndicator(color: Colors.white)
                  : const Text('Checkout', style: TextStyle(fontSize: 18)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMobileCartSummary(PosState posState) {
    if (posState.cart.isEmpty) return const SizedBox.shrink();

    final itemCount = posState.cart.fold<int>(
      0,
      (sum, item) => sum + item.quantity,
    );

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.1),
            blurRadius: 10,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: SafeArea(
        child: ElevatedButton(
          onPressed: () => _showMobileCartSheet(context, posState),
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF1E293B), // Slate-800
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 24),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  '$itemCount items',
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
              ),
              const Text(
                'View Cart',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
              Text(
                NumberFormat.simpleCurrency().format(posState.total),
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showMobileCartSheet(BuildContext context, PosState posState) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        // Use Consumer within bottom sheet to get live updates
        return Consumer(
          builder: (context, ref, child) {
            final state = ref.watch(posProvider);
            return FractionallySizedBox(
              heightFactor: 0.9,
              child: Column(
                children: [
                  Container(
                    width: 40,
                    height: 4,
                    margin: const EdgeInsets.symmetric(vertical: 12),
                    decoration: BoxDecoration(
                      color: Colors.grey[300],
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                  Expanded(child: _buildCartContent(state)),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildEmptyCart() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(LucideIcons.shoppingCart, size: 64, color: Colors.grey[300]),
          const SizedBox(height: 16),
          Text(
            'Cart is empty',
            style: TextStyle(color: Colors.grey[500], fontSize: 16),
          ),
        ],
      ),
    );
  }

  Widget _buildProductCard(Product product) {
    final rawImageUrl = product.mainImageUrl;
    final imageUrl =
        rawImageUrl == null ? null : ref.read(apiProvider).resolvePublicUrl(rawImageUrl);

    return GestureDetector(
      onTap: () => _handleProductTap(product),
      child: Card(
        elevation: 2,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Container(
                decoration: BoxDecoration(
                  color: Colors.grey[100],
                  borderRadius: const BorderRadius.vertical(
                    top: Radius.circular(12),
                  ),
                  image: imageUrl != null
                      ? DecorationImage(
                          image: NetworkImage(imageUrl),
                          fit: BoxFit.cover,
                        )
                      : null,
                ),
                alignment: Alignment.center,
                child: imageUrl == null
                    ? Icon(
                        LucideIcons.package,
                        size: 48,
                        color: Colors.grey[400],
                      )
                    : null,
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    product.title,
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    NumberFormat.simpleCurrency().format(product.price),
                    style: TextStyle(
                      color: Colors.teal[700],
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _handleProductTap(Product product) async {
    final notifier = ref.read(posProvider.notifier);

    // Products without options can be sold using the default variant.
    if (product.options.isEmpty) {
      notifier.addToCart(product);
      return;
    }

    final detailed = await notifier.fetchProductDetails(product.id);
    if (!mounted) return;

    if (detailed == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to load product variants')),
      );
      return;
    }

    final selected = await _showVariantSelectorSheet(detailed);
    if (!mounted) return;
    if (selected == null) return;

    notifier.addToCart(detailed, variant: selected);
  }

  Future<ProductVariant?> _showVariantSelectorSheet(Product product) {
    final rawImageUrl = product.mainImageUrl;
    final imageUrl = rawImageUrl == null
        ? null
        : ref.read(apiProvider).resolvePublicUrl(rawImageUrl);

    return showModalBottomSheet<ProductVariant>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        final options = product.options;
        final variants = product.variants.where((v) => v.isActive).toList();

        final selectedByOptionId = <String, String?>{
          for (final o in options) o.id: null,
        };

        ProductVariant? matchVariant() {
          if (options.isEmpty) return null;
          final allSelected = options.every(
            (o) => selectedByOptionId[o.id] != null,
          );
          if (!allSelected) return null;

          for (final variant in variants) {
            final ok = options.every((o) {
              final wantedValueId = selectedByOptionId[o.id]!;
              return variant.optionValues.any(
                (ov) =>
                    ov.optionId == o.id && ov.optionValueId == wantedValueId,
              );
            });
            if (ok) return variant;
          }
          return null;
        }

        int availableStock(ProductVariant variant) {
          if (!variant.trackInventory) return 999999;
          final available =
              variant.stock - variant.reserved - variant.safetyStock;
          return available < 0 ? 0 : available;
        }

        return StatefulBuilder(
          builder: (context, setState) {
            final currentVariant = matchVariant();
            final canAdd = currentVariant != null &&
                (!currentVariant.trackInventory ||
                    availableStock(currentVariant) > 0);

            return SafeArea(
              child: Padding(
                padding: EdgeInsets.only(
                  left: 16,
                  right: 16,
                  top: 16,
                  bottom: 16 + MediaQuery.of(context).viewInsets.bottom,
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            product.title,
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        IconButton(
                          onPressed: () => Navigator.pop(context),
                          icon: const Icon(LucideIcons.x),
                        ),
                      ],
                    ),
                    if (imageUrl != null) ...[
                      const SizedBox(height: 8),
                      Center(
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(12),
                          child: Image.network(
                            imageUrl,
                            height: 140,
                            width: double.infinity,
                            fit: BoxFit.cover,
                            errorBuilder: (context, error, stackTrace) {
                              return const SizedBox.shrink();
                            },
                          ),
                        ),
                      ),
                    ],
                    const SizedBox(height: 12),
                    if (variants.isEmpty)
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 12),
                        child: Text(
                          'No variants available for this product.',
                          style: TextStyle(color: Colors.red),
                        ),
                      )
                    else ...[
                      ...options.map((option) {
                        final selected = selectedByOptionId[option.id];
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                option.name,
                                style: const TextStyle(
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              const SizedBox(height: 8),
                              Wrap(
                                spacing: 8,
                                runSpacing: 8,
                                children: option.values.map((value) {
                                  final isSelected = selected == value.id;
                                  return ChoiceChip(
                                    label: Text(value.label),
                                    selected: isSelected,
                                    onSelected: (_) {
                                      setState(() {
                                        selectedByOptionId[option.id] = value.id;
                                      });
                                    },
                                  );
                                }).toList(),
                              ),
                            ],
                          ),
                        );
                      }),
                      const SizedBox(height: 4),
                      if (currentVariant == null)
                        Text(
                          options.any((o) => selectedByOptionId[o.id] == null)
                              ? 'Select options to choose a variant'
                              : 'This combination is unavailable',
                          style: TextStyle(color: Colors.grey[600]),
                        )
                      else
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              NumberFormat.simpleCurrency()
                                  .format(currentVariant.price),
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            if (currentVariant.trackInventory)
                              Text(
                                availableStock(currentVariant) > 0
                                    ? 'Stock: ${availableStock(currentVariant)}'
                                    : 'Out of stock',
                                style: TextStyle(
                                  color: availableStock(currentVariant) > 0
                                      ? Colors.grey[600]
                                      : Colors.red,
                                ),
                              ),
                          ],
                        ),
                      const SizedBox(height: 16),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: canAdd
                              ? () => Navigator.pop(context, currentVariant)
                              : null,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF0D9488),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                          child: const Text('Add to cart'),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }
}
