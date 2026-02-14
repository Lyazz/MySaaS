import '../../models/printer_profile.dart';
import 'printer_sender.dart';

class BleSender extends PrinterSender {
  @override
  Future<void> send(List<int> bytes, PrinterProfile profile) async {
    throw UnimplementedError(
      'BLE Printing is currently disabled due to dependency version mismatch.',
    );
  }
}
