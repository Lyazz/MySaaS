import 'dart:typed_data';
import 'package:flutter_libserialport/flutter_libserialport.dart';
import '../../models/printer_profile.dart';
import 'printer_sender.dart';

class SerialPortSender extends PrinterSender {
  @override
  Future<void> send(List<int> bytes, PrinterProfile profile) async {
    final portName = profile.portName;
    if (portName == null) {
      throw Exception('Port Name is required for Serial Connection');
    }

    final baudRate = profile.baudRate ?? 9600;

    try {
      final port = SerialPort(portName);
      if (!port.openReadWrite()) {
        throw Exception('Failed to open serial port $portName');
      }

      final config = port.config;
      config.baudRate = baudRate;
      config.stopBits = 1;
      config.parity = 0; // None
      config.bits = 8;
      port.config = config;

      final data = Uint8List.fromList(bytes);
      port.write(data);

      // Give it a moment to flush logic if needed, but write is blocking/synchronous in libserialport usually or buffered
      port.drain();

      port.close();
      port.dispose();
    } catch (e) {
      throw Exception('Serial Port Error: $e');
    }
  }
}
