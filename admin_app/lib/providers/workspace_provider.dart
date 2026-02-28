import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../bootstrap.dart';
import '../services/api_service.dart';
import '../services/app_storage.dart';
import '../utils/api_base_url.dart';

class WorkspaceState {
  final String apiBaseUrl;

  const WorkspaceState({required this.apiBaseUrl});

  WorkspaceState copyWith({String? apiBaseUrl}) =>
      WorkspaceState(apiBaseUrl: apiBaseUrl ?? this.apiBaseUrl);
}

class WorkspaceNotifier extends Notifier<WorkspaceState> {
  @override
  WorkspaceState build() {
    final bootstrap = ref.read(bootstrapProvider);
    return WorkspaceState(apiBaseUrl: bootstrap.apiBaseUrl);
  }

  Future<void> setWorkspaceUrl(String input) async {
    final normalized = normalizeApiBaseUrl(input);
    if (normalized.isEmpty) {
      throw Exception('Invalid workspace URL');
    }

    if (normalized == state.apiBaseUrl) return;

    state = state.copyWith(apiBaseUrl: normalized);
    ref.read(apiProvider).setBaseUrl(normalized);
    await AppStorage.saveApiBaseUrl(normalized);
  }
}

final workspaceProvider = NotifierProvider<WorkspaceNotifier, WorkspaceState>(
  WorkspaceNotifier.new,
);
