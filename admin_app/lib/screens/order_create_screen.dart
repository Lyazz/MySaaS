import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../providers/orders_provider.dart';
import '../providers/customers_provider.dart';
import '../providers/products_provider.dart';
import '../providers/store_settings_provider.dart';
import '../models/customer.dart';
import '../models/product.dart';
import '../theme/app_theme.dart';
import '../utils/tenant_currency.dart';
import '../widgets/form/form_input.dart';
import '../widgets/form/form_select.dart';
import '../widgets/buttons/app_button.dart';
import 'package:easy_localization/easy_localization.dart';
import '../utils/app_toasts.dart';

const _wilayas = [
  ('01', 'Adrar'),
  ('02', 'Chlef'),
  ('03', 'Laghouat'),
  ('04', 'Oum El Bouaghi'),
  ('05', 'Batna'),
  ('06', 'Béjaïa'),
  ('07', 'Biskra'),
  ('08', 'Béchar'),
  ('09', 'Blida'),
  ('10', 'Bouira'),
  ('11', 'Tamanrasset'),
  ('12', 'Tébessa'),
  ('13', 'Tlemcen'),
  ('14', 'Tiaret'),
  ('15', 'Tizi Ouzou'),
  ('16', 'Alger'),
  ('17', 'Djelfa'),
  ('18', 'Jijel'),
  ('19', 'Sétif'),
  ('20', 'Saïda'),
  ('21', 'Skikda'),
  ('22', 'Sidi Bel Abbès'),
  ('23', 'Annaba'),
  ('24', 'Guelma'),
  ('25', 'Constantine'),
  ('26', 'Médéa'),
  ('27', 'Mostaganem'),
  ('28', "M'Sila"),
  ('29', 'Mascara'),
  ('30', 'Ouargla'),
  ('31', 'Oran'),
  ('32', 'El Bayadh'),
  ('33', 'Illizi'),
  ('34', 'Bordj Bou Arréridj'),
  ('35', 'Boumerdès'),
  ('36', 'El Tarf'),
  ('37', 'Tindouf'),
  ('38', 'Tissemsilt'),
  ('39', 'El Oued'),
  ('40', 'Khenchela'),
  ('41', 'Souk Ahras'),
  ('42', 'Tipaza'),
  ('43', 'Mila'),
  ('44', 'Aïn Defla'),
  ('45', 'Naâma'),
  ('46', 'Aïn Témouchent'),
  ('47', 'Ghardaïa'),
  ('48', 'Relizane'),
  ('49', 'Timimoun'),
  ('50', 'Bordj Badji Mokhtar'),
  ('51', 'Ouled Djellal'),
  ('52', 'Béni Abbès'),
  ('53', 'In Salah'),
  ('54', 'In Guezzam'),
  ('55', 'Touggourt'),
  ('56', 'Djanet'),
  ('57', "El M'Ghair"),
  ('58', 'El Meniaa'),
];

class _CartItem {
  final String productId;
  final String? variantId;
  final String title;
  final String? variantLabel;
  final double price;
  int quantity;

  _CartItem({
    required this.productId,
    this.variantId,
    required this.title,
    this.variantLabel,
    required this.price,
    this.quantity = 1,
  });
}

class OrderCreateScreen extends ConsumerStatefulWidget {
  const OrderCreateScreen({super.key});

  @override
  ConsumerState<OrderCreateScreen> createState() => _OrderCreateScreenState();
}

class _OrderCreateScreenState extends ConsumerState<OrderCreateScreen> {
  final _formKey = GlobalKey<FormState>();
  final _customerNameCtrl = TextEditingController();
  final _customerPhoneCtrl = TextEditingController();
  final _addressCtrl = TextEditingController();
  final _notesCtrl = TextEditingController();
  final _productSearchCtrl = TextEditingController();

  String? _selectedCustomerId;
  String _shippingProvider = '';
  String _deliveryMode = 'home';
  String _selectedWilaya = '';
  final List<_CartItem> _cart = [];
  bool _submitting = false;
  List<Product> _searchResults = [];

  @override
  void dispose() {
    _customerNameCtrl.dispose();
    _customerPhoneCtrl.dispose();
    _addressCtrl.dispose();
    _notesCtrl.dispose();
    _productSearchCtrl.dispose();
    super.dispose();
  }

  double get _cartTotal =>
      _cart.fold(0, (sum, i) => sum + i.price * i.quantity);

