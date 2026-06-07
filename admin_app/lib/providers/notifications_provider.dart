import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/admin_notification.dart';
import '../services/api_service.dart';
import '../services/notification_service.dart';

class AdminNotificationsState {
  final List<AdminNotification> items;
  final bool isLoading;
  final String? error;

  const AdminNotificationsState({
    this.items = const [],
    this.isLoading = false,
    this.error,
  });

  int get unreadCount => items.where((item) => item.isUnread).length;

  AdminNotificationsState copyWith({
    List<AdminNotification>? items,
    bool? isLoading,
    String? error,
  }) {
    return AdminNotificationsState(
      items: items ?? this.items,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

class AdminNotificationsNotifier extends Notifier<AdminNotificationsState> {
  StreamSubscription<AdminNotification>? _subscription;

  @override
  AdminNotificationsState build() {
    final service = ref.watch(notificationServiceProvider);
    _subscription?.cancel();
    _subscription = service.events.listen(_upsert);
    ref.onDispose(() => _subscription?.cancel());
    Future.microtask(refresh);
    return const AdminNotificationsState();
  }

  Future<void> refresh() async {
    final api = ref.read(apiProvider);
    final hasToken =
        api.client.options.headers['Authorization']
            ?.toString()
            .trim()
            .isNotEmpty ==
        true;
    if (!hasToken) {
      state = const AdminNotificationsState();
      return;
    }

    state = state.copyWith(isLoading: true, error: null);
    try {
      final response = await api.client.get('/admin/notifications');
      final rawItems = response.data is Map
          ? (response.data['items'] as List? ?? const [])
          : const [];
      final items = rawItems
          .whereType<Map>()
          .map(
            (item) => AdminNotification.fromJson(item.cast<String, dynamic>()),
          )
          .where((item) => item.id.isNotEmpty)
          .toList();
      items.sort((a, b) => b.createdAt.compareTo(a.createdAt));
      state = state.copyWith(items: items, isLoading: false, error: null);
    } catch (error) {
      state = state.copyWith(isLoading: false, error: error.toString());
    }
  }

  Future<void> markRead(String id) async {
    if (id.trim().isEmpty) return;

    final now = DateTime.now();
    state = state.copyWith(
      items: state.items
          .map((item) => item.id == id ? item.copyWith(readAt: now) : item)
          .toList(),
    );

    try {
      await ref.read(apiProvider).client.post('/admin/notifications/$id/read');
    } catch (_) {}
  }

  Future<void> markAllRead() async {
    final now = DateTime.now();
    state = state.copyWith(
      items: state.items
          .map((item) => item.isUnread ? item.copyWith(readAt: now) : item)
          .toList(),
    );

    try {
      await ref.read(apiProvider).client.post('/admin/notifications/read-all');
    } catch (_) {}
  }

  void _upsert(AdminNotification item) {
    if (item.id.isEmpty) return;
    final next = [...state.items];
    final index = next.indexWhere((existing) => existing.id == item.id);
    if (index >= 0) {
      next[index] = item.readAt == null && next[index].readAt != null
          ? item.copyWith(readAt: next[index].readAt)
          : item;
    } else {
      next.insert(0, item);
    }
    next.sort((a, b) => b.createdAt.compareTo(a.createdAt));
    state = state.copyWith(items: next.take(50).toList(), error: null);
  }
}

final adminNotificationsProvider =
    NotifierProvider<AdminNotificationsNotifier, AdminNotificationsState>(
      AdminNotificationsNotifier.new,
    );
