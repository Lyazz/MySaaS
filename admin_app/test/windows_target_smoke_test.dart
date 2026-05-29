import 'dart:io';

import 'package:admin_app/models/printer_profile.dart';
import 'package:admin_app/services/print_service.dart';
import 'package:admin_app/services/senders/windows_spooler_sender.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('Windows desktop target files are checked into the app', () {
    expect(File('.metadata').existsSync(), isTrue);
    expect(File('windows/CMakeLists.txt').existsSync(), isTrue);
    expect(File('windows/runner/main.cpp').existsSync(), isTrue);
    expect(
      File('windows/flutter/generated_plugin_registrant.cc').existsSync(),
      isTrue,
    );

    final metadata = File('.metadata').readAsStringSync();
    expect(metadata, contains('platform: windows'));
  });

  test('Windows printer transport resolves to the spooler sender', () {
    expect(
      SenderFactory.getSender(PrinterTransport.windows),
      isA<WindowsSpoolerSender>(),
    );
  });
}
