import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../models/product.dart';
import '../providers/products_provider.dart';
import 'form/form_input.dart';
import 'form/form_select.dart';
import 'buttons/app_button.dart';
import 'dialogs/app_dialog.dart';
import 'option_metadata_dialog.dart';
import '../theme/app_theme.dart';
import 'package:easy_localization/easy_localization.dart';
import '../utils/app_toasts.dart';

class ProductOptionsList extends ConsumerStatefulWidget {
  final String productId;
  final List<ProductOption> options;

  const ProductOptionsList({
    super.key,
    required this.productId,
    required this.options,
  });

  @override
  ConsumerState<ProductOptionsList> createState() => _ProductOptionsListState();
}

class _ProductOptionsListState extends ConsumerState<ProductOptionsList> {
  // Option creation state
  bool _isCreatingOption = false;
  final _newOptionNameController = TextEditingController();
  final _newOptionValuesController = TextEditingController();
  String _newOptionType = 'dropdown';

  // Value addition state (per option)
  final Map<String, TextEditingController> _valueControllers = {};

  @override
  void dispose() {
    _newOptionNameController.dispose();
    _newOptionValuesController.dispose();
    for (var controller in _valueControllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  Future<void> _createOption() async {
    if (_newOptionNameController.text.trim().isEmpty) return;

    final values = _newOptionValuesController.text
        .split(',')
        .map((e) => {'label': e.trim()})
        .where((e) => e['label']!.isNotEmpty)
        .toList();

    try {
      await ref.read(productsProvider.notifier).createOption(widget.productId, {
        'name': _newOptionNameController.text.trim(),
        'displayType': _newOptionType,
        'values': values,
      });

      // Reset form
      setState(() {
        _isCreatingOption = false;
        _newOptionNameController.clear();
        _newOptionValuesController.clear();
        _newOptionType = 'dropdown';
      });
    } catch (e) {
      if (!mounted) return;
      AppToasts.show(context, 'Failed to create option: $e');
    }
  }

  Future<void> _deleteOption(String optionId) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AppDialog(
        title: 'admin.productOptionsEditor.deleteModal.title'.tr(),
        description: 'app.this_will_delete_all_variants'.tr(),
        content: Text('app.are_you_sure_you_want_to_delet4'.tr()),
        secondaryLabel: 'Cancel',
        onSecondary: () => Navigator.pop(context, false),
        primaryLabel: 'Delete',
        primaryVariant: AppDialogPrimaryVariant.destructive,
        onPrimary: () => Navigator.pop(context, true),
      ),
    );

    if (confirm == true) {
      try {
        await ref
            .read(productsProvider.notifier)
            .deleteOption(widget.productId, optionId);
      } catch (e) {
        if (mounted) {
          AppToasts.show(context, 'Failed to delete option: $e');
        }
      }
    }
  }

  Future<void> _addValue(String optionId) async {
    final controller = _valueControllers.putIfAbsent(
      optionId,
      () => TextEditingController(),
    );
    final label = controller.text.trim();
    if (label.isEmpty) return;

    try {
      await ref
          .read(productsProvider.notifier)
          .addOptionValue(widget.productId, optionId, label);
      controller.clear();
    } catch (e) {
      if (!mounted) return;
      AppToasts.show(context, 'Failed to add value: $e');
    }
  }

