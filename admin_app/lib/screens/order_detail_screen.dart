import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:google_fonts/google_fonts.dart';

import '../models/order.dart';
import '../repositories/order_repository.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../providers/store_settings_provider.dart';
import '../utils/app_toasts.dart';
import '../utils/tenant_currency.dart';
import '../widgets/form/form_select.dart';
import '../widgets/buttons/app_button.dart';
import '../widgets/badges/status_badges.dart';

class DashedDivider extends StatelessWidget {
  final Color color;
  const DashedDivider({super.key, required this.color});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 1,
      width: double.infinity,
      child: CustomPaint(painter: _DashedLinePainter(color: color)),
    );
  }
}

class _DashedLinePainter extends CustomPainter {
  final Color color;
  _DashedLinePainter({required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    var paint = Paint()
      ..color = color
      ..strokeWidth = 1
      ..style = PaintingStyle.stroke;

    var max = size.width;
    var dashWidth = 4.0;
    var dashSpace = 4.0;
    double startY = 0;

    while (startY < max) {
      canvas.drawLine(Offset(startY, 0), Offset(startY + dashWidth, 0), paint);
      startY += dashWidth + dashSpace;
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

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

  late TextEditingController _notesController;
  String _callStatus = 'not_called';
  String _orderStatus = 'PENDING';

  @override
  void initState() {
    super.initState();
    _notesController = TextEditingController();
    Future.microtask(_load);
  }

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
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
        _notesController.text = order.internalNotes ?? '';
        _callStatus = order.callStatus.isEmpty
            ? 'not_called'
            : order.callStatus;
        _orderStatus = order.status.isEmpty ? 'PENDING' : order.status;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  Future<void> _updateStatus() async {
    if (_order == null) return;
    setState(() {
      _updating = true;
      _error = null;
    });

    try {
      final api = ref.read(apiProvider);
      final repo = OrderRepository(api);
      await repo.updateStatus(widget.orderId, _orderStatus);
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

  Future<void> _updateCallStatus(String callStatus) async {
    if (_order == null) return;
    setState(() => _updating = true);
    try {
      final api = ref.read(apiProvider);
      final repo = OrderRepository(api);
      await repo.updateCallStatus(widget.orderId, callStatus);
      setState(() {
        _callStatus = callStatus;
        _updating = false;
      });
    } catch (e) {
      if (mounted) setState(() => _updating = false);
    }
  }

  Future<void> _updateNotes() async {
    if (_order == null) return;
    setState(() => _updating = true);
    try {
      final api = ref.read(apiProvider);
      final repo = OrderRepository(api);
      await repo.updateInternalNotes(widget.orderId, _notesController.text);
      if (mounted) setState(() => _updating = false);
    } catch (e) {
      if (mounted) setState(() => _updating = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final money = tenantCurrencyFormatter(
      ref.watch(storeSettingsProvider).settings,
    );

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
    final fallbackId = id.length > 8 ? id.substring(0, 8) : id;
    final publicId = order.publicId ?? '#${fallbackId.toUpperCase()}';

    return Theme(
      data: Theme.of(context).copyWith(
        textTheme: GoogleFonts.dmSansTextTheme(Theme.of(context).textTheme),
      ),
      child: DefaultTextStyle(
        style: GoogleFonts.dmSans(
          color: Theme.of(context).colorScheme.onSurface,
        ),
        child: Scaffold(
          backgroundColor: Theme.of(context).colorScheme.surface,
          body: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 800),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    _buildHeaderStrip(context, order, publicId, money),
                    const SizedBox(height: 24),

                    if (order.status == 'PENDING') ...[
                      _buildCallPanel(context),
                      const SizedBox(height: 24),
                    ],

                    _buildItemsCard(context, order, money),
                    const SizedBox(height: 24),

                    _buildDeliveryCard(context, order),
                    const SizedBox(height: 24),

                    _buildStatusCard(context, order),
                    const SizedBox(height: 24),

                    _buildPreviousOrdersCard(context, order, money),
                    const SizedBox(
                      height: 64,
                    ), // extra bottom padding for scroll
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Color _getStatusAccentColor(String status) {
    switch (status) {
      case 'PENDING':
        return const Color(0xFFF59E0B);
      case 'CONFIRMED':
        return const Color(0xFF6366F1);
      case 'SHIPPED':
        return const Color(0xFF14B8A6);
      case 'DELIVERED':
        return const Color(0xFF10B981);
      case 'CANCELLED':
        return const Color(0xFFF43F5E);
      case 'RETURNED':
        return const Color(0xFF64748B);
      default:
        return const Color(0xFF94A3B8);
    }
  }

  Widget _buildHeaderStrip(
    BuildContext context,
    Order order,
    String publicId,
    NumberFormat money,
  ) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final borderColor = isDark
        ? AppColors.surfaceBorder
        : AppColors.lightSurfaceBorder;
    final accentColor = _getStatusAccentColor(order.status);
    final surfaceColor = Theme.of(context).colorScheme.surface;

    return Container(
      decoration: BoxDecoration(
        color: surfaceColor,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: borderColor),
      ),
      clipBehavior: Clip.antiAlias,
      child: Stack(
        children: [
          // Main Content
          Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Top Row: Breadcrumb
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                child: Row(
                  children: [
                    InkWell(
                      onTap: () => context.go('/orders'),
                      child: Row(
                        children: [
                          const Icon(LucideIcons.arrowLeft, size: 14),
                          const SizedBox(width: 6),
                          Text(
                            'Orders',
                            style: TextStyle(
                              color: Theme.of(
                                context,
                              ).colorScheme.onSurface.withValues(alpha: 0.8),
                              fontSize: 13,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Text(
                      '  /  ',
                      style: TextStyle(
                        color: Theme.of(
                          context,
                        ).colorScheme.onSurface.withValues(alpha: 0.4),
                      ),
                    ),
                    Text(
                      'Placed ${DateFormat.yMd().add_jm().format(order.createdAt)}',
                      style: TextStyle(
                        color: Theme.of(
                          context,
                        ).colorScheme.onSurface.withValues(alpha: 0.6),
                        fontSize: 13,
                      ),
                    ),
                    const Spacer(),
                    if (_updating)
                      const SizedBox(
                        height: 14,
                        width: 14,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                  ],
                ),
              ),

              // Title Row: ID
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Text(
                          publicId,
                          style: TextStyle(
                            fontSize: 28,
                            fontWeight: FontWeight.w700,
                            letterSpacing: -0.02 * 28,
                            color: Theme.of(context).colorScheme.onSurface,
                          ),
                        ),
                        const SizedBox(width: 8),
                        InkWell(
                          onTap: () {
                            Clipboard.setData(ClipboardData(text: publicId));
                            AppToasts.show(context, 'Copied to clipboard');
                          },
                          borderRadius: BorderRadius.circular(4),
                          child: const Padding(
                            padding: EdgeInsets.all(4),
                            child: Icon(LucideIcons.copy, size: 16),
                          ),
                        ),
                        const SizedBox(width: 12),
                        _buildStatusBadge(context, order.status, accentColor),
                      ],
                    ),
                  ],
                ),
              ),

              // Customer row
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                child: Row(
                  children: [
                    Text(
                      order.customerName.isNotEmpty ? order.customerName : '—',
                      style: const TextStyle(
                        fontWeight: FontWeight.w500,
                        fontSize: 14,
                      ),
                    ),
                    const SizedBox(width: 12),
                    InkWell(
                      onTap: () {},
                      child: Row(
                        children: [
                          Icon(
                            LucideIcons.phone,
                            size: 14,
                            color: Theme.of(context).colorScheme.primary,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            order.customerPhone,
                            style: GoogleFonts.jetBrainsMono(
                              color: Theme.of(context).colorScheme.primary,
                              fontSize: 13,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 6),
                    InkWell(
                      onTap: () {
                        Clipboard.setData(
                          ClipboardData(text: order.customerPhone),
                        );
                        AppToasts.show(context, 'Copied phone');
                      },
                      borderRadius: BorderRadius.circular(4),
                      child: const Padding(
                        padding: EdgeInsets.all(4),
                        child: Icon(LucideIcons.copy, size: 14),
                      ),
                    ),
                  ],
                ),
              ),

              // Totals strip
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: DashedDivider(color: borderColor),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 12,
                ),
                decoration: const BoxDecoration(
                  borderRadius: BorderRadius.vertical(
                    bottom: Radius.circular(13),
                  ),
                ),
                child: Wrap(
                  spacing: 16,
                  runSpacing: 8,
                  children: [
                    _buildTotalItem(
                      context,
                      'Total',
                      money.format(order.totalAmount),
                    ),
                    _buildTotalItem(
                      context,
                      'Shipping',
                      order.shippingAmount != null
                          ? money.format(order.shippingAmount)
                          : '—',
                    ),
                    _buildTotalItem(
                      context,
                      'Total (w/ delivery)',
                      money.format(
                        order.totalWithShippingAmount ?? order.totalAmount,
                      ),
                      strong: true,
                    ),
                    _buildTotalItem(context, 'Items', '${order.items.length}'),
                  ],
                ),
              ),
            ],
          ),
          // Left Accent Bar
          Positioned(
            left: 0,
            top: 0,
            bottom: 0,
            width: 4,
            child: Container(color: accentColor),
          ),
        ],
      ),
    );
  }

  Widget _buildTotalItem(
    BuildContext context,
    String label,
    String value, {
    bool strong = false,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 10,
            fontWeight: FontWeight.w600,
            letterSpacing: 0.08 * 10,
            color: Theme.of(
              context,
            ).colorScheme.onSurface.withValues(alpha: 0.5),
          ),
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: GoogleFonts.jetBrainsMono(
            fontSize: 13,
            fontWeight: strong ? FontWeight.w600 : FontWeight.w500,
            color: strong
                ? Theme.of(context).colorScheme.onSurface
                : Theme.of(
                    context,
                  ).colorScheme.onSurface.withValues(alpha: 0.8),
          ),
        ),
      ],
    );
  }

  Widget _buildStatusBadge(BuildContext context, String status, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Text(
        status.toUpperCase(),
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w600,
          letterSpacing: 0.08 * 10,
          color: color,
        ),
      ),
    );
  }

  Widget _buildCallPanel(BuildContext context) {
    return _SectionCard(
      title: 'Call panel',
      icon: LucideIcons.phoneCall,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _buildCallPill('not_called', 'Not called', LucideIcons.phone),
              _buildCallPill('answered', 'Answered', LucideIcons.phoneOutgoing),
              _buildCallPill('no_answer', 'No answer', LucideIcons.phoneOff),
              _buildCallPill(
                'unreachable',
                'Unreachable',
                LucideIcons.phoneMissed,
              ),
            ],
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _notesController,
            maxLines: 3,
            style: const TextStyle(fontSize: 14),
            decoration: InputDecoration(
              hintText: 'Add private remarks about this order...',
              filled: true,
              fillColor: Theme.of(context).brightness == Brightness.dark
                  ? const Color(0xFF1E1E1E)
                  : const Color(0xFFF9FAFB),
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 12,
                vertical: 10,
              ),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: BorderSide(
                  color: Theme.of(context).brightness == Brightness.dark
                      ? AppColors.surfaceBorder
                      : AppColors.lightSurfaceBorder,
                ),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: BorderSide(
                  color: Theme.of(context).brightness == Brightness.dark
                      ? AppColors.surfaceBorder
                      : AppColors.lightSurfaceBorder,
                ),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: BorderSide(
                  color: Theme.of(context).colorScheme.primary,
                  width: 2,
                ),
              ),
            ),
            onSubmitted: (_) => _updateNotes(),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Icon(
                LucideIcons.eyeOff,
                size: 12,
                color: Theme.of(
                  context,
                ).colorScheme.onSurface.withValues(alpha: 0.5),
              ),
              const SizedBox(width: 6),
              Text(
                'Notes are only visible to your team.',
                style: TextStyle(
                  fontSize: 11,
                  color: Theme.of(
                    context,
                  ).colorScheme.onSurface.withValues(alpha: 0.5),
                ),
              ),
              const Spacer(),
              SizedBox(
                height: 32,
                child: AppButton.secondary(
                  label: 'Save Notes',
                  onPressed: _updateNotes,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildCallPill(String value, String label, IconData icon) {
    final isSelected = _callStatus == value;
    final theme = Theme.of(context);
    final color = isSelected
        ? theme.colorScheme.primary
        : theme.colorScheme.onSurface.withValues(alpha: 0.6);
    final bgColor = isSelected
        ? theme.colorScheme.primary.withValues(alpha: 0.1)
        : Colors.transparent;
    final borderColor = isSelected
        ? theme.colorScheme.primary
        : (theme.brightness == Brightness.dark
              ? AppColors.surfaceBorder
              : AppColors.lightSurfaceBorder);

    return InkWell(
      onTap: () => _updateCallStatus(value),
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: bgColor,
          border: Border.all(color: borderColor),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 14, color: color),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                fontSize: 13,
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                color: color,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildItemsCard(
    BuildContext context,
    Order order,
    NumberFormat money,
  ) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final borderColor = isDark
        ? AppColors.surfaceBorder
        : AppColors.lightSurfaceBorder;

    return _SectionCard(
      title: 'Order items',
      icon: LucideIcons.package,
      trailing: Container(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 0),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Text(
          '${order.items.length}',
          style: GoogleFonts.jetBrainsMono(
            fontSize: 10,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      contentPadding: EdgeInsets.zero,
      child: order.items.isEmpty
          ? const Padding(padding: EdgeInsets.all(18), child: Text('No items'))
          : Column(
              children: [
                for (var i = 0; i < order.items.length; i++)
                  _OrderItemRow(
                    item: order.items[i],
                    money: money,
                    isLast: i == order.items.length - 1,
                    borderColor: borderColor,
                  ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 18,
                    vertical: 16,
                  ),
                  decoration: BoxDecoration(
                    color: isDark
                        ? const Color(0x08FFFFFF)
                        : const Color(0x08000000),
                    borderRadius: const BorderRadius.vertical(
                      bottom: Radius.circular(13),
                    ),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'TOTAL',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          letterSpacing: 0.08 * 11,
                          color: Theme.of(
                            context,
                          ).colorScheme.onSurface.withValues(alpha: 0.5),
                        ),
                      ),
                      Text(
                        money.format(order.totalAmount),
                        style: TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w700,
                          color: Theme.of(context).colorScheme.primary,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
    );
  }

  Widget _buildDeliveryCard(BuildContext context, Order order) {
    return _SectionCard(
      title: 'Delivery & customer',
      icon: LucideIcons.truck,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _buildInfoRow(context, 'Customer Name', order.customerName),
          _buildInfoRow(
            context,
            'Customer Phone',
            order.customerPhone,
            isPhone: true,
          ),
          _buildInfoRow(
            context,
            'Address',
            order.customerAddress.isNotEmpty ? order.customerAddress : '—',
          ),
          _buildInfoRow(context, 'Provider', order.shippingProvider ?? '—'),
          _buildInfoRow(context, 'Mode', order.deliveryMode),
          if (order.shippingPickupPoint != null)
            _buildInfoRow(context, 'Stop desk', '${order.shippingPickupPoint}'),
          if (order.shippingWilayaCode != null ||
              order.shippingCommuneCode != null)
            _buildInfoRow(
              context,
              'Wilaya / Commune',
              '${order.shippingWilayaCode ?? ''} / ${order.shippingCommuneCode ?? ''}',
              isLast: true,
            ),
        ],
      ),
    );
  }

  Widget _buildInfoRow(
    BuildContext context,
    String label,
    String value, {
    bool isPhone = false,
    bool isLast = false,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final borderColor = isDark
        ? AppColors.surfaceBorder
        : AppColors.lightSurfaceBorder;

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 10),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label.toUpperCase(),
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 0.08 * 11,
                  color: Theme.of(
                    context,
                  ).colorScheme.onSurface.withValues(alpha: 0.5),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: isPhone
                    ? Row(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          Text(
                            value,
                            style: TextStyle(
                              fontSize: 14,
                              color: Theme.of(context).colorScheme.onSurface,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          const SizedBox(width: 6),
                          Icon(
                            LucideIcons.copy,
                            size: 12,
                            color: Theme.of(
                              context,
                            ).colorScheme.onSurface.withValues(alpha: 0.5),
                          ),
                        ],
                      )
                    : Text(
                        value,
                        textAlign: TextAlign.right,
                        style: TextStyle(
                          fontSize: 14,
                          color: Theme.of(context).colorScheme.onSurface,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
              ),
            ],
          ),
        ),
        if (!isLast) DashedDivider(color: borderColor),
      ],
    );
  }

  Widget _buildStatusCard(BuildContext context, Order order) {
    return _SectionCard(
      title: 'Status Update',
      icon: LucideIcons.circleDashed,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          FormSelect<String>(
            label: 'Status',
            showLabel: false,
            value: _orderStatus,
            items: const [
              DropdownMenuItem(value: 'PENDING', child: Text('PENDING')),
              DropdownMenuItem(value: 'CONFIRMED', child: Text('CONFIRMED')),
              DropdownMenuItem(value: 'SHIPPED', child: Text('SHIPPED')),
              DropdownMenuItem(value: 'DELIVERED', child: Text('DELIVERED')),
              DropdownMenuItem(value: 'CANCELLED', child: Text('CANCELLED')),
              DropdownMenuItem(value: 'RETURNED', child: Text('RETURNED')),
            ],
            onChanged: _updating || order.status == 'DELIVERED'
                ? null
                : (v) {
                    if (v == null) return;
                    setState(() {
                      _orderStatus = v;
                    });
                  },
          ),
          const SizedBox(height: 12),
          AppButton.secondary(
            label: _updating ? 'Updating...' : 'Submit Update',
            onPressed:
                _updating ||
                    order.status == 'DELIVERED' ||
                    _orderStatus == order.status
                ? null
                : _updateStatus,
          ),
        ],
      ),
    );
  }

