import 'dart:async';
import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;

import '../firebase_options.dart';
import '../models/admin_notification.dart';
import '../models/app_mode.dart';
import 'api_service.dart';
import 'device_info_service.dart';

@pragma('vm:entry-point')
Future<void> adminNotificationBackgroundHandler(RemoteMessage message) async {
  try {
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );
  } catch (_) {}
}

final notificationServiceProvider = Provider<NotificationService>((ref) {
  final service = NotificationService(ref.read(apiProvider));
  ref.onDispose(() {
    unawaited(service.dispose());
  });
  return service;
});

class NotificationService {
  NotificationService(
    this._apiService, {
    DeviceInfoService? deviceInfoService,
    FlutterLocalNotificationsPlugin? localNotifications,
    http.Client? httpClient,
    Future<void> Function(String title, String body, Map<String, String> data)?
    localNotificationSink,
  }) : _deviceInfoService = deviceInfoService ?? DeviceInfoService(),
       _localNotifications =
           localNotifications ?? FlutterLocalNotificationsPlugin(),
       _httpClient = httpClient,
       _localNotificationSink = localNotificationSink;

  final ApiService _apiService;
  final DeviceInfoService _deviceInfoService;
  final FlutterLocalNotificationsPlugin _localNotifications;
  final Future<void> Function(
    String title,
    String body,
    Map<String, String> data,
  )?
  _localNotificationSink;
  http.Client? _httpClient;

  StreamSubscription<RemoteMessage>? _foregroundFcmSubscription;
  StreamSubscription<RemoteMessage>? _openedFcmSubscription;
  StreamSubscription<String>? _sseSubscription;
  StreamSubscription<String>? _fcmTokenRefreshSubscription;
  final _events = StreamController<AdminNotification>.broadcast();

  bool _localInitialized = false;
  bool _firebaseInitialized = false;
  String? _activeSessionKey;
  String? _hardwareId;
  void Function(String route)? _routeHandler;

  static void registerBackgroundHandler() {
    if (_supportsFcmPlatform) {
      FirebaseMessaging.onBackgroundMessage(adminNotificationBackgroundHandler);
    }
  }

  Stream<AdminNotification> get events => _events.stream;

  Future<void> dispose() async {
    await stop();
    await _events.close();
  }

  void setRouteHandler(void Function(String route) handler) {
    _routeHandler = handler;
  }

  Future<void> syncAuthState({
    required bool isAuthenticated,
    required AppMode mode,
    required String? userId,
    required String? tenantId,
  }) async {
    final resolvedUserId = (userId ?? '').trim();
    final resolvedTenantId = (tenantId ?? '').trim();
    if (!isAuthenticated ||
        !mode.allowsNetworkRequests ||
        resolvedUserId.isEmpty ||
        resolvedTenantId.isEmpty) {
      await stop();
      return;
    }

    final key = '$resolvedTenantId:$resolvedUserId:${_apiService.baseUrl}';
    if (_activeSessionKey == key) return;

    await stop();
    _activeSessionKey = key;
    await _start();
  }

  Future<void> stop() async {
    _activeSessionKey = null;
    await _foregroundFcmSubscription?.cancel();
    await _openedFcmSubscription?.cancel();
    await _sseSubscription?.cancel();
    await _fcmTokenRefreshSubscription?.cancel();
    _foregroundFcmSubscription = null;
    _openedFcmSubscription = null;
    _sseSubscription = null;
    _fcmTokenRefreshSubscription = null;
    _httpClient?.close();
    _httpClient = null;
  }

  Future<void> _start() async {
    await _ensureLocalNotifications();

    try {
      _hardwareId = await _deviceInfoService.getHardwareId();
    } catch (_) {
      _hardwareId = 'unknown-${DateTime.now().millisecondsSinceEpoch}';
    }

    await _registerRealtimeSubscription();
    _connectRealtimeStream();

    if (_supportsFcmPlatform && await _ensureFirebase()) {
      await _startFcm();
    }
  }

