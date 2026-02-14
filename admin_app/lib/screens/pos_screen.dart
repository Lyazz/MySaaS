import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:intl/intl.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../services/api_service.dart';
import '../models/customer.dart';
import '../models/product.dart';
import '../models/pos_models.dart';
import '../utils/pos_payment.dart';
import '../utils/debouncer.dart';
import '../utils/barcode_scanner.dart';
import '../providers/pos_provider.dart';
import '../providers/customers_provider.dart';
import '../widgets/numpad_widget.dart';
import '../widgets/shimmer_skeleton.dart';
import '../widgets/smart_cash_suggestions.dart';

class PosScreen extends ConsumerStatefulWidget {
  const PosScreen({super.key});

  @override
  ConsumerState<PosScreen> createState() => _PosScreenState();
}

class _PosScreenState extends ConsumerState<PosScreen> {
  final TextEditingController _searchController = TextEditingController();
  final Debouncer _searchDebouncer = Debouncer(milliseconds: 300);
  late final BarcodeScannerBuffer _barcodeBuffer;
  bool _barcodeHandlerAttached = false;
  String? _lastHandledBarcode;
  DateTime? _lastHandledBarcodeAt;

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
          backgroundColor: const Color(0xFF0D9488),
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

  void _showNumpadDialog({int? itemIndex}) {
    showDialog(
      context: context,
      builder: (context) {
        String value = '';
        final isQuantityUpdate = itemIndex != null;
        final allowDecimal = !isQuantityUpdate;

        return StatefulBuilder(
          builder: (context, setDialogState) {
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
              child: Container(
                width: 340,
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      isQuantityUpdate ? 'Update Quantity' : 'Custom Amount',
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF0F172A),
                      ),
                    ),
                    const SizedBox(height: 24),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 20,
                        vertical: 16,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: Text(
                              value.isEmpty ? '0' : value,
                              style: const TextStyle(
                                fontSize: 32,
                                fontWeight: FontWeight.bold,
                                letterSpacing: 1,
                                color: Color(0xFF0F172A),
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
            backgroundColor: const Color(0xFF0D9488),
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
    // TODO: Implement discount logic
    // - Allow percentage or fixed amount discount
    // - Apply to entire cart or individual items
    // - Require authorization for large discounts
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Apply Discount'),
        content: const Text(
          'TODO: Implement discount functionality\n\n'
          'Features to add:\n'
          '• Percentage discount\n'
          '• Fixed amount discount\n'
          '• Per-item or cart-wide\n'
          '• Authorization requirements',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  Future<void> _showPaymentSheet(PosState posState) async {
    if (posState.cart.isEmpty) return;

    final total = posState.total;
    final currency = NumberFormat.simpleCurrency();

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
                      horizontal: 24,
                      vertical: 24,
                    ),
                    child: Container(
                      width: MediaQuery.of(context).size.width > 900
                          ? 900
                          : 500, // Wider on desktop
                      constraints: const BoxConstraints(maxHeight: 700),
                      decoration: BoxDecoration(
                        color: Colors.white,
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
                                      color: Colors.grey[600],
                                    ),
                                    tooltip: posState.showNumpadOnDesktop
                                        ? 'Hide Numpad'
                                        : 'Show Numpad',
                                  ),
                                const SizedBox(width: 8),
                                IconButton(
                                  onPressed: () => Navigator.pop(dialogContext),
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
                                                  color: Colors.grey[600],
                                                  fontSize: 14,
                                                ),
                                              ),
                                              const SizedBox(height: 4),
                                              Text(
                                                currency.format(total),
                                                style: const TextStyle(
                                                  fontSize: 40,
                                                  fontWeight: FontWeight.w900,
                                                  color: Color(0xFF0F172A),
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
                                                  icon: LucideIcons.creditCard,
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
                                              color: Colors.grey[700],
                                              fontWeight: FontWeight.w600,
                                            ),
                                          ),
                                          const SizedBox(height: 8),
                                          Container(
                                            padding: const EdgeInsets.symmetric(
                                              horizontal: 16,
                                              vertical: 12,
                                            ),
                                            decoration: BoxDecoration(
                                              border: Border.all(
                                                color: const Color(0xFFE2E8F0),
                                                width: 2,
                                              ),
                                              borderRadius:
                                                  BorderRadius.circular(12),
                                            ),
                                            child: Row(
                                              children: [
                                                const Icon(
                                                  LucideIcons.banknote,
                                                  color: Colors.grey,
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
                                                          ? Colors.grey[400]
                                                          : const Color(
                                                              0xFF0F172A,
                                                            ),
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
                                                method = PosPaymentMethod.cash;
                                                cashText = val.toStringAsFixed(
                                                  2,
                                                );
                                                // Clean up .00
                                                if (cashText.endsWith('.00')) {
                                                  cashText = cashText.substring(
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
                                                  ? const Color(0xFFECFDF5)
                                                  : const Color(0xFFFFF7ED),
                                              borderRadius:
                                                  BorderRadius.circular(12),
                                              border: Border.all(
                                                color: breakdown.isSettled
                                                    ? const Color(0xFF10B981)
                                                    : const Color(
                                                        0xFFF97316,
                                                      ).withOpacity(0.3),
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
                                                    fontWeight: FontWeight.bold,
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
                                                    fontWeight: FontWeight.bold,
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
                                                style: TextStyle(fontSize: 14),
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
                                                  color: Colors.grey[400],
                                                ),
                                                const SizedBox(height: 16),
                                                Text(
                                                  'Charge ${currency.format(total)} to Card',
                                                  style: const TextStyle(
                                                    fontSize: 18,
                                                    fontWeight: FontWeight.w600,
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
                                if (MediaQuery.of(context).size.width >= 900 &&
                                    posState.showNumpadOnDesktop) ...[
                                  Container(width: 1, color: Colors.grey[200]),
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
                            decoration: const BoxDecoration(
                              border: Border(
                                top: BorderSide(color: Color(0xFFE2E8F0)),
                              ),
                            ),
                            child: SizedBox(
                              width: double.infinity,
                              height: 56,
                              child: ElevatedButton(
                                onPressed:
                                    (breakdown.isSettled && !posState.isLoading)
                                    ? confirm
                                    : null,
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: const Color(0xFF0F172A),
                                  foregroundColor: Colors.white,
                                  disabledBackgroundColor: Colors.grey[200],
                                  disabledForegroundColor: Colors.grey[400],
                                  elevation: 0,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                ),
                                child: posState.isLoading
                                    ? const SizedBox(
                                        width: 24,
                                        height: 24,
                                        child: CircularProgressIndicator(
                                          color: Colors.white,
                                          strokeWidth: 2,
                                        ),
                                      )
                                    : const Text(
                                        'Confirm Payment (Enter)',
                                        style: TextStyle(
                                          fontSize: 16,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                              ),
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
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final posState = ref.watch(posProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFF1F5F9), // Slate 100
      body: LayoutBuilder(
        builder: (context, constraints) {
          if (constraints.maxWidth < 900) {
            return _buildMobileLayout(posState);
          } else {
            return _buildDesktopLayout(posState);
          }
        },
      ),
    );
  }

  Widget _buildDesktopLayout(PosState posState) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Left: Product Catalog & Navigation
        Expanded(
          flex: 7,
          child: Column(
            children: [
              _buildTopBar(posState, isMobile: false),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: _buildProductCatalog(posState),
                ),
              ),
            ],
          ),
        ),
        // Right: Cart Panel (Receipt Style)
        Container(
          width: 400,
          decoration: BoxDecoration(
            color: Colors.white,
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.05),
                blurRadius: 10,
                offset: const Offset(-4, 0),
              ),
            ],
          ),
          child: _buildCartContent(posState),
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
            Expanded(child: _buildProductCatalog(posState, isMobile: true)),
          ],
        ),
        // Floating Cart Summary
        Positioned(
          left: 16,
          right: 16,
          bottom: 16,
          child: SafeArea(top: false, child: _buildMobileCartSummary(posState)),
        ),
      ],
    );
  }

  Widget _buildTopBar(PosState posState, {bool isMobile = false}) {
    final notifier = ref.read(posProvider.notifier);
    final selectedCategoryId = posState.selectedCategoryId;
    final selectedCategory = posState.categories
        .where((c) => c.id == selectedCategoryId)
        .firstOrNull;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border(
          bottom: BorderSide(color: Colors.grey[200] ?? Colors.grey),
        ),
      ),
      child: Column(
        children: [
          Row(
            children: [
              if (selectedCategoryId != null) ...[
                IconButton(
                  onPressed: () => notifier.selectCategory(null),
                  icon: const Icon(
                    LucideIcons.arrowLeft,
                    color: Color(0xFF0F172A),
                  ),
                  tooltip: 'Back to Categories',
                ),
                const SizedBox(width: 8),
                Text(
                  selectedCategory?.title ?? 'Products',
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF0F172A),
                  ),
                ),
                const Spacer(),
              ] else ...[
                // Search Bar (Only show on root or let it persist? standard is usually persist, but let's follow "clean" request)
                // Keeping search bar always accessible is better UX.
                Expanded(
                  child: Container(
                    height: 48,
                    decoration: BoxDecoration(
                      color: const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: TextField(
                      controller: _searchController,
                      onChanged: (value) =>
                          _searchDebouncer.run(() => setState(() {})),
                      decoration: InputDecoration(
                        hintText: 'Search products...',
                        prefixIcon: const Icon(
                          LucideIcons.search,
                          color: Color(0xFF64748B),
                        ),
                        suffixIcon: _searchController.text.isNotEmpty
                            ? IconButton(
                                icon: const Icon(
                                  LucideIcons.x,
                                  color: Color(0xFF64748B),
                                  size: 18,
                                ),
                                onPressed: () {
                                  _searchController.clear();
                                  setState(() {});
                                },
                              )
                            : null,
                        border: InputBorder.none,
                        contentPadding: const EdgeInsets.symmetric(
                          vertical: 14,
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
              ],

              // Action Buttons - Responsive Layout
              if (isMobile) ...[
                // Mobile: Compact dropdown menu
                Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: PopupMenuButton<String>(
                    icon: const Icon(
                      LucideIcons.moreVertical,
                      color: Color(0xFF64748B),
                      size: 20,
                    ),
                    tooltip: 'More Actions',
                    onSelected: (value) {
                      switch (value) {
                        case 'scan':
                          _showBarcodeScanner();
                          break;
                        case 'discount':
                          _showDiscountDialog();
                          break;
                        case 'print':
                          if (posState.lastOrderItems.isNotEmpty) {
                            notifier.printLastOrder();
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('Reprinting last order...'),
                                backgroundColor: Color(0xFF0D9488),
                                duration: Duration(seconds: 2),
                              ),
                            );
                          } else {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('No last order to print'),
                                backgroundColor: Colors.grey,
                                duration: Duration(seconds: 2),
                              ),
                            );
                          }
                          break;
                      }
                    },
                    itemBuilder: (context) => [
                      const PopupMenuItem(
                        value: 'scan',
                        child: Row(
                          children: [
                            Icon(
                              LucideIcons.scan,
                              size: 18,
                              color: Color(0xFF64748B),
                            ),
                            SizedBox(width: 12),
                            Text('Scan Barcode'),
                          ],
                        ),
                      ),
                      const PopupMenuItem(
                        value: 'discount',
                        child: Row(
                          children: [
                            Icon(
                              LucideIcons.percent,
                              size: 18,
                              color: Color(0xFF64748B),
                            ),
                            SizedBox(width: 12),
                            Text('Apply Discount'),
                          ],
                        ),
                      ),
                      const PopupMenuItem(
                        value: 'print',
                        child: Row(
                          children: [
                            Icon(
                              LucideIcons.printer,
                              size: 18,
                              color: Color(0xFF64748B),
                            ),
                            SizedBox(width: 12),
                            Text('Print Last Order'),
                          ],
                        ),
                      ),
                    ],
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
              ] else ...[
                // Desktop: Icon + Text buttons for clarity (Scan removed - useless on desktop)
                _buildLabeledActionButton(
                  icon: LucideIcons.percent,
                  label: 'Discount',
                  onTap: _showDiscountDialog,
                ),
                const SizedBox(width: 8),
                _buildLabeledActionButton(
                  icon: LucideIcons.printer,
                  label: 'Reprint',
                  onTap: () {
                    if (posState.lastOrderItems.isNotEmpty) {
                      notifier.printLastOrder();
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Reprinting last order...'),
                          backgroundColor: Color(0xFF0D9488),
                          duration: Duration(seconds: 2),
                        ),
                      );
                    } else {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('No last order to print'),
                          backgroundColor: Colors.grey,
                          duration: Duration(seconds: 2),
                        ),
                      );
                    }
                  },
                ),
                const SizedBox(width: 8),
              ],
              // Quick Charge - Always prominent
              _buildLabeledActionButton(
                icon: LucideIcons.zap,
                label: isMobile ? null : 'Quick Charge',
                onTap: () => _showNumpadDialog(itemIndex: null),
                isPrimary: true,
              ),
              // Product Controls (Desktop only)
              if (!isMobile && selectedCategoryId != null) ...[
                const SizedBox(width: 12),
                // Sort
                Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: PopupMenuButton<ProductSortType>(
                    icon: const Icon(
                      LucideIcons.arrowUpDown,
                      color: Color(0xFF64748B),
                      size: 20,
                    ),
                    tooltip: 'Sort',
                    onSelected: (value) => notifier.setSortType(value),
                    itemBuilder: (context) => [
                      const PopupMenuItem(
                        value: ProductSortType.name,
                        child: Text('Name (A-Z)'),
                      ),
                      const PopupMenuItem(
                        value: ProductSortType.priceAsc,
                        child: Text('Price (Low-High)'),
                      ),
                      const PopupMenuItem(
                        value: ProductSortType.priceDesc,
                        child: Text('Price (High-Low)'),
                      ),
                      const PopupMenuItem(
                        value: ProductSortType.recent,
                        child: Text('Recently Added'),
                      ),
                    ],
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                // Grid Columns
                Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: PopupMenuButton<int>(
                    child: Container(
                      width: 48,
                      height: 48,
                      alignment: Alignment.center,
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(
                            LucideIcons.layoutGrid,
                            color: Color(0xFF64748B),
                            size: 16,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            '${posState.crossAxisCount}',
                            style: const TextStyle(
                              color: Color(0xFF64748B),
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                    tooltip: 'Grid Columns (${posState.crossAxisCount})',
                    onSelected: (value) => notifier.setCrossAxisCount(value),
                    itemBuilder: (context) => [
                      const PopupMenuItem(value: 3, child: Text('3 Columns')),
                      const PopupMenuItem(value: 4, child: Text('4 Columns')),
                      const PopupMenuItem(value: 5, child: Text('5 Columns')),
                      const PopupMenuItem(value: 6, child: Text('6 Columns')),
                    ],
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                // Grid/List Toggle
                InkWell(
                  onTap: () => notifier.toggleProductView(),
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Icon(
                      posState.isProductListView
                          ? LucideIcons.layoutGrid
                          : LucideIcons.list,
                      color: const Color(0xFF64748B),
                      size: 20,
                    ),
                  ),
                ),
              ],
            ],
          ),
          // No horizontal pills anymore
        ],
      ),
    );
  }

  // Removed _buildCategoryPill

  Widget _buildLabeledActionButton({
    required IconData icon,
    String? label,
    required VoidCallback onTap,
    bool isPrimary = false,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        height: 48,
        padding: label != null
            ? const EdgeInsets.symmetric(horizontal: 16)
            : null,
        constraints: label != null ? null : const BoxConstraints(minWidth: 48),
        decoration: BoxDecoration(
          color: isPrimary ? const Color(0xFF0D9488) : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: isPrimary ? null : Border.all(color: const Color(0xFFE2E8F0)),
        ),
        child: label != null
            ? Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    icon,
                    color: isPrimary ? Colors.white : const Color(0xFF64748B),
                    size: 18,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    label,
                    style: TextStyle(
                      color: isPrimary ? Colors.white : const Color(0xFF0F172A),
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              )
            : Center(
                child: Icon(
                  icon,
                  color: isPrimary ? Colors.white : const Color(0xFF64748B),
                  size: 20,
                ),
              ),
      ),
    );
  }

  Widget _buildProductCatalog(PosState posState, {bool isMobile = false}) {
    if (posState.error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(LucideIcons.alertCircle, size: 48, color: Colors.red),
            const SizedBox(height: 16),
            Text(
              'Error loading products',
              style: TextStyle(color: Colors.red[700], fontSize: 16),
            ),
            Text(posState.error!, style: const TextStyle(color: Colors.red)),
          ],
        ),
      );
    }

    final selectedCategoryId = posState.selectedCategoryId;
    final searchQuery = _searchController.text.trim();

    // 1. Show Category Grid if no category selected AND no search
    if (selectedCategoryId == null && searchQuery.isEmpty) {
      return _buildCategoryGrid(posState, isMobile: isMobile);
    }

    // 2. Filter Products
    final notifier = ref.read(posProvider.notifier);
    final filteredProducts = notifier.sortedProducts.where((p) {
      final matchesCategory =
          selectedCategoryId == null ||
          p.categoryId == selectedCategoryId ||
          p.category?.id == selectedCategoryId;
      final q = searchQuery.toLowerCase();
      final matchesSearch =
          searchQuery.isEmpty ||
          p.title.toLowerCase().contains(q) ||
          p.slug.toLowerCase().contains(q) ||
          p.variants.any((v) => (v.sku ?? '').toLowerCase().contains(q));
      return matchesCategory && matchesSearch;
    }).toList();

    // If searching globally (no category selected) and no results
    if (filteredProducts.isEmpty && selectedCategoryId == null) {
      if (posState.isLoading) {
        return _buildProductSkeletonGrid(
          isMobile: isMobile,
          crossAxisCount: isMobile ? 2 : posState.crossAxisCount,
        );
      }
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(LucideIcons.packageOpen, size: 64, color: Colors.grey[300]),
            const SizedBox(height: 16),
            Text(
              'No products found',
              style: TextStyle(color: Colors.grey[500], fontSize: 16),
            ),
          ],
        ),
      );
    }

    // 3. Prepare Grid Items (Add Back Button if inside a category)
    // Note: If we are searching, we might NOT want the back button if we are "filtering in place"?
    // User request: "the first products of a category is always a back button."
    // We will add it if a category is active.

    final showBackButton = selectedCategoryId != null;
    final totalItemCount = filteredProducts.length + (showBackButton ? 1 : 0);

    return LayoutBuilder(
      builder: (context, constraints) {
        final crossAxisCount = isMobile
            ? 2
            : posState.crossAxisCount; // Use state for desktop

        if (posState.isProductListView) {
          // List View Implementation
          return ListView.separated(
            padding: EdgeInsets.only(bottom: isMobile ? 100 : 0),
            itemCount: totalItemCount,
            separatorBuilder: (_, __) => const SizedBox(height: 8),
            itemBuilder: (context, index) {
              if (showBackButton) {
                if (index == 0) return _buildBackListTile();
                final product = filteredProducts[index - 1];
                return _buildProductListTile(product);
              }
              final product = filteredProducts[index];
              return _buildProductListTile(product);
            },
          );
        }

        // Grid View Implementation
        return GridView.builder(
          padding: EdgeInsets.only(
            bottom: isMobile ? 100 : 0,
            left: isMobile ? 16 : 0,
            right: isMobile ? 16 : 0,
          ),
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: crossAxisCount,
            childAspectRatio: 0.75, // Same aspect ratio for everything
            crossAxisSpacing: 16,
            mainAxisSpacing: 16,
          ),
          itemCount: totalItemCount,
          itemBuilder: (context, index) {
            if (showBackButton) {
              if (index == 0) return _buildBackCard();
              final product = filteredProducts[index - 1];
              return _buildProductCard(product);
            }
            final product = filteredProducts[index];
            return _buildProductCard(product);
          },
        );
      },
    );
  }

  Widget _buildCategoryGrid(PosState posState, {bool isMobile = false}) {
    if (posState.isLoading && posState.categories.isEmpty) {
      return _buildCategorySkeletonGrid(isMobile: isMobile);
    }

    return LayoutBuilder(
      builder: (context, constraints) {
        // MATCH EXACTLY the product grid layout logic
        final crossAxisCount = isMobile
            ? 2
            : posState.crossAxisCount; // Use state for desktop

        return GridView.builder(
          padding: EdgeInsets.only(
            bottom: isMobile ? 100 : 0,
            left: isMobile ? 16 : 0,
            right: isMobile ? 16 : 0,
          ),
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: crossAxisCount,
            childAspectRatio: 0.75, // MATCHES Product Card Aspect Ratio
            crossAxisSpacing: 16,
            mainAxisSpacing: 16,
          ),
          itemCount: posState.categories.length,
          itemBuilder: (context, index) {
            final category = posState.categories[index];
            return _buildCategoryCard(category);
          },
        );
      },
    );
  }

  Widget _buildBackCard() {
    return _HoverableProductCard(
      onTap: () => ref.read(posProvider.notifier).selectCategory(null),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: const BoxDecoration(
              color: Color(0xFFCCFBF1), // Teal 100
              shape: BoxShape.circle,
            ),
            child: const Icon(
              LucideIcons.arrowLeft,
              size: 40,
              color: Color(0xFF0D9488), // Teal 600
            ),
          ),
          const SizedBox(height: 12),
          const Text(
            'Back',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: Color(0xFF0D9488),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBackListTile() {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: const Color(0xFFF0FDFA), // Teal 50
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: const Color(0xFF0D9488).withValues(alpha: 0.2),
          width: 1.5,
        ),
      ),
      child: ListTile(
        leading: Container(
          padding: const EdgeInsets.all(8),
          decoration: const BoxDecoration(
            color: Color(0xFFCCFBF1), // Teal 100
            shape: BoxShape.circle,
          ),
          child: const Icon(
            LucideIcons.arrowLeft,
            color: Color(0xFF0D9488),
            size: 20,
          ),
        ),
        title: const Text(
          'Back to Categories',
          style: TextStyle(
            fontWeight: FontWeight.w600,
            color: Color(0xFF0D9488),
          ),
        ),
        onTap: () => ref.read(posProvider.notifier).selectCategory(null),
      ),
    );
  }

  Widget _buildCategoryCard(Category category) {
    final imageUrl = category.imageUrl != null
        ? ref.read(apiProvider).resolvePublicUrl(category.imageUrl!)
        : null;

    return GestureDetector(
      onTap: () => ref.read(posProvider.notifier).selectCategory(category.id),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.05),
              blurRadius: 8,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Expanded(
              child: ClipRRect(
                borderRadius: const BorderRadius.vertical(
                  top: Radius.circular(16),
                ),
                child: imageUrl != null && imageUrl.isNotEmpty
                    ? Container(
                        color: Colors.white, // Background for PNG transparency
                        child: Image.network(imageUrl, fit: BoxFit.cover),
                      )
                    : Container(
                        color: const Color(0xFFCCFBF1), // Teal 50
                        child: Center(
                          child: Icon(
                            LucideIcons.layoutGrid,
                            color: const Color(
                              0xFF0D9488,
                            ).withValues(alpha: 0.5), // Teal 600
                            size: 48,
                          ),
                        ),
                      ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    category.title,
                    style: const TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 16,
                      color: Color(0xFF0F172A),
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Category', // Subtitle placeholder
                    style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildProductListTile(Product product) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.all(8),
        leading: Container(
          width: 56,
          height: 56,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(8),
            color: const Color(0xFFF1F5F9),
            image: product.mainImageUrl != null
                ? DecorationImage(
                    image: NetworkImage(
                      ref
                          .read(apiProvider)
                          .resolvePublicUrl(product.mainImageUrl!),
                    ),
                    fit: BoxFit.cover,
                  )
                : null,
          ),
          child: product.mainImageUrl == null
              ? const Icon(LucideIcons.image, color: Colors.grey)
              : null,
        ),
        title: Text(
          product.title,
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        subtitle: Text(
          'Stock: ${product.stock}',
          style: TextStyle(
            color: product.stock <= 0 ? Colors.red : Colors.grey[600],
          ),
        ),
        trailing: Text(
          NumberFormat.simpleCurrency().format(product.price),
          style: const TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: 16,
            color: Color(0xFF0F172A),
          ),
        ),
        onTap: () => _handleProductTap(product),
        onLongPress: () => _handleProductLongPress(product),
      ),
    );
  }

  Widget _buildProductCard(Product product) {
    final imageUrl = product.mainImageUrl != null
        ? ref.read(apiProvider).resolvePublicUrl(product.mainImageUrl!)
        : null;

    return _HoverableProductCard(
      onTap: () => _handleProductTap(product),
      onLongPress: () => _handleProductLongPress(product),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Expanded(
            child: Stack(
              fit: StackFit.expand,
              children: [
                ClipRRect(
                  borderRadius: const BorderRadius.vertical(
                    top: Radius.circular(16),
                  ),
                  child: imageUrl != null
                      ? Image.network(imageUrl, fit: BoxFit.cover)
                      : Container(
                          color: const Color(0xFFF1F5F9),
                          child: const Icon(
                            LucideIcons.image,
                            color: Colors.grey,
                          ),
                        ),
                ),
                if (product.stock <= 5)
                  Positioned(
                    top: 8,
                    right: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: product.stock <= 0
                            ? Colors.red.withValues(alpha: 0.9)
                            : Colors.orange.withValues(alpha: 0.9),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        product.stock <= 0
                            ? 'Out of Stock'
                            : 'Low Stock: ${product.stock}',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  product.title,
                  style: const TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 14,
                    height: 1.2,
                    color: Color(0xFF334155), // Slate 700
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 8),
                Text(
                  NumberFormat.simpleCurrency().format(product.price),
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 20,
                    color: Color(0xFF4F46E5), // Indigo 600
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCartContent(PosState posState) {
    final notifier = ref.read(posProvider.notifier);

    return Column(
      children: [
        // Cart Header (Tabs)
        Container(
          color: const Color(0xFFF8FAFC),
          child: Row(
            children: List.generate(3, (index) {
              final isSelected = posState.currentSessionIndex == index;
              return Expanded(
                child: InkWell(
                  onTap: () => notifier.switchSession(index),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    decoration: BoxDecoration(
                      color: isSelected
                          ? Colors.white
                          : const Color(0xFFF8FAFC),
                      border: Border(
                        bottom: BorderSide(
                          color: isSelected
                              ? const Color(0xFF0D9488)
                              : const Color(0xFFE2E8F0),
                          width: 2,
                        ),
                      ),
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      'Order ${index + 1}',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                        color: isSelected
                            ? const Color(0xFF0F172A)
                            : const Color(0xFF94A3B8),
                      ),
                    ),
                  ),
                ),
              );
            }),
          ),
        ),

        // Action Header
        Container(
          padding: const EdgeInsets.all(16),
          decoration: const BoxDecoration(
            border: Border(bottom: BorderSide(color: Color(0xFFE2E8F0))),
          ),
          child: Row(
            children: [
              Expanded(child: _buildClientSelector(posState)),
              const SizedBox(width: 8),
              // Cart View Toggle
              InkWell(
                onTap: () => notifier.toggleCartView(),
                borderRadius: BorderRadius.circular(8),
                child: Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Icon(
                    posState.isCartSimpleView
                        ? LucideIcons.image
                        : LucideIcons.alignJustify,
                    color: const Color(0xFF64748B),
                    size: 18,
                  ),
                ),
              ),
              const SizedBox(width: 4),
              IconButton(
                onPressed: () => notifier.clearCart(),
                icon: const Icon(LucideIcons.trash2, color: Colors.red),
                tooltip: 'Clear Cart',
              ),
            ],
          ),
        ),

        // Cart Items List
        Expanded(
          child: posState.cart.isEmpty
              ? _buildEmptyCart()
              : ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: posState.cart.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (context, index) {
                    final item = posState.cart[index];
                    return _buildCartItem(item, index, notifier, posState);
                  },
                ),
        ),

        // Footer Summary
        _buildCartFooter(posState),
      ],
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
    // Simple View: Name and quantity controls
    if (posState.isCartSimpleView) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: const Color(0xFFF8FAFC),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        child: Row(
          children: [
            Expanded(
              child: Text(
                item.name,
                style: const TextStyle(
                  fontWeight: FontWeight.w600,
                  fontSize: 13,
                  color: Color(0xFF0F172A),
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            const SizedBox(width: 8),
            // Qty controls
            Row(
              children: [
                _buildQtyBtn(
                  icon: LucideIcons.minus,
                  onTap: () =>
                      notifier.updateQuantityAtIndex(index, item.quantity - 1),
                ),
                InkWell(
                  onTap: () => _showNumpadDialog(itemIndex: index),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    child: AnimatedSwitcher(
                      duration: const Duration(milliseconds: 300),
                      transitionBuilder: (child, animation) {
                        return ScaleTransition(
                          scale: animation,
                          child: FadeTransition(
                            opacity: animation,
                            child: child,
                          ),
                        );
                      },
                      child: Text(
                        '${item.quantity}',
                        key: ValueKey<int>(item.quantity),
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                          color: Color(0xFF0F172A),
                        ),
                      ),
                    ),
                  ),
                ),
                _buildQtyBtn(
                  icon: LucideIcons.plus,
                  onTap: () =>
                      notifier.updateQuantityAtIndex(index, item.quantity + 1),
                ),
              ],
            ),
            const SizedBox(width: 8),
            InkWell(
              onTap: () =>
                  notifier.removeFromCart(item.productId, item.variantId),
              child: const Icon(LucideIcons.x, size: 14, color: Colors.red),
            ),
          ],
        ),
      );
    }

    // Detailed View: Full controls
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Product Image
          if (item.imageUrl != null)
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: Image.network(
                item.imageUrl!,
                width: 60,
                height: 60,
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) => Container(
                  width: 60,
                  height: 60,
                  decoration: BoxDecoration(
                    color: const Color(0xFFE2E8F0),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(
                    LucideIcons.image,
                    color: Color(0xFF94A3B8),
                    size: 28,
                  ),
                ),
              ),
            ),
          if (item.imageUrl != null) const SizedBox(width: 12),
          // Content
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
                        style: const TextStyle(
                          fontWeight: FontWeight.w600,
                          fontSize: 14,
                          color: Color(0xFF0F172A),
                        ),
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
                        color: Colors.red,
                      ),
                    ),
                  ],
                ),
                if (item.variantTitle != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text(
                      item.variantTitle!,
                      style: const TextStyle(
                        fontSize: 12,
                        color: Color(0xFF64748B),
                      ),
                    ),
                  ),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        _buildQtyBtn(
                          icon: LucideIcons.minus,
                          onTap: () => notifier.updateQuantityAtIndex(
                            index,
                            item.quantity - 1,
                          ),
                        ),
                        InkWell(
                          onTap: () => _showNumpadDialog(itemIndex: index),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12),
                            child: AnimatedSwitcher(
                              duration: const Duration(milliseconds: 300),
                              transitionBuilder: (child, animation) {
                                return ScaleTransition(
                                  scale: animation,
                                  child: FadeTransition(
                                    opacity: animation,
                                    child: child,
                                  ),
                                );
                              },
                              child: Text(
                                '${item.quantity}',
                                key: ValueKey<int>(item.quantity),
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 16,
                                ),
                              ),
                            ),
                          ),
                        ),
                        _buildQtyBtn(
                          icon: LucideIcons.plus,
                          onTap: () => notifier.updateQuantityAtIndex(
                            index,
                            item.quantity + 1,
                          ),
                        ),
                      ],
                    ),
                    Text(
                      NumberFormat.simpleCurrency().format(
                        item.price * item.quantity,
                      ),
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                        color: Color(0xFF0F172A),
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

  Widget _buildQtyBtn({required IconData icon, required VoidCallback onTap}) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        width: 32,
        height: 32,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: const Color(0xFFCBD5E1), width: 1.5),
        ),
        child: Icon(icon, size: 18, color: const Color(0xFF0F172A)),
      ),
    );
  }

  Widget _buildClientSelector(PosState posState) {
    return Consumer(
      builder: (context, ref, child) {
        final customersState = ref.watch(customersProvider);
        final customers = customersState.customers;

        return Autocomplete<Customer>(
          optionsBuilder: (TextEditingValue textEditingValue) {
            if (textEditingValue.text.isEmpty) {
              return customers;
            }
            return customers.where((customer) {
              return customer.name.toLowerCase().contains(
                textEditingValue.text.toLowerCase(),
              );
            });
          },
          displayStringForOption: (customer) => customer.name,
          onSelected: (customer) {
            ref.read(posProvider.notifier).selectCustomer(customer);
          },
          fieldViewBuilder: (context, controller, focusNode, onFieldSubmitted) {
            if (posState.selectedCustomer != null && controller.text.isEmpty) {
              controller.text = posState.selectedCustomer!.name;
            }
            // Clear text logic if needed
            return TextField(
              controller: controller,
              focusNode: focusNode,
              decoration: InputDecoration(
                hintText: 'Add Client +',
                hintStyle: const TextStyle(
                  color: Color(0xFF94A3B8),
                  fontSize: 13,
                ),
                prefixIcon: const Icon(
                  LucideIcons.user,
                  size: 16,
                  color: Colors.grey,
                ),
                suffixIcon: posState.selectedCustomer != null
                    ? IconButton(
                        icon: const Icon(LucideIcons.x, size: 14),
                        onPressed: () {
                          ref.read(posProvider.notifier).selectCustomer(null);
                          controller.clear();
                        },
                      )
                    : null,
                filled: true,
                fillColor: const Color(0xFFF1F5F9), // Slate 100
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: BorderSide.none,
                ),
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 0,
                ),
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildCartFooter(PosState posState) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: Color(0xFFE2E8F0))),
      ),
      child: Column(
        children: [
          // Total Row
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Total',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF64748B),
                ),
              ),
              Text(
                NumberFormat.simpleCurrency().format(posState.total),
                style: const TextStyle(
                  fontSize: 32,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF4F46E5), // Indigo 600
                  letterSpacing: -0.5,
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          Row(
            children: [
              Expanded(
                flex: 2,
                child: SizedBox(
                  height: 56,
                  child: OutlinedButton(
                    onPressed: posState.cart.isEmpty
                        ? null
                        : () => _showPaymentSheet(posState),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFF64748B),
                      side: const BorderSide(color: Color(0xFFE2E8F0)),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(LucideIcons.creditCard, size: 20),
                        SizedBox(width: 8),
                        Flexible(
                          child: Text(
                            'Payment',
                            style: TextStyle(fontWeight: FontWeight.bold),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                flex: 3,
                child: SizedBox(
                  height: 56,
                  child: ElevatedButton(
                    onPressed: posState.cart.isEmpty
                        ? null
                        : () async {
                            final ok = await ref
                                .read(posProvider.notifier)
                                .checkoutFast();
                            if (!context.mounted) return;

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
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF4F46E5),
                      foregroundColor: Colors.white,
                      elevation: 2,
                      shadowColor: const Color(
                        0xFF4F46E5,
                      ).withValues(alpha: 0.4),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: posState.isLoading
                        ? const CircularProgressIndicator(color: Colors.white)
                        : const Text(
                            'Checkout',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 0.5,
                            ),
                          ),
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
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: const Color(0xFFF0FDFA),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              LucideIcons.shoppingCart,
              size: 64,
              color: Color(0xFF0D9488),
            ),
          ),
          const SizedBox(height: 24),
          const Text(
            'Cart is empty',
            style: TextStyle(
              color: Color(0xFF0F172A),
              fontSize: 18,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Add products to get started',
            style: TextStyle(color: Color(0xFF64748B), fontSize: 14),
          ),
          const SizedBox(height: 4),
          const Text(
            'Use the quick charge button for custom amounts',
            style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
          ),
        ],
      ),
    );
  }

  Widget _buildMobileCartSummary(PosState posState) {
    if (posState.cart.isEmpty) return const SizedBox.shrink();

    final itemCount = posState.cart.fold<int>(
      0,
      (sum, item) => sum + item.quantity,
    );

    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A), // Slate 900
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF4F46E5).withValues(alpha: 0.3),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => _showMobileCartSheet(context, posState),
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 6,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    '$itemCount',
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                const Text(
                  'View Cart',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const Spacer(),
                Text(
                  NumberFormat.simpleCurrency().format(posState.total),
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
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
        return Container(
          height: MediaQuery.of(context).size.height * 0.9,
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: Column(
            children: [
              Container(
                width: 40,
                height: 4,
                margin: const EdgeInsets.symmetric(vertical: 12),
                decoration: BoxDecoration(
                  color: Colors.grey[300],
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
    // TODO: Add product quick actions on long-press (e.g., add quantity, note,
    // price override, or view details) instead of duplicating the tap behavior.
  }

  Future<ProductVariant?> _showVariantSelectorSheet(Product product) {
    // Keep mostly same logic but update styling
    // final rawImageUrl = product.mainImageUrl;
    // final imageUrl = rawImageUrl == null
    //     ? null
    //     : ref.read(apiProvider).resolvePublicUrl(rawImageUrl);

    return showModalBottomSheet<ProductVariant>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        final options = product.options;
        final variants = product.variants.where((v) => v.isActive).toList();

        final selectedByOptionId = <String, String?>{
          for (final o in options) o.id: null,
        };

        return StatefulBuilder(
          builder: (context, setState) {
            ProductVariant? matchVariant() {
              if (options.isEmpty) return null;
              final allSelected = options.every(
                (o) => selectedByOptionId[o.id] != null,
              );
              if (!allSelected) return null;

              for (final variant in variants) {
                final ok = options.every((o) {
                  final wantedValueId = selectedByOptionId[o.id]!;
                  return variant.optionValues.any(
                    (ov) =>
                        ov.optionId == o.id &&
                        ov.optionValueId == wantedValueId,
                  );
                });
                if (ok) return variant;
              }
              return null;
            }

            int availableStock(ProductVariant variant) {
              if (!variant.trackInventory) return 999999;
              final available =
                  variant.stock - variant.reserved - variant.safetyStock;
              return available < 0 ? 0 : available;
            }

            final currentVariant = matchVariant();
            final canAdd =
                currentVariant != null &&
                (!currentVariant.trackInventory ||
                    availableStock(currentVariant) > 0);

            return SafeArea(
              child: Padding(
                padding: EdgeInsets.only(
                  left: 24,
                  right: 24,
                  top: 24,
                  bottom: 24 + MediaQuery.of(context).viewInsets.bottom,
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            product.title,
                            style: const TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF0F172A),
                            ),
                          ),
                        ),
                        IconButton(
                          onPressed: () => Navigator.pop(context),
                          icon: const Icon(LucideIcons.x),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),
                    ...options.map((option) {
                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            option.name,
                            style: const TextStyle(
                              fontWeight: FontWeight.w600,
                              fontSize: 14,
                              color: Color(0xFF64748B),
                            ),
                          ),
                          const SizedBox(height: 12),
                          Wrap(
                            spacing: 12,
                            runSpacing: 12,
                            children: option.values.map((value) {
                              final isSelected =
                                  selectedByOptionId[option.id] == value.id;
                              return ChoiceChip(
                                label: Text(value.label),
                                selected: isSelected,
                                selectedColor: const Color(0xFF0F172A),
                                backgroundColor: Colors.white,
                                labelStyle: TextStyle(
                                  color: isSelected
                                      ? Colors.white
                                      : const Color(0xFF0F172A),
                                  fontWeight: FontWeight.w600,
                                ),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(8),
                                  side: BorderSide(
                                    color: isSelected
                                        ? const Color(0xFF0F172A)
                                        : const Color(0xFFE2E8F0),
                                  ),
                                ),
                                onSelected: (selected) {
                                  setState(() {
                                    selectedByOptionId[option.id] = selected
                                        ? value.id
                                        : null;
                                  });
                                },
                              );
                            }).toList(),
                          ),
                          const SizedBox(height: 20),
                        ],
                      );
                    }),
                    if (currentVariant != null) ...[
                      const Divider(),
                      const SizedBox(height: 16),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                NumberFormat.simpleCurrency().format(
                                  currentVariant.price,
                                ),
                                style: const TextStyle(
                                  fontSize: 24,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF0D9488),
                                ),
                              ),
                              if (currentVariant.trackInventory)
                                Text(
                                  '${availableStock(currentVariant)} available',
                                  style: TextStyle(
                                    color: availableStock(currentVariant) > 0
                                        ? Colors.green
                                        : Colors.red,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                            ],
                          ),
                          ElevatedButton(
                            onPressed: canAdd
                                ? () => Navigator.pop(context, currentVariant)
                                : null,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF0F172A),
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(
                                horizontal: 32,
                                vertical: 16,
                              ),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                            child: const Text('Add to Cart'),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
            );
          },
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
              ? (Matrix4.identity()..translate(0.0, -4.0, 0.0))
              : Matrix4.identity(),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: _isHovered ? 0.1 : 0.05),
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
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        height: 64, // Bigger tap target
        padding: const EdgeInsets.symmetric(horizontal: 16),
        decoration: BoxDecoration(
          color: isSelected ? Colors.white : const Color(0xFFF1F5F9),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? const Color(0xFF0F172A) : Colors.transparent,
            width: 2,
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.05),
                    blurRadius: 4,
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
              color: isSelected
                  ? const Color(0xFF0F172A)
                  : const Color(0xFF64748B),
              size: 20,
            ),
            const SizedBox(width: 12),
            Text(
              title,
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 16,
                color: isSelected
                    ? const Color(0xFF0F172A)
                    : const Color(0xFF64748B),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
