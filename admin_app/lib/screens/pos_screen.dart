import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../models/customer.dart';
import '../models/product.dart';
import '../models/pos_models.dart';
import '../providers/pos_provider.dart';
import '../providers/customers_provider.dart';
import '../providers/store_settings_provider.dart';
import '../services/api_service.dart';
import '../services/tenant_mode_service.dart';
import '../services/workspace_cache_service.dart';
import '../theme/app_theme.dart';
import '../utils/barcode_scanner.dart';
import '../utils/debouncer.dart';
import '../utils/pos_payment.dart';
import '../utils/tenant_currency.dart';
import '../widgets/numpad_widget.dart';
import '../widgets/smart_cash_suggestions.dart';
import '../widgets/buttons/app_button.dart';
import '../widgets/dialogs/app_dialog.dart';
import '../widgets/form/form_input.dart';
import '../widgets/shimmer_skeleton.dart';

class PosScreen extends ConsumerStatefulWidget {
  const PosScreen({super.key});

  @override
  ConsumerState<PosScreen> createState() => _PosScreenState();
}

class _PosScreenState extends ConsumerState<PosScreen> {
  static const double _compactBreakpoint = 700;
  static const double _cartDrawerBreakpoint = 1180;
  static const double _wideBreakpoint = 1440;
  static const double _desktopCategoryWidth = 124;
  static const double _productCardImageAspectRatio = 3 / 2;

  final TextEditingController _searchController = TextEditingController();
  final Debouncer _searchDebouncer = Debouncer(milliseconds: 300);
  late final BarcodeScannerBuffer _barcodeBuffer;
  bool _barcodeHandlerAttached = false;
  String? _lastHandledBarcode;
  DateTime? _lastHandledBarcodeAt;
  List<Product>? _cachedSourceProducts;
  ProductSortType? _cachedSortType;
  List<Product>? _cachedSortedProducts;
  List<Product>? _cachedFilterInput;
  String? _cachedFilterCategoryId;
  String _cachedFilterQuery = '';
  List<Product>? _cachedFilteredProducts;
  final Map<String, String?> _resolvedImageUrlCache = {};