  Future<void> _ensureLocalNotifications() async {
    if (_localInitialized) return;

    const android = AndroidInitializationSettings('@mipmap/ic_launcher');
    const darwin = DarwinInitializationSettings();
    const linux = LinuxInitializationSettings(defaultActionName: 'Open');
    const windows = WindowsInitializationSettings(
      appName: 'Swekly Admin',
      appUserModelId: 'Com.Swekly.Admin',
      guid: '8fba4f89-9ac6-4b9c-a8d7-8bf264ef4f4a',
    );

    await _localNotifications.initialize(
      settings: const InitializationSettings(
        android: android,
        iOS: darwin,
        macOS: darwin,
        linux: linux,
        windows: windows,
      ),
      onDidReceiveNotificationResponse: (response) {
        _openPayload(response.payload);
      },
    );

    final androidPlugin = _localNotifications
        .resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin
        >();
    try {
      await androidPlugin?.requestNotificationsPermission();
    } catch (_) {}

    final iosPlugin = _localNotifications
        .resolvePlatformSpecificImplementation<
          IOSFlutterLocalNotificationsPlugin
        >();
    try {
      await iosPlugin?.requestPermissions(
        alert: true,
        badge: true,
        sound: true,
      );
    } catch (_) {}

    final macosPlugin = _localNotifications
        .resolvePlatformSpecificImplementation<
          MacOSFlutterLocalNotificationsPlugin
        >();
    try {
      await macosPlugin?.requestPermissions(
        alert: true,
        badge: true,
        sound: true,
      );
    } catch (_) {}

    _localInitialized = true;
  }

