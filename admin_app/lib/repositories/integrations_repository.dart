import 'dart:developer' as developer;

import '../models/integration.dart';
import '../services/api_service.dart';

class IntegrationsRepository {
  final ApiService _apiService;

  IntegrationsRepository(this._apiService);

  Future<Integration> getIntegration(String provider) async {
    try {
      final res = await _apiService.client.get('/admin/integrations/$provider');
      final data = res.data;
      return Integration.fromJson(
        provider,
        data is Map ? Map<String, dynamic>.from(data) : {},
      );
    } catch (e) {
      developer.log('getIntegration($provider) failed: $e');
      return Integration.empty(provider);
    }
  }

  Future<Integration> saveIntegration(
    String provider,
    Map<String, dynamic> config, {
    required bool isActive,
  }) async {
    try {
      // The endpoint destructures `{ config, isActive }`; posting the config
      // map flat left the server with `config: undefined`.
      final res = await _apiService.client.post(
        '/admin/integrations/$provider',
        data: {'config': config, 'isActive': isActive},
      );
      final data = res.data;
      return Integration.fromJson(
        provider,
        data is Map ? Map<String, dynamic>.from(data) : {},
      );
    } catch (e) {
      developer.log('saveIntegration($provider) failed: $e');
      rethrow;
    }
  }
}
