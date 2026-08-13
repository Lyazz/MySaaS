import 'dart:ui';

import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../providers/auth_provider.dart';
import '../utils/auth_error.dart';
import '../widgets/auth/auth_palette.dart';
import '../widgets/auth/auth_widgets.dart';
import '../widgets/language_switcher_button.dart';

/// Optional developer conveniences, e.g.
/// `flutter run --dart-define=DEV_LOGIN_EMAIL=owner@example.com`.
/// Empty by default so no credentials ship inside the app.
const String _devLoginEmail = String.fromEnvironment('DEV_LOGIN_EMAIL');
const String _devLoginPassword = String.fromEnvironment('DEV_LOGIN_PASSWORD');

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  static final RegExp _emailRegex = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');

  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _passwordFocus = FocusNode();

  bool _isLoading = false;
  bool _submitted = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();

    if (kDebugMode) {
      _emailController.text = _devLoginEmail;
      _passwordController.text = _devLoginPassword;
    }
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _passwordFocus.dispose();
    super.dispose();
  }

  void _clearError() {
    if (_errorMessage == null) return;
    setState(() => _errorMessage = null);
  }

  Future<void> _handleLogin() async {
    // Surface field errors from the first failed attempt onwards.
    if (!_submitted) setState(() => _submitted = true);
    if (!(_formKey.currentState?.validate() ?? false)) return;
    if (_isLoading) return;

    FocusScope.of(context).unfocus();
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      await ref
          .read(authProvider.notifier)
          .login(_emailController.text.trim(), _passwordController.text);

      if (!mounted) return;
      TextInput.finishAutofillContext();
      context.go('/');
    } catch (error) {
      if (!mounted) return;
      setState(() => _errorMessage = AuthErrorMapper.messageFor(error));
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _showForgotPasswordSheet() {
    final palette = AuthPalette.of(context);

    showDialog<void>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        backgroundColor: palette.cardBackground,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: BorderSide(color: palette.cardBorder),
        ),
        title: Text(
          'auth.forgotPassword.title'.tr(),
          style: GoogleFonts.outfit(
            color: palette.primaryText,
            fontWeight: FontWeight.w700,
            fontSize: 20,
          ),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'auth.forgotPassword.subtitle'.tr(),
              style: GoogleFonts.dmSans(
                color: palette.secondaryText,
                fontSize: 14,
                height: 1.45,
              ),
            ),
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0x55F59E0B)),
                color: const Color(0x22F59E0B),
              ),
              child: Text(
                'auth.forgotPassword.placeholderNotice'.tr(),
                style: GoogleFonts.dmSans(
                  color: AuthPalette.warningText,
                  fontSize: 13,
                  height: 1.4,
                ),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(),
            child: Text(
              'auth.forgotPassword.backToLogin'.tr(),
              style: GoogleFonts.dmSans(
                color: palette.brand,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final palette = AuthPalette.of(context);

    return Scaffold(
      backgroundColor: palette.pageBackground,
      body: Stack(
        fit: StackFit.expand,
        children: [
          _AnimatedBlobBackdrop(palette: palette),
          SafeArea(
            child: LayoutBuilder(
              builder: (context, constraints) {
                final isDesktop = constraints.maxWidth >= 1024;

                return Center(
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 1280),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 20,
                        vertical: 20,
                      ),
                      child: Row(
                        children: [
                          if (isDesktop) ...[
                            Expanded(
                              child: _AnimatedEntrance(
                                delay: 0,
                                child: _buildHeroPanel(palette),
                              ),
                            ),
                            const SizedBox(width: 22),
                          ],
                          Expanded(
                            child: _AnimatedEntrance(
                              delay: isDesktop ? 150 : 0,
                              child: _buildFormPanel(
                                context,
                                palette,
                                isDesktop: isDesktop,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
      floatingActionButton: HoverScale(
        child: FloatingActionButton.extended(
          heroTag: 'login-offline-activation',
          onPressed: () => context.go('/activate?mode=offline'),
          backgroundColor: palette.glassBackground,
          icon: Icon(LucideIcons.wifiOff, color: palette.primaryText, size: 18),
          label: Text(
            'app.offline_activation'.tr(),
            style: GoogleFonts.dmSans(
              color: palette.primaryText,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHeroPanel(AuthPalette palette) {
    return Container(
      decoration: BoxDecoration(
        color: palette.cardBackground,
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: palette.cardBorder),
      ),
      padding: const EdgeInsets.all(32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AuthBadge(
            palette: palette,
            label: 'auth.login.hero.panel.badge'.tr().toUpperCase(),
          ),
          const SizedBox(height: 22),
          Text.rich(
            TextSpan(
              style: GoogleFonts.outfit(
                fontSize: 44,
                fontWeight: FontWeight.w700,
                height: 1.08,
                letterSpacing: -1.5,
                color: palette.primaryText,
              ),
              children: [
                TextSpan(text: '${'auth.login.hero.welcomeBack'.tr()},\n'),
                TextSpan(
                  text: 'auth.login.hero.builder'.tr(),
                  style: TextStyle(color: palette.brand),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'auth.login.hero.subtitle'.tr(),
            style: GoogleFonts.dmSans(
              fontSize: 16,
              color: palette.secondaryText,
              height: 1.5,
            ),
          ),
          const SizedBox(height: 24),
          HoverScale(
            child: Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: palette.glassBackground,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: palette.cardBorder),
              ),
              child: Row(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: palette.brand.withValues(alpha: 0.18),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Icon(
                      LucideIcons.trendingUp,
                      color: palette.brand,
                      size: 22,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'auth.login.hero.feature.title'.tr(),
                          style: GoogleFonts.dmSans(
                            color: palette.primaryText,
                            fontWeight: FontWeight.w600,
                            fontSize: 15,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'auth.login.hero.feature.description'.tr(),
                          style: GoogleFonts.dmSans(
                            color: palette.secondaryText,
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          const Spacer(),
          _AnimatedChartBars(palette: palette),
          const SizedBox(height: 18),
          Text(
            'auth.login.hero.copyright'.tr(
              namedArgs: {'year': DateTime.now().year.toString()},
            ),
            style: GoogleFonts.dmSans(color: palette.secondaryText, fontSize: 12),
          ),
        ],
      ),
    );
  }

  Widget _buildFormPanel(
    BuildContext context,
    AuthPalette palette, {
    required bool isDesktop,
  }) {
    return Align(
      alignment: Alignment.center,
      child: Container(
        constraints: const BoxConstraints(maxWidth: 540),
        decoration: BoxDecoration(
          color: palette.cardBackground,
          borderRadius: BorderRadius.circular(28),
          border: Border.all(color: palette.cardBorder),
        ),
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(28),
          child: Form(
            key: _formKey,
            autovalidateMode: _submitted
                ? AutovalidateMode.onUserInteraction
                : AutovalidateMode.disabled,
            child: AutofillGroup(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    children: [
                      AuthLogoMark(palette: palette),
                      const Spacer(),
                      const LanguageSwitcherButton(compact: true),
                      const SizedBox(width: 8),
                      AuthThemeToggle(palette: palette),
                    ],
                  ),
                  const SizedBox(height: 22),
                  Text(
                    'auth.login.form.title'.tr(),
                    style: GoogleFonts.outfit(
                      fontSize: 34,
                      fontWeight: FontWeight.w700,
                      letterSpacing: -0.8,
                      color: palette.primaryText,
                    ),
                    textAlign: isDesktop ? TextAlign.left : TextAlign.center,
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'auth.login.form.subtitle'.tr(),
                    style: GoogleFonts.dmSans(
                      fontSize: 14,
                      color: palette.secondaryText,
                    ),
                    textAlign: isDesktop ? TextAlign.left : TextAlign.center,
                  ),
                  const SizedBox(height: 22),
                  Row(
                    children: [
                      Expanded(
                        child: AuthSocialButton(
                          palette: palette,
                          icon: Icons.public,
                          label: 'app.google'.tr(),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: AuthSocialButton(
                          palette: palette,
                          icon: Icons.facebook,
                          label: 'admin.contactInfosForm.kinds.facebook.label'
                              .tr(),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: AuthSocialButton(
                          palette: palette,
                          icon: LucideIcons.apple,
                          label: 'app.apple'.tr(),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 18),
                  Row(
                    children: [
                      Expanded(child: Divider(color: palette.cardBorder)),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 8),
                        child: Text(
                          'auth.login.social.divider'.tr(),
                          style: GoogleFonts.dmSans(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            letterSpacing: 1.5,
                            color: palette.secondaryText,
                          ),
                        ),
                      ),
                      Expanded(child: Divider(color: palette.cardBorder)),
                    ],
                  ),
                  const SizedBox(height: 18),
                  AuthTextField(
                    key: const Key('login-email-input'),
                    palette: palette,
                    label: 'auth.login.form.email.label'.tr(),
                    // The shared translation carries a vue-i18n `{'@'}` escape
                    // that easy_localization renders literally, so keep the
                    // placeholder inline here.
                    hint: 'name@company.com',
                    controller: _emailController,
                    keyboardType: TextInputType.emailAddress,
                    autofillHints: const [AutofillHints.username],
                    textInputAction: TextInputAction.next,
                    enabled: !_isLoading,
                    onChanged: (_) => _clearError(),
                    onFieldSubmitted: (_) => _passwordFocus.requestFocus(),
                    validator: _validateEmail,
                  ),
                  const SizedBox(height: 14),
                  AuthTextField(
                    key: const Key('login-password-input'),
                    palette: palette,
                    focusNode: _passwordFocus,
                    label: 'auth.login.form.password.label'.tr(),
                    hint: '••••••••',
                    controller: _passwordController,
                    obscureText: true,
                    autofillHints: const [AutofillHints.password],
                    textInputAction: TextInputAction.done,
                    enabled: !_isLoading,
                    onChanged: (_) => _clearError(),
                    onFieldSubmitted: (_) => _handleLogin(),
                    validator: _validatePassword,
                    trailing: InkWell(
                      key: const Key('login-forgot-password'),
                      onTap: _showForgotPasswordSheet,
                      child: Text(
                        'auth.login.form.password.forgot'.tr(),
                        style: GoogleFonts.dmSans(
                          color: palette.brand,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 18),
                  if (_errorMessage != null) ...[
                    AuthErrorBanner(message: _errorMessage!),
                    const SizedBox(height: 16),
                  ],
                  AuthSubmitButton(
                    key: const Key('login-submit'),
                    palette: palette,
                    label: _isLoading
                        ? 'auth.login.form.submit.signingIn'.tr()
                        : 'auth.login.form.submit.signIn'.tr(),
                    icon: _isLoading ? null : LucideIcons.arrowRight,
                    loading: _isLoading,
                    onTap: _isLoading ? null : _handleLogin,
                  ),
                  const SizedBox(height: 14),
                  Wrap(
                    alignment: WrapAlignment.center,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      Text(
                        '${'auth.login.form.noAccount'.tr()} ',
                        style: GoogleFonts.dmSans(
                          color: palette.secondaryText,
                          fontSize: 14,
                        ),
                      ),
                      InkWell(
                        key: const Key('login-go-register'),
                        onTap: () => context.go('/register'),
                        child: Text(
                          'auth.login.form.startFree'.tr(),
                          style: GoogleFonts.dmSans(
                            color: palette.brand,
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  String? _validateEmail(String? value) {
    final email = value?.trim() ?? '';
    if (email.isEmpty) return 'auth.validation.emailRequired'.tr();
    if (!_emailRegex.hasMatch(email)) {
      return 'auth.validation.emailInvalid'.tr();
    }
    return null;
  }

  String? _validatePassword(String? value) {
    if ((value ?? '').isEmpty) return 'auth.validation.passwordRequired'.tr();
    return null;
  }
}

class _AnimatedBlobBackdrop extends StatefulWidget {
  final AuthPalette palette;
  const _AnimatedBlobBackdrop({required this.palette});

  @override
  State<_AnimatedBlobBackdrop> createState() => _AnimatedBlobBackdropState();
}

class _AnimatedBlobBackdropState extends State<_AnimatedBlobBackdrop>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 15),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Widget _buildBlob({required Color color, required double size}) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(color: color, shape: BoxShape.circle),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 110, sigmaY: 110),
        child: const SizedBox.expand(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      fit: StackFit.expand,
      children: [
        DecoratedBox(
          decoration: BoxDecoration(gradient: widget.palette.pageGradient),
        ),
        AnimatedBuilder(
          animation: _controller,
          builder: (context, child) {
            final dy = 30 * _controller.value;
            final dx = 20 * _controller.value;
            return Positioned(
              top: -160 + dy,
              left: -80 + dx,
              child: _buildBlob(color: widget.palette.blobPrimary, size: 420),
            );
          },
        ),
        AnimatedBuilder(
          animation: _controller,
          builder: (context, child) {
            final dy = -40 * _controller.value;
            final dx = -15 * _controller.value;
            return Positioned(
              bottom: -180 + dy,
              right: -120 + dx,
              child: _buildBlob(color: widget.palette.blobSecondary, size: 420),
            );
          },
        ),
      ],
    );
  }
}

class _AnimatedEntrance extends StatefulWidget {
  final Widget child;
  final int delay;
  const _AnimatedEntrance({required this.child, this.delay = 0});

  @override
  State<_AnimatedEntrance> createState() => _AnimatedEntranceState();
}

class _AnimatedEntranceState extends State<_AnimatedEntrance>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _opacity;
  late Animation<Offset> _offset;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );
    _opacity = Tween<double>(
      begin: 0,
      end: 1,
    ).animate(CurvedAnimation(parent: _controller, curve: Curves.easeOut));
    _offset = Tween<Offset>(
      begin: const Offset(0, 0.05),
      end: Offset.zero,
    ).animate(CurvedAnimation(parent: _controller, curve: Curves.easeOutQuart));

    Future.delayed(Duration(milliseconds: widget.delay), () {
      if (mounted) _controller.forward();
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: _opacity,
      child: SlideTransition(position: _offset, child: widget.child),
    );
  }
}

class _AnimatedChartBars extends StatefulWidget {
  final AuthPalette palette;
  const _AnimatedChartBars({required this.palette});

  @override
  State<_AnimatedChartBars> createState() => _AnimatedChartBarsState();
}

class _AnimatedChartBarsState extends State<_AnimatedChartBars>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final baseHeights = [26.0, 42.0, 30.0, 52.0, 36.0];
    return Row(
      children: List.generate(5, (index) {
        return Expanded(
          child: AnimatedBuilder(
            animation: _controller,
            builder: (context, child) {
              final offset =
                  (index % 2 == 0
                      ? _controller.value
                      : (1 - _controller.value)) *
                  8;
              return Container(
                margin: EdgeInsets.only(right: index == 4 ? 0 : 6),
                height: baseHeights[index] + offset,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(6),
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      widget.palette.brand.withValues(alpha: 0.65),
                      widget.palette.brand.withValues(alpha: 0.15),
                    ],
                  ),
                ),
              );
            },
          ),
        );
      }),
    );
  }
}