  String _previousOrdersMatchLabel(Order order) {
    final type = _previousOrdersMatchType(order);
    if (type == 'customer') {
      return 'Matched by linked customer record.';
    }
    if (type == 'phone') {
      return 'Matched by normalized phone number.';
    }
    return 'Phone could not be normalized.';
  }

  String _previousOrdersEmptyLabel(Order order) {
    final type = _previousOrdersMatchType(order);
    if (type == 'customer') {
      return 'No previous orders for this customer.';
    }
    if (type == 'phone') {
      return 'No previous orders for this phone.';
    }
    return 'Phone could not be normalized.';
  }

  String _previousOrdersMatchType(Order order) {
    final type = order.previousOrdersMatch?.type.trim().toLowerCase();
    if (type == 'customer' || type == 'phone') return type!;
    if (_normalizedAlgerianPhone(order) != null) return 'phone';
    return 'none';
  }

  String? _normalizedAlgerianPhone(Order order) {
    final stored = order.customerPhoneNormalized?.trim();
    if (stored != null && stored.isNotEmpty) return stored;

    final digits = order.customerPhone.replaceAll(RegExp(r'\D'), '');
    if (RegExp(r'^0[567]\d{8}$').hasMatch(digits)) {
      return '213${digits.substring(1)}';
    }
    if (RegExp(r'^[567]\d{8}$').hasMatch(digits)) {
      return '213$digits';
    }
    if (RegExp(r'^213[567]\d{8}$').hasMatch(digits)) {
      return digits;
    }
    if (RegExp(r'^00213[567]\d{8}$').hasMatch(digits)) {
      return digits.substring(2);
    }
    return null;
  }

