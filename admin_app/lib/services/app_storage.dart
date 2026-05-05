import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/app_mode.dart';
import '../models/bootstrap_config.dart';

class AppStorage {
  static const _keyApiBaseUrl = 'api_base_url';
  static const _keyAppMode = 'app_mode';
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
    final prefs = await SharedPreferences.getInstance();

    final storedBaseUrl = prefs.getString(_keyApiBaseUrl);
    final apiBaseUrl =
        (storedBaseUrl != null && storedBaseUrl.trim().isNotEmpty)
        ? storedBaseUrl.trim()
        : defaultApiBaseUrl;

    final modeRaw = prefs.getString(_keyAppMode);
    final mode = _modeFromString(modeRaw) ?? AppMode.online;

    final tenantId = prefs.getString(_keyTenantId) ?? '';
    final workspaceId = prefs.getString(_keyWorkspaceId);

    final authToken = prefs.getString(_keyAuthToken);
    final userJsonRaw = prefs.getString(_keyAuthUserJson);
    final staffRoleJsonRaw = prefs.getString(_keyAuthStaffRoleJson);
    final staffPermissions =
        prefs.getStringList(_keyAuthStaffPermissions) ?? const [];

    return BootstrapConfig(
      apiBaseUrl: apiBaseUrl,
      mode: mode,
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
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyApiBaseUrl, apiBaseUrl.trim());
  }

  static Future<void> saveProvisioningState({
    required AppMode mode,
    required String tenantId,
    String? workspaceId,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyAppMode, mode.name);
    await prefs.setString(_keyTenantId, tenantId);
    if (workspaceId != null) {
      await prefs.setString(_keyWorkspaceId, workspaceId);
    } else {
      await prefs.remove(_keyWorkspaceId);
    }
  }

  static Future<void> clearProvisioningState() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_keyAppMode);
    await prefs.remove(_keyTenantId);
    await prefs.remove(_keyWorkspaceId);
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

  static Map<String, dynamic>? _tryDecodeObject(String? raw) {
    final trimmed = raw?.trim() ?? '';
    if (trimmed.isEmpty) return null;
    try {
      final decoded = jsonDecode(trimmed);
      if (decoded is Map<String, dynamic>) return decoded;
    } catch (_) {}
    return null;
  }
}
