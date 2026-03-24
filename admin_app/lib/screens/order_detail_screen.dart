import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../models/order.dart';
import '../repositories/order_repository.dart';
import '../services/api_service.dart';
import '../widgets/form/form_select.dart';
import '../widgets/buttons/app_button.dart';

class OrderDetailScreen extends ConsumerStatefulWidget {
  final String orderId;

  const OrderDetailScreen({super.key, required this.orderId});

  @override
  ConsumerState<OrderDetailScreen> createState() => _OrderDetailScreenState();
}

class _OrderDetailScreenState extends ConsumerState<OrderDetailScreen> {
  bool _loading = true;
  bool _updating = false;
  String? _error;
  Order? _order;

  @override
  void initState() {
    super.initState();
    Future.microtask(_load);
  }

  Future<void> _load() async {
    if (!mounted) return;
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final api = ref.read(apiProvider);
      final repo = OrderRepository(api);
      final order = await repo.getOrder(widget.orderId);
      if (order == null) throw Exception('Order not found');
      setState(() {
        _order = order;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  Future<void> _updateStatus(String status) async {
    if (_order == null) return;
    setState(() {
      _updating = true;
      _error = null;
    });

    try {
      final api = ref.read(apiProvider);
      final repo = OrderRepository(api);
      await repo.updateStatus(widget.orderId, status);
      await _load();
    } catch (e) {
      setState(() {
        _error = e.toString();
      });
    } finally {
      if (mounted) {
        setState(() {
          _updating = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(LucideIcons.alertCircle, size: 28),
              const SizedBox(height: 12),
              Text(_error!, textAlign: TextAlign.center),
              const SizedBox(height: 16),
              AppButton.secondary(
                label: 'Retry',
                icon: LucideIcons.refreshCw,
                onPressed: _load,
              ),
              const SizedBox(height: 8),
              AppButton.ghost(
                label: 'Back to orders',
                onPressed: () => context.go('/orders'),
              ),
            ],
          ),
        ),
      );
    }

    final order = _order!;
    final id = order.id.isNotEmpty ? order.id : widget.orderId;
    final status = order.status;
    final customerName = order.customerName;
    final customerPhone = order.customerPhone;
    final customerAddress = order.customerAddress;
    final totalAmount = order.totalAmount;
    final createdAt = order.createdAt;
    final items = order.items;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              IconButton(
                onPressed: () => context.go('/orders'),
                icon: const Icon(LucideIcons.arrowLeft, size: 18),
                tooltip: 'Back',
              ),
              const SizedBox(width: 8),
              Text(
                'Order #${id.length > 8 ? id.substring(0, 8) : id}',
                style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF0F172A),
                ),
              ),
              const Spacer(),
              if (_updating)
                const SizedBox(
                  height: 18,
                  width: 18,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
            ],
          ),
          const SizedBox(height: 16),
          Wrap(
            spacing: 12,
            runSpacing: 12,
            children: [
              _InfoCard(
                title: 'Status',
                child: FormSelect<String>(
                  label: 'Status',
                  showLabel: false,
                  value: status.isEmpty ? null : status,
                  items: const [
                    DropdownMenuItem(value: 'PENDING', child: Text('PENDING')),
                    DropdownMenuItem(
                      value: 'CONFIRMED',
                      child: Text('CONFIRMED'),
                    ),
                    DropdownMenuItem(value: 'SHIPPED', child: Text('SHIPPED')),
                    DropdownMenuItem(
                      value: 'DELIVERED',
                      child: Text('DELIVERED'),
                    ),
                    DropdownMenuItem(
                      value: 'CANCELLED',
                      child: Text('CANCELLED'),
                    ),
                    DropdownMenuItem(
                      value: 'RETURNED',
                      child: Text('RETURNED'),
                    ),
                  ],
                  onChanged: _updating
                      ? null
                      : (v) {
                          if (v == null) return;
                          _updateStatus(v);
                        },
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 10,
                  ),
                ),
              ),
              _InfoCard(
                title: 'Total',
                child: Text(
                  NumberFormat.simpleCurrency().format(totalAmount),
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
              ),
              _InfoCard(
                title: 'Created',
                child: Text(
                  DateFormat.yMd().add_jm().format(createdAt),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          _InfoCard(
            title: 'Customer',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  customerName.isNotEmpty ? customerName : '—',
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 4),
                Text(customerPhone.isNotEmpty ? customerPhone : '—'),
                const SizedBox(height: 4),
                Text(customerAddress.isNotEmpty ? customerAddress : '—'),
              ],
            ),
          ),
          const SizedBox(height: 16),
          _InfoCard(
            title: 'Items',
            child: items.isEmpty
                ? const Text('No items')
                : Column(
                    children: [
                      for (final item in items) _OrderItemRow(item: item),
                    ],
                  ),
          ),
        ],
      ),
    );
  }
}

class _InfoCard extends StatelessWidget {
  final String title;
  final Widget child;

  const _InfoCard({required this.title, required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(minWidth: 260),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: Color(0xFF64748B),
              letterSpacing: 0.2,
            ),
          ),
          const SizedBox(height: 10),
          child,
        ],
      ),
    );
  }
}

class _OrderItemRow extends StatelessWidget {
  final OrderItem item;

  const _OrderItemRow({required this.item});

  @override
  Widget build(BuildContext context) {
    final qty = item.quantity;
    final price = item.price;
    final title = item.productId.isNotEmpty ? item.productId : 'Item';

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
              ],
            ),
          ),
          Text('x$qty', style: const TextStyle(fontWeight: FontWeight.w600)),
          const SizedBox(width: 16),
          Text(NumberFormat.simpleCurrency().format(price)),
        ],
      ),
    );
  }
}
