import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:intl/intl.dart';
import '../providers/purchases_provider.dart';
import '../providers/products_provider.dart';
import '../models/purchase.dart';
import '../models/product.dart';
import '../utils/debouncer.dart';

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
      builder: (context) => AlertDialog(
        title: const Text('Delete Purchase Order'),
        content: const Text(
          'Are you sure you want to delete this purchase order? This action cannot be undone.',
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
        appBar: AppBar(title: const Text('Not Found')),
        body: const Center(child: Text('Purchase order not found')),
      );
    }

    final purchase = purchaseAsync;
    final isMobile = MediaQuery.of(context).size.width < 1024;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
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
                          child: Text(
                            'Purchases',
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
                        _StatusBadge(status: purchase.status),
                      ],
                    ),
                  ],
                ),
                if (isMobile) const SizedBox(height: 16),
                Row(
                  children: [
                    OutlinedButton.icon(
                      onPressed: () => ref
                          .read(purchasesProvider.notifier)
                          .fetchPurchase(widget.purchaseId),
                      icon: const Icon(LucideIcons.refreshCw, size: 16),
                      label: const Text('Refresh'),
                      style: OutlinedButton.styleFrom(
                        backgroundColor: Colors.white,
                        foregroundColor: Colors.grey[700],
                        side: BorderSide(color: Colors.grey[300]!),
                      ),
                    ),
                    const SizedBox(width: 12),
                    ElevatedButton.icon(
                      onPressed: _showAddProductModal,
                      icon: const Icon(LucideIcons.plus, size: 16),
                      label: const Text('Add Products'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.teal[600],
                        foregroundColor: Colors.white,
                      ),
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
                color: Colors.white,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.grey[200]!),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.05),
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
                        const Text(
                          'Order items',
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
                            color: Colors.grey[100],
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            '${purchase.items.length} items',
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.grey[600],
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
              child: OutlinedButton.icon(
                onPressed: _deletePurchase,
                icon: const Icon(
                  LucideIcons.trash2,
                  size: 16,
                  color: Colors.red,
                ),
                label: const Text('Delete Order'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.red,
                  side: BorderSide(color: Colors.red[200]!),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 12,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSupplierCard(Purchase purchase) {
    return _InfoCard(
      title: 'SUPPLIER',
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
      title: 'SUMMARY',
      icon: LucideIcons.fileText,
      children: [
        _SummaryRow(label: 'Items Ordered', value: ordered.toInt().toString()),
        _SummaryRow(
          label: 'Items Received',
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
          label: 'Estimated Total',
          value: NumberFormat.simpleCurrency().format(purchase.totalAmount),
          isBold: true,
        ),
      ],
    );
  }

  Widget _buildActionsCard() {
    return _InfoCard(
      title: 'NOTES',
      icon: LucideIcons.fileText,
      children: [
        Center(
          child: Column(
            children: [
              Icon(LucideIcons.fileText, size: 32, color: Colors.grey[300]),
              const SizedBox(height: 8),
              Text(
                'No notes added',
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
          Text(
            'No items added yet',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: Colors.grey[800],
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Add products to this purchase order',
            style: TextStyle(color: Colors.grey[500]),
          ),
          const SizedBox(height: 24),
          ElevatedButton.icon(
            onPressed: _showAddProductModal,
            icon: const Icon(LucideIcons.plus, size: 16),
            label: const Text('Add Products'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.teal[600],
              foregroundColor: Colors.white,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTableFooter(Purchase purchase) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.grey[50],
        border: Border(top: BorderSide(color: Colors.grey[200]!)),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.end,
        children: [
          const Text(
            'TOTAL ORDER VALUE',
            style: TextStyle(fontWeight: FontWeight.w600),
          ),
          const SizedBox(width: 24),
          Text(
            NumberFormat.simpleCurrency().format(purchase.totalAmount),
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
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.grey[200]!),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
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
              color: Colors.grey[500],
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

class _StatusBadge extends StatelessWidget {
  final String status;

  const _StatusBadge({required this.status});

  @override
  Widget build(BuildContext context) {
    Color color;
    Color bgColor;

    switch (status.toLowerCase()) {
      case 'completed':
      case 'received':
        color = const Color(0xFF166534); // green-800
        bgColor = const Color(0xFFDCFCE7); // green-100
        break;
      case 'pending':
      case 'ordered':
        color = const Color(0xFF854D0E); // yellow-800
        bgColor = const Color(0xFFFEF9C3); // yellow-100
        break;
      case 'cancelled':
        color = const Color(0xFF991B1B); // red-800
        bgColor = const Color(0xFFFEE2E2); // red-100
        break;
      default:
        color = const Color(0xFF1F2937); // gray-800
        bgColor = const Color(0xFFF3F4F6); // gray-100
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Text(
        status.toUpperCase(),
        style: TextStyle(
          color: color,
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

class _TableHeader extends StatelessWidget {
  const _TableHeader();

  static const _headerStyle = TextStyle(
    fontSize: 12,
    fontWeight: FontWeight.bold,
    color: Colors.grey,
    letterSpacing: 0.5,
  );

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.grey[50],
        border: Border(bottom: BorderSide(color: Colors.grey[200]!)),
      ),
      child: const Row(
        children: [
          Expanded(flex: 3, child: Text('PRODUCT', style: _headerStyle)),
          Expanded(flex: 2, child: Text('ORDERED', style: _headerStyle)),
          Expanded(flex: 2, child: Text('UNIT COST', style: _headerStyle)),
          Expanded(flex: 2, child: Text('RECEIVED', style: _headerStyle)),
          Expanded(flex: 3, child: Text('RECEIVE NOW', style: _headerStyle)),
          Expanded(
            flex: 2,
            child: Text(
              'TOTAL',
              style: _headerStyle,
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
  final String salePriceMode;
  final Function(String val) onUpdateMode;
  final Function(String type, double val) onUpdate;
  final Function(double val) onReceive;
  final VoidCallback onRemove;

  const _TableRow({
    super.key,
    required this.item,
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

    return Container(
      decoration: BoxDecoration(
        border: Border(bottom: BorderSide(color: Colors.grey[100]!)),
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
                  : TextField(
                      controller: _qtyController,
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(
                        isDense: true,
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 8,
                        ),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(6),
                          borderSide: BorderSide(color: Colors.grey[300]!),
                        ),
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
                  ? Text(
                      NumberFormat.simpleCurrency().format(
                        widget.item.unitCost,
                      ),
                    )
                  : TextField(
                      controller: _costController,
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(
                        isDense: true,
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 8,
                        ),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(6),
                          borderSide: BorderSide(color: Colors.grey[300]!),
                        ),
                        prefixText: '\$ ',
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
                    backgroundColor: Colors.grey[200],
                    color: Colors.teal[600],
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
                    child: TextField(
                      controller: _receiveController,
                      enabled: !isFullyReceived,
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(
                        isDense: true,
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 8,
                        ),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(6),
                          borderSide: BorderSide(color: Colors.grey[300]!),
                        ),
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
                          backgroundColor: Colors.green[50],
                          foregroundColor: Colors.green[700],
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(6),
                          ),
                          padding: const EdgeInsets.all(8),
                          minimumSize: const Size(32, 32),
                        ).copyWith(
                          backgroundColor: MaterialStateProperty.resolveWith((
                            states,
                          ) {
                            if (states.contains(MaterialState.disabled))
                              return Colors.grey[100];
                            return Colors.green[50];
                          }),
                          foregroundColor: MaterialStateProperty.resolveWith((
                            states,
                          ) {
                            if (states.contains(MaterialState.disabled))
                              return Colors.grey[400];
                            return Colors.green[700];
                          }),
                        ),
                  ),
                  const SizedBox(width: 8),
                  // Simple Dropdown for mode (Replace/Weighted)
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      value: widget.salePriceMode,
                      decoration: const InputDecoration(
                        border: InputBorder.none,
                        contentPadding: EdgeInsets.all(0),
                      ),
                      style: const TextStyle(fontSize: 12, color: Colors.grey),
                      isDense: true,
                      items: const [
                        DropdownMenuItem(
                          value: 'replace',
                          child: Text('Replace Price'),
                        ),
                        DropdownMenuItem(
                          value: 'weighted',
                          child: Text('Weighted Avg'),
                        ),
                      ],
                      onChanged: (val) {
                        if (val != null) widget.onUpdateMode(val);
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
                  NumberFormat.simpleCurrency().format(widget.item.total),
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

    return Dialog(
      backgroundColor: Colors.white,
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
                const Text(
                  'Add Products',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                ),
                IconButton(
                  icon: const Icon(LucideIcons.x),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Search products...',
                prefixIcon: const Icon(LucideIcons.search, size: 18),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 12,
                ),
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
                              color: Colors.grey[100],
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: product.mainImageUrl != null
                                ? Image.network(
                                    product.mainImageUrl!,
                                    fit: BoxFit.cover,
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
                              trailing: ElevatedButton(
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: Colors.white,
                                  foregroundColor: Colors.teal[700],
                                  elevation: 0,
                                  side: BorderSide(color: Colors.teal[200]!),
                                ),
                                onPressed: () =>
                                    widget.onSelect(product, variant),
                                child: const Text('Add'),
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
