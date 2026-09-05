import 'dart:io';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../services/tenant_mode_service.dart';
import '../services/workspace_cache_service.dart';
import '../utils/image_storage_manager.dart';

class OfflineImageWidget extends StatelessWidget {
  final String imagePath;
  final double? width;
  final double? height;
  final BoxFit fit;
  final Widget? placeholder;
  final Widget? errorWidget;

  const OfflineImageWidget({
    Key? key,
    required this.imagePath,
    this.width,
    this.height,
    this.fit = BoxFit.cover,
    this.placeholder,
    this.errorWidget,
  }) : super(key: key);

  static final WorkspaceCacheService _cacheService = WorkspaceCacheService();

  @override
  Widget build(BuildContext context) {
    if (ImageStorageManager.isRemoteUrl(imagePath)) {
      final namespaceKey = TenantModeService().activeNamespaceKey;
      return CachedNetworkImage(
        imageUrl: imagePath,
        cacheManager: _cacheService.imageCacheManager(namespaceKey),
        width: width,
        height: height,
        fit: fit,
        placeholder: (context, url) =>
            placeholder ?? const Center(child: CircularProgressIndicator()),
        errorWidget: (context, url, error) =>
            errorWidget ?? const Icon(Icons.error),
      );
    }

    // It is a local relative path
    return FutureBuilder<File>(
      future: ImageStorageManager.getLocalImageFile(imagePath),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return SizedBox(
            width: width,
            height: height,
            child:
                placeholder ?? const Center(child: CircularProgressIndicator()),
          );
        }

        if (snapshot.hasError || !snapshot.hasData) {
          return SizedBox(
            width: width,
            height: height,
            child: errorWidget ?? const Icon(Icons.error),
          );
        }

        final file = snapshot.data!;
        return Image.file(
          file,
          width: width,
          height: height,
          fit: fit,
          errorBuilder: (context, error, stackTrace) {
            return SizedBox(
              width: width,
              height: height,
              child: errorWidget ?? const Icon(Icons.error),
            );
          },
        );
      },
    );
  }
}
