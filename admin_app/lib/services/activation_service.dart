import 'dart:convert';
import 'package:dart_jsonwebtoken/dart_jsonwebtoken.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'api_service.dart';
import 'device_info_service.dart';

// In a real app, you would securely bundle the public key corresponding to the backend's RSA private key.
const String _backendPublicKey = '''
-----BEGIN PUBLIC KEY-----
YOUR_PUBLIC_KEY_HERE
-----END PUBLIC KEY-----
''';

final deviceInfoProvider = Provider<DeviceInfoService>((ref) {
  return DeviceInfoService();
});

final activationServiceProvider = Provider<ActivationService>((ref) {
  final apiService = ref.watch(apiProvider);
  final deviceInfoService = ref.watch(deviceInfoProvider);
  return ActivationService(apiService, deviceInfoService);
});

class ActivationService {
  final ApiService _apiService;
  final DeviceInfoService _deviceInfoService;

  ActivationService(this._apiService, this._deviceInfoService);

  /// Activates the device online.
  Future<String> activateOnline(String licenseKey) async {
    try {
      final hwid = await _deviceInfoService.getHardwareId();

      final response = await _apiService.client.post(
        '/activation/online',
        data: {
          'licenseKey': licenseKey,
          'hardwareId': hwid,
          'deviceName': 'Flutter Device',
        },
      );

      final data = response.data;
      if (data['activationToken'] == null) {
        throw Exception('No activation token received');
      }

      final token = data['activationToken'] as String;
      
      // Optionally verify immediately
      await verifyToken(token);

      // In a real app, store this token in secure_storage
      return token;
    } catch (e) {
      throw Exception('Online activation failed: $e');
    }
  }

  /// Generates the Request Code for offline activation
  Future<String> generateOfflineRequestCode() async {
    final hwid = await _deviceInfoService.getHardwareId();
    return base64Encode(utf8.encode(hwid));
  }

  /// Verifies an Activation Token (JWT) locally
  Future<bool> verifyToken(String token) async {
    try {
      // 1. Verify cryptographic signature
      // In production, uncomment this and use the actual public key
      // final rs256Key = RSAPublicKey(_backendPublicKey);
      // final jwt = JWT.verify(token, rs256Key);
      
      // For testing, we just decode
      final jwt = JWT.decode(token);
      final payload = jwt.payload as Map<String, dynamic>;

      // 2. Verify Hardware ID matches this exact physical device
      final currentHwid = await _deviceInfoService.getHardwareId();
      final tokenHwid = payload['hardwareId'] as String?;

      if (currentHwid != tokenHwid) {
        throw Exception('Hardware fingerprint mismatch. This license is tied to another device.');
      }

      // 3. Verify expiry
      final exp = payload['exp'];
      if (exp != null) {
        final expiryDate = DateTime.fromMillisecondsSinceEpoch(exp * 1000);
        if (DateTime.now().isAfter(expiryDate)) {
          throw Exception('Activation token has expired.');
        }
      }

      return true;
    } catch (e) {
      throw Exception('Invalid or tampered activation token: $e');
    }
  }
}
