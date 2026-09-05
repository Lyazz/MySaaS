import 'dart:async';
import 'dart:io';

import 'package:crop_your_image/crop_your_image.dart' as desktop_crop;
import 'package:dio/dio.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/foundation.dart'
    show TargetPlatform, defaultTargetPlatform, kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_cropper/image_cropper.dart';
import 'package:image_picker/image_picker.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
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
import '../utils/app_toasts.dart';

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
  final _searchKeywordsController = TextEditingController();
  final _landingDescriptionController = TextEditingController();
  final _priceController = TextEditingController();
  final _stockController = TextEditingController();
  final _lowStockThresholdController = TextEditingController(
    text: 'admin.forms.product.lowStockThreshold.placeholder'.tr(),
  );
  final _promotionalPriceController = TextEditingController();

  DateTime? _promotionStartDate;
  DateTime? _promotionEndDate;
  bool _showCountdown = false;
  bool _isPromotionActive = false;

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
    _searchKeywordsController.dispose();
    _landingDescriptionController.dispose();
    _priceController.dispose();
    _stockController.dispose();
    _lowStockThresholdController.dispose();
    _promotionalPriceController.dispose();
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
          _searchKeywordsController.text = product.searchKeywords ?? '';
          _landingDescriptionController.text = product.description ?? '';
          _priceController.text = product.price.toString();
          _stockController.text = product.stock.toString();
          _lowStockThresholdController.text = product.lowStockThreshold
              .toString();
          _selectedCategoryId = product.categoryId ?? product.category?.id;
          _isActive = product.isActive;
          _isPromotionActive = product.isPromotionActive;
          _promotionalPriceController.text =
              product.promotionalPrice?.toString() ?? '';
          _promotionStartDate = product.promotionStartDate;
          _promotionEndDate = product.promotionEndDate;
          _showCountdown = product.showCountdown;

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
        'searchKeywords': _searchKeywordsController.text.trim(),
        'description': _landingDescriptionController.text,
        'price': double.tryParse(_priceController.text.trim()) ?? 0,
        'isActive': _isActive,
        'categoryId': _selectedCategoryId,
        'lowStockThreshold':
            int.tryParse(_lowStockThresholdController.text.trim()) ?? 5,
        'images': _images,
        'isPromotionActive': _isPromotionActive,
        'promotionalPrice': _promotionalPriceController.text.trim().isNotEmpty
            ? double.tryParse(_promotionalPriceController.text.trim())
            : null,
        'promotionStartDate': _promotionStartDate?.toIso8601String(),
        'promotionEndDate': _promotionEndDate?.toIso8601String(),
        'showCountdown': _showCountdown,
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
      final apiService = ref.read(apiProvider);

      final prepared = await _prepareImageUploadPayload(selected);
      final uploadedUrl = await apiService.uploadImageBytesOrThrow(
        prepared.bytes,
        filename: prepared.filename,
      );
      final resolvedUploadedUrl = uploadedUrl.trim();
      if (resolvedUploadedUrl.isNotEmpty) {
        setState(() {
          _images.add(resolvedUploadedUrl);
        });
      } else {
        if (kIsWeb) {
          throw Exception('web_upload_failed');
        }
        final localSourcePath = selected.path;
        final localPath = await ImageStorageManager.saveImageLocally(
          File(localSourcePath),
        );
        setState(() {
          _images.add(localPath);
          _sessionLocalImages.add(localPath);
        });
      }
    } catch (e) {
      if (e is _ImageCropCancelled) {
        return;
      }
      setState(() {
        _error = _buildImageUploadErrorMessage(e);
      });
    } finally {
      if (mounted) {
        setState(() => _isUploading = false);
      }
    }
  }

  bool get _supportsCropper {
    if (kIsWeb) return true;
    return defaultTargetPlatform == TargetPlatform.android ||
        defaultTargetPlatform == TargetPlatform.iOS;
  }

  bool get _isDesktopPlatform {
    if (kIsWeb) return false;
    return defaultTargetPlatform == TargetPlatform.macOS ||
        defaultTargetPlatform == TargetPlatform.windows ||
        defaultTargetPlatform == TargetPlatform.linux;
  }

  String _buildImageUploadErrorMessage(Object error) {
    final raw = error.toString();
    final lower = raw.toLowerCase();

    if (lower.contains('only png, jpeg, and webp uploads are allowed') ||
        lower.contains('only png, jpeg, and webp')) {
      return 'Only PNG, JPG, or WebP images are supported. Please choose one of these formats.';
    }

    if (lower.contains('heic') || lower.contains('heif')) {
      return 'HEIC/HEIF images are not supported yet. Please convert to PNG, JPG, or WebP and try again.';
    }

    return 'admin.pages.products.edit.errors.imagePickFailed'.tr();
  }

  Future<_PreparedImageUpload> _prepareImageUploadPayload(
    XFile selected,
  ) async {
    if (_isDesktopPlatform) {
      final croppedBytes = await _cropImageDesktop(selected);
      if (croppedBytes == null) {
        throw _ImageCropCancelled();
      }
      return _PreparedImageUpload(
        bytes: croppedBytes,
        filename: _buildCroppedFilename(selected.name),
      );
    }

    if (!_supportsCropper) {
      final originalBytes = await selected.readAsBytes();
      return _PreparedImageUpload(
        bytes: originalBytes,
        filename: _buildUploadFilename(selected.name),
      );
    }

    try {
      final cropped = await _cropImage(selected);
      if (cropped == null) {
        throw _ImageCropCancelled();
      }

      final croppedBytes = await cropped.readAsBytes();
      return _PreparedImageUpload(
        bytes: croppedBytes,
        filename: _buildCroppedFilename(selected.name),
      );
    } on _ImageCropCancelled {
      rethrow;
    } catch (_) {
      // If cropper fails at runtime on a given device/browser,
      // continue with original file so the picker flow still works.
      final originalBytes = await selected.readAsBytes();
      return _PreparedImageUpload(
        bytes: originalBytes,
        filename: _buildUploadFilename(selected.name),
      );
    }
  }

  Future<Uint8List?> _cropImageDesktop(XFile source) async {
    final originalBytes = await source.readAsBytes();
    if (!mounted) return null;

    final cropController = desktop_crop.CropController();
    Uint8List? croppedBytes;
    Object? cropFailure;
    bool isCropping = false;

    await showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return Dialog(
              child: ConstrainedBox(
                constraints: const BoxConstraints(
                  maxWidth: 900,
                  maxHeight: 700,
                ),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(
                        'admin.components.imageCropper.title'.tr(),
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 12),
                      Expanded(
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(10),
                          child: Container(
                            color: Colors.black12,
                            child: desktop_crop.Crop(
                              controller: cropController,
                              image: originalBytes,
                              interactive: true,
                              initialRectBuilder:
                                  desktop_crop
                                      .InitialRectBuilder.withSizeAndRatio(
                                    size: 0.9,
                                  ),
                              onCropped: (result) {
                                if (result is desktop_crop.CropSuccess) {
                                  croppedBytes = result.croppedImage;
                                } else if (result is desktop_crop.CropFailure) {
                                  cropFailure = result.cause;
                                }
                                if (Navigator.of(dialogContext).canPop()) {
                                  Navigator.of(dialogContext).pop();
                                }
                              },
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 14),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          AppButton.secondary(
                            label: 'admin.common.cancel'.tr(),
                            onPressed: () => Navigator.of(dialogContext).pop(),
                          ),
                          const SizedBox(width: 10),
                          AppButton.primary(
                            label: isCropping
                                ? 'admin.common.uploading'.tr()
                                : 'Apply crop',
                            onPressed: isCropping
                                ? null
                                : () {
                                    setDialogState(() => isCropping = true);
                                    cropController.crop();
                                  },
                            loading: isCropping,
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        );
      },
    );

    if (cropFailure != null) {
      throw Exception('Failed to crop image.');
    }

    return croppedBytes;
  }

  String _buildUploadFilename(String originalName) {
    final trimmed = originalName.trim();
    if (trimmed.isEmpty) {
      return 'upload-${DateTime.now().microsecondsSinceEpoch}.jpg';
    }
    return trimmed;
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
          title: 'admin.components.imageCropper.title'.tr(),
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
    AppToasts.show(context, 'admin.common.copied'.tr());
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
                            searchKeywordsController: _searchKeywordsController,
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
                            isPromotionActive: _isPromotionActive,
                            onPromotionActiveChanged: (val) {
                              setState(() => _isPromotionActive = val);
                            },
                            promotionalPriceController:
                                _promotionalPriceController,
                            promotionStartDate: _promotionStartDate,
                            onPromotionStartDateChanged: (val) {
                              setState(() => _promotionStartDate = val);
                            },
                            promotionEndDate: _promotionEndDate,
                            onPromotionEndDateChanged: (val) {
                              setState(() => _promotionEndDate = val);
                            },
                            showCountdown: _showCountdown,
                            onShowCountdownChanged: (val) {
                              setState(() => _showCountdown = val);
                            },
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

class _PreparedImageUpload {
  final Uint8List bytes;
  final String filename;

  const _PreparedImageUpload({required this.bytes, required this.filename});
}

class _ImageCropCancelled implements Exception {}

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

class _SearchKeywordsInput extends StatefulWidget {
  final TextEditingController controller;

  const _SearchKeywordsInput({Key? key, required this.controller})
    : super(key: key);

  @override
  State<_SearchKeywordsInput> createState() => _SearchKeywordsInputState();
}

class _SearchKeywordsInputState extends State<_SearchKeywordsInput> {
  final TextEditingController _inputController = TextEditingController();

  List<String> get _keywords {
    if (widget.controller.text.trim().isEmpty) return [];
    return widget.controller.text
        .split(',')
        .map((e) => e.trim())
        .where((e) => e.isNotEmpty)
        .toList();
  }

  void _addKeyword(String value) {
    final val = value.trim();
    if (val.isNotEmpty) {
      final current = _keywords;
      if (!current.contains(val)) {
        current.add(val);
        widget.controller.text = current.join(',');
        setState(() {});
      }
      _inputController.clear();
    }
  }

  void _removeKeyword(String value) {
    final current = _keywords;
    current.remove(value);
    widget.controller.text = current.join(',');
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final keywords = _keywords;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (keywords.isNotEmpty) ...[
          Wrap(
            spacing: 8.0,
            runSpacing: 8.0,
            children: keywords.map((k) {
              return InputChip(
                label: Text(k, style: const TextStyle(fontSize: 12)),
                onDeleted: () => _removeKeyword(k),
                deleteIcon: const Icon(Icons.close, size: 14),
                materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
              );
            }).toList(),
          ),
          const SizedBox(height: 8),
        ],
        FormInput(
          controller: _inputController,
          label: 'admin.forms.product.searchKeywords.label'.tr(),
          hint: 'admin.forms.product.searchKeywords.placeholder'.tr(),
          onSubmitted: _addKeyword,
        ),
        const SizedBox(height: 4),
        Text(
          'admin.forms.product.searchKeywords.hint'.tr(),
          style: TextStyle(
            fontSize: 12,
            color: Theme.of(
              context,
            ).colorScheme.onSurface.withValues(alpha: 0.6),
          ),
        ),
      ],
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
  final TextEditingController searchKeywordsController;
  final TextEditingController landingDescriptionController;
  final TextEditingController priceController;
  final TextEditingController stockController;
  final TextEditingController lowStockThresholdController;
  final String? selectedCategoryId;
  final ValueChanged<String?> onCategoryChanged;
  final bool isActive;
  final ValueChanged<bool> onActiveChanged;
  final bool isPromotionActive;
  final ValueChanged<bool> onPromotionActiveChanged;
  final TextEditingController promotionalPriceController;
  final DateTime? promotionStartDate;
  final ValueChanged<DateTime?> onPromotionStartDateChanged;
  final DateTime? promotionEndDate;
  final ValueChanged<DateTime?> onPromotionEndDateChanged;
  final bool showCountdown;
  final ValueChanged<bool> onShowCountdownChanged;
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
    required this.searchKeywordsController,
    required this.landingDescriptionController,
    required this.priceController,
    required this.stockController,
    required this.lowStockThresholdController,
    required this.selectedCategoryId,
    required this.onCategoryChanged,
    required this.isActive,
    required this.onActiveChanged,
    required this.isPromotionActive,
    required this.onPromotionActiveChanged,
    required this.promotionalPriceController,
    required this.promotionStartDate,
    required this.onPromotionStartDateChanged,
    required this.promotionEndDate,
    required this.onPromotionEndDateChanged,
    required this.showCountdown,
    required this.onShowCountdownChanged,
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
      length: 6,
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
                Tab(text: 'admin.pages.products.edit.tabs.promotions'.tr()),
                Tab(text: 'admin.pages.products.edit.tabs.bundles'.tr()),
                Tab(text: 'admin.pages.products.edit.tabs.tracking'.tr()),
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
                      searchKeywordsController: searchKeywordsController,
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
                    _PromotionsTabSection(
                      isPromotionActive: isPromotionActive,
                      onPromotionActiveChanged: onPromotionActiveChanged,
                      promotionalPriceController: promotionalPriceController,
                      promotionStartDate: promotionStartDate,
                      onPromotionStartDateChanged: onPromotionStartDateChanged,
                      promotionEndDate: promotionEndDate,
                      onPromotionEndDateChanged: onPromotionEndDateChanged,
                      showCountdown: showCountdown,
                      onShowCountdownChanged: onShowCountdownChanged,
                      hasVariantOptions: (product?.options.isNotEmpty ?? false),
                    ),
                    const _PlaceholderTabSection(title: 'Bundles'),
                    const _PlaceholderTabSection(title: 'Tracking'),
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
  final TextEditingController searchKeywordsController;
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
    required this.searchKeywordsController,
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
                        'app.admin_forms_product_isactive_l'.tr().tr(),
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
            label: 'app.admin_forms_product_minidescri2'.tr().tr(),
            controller: miniDescriptionController,
            hint: 'admin.forms.product.miniDescription.placeholder'.tr(),
            maxLines: 3,
          ),
          const SizedBox(height: 4),
          Text(
            'app.admin_forms_product_minidescri'.tr().tr(),
            style: TextStyle(
              fontSize: 12,
              color: Theme.of(
                context,
              ).colorScheme.onSurface.withValues(alpha: 0.6),
            ),
          ),
          const SizedBox(height: 16),
          _SearchKeywordsInput(
            key: const Key('product-form-search-keywords'),
            controller: searchKeywordsController,
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
              'app.admin_forms_product_stock_hint'.tr().tr(),
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
            label: 'app.admin_forms_product_lowstockth2'.tr().tr(),
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
            'app.admin_forms_product_lowstockth'.tr().tr(),
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
                child: Text('app.admin_common_noneselected'.tr().tr()),
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
          'app.admin_pages_products_edit_gene'.tr().tr(),
          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: 4),
        Text(
          'app.admin_pages_products_edit_gene2'.tr().tr(),
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
            label: 'app.admin_pages_products_edit_gene3'.tr().tr(),
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
                        'app.admin_pages_products_edit_gene3'.tr().tr(),
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
            'app.admin_pages_products_edit_desc'.tr().tr(),
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

class _VariantsTabSection extends ConsumerStatefulWidget {
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
  ConsumerState<_VariantsTabSection> createState() =>
      _VariantsTabSectionState();
}

class _VariantsTabSectionState extends ConsumerState<_VariantsTabSection> {
  final List<_VariantEditorRow> _rows = <_VariantEditorRow>[];
  final List<_StockAllocationRow> _stockAllocationRows =
      <_StockAllocationRow>[];
  bool _showArchivedVariants = false;
  bool _allocatingStock = false;

  final Set<String> _savingInfoIds = <String>{};
  final Set<String> _savingInventoryIds = <String>{};
  final Set<String> _savingStockIds = <String>{};
  final Set<String> _lockingSkuIds = <String>{};
  final Set<String> _suggestingSkuIds = <String>{};
  final Set<String> _savingImagesIds = <String>{};

  @override
  void initState() {
    super.initState();
    _syncRowsFromProduct();
  }

  @override
  void didUpdateWidget(covariant _VariantsTabSection oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.product != widget.product) {
      _syncRowsFromProduct();
    }
  }

  @override
  void dispose() {
    for (final row in _rows) {
      row.dispose();
    }
    for (final row in _stockAllocationRows) {
      row.dispose();
    }
    super.dispose();
  }

  void _syncRowsFromProduct() {
    for (final row in _rows) {
      row.dispose();
    }
    _rows
      ..clear()
      ..addAll(
        (widget.product?.variants ?? const <ProductVariant>[]).map(
          _VariantEditorRow.fromVariant,
        ),
      );
    _syncStockAllocationRows();
    if (mounted) setState(() {});
  }

  void _syncStockAllocationRows() {
    for (final row in _stockAllocationRows) {
      row.dispose();
    }
    _stockAllocationRows.clear();

    final product = widget.product;
    if (product == null ||
        !product.stockAllocationRequired ||
        product.stockAllocationSourceBalance == null) {
      return;
    }

    final eligible = product.variants
        .where((variant) => variant.optionValues.isNotEmpty && variant.isActive)
        .toList(growable: false);

    _stockAllocationRows.addAll(
      eligible.map(
        (variant) => _StockAllocationRow(
          variantId: variant.id,
          title: variant.title,
          stockController: TextEditingController(
            text: 'admin.forms.product.stock.placeholder'.tr(),
          ),
          reservedController: TextEditingController(
            text: 'admin.forms.product.stock.placeholder'.tr(),
          ),
          safetyController: TextEditingController(
            text: 'admin.forms.product.stock.placeholder'.tr(),
          ),
        ),
      ),
    );
  }

  List<_VariantEditorRow> get _visibleRows {
    if (_showArchivedVariants) return _rows;
    return _rows.where((row) => row.isActive).toList(growable: false);
  }

  int get _archivedCount => _rows.where((row) => !row.isActive).length;

  int get _allocationStockTotal {
    return _stockAllocationRows.fold(
      0,
      (sum, row) => sum + _parseInt(row.stockController.text),
    );
  }

  int get _allocationReservedTotal {
    return _stockAllocationRows.fold(
      0,
      (sum, row) => sum + _parseInt(row.reservedController.text),
    );
  }

  int get _allocationSafetyTotal {
    return _stockAllocationRows.fold(
      0,
      (sum, row) => sum + _parseInt(row.safetyController.text),
    );
  }

  bool get _allocationBalanced {
    final source = widget.product?.stockAllocationSourceBalance;
    if (source == null) return false;
    return _allocationStockTotal == source.stock &&
        _allocationReservedTotal == source.reserved &&
        _allocationSafetyTotal == source.safetyStock;
  }

  bool _supportsVariantPromotion(_VariantEditorRow row) {
    return row.optionValues.isNotEmpty;
  }

  String _extractErrorMessage(Object error, {required String fallbackKey}) {
    final fallback = fallbackKey.tr();
    if (error is DioException) {
      final data = error.response?.data;
      if (data is Map) {
        final message =
            data['statusMessage'] ?? data['error'] ?? data['message'];
        if (message is String && message.trim().isNotEmpty) {
          return message.trim();
        }
      }
      final text = error.message?.trim();
      if (text != null && text.isNotEmpty) return text;
    }
    final raw = error.toString().trim();
    if (raw.isNotEmpty) return raw;
    return fallback;
  }

  double _parseDouble(String value, {double fallback = 0}) {
    return double.tryParse(value.trim()) ?? fallback;
  }

  int _parseInt(String value, {int fallback = 0}) {
    return int.tryParse(value.trim()) ?? fallback;
  }

  double? _parseNullableDouble(String value) {
    final trimmed = value.trim();
    if (trimmed.isEmpty) return null;
    return double.tryParse(trimmed);
  }

  String? _toIsoOrNull(String value) {
    final trimmed = value.trim();
    if (trimmed.isEmpty) return null;
    final dt = DateTime.tryParse(trimmed);
    if (dt == null) return null;
    return dt.toIso8601String();
  }

  int _availableOf(_VariantEditorRow row) {
    if (row.availableStock != null) {
      return row.availableStock!;
    }
    return (row.stock - row.reserved - row.safetyStock).clamp(0, 1 << 30);
  }

  Future<void> _updateVariantInfo(_VariantEditorRow row) async {
    final previous = row.snapshot();
    _savingInfoIds.add(row.id);
    setState(() {});
    try {
      final payload = <String, dynamic>{
        'price': _parseDouble(row.priceController.text),
        'cost': _parseDouble(row.costController.text),
        'sku': row.skuController.text.trim(),
        'barcode': row.barcodeController.text.trim(),
        'isActive': row.isActive,
        'promotionalPrice': _supportsVariantPromotion(row)
            ? _parseNullableDouble(row.promotionalPriceController.text)
            : null,
        'isPromotionActive': _supportsVariantPromotion(row)
            ? row.isPromotionActive
            : false,
        'promotionStartDate': _supportsVariantPromotion(row)
            ? _toIsoOrNull(row.promotionStartController.text)
            : null,
        'promotionEndDate': _supportsVariantPromotion(row)
            ? _toIsoOrNull(row.promotionEndController.text)
            : null,
        'showCountdown': _supportsVariantPromotion(row)
            ? row.showCountdown
            : false,
      };
      await ref.read(productsProvider.notifier).updateVariant(row.id, payload);
      widget.onVariantUpdated();
    } catch (error) {
      row.restore(previous);
      if (mounted) {
        AppToasts.show(
          context,
          _extractErrorMessage(
            error,
            fallbackKey: 'admin.variantsTable.errors.updateVariantFailed',
          ),
        );
      }
    } finally {
      _savingInfoIds.remove(row.id);
      if (mounted) setState(() {});
    }
  }

  Future<void> _updateVariantInventory(
    _VariantEditorRow row,
    Map<String, dynamic> patch,
  ) async {
    final previous = row.snapshot();
    _savingInventoryIds.add(row.id);
    setState(() {});
    try {
      await ref
          .read(productsProvider.notifier)
          .updateVariantInventory(row.id, patch);
      widget.onVariantUpdated();
    } catch (error) {
      row.restore(previous);
      if (mounted) {
        AppToasts.show(
          context,
          _extractErrorMessage(
            error,
            fallbackKey: 'admin.variantsTable.errors.updateInventoryFailed',
          ),
        );
      }
    } finally {
      _savingInventoryIds.remove(row.id);
      if (mounted) setState(() {});
    }
  }

  Future<void> _setVariantStock(_VariantEditorRow row) async {
    final previous = row.snapshot();
    final nextStock = _parseInt(row.stockController.text, fallback: row.stock);
    if (nextStock < 0) {
      row.restore(previous);
      if (mounted) {
        AppToasts.show(context, 'app.admin_variantstable_errors_upd'.tr().tr());
      }
      return;
    }

    _savingStockIds.add(row.id);
    setState(() {});
    try {
      await ref
          .read(apiProvider)
          .client
          .post(
            '/admin/inventory/variants/${row.id}/stock/set',
            data: {
              'stock': nextStock,
              'reason': 'admin_product_variants_flutter',
            },
          );
      widget.onVariantUpdated();
    } catch (error) {
      row.restore(previous);
      if (mounted) {
        AppToasts.show(
          context,
          _extractErrorMessage(
            error,
            fallbackKey: 'admin.variantsTable.errors.updateStockFailed',
          ),
        );
      }
    } finally {
      _savingStockIds.remove(row.id);
      if (mounted) setState(() {});
    }
  }

  Future<void> _lockSku(_VariantEditorRow row) async {
    _lockingSkuIds.add(row.id);
    setState(() {});
    try {
      await ref.read(productsProvider.notifier).lockVariantSku(row.id);
      widget.onVariantUpdated();
    } catch (error) {
      if (mounted) {
        AppToasts.show(
          context,
          _extractErrorMessage(
            error,
            fallbackKey: 'admin.variantsTable.errors.lockSkuFailed',
          ),
        );
      }
    } finally {
      _lockingSkuIds.remove(row.id);
      if (mounted) setState(() {});
    }
  }

  Future<void> _suggestSku(_VariantEditorRow row) async {
    _suggestingSkuIds.add(row.id);
    setState(() {});
    try {
      final sku = await ref
          .read(productsProvider.notifier)
          .suggestVariantSku(row.id);
      if (sku.trim().isEmpty) {
        throw Exception(
          'admin.variantsTable.errors.suggestSkuUnavailable'.tr(),
        );
      }
      row.skuController.text = sku.trim();
      await _updateVariantInfo(row);
    } catch (error) {
      if (mounted) {
        AppToasts.show(
          context,
          _extractErrorMessage(
            error,
            fallbackKey: 'admin.variantsTable.errors.suggestSkuFailed',
          ),
        );
      }
    } finally {
      _suggestingSkuIds.remove(row.id);
      if (mounted) setState(() {});
    }
  }

  List<String> _availableVariantImages() {
    final product = widget.product;
    if (product == null) return const <String>[];
    final fromProductImages = product.productImages
        .map((img) => img.url.trim())
        .where((url) => url.isNotEmpty);
    final fromLegacy = product.images
        .map((url) => url.trim())
        .where((url) => url.isNotEmpty);

    final seen = <String>{};
    final merged = <String>[];
    for (final url in [...fromProductImages, ...fromLegacy]) {
      if (seen.add(url)) merged.add(url);
    }
    return merged;
  }

  Future<void> _openImageEditor(_VariantEditorRow row) async {
    final availableImages = _availableVariantImages();
    final selected = row.images.toSet();

    await showDialog<void>(
      context: context,
      builder: (dialogContext) {
        return StatefulBuilder(
          builder: (dialogBodyContext, setDialogState) {
            final saving = _savingImagesIds.contains(row.id);
            return Dialog(
              child: ConstrainedBox(
                constraints: const BoxConstraints(
                  maxWidth: 820,
                  maxHeight: 640,
                ),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'app.admin_variantstable_imagepicke'.tr().tr(),
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'app.admin_variantstable_imagepicke2'.tr().tr(),
                        style: TextStyle(
                          fontSize: 12,
                          color: Theme.of(
                            dialogBodyContext,
                          ).colorScheme.onSurface.withValues(alpha: 0.6),
                        ),
                      ),
                      const SizedBox(height: 14),
                      Expanded(
                        child: availableImages.isEmpty
                            ? Center(
                                child: Text(
                                  'app.admin_variantstable_imagepicke3'
                                      .tr()
                                      .tr(),
                                  style: const TextStyle(
                                    color: Color(0xFF64748B),
                                  ),
                                  textAlign: TextAlign.center,
                                ),
                              )
                            : GridView.builder(
                                gridDelegate:
                                    const SliverGridDelegateWithFixedCrossAxisCount(
                                      crossAxisCount: 3,
                                      crossAxisSpacing: 10,
                                      mainAxisSpacing: 10,
                                      childAspectRatio: 0.9,
                                    ),
                                itemCount: availableImages.length,
                                itemBuilder: (gridContext, index) {
                                  final url = availableImages[index];
                                  final checked = selected.contains(url);
                                  return InkWell(
                                    onTap: () {
                                      setDialogState(() {
                                        if (checked) {
                                          selected.remove(url);
                                        } else {
                                          selected.add(url);
                                        }
                                      });
                                    },
                                    child: Container(
                                      decoration: BoxDecoration(
                                        borderRadius: BorderRadius.circular(10),
                                        border: Border.all(
                                          color: checked
                                              ? const Color(0xFF65A30D)
                                              : Theme.of(gridContext)
                                                    .colorScheme
                                                    .outline
                                                    .withValues(alpha: 0.4),
                                        ),
                                      ),
                                      padding: const EdgeInsets.all(8),
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Expanded(
                                            child: ClipRRect(
                                              borderRadius:
                                                  BorderRadius.circular(8),
                                              child: TenantImageWidget(
                                                imagePath: url,
                                                fit: BoxFit.cover,
                                              ),
                                            ),
                                          ),
                                          const SizedBox(height: 8),
                                          Row(
                                            children: [
                                              Expanded(
                                                child: Text(
                                                  'app.admin_variantstable_imagepicke4'
                                                      .tr()
                                                      .tr(
                                                        namedArgs: {
                                                          'index': (index + 1)
                                                              .toString(),
                                                        },
                                                      ),
                                                  style: const TextStyle(
                                                    fontSize: 11,
                                                  ),
                                                  overflow:
                                                      TextOverflow.ellipsis,
                                                ),
                                              ),
                                              Checkbox(
                                                value: checked,
                                                onChanged: (_) {
                                                  setDialogState(() {
                                                    if (checked) {
                                                      selected.remove(url);
                                                    } else {
                                                      selected.add(url);
                                                    }
                                                  });
                                                },
                                              ),
                                            ],
                                          ),
                                        ],
                                      ),
                                    ),
                                  );
                                },
                              ),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          AppButton.secondary(
                            label: 'admin.common.cancel'.tr(),
                            onPressed: saving
                                ? null
                                : () => Navigator.of(dialogContext).pop(),
                          ),
                          const SizedBox(width: 10),
                          AppButton.primary(
                            label: saving
                                ? 'admin.common.saving'.tr()
                                : 'admin.variantsTable.imagePicker.save'.tr(),
                            onPressed: saving
                                ? null
                                : () async {
                                    _savingImagesIds.add(row.id);
                                    setDialogState(() {});
                                    try {
                                      await ref
                                          .read(productsProvider.notifier)
                                          .updateVariantImages(
                                            row.id,
                                            selected.toList(growable: false),
                                          );
                                      if (dialogContext.mounted) {
                                        Navigator.of(dialogContext).pop();
                                      }
                                      widget.onVariantUpdated();
                                    } catch (error) {
                                      if (mounted) {
                                        AppToasts.show(
                                          context,
                                          _extractErrorMessage(
                                            error,
                                            fallbackKey:
                                                'admin.variantsTable.errors.saveImagesFailed',
                                          ),
                                        );
                                      }
                                    } finally {
                                      _savingImagesIds.remove(row.id);
                                      if (mounted) setState(() {});
                                    }
                                  },
                            loading: saving,
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }

  Future<void> _openMovements(_VariantEditorRow row) async {
    final List<_VariantMovementRecord> movements = <_VariantMovementRecord>[];
    var loadError = '';
    try {
      final response = await ref
          .read(apiProvider)
          .client
          .get('/admin/inventory/variants/${row.id}/movements');
      final data = response.data;
      if (data is List) {
        for (final item in data) {
          if (item is Map) {
            movements.add(
              _VariantMovementRecord.fromJson(Map<String, dynamic>.from(item)),
            );
          }
        }
      }
    } catch (error) {
      loadError = _extractErrorMessage(
        error,
        fallbackKey: 'admin.variantsTable.movements.loading',
      );
    }

    if (!mounted) return;
    await showDialog<void>(
      context: context,
      builder: (dialogContext) {
        return Dialog(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 980, maxHeight: 680),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '${'admin.variantsTable.movements.title'.tr()} - ${row.title}',
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'app.admin_variantstable_movements'.tr().tr(),
                    style: TextStyle(
                      fontSize: 12,
                      color: Theme.of(
                        context,
                      ).colorScheme.onSurface.withValues(alpha: 0.6),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Expanded(
                    child: loadError.isNotEmpty
                        ? Center(child: Text(loadError))
                        : movements.isEmpty
                        ? Center(
                            child: Text(
                              'app.admin_variantstable_movements2'.tr().tr(),
                              style: const TextStyle(color: Color(0xFF64748B)),
                            ),
                          )
                        : SingleChildScrollView(
                            scrollDirection: Axis.horizontal,
                            child: ConstrainedBox(
                              constraints: const BoxConstraints(minWidth: 900),
                              child: Column(
                                children: [
                                  _movementHeaderRow(context),
                                  const Divider(height: 1),
                                  Expanded(
                                    child: ListView.separated(
                                      itemCount: movements.length,
                                      separatorBuilder: (_, _) =>
                                          const Divider(height: 1),
                                      itemBuilder: (context, index) =>
                                          _movementDataRow(
                                            context,
                                            movements[index],
                                          ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                  ),
                  const SizedBox(height: 12),
                  Align(
                    alignment: Alignment.centerRight,
                    child: AppButton.secondary(
                      label: 'admin.common.close'.tr(),
                      onPressed: () => Navigator.of(dialogContext).pop(),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Future<void> _allocateStock() async {
    if (!_allocationBalanced || widget.productId == null) return;
    _allocatingStock = true;
    setState(() {});
    try {
      await ref
          .read(apiProvider)
          .client
          .post(
            '/admin/products/${widget.productId}/variants/allocate-stock',
            data: {
              'sourceVariantId': widget.product?.stockAllocationSourceVariantId,
              'allocations': _stockAllocationRows
                  .map(
                    (row) => {
                      'variantId': row.variantId,
                      'stock': _parseInt(row.stockController.text),
                      'reserved': _parseInt(row.reservedController.text),
                      'safetyStock': _parseInt(row.safetyController.text),
                    },
                  )
                  .toList(growable: false),
            },
          );
      if (mounted) {
        AppToasts.show(context, 'app.admin_pages_products_edit_vari'.tr().tr());
      }
      widget.onVariantUpdated();
    } catch (error) {
      if (mounted) {
        AppToasts.show(
          context,
          _extractErrorMessage(
            error,
            fallbackKey:
                'admin.pages.products.edit.variantsTab.allocationUnbalanced',
          ),
        );
      }
    } finally {
      _allocatingStock = false;
      if (mounted) setState(() {});
    }
  }

  Widget _movementHeaderRow(BuildContext context) {
    TextStyle style = const TextStyle(
      fontWeight: FontWeight.w600,
      fontSize: 12,
    );
    return Row(
      children: [
        _headerCell(
          'admin.variantsTable.movements.columns.date'.tr(),
          170,
          style,
        ),
        _headerCell(
          'admin.variantsTable.movements.columns.type'.tr(),
          160,
          style,
        ),
        _headerCell(
          'admin.variantsTable.movements.columns.deltaStock'.tr(),
          100,
          style,
        ),
        _headerCell(
          'admin.variantsTable.movements.columns.deltaReserved'.tr(),
          110,
          style,
        ),
        _headerCell(
          'admin.variantsTable.movements.columns.deltaSafety'.tr(),
          100,
          style,
        ),
        _headerCell(
          'admin.variantsTable.movements.columns.after'.tr(),
          220,
          style,
        ),
        _headerCell(
          'admin.variantsTable.movements.columns.by'.tr(),
          180,
          style,
        ),
      ],
    );
  }

  Widget _movementDataRow(BuildContext context, _VariantMovementRecord row) {
    final textStyle = const TextStyle(fontSize: 12);
    String afterText() {
      final s = row.stockAfter?.toString() ?? '—';
      final r = row.reservedAfter?.toString() ?? '—';
      final ss = row.safetyStockAfter?.toString() ?? '—';
      return 'S=$s · R=$r · SS=$ss';
    }

    return Row(
      children: [
        _dataCell(row.createdAt ?? '', 170, textStyle),
        _dataCell(row.type, 160, textStyle),
        _dataCell('${row.delta}', 100, textStyle),
        _dataCell('${row.reservedDelta}', 110, textStyle),
        _dataCell('${row.safetyStockDelta}', 100, textStyle),
        _dataCell(afterText(), 220, textStyle),
        _dataCell(
          row.createdByEmail ?? 'admin.variantsTable.movements.system'.tr(),
          180,
          textStyle,
        ),
      ],
    );
  }

  Widget _headerCell(String text, double width, TextStyle style) {
    return SizedBox(
      width: width,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
        child: Text(text, style: style),
      ),
    );
  }

  Widget _dataCell(String text, double width, TextStyle style) {
    return SizedBox(
      width: width,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
        child: Text(text, style: style, overflow: TextOverflow.ellipsis),
      ),
    );
  }

  InputDecoration _inputDecoration() {
    return const InputDecoration(
      isDense: true,
      contentPadding: EdgeInsets.symmetric(horizontal: 8, vertical: 8),
      border: OutlineInputBorder(),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.isEditing) {
      return Center(
        child: Text(
          'app.admin_pages_products_edit_vari2'.tr().tr(),
          style: const TextStyle(color: Color(0xFF64748B)),
        ),
      );
    }

    if (widget.product == null || widget.productId == null) {
      return const Center(child: CircularProgressIndicator());
    }

    final visibleRows = _visibleRows;
    final sourceBalance = widget.product!.stockAllocationSourceBalance;
    final showAllocationBanner =
        widget.product!.stockAllocationRequired &&
        sourceBalance != null &&
        _stockAllocationRows.isNotEmpty;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ProductOptionsList(
            productId: widget.productId!,
            options: widget.product!.options,
          ),
          const SizedBox(height: 16),
          Text(
            'app.admin_pages_products_edit_vari3'.tr().tr(),
            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 6),
          Text(
            'app.admin_pages_products_edit_vari4'.tr().tr(),
            style: TextStyle(
              color: Theme.of(
                context,
              ).colorScheme.onSurface.withValues(alpha: 0.65),
              fontSize: 12,
            ),
          ),
          if (showAllocationBanner) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: const Color(0xFFFACC15).withValues(alpha: 0.55),
                ),
                color: const Color(0xFFFEFCE8),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Padding(
                        padding: EdgeInsets.only(top: 2),
                        child: Icon(
                          LucideIcons.alertTriangle,
                          size: 16,
                          color: Color(0xFFCA8A04),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'app.admin_pages_products_edit_vari5'.tr().tr(),
                              style: const TextStyle(
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              'app.admin_pages_products_edit_vari6'.tr().tr(),
                              style: const TextStyle(
                                fontSize: 12,
                                color: Color(0xFF854D0E),
                              ),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              '${widget.product!.stockAllocationSourceVariantTitle ?? 'admin.variantsTable.defaultVariant'.tr()}: '
                              '${sourceBalance.stock} ${'admin.pages.products.edit.variantsTab.onHandShort'.tr()}, '
                              '${sourceBalance.reserved} ${'admin.pages.products.edit.variantsTab.reservedShort'.tr()}, '
                              '${sourceBalance.safetyStock} ${'admin.pages.products.edit.variantsTab.safetyShort'.tr()}',
                              style: const TextStyle(
                                fontSize: 12,
                                color: Color(0xFF854D0E),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      AppButton.primary(
                        label: _allocatingStock
                            ? 'admin.common.saving'.tr()
                            : 'admin.pages.products.edit.variantsTab.allocateAction'
                                  .tr(),
                        onPressed: _allocatingStock || !_allocationBalanced
                            ? null
                            : _allocateStock,
                        loading: _allocatingStock,
                        size: AppButtonSize.sm,
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(minWidth: 620),
                      child: Column(
                        children: [
                          Row(
                            children: [
                              _headerCell(
                                'admin.variantsTable.columns.variant'.tr(),
                                230,
                                const TextStyle(
                                  fontWeight: FontWeight.w600,
                                  fontSize: 12,
                                ),
                              ),
                              _headerCell(
                                'admin.variantsTable.columns.onHand'.tr(),
                                110,
                                const TextStyle(
                                  fontWeight: FontWeight.w600,
                                  fontSize: 12,
                                ),
                              ),
                              _headerCell(
                                'admin.variantsTable.columns.reserved'.tr(),
                                110,
                                const TextStyle(
                                  fontWeight: FontWeight.w600,
                                  fontSize: 12,
                                ),
                              ),
                              _headerCell(
                                'admin.variantsTable.columns.safety'.tr(),
                                110,
                                const TextStyle(
                                  fontWeight: FontWeight.w600,
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                          ..._stockAllocationRows.map(
                            (row) => Padding(
                              padding: const EdgeInsets.only(bottom: 8),
                              child: Row(
                                children: [
                                  _dataCell(
                                    row.title,
                                    230,
                                    const TextStyle(fontSize: 12),
                                  ),
                                  SizedBox(
                                    width: 110,
                                    child: Padding(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 8,
                                      ),
                                      child: TextField(
                                        controller: row.stockController,
                                        keyboardType: TextInputType.number,
                                        decoration: _inputDecoration(),
                                        onChanged: (_) => setState(() {}),
                                      ),
                                    ),
                                  ),
                                  SizedBox(
                                    width: 110,
                                    child: Padding(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 8,
                                      ),
                                      child: TextField(
                                        controller: row.reservedController,
                                        keyboardType: TextInputType.number,
                                        decoration: _inputDecoration(),
                                        onChanged: (_) => setState(() {}),
                                      ),
                                    ),
                                  ),
                                  SizedBox(
                                    width: 110,
                                    child: Padding(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 8,
                                      ),
                                      child: TextField(
                                        controller: row.safetyController,
                                        keyboardType: TextInputType.number,
                                        decoration: _inputDecoration(),
                                        onChanged: (_) => setState(() {}),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          Row(
                            children: [
                              _dataCell(
                                '${'admin.pages.products.edit.variantsTab.totalOnHand'.tr()}: '
                                '$_allocationStockTotal/${sourceBalance.stock}',
                                230,
                                const TextStyle(fontSize: 11),
                              ),
                              _dataCell(
                                '${'admin.pages.products.edit.variantsTab.totalReserved'.tr()}: '
                                '$_allocationReservedTotal/${sourceBalance.reserved}',
                                220,
                                const TextStyle(fontSize: 11),
                              ),
                              _dataCell(
                                '${'admin.pages.products.edit.variantsTab.totalSafety'.tr()}: '
                                '$_allocationSafetyTotal/${sourceBalance.safetyStock}',
                                220,
                                const TextStyle(fontSize: 11),
                              ),
                            ],
                          ),
                          Align(
                            alignment: Alignment.centerLeft,
                            child: Text(
                              _allocationBalanced
                                  ? 'admin.pages.products.edit.variantsTab.allocationBalanced'
                                        .tr()
                                  : 'admin.pages.products.edit.variantsTab.allocationUnbalanced'
                                        .tr(),
                              style: TextStyle(
                                fontSize: 11,
                                color: _allocationBalanced
                                    ? const Color(0xFF059669)
                                    : const Color(0xFFDC2626),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 12),
          Row(
            children: [
              Checkbox(
                value: _showArchivedVariants,
                onChanged: (value) {
                  setState(() => _showArchivedVariants = value == true);
                },
              ),
              Text('app.admin_pages_products_edit_vari7'.tr().tr()),
              const SizedBox(width: 12),
              Text(
                'app.admin_pages_products_edit_vari8'.tr().tr(
                  namedArgs: {'count': _archivedCount.toString()},
                ),
                style: TextStyle(
                  fontSize: 12,
                  color: Theme.of(
                    context,
                  ).colorScheme.onSurface.withValues(alpha: 0.6),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          if (visibleRows.isEmpty)
            Text(
              'app.admin_pages_products_edit_vari9'.tr().tr(),
              style: const TextStyle(color: Color(0xFF64748B)),
            )
          else
            Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: Theme.of(
                    context,
                  ).colorScheme.outline.withValues(alpha: 0.35),
                ),
              ),
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: ConstrainedBox(
                  constraints: const BoxConstraints(minWidth: 1880),
                  child: Column(
                    children: [
                      Container(
                        color: Theme.of(
                          context,
                        ).colorScheme.surfaceContainerHighest,
                        child: Row(
                          children: [
                            _headerCell(
                              'admin.variantsTable.columns.variant'.tr(),
                              180,
                              const TextStyle(
                                fontWeight: FontWeight.w600,
                                fontSize: 12,
                              ),
                            ),
                            _headerCell(
                              'admin.variantsTable.columns.price'.tr(),
                              92,
                              const TextStyle(
                                fontWeight: FontWeight.w600,
                                fontSize: 12,
                              ),
                            ),
                            _headerCell(
                              'admin.variantsTable.columns.cost'.tr(),
                              92,
                              const TextStyle(
                                fontWeight: FontWeight.w600,
                                fontSize: 12,
                              ),
                            ),
                            _headerCell(
                              'admin.variantsTable.columns.promotion'.tr(),
                              280,
                              const TextStyle(
                                fontWeight: FontWeight.w600,
                                fontSize: 12,
                              ),
                            ),
                            _headerCell(
                              'admin.variantsTable.columns.track'.tr(),
                              70,
                              const TextStyle(
                                fontWeight: FontWeight.w600,
                                fontSize: 12,
                              ),
                            ),
                            _headerCell(
                              'admin.variantsTable.columns.onHand'.tr(),
                              92,
                              const TextStyle(
                                fontWeight: FontWeight.w600,
                                fontSize: 12,
                              ),
                            ),
                            _headerCell(
                              'admin.variantsTable.columns.reserved'.tr(),
                              88,
                              const TextStyle(
                                fontWeight: FontWeight.w600,
                                fontSize: 12,
                              ),
                            ),
                            _headerCell(
                              'admin.variantsTable.columns.safety'.tr(),
                              92,
                              const TextStyle(
                                fontWeight: FontWeight.w600,
                                fontSize: 12,
                              ),
                            ),
                            _headerCell(
                              'admin.variantsTable.columns.available'.tr(),
                              90,
                              const TextStyle(
                                fontWeight: FontWeight.w600,
                                fontSize: 12,
                              ),
                            ),
                            _headerCell(
                              'admin.variantsTable.columns.sku'.tr(),
                              240,
                              const TextStyle(
                                fontWeight: FontWeight.w600,
                                fontSize: 12,
                              ),
                            ),
                            _headerCell(
                              'admin.variantsTable.columns.barcode'.tr(),
                              150,
                              const TextStyle(
                                fontWeight: FontWeight.w600,
                                fontSize: 12,
                              ),
                            ),
                            _headerCell(
                              'admin.variantsTable.columns.active'.tr(),
                              70,
                              const TextStyle(
                                fontWeight: FontWeight.w600,
                                fontSize: 12,
                              ),
                            ),
                            _headerCell(
                              'admin.variantsTable.columns.images'.tr(),
                              120,
                              const TextStyle(
                                fontWeight: FontWeight.w600,
                                fontSize: 12,
                              ),
                            ),
                            _headerCell(
                              'admin.common.actions'.tr(),
                              110,
                              const TextStyle(
                                fontWeight: FontWeight.w600,
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),
                      ),
                      ...visibleRows.map((row) {
                        final savingInfo = _savingInfoIds.contains(row.id);
                        final savingInventory = _savingInventoryIds.contains(
                          row.id,
                        );
                        final savingStock = _savingStockIds.contains(row.id);
                        final lockingSku = _lockingSkuIds.contains(row.id);
                        final suggestingSku = _suggestingSkuIds.contains(
                          row.id,
                        );
                        final supportPromo = _supportsVariantPromotion(row);

                        return Container(
                          decoration: BoxDecoration(
                            border: Border(
                              top: BorderSide(
                                color: Theme.of(
                                  context,
                                ).colorScheme.outline.withValues(alpha: 0.2),
                              ),
                            ),
                          ),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              SizedBox(
                                width: 180,
                                child: Padding(
                                  padding: const EdgeInsets.all(8),
                                  child: Text(
                                    row.title,
                                    style: const TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ),
                              ),
                              SizedBox(
                                width: 92,
                                child: Padding(
                                  padding: const EdgeInsets.all(6),
                                  child: TextField(
                                    controller: row.priceController,
                                    enabled: !savingInfo,
                                    decoration: _inputDecoration(),
                                    keyboardType:
                                        const TextInputType.numberWithOptions(
                                          decimal: true,
                                        ),
                                    onSubmitted: (_) => _updateVariantInfo(row),
                                  ),
                                ),
                              ),
                              SizedBox(
                                width: 92,
                                child: Padding(
                                  padding: const EdgeInsets.all(6),
                                  child: TextField(
                                    controller: row.costController,
                                    enabled: !savingInfo,
                                    decoration: _inputDecoration(),
                                    keyboardType:
                                        const TextInputType.numberWithOptions(
                                          decimal: true,
                                        ),
                                    onSubmitted: (_) => _updateVariantInfo(row),
                                  ),
                                ),
                              ),
                              SizedBox(
                                width: 280,
                                child: Padding(
                                  padding: const EdgeInsets.all(6),
                                  child: supportPromo
                                      ? Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            Row(
                                              children: [
                                                Checkbox(
                                                  value: row.isPromotionActive,
                                                  onChanged: savingInfo
                                                      ? null
                                                      : (value) {
                                                          setState(() {
                                                            row.isPromotionActive =
                                                                value == true;
                                                          });
                                                          _updateVariantInfo(
                                                            row,
                                                          );
                                                        },
                                                ),
                                                Expanded(
                                                  child: Text(
                                                    'app.admin_forms_product_ispromotio'
                                                        .tr()
                                                        .tr(),
                                                    style: const TextStyle(
                                                      fontSize: 11,
                                                    ),
                                                  ),
                                                ),
                                              ],
                                            ),
                                            if (row.isPromotionActive) ...[
                                              TextField(
                                                controller: row
                                                    .promotionalPriceController,
                                                enabled: !savingInfo,
                                                decoration: _inputDecoration()
                                                    .copyWith(
                                                      hintText:
                                                          'app.admin_forms_product_promotiona'
                                                              .tr()
                                                              .tr(),
                                                    ),
                                                keyboardType:
                                                    const TextInputType.numberWithOptions(
                                                      decimal: true,
                                                    ),
                                                onSubmitted: (_) =>
                                                    _updateVariantInfo(row),
                                              ),
                                              const SizedBox(height: 6),
                                              TextField(
                                                controller: row
                                                    .promotionStartController,
                                                enabled: !savingInfo,
                                                decoration: _inputDecoration()
                                                    .copyWith(
                                                      hintText:
                                                          'app.yyyy_mm_ddthh_mm'
                                                              .tr(),
                                                    ),
                                                onSubmitted: (_) =>
                                                    _updateVariantInfo(row),
                                              ),
                                              const SizedBox(height: 6),
                                              TextField(
                                                controller:
                                                    row.promotionEndController,
                                                enabled: !savingInfo,
                                                decoration: _inputDecoration()
                                                    .copyWith(
                                                      hintText:
                                                          'app.yyyy_mm_ddthh_mm'
                                                              .tr(),
                                                    ),
                                                onSubmitted: (_) =>
                                                    _updateVariantInfo(row),
                                              ),
                                              Row(
                                                children: [
                                                  Checkbox(
                                                    value: row.showCountdown,
                                                    onChanged: savingInfo
                                                        ? null
                                                        : (value) {
                                                            setState(() {
                                                              row.showCountdown =
                                                                  value == true;
                                                            });
                                                            _updateVariantInfo(
                                                              row,
                                                            );
                                                          },
                                                  ),
                                                  Expanded(
                                                    child: Text(
                                                      'app.admin_forms_product_showcountd'
                                                          .tr()
                                                          .tr(),
                                                      style: const TextStyle(
                                                        fontSize: 11,
                                                      ),
                                                    ),
                                                  ),
                                                ],
                                              ),
                                            ],
                                          ],
                                        )
                                      : Text(
                                          'app.admin_variantstable_promotions'
                                              .tr()
                                              .tr(),
                                          style: const TextStyle(
                                            fontSize: 11,
                                            color: Color(0xFF64748B),
                                          ),
                                        ),
                                ),
                              ),
                              SizedBox(
                                width: 70,
                                child: Center(
                                  child: Checkbox(
                                    value: row.trackInventory,
                                    onChanged: savingInventory
                                        ? null
                                        : (value) {
                                            setState(() {
                                              row.trackInventory =
                                                  value == true;
                                            });
                                            _updateVariantInventory(row, {
                                              'trackInventory':
                                                  row.trackInventory,
                                            });
                                          },
                                  ),
                                ),
                              ),
                              SizedBox(
                                width: 92,
                                child: Padding(
                                  padding: const EdgeInsets.all(6),
                                  child: TextField(
                                    controller: row.stockController,
                                    enabled: !savingStock && row.trackInventory,
                                    decoration: _inputDecoration(),
                                    keyboardType: TextInputType.number,
                                    onSubmitted: (_) => _setVariantStock(row),
                                  ),
                                ),
                              ),
                              _dataCell(
                                '${row.reserved}',
                                88,
                                const TextStyle(fontSize: 12),
                              ),
                              SizedBox(
                                width: 92,
                                child: Padding(
                                  padding: const EdgeInsets.all(6),
                                  child: TextField(
                                    controller: row.safetyStockController,
                                    enabled: !savingInventory,
                                    decoration: _inputDecoration(),
                                    keyboardType: TextInputType.number,
                                    onSubmitted: (_) {
                                      _updateVariantInventory(row, {
                                        'safetyStock': _parseInt(
                                          row.safetyStockController.text,
                                          fallback: row.safetyStock,
                                        ),
                                      });
                                    },
                                  ),
                                ),
                              ),
                              _dataCell(
                                row.trackInventory
                                    ? '${_availableOf(row)}'
                                    : '∞',
                                90,
                                const TextStyle(fontSize: 12),
                              ),
                              SizedBox(
                                width: 240,
                                child: Padding(
                                  padding: const EdgeInsets.all(6),
                                  child: Row(
                                    children: [
                                      Expanded(
                                        child: TextField(
                                          controller: row.skuController,
                                          enabled:
                                              !row.skuLocked && !savingInfo,
                                          decoration: _inputDecoration(),
                                          onSubmitted: (_) =>
                                              _updateVariantInfo(row),
                                        ),
                                      ),
                                      const SizedBox(width: 4),
                                      if (!row.skuLocked)
                                        IconButton(
                                          tooltip:
                                              'app.admin_variantstable_actions_su'
                                                  .tr()
                                                  .tr(),
                                          icon: suggestingSku
                                              ? const SizedBox(
                                                  width: 12,
                                                  height: 12,
                                                  child:
                                                      CircularProgressIndicator(
                                                        strokeWidth: 2,
                                                      ),
                                                )
                                              : const Icon(
                                                  LucideIcons.wand2,
                                                  size: 16,
                                                ),
                                          onPressed: suggestingSku
                                              ? null
                                              : () => _suggestSku(row),
                                        ),
                                      if (!row.skuLocked)
                                        IconButton(
                                          tooltip:
                                              'app.admin_variantstable_actions_lo'
                                                  .tr()
                                                  .tr(),
                                          icon: lockingSku
                                              ? const SizedBox(
                                                  width: 12,
                                                  height: 12,
                                                  child:
                                                      CircularProgressIndicator(
                                                        strokeWidth: 2,
                                                      ),
                                                )
                                              : const Icon(
                                                  LucideIcons.lock,
                                                  size: 16,
                                                ),
                                          onPressed: lockingSku
                                              ? null
                                              : () => _lockSku(row),
                                        )
                                      else
                                        Padding(
                                          padding: const EdgeInsets.only(
                                            left: 6,
                                          ),
                                          child: Text(
                                            'app.admin_variantstable_actions_sk'
                                                .tr()
                                                .tr(),
                                            style: const TextStyle(
                                              fontSize: 11,
                                              color: Color(0xFF64748B),
                                            ),
                                          ),
                                        ),
                                    ],
                                  ),
                                ),
                              ),
                              SizedBox(
                                width: 150,
                                child: Padding(
                                  padding: const EdgeInsets.all(6),
                                  child: TextField(
                                    controller: row.barcodeController,
                                    enabled: !savingInfo,
                                    decoration: _inputDecoration(),
                                    onSubmitted: (_) => _updateVariantInfo(row),
                                  ),
                                ),
                              ),
                              SizedBox(
                                width: 70,
                                child: Center(
                                  child: Checkbox(
                                    value: row.isActive,
                                    onChanged: savingInfo
                                        ? null
                                        : (value) {
                                            setState(() {
                                              row.isActive = value == true;
                                            });
                                            _updateVariantInfo(row);
                                          },
                                  ),
                                ),
                              ),
                              SizedBox(
                                width: 120,
                                child: Padding(
                                  padding: const EdgeInsets.all(6),
                                  child: AppButton.secondary(
                                    label: 'app.admin_variantstable_actions_ma'
                                        .tr()
                                        .tr(
                                          namedArgs: {
                                            'count': row.images.length
                                                .toString(),
                                          },
                                        ),
                                    onPressed: () => _openImageEditor(row),
                                    size: AppButtonSize.sm,
                                  ),
                                ),
                              ),
                              SizedBox(
                                width: 110,
                                child: Padding(
                                  padding: const EdgeInsets.all(6),
                                  child: AppButton.ghost(
                                    label: 'app.admin_variantstable_actions_mo'
                                        .tr()
                                        .tr(),
                                    onPressed: () => _openMovements(row),
                                    size: AppButtonSize.sm,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        );
                      }),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _VariantEditorRow {
  final String id;
  final String title;
  final List<String> images;
  final List<ProductVariantOptionValue> optionValues;

  bool skuLocked;
  bool trackInventory;
  bool isActive;
  bool isPromotionActive;
  bool showCountdown;
  int stock;
  int reserved;
  int safetyStock;
  int? availableStock;

  final TextEditingController priceController;
  final TextEditingController costController;
  final TextEditingController promotionalPriceController;
  final TextEditingController promotionStartController;
  final TextEditingController promotionEndController;
  final TextEditingController stockController;
  final TextEditingController safetyStockController;
  final TextEditingController skuController;
  final TextEditingController barcodeController;

  _VariantEditorRow({
    required this.id,
    required this.title,
    required this.images,
    required this.optionValues,
    required this.skuLocked,
    required this.trackInventory,
    required this.isActive,
    required this.isPromotionActive,
    required this.showCountdown,
    required this.stock,
    required this.reserved,
    required this.safetyStock,
    required this.availableStock,
    required this.priceController,
    required this.costController,
    required this.promotionalPriceController,
    required this.promotionStartController,
    required this.promotionEndController,
    required this.stockController,
    required this.safetyStockController,
    required this.skuController,
    required this.barcodeController,
  });

  factory _VariantEditorRow.fromVariant(ProductVariant variant) {
    return _VariantEditorRow(
      id: variant.id,
      title: variant.title,
      images: List<String>.from(variant.images),
      optionValues: List<ProductVariantOptionValue>.from(variant.optionValues),
      skuLocked: variant.skuLocked,
      trackInventory: variant.trackInventory,
      isActive: variant.isActive,
      isPromotionActive: variant.isPromotionActive,
      showCountdown: variant.showCountdown,
      stock: variant.stock,
      reserved: variant.reserved,
      safetyStock: variant.safetyStock,
      availableStock: variant.availableStock,
      priceController: TextEditingController(text: variant.price.toString()),
      costController: TextEditingController(text: variant.cost.toString()),
      promotionalPriceController: TextEditingController(
        text: variant.promotionalPrice?.toString() ?? '',
      ),
      promotionStartController: TextEditingController(
        text:
            variant.promotionStartDate?.toIso8601String().substring(0, 16) ??
            '',
      ),
      promotionEndController: TextEditingController(
        text:
            variant.promotionEndDate?.toIso8601String().substring(0, 16) ?? '',
      ),
      stockController: TextEditingController(text: variant.stock.toString()),
      safetyStockController: TextEditingController(
        text: variant.safetyStock.toString(),
      ),
      skuController: TextEditingController(text: variant.sku),
      barcodeController: TextEditingController(text: variant.barcode ?? ''),
    );
  }

  Map<String, dynamic> snapshot() {
    return {
      'price': priceController.text,
      'cost': costController.text,
      'promo': promotionalPriceController.text,
      'promoStart': promotionStartController.text,
      'promoEnd': promotionEndController.text,
      'stockText': stockController.text,
      'safetyText': safetyStockController.text,
      'sku': skuController.text,
      'barcode': barcodeController.text,
      'skuLocked': skuLocked,
      'trackInventory': trackInventory,
      'isActive': isActive,
      'isPromotionActive': isPromotionActive,
      'showCountdown': showCountdown,
      'stock': stock,
      'reserved': reserved,
      'safetyStock': safetyStock,
      'availableStock': availableStock,
    };
  }

  void restore(Map<String, dynamic> snapshot) {
    priceController.text =
        snapshot['price']?.toString() ?? priceController.text;
    costController.text = snapshot['cost']?.toString() ?? costController.text;
    promotionalPriceController.text =
        snapshot['promo']?.toString() ?? promotionalPriceController.text;
    promotionStartController.text =
        snapshot['promoStart']?.toString() ?? promotionStartController.text;
    promotionEndController.text =
        snapshot['promoEnd']?.toString() ?? promotionEndController.text;
    stockController.text =
        snapshot['stockText']?.toString() ?? stockController.text;
    safetyStockController.text =
        snapshot['safetyText']?.toString() ?? safetyStockController.text;
    skuController.text = snapshot['sku']?.toString() ?? skuController.text;
    barcodeController.text =
        snapshot['barcode']?.toString() ?? barcodeController.text;
    skuLocked = snapshot['skuLocked'] == true;
    trackInventory = snapshot['trackInventory'] == true;
    isActive = snapshot['isActive'] == true;
    isPromotionActive = snapshot['isPromotionActive'] == true;
    showCountdown = snapshot['showCountdown'] == true;
    stock = (snapshot['stock'] as num?)?.toInt() ?? stock;
    reserved = (snapshot['reserved'] as num?)?.toInt() ?? reserved;
    safetyStock = (snapshot['safetyStock'] as num?)?.toInt() ?? safetyStock;
    availableStock = (snapshot['availableStock'] as num?)?.toInt();
  }

  void dispose() {
    priceController.dispose();
    costController.dispose();
    promotionalPriceController.dispose();
    promotionStartController.dispose();
    promotionEndController.dispose();
    stockController.dispose();
    safetyStockController.dispose();
    skuController.dispose();
    barcodeController.dispose();
  }
}

class _VariantMovementRecord {
  final String id;
  final String type;
  final int delta;
  final int reservedDelta;
  final int safetyStockDelta;
  final int? stockAfter;
  final int? reservedAfter;
  final int? safetyStockAfter;
  final String? createdAt;
  final String? createdByEmail;

  _VariantMovementRecord({
    required this.id,
    required this.type,
    required this.delta,
    required this.reservedDelta,
    required this.safetyStockDelta,
    required this.stockAfter,
    required this.reservedAfter,
    required this.safetyStockAfter,
    required this.createdAt,
    required this.createdByEmail,
  });

  factory _VariantMovementRecord.fromJson(Map<String, dynamic> json) {
    int? parseNullableInt(dynamic value) {
      if (value == null) return null;
      if (value is int) return value;
      if (value is num) return value.toInt();
      return int.tryParse(value.toString());
    }

    return _VariantMovementRecord(
      id: json['id']?.toString() ?? '',
      type: json['type']?.toString() ?? '',
      delta: parseNullableInt(json['delta']) ?? 0,
      reservedDelta: parseNullableInt(json['reservedDelta']) ?? 0,
      safetyStockDelta: parseNullableInt(json['safetyStockDelta']) ?? 0,
      stockAfter: parseNullableInt(json['stockAfter']),
      reservedAfter: parseNullableInt(json['reservedAfter']),
      safetyStockAfter: parseNullableInt(json['safetyStockAfter']),
      createdAt: json['createdAt']?.toString(),
      createdByEmail: json['createdBy'] is Map
          ? (json['createdBy']['email']?.toString())
          : null,
    );
  }
}

class _StockAllocationRow {
  final String variantId;
  final String title;
  final TextEditingController stockController;
  final TextEditingController reservedController;
  final TextEditingController safetyController;

  _StockAllocationRow({
    required this.variantId,
    required this.title,
    required this.stockController,
    required this.reservedController,
    required this.safetyController,
  });

  void dispose() {
    stockController.dispose();
    reservedController.dispose();
    safetyController.dispose();
  }
}

class _PlaceholderTabSection extends StatelessWidget {
  final String title;

  const _PlaceholderTabSection({required this.title});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(LucideIcons.construction, size: 48, color: Colors.grey),
            const SizedBox(height: 16),
            Text(
              '$title Tab',
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            const Text(
              'This section is not implemented in the Flutter Admin app yet.',
              style: TextStyle(color: Colors.grey),
            ),
          ],
        ),
      ),
    );
  }
}

class _PromotionsTabSection extends StatelessWidget {
  final bool isPromotionActive;
  final ValueChanged<bool> onPromotionActiveChanged;
  final TextEditingController promotionalPriceController;
  final DateTime? promotionStartDate;
  final ValueChanged<DateTime?> onPromotionStartDateChanged;
  final DateTime? promotionEndDate;
  final ValueChanged<DateTime?> onPromotionEndDateChanged;
  final bool showCountdown;
  final ValueChanged<bool> onShowCountdownChanged;
  final bool hasVariantOptions;

  const _PromotionsTabSection({
    required this.isPromotionActive,
    required this.onPromotionActiveChanged,
    required this.promotionalPriceController,
    required this.promotionStartDate,
    required this.onPromotionStartDateChanged,
    required this.promotionEndDate,
    required this.onPromotionEndDateChanged,
    required this.showCountdown,
    required this.onShowCountdownChanged,
    required this.hasVariantOptions,
  });

  @override
  Widget build(BuildContext context) {
    if (hasVariantOptions) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(LucideIcons.info, size: 48, color: Colors.blue),
              const SizedBox(height: 16),
              const Text(
                'Use variant promotions for this product',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w500),
              ),
              const SizedBox(height: 8),
              const Text(
                'This product has selectable variants. You can configure promotions individually for each variant in the Variants tab.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.grey),
              ),
            ],
          ),
        ),
      );
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SwitchListTile(
            title: Text('admin.pages.products.edit.promotions.active'.tr()),
            subtitle: Text(
              'admin.pages.products.edit.promotions.activeHint'.tr(),
            ),
            value: isPromotionActive,
            onChanged: onPromotionActiveChanged,
            contentPadding: EdgeInsets.zero,
            activeColor: const Color(0xFF65A30D),
          ),
          if (isPromotionActive) ...[
            const SizedBox(height: 24),
            FormInput(
              label: 'admin.pages.products.edit.promotions.price'.tr(),
              controller: promotionalPriceController,
              keyboardType: const TextInputType.numberWithOptions(
                decimal: true,
              ),
              prefixIcon: const Icon(LucideIcons.tags),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: InkWell(
                    onTap: () async {
                      final date = await showDatePicker(
                        context: context,
                        initialDate: promotionStartDate ?? DateTime.now(),
                        firstDate: DateTime(2000),
                        lastDate: DateTime(2100),
                      );
                      if (date != null) {
                        onPromotionStartDateChanged(date);
                      }
                    },
                    child: InputDecorator(
                      decoration: InputDecoration(
                        labelText:
                            'admin.pages.products.edit.promotions.startDate'
                                .tr(),
                        border: const OutlineInputBorder(),
                        prefixIcon: const Icon(LucideIcons.calendar),
                      ),
                      child: Text(
                        promotionStartDate != null
                            ? DateFormat.yMd().format(promotionStartDate!)
                            : 'Select Date',
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: InkWell(
                    onTap: () async {
                      final date = await showDatePicker(
                        context: context,
                        initialDate: promotionEndDate ?? DateTime.now(),
                        firstDate: DateTime(2000),
                        lastDate: DateTime(2100),
                      );
                      if (date != null) {
                        onPromotionEndDateChanged(date);
                      }
                    },
                    child: InputDecorator(
                      decoration: InputDecoration(
                        labelText:
                            'admin.pages.products.edit.promotions.endDate'.tr(),
                        border: const OutlineInputBorder(),
                        prefixIcon: const Icon(LucideIcons.calendar),
                      ),
                      child: Text(
                        promotionEndDate != null
                            ? DateFormat.yMd().format(promotionEndDate!)
                            : 'Select Date',
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            CheckboxListTile(
              title: Text(
                'admin.pages.products.edit.promotions.showCountdown'.tr(),
              ),
              value: showCountdown,
              onChanged: (val) => onShowCountdownChanged(val ?? false),
              contentPadding: EdgeInsets.zero,
              activeColor: const Color(0xFF65A30D),
              controlAffinity: ListTileControlAffinity.leading,
            ),
          ],
        ],
      ),
    );
  }
}