  Future<void> _deleteValue(String optionId, String valueId) async {
    try {
      await ref
          .read(productsProvider.notifier)
          .deleteOptionValue(widget.productId, optionId, valueId);
    } catch (e) {
      if (!mounted) return;
      AppToasts.show(context, 'Failed to delete value: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'admin.productOptionsEditor.title'.tr(),
              style: TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 16,
                color: Color(0xFF1E293B),
              ),
            ),
            if (widget.options.length < 3 && !_isCreatingOption)
              AppButton.secondary(
                label: 'app.add_option'.tr(),
                icon: LucideIcons.plus,
                size: AppButtonSize.sm,
                onPressed: () => setState(() => _isCreatingOption = true),
              ),
          ],
        ),
        const SizedBox(height: 16),

        // List of Options
        ...widget.options.map((option) => _buildOptionCard(option)),

        // Create Option Form
        if (_isCreatingOption)
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: isDark ? AppColors.surface1 : AppColors.lightSurface1,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                color: Theme.of(
                  context,
                ).colorScheme.primary.withValues(alpha: 0.3),
              ),
              boxShadow: isDark
                  ? null
                  : [
                      BoxShadow(
                        color: Theme.of(
                          context,
                        ).colorScheme.primary.withValues(alpha: 0.05),
                        blurRadius: 4,
                        offset: const Offset(0, 2),
                      ),
                    ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'app.new_option'.tr(),
                  style: TextStyle(fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 12),
                FormInput(
                  label: 'admin.productOptionsEditor.fields.optionName'.tr(),
                  controller: _newOptionNameController,
                  hint: 'e.g. Size, Color',
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 10,
                  ),
                ),
                SizedBox(height: 12),
                FormSelect<String>(
                  label: 'admin.productOptionsEditor.fields.displayType'.tr(),
                  value: _newOptionType,
                  items: [
                    DropdownMenuItem(
                      value: 'dropdown',
                      child: Text(
                        'admin.productOptionsEditor.displayTypes.dropdown'.tr(),
                      ),
                    ),
                    DropdownMenuItem(
                      value: 'button',
                      child: Text(
                        'admin.productOptionsEditor.displayTypes.button'.tr(),
                      ),
                    ),
                    DropdownMenuItem(
                      value: 'radio',
                      child: Text(
                        'admin.productOptionsEditor.displayTypes.radio'.tr(),
                      ),
                    ),
                    DropdownMenuItem(
                      value: 'color',
                      child: Text(
                        'admin.productOptionsEditor.displayTypes.color'.tr(),
                      ),
                    ),
                    DropdownMenuItem(
                      value: 'image',
                      child: Text(
                        'admin.productOptionsEditor.displayTypes.image'.tr(),
                      ),
                    ),
                  ],
                  onChanged: (v) =>
                      setState(() => _newOptionType = v ?? 'dropdown'),
                ),
                const SizedBox(height: 12),
                FormInput(
                  label: 'app.values'.tr(),
                  controller: _newOptionValuesController,
                  hint: 'Separate with comma (e.g. S, M, L)',
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 10,
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    AppButton.secondary(
                      label: 'admin.common.cancel'.tr(),
                      size: AppButtonSize.sm,
                      onPressed: () =>
                          setState(() => _isCreatingOption = false),
                    ),
                    const SizedBox(width: 8),
                    AppButton.primary(
                      label: 'app.add'.tr(),
                      size: AppButtonSize.sm,
                      onPressed: _createOption,
                    ),
                  ],
                ),
              ],
            ),
          ),
      ],
    );
  }

  Widget _buildOptionCard(ProductOption option) {
    final valueController = _valueControllers.putIfAbsent(
      option.id,
      () => TextEditingController(),
    );
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surface1 : AppColors.lightSurface1,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: isDark
              ? AppColors.surfaceBorder
              : AppColors.lightSurfaceBorder,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                option.name,
                style: const TextStyle(
                  fontWeight: FontWeight.w600,
                  fontSize: 14,
                  color: Color(0xFF334155),
                ),
              ),
              IconButton(
                onPressed: () => _deleteOption(option.id),
                icon: const Icon(LucideIcons.trash2, size: 16),
                color: const Color(0xFF94A3B8),
                hoverColor: Colors.red.withValues(alpha: 0.1),
                splashRadius: 20,
              ),
            ],
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              ...option.values.map((value) => _buildValueChip(option, value)),
              SizedBox(
                width: 120,
                child: FormInput(
                  label: 'app.add_value'.tr(),
                  showLabel: false,
                  controller: valueController,
                  hint: 'Add value',
                  hintStyle: const TextStyle(fontSize: 12, color: Colors.grey),
                  textStyle: const TextStyle(fontSize: 12),
                  borderless: true,
                  filled: false,
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 0,
                    vertical: 8,
                  ),
                  onSubmitted: (_) => _addValue(option.id),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildValueChip(ProductOption option, ProductOptionValue value) {
    final hasMetadata =
        option.displayType == 'color' || option.displayType == 'image';

    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFFF1F5F9),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Color preview for color display type
          if (option.displayType == 'color' && value.meta != null)
            Container(
              width: 16,
              height: 16,
              margin: const EdgeInsets.only(right: 6),
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: _parseColor(value.meta),
                border: Border.all(color: Colors.grey.shade300, width: 0.5),
              ),
            )
          // Image preview for image display type
          else if (option.displayType == 'image' && value.meta != null)
            Container(
              width: 20,
              height: 20,
              margin: const EdgeInsets.only(right: 6),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(4),
                border: Border.all(color: Colors.grey.shade300, width: 0.5),
                image: DecorationImage(
                  image: NetworkImage(value.meta!),
                  fit: BoxFit.cover,
                  onError: (_, __) {},
                ),
              ),
            ),

          // Label
          Text(
            value.label,
            style: const TextStyle(fontSize: 12, color: Color(0xFF334155)),
          ),

          // Edit button for color/image types
          if (hasMetadata) ...[
            const SizedBox(width: 4),
            InkWell(
              onTap: () => _showMetadataDialog(option, value),
              borderRadius: BorderRadius.circular(12),
              child: const Padding(
                padding: EdgeInsets.all(2),
                child: Icon(
                  LucideIcons.pencil,
                  size: 12,
                  color: Color(0xFF64748B),
                ),
              ),
            ),
          ],

          const SizedBox(width: 4),
          // Delete button
          InkWell(
            onTap: () => _deleteValue(option.id, value.id),
            borderRadius: BorderRadius.circular(12),
            child: const Padding(
              padding: EdgeInsets.all(2),
              child: Icon(LucideIcons.x, size: 12, color: Color(0xFF64748B)),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _showMetadataDialog(
    ProductOption option,
    ProductOptionValue value,
  ) async {
    final result = await showDialog<bool>(
      context: context,
      builder: (context) => OptionMetadataDialog(
        productId: widget.productId,
        optionId: option.id,
        valueId: value.id,
        currentLabel: value.label,
        currentMeta: value.meta,
        displayType: option.displayType,
      ),
    );

    // Dialog returns true on successful save, which triggers a refresh via the provider
    if (result == true && mounted) {
      // Refresh is handled by the provider's updateOptionValue method
    }
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
      return Colors.grey;
    }
  }
}
