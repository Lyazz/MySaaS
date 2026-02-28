import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../services/api_service.dart';
import '../providers/products_provider.dart';
import '../widgets/rich_text_editor.dart';
import '../widgets/product_options_list.dart';
import 'variant_edit_screen.dart';
import '../models/product.dart';
import '../widgets/form/form_input.dart';
import '../widgets/form/form_select.dart';
import '../widgets/buttons/app_button.dart';

class ProductFormScreen extends ConsumerStatefulWidget {
  final String? productId;

  const ProductFormScreen({super.key, this.productId});

  @override
  ConsumerState<ProductFormScreen> createState() => _ProductFormScreenState();
}

class _ProductFormScreenState extends ConsumerState<ProductFormScreen> {
  final _formKey = GlobalKey<FormState>();
  bool _isLoading = false;
  String? _error;

  // Controllers
  final _titleController = TextEditingController();
  final _slugController = TextEditingController();
  final _miniDescriptionController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _landingDescriptionController =
      TextEditingController(); // For Description Tab
  final _priceController = TextEditingController();
  final _stockController = TextEditingController();

  bool _isActive = true;
  String? _selectedCategoryId;
  Product? _product;

  // Image Management
  final List<String> _images = [];
  bool _isUploading = false;
  final ImagePicker _picker = ImagePicker();

  Future<void> _pickImage() async {
    try {
      final XFile? image = await _picker.pickImage(source: ImageSource.gallery);
      if (image == null) return;

      setState(() => _isUploading = true);

      // Upload
      final url = await ref.read(apiProvider).uploadImage(image.path);

      if (url != null) {
        setState(() {
          _images.add(url);
        });
      } else {
        setState(() => _error = 'Failed to upload image');
      }
    } catch (e) {
      setState(() => _error = 'Error picking image: $e');
    } finally {
      setState(() => _isUploading = false);
    }
  }

