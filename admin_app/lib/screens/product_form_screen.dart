import 'dart:async';
import 'dart:io';

import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_cropper/image_cropper.dart';
import 'package:image_picker/image_picker.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:url_launcher/url_launcher.dart';

import '../models/product.dart';
import '../providers/products_provider.dart';
import '../providers/store_settings_provider.dart';
import '../providers/workspace_provider.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../utils/image_storage_manager.dart';
import '../widgets/buttons/app_button.dart';
import '../widgets/form/form_input.dart';
import '../widgets/form/form_select.dart';
import '../widgets/product_options_list.dart';
import '../widgets/rich_text_editor.dart';
import '../widgets/tenant_image_widget.dart';
import 'variant_edit_screen.dart';

class ProductFormScreen extends ConsumerStatefulWidget {
  final String? productId;
  final ImagePicker? imagePicker;

  const ProductFormScreen({super.key, this.productId, this.imagePicker});

  @override
  ConsumerState<ProductFormScreen> createState() => _ProductFormScreenState();
}

class _ProductFormScreenState extends ConsumerState<ProductFormScreen> {
  final _formKey = GlobalKey<FormState>();

  final _titleController = TextEditingController();
  final _slugController = TextEditingController();
  final _miniDescriptionController = TextEditingController();
  final _landingDescriptionController = TextEditingController();
  final _priceController = TextEditingController();
  final _stockController = TextEditingController();
  final _lowStockThresholdController = TextEditingController(text: '5');

  bool _isBootstrapping = true;
  bool _isSubmitting = false;
  bool _isActive = true;
  bool _isUploading = false;
  String? _error;

  String? _selectedCategoryId;
  Product? _product;

  final List<String> _images = [];
  final Set<String> _sessionLocalImages = <String>{};

  late final ImagePicker _picker;

  bool get _isEditing => widget.productId != null;