  String _callStatusLabel(String status) {
    switch (status.trim()) {
      case 'called':
      case 'answered':
        return 'Called';
      case 'no_answer':
        return 'No answer';
      case 'attempt_1':
        return '1st attempt';
      case 'attempt_2':
        return '2nd attempt';
      case 'attempt_3':
        return '3rd attempt';
      case 'switched_off':
      case 'unreachable':
        return 'Unreachable';
      default:
        return 'Not called';
    }
  }

  String _deliveryModeLabel(String mode) {
    switch (mode.trim().toLowerCase()) {
      case 'pickup':
      case 'desk':
      case 'office':
        return 'Stop desk';
      case 'store':
        return 'Store pickup';
      default:
        return 'Home delivery';
    }
  }

  double _orderTotalWithShipping(Order order) {
    if (order.totalWithShippingAmount != null) {
      return order.totalWithShippingAmount!;
    }
    return order.totalAmount + (order.shippingAmount ?? 0);
  }

  String _previousOrderItemsSummary(Order order) {
    if (order.items.isEmpty) return 'No items';
    final visible = order.items.take(2).map((item) {
      final title = (item.productTitle ?? item.productId).trim().isEmpty
          ? 'Product'
          : (item.productTitle ?? item.productId).trim();
      final variant = item.variantLabel?.trim();
      final label = variant != null && variant.isNotEmpty
          ? '$title ($variant)'
          : title;
      return '$label ×${item.quantity}';
    }).toList();
    final remaining = order.items.length - visible.length;
    if (remaining > 0) visible.add('+ $remaining more');
    return visible.join(' · ');
  }

