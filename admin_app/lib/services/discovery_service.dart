import 'package:flutter_libserialport/flutter_libserialport.dart';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';
// import 'package:flutter_bluetooth_serial/flutter_bluetooth_serial.dart'; // Commented out for now to avoid conflicts on macOS/iOS during dev if package is not compatible

class DiscoveryService {
  /// Returns a list of available serial ports (e.g. COM1, /dev/ttyUSB0)
  static List<String> getAvailableSerialPorts() {
    return SerialPort.availablePorts;
  }

  /// Scans for BLE devices
  /// Returns a Stream of ScanResults
  static Stream<List<ScanResult>> scanBleDevices({
    Duration timeout = const Duration(seconds: 4),
  }) {
    // Start scanning
    FlutterBluePlus.startScan(timeout: timeout);

    // Return the stream of results
    return FlutterBluePlus.scanResults;
  }

  static Future<void> stopBleScan() async {
    await FlutterBluePlus.stopScan();
  }

  // TODO: Add Bluetooth Classic scanning for Android
  // static Future<List<BluetoothDiscoveryResult>> scanBluetoothClassic() async { ... }
}