  @override
  void initState() {
    super.initState();
    _barcodeBuffer = BarcodeScannerBuffer(
      interKeyTimeout: const Duration(milliseconds: 80),
      maxScanDuration: const Duration(milliseconds: 900),
      minLength: 3,
    );
    HardwareKeyboard.instance.addHandler(_handleBarcodeKeyEvent);
    _barcodeHandlerAttached = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(posProvider.notifier).loadSettings();
      ref.read(posProvider.notifier).fetchCategories();
      ref.read(posProvider.notifier).fetchProducts();
      ref.read(customersProvider.notifier).fetchCustomers(limit: 200);
    });
  }

  @override
  void dispose() {
    if (_barcodeHandlerAttached) {
      HardwareKeyboard.instance.removeHandler(_handleBarcodeKeyEvent);
      _barcodeHandlerAttached = false;
    }
    _searchDebouncer.dispose();
    _searchController.dispose();
    super.dispose();
  }

  bool _handleBarcodeKeyEvent(KeyEvent event) {
    if (!mounted) return false;
    if (event is! KeyDownEvent) return false;

    if (HardwareKeyboard.instance.isAltPressed ||
        HardwareKeyboard.instance.isControlPressed ||
        HardwareKeyboard.instance.isMetaPressed) {
      return false;
    }

    final now = DateTime.now();

    if (isEnterKeyEvent(event)) {
      final code = _barcodeBuffer.submit(now);
      if (code == null) return false;

      final normalized = code.trim();
      if (normalized.isEmpty) return true;

      final lastAt = _lastHandledBarcodeAt;
      if (_lastHandledBarcode == normalized &&
          lastAt != null &&
          now.difference(lastAt) < const Duration(milliseconds: 350)) {
        return true;
      }

      _lastHandledBarcode = normalized;
      _lastHandledBarcodeAt = now;
      _onBarcodeScanned(normalized);
      return true;
    }

    final ch = printableCharacterFromKeyEvent(event);
    if (ch == null) return false;

    final shouldConsume = _barcodeBuffer.addCharacter(ch, now);
    return shouldConsume;
  }

  Future<void> _onBarcodeScanned(String code) async {
    try {
      final item = await ref.read(posProvider.notifier).addByCode(code);
      if (!mounted) return;

      if (item == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Product not found for SKU: $code'),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 2),
          ),
        );
        return;
      }

      final label = [
        item.title,
        if (item.variantLabel != null && item.variantLabel!.trim().isNotEmpty)
          item.variantLabel!.trim(),
      ].join(' • ');

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Added 1x $label'),
          backgroundColor: const Color(0xFF65A30D),
          duration: const Duration(seconds: 2),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Barcode lookup failed: $e'),
          backgroundColor: Colors.red,
          duration: const Duration(seconds: 2),
        ),
      );
    }
  }

  Future<Customer?> _showCreateCustomerDialog({String? initialName}) async {
    final nameController = TextEditingController(
      text: initialName?.trim() ?? '',
    );
    final phoneController = TextEditingController();
    final emailController = TextEditingController();

    try {
      return await showDialog<Customer>(
        context: context,
        builder: (context) {
          final isDark = Theme.of(context).brightness == Brightness.dark;
          return StatefulBuilder(
            builder: (context, setDialogState) {
              final customersState = ref.watch(customersProvider);
              final canSubmit =
                  nameController.text.trim().isNotEmpty &&
                  phoneController.text.trim().isNotEmpty &&
                  !customersState.isLoading;

              Future<void> submit() async {
                if (!canSubmit) return;

                try {
                  final created = await ref
                      .read(customersProvider.notifier)
                      .createCustomer(
                        name: nameController.text,
                        phone: phoneController.text,
                        email: emailController.text,
                      );
                  if (!context.mounted) return;
                  Navigator.of(context).pop(created);
                } catch (error) {
                  if (!context.mounted) return;
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('Could not create customer: $error'),
                      backgroundColor: AppColors.red,
                    ),
                  );
                }
              }

              return AppDialog(
                title: 'Create customer',
                description:
                    'Add a customer and attach this sale to their account.',
                maxWidth: 460,
                content: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    FormInput(
                      label: 'Name',
                      controller: nameController,
                      autofocus: true,
                      onChanged: (_) => setDialogState(() {}),
                    ),
                    const SizedBox(height: 14),
                    FormInput(
                      label: 'Phone',
                      controller: phoneController,
                      keyboardType: TextInputType.phone,
                      onChanged: (_) => setDialogState(() {}),
                    ),
                    const SizedBox(height: 14),
                    FormInput(
                      label: 'Email',
                      controller: emailController,
                      keyboardType: TextInputType.emailAddress,
                    ),
                    if ((customersState.error ?? '').trim().isNotEmpty) ...[
                      const SizedBox(height: 12),
                      Text(
                        customersState.error!,
                        style: TextStyle(
                          color: AppColors.red,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                    if (isDark) const SizedBox(height: 2),
                  ],
                ),
                actions: [
                  AppButton.secondary(
                    label: 'Cancel',
                    onPressed: () => Navigator.pop(context),
                  ),
                  AppButton.primary(
                    label: 'Create',
                    icon: LucideIcons.plus,
                    onPressed: canSubmit ? submit : null,
                    loading: customersState.isLoading,
                  ),
                ],
              );
            },
          );
        },
      );
    } finally {
      nameController.dispose();
      phoneController.dispose();
      emailController.dispose();
    }
  }

  void _showNumpadDialog({int? itemIndex}) {
    showDialog(
      context: context,
      builder: (context) {
        String value = '';
        final isQuantityUpdate = itemIndex != null;
        final allowDecimal = !isQuantityUpdate;

        return StatefulBuilder(
          builder: (context, setDialogState) {
            final isDark = Theme.of(context).brightness == Brightness.dark;
            final surface2 = isDark
                ? AppColors.surface2
                : AppColors.lightSurface2;
            final border = isDark
                ? AppColors.surfaceBorder
                : AppColors.lightSurfaceBorder;
            final textPrimary = isDark
                ? AppColors.textPrimary
                : AppColors.lightTextPrimary;
            void appendToken(String token) {
              setDialogState(() {
                if (value.length >= 18) return;

                if (token == '.') {
                  if (!allowDecimal) return;
                  if (value.contains('.')) return;
                  value = value.isEmpty ? '0.' : '$value.';
                  return;
                }

                value += token;
              });
            }

            void backspace() {
              setDialogState(() {
                if (value.isEmpty) return;
                value = value.substring(0, value.length - 1);
              });
            }

            return Dialog(
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
              child: ConstrainedBox(
                constraints: BoxConstraints(
                  maxWidth: MediaQuery.of(context).size.width - 32,
                ),
                child: Container(
                  width: 340,
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: isDark
                        ? AppColors.surface1
                        : AppColors.lightSurface1,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        isQuantityUpdate ? 'Update Quantity' : 'Custom Amount',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: textPrimary,
                        ),
                      ),
                      const SizedBox(height: 24),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 20,
                          vertical: 16,
                        ),
                        decoration: BoxDecoration(
                          color: surface2,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: border),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: Text(
                                value.isEmpty ? '0' : value,
                                style: TextStyle(
                                  fontSize: 32,
                                  fontWeight: FontWeight.bold,
                                  letterSpacing: 1,
                                  color: textPrimary,
                                ),
                                textAlign: TextAlign.end,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 24),
                      SizedBox(
                        height: 380,
                        child: NumpadWidget(
                          allowDecimal: allowDecimal,
                          onNumberTap: appendToken,
                          onClear: () {
                            setDialogState(() {
                              value = '';
                            });
                          },
                          onBackspace: backspace,
                          onEnter: () {
                            if (value.isEmpty) return;

                            final notifier = ref.read(posProvider.notifier);
                            if (isQuantityUpdate) {
                              final qty = int.tryParse(value) ?? 1;
                              notifier.updateQuantityAtIndex(itemIndex, qty);
                            } else {
                              final price = double.tryParse(value) ?? 0.0;
                              if (price > 0) {
                                notifier.addCustomItem(
                                  name: 'Custom Item',
                                  price: price,
                                  quantity: 1,
                                );
                              }
                            }
                            Navigator.pop(context);
                          },
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }

  void _showBarcodeScanner() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => Scaffold(
          appBar: AppBar(
            title: const Text('Scan Barcode'),
            backgroundColor: const Color(0xFF65A30D),
            foregroundColor: Colors.white,
          ),
          body: MobileScanner(
            onDetect: (capture) {
              final List<Barcode> barcodes = capture.barcodes;
              if (barcodes.isNotEmpty) {
                final String? code = barcodes.first.rawValue;
                if (code != null) {
                  Navigator.of(context).pop();
                  _onBarcodeScanned(code);
                }
              }
            },
          ),
        ),
      ),
    );
  }

  void _showDiscountDialog() {
    final posState = ref.read(posProvider);
    final currency = tenantCurrencyFormatter(
      ref.read(storeSettingsProvider).settings,
    );
    if (posState.cart.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Add products before applying a discount'),
          backgroundColor: Colors.grey,
        ),
      );
      return;
    }

    showDialog(
      context: context,
      builder: (context) => _DiscountDialog(
        subtotal: posState.subtotal,
        currentDiscount: posState.discount,
        currency: currency,
        onApply: (discount) {
          ref.read(posProvider.notifier).applyDiscount(discount);
          Navigator.pop(context);
        },
        onClear: posState.discount == null
            ? null
            : () {
                ref.read(posProvider.notifier).clearDiscount();
                Navigator.pop(context);
              },
      ),
    );
  }

  Widget _buildTotalBreakdown(PosState posState) {
    final currency = tenantCurrencyFormatter(
      ref.watch(storeSettingsProvider).settings,
    );
    final hasDiscount = posState.discountAmount > 0;
    if (!hasDiscount) return const SizedBox.shrink();

    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textSecondary = isDark
        ? AppColors.textSecondary
        : AppColors.lightTextSecondary;
    final textMuted = isDark ? AppColors.textMuted : AppColors.lightTextMuted;

    final discountLabel = switch (posState.discount!.type) {
      PosDiscountType.fixed => 'Discount',
      PosDiscountType.percent =>
        'Discount (${posState.discount!.value.toStringAsFixed(0)}%)',
    };

    final mono = GoogleFonts.jetBrainsMono(
      fontSize: 13,
      fontWeight: FontWeight.w600,
      fontFeatures: const [FontFeature.tabularFigures()],
    );

    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Subtotal',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w500,
                color: textMuted,
              ),
            ),
            Text(
              currency.format(posState.subtotal),
              style: mono.copyWith(color: textSecondary),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  padding: const EdgeInsetsDirectional.symmetric(
                    horizontal: 8,
                    vertical: 2,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.brand.withValues(
                      alpha: isDark ? 0.14 : 0.18,
                    ),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    discountLabel,
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.2,
                      color: isDark
                          ? AppColors.brand
                          : AppColors.lightSidebarActiveColor,
                    ),
                  ),
                ),
                const SizedBox(width: 6),
                InkWell(
                  onTap: () => ref.read(posProvider.notifier).clearDiscount(),
                  borderRadius: BorderRadius.circular(999),
                  child: Padding(
                    padding: const EdgeInsets.all(2),
                    child: Icon(LucideIcons.x, size: 12, color: textMuted),
                  ),
                ),
              ],
            ),
            Text(
              '-${currency.format(posState.discountAmount)}',
              style: mono.copyWith(
                fontWeight: FontWeight.w700,
                color: isDark
                    ? AppColors.brand
                    : AppColors.lightSidebarActiveColor,
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
      ],
    );
  }

  String? _resolveImageUrl(String? rawUrl) {
    final value = rawUrl?.trim();
    if (value == null || value.isEmpty) return null;
    final cached = _resolvedImageUrlCache[value];
    if (cached != null) return cached;

    final resolved = ref.read(apiProvider).resolvePublicUrl(value);
    _resolvedImageUrlCache[value] = resolved;
    return resolved;
  }

  Widget _buildImageFallback({
    double? width,
    double? height,
    double iconSize = 28,
    IconData icon = LucideIcons.image,
    Color backgroundColor = const Color(0xFFF1F5F9),
    Color iconColor = const Color(0xFF94A3B8),
  }) {
    return Container(
      width: width,
      height: height,
      color: backgroundColor,
      alignment: Alignment.center,
      child: Icon(icon, size: iconSize, color: iconColor),
    );
  }

  Future<void> _showPaymentSheet(PosState posState) async {
    if (posState.cart.isEmpty) return;

    final total = posState.total;
    final currency = tenantCurrencyFormatter(
      ref.read(storeSettingsProvider).settings,
    );

    await showDialog<void>(
      context: context,
      barrierDismissible: true,
      builder: (dialogContext) {
        var method = PosPaymentMethod.cash;
        var cashText = ''; // Start empty for easier typing

        double parseAmount(String input) {
          final trimmed = input.trim();
          if (trimmed.isEmpty) return 0;
          return double.tryParse(trimmed) ?? 0;
        }

        String applyToken(String current, String token) {
          if (token == '.') {
            if (current.contains('.')) return current;
            return current.isEmpty ? '0.' : '$current.';
          }
          // Prevent too many decimals? standard double parsing handles it, but let's be clean
          // Limit to 2 decimal places for currency
          if (current.contains('.')) {
            final parts = current.split('.');
            if (parts.length > 1 && parts[1].length >= 2) return current;
          }
          return '$current$token';
        }

        String backspace(String current) {
          if (current.isEmpty) return current;
          return current.substring(0, current.length - 1);
        }

        return Consumer(
          builder: (context, ref, _) {
            final posState = ref.watch(posProvider);
            return StatefulBuilder(
              builder: (dialogContext, setDialogState) {
                final isDark =
                    Theme.of(dialogContext).brightness == Brightness.dark;
                final cardAmount = method == PosPaymentMethod.card
                    ? total
                    : 0.0;
                // If cashText is empty, we assume 0 for calculations,
                // BUT if it's empty we might want to show "0" placeholder UI.
                final cashReceived = method == PosPaymentMethod.cash
                    ? parseAmount(cashText)
                    : 0.0;

                final breakdown = PosPaymentBreakdown(
                  total: total,
                  cardAmount: cardAmount,
                  cashReceived: cashReceived,
                );

                void append(String text) {
                  setDialogState(() {
                    if (method != PosPaymentMethod.cash) {
                      method = PosPaymentMethod.cash;
                      cashText = '';
                    }
                    cashText = applyToken(cashText, text);
                  });
                }

                void clear() {
                  setDialogState(() {
                    cashText = '';
                  });
                }

                void doBackspace() {
                  setDialogState(() {
                    if (cashText.isNotEmpty) {
                      cashText = backspace(cashText);
                    }
                  });
                }

                Future<void> confirm() async {
                  if (posState.isLoading) return;

                  if (!breakdown.isValid) {
                    ScaffoldMessenger.of(dialogContext).showSnackBar(
                      const SnackBar(
                        content: Text('Invalid payment amounts'),
                        backgroundColor: Colors.red,
                      ),
                    );
                    return;
                  }

                  if (!breakdown.isSettled) {
                    ScaffoldMessenger.of(dialogContext).showSnackBar(
                      SnackBar(
                        content: Text(
                          'Remaining: ${currency.format(breakdown.remaining)}',
                        ),
                        backgroundColor: Colors.red,
                      ),
                    );
                    return;
                  }

                  // Proceed with checkout
                  final ok = await ref
                      .read(posProvider.notifier)
                      .checkout(
                        payment: PosPaymentRequest(
                          cashReceived: breakdown.cashReceived,
                          cardAmount: breakdown.cardAmount,
                        ),
                      );

                  if (ok) {
                    if (dialogContext.mounted) {
                      Navigator.pop(dialogContext);
                    }
                    if (mounted) {
                      _showCheckoutSuccessAnimation();
                    }
                  } else {
                    final error = ref.read(posProvider).error;
                    if (dialogContext.mounted) {
                      ScaffoldMessenger.of(dialogContext).showSnackBar(
                        SnackBar(
                          content: Text(error ?? 'Checkout failed'),
                          backgroundColor: Colors.red,
                        ),
                      );
                    }
                  }
                }

                void handleKeyEvent(KeyEvent event) {
                  if (event is KeyDownEvent) {
                    final logical = event.logicalKey;
                    if (logical == LogicalKeyboardKey.escape) {
                      Navigator.pop(dialogContext);
                    } else if (logical == LogicalKeyboardKey.enter ||
                        logical == LogicalKeyboardKey.numpadEnter) {
                      confirm();
                    } else if (logical == LogicalKeyboardKey.backspace) {
                      doBackspace();
                    } else {
                      String? char;
                      if (logical == LogicalKeyboardKey.digit0 ||
                          logical == LogicalKeyboardKey.numpad0) {
                        char = '0';
                      } else if (logical == LogicalKeyboardKey.digit1 ||
                          logical == LogicalKeyboardKey.numpad1) {
                        char = '1';
                      } else if (logical == LogicalKeyboardKey.digit2 ||
                          logical == LogicalKeyboardKey.numpad2) {
                        char = '2';
                      } else if (logical == LogicalKeyboardKey.digit3 ||
                          logical == LogicalKeyboardKey.numpad3) {
                        char = '3';
                      } else if (logical == LogicalKeyboardKey.digit4 ||
                          logical == LogicalKeyboardKey.numpad4) {
                        char = '4';
                      } else if (logical == LogicalKeyboardKey.digit5 ||
                          logical == LogicalKeyboardKey.numpad5) {
                        char = '5';
                      } else if (logical == LogicalKeyboardKey.digit6 ||
                          logical == LogicalKeyboardKey.numpad6) {
                        char = '6';
                      } else if (logical == LogicalKeyboardKey.digit7 ||
                          logical == LogicalKeyboardKey.numpad7) {
                        char = '7';
                      } else if (logical == LogicalKeyboardKey.digit8 ||
                          logical == LogicalKeyboardKey.numpad8) {
                        char = '8';
                      } else if (logical == LogicalKeyboardKey.digit9 ||
                          logical == LogicalKeyboardKey.numpad9) {
                        char = '9';
                      } else if (logical == LogicalKeyboardKey.period ||
                          logical == LogicalKeyboardKey.numpadDecimal) {
                        char = '.';
                      }

                      if (char != null) {
                        append(char);
                      }
                    }
                  }
                }

                return Focus(
                  autofocus: true,
                  onKeyEvent: (node, event) {
                    handleKeyEvent(event);
                    return KeyEventResult.handled;
                  },
                  child: Dialog(
                    backgroundColor: Colors.transparent,
                    insetPadding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 24,
                    ),
                    child: ConstrainedBox(
                      constraints: BoxConstraints(
                        maxWidth: MediaQuery.of(context).size.width >= 900
                            ? 900
                            : MediaQuery.of(context).size.width - 32,
                        maxHeight: MediaQuery.of(context).size.height - 48,
                      ),
                      child: Container(
                        decoration: BoxDecoration(
                          color: isDark
                              ? AppColors.surface1
                              : AppColors.lightSurface1,
                          borderRadius: BorderRadius.circular(24),
                        ),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            // Header
                            Padding(
                              padding: const EdgeInsets.all(20),
                              child: Row(
                                children: [
                                  const Text(
                                    'Checkout',
                                    style: TextStyle(
                                      fontSize: 20,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  const Spacer(),
                                  // Desktop Numpad Toggle
                                  if (MediaQuery.of(context).size.width > 900)
                                    IconButton(
                                      onPressed: () {
                                        ref
                                            .read(posProvider.notifier)
                                            .toggleNumpadVisibility();
                                      },
                                      icon: Icon(
                                        posState.showNumpadOnDesktop
                                            ? LucideIcons.panelRightClose
                                            : LucideIcons.panelRightOpen,
                                        color: isDark
                                            ? AppColors.textMuted
                                            : Colors.grey[600],
                                      ),
                                      tooltip: posState.showNumpadOnDesktop
                                          ? 'Hide Numpad'
                                          : 'Show Numpad',
                                    ),
                                  const SizedBox(width: 8),
                                  IconButton(
                                    onPressed: () =>
                                        Navigator.pop(dialogContext),
                                    icon: const Icon(LucideIcons.x),
                                  ),
                                ],
                              ),
                            ),
                            const Divider(height: 1),

                            Expanded(
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  // Main Payment Content
                                  Expanded(
                                    flex: 5,
                                    child: SingleChildScrollView(
                                      padding: const EdgeInsets.all(24),
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.stretch,
                                        children: [
                                          // Total Display
                                          Center(
                                            child: Column(
                                              children: [
                                                Text(
                                                  'Total to Pay',
                                                  style: TextStyle(
                                                    color: isDark
                                                        ? AppColors.textMuted
                                                        : Colors.grey[600],
                                                    fontSize: 14,
                                                  ),
                                                ),
                                                const SizedBox(height: 4),
                                                Text(
                                                  currency.format(total),
                                                  style: TextStyle(
                                                    fontSize: 40,
                                                    fontWeight: FontWeight.w900,
                                                    color: isDark
                                                        ? AppColors.textPrimary
                                                        : const Color(
                                                            0xFF0F172A,
                                                          ),
                                                    letterSpacing: -1,
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ),
                                          const SizedBox(height: 32),
                                          // Payment Methods
                                          Padding(
                                            padding: const EdgeInsets.symmetric(
                                              horizontal: 40,
                                            ),
                                            child: Row(
                                              children: [
                                                Expanded(
                                                  child: _PaymentMethodButton(
                                                    title: 'Cash',
                                                    icon: LucideIcons.banknote,
                                                    isSelected:
                                                        method ==
                                                        PosPaymentMethod.cash,
                                                    onTap: () => setDialogState(
                                                      () => method =
                                                          PosPaymentMethod.cash,
                                                    ),
                                                  ),
                                                ),
                                                const SizedBox(width: 16),
                                                Expanded(
                                                  child: _PaymentMethodButton(
                                                    title: 'Card',
                                                    icon:
                                                        LucideIcons.creditCard,
                                                    isSelected:
                                                        method ==
                                                        PosPaymentMethod.card,
                                                    onTap: () => setDialogState(
                                                      () => method =
                                                          PosPaymentMethod.card,
                                                    ),
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ),
                                          const SizedBox(height: 32),

                                          if (method ==
                                              PosPaymentMethod.cash) ...[
                                            // Received Amount Input
                                            Text(
                                              'Cash Received',
                                              style: TextStyle(
                                                color: isDark
                                                    ? AppColors.textMuted
                                                    : Colors.grey[700],
                                                fontWeight: FontWeight.w600,
                                              ),
                                            ),
                                            const SizedBox(height: 8),
                                            Container(
                                              padding:
                                                  const EdgeInsets.symmetric(
                                                    horizontal: 16,
                                                    vertical: 12,
                                                  ),
                                              decoration: BoxDecoration(
                                                border: Border.all(
                                                  color: isDark
                                                      ? AppColors.surfaceBorder
                                                      : const Color(0xFFE2E8F0),
                                                  width: 2,
                                                ),
                                                borderRadius:
                                                    BorderRadius.circular(12),
                                              ),
                                              child: Row(
                                                children: [
                                                  Icon(
                                                    LucideIcons.banknote,
                                                    color: isDark
                                                        ? AppColors.textMuted
                                                        : Colors.grey,
                                                  ),
                                                  const SizedBox(width: 12),
                                                  Expanded(
                                                    child: Text(
                                                      cashText.isEmpty
                                                          ? 'Enter amount...'
                                                          : cashText,
                                                      style: TextStyle(
                                                        fontSize: 24,
                                                        fontWeight:
                                                            FontWeight.bold,
                                                        color: cashText.isEmpty
                                                            ? (isDark
                                                                  ? AppColors
                                                                        .textTertiary
                                                                  : Colors
                                                                        .grey[400])
                                                            : (isDark
                                                                  ? AppColors
                                                                        .textPrimary
                                                                  : const Color(
                                                                      0xFF0F172A,
                                                                    )),
                                                      ),
                                                    ),
                                                  ),
                                                  if (cashText.isNotEmpty)
                                                    IconButton(
                                                      icon: const Icon(
                                                        LucideIcons.delete,
                                                        color: Colors.grey,
                                                      ),
                                                      onPressed: doBackspace,
                                                    ),
                                                ],
                                              ),
                                            ),
                                            const SizedBox(height: 16),
                                            // Smart Suggestions
                                            SmartCashSuggestions(
                                              total: total,
                                              currency: currency,
                                              onAmountSelected: (val) {
                                                setDialogState(() {
                                                  method =
                                                      PosPaymentMethod.cash;
                                                  cashText = val
                                                      .toStringAsFixed(2);
                                                  // Clean up .00
                                                  if (cashText.endsWith(
                                                    '.00',
                                                  )) {
                                                    cashText = cashText
                                                        .substring(
                                                          0,
                                                          cashText.length - 3,
                                                        );
                                                  }
                                                });
                                              },
                                            ),
                                            const SizedBox(height: 24),
                                            // Change Display
                                            Container(
                                              padding: const EdgeInsets.all(16),
                                              decoration: BoxDecoration(
                                                color: breakdown.isSettled
                                                    ? (isDark
                                                          ? AppColors
                                                                .greenSurface
                                                          : const Color(
                                                              0xFFECFDF5,
                                                            ))
                                                    : (isDark
                                                          ? AppColors
                                                                .amberSurface
                                                          : const Color(
                                                              0xFFFFF7ED,
                                                            )),
                                                borderRadius:
                                                    BorderRadius.circular(12),
                                                border: Border.all(
                                                  color: breakdown.isSettled
                                                      ? const Color(0xFF10B981)
                                                      : const Color(
                                                          0xFFF97316,
                                                        ).withValues(
                                                          alpha: 0.3,
                                                        ),
                                                ),
                                              ),
                                              child: Row(
                                                mainAxisAlignment:
                                                    MainAxisAlignment
                                                        .spaceBetween,
                                                children: [
                                                  Text(
                                                    breakdown.isSettled
                                                        ? 'Change to Return'
                                                        : 'Remaining Due',
                                                    style: TextStyle(
                                                      color: breakdown.isSettled
                                                          ? const Color(
                                                              0xFF047857,
                                                            )
                                                          : const Color(
                                                              0xFFC2410C,
                                                            ),
                                                      fontWeight:
                                                          FontWeight.bold,
                                                    ),
                                                  ),
                                                  Text(
                                                    currency.format(
                                                      breakdown.isSettled
                                                          ? breakdown.change
                                                          : breakdown.remaining,
                                                    ),
                                                    style: TextStyle(
                                                      fontSize: 20,
                                                      fontWeight:
                                                          FontWeight.bold,
                                                      color: breakdown.isSettled
                                                          ? const Color(
                                                              0xFF047857,
                                                            )
                                                          : const Color(
                                                              0xFFC2410C,
                                                            ),
                                                    ),
                                                  ),
                                                ],
                                              ),
                                            ),
                                            // Numpad for Touch (Mobile Only)
                                            if (MediaQuery.of(
                                                  context,
                                                ).size.width <
                                                900) ...[
                                              const SizedBox(height: 20),
                                              ExpansionTile(
                                                title: const Text(
                                                  'Show Numpad',
                                                  style: TextStyle(
                                                    fontSize: 14,
                                                  ),
                                                ),
                                                initiallyExpanded: false,
                                                tilePadding: EdgeInsets.zero,
                                                children: [
                                                  SizedBox(
                                                    height: 300,
                                                    child: NumpadWidget(
                                                      label: '',
                                                      allowDecimal: true,
                                                      onNumberTap: append,
                                                      onClear: clear,
                                                      onBackspace: doBackspace,
                                                      onEnter: confirm,
                                                    ),
                                                  ),
                                                ],
                                              ),
                                            ],
                                          ] else ...[
                                            Container(
                                              height: 200,
                                              alignment: Alignment.center,
                                              child: Column(
                                                mainAxisAlignment:
                                                    MainAxisAlignment.center,
                                                children: [
                                                  Icon(
                                                    LucideIcons.creditCard,
                                                    size: 48,
                                                    color: isDark
                                                        ? AppColors.textMuted
                                                        : Colors.grey[400],
                                                  ),
                                                  const SizedBox(height: 16),
                                                  Text(
                                                    'Charge ${currency.format(total)} to Card',
                                                    style: const TextStyle(
                                                      fontSize: 18,
                                                      fontWeight:
                                                          FontWeight.w600,
                                                    ),
                                                  ),
                                                  const SizedBox(height: 8),
                                                  const Text(
                                                    'Waiting for terminal...',
                                                    style: TextStyle(
                                                      color: Colors.grey,
                                                    ),
                                                  ),
                                                ],
                                              ),
                                            ),
                                          ],
                                        ],
                                      ),
                                    ),
                                  ),

                                  // Desktop Right Panel (Numpad)
                                  if (MediaQuery.of(context).size.width >=
                                          900 &&
                                      posState.showNumpadOnDesktop) ...[
                                    Container(
                                      width: 1,
                                      color: isDark
                                          ? AppColors.surfaceBorder
                                          : Colors.grey[200],
                                    ),
                                    Expanded(
                                      flex: 4,
                                      child: Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 24,
                                        ), // Added Horizontal Padding
                                        child: Column(
                                          children: [
                                            const SizedBox(height: 24),
                                            const Text(
                                              'Keypad',
                                              style: TextStyle(
                                                fontWeight: FontWeight.bold,
                                                color: Colors.grey,
                                              ),
                                            ),
                                            Expanded(
                                              child: NumpadWidget(
                                                label: '',
                                                allowDecimal: true,
                                                onNumberTap: append,
                                                onClear: clear,
                                                onBackspace: doBackspace,
                                                onEnter: confirm,
                                              ),
                                            ),
                                            const SizedBox(height: 24),
                                          ],
                                        ),
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            ),

                            const Divider(height: 1),

                            // Footer Button
                            Container(
                              padding: const EdgeInsets.all(24),
                              decoration: BoxDecoration(
                                border: Border(
                                  top: BorderSide(
                                    color: isDark
                                        ? AppColors.surfaceBorder
                                        : const Color(0xFFE2E8F0),
                                  ),
                                ),
                              ),
                              child: SizedBox(
                                width: double.infinity,
                                height: 56,
                                child: AppButton.neutral(
                                  label: 'Confirm Payment (Enter)',
                                  onPressed: breakdown.isSettled
                                      ? confirm
                                      : null,
                                  loading: posState.isLoading,
                                  fullWidth: true,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                );
              },
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final posState = ref.watch(posProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? AppColors.contentBg : AppColors.lightContentBg,
      body: LayoutBuilder(
        builder: (context, constraints) {
          if (constraints.maxWidth < _compactBreakpoint) {
            return _buildMobileLayout(posState);
          }
          if (constraints.maxWidth < _cartDrawerBreakpoint) {
            return _buildTabletLayout(posState);
          }
          return _buildDesktopLayout(posState);
        },
      ),
    );
  }

  int _adaptiveGridColumns(
    double width, {
    required bool isMobile,
    required int preferred,
  }) {
    final minTileWidth = isMobile ? 154.0 : 132.0;
    final maxByWidth = (width / minTileWidth).floor().clamp(1, 8);
    if (width < 360) return 1;
    if (isMobile) {
      final safePreferred = preferred.clamp(1, 2);
      return safePreferred.clamp(1, maxByWidth);
    }
    // Desktop/tablet should follow cashier-selected density directly.
    return preferred.clamp(2, 8);
  }

  List<Product> _sortedProducts(PosState posState) {
    if (identical(_cachedSourceProducts, posState.products) &&
        _cachedSortType == posState.sortType &&
        _cachedSortedProducts != null) {
      return _cachedSortedProducts!;
    }

    final products = [...posState.products];
    switch (posState.sortType) {
      case ProductSortType.name:
        products.sort(
          (a, b) => a.title.toLowerCase().compareTo(b.title.toLowerCase()),
        );
      case ProductSortType.priceAsc:
        products.sort((a, b) => a.price.compareTo(b.price));
      case ProductSortType.priceDesc:
        products.sort((a, b) => b.price.compareTo(a.price));
      case ProductSortType.recent:
        products.sort((a, b) => b.id.compareTo(a.id));
    }

    _cachedSourceProducts = posState.products;
    _cachedSortType = posState.sortType;
    _cachedSortedProducts = products;
    return products;
  }

  List<Product> _filteredProducts(
    List<Product> sortedProducts,
    String? selectedCategoryId,
    String searchQuery,
  ) {
    if (identical(_cachedFilterInput, sortedProducts) &&
        _cachedFilterCategoryId == selectedCategoryId &&
        _cachedFilterQuery == searchQuery &&
        _cachedFilteredProducts != null) {
      return _cachedFilteredProducts!;
    }

    final q = searchQuery.toLowerCase();
    final filtered = sortedProducts
        .where((p) {
          final matchesCategory =
              selectedCategoryId == null ||
              p.categoryId == selectedCategoryId ||
              p.category?.id == selectedCategoryId;
          final matchesSearch =
              searchQuery.isEmpty ||
              p.title.toLowerCase().contains(q) ||
              p.slug.toLowerCase().contains(q) ||
              p.variants.any((v) => v.sku.toLowerCase().contains(q));
          return matchesCategory && matchesSearch;
        })
        .toList(growable: false);

    _cachedFilterInput = sortedProducts;
    _cachedFilterCategoryId = selectedCategoryId;
    _cachedFilterQuery = searchQuery;
    _cachedFilteredProducts = filtered;
    return filtered;
  }

  double _cartPanelWidth(double availableWidth) {
    if (availableWidth >= _wideBreakpoint) return 440;
    if (availableWidth >= 1280) return 410;
    return 380;
  }

  Widget _buildDesktopLayout(PosState posState) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final surface1 = isDark ? AppColors.surface1 : AppColors.lightSurface1;
    final border = isDark
        ? AppColors.surfaceBorder
        : AppColors.lightSurfaceBorder;

    return LayoutBuilder(
      builder: (context, constraints) {
        return Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Expanded(child: _buildCatalogShell(posState, isMobile: false)),
            Container(
              width: _cartPanelWidth(constraints.maxWidth),
              decoration: BoxDecoration(
                color: surface1,
                border: BorderDirectional(start: BorderSide(color: border)),
                boxShadow: isDark
                    ? null
                    : [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.04),
                          blurRadius: 24,
                          offset: const Offset(-6, 0),
                        ),
                      ],
              ),
              child: _buildCartContent(posState),
            ),
          ],
        );
      },
    );
  }

  Widget _buildTabletLayout(PosState posState) {
    return Stack(
      children: [
        _buildCatalogShell(posState, isMobile: false, hasFloatingCart: true),
        PositionedDirectional(
          start: 16,
          end: 16,
          bottom: 16,
          child: SafeArea(top: false, child: _buildMobileCartSummary(posState)),
        ),
      ],
    );
  }

  Widget _buildCatalogShell(
    PosState posState, {
    required bool isMobile,
    bool hasFloatingCart = false,
  }) {
    return Column(
      children: [
        _buildTopBar(posState, isMobile: isMobile),
        Expanded(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (!isMobile) _buildDesktopCategorySidebar(posState),
              Expanded(
                child: Padding(
                  padding: EdgeInsetsDirectional.fromSTEB(
                    isMobile ? 0 : 18,
                    isMobile ? 12 : 18,
                    isMobile ? 0 : 18,
                    isMobile ? 0 : 18,
                  ),
                  child: _buildProductCatalog(
                    posState,
                    isMobile: isMobile,
                    hasFloatingCart: hasFloatingCart,
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildMobileLayout(PosState posState) {
    return Stack(
      children: [
        Column(
          children: [
            SafeArea(
              bottom: false,
              child: _buildTopBar(posState, isMobile: true),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsetsDirectional.only(top: 12),
                child: _buildProductCatalog(
                  posState,
                  isMobile: true,
                  hasFloatingCart: true,
                ),
              ),
            ),
          ],
        ),
        PositionedDirectional(
          start: 12,
          end: 12,
          bottom: 12,
          child: SafeArea(top: false, child: _buildMobileCartSummary(posState)),
        ),
      ],
    );
  }

  Widget _buildTopBar(PosState posState, {bool isMobile = false}) {
    final notifier = ref.read(posProvider.notifier);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final surface1 = isDark ? AppColors.surface1 : AppColors.lightSurface1;
    final surface2 = isDark ? AppColors.surface2 : AppColors.lightSurface2;
    final border = isDark
        ? AppColors.surfaceBorder
        : AppColors.lightSurfaceBorder;
    final textPrimary = isDark
        ? AppColors.textPrimary
        : AppColors.lightTextPrimary;
    final textMuted = isDark
        ? AppColors.textMuted
        : AppColors.lightTextTertiary;

    void showReprintFeedback() async {
      final error = await notifier.printLastOrder();
      if (!mounted) return;

      if (error != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(error),
            backgroundColor: AppColors.red,
            behavior: SnackBarBehavior.floating,
            duration: const Duration(seconds: 3),
          ),
        );
        return;
      }

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Reprinting last order…'),
          backgroundColor: isDark
              ? AppColors.surface3
              : AppColors.lightSurface3,
          behavior: SnackBarBehavior.floating,
          duration: const Duration(seconds: 2),
        ),
      );
    }

    void showReturnRefundComingSoon() {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Return / Refund — coming soon'),
          behavior: SnackBarBehavior.floating,
          duration: Duration(seconds: 2),
        ),
      );
    }

    Widget searchField() {
      return Container(
        height: 52,
        decoration: BoxDecoration(
          color: surface2,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: border),
        ),
        child: FormInput(
          label: 'Search',
          showLabel: false,
          controller: _searchController,
          hint: 'admin.pages.pos.catalog.searchPlaceholder'.tr(),
          prefixIcon: Icon(LucideIcons.search, color: textMuted, size: 18),
          suffixIcon: _searchController.text.isNotEmpty
              ? IconButton(
                  icon: Icon(LucideIcons.x, color: textMuted, size: 18),
                  onPressed: () {
                    _searchController.clear();
                    setState(() {});
                  },
                )
              : null,
          borderless: true,
          filled: false,
          contentPadding: const EdgeInsets.symmetric(vertical: 13),
          onChanged: (_) => _searchDebouncer.run(() => setState(() {})),
        ),
      );
    }

    Widget actionSeparator() => Container(width: 1, height: 28, color: border);

    Widget sortButton() {
      return _buildIconChip(
        icon: LucideIcons.arrowUpDown,
        tooltip: 'admin.pages.pos.catalog.actions.sort'.tr(),
        popup: PopupMenuButton<ProductSortType>(
          tooltip: 'admin.pages.pos.catalog.actions.sort'.tr(),
          onSelected: notifier.setSortType,
          itemBuilder: (context) => const [
            PopupMenuItem(
              value: ProductSortType.name,
              child: Text('Name (A to Z)'),
            ),
            PopupMenuItem(
              value: ProductSortType.priceAsc,
              child: Text('Price (low to high)'),
            ),
            PopupMenuItem(
              value: ProductSortType.priceDesc,
              child: Text('Price (high to low)'),
            ),
            PopupMenuItem(
              value: ProductSortType.recent,
              child: Text('Recently added'),
            ),
          ],
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10),
          ),
          child: SizedBox.expand(
            child: Icon(LucideIcons.arrowUpDown, color: textMuted, size: 18),
          ),
        ),
        onTap: () {},
      );
    }

    Widget densityButton() {
      return Container(
        height: 44,
        decoration: BoxDecoration(
          color: surface2,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: border),
        ),
        child: PopupMenuButton<int>(
          tooltip: 'admin.pages.pos.catalog.actions.columns'.tr(),
          onSelected: notifier.setCrossAxisCount,
          itemBuilder: (context) => const [
            PopupMenuItem(value: 3, child: Text('3 columns')),
            PopupMenuItem(value: 4, child: Text('4 columns')),
            PopupMenuItem(value: 5, child: Text('5 columns')),
            PopupMenuItem(value: 6, child: Text('6 columns')),
          ],
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10),
          ),
          child: Padding(
            padding: const EdgeInsetsDirectional.symmetric(horizontal: 12),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(LucideIcons.layoutGrid, color: textMuted, size: 16),
                const SizedBox(width: 6),
                Text(
                  '${posState.crossAxisCount}',
                  style: GoogleFonts.jetBrainsMono(
                    color: textPrimary,
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    List<Widget> buildActions() {
      final actions = <Widget>[
        if (isMobile)
          _buildIconChip(
            icon: LucideIcons.scan,
            tooltip: 'Scan barcode',
            onTap: _showBarcodeScanner,
          )
        else ...[
          _buildLabeledActionButton(
            icon: LucideIcons.percent,
            label: 'admin.pages.pos.catalog.actions.discount'.tr(),
            onTap: _showDiscountDialog,
          ),
          _buildLabeledActionButton(
            icon: LucideIcons.printer,
            label: 'admin.pages.pos.catalog.actions.reprint'.tr(),
            onTap: showReprintFeedback,
          ),
          _buildLabeledActionButton(
            icon: LucideIcons.undo2,
            label: 'Return / Refund',
            onTap: showReturnRefundComingSoon,
          ),
        ],
        if (isMobile)
          _buildOverflowMenu(
            isDark: isDark,
            border: border,
            surface: surface2,
            textPrimary: textPrimary,
            textMuted: textMuted,
            onDiscount: _showDiscountDialog,
            onReprint: showReprintFeedback,
            onReturnRefund: showReturnRefundComingSoon,
          ),
        _buildLabeledActionButton(
          icon: LucideIcons.zap,
          label: isMobile
              ? null
              : 'admin.pages.pos.catalog.actions.quickCharge'.tr(),
          onTap: () => _showNumpadDialog(itemIndex: null),
          isPrimary: true,
        ),
        if (!isMobile) ...[
          actionSeparator(),
          sortButton(),
          densityButton(),
          _buildIconChip(
            icon: posState.isProductListView
                ? LucideIcons.layoutGrid
                : LucideIcons.list,
            tooltip: posState.isProductListView ? 'Grid view' : 'List view',
            onTap: notifier.toggleProductView,
          ),
        ],
      ];
      return actions;
    }

    Widget actionStrip(List<Widget> actions) {
      return SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        physics: const BouncingScrollPhysics(),
        child: Row(
          children: [
            for (var i = 0; i < actions.length; i++) ...[
              if (i > 0) const SizedBox(width: 8),
              actions[i],
            ],
          ],
        ),
      );
    }

    return LayoutBuilder(
      builder: (context, constraints) {
        final compact = isMobile || constraints.maxWidth < 820;
        final actions = buildActions();

        return Container(
          padding: EdgeInsetsDirectional.fromSTEB(
            isMobile ? 12 : 18,
            isMobile ? 12 : 14,
            isMobile ? 12 : 18,
            isMobile ? 12 : 14,
          ),
          decoration: BoxDecoration(
            color: surface1,
            border: Border(bottom: BorderSide(color: border)),
          ),
          child: compact
              ? Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    searchField(),
                    const SizedBox(height: 10),
                    Align(
                      alignment: AlignmentDirectional.centerStart,
                      child: actionStrip(actions),
                    ),
                  ],
                )
              : Row(
                  children: [
                    Expanded(child: searchField()),
                    const SizedBox(width: 12),
                    Flexible(
                      child: Align(
                        alignment: AlignmentDirectional.centerEnd,
                        child: actionStrip(actions),
                      ),
                    ),
                  ],
                ),
        );
      },
    );
  }

  Widget _buildIconChip({
    required IconData icon,
    required String tooltip,
    required VoidCallback onTap,
    Widget? popup,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final surface = isDark ? AppColors.surface2 : AppColors.lightSurface2;
    final border = isDark
        ? AppColors.surfaceBorder
        : AppColors.lightSurfaceBorder;
    final textMuted = isDark
        ? AppColors.textMuted
        : AppColors.lightTextTertiary;

    final container = Container(
      width: 44,
      height: 44,
      decoration: BoxDecoration(
        color: surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: border),
      ),
      alignment: Alignment.center,
      child: popup ?? Icon(icon, color: textMuted, size: 18),
    );

    if (popup != null) return container;

    return Tooltip(
      message: tooltip,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: container,
      ),
    );
  }

  Widget _buildOverflowMenu({
    required bool isDark,
    required Color border,
    required Color surface,
    required Color textPrimary,
    required Color textMuted,
    required VoidCallback onDiscount,
    required VoidCallback onReprint,
    required VoidCallback onReturnRefund,
  }) {
    return Container(
      width: 44,
      height: 44,
      decoration: BoxDecoration(
        color: surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: border),
      ),
      child: PopupMenuButton<String>(
        tooltip: 'More actions',
        icon: Icon(LucideIcons.moreVertical, color: textMuted, size: 18),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        onSelected: (value) {
          switch (value) {
            case 'discount':
              onDiscount();
              break;
            case 'reprint':
              onReprint();
              break;
            case 'return':
              onReturnRefund();
              break;
          }
        },
        itemBuilder: (context) => [
          _menuItem(
            value: 'discount',
            icon: LucideIcons.percent,
            label: 'Apply discount',
            color: textPrimary,
          ),
          _menuItem(
            value: 'reprint',
            icon: LucideIcons.printer,
            label: 'Reprint last order',
            color: textPrimary,
          ),
          _menuItem(
            value: 'return',
            icon: LucideIcons.undo2,
            label: 'Return / refund',
            color: textPrimary,
          ),
        ],
      ),
    );
  }

  PopupMenuItem<String> _menuItem({
    required String value,
    required IconData icon,
    required String label,
    required Color color,
  }) {
    return PopupMenuItem(
      value: value,
      child: Row(
        children: [
          Icon(icon, size: 16, color: color.withValues(alpha: 0.75)),
          const SizedBox(width: 12),
          Text(label, style: TextStyle(color: color, fontSize: 13)),
        ],
      ),
    );
  }

  Widget _buildLabeledActionButton({
    required IconData icon,
    String? label,
    required VoidCallback onTap,
    bool isPrimary = false,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final surface = isDark ? AppColors.surface2 : AppColors.lightSurface2;
    final border = isDark
        ? AppColors.surfaceBorder
        : AppColors.lightSurfaceBorder;
    final textPrimary = isDark
        ? AppColors.textPrimary
        : AppColors.lightTextPrimary;
    final textMuted = isDark
        ? AppColors.textMuted
        : AppColors.lightTextTertiary;

    final iconColor = isPrimary
        ? AppColors.brandContrast
        : (label != null ? textPrimary : textMuted);
    final labelColor = isPrimary ? AppColors.brandContrast : textPrimary;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(10),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          curve: Curves.easeOut,
          height: 44,
          padding: label != null
              ? const EdgeInsetsDirectional.symmetric(horizontal: 14)
              : null,
          constraints: label != null
              ? null
              : const BoxConstraints.tightFor(width: 44),
          decoration: BoxDecoration(
            color: isPrimary ? AppColors.brand : surface,
            borderRadius: BorderRadius.circular(12),
            border: isPrimary ? null : Border.all(color: border),
            boxShadow: isPrimary
                ? [
                    BoxShadow(
                      color: AppColors.brand.withValues(
                        alpha: isDark ? 0.18 : 0.32,
                      ),
                      blurRadius: 14,
                      offset: const Offset(0, 4),
                    ),
                  ]
                : null,
          ),
          child: label != null
              ? Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(icon, color: iconColor, size: 16),
                    const SizedBox(width: 8),
                    Text(
                      label,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: labelColor,
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 0.1,
                      ),
                    ),
                  ],
                )
              : Center(child: Icon(icon, color: iconColor, size: 18)),
        ),
      ),
    );
  }

  Widget _buildProductCatalog(
    PosState posState, {
    bool isMobile = false,
    bool hasFloatingCart = false,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textPrimary = isDark
        ? AppColors.textPrimary
        : AppColors.lightTextPrimary;
    final textMuted = isDark
        ? AppColors.textMuted
        : AppColors.lightTextTertiary;

    if (posState.error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(LucideIcons.alertCircle, size: 44, color: AppColors.red),
              const SizedBox(height: 16),
              Text(
                'Error loading products',
                style: TextStyle(
                  color: AppColors.red,
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                posState.error!,
                textAlign: TextAlign.center,
                style: TextStyle(color: textMuted, fontSize: 13),
              ),
            ],
          ),
        ),
      );
    }

    final selectedCategoryId = posState.selectedCategoryId;
    final searchQuery = _searchController.text.trim();

    if (isMobile && selectedCategoryId == null && searchQuery.isEmpty) {
      return _buildCategoryGrid(posState, isMobile: isMobile);
    }

    final sortedProducts = _sortedProducts(posState);
    final filteredProducts = _filteredProducts(
      sortedProducts,
      selectedCategoryId,
      searchQuery,
    );

    if (filteredProducts.isEmpty) {
      if (posState.isLoading) {
        return LayoutBuilder(
          builder: (context, constraints) {
            return _buildProductSkeletonGrid(
              isMobile: isMobile,
              crossAxisCount: _adaptiveGridColumns(
                constraints.maxWidth,
                isMobile: isMobile,
                preferred: posState.crossAxisCount,
              ),
            );
          },
        );
      }
      return _buildCatalogEmptyState(
        icon: LucideIcons.packageOpen,
        title: 'admin.pages.pos.catalog.noProducts'.tr(),
        subtitle: searchQuery.isEmpty
            ? 'Try another category or add products from catalog management.'
            : 'No product, SKU, or barcode matched "$searchQuery".',
        textPrimary: textPrimary,
        textMuted: textMuted,
      );
    }

    return LayoutBuilder(
      builder: (context, constraints) {
        final crossAxisCount = _adaptiveGridColumns(
          constraints.maxWidth,
          isMobile: isMobile,
          preferred: posState.crossAxisCount,
        );
        final horizontalPadding = isMobile ? 12.0 : 0.0;
        final bottomPadding = posState.cart.isNotEmpty && hasFloatingCart
            ? 112.0
            : 0.0;

        if (posState.isProductListView) {
          return ListView.separated(
            padding: EdgeInsetsDirectional.only(
              bottom: bottomPadding,
              start: horizontalPadding,
              end: horizontalPadding,
            ),
            itemCount: filteredProducts.length,
            separatorBuilder: (_, __) => const SizedBox(height: 8),
            itemBuilder: (context, index) =>
                _buildProductListTile(filteredProducts[index]),
          );
        }

        return GridView.builder(
          padding: EdgeInsetsDirectional.only(
            bottom: bottomPadding,
            start: horizontalPadding,
            end: horizontalPadding,
          ),
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: crossAxisCount,
            childAspectRatio: constraints.maxWidth < 420 ? 0.64 : 0.70,
            crossAxisSpacing: 14,
            mainAxisSpacing: 14,
          ),
          itemCount: filteredProducts.length,
          itemBuilder: (context, index) =>
              _buildProductCard(filteredProducts[index]),
        );
      },
    );
  }

  Widget _buildCatalogEmptyState({
    required IconData icon,
    required String title,
    required String subtitle,
    required Color textPrimary,
    required Color textMuted,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                color: isDark ? AppColors.surface2 : AppColors.lightSurface2,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: isDark
                      ? AppColors.surfaceBorder
                      : AppColors.lightSurfaceBorder,
                ),
              ),
              child: Icon(icon, size: 32, color: textMuted),
            ),
            const SizedBox(height: 18),
            Text(
              title,
              textAlign: TextAlign.center,
              style: TextStyle(
                color: textPrimary,
                fontSize: 16,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 8),
            ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 320),
              child: Text(
                subtitle,
                textAlign: TextAlign.center,
                style: TextStyle(color: textMuted, fontSize: 13, height: 1.35),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDesktopCategorySidebar(PosState posState) {
    final selectedCategoryId = posState.selectedCategoryId;
    final notifier = ref.read(posProvider.notifier);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final surface = isDark ? AppColors.surface1 : AppColors.lightSurface1;
    final border = isDark
        ? AppColors.surfaceBorder
        : AppColors.lightSurfaceBorder;
    final textMuted = isDark
        ? AppColors.textMuted
        : AppColors.lightTextTertiary;

    return Container(
      width: _desktopCategoryWidth,
      decoration: BoxDecoration(
        color: surface,
        border: BorderDirectional(end: BorderSide(color: border)),
      ),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsetsDirectional.fromSTEB(14, 18, 14, 8),
            child: Text(
              'CATEGORIES',
              style: TextStyle(
                fontSize: 10,
                letterSpacing: 1.4,
                fontWeight: FontWeight.w700,
                color: textMuted,
              ),
            ),
          ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(vertical: 4),
              children: [
                _buildDesktopCategoryItem(
                  title: 'All',
                  icon: LucideIcons.layoutGrid,
                  isSelected: selectedCategoryId == null,
                  onTap: () => notifier.selectCategory(null),
                ),
                Padding(
                  padding: const EdgeInsetsDirectional.symmetric(
                    horizontal: 14,
                    vertical: 8,
                  ),
                  child: Container(height: 1, color: border),
                ),
                ...posState.categories.map((category) {
                  return _buildDesktopCategoryItem(
                    title: category.title,
                    icon: LucideIcons.image,
                    imageUrl: _resolveImageUrl(category.imageUrl),
                    isSelected: selectedCategoryId == category.id,
                    onTap: () => notifier.selectCategory(category.id),
                  );
                }),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDesktopCategoryItem({
    required String title,
    IconData? icon,
    String? imageUrl,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final activeAccent = isDark
        ? AppColors.brand
        : AppColors.lightSidebarActiveColor;
    final hoverBg = isDark ? AppColors.navHoverBg : AppColors.lightNavHoverBg;
    final iconBg = isSelected
        ? AppColors.brand.withValues(alpha: isDark ? 0.18 : 0.22)
        : (isDark ? AppColors.surface3 : AppColors.lightSurface3);
    final textMuted = isDark
        ? AppColors.textMuted
        : AppColors.lightTextTertiary;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        hoverColor: hoverBg,
        child: Container(
          padding: const EdgeInsetsDirectional.fromSTEB(8, 10, 8, 10),
          decoration: BoxDecoration(
            color: isSelected
                ? AppColors.brand.withValues(alpha: isDark ? 0.08 : 0.10)
                : Colors.transparent,
            border: BorderDirectional(
              start: BorderSide(
                color: isSelected ? activeAccent : Colors.transparent,
                width: 3,
              ),
            ),
          ),
          child: Column(
            children: [
              Container(
                width: 46,
                height: 46,
                decoration: BoxDecoration(
                  color: iconBg,
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: isSelected
                        ? activeAccent.withValues(alpha: 0.4)
                        : Colors.transparent,
                    width: 1.5,
                  ),
                ),
                child: imageUrl != null && imageUrl.isNotEmpty
                    ? ClipOval(
                        child: _PosSafeNetworkImage(
                          imageUrl: imageUrl,
                          fit: BoxFit.cover,
                          cacheWidth: 96,
                          cacheHeight: 96,
                          fallback: Icon(
                            icon ?? LucideIcons.image,
                            color: isSelected ? activeAccent : textMuted,
                            size: 20,
                          ),
                        ),
                      )
                    : Icon(
                        icon ?? LucideIcons.image,
                        color: isSelected ? activeAccent : textMuted,
                        size: 20,
                      ),
              ),
              const SizedBox(height: 8),
              Text(
                title,
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 11,
                  height: 1.2,
                  fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                  color: isSelected ? activeAccent : textMuted,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCategoryGrid(PosState posState, {bool isMobile = false}) {
    if (posState.isLoading && posState.categories.isEmpty) {
      return _buildCategorySkeletonGrid(isMobile: isMobile);
    }

    return LayoutBuilder(
      builder: (context, constraints) {
        final crossAxisCount = _adaptiveGridColumns(
          constraints.maxWidth,
          isMobile: isMobile,
          preferred: posState.crossAxisCount,
        );
        return GridView.builder(
          padding: EdgeInsetsDirectional.only(
            bottom: isMobile ? 110 : 0,
            start: isMobile ? 12 : 0,
            end: isMobile ? 12 : 0,
          ),
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: crossAxisCount,
            childAspectRatio: constraints.maxWidth < 420 ? 0.78 : 0.86,
            crossAxisSpacing: 14,
            mainAxisSpacing: 14,
          ),
          itemCount: posState.categories.length,
          itemBuilder: (context, index) =>
              _buildCategoryCard(posState.categories[index]),
        );
      },
    );
  }

  Widget _buildCategoryCard(Category category) {
    final imageUrl = _resolveImageUrl(category.imageUrl);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final surface = isDark ? AppColors.surface1 : AppColors.lightSurface1;
    final border = isDark
        ? AppColors.surfaceBorder
        : AppColors.lightSurfaceBorder;
    final textPrimary = isDark
        ? AppColors.textPrimary
        : AppColors.lightTextPrimary;
    final textMuted = isDark
        ? AppColors.textMuted
        : AppColors.lightTextTertiary;
    final placeholderBg = isDark
        ? AppColors.surface3
        : AppColors.brand.withValues(alpha: 0.18);

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () => ref.read(posProvider.notifier).selectCategory(category.id),
        borderRadius: BorderRadius.circular(16),
        child: Container(
          decoration: BoxDecoration(
            color: surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: border),
            boxShadow: isDark
                ? null
                : [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.04),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Expanded(
                child: ClipRRect(
                  borderRadius: const BorderRadiusDirectional.vertical(
                    top: Radius.circular(15),
                  ),
                  child: imageUrl != null && imageUrl.isNotEmpty
                      ? Container(
                          color: placeholderBg,
                          child: _PosSafeNetworkImage(
                            imageUrl: imageUrl,
                            fit: BoxFit.cover,
                            cacheWidth: 480,
                            cacheHeight: 480,
                            fallback: _buildImageFallback(
                              icon: LucideIcons.layoutGrid,
                              iconSize: 44,
                              backgroundColor: placeholderBg,
                              iconColor: AppColors.brand,
                            ),
                          ),
                        )
                      : Container(
                          color: placeholderBg,
                          alignment: Alignment.center,
                          child: Icon(
                            LucideIcons.layoutGrid,
                            color: isDark
                                ? AppColors.brand.withValues(alpha: 0.7)
                                : AppColors.lightSidebarActiveColor,
                            size: 40,
                          ),
                        ),
                ),
              ),
              Padding(
                padding: const EdgeInsetsDirectional.fromSTEB(12, 10, 12, 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      category.title,
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 14,
                        color: textPrimary,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Browse →',
                      style: TextStyle(
                        fontSize: 11,
                        color: textMuted,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildProductListTile(Product product) {
    final imageUrl = _resolveImageUrl(product.mainImageUrl);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final surface = isDark ? AppColors.surface1 : AppColors.lightSurface1;
    final border = isDark
        ? AppColors.surfaceBorder
        : AppColors.lightSurfaceBorder;
    final textPrimary = isDark
        ? AppColors.textPrimary
        : AppColors.lightTextPrimary;
    final textMuted = isDark
        ? AppColors.textMuted
        : AppColors.lightTextTertiary;
    final outOfStock = product.stock <= 0;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () => _handleProductTap(product),
        onLongPress: () => _handleProductLongPress(product),
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsetsDirectional.symmetric(
            horizontal: 10,
            vertical: 10,
          ),
          decoration: BoxDecoration(
            color: surface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: border),
          ),
          child: Row(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(10),
                child: _PosSafeNetworkImage(
                  imageUrl: imageUrl,
                  width: 56,
                  height: 56,
                  fit: BoxFit.cover,
                  cacheWidth: 112,
                  cacheHeight: 112,
                  fallback: _buildImageFallback(width: 56, height: 56),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      product.title,
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 14,
                        color: textPrimary,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Container(
                          width: 6,
                          height: 6,
                          decoration: BoxDecoration(
                            color: outOfStock
                                ? AppColors.red
                                : (product.stock <= 5
                                      ? AppColors.amber
                                      : AppColors.green),
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 6),
                        Text(
                          outOfStock
                              ? 'Out of stock'
                              : '${product.stock} in stock',
                          style: TextStyle(
                            color: outOfStock ? AppColors.red : textMuted,
                            fontSize: 11.5,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Text(
                tenantCurrencyFormatter(
                  ref.watch(storeSettingsProvider).settings,
                ).format(product.price),
                style: GoogleFonts.jetBrainsMono(
                  fontWeight: FontWeight.w700,
                  fontSize: 15,
                  color: textPrimary,
                  fontFeatures: const [FontFeature.tabularFigures()],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildProductCard(Product product) {
    final imageUrl = _resolveImageUrl(product.mainImageUrl);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final surface = isDark ? AppColors.surface1 : AppColors.lightSurface1;
    final surface2 = isDark ? AppColors.surface2 : AppColors.lightSurface2;
    final border = isDark
        ? AppColors.surfaceBorder
        : AppColors.lightSurfaceBorder;
    final textPrimary = isDark
        ? AppColors.textPrimary
        : AppColors.lightTextPrimary;
    final textMuted = isDark
        ? AppColors.textMuted
        : AppColors.lightTextTertiary;
    final outOfStock = product.stock <= 0;
    final lowStock = product.stock > 0 && product.stock <= 5;

    return _HoverableProductCard(
      onTap: () => _handleProductTap(product),
      onLongPress: () => _handleProductLongPress(product),
      child: Container(
        decoration: BoxDecoration(
          color: surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            ClipRRect(
              borderRadius: const BorderRadiusDirectional.vertical(
                top: Radius.circular(15),
              ),
              child: AspectRatio(
                aspectRatio: _productCardImageAspectRatio,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    _PosSafeNetworkImage(
                      imageUrl: imageUrl,
                      fit: BoxFit.cover,
                      cacheWidth: 512,
                      cacheHeight: 512,
                      fallback: _buildImageFallback(),
                    ),
                    if (outOfStock || lowStock)
                      PositionedDirectional(
                        top: 8,
                        end: 8,
                        child: Container(
                          padding: const EdgeInsetsDirectional.symmetric(
                            horizontal: 8,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: outOfStock
                                ? AppColors.red.withValues(alpha: 0.92)
                                : AppColors.amber.withValues(alpha: 0.92),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            outOfStock ? 'OUT' : 'LOW',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 10,
                              letterSpacing: 0.6,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                      ),
                    PositionedDirectional(
                      start: 8,
                      bottom: 8,
                      child: Container(
                        padding: const EdgeInsetsDirectional.symmetric(
                          horizontal: 8,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.46),
                          borderRadius: BorderRadius.circular(999),
                          border: Border.all(
                            color: Colors.white.withValues(alpha: 0.14),
                          ),
                        ),
                        child: Text(
                          outOfStock
                              ? 'Out'
                              : '${product.stock} ${product.stock == 1 ? 'unit' : 'units'}',
                          style: TextStyle(
                            color: outOfStock
                                ? AppColors.redText
                                : Colors.white,
                            fontSize: 10.5,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            Expanded(
              child: Stack(
                children: [
                  Padding(
                    padding: const EdgeInsetsDirectional.fromSTEB(
                      12,
                      10,
                      12,
                      12,
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          product.title,
                          style: TextStyle(
                            fontWeight: FontWeight.w700,
                            fontSize: 13.5,
                            height: 1.25,
                            color: textPrimary,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 4),
                        Text(
                          product.slug,
                          style: TextStyle(
                            fontSize: 11,
                            color: textMuted,
                            fontWeight: FontWeight.w500,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const Spacer(),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          crossAxisAlignment: CrossAxisAlignment.center,
                          children: [
                            Expanded(
                              child: Text(
                                tenantCurrencyFormatter(
                                  ref.watch(storeSettingsProvider).settings,
                                ).format(product.price),
                                style: GoogleFonts.jetBrainsMono(
                                  fontWeight: FontWeight.w800,
                                  fontSize: 15,
                                  color: textPrimary,
                                  fontFeatures: const [
                                    FontFeature.tabularFigures(),
                                  ],
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            const SizedBox(width: 10),
                            Container(
                              width: 36,
                              height: 36,
                              decoration: BoxDecoration(
                                color: outOfStock ? surface2 : AppColors.brand,
                                borderRadius: BorderRadius.circular(10),
                                border: outOfStock
                                    ? Border.all(color: border)
                                    : null,
                                boxShadow: [
                                  BoxShadow(
                                    color: AppColors.brand.withValues(
                                      alpha: outOfStock
                                          ? 0
                                          : (isDark ? 0.18 : 0.30),
                                    ),
                                    blurRadius: 8,
                                    offset: const Offset(0, 2),
                                  ),
                                ],
                              ),
                              alignment: Alignment.center,
                              child: Icon(
                                LucideIcons.plus,
                                size: 17,
                                color: outOfStock
                                    ? textMuted
                                    : AppColors.brandContrast,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCartContent(PosState posState) {
    final notifier = ref.read(posProvider.notifier);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final surface1 = isDark ? AppColors.surface1 : AppColors.lightSurface1;
    final surface2 = isDark ? AppColors.surface2 : AppColors.lightSurface2;
    final borderColor = isDark
        ? AppColors.surfaceBorder
        : AppColors.lightSurfaceBorder;
    final textPrimary = isDark
        ? AppColors.textPrimary
        : AppColors.lightTextPrimary;
    final textMuted = isDark
        ? AppColors.textMuted
        : AppColors.lightTextTertiary;
    final itemCount = posState.cart.fold<int>(
      0,
      (sum, item) => sum + item.quantity,
    );

    return Column(
      children: [
        Container(
          padding: const EdgeInsetsDirectional.fromSTEB(16, 16, 16, 14),
          decoration: BoxDecoration(
            color: surface1,
            border: Border(bottom: BorderSide(color: borderColor)),
          ),
          child: Column(
            children: [
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'admin.pages.pos.cart.actions.viewCart'.tr(),
                          style: TextStyle(
                            color: textPrimary,
                            fontSize: 16,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'admin.pages.pos.cart.itemsCount'.tr(
                            namedArgs: {'count': itemCount.toString()},
                          ),
                          style: TextStyle(
                            color: textMuted,
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                  _buildCartIconButton(
                    icon: posState.isCartSimpleView
                        ? LucideIcons.image
                        : LucideIcons.alignJustify,
                    tooltip: posState.isCartSimpleView
                        ? 'Image mode'
                        : 'Compact mode',
                    onTap: notifier.toggleCartView,
                  ),
                  const SizedBox(width: 8),
                  _buildCartIconButton(
                    icon: LucideIcons.trash2,
                    tooltip: 'admin.pages.pos.cart.actions.clearCart'.tr(),
                    onTap: posState.cart.isEmpty ? null : notifier.clearCart,
                    isDestructive: true,
                  ),
                ],
              ),
              const SizedBox(height: 14),
              Container(
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  color: surface2,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: borderColor),
                ),
                child: Row(
                  children: List.generate(3, (index) {
                    final isSelected = posState.currentSessionIndex == index;
                    final waitingCount = posState.sessions[index].cart
                        .fold<int>(
                          0,
                          (sum, cartItem) => sum + cartItem.quantity,
                        );
                    return Expanded(
                      child: InkWell(
                        onTap: () => notifier.switchSession(index),
                        borderRadius: BorderRadius.circular(10),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 150),
                          height: 40,
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                            color: isSelected
                                ? AppColors.brand.withValues(
                                    alpha: isDark ? 0.16 : 0.20,
                                  )
                                : waitingCount > 0
                                ? AppColors.amber.withValues(
                                    alpha: isDark ? 0.10 : 0.14,
                                  )
                                : Colors.transparent,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(
                              color: isSelected
                                  ? AppColors.brand.withValues(alpha: 0.36)
                                  : waitingCount > 0
                                  ? AppColors.amber.withValues(alpha: 0.24)
                                  : Colors.transparent,
                            ),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Flexible(
                                child: Text(
                                  'admin.pages.pos.sessions.order'.tr(
                                    namedArgs: {'index': '${index + 1}'},
                                  ),
                                  style: TextStyle(
                                    fontWeight: isSelected
                                        ? FontWeight.w800
                                        : FontWeight.w600,
                                    fontSize: 12.5,
                                    color: isSelected
                                        ? AppColors.brand
                                        : textMuted,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              if (waitingCount > 0) ...[
                                const SizedBox(width: 6),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 6,
                                    vertical: 2,
                                  ),
                                  decoration: BoxDecoration(
                                    color: isSelected
                                        ? AppColors.brand.withValues(
                                            alpha: 0.18,
                                          )
                                        : AppColors.amber.withValues(
                                            alpha: 0.18,
                                          ),
                                    borderRadius: BorderRadius.circular(999),
                                    border: Border.all(
                                      color: isSelected
                                          ? AppColors.brand.withValues(
                                              alpha: 0.36,
                                            )
                                          : AppColors.amber.withValues(
                                              alpha: 0.30,
                                            ),
                                    ),
                                  ),
                                  child: Text(
                                    '$waitingCount',
                                    style: TextStyle(
                                      fontSize: 10.5,
                                      fontWeight: FontWeight.w800,
                                      color: isSelected
                                          ? AppColors.brand
                                          : AppColors.amberText,
                                    ),
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                      ),
                    );
                  }),
                ),
              ),
              const SizedBox(height: 12),
              _buildClientSelector(posState),
            ],
          ),
        ),
        Expanded(
          child: posState.cart.isEmpty
              ? _buildEmptyCart()
              : Scrollbar(
                  child: ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: posState.cart.length,
                    separatorBuilder: (_, __) =>
                        SizedBox(height: posState.isCartSimpleView ? 4 : 10),
                    itemBuilder: (context, index) {
                      final item = posState.cart[index];
                      return _buildCartItem(item, index, notifier, posState);
                    },
                  ),
                ),
        ),
        _buildCartFooter(posState),
      ],
    );
  }

  Widget _buildCartIconButton({
    required IconData icon,
    required String tooltip,
    required VoidCallback? onTap,
    bool isDestructive = false,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final surface = isDark ? AppColors.surface2 : AppColors.lightSurface2;
    final border = isDark
        ? AppColors.surfaceBorder
        : AppColors.lightSurfaceBorder;
    final iconColor = onTap == null
        ? (isDark ? AppColors.textTertiary : AppColors.lightTextMuted)
        : isDestructive
        ? AppColors.red
        : (isDark ? AppColors.textSecondary : AppColors.lightTextSecondary);

    return Tooltip(
      message: tooltip,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: surface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: border),
          ),
          child: Icon(icon, color: iconColor, size: 18),
        ),
      ),
    );
  }

  Widget _buildCartItem(
    CartItem item,
    int index,
    PosNotifier notifier,
    PosState posState,
  ) {
    // Wrap with bounce animation for newly added items
    return TweenAnimationBuilder<double>(
      duration: const Duration(milliseconds: 400),
      curve: Curves.elasticOut,
      tween: Tween<double>(begin: 0.0, end: 1.0),
      builder: (context, scale, child) {
        return Transform.scale(scale: scale, child: child);
      },
      child: _buildCartItemContent(item, index, notifier, posState),
    );
  }

  Widget _buildCartItemContent(
    CartItem item,
    int index,
    PosNotifier notifier,
    PosState posState,
  ) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final surface = isDark ? AppColors.surface2 : AppColors.lightSurface2;
    final surfaceInset = isDark ? AppColors.surface3 : AppColors.lightSurface3;
    final border = isDark
        ? AppColors.surfaceBorder
        : AppColors.lightSurfaceBorder;
    final textPrimary = isDark
        ? AppColors.textPrimary
        : AppColors.lightTextPrimary;
    final textSecondary = isDark
        ? AppColors.textSecondary
        : AppColors.lightTextSecondary;
    final textMuted = isDark
        ? AppColors.textMuted
        : AppColors.lightTextTertiary;
    final currency = tenantCurrencyFormatter(
      ref.watch(storeSettingsProvider).settings,
    );

    Widget quantityControls({bool compact = false}) {
      final controlHeight = compact ? 30.0 : 38.0;
      return Container(
        height: controlHeight,
        decoration: BoxDecoration(
          color: surfaceInset,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: border),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            _buildQtyBtn(
              icon: LucideIcons.minus,
              size: controlHeight,
              iconSize: compact ? 15 : 17,
              onTap: () =>
                  notifier.updateQuantityAtIndex(index, item.quantity - 1),
            ),
            InkWell(
              onTap: () => _showNumpadDialog(itemIndex: index),
              borderRadius: BorderRadius.circular(8),
              child: Container(
                constraints: BoxConstraints(minWidth: compact ? 28 : 38),
                alignment: Alignment.center,
                padding: EdgeInsets.symmetric(horizontal: compact ? 6 : 10),
                child: AnimatedSwitcher(
                  duration: const Duration(milliseconds: 180),
                  child: Text(
                    '${item.quantity}',
                    key: ValueKey<int>(item.quantity),
                    style: GoogleFonts.jetBrainsMono(
                      fontWeight: FontWeight.w800,
                      fontSize: compact ? 13 : 15,
                      color: textPrimary,
                    ),
                  ),
                ),
              ),
            ),
            _buildQtyBtn(
              icon: LucideIcons.plus,
              size: controlHeight,
              iconSize: compact ? 15 : 17,
              onTap: () =>
                  notifier.updateQuantityAtIndex(index, item.quantity + 1),
            ),
          ],
        ),
      );
    }

    if (posState.isCartSimpleView) {
      return Container(
        padding: const EdgeInsetsDirectional.fromSTEB(8, 4, 6, 4),
        decoration: BoxDecoration(
          color: surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: border),
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    item.name,
                    style: TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 12,
                      color: textPrimary,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (item.variantTitle != null) ...[
                    const SizedBox(height: 2),
                    Text(
                      item.variantTitle!,
                      style: TextStyle(fontSize: 10, color: textMuted),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(width: 4),
            quantityControls(compact: true),
            const SizedBox(width: 1),
            InkWell(
              onTap: () =>
                  notifier.removeFromCart(item.productId, item.variantId),
              borderRadius: BorderRadius.circular(99),
              child: const Padding(
                padding: EdgeInsets.all(6),
                child: Icon(LucideIcons.x, size: 14, color: AppColors.red),
              ),
            ),
          ],
        ),
      );
    }

    final imageUrl = _resolveImageUrl(item.imageUrl);

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: border),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (imageUrl != null)
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: _PosSafeNetworkImage(
                imageUrl: imageUrl,
                width: 62,
                height: 62,
                fit: BoxFit.cover,
                cacheWidth: 120,
                cacheHeight: 120,
                fallback: _buildImageFallback(
                  width: 62,
                  height: 62,
                  backgroundColor: surfaceInset,
                  iconColor: textMuted,
                ),
              ),
            ),
          if (imageUrl != null) const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        item.name,
                        style: TextStyle(
                          fontWeight: FontWeight.w600,
                          fontSize: 14,
                          color: textPrimary,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    InkWell(
                      onTap: () => notifier.removeFromCart(
                        item.productId,
                        item.variantId,
                      ),
                      child: const Icon(
                        LucideIcons.x,
                        size: 16,
                        color: AppColors.red,
                      ),
                    ),
                  ],
                ),
                if (item.variantTitle != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text(
                      item.variantTitle!,
                      style: TextStyle(fontSize: 12, color: textMuted),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    quantityControls(),
                    const SizedBox(width: 12),
                    Flexible(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            currency.format(item.price * item.quantity),
                            style: GoogleFonts.jetBrainsMono(
                              fontWeight: FontWeight.w800,
                              fontSize: 15,
                              color: textPrimary,
                              fontFeatures: const [
                                FontFeature.tabularFigures(),
                              ],
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          Text(
                            currency.format(item.price),
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: textSecondary,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQtyBtn({
    required IconData icon,
    required VoidCallback onTap,
    double size = 36,
    double iconSize = 17,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final iconColor = isDark
        ? AppColors.textSecondary
        : AppColors.lightTextSecondary;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        width: size,
        height: size,
        alignment: Alignment.center,
        child: Icon(icon, size: iconSize, color: iconColor),
      ),
    );
  }

  Widget _buildClientSelector(PosState posState) {
    return Consumer(
      builder: (context, ref, child) {
        final customersState = ref.watch(customersProvider);
        final customers = customersState.customers;
        final isDark = Theme.of(context).brightness == Brightness.dark;
        final surface = isDark ? AppColors.surface2 : AppColors.lightSurface2;
        final textPrimary = isDark
            ? AppColors.textPrimary
            : AppColors.lightTextPrimary;
        final textMuted = isDark
            ? AppColors.textMuted
            : AppColors.lightTextTertiary;
        final border = isDark
            ? AppColors.surfaceBorder
            : AppColors.lightSurfaceBorder;

        return Autocomplete<Customer>(
          optionsBuilder: (TextEditingValue textEditingValue) {
            final query = textEditingValue.text.trim().toLowerCase();
            if (query.isEmpty) {
              return customers;
            }
            return customers.where((customer) {
              return customer.name.toLowerCase().contains(query) ||
                  customer.phone.toLowerCase().contains(query) ||
                  (customer.email?.toLowerCase().contains(query) ?? false);
            });
          },
          displayStringForOption: (customer) => customer.name,
          onSelected: (customer) {
            ref.read(posProvider.notifier).selectCustomer(customer);
          },
          optionsViewBuilder: (context, onSelected, options) {
            final matches = options.toList();
            return Align(
              alignment: Alignment.topLeft,
              child: Material(
                color: Colors.transparent,
                child: Container(
                  margin: const EdgeInsets.only(top: 6),
                  constraints: const BoxConstraints(
                    maxHeight: 260,
                    minWidth: 280,
                  ),
                  decoration: BoxDecoration(
                    color: isDark
                        ? AppColors.surface1
                        : AppColors.lightSurface1,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: border),
                  ),
                  child: matches.isEmpty
                      ? InkWell(
                          onTap: () async {
                            final created = await _showCreateCustomerDialog(
                              initialName: '',
                            );
                            if (created == null || !mounted) return;
                            ref
                                .read(posProvider.notifier)
                                .selectCustomer(created);
                          },
                          child: Padding(
                            padding: const EdgeInsets.all(14),
                            child: Row(
                              children: [
                                Container(
                                  width: 34,
                                  height: 34,
                                  decoration: BoxDecoration(
                                    color: surface,
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  alignment: Alignment.center,
                                  child: Icon(
                                    LucideIcons.userPlus,
                                    size: 16,
                                    color: textMuted,
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Text(
                                        'No customer found',
                                        style: TextStyle(
                                          color: textPrimary,
                                          fontSize: 12.5,
                                          fontWeight: FontWeight.w700,
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        'Create one and assign this sale',
                                        style: TextStyle(
                                          color: textMuted,
                                          fontSize: 11.5,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        )
                      : ListView.separated(
                          padding: const EdgeInsets.symmetric(vertical: 6),
                          shrinkWrap: true,
                          itemCount: matches.length,
                          separatorBuilder: (_, __) =>
                              Divider(height: 1, color: border),
                          itemBuilder: (context, index) {
                            final customer = matches[index];
                            return InkWell(
                              onTap: () => onSelected(customer),
                              child: Padding(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 12,
                                  vertical: 10,
                                ),
                                child: Row(
                                  children: [
                                    Container(
                                      width: 34,
                                      height: 34,
                                      decoration: BoxDecoration(
                                        color: surface,
                                        borderRadius: BorderRadius.circular(10),
                                      ),
                                      alignment: Alignment.center,
                                      child: Icon(
                                        LucideIcons.user,
                                        size: 16,
                                        color: textMuted,
                                      ),
                                    ),
                                    const SizedBox(width: 10),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            customer.name,
                                            style: TextStyle(
                                              color: textPrimary,
                                              fontSize: 13,
                                              fontWeight: FontWeight.w700,
                                            ),
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                          const SizedBox(height: 2),
                                          Text(
                                            customer.phone,
                                            style: TextStyle(
                                              color: textMuted,
                                              fontSize: 12,
                                            ),
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
                ),
              ),
            );
          },
          fieldViewBuilder: (context, controller, focusNode, onFieldSubmitted) {
            if (posState.selectedCustomer != null && controller.text.isEmpty) {
              controller.text = posState.selectedCustomer!.name;
            }
            return FormInput(
              label: 'Customer',
              showLabel: false,
              controller: controller,
              focusNode: focusNode,
              hint: 'admin.pages.pos.customer.addClient'.tr(),
              hintStyle: TextStyle(color: textMuted, fontSize: 13),
              textStyle: TextStyle(
                color: textPrimary,
                fontSize: 13,
                fontWeight: FontWeight.w600,
              ),
              prefixIcon: Icon(LucideIcons.user, size: 16, color: textMuted),
              suffixIcon: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (posState.selectedCustomer != null)
                    IconButton(
                      icon: Icon(LucideIcons.x, size: 14, color: textMuted),
                      onPressed: () {
                        ref.read(posProvider.notifier).selectCustomer(null);
                        controller.clear();
                      },
                    ),
                  IconButton(
                    tooltip: 'Create customer',
                    icon: Icon(
                      LucideIcons.userPlus,
                      size: 16,
                      color: textMuted,
                    ),
                    onPressed: () async {
                      final created = await _showCreateCustomerDialog(
                        initialName: controller.text,
                      );
                      if (created == null || !mounted) return;
                      ref.read(posProvider.notifier).selectCustomer(created);
                      controller.text = created.name;
                      focusNode.unfocus();
                    },
                  ),
                ],
              ),
              fillColor: surface,
              borderRadius: 12,
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 12,
                vertical: 10,
              ),
              onSubmitted: (_) => onFieldSubmitted(),
            );
          },
        );
      },
    );
  }

  Widget _buildCartFooter(PosState posState) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final surface = isDark ? AppColors.surface1 : AppColors.lightSurface1;
    final surface2 = isDark ? AppColors.surface2 : AppColors.lightSurface2;
    final border = isDark
        ? AppColors.surfaceBorder
        : AppColors.lightSurfaceBorder;
    final textPrimary = isDark
        ? AppColors.textPrimary
        : AppColors.lightTextPrimary;
    final textMuted = isDark
        ? AppColors.textMuted
        : AppColors.lightTextTertiary;
    return Container(
      padding: const EdgeInsetsDirectional.fromSTEB(20, 18, 20, 20),
      decoration: BoxDecoration(
        color: surface,
        border: Border(top: BorderSide(color: border)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          _buildTotalBreakdown(posState),
          Container(
            padding: const EdgeInsetsDirectional.fromSTEB(14, 12, 14, 12),
            decoration: BoxDecoration(
              color: surface2,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: border),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    'admin.pages.pos.cart.total'.tr(),
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: textMuted,
                    ),
                  ),
                ),
                Flexible(
                  child: Text(
                    tenantCurrencyFormatter(
                      ref.watch(storeSettingsProvider).settings,
                    ).format(posState.total),
                    textAlign: TextAlign.end,
                    style: GoogleFonts.jetBrainsMono(
                      fontSize: 25,
                      fontWeight: FontWeight.w900,
                      color: posState.cart.isEmpty
                          ? textPrimary
                          : AppColors.brand,
                      fontFeatures: const [FontFeature.tabularFigures()],
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                flex: 2,
                child: SizedBox(
                  height: 56,
                  child: AppButton.secondary(
                    label: 'admin.pages.pos.cart.actions.payment'.tr(),
                    icon: LucideIcons.creditCard,
                    onPressed: posState.cart.isEmpty
                        ? null
                        : () => _showPaymentSheet(posState),
                    fullWidth: true,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                flex: 3,
                child: SizedBox(
                  height: 56,
                  child: AppButton.primary(
                    label: 'admin.pages.pos.cart.actions.checkout'.tr(),
                    onPressed: posState.cart.isEmpty
                        ? null
                        : () async {
                            final ok = await ref
                                .read(posProvider.notifier)
                                .checkoutFast();
                            if (!mounted) return;

                            if (ok) {
                              _showCheckoutSuccessAnimation();
                              final route = ModalRoute.of(context);
                              if (route is PopupRoute) Navigator.pop(context);
                              return;
                            }

                            final error = ref.read(posProvider).error;
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(error ?? 'Checkout failed'),
                                backgroundColor: Colors.red,
                              ),
                            );
                          },
                    loading: posState.isLoading,
                    fullWidth: true,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyCart() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final surface = isDark ? AppColors.surface2 : AppColors.lightSurface2;
    final border = isDark
        ? AppColors.surfaceBorder
        : AppColors.lightSurfaceBorder;
    final textPrimary = isDark
        ? AppColors.textPrimary
        : AppColors.lightTextPrimary;
    final textMuted = isDark
        ? AppColors.textMuted
        : AppColors.lightTextTertiary;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 78,
              height: 78,
              decoration: BoxDecoration(
                color: surface,
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: border),
              ),
              child: Icon(
                LucideIcons.shoppingCart,
                size: 34,
                color: AppColors.brand.withValues(alpha: isDark ? 0.92 : 1),
              ),
            ),
            const SizedBox(height: 22),
            Text(
              'admin.pages.pos.cart.empty'.tr(),
              textAlign: TextAlign.center,
              style: TextStyle(
                color: textPrimary,
                fontSize: 17,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Tap a product card or use quick charge.',
              textAlign: TextAlign.center,
              style: TextStyle(color: textMuted, fontSize: 13, height: 1.35),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMobileCartSummary(PosState posState) {
    if (posState.cart.isEmpty) return const SizedBox.shrink();

    final isDark = Theme.of(context).brightness == Brightness.dark;
    final surface = isDark ? AppColors.surface2 : AppColors.lightSurface1;
    final border = isDark
        ? AppColors.surfaceBorderHover
        : AppColors.lightSurfaceBorder;
    final textPrimary = isDark
        ? AppColors.textPrimary
        : AppColors.lightTextPrimary;
    final textMuted = isDark
        ? AppColors.textMuted
        : AppColors.lightTextTertiary;
    final itemCount = posState.cart.fold<int>(
      0,
      (sum, item) => sum + item.quantity,
    );

    return Container(
      decoration: BoxDecoration(
        color: surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.26 : 0.10),
            blurRadius: 24,
            offset: const Offset(0, 12),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => _showMobileCartSheet(context, posState),
          borderRadius: BorderRadius.circular(18),
          child: Padding(
            padding: const EdgeInsetsDirectional.fromSTEB(16, 14, 16, 14),
            child: Row(
              children: [
                Container(
                  width: 38,
                  height: 38,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: AppColors.brand,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    '$itemCount',
                    style: GoogleFonts.jetBrainsMono(
                      color: AppColors.brandContrast,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'admin.pages.pos.actions.viewCart'.tr(),
                    style: TextStyle(
                      color: textPrimary,
                      fontSize: 15,
                      fontWeight: FontWeight.w800,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const SizedBox(width: 12),
                Icon(LucideIcons.chevronUp, size: 18, color: textMuted),
                const SizedBox(width: 8),
                Flexible(
                  child: Text(
                    tenantCurrencyFormatter(
                      ref.watch(storeSettingsProvider).settings,
                    ).format(posState.total),
                    textAlign: TextAlign.end,
                    style: GoogleFonts.jetBrainsMono(
                      color: AppColors.brand,
                      fontSize: 16,
                      fontWeight: FontWeight.w900,
                      fontFeatures: const [FontFeature.tabularFigures()],
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _showMobileCartSheet(BuildContext context, PosState posState) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        final isDark = Theme.of(context).brightness == Brightness.dark;
        return Container(
          height: MediaQuery.of(context).size.height * 0.9,
          decoration: BoxDecoration(
            color: isDark ? AppColors.surface1 : AppColors.lightSurface1,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: Column(
            children: [
              Container(
                width: 40,
                height: 4,
                margin: const EdgeInsets.symmetric(vertical: 12),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.surface3 : const Color(0xFFCBD5E1),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              Expanded(
                child: Consumer(
                  builder: (context, ref, _) {
                    final state = ref.watch(posProvider);
                    return _buildCartContent(state);
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  void _showCheckoutSuccessAnimation() {
    showDialog(
      context: context,
      barrierDismissible: false,
      barrierColor: Colors.black.withValues(alpha: 0.3),
      builder: (context) => const _CheckoutSuccessAnimation(),
    );

    // Auto dismiss after animation completes
    Future.delayed(const Duration(milliseconds: 1500), () {
      if (mounted) {
        Navigator.of(context, rootNavigator: true).pop();
      }
    });
  }

  Future<void> _handleProductTap(Product product) async {
    final notifier = ref.read(posProvider.notifier);

    if (product.options.isEmpty) {
      notifier.addToCart(product);
      return;
    }

    final detailed = await notifier.fetchProductDetails(product.id);
    if (!mounted) return;

    if (detailed == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to load product variants')),
      );
      return;
    }

    final selected = await _showVariantSelectorSheet(detailed);
    if (!mounted) return;
    if (selected == null) return;

    notifier.addToCart(detailed, variant: selected);
  }

  void _handleProductLongPress(Product product) {
    HapticFeedback.selectionClick();
  }

  Future<ProductVariant?> _showVariantSelectorSheet(Product product) {
    return showDialog<ProductVariant>(
      context: context,
      builder: (context) {
        final variants = product.variants.where((v) => v.isActive).toList();

        int availableStock(ProductVariant variant) {
          if (!variant.trackInventory) return 999999;
          final available =
              variant.stock - variant.reserved - variant.safetyStock;
          return available < 0 ? 0 : available;
        }

        final isDark = Theme.of(context).brightness == Brightness.dark;
        final textPrimary = isDark
            ? AppColors.textPrimary
            : AppColors.lightTextPrimary;
        final textMuted = isDark
            ? AppColors.textMuted
            : AppColors.lightTextTertiary;
        return Dialog(
          backgroundColor: isDark
              ? AppColors.surface2
              : AppColors.lightSurface2,
          surfaceTintColor: Colors.transparent,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          child: Container(
            width: 480,
            constraints: BoxConstraints(
              maxHeight: MediaQuery.of(context).size.height * 0.8,
            ),
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        product.title,
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: textPrimary,
                        ),
                      ),
                    ),
                    InkWell(
                      onTap: () => Navigator.pop(context),
                      borderRadius: BorderRadius.circular(20),
                      child: Container(
                        padding: const EdgeInsets.all(4),
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(color: AppColors.brand),
                        ),
                        child: Icon(
                          LucideIcons.x,
                          size: 16,
                          color: AppColors.brand,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                Flexible(
                  child: SingleChildScrollView(
                    child: variants.isEmpty
                        ? Padding(
                            padding: const EdgeInsets.symmetric(vertical: 28),
                            child: Text(
                              'No active variants for this product.',
                              style: TextStyle(color: textMuted),
                            ),
                          )
                        : Column(
                            mainAxisSize: MainAxisSize.min,
                            children: variants.map((variant) {
                              final available = availableStock(variant);
                              final bool inStock =
                                  !variant.trackInventory || available > 0;

                              return Padding(
                                padding: const EdgeInsets.only(bottom: 12),
                                child: _VariantListItem(
                                  variant: variant,
                                  available: available,
                                  inStock: inStock,
                                  priceLabel: tenantCurrencyFormatter(
                                    ref.watch(storeSettingsProvider).settings,
                                  ).format(variant.price),
                                  onTap: inStock
                                      ? () => Navigator.pop(context, variant)
                                      : null,
                                ),
                              );
                            }).toList(),
                          ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  // Skeleton loading grids
  Widget _buildCategorySkeletonGrid({bool isMobile = false}) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final crossAxisCount = isMobile ? 2 : 4;
        return GridView.builder(
          padding: EdgeInsets.only(
            bottom: isMobile ? 100 : 0,
            left: isMobile ? 16 : 0,
            right: isMobile ? 16 : 0,
          ),
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: crossAxisCount,
            childAspectRatio: 0.75,
            crossAxisSpacing: 16,
            mainAxisSpacing: 16,
          ),
          itemCount: 12, // Show 12 skeleton items
          itemBuilder: (context, index) => const CategoryCardSkeleton(),
        );
      },
    );
  }

  Widget _buildProductSkeletonGrid({
    bool isMobile = false,
    required int crossAxisCount,
  }) {
    return GridView.builder(
      padding: EdgeInsets.only(
        bottom: isMobile ? 100 : 0,
        left: isMobile ? 16 : 0,
        right: isMobile ? 16 : 0,
      ),
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: crossAxisCount,
        childAspectRatio: 0.75,
        crossAxisSpacing: 16,
        mainAxisSpacing: 16,
      ),
      itemCount: 12, // Show 12 skeleton items
      itemBuilder: (context, index) => const ProductCardSkeleton(),
    );
  }
}

class _PosSafeNetworkImage extends StatefulWidget {
  final String? imageUrl;
  final double? width;
  final double? height;
  final BoxFit fit;
  final Widget fallback;
  final int? cacheWidth;
  final int? cacheHeight;

  const _PosSafeNetworkImage({
    required this.imageUrl,
    required this.fallback,
    this.width,
    this.height,
    this.fit = BoxFit.cover,
    this.cacheWidth,
    this.cacheHeight,
  });

  @override
  State<_PosSafeNetworkImage> createState() => _PosSafeNetworkImageState();
}

class _PosSafeNetworkImageState extends State<_PosSafeNetworkImage> {
  static final WorkspaceCacheService _imageCacheService =
      WorkspaceCacheService();

  String? get _normalizedUrl {
    final value = widget.imageUrl?.trim();
    if (value == null || value.isEmpty) return null;
    return value;
  }

  String? get _cacheKey {
    final url = _normalizedUrl;
    if (url == null) return null;

    try {
      final uri = Uri.parse(url);
      if (!uri.hasQuery && !uri.hasFragment) return url;

      // Product object URLs sometimes gain volatile query params. Cache by
      // object path so a token refresh does not redownload the same thumbnail.
      return uri.replace(query: null, fragment: null).toString();
    } catch (_) {
      return url;
    }
  }

  @override
  Widget build(BuildContext context) {
    final url = _normalizedUrl;
    final fallback = SizedBox(
      width: widget.width,
      height: widget.height,
      child: widget.fallback,
    );

    if (url == null) {
      return fallback;
    }

    return RepaintBoundary(
      child: CachedNetworkImage(
        imageUrl: url,
        cacheKey: _cacheKey,
        cacheManager: _imageCacheService.imageCacheManager(
          TenantModeService().activeNamespaceKey,
        ),
        width: widget.width,
        height: widget.height,
        fit: widget.fit,
        memCacheWidth: widget.cacheWidth,
        memCacheHeight: widget.cacheHeight,
        maxWidthDiskCache: widget.cacheWidth,
        maxHeightDiskCache: widget.cacheHeight,
        fadeInDuration: Duration.zero,
        fadeOutDuration: Duration.zero,
        useOldImageOnUrlChange: true,
        placeholder: (context, _) => fallback,
        errorWidget: (context, failedUrl, error) => fallback,
      ),
    );
  }
}

class _DiscountDialog extends StatefulWidget {
  final double subtotal;
  final PosDiscount? currentDiscount;
  final NumberFormat currency;
  final ValueChanged<PosDiscount> onApply;
  final VoidCallback? onClear;

  const _DiscountDialog({
    required this.subtotal,
    required this.currentDiscount,
    required this.currency,
    required this.onApply,
    this.onClear,
  });

  @override
  State<_DiscountDialog> createState() => _DiscountDialogState();
}

class _DiscountDialogState extends State<_DiscountDialog> {
  late PosDiscountType _type;
  late final TextEditingController _valueController;
  late final TextEditingController _reasonController;

  @override
  void initState() {
    super.initState();
    final current = widget.currentDiscount;
    _type = current?.type ?? PosDiscountType.fixed;
    _valueController = TextEditingController(
      text: current == null ? '' : _formatInputValue(current.value),
    );
    _reasonController = TextEditingController(text: current?.reason ?? '');
  }

  @override
  void dispose() {
    _valueController.dispose();
    _reasonController.dispose();
    super.dispose();
  }

  String _formatInputValue(double value) {
    if (value == value.roundToDouble()) return value.toStringAsFixed(0);
    return value.toStringAsFixed(2);
  }

  double _parseValue() {
    final normalized = _valueController.text.trim().replaceAll(',', '.');
    if (normalized.isEmpty) return 0;
    return double.tryParse(normalized) ?? 0;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final currency = widget.currency;
    final textMuted = isDark
        ? AppColors.textMuted
        : AppColors.lightTextTertiary;
    final value = _parseValue();
    final draft = PosDiscount(
      type: _type,
      value: value,
      reason: _reasonController.text,
    );
    final discountAmount = draft.amountFor(widget.subtotal);
    final total = (widget.subtotal - discountAmount).clamp(
      0.0,
      widget.subtotal,
    );
    final isValid = value > 0 && discountAmount > 0;

    return AppDialog(
      title: 'Apply Discount',
      description: 'Apply a cart-wide fixed amount or percentage discount.',
      maxWidth: 520,
      content: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              color: isDark ? AppColors.surface3 : const Color(0xFFF1F5F9),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Row(
              children: [
                Expanded(
                  child: _DiscountTypeButton(
                    label: 'Amount',
                    icon: LucideIcons.badgeDollarSign,
                    isSelected: _type == PosDiscountType.fixed,
                    onTap: () => setState(() => _type = PosDiscountType.fixed),
                  ),
                ),
                Expanded(
                  child: _DiscountTypeButton(
                    label: 'Percent',
                    icon: LucideIcons.percent,
                    isSelected: _type == PosDiscountType.percent,
                    onTap: () =>
                        setState(() => _type = PosDiscountType.percent),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          FormInput(
            label: _type == PosDiscountType.fixed
                ? 'Discount amount'
                : 'Discount percentage',
            controller: _valueController,
            autofocus: true,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            inputFormatters: [
              FilteringTextInputFormatter.allow(RegExp(r'[0-9\.,]')),
            ],
            prefixIcon: Icon(
              _type == PosDiscountType.fixed
                  ? LucideIcons.badgeDollarSign
                  : LucideIcons.percent,
              size: 18,
              color: textMuted,
            ),
            hint: _type == PosDiscountType.fixed ? '500' : '10',
            onChanged: (_) => setState(() {}),
          ),
          const SizedBox(height: 16),
          FormInput(
            label: 'Reason',
            controller: _reasonController,
            hint: 'Promotion, damaged package, customer gesture...',
            maxLines: 2,
            onChanged: (_) => setState(() {}),
          ),
          const SizedBox(height: 20),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: isDark ? AppColors.surface2 : const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: isDark
                    ? AppColors.surfaceBorder
                    : const Color(0xFFE2E8F0),
              ),
            ),
            child: Column(
              children: [
                _DiscountSummaryRow(
                  label: 'Subtotal',
                  value: currency.format(widget.subtotal),
                ),
                const SizedBox(height: 8),
                _DiscountSummaryRow(
                  label: 'Discount',
                  value: '-${currency.format(discountAmount)}',
                  valueColor: AppColors.brand,
                ),
                const Divider(height: 24),
                _DiscountSummaryRow(
                  label: 'New total',
                  value: currency.format(total),
                  isStrong: true,
                ),
              ],
            ),
          ),
        ],
      ),
      actions: [
        if (widget.onClear != null)
          AppButton.danger(
            label: 'Remove',
            icon: LucideIcons.trash2,
            onPressed: widget.onClear,
          ),
        AppButton.secondary(
          label: 'Cancel',
          onPressed: () => Navigator.pop(context),
        ),
        AppButton.primary(
          label: 'Apply',
          icon: LucideIcons.check,
          onPressed: isValid
              ? () {
                  widget.onApply(
                    PosDiscount(
                      type: _type,
                      value: value,
                      reason: _reasonController.text.trim().isEmpty
                          ? null
                          : _reasonController.text.trim(),
                    ),
                  );
                }
              : null,
        ),
      ],
    );
  }
}

class _DiscountTypeButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool isSelected;
  final VoidCallback onTap;

  const _DiscountTypeButton({
    required this.label,
    required this.icon,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textPrimary = isDark
        ? AppColors.textPrimary
        : AppColors.lightTextPrimary;
    final textMuted = isDark
        ? AppColors.textMuted
        : AppColors.lightTextTertiary;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        height: 40,
        decoration: BoxDecoration(
          color: isSelected
              ? (isDark ? AppColors.surface2 : Colors.white)
              : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
          boxShadow: isSelected && !isDark
              ? [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.06),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ]
              : null,
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: 16,
              color: isSelected ? AppColors.brand : textMuted,
            ),
            const SizedBox(width: 8),
            Text(
              label,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: isSelected ? textPrimary : textMuted,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _DiscountSummaryRow extends StatelessWidget {
  final String label;
  final String value;
  final Color? valueColor;
  final bool isStrong;

  const _DiscountSummaryRow({
    required this.label,
    required this.value,
    this.valueColor,
    this.isStrong = false,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textPrimary = isDark
        ? AppColors.textPrimary
        : AppColors.lightTextPrimary;
    final textMuted = isDark
        ? AppColors.textMuted
        : AppColors.lightTextTertiary;
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            color: textMuted,
            fontSize: isStrong ? 15 : 13,
            fontWeight: isStrong ? FontWeight.w700 : FontWeight.w500,
          ),
        ),
        Text(
          value,
          style: TextStyle(
            color: valueColor ?? textPrimary,
            fontSize: isStrong ? 18 : 13,
            fontWeight: isStrong ? FontWeight.w800 : FontWeight.w700,
          ),
        ),
      ],
    );
  }
}

// Checkout success animation widget
class _CheckoutSuccessAnimation extends StatefulWidget {
  const _CheckoutSuccessAnimation();

  @override
  State<_CheckoutSuccessAnimation> createState() =>
      _CheckoutSuccessAnimationState();
}

class _CheckoutSuccessAnimationState extends State<_CheckoutSuccessAnimation>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;
  late Animation<double> _opacityAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 1200),
      vsync: this,
    );

    _scaleAnimation = TweenSequence<double>([
      TweenSequenceItem(
        tween: Tween<double>(
          begin: 0.0,
          end: 1.2,
        ).chain(CurveTween(curve: Curves.elasticOut)),
        weight: 60,
      ),
      TweenSequenceItem(
        tween: Tween<double>(
          begin: 1.2,
          end: 1.0,
        ).chain(CurveTween(curve: Curves.easeOut)),
        weight: 20,
      ),
      TweenSequenceItem(
        tween: Tween<double>(
          begin: 1.0,
          end: 0.8,
        ).chain(CurveTween(curve: Curves.easeIn)),
        weight: 20,
      ),
    ]).animate(_controller);

    _opacityAnimation = TweenSequence<double>([
      TweenSequenceItem(tween: Tween<double>(begin: 0.0, end: 1.0), weight: 30),
      TweenSequenceItem(tween: Tween<double>(begin: 1.0, end: 1.0), weight: 50),
      TweenSequenceItem(tween: Tween<double>(begin: 1.0, end: 0.0), weight: 20),
    ]).animate(_controller);

    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: AnimatedBuilder(
        animation: _controller,
        builder: (context, child) {
          return Opacity(
            opacity: _opacityAnimation.value,
            child: Transform.scale(
              scale: _scaleAnimation.value,
              child: Container(
                width: 120,
                height: 120,
                decoration: BoxDecoration(
                  color: const Color(0xFF10B981), // Green 500
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF10B981).withValues(alpha: 0.5),
                      blurRadius: 30,
                      spreadRadius: 10,
                    ),
                  ],
                ),
                child: const Icon(
                  LucideIcons.check,
                  size: 60,
                  color: Colors.white,
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

// Hover wrapper widget for desktop interactions
class _HoverableProductCard extends StatefulWidget {
  final Widget child;
  final VoidCallback onTap;
  final VoidCallback? onLongPress;

  const _HoverableProductCard({
    required this.child,
    required this.onTap,
    this.onLongPress,
  });

  @override
  State<_HoverableProductCard> createState() => _HoverableProductCardState();
}

class _HoverableProductCardState extends State<_HoverableProductCard> {
  bool _isHovered = false;
  bool get _isDark => Theme.of(context).brightness == Brightness.dark;

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      onEnter: (_) => setState(() => _isHovered = true),
      onExit: (_) => setState(() => _isHovered = false),
      cursor: SystemMouseCursors.click,
      child: GestureDetector(
        onTap: widget.onTap,
        onLongPress: widget.onLongPress,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOut,
          transform: _isHovered
              ? (Matrix4.identity()..setTranslationRaw(0, -4, 0))
              : Matrix4.identity(),
          decoration: BoxDecoration(
            color: _isDark ? AppColors.surface1 : AppColors.lightSurface1,
            borderRadius: BorderRadius.circular(16),
            boxShadow: _isDark
                ? null
                : [
                    BoxShadow(
                      color: Colors.black.withValues(
                        alpha: _isHovered ? 0.1 : 0.05,
                      ),
                      blurRadius: _isHovered ? 16 : 8,
                      offset: Offset(0, _isHovered ? 8 : 4),
                    ),
                  ],
          ),
          child: widget.child,
        ),
      ),
    );
  }
}

class _PaymentMethodButton extends StatelessWidget {
  final String title;
  final IconData icon;
  final bool isSelected;
  final VoidCallback onTap;

  const _PaymentMethodButton({
    required this.title,
    required this.icon,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textPrimary = isDark
        ? AppColors.textPrimary
        : AppColors.lightTextPrimary;
    final textMuted = isDark
        ? AppColors.textMuted
        : AppColors.lightTextTertiary;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        height: 64,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        decoration: BoxDecoration(
          color: isSelected
              ? (isDark ? AppColors.surface2 : Colors.white)
              : (isDark ? AppColors.surface3 : const Color(0xFFF1F5F9)),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected
                ? (isDark ? AppColors.brand : AppColors.lightSidebarActiveColor)
                : Colors.transparent,
            width: 2,
          ),
          boxShadow: isSelected && !isDark
              ? [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.05),
                    blurRadius: 4,
                    offset: const Offset(0, 2),
                  ),
                ]
              : null,
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: isSelected ? textPrimary : textMuted, size: 20),
            const SizedBox(width: 12),
            Text(
              title,
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 16,
                color: isSelected ? textPrimary : textMuted,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _VariantListItem extends StatefulWidget {
  final ProductVariant variant;
  final int available;
  final bool inStock;
  final String priceLabel;
  final VoidCallback? onTap;

  const _VariantListItem({
    required this.variant,
    required this.available,
    required this.inStock,
    required this.priceLabel,
    this.onTap,
  });

  @override
  State<_VariantListItem> createState() => _VariantListItemState();
}

class _VariantListItemState extends State<_VariantListItem> {
  bool _isHovered = false;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textPrimary = isDark
        ? AppColors.textPrimary
        : AppColors.lightTextPrimary;
    final textMuted = isDark
        ? AppColors.textMuted
        : AppColors.lightTextTertiary;
    final title = widget.variant.title;
    final price = widget.priceLabel;
    final borderColor = _isHovered && widget.inStock
        ? AppColors.brand
        : (isDark ? AppColors.surfaceBorder : const Color(0xFFE2E8F0));
    final bgColor = _isHovered && widget.inStock
        ? AppColors.brand.withValues(alpha: 0.08)
        : (isDark ? AppColors.surface2 : Colors.white);

    return MouseRegion(
      onEnter: (_) => setState(() => _isHovered = true),
      onExit: (_) => setState(() => _isHovered = false),
      cursor: widget.inStock
          ? SystemMouseCursors.click
          : SystemMouseCursors.basic,
      child: GestureDetector(
        onTap: widget.onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          decoration: BoxDecoration(
            color: widget.inStock
                ? bgColor
                : (isDark ? AppColors.surface3 : const Color(0xFFF8FAFC)),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: borderColor, width: 1),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: widget.inStock ? textPrimary : textMuted,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      widget.variant.trackInventory
                          ? '${widget.available} en stock'
                          : 'En stock',
                      style: TextStyle(fontSize: 13, color: textMuted),
                    ),
                  ],
                ),
              ),
              Text(
                price,
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: widget.inStock ? AppColors.brand : textMuted,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
