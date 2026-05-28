import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:dio/dio.dart';

import '../services/api_service.dart';
import '../services/database_service.dart';
import '../repositories/product_repository.dart';
import '../providers/store_settings_provider.dart';
import '../models/product.dart';
import '../theme/app_theme.dart';
import '../utils/tenant_currency.dart';
import '../widgets/badges/status_badges.dart';
import '../widgets/badges/ui_badge.dart';
import '../widgets/buttons/app_button.dart';
import '../widgets/responsive_server_paginated_table.dart';

class SaleDetailScreen extends ConsumerStatefulWidget {
  final String saleId;

  const SaleDetailScreen({super.key, required this.saleId});

  @override
  ConsumerState<SaleDetailScreen> createState() => _SaleDetailScreenState();
}

class _SaleDetailScreenState extends ConsumerState<SaleDetailScreen> {
  late Future<_SaleDetail?> _future;
  bool _isRefunding = false;

  @override
  void initState() {
    super.initState();
    _future = _fetch();
  }

  Future<_SaleDetail?> _fetch() async {
    final id = widget.saleId.trim();
    if (id.isEmpty) return null;

    final api = ref.read(apiProvider);
    try {
      // POS sale details have a dedicated route on the backend.
      final res = await api.client.get('/admin/sales/pos/$id');
      final data = res.data;
      if (data is Map)
        return _SaleDetail.fromJson(data.cast<String, dynamic>());
    } on DioException catch (e) {
      if (e.response?.statusCode != 404) {
        // fall through to local fallback
      }
    } catch (_) {}

    try {
      final res = await api.client.get('/admin/sales/$id');
      final data = res.data;
      if (data is Map)
        return _SaleDetail.fromJson(data.cast<String, dynamic>());
    } catch (_) {
      // fall through to local fallback
    }

    // Offline/local fallback: read from local `sales` table (POS sales).
    final db = await DatabaseService().database;
    final rows = await db.query(
      'sales',
      where: 'id = ?',
      whereArgs: [id],
      limit: 1,
    );
    if (rows.isEmpty) return null;
    final row = rows.first;

    final customerId = row['customerId']?.toString();
    String customerName = '';
    String customerPhone = '';
    String customerAddress = '';
    if (customerId != null && customerId.trim().isNotEmpty) {
      final customerRows = await db.query(
        'customers',
        where: 'id = ?',
        whereArgs: [customerId],
        limit: 1,
      );
      if (customerRows.isNotEmpty) {
        final c = customerRows.first;
        customerName = c['name']?.toString() ?? '';
        customerPhone = c['phone']?.toString() ?? '';
        customerAddress = c['address']?.toString() ?? '';
      }
    }

    final payloadRaw = row['payloadJson']?.toString();
    final payload = (payloadRaw != null && payloadRaw.trim().isNotEmpty)
        ? (jsonDecode(payloadRaw) as Map?)?.cast<String, dynamic>()
        : null;

    final products = await ProductRepository(api).getProducts();
    final productById = {for (final p in products) p.id: p};

    String variantLabel(ProductVariant v) {
      final labels = v.optionValues
          .map((ov) => ov.optionValue?.label)
          .whereType<String>()
          .where((s) => s.trim().isNotEmpty)
          .toList();
      if (labels.isNotEmpty) return labels.join(' / ');
      return v.sku;
    }

    final itemsRaw = payload?['items'];
    final items = (itemsRaw is List)
        ? itemsRaw.whereType<Map>().map((m) => m.cast<String, dynamic>()).map((
            item,
          ) {
            final productId = item['productId']?.toString() ?? '';
            final variantId = item['variantId']?.toString();
            final product = productById[productId];
            String label =
                product?.title ?? (productId.isNotEmpty ? productId : 'Item');
            if (product != null && variantId != null) {
              ProductVariant? v;
              for (final vv in product.variants) {
                if (vv.id == variantId) {
                  v = vv;
                  break;
                }
              }
              if (v != null) {
                final vLabel = variantLabel(v);
                if (vLabel.trim().isNotEmpty)
                  label = '${product.title} · $vLabel';
              }
            }
            return _SaleItem.fromJson({
              'product': {'title': label},
              'variant': const {},
              'quantity': item['quantity'],
              'price': item['price'],
            });
          }).toList()
        : <_SaleItem>[];

    return _SaleDetail(
      id: row['id']?.toString() ?? id,
      source: 'POS',
      status: row['status']?.toString() ?? 'COMPLETED',
      totalAmount: (row['total'] is num) ? (row['total'] as num).toDouble() : 0,
      customerName: customerName,
      customerPhone: customerPhone,
      customerAddress: customerAddress,
      createdAt: DateTime.tryParse(row['createdAt']?.toString() ?? ''),
      items: items,
    );
  }

