import '../models/homepage_settings.dart';
import '../services/api_service.dart';

class HomepageSettingsRepository {
  final ApiService _apiService;

  HomepageSettingsRepository(this._apiService);

  Future<HomepageSettings> get() async {
    final res = await _apiService.client.get('/admin/homepage-settings');
    final data = res.data is Map
        ? Map<String, dynamic>.from(res.data)
        : const {};
    final config = data['homeConfig'] is Map
        ? Map<String, dynamic>.from(data['homeConfig'] as Map)
        : const <String, dynamic>{};
    return HomepageSettings.fromJson(config);
  }

  Future<HomepageSettings> patch(Map<String, dynamic> payload) async {
    final res = await _apiService.client.patch(
      '/admin/homepage-settings',
      data: {'homeConfig': payload},
    );
    final data = res.data is Map
        ? Map<String, dynamic>.from(res.data)
        : const {};
    final config = data['homeConfig'] is Map
        ? Map<String, dynamic>.from(data['homeConfig'] as Map)
        : const <String, dynamic>{};
    return HomepageSettings.fromJson(config);
  }
}
