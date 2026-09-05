import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/printer_profile.dart';
import '../models/receipt_layout.dart';
import '../repositories/printer_profile_repository.dart';
import '../repositories/receipt_layout_repository.dart';
import '../services/api_service.dart';

class PrinterProfilesState {
  final List<PrinterProfile> profiles;
  final PrinterProfile? defaultProfile;
  final ReceiptLayout? receiptLayout;
  final bool isLoading;

  PrinterProfilesState({
    this.profiles = const [],
    this.defaultProfile,
    this.receiptLayout,
    this.isLoading = false,
  });

  PrinterProfilesState copyWith({
    List<PrinterProfile>? profiles,
    PrinterProfile? defaultProfile,
    ReceiptLayout? receiptLayout,
    bool? isLoading,
  }) {
    return PrinterProfilesState(
      profiles: profiles ?? this.profiles,
      defaultProfile: defaultProfile ?? this.defaultProfile,
      receiptLayout: receiptLayout ?? this.receiptLayout,
      isLoading: isLoading ?? this.isLoading,
    );
  }
}

class PrinterProfilesNotifier extends Notifier<PrinterProfilesState> {
  static const _keyDefaultProfileId = 'default_printer_profile_id';
  late final PrinterProfileRepository _printerRepo;
  late final ReceiptLayoutRepository _receiptRepo;

  @override
  PrinterProfilesState build() {
    final api = ref.watch(apiProvider);
    _printerRepo = PrinterProfileRepository(api);
    _receiptRepo = ReceiptLayoutRepository(api);

    // Start data fetch automatically when provider is used
    Future.microtask(() => loadProfiles());
    return PrinterProfilesState(isLoading: true);
  }

  Future<void> loadProfiles({bool forceRefresh = false}) async {
    state = state.copyWith(isLoading: true);
    try {
      final profiles = await _printerRepo.getProfiles(
        forceRefresh: forceRefresh,
      );

      final prefs = await SharedPreferences.getInstance();
      final defaultProfileId = prefs.getString(_keyDefaultProfileId);

      PrinterProfile? defaultProfile;
      if (defaultProfileId != null) {
        defaultProfile = profiles
            .where((p) => p.id == defaultProfileId)
            .firstOrNull;
        if (defaultProfile == null) {
          await prefs.remove(_keyDefaultProfileId);
        }
      }

      final layouts = await _receiptRepo.getLayouts(forceRefresh: forceRefresh);
      ReceiptLayout layout = layouts.isNotEmpty
          ? layouts.first
          : ReceiptLayout.standard();

      // `build()` starts this load in a microtask, so it routinely outlives the
      // provider: a screen closed while profiles are loading disposes the Ref
      // out from under it, and writing `state` then throws rather than being a
      // no-op. Every write after an await has to be guarded.
      if (!ref.mounted) return;
      state = state.copyWith(
        profiles: profiles,
        defaultProfile: defaultProfile,
        receiptLayout: layout,
        isLoading: false,
      );
    } catch (error, stackTrace) {
      // The message used to escape its own interpolation (`\$e`), so every
      // report of this failure logged the literal text and threw the error away.
      debugPrint('Error loading printer profiles: $error\n$stackTrace');
      if (!ref.mounted) return;
      state = state.copyWith(isLoading: false);
    }
  }

  Future<void> saveLayout(ReceiptLayout layout) async {
    // Check if it exists, if standard and new, we might create it, else update
    final current = state.receiptLayout;
    if (current != null && current.id != 'standard') {
      final newLayout = layout.copyWith(id: current.id);
      await _receiptRepo.updateLayout(newLayout);
      state = state.copyWith(receiptLayout: newLayout);
    } else {
      final created = await _receiptRepo.createLayout(layout);
      state = state.copyWith(receiptLayout: created);
    }
  }

  Future<void> addProfile(PrinterProfile profile) async {
    final created = await _printerRepo.createProfile(profile);

    final newProfiles = [...state.profiles, created];
    state = state.copyWith(profiles: newProfiles);

    if (state.defaultProfile == null) {
      await setDefaultProfile(created.id);
    }
  }

  Future<void> updateProfile(PrinterProfile profile) async {
    await _printerRepo.updateProfile(profile);

    final index = state.profiles.indexWhere((p) => p.id == profile.id);
    if (index != -1) {
      final newProfiles = [...state.profiles];
      newProfiles[index] = profile;

      PrinterProfile? defaultProfile = state.defaultProfile;
      if (defaultProfile?.id == profile.id) {
        defaultProfile = profile;
        // In a real scenario we'd persist this preference
      }

      state = state.copyWith(
        profiles: newProfiles,
        defaultProfile: defaultProfile,
      );
    }
  }

  Future<void> removeProfile(String id) async {
    await _printerRepo.deleteProfile(id);
    final newProfiles = state.profiles.where((p) => p.id != id).toList();

    if (state.defaultProfile?.id == id) {
      await setDefaultProfile(null);
      state = state.copyWith(profiles: newProfiles, defaultProfile: null);
    } else {
      state = state.copyWith(profiles: newProfiles);
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
        state = PrinterProfilesState(
          profiles: state.profiles,
          defaultProfile: profile,
          receiptLayout: state.receiptLayout,
          isLoading: state.isLoading,
        );
      }
    }
  }
}

final printerProfilesProvider =
    NotifierProvider<PrinterProfilesNotifier, PrinterProfilesState>(
      PrinterProfilesNotifier.new,
    );
