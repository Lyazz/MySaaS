import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:toastification/toastification.dart';

import 'app_config.dart';
import 'bootstrap.dart';
import 'providers/auth_provider.dart';
import 'providers/settings_provider.dart';
import 'router.dart';
import 'services/app_storage.dart';
import 'services/notification_service.dart';
import 'theme/app_theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  NotificationService.registerBackgroundHandler();
  await EasyLocalization.ensureInitialized();
  await initializeDateFormatting();

  final bootstrap = await AppStorage.loadBootstrap(
    defaultApiBaseUrl: defaultApiBaseUrl,
  );

  runApp(
    EasyLocalization(
      supportedLocales: const [Locale('en'), Locale('fr'), Locale('ar')],
      path: 'assets/translations',
      fallbackLocale: const Locale('en'),
      useOnlyLangCode: true,
      child: ProviderScope(
        overrides: [
          bootstrapProvider.overrideWith(() => BootstrapNotifier(bootstrap)),
        ],
        child: const AdminApp(),
      ),
    ),
  );
}

class AdminApp extends ConsumerStatefulWidget {
  const AdminApp({super.key});

  @override
  ConsumerState<AdminApp> createState() => _AdminAppState();
}

class _AdminAppState extends ConsumerState<AdminApp> {
  bool _scheduledInitialNotificationSync = false;

  @override
  Widget build(BuildContext context) {
    final router = ref.watch(routerProvider);
    final settings = ref.watch(settingsProvider);
    final authState = ref.watch(authProvider);
    final notificationService = ref.read(notificationServiceProvider);

    notificationService.setRouteHandler(router.go);

    ref.listen<AuthState>(authProvider, (_, next) {
      _syncNotifications(next);
    });

    if (!_scheduledInitialNotificationSync) {
      _scheduledInitialNotificationSync = true;
      Future.microtask(() => _syncNotifications(authState));
    }

    return ToastificationWrapper(
      child: MaterialApp.router(
        title: 'admin.nav.dashboard'.tr(),
        theme: AppTheme.light,
        darkTheme: AppTheme.dark,
        themeMode: settings.themeMode,
        routerConfig: router,
        locale: context.locale,
        supportedLocales: context.supportedLocales,
        localizationsDelegates: context.localizationDelegates,
        debugShowCheckedModeBanner: false,
      ),
    );
  }

  void _syncNotifications(AuthState authState) {
    ref.read(notificationServiceProvider).syncAuthState(
      isAuthenticated: authState.isAuthenticated,
      mode: authState.mode,
      userId: authState.user?.id,
      tenantId: authState.user?.tenantId,
    );
  }
}
