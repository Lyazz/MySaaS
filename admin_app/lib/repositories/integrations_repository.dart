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
    Map<String, dynamic> config,
  ) async {
    try {
      final res = await _apiService.client.post(
        '/admin/integrations/$provider',
        data: config,
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
