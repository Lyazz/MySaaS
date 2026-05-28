import '../models/contact_info.dart';
import '../services/api_service.dart';

class ContactInfosRepository {
  final ApiService _apiService;

  ContactInfosRepository(this._apiService);

  Future<List<ContactInfo>> list() async {
    final res = await _apiService.client.get('/admin/contact-infos');
    final data = res.data;
    final items = data is Map && data['items'] is List
        ? data['items']
        : const [];
    return (items as List)
        .whereType<Map>()
        .map((item) => ContactInfo.fromJson(Map<String, dynamic>.from(item)))
        .toList();
  }

  Future<ContactInfo> create(Map<String, dynamic> payload) async {
    final res = await _apiService.client.post(
      '/admin/contact-infos',
      data: payload,
    );
    return ContactInfo.fromJson(
      res.data is Map ? Map<String, dynamic>.from(res.data) : const {},
    );
  }

  Future<ContactInfo> update(String id, Map<String, dynamic> payload) async {
    final res = await _apiService.client.patch(
      '/admin/contact-infos/$id',
      data: payload,
    );
    return ContactInfo.fromJson(
      res.data is Map ? Map<String, dynamic>.from(res.data) : const {},
    );
  }

  Future<void> delete(String id) async {
    await _apiService.client.delete('/admin/contact-infos/$id');
  }
}
