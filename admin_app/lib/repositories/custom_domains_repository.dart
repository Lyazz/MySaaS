import '../models/custom_domain.dart';
import '../services/api_service.dart';

class CustomDomainsSnapshot {
  final List<CustomDomain> domains;
  final String cnameTarget;
  final String tenantSubdomain;

  const CustomDomainsSnapshot({
    required this.domains,
    required this.cnameTarget,
    required this.tenantSubdomain,
  });
}

class CustomDomainsRepository {
  final ApiService _apiService;

  CustomDomainsRepository(this._apiService);

  Future<CustomDomainsSnapshot> list() async {
    final res = await _apiService.client.get('/admin/custom-domains');
    final data = res.data is Map
        ? Map<String, dynamic>.from(res.data)
        : const {};
    final rawDomains = data['domains'] is List
        ? data['domains'] as List
        : const [];
    return CustomDomainsSnapshot(
      domains: rawDomains
          .whereType<Map>()
          .map((item) => CustomDomain.fromJson(Map<String, dynamic>.from(item)))
          .toList(),
      cnameTarget: data['cnameTarget']?.toString() ?? '',
      tenantSubdomain: data['tenantSubdomain']?.toString() ?? '',
    );
  }

  Future<CustomDomain> create(String domain) async {
    final res = await _apiService.client.post(
      '/admin/custom-domains',
      data: {'domain': domain},
    );
    return CustomDomain.fromJson(
      res.data is Map ? Map<String, dynamic>.from(res.data) : const {},
    );
  }

  Future<void> delete(String id) async {
    await _apiService.client.delete('/admin/custom-domains/$id');
  }
}
