import 'dart:convert';

import 'package:dart_jsonwebtoken/dart_jsonwebtoken.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/provisioning_payload.dart';
import 'api_service.dart';
import 'device_info_service.dart';

const String _defaultActivationPublicKey = '''
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA4OW4iDVgRs7zEKyg90Pf
grga0o2/1nSQ3eA95d57m4gBl/QGVYQtUEJat6VO1ndExXDED90npLbOYkz/GyRU
q1o03Xcj4B7BfBIbxyxQ+/mFsGTxGSyMWgcxsSyxh9tDEXF9eqzjHKldhjEAZ0fY
wTo/Cr4xJJOk2eo5m8yvkCqFBeRyTIKGxfTpAIEcaCCHoeQQZy5zXvCumr+cSOVe
geXV5M7kb9bM92Y/9wV3SNza4CHeEm8JoXOWoyWoUyI2cc1qG5ju/NUBG1+pqSEo
JwNDCWZCX2eZn/KRF4DeBUrhEkTXTtcbjNMrVXTTF7eM5spvTFbkqtf18QMa7TE6
ZwIDAQAB
-----END PUBLIC KEY-----
''';

const String _activationPublicKey = String.fromEnvironment(
  'ACTIVATION_PUBLIC_KEY_PEM',
  defaultValue: _defaultActivationPublicKey,
);

final deviceInfoProvider = Provider<DeviceInfoService>((ref) {
  return DeviceInfoService();
});

final activationServiceProvider = Provider<ActivationService>((ref) {
  final apiService = ref.watch(apiProvider);
  final deviceInfoService = ref.watch(deviceInfoProvider);
  return ActivationService(apiService, deviceInfoService);
});

class ActivationResult {
  final String activationToken;
  final ProvisioningPayload provisioning;

  const ActivationResult({
    required this.activationToken,
    required this.provisioning,
  });
}

class ActivationService {
  final ApiService _apiService;
  final DeviceInfoService _deviceInfoService;

  ActivationService(this._apiService, this._deviceInfoService);

  Future<ActivationResult> activateOnline(String licenseKey) async {
    try {
      final hardwareId = await _deviceInfoService.getHardwareId();
      final devicePlatform = _deviceInfoService.getPlatformType();
      final deviceName = _deviceInfoService.getDeviceDisplayName();
      final response = await _apiService.client.post(
        '/activation/online',
        data: {
          'licenseKey': licenseKey.trim(),
          'hardwareId': hardwareId,
          'deviceName': deviceName,
          'devicePlatform': devicePlatform,
        },
      );

      final data = response.data;
      if (data is! Map || data['activationToken'] == null) {
        throw Exception('No activation token received');
      }

      final token = data['activationToken'].toString();
      return verifyOfflineActivationCode(token);
    } catch (e) {
      throw Exception('Online activation failed: $e');
    }
  }

  Future<String> generateOfflineRequestCode() async {
    final hardwareId = await _deviceInfoService.getHardwareId();
    final devicePlatform = _deviceInfoService.getPlatformType();
    return base64Encode(
      utf8.encode(
        jsonEncode({
          'hardwareId': hardwareId,
          'deviceName': _deviceInfoService.getDeviceDisplayName(),
          'devicePlatform': devicePlatform,
        }),
      ),
    );
  }

  Future<ActivationResult> verifyOfflineActivationCode(String token) async {
    try {
      final publicKey = RSAPublicKey(_activationPublicKey.trim());
      final jwt = JWT.verify(token.trim(), publicKey);
      final payload = Map<String, dynamic>.from(jwt.payload as Map);
      final currentHardwareId = await _deviceInfoService.getHardwareId();
      final tokenHardwareId = payload['hardwareId']?.toString().trim() ?? '';

      if (tokenHardwareId.isEmpty || tokenHardwareId != currentHardwareId) {
        throw Exception(
          'Hardware fingerprint mismatch. This activation code is tied to another device.',
        );
      }

      final provisioning = ProvisioningPayload.fromJson({
        'apiBaseUrl': _apiService.baseUrl,
        'tenantId': payload['tenantId'],
        'workspaceId': payload['workspaceId'],
        'mode': payload['mode'],
        'subscriptionTier': payload['subscriptionTier'],
      });

      return ActivationResult(
        activationToken: token.trim(),
        provisioning: provisioning,
      );
    } catch (e) {
      throw Exception('Invalid or tampered activation code: $e');
    }
  }
}