  void _removeImage(int index) {
    setState(() {
      _images.removeAt(index);
    });
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadData();
    });

    // Auto-generate slug from title
    _titleController.addListener(() {
      if (widget.productId == null && _titleController.text.isNotEmpty) {
        final slug = _titleController.text
            .toLowerCase()
            .replaceAll(RegExp(r'[^a-z0-9]+'), '-')
            .replaceAll(RegExp(r'^-+|-+$'), '');
        _slugController.text = slug;
      }
    });
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      await ref.read(productsProvider.notifier).fetchCategories();

      if (widget.productId != null) {
        final product = await ref
            .read(productsProvider.notifier)
            .fetchProduct(widget.productId!);
        if (product != null) {
          _titleController.text = product.title;
          _slugController.text = product.slug;
          _miniDescriptionController.text = product.miniDescription ?? '';
          _descriptionController.text = product.description ?? '';
          _priceController.text = product.price.toString();
          _stockController.text = product.stock.toString();
          _isActive = product.isActive;
          _selectedCategoryId = product.categoryId ?? product.category?.id;
          // Note: If description field handles both, adjust accordingly.
          // For now assuming existing description is "Landing Page Description"
          // based on web usage usually.
          _landingDescriptionController.text = product.description ?? '';
          _images.clear();
          _images.addAll(product.images);
          _product = product;
        }
      }
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _slugController.dispose();
    _miniDescriptionController.dispose();
    _descriptionController.dispose();
    _landingDescriptionController.dispose();
    _priceController.dispose();
    _stockController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final isEditing = widget.productId != null;
      final data = <String, dynamic>{
        'title': _titleController.text,
        'slug': _slugController.text,
        'miniDescription': _miniDescriptionController.text,
        'description': _landingDescriptionController.text, // Using tab field
        'price': double.tryParse(_priceController.text) ?? 0.0,
        'isActive': _isActive,
        'categoryId': _selectedCategoryId,
        'images': _images,
      };
      if (!isEditing) {
        data['stock'] = int.tryParse(_stockController.text) ?? 0;
      }

      if (widget.productId != null) {
        await ref
            .read(productsProvider.notifier)
            .updateProduct(widget.productId!, data);
      } else {
        await ref.read(productsProvider.notifier).createProduct(data);
      }

      if (mounted) context.pop();
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final categories = ref.watch(productsProvider).categories;
    final isEditing = widget.productId != null;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC), // Slate-50
      body: SafeArea(
        child: Center(
          child: Container(
            constraints: const BoxConstraints(maxWidth: 800),
            padding: EdgeInsets.all(
              MediaQuery.of(context).size.width > 600 ? 24 : 12,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Breadcrumb and Header - Hidden on mobile to save space
                if (MediaQuery.of(context).size.width > 600) ...[
                  // Breadcrumb
                  Row(
                    children: [
                      InkWell(
                        onTap: () => context.pop(),
                        child: const Text(
                          'Products',
                          style: TextStyle(
                            color: Color(0xFF475569),
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                      const Padding(
                        padding: EdgeInsets.symmetric(horizontal: 8),
                        child: Icon(
                          LucideIcons.chevronRight,
                          size: 14,
                          color: Color(0xFF94A3B8),
                        ),
                      ),
                      Text(
                        isEditing ? 'Edit Product' : 'Create Product',
                        style: const TextStyle(color: Color(0xFF94A3B8)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // Header
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            isEditing ? 'Edit Product' : 'Create New Product',
                            style: const TextStyle(
                              fontSize: 24,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF1E293B), // Slate-800
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            isEditing
                                ? 'Update product information'
                                : 'Add a new product to your catalog',
                            style: const TextStyle(
                              color: Color(0xFF64748B),
                              fontSize: 14,
                            ), // Slate-500
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                ],

                if (_error != null)
                  Container(
                    padding: const EdgeInsets.all(12),
                    margin: const EdgeInsets.only(bottom: 24),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFEF2F2), // Red-50
                      border: Border.all(
                        color: const Color(0xFFFECACA),
                      ), // Red-200
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      _error!,
                      style: const TextStyle(
                        color: Color(0xFFB91C1C),
                        fontSize: 14,
                      ), // Red-700
                    ),
                  ),

                // Tabbed Form Card
                Expanded(
                  child: DefaultTabController(
                    length: 4,
                    child: Container(
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: const Color(0xFFE2E8F0),
                        ), // Slate-200
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
                          // Tabs
                          const TabBar(
                            isScrollable: true, // Prevent tab text cropping
                            tabAlignment: TabAlignment.start,
                            labelColor: Color(0xFF0D9488), // Teal-600
                            unselectedLabelColor: Color(
                              0xFF64748B,
                            ), // Slate-500
                            indicatorColor: Color(0xFF0D9488),
                            indicatorSize: TabBarIndicatorSize.tab,
                            labelStyle: TextStyle(
                              fontWeight: FontWeight.w600,
                              fontSize: 14,
                            ),
                            tabs: [
                              Tab(text: 'General'),
                              Tab(text: 'Description'),
                              Tab(text: 'Images'),
                              Tab(text: 'Variants / Stock'),
                            ],
                          ),
                          const Divider(height: 1, color: Color(0xFFE2E8F0)),

                          // Form Content
                          Expanded(
                            child: Form(
                              key: _formKey,
                              child: TabBarView(
                                children: [
                                  // Tab 1: General
                                  SingleChildScrollView(
                                    padding: const EdgeInsets.all(32),
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        _buildLabel('Product Title'),
                                        const SizedBox(height: 6),
                                        FormInput(
                                          label: 'Product Title',
                                          showLabel: false,
                                          controller: _titleController,
                                          hint: 'Enter product title',
                                          validator: (v) {
                                            if (v?.isEmpty == true) {
                                              return 'Required';
                                            }
                                            return null;
                                          },
                                        ),
                                        const SizedBox(height: 24),

                                        _buildLabel(
                                          'Product Slug',
                                          hint:
                                              'URL-friendly version of the title',
                                        ),
                                        const SizedBox(height: 6),
                                        FormInput(
                                          label: 'Product Slug',
                                          showLabel: false,
                                          controller: _slugController,
                                          hint: 'product-slug',
                                          validator: (v) {
                                            if (v?.isEmpty == true) {
                                              return 'Required';
                                            }
                                            return null;
                                          },
                                        ),
                                        const SizedBox(height: 24),

                                        _buildLabel(
                                          'Mini Description',
                                          hint: 'Short description for lists',
                                        ),
                                        const SizedBox(height: 6),
                                        FormInput(
                                          label: 'Mini Description',
                                          showLabel: false,
                                          controller:
                                              _miniDescriptionController,
                                          hint: 'Enter a short summary...',
                                          maxLines: 3,
                                        ),
                                        const SizedBox(height: 24),

                                        Row(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            Expanded(
                                              child: Column(
                                                crossAxisAlignment:
                                                    CrossAxisAlignment.start,
                                                children: [
                                                  _buildLabel('Price (\$)'),
                                                  const SizedBox(height: 6),
                                                  FormInput(
                                                    label: 'Price',
                                                    showLabel: false,
                                                    controller:
                                                        _priceController,
                                                    hint: '0.00',
                                                    keyboardType:
                                                        const TextInputType.numberWithOptions(
                                                          decimal: true,
                                                        ),
                                                    validator: (v) {
                                                      if (v == null ||
                                                          v.isEmpty) {
                                                        return 'Required';
                                                      }
                                                      if (double.tryParse(v) ==
                                                          null) {
                                                        return 'Invalid';
                                                      }
                                                      return null;
                                                    },
                                                  ),
                                                ],
                                              ),
                                            ),
                                            const SizedBox(width: 24),
                                            Expanded(
                                              child: Column(
                                                crossAxisAlignment:
                                                    CrossAxisAlignment.start,
                                                children: [
                                                  _buildLabel('Stock Quantity'),
                                                  const SizedBox(height: 6),
                                                  FormInput(
                                                    label: 'Stock Quantity',
                                                    showLabel: false,
                                                    controller:
                                                        _stockController,
                                                    hint: '0',
                                                    keyboardType:
                                                        TextInputType.number,
                                                    enabled: !isEditing,
                                                    validator: (v) {
                                                      if (v == null ||
                                                          v.isEmpty) {
                                                        return 'Required';
                                                      }
                                                      if (int.tryParse(v) ==
                                                          null) {
                                                        return 'Invalid';
                                                      }
                                                      return null;
                                                    },
                                                  ),
                                                ],
                                              ),
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: 24),

                                        _buildLabel('Category'),
                                        const SizedBox(height: 6),
                                        FormSelect<String?>(
                                          label: 'Category',
                                          showLabel: false,
                                          value: _selectedCategoryId,
                                          hint: 'Select a category (optional)',
                                          icon: const Icon(
                                            LucideIcons.chevronDown,
                                            size: 16,
                                            color: Color(0xFF64748B),
                                          ),
                                          items: [
                                            const DropdownMenuItem<String?>(
                                              value: null,
                                              child: Text('None'),
                                            ),
                                            ...categories.map(
                                              (c) => DropdownMenuItem<String?>(
                                                value: c.id,
                                                child: Text(c.title),
                                              ),
                                            ),
                                          ],
                                          onChanged: (v) => setState(
                                            () => _selectedCategoryId = v,
                                          ),
                                        ),
                                        const SizedBox(height: 24),

                                        Row(
                                          children: [
                                            SizedBox(
                                              height: 20,
                                              width: 20,
                                              child: Checkbox(
                                                value: _isActive,
                                                activeColor: const Color(
                                                  0xFF0D9488,
                                                ), // Teal-600
                                                side: const BorderSide(
                                                  color: Color(0xFFCBD5E1),
                                                  width: 1.5,
                                                ),
                                                shape: RoundedRectangleBorder(
                                                  borderRadius:
                                                      BorderRadius.circular(4),
                                                ),
                                                onChanged: (v) => setState(
                                                  () => _isActive = v ?? false,
                                                ),
                                              ),
                                            ),
                                            const SizedBox(width: 12),
                                            const Text(
                                              'Product is active and visible to customers',
                                              style: TextStyle(
                                                color: Color(0xFF334155),
                                                fontSize: 14,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ),

                                  // Tab 2: Landing Page Description
                                  SingleChildScrollView(
                                    padding: const EdgeInsets.all(32),
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        _buildLabel(
                                          'Landing Page Description',
                                          hint:
                                              'Rich text content for product page',
                                        ),
                                        const SizedBox(height: 6),
                                        RichTextEditor(
                                          initialValue:
                                              _landingDescriptionController
                                                  .text,
                                          placeholder:
                                              'Enter full product description...',
                                          onChanged: (val) {
                                            _landingDescriptionController.text =
                                                val;
                                          },
                                        ),
                                      ],
                                    ),
                                  ),

                                  // Tab 3: Images
                                  SingleChildScrollView(
                                    padding: const EdgeInsets.all(32),
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        _buildLabel(
                                          'Product Images',
                                          hint: 'Upload and manage images',
                                        ),
                                        const SizedBox(height: 16),

                                        if (_isUploading)
                                          const Padding(
                                            padding: EdgeInsets.only(
                                              bottom: 16,
                                            ),
                                            child: LinearProgressIndicator(
                                              color: Color(0xFF0D9488),
                                            ),
                                          ),

                                        GridView.builder(
                                          shrinkWrap: true,
                                          physics:
                                              const NeverScrollableScrollPhysics(),
                                          gridDelegate:
                                              const SliverGridDelegateWithFixedCrossAxisCount(
                                                crossAxisCount: 3,
                                                crossAxisSpacing: 16,
                                                mainAxisSpacing: 16,
                                                childAspectRatio: 1,
                                              ),
                                          itemCount: _images.length + 1,
                                          itemBuilder: (context, index) {
                                            if (index == _images.length) {
                                              // Add Button
                                              return InkWell(
                                                onTap: _isUploading
                                                    ? null
                                                    : _pickImage,
                                                child: Container(
                                                  decoration: BoxDecoration(
                                                    color: const Color(
                                                      0xFFF8FAFC,
                                                    ),
                                                    borderRadius:
                                                        BorderRadius.circular(
                                                          8,
                                                        ),
                                                    border: Border.all(
                                                      color: const Color(
                                                        0xFFE2E8F0,
                                                      ),
                                                      style: BorderStyle.solid,
                                                    ),
                                                  ),
                                                  child: Column(
                                                    mainAxisAlignment:
                                                        MainAxisAlignment
                                                            .center,
                                                    children: [
                                                      Icon(
                                                        LucideIcons.plus,
                                                        size: 24,
                                                        color: const Color(
                                                          0xFF94A3B8,
                                                        ),
                                                      ),
                                                      const SizedBox(height: 8),
                                                      Text(
                                                        'Add Image',
                                                        style: const TextStyle(
                                                          fontSize: 12,
                                                          color: Color(
                                                            0xFF64748B,
                                                          ),
                                                        ),
                                                      ),
                                                    ],
                                                  ),
                                                ),
                                              );
                                            }

                                            final imageUrl = _images[index];
                                            return Stack(
                                              children: [
                                                Container(
                                                  decoration: BoxDecoration(
                                                    borderRadius:
                                                        BorderRadius.circular(
                                                          8,
                                                        ),
                                                    border: Border.all(
                                                      color: const Color(
                                                        0xFFE2E8F0,
                                                      ),
                                                    ),
                                                    image: DecorationImage(
                                                      image: NetworkImage(
                                                        imageUrl,
                                                      ),
                                                      fit: BoxFit.cover,
                                                    ),
                                                  ),
                                                ),
                                                Positioned(
                                                  top: 4,
                                                  right: 4,
                                                  child: InkWell(
                                                    onTap: () =>
                                                        _removeImage(index),
                                                    child: Container(
                                                      padding:
                                                          const EdgeInsets.all(
                                                            4,
                                                          ),
                                                      decoration:
                                                          const BoxDecoration(
                                                            color: Colors.white,
                                                            shape:
                                                                BoxShape.circle,
                                                            boxShadow: [
                                                              BoxShadow(
                                                                color: Colors
                                                                    .black12,
                                                                blurRadius: 4,
                                                              ),
                                                            ],
                                                          ),
                                                      child: const Icon(
                                                        LucideIcons.trash2,
                                                        size: 14,
                                                        color: Color(
                                                          0xFFEF4444,
                                                        ),
                                                      ),
                                                    ),
                                                  ),
                                                ),
                                              ],
                                            );
                                          },
                                        ),
                                      ],
                                    ),
                                  ),

                                  // Tab 4: Variants
                                  SingleChildScrollView(
                                    padding: const EdgeInsets.all(32),
                                    child: isEditing
                                        ? (_product == null
                                              ? const Center(
                                                  child:
                                                      CircularProgressIndicator(),
                                                )
                                              : Column(
                                                  crossAxisAlignment:
                                                      CrossAxisAlignment.start,
                                                  children: [
                                                    ProductOptionsList(
                                                      productId:
                                                          widget.productId!,
                                                      options:
                                                          _product!.options,
                                                    ),
                                                    const SizedBox(height: 32),
                                                    const Text(
                                                      'Variants / Stock',
                                                      style: TextStyle(
                                                        fontWeight:
                                                            FontWeight.w600,
                                                        fontSize: 16,
                                                        color: Color(
                                                          0xFF1E293B,
                                                        ),
                                                      ),
                                                    ),
                                                    const SizedBox(height: 16),
                                                    if (_product!
                                                        .variants
                                                        .isEmpty)
                                                      const Text(
                                                        'No variants generated yet. Add options to generate variants.',
                                                        style: TextStyle(
                                                          color: Color(
                                                            0xFF64748B,
                                                          ),
                                                        ),
                                                      )
                                                    else
                                                      Card(
                                                        clipBehavior:
                                                            Clip.antiAlias,
                                                        shape: RoundedRectangleBorder(
                                                          borderRadius:
                                                              BorderRadius.circular(
                                                                8,
                                                              ),
                                                          side:
                                                              const BorderSide(
                                                                color: Color(
                                                                  0xFFE2E8F0,
                                                                ),
                                                              ),
                                                        ),
                                                        elevation: 0,
                                                        child: Column(
                                                          children: _product!.variants.map((
                                                            variant,
                                                          ) {
                                                            return InkWell(
                                                              onTap: () {
                                                                Navigator.push(
                                                                  context,
                                                                  MaterialPageRoute(
                                                                    builder: (context) => VariantEditScreen(
                                                                      variant:
                                                                          variant,
                                                                      product:
                                                                          _product!,
                                                                    ),
                                                                  ),
                                                                ).then(
                                                                  (_) =>
                                                                      _loadData(),
                                                                );
                                                              },
                                                              child: Container(
                                                                decoration: const BoxDecoration(
                                                                  border: Border(
                                                                    bottom: BorderSide(
                                                                      color: Color(
                                                                        0xFFE2E8F0,
                                                                      ),
                                                                    ),
                                                                  ),
                                                                ),
                                                                padding:
                                                                    const EdgeInsets.symmetric(
                                                                      horizontal:
                                                                          16,
                                                                      vertical:
                                                                          12,
                                                                    ),
                                                                child: Row(
                                                                  children: [
                                                                    // Image Preview (if any)
                                                                    Container(
                                                                      width: 40,
                                                                      height:
                                                                          40,
                                                                      decoration: BoxDecoration(
                                                                        color: const Color(
                                                                          0xFFF1F5F9,
                                                                        ),
                                                                        borderRadius:
                                                                            BorderRadius.circular(
                                                                              4,
                                                                            ),
                                                                        image:
                                                                            variant.images.isNotEmpty
                                                                            ? DecorationImage(
                                                                                image: NetworkImage(
                                                                                  variant.images.first,
                                                                                ),
                                                                                fit: BoxFit.cover,
                                                                              )
                                                                            : null,
                                                                      ),
                                                                    ),
                                                                    const SizedBox(
                                                                      width: 12,
                                                                    ),
                                                                    Expanded(
                                                                      child: Column(
                                                                        crossAxisAlignment:
                                                                            CrossAxisAlignment.start,
                                                                        children: [
                                                                          Text(
                                                                            variant.title,
                                                                            style: const TextStyle(
                                                                              fontWeight: FontWeight.w500,
                                                                              color: Color(
                                                                                0xFF1E293B,
                                                                              ),
                                                                            ),
                                                                          ),
                                                                          Text(
                                                                            variant.sku.isNotEmpty
                                                                                ? variant.sku
                                                                                : 'No SKU',
                                                                            style: const TextStyle(
                                                                              fontSize: 12,
                                                                              color: Color(
                                                                                0xFF64748B,
                                                                              ),
                                                                            ),
                                                                          ),
                                                                        ],
                                                                      ),
                                                                    ),
                                                                    Column(
                                                                      crossAxisAlignment:
                                                                          CrossAxisAlignment
                                                                              .end,
                                                                      children: [
                                                                        Text(
                                                                          '\$${variant.price}',
                                                                          style: const TextStyle(
                                                                            fontWeight:
                                                                                FontWeight.w500,
                                                                          ),
                                                                        ),
                                                                        Text(
                                                                          '${variant.stock} in stock',
                                                                          style: TextStyle(
                                                                            fontSize:
                                                                                12,
                                                                            color:
                                                                                variant.stock >
                                                                                    0
                                                                                ? const Color(
                                                                                    0xFF0D9488,
                                                                                  )
                                                                                : const Color(
                                                                                    0xFFEF4444,
                                                                                  ),
                                                                          ),
                                                                        ),
                                                                      ],
                                                                    ),
                                                                    const SizedBox(
                                                                      width: 8,
                                                                    ),
                                                                    const Icon(
                                                                      LucideIcons
                                                                          .chevronRight,
                                                                      size: 16,
                                                                      color: Color(
                                                                        0xFF94A3B8,
                                                                      ),
                                                                    ),
                                                                  ],
                                                                ),
                                                              ),
                                                            );
                                                          }).toList(),
                                                        ),
                                                      ),
                                                  ],
                                                ))
                                        : const Center(
                                            child: Text(
                                              'Please save the product first to add variants.',
                                              style: TextStyle(
                                                color: Color(0xFF64748B),
                                              ),
                                            ),
                                          ),
                                  ),
                                ],
                              ),
                            ),
                          ),

                          // Actions Divider
                          const Divider(height: 1, color: Color(0xFFE2E8F0)),

                          // Actions Footer
                          Padding(
                            padding: const EdgeInsets.all(24),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.end,
                              children: [
                                AppButton.secondary(
                                  label: 'Cancel',
                                  onPressed: () => context.pop(),
                                ),
                                const SizedBox(width: 12),
                                AppButton.primary(
                                  label: isEditing
                                      ? 'Update Product'
                                      : 'Create Product',
                                  onPressed: _submit,
                                  loading: _isLoading,
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildLabel(String label, {String? hint}) {
    return Row(
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w500,
            color: Color(0xFF334155), // Slate-700
          ),
        ),
        if (hint != null) ...[
          const SizedBox(width: 8),
          Text(
            '($hint)',
            style: const TextStyle(
              fontSize: 12,
              color: Color(0xFF94A3B8), // Slate-400
            ),
          ),
        ],
      ],
    );
  }
}
