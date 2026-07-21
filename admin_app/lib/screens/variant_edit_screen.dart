import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../models/product.dart';
import '../providers/products_provider.dart';
import '../widgets/form/form_input.dart';
import '../widgets/buttons/app_button.dart';
import '../theme/app_theme.dart';
import 'package:easy_localization/easy_localization.dart';
import '../utils/app_toasts.dart';

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
        AppToasts.show(context, 'Failed to update variant: $e');
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.variant.title), elevation: 0),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Basic Info Card
              _buildCard(
                context,
                title: 'app.general_information'.tr(),
                children: [
                  FormInput(
                    label: 'admin.pages.sales.detail.itemsTable.price'.tr(),
                    controller: _priceController,
                    prefixText: '\$ ',
                    keyboardType: const TextInputType.numberWithOptions(
                      decimal: true,
                    ),
                  ),
                  const SizedBox(height: 16),
                  FormInput(
                    label: 'app.cost_purchase_price'.tr(),
                    controller: _costController,
                    prefixText: '\$ ',
                    keyboardType: const TextInputType.numberWithOptions(
                      decimal: true,
                    ),
                  ),
                  const SizedBox(height: 16),
                  FormInput(
                    label: 'admin.pages.purchases.detail.items.sku'.tr(),
                    controller: _skuController,
                    enabled: widget.variant.skuLocked != true,
                    suffixIcon: widget.variant.skuLocked == true
                        ? null
                        : IconButton(
                            tooltip: 'app.suggest_sku'.tr(),
                            onPressed: _isLoading
                                ? null
                                : () async {
                                    try {
                                      final suggested = await ref
                                          .read(productsProvider.notifier)
                                          .suggestVariantSku(widget.variant.id);
                                      if (!context.mounted) return;
                                      if (suggested.trim().isEmpty) {
                                        AppToasts.show(
                                          context,
                                          'app.no_sku_suggestion'.tr(),
                                        );
                                        return;
                                      }
                                      setState(() {
                                        _skuController.text = suggested;
                                      });
                                    } catch (e) {
                                      if (!context.mounted) return;
                                      AppToasts.show(
                                        context,
                                        'Failed to suggest SKU: $e',
                                      );
                                    }
                                  },
                            icon: const Icon(LucideIcons.wand2, size: 18),
                          ),
                  ),
                  const SizedBox(height: 16),
                  FormInput(
                    label: 'admin.variantsTable.columns.barcode'.tr(),
                    controller: _barcodeController,
                  ),
                  const SizedBox(height: 16),
                  if (widget.variant.skuLocked != true)
                    Align(
                      alignment: Alignment.centerLeft,
                      child: AppButton.secondary(
                        label: 'app.lock_sku'.tr(),
                        icon: LucideIcons.lock,
                        size: AppButtonSize.sm,
                        onPressed: _isLoading
                            ? null
                            : () async {
                                try {
                                  await ref
                                      .read(productsProvider.notifier)
                                      .lockVariantSku(widget.variant.id);
                                  if (!context.mounted) return;
                                  AppToasts.show(
                                    context,
                                    'app.sku_locked'.tr(),
                                  );
                                } catch (e) {
                                  if (!context.mounted) return;
                                  AppToasts.show(
                                    context,
                                    'Failed to lock SKU: $e',
                                  );
                                }
                              },
                      ),
                    )
                  else
                    Text(
                      'app.sku_is_locked'.tr(),
                      style: TextStyle(color: Color(0xFF64748B)),
                    ),
                  const SizedBox(height: 16),
                  SwitchListTile(
                    title: Text('superAdmin.tenants.status.active'.tr()),
                    subtitle: Text('app.visible_to_customers'.tr()),
                    value: _isActive,
                    activeThumbColor: const Color(0xFF65A30D),
                    onChanged: (v) => setState(() => _isActive = v),
                    contentPadding: EdgeInsets.zero,
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // Inventory Card
              _buildCard(
                context,
                title: 'admin.pages.inventory.title'.tr(),
                children: [
                  SwitchListTile(
                    title: Text('app.track_inventory'.tr()),
                    value: _trackInventory,
                    activeThumbColor: const Color(0xFF65A30D),
                    onChanged: (v) => setState(() => _trackInventory = v),
                    contentPadding: EdgeInsets.zero,
                  ),
                  const SizedBox(height: 16),
                  if (_trackInventory) ...[
                    Row(
                      children: [
                        Expanded(
                          child: FormInput(
                            label: 'admin.pages.products.index.table.stock'
                                .tr(),
                            controller: _stockController,
                            keyboardType: TextInputType.number,
                            readOnly: true,
                            enabled: false,
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: FormInput(
                            label: 'app.safety_stock'.tr(),
                            controller: _safetyStockController,
                            keyboardType: TextInputType.number,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    FormInput(
                      label: 'admin.pages.inventory.table.reserved'.tr(),
                      controller: _reservedController,
                      readOnly: true,
                      keyboardType: TextInputType.number,
                    ),
                  ],
                ],
              ),

              const SizedBox(height: 32),
              AppButton.primary(
                label: 'admin.common.saveChanges'.tr(),
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

  Widget _buildCard(
    BuildContext context, {
    required String title,
    required List<Widget> children,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surface1 : AppColors.lightSurface1,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark
              ? AppColors.surfaceBorder
              : AppColors.lightSurfaceBorder,
        ),
        boxShadow: isDark
            ? null
            : [
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
