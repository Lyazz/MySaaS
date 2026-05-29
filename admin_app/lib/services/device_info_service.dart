import 'dart:convert';
import 'package:crypto/crypto.dart';
import 'package:device_info_plus/device_info_plus.dart';
import 'dart:io';

class DeviceInfoService {
  final DeviceInfoPlugin _deviceInfo = DeviceInfoPlugin();

  String getPlatformType() {
    if (Platform.isMacOS) return 'macos';
    if (Platform.isWindows) return 'windows';
    if (Platform.isAndroid) return 'android';
    if (Platform.isIOS) return 'ios';
    if (Platform.isLinux) return 'linux';
    return 'unknown';
  }

  String getDeviceDisplayName() {
    return switch (getPlatformType()) {
      'macos' => 'macOS Admin Device',
      'windows' => 'Windows Admin Device',
      'android' => 'Android Admin Device',
      'ios' => 'iOS Admin Device',
      'linux' => 'Linux Admin Device',
      _ => 'Admin Device',
    };
  }

  /// Gets a stable, unique hardware fingerprint for this device.
  Future<String> getHardwareId() async {
    try {
      String? deviceId;

      if (Platform.isMacOS) {
        final macInfo = await _deviceInfo.macOsInfo;
        deviceId = macInfo.systemGUID;
      } else if (Platform.isWindows) {
        final winInfo = await _deviceInfo.windowsInfo;
        deviceId = winInfo.deviceId;
      } else if (Platform.isLinux) {
        final linuxInfo = await _deviceInfo.linuxInfo;
        deviceId = linuxInfo.machineId;
      } else if (Platform.isAndroid) {
        final androidInfo = await _deviceInfo.androidInfo;
        deviceId = androidInfo.id;
      } else if (Platform.isIOS) {
        final iosInfo = await _deviceInfo.iosInfo;
        deviceId = iosInfo.identifierForVendor;
      }
      
      if (deviceId == null || deviceId.isEmpty) {
        throw Exception('Failed to obtain a device ID from the system.');
      }

      // Hash it with SHA-256 to ensure standard length and obscure actual MACs/IDs
      final bytes = utf8.encode(deviceId);
      final digest = sha256.convert(bytes);
      
      return digest.toString();
    } catch (e) {
      throw Exception('Could not generate Hardware ID: $e');
    }
  }
}