  Future<bool> _ensureFirebase() async {
    if (_firebaseInitialized) return true;
    try {
      await Firebase.initializeApp(
        options: DefaultFirebaseOptions.currentPlatform,
      );
      _firebaseInitialized = true;
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<void> _startFcm() async {
    final messaging = FirebaseMessaging.instance;

    try {
      await messaging.requestPermission(alert: true, badge: true, sound: true);
    } catch (_) {
      return;
    }

    try {
      await messaging.setForegroundNotificationPresentationOptions(
        alert: true,
        badge: true,
        sound: true,
      );
    } catch (_) {}

    String? token;
    try {
      token = await messaging.getToken();
    } catch (_) {
      return;
    }

    if (token != null && token.trim().isNotEmpty) {
      await _registerFcmSubscription(token.trim());
    }

    _fcmTokenRefreshSubscription = messaging.onTokenRefresh.listen((token) {
      final trimmed = token.trim();
      if (trimmed.isNotEmpty) {
        _registerFcmSubscription(trimmed);
      }
    });

    _foregroundFcmSubscription = FirebaseMessaging.onMessage.listen((message) {
      _showRemoteMessage(message);
    });

    _openedFcmSubscription = FirebaseMessaging.onMessageOpenedApp.listen((
      message,
    ) {
      _openRouteFromData(_asStringMap(message.data));
    });

    final initialMessage = await messaging.getInitialMessage();
    if (initialMessage != null) {
      _openRouteFromData(_asStringMap(initialMessage.data));
    }
  }

  Future<void> _registerRealtimeSubscription() async {
    await _registerSubscription(channel: 'REALTIME');
  }

  Future<void> _registerFcmSubscription(String token) async {
    await _registerSubscription(channel: 'FCM', fcmToken: token);
  }

  Future<void> _registerSubscription({
    required String channel,
    String? fcmToken,
  }) async {
    final hardwareId = _hardwareId;
    if (hardwareId == null || hardwareId.trim().isEmpty) return;

    try {
      await _apiService.client.post(
        '/admin/notifications/subscriptions',
        data: {
          'hardwareId': hardwareId,
          'platform': _platformType,
          'channel': channel,
          if (fcmToken != null) 'fcmToken': fcmToken,
        },
      );
    } on DioException {
      rethrow;
    } catch (_) {}
  }

  void _connectRealtimeStream() {
    final token = _apiService.client.options.headers['Authorization'];
    if (token is! String || token.trim().isEmpty) return;

    final client = http.Client();
    _httpClient = client;

    final request = http.Request('GET', _streamUri());
    request.headers['Authorization'] = token;
    request.headers['Accept'] = 'text/event-stream';

    client
        .send(request)
        .then((response) {
          if (response.statusCode != 200) return;
          _sseSubscription = response.stream
              .transform(utf8.decoder)
              .transform(const _SseEventTransformer())
              .listen(_handleSseEvent, onError: (_) {});
        })
        .catchError((_) {});
  }

  Uri _streamUri() {
    final base = _apiService.baseUrl.replaceFirst(RegExp(r'/+$'), '');
    return Uri.parse('$base/admin/notifications/stream');
  }

  @visibleForTesting
  Uri streamUriForTest() => _streamUri();

  @visibleForTesting
  void handleSseEventForTest(String raw) => _handleSseEvent(raw);

  @visibleForTesting
  void openRouteFromDataForTest(Map<String, String> data) {
    _openRouteFromData(data);
  }

  void _handleSseEvent(String raw) {
    try {
      final event = jsonDecode(raw);
      if (event is! Map) return;
      final map = Map<String, dynamic>.from(event);
      final data = _asStringMap(map['data']);
      final notification = AdminNotification.fromJson(map);
      if (notification.id.isNotEmpty) {
        _events.add(notification);
      }
      _showLocalNotification(
        title: map['title']?.toString() ?? 'New notification',
        body: map['body']?.toString() ?? '',
        data: data,
      );
    } catch (_) {}
  }

  void _showRemoteMessage(RemoteMessage message) {
    final title =
        message.notification?.title ?? message.data['title'] ?? 'New order';
    final body = message.notification?.body ?? message.data['body'] ?? '';
    final data = Map<String, String>.from(message.data);
    _events.add(
      AdminNotification.fromPush(title: title, body: body, data: data),
    );
    _showLocalNotification(title: title, body: body, data: data);
  }

  Future<void> _showLocalNotification({
    required String title,
    required String body,
    required Map<String, String> data,
  }) async {
    if (_localNotificationSink != null) {
      await _localNotificationSink(title, body, data);
      return;
    }

    final payload = jsonEncode(data);
    await _localNotifications.show(
      id: DateTime.now().millisecondsSinceEpoch.remainder(100000),
      title: title,
      body: body,
      notificationDetails: const NotificationDetails(
        android: AndroidNotificationDetails(
          'admin_orders',
          'Orders',
          channelDescription: 'New order notifications',
          importance: Importance.high,
          priority: Priority.high,
        ),
        iOS: DarwinNotificationDetails(
          presentAlert: true,
          presentBadge: true,
          presentSound: true,
        ),
        macOS: DarwinNotificationDetails(
          presentAlert: true,
          presentBadge: true,
          presentSound: true,
        ),
        linux: LinuxNotificationDetails(),
        windows: WindowsNotificationDetails(),
      ),
      payload: payload,
    );
  }

  void _openPayload(String? payload) {
    if (payload == null || payload.trim().isEmpty) return;
    try {
      final decoded = jsonDecode(payload);
      if (decoded is Map) {
        _openRouteFromData(_asStringMap(decoded));
      }
    } catch (_) {}
  }

  void _openRouteFromData(Map<String, String> data) {
    final route = data['route']?.trim();
    if (route != null && route.isNotEmpty) {
      _routeHandler?.call(route);
      return;
    }

    final orderId = data['orderId']?.trim();
    if (orderId != null && orderId.isNotEmpty) {
      _routeHandler?.call('/orders/$orderId');
    }
  }

  Map<String, String> _asStringMap(Object? value) {
    if (value is! Map) return const {};
    return value.map(
      (key, val) => MapEntry(key.toString(), val?.toString() ?? ''),
    );
  }

  String get _platformType {
    if (kIsWeb) return 'web';
    return _deviceInfoService.getPlatformType();
  }

  static bool get _supportsFcmPlatform {
    if (kIsWeb) return false;
    return switch (defaultTargetPlatform) {
      TargetPlatform.android => true,
      _ => false,
    };
  }
}

class _SseEventTransformer extends StreamTransformerBase<String, String> {
  const _SseEventTransformer();

  @override
  Stream<String> bind(Stream<String> stream) async* {
    final buffer = StringBuffer();

    await for (final chunk in stream) {
      buffer.write(chunk);
      var text = buffer.toString();
      var separator = text.indexOf('\n\n');

      while (separator >= 0) {
        final block = text.substring(0, separator);
        text = text.substring(separator + 2);
        final dataLines = block
            .split('\n')
            .where((line) => line.startsWith('data:'))
            .map((line) => line.substring(5).trim())
            .where((line) => line.isNotEmpty)
            .toList();
        if (dataLines.isNotEmpty) {
          yield dataLines.join('\n');
        }
        separator = text.indexOf('\n\n');
      }

      buffer
        ..clear()
        ..write(text);
    }
  }
}
