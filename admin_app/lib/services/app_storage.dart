import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../models/bootstrap_config.dart';

class AppStorage {
  static const _keyApiBaseUrl = 'api_base_url';
  static const _keyAuthToken = 'auth_token';
  static const _keyAuthUserJson = 'auth_user_json';
  static const _keyAuthStaffRoleJson = 'auth_staff_role_json';
  static const _keyAuthStaffPermissions = 'auth_staff_permissions';

  static Future<BootstrapConfig> loadBootstrap({
    required String defaultApiBaseUrl,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    final storedBaseUrl = prefs.getString(_keyApiBaseUrl);
    final apiBaseUrl =
        (storedBaseUrl != null && storedBaseUrl.trim().isNotEmpty)
        ? storedBaseUrl.trim()
        : defaultApiBaseUrl;

    final authToken = prefs.getString(_keyAuthToken);
    final userJsonRaw = prefs.getString(_keyAuthUserJson);
    final staffRoleJsonRaw = prefs.getString(_keyAuthStaffRoleJson);
    final staffPermissions =
        prefs.getStringList(_keyAuthStaffPermissions) ?? const [];

    Map<String, dynamic>? tryDecodeObject(String? raw) {
      final trimmed = raw?.trim() ?? '';
      if (trimmed.isEmpty) return null;
      try {
        final decoded = jsonDecode(trimmed);
        if (decoded is Map<String, dynamic>) return decoded;
      } catch (_) {}
      return null;
    }

    return BootstrapConfig(
      apiBaseUrl: apiBaseUrl,
      authToken: authToken?.trim().isNotEmpty == true
          ? authToken!.trim()
          : null,
      userJson: tryDecodeObject(userJsonRaw),
      staffRoleJson: tryDecodeObject(staffRoleJsonRaw),
      staffPermissions: staffPermissions,
    );
  }

  static Future<void> saveApiBaseUrl(String apiBaseUrl) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyApiBaseUrl, apiBaseUrl.trim());
  }

  static Future<void> saveAuthSession({
    required String token,
    Map<String, dynamic>? userJson,
    Map<String, dynamic>? staffRoleJson,
    List<String>? staffPermissions,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyAuthToken, token.trim());

    if (userJson != null) {
      await prefs.setString(_keyAuthUserJson, jsonEncode(userJson));
    } else {
      await prefs.remove(_keyAuthUserJson);
    }

    if (staffRoleJson != null) {
      await prefs.setString(_keyAuthStaffRoleJson, jsonEncode(staffRoleJson));
    } else {
      await prefs.remove(_keyAuthStaffRoleJson);
    }

    if (staffPermissions != null) {
      await prefs.setStringList(_keyAuthStaffPermissions, staffPermissions);
    }
  }

  static Future<void> clearAuthSession() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_keyAuthToken);
    await prefs.remove(_keyAuthUserJson);
    await prefs.remove(_keyAuthStaffRoleJson);
    await prefs.remove(_keyAuthStaffPermissions);
  }
}
