import 'dart:convert';

import 'package:dart_jsonwebtoken/dart_jsonwebtoken.dart';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
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

const String _configuredActivationPublicKey = String.fromEnvironment(
  'ACTIVATION_PUBLIC_KEY_PEM',
);

/// Public key used to verify activation licences offline.
///
/// Embedding a *public* key in the app is correct and necessary: it is what lets
/// a device verify a licence with no network. The danger is different -- the
/// fallback below pairs with a private key that leaked into git history, so a
/// release build trusting it would accept licences minted by anyone holding that
/// history.
///
/// So the fallback exists only in debug builds. A release build with no
/// `ACTIVATION_PUBLIC_KEY_PEM` fails loudly at startup rather than shipping
/// trust in a compromised key.
String get activationPublicKey {
  final configured = _configuredActivationPublicKey.trim();
  if (configured.isNotEmpty) return configured;

  if (kReleaseMode) {
    throw StateError(
      'ACTIVATION_PUBLIC_KEY_PEM is required for release builds. '
      'Pass it with --dart-define-from-file, or '
      r'--dart-define=ACTIVATION_PUBLIC_KEY_PEM="$(cat activation-public.pem)".',
    );
  }

  return _defaultActivationPublicKey;
}

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

/// What one heartbeat attempt established.
///
/// Three outcomes, deliberately distinct: the window was renewed, the server
/// actively refused this device, or the server could not be reached. Only the
/// middle one may lock anything.
class HeartbeatOutcome {
  final String? activationToken;
  final DateTime? serverTime;

  /// Set when the server refused, e.g. DEVICE_REVOKED, TENANT_SUSPENDED,
  /// TOKEN_SUPERSEDED, DEVICE_UNKNOWN.
  final String? refusalCode;
  final String? revokedReason;

  /// True when nothing could be established -- offline, timeout, 5xx.
  final bool unreachable;

  const HeartbeatOutcome.renewed({
    required this.activationToken,
    this.serverTime,
  }) : refusalCode = null,
       revokedReason = null,
       unreachable = false;

  const HeartbeatOutcome.refused({required String code, this.revokedReason})
    : activationToken = null,
      serverTime = null,
      refusalCode = code,
      unreachable = false;

  const HeartbeatOutcome.unreachable()
    : activationToken = null,
      serverTime = null,
      refusalCode = null,
      revokedReason = null,
      unreachable = true;

  bool get isRenewed => activationToken != null;
  bool get isRefused => refusalCode != null;
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

  /// Verifies a licence locally and returns its raw claims.
  ///
  /// No network. This is what lets a device evaluate its own licence at boot on
  /// a machine that has not seen the internet in weeks.
  Future<Map<String, dynamic>> decodeClaims(String token) async {
    final publicKey = RSAPublicKey(activationPublicKey.trim());
    final jwt = JWT.verify(token.trim(), publicKey);
    return Map<String, dynamic>.from(jwt.payload as Map);
  }

  /// Renews the offline window against the server.
  ///
  /// Returns an outcome rather than throwing on refusal: a revoked device or a
  /// suspended tenant is a *result* the licence state machine must record, not
  /// an error to swallow. Only an unreachable server throws.
  Future<HeartbeatOutcome> heartbeat({
    required String activationToken,
    String? appVersion,
  }) async {
    final hardwareId = await _deviceInfoService.getHardwareId();

    try {
      final response = await _apiService.client.post(
        '/activation/heartbeat',
        data: {
          'activationToken': activationToken,
          'hardwareId': hardwareId,
          if (appVersion != null && appVersion.trim().isNotEmpty)
            'appVersion': appVersion.trim(),
        },
      );

      final data = response.data;
      if (data is! Map || data['activationToken'] == null) {
        return const HeartbeatOutcome.unreachable();
      }

      return HeartbeatOutcome.renewed(
        activationToken: data['activationToken'].toString(),
        serverTime: DateTime.tryParse(
          data['serverTime']?.toString() ?? '',
        )?.toUtc(),
      );
    } on DioException catch (error) {
      final status = error.response?.statusCode;
      final body = error.response?.data;

      // No response at all means the network is down, which is emphatically not
      // a reason to lock: offline operation is the product.
      if (status == null) return const HeartbeatOutcome.unreachable();

      final code = body is Map ? body['code']?.toString() : null;
      final reason = body is Map ? body['revokedReason']?.toString() : null;

      if (code == null) return const HeartbeatOutcome.unreachable();

      return HeartbeatOutcome.refused(code: code, revokedReason: reason);
    } catch (_) {
      return const HeartbeatOutcome.unreachable();
    }
  }

  Future<ActivationResult> verifyOfflineActivationCode(String token) async {
    try {
      final publicKey = RSAPublicKey(activationPublicKey.trim());
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
