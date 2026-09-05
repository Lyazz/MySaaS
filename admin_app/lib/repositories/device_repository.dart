import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../services/activation_service.dart';
import '../services/api_service.dart';
import '../services/device_info_service.dart';

/// Where a device stands in the approval queue.
enum DeviceRequestStatus { none, pending, approved, denied, expired, cancelled }

DeviceRequestStatus _statusFrom(String? raw) {
  switch (raw?.trim().toUpperCase()) {
    case 'PENDING':
      return DeviceRequestStatus.pending;
    case 'APPROVED':
      return DeviceRequestStatus.approved;
    case 'DENIED':
      return DeviceRequestStatus.denied;
    case 'EXPIRED':
      return DeviceRequestStatus.expired;
    case 'CANCELLED':
      return DeviceRequestStatus.cancelled;
    default:
      return DeviceRequestStatus.none;
  }
}

class DeviceRequest {
  final String id;
  final DeviceRequestStatus status;
  final String? decisionNote;
  final DateTime? decidedAt;

  /// Present only once approved, and only to the hardware that asked.
  final String? claimCode;

  const DeviceRequest({
    required this.id,
    required this.status,
    this.decisionNote,
    this.decidedAt,
    this.claimCode,
  });

  bool get isPending => status == DeviceRequestStatus.pending;
  bool get isApproved => status == DeviceRequestStatus.approved;
  bool get isDenied => status == DeviceRequestStatus.denied;

  factory DeviceRequest.fromJson(Map<String, dynamic> json) => DeviceRequest(
    id: json['id']?.toString() ?? '',
    status: _statusFrom(json['status']?.toString()),
    decisionNote: json['decisionNote']?.toString(),
    decidedAt: DateTime.tryParse(json['decidedAt']?.toString() ?? '')?.toUtc(),
    claimCode: json['claimCode']?.toString(),
  );
}

final deviceRepositoryProvider = Provider<DeviceRepository>((ref) {
  return DeviceRepository(
    ref.watch(apiProvider),
    ref.watch(deviceInfoProvider),
    ref.watch(activationServiceProvider),
  );
});

/// Talks to the device-transfer endpoints.
///
/// All three are unauthenticated by design: a device that could not claim a seat
/// has no session to offer, and the whole point of this flow is to give it a way
/// back that does not require someone to edit the database.
class DeviceRepository {
  final ApiService _apiService;
  final DeviceInfoService _deviceInfo;
  final ActivationService _activationService;

  DeviceRepository(this._apiService, this._deviceInfo, this._activationService);

  Future<String> hardwareId() => _deviceInfo.getHardwareId();

  /// Asks an administrator to approve this device.
  ///
  /// Safe to call repeatedly: the server keeps one pending request per device,
  /// so a retry updates the existing one instead of queueing a duplicate.
  Future<DeviceRequest> requestAccess({
    String? reason,
    String? replacesDeviceId,
  }) async {
    final response = await _apiService.client.post(
      '/activation/requests',
      data: {
        'hardwareId': await _deviceInfo.getHardwareId(),
        'deviceName': _deviceInfo.getDeviceDisplayName(),
        'devicePlatform': _deviceInfo.getPlatformType(),
        if (reason != null && reason.trim().isNotEmpty) 'reason': reason.trim(),
        if (replacesDeviceId != null && replacesDeviceId.trim().isNotEmpty)
          'replacesDeviceId': replacesDeviceId.trim(),
      },
    );

    return DeviceRequest.fromJson(
      Map<String, dynamic>.from(response.data as Map),
    );
  }

  /// Polls for a decision.
  Future<DeviceRequest?> pollRequest(String requestId) async {
    try {
      final response = await _apiService.client.get(
        '/activation/requests/$requestId',
        queryParameters: {'hardwareId': await _deviceInfo.getHardwareId()},
      );

      return DeviceRequest.fromJson(
        Map<String, dynamic>.from(response.data as Map),
      );
    } on DioException catch (error) {
      // A 404 means the request is gone; anything else is transient and the
      // caller should keep polling rather than give up.
      if (error.response?.statusCode == 404) return null;
      rethrow;
    }
  }

  /// Exchanges an approved claim code for a real licence.
  ///
  /// Returns the activation token; the caller applies it so the licence engine
  /// and the workspace binding update together.
  Future<String> claim(String claimCode) async {
    final response = await _apiService.client.post(
      '/activation/claim',
      data: {
        'claimCode': claimCode.trim(),
        'hardwareId': await _deviceInfo.getHardwareId(),
      },
    );

    final data = response.data;
    if (data is! Map || data['activationToken'] == null) {
      throw Exception('The server did not return an activation licence');
    }

    return data['activationToken'].toString();
  }

  /// Verifies a claimed licence locally before it is trusted.
  Future<Map<String, dynamic>> decodeLicence(String token) =>
      _activationService.decodeClaims(token);
}