  @override
  void initState() {
    super.initState();
    _picker = widget.imagePicker ?? ImagePicker();

    _titleController.addListener(() {
      if (_isEditing) return;
      final title = _titleController.text.trim();
      if (title.isEmpty) return;
      final slug = title
          .toLowerCase()
          .replaceAll(RegExp(r'[^a-z0-9]+'), '-')
          .replaceAll(RegExp(r'^-+|-+$'), '');
      if (_slugController.text != slug) {
        _slugController.text = slug;
      }
    });
    _slugController.addListener(() {
      if (mounted) {
        setState(() {});
      }
    });

    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadData();
    });
  }

  @override
  void dispose() {
    unawaited(_cleanupDiscardedImages());
    _titleController.dispose();
    _slugController.dispose();
    _miniDescriptionController.dispose();
    _landingDescriptionController.dispose();
    _priceController.dispose();
    _stockController.dispose();
    _lowStockThresholdController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() {
      _isBootstrapping = true;
      _error = null;
    });

    try {
      await ref.read(productsProvider.notifier).fetchCategories();

      if (_isEditing) {
        final product = await ref
            .read(productsProvider.notifier)
            .fetchProduct(widget.productId!);
        if (product != null) {
          _titleController.text = product.title;
          _slugController.text = product.slug;
          _miniDescriptionController.text = product.miniDescription ?? '';
          _landingDescriptionController.text = product.description ?? '';
          _priceController.text = product.price.toString();
          _stockController.text = product.stock.toString();
          _lowStockThresholdController.text = product.lowStockThreshold
              .toString();
          _selectedCategoryId = product.categoryId ?? product.category?.id;
          _isActive = product.isActive;

          final productImageUrls = product.productImages
              .map((item) => item.url.trim())
              .where((url) => url.isNotEmpty)
              .toList(growable: false);
          final legacyImageUrls = product.images
              .map((item) => item.trim())
              .where((url) => url.isNotEmpty)
              .toList(growable: false);
          final initialImages = productImageUrls.isNotEmpty
              ? productImageUrls
              : legacyImageUrls;
          _images
            ..clear()
            ..addAll(initialImages);
          _product = product;
        }
      }
    } catch (e) {
      _error = e.toString();
    } finally {
      if (mounted) {
        setState(() {
          _isBootstrapping = false;
        });
      }
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isSubmitting = true;
      _error = null;
    });

    try {
      final payload = <String, dynamic>{
        'title': _titleController.text.trim(),
        'slug': _slugController.text.trim(),
        'miniDescription': _miniDescriptionController.text.trim(),
        'description': _landingDescriptionController.text,
        'price': double.tryParse(_priceController.text.trim()) ?? 0,
        'isActive': _isActive,
        'categoryId': _selectedCategoryId,
        'lowStockThreshold':
            int.tryParse(_lowStockThresholdController.text.trim()) ?? 5,
        'images': _images,
      };

      if (!_isEditing) {
        payload['stock'] = int.tryParse(_stockController.text.trim()) ?? 0;
      }

      if (_isEditing) {
        await ref
            .read(productsProvider.notifier)
            .updateProduct(widget.productId!, payload);
      } else {
        await ref.read(productsProvider.notifier).createProduct(payload);
      }

      _sessionLocalImages.clear();
      if (mounted) context.pop();
    } catch (e) {
      setState(() {
        _error = e.toString();
      });
    } finally {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
        });
      }
    }
  }

  Future<void> _pickImage() async {
    try {
      final selected = await _picker.pickImage(source: ImageSource.gallery);
      if (selected == null) return;
      if (!mounted) return;

      setState(() => _isUploading = true);
      final cropped = await _cropImage(selected);
      if (cropped == null) return;

      final apiService = ref.read(apiProvider);
      String? uploadedUrl;
      try {
        final croppedBytes = await cropped.readAsBytes();
        uploadedUrl = await apiService.uploadImageBytes(
          croppedBytes,
          filename: _buildCroppedFilename(selected.name),
        );
      } catch (_) {
        // Web can fail to re-open bytes from the cropped path in some browsers.
        // Fall back to uploading the originally picked file so add-image never dead-ends.
        uploadedUrl = await apiService.uploadPickedFile(selected);
      }
      final resolvedUploadedUrl = uploadedUrl?.trim() ?? '';
      if (resolvedUploadedUrl.isNotEmpty) {
        setState(() {
          _images.add(resolvedUploadedUrl);
        });
      } else {
        if (kIsWeb) {
          throw Exception('web_upload_failed');
        }
        final localSourcePath = cropped.path.trim().isNotEmpty
            ? cropped.path
            : selected.path;
        final localPath = await ImageStorageManager.saveImageLocally(
          File(localSourcePath),
        );
        setState(() {
          _images.add(localPath);
          _sessionLocalImages.add(localPath);
        });
      }
    } catch (e) {
      setState(() {
        _error = 'admin.pages.products.edit.errors.imagePickFailed'.tr();
      });
    } finally {
      if (mounted) {
        setState(() => _isUploading = false);
      }
    }
  }

  String _buildCroppedFilename(String originalName) {
    final trimmed = originalName.trim();
    if (trimmed.isEmpty) {
      return 'cropped-${DateTime.now().microsecondsSinceEpoch}.jpg';
    }
    final withoutExt = trimmed.replaceAll(RegExp(r'\.[^.]+$'), '');
    return '${withoutExt.isEmpty ? 'cropped' : withoutExt}-cropped.jpg';
  }

  Future<CroppedFile?> _cropImage(XFile source) async {
    final cropped = await ImageCropper().cropImage(
      sourcePath: source.path,
      compressFormat: ImageCompressFormat.jpg,
      compressQuality: 92,
      uiSettings: [
        AndroidUiSettings(
          toolbarTitle: 'Crop image',
          toolbarColor: const Color(0xFF65A30D),
          toolbarWidgetColor: Colors.white,
          initAspectRatio: CropAspectRatioPreset.original,
          lockAspectRatio: false,
          aspectRatioPresets: const [
            CropAspectRatioPreset.original,
            CropAspectRatioPreset.square,
            CropAspectRatioPreset.ratio4x3,
            CropAspectRatioPreset.ratio16x9,
          ],
        ),
        IOSUiSettings(
          title: 'Crop image',
          aspectRatioLockEnabled: false,
          resetAspectRatioEnabled: true,
          aspectRatioPresets: const [
            CropAspectRatioPreset.original,
            CropAspectRatioPreset.square,
            CropAspectRatioPreset.ratio4x3,
            CropAspectRatioPreset.ratio16x9,
          ],
        ),
        WebUiSettings(
          context: context,
          presentStyle: WebPresentStyle.dialog,
          size: const CropperSize(width: 1024, height: 720),
          dragMode: WebDragMode.move,
          initialAspectRatio: 1,
          viewwMode: WebViewMode.mode_1,
          zoomable: true,
          movable: true,
          rotatable: true,
          scalable: true,
        ),
      ],
    );
    return cropped;
  }

  Future<void> _removeImage(int index) async {
    final removed = _images[index];
    setState(() {
      _images.removeAt(index);
    });

    if (_sessionLocalImages.remove(removed)) {
      await ImageStorageManager.deleteLocalImage(removed);
    }
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

  String? _buildProductUrl({required bool landing}) {
    final slug = _slugController.text.trim();
    if (slug.isEmpty) return null;

    final workspace = ref.read(workspaceProvider);
    final store = ref.read(storeSettingsProvider).settings;

    final apiUri = Uri.tryParse(workspace.apiBaseUrl);
    if (apiUri == null || apiUri.host.trim().isEmpty) return null;

    final origin = apiUri.replace(path: '', query: null, fragment: null);
    final host = _resolveTenantHost(origin.host, store.slug.trim());

    return origin
        .replace(
          host: host,
          path: '/product/$slug',
          queryParameters: landing ? {'mode': 'landing'} : null,
        )
        .toString();
  }

  String _resolveTenantHost(String baseHost, String tenantSlug) {
    if (tenantSlug.isEmpty) return baseHost;

    final lower = baseHost.toLowerCase();
    if (lower.startsWith('$tenantSlug.')) return baseHost;

    if (lower == 'localhost' || lower.endsWith('.localhost')) {
      return '$tenantSlug.localhost';
    }

    if (lower.startsWith('api.')) {
      return '$tenantSlug.${baseHost.substring(4)}';
    }

    final parts = baseHost.split('.');
    if (parts.length > 2) {
      final first = parts.first.toLowerCase();
      if (first == 'api' || first == 'admin' || first == 'app') {
        return '$tenantSlug.${parts.sublist(1).join('.')}';
      }
    }

    return '$tenantSlug.$baseHost';
  }

  Future<void> _copyUrl(String? url) async {
    if (url == null || url.isEmpty) return;
    await Clipboard.setData(ClipboardData(text: url));
    if (!mounted) return;
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text('admin.common.copied'.tr())));
  }

  Future<void> _openUrl(String? url) async {
    if (url == null || url.isEmpty) return;
    final uri = Uri.tryParse(url);
    if (uri == null) return;
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  @override
  Widget build(BuildContext context) {
    final categories = ref.watch(productsProvider).categories;

    final productUrl = _buildProductUrl(landing: false);
    final landingUrl = _buildProductUrl(landing: true);
    final hasSlug = _slugController.text.trim().isNotEmpty;

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 1280),
            child: Padding(
              padding: EdgeInsets.all(
                MediaQuery.sizeOf(context).width < 900 ? 12 : 24,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _ProductBreadcrumb(
                    isEditing: _isEditing,
                    title: _titleController.text,
                  ),
                  const SizedBox(height: 12),
                  _ProductHeader(
                    isEditing: _isEditing,
                    hasSlug: hasSlug,
                    productUrl: productUrl,
                    landingUrl: landingUrl,
                    onOpenProduct: () => _openUrl(productUrl),
                    onCopyProduct: () => _copyUrl(productUrl),
                    onOpenLanding: () => _openUrl(landingUrl),
                    onCopyLanding: () => _copyUrl(landingUrl),
                    onCancel: () => context.pop(),
                    onSubmit: _submit,
                    isSubmitting: _isSubmitting,
                  ),
                  const SizedBox(height: 12),
                  if (_error != null) ...[
                    _ErrorBanner(message: _error!),
                    const SizedBox(height: 12),
                  ],
                  Expanded(
                    child: _isBootstrapping
                        ? const _LoadingCard()
                        : _ProductTabsCard(
                            formKey: _formKey,
                            categories: categories,
                            isEditing: _isEditing,
                            isSubmitting: _isSubmitting,
                            titleController: _titleController,
                            slugController: _slugController,
                            miniDescriptionController:
                                _miniDescriptionController,
                            landingDescriptionController:
                                _landingDescriptionController,
                            priceController: _priceController,
                            stockController: _stockController,
                            lowStockThresholdController:
                                _lowStockThresholdController,
                            selectedCategoryId: _selectedCategoryId,
                            onCategoryChanged: (value) {
                              setState(() {
                                _selectedCategoryId = value;
                              });
                            },
                            isActive: _isActive,
                            onActiveChanged: (value) {
                              setState(() {
                                _isActive = value;
                              });
                            },
                            images: _images,
                            isUploading: _isUploading,
                            onAddImage: _pickImage,
                            onRemoveImage: _removeImage,
                            product: _product,
                            productId: widget.productId,
                            onVariantUpdated: _loadData,
                            onCancel: () => context.pop(),
                            onSubmit: _submit,
                          ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _ProductBreadcrumb extends StatelessWidget {
  final bool isEditing;
  final String title;

  const _ProductBreadcrumb({required this.isEditing, required this.title});

  @override
  Widget build(BuildContext context) {
    final crumb = isEditing
        ? 'admin.pages.products.edit.breadcrumbEdit'.tr(
            namedArgs: {
              'title': title.trim().isEmpty
                  ? 'admin.pages.products.edit.fallbackTitle'.tr()
                  : title.trim(),
            },
          )
        : 'admin.pages.products.create.breadcrumb'.tr();

    final muted = Theme.of(
      context,
    ).colorScheme.onSurface.withValues(alpha: 0.6);

    return Row(
      children: [
        InkWell(
          onTap: () => context.go('/products'),
          borderRadius: BorderRadius.circular(8),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 6),
            child: Text(
              'admin.nav.products'.tr(),
              style: TextStyle(
                color: muted,
                fontSize: 13,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ),
        const SizedBox(width: 8),
        Icon(LucideIcons.chevronRight, size: 14, color: muted),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            crumb,
            style: TextStyle(color: muted, fontSize: 13),
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }
}

class _ProductHeader extends StatelessWidget {
  final bool isEditing;
  final bool hasSlug;
  final String? productUrl;
  final String? landingUrl;
  final VoidCallback onOpenProduct;
  final VoidCallback onCopyProduct;
  final VoidCallback onOpenLanding;
  final VoidCallback onCopyLanding;
  final VoidCallback onCancel;
  final VoidCallback onSubmit;
  final bool isSubmitting;

  const _ProductHeader({
    required this.isEditing,
    required this.hasSlug,
    required this.productUrl,
    required this.landingUrl,
    required this.onOpenProduct,
    required this.onCopyProduct,
    required this.onOpenLanding,
    required this.onCopyLanding,
    required this.onCancel,
    required this.onSubmit,
    required this.isSubmitting,
  });

  @override
  Widget build(BuildContext context) {
    final title = isEditing
        ? 'admin.pages.products.edit.title'.tr()
        : 'admin.pages.products.create.title'.tr();
    final subtitle = isEditing
        ? 'admin.pages.products.edit.subtitle'.tr()
        : 'admin.pages.products.create.subtitle'.tr();

    final canUseLinks = hasSlug && productUrl != null && landingUrl != null;
    final borderColor = Theme.of(
      context,
    ).colorScheme.outline.withValues(alpha: 0.25);

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w700,
                  letterSpacing: -0.4,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                subtitle,
                style: TextStyle(
                  color: Theme.of(
                    context,
                  ).colorScheme.onSurface.withValues(alpha: 0.6),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(width: 12),
        Flexible(
          child: Wrap(
            spacing: 10,
            runSpacing: 10,
            alignment: WrapAlignment.end,
            children: [
              _LinksCard(
                borderColor: borderColor,
                canUseLinks: canUseLinks,
                onOpenProduct: onOpenProduct,
                onCopyProduct: onCopyProduct,
                onOpenLanding: onOpenLanding,
                onCopyLanding: onCopyLanding,
              ),
              AppButton.secondary(
                key: const Key('product-form-header-cancel'),
                label: 'admin.common.cancel'.tr(),
                onPressed: onCancel,
              ),
              AppButton.primary(
                key: const Key('product-form-header-submit'),
                label: isEditing
                    ? 'admin.pages.products.edit.submit'.tr()
                    : 'admin.pages.products.create.submit'.tr(),
                onPressed: onSubmit,
                loading: isSubmitting,
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _LinksCard extends StatelessWidget {
  final Color borderColor;
  final bool canUseLinks;
  final VoidCallback onOpenProduct;
  final VoidCallback onCopyProduct;
  final VoidCallback onOpenLanding;
  final VoidCallback onCopyLanding;

  const _LinksCard({
    required this.borderColor,
    required this.canUseLinks,
    required this.onOpenProduct,
    required this.onCopyProduct,
    required this.onOpenLanding,
    required this.onCopyLanding,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: borderColor),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '${'admin.pages.products.edit.links.label'.tr()}:',
            style: TextStyle(
              fontSize: 12,
              color: Theme.of(
                context,
              ).colorScheme.onSurface.withValues(alpha: 0.6),
            ),
          ),
          const SizedBox(height: 4),
          Wrap(
            spacing: 8,
            runSpacing: 2,
            children: [
              _LinkActionGroup(
                label: 'admin.pages.products.edit.links.product'.tr(),
                canUseLinks: canUseLinks,
                openTooltip: 'admin.pages.products.edit.links.openProduct'.tr(),
                copyTooltip: 'admin.pages.products.edit.links.copyProduct'.tr(),
                onOpen: onOpenProduct,
                onCopy: onCopyProduct,
              ),
              _LinkActionGroup(
                label: 'admin.pages.products.edit.links.landing'.tr(),
                canUseLinks: canUseLinks,
                openTooltip: 'admin.pages.products.edit.links.openLanding'.tr(),
                copyTooltip: 'admin.pages.products.edit.links.copyLanding'.tr(),
                onOpen: onOpenLanding,
                onCopy: onCopyLanding,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _LinkActionGroup extends StatelessWidget {
  final String label;
  final bool canUseLinks;
  final String openTooltip;
  final String copyTooltip;
  final VoidCallback onOpen;
  final VoidCallback onCopy;

  const _LinkActionGroup({
    required this.label,
    required this.canUseLinks,
    required this.openTooltip,
    required this.copyTooltip,
    required this.onOpen,
    required this.onCopy,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          '$label:',
          style: TextStyle(
            fontSize: 12,
            color: Theme.of(
              context,
            ).colorScheme.onSurface.withValues(alpha: 0.6),
          ),
        ),
        const SizedBox(width: 4),
        IconButton(
          icon: const Icon(LucideIcons.externalLink, size: 16),
          color: const Color(0xFF65A30D),
          splashRadius: 16,
          tooltip: openTooltip,
          onPressed: canUseLinks ? onOpen : null,
        ),
        IconButton(
          icon: const Icon(LucideIcons.copy, size: 16),
          color: const Color(0xFF94A3B8),
          splashRadius: 16,
          tooltip: copyTooltip,
          onPressed: canUseLinks ? onCopy : null,
        ),
      ],
    );
  }
}

class _ErrorBanner extends StatelessWidget {
  final String message;

  const _ErrorBanner({required this.message});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isDark ? AppColors.redSurface : const Color(0xFFFEF2F2),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: isDark
              ? AppColors.redText.withValues(alpha: 0.3)
              : const Color(0xFFFECACA),
        ),
      ),
      child: Text(
        message,
        style: TextStyle(
          fontSize: 14,
          color: isDark ? AppColors.redText : const Color(0xFFB91C1C),
        ),
      ),
    );
  }
}

class _LoadingCard extends StatelessWidget {
  const _LoadingCard();

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: Theme.of(context).colorScheme.outline.withValues(alpha: 0.25),
        ),
      ),
      child: const Center(child: CircularProgressIndicator()),
    );
  }
}

class _ProductTabsCard extends StatelessWidget {
  final GlobalKey<FormState> formKey;
  final List<Category> categories;
  final bool isEditing;
  final bool isSubmitting;
  final TextEditingController titleController;
  final TextEditingController slugController;
  final TextEditingController miniDescriptionController;
  final TextEditingController landingDescriptionController;
  final TextEditingController priceController;
  final TextEditingController stockController;
  final TextEditingController lowStockThresholdController;
  final String? selectedCategoryId;
  final ValueChanged<String?> onCategoryChanged;
  final bool isActive;
  final ValueChanged<bool> onActiveChanged;
  final List<String> images;
  final bool isUploading;
  final VoidCallback onAddImage;
  final ValueChanged<int> onRemoveImage;
  final Product? product;
  final String? productId;
  final VoidCallback onVariantUpdated;
  final VoidCallback onCancel;
  final VoidCallback onSubmit;

  const _ProductTabsCard({
    required this.formKey,
    required this.categories,
    required this.isEditing,
    required this.isSubmitting,
    required this.titleController,
    required this.slugController,
    required this.miniDescriptionController,
    required this.landingDescriptionController,
    required this.priceController,
    required this.stockController,
    required this.lowStockThresholdController,
    required this.selectedCategoryId,
    required this.onCategoryChanged,
    required this.isActive,
    required this.onActiveChanged,
    required this.images,
    required this.isUploading,
    required this.onAddImage,
    required this.onRemoveImage,
    required this.product,
    required this.productId,
    required this.onVariantUpdated,
    required this.onCancel,
    required this.onSubmit,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return DefaultTabController(
      length: 3,
      child: Container(
        decoration: BoxDecoration(
          color: isDark ? AppColors.surface1 : AppColors.lightSurface1,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isDark
                ? AppColors.surfaceBorder
                : AppColors.lightSurfaceBorder,
          ),
        ),
        child: Column(
          children: [
            TabBar(
              isScrollable: true,
              tabAlignment: TabAlignment.start,
              labelColor: const Color(0xFF65A30D),
              unselectedLabelColor: const Color(0xFF64748B),
              indicatorColor: const Color(0xFF65A30D),
              indicatorSize: TabBarIndicatorSize.tab,
              tabs: [
                Tab(text: 'admin.pages.products.edit.tabs.general'.tr()),
                Tab(text: 'admin.pages.products.edit.tabs.description'.tr()),
                Tab(text: 'admin.pages.products.edit.tabs.variants'.tr()),
              ],
            ),
            const Divider(height: 1, color: Color(0xFFE2E8F0)),
            Expanded(
              child: Form(
                key: formKey,
                child: TabBarView(
                  children: [
                    _GeneralTabSection(
                      isEditing: isEditing,
                      titleController: titleController,
                      slugController: slugController,
                      miniDescriptionController: miniDescriptionController,
                      priceController: priceController,
                      stockController: stockController,
                      lowStockThresholdController: lowStockThresholdController,
                      categories: categories,
                      selectedCategoryId: selectedCategoryId,
                      onCategoryChanged: onCategoryChanged,
                      isActive: isActive,
                      onActiveChanged: onActiveChanged,
                      images: images,
                      isUploading: isUploading,
                      onAddImage: onAddImage,
                      onRemoveImage: onRemoveImage,
                    ),
                    _DescriptionTabSection(
                      controller: landingDescriptionController,
                    ),
                    _VariantsTabSection(
                      isEditing: isEditing,
                      product: product,
                      productId: productId,
                      onVariantUpdated: onVariantUpdated,
                    ),
                  ],
                ),
              ),
            ),
            const Divider(height: 1, color: Color(0xFFE2E8F0)),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  AppButton.secondary(
                    key: const Key('product-form-footer-cancel'),
                    label: 'admin.common.cancel'.tr(),
                    onPressed: onCancel,
                  ),
                  const SizedBox(width: 12),
                  AppButton.primary(
                    key: const Key('product-form-footer-submit'),
                    label: isEditing
                        ? 'admin.pages.products.edit.submit'.tr()
                        : 'admin.pages.products.create.submit'.tr(),
                    onPressed: onSubmit,
                    loading: isSubmitting,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _GeneralTabSection extends StatelessWidget {
  final bool isEditing;
  final TextEditingController titleController;
  final TextEditingController slugController;
  final TextEditingController miniDescriptionController;
  final TextEditingController priceController;
  final TextEditingController stockController;
  final TextEditingController lowStockThresholdController;
  final List<Category> categories;
  final String? selectedCategoryId;
  final ValueChanged<String?> onCategoryChanged;
  final bool isActive;
  final ValueChanged<bool> onActiveChanged;
  final List<String> images;
  final bool isUploading;
  final VoidCallback onAddImage;
  final ValueChanged<int> onRemoveImage;

  const _GeneralTabSection({
    required this.isEditing,
    required this.titleController,
    required this.slugController,
    required this.miniDescriptionController,
    required this.priceController,
    required this.stockController,
    required this.lowStockThresholdController,
    required this.categories,
    required this.selectedCategoryId,
    required this.onCategoryChanged,
    required this.isActive,
    required this.onActiveChanged,
    required this.images,
    required this.isUploading,
    required this.onAddImage,
    required this.onRemoveImage,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              color: isDark ? AppColors.surface2 : AppColors.lightSurface2,
              border: Border.all(
                color: isDark
                    ? AppColors.surfaceBorder
                    : AppColors.lightSurfaceBorder,
              ),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'admin.forms.product.isActive.label'.tr(),
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        isActive
                            ? 'admin.common.active'.tr()
                            : 'admin.common.inactive'.tr(),
                        style: TextStyle(
                          fontSize: 12,
                          color: Theme.of(
                            context,
                          ).colorScheme.onSurface.withValues(alpha: 0.6),
                        ),
                      ),
                    ],
                  ),
                ),
                Switch.adaptive(
                  key: const Key('product-form-active-switch'),
                  value: isActive,
                  onChanged: onActiveChanged,
                  activeTrackColor: const Color(0xFF65A30D),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          FormInput(
            key: const Key('product-form-title'),
            label: 'admin.forms.product.title.label'.tr(),
            controller: titleController,
            hint: 'admin.forms.product.title.placeholder'.tr(),
            validator: (value) {
              if (value == null || value.trim().isEmpty) {
                return 'admin.validation.required'.tr();
              }
              return null;
            },
          ),
          const SizedBox(height: 16),
          FormInput(
            key: const Key('product-form-slug'),
            label: 'admin.forms.product.slug.label'.tr(),
            controller: slugController,
            hint: 'admin.forms.product.slug.placeholder'.tr(),
            validator: (value) {
              if (value == null || value.trim().isEmpty) {
                return 'admin.validation.required'.tr();
              }
              return null;
            },
          ),
          const SizedBox(height: 4),
          Text(
            isEditing
                ? 'admin.forms.product.slug.hintEdit'.tr()
                : 'admin.forms.product.slug.hintCreate'.tr(),
            style: TextStyle(
              fontSize: 12,
              color: Theme.of(
                context,
              ).colorScheme.onSurface.withValues(alpha: 0.6),
            ),
          ),
          const SizedBox(height: 16),
          FormInput(
            key: const Key('product-form-mini-description'),
            label: 'admin.forms.product.miniDescription.label'.tr(),
            controller: miniDescriptionController,
            hint: 'admin.forms.product.miniDescription.placeholder'.tr(),
            maxLines: 3,
          ),
          const SizedBox(height: 4),
          Text(
            'admin.forms.product.miniDescription.hint'.tr(),
            style: TextStyle(
              fontSize: 12,
              color: Theme.of(
                context,
              ).colorScheme.onSurface.withValues(alpha: 0.6),
            ),
          ),
          const SizedBox(height: 16),
          LayoutBuilder(
            builder: (context, constraints) {
              final compact = constraints.maxWidth < 760;
              if (compact) {
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    FormInput(
                      key: const Key('product-form-price'),
                      label: 'admin.forms.product.price.label'.tr(),
                      controller: priceController,
                      hint: 'admin.forms.product.price.placeholder'.tr(),
                      keyboardType: const TextInputType.numberWithOptions(
                        decimal: true,
                      ),
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) {
                          return 'admin.validation.required'.tr();
                        }
                        if (double.tryParse(value.trim()) == null) {
                          return 'admin.validation.invalidNumber'.tr();
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 12),
                    FormInput(
                      key: const Key('product-form-stock'),
                      label: 'admin.forms.product.stock.label'.tr(),
                      controller: stockController,
                      hint: 'admin.forms.product.stock.placeholder'.tr(),
                      keyboardType: TextInputType.number,
                      enabled: !isEditing,
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) {
                          return 'admin.validation.required'.tr();
                        }
                        if (int.tryParse(value.trim()) == null) {
                          return 'admin.validation.invalidNumber'.tr();
                        }
                        return null;
                      },
                    ),
                  ],
                );
              }
              return Row(
                children: [
                  Expanded(
                    child: FormInput(
                      key: const Key('product-form-price'),
                      label: 'admin.forms.product.price.label'.tr(),
                      controller: priceController,
                      hint: 'admin.forms.product.price.placeholder'.tr(),
                      keyboardType: const TextInputType.numberWithOptions(
                        decimal: true,
                      ),
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) {
                          return 'admin.validation.required'.tr();
                        }
                        if (double.tryParse(value.trim()) == null) {
                          return 'admin.validation.invalidNumber'.tr();
                        }
                        return null;
                      },
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: FormInput(
                      key: const Key('product-form-stock'),
                      label: 'admin.forms.product.stock.label'.tr(),
                      controller: stockController,
                      hint: 'admin.forms.product.stock.placeholder'.tr(),
                      keyboardType: TextInputType.number,
                      enabled: !isEditing,
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) {
                          return 'admin.validation.required'.tr();
                        }
                        if (int.tryParse(value.trim()) == null) {
                          return 'admin.validation.invalidNumber'.tr();
                        }
                        return null;
                      },
                    ),
                  ),
                ],
              );
            },
          ),
          if (isEditing) ...[
            const SizedBox(height: 4),
            Text(
              'admin.forms.product.stock.hintSystemManaged'.tr(),
              style: TextStyle(
                fontSize: 12,
                color: Theme.of(
                  context,
                ).colorScheme.onSurface.withValues(alpha: 0.6),
              ),
            ),
            const SizedBox(height: 12),
          ],
          const SizedBox(height: 16),
          FormInput(
            key: const Key('product-form-low-stock-threshold'),
            label: 'admin.forms.product.lowStockThreshold.label'.tr(),
            controller: lowStockThresholdController,
            hint: 'admin.forms.product.lowStockThreshold.placeholder'.tr(),
            keyboardType: TextInputType.number,
            validator: (value) {
              if (value == null || value.trim().isEmpty) {
                return 'admin.validation.required'.tr();
              }
              if (int.tryParse(value.trim()) == null) {
                return 'admin.validation.invalidNumber'.tr();
              }
              return null;
            },
          ),
          const SizedBox(height: 4),
          Text(
            'admin.forms.product.lowStockThreshold.hint'.tr(),
            style: TextStyle(
              fontSize: 12,
              color: Theme.of(
                context,
              ).colorScheme.onSurface.withValues(alpha: 0.6),
            ),
          ),
          const SizedBox(height: 16),
          FormSelect<String?>(
            label: 'admin.forms.product.category.label'.tr(),
            value: selectedCategoryId,
            hint: 'admin.forms.product.category.placeholder'.tr(),
            icon: const Icon(LucideIcons.chevronDown, size: 16),
            items: [
              DropdownMenuItem<String?>(
                value: null,
                child: Text('admin.common.noneSelected'.tr()),
              ),
              ...categories.map(
                (cat) => DropdownMenuItem<String?>(
                  value: cat.id,
                  child: Text(cat.title),
                ),
              ),
            ],
            onChanged: onCategoryChanged,
          ),
          const SizedBox(height: 16),
          _ImagesSection(
            images: images,
            isUploading: isUploading,
            onAddImage: onAddImage,
            onRemoveImage: onRemoveImage,
          ),
        ],
      ),
    );
  }
}

class _ImagesSection extends StatelessWidget {
  final List<String> images;
  final bool isUploading;
  final VoidCallback onAddImage;
  final ValueChanged<int> onRemoveImage;

  const _ImagesSection({
    required this.images,
    required this.isUploading,
    required this.onAddImage,
    required this.onRemoveImage,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'admin.pages.products.edit.generalTab.imagesTitle'.tr(),
          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: 4),
        Text(
          'admin.pages.products.edit.generalTab.imagesHint'.tr(),
          style: TextStyle(
            color: Theme.of(
              context,
            ).colorScheme.onSurface.withValues(alpha: 0.6),
            fontSize: 12,
          ),
        ),
        const SizedBox(height: 10),
        Align(
          alignment: Alignment.centerLeft,
          child: AppButton.secondary(
            label: 'admin.pages.products.edit.generalTab.addImage'.tr(),
            icon: LucideIcons.plus,
            onPressed: isUploading ? null : onAddImage,
          ),
        ),
        const SizedBox(height: 12),
        if (isUploading)
          const Padding(
            padding: EdgeInsets.only(bottom: 12),
            child: LinearProgressIndicator(color: Color(0xFF65A30D)),
          ),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 3,
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            childAspectRatio: 1,
          ),
          itemCount: images.length + 1,
          itemBuilder: (context, index) {
            if (index == images.length) {
              return InkWell(
                onTap: isUploading ? null : onAddImage,
                child: Container(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: Theme.of(
                        context,
                      ).colorScheme.outline.withValues(alpha: 0.3),
                    ),
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(
                        LucideIcons.plus,
                        size: 20,
                        color: Color(0xFF94A3B8),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'admin.pages.products.edit.generalTab.addImage'.tr(),
                        style: const TextStyle(
                          fontSize: 12,
                          color: Color(0xFF64748B),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }

            final image = images[index];
            return Stack(
              children: [
                Positioned.fill(
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: TenantImageWidget(
                      imagePath: image,
                      fit: BoxFit.cover,
                    ),
                  ),
                ),
                Positioned(
                  top: 4,
                  right: 4,
                  child: InkWell(
                    onTap: () => onRemoveImage(index),
                    child: Container(
                      padding: const EdgeInsets.all(4),
                      decoration: const BoxDecoration(
                        color: Colors.white,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        LucideIcons.trash2,
                        size: 14,
                        color: Color(0xFFEF4444),
                      ),
                    ),
                  ),
                ),
              ],
            );
          },
        ),
      ],
    );
  }
}

class _DescriptionTabSection extends StatelessWidget {
  final TextEditingController controller;

  const _DescriptionTabSection({required this.controller});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'admin.pages.products.edit.descriptionTab.title'.tr(),
            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 8),
          RichTextEditor(
            initialValue: controller.text,
            placeholder: 'admin.forms.product.description.placeholder'.tr(),
            onChanged: (value) => controller.text = value,
          ),
        ],
      ),
    );
  }
}

