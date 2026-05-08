import 'package:esc_pos_utils_plus/esc_pos_utils_plus.dart';
import 'package:intl/intl.dart';
import '../models/printer_profile.dart';
import '../models/pos_models.dart';
import '../models/customer.dart';
import '../models/receipt_layout.dart';

class ReceiptBuilder {
  Future<List<int>> buildReceipt({
    required PrinterProfile profile,
    required List<CartItem> items,
    required double total,
    double discountAmount = 0,
    Customer? customer,
    String? orderId,
    DateTime? date,
    ReceiptLayout? layout,
    String currencyCode = 'DZD',
  }) async {
    final money = NumberFormat.simpleCurrency(name: currencyCode);
    final effectiveLayout = layout ?? ReceiptLayout.standard();

    final CapabilityProfile capabilityProfile = await CapabilityProfile.load(
      name: _getProfileName(profile.profileId),
    );
    final generator = Generator(
      profile.paperWidth == 58 ? PaperSize.mm58 : PaperSize.mm80,
      capabilityProfile,
    );

    List<int> bytes = [];

    // 1. Header
    if (effectiveLayout.showHeader) {
      bytes += generator.text(
        effectiveLayout.headerText,
        styles: const PosStyles(
          align: PosAlign.center,
          height: PosTextSize.size2,
          width: PosTextSize.size2,
          bold: true,
        ),
      );
      bytes += generator.feed(1);
    }

    if (effectiveLayout.showOrderNumber && orderId != null) {
      bytes += generator.text(
        'Order #$orderId',
        styles: const PosStyles(align: PosAlign.center),
      );
    }

    if (effectiveLayout.showDate) {
      bytes += generator.text(
        DateFormat('dd/MM/yyyy HH:mm').format(date ?? DateTime.now()),
        styles: const PosStyles(align: PosAlign.center),
      );
    }

    // Customer Info
    if (effectiveLayout.showCustomerInfo && customer != null) {
      bytes += generator.feed(1);
      bytes += generator.text('Customer: ${customer.name}');
      if (customer.phone.isNotEmpty) {
        bytes += generator.text('Phone: ${customer.phone}');
      }
    }

    bytes += generator.feed(1);
    bytes += generator.hr();

    // 2. Items
    if (profile.paperWidth == 58) {
      // 58mm Layout
      for (var item in items) {
        bytes += generator.text(
          item.name +
              (item.variantTitle != null ? ' (${item.variantTitle})' : ''),
          styles: const PosStyles(bold: true),
        );
        bytes += generator.row([
          PosColumn(
            text:
                '${item.quantity} x ${money.format(item.price)}',
            width: 8,
          ),
          PosColumn(
            text: money.format(
              item.price * item.quantity,
            ),
            width: 4,
            styles: const PosStyles(align: PosAlign.right),
          ),
        ]);
      }
    } else {
      // 80mm Layout
      bytes += generator.row([
        PosColumn(text: 'Item', width: 6, styles: const PosStyles(bold: true)),
        PosColumn(
          text: 'Qty',
          width: 2,
          styles: const PosStyles(bold: true, align: PosAlign.center),
        ),
        PosColumn(
          text: 'Price',
          width: 2,
          styles: const PosStyles(bold: true, align: PosAlign.right),
        ),
        PosColumn(
          text: 'Total',
          width: 2,
          styles: const PosStyles(bold: true, align: PosAlign.right),
        ),
      ]);
      bytes += generator.hr();

      for (var item in items) {
        String name =
            item.name +
            (item.variantTitle != null ? ' (${item.variantTitle})' : '');
        bytes += generator.row([
          PosColumn(text: name, width: 6),
          PosColumn(
            text: item.quantity.toString(),
            width: 2,
            styles: const PosStyles(align: PosAlign.center),
          ),
          PosColumn(
            text: item.price.toStringAsFixed(2),
            width: 2,
            styles: const PosStyles(align: PosAlign.right),
          ),
          PosColumn(
            text: (item.price * item.quantity).toStringAsFixed(2),
            width: 2,
            styles: const PosStyles(align: PosAlign.right),
          ),
        ]);
      }
    }

    bytes += generator.hr();

    // 3. Totals
    if (discountAmount > 0) {
      bytes += generator.row([
        PosColumn(
          text: 'Discount',
          width: 6,
          styles: const PosStyles(bold: true),
        ),
        PosColumn(
          text: '-${money.format(discountAmount)}',
          width: 6,
          styles: const PosStyles(align: PosAlign.right, bold: true),
        ),
      ]);
    }

    bytes += generator.row([
      PosColumn(
        text: 'TOTAL',
        width: 6,
        styles: const PosStyles(
          height: PosTextSize.size2,
          width: PosTextSize.size2,
          bold: true,
        ),
      ),
      PosColumn(
        text: money.format(total),
        width: 6,
        styles: const PosStyles(
          height: PosTextSize.size2,
          width: PosTextSize.size2,
          bold: true,
          align: PosAlign.right,
        ),
      ),
    ]);

    bytes += generator.feed(2);
    if (effectiveLayout.showFooter) {
      bytes += generator.text(
        effectiveLayout.footerText,
        styles: const PosStyles(align: PosAlign.center, bold: true),
      );
    }
    bytes += generator.feed(3);

    // 4. Cut & Drawer
    if (profile.cut) {
      bytes += generator.cut();
    }
    if (profile.drawer) {
      bytes += generator.drawer();
    }

    return bytes;
  }

  String _getProfileName(int profileId) {
    // Basic mapping, can be expanded
    switch (profileId) {
      case 1:
        return 'XP-N160I';
      case 2:
        return 'RP80USE';
      default:
        return 'default';
    }
  }
}