  Widget _buildPreviousOrdersCard(
    BuildContext context,
    Order order,
    NumberFormat money,
  ) {
    final previousOrders = order.previousOrders;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final borderColor = isDark
        ? AppColors.surfaceBorder
        : AppColors.lightSurfaceBorder;

    return _SectionCard(
      title: 'Previous orders',
      icon: LucideIcons.history,
      trailing: Container(
        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
        decoration: BoxDecoration(
          color: Theme.of(
            context,
          ).colorScheme.onSurface.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(999),
        ),
        child: Text(
          '${previousOrders.length}',
          style: GoogleFonts.jetBrainsMono(
            fontSize: 10,
            fontWeight: FontWeight.w600,
            color: Theme.of(
              context,
            ).colorScheme.onSurface.withValues(alpha: 0.7),
          ),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(
                LucideIcons.shieldCheck,
                size: 15,
                color: Theme.of(
                  context,
                ).colorScheme.onSurface.withValues(alpha: 0.5),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  _previousOrdersMatchLabel(order),
                  style: TextStyle(
                    fontSize: 12,
                    height: 1.35,
                    color: Theme.of(
                      context,
                    ).colorScheme.onSurface.withValues(alpha: 0.62),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (previousOrders.isEmpty)
            Container(
              constraints: const BoxConstraints(minHeight: 86),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Theme.of(
                  context,
                ).colorScheme.onSurface.withValues(alpha: 0.03),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: borderColor,
                  style: BorderStyle.solid,
                ),
              ),
              child: Center(
                child: Text(
                  _previousOrdersEmptyLabel(order),
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 12,
                    color: Theme.of(
                      context,
                    ).colorScheme.onSurface.withValues(alpha: 0.58),
                  ),
                ),
              ),
            )
          else
            Column(
              children: [
                for (var i = 0; i < previousOrders.length; i++) ...[
                  _PreviousOrderTile(
                    order: previousOrders[i],
                    money: money,
                    borderColor: borderColor,
                    callStatusLabel: _callStatusLabel,
                    deliveryModeLabel: _deliveryModeLabel,
                    totalWithShipping: _orderTotalWithShipping,
                    itemsSummary: _previousOrderItemsSummary,
                    onTap: () =>
                        context.push('/orders/${previousOrders[i].id}'),
                  ),
                  if (i != previousOrders.length - 1)
                    const SizedBox(height: 10),
                ],
              ],
            ),
        ],
      ),
    );
  }
}

