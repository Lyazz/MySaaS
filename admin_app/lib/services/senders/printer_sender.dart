import '../../models/printer_profile.dart';

abstract class PrinterSender {
  Future<void> send(List<int> bytes, PrinterProfile profile);

  /// Performs connection test / status check if applicable
  Future<bool> connect(PrinterProfile profile) async => true;

  /// Disconnects if maintaining persistent connection
  Future<void> disconnect() async {}
}
