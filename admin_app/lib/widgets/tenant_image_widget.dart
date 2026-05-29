import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../services/api_service.dart';
import '../utils/image_storage_manager.dart';
import 'offline_image_widget.dart';

class TenantImageWidget extends ConsumerWidget {
  final String imagePath;
  final double? width;
  final double? height;
  final BoxFit fit;
  final Widget? placeholder;
  final Widget? errorWidget;

  const TenantImageWidget({
    super.key,
    required this.imagePath,
    this.width,
    this.height,
    this.fit = BoxFit.cover,
    this.placeholder,
    this.errorWidget,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final trimmed = imagePath.trim();
    if (trimmed.isEmpty) {
      return SizedBox(width: width, height: height, child: errorWidget);
    }

    final resolved =
        ImageStorageManager.isLocalImagePath(trimmed) ||
            ImageStorageManager.isRemoteUrl(trimmed)
        ? trimmed
        : ref.read(apiProvider).resolvePublicUrl(trimmed);

    return OfflineImageWidget(
      imagePath: resolved,
      width: width,
      height: height,
      fit: fit,
      placeholder: placeholder,
      errorWidget: errorWidget,
    );
  }
}
