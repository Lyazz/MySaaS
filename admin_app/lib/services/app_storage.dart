import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/app_mode.dart';
import '../models/bootstrap_config.dart';
import '../models/subscription_tier.dart';
import '../utils/api_base_url.dart';

class AppStorage {
  static const _secureStorage = FlutterSecureStorage();

  static const _keyApiBaseUrl = 'api_base_url';
  static const _keyAppMode = 'app_mode';
  static const _keySubscriptionTier = 'subscription_tier';
  static const _keyTenantId = 'tenant_id';
  static const _keyWorkspaceId = 'workspace_id';
  static const _keyAuthToken = 'auth_token';
  static const _keyAuthUserJson = 'auth_user_json';
  static const _keyAuthStaffRoleJson = 'auth_staff_role_json';
  static const _keyAuthStaffPermissions = 'auth_staff_permissions';
  static const _keyThemeMode = 'theme_mode';

  static Future<BootstrapConfig> loadBootstrap({
    required String defaultApiBaseUrl,
  }) async {
    final secureValues = await _secureStorage.readAll();
    final storedBaseUrl = secureValues[_keyApiBaseUrl]?.trim() ?? '';
    final normalizedStoredBaseUrl = normalizeApiBaseUrl(storedBaseUrl);
    final apiBaseUrl = normalizedStoredBaseUrl.isNotEmpty
        ? normalizedStoredBaseUrl
        : defaultApiBaseUrl.trim();
    if (storedBaseUrl != apiBaseUrl) {
      await _secureStorage.write(key: _keyApiBaseUrl, value: apiBaseUrl);
    }

    final modeRaw = secureValues[_keyAppMode];
    final mode = _modeFromString(modeRaw) ?? AppMode.online;
    final subscriptionTier =
        _subscriptionTierFromString(secureValues[_keySubscriptionTier]) ??
        (mode == AppMode.offlineOnly
            ? SubscriptionTier.offlineOnly
            : SubscriptionTier.online);

    final tenantId = secureValues[_keyTenantId] ?? '';
    final workspaceId = secureValues[_keyWorkspaceId];

    final authToken = secureValues[_keyAuthToken];
    final userJsonRaw = secureValues[_keyAuthUserJson];
    final staffRoleJsonRaw = secureValues[_keyAuthStaffRoleJson];
    final staffPermissions = _tryDecodeStringList(
      secureValues[_keyAuthStaffPermissions],
    );

    return BootstrapConfig(
      apiBaseUrl: apiBaseUrl,
      mode: mode,
      subscriptionTier: subscriptionTier,
      tenantId: tenantId,
      workspaceId: workspaceId,
      authToken: authToken?.trim().isNotEmpty == true
          ? authToken!.trim()
          : null,
      userJson: _tryDecodeObject(userJsonRaw),
      staffRoleJson: _tryDecodeObject(staffRoleJsonRaw),
      staffPermissions: staffPermissions,
    );
  }

  static Future<void> saveApiBaseUrl(String apiBaseUrl) async {
    await _secureStorage.write(key: _keyApiBaseUrl, value: apiBaseUrl.trim());
  }

  static Future<void> saveProvisioningState({
    required AppMode mode,
    required SubscriptionTier subscriptionTier,
    required String tenantId,
    String? workspaceId,
  }) async {
    await _secureStorage.write(key: _keyAppMode, value: mode.name);
    await _secureStorage.write(
      key: _keySubscriptionTier,
      value: subscriptionTier.name,
    );
    await _secureStorage.write(key: _keyTenantId, value: tenantId);
    if (workspaceId != null) {
      await _secureStorage.write(key: _keyWorkspaceId, value: workspaceId);
    } else {
      await _secureStorage.delete(key: _keyWorkspaceId);
    }
  }

  static Future<void> clearProvisioningState() async {
    await _secureStorage.delete(key: _keyAppMode);
    await _secureStorage.delete(key: _keySubscriptionTier);
    await _secureStorage.delete(key: _keyTenantId);
    await _secureStorage.delete(key: _keyWorkspaceId);
    await _secureStorage.delete(key: _keyApiBaseUrl);
  }

  static Future<void> saveAuthSession({
    required String token,
    Map<String, dynamic>? userJson,
    Map<String, dynamic>? staffRoleJson,
    List<String>? staffPermissions,
  }) async {
    await _secureStorage.write(key: _keyAuthToken, value: token.trim());
    if (userJson != null) {
      await _secureStorage.write(
        key: _keyAuthUserJson,
        value: jsonEncode(userJson),
      );
    } else {
      await _secureStorage.delete(key: _keyAuthUserJson);
    }
    if (staffRoleJson != null) {
      await _secureStorage.write(
        key: _keyAuthStaffRoleJson,
        value: jsonEncode(staffRoleJson),
      );
    } else {
      await _secureStorage.delete(key: _keyAuthStaffRoleJson);
    }
    if (staffPermissions != null) {
      await _secureStorage.write(
        key: _keyAuthStaffPermissions,
        value: jsonEncode(staffPermissions),
      );
    } else {
      await _secureStorage.delete(key: _keyAuthStaffPermissions);
    }
  }

  static Future<void> clearAuthSession() async {
    await _secureStorage.delete(key: _keyAuthToken);
    await _secureStorage.delete(key: _keyAuthUserJson);
    await _secureStorage.delete(key: _keyAuthStaffRoleJson);
    await _secureStorage.delete(key: _keyAuthStaffPermissions);
  }

  static ThemeMode? parseThemeMode(String? raw) {
    switch (raw) {
      case 'light':
        return ThemeMode.light;
      case 'dark':
        return ThemeMode.dark;
      case 'system':
        return ThemeMode.system;
      default:
        return null;
    }
  }

  static String encodeThemeMode(ThemeMode mode) {
    switch (mode) {
      case ThemeMode.light:
        return 'light';
      case ThemeMode.dark:
        return 'dark';
      case ThemeMode.system:
        return 'system';
    }
  }

  static Future<ThemeMode?> loadThemeMode() async {
    final prefs = await SharedPreferences.getInstance();
    return parseThemeMode(prefs.getString(_keyThemeMode));
  }

  static Future<void> saveThemeMode(ThemeMode mode) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyThemeMode, encodeThemeMode(mode));
  }

  static AppMode? _modeFromString(String? raw) {
    if (raw == null) return null;
    try {
      return AppMode.values.firstWhere((e) => e.name == raw);
    } catch (_) {
      return null;
    }
  }

  static SubscriptionTier? _subscriptionTierFromString(String? raw) {
    if (raw == null) return null;
    try {
      return SubscriptionTier.values.firstWhere((e) => e.name == raw);
    } catch (_) {
      return null;
    }
  }

  static Map<String, dynamic>? _tryDecodeObject(String? raw) {
    final trimmed = raw?.trim() ?? '';
    if (trimmed.isEmpty) return null;
    try {
      final decoded = jsonDecode(trimmed);
      if (decoded is Map<String, dynamic>) return decoded;
    } catch (_) {}
    return null;
  }

  static List<String> _tryDecodeStringList(String? raw) {
    final trimmed = raw?.trim() ?? '';
    if (trimmed.isEmpty) return const [];
    try {
      final decoded = jsonDecode(trimmed);
      if (decoded is List) {
        return decoded.map((e) => e.toString()).toList();
      }
    } catch (_) {}
    return const [];
  }
}
