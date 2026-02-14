import 'package:printing/printing.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import '../../models/printer_profile.dart';
import 'printer_sender.dart';

class PdfSender extends PrinterSender {
  @override
  Future<void> send(List<int> bytes, PrinterProfile profile) async {
    // NOTE: Generating PDF from ESC/POS bytes is NOT trivial and not supported directly.
    // The PdfSender in this architecture usually implies we render the Receipt data TO PDF directly,
    // NOT converting ESC/POS bytes to PDF.

    // However, our unified interface expects bytes.
    // To support a true "Fallback", the `PrintService` might need to be smarter and call a
    // `ReceiptBuilder.buildPdf()` instead of `buildReceipt()` (bytes) if the transport is PDF.

    // For now, this is a placeholder to satisfy the interface.
    // In a real implementation, we would either:
    // 1. Refactor ReceiptBuilder to return a generic `PrintJob` (which can be bytes or pdf).
    // 2. Or, for this specific Sender, we ignore the bytes and re-generate PDF (requiring access to the original Data).

    // Simplest approach for "System Print" is to just print a text representation if we only have bytes,
    // OR throw an error saying "System Print requires PDF rendering path".

    throw UnimplementedError(
      'PDF Printing requires a different pipeline than raw ESC/POS bytes.',
    );
  }

  // Alternative method called by PrintService if it knows it's a PDF transport
  Future<void> printPdf(pw.Document doc) async {
    await Printing.layoutPdf(
      onLayout: (PdfPageFormat format) async => doc.save(),
    );
  }
}
