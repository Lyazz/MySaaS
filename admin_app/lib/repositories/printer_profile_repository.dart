import 'package:uuid/uuid.dart';
import 'package:sqflite_sqlcipher/sqflite.dart';
import 'dart:convert';

import '../models/printer_profile.dart';
import '../services/api_service.dart';
import '../services/database_service.dart';
import '../services/sync_service.dart';
import '../services/tenant_mode_service.dart';

class PrinterProfileRepository {
  final ApiService _apiService;
  final DatabaseService _dbService = DatabaseService();
  final SyncService _syncService = SyncService();

  PrinterProfileRepository(this._apiService);

  String get _tid => TenantModeService().activeTenantId;

  Future<List<PrinterProfile>> getProfiles({bool forceRefresh = false}) async {
    final db = await _dbService.database;
    final localData = await db.query(
      'printer_profiles',
      where: 'tenantId = ?',
      whereArgs: [_tid],
    );

    final localProfiles = localData
        .map(
          (e) => PrinterProfile.fromMap({
            'id': e['id'],
            'name': e['name'],
            'transport': e['transport'],
            'connectionParams': e['connectionParams'] != null
                ? jsonDecode(e['connectionParams'].toString())
                : {},
            'capabilityParams': e['capabilityParams'] != null
                ? jsonDecode(e['capabilityParams'].toString())
                : {},
          }),
        )
        .toList();

    if (forceRefresh || await _syncService.isOnline) {
      try {
        final response = await _apiService.client.get(
          '/admin/settings/printers',
        );
        final List<dynamic> remoteData = response.data;
        final remoteProfiles = remoteData
            .map((e) => PrinterProfile.fromMap(e))
            .toList();

        await db.transaction((txn) async {
          await txn.delete(
            'printer_profiles',
            where: "tenantId = ? AND syncStatus = 'synced'",
            whereArgs: [_tid],
          );
          for (var p in remoteProfiles) {
            await txn.insert('printer_profiles', {
              'id': p.id,
              'tenantId': _tid,
              'name': p.name,
              'transport': p.transport.index,
              'connectionParams': jsonEncode(p.connectionParams),
              'capabilityParams': jsonEncode(p.capabilityParams),
              'syncStatus': 'synced',
            }, conflictAlgorithm: ConflictAlgorithm.replace);
          }
        });
        return remoteProfiles;
      } catch (_) {}
    }
    return localProfiles;
  }

  Future<PrinterProfile> createProfile(PrinterProfile profile) async {
    final db = await _dbService.database;
    final online = await _syncService.isOnline;

    final id = const Uuid().v4();
    final newProfile = profile.copyWith(id: id);

    await db.insert('printer_profiles', {
      'id': newProfile.id,
      'tenantId': _tid,
      'name': newProfile.name,
      'transport': newProfile.transport.index,
      'connectionParams': jsonEncode(newProfile.connectionParams),
      'capabilityParams': jsonEncode(newProfile.capabilityParams),
      'syncStatus': online ? 'synced' : 'pending',
    });

    await _syncService.enqueueOperation(
      entityType: 'printerProfile',
      action: 'create',
      payload: newProfile.toMap(),
    );

    return newProfile;
  }

  Future<void> updateProfile(PrinterProfile profile) async {
    final db = await _dbService.database;
    final online = await _syncService.isOnline;

    await db.update(
      'printer_profiles',
      {
        'name': profile.name,
        'transport': profile.transport.index,
        'connectionParams': jsonEncode(profile.connectionParams),
        'capabilityParams': jsonEncode(profile.capabilityParams),
        'syncStatus': online ? 'synced' : 'pending',
      },
      where: 'id = ? AND tenantId = ?',
      whereArgs: [profile.id, _tid],
    );

    await _syncService.enqueueOperation(
      entityType: 'printerProfile',
      action: 'update',
      payload: profile.toMap(),
    );
  }

  Future<void> deleteProfile(String id) async {
    final db = await _dbService.database;
    await db.delete(
      'printer_profiles',
      where: 'id = ? AND tenantId = ?',
      whereArgs: [id, _tid],
    );

    await _syncService.enqueueOperation(
      entityType: 'printerProfile',
      action: 'delete',
      payload: {'id': id},
    );
  }
}
