import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:intl/intl.dart';
import '../providers/purchases_provider.dart';
import '../providers/products_provider.dart';
import '../providers/store_settings_provider.dart';
import '../models/purchase.dart';
import '../models/product.dart';
import '../utils/debouncer.dart';
import '../utils/tenant_currency.dart';
import '../widgets/form/form_input.dart';
import '../widgets/form/form_select.dart';
import '../widgets/dialogs/app_dialog.dart';
import '../widgets/buttons/app_button.dart';
import '../widgets/badges/status_badges.dart';
import '../theme/app_theme.dart';
import '../widgets/tenant_image_widget.dart';
import 'package:easy_localization/easy_localization.dart';

class PurchaseDetailScreen extends ConsumerStatefulWidget {
  final String purchaseId;

  const PurchaseDetailScreen({super.key, required this.purchaseId});

  @override
  ConsumerState<PurchaseDetailScreen> createState() =>
      _PurchaseDetailScreenState();
}

class _PurchaseDetailScreenState extends ConsumerState<PurchaseDetailScreen> {
  final _quantityDebouncer = Debouncer(milliseconds: 500);
  final _costDebouncer = Debouncer(milliseconds: 500);
  String _salePriceMode = 'replace';

  NumberFormat get _money =>
      tenantCurrencyFormatter(ref.watch(storeSettingsProvider).settings);
  String get _currencyCode =>
      tenantCurrencyCode(ref.watch(storeSettingsProvider).settings);

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(purchasesProvider.notifier).fetchPurchase(widget.purchaseId);
    });
  }

  @override
  void dispose() {
    _quantityDebouncer.dispose();
    _costDebouncer.dispose();
    super.dispose();
  }

  void _showAddProductModal() {
    showDialog(
      context: context,
      builder: (context) => _VariantSelectorDialog(
        onSelect: (product, variant) {
          final item = PurchaseItem(
            id: DateTime.now().millisecondsSinceEpoch.toString(),
            productId: variant.id, // Using variantId
            productName: '${product.title} - ${variant.title}',
            sku: variant.sku,
            quantityOrdered: 1,
            quantityReceived: 0,
            unitCost: variant.price, // Default to selling price or 0
          );
          ref
              .read(purchasesProvider.notifier)
              .addPurchaseItem(widget.purchaseId, item);
          Navigator.pop(context);
        },
      ),
    );
  }

  void _deletePurchase() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AppDialog(
        title: 'admin.pages.purchases.detail.deleteModal.title'.tr(),
        description: 'admin.confirmModal.defaults.message'.tr(),
        content: Text( 'app.are_you_sure_you_want_to_delet2'.tr(),
        ),
        secondaryLabel: 'Cancel',
        onSecondary: () => Navigator.pop(context, false),
        primaryLabel: 'Delete',
        primaryVariant: AppDialogPrimaryVariant.destructive,
        onPrimary: () => Navigator.pop(context, true),
      ),
    );

    if (confirmed == true && mounted) {
      await ref
          .read(purchasesProvider.notifier)
          .deletePurchase(widget.purchaseId);
      if (mounted) context.go('/purchases');
    }
  }

  @override
  Widget build(BuildContext context) {
    final purchaseAsync = ref
        .watch(purchasesProvider)
        .purchases
        .firstWhere(
          (p) => p.id == widget.purchaseId,
          orElse: () => Purchase(
            id: '',
            supplierId: '',
            supplierName: '',
            totalAmount: 0,
            status: 'NOT_FOUND',
            createdAt: DateTime.now(),
          ),
        );

    if (ref.watch(purchasesProvider).isLoading &&
        purchaseAsync.status == 'NOT_FOUND') {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    if (purchaseAsync.status == 'NOT_FOUND') {
      return Scaffold(
        appBar: AppBar(title: Text( 'app.not_found'.tr())),
        body: Center(child: Text( 'app.purchase_order_not_found'.tr())),
      );
    }

    final purchase = purchaseAsync;
    final isMobile = MediaQuery.of(context).size.width < 1024;

    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Flex(
              direction: isMobile ? Axis.vertical : Axis.horizontal,
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              crossAxisAlignment: isMobile
                  ? CrossAxisAlignment.start
                  : CrossAxisAlignment.center,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        InkWell(
                          onTap: () => context.go('/purchases'),
                          child: Text( 'admin.pages.purchases.index.title'.tr(),
                            style: TextStyle(
                              color: Colors.grey[500],
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                        Icon(
                          LucideIcons.chevronRight,
                          size: 16,
                          color: Colors.grey[400],
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Text(
                          'Purchase #${purchase.id.length > 8 ? purchase.id.substring(0, 8) : purchase.id}',
                          style: const TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF0F172A),
                          ),
                        ),
                        const SizedBox(width: 12),
                        PurchaseStatusBadge(status: purchase.status),
                      ],
                    ),
                  ],
                ),
                if (isMobile) const SizedBox(height: 16),
                Row(
                  children: [
                    AppButton.secondary(
                      label: 'superAdmin.paymentsPage.actions.refresh'.tr(),
                      icon: LucideIcons.refreshCw,
                      onPressed: () => ref
                          .read(purchasesProvider.notifier)
                          .fetchPurchase(widget.purchaseId),
                    ),
                    const SizedBox(width: 12),
                    AppButton.primary(
                      label: 'admin.pages.purchases.detail.addProducts'.tr(),
                      icon: LucideIcons.plus,
                      onPressed: _showAddProductModal,
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 24),

            // Info Cards Grid
            LayoutBuilder(
              builder: (context, constraints) {
                if (constraints.maxWidth < 768) {
                  return Column(
                    children: [
                      _buildSupplierCard(purchase),
                      const SizedBox(height: 16),
                      _buildSummaryCard(purchase),
                      const SizedBox(height: 16),
                      _buildActionsCard(),
                    ],
                  );
                }
                return Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(child: _buildSupplierCard(purchase)),
                    const SizedBox(width: 24),
                    Expanded(child: _buildSummaryCard(purchase)),
                    const SizedBox(width: 24),
                    Expanded(child: _buildActionsCard()),
                  ],
                );
              },
            ),
            const SizedBox(height: 24),

            // Items Table
            Container(
              decoration: BoxDecoration(
                color: isDark ? AppColors.surface1 : AppColors.lightSurface1,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: isDark
                      ? AppColors.surfaceBorder
                      : AppColors.lightSurfaceBorder,
                ),
                boxShadow: isDark
                    ? null
                    : [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.05),
                          blurRadius: 2,
                          offset: const Offset(0, 1),
                        ),
                      ],
              ),
              child: Column(
                children: [
                  Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 24,
                      vertical: 16,
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text( 'admin.pages.purchases.detail.items.title'.tr(),
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: isDark
                                ? AppColors.surface3
                                : const Color(0xFFF1F5F9),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            '${purchase.items.length} items',
                            style: TextStyle(
                              fontSize: 12,
                              color: isDark
                                  ? AppColors.textMuted
                                  : const Color(0xFF64748B),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Divider(height: 1),
                  if (purchase.items.isEmpty)
                    _buildEmptyState()
                  else
                    ListView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: purchase.items.length + 1,
                      itemBuilder: (context, index) {
                        if (index == 0) return const _TableHeader();
                        // Footer is usually total, but let's stick to simple list for now
                        // Web app shows footer with total.
                        final item = purchase.items[index - 1];
                        return _TableRow(
                          key: ValueKey(item.id),
                          item: item,
                          money: _money,
                          currencyCode: _currencyCode,
                          salePriceMode: _salePriceMode,
                          onUpdateMode: (val) =>
                              setState(() => _salePriceMode = val),
                          onUpdate: (type, val) {
                            if (type == 'quantity') {
                              _quantityDebouncer.run(() {
                                ref
                                    .read(purchasesProvider.notifier)
                                    .updatePurchaseItem(
                                      widget.purchaseId,
                                      item.id,
                                      quantity: val,
                                    );
                              });
                            } else if (type == 'cost') {
                              _costDebouncer.run(() {
                                ref
                                    .read(purchasesProvider.notifier)
                                    .updatePurchaseItem(
                                      widget.purchaseId,
                                      item.id,
                                      cost: val,
                                    );
                              });
                            }
                          },
                          onReceive: (qty) {
                            ref
                                .read(purchasesProvider.notifier)
                                .receiveItem(
                                  widget.purchaseId,
                                  item.id,
                                  qty,
                                  salePriceMode: _salePriceMode,
                                );
                          },
                          onRemove: () {
                            ref
                                .read(purchasesProvider.notifier)
                                .removePurchaseItem(widget.purchaseId, item.id);
                          },
                        );
                      },
                    ),
                  if (purchase.items.isNotEmpty) _buildTableFooter(purchase),
                ],
              ),
            ),
            const SizedBox(height: 24),
            Align(
              alignment: Alignment.centerRight,
              child: AppButton.danger(
                label: 'admin.pages.purchases.detail.deleteModal.confirm'.tr(),
                icon: LucideIcons.trash2,
                onPressed: _deletePurchase,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSupplierCard(Purchase purchase) {
    return _InfoCard(
      title: 'admin.pages.purchases.detail.cards.supplier'.tr(),
      icon: LucideIcons.truck,
      children: [
        Text(
          purchase.supplierName,
          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
        ),
        if (purchase.supplierEmail != null)
          _IconText(icon: LucideIcons.mail, text: purchase.supplierEmail!),
        if (purchase.supplierPhone != null)
          _IconText(icon: LucideIcons.phone, text: purchase.supplierPhone!),
      ],
    );
  }

  Widget _buildSummaryCard(Purchase purchase) {
    final ordered = purchase.items.fold(
      0.0,
      (sum, i) => sum + i.quantityOrdered,
    );
    final received = purchase.items.fold(
      0.0,
      (sum, i) => sum + i.quantityReceived,
    );

    return _InfoCard(
      title: 'admin.pages.purchases.detail.cards.summary'.tr(),
      icon: LucideIcons.fileText,
      children: [
        _SummaryRow(label: 'admin.pages.purchases.detail.cards.itemsOrdered'.tr(), value: ordered.toInt().toString()),
        _SummaryRow(
          label: 'admin.pages.purchases.detail.cards.itemsReceived'.tr(),
          value: received.toInt().toString(),
          valueColor: received == ordered
              ? Colors.green[700]
              : Colors.orange[700],
        ),
        const Padding(
          padding: EdgeInsets.symmetric(vertical: 8),
          child: Divider(),
        ),
        _SummaryRow(
          label: 'app.estimated_total'.tr(),
          value: _money.format(purchase.totalAmount),
          isBold: true,
        ),
      ],
    );
  }

  Widget _buildActionsCard() {
    return _InfoCard(
      title: 'superAdmin.paymentsPage.import.fields.notes'.tr(),
      icon: LucideIcons.fileText,
      children: [
        Center(
          child: Column(
            children: [
              Icon(LucideIcons.fileText, size: 32, color: Colors.grey[300]),
              const SizedBox(height: 8),
              Text( 'app.no_notes_added'.tr(),
                style: TextStyle(color: Colors.grey[500], fontSize: 13),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildEmptyState() {
    return Padding(
      padding: const EdgeInsets.all(48),
      child: Column(
        children: [
          Icon(LucideIcons.shoppingCart, size: 48, color: Colors.grey[300]),
          const SizedBox(height: 16),
          Text( 'app.no_items_added_yet'.tr(),
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: Colors.grey[800],
            ),
          ),
          const SizedBox(height: 8),
          Text( 'app.add_products_to_this_purchase'.tr(),
            style: TextStyle(color: Colors.grey[500]),
          ),
          const SizedBox(height: 24),
          AppButton.primary(
            label: 'admin.pages.purchases.detail.addProducts'.tr(),
            icon: LucideIcons.plus,
            onPressed: _showAddProductModal,
          ),
        ],
      ),
    );
  }

  Widget _buildTableFooter(Purchase purchase) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppColors.surface2 : const Color(0xFFF8FAFC),
        border: Border(
          top: BorderSide(
            color: isDark
                ? AppColors.surfaceBorder
                : AppColors.lightSurfaceBorder,
          ),
        ),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.end,
        children: [
          Text( 'admin.pages.purchases.detail.items.table.totalOrderValue'.tr(),
            style: TextStyle(fontWeight: FontWeight.w600),
          ),
          const SizedBox(width: 24),
          Text(
            _money.format(purchase.totalAmount),
            style: const TextStyle(fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }
}

class _InfoCard extends StatelessWidget {
  final String title;
  final IconData icon;
  final List<Widget> children;

  const _InfoCard({
    required this.title,
    required this.icon,
    required this.children,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surface1 : AppColors.lightSurface1,
        borderRadius: BorderRadius.circular(8),
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
                  blurRadius: 2,
                  offset: const Offset(0, 1),
                ),
              ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title.toUpperCase(),
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.bold,
              color: isDark ? AppColors.textMuted : const Color(0xFF64748B),
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(height: 16),
          ...children,
        ],
      ),
    );
  }
}

class _IconText extends StatelessWidget {
  final IconData icon;
  final String text;

  const _IconText({required this.icon, required this.text});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: Row(
        children: [
          Icon(icon, size: 14, color: Colors.grey[400]),
          const SizedBox(width: 8),
          Text(text, style: TextStyle(color: Colors.grey[600], fontSize: 14)),
        ],
      ),
    );
  }
}

class _SummaryRow extends StatelessWidget {
  final String label;
  final String value;
  final bool isBold;
  final Color? valueColor;

  const _SummaryRow({
    required this.label,
    required this.value,
    this.isBold = false,
    this.valueColor,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(color: Colors.grey[600], fontSize: 14)),
          Text(
            value,
            style: TextStyle(
              fontWeight: isBold ? FontWeight.bold : FontWeight.w500,
              color: valueColor ?? Colors.grey[900],
              fontSize: 14,
            ),
          ),
        ],
      ),
    );
  }
}

class _TableHeader extends StatelessWidget {
  const _TableHeader();

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final headerStyle = TextStyle(
      fontSize: 12,
      fontWeight: FontWeight.bold,
      color: isDark ? AppColors.textMuted : const Color(0xFF64748B),
      letterSpacing: 0.5,
    );
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surface2 : const Color(0xFFF8FAFC),
        border: Border(
          bottom: BorderSide(
            color: isDark
                ? AppColors.surfaceBorder
                : AppColors.lightSurfaceBorder,
          ),
        ),
      ),
      child: Row(
        children: [
          Expanded(flex: 3, child: Text( 'admin.pages.sales.detail.itemsTable.product'.tr(), style: headerStyle)),
          Expanded(flex: 2, child: Text( 'admin.pages.purchases.detail.items.table.ordered'.tr(), style: headerStyle)),
          Expanded(flex: 2, child: Text( 'admin.pages.purchases.detail.items.table.unitCost'.tr(), style: headerStyle)),
          Expanded(flex: 2, child: Text( 'admin.pages.purchases.detail.items.table.received'.tr(), style: headerStyle)),
          Expanded(flex: 3, child: Text( 'admin.pages.purchases.detail.items.table.receiveNow'.tr(), style: headerStyle)),
          Expanded(
            flex: 2,
            child: Text( 'admin.pages.sales.detail.itemsTable.total'.tr(),
              style: headerStyle,
              textAlign: TextAlign.right,
            ),
          ),
        ],
      ),
    );
  }
}

