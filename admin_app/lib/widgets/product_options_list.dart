import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../models/product.dart';
import '../providers/products_provider.dart';
import 'option_metadata_dialog.dart';

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
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Failed to create option: $e')));
    }
  }

  Future<void> _deleteOption(String optionId) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Option'),
        content: const Text(
          'Are you sure? This will delete all variants associated with this option.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      try {
        await ref
            .read(productsProvider.notifier)
            .deleteOption(widget.productId, optionId);
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Failed to delete option: $e')),
          );
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
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Failed to add value: $e')));
    }
  }

  Future<void> _deleteValue(String optionId, String valueId) async {
    try {
      await ref
          .read(productsProvider.notifier)
          .deleteOptionValue(widget.productId, optionId, valueId);
    } catch (e) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Failed to delete value: $e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Options',
              style: TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 16,
                color: Color(0xFF1E293B),
              ),
            ),
            if (widget.options.length < 3 && !_isCreatingOption)
              TextButton.icon(
                onPressed: () => setState(() => _isCreatingOption = true),
                icon: const Icon(LucideIcons.plus, size: 16),
                label: const Text('Add Option'),
                style: TextButton.styleFrom(
                  foregroundColor: const Color(0xFF0D9488),
                ),
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
              color: Colors.white,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                color: const Color(0xFF0D9488).withOpacity(0.3),
              ),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF0D9488).withOpacity(0.05),
                  blurRadius: 4,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'New Option',
                  style: TextStyle(fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _newOptionNameController,
                  decoration: const InputDecoration(
                    labelText: 'Option Name',
                    hintText: 'e.g. Size, Color',
                    border: OutlineInputBorder(),
                    contentPadding: EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 8,
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  value: _newOptionType,
                  decoration: const InputDecoration(
                    labelText: 'Display Type',
                    border: OutlineInputBorder(),
                    contentPadding: EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 8,
                    ),
                  ),
                  items: const [
                    DropdownMenuItem(
                      value: 'dropdown',
                      child: Text('Dropdown'),
                    ),
                    DropdownMenuItem(
                      value: 'button',
                      child: Text('Buttons / Tags'),
                    ),
                    DropdownMenuItem(
                      value: 'radio',
                      child: Text('Radio Buttons'),
                    ),
                    DropdownMenuItem(
                      value: 'color',
                      child: Text('Color Swatch'),
                    ),
                    DropdownMenuItem(
                      value: 'image',
                      child: Text('Image with Text'),
                    ),
                  ],
                  onChanged: (v) => setState(() => _newOptionType = v!),
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _newOptionValuesController,
                  decoration: const InputDecoration(
                    labelText: 'Values',
                    hintText: 'Separate with comma (e.g. S, M, L)',
                    border: OutlineInputBorder(),
                    contentPadding: EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 8,
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    TextButton(
                      onPressed: () =>
                          setState(() => _isCreatingOption = false),
                      child: const Text(
                        'Cancel',
                        style: TextStyle(color: Colors.grey),
                      ),
                    ),
                    const SizedBox(width: 8),
                    ElevatedButton(
                      onPressed: _createOption,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF0D9488),
                        foregroundColor: Colors.white,
                      ),
                      child: const Text('Add'),
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

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: const Color(0xFFE2E8F0)),
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
                hoverColor: Colors.red.withOpacity(0.1),
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
                child: TextField(
                  controller: valueController,
                  decoration: const InputDecoration(
                    hintText: 'Add value',
                    isDense: true,
                    border: InputBorder.none,
                    contentPadding: EdgeInsets.symmetric(
                      horizontal: 0,
                      vertical: 8,
                    ),
                    hintStyle: TextStyle(fontSize: 12, color: Colors.grey),
                  ),
                  style: const TextStyle(fontSize: 12),
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
