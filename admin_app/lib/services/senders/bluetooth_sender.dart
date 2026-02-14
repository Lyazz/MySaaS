import 'dart:io';
import 'dart:typed_data';
import 'package:flutter_bluetooth_serial/flutter_bluetooth_serial.dart';
import '../../models/printer_profile.dart';
import 'printer_sender.dart';

class BluetoothSender extends PrinterSender {
  @override
  Future<void> send(List<int> bytes, PrinterProfile profile) async {
    if (!Platform.isAndroid) {
      throw Exception(
        'Bluetooth Classic is only supported on Android in this implementation.',
      );
    }

    final macAddress = profile.macAddress;
    if (macAddress == null) {
      throw Exception('MAC Address is required for Bluetooth Printer');
    }

    BluetoothConnection? connection;
    try {
      connection = await BluetoothConnection.toAddress(macAddress);

      if (connection.isConnected) {
        connection.output.add(Uint8List.fromList(bytes));
        await connection.output.allSent;
      } else {
        throw Exception('Could not connect to Bluetooth device');
      }
    } catch (e) {
      throw Exception('Failed to send to Bluetooth printer: $e');
    } finally {
      connection?.finish(); // Close connection
    }
  }
}
