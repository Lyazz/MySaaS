import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../models/contact_info.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:pdf/pdf.dart';
import 'package:printing/printing.dart';

import '../../models/printer_profile.dart';
import '../../models/pos_models.dart';
import '../../models/customer.dart';
import '../../models/receipt_layout.dart';
import 'receipt_builder.dart';
import '../../providers/store_settings_provider.dart';
import 'api_service.dart';
import '../repositories/contact_infos_repository.dart';

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
  final Ref ref;
  final ReceiptBuilder _receiptBuilder = ReceiptBuilder();

  PrintService(this.ref);

  Future<void> printReceipt({
    required PrinterProfile profile,
    required List<CartItem> items,
    required double total,
    double discountAmount = 0,
    Customer? customer,
    String? orderId,
    ReceiptLayout? layout,
    String? currencyCode,
  }) async {
    // Fetch global settings
    final storeSettings = ref.read(storeSettingsProvider).settings;
    final contactRepo = ContactInfosRepository(ref.read(apiProvider));
    final contactList = await contactRepo.list().catchError((_) => <ContactInfo>[]);
    final contactInfos = { for (var e in contactList) e.kind : e.value };

    final actualCurrencyCode = currencyCode ?? storeSettings.currencyCode;

    if (profile.transport == PrinterTransport.pdf) {
      // Handle PDF/System Printing separately
      final doc = await buildPdfDocument(items, total, discountAmount, customer, orderId, layout, storeSettings, contactInfos, actualCurrencyCode);
      await Printing.layoutPdf(
        onLayout: (PdfPageFormat format) async => doc.save(),
      );
      return;
    }

    if (profile.forceImagePrint) {
      // Build PDF and rasterize to image for ESC/POS
      final doc = await buildPdfDocument(items, total, discountAmount, customer, orderId, layout, storeSettings, contactInfos, actualCurrencyCode);
      final bytes = await doc.save();
      final images = <List<int>>[];
      await for (final page in Printing.raster(bytes, dpi: 200)) {
        final pngBytes = await page.toPng();
        images.add(pngBytes);
      }
      // We'll use receiptBuilder to wrap the images in ESC/POS commands
      final escPosBytes = await _receiptBuilder.buildImageReceipt(profile: profile, images: images);
      final sender = SenderFactory.getSender(profile.transport);
      await sender.send(escPosBytes, profile);
      return;
    }

    // 1. Build generic ESC/POS bytes
    final bytes = await _receiptBuilder.buildReceipt(
      profile: profile,
      items: items,
      total: total,
      discountAmount: discountAmount,
      customer: customer,
      orderId: orderId,
      layout: layout,
      storeSettings: storeSettings,
      contactInfos: contactInfos,
      currencyCode: actualCurrencyCode,
    );

    // 2. Get Sender
    final sender = SenderFactory.getSender(profile.transport);

    // 3. Send
    await sender.send(bytes, profile);
  }

  Future<pw.Document> buildPdfDocument(
    List<CartItem> items,
    double total,
    double discountAmount,
    Customer? customer,
    String? orderId,
    ReceiptLayout? layout,
    dynamic storeSettings,
    Map<String, String> contactInfos,
    String? currencyCode,
  ) async {
    final actualCurrencyCode = currencyCode ?? storeSettings?.currencyCode ?? 'DZD';
    final money = NumberFormat.simpleCurrency(name: actualCurrencyCode);
    final effectiveLayout = layout ?? ReceiptLayout.standard();
    final doc = pw.Document();
    
    final storeName = effectiveLayout.storeNameOverride ?? storeSettings?.name ?? 'MySaaS Store';
    final storeAddress = effectiveLayout.storeAddressOverride ?? contactInfos['address'];
    final storePhone = effectiveLayout.storePhoneOverride ?? contactInfos['phone'];
    final storeEmail = effectiveLayout.storeEmailOverride ?? contactInfos['email'];

    doc.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.roll80,
        build: (pw.Context context) {
          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.center,
            children: [
              if (effectiveLayout.showStoreName) ...[
                pw.Text(
                  storeName,
                  style: pw.TextStyle(
                    fontWeight: pw.FontWeight.bold,
                    fontSize: 20,
                  ),
                ),
                pw.SizedBox(height: 8),
              ],
              
              if (effectiveLayout.showStoreAddress && storeAddress != null && storeAddress.isNotEmpty)
                pw.Text(storeAddress, style: const pw.TextStyle(fontSize: 12)),
              if (effectiveLayout.showStorePhone && storePhone != null && storePhone.isNotEmpty)
                pw.Text("admin.receipt.print.tel".tr(namedArgs: {'phone': storePhone}), style: const pw.TextStyle(fontSize: 12)),
              if (storeEmail != null && storeEmail.isNotEmpty && effectiveLayout.showStoreEmail)
                pw.Text("admin.receipt.print.email".tr(namedArgs: {'email': storeEmail}), style: const pw.TextStyle(fontSize: 12)),

              if (effectiveLayout.showStoreAddress || effectiveLayout.showStorePhone || effectiveLayout.showStoreEmail)
                pw.SizedBox(height: 12),

              if (effectiveLayout.showHeader && effectiveLayout.headerText.isNotEmpty) ...[
                pw.Text(
                  effectiveLayout.headerText,
                  style: pw.TextStyle(
                    fontWeight: pw.FontWeight.bold,
                    fontSize: 14,
                  ),
                ),
                pw.SizedBox(height: 12),
              ],

              if (effectiveLayout.showOrderNumber && orderId != null) 
                pw.Text("admin.receipt.print.orderNum".tr(namedArgs: {'id': orderId})),
                
              if (effectiveLayout.showDate)
                pw.Text(DateFormat('dd/MM/yyyy HH:mm').format(DateTime.now())),
                
              if (effectiveLayout.showCustomerInfo && customer != null) ...[
                pw.SizedBox(height: 12),
                pw.Text("admin.receipt.print.customer".tr(namedArgs: {'name': customer.name})),
                if (customer.phone.isNotEmpty) pw.Text("admin.receipt.print.phone".tr(namedArgs: {'phone': customer.phone})),
              ],
                
              pw.SizedBox(height: 12),
              pw.Divider(borderStyle: pw.BorderStyle.dashed),
              
              // Items Header
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Expanded(child: pw.Text('Item', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 11))),
                  pw.Container(
                    width: 30,
                    alignment: pw.Alignment.center,
                    child: pw.Text('Qty', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 11)),
                  ),
                  pw.Container(
                    width: 60,
                    alignment: pw.Alignment.centerRight,
                    child: pw.Text('Total', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 11)),
                  ),
                ],
              ),
              pw.SizedBox(height: 4),
              pw.Divider(borderStyle: pw.BorderStyle.dashed),
              pw.SizedBox(height: 4),
              
              ...items.map(
                (item) => pw.Padding(
                  padding: const pw.EdgeInsets.symmetric(vertical: 2),
                  child: pw.Row(
                    mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Expanded(child: pw.Text(item.name, style: const pw.TextStyle(fontSize: 11))),
                      pw.Container(
                        width: 30,
                        alignment: pw.Alignment.center,
                        child: pw.Text('${item.quantity}', style: const pw.TextStyle(fontSize: 11)),
                      ),
                      pw.Container(
                        width: 60,
                        alignment: pw.Alignment.centerRight,
                        child: pw.Text(money.format(item.price * item.quantity), style: const pw.TextStyle(fontSize: 11)),
                      ),
                    ],
                  ),
                ),
              ),
              
              pw.SizedBox(height: 4),
              pw.Divider(borderStyle: pw.BorderStyle.dashed),
              pw.SizedBox(height: 4),
              
              if (discountAmount > 0)
                pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  children: [
                    pw.Text("admin.receipt.print.discount".tr()),
                    pw.Text('-${money.format(discountAmount)}'),
                  ],
                ),
                
              pw.Container(
                margin: const pw.EdgeInsets.only(top: 8, bottom: 8),
                padding: const pw.EdgeInsets.all(8),
                decoration: pw.BoxDecoration(
                  color: PdfColors.grey200,
                  borderRadius: pw.BorderRadius.circular(4),
                ),
                child: pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  children: [
                    pw.Text(
                      "admin.receipt.print.grandTotal".tr(),
                      style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 16),
                    ),
                    pw.Text(
                      money.format(total),
                      style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 16),
                    ),
                  ],
                ),
              ),
              
              if (effectiveLayout.showOrderNumber && orderId != null) ...[
                pw.SizedBox(height: 16),
                pw.BarcodeWidget(
                  data: orderId,
                  barcode: pw.Barcode.code128(),
                  width: 120,
                  height: 40,
                  drawText: false,
                ),
                pw.SizedBox(height: 4),
                pw.Text(orderId, style: const pw.TextStyle(fontSize: 10, color: PdfColors.grey700)),
              ],
              
              if (effectiveLayout.showFooter) ...[
                pw.SizedBox(height: 24),
                pw.Text(
                  effectiveLayout.footerText,
                  textAlign: pw.TextAlign.center,
                  style: pw.TextStyle(
                    fontWeight: pw.FontWeight.bold,
                    fontSize: 12,
                  ),
                ),
              ],
            ],
          );
        },
      ),
    );
    return doc;
  }
}

final printServiceProvider = Provider<PrintService>((ref) => PrintService(ref));