class _PreviousOrderTile extends StatelessWidget {
  final Order order;
  final NumberFormat money;
  final Color borderColor;
  final String Function(String status) callStatusLabel;
  final String Function(String mode) deliveryModeLabel;
  final double Function(Order order) totalWithShipping;
  final String Function(Order order) itemsSummary;
  final VoidCallback onTap;

  const _PreviousOrderTile({
    required this.order,
    required this.money,
    required this.borderColor,
    required this.callStatusLabel,
    required this.deliveryModeLabel,
    required this.totalWithShipping,
    required this.itemsSummary,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final fallbackId = order.id.length > 8
        ? order.id.substring(0, 8)
        : order.id;
    final publicId = order.publicId ?? '#${fallbackId.toUpperCase()}';
    final textColor = Theme.of(context).colorScheme.onSurface;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: textColor.withValues(alpha: 0.03),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: borderColor),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    publicId,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.jetBrainsMono(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: textColor,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                OrderStatusBadge(status: order.status),
              ],
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 10,
              runSpacing: 4,
              children: [
                Text(
                  DateFormat.yMd().add_jm().format(order.createdAt),
                  style: TextStyle(
                    fontSize: 11,
                    color: textColor.withValues(alpha: 0.55),
                  ),
                ),
                Text(
                  callStatusLabel(order.callStatus),
                  style: TextStyle(
                    fontSize: 11,
                    color: textColor.withValues(alpha: 0.55),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              itemsSummary(order),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 12,
                height: 1.35,
                color: textColor.withValues(alpha: 0.74),
              ),
            ),
            const SizedBox(height: 10),
            DashedDivider(color: borderColor),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: Text(
                    deliveryModeLabel(order.deliveryMode),
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 11,
                      color: textColor.withValues(alpha: 0.55),
                    ),
                  ),
                ),
                Text(
                  money.format(totalWithShipping(order)),
                  style: GoogleFonts.jetBrainsMono(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: textColor,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  final String title;
  final IconData icon;
  final Widget child;
  final EdgeInsetsGeometry? contentPadding;
  final Widget? trailing;

  const _SectionCard({
    required this.title,
    required this.icon,
    required this.child,
    this.contentPadding,
    this.trailing,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final borderColor = isDark
        ? AppColors.surfaceBorder
        : AppColors.lightSurfaceBorder;

    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
            decoration: BoxDecoration(
              border: Border(bottom: BorderSide(color: borderColor)),
            ),
            child: Row(
              children: [
                Icon(
                  icon,
                  size: 16,
                  color: Theme.of(
                    context,
                  ).colorScheme.onSurface.withValues(alpha: 0.5),
                ),
                const SizedBox(width: 8),
                Text(
                  title.toUpperCase(),
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 0.08 * 12,
                    color: Theme.of(
                      context,
                    ).colorScheme.onSurface.withValues(alpha: 0.8),
                  ),
                ),
                if (trailing != null) ...[const SizedBox(width: 8), trailing!],
              ],
            ),
          ),
          Padding(
            padding: contentPadding ?? const EdgeInsets.all(18),
            child: child,
          ),
        ],
      ),
    );
  }
}

