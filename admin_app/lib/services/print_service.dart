import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:pdf/pdf.dart';
import 'package:printing/printing.dart';

import '../../models/printer_profile.dart';
import '../../models/pos_models.dart';
import '../../models/customer.dart';
import '../../models/receipt_layout.dart';
import 'receipt_builder.dart';

import 'senders/printer_sender.dart';
import 'senders/network_sender.dart';
import 'senders/ble_sender.dart';
import 'senders/bluetooth_sender.dart';
import 'senders/windows_spooler_sender.dart';
import 'senders/serial_sender.dart';
// import 'senders/pdf_sender.dart'; // Handled inline or separate

class SenderFactory {
  static PrinterSender getSender(PrinterTransport transport) {
    switch (transport) {
      case PrinterTransport.network:
        return NetworkSender();
      case PrinterTransport.ble:
        return BleSender();
      case PrinterTransport.bluetooth:
        return BluetoothSender();
      case PrinterTransport.windows:
        return WindowsSpoolerSender();
      case PrinterTransport.serial:
        return SerialPortSender();
      default:
        throw Exception('Transport not supported for raw byte sending');
    }
  }
}

class PrintService {
  final ReceiptBuilder _receiptBuilder = ReceiptBuilder();

  Future<void> printReceipt({
    required PrinterProfile profile,
    required List<CartItem> items,
    required double total,
    Customer? customer,
    String? orderId,
    ReceiptLayout? layout,
  }) async {
    if (profile.transport == PrinterTransport.pdf) {
      // Handle PDF/System Printing separately
      await _printPdf(items, total, customer, orderId);
      return;
    }

    // 1. Build generic ESC/POS bytes
    final bytes = await _receiptBuilder.buildReceipt(
      profile: profile,
      items: items,
      total: total,
      customer: customer,
      orderId: orderId,
      layout: layout,
    );

    // 2. Get Sender
    final sender = SenderFactory.getSender(profile.transport);

    // 3. Send
    await sender.send(bytes, profile);
  }

  Future<void> _printPdf(
    List<CartItem> items,
    double total,
    Customer? customer,
    String? orderId,
  ) async {
    final doc = pw.Document();

    doc.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.roll80,
        build: (pw.Context context) {
          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              pw.Center(
                child: pw.Text(
                  'MySaaS Store',
                  style: pw.TextStyle(
                    fontWeight: pw.FontWeight.bold,
                    fontSize: 18,
                  ),
                ),
              ),
              if (orderId != null) pw.Center(child: pw.Text('Order #$orderId')),
              pw.Divider(),
              ...items.map(
                (item) => pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  children: [
                    pw.Expanded(child: pw.Text(item.name)),
                    pw.Text('x${item.quantity}'),
                    pw.Text(
                      '${(item.price * item.quantity).toStringAsFixed(2)}',
                    ),
                  ],
                ),
              ),
              pw.Divider(),
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Text(
                    'TOTAL',
                    style: pw.TextStyle(fontWeight: pw.FontWeight.bold),
                  ),
                  pw.Text(
                    total.toStringAsFixed(2),
                    style: pw.TextStyle(fontWeight: pw.FontWeight.bold),
                  ),
                ],
              ),
            ],
          );
        },
      ),
    );

    await Printing.layoutPdf(
      onLayout: (PdfPageFormat format) async => doc.save(),
    );
  }
}

final printServiceProvider = Provider<PrintService>((ref) => PrintService());