  void _retry() {
    setState(() => _future = _fetch());
  }

  @override
  Widget build(BuildContext context) {
    final isMobile = MediaQuery.sizeOf(context).width < 800;
    final tenantMoney = tenantCurrencyFormatter(
      ref.watch(storeSettingsProvider).settings,
    );

    return Scaffold(
      body: SingleChildScrollView(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 1280),
            child: Padding(
              padding: EdgeInsets.all(isMobile ? 16 : 24),
              child: FutureBuilder<_SaleDetail?>(
                future: _future,
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return _loadingCard();
                  }
                  if (snapshot.hasError) {
                    return _errorCard(snapshot.error.toString());
                  }
                  final sale = snapshot.data;
                  if (sale == null) return _notFoundCard();

                  final money = tenantMoney;
                  final shortId = sale.id.length > 8
                      ? sale.id.substring(0, 8)
                      : sale.id;

                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildHeader(sale: sale),
                      const SizedBox(height: 12),
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Sale #$shortId',
                                  style: TextStyle(
                                    fontSize: 24,
                                    fontWeight: FontWeight.w700,
                                    color: Theme.of(
                                      context,
                                    ).colorScheme.onSurface,
                                    letterSpacing: -0.5,
                                  ),
                                ),
                                const SizedBox(height: 8),
                                Wrap(
                                  spacing: 8,
                                  runSpacing: 8,
                                  children: [
                                    UiBadge(
                                      label: sale.source,
                                      tone: sale.source.toUpperCase() == 'POS'
                                          ? UiBadgeTone.lime
                                          : UiBadgeTone.indigo,
                                      uppercase: true,
                                    ),
                                    SaleStatusBadge(status: sale.status),
                                    if (sale.createdAt != null)
                                      UiBadge(
                                        label: DateFormat.yMMMd()
                                            .add_jm()
                                            .format(sale.createdAt!),
                                        tone: UiBadgeTone.slate,
                                      ),
                                  ],
                                ),
                                const SizedBox(height: 12),
                                Text(
                                  [
                                    if (sale.customerName.trim().isNotEmpty)
                                      sale.customerName.trim(),
                                    if (sale.customerPhone.trim().isNotEmpty)
                                      sale.customerPhone.trim(),
                                    if (sale.customerAddress.trim().isNotEmpty)
                                      sale.customerAddress.trim(),
                                  ].join(' · '),
                                  style: TextStyle(
                                    fontSize: 14,
                                    color: Theme.of(context)
                                        .colorScheme
                                        .onSurface
                                        .withValues(alpha: 0.5),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          if (!isMobile) ...[
                            const SizedBox(width: 16),
                            _totalCard(money.format(sale.totalAmount)),
                          ],
                        ],
                      ),
                      if (isMobile) ...[
                        const SizedBox(height: 12),
                        _totalCard(money.format(sale.totalAmount)),
                      ],
                      const SizedBox(height: 20),
                      Text(
                        'Items',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                          color: Theme.of(context).colorScheme.onSurface,
                        ),
                      ),
                      const SizedBox(height: 12),
                      _itemsTable(sale.items, money),
                    ],
                  );
                },
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHeader({_SaleDetail? sale}) {
    final normalizedSource = sale?.source.trim().toUpperCase() ?? '';
    final normalizedStatus = sale?.status.trim().toUpperCase() ?? '';
    final isOrder = normalizedSource == 'ORDER';
    final canRefund =
        sale != null &&
        normalizedSource == 'POS' &&
        normalizedStatus == 'COMPLETED';

    return Row(
      children: [
        InkWell(
          onTap: () {
            if (context.canPop()) {
              context.pop();
            } else {
              context.go('/sales');
            }
          },
          borderRadius: BorderRadius.circular(8),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 6),
            child: Row(
              children: [
                Icon(
                  LucideIcons.arrowLeft,
                  size: 16,
                  color: Theme.of(
                    context,
                  ).colorScheme.onSurface.withValues(alpha: 0.5),
                ),
                const SizedBox(width: 6),
                Text(
                  'Sales',
                  style: TextStyle(
                    color: Theme.of(
                      context,
                    ).colorScheme.onSurface.withValues(alpha: 0.5),
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        ),
        const Spacer(),
        if (sale != null) ...[
          AppButton.danger(
            label: 'Refund',
            icon: LucideIcons.rotateCcw,
            size: AppButtonSize.sm,
            loading: _isRefunding,
            onPressed: _isRefunding
                ? null
                : () {
                    if (canRefund) {
                      _handleRefund(sale);
                      return;
                    }
                    final reason = isOrder
                        ? 'Order-origin sales must be returned from the order flow.'
                        : 'Only COMPLETED POS sales can be refunded.';
                    ScaffoldMessenger.of(
                      context,
                    ).showSnackBar(SnackBar(content: Text(reason)));
                  },
          ),
          const SizedBox(width: 8),
        ],
        AppButton.secondary(
          label: 'Retry',
          icon: LucideIcons.refreshCw,
          size: AppButtonSize.sm,
          onPressed: _retry,
        ),
      ],
    );
  }

  Future<void> _handleRefund(_SaleDetail sale) async {
    if (_isRefunding) return;
    setState(() => _isRefunding = true);
    try {
      final api = ref.read(apiProvider);
      final response = await api.client.get('/admin/cash/cashboxes');
      final raw = response.data;
      final cashboxes = raw is List
          ? raw.whereType<Map>().map((e) => e.cast<String, dynamic>()).toList()
          : <Map<String, dynamic>>[];
      final openCashboxes = cashboxes
          .where((c) => c['isActive'] == true && c['openSession'] is Map)
          .toList();

      if (!mounted) return;
      if (openCashboxes.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'No open cashbox available. Open a cash session first.',
            ),
          ),
        );
        return;
      }

      String selectedCashboxId = (openCashboxes.first['id'] ?? '').toString();
      String selectedMethod = 'CASH';
      final referenceCtrl = TextEditingController();
      final noteCtrl = TextEditingController(
        text:
            'Sale refund ${sale.id.substring(0, sale.id.length > 8 ? 8 : sale.id.length)}',
      );
      bool submitting = false;
      String? formError;

      final confirmed = await showDialog<bool>(
        context: context,
        builder: (dialogContext) {
          return StatefulBuilder(
            builder: (context, setDialogState) {
              return AlertDialog(
                title: const Text('Refund Sale'),
                content: SizedBox(
                  width: 420,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Create refund cash outflow and mark this sale as REFUNDED.',
                        style: TextStyle(fontSize: 13),
                      ),
                      const SizedBox(height: 12),
                      DropdownButtonFormField<String>(
                        initialValue: selectedCashboxId,
                        items: openCashboxes
                            .map(
                              (c) => DropdownMenuItem<String>(
                                value: (c['id'] ?? '').toString(),
                                child: Text((c['name'] ?? '').toString()),
                              ),
                            )
                            .toList(),
                        onChanged: submitting
                            ? null
                            : (v) => setDialogState(
                                () =>
                                    selectedCashboxId = v ?? selectedCashboxId,
                              ),
                        decoration: const InputDecoration(
                          labelText: 'Cashbox',
                          border: OutlineInputBorder(),
                        ),
                      ),
                      const SizedBox(height: 10),
                      DropdownButtonFormField<String>(
                        initialValue: selectedMethod,
                        items: const [
                          DropdownMenuItem(value: 'CASH', child: Text('Cash')),
                          DropdownMenuItem(value: 'CARD', child: Text('Card')),
                          DropdownMenuItem(
                            value: 'TRANSFER',
                            child: Text('Transfer'),
                          ),
                          DropdownMenuItem(
                            value: 'OTHER',
                            child: Text('Other'),
                          ),
                        ],
                        onChanged: submitting
                            ? null
                            : (v) => setDialogState(
                                () => selectedMethod = (v ?? 'CASH')
                                    .toUpperCase(),
                              ),
                        decoration: const InputDecoration(
                          labelText: 'Method',
                          border: OutlineInputBorder(),
                        ),
                      ),
                      const SizedBox(height: 10),
                      TextField(
                        controller: referenceCtrl,
                        enabled: !submitting,
                        decoration: const InputDecoration(
                          labelText: 'Reference (optional)',
                          border: OutlineInputBorder(),
                        ),
                      ),
                      const SizedBox(height: 10),
                      TextField(
                        controller: noteCtrl,
                        enabled: !submitting,
                        maxLines: 2,
                        decoration: const InputDecoration(
                          labelText: 'Note (optional)',
                          border: OutlineInputBorder(),
                        ),
                      ),
                      if (formError != null) ...[
                        const SizedBox(height: 10),
                        Text(
                          formError!,
                          style: const TextStyle(
                            color: Colors.red,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                actions: [
                  TextButton(
                    onPressed: submitting
                        ? null
                        : () => Navigator.of(dialogContext).pop(false),
                    child: const Text('Cancel'),
                  ),
                  AppButton.danger(
                    label: 'Refund',
                    icon: LucideIcons.rotateCcw,
                    loading: submitting,
                    onPressed: submitting
                        ? null
                        : () async {
                            setDialogState(() {
                              submitting = true;
                              formError = null;
                            });
                            try {
                              await api.client.patch(
                                '/admin/sales/${sale.id}/status',
                                data: {
                                  'status': 'REFUNDED',
                                  'refund': {
                                    'cashboxId': selectedCashboxId,
                                    'method': selectedMethod,
                                    if (referenceCtrl.text.trim().isNotEmpty)
                                      'reference': referenceCtrl.text.trim(),
                                    if (noteCtrl.text.trim().isNotEmpty)
                                      'note': noteCtrl.text.trim(),
                                  },
                                },
                              );
                              if (!dialogContext.mounted) return;
                              Navigator.of(dialogContext).pop(true);
                            } catch (e) {
                              setDialogState(() {
                                submitting = false;
                                formError = e.toString();
                              });
                            }
                          },
                  ),
                ],
              );
            },
          );
        },
      );

      referenceCtrl.dispose();
      noteCtrl.dispose();

      if (confirmed == true) {
        _retry();
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Sale refunded successfully')),
        );
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Failed to refund sale: $e')));
    } finally {
      if (mounted) {
        setState(() => _isRefunding = false);
      }
    }
  }

  Widget _totalCard(String total) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark
              ? AppColors.surfaceBorder
              : AppColors.lightSurfaceBorder,
        ),
        boxShadow: [
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
            'Total',
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: Theme.of(
                context,
              ).colorScheme.onSurface.withValues(alpha: 0.5),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            total,
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w700,
              color: Theme.of(context).colorScheme.onSurface,
            ),
          ),
        ],
      ),
    );
  }

  Widget _itemsTable(List<_SaleItem> items, NumberFormat money) {
    return ResponsiveServerPaginatedTable<_SaleItem>(
      items: items,
      minWidth: 950,
      page: 1,
      totalPages: 1,
      totalItems: items.length,
      itemsPerPage: items.isEmpty ? 1 : items.length,
      onPageChanged: (_) {},
      emptyState: const Center(
        child: Padding(
          padding: EdgeInsets.all(48),
          child: Text('No items found'),
        ),
      ),
      header: Row(
        children: [
          _headerCell('Item', flex: 5),
          _headerCell('Qty', flex: 1),
          _headerCell('Price', flex: 2),
          _headerCell('Total', flex: 2),
        ],
      ),
      rowBuilder: (context, item, index) {
        final lineTotal = item.price * item.quantity;
        return Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          child: Row(
            children: [
              Expanded(
                flex: 5,
                child: Text(
                  item.label,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontWeight: FontWeight.w600,
                    color: Theme.of(context).colorScheme.onSurface,
                  ),
                ),
              ),
              Expanded(
                flex: 1,
                child: Text(
                  item.quantity.toString(),
                  style: TextStyle(
                    color: Theme.of(
                      context,
                    ).colorScheme.onSurface.withValues(alpha: 0.6),
                  ),
                ),
              ),
              Expanded(
                flex: 2,
                child: Text(
                  money.format(item.price),
                  style: TextStyle(
                    color: Theme.of(
                      context,
                    ).colorScheme.onSurface.withValues(alpha: 0.6),
                  ),
                ),
              ),
              Expanded(
                flex: 2,
                child: Text(
                  money.format(lineTotal),
                  style: const TextStyle(
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF0F172A),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _headerCell(String text, {required int flex}) {
    return Expanded(
      flex: flex,
      child: Text(
        text,
        style: TextStyle(
          color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.5),
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  Widget _loadingCard() {
    return _card(
      child: Padding(
        padding: const EdgeInsets.all(48),
        child: Column(
          children: [
            const SizedBox(
              height: 32,
              width: 32,
              child: CircularProgressIndicator(strokeWidth: 3),
            ),
            const SizedBox(height: 12),
            Text(
              'Loading sale...',
              style: TextStyle(
                color: Theme.of(
                  context,
                ).colorScheme.onSurface.withValues(alpha: 0.5),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _errorCard(String message) {
    return _card(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            const Icon(LucideIcons.alertCircle, size: 28),
            const SizedBox(height: 12),
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 16),
            AppButton.secondary(
              label: 'Retry',
              icon: LucideIcons.refreshCw,
              onPressed: _retry,
            ),
          ],
        ),
      ),
    );
  }

  Widget _notFoundCard() {
    return _card(
      child: Padding(
        padding: const EdgeInsets.all(48),
        child: Column(
          children: [
            Icon(
              LucideIcons.receipt,
              size: 48,
              color: Theme.of(
                context,
              ).colorScheme.onSurface.withValues(alpha: 0.3),
            ),
            const SizedBox(height: 12),
            Text(
              'Sale not found',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: Theme.of(context).colorScheme.onSurface,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'This sale may have been deleted.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 13,
                color: Theme.of(
                  context,
                ).colorScheme.onSurface.withValues(alpha: 0.5),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _card({required Widget child}) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark
              ? AppColors.surfaceBorder
              : AppColors.lightSurfaceBorder,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 4,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: Center(child: child),
    );
  }
}

class _SaleDetail {
  final String id;
  final String source;
  final String status;
  final double totalAmount;
  final String customerName;
  final String customerPhone;
  final String customerAddress;
  final DateTime? createdAt;
  final List<_SaleItem> items;

  _SaleDetail({
    required this.id,
    required this.source,
    required this.status,
    required this.totalAmount,
    required this.customerName,
    required this.customerPhone,
    required this.customerAddress,
    required this.createdAt,
    required this.items,
  });

  factory _SaleDetail.fromJson(Map<String, dynamic> json) {
    double parseDouble(dynamic raw) {
      if (raw == null) return 0;
      if (raw is num) return raw.toDouble();
      return double.tryParse(raw.toString()) ?? 0;
    }

    DateTime? parseDate(dynamic raw) {
      final value = raw?.toString();
      if (value == null || value.isEmpty) return null;
      return DateTime.tryParse(value);
    }

    final itemsRaw = json['items'];
    final items = (itemsRaw is List)
        ? itemsRaw
              .whereType<Map>()
              .map((e) => _SaleItem.fromJson(e.cast<String, dynamic>()))
              .toList()
        : <_SaleItem>[];

    final customerAddress = json['customerAddress']?.toString() ?? '';

    return _SaleDetail(
      id: json['id']?.toString() ?? '',
      source: json['source']?.toString() ?? 'ORDER',
      status: json['status']?.toString() ?? '',
      totalAmount: parseDouble(json['totalAmount']),
      customerName: json['customerName']?.toString() ?? '',
      customerPhone: json['customerPhone']?.toString() ?? '',
      customerAddress: customerAddress,
      createdAt: parseDate(json['createdAt']) ?? parseDate(json['updatedAt']),
      items: items,
    );
  }
}

class _SaleItem {
  final String label;
  final int quantity;
  final double price;

  _SaleItem({required this.label, required this.quantity, required this.price});

  factory _SaleItem.fromJson(Map<String, dynamic> json) {
    double parseDouble(dynamic raw) {
      if (raw == null) return 0;
      if (raw is num) return raw.toDouble();
      return double.tryParse(raw.toString()) ?? 0;
    }

    final product = json['product'];
    final productTitle = (product is Map)
        ? product['title']?.toString() ?? ''
        : '';

    final variant = json['variant'];
    final variantLabel = (variant is Map)
        ? variant['label']?.toString() ?? ''
        : '';

    final label = [
      if (productTitle.trim().isNotEmpty) productTitle.trim(),
      if (variantLabel.trim().isNotEmpty) variantLabel.trim(),
    ].join(' · ');

    return _SaleItem(
      label: label.isEmpty ? 'Item' : label,
      quantity: int.tryParse(json['quantity']?.toString() ?? '') ?? 0,
      price: parseDouble(json['price']),
    );
  }
}
