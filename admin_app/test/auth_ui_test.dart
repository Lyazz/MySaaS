import 'package:admin_app/providers/settings_provider.dart';
import 'package:admin_app/screens/login_screen.dart';
import 'package:admin_app/screens/register_screen.dart';
import 'package:admin_app/theme/app_theme.dart';
import 'package:admin_app/widgets/auth/auth_widgets.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'helpers/pump_localized_app.dart';

/// Applies the app theme selected in [settingsProvider], the way `main.dart`
/// wires `MaterialApp.themeMode`, so the auth palettes resolve correctly.
class _ThemedAuthHost extends ConsumerWidget {
  const _ThemedAuthHost({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final mode = ref.watch(settingsProvider).themeMode;
    final isDark =
        mode == ThemeMode.dark ||
        (mode == ThemeMode.system &&
            MediaQuery.platformBrightnessOf(context) == Brightness.dark);

    return Theme(data: isDark ? AppTheme.dark : AppTheme.light, child: child);
  }
}

/// The auth screens run looping background animations, so `pumpAndSettle`
/// never returns. Advance a fixed amount of time instead.
Future<void> _settle(WidgetTester tester) async {
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 900));
  await tester.pump(const Duration(milliseconds: 100));
}

Future<ProviderContainer> _pumpAuthScreen(
  WidgetTester tester,
  Widget screen, {
  ThemeMode themeMode = ThemeMode.dark,
  Size size = const Size(1280, 1400),
}) async {
  await tester.binding.setSurfaceSize(size);
  addTearDown(() async {
    await tester.binding.setSurfaceSize(null);
  });

  final container = ProviderContainer();
  addTearDown(container.dispose);
  container.read(settingsProvider.notifier).setThemeMode(themeMode);

  await tester.pumpWidget(
    UncontrolledProviderScope(
      container: container,
      child: buildLocalizedTestApp(home: _ThemedAuthHost(child: screen)),
    ),
  );
  await _settle(tester);

  return container;
}

