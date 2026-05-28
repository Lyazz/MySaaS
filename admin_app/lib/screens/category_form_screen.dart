import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:image_picker/image_picker.dart';
import '../providers/categories_provider.dart';
import '../services/api_service.dart';
import '../models/product.dart';
import '../theme/app_theme.dart';
import '../widgets/form/form_input.dart';
import '../widgets/buttons/app_button.dart';

class CategoryFormScreen extends ConsumerStatefulWidget {
  final String? categoryId;

  const CategoryFormScreen({super.key, this.categoryId});

  @override
  ConsumerState<CategoryFormScreen> createState() => _CategoryFormScreenState();
}

class _CategoryFormScreenState extends ConsumerState<CategoryFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final TextEditingController _titleController = TextEditingController();
  final TextEditingController _slugController = TextEditingController();

  String? _imageUrl;
  File? _imageFile;
  bool _isLoading = false;
  bool _autoGenerateSlug = true;
  Category? _existingCategory;

  @override
  void initState() {
    super.initState();
    if (widget.categoryId != null) {
      _loadCategory();
    }
    _titleController.addListener(_onTitleChanged);
  }

  @override
  void dispose() {
    _titleController.removeListener(_onTitleChanged);
    _titleController.dispose();
    _slugController.dispose();
    super.dispose();
  }

  void _onTitleChanged() {
    if (_autoGenerateSlug && widget.categoryId == null) {
      final slug = _generateSlug(_titleController.text);
      _slugController.text = slug;
    }
  }

  String _generateSlug(String title) {
    return title
        .toLowerCase()
        .trim()
        .replaceAll(RegExp(r'[^\w\s-]'), '')
        .replaceAll(RegExp(r'[\s_-]+'), '-')
        .replaceAll(RegExp(r'^-+|-+$'), '');
  }

  Future<void> _loadCategory() async {
    setState(() => _isLoading = true);

    try {
      final categories = ref.read(categoriesProvider).categories;
      _existingCategory = categories.firstWhere(
        (c) => c.id == widget.categoryId,
        orElse: () => throw Exception('Category not found'),
      );

      _titleController.text = _existingCategory!.title;
      _slugController.text = _existingCategory!.slug;
      _imageUrl = _existingCategory!.imageUrl;
      _autoGenerateSlug = false;
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error loading category: $e'),
            backgroundColor: Colors.red,
          ),
        );
        context.pop();
      }
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _pickImage() async {
    final picker = ImagePicker();
    final pickedFile = await picker.pickImage(source: ImageSource.gallery);

    if (pickedFile != null) {
      setState(() {
        _imageFile = File(pickedFile.path);
      });
    }
  }

  Future<void> _saveCategory() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    try {
      String? uploadedImageUrl = _imageUrl;

      // Upload image if a new one was selected
      if (_imageFile != null) {
        final api = ref.read(apiProvider);
        uploadedImageUrl = await api.uploadImage(_imageFile!.path);

        if (uploadedImageUrl == null) {
          throw Exception('Failed to upload image');
        }
      }

      final success = widget.categoryId == null
          ? await ref
                .read(categoriesProvider.notifier)
                .createCategory(
                  title: _titleController.text.trim(),
                  slug: _slugController.text.trim(),
                  imageUrl: uploadedImageUrl,
                )
          : await ref
                .read(categoriesProvider.notifier)
                .updateCategory(
                  id: widget.categoryId!,
                  title: _titleController.text.trim(),
                  slug: _slugController.text.trim(),
                  imageUrl: uploadedImageUrl,
                );

      if (mounted) {
        if (success) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                widget.categoryId == null
                    ? 'Category created successfully'
                    : 'Category updated successfully',
              ),
              backgroundColor: Colors.green,
            ),
          );
          context.pop();
        } else {
          throw Exception('Failed to save category');
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isMobile = MediaQuery.of(context).size.width < 800;

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(LucideIcons.arrowLeft),
          onPressed: () => context.pop(),
        ),
        title: Text(
          widget.categoryId == null ? 'Add Category' : 'Edit Category',
        ),
      ),
      body: _isLoading && _existingCategory == null
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              child: Padding(
                padding: EdgeInsets.all(isMobile ? 16 : 24),
                child: Center(
                  child: Container(
                    constraints: const BoxConstraints(maxWidth: 800),
                    child: Form(
                      key: _formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          _buildCard(
                            title: 'Basic Information',
                            children: [
                              _buildTextField(
                                controller: _titleController,
                                label: 'Category Title',
                                hint: 'e.g., Electronics',
                                validator: (value) {
                                  if (value == null || value.trim().isEmpty) {
                                    return 'Please enter a category title';
                                  }
                                  return null;
                                },
                              ),
                              const SizedBox(height: 20),
                              _buildTextField(
                                controller: _slugController,
                                label: 'Slug',
                                hint: 'e.g., electronics',
                                onChanged: (_) {
                                  setState(() => _autoGenerateSlug = false);
                                },
                                validator: (value) {
                                  if (value == null || value.trim().isEmpty) {
                                    return 'Please enter a slug';
                                  }
                                  if (!RegExp(
                                    r'^[a-z0-9-]+$',
                                  ).hasMatch(value)) {
                                    return 'Slug must contain only lowercase letters, numbers, and hyphens';
                                  }
                                  return null;
                                },
                              ),
                            ],
                          ),
                          const SizedBox(height: 24),
                          _buildCard(
                            title: 'Category Image',
                            children: [_buildImagePicker()],
                          ),
                          const SizedBox(height: 32),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.end,
                            children: [
                              AppButton.secondary(
                                label: 'Cancel',
                                onPressed: () => context.pop(),
                              ),
                              const SizedBox(width: 12),
                              AppButton.primary(
                                label: widget.categoryId == null
                                    ? 'Create Category'
                                    : 'Save Changes',
                                onPressed: _saveCategory,
                                loading: _isLoading,
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
    );
  }

  Widget _buildCard({required String title, required List<Widget> children}) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark
              ? AppColors.surfaceBorder
              : AppColors.lightSurfaceBorder,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 4,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: Theme.of(context).colorScheme.onSurface,
            ),
          ),
          const SizedBox(height: 20),
          ...children,
        ],
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required String hint,
    String? Function(String?)? validator,
    void Function(String)? onChanged,
  }) {
    return FormInput(
      label: label,
      controller: controller,
      hint: hint,
      validator: validator,
      onChanged: onChanged,
      borderRadius: 8,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
    );
  }

  Widget _buildImagePicker() {
    final hasImage = _imageFile != null || _imageUrl != null;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (hasImage) ...[
          Builder(
            builder: (context) {
              final isDark = Theme.of(context).brightness == Brightness.dark;
              return Container(
                height: 200,
                width: double.infinity,
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: isDark
                        ? AppColors.surfaceBorder
                        : AppColors.lightSurfaceBorder,
                  ),
                  image: _imageFile != null
                      ? DecorationImage(
                          image: FileImage(_imageFile!),
                          fit: BoxFit.cover,
                        )
                      : (_imageUrl != null
                            ? DecorationImage(
                                image: NetworkImage(
                                  ref
                                      .read(apiProvider)
                                      .resolvePublicUrl(_imageUrl!),
                                ),
                                fit: BoxFit.cover,
                              )
                            : null),
                ),
              );
            },
          ),
          const SizedBox(height: 12),
        ],
        Row(
          children: [
            AppButton.secondary(
              label: hasImage ? 'Change Image' : 'Upload Image',
              icon: LucideIcons.upload,
              size: AppButtonSize.sm,
              onPressed: _pickImage,
            ),
            if (hasImage) ...[
              const SizedBox(width: 12),
              AppButton.danger(
                label: 'Remove',
                icon: LucideIcons.trash2,
                size: AppButtonSize.sm,
                onPressed: () {
                  setState(() {
                    _imageFile = null;
                    _imageUrl = null;
                  });
                },
              ),
            ],
          ],
        ),
      ],
    );
  }
}