  bool get _canSubmit =>
      _customerNameCtrl.text.trim().isNotEmpty && _cart.isNotEmpty;

  void _onCustomerSelected(String? id) {
    if (id == null || id.isEmpty) {
      setState(() {
        _selectedCustomerId = null;
        _customerNameCtrl.clear();
        _customerPhoneCtrl.clear();
      });
      return;
    }
    final customers = ref.read(customersProvider).customers;
    final idx = customers.indexWhere((c) => c.id == id);
    if (idx == -1) return;
    final c = customers[idx];
    setState(() {
      _selectedCustomerId = id;
      _customerNameCtrl.text = c.name;
      _customerPhoneCtrl.text = c.phone;
    });
  }

  void _onProductSearchChanged(String query) {
    if (query.trim().isEmpty) {
      setState(() => _searchResults = []);
      return;
    }
    final q = query.toLowerCase();
    final all = ref.read(productsProvider).products;
    setState(() {
      _searchResults = all
          .where((p) => p.title.toLowerCase().contains(q))
          .take(5)
          .toList();
    });
  }

  void _addToCart(Product product) {
    final existing = _cart.indexWhere(
      (i) => i.productId == product.id && i.variantId == null,
    );
    setState(() {
      if (existing != -1) {
        _cart[existing].quantity++;
      } else {
        _cart.add(
          _CartItem(
            productId: product.id,
            title: product.title,
            price: product.price,
          ),
        );
      }
      _productSearchCtrl.clear();
      _searchResults = [];
    });
  }

