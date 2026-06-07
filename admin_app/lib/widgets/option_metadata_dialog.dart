import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/products_provider.dart';
import 'form/form_input.dart';
import 'dialogs/app_dialog.dart';
import 'package:easy_localization/easy_localization.dart';
import '../utils/app_toasts.dart';

class OptionMetadataDialog extends ConsumerStatefulWidget {
  final String productId;
  final String optionId;
  final String valueId;
  final String currentLabel;
  final String? currentMeta;
  final String displayType; // 'color' or 'image'

  const OptionMetadataDialog({
    super.key,
    required this.productId,
    required this.optionId,
    required this.valueId,
    required this.currentLabel,
    this.currentMeta,
    required this.displayType,
  });

  @override
  ConsumerState<OptionMetadataDialog> createState() =>
      _OptionMetadataDialogState();
}

class _OptionMetadataDialogState extends ConsumerState<OptionMetadataDialog> {
  late TextEditingController _metaController;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _metaController = TextEditingController(text: widget.currentMeta ?? '');
  }

  @override
  void dispose() {
    _metaController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    setState(() => _isSaving = true);
    try {
      await ref.read(productsProvider.notifier).updateOptionValue(
        widget.productId,
        widget.optionId,
        widget.valueId,
        {
          'label': widget.currentLabel, // Keep label same
          'meta': _metaController.text.trim(),
        },
      );

      if (mounted) {
        Navigator.of(context).pop(true);
      }
    } catch (e) {
      if (mounted) {
        AppToasts.show(context, 'Failed to update: $e');
      }
    } finally {
      if (mounted) {
        setState(() => _isSaving = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isColor = widget.displayType == 'color';
    final title = isColor ? 'Edit Color' : 'Edit Image';
    final label = isColor ? 'Color Hex (e.g. #FF0000)' : 'Image URL';

    return AppDialog(
      title: '$title for "${widget.currentLabel}"',
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          FormInput(
            label: label,
            controller: _metaController,
            hint: isColor ? '#000000' : 'https://...',
            onChanged: (_) => setState(() {}), // Refresh preview
          ),
          const SizedBox(height: 16),
          Text(
            'admin.productOptionsEditor.preview.title'.tr(),
            style: TextStyle(fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 8),
          if (isColor)
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: _parseColor(_metaController.text),
                border: Border.all(color: Colors.grey.shade300),
              ),
            )
          else if (_metaController.text.isNotEmpty)
            Container(
              width: 60,
              height: 60,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.grey.shade300),
                image: DecorationImage(
                  image: NetworkImage(_metaController.text),
                  fit: BoxFit.cover,
                  onError: (_, __) {}, // Handle error silently for preview
                ),
              ),
            )
          else
            Text('app.no_image_url'.tr(), style: TextStyle(color: Colors.grey)),
        ],
      ),
      secondaryLabel: 'Cancel',
      onSecondary: () => Navigator.pop(context),
      primaryLabel: 'Save',
      onPrimary: _save,
      primaryLoading: _isSaving,
    );
  }

  Color? _parseColor(String? hex) {
    if (hex == null || hex.isEmpty) return null;
    hex = hex.replaceAll('#', '');
    if (hex.length == 6) {
      hex = 'FF$hex';
    }
    try {
      return Color(int.parse('0x$hex'));
    } catch (_) {
      return null;
    }
  }
}