class _OrderItemRow extends StatelessWidget {
  final OrderItem item;
  final NumberFormat money;
  final bool isLast;
  final Color borderColor;

  const _OrderItemRow({
    required this.item,
    required this.money,
    this.isLast = false,
    required this.borderColor,
  });

  @override
  Widget build(BuildContext context) {
    final qty = item.quantity;
    final title = item.productTitle ?? item.productId;
    final lineTotal = item.lineTotal ?? (item.price * qty);

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  title.isNotEmpty ? title : 'Product',
                  style: TextStyle(
                    fontWeight: FontWeight.w500,
                    fontSize: 14,
                    color: Theme.of(context).colorScheme.onSurface,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Text(
                money.format(item.price),
                style: GoogleFonts.jetBrainsMono(
                  fontSize: 13,
                  color: Theme.of(
                    context,
                  ).colorScheme.onSurface.withValues(alpha: 0.6),
                ),
              ),
              const SizedBox(width: 12),
              Text(
                '×$qty',
                style: GoogleFonts.jetBrainsMono(
                  fontSize: 13,
                  color: Theme.of(
                    context,
                  ).colorScheme.onSurface.withValues(alpha: 0.6),
                ),
              ),
              const SizedBox(width: 16),
              SizedBox(
                width: 70,
                child: Text(
                  money.format(lineTotal),
                  textAlign: TextAlign.right,
                  style: GoogleFonts.jetBrainsMono(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: Theme.of(context).colorScheme.onSurface,
                  ),
                ),
              ),
            ],
          ),
        ),
        if (!isLast) Container(height: 1, color: borderColor),
        if (isLast)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 18),
            child: DashedDivider(color: borderColor),
          ),
      ],
    );
  }
}
