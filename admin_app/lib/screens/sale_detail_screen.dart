import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../services/api_service.dart';
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

  @override
  void initState() {
    super.initState();
    _future = _fetch();
  }

  Future<_SaleDetail?> _fetch() async {
    final id = widget.saleId.trim();
    if (id.isEmpty) return null;

    final api = ref.read(apiProvider);
    final res = await api.client.get('/admin/sales/$id');
    final data = res.data;
    if (data is! Map) return null;
    return _SaleDetail.fromJson(data.cast<String, dynamic>());
  }

  void _retry() {
    setState(() => _future = _fetch());
  }

  @override
  Widget build(BuildContext context) {
    final isMobile = MediaQuery.sizeOf(context).width < 800;

    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
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

                  final money = NumberFormat.simpleCurrency(name: 'DZD');
                  final shortId = sale.id.length > 8
                      ? sale.id.substring(0, 8)
                      : sale.id;

                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildHeader(),
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
                                  style: const TextStyle(
                                    fontSize: 24,
                                    fontWeight: FontWeight.w700,
                                    color: Color(0xFF0F172A),
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
                                          ? UiBadgeTone.teal
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
                                  style: const TextStyle(
                                    fontSize: 14,
                                    color: Color(0xFF64748B),
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
                      const Text(
                        'Items',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF0F172A),
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

  Widget _buildHeader() {
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
          child: const Padding(
            padding: EdgeInsets.symmetric(vertical: 6),
            child: Row(
              children: [
                Icon(LucideIcons.arrowLeft, size: 16, color: Color(0xFF64748B)),
                SizedBox(width: 6),
                Text(
                  'Sales',
                  style: TextStyle(
                    color: Color(0xFF64748B),
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        ),
        const Spacer(),
        AppButton.secondary(
          label: 'Retry',
          icon: LucideIcons.refreshCw,
          size: AppButtonSize.sm,
          onPressed: _retry,
        ),
      ],
    );
  }

  Widget _totalCard(String total) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
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
          const Text(
            'Total',
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: Color(0xFF64748B),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            total,
            style: const TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w700,
              color: Color(0xFF0F172A),
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
                  style: const TextStyle(
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF0F172A),
                  ),
                ),
              ),
              Expanded(
                flex: 1,
                child: Text(
                  item.quantity.toString(),
                  style: const TextStyle(color: Color(0xFF475569)),
                ),
              ),
              Expanded(
                flex: 2,
                child: Text(
                  money.format(item.price),
                  style: const TextStyle(color: Color(0xFF475569)),
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
        style: const TextStyle(
          color: Color(0xFF64748B),
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  Widget _loadingCard() {
    return _card(
      child: const Padding(
        padding: EdgeInsets.all(48),
        child: Column(
          children: [
            SizedBox(
              height: 32,
              width: 32,
              child: CircularProgressIndicator(strokeWidth: 3),
            ),
            SizedBox(height: 12),
            Text(
              'Loading sale...',
              style: TextStyle(color: Color(0xFF64748B)),
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
            Icon(LucideIcons.receipt, size: 48, color: Colors.grey[400]),
            const SizedBox(height: 12),
            const Text(
              'Sale not found',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: Color(0xFF111827),
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'This sale may have been deleted.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 13, color: Color(0xFF6B7280)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _card({required Widget child}) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
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

