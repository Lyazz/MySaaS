import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import '../models/printer_profile.dart';
import '../models/receipt_layout.dart';

class PrinterProfilesState {
  final List<PrinterProfile> profiles;
  final PrinterProfile? defaultProfile;
  final ReceiptLayout? receiptLayout;

  PrinterProfilesState({
    this.profiles = const [],
    this.defaultProfile,
    this.receiptLayout,
  });

  PrinterProfilesState copyWith({
    List<PrinterProfile>? profiles,
    PrinterProfile? defaultProfile,
    ReceiptLayout? receiptLayout,
  }) {
    return PrinterProfilesState(
      profiles: profiles ?? this.profiles,
      defaultProfile: defaultProfile ?? this.defaultProfile,
      receiptLayout: receiptLayout ?? this.receiptLayout,
    );
  }
}

class PrinterProfilesNotifier extends Notifier<PrinterProfilesState> {
  static const _keyProfiles = 'printer_profiles';
  static const _keyDefaultProfileId = 'default_printer_profile_id';
  static const _keyReceiptLayout = 'receipt_layout';

  @override
  PrinterProfilesState build() {
    loadProfiles();
    return PrinterProfilesState();
  }

  Future<void> loadProfiles() async {
    final prefs = await SharedPreferences.getInstance();
    final profilesJson = prefs.getStringList(_keyProfiles) ?? [];

    final profiles = profilesJson
        .map((e) => PrinterProfile.fromJson(e))
        .toList();

    final defaultProfileId = prefs.getString(_keyDefaultProfileId);
    PrinterProfile? defaultProfile;
    if (defaultProfileId != null) {
      defaultProfile = profiles
          .where((p) => p.id == defaultProfileId)
          .firstOrNull;
      // If default not found (deleted?), clear it
      if (defaultProfile == null) {
        await prefs.remove(_keyDefaultProfileId);
      }
    }

    // Load Receipt Layout
    final layoutJson = prefs.getString(_keyReceiptLayout);
    ReceiptLayout? layout;
    if (layoutJson != null) {
      layout = ReceiptLayout.fromMap(json.decode(layoutJson));
    } else {
      layout = ReceiptLayout.standard();
    }

    state = state.copyWith(
      profiles: profiles,
      defaultProfile: defaultProfile,
      receiptLayout: layout,
    );
  }

  Future<void> saveLayout(ReceiptLayout layout) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyReceiptLayout, json.encode(layout.toMap()));
    state = state.copyWith(receiptLayout: layout);
  }

  Future<void> addProfile(PrinterProfile profile) async {
    final newProfiles = [...state.profiles, profile];
    await _saveProfiles(newProfiles);

    // Auto-set default if it's the first one
    if (state.defaultProfile == null) {
      await setDefaultProfile(profile.id);
    }
  }

  Future<void> updateProfile(PrinterProfile profile) async {
    final index = state.profiles.indexWhere((p) => p.id == profile.id);
    if (index != -1) {
      final newProfiles = [...state.profiles];
      newProfiles[index] = profile;
      await _saveProfiles(newProfiles);

      // Update default if it was modified
      if (state.defaultProfile?.id == profile.id) {
        state = state.copyWith(defaultProfile: profile);
      }
    }
  }

  Future<void> removeProfile(String id) async {
    final newProfiles = state.profiles.where((p) => p.id != id).toList();
    await _saveProfiles(newProfiles);

    if (state.defaultProfile?.id == id) {
      await setDefaultProfile(null);
    }
  }

  Future<void> setDefaultProfile(String? id) async {
    final prefs = await SharedPreferences.getInstance();
    if (id == null) {
      await prefs.remove(_keyDefaultProfileId);
      state = state.copyWith(defaultProfile: null);
    } else {
      final profile = state.profiles.where((p) => p.id == id).firstOrNull;
      if (profile != null) {
        await prefs.setString(_keyDefaultProfileId, id);
        // Force update state to ensure UI reflects it
        // Note: In Riverpod Notifier, copyWith with existing value might strictly equal check,
        // but here we are creating new State object.
        state = PrinterProfilesState(
          profiles: state.profiles,
          defaultProfile: profile,
        );
      }
    }
  }

  Future<void> _saveProfiles(List<PrinterProfile> profiles) async {
    final prefs = await SharedPreferences.getInstance();
    final profilesJson = profiles.map((p) => p.toJson()).toList();
    await prefs.setStringList(_keyProfiles, profilesJson);
    state = state.copyWith(profiles: profiles);
  }
}

final printerProfilesProvider =
    NotifierProvider<PrinterProfilesNotifier, PrinterProfilesState>(
      PrinterProfilesNotifier.new,
    );