class _TableRow extends StatefulWidget {
  final PurchaseItem item;
  final NumberFormat money;
  final String currencyCode;
  final String salePriceMode;
  final Function(String val) onUpdateMode;
  final Function(String type, double val) onUpdate;
  final Function(double val) onReceive;
  final VoidCallback onRemove;

  const _TableRow({
    super.key,
    required this.item,
    required this.money,
    required this.currencyCode,
    required this.salePriceMode,
    required this.onUpdateMode,
    required this.onUpdate,
    required this.onReceive,
    required this.onRemove,
  });

  @override
  State<_TableRow> createState() => _TableRowState();
}

class _TableRowState extends State<_TableRow> {
  late TextEditingController _qtyController;
  late TextEditingController _costController;
  final TextEditingController _receiveController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _qtyController = TextEditingController(
      text: widget.item.quantityOrdered.toString(),
    );
    _costController = TextEditingController(
      text: widget.item.unitCost.toString(),
    );

    // Default receive all remaining
    final remaining =
        widget.item.quantityOrdered - widget.item.quantityReceived;
    if (remaining > 0) {
      _receiveController.text = remaining.toInt().toString();
    }
  }

  @override
  void didUpdateWidget(covariant _TableRow oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.item.quantityOrdered != oldWidget.item.quantityOrdered &&
        !_qtyController.selection.isValid) {
      _qtyController.text = widget.item.quantityOrdered.toString();
    }
  }

  @override
  void dispose() {
    _qtyController.dispose();
    _costController.dispose();
    _receiveController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isFullyReceived =
        widget.item.quantityReceived >= widget.item.quantityOrdered &&
        widget.item.quantityOrdered > 0;

    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      decoration: BoxDecoration(
        border: Border(
          bottom: BorderSide(
            color: isDark
                ? AppColors.surfaceBorder
                : AppColors.lightSurfaceBorder,
          ),
        ),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
      child: Row(
        children: [
          // Product Info
          Expanded(
            flex: 3,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  widget.item.productName,
                  style: const TextStyle(
                    fontWeight: FontWeight.w500,
                    color: Color(0xFF0F172A),
                  ),
                ),
                if (widget.item.sku != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 2),
                    child: Text(
                      'SKU: ${widget.item.sku}',
                      style: TextStyle(fontSize: 12, color: Colors.grey[500]),
                    ),
                  ),
              ],
            ),
          ),

          // Ordered
          Expanded(
            flex: 2,
            child: Padding(
              padding: const EdgeInsets.only(right: 16),
              child: widget.item.quantityReceived > 0
                  ? Text(
                      '${widget.item.quantityOrdered}',
                      style: const TextStyle(fontWeight: FontWeight.w500),
                    )
                  : FormInput(
                      label: 'app.qty_ordered'.tr(),
                      showLabel: false,
                      controller: _qtyController,
                      keyboardType: TextInputType.number,
                      borderRadius: 6,
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 8,
                      ),
                      onChanged: (val) {
                        final v = double.tryParse(val);
                        if (v != null) widget.onUpdate('quantity', v);
                      },
                    ),
            ),
          ),

          // Unit Cost
          Expanded(
            flex: 2,
            child: Padding(
              padding: const EdgeInsets.only(right: 16),
              child: widget.item.quantityReceived > 0
                  ? Text(widget.money.format(widget.item.unitCost))
                  : FormInput(
                      label: 'admin.pages.purchases.detail.items.table.unitCost'.tr(),
                      showLabel: false,
                      controller: _costController,
                      keyboardType: TextInputType.number,
                      prefixText: '${widget.currencyCode} ',
                      borderRadius: 6,
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 8,
                      ),
                      onChanged: (val) {
                        final v = double.tryParse(val);
                        if (v != null) widget.onUpdate('cost', v);
                      },
                    ),
            ),
          ),

          // Received (Progress)
          Expanded(
            flex: 2,
            child: Padding(
              padding: const EdgeInsets.only(right: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '${widget.item.quantityReceived.toInt()} / ${widget.item.quantityOrdered.toInt()}',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                      color: isFullyReceived
                          ? Colors.green[700]
                          : Colors.black87,
                    ),
                  ),
                  const SizedBox(height: 4),
                  LinearProgressIndicator(
                    value: widget.item.quantityOrdered > 0
                        ? widget.item.quantityReceived /
                              widget.item.quantityOrdered
                        : 0,
                    backgroundColor: isDark
                        ? AppColors.surface3
                        : const Color(0xFFE2E8F0),
                    color: AppColors.brand,
                    borderRadius: BorderRadius.circular(2),
                    minHeight: 4,
                  ),
                ],
              ),
            ),
          ),

          // Receive Now action
          Expanded(
            flex: 3,
            child: Padding(
              padding: const EdgeInsets.only(right: 16),
              child: Row(
                children: [
                  SizedBox(
                    width: 70,
                    child: FormInput(
                      label: 'app.receive'.tr(),
                      showLabel: false,
                      controller: _receiveController,
                      enabled: !isFullyReceived,
                      keyboardType: TextInputType.number,
                      borderRadius: 6,
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 8,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton(
                    onPressed: isFullyReceived
                        ? null
                        : () {
                            final qty = double.tryParse(
                              _receiveController.text,
                            );
                            if (qty != null && qty > 0) widget.onReceive(qty);
                          },
                    icon: const Icon(LucideIcons.check, size: 16),
                    style:
                        IconButton.styleFrom(
                          backgroundColor: isDark
                              ? AppColors.greenSurface
                              : const Color(0xFFF0FDF4),
                          foregroundColor: isDark
                              ? AppColors.greenText
                              : const Color(0xFF15803D),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(6),
                          ),
                          padding: const EdgeInsets.all(8),
                          minimumSize: const Size(32, 32),
                        ).copyWith(
                          backgroundColor: WidgetStateProperty.resolveWith((
                            states,
                          ) {
                            if (states.contains(WidgetState.disabled)) {
                              return isDark
                                  ? AppColors.surface3
                                  : const Color(0xFFF1F5F9);
                            }
                            return isDark
                                ? AppColors.greenSurface
                                : const Color(0xFFF0FDF4);
                          }),
                          foregroundColor: WidgetStateProperty.resolveWith((
                            states,
                          ) {
                            if (states.contains(WidgetState.disabled)) {
                              return isDark
                                  ? AppColors.textTertiary
                                  : const Color(0xFF94A3B8);
                            }
                            return isDark
                                ? AppColors.greenText
                                : const Color(0xFF15803D);
                          }),
                        ),
                  ),
                  const SizedBox(width: 8),
                  // Simple Dropdown for mode (Replace/Weighted)
                  Expanded(
                    child: FormSelect<String>(
                      label: 'app.mode'.tr(),
                      showLabel: false,
                      value: widget.salePriceMode,
                      borderless: true,
                      filled: false,
                      isDense: true,
                      textStyle: TextStyle(
                        fontSize: 12,
                        color: Colors.grey,
                      ),
                      contentPadding: EdgeInsets.zero,
                      items: [
                        DropdownMenuItem(
                          value: 'replace',
                          child: Text( 'app.replace_price'.tr()),
                        ),
                        DropdownMenuItem(
                          value: 'weighted',
                          child: Text( 'admin.pages.purchases.detail.items.table.salePriceMode.weighted'.tr()),
                        ),
                      ],
                      onChanged: (val) {
                        if (val == null) return;
                        widget.onUpdateMode(val);
                      },
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Total & Remove
          Expanded(
            flex: 2,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                Text(
                  widget.money.format(widget.item.total),
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
                if (widget.item.quantityReceived == 0) ...[
                  const SizedBox(width: 12),
                  IconButton(
                    onPressed: widget.onRemove,
                    icon: const Icon(LucideIcons.trash2, size: 16),
                    color: Colors.red[400],
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _VariantSelectorDialog extends ConsumerStatefulWidget {
  final Function(Product, ProductVariant) onSelect;

  const _VariantSelectorDialog({required this.onSelect});

  @override
  ConsumerState<_VariantSelectorDialog> createState() =>
      _VariantSelectorDialogState();
}

class _VariantSelectorDialogState
    extends ConsumerState<_VariantSelectorDialog> {
  final _searchController = TextEditingController();
  final _debouncer = Debouncer(milliseconds: 300);
  String _query = '';

  @override
  void dispose() {
    _searchController.dispose();
    _debouncer.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final productsState = ref.watch(productsProvider);
    final products = productsState.products.where((p) {
      if (_query.isEmpty) return true;
      return p.title.toLowerCase().contains(_query.toLowerCase());
    }).toList();

    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Dialog(
      backgroundColor: isDark ? AppColors.surface2 : AppColors.lightSurface2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Container(
        width: 600,
        height: 600,
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text( 'admin.pages.purchases.detail.addProducts'.tr(),
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                ),
                IconButton(
                  icon: const Icon(LucideIcons.x),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
            const SizedBox(height: 16),
            FormInput(
              label: 'admin.pages.suppliers.index.filters.searchLabel'.tr(),
              showLabel: false,
              controller: _searchController,
              hint: 'Search products...',
              prefixIcon: const Icon(LucideIcons.search, size: 18),
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 16,
                vertical: 12,
              ),
              onChanged: (val) {
                _debouncer.run(() {
                  setState(() {
                    _query = val;
                  });
                });
              },
            ),
            const SizedBox(height: 16),
            Expanded(
              child: productsState.isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : ListView.separated(
                      itemCount: products.length,
                      separatorBuilder: (context, index) =>
                          const Divider(height: 1),
                      itemBuilder: (context, index) {
                        final product = products[index];
                        // If multiple variants, show expansion tile or list them
                        // For simplicity, we just list all variants flattened or default
                        // A better UI would be an expandable tile.

                        if (product.variants.isEmpty) {
                          // Should theoretically not happen if default variant exists
                          return const SizedBox.shrink();
                        }

                        return ExpansionTile(
                          initiallyExpanded: true,
                          leading: Container(
                            width: 40,
                            height: 40,
                            decoration: BoxDecoration(
                              color: isDark
                                  ? AppColors.surface3
                                  : const Color(0xFFF1F5F9),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child:
                                product.mainImageUrl != null &&
                                    product.mainImageUrl!.trim().isNotEmpty
                                ? ClipRRect(
                                    borderRadius: BorderRadius.circular(4),
                                    child: TenantImageWidget(
                                      imagePath: product.mainImageUrl!,
                                      fit: BoxFit.cover,
                                    ),
                                  )
                                : const Icon(
                                    LucideIcons.image,
                                    color: Colors.grey,
                                  ),
                          ),
                          title: Text(
                            product.title,
                            style: const TextStyle(fontWeight: FontWeight.w500),
                          ),
                          subtitle: Text('${product.variants.length} variants'),
                          children: product.variants.map((variant) {
                            return ListTile(
                              dense: true,
                              contentPadding: const EdgeInsets.only(
                                left: 72,
                                right: 16,
                              ),
                              title: Text(
                                variant.title == 'Default'
                                    ? product.title
                                    : variant.title,
                              ),
                              subtitle: Text(
                                'SKU: ${variant.sku.isNotEmpty ? variant.sku : "-"}  |  Stock: ${variant.stock}',
                              ),
                              trailing: AppButton.secondary(
                                label: 'app.add'.tr(),
                                size: AppButtonSize.sm,
                                onPressed: () =>
                                    widget.onSelect(product, variant),
                              ),
                            );
                          }).toList(),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
