import 'dart:ui';

import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../providers/auth_provider.dart';
import '../utils/algerian_phone.dart';
import '../utils/auth_error.dart';
import '../widgets/auth/auth_palette.dart';
import '../widgets/auth/auth_widgets.dart';
import '../widgets/language_switcher_button.dart';

/// Minimum password length. Mirrors `MIN_PASSWORD_LENGTH` in
/// `backend/src/modules/auth/auth.service.ts`.
const int kMinPasswordLength = 8;

/// Length of the phone confirmation code.
const int kOtpLength = 6;

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  static final RegExp _emailRegex = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');
  static final RegExp _slugRegex = RegExp(r'^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$');

  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _slugController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _otpController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  final _slugFocus = FocusNode();
  final _emailFocus = FocusNode();
  final _phoneFocus = FocusNode();
  final _passwordFocus = FocusNode();
  final _confirmPasswordFocus = FocusNode();

  bool _loading = false;
  bool _submitted = false;
  bool _otpSent = false;
  bool _otpVerified = false;
  bool _slugLockedByUser = false;
  String? _error;
  String? _otpFeedback;
  bool _otpSuccess = false;
  bool _registered = false;
  String? _registeredTenantName;

  /// Phone number the current OTP was issued for. Changing the number after
  /// verifying must invalidate the confirmation.
  String? _verifiedPhone;

  @override
  void initState() {
    super.initState();
    _nameController.addListener(_handleNameChanged);
    _phoneController.addListener(_handlePhoneChanged);
    _passwordController.addListener(_handlePasswordChanged);
  }

  @override
  void dispose() {
    _nameController.removeListener(_handleNameChanged);
    _phoneController.removeListener(_handlePhoneChanged);
    _passwordController.removeListener(_handlePasswordChanged);
    _nameController.dispose();
    _slugController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _otpController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    _slugFocus.dispose();
    _emailFocus.dispose();
    _phoneFocus.dispose();
    _passwordFocus.dispose();
    _confirmPasswordFocus.dispose();
    super.dispose();
  }

  void _handleNameChanged() {
    if (_slugLockedByUser) return;
    final slug = _slugify(_nameController.text);
    if (_slugController.text != slug) {
      _slugController.text = slug;
      if (mounted) setState(() {});
    }
  }

  /// A verified code belongs to one number only — editing the phone drops it.
  void _handlePhoneChanged() {
    final current = AlgerianPhone.tryNormalize(_phoneController.text);
    if (!_otpSent && !_otpVerified) return;
    if (_verifiedPhone != null && current == _verifiedPhone) return;

    setState(() {
      _otpSent = false;
      _otpVerified = false;
      _verifiedPhone = null;
      _otpSuccess = false;
      _otpFeedback = null;
      _otpController.clear();
    });
  }

  /// Keeps the "passwords match" error in sync while the first field is edited.
  void _handlePasswordChanged() {
    if (!_submitted) return;
    if (_confirmPasswordController.text.isEmpty) return;
    setState(() {});
  }

  String _slugify(String value) {
    return value
        .toLowerCase()
        .trim()
        .replaceAll(RegExp(r'[^a-z0-9]+'), '-')
        .replaceAll(RegExp(r'^-+|-+$'), '');
  }

  void _clearError() {
    if (_error == null) return;
    setState(() => _error = null);
  }

  void _sendOtpPlaceholder() {
    setState(() {
      _error = null;
      _otpFeedback = null;
      _otpSuccess = false;
    });

    final phone = _phoneController.text.trim();
    if (phone.isEmpty) {
      setState(() => _error = 'auth.register.errors.phoneRequired'.tr());
      return;
    }

    final normalized = AlgerianPhone.tryNormalize(phone);
    if (normalized == null) {
      setState(() => _error = 'auth.register.errors.phoneInvalid'.tr());
      return;
    }

    setState(() {
      _otpSent = true;
      _otpVerified = false;
      _verifiedPhone = null;
      _otpController.clear();
      _otpFeedback = 'auth.register.form.otp.placeholderNotice'.tr();
      _otpSuccess = false;
    });
  }

  void _verifyOtpPlaceholder() {
    setState(() => _error = null);

    if (!_otpSent) {
      setState(() => _error = 'auth.register.errors.otpSendFirst'.tr());
      return;
    }

    final code = _otpController.text.trim();
    if (code.isEmpty) {
      setState(() => _error = 'auth.register.errors.otpRequired'.tr());
      return;
    }
    if (code.length != kOtpLength) {
      setState(
        () => _error = 'auth.register.errors.otpInvalid'.tr(
          namedArgs: {'length': '$kOtpLength'},
        ),
      );
      return;
    }

    setState(() {
      _otpVerified = true;
      _verifiedPhone = AlgerianPhone.tryNormalize(_phoneController.text);
      _otpFeedback = 'auth.register.form.otp.verified'.tr();
      _otpSuccess = true;
    });
  }

  Future<void> _handleRegister() async {
    if (!_submitted) setState(() => _submitted = true);
    if (!(_formKey.currentState?.validate() ?? false)) return;
    if (_loading) return;

    if (!_otpVerified) {
      setState(() => _error = 'auth.register.errors.otpVerifyFirst'.tr());
      return;
    }

    FocusScope.of(context).unfocus();
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final tenantName = await ref
          .read(authProvider.notifier)
          .register(
            name: _nameController.text.trim(),
            slug: _slugController.text.trim().toLowerCase(),
            email: _emailController.text.trim().toLowerCase(),
            password: _passwordController.text,
            phone: _phoneController.text.trim(),
          );

      if (!mounted) return;
      TextInput.finishAutofillContext();
      setState(() {
        _registered = true;
        _registeredTenantName = tenantName;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = AuthErrorMapper.messageFor(error));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final palette = AuthPalette.of(context);

    return Scaffold(
      backgroundColor: palette.pageBackground,
      body: Stack(
        fit: StackFit.expand,
        children: [
          _buildBackdrop(palette),
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
                            Expanded(child: _buildHeroPanel(palette)),
                            const SizedBox(width: 22),
                          ],
                          Expanded(
                            child: _buildFormPanel(
                              context,
                              palette,
                              isDesktop: isDesktop,
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
    );
  }

  Widget _buildBackdrop(AuthPalette palette) {
    return Stack(
      fit: StackFit.expand,
      children: [
        DecoratedBox(decoration: BoxDecoration(gradient: palette.pageGradient)),
        Positioned(
          top: -160,
          left: -80,
          child: _buildBlob(color: palette.blobPrimary),
        ),
        Positioned(
          bottom: -180,
          right: -120,
          child: _buildBlob(color: palette.blobSecondary),
        ),
      ],
    );
  }

  Widget _buildBlob({required Color color}) {
    return Container(
      width: 420,
      height: 420,
      decoration: BoxDecoration(color: color, shape: BoxShape.circle),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 110, sigmaY: 110),
        child: const SizedBox.expand(),
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
            label: 'auth.register.hero.panel.badge'.tr().toUpperCase(),
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
                TextSpan(text: '${'auth.register.hero.launchYour'.tr()}\n'),
                TextSpan(
                  text: 'auth.register.hero.empire'.tr(),
                  style: TextStyle(color: palette.brand),
                ),
                TextSpan(text: ' ${'auth.register.hero.today'.tr()}'),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'auth.register.hero.subtitle'.tr(),
            style: GoogleFonts.dmSans(
              fontSize: 16,
              color: palette.secondaryText,
              height: 1.5,
            ),
          ),
          const SizedBox(height: 18),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _buildPill(
                palette,
                LucideIcons.package,
                'auth.register.hero.panel.pills.orders'.tr(),
              ),
              _buildPill(
                palette,
                LucideIcons.truck,
                'auth.register.hero.panel.pills.shipping'.tr(),
              ),
              _buildPill(
                palette,
                LucideIcons.barChart2,
                'auth.register.hero.panel.pills.analytics'.tr(),
              ),
            ],
          ),
          const SizedBox(height: 22),
          Row(
            children: [
              Expanded(
                child: _buildMetric(
                  palette,
                  '24h',
                  'auth.register.hero.panel.metrics.goLive'.tr(),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _buildMetric(
                  palette,
                  '99.9%',
                  'auth.register.hero.panel.metrics.uptime'.tr(),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _buildMetric(
                  palette,
                  'COD',
                  'auth.register.hero.panel.metrics.localCod'.tr(),
                ),
              ),
            ],
          ),
          const Spacer(),
          Text(
            'auth.register.hero.panel.tasks.cod'.tr(),
            style: GoogleFonts.dmSans(
              color: palette.secondaryText,
              fontSize: 13,
              height: 1.45,
            ),
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
      alignment: Alignment.topCenter,
      child: Container(
        constraints: const BoxConstraints(maxWidth: 540),
        decoration: BoxDecoration(
          color: palette.cardBackground,
          borderRadius: BorderRadius.circular(28),
          border: Border.all(color: palette.cardBorder),
        ),
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(28),
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
                'auth.register.form.title'.tr(),
                style: GoogleFonts.outfit(
                  fontSize: 34,
                  fontWeight: FontWeight.w700,
                  letterSpacing: -0.8,
                  color: palette.primaryText,
                ),
                textAlign: isDesktop ? TextAlign.left : TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                'auth.register.form.subtitle'.tr(),
                style: GoogleFonts.dmSans(
                  fontSize: 15,
                  color: palette.secondaryText,
                ),
                textAlign: isDesktop ? TextAlign.left : TextAlign.center,
              ),
              const SizedBox(height: 22),
              if (_registered)
                _buildSuccessState(context, palette)
              else
                _buildForm(palette),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildForm(AuthPalette palette) {
    return Form(
      key: _formKey,
      autovalidateMode: _submitted
          ? AutovalidateMode.onUserInteraction
          : AutovalidateMode.disabled,
      child: AutofillGroup(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            AuthTextField(
              key: const Key('register-name-input'),
              palette: palette,
              label: 'auth.register.form.companyName.label'.tr(),
              hint: 'auth.register.form.companyName.placeholder'.tr(),
              controller: _nameController,
              textCapitalization: TextCapitalization.words,
              enabled: !_loading,
              onChanged: (_) => _clearError(),
              onFieldSubmitted: (_) => _slugFocus.requestFocus(),
              validator: (value) {
                if ((value ?? '').trim().isEmpty) {
                  return 'auth.validation.companyNameRequired'.tr();
                }
                return null;
              },
            ),
            const SizedBox(height: 14),
            _buildSlugInput(palette),
            const SizedBox(height: 14),
            AuthTextField(
              key: const Key('register-email-input'),
              palette: palette,
              focusNode: _emailFocus,
              label: 'auth.register.form.email.label'.tr(),
              // The shared translation uses a vue-i18n `{'@'}` escape that
              // easy_localization would render literally.
              hint: 'name@company.com',
              controller: _emailController,
              keyboardType: TextInputType.emailAddress,
              autofillHints: const [AutofillHints.newUsername],
              enabled: !_loading,
              onChanged: (_) => _clearError(),
              onFieldSubmitted: (_) => _phoneFocus.requestFocus(),
              validator: (value) {
                final email = value?.trim() ?? '';
                if (email.isEmpty) return 'auth.validation.emailRequired'.tr();
                if (!_emailRegex.hasMatch(email)) {
                  return 'auth.register.errors.emailInvalid'.tr();
                }
                return null;
              },
            ),
            const SizedBox(height: 14),
            AuthTextField(
              key: const Key('register-phone-input'),
              palette: palette,
              focusNode: _phoneFocus,
              label: 'auth.register.form.phone.label'.tr(),
              hint: '05XXXXXXXX',
              controller: _phoneController,
              keyboardType: TextInputType.phone,
              autofillHints: const [AutofillHints.telephoneNumber],
              inputFormatters: [
                FilteringTextInputFormatter.allow(RegExp(r'[0-9+\s]')),
              ],
              enabled: !_loading,
              onChanged: (_) => _clearError(),
              validator: (value) {
                final phone = value?.trim() ?? '';
                if (phone.isEmpty) {
                  return 'auth.register.errors.phoneRequired'.tr();
                }
                if (!AlgerianPhone.isValid(phone)) {
                  return 'auth.register.errors.phoneInvalid'.tr();
                }
                return null;
              },
            ),
            const SizedBox(height: 14),
            _buildOtpField(palette),
            const SizedBox(height: 14),
            AuthTextField(
              key: const Key('register-password-input'),
              palette: palette,
              focusNode: _passwordFocus,
              label: 'auth.register.form.password.label'.tr(),
              hint: '••••••••',
              controller: _passwordController,
              obscureText: true,
              autofillHints: const [AutofillHints.newPassword],
              enabled: !_loading,
              // Rebuild so the strength meter tracks every keystroke.
              onChanged: (_) => setState(() => _error = null),
              onFieldSubmitted: (_) => _confirmPasswordFocus.requestFocus(),
              validator: (value) {
                final password = value ?? '';
                if (password.isEmpty) {
                  return 'auth.validation.passwordRequired'.tr();
                }
                if (password.length < kMinPasswordLength) {
                  return 'auth.register.errors.passwordTooShort'.tr(
                    namedArgs: {'min': '$kMinPasswordLength'},
                  );
                }
                return null;
              },
            ),
            const SizedBox(height: 8),
            _PasswordStrengthMeter(
              palette: palette,
              password: _passwordController.text,
            ),
            const SizedBox(height: 14),
            AuthTextField(
              key: const Key('register-confirm-password-input'),
              palette: palette,
              focusNode: _confirmPasswordFocus,
              label: 'auth.register.form.confirmPassword.label'.tr(),
              hint: '••••••••',
              controller: _confirmPasswordController,
              obscureText: true,
              autofillHints: const [AutofillHints.newPassword],
              textInputAction: TextInputAction.done,
              enabled: !_loading,
              onChanged: (_) => _clearError(),
              onFieldSubmitted: (_) => _handleRegister(),
              validator: (value) {
                if ((value ?? '').isEmpty) {
                  return 'auth.validation.confirmPasswordRequired'.tr();
                }
                if (value != _passwordController.text) {
                  return 'auth.register.errors.passwordMismatch'.tr();
                }
                return null;
              },
            ),
            const SizedBox(height: 18),
            if (_error != null) ...[
              AuthErrorBanner(message: _error!),
              const SizedBox(height: 16),
            ],
            AuthSubmitButton(
              key: const Key('register-submit'),
              palette: palette,
              label: _loading
                  ? 'auth.register.form.submit.creating'.tr()
                  : (_otpVerified
                        ? 'auth.register.form.submit.register'.tr()
                        : 'auth.register.form.submit.verifyOtp'.tr()),
              icon: _loading || !_otpVerified ? null : LucideIcons.arrowRight,
              loading: _loading,
              onTap: _loading || !_otpVerified ? null : _handleRegister,
            ),
            const SizedBox(height: 14),
            Wrap(
              alignment: WrapAlignment.center,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                Text(
                  '${'auth.register.form.haveAccount'.tr()} ',
                  style: GoogleFonts.dmSans(
                    color: palette.secondaryText,
                    fontSize: 14,
                  ),
                ),
                InkWell(
                  key: const Key('register-go-login'),
                  onTap: () => context.go('/login'),
                  child: Text(
                    'auth.register.form.logIn'.tr(),
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
    );
  }

  Widget _buildSuccessState(BuildContext context, AuthPalette palette) {
    final tenantName = _registeredTenantName ?? _nameController.text.trim();

    return Container(
      key: const Key('register-success'),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AuthPalette.successBorder),
        color: AuthPalette.successBackground,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: AuthPalette.successBackground,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AuthPalette.successBorder),
                ),
                child: const Icon(
                  LucideIcons.checkCircle,
                  color: AuthPalette.success,
                  size: 20,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  'auth.register.success.title'.tr(),
                  style: GoogleFonts.dmSans(
                    color: palette.primaryText,
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            'auth.register.success.message'.tr(
              namedArgs: {'name': tenantName},
            ),
            style: GoogleFonts.dmSans(
              color: palette.secondaryText,
              fontSize: 14,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 14),
          AuthSubmitButton(
            palette: palette,
            label: 'auth.register.success.cta'.tr(),
            icon: LucideIcons.arrowRight,
            loading: false,
            onTap: () => context.go('/'),
          ),
        ],
      ),
    );
  }

  Widget _buildSlugInput(AuthPalette palette) {
    final slug = _slugController.text.trim();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'auth.register.form.slug.label'.tr(),
          style: GoogleFonts.dmSans(
            color: palette.secondaryText,
            fontSize: 12,
            fontWeight: FontWeight.w600,
            letterSpacing: 1.1,
          ),
        ),
        const SizedBox(height: 7),
        Container(
          decoration: BoxDecoration(
            color: palette.inputBackground,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: palette.inputBorder),
          ),
          child: Row(
            children: [
              Expanded(
                child: TextFormField(
                  key: const Key('register-slug-input'),
                  controller: _slugController,
                  focusNode: _slugFocus,
                  enabled: !_loading,
                  textInputAction: TextInputAction.next,
                  onFieldSubmitted: (_) => _emailFocus.requestFocus(),
                  inputFormatters: [
                    FilteringTextInputFormatter.allow(RegExp(r'[a-zA-Z0-9-]')),
                  ],
                  onChanged: (value) {
                    _clearError();
                    setState(() {
                      // Once the field is emptied the auto-slug can take over
                      // again, which is what a user clearing it expects.
                      _slugLockedByUser = value.trim().isNotEmpty;
                    });
                  },
                  style: GoogleFonts.dmSans(
                    color: palette.primaryText,
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                  ),
                  decoration: InputDecoration(
                    hintText: 'auth.register.form.slug.placeholder'.tr(),
                    hintStyle: GoogleFonts.dmSans(
                      color: palette.mutedText,
                      fontSize: 14,
                    ),
                    border: InputBorder.none,
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 12,
                    ),
                  ),
                  validator: (value) {
                    final candidate = value?.trim().toLowerCase() ?? '';
                    if (candidate.isEmpty) {
                      return 'auth.validation.slugRequired'.tr();
                    }
                    if (!_slugRegex.hasMatch(candidate)) {
                      return 'auth.validation.slugInvalid'.tr();
                    }
                    return null;
                  },
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                decoration: BoxDecoration(
                  border: Border(left: BorderSide(color: palette.inputBorder)),
                ),
                child: Text(
                  'app.swekly_com'.tr(),
                  style: GoogleFonts.dmSans(
                    color: palette.secondaryText,
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ],
          ),
        ),
        if (slug.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(top: 6),
            child: Text(
              'auth.register.form.slug.preview'.tr(
                namedArgs: {'slug': slug.toLowerCase()},
              ),
              style: GoogleFonts.dmSans(
                color: palette.brand,
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildOtpField(AuthPalette palette) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'auth.register.form.otp.label'.tr(),
          style: GoogleFonts.dmSans(
            color: palette.secondaryText,
            fontSize: 12,
            fontWeight: FontWeight.w600,
            letterSpacing: 1.1,
          ),
        ),
        const SizedBox(height: 7),
        Row(
          children: [
            Expanded(
              child: TextFormField(
                key: const Key('register-otp-input'),
                controller: _otpController,
                enabled: !_loading && _otpSent && !_otpVerified,
                keyboardType: TextInputType.number,
                maxLength: kOtpLength,
                autofillHints: const [AutofillHints.oneTimeCode],
                inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                style: GoogleFonts.dmSans(
                  color: palette.primaryText,
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  letterSpacing: 2,
                ),
                decoration: InputDecoration(
                  hintText: 'auth.register.form.otp.placeholder'.tr(),
                  counterText: '',
                  hintStyle: GoogleFonts.dmSans(
                    color: palette.mutedText,
                    fontSize: 14,
                    letterSpacing: 0,
                  ),
                  filled: true,
                  fillColor: palette.inputBackground,
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 14,
                    vertical: 12,
                  ),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(color: palette.inputBorder),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(color: palette.inputBorder),
                  ),
                  disabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(color: palette.inputBorder),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(color: palette.brand, width: 1.3),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 8),
            _buildSmallActionButton(
              palette,
              key: const Key('register-send-otp'),
              label: _otpSent
                  ? 'auth.register.form.otp.resend'.tr()
                  : 'auth.register.form.otp.send'.tr(),
              onTap: _loading || _otpVerified ? null : _sendOtpPlaceholder,
            ),
            const SizedBox(width: 6),
            _buildSmallActionButton(
              palette,
              key: const Key('register-verify-otp'),
              label: 'auth.register.form.otp.verify'.tr(),
              onTap: _otpSent && !_otpVerified && !_loading
                  ? _verifyOtpPlaceholder
                  : null,
            ),
          ],
        ),
        if (_otpFeedback != null)
          Padding(
            padding: const EdgeInsets.only(top: 6),
            child: Text(
              _otpFeedback!,
              style: GoogleFonts.dmSans(
                color: _otpSuccess
                    ? AuthPalette.success
                    : AuthPalette.warningText,
                fontSize: 12,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildSmallActionButton(
    AuthPalette palette, {
    required Key key,
    required String label,
    required VoidCallback? onTap,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        key: key,
        onTap: onTap,
        borderRadius: BorderRadius.circular(10),
        child: Ink(
          height: 42,
          padding: const EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(
            color: onTap == null
                ? palette.glassBackground.withValues(alpha: 0.55)
                : palette.brand,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: onTap == null
                  ? palette.cardBorder
                  : palette.brand.withValues(alpha: 0.45),
            ),
          ),
          child: Center(
            child: Text(
              label,
              style: GoogleFonts.dmSans(
                color: onTap == null ? palette.secondaryText : palette.onBrand,
                fontSize: 12,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildPill(AuthPalette palette, IconData icon, String label) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(
        color: palette.glassBackground,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: palette.cardBorder),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: palette.brand),
          const SizedBox(width: 6),
          Text(
            label,
            style: GoogleFonts.dmSans(
              color: palette.secondaryText,
              fontSize: 12,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMetric(AuthPalette palette, String value, String label) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 14),
      decoration: BoxDecoration(
        color: palette.glassBackground,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: palette.cardBorder),
      ),
      child: Column(
        children: [
          Text(
            value,
            style: GoogleFonts.dmSans(
              color: palette.primaryText,
              fontSize: 18,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 3),
          Text(
            label.toUpperCase(),
            textAlign: TextAlign.center,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: GoogleFonts.dmSans(
              color: palette.secondaryText,
              fontSize: 10,
              fontWeight: FontWeight.w600,
              letterSpacing: 1.0,
            ),
          ),
        ],
      ),
    );
  }
}

/// Four-segment strength indicator shown under the password field.
class _PasswordStrengthMeter extends StatelessWidget {
  final AuthPalette palette;
  final String password;

  const _PasswordStrengthMeter({required this.palette, required this.password});

  /// 0 = empty, 1 = weak, 2 = fair, 3 = good, 4 = strong.
  static int scoreFor(String password) {
    if (password.isEmpty) return 0;

    var score = 0;
    if (password.length >= kMinPasswordLength) score++;
    if (password.length >= 12) score++;
    if (RegExp(r'[A-Z]').hasMatch(password) &&
        RegExp(r'[a-z]').hasMatch(password)) {
      score++;
    }
    if (RegExp(r'[0-9]').hasMatch(password) &&
        RegExp(r'[^A-Za-z0-9]').hasMatch(password)) {
      score++;
    }

    return score.clamp(1, 4);
  }

  @override
  Widget build(BuildContext context) {
    if (password.isEmpty) return const SizedBox.shrink();

    final score = scoreFor(password);
    const colors = [
      AuthPalette.danger,
      AuthPalette.warningText,
      AuthPalette.warningText,
      AuthPalette.success,
    ];
    final color = colors[(score - 1).clamp(0, 3)];
    final labels = [
      'auth.register.form.passwordStrength.weak',
      'auth.register.form.passwordStrength.fair',
      'auth.register.form.passwordStrength.good',
      'auth.register.form.passwordStrength.strong',
    ];

    return Row(
      key: const Key('register-password-strength'),
      children: [
        for (var i = 0; i < 4; i++) ...[
          Expanded(
            child: Container(
              height: 4,
              decoration: BoxDecoration(
                color: i < score
                    ? color
                    : palette.inputBorder.withValues(alpha: 0.6),
                borderRadius: BorderRadius.circular(999),
              ),
            ),
          ),
          const SizedBox(width: 4),
        ],
        Text(
          labels[(score - 1).clamp(0, 3)].tr(),
          style: GoogleFonts.dmSans(
            color: color,
            fontSize: 11,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }
}