void main() {
  setUp(() async {
    SharedPreferences.setMockInitialValues({});
  });

  group('login screen', () {
    testWidgets('toggles between dark and light mode', (tester) async {
      await _pumpAuthScreen(tester, const LoginScreen());

      expect(find.text('Log in to your account'), findsOneWidget);
      expect(find.byIcon(LucideIcons.sun), findsOneWidget);

      await tester.tap(find.byIcon(LucideIcons.sun));
      await _settle(tester);

      expect(find.byIcon(LucideIcons.moon), findsOneWidget);
    });

    testWidgets('does not prefill credentials', (tester) async {
      await _pumpAuthScreen(tester, const LoginScreen());

      final email = tester.widget<TextField>(
        find.descendant(
          of: find.byKey(const Key('login-email-input')),
          matching: find.byType(TextField),
        ),
      );
      final password = tester.widget<TextField>(
        find.descendant(
          of: find.byKey(const Key('login-password-input')),
          matching: find.byType(TextField),
        ),
      );

      expect(email.controller?.text, isEmpty);
      expect(password.controller?.text, isEmpty);
    });

    testWidgets('validates email and password before calling the API', (
      tester,
    ) async {
      await _pumpAuthScreen(tester, const LoginScreen());

      await tester.tap(find.byKey(const Key('login-submit')));
      await _settle(tester);

      expect(find.text('Email is required.'), findsOneWidget);
      expect(find.text('Password is required.'), findsOneWidget);

      await tester.enterText(
        find.byKey(const Key('login-email-input')),
        'not-an-email',
      );
      await _settle(tester);

      expect(find.text('Enter a valid email address.'), findsOneWidget);
    });

    testWidgets('password field can be revealed', (tester) async {
      await _pumpAuthScreen(tester, const LoginScreen());

      final passwordFinder = find.descendant(
        of: find.byKey(const Key('login-password-input')),
        matching: find.byType(TextField),
      );

      expect(tester.widget<TextField>(passwordFinder).obscureText, isTrue);

      await tester.tap(find.byIcon(LucideIcons.eye).first);
      await _settle(tester);

      expect(tester.widget<TextField>(passwordFinder).obscureText, isFalse);
    });

    testWidgets('forgot password opens the placeholder notice', (tester) async {
      await _pumpAuthScreen(tester, const LoginScreen());

      await tester.tap(find.byKey(const Key('login-forgot-password')));
      await _settle(tester);

      expect(find.text('Forgot Password'), findsOneWidget);
      expect(
        find.text(
          'This screen is a placeholder for now. '
          'Reset emails are not active yet.',
        ),
        findsOneWidget,
      );
    });
  });

  group('register screen', () {
    testWidgets('enables submit after OTP verification', (tester) async {
      await _pumpAuthScreen(tester, const RegisterScreen());

      expect(find.text('Create your account'), findsOneWidget);
      expect(find.text('Verify OTP to Continue'), findsOneWidget);

      await tester.enterText(
        find.byKey(const Key('register-phone-input')),
        '0540801436',
      );
      await tester.tap(find.byKey(const Key('register-send-otp')));
      await _settle(tester);

      await tester.enterText(
        find.byKey(const Key('register-otp-input')),
        '123456',
      );
      await tester.tap(find.byKey(const Key('register-verify-otp')));
      await _settle(tester);

      expect(find.text('Phone confirmed.'), findsOneWidget);
      expect(find.text('Register & Create Store'), findsOneWidget);
    });

    testWidgets('rejects an OTP that is not six digits', (tester) async {
      await _pumpAuthScreen(tester, const RegisterScreen());

      await tester.enterText(
        find.byKey(const Key('register-phone-input')),
        '0540801436',
      );
      await tester.tap(find.byKey(const Key('register-send-otp')));
      await _settle(tester);

      await tester.enterText(
        find.byKey(const Key('register-otp-input')),
        '123',
      );
      await tester.tap(find.byKey(const Key('register-verify-otp')));
      await _settle(tester);

      expect(find.text('Enter the 6-digit code.'), findsOneWidget);
      expect(find.text('Verify OTP to Continue'), findsOneWidget);
    });

    testWidgets('editing the phone number invalidates a verified OTP', (
      tester,
    ) async {
      await _pumpAuthScreen(tester, const RegisterScreen());

      await tester.enterText(
        find.byKey(const Key('register-phone-input')),
        '0540801436',
      );
      await tester.tap(find.byKey(const Key('register-send-otp')));
      await _settle(tester);
      await tester.enterText(
        find.byKey(const Key('register-otp-input')),
        '123456',
      );
      await tester.tap(find.byKey(const Key('register-verify-otp')));
      await _settle(tester);

      expect(find.text('Register & Create Store'), findsOneWidget);

      await tester.enterText(
        find.byKey(const Key('register-phone-input')),
        '0550801437',
      );
      await _settle(tester);

      expect(find.text('Verify OTP to Continue'), findsOneWidget);
      expect(find.text('Phone confirmed.'), findsNothing);
    });

    testWidgets('validates the form before submitting', (tester) async {
      await _pumpAuthScreen(tester, const RegisterScreen());

      // Verify the phone first so the submit button becomes tappable.
      await tester.enterText(
        find.byKey(const Key('register-phone-input')),
        '0540801436',
      );
      await tester.tap(find.byKey(const Key('register-send-otp')));
      await _settle(tester);
      await tester.enterText(
        find.byKey(const Key('register-otp-input')),
        '123456',
      );
      await tester.tap(find.byKey(const Key('register-verify-otp')));
      await _settle(tester);

      await tester.enterText(
        find.byKey(const Key('register-password-input')),
        'short',
      );
      await tester.tap(find.byKey(const Key('register-submit')));
      await _settle(tester);

      expect(find.text('Company name is required.'), findsOneWidget);
      expect(find.text('Email is required.'), findsOneWidget);
      expect(
        find.text('Password must be at least 8 characters.'),
        findsOneWidget,
      );
    });

    testWidgets('derives the store URL from the company name', (tester) async {
      await _pumpAuthScreen(tester, const RegisterScreen());

      await tester.enterText(
        find.byKey(const Key('register-name-input')),
        'Dzair Fashion',
      );
      await _settle(tester);

      final slug = tester.widget<TextField>(
        find.descendant(
          of: find.byKey(const Key('register-slug-input')),
          matching: find.byType(TextField),
        ),
      );
      expect(slug.controller?.text, 'dzair-fashion');
      expect(
        find.text('Your store will be at: dzair-fashion.swekly.com'),
        findsOneWidget,
      );
    });

    testWidgets('shows a password strength meter once typing starts', (
      tester,
    ) async {
      await _pumpAuthScreen(tester, const RegisterScreen());

      expect(find.byKey(const Key('register-password-strength')), findsNothing);

      await tester.enterText(
        find.byKey(const Key('register-password-input')),
        'abcdefgh',
      );
      await _settle(tester);

      expect(
        find.byKey(const Key('register-password-strength')),
        findsOneWidget,
      );
      expect(find.text('Weak'), findsOneWidget);

      await tester.enterText(
        find.byKey(const Key('register-password-input')),
        'Abcdefgh1234!',
      );
      await _settle(tester);

      expect(find.text('Strong'), findsOneWidget);
    });
  });

  group('goldens', () {
    testWidgets('login screen dark desktop layout matches golden', (
      tester,
    ) async {
      await _pumpAuthScreen(
        tester,
        const LoginScreen(),
        size: const Size(1440, 1100),
      );

      await expectLater(
        find.byType(LoginScreen),
        matchesGoldenFile('goldens/login_screen_dark.png'),
      );
    });
  });

  group('shared auth widgets', () {
    testWidgets('social buttons are marked as coming soon', (tester) async {
      await _pumpAuthScreen(tester, const LoginScreen());

      final buttons = tester.widgetList<AuthSocialButton>(
        find.byType(AuthSocialButton),
      );
      expect(buttons.length, 3);

      expect(
        find.byWidgetPredicate(
          (widget) =>
              widget is Tooltip &&
              widget.message == 'Social sign-in is coming soon.',
        ),
        findsNWidgets(3),
      );
    });
  });
}
