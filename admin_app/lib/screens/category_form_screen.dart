import 'dart:async';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:image_picker/image_picker.dart';
import '../providers/categories_provider.dart';
import '../models/product.dart';
import '../utils/image_storage_manager.dart';
import '../theme/app_theme.dart';
import '../widgets/form/form_input.dart';
import '../widgets/buttons/app_button.dart';
import '../widgets/tenant_image_widget.dart';
import 'package:easy_localization/easy_localization.dart';
import '../utils/app_toasts.dart';

class CategoryFormScreen extends ConsumerStatefulWidget {
  final String? categoryId;
  final ImagePicker? imagePicker;

  const CategoryFormScreen({super.key, this.categoryId, this.imagePicker});

  @override
  ConsumerState<CategoryFormScreen> createState() => _CategoryFormScreenState();
}

class _CategoryFormScreenState extends ConsumerState<CategoryFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final TextEditingController _titleController = TextEditingController();
  final TextEditingController _slugController = TextEditingController();
  late final ImagePicker _picker;

  String? _imagePath;
  final Set<String> _sessionLocalImages = <String>{};
  bool _isLoading = false;
  bool _autoGenerateSlug = true;
  Category? _existingCategory;

  @override
  void initState() {
    super.initState();
    _picker = widget.imagePicker ?? ImagePicker();
    if (widget.categoryId != null) {
      _loadCategory();
    }
    _titleController.addListener(_onTitleChanged);
  }

  @override
  void dispose() {
    _titleController.removeListener(_onTitleChanged);
    unawaited(_cleanupDiscardedImages());
    _titleController.dispose();
    _slugController.dispose();
    super.dispose();
  }

  Future<void> _cleanupDiscardedImages() async {
    final discarded = _sessionLocalImages.toList(growable: false);
    _sessionLocalImages.clear();
    for (final path in discarded) {
      try {
        await ImageStorageManager.deleteLocalImage(path);
      } catch (_) {}
    }
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
      _imagePath = _existingCategory!.imageUrl;
      _autoGenerateSlug = false;
    } catch (e) {
      if (mounted) {
        AppToasts.show(
          context,
          'Error loading category: $e',
          type: AppToastType.error,
        );
        context.pop();
      }
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _pickImage() async {
    final pickedFile = await _picker.pickImage(source: ImageSource.gallery);

    if (pickedFile != null) {
      final currentPath = _imagePath;
      final nextPath = await ImageStorageManager.saveImageLocally(
        File(pickedFile.path),
      );

      if (currentPath != null && _sessionLocalImages.remove(currentPath)) {
        await ImageStorageManager.deleteLocalImage(currentPath);
      }

      setState(() {
        _imagePath = nextPath;
        _sessionLocalImages.add(nextPath);
      });
    }
  }

  Future<void> _saveCategory() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    try {
      final success = widget.categoryId == null
          ? await ref
                .read(categoriesProvider.notifier)
                .createCategory(
                  title: _titleController.text.trim(),
                  slug: _slugController.text.trim(),
                  imageUrl: _imagePath,
                )
          : await ref
                .read(categoriesProvider.notifier)
                .updateCategory(
                  id: widget.categoryId!,
                  title: _titleController.text.trim(),
                  slug: _slugController.text.trim(),
                  imageUrl: _imagePath,
                );

      if (mounted) {
        if (success) {
          _sessionLocalImages.clear();
          AppToasts.show(
            context,
            widget.categoryId == null
                ? 'Category created successfully'
                : 'Category updated successfully',
            type: AppToastType.success,
          );
          context.pop();
        } else {
          throw Exception('Failed to save category');
        }
      }
    } catch (e) {
      if (mounted) {
        AppToasts.show(context, 'Error: $e', type: AppToastType.error);
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
                            title: 'app.basic_information'.tr(),
                            children: [
                              _buildTextField(
                                controller: _titleController,
                                label: 'admin.forms.category.title.label'.tr(),
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
                                label:
                                    'superAdmin.tenants.modal.fields.slug.slugFallback'
                                        .tr(),
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
                            title: 'app.category_image'.tr(),
                            children: [_buildImagePicker()],
                          ),
                          const SizedBox(height: 32),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.end,
                            children: [
                              AppButton.secondary(
                                label: 'admin.common.cancel'.tr(),
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
    final hasImage = _imagePath != null;

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
                ),
                child: _imagePath == null
                    ? null
                    : ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: TenantImageWidget(
                          imagePath: _imagePath!,
                          fit: BoxFit.cover,
                        ),
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
                label: 'storefront.cart.item.remove'.tr(),
                icon: LucideIcons.trash2,
                size: AppButtonSize.sm,
                onPressed: () {
                  final imagePath = _imagePath;
                  setState(() {
                    _imagePath = null;
                  });
                  if (imagePath != null &&
                      _sessionLocalImages.remove(imagePath)) {
                    unawaited(ImageStorageManager.deleteLocalImage(imagePath));
                  }
                },
              ),
            ],
          ],
        ),
      ],
    );
  }
}