class _VariantsTabSection extends StatelessWidget {
  final bool isEditing;
  final Product? product;
  final String? productId;
  final VoidCallback onVariantUpdated;

  const _VariantsTabSection({
    required this.isEditing,
    required this.product,
    required this.productId,
    required this.onVariantUpdated,
  });

  @override
  Widget build(BuildContext context) {
    if (!isEditing) {
      return Center(
        child: Text(
          'admin.pages.products.edit.variantsTab.saveFirst'.tr(),
          style: const TextStyle(color: Color(0xFF64748B)),
        ),
      );
    }

    if (product == null || productId == null) {
      return const Center(child: CircularProgressIndicator());
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ProductOptionsList(productId: productId!, options: product!.options),
          const SizedBox(height: 20),
          Text(
            'admin.pages.products.edit.variantsTab.title'.tr(),
            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 10),
          if (product!.variants.isEmpty)
            Text(
              'admin.pages.products.edit.variantsTab.empty'.tr(),
              style: const TextStyle(color: Color(0xFF64748B)),
            )
          else
            Card(
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
                side: const BorderSide(color: Color(0xFFE2E8F0)),
              ),
              clipBehavior: Clip.antiAlias,
              child: Column(
                children: product!.variants.map((variant) {
                  return InkWell(
                    onTap: () {
                      Navigator.of(context)
                          .push(
                            MaterialPageRoute(
                              builder: (_) => VariantEditScreen(
                                variant: variant,
                                product: product!,
                              ),
                            ),
                          )
                          .then((_) => onVariantUpdated());
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 12,
                      ),
                      decoration: const BoxDecoration(
                        border: Border(
                          bottom: BorderSide(color: Color(0xFFE2E8F0)),
                        ),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 40,
                            height: 40,
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(6),
                              color: const Color(0xFFF1F5F9),
                            ),
                            clipBehavior: Clip.antiAlias,
                            child: variant.images.isNotEmpty
                                ? TenantImageWidget(
                                    imagePath: variant.images.first,
                                    fit: BoxFit.cover,
                                  )
                                : null,
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  variant.title,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                Text(
                                  variant.sku.isEmpty
                                      ? 'admin.pages.products.edit.variantsTab.noSku'
                                            .tr()
                                      : variant.sku,
                                  style: const TextStyle(
                                    fontSize: 12,
                                    color: Color(0xFF64748B),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 8),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text(
                                variant.price.toStringAsFixed(2),
                                style: const TextStyle(
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              Text(
                                'admin.pages.products.edit.variantsTab.inStock'
                                    .tr(
                                      namedArgs: {
                                        'count': variant.stock.toString(),
                                      },
                                    ),
                                style: TextStyle(
                                  fontSize: 12,
                                  color: variant.stock > 0
                                      ? const Color(0xFF65A30D)
                                      : const Color(0xFFEF4444),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(width: 8),
                          const Icon(
                            LucideIcons.chevronRight,
                            size: 16,
                            color: Color(0xFF94A3B8),
                          ),
                        ],
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
        ],
      ),
    );
  }
}
