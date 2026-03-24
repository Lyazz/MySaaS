import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../models/product.dart';
import '../providers/products_provider.dart';
import '../widgets/form/form_input.dart';
import '../widgets/buttons/app_button.dart';

class VariantEditScreen extends ConsumerStatefulWidget {
  final ProductVariant variant;
  final Product product;

  const VariantEditScreen({
    super.key,
    required this.variant,
    required this.product,
  });

  @override
  ConsumerState<VariantEditScreen> createState() => _VariantEditScreenState();
}

class _VariantEditScreenState extends ConsumerState<VariantEditScreen> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _priceController;
  late TextEditingController _costController;
  late TextEditingController _skuController;
  late TextEditingController _barcodeController;
  late TextEditingController _stockController;
  late TextEditingController _safetyStockController;
  late TextEditingController _reservedController;
  late bool _isActive;
  late bool _trackInventory;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _priceController = TextEditingController(
      text: widget.variant.price.toString(),
    );
    _costController = TextEditingController(
      text: widget.variant.cost.toString(),
    );
    _skuController = TextEditingController(text: widget.variant.sku);
    _barcodeController = TextEditingController(
      text: widget.variant.barcode ?? '',
    );
    _stockController = TextEditingController(
      text: widget.variant.stock.toString(),
    );
    _safetyStockController = TextEditingController(
      text: widget.variant.safetyStock.toString(),
    );
    _reservedController = TextEditingController(
      text: widget.variant.reserved.toString(),
    );
    _isActive = widget.variant.isActive;
    _trackInventory = widget.variant.trackInventory;
  }

  @override
  void dispose() {
    _priceController.dispose();
    _costController.dispose();
    _skuController.dispose();
    _barcodeController.dispose();
    _stockController.dispose();
    _safetyStockController.dispose();
    _reservedController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    try {
      // Update variant info
      await ref
          .read(productsProvider.notifier)
          .updateVariant(widget.variant.id, {
            'price': double.tryParse(_priceController.text) ?? 0.0,
            'cost': double.tryParse(_costController.text) ?? 0.0,
            'sku': _skuController.text,
            'barcode': _barcodeController.text,
            'isActive': _isActive,
          });

      // Update inventory (if needed, separate call usually)
      await ref
          .read(productsProvider.notifier)
          .updateVariantInventory(widget.variant.id, {
            'safetyStock': int.tryParse(_safetyStockController.text) ?? 0,
            'trackInventory': _trackInventory,
          });

      if (mounted) {
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Failed to update variant: $e')));
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: Text(widget.variant.title),
        elevation: 0,
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Basic Info Card
              _buildCard(
                title: 'General Information',
                children: [
                  FormInput(
                    label: 'Price',
                    controller: _priceController,
                    prefixText: '\$ ',
                    keyboardType: const TextInputType.numberWithOptions(
                      decimal: true,
                    ),
                  ),
                  const SizedBox(height: 16),
                  FormInput(
                    label: 'Cost (Purchase price)',
                    controller: _costController,
                    prefixText: '\$ ',
                    keyboardType: const TextInputType.numberWithOptions(
                      decimal: true,
                    ),
                  ),
                  const SizedBox(height: 16),
                  FormInput(
                    label: 'SKU',
                    controller: _skuController,
                    enabled: widget.variant.skuLocked != true,
                    suffixIcon: widget.variant.skuLocked == true
                        ? null
                        : IconButton(
                            tooltip: 'Suggest SKU',
                            onPressed: _isLoading
                                ? null
                                : () async {
                                    final messenger = ScaffoldMessenger.of(
                                      context,
                                    );
                                    try {
                                      final suggested = await ref
                                          .read(productsProvider.notifier)
                                          .suggestVariantSku(widget.variant.id);
                                      if (!mounted) return;
                                      if (suggested.trim().isEmpty) {
                                        messenger.showSnackBar(
                                          const SnackBar(
                                            content: Text('No SKU suggestion'),
                                          ),
                                        );
                                        return;
                                      }
                                      setState(() {
                                        _skuController.text = suggested;
                                      });
                                    } catch (e) {
                                      if (!mounted) return;
                                      messenger.showSnackBar(
                                        SnackBar(
                                          content: Text(
                                            'Failed to suggest SKU: $e',
                                          ),
                                        ),
                                      );
                                    }
                                  },
                            icon: const Icon(LucideIcons.wand2, size: 18),
                          ),
                  ),
                  const SizedBox(height: 16),
                  FormInput(label: 'Barcode', controller: _barcodeController),
                  const SizedBox(height: 16),
                  if (widget.variant.skuLocked != true)
                    Align(
                      alignment: Alignment.centerLeft,
                      child: AppButton.secondary(
                        label: 'Lock SKU',
                        icon: LucideIcons.lock,
                        size: AppButtonSize.sm,
                        onPressed: _isLoading
                            ? null
                            : () async {
                                final messenger = ScaffoldMessenger.of(context);
                                try {
                                  await ref
                                      .read(productsProvider.notifier)
                                      .lockVariantSku(widget.variant.id);
                                  if (!mounted) return;
                                  messenger.showSnackBar(
                                    const SnackBar(content: Text('SKU locked')),
                                  );
                                } catch (e) {
                                  if (!mounted) return;
                                  messenger.showSnackBar(
                                    SnackBar(
                                      content: Text('Failed to lock SKU: $e'),
                                    ),
                                  );
                                }
                              },
                      ),
                    )
                  else
                    const Text(
                      'SKU is locked',
                      style: TextStyle(color: Color(0xFF64748B)),
                    ),
                  const SizedBox(height: 16),
                  SwitchListTile(
                    title: const Text('Active'),
                    subtitle: const Text('Visible to customers'),
                    value: _isActive,
                    activeThumbColor: const Color(0xFF0D9488),
                    onChanged: (v) => setState(() => _isActive = v),
                    contentPadding: EdgeInsets.zero,
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // Inventory Card
              _buildCard(
                title: 'Inventory',
                children: [
                  SwitchListTile(
                    title: const Text('Track Inventory'),
                    value: _trackInventory,
                    activeThumbColor: const Color(0xFF0D9488),
                    onChanged: (v) => setState(() => _trackInventory = v),
                    contentPadding: EdgeInsets.zero,
                  ),
                  const SizedBox(height: 16),
                  if (_trackInventory) ...[
                    Row(
                      children: [
                        Expanded(
                          child: FormInput(
                            label: 'Stock',
                            controller: _stockController,
                            keyboardType: TextInputType.number,
                            readOnly: true,
                            enabled: false,
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: FormInput(
                            label: 'Safety Stock',
                            controller: _safetyStockController,
                            keyboardType: TextInputType.number,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    FormInput(
                      label: 'Reserved',
                      controller: _reservedController,
                      readOnly: true,
                      keyboardType: TextInputType.number,
                    ),
                  ],
                ],
              ),

              const SizedBox(height: 32),
              AppButton.primary(
                label: 'Save Changes',
                onPressed: _save,
                fullWidth: true,
                loading: _isLoading,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCard({required String title, required List<Widget> children}) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
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
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: Color(0xFF1E293B),
            ),
          ),
          const SizedBox(height: 16),
          ...children,
        ],
      ),
    );
  }
}
