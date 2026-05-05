import 'package:admin_app/providers/settings_provider.dart';
import 'package:admin_app/screens/login_screen.dart';
import 'package:admin_app/screens/register_screen.dart';
import 'package:admin_app/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:shared_preferences/shared_preferences.dart';

class _AuthTestApp extends ConsumerWidget {
  const _AuthTestApp({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final settings = ref.watch(settingsProvider);
    return MaterialApp(
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      themeMode: settings.themeMode,
      home: child,
    );
  }
}

void main() {
  setUp(() async {
    SharedPreferences.setMockInitialValues({});
  });

  testWidgets('login screen toggles between dark and light mode', (
    WidgetTester tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(1280, 900));
    addTearDown(() async {
      await tester.binding.setSurfaceSize(null);
    });

    final container = ProviderContainer();
    addTearDown(container.dispose);
    container.read(settingsProvider.notifier).setThemeMode(ThemeMode.dark);

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: const _AuthTestApp(child: LoginScreen()),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Log in to your account'), findsOneWidget);
    expect(find.byIcon(LucideIcons.sun), findsOneWidget);

    await tester.tap(find.byIcon(LucideIcons.sun));
    await tester.pumpAndSettle();

    expect(find.byIcon(LucideIcons.moon), findsOneWidget);
  });

  testWidgets('register screen enables submit after OTP verification', (
    WidgetTester tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(1280, 900));
    addTearDown(() async {
      await tester.binding.setSurfaceSize(null);
    });

    final container = ProviderContainer();
    addTearDown(container.dispose);
    container.read(settingsProvider.notifier).setThemeMode(ThemeMode.dark);

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: const _AuthTestApp(child: RegisterScreen()),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Create your account'), findsOneWidget);
    expect(find.text('Verify OTP to continue'), findsOneWidget);

    await tester.tap(find.byKey(const Key('register-send-otp')));
    await tester.pumpAndSettle();

    final otpField = find.byKey(const Key('register-otp-input'));
    expect(otpField, findsOneWidget);

    await tester.enterText(otpField, '123456');
    await tester.tap(find.byKey(const Key('register-verify-otp')));
    await tester.pumpAndSettle();

    expect(find.text('Phone number verified.'), findsOneWidget);
    expect(find.text('Create account'), findsOneWidget);
  });
}