  Future<void> _submit() async {
    if (!_canSubmit) return;
    setState(() => _submitting = true);
    try {
      final payload = {
        if (_selectedCustomerId != null) 'customerId': _selectedCustomerId,
        'customerName': _customerNameCtrl.text.trim(),
        'customerPhone': _customerPhoneCtrl.text.trim(),
        if (_shippingProvider.isNotEmpty) 'shippingProvider': _shippingProvider,
        'deliveryMode': _deliveryMode,
        if (_selectedWilaya.isNotEmpty) 'shippingWilayaCode': _selectedWilaya,
        if (_addressCtrl.text.trim().isNotEmpty)
          'shippingAddressLine1': _addressCtrl.text.trim(),
        if (_notesCtrl.text.trim().isNotEmpty)
          'shippingNotes': _notesCtrl.text.trim(),
        'items': _cart
            .map(
              (i) => {
                'productId': i.productId,
                'variantId': i.variantId,
                'quantity': i.quantity,
                'price': i.price,
              },
            )
            .toList(),
      };
      final orderId = await ref
          .read(ordersProvider.notifier)
          .createOrder(payload);
      if (mounted) {
        context.replace('/orders/$orderId');
      }
    } catch (e) {
      if (mounted) {
        AppToasts.show(context, 'Error: $e');
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final customers = ref.watch(customersProvider).customers;
    final storeSettings = ref.watch(storeSettingsProvider).settings;
    final currencyCode = tenantCurrencyCode(storeSettings);
    final isWide = MediaQuery.of(context).size.width > 900;

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(LucideIcons.arrowLeft),
          onPressed: () => context.pop(),
        ),
        title: Text('admin.pages.orders.index.addBtn'.tr()),
      ),
      body: Form(
        key: _formKey,
        child: isWide
            ? Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(child: _buildDetailsColumn(customers)),
                  SizedBox(
                    width: 420,
                    child: _buildCartColumn(
                      bounded: true,
                      currencyCode: currencyCode,
                    ),
                  ),
                ],
              )
            : SingleChildScrollView(
                child: Column(
                  children: [
                    _buildDetailsColumn(customers),
                    _buildCartColumn(
                      bounded: false,
                      currencyCode: currencyCode,
                    ),
                  ],
                ),
              ),
      ),
    );
  }

  Widget _buildDetailsColumn(List<Customer> customers) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          _buildCard(
            icon: LucideIcons.user,
            title: 'admin.pages.sales.index.table.customer'.tr(),
            child: Column(
              children: [
                FormSelect<String>(
                  label: 'app.select_existing_customer_optio'.tr(),
                  value: _selectedCustomerId ?? '',
                  items: [
                    DropdownMenuItem(
                      value: '',
                      child: Text('app.new_customer'.tr()),
                    ),
                    ...customers.map(
                      (c) => DropdownMenuItem(
                        value: c.id,
                        child: Text(
                          '${c.name}${c.phone.isNotEmpty ? " (${c.phone})" : ""}',
                        ),
                      ),
                    ),
                  ],
                  onChanged: _onCustomerSelected,
                ),
                const SizedBox(height: 12),
                FormInput(
                  label: 'app.customer_name'.tr(),
                  controller: _customerNameCtrl,
                  enabled: _selectedCustomerId == null,
                  validator: (v) =>
                      (v == null || v.trim().isEmpty) ? 'Required' : null,
                  onChanged: (_) => setState(() {}),
                ),
                const SizedBox(height: 12),
                FormInput(
                  label: 'admin.pages.sales.detail.fields.customerPhone'.tr(),
                  controller: _customerPhoneCtrl,
                  enabled: _selectedCustomerId == null,
                  keyboardType: TextInputType.phone,
                ),
              ],
            ),
          ),
          SizedBox(height: 16),
          _buildCard(
            icon: LucideIcons.truck,
            title: 'storefront.cart.summary.shipping'.tr(),
            child: Column(
              children: [
                FormSelect<String>(
                  label: 'app.provider'.tr(),
                  value: _shippingProvider,
                  items: [
                    DropdownMenuItem(
                      value: '',
                      child: Text(
                        'admin.pages.products.edit.bundlesTab.tags.none'.tr(),
                      ),
                    ),
                    DropdownMenuItem(
                      value: 'YALIDINE',
                      child: Text('app.yalidine'.tr()),
                    ),
                    DropdownMenuItem(
                      value: 'MAYSTRO',
                      child: Text('app.maystro'.tr()),
                    ),
                    DropdownMenuItem(
                      value: 'SELF',
                      child: Text(
                        'storefront.checkout.delivery.provider.self'.tr(),
                      ),
                    ),
                  ],
                  onChanged: (v) => setState(() => _shippingProvider = v ?? ''),
                ),
                SizedBox(height: 12),
                FormSelect<String>(
                  label: 'admin.pages.orders.create.deliveryMode'.tr(),
                  value: _deliveryMode,
                  items: [
                    DropdownMenuItem(
                      value: 'home',
                      child: Text(
                        'admin.pages.delivery.pricing.modes.home'.tr(),
                      ),
                    ),
                    DropdownMenuItem(
                      value: 'pickup',
                      child: Text('app.stop_desk'.tr()),
                    ),
                  ],
                  onChanged: (v) => setState(() => _deliveryMode = v ?? 'home'),
                ),
                const SizedBox(height: 12),
                FormSelect<String>(
                  label: 'admin.pages.orders.create.wilaya'.tr(),
                  value: _selectedWilaya,
                  items: [
                    DropdownMenuItem(value: '', child: Text('app.select'.tr())),
                    ..._wilayas.map(
                      (w) => DropdownMenuItem(
                        value: w.$1,
                        child: Text('${w.$1} - ${w.$2}'),
                      ),
                    ),
                  ],
                  onChanged: (v) => setState(() => _selectedWilaya = v ?? ''),
                ),
                const SizedBox(height: 12),
                FormInput(
                  label: 'admin.pages.suppliers.index.table.address'.tr(),
                  controller: _addressCtrl,
                ),
                const SizedBox(height: 12),
                FormInput(
                  label: 'superAdmin.paymentsPage.import.fields.notes'.tr(),
                  controller: _notesCtrl,
                  maxLines: 2,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCartColumn({
    required bool bounded,
    required String currencyCode,
  }) {
    final searchBar = Padding(
      padding: const EdgeInsets.all(12),
      child: Column(
        children: [
          TextField(
            controller: _productSearchCtrl,
            decoration: InputDecoration(
              hintText: 'admin.pages.pos.catalog.searchPlaceholder'.tr(),
              prefixIcon: Icon(LucideIcons.search, size: 18),
              border: OutlineInputBorder(),
              isDense: true,
            ),
            onChanged: _onProductSearchChanged,
          ),
          if (_searchResults.isNotEmpty)
            Builder(
              builder: (context) {
                final isDark = Theme.of(context).brightness == Brightness.dark;
                return Container(
                  decoration: BoxDecoration(
                    border: Border.all(
                      color: isDark
                          ? AppColors.surfaceBorder
                          : AppColors.lightSurfaceBorder,
                    ),
                    borderRadius: BorderRadius.circular(8),
                    color: Theme.of(context).colorScheme.surface,
                  ),
                  child: Column(
                    children: _searchResults
                        .map(
                          (p) => ListTile(
                            dense: true,
                            title: Text(
                              p.title,
                              style: const TextStyle(fontSize: 13),
                            ),
                            subtitle: Text(
                              '${p.price.toStringAsFixed(0)} $currencyCode',
                              style: const TextStyle(fontSize: 12),
                            ),
                            onTap: () => _addToCart(p),
                          ),
                        )
                        .toList(),
                  ),
                );
              },
            ),
        ],
      ),
    );

    final cartList = _cart.isEmpty
        ? Padding(
            padding: EdgeInsets.symmetric(vertical: 24),
            child: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    LucideIcons.shoppingCart,
                    size: 32,
                    color: Color(0xFF94A3B8),
                  ),
                  SizedBox(height: 8),
                  Text(
                    'admin.pages.orders.create.emptyCart'.tr(),
                    style: TextStyle(color: Color(0xFF94A3B8)),
                  ),
                ],
              ),
            ),
          )
        : ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            padding: const EdgeInsets.symmetric(horizontal: 12),
            itemCount: _cart.length,
            itemBuilder: (ctx, i) {
              final item = _cart[i];
              return Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: Padding(
                  padding: const EdgeInsets.all(10),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              item.title,
                              style: const TextStyle(
                                fontWeight: FontWeight.w500,
                                fontSize: 13,
                              ),
                            ),
                            if (item.variantLabel != null)
                              Text(
                                item.variantLabel!,
                                style: const TextStyle(
                                  fontSize: 11,
                                  color: Color(0xFF94A3B8),
                                ),
                              ),
                            Text(
                              '${(item.price * item.quantity).toStringAsFixed(0)} $currencyCode',
                              style: const TextStyle(
                                color: Color(0xFF6366F1),
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          IconButton(
                            icon: const Icon(LucideIcons.minus, size: 16),
                            onPressed: item.quantity > 1
                                ? () => setState(() => item.quantity--)
                                : null,
                          ),
                          Text('${item.quantity}'),
                          IconButton(
                            icon: const Icon(LucideIcons.plus, size: 16),
                            onPressed: () => setState(() => item.quantity++),
                          ),
                          IconButton(
                            icon: const Icon(
                              LucideIcons.x,
                              size: 16,
                              color: Color(0xFFEF4444),
                            ),
                            onPressed: () => setState(() => _cart.removeAt(i)),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              );
            },
          );

    final isDark = Theme.of(context).brightness == Brightness.dark;
    final footer = Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        border: Border(
          top: BorderSide(
            color: isDark
                ? AppColors.surfaceBorder
                : AppColors.lightSurfaceBorder,
          ),
        ),
        color: Theme.of(context).colorScheme.surface,
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'admin.pages.sales.detail.itemsTable.total'.tr(),
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              Text(
                '${_cartTotal.toStringAsFixed(0)} $currencyCode',
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF6366F1),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          AppButton(
            label: _submitting ? 'Processing...' : 'Place Order',
            onPressed: _canSubmit && !_submitting ? _submit : null,
            loading: _submitting,
            icon: LucideIcons.checkCircle,
          ),
        ],
      ),
    );

    final decoration = BoxDecoration(
      border: Border(
        left: BorderSide(
          color: isDark
              ? AppColors.surfaceBorder
              : AppColors.lightSurfaceBorder,
        ),
      ),
    );

    if (bounded) {
      // Wide layout: use Expanded for the list so it fills remaining space
      return Container(
        decoration: decoration,
        child: Column(
          children: [
            searchBar,
            Expanded(child: SingleChildScrollView(child: cartList)),
            footer,
          ],
        ),
      );
    } else {
      // Narrow layout: everything is in a scrollable column already
      return Container(
        decoration: decoration,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [searchBar, cartList, footer],
        ),
      );
    }
  }

  Widget _buildCard({
    required IconData icon,
    required String title,
    required Widget child,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark
              ? AppColors.surfaceBorder
              : AppColors.lightSurfaceBorder,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Icon(icon, size: 18, color: const Color(0xFF6366F1)),
                const SizedBox(width: 8),
                Text(
                  title,
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          Padding(padding: const EdgeInsets.all(16), child: child),
        ],
      ),
    );
  }
}
