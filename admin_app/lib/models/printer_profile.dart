import 'dart:convert';

enum PrinterTransport { network, bluetooth, ble, windows, serial, pdf }

class PrinterProfile {
  final String id;
  final String name;
  final PrinterTransport transport;
  final Map<String, dynamic> connectionParams;
  final Map<String, dynamic> capabilityParams;

  PrinterProfile({
    required this.id,
    required this.name,
    required this.transport,
    required this.connectionParams,
    this.capabilityParams = const {},
  });

  // Connection Params Helpers
  String? get ip => connectionParams['ip'];
  int? get port => connectionParams['port'];
  String? get macAddress =>
      connectionParams['macAddress']; // For BT Classic / BLE
  String? get deviceId =>
      connectionParams['deviceId']; // For BLE / USB / Windows
  String? get serviceUuid => connectionParams['serviceUuid']; // For BLE
  String? get characteristicUuid =>
      connectionParams['characteristicUuid']; // For BLE
  String? get printerName =>
      connectionParams['printerName']; // For Windows Spooler
  String? get portName =>
      connectionParams['portName']; // For Serial (e.g., COM1, /dev/ttyUSB0)
  int? get baudRate => connectionParams['baudRate']; // For Serial

  // Capability Params Helpers
  int get paperWidth => capabilityParams['paperWidth'] ?? 80; // 58 or 80 mm
  bool get cut => capabilityParams['cut'] ?? true;
  bool get drawer => capabilityParams['drawer'] ?? false;
  int get profileId =>
      capabilityParams['profileId'] ??
      0; // standard, default, etc. (CapabilityProfile value)

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'name': name,
      'transport': transport.index,
      'connectionParams': connectionParams,
      'capabilityParams': capabilityParams,
    };
  }

  factory PrinterProfile.fromMap(Map<String, dynamic> map) {
    return PrinterProfile(
      id: map['id'] ?? '',
      name: map['name'] ?? '',
      transport: PrinterTransport.values[map['transport'] ?? 0],
      connectionParams: Map<String, dynamic>.from(
        map['connectionParams'] ?? {},
      ),
      capabilityParams: Map<String, dynamic>.from(
        map['capabilityParams'] ?? {},
      ),
    );
  }

  String toJson() => json.encode(toMap());

  factory PrinterProfile.fromJson(String source) =>
      PrinterProfile.fromMap(json.decode(source));

  PrinterProfile copyWith({
    String? id,
    String? name,
    PrinterTransport? transport,
    Map<String, dynamic>? connectionParams,
    Map<String, dynamic>? capabilityParams,
  }) {
    return PrinterProfile(
      id: id ?? this.id,
      name: name ?? this.name,
      transport: transport ?? this.transport,
      connectionParams: connectionParams ?? this.connectionParams,
      capabilityParams: capabilityParams ?? this.capabilityParams,
    );
  }
}
