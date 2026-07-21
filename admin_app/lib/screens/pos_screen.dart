import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../models/customer.dart';
import '../models/product.dart';
import '../models/pos_models.dart';
import '../providers/pos_provider.dart';
import '../providers/customers_provider.dart';
import '../providers/store_settings_provider.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../utils/barcode_scanner.dart';
import '../utils/debouncer.dart';
import '../utils/image_storage_manager.dart';
import '../utils/pos_payment.dart';
import '../utils/tenant_currency.dart';
import '../widgets/numpad_widget.dart';
import '../widgets/offline_image_widget.dart';
import '../widgets/smart_cash_suggestions.dart';
import '../widgets/buttons/app_button.dart';
import '../widgets/dialogs/app_dialog.dart';
import '../widgets/form/form_input.dart';
import '../widgets/shimmer_skeleton.dart';
import '../utils/app_toasts.dart';

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
  static const double _mobileCatalogHorizontalPadding = 12;
  static const double _catalogGridSpacing = 14;
  static const double _productCardImageAspectRatio = 3 / 2;

  final TextEditingController _searchController = TextEditingController();
  final FocusNode _searchFocusNode = FocusNode();
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
    _searchFocusNode.dispose();
    super.dispose();
  }

  bool _handleBarcodeKeyEvent(KeyEvent event) {
    if (!mounted) return false;
    if (event is! KeyDownEvent) return false;

    final primaryFocus = FocusManager.instance.primaryFocus;
    final isTextFieldFocused =
        primaryFocus != null && primaryFocus.context?.widget is EditableText;

    final isControlOrCmd =
        HardwareKeyboard.instance.isControlPressed ||
        HardwareKeyboard.instance.isMetaPressed;
    final logicalKey = event.logicalKey;

    if (!isTextFieldFocused) {
      if (logicalKey == LogicalKeyboardKey.arrowUp) {
        ref.read(posProvider.notifier).incrementLastInteractedItemQuantity();
        return true;
      }
      if (logicalKey == LogicalKeyboardKey.arrowDown) {
        ref.read(posProvider.notifier).decrementLastInteractedItemQuantity();
        return true;
      }
      if (logicalKey == LogicalKeyboardKey.f12) {
        _showPaymentSheet(ref.read(posProvider));
        return true;
      }
      if (logicalKey == LogicalKeyboardKey.escape) {
        ref.read(posProvider.notifier).clearCart();
        return true;
      }
      if (logicalKey == LogicalKeyboardKey.slash) {
        _searchFocusNode.requestFocus();
        return true;
      }
      if (logicalKey == LogicalKeyboardKey.tab) {
        final state = ref.read(posProvider);
        final nextIndex =
            (state.currentSessionIndex + 1) % state.sessions.length;
        ref.read(posProvider.notifier).switchSession(nextIndex);
        return true;
      }
      if (isControlOrCmd) {
        if (logicalKey == LogicalKeyboardKey.keyD) {
          _showDiscountDialog();
          return true;
        }
        if (logicalKey == LogicalKeyboardKey.keyN) {
          _showNumpadDialog();
          return true;
        }
        if (logicalKey == LogicalKeyboardKey.keyU) {
          _showCreateCustomerDialog();
          return true;
        }
        if (logicalKey == LogicalKeyboardKey.keyF) {
          _searchFocusNode.requestFocus();
          return true;
        }
        if (logicalKey == LogicalKeyboardKey.keyV) {
          ref.read(posProvider.notifier).toggleProductView();
          return true;
        }
      }
    }

    if (HardwareKeyboard.instance.isAltPressed || isControlOrCmd) {
      return false;
    }

    final now = DateTime.now();

    if (isEnterKeyEvent(event)) {
      if (!_barcodeBuffer.hasPending) {
        if (!isTextFieldFocused) {
          final posState = ref.read(posProvider);
          if (posState.currentSession.cart.isNotEmpty) {
            ref.read(posProvider.notifier).checkoutFast();
            return true;
          }
        }
        return false;
      }

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
        AppToasts.show(
          context,
          'Product not found for SKU: $code',
          type: AppToastType.error,
          duration: const Duration(seconds: 2),
        );
        return;
      }

      if (item.needsVariantSelection) {
        final product = ref
            .read(posProvider)
            .products
            .firstWhere((p) => p.id == item.productId);
        _showVariantSelectorSheet(product);
        return;
      }

      final label = [
        item.title,
        if (item.variantLabel != null && item.variantLabel!.trim().isNotEmpty)
          item.variantLabel!.trim(),
      ].join(' • ');

      AppToasts.show(
        context,
        'Added 1x $label',
        type: AppToastType.success,
        duration: const Duration(seconds: 2),
      );
    } catch (e) {
      if (!mounted) return;
      AppToasts.show(
        context,
        'Barcode lookup failed: $e',
        type: AppToastType.error,
        duration: const Duration(seconds: 2),
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
                  AppToasts.show(
                    context,
                    'Could not create customer: $error',
                    type: AppToastType.error,
                  );
                }
              }

              return AppDialog(
                title: 'admin.pages.customers.create.submit'.tr(),
                description: 'app.add_a_customer_and_attach_this'.tr(),
                maxWidth: 460,
                content: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    FormInput(
                      label: 'superAdmin.tenants.table.name'.tr(),
                      controller: nameController,
                      autofocus: true,
                      onChanged: (_) => setDialogState(() {}),
                    ),
                    const SizedBox(height: 14),
                    FormInput(
                      label: 'admin.pages.sales.detail.fields.customerPhone'
                          .tr(),
                      controller: phoneController,
                      keyboardType: TextInputType.phone,
                      onChanged: (_) => setDialogState(() {}),
                    ),
                    const SizedBox(height: 14),
                    FormInput(
                      label: 'admin.pages.users.fields.email'.tr(),
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
                    label: 'admin.common.cancel'.tr(),
                    onPressed: () => Navigator.pop(context),
                  ),
                  AppButton.primary(
                    label: 'admin.pages.users.roles.actions.create'.tr(),
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
            title: Text('app.scan_barcode'.tr()),
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
      AppToasts.show(context, 'app.add_products_before_applying_a'.tr());
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

    final mono = TextStyle(
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
              'admin.pages.orders.detail.itemsTable.subtotal'.tr(),
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
                    color: Theme.of(context).colorScheme.primary.withValues(
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
                          ? Theme.of(context).colorScheme.primary
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
                    ? Theme.of(context).colorScheme.primary
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
    // Use containsKey so a cached null entry is respected and not re-evaluated
    // every build frame (null means the URL resolved to nothing valid).
    if (_resolvedImageUrlCache.containsKey(value)) {
      return _resolvedImageUrlCache[value];
    }

    final resolved = ImageStorageManager.isLocalImagePath(value)
        ? value
        : ref.read(apiProvider).resolvePublicUrl(value);
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

  Future<bool> _showPaymentSheet(PosState posState) async {
    if (posState.cart.isEmpty) return false;

    final total = posState.total;
    final currency = tenantCurrencyFormatter(
      ref.read(storeSettingsProvider).settings,
    );

    final result = await showDialog<bool>(
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
                    AppToasts.show(
                      dialogContext,
                      'app.invalid_payment_amounts'.tr(),
                      type: AppToastType.error,
                    );
                    return;
                  }

                  if (!breakdown.isSettled) {
                    AppToasts.show(
                      dialogContext,
                      'Remaining: ${currency.format(breakdown.remaining)}',
                      type: AppToastType.error,
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
                      Navigator.pop(dialogContext, true);
                    }
                    if (mounted) {
                      _showCheckoutSuccessAnimation();
                    }
                  } else {
                    final error = ref.read(posProvider).error;
                    if (dialogContext.mounted) {
                      AppToasts.show(
                        dialogContext,
                        error ?? 'Checkout failed',
                        type: AppToastType.error,
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
                                  Text(
                                    'admin.pages.billing.payment.emptyTitle'
                                        .tr(),
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
                                                  'admin.pages.billing.payment.totalLabel'
                                                      .tr(),
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
                                                    title:
                                                        'admin.pages.cash.methods.CASH'
                                                            .tr(),
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
                                                    title:
                                                        'admin.pages.cash.methods.CARD'
                                                            .tr(),
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
                                              'admin.pages.pos.paymentModal.cashReceived'
                                                  .tr(),
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
                                                title: Text(
                                                  'app.show_numpad'.tr(),
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
                                                  Text(
                                                    'app.waiting_for_terminal'
                                                        .tr(),
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
                                            Text(
                                              'admin.pages.pos.paymentModal.keypad'
                                                  .tr(),
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
                                  label: 'app.confirm_payment_enter'.tr(),
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
    return result ?? false;
  }

  void _showShortcutsDialog() {
    showDialog(
      context: context,
      builder: (context) {
        final isDark = Theme.of(context).brightness == Brightness.dark;
        final textPrimary = isDark ? Colors.white : Colors.black87;
        final textMuted = isDark ? Colors.white54 : Colors.black54;

        Widget buildShortcutRow(String keyStr, String desc) {
          return Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 6,
                  ),
                  decoration: BoxDecoration(
                    color: isDark
                        ? Colors.white10
                        : Colors.black.withOpacity(0.05),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(
                      color: isDark ? Colors.white24 : Colors.black12,
                    ),
                  ),
                  child: Text(
                    keyStr,
                    style: TextStyle(
                      fontFamily: 'monospace',
                      color: textPrimary,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Text(
                    desc,
                    style: TextStyle(color: textMuted, fontSize: 14),
                  ),
                ),
              ],
            ),
          );
        }

        return AppDialog(
          title: 'Keyboard Shortcuts',
          description: 'Speed up your checkout with these shortcuts.',
          maxWidth: 450,
          content: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              buildShortcutRow('Enter', 'Fast Checkout'),
              buildShortcutRow('F12', 'Open Payment Sheet'),
              buildShortcutRow('↑ / ↓', 'Adjust quantity of last item'),
              buildShortcutRow('Ctrl + F', 'Focus Search Bar'),
              buildShortcutRow('Ctrl + D', 'Apply Discount'),
              buildShortcutRow('Ctrl + N', 'Add Custom Amount'),
              buildShortcutRow('Ctrl + U', 'Select Customer'),
              buildShortcutRow('Ctrl + V', 'Toggle Product View'),
              buildShortcutRow('Tab', 'Cycle Open Sessions'),
              buildShortcutRow('Esc', 'Clear Cart'),
            ],
          ),
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

  double _productGridChildAspectRatio(
    double viewportWidth, {
    required int crossAxisCount,
    required double horizontalPadding,
  }) {
    final usableWidth = math.max(
      0.0,
      viewportWidth -
          (horizontalPadding * 2) -
          (_catalogGridSpacing * (crossAxisCount - 1)),
    );
    final tileWidth = usableWidth / crossAxisCount;

    // The image takes tileWidth / 1.5 height (aspect ratio 3/2).
    // The content below image needs roughly 85 pixels for title, price and padding.
    final estimatedHeight = (tileWidth / 1.5) + 85;
    return tileWidth / estimatedHeight;
  }

  String _stockStatusLabel(Product product) {
    if (product.stock <= 0) return 'Out of stock';
    if (product.stock <= product.lowStockThreshold) return 'Low stock';
    return 'In stock';
  }

  Widget _buildProductMetaChip({
    required String label,
    required Color backgroundColor,
    required Color borderColor,
    required Color textColor,
  }) {
    return Container(
      padding: const EdgeInsetsDirectional.symmetric(
        horizontal: 8,
        vertical: 5,
      ),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: borderColor),
      ),
      child: Text(
        label,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: TextStyle(
          fontSize: 10.5,
          fontWeight: FontWeight.w700,
          color: textColor,
          height: 1.1,
        ),
      ),
    );
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
        AppToasts.show(
          context,
          error,
          type: AppToastType.error,
          duration: const Duration(seconds: 3),
        );
        return;
      }

      AppToasts.show(
        context,
        'app.reprinting_last_order'.tr(),
        duration: const Duration(seconds: 2),
      );
    }

    void showReturnRefundComingSoon() {
      AppToasts.show(
        context,
        'app.return_refund_coming_soon'.tr(),
        duration: Duration(seconds: 2),
      );
    }

    Widget searchField() {
      return Container(
        height: 44,
        decoration: BoxDecoration(
          color: surface2,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: border),
        ),
        child: TextField(
          controller: _searchController,
          focusNode: _searchFocusNode,
          textAlignVertical: TextAlignVertical.center,
          style: TextStyle(fontSize: 14, color: textPrimary),
          decoration: InputDecoration(
            hintText: 'app.admin_pages_pos_catalog_search'.tr().tr(),
            hintStyle: TextStyle(color: textMuted, fontSize: 14),
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
            border: InputBorder.none,
            enabledBorder: InputBorder.none,
            focusedBorder: InputBorder.none,
            filled: false,
            isDense: true,
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 12,
              vertical: 12,
            ),
          ),
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
          itemBuilder: (context) => [
            PopupMenuItem(
              value: ProductSortType.name,
              child: Text('app.name_a_to_z'.tr()),
            ),
            PopupMenuItem(
              value: ProductSortType.priceAsc,
              child: Text('app.price_low_to_high'.tr()),
            ),
            PopupMenuItem(
              value: ProductSortType.priceDesc,
              child: Text('app.price_high_to_low'.tr()),
            ),
            PopupMenuItem(
              value: ProductSortType.recent,
              child: Text('app.recently_added'.tr()),
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
          itemBuilder: (context) => [
            PopupMenuItem(value: 3, child: Text('app.3_columns'.tr())),
            PopupMenuItem(value: 4, child: Text('app.4_columns'.tr())),
            PopupMenuItem(value: 5, child: Text('app.5_columns'.tr())),
            PopupMenuItem(value: 6, child: Text('app.6_columns'.tr())),
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
                  style: TextStyle(
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
            tooltip: 'app.scan_barcode'.tr(),
            onTap: _showBarcodeScanner,
          )
        else ...[
          _buildIconChip(
            icon: LucideIcons.percent,
            tooltip: 'admin.pages.pos.catalog.actions.discount'.tr(),
            onTap: _showDiscountDialog,
            width: 56,
          ),
          _buildIconChip(
            icon: LucideIcons.printer,
            tooltip: 'admin.pages.pos.catalog.actions.reprint'.tr(),
            onTap: showReprintFeedback,
            width: 56,
          ),
          _buildIconChip(
            icon: LucideIcons.undo2,
            tooltip: 'app.return_refund'.tr(),
            onTap: showReturnRefundComingSoon,
            width: 56,
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
              : 'admin.pages.pos.catalog.actions.customAmount'.tr(),
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
                    actionStrip(actions),
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
    double width = 44,
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
      width: width,
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
        tooltip: 'app.more_actions'.tr(),
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
            label: 'app.apply_discount'.tr(),
            color: textPrimary,
          ),
          _menuItem(
            value: 'reprint',
            icon: LucideIcons.printer,
            label: 'admin.pages.pos.catalog.actions.reprintLastOrder'.tr(),
            color: textPrimary,
          ),
          _menuItem(
            value: 'return',
            icon: LucideIcons.undo2,
            label: 'app.return_refund'.tr(),
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
        ? Theme.of(context).colorScheme.onPrimary
        : (label != null ? textPrimary : textMuted);
    final labelColor = isPrimary
        ? Theme.of(context).colorScheme.onPrimary
        : textPrimary;

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
            color: isPrimary ? Theme.of(context).colorScheme.primary : surface,
            borderRadius: BorderRadius.circular(12),
            border: isPrimary ? null : Border.all(color: border),
            boxShadow: isPrimary
                ? [
                    BoxShadow(
                      color: Theme.of(context).colorScheme.primary.withValues(
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
                'app.error_loading_products'.tr(),
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
              viewportWidth: constraints.maxWidth,
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
        title: 'app.admin_pages_pos_catalog_noprod'.tr().tr(),
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
        final horizontalPadding = isMobile
            ? _mobileCatalogHorizontalPadding
            : 0.0;
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
            childAspectRatio: _productGridChildAspectRatio(
              constraints.maxWidth,
              crossAxisCount: crossAxisCount,
              horizontalPadding: horizontalPadding,
            ),
            crossAxisSpacing: _catalogGridSpacing,
            mainAxisSpacing: _catalogGridSpacing,
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
              'admin.pages.categories.index.title'.tr(),
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
                  title: 'admin.pages.delivery.pricing.filters.all'.tr(),
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
        ? Theme.of(context).colorScheme.primary
        : AppColors.lightSidebarActiveColor;
    final hoverBg = isDark ? AppColors.navHoverBg : AppColors.lightNavHoverBg;
    final iconBg = isSelected
        ? Theme.of(
            context,
          ).colorScheme.primary.withValues(alpha: isDark ? 0.18 : 0.22)
        : (isDark ? AppColors.surface3 : AppColors.lightSurface3);
    final textMuted = isDark
        ? AppColors.textMuted
        : AppColors.lightTextTertiary;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        hoverColor: hoverBg,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOut,
          padding: const EdgeInsetsDirectional.fromSTEB(8, 12, 8, 12),
          decoration: BoxDecoration(
            color: isSelected
                ? Theme.of(
                    context,
                  ).colorScheme.primary.withValues(alpha: isDark ? 0.08 : 0.10)
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
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: iconBg,
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: isSelected
                        ? activeAccent.withValues(alpha: isDark ? 0.5 : 0.4)
                        : Colors.transparent,
                    width: 2,
                  ),
                  boxShadow: isSelected
                      ? [
                          BoxShadow(
                            color: Theme.of(context).colorScheme.primary
                                .withValues(alpha: isDark ? 0.30 : 0.15),
                            blurRadius: 14,
                            spreadRadius: 1,
                          ),
                        ]
                      : null,
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
            start: isMobile ? _mobileCatalogHorizontalPadding : 0,
            end: isMobile ? _mobileCatalogHorizontalPadding : 0,
          ),
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: crossAxisCount,
            childAspectRatio: constraints.maxWidth < 420 ? 0.78 : 0.86,
            crossAxisSpacing: _catalogGridSpacing,
            mainAxisSpacing: _catalogGridSpacing,
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
    final placeholderBg = isDark
        ? AppColors.surface3
        : Theme.of(context).colorScheme.primary.withValues(alpha: 0.18);

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () => ref.read(posProvider.notifier).selectCategory(category.id),
        borderRadius: BorderRadius.circular(18),
        child: Container(
          decoration: BoxDecoration(
            color: surface,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: border),
            boxShadow: isDark
                ? null
                : [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.05),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(17),
            child: Stack(
              fit: StackFit.expand,
              children: [
                // Background image / placeholder
                imageUrl != null && imageUrl.isNotEmpty
                    ? _PosSafeNetworkImage(
                        imageUrl: imageUrl,
                        fit: BoxFit.cover,
                        cacheWidth: 480,
                        cacheHeight: 480,
                        fallback: Container(
                          color: placeholderBg,
                          alignment: Alignment.center,
                          child: Icon(
                            LucideIcons.layoutGrid,
                            color: isDark
                                ? Theme.of(
                                    context,
                                  ).colorScheme.primary.withValues(alpha: 0.7)
                                : AppColors.lightSidebarActiveColor,
                            size: 44,
                          ),
                        ),
                      )
                    : Container(
                        color: placeholderBg,
                        alignment: Alignment.center,
                        child: Icon(
                          LucideIcons.layoutGrid,
                          color: isDark
                              ? Theme.of(
                                  context,
                                ).colorScheme.primary.withValues(alpha: 0.7)
                              : AppColors.lightSidebarActiveColor,
                          size: 44,
                        ),
                      ),
                // Gradient overlay at bottom for title legibility
                Positioned.fill(
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          Colors.transparent,
                          Colors.black.withValues(alpha: 0.65),
                        ],
                        stops: const [0.45, 1.0],
                      ),
                    ),
                  ),
                ),
                // Title overlay
                PositionedDirectional(
                  start: 10,
                  end: 10,
                  bottom: 10,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        category.title,
                        style: const TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 13,
                          color: Colors.white,
                          height: 1.2,
                          shadows: [
                            Shadow(color: Colors.black54, blurRadius: 4),
                          ],
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
              ],
            ),
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
                style: TextStyle(
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
    final border = isDark
        ? AppColors.surfaceBorder
        : AppColors.lightSurfaceBorder;
    final textPrimary = isDark
        ? AppColors.textPrimary
        : AppColors.lightTextPrimary;
    final textMuted = isDark
        ? AppColors.textMuted
        : AppColors.lightTextTertiary;
    final settings = ref.watch(storeSettingsProvider).settings;
    final outOfStock = product.stock <= 0;
    final lowStock =
        product.stock > 0 && product.stock <= product.lowStockThreshold;

    return _HoverableProductCard(
      onTap: () => _handleProductTap(product),
      onLongPress: () => _handleProductLongPress(product),
      cardBuilder: (isHovered) => Container(
        key: ValueKey('pos-product-card-${product.id}'),
        decoration: BoxDecoration(
          color: surface,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            ClipRRect(
              borderRadius: const BorderRadiusDirectional.vertical(
                top: Radius.circular(17),
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
                    // Gradient overlay for depth
                    Positioned.fill(
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: [
                              Colors.transparent,
                              Colors.black.withValues(alpha: 0.30),
                            ],
                            stops: const [0.5, 1.0],
                          ),
                        ),
                      ),
                    ),
                    // Hover overlay — desktop add-to-cart affordance
                    AnimatedOpacity(
                      duration: const Duration(milliseconds: 180),
                      opacity: isHovered ? 1.0 : 0.0,
                      child: Container(
                        color: Theme.of(
                          context,
                        ).colorScheme.primary.withValues(alpha: 0.12),
                        alignment: Alignment.center,
                        child: Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(
                            color: Theme.of(context).colorScheme.primary,
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(
                                color: Theme.of(
                                  context,
                                ).colorScheme.primary.withValues(alpha: 0.5),
                                blurRadius: 16,
                                spreadRadius: 2,
                              ),
                            ],
                          ),
                          child: Icon(
                            LucideIcons.plus,
                            color: Theme.of(context).colorScheme.onPrimary,
                            size: 22,
                          ),
                        ),
                      ),
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
                            boxShadow: [
                              BoxShadow(
                                color:
                                    (outOfStock
                                            ? AppColors.red
                                            : AppColors.amber)
                                        .withValues(alpha: 0.45),
                                blurRadius: 8,
                                offset: const Offset(0, 2),
                              ),
                            ],
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
                    // Glass-morphism stock count chip
                    PositionedDirectional(
                      start: 8,
                      bottom: 8,
                      child: Container(
                        padding: const EdgeInsetsDirectional.symmetric(
                          horizontal: 8,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.52),
                          borderRadius: BorderRadius.circular(999),
                          border: Border.all(
                            color: Colors.white.withValues(alpha: 0.18),
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
              child: Padding(
                padding: const EdgeInsetsDirectional.fromSTEB(12, 10, 12, 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      product.title,
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 13.5,
                        height: 1.25,
                        color: outOfStock ? textMuted : textPrimary,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const Spacer(),
                    Text(
                      tenantCurrencyFormatter(settings).format(product.price),
                      key: ValueKey('pos-product-price-${product.id}'),
                      style: TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 16,
                        height: 1,
                        color: outOfStock ? textMuted : textPrimary,
                        fontFeatures: const [FontFeature.tabularFigures()],
                      ),
                    ),
                  ],
                ),
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
                          'app.admin_pages_pos_cart_actions_v'.tr().tr(),
                          style: TextStyle(
                            color: textPrimary,
                            fontSize: 16,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'app.admin_pages_pos_cart_itemscoun'.tr().tr(
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
                    icon: LucideIcons.keyboard,
                    tooltip: 'Keyboard Shortcuts',
                    onTap: _showShortcutsDialog,
                  ),
                  const SizedBox(width: 8),
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
                    tooltip: 'app.admin_pages_pos_cart_actions_c'.tr().tr(),
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
                  children:
                      List.generate(3, (index) {
                            final isSelected =
                                posState.currentSessionIndex == index;
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
                                        ? Theme.of(
                                            context,
                                          ).colorScheme.primary.withValues(
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
                                          ? Theme.of(context)
                                                .colorScheme
                                                .primary
                                                .withValues(alpha: 0.36)
                                          : waitingCount > 0
                                          ? AppColors.amber.withValues(
                                              alpha: 0.24,
                                            )
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
                                            namedArgs: {
                                              'index': '${index + 1}',
                                            },
                                          ),
                                          style: TextStyle(
                                            fontWeight: isSelected
                                                ? FontWeight.w800
                                                : FontWeight.w600,
                                            fontSize: 12.5,
                                            color: isSelected
                                                ? Theme.of(
                                                    context,
                                                  ).colorScheme.primary
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
                                                ? Theme.of(context)
                                                      .colorScheme
                                                      .primary
                                                      .withValues(alpha: 0.18)
                                                : AppColors.amber.withValues(
                                                    alpha: 0.18,
                                                  ),
                                            borderRadius: BorderRadius.circular(
                                              999,
                                            ),
                                            border: Border.all(
                                              color: isSelected
                                                  ? Theme.of(context)
                                                        .colorScheme
                                                        .primary
                                                        .withValues(alpha: 0.36)
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
                                                  ? Theme.of(
                                                      context,
                                                    ).colorScheme.primary
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
                          })
                          .expand((Widget w) => [w, const SizedBox(width: 8)])
                          .toList()
                        ..removeLast(),
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
                    style: TextStyle(
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
                  const SizedBox(height: 1),
                  Text(
                    currency.format(item.price),
                    key: ValueKey(
                      'pos-cart-unit-price-${item.productId}${item.variantId != null ? '-${item.variantId}' : ''}',
                    ),
                    style: TextStyle(
                      fontSize: 10.5,
                      fontWeight: FontWeight.w700,
                      color: textSecondary,
                      fontFeatures: const [FontFeature.tabularFigures()],
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
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
                            style: TextStyle(
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
                                        'app.no_customer_found'.tr(),
                                        style: TextStyle(
                                          color: textPrimary,
                                          fontSize: 12.5,
                                          fontWeight: FontWeight.w700,
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        'app.create_one_and_assign_this_sal'
                                            .tr(),
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
              label: 'admin.pages.sales.index.table.customer'.tr(),
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
                    tooltip: 'admin.pages.customers.create.submit'.tr(),
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
              color: posState.cart.isNotEmpty
                  ? Theme.of(context).colorScheme.primary.withValues(
                      alpha: isDark ? 0.10 : 0.08,
                    )
                  : surface2,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: posState.cart.isNotEmpty
                    ? Theme.of(context).colorScheme.primary.withValues(
                        alpha: isDark ? 0.28 : 0.22,
                      )
                    : border,
              ),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    'admin.pages.pos.cart.total'.tr(),
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: posState.cart.isNotEmpty
                          ? (isDark
                                ? Theme.of(context).colorScheme.primary
                                : AppColors.lightSidebarActiveColor)
                          : textMuted,
                    ),
                  ),
                ),
                Flexible(
                  child: FittedBox(
                    fit: BoxFit.scaleDown,
                    alignment: Alignment.centerRight,
                    child: AnimatedSwitcher(
                      duration: const Duration(milliseconds: 300),
                      transitionBuilder: (child, animation) => SlideTransition(
                        position:
                            Tween<Offset>(
                              begin: const Offset(0, -0.4),
                              end: Offset.zero,
                            ).animate(
                              CurvedAnimation(
                                parent: animation,
                                curve: Curves.easeOut,
                              ),
                            ),
                        child: FadeTransition(opacity: animation, child: child),
                      ),
                      child: Text(
                        tenantCurrencyFormatter(
                          ref.watch(storeSettingsProvider).settings,
                        ).format(posState.total),
                        key: ValueKey(posState.total),
                        textAlign: TextAlign.end,
                        style: TextStyle(
                          fontSize: 26,
                          fontWeight: FontWeight.w900,
                          color: posState.cart.isEmpty
                              ? textPrimary
                              : Theme.of(context).colorScheme.primary,
                          fontFeatures: const [FontFeature.tabularFigures()],
                        ),
                      ),
                    ),
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
                        : () async {
                            final success = await _showPaymentSheet(posState);
                            if (success == true && mounted) {
                              final route = ModalRoute.of(context);
                              if (route is PopupRoute) {
                                Navigator.pop(context);
                              }
                            }
                          },
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
                            AppToasts.show(
                              context,
                              error ?? 'Checkout failed',
                              type: AppToastType.error,
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
            // Pulsing glow animation around cart icon
            TweenAnimationBuilder<double>(
              tween: Tween(begin: 0.85, end: 1.1),
              duration: const Duration(milliseconds: 1600),
              curve: Curves.easeInOut,
              builder: (context, scale, child) {
                return Stack(
                  alignment: Alignment.center,
                  children: [
                    // Outer glow ring
                    Transform.scale(
                      scale: scale,
                      child: Container(
                        width: 96,
                        height: 96,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: Theme.of(context).colorScheme.primary
                              .withValues(alpha: isDark ? 0.08 : 0.06),
                        ),
                      ),
                    ),
                    // Icon container
                    Container(
                      width: 78,
                      height: 78,
                      decoration: BoxDecoration(
                        color: surface,
                        borderRadius: BorderRadius.circular(24),
                        border: Border.all(color: border),
                        boxShadow: isDark
                            ? [
                                BoxShadow(
                                  color: Theme.of(
                                    context,
                                  ).colorScheme.primary.withValues(alpha: 0.12),
                                  blurRadius: 20,
                                  spreadRadius: 2,
                                ),
                              ]
                            : null,
                      ),
                      child: Icon(
                        LucideIcons.shoppingCart,
                        size: 34,
                        color: Theme.of(context).colorScheme.primary.withValues(
                          alpha: isDark ? 0.92 : 1,
                        ),
                      ),
                    ),
                  ],
                );
              },
              onEnd: () => setState(() {}), // Trigger reverse
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
              'app.tap_a_product_card_or_use_quic'.tr(),
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

    final firstItemName = posState.cart.isNotEmpty
        ? posState.cart.first.name
        : '';

    return Container(
      decoration: BoxDecoration(
        color: surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isDark
              ? Theme.of(context).colorScheme.primary.withValues(alpha: 0.22)
              : AppColors.lightSurfaceBorder,
        ),
        boxShadow: [
          BoxShadow(
            color: Theme.of(
              context,
            ).colorScheme.primary.withValues(alpha: isDark ? 0.22 : 0.10),
            blurRadius: 28,
            offset: const Offset(0, 10),
          ),
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.30 : 0.08),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => _showMobileCartSheet(context, posState),
          borderRadius: BorderRadius.circular(20),
          child: Padding(
            padding: const EdgeInsetsDirectional.fromSTEB(14, 12, 14, 12),
            child: Row(
              children: [
                // Animated item count badge
                AnimatedSwitcher(
                  duration: const Duration(milliseconds: 250),
                  transitionBuilder: (child, animation) =>
                      ScaleTransition(scale: animation, child: child),
                  child: Container(
                    key: ValueKey(itemCount),
                    width: 40,
                    height: 40,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: Theme.of(context).colorScheme.primary,
                      borderRadius: BorderRadius.circular(12),
                      boxShadow: [
                        BoxShadow(
                          color: Theme.of(
                            context,
                          ).colorScheme.primary.withValues(alpha: 0.45),
                          blurRadius: 10,
                          offset: const Offset(0, 3),
                        ),
                      ],
                    ),
                    child: Text(
                      '$itemCount',
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.onPrimary,
                        fontWeight: FontWeight.w900,
                        fontSize: 15,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        'app.admin_pages_pos_actions_viewca'.tr(),
                        style: TextStyle(
                          color: textPrimary,
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                          height: 1.2,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      if (firstItemName.isNotEmpty)
                        Text(
                          firstItemName,
                          style: TextStyle(
                            color: textMuted,
                            fontSize: 11.5,
                            fontWeight: FontWeight.w500,
                            height: 1.2,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                    ],
                  ),
                ),
                const SizedBox(width: 10),
                Icon(LucideIcons.chevronUp, size: 16, color: textMuted),
                const SizedBox(width: 6),
                AnimatedSwitcher(
                  duration: const Duration(milliseconds: 300),
                  transitionBuilder: (child, animation) =>
                      FadeTransition(opacity: animation, child: child),
                  child: Text(
                    tenantCurrencyFormatter(
                      ref.watch(storeSettingsProvider).settings,
                    ).format(posState.total),
                    key: ValueKey(posState.total),
                    textAlign: TextAlign.end,
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.primary,
                      fontSize: 17,
                      fontWeight: FontWeight.w900,
                      fontFeatures: [FontFeature.tabularFigures()],
                    ),
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
      AppToasts.show(context, 'app.failed_to_load_product_variant'.tr());
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
                          border: Border.all(
                            color: Theme.of(context).colorScheme.primary,
                          ),
                        ),
                        child: Icon(
                          LucideIcons.x,
                          size: 16,
                          color: Theme.of(context).colorScheme.primary,
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
                              'app.no_active_variants_for_this_pr'.tr(),
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
    required double viewportWidth,
    required int crossAxisCount,
  }) {
    final horizontalPadding = isMobile ? _mobileCatalogHorizontalPadding : 0.0;
    return GridView.builder(
      padding: EdgeInsets.only(
        bottom: isMobile ? 100 : 0,
        left: horizontalPadding,
        right: horizontalPadding,
      ),
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: crossAxisCount,
        childAspectRatio: _productGridChildAspectRatio(
          viewportWidth,
          crossAxisCount: crossAxisCount,
          horizontalPadding: horizontalPadding,
        ),
        crossAxisSpacing: _catalogGridSpacing,
        mainAxisSpacing: _catalogGridSpacing,
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
  @override
  Widget build(BuildContext context) {
    final url = widget.imageUrl?.trim();
    final fallback = SizedBox(
      width: widget.width,
      height: widget.height,
      child: widget.fallback,
    );

    if (url == null || url.isEmpty) return fallback;

    // Use OfflineImageWidget – the same path used by TenantImageWidget and
    // the products screen – so the POS benefits from the same working cache.
    return RepaintBoundary(
      child: OfflineImageWidget(
        imagePath: url,
        width: widget.width,
        height: widget.height,
        fit: widget.fit,
        placeholder: fallback,
        errorWidget: fallback,
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
      title: 'app.apply_discount'.tr(),
      description: 'app.apply_a_cart_wide_fixed_amount'.tr(),
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
                    label: 'superAdmin.paymentsPage.history.table.amount'.tr(),
                    icon: LucideIcons.badgeDollarSign,
                    isSelected: _type == PosDiscountType.fixed,
                    onTap: () => setState(() => _type = PosDiscountType.fixed),
                  ),
                ),
                Expanded(
                  child: _DiscountTypeButton(
                    label: 'app.percent'.tr(),
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
            label: 'app.reason'.tr(),
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
                  label: 'admin.pages.orders.detail.itemsTable.subtotal'.tr(),
                  value: currency.format(widget.subtotal),
                ),
                const SizedBox(height: 8),
                _DiscountSummaryRow(
                  label: 'admin.pages.pos.catalog.actions.discount'.tr(),
                  value: '-${currency.format(discountAmount)}',
                  valueColor: Theme.of(context).colorScheme.primary,
                ),
                const Divider(height: 24),
                _DiscountSummaryRow(
                  label: 'app.new_total'.tr(),
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
            label: 'storefront.cart.item.remove'.tr(),
            icon: LucideIcons.trash2,
            onPressed: widget.onClear,
          ),
        AppButton.secondary(
          label: 'admin.common.cancel'.tr(),
          onPressed: () => Navigator.pop(context),
        ),
        AppButton.primary(
          label: 'storefront.actions.apply'.tr(),
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
              color: isSelected
                  ? Theme.of(context).colorScheme.primary
                  : textMuted,
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
  final Widget Function(bool isHovered) cardBuilder;
  final VoidCallback onTap;
  final VoidCallback? onLongPress;

  const _HoverableProductCard({
    required this.cardBuilder,
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
          duration: const Duration(milliseconds: 180),
          curve: Curves.easeOut,
          transform: _isHovered
              ? (Matrix4.identity()..setTranslationRaw(0, -6, 0))
              : Matrix4.identity(),
          decoration: BoxDecoration(
            color: _isDark ? AppColors.surface1 : AppColors.lightSurface1,
            borderRadius: BorderRadius.circular(18),
            boxShadow: _isDark
                ? (_isHovered
                      ? [
                          BoxShadow(
                            color: Theme.of(
                              context,
                            ).colorScheme.primary.withValues(alpha: 0.18),
                            blurRadius: 20,
                            offset: const Offset(0, 8),
                          ),
                        ]
                      : null)
                : [
                    BoxShadow(
                      color: Colors.black.withValues(
                        alpha: _isHovered ? 0.12 : 0.05,
                      ),
                      blurRadius: _isHovered ? 20 : 8,
                      offset: Offset(0, _isHovered ? 10 : 4),
                    ),
                  ],
          ),
          child: widget.cardBuilder(_isHovered),
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
    final textMuted = isDark
        ? AppColors.textMuted
        : AppColors.lightTextTertiary;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        height: 64,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        decoration: BoxDecoration(
          color: isSelected
              ? (isDark
                    ? Theme.of(
                        context,
                      ).colorScheme.primary.withValues(alpha: 0.12)
                    : Theme.of(
                        context,
                      ).colorScheme.primary.withValues(alpha: 0.08))
              : (isDark ? AppColors.surface3 : const Color(0xFFF1F5F9)),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isSelected
                ? (isDark
                      ? Theme.of(context).colorScheme.primary
                      : AppColors.lightSidebarActiveColor)
                : Colors.transparent,
            width: 2,
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: Theme.of(context).colorScheme.primary.withValues(
                      alpha: isDark ? 0.25 : 0.15,
                    ),
                    blurRadius: isDark ? 16 : 8,
                    offset: const Offset(0, 4),
                  ),
                ]
              : null,
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              color: isSelected
                  ? Theme.of(context).colorScheme.primary
                  : textMuted,
              size: 22,
            ),
            const SizedBox(width: 12),
            Text(
              title,
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 16,
                color: isSelected
                    ? Theme.of(context).colorScheme.primary
                    : textMuted,
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
        ? Theme.of(context).colorScheme.primary
        : (isDark ? AppColors.surfaceBorder : const Color(0xFFE2E8F0));
    final bgColor = _isHovered && widget.inStock
        ? Theme.of(context).colorScheme.primary.withValues(alpha: 0.08)
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
                  color: widget.inStock
                      ? Theme.of(context).colorScheme.primary
                      : textMuted,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
