import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../providers/auth_provider.dart';
import '../providers/settings_provider.dart';
import 'package:easy_localization/easy_localization.dart';

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  static final RegExp _emailRegex = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');
  static final RegExp _slugRegex = RegExp(r'^[a-z0-9-]+$');

  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _slugController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _otpController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  bool _loading = false;
  bool _otpSent = false;
  bool _otpVerified = false;
  bool _slugLockedByUser = false;
  String? _error;
  String? _otpFeedback;
  bool _otpSuccess = false;
  bool _registered = false;
  String? _registeredTenantName;

  @override
  void initState() {
    super.initState();

    _nameController.addListener(_handleNameChanged);

    assert(() {
      _nameController.text = 'My Store';
      _slugController.text = 'my-store';
      _emailController.text = 'owner@example.com';
      _phoneController.text = '0540801436';
      _passwordController.text = 'password123';
      _confirmPasswordController.text = 'password123';
      _otpController.text = '000000';
      return true;
    }());
  }

  @override
  void dispose() {
    _nameController.removeListener(_handleNameChanged);
    _nameController.dispose();
    _slugController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _otpController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
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

  String _slugify(String value) {
    return value
        .toLowerCase()
        .trim()
        .replaceAll(RegExp(r'[^a-z0-9]+'), '-')
        .replaceAll(RegExp(r'^-+|-+$'), '');
  }

  String? _normalizeAlgerianPhone(String input) {
    final digits = input.replaceAll(RegExp(r'\D'), '');

    if (RegExp(r'^0[567]\d{8}$').hasMatch(digits)) {
      return '213${digits.substring(1)}';
    }
    if (RegExp(r'^[567]\d{8}$').hasMatch(digits)) {
      return '213$digits';
    }
    if (RegExp(r'^213[567]\d{8}$').hasMatch(digits)) {
      return digits;
    }
    if (RegExp(r'^00213[567]\d{8}$').hasMatch(digits)) {
      return digits.substring(2);
    }

    return null;
  }

  void _sendOtpPlaceholder() {
    setState(() {
      _error = null;
      _otpFeedback = null;
      _otpSuccess = false;
    });

    if (_phoneController.text.trim().isEmpty) {
      setState(() {
        _error = 'Phone number is required.';
      });
      return;
    }

    if (_normalizeAlgerianPhone(_phoneController.text) == null) {
      setState(() {
        _error = 'Enter a valid Algerian phone number.';
      });
      return;
    }

    setState(() {
      _otpSent = true;
      _otpVerified = false;
      _otpController.clear();
      _otpFeedback = 'OTP demo mode: use any 6-digit code.';
      _otpSuccess = false;
    });
  }

  void _verifyOtpPlaceholder() {
    setState(() {
      _error = null;
    });

    if (!_otpSent) {
      setState(() {
        _error = 'Send OTP first.';
      });
      return;
    }

    if (_otpController.text.trim().isEmpty) {
      setState(() {
        _error = 'Enter OTP code.';
      });
      return;
    }

    setState(() {
      _otpVerified = true;
      _otpFeedback = 'Phone number verified.';
      _otpSuccess = true;
    });
  }

  Future<void> _handleRegister() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final tenantName = await ref
          .read(authProvider.notifier)
          .register(
            name: _nameController.text.trim(),
            slug: _slugController.text.trim(),
            email: _emailController.text.trim(),
            password: _passwordController.text,
            phone: _phoneController.text.trim(),
          );

      if (!mounted) return;
      setState(() {
        _registered = true;
        _registeredTenantName = tenantName;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString().replaceAll('Exception: ', '');
      });
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final palette = _AuthPalette.fromTheme(isDark: isDark);

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

  Widget _buildBackdrop(_AuthPalette palette) {
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

  Widget _buildHeroPanel(_AuthPalette palette) {
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
          _buildBadge('LAUNCH YOUR STORE', palette),
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
                const TextSpan(text: 'Start your\n'),
                TextSpan(
                  text: 'app.e_commerce_empire'.tr(),
                  style: TextStyle(color: palette.brand),
                ),
                TextSpan(text: 'auth.register.hero.today'.tr()),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Text( 'app.create_your_tenant_configure_y'.tr(),
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
              _buildPill(palette, LucideIcons.package, 'Orders'),
              _buildPill(palette, LucideIcons.truck, 'Shipping'),
              _buildPill(palette, LucideIcons.barChart2, 'Analytics'),
            ],
          ),
          const SizedBox(height: 22),
          Row(
            children: [
              Expanded(child: _buildMetric(palette, '24h', 'Go Live')),
              const SizedBox(width: 8),
              Expanded(child: _buildMetric(palette, '99.9%', 'Uptime')),
              const SizedBox(width: 8),
              Expanded(child: _buildMetric(palette, 'LOCAL', 'COD Local')),
            ],
          ),
          const Spacer(),
          Text( 'app.everything_you_need_for_produc'.tr(),
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
    _AuthPalette palette, {
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
                  _buildLogoMark(palette),
                  const Spacer(),
                  _buildThemeToggle(context, palette),
                ],
              ),
              const SizedBox(height: 22),
              Text( 'auth.register.form.title'.tr(),
                style: GoogleFonts.outfit(
                  fontSize: 34,
                  fontWeight: FontWeight.w700,
                  letterSpacing: -0.8,
                  color: palette.primaryText,
                ),
                textAlign: isDesktop ? TextAlign.left : TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text( 'app.set_up_your_tenant_and_start_s'.tr(),
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
                Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      _buildInput(
                        palette,
                        label: 'auth.register.form.companyName.label'.tr(),
                        hint: 'Your company name',
                        controller: _nameController,
                        validator: (value) {
                          if (value == null || value.trim().isEmpty) {
                            return 'Company name is required';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 14),
                      _buildSlugInput(palette),
                      const SizedBox(height: 14),
                      _buildInput(
                        palette,
                        label: 'auth.login.form.email.label'.tr(),
                        hint: 'name@company.com',
                        controller: _emailController,
                        keyboardType: TextInputType.emailAddress,
                        validator: (value) {
                          final email = value?.trim() ?? '';
                          if (email.isEmpty) return 'Email is required';
                          if (!_emailRegex.hasMatch(email)) {
                            return 'Enter a valid email';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 14),
                      _buildInput(
                        palette,
                        label: 'admin.forms.supplier.phone.placeholder'.tr(),
                        hint: '05XXXXXXXX',
                        controller: _phoneController,
                        keyboardType: TextInputType.phone,
                        validator: (value) {
                          final phone = value?.trim() ?? '';
                          if (phone.isEmpty) return 'Phone number is required';
                          if (_normalizeAlgerianPhone(phone) == null) {
                            return 'Enter a valid Algerian phone number';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 14),
                      _buildOtpField(palette),
                      const SizedBox(height: 14),
                      _buildInput(
                        palette,
                        label: 'auth.login.form.password.label'.tr(),
                        hint: '••••••••',
                        controller: _passwordController,
                        obscureText: true,
                        validator: (value) {
                          final password = value ?? '';
                          if (password.isEmpty) return 'Password is required';
                          if (password.length < 8) {
                            return 'Password must be at least 8 characters';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 14),
                      _buildInput(
                        palette,
                        label: 'admin.pages.users.fields.confirmPassword'.tr(),
                        hint: '••••••••',
                        controller: _confirmPasswordController,
                        obscureText: true,
                        validator: (value) {
                          if ((value ?? '').isEmpty) {
                            return 'Confirm your password';
                          }
                          if (value != _passwordController.text) {
                            return 'Passwords do not match';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 18),
                      if (_error != null) ...[
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 14,
                            vertical: 12,
                          ),
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: const Color(0x44EF4444)),
                            color: const Color(0x22EF4444),
                          ),
                          child: Row(
                            children: [
                              const Icon(
                                LucideIcons.alertCircle,
                                color: Color(0xFFFCA5A5),
                                size: 18,
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  _error!,
                                  style: GoogleFonts.dmSans(
                                    color: const Color(0xFFFCA5A5),
                                    fontWeight: FontWeight.w500,
                                    fontSize: 13,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 16),
                      ],
                      _buildSubmitButton(
                        palette,
                        label: _loading
                            ? 'Creating account...'
                            : (_otpVerified
                                  ? 'Create account'
                                  : 'Verify OTP to continue'),
                        icon: _loading || !_otpVerified
                            ? null
                            : LucideIcons.arrowRight,
                        loading: _loading,
                        enabled: _otpVerified && !_loading,
                        onTap: _loading || !_otpVerified
                            ? null
                            : _handleRegister,
                      ),
                      const SizedBox(height: 14),
                      Wrap(
                        alignment: WrapAlignment.center,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        children: [
                          Text( 'auth.register.form.haveAccount'.tr(),
                            style: GoogleFonts.dmSans(
                              color: palette.secondaryText,
                              fontSize: 14,
                            ),
                          ),
                          InkWell(
                            onTap: () => context.go('/login'),
                            child: Text( 'auth.register.form.logIn'.tr(),
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
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSuccessState(BuildContext context, _AuthPalette palette) {
    final tenantName = _registeredTenantName ?? 'your store';
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0x5534D399)),
        color: const Color(0x2234D399),
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
                  color: const Color(0x2234D399),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0x5534D399)),
                ),
                child: const Icon(
                  LucideIcons.checkCircle,
                  color: Color(0xFF6EE7B7),
                  size: 20,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text( 'app.account_created_successfully'.tr(),
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
            'Welcome to Swekly, $tenantName. Your workspace is ready.',
            style: GoogleFonts.dmSans(
              color: palette.secondaryText,
              fontSize: 14,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 14),
          _buildSubmitButton(
            palette,
            label: 'admin.pages.onboarding.done.ctaDashboard'.tr(),
            icon: LucideIcons.arrowRight,
            loading: false,
            enabled: true,
            onTap: () => context.go('/'),
          ),
        ],
      ),
    );
  }

  Widget _buildSlugInput(_AuthPalette palette) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text( 'auth.register.form.slug.label'.tr(),
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
                  controller: _slugController,
                  onChanged: (_) {
                    setState(() {
                      _slugLockedByUser = true;
                    });
                  },
                  style: GoogleFonts.dmSans(
                    color: palette.primaryText,
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                  ),
                  decoration: InputDecoration(
                    hintText: 'admin.appearanceSettingsForm.identity.slug.placeholder'.tr(),
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
                    final slug = value?.trim() ?? '';
                    if (slug.isEmpty) return 'Store URL is required';
                    if (!_slugRegex.hasMatch(slug)) {
                      return 'Use lowercase letters, numbers, and hyphens only';
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
                child: Text( 'app.swekly_com'.tr(),
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
        if (_slugController.text.trim().isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(top: 6),
            child: Text(
              '${_slugController.text.trim()}.swekly.com',
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

  Widget _buildOtpField(_AuthPalette palette) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text( 'app.otp_verification'.tr(),
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
                style: GoogleFonts.dmSans(
                  color: palette.primaryText,
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
                decoration: InputDecoration(
                  hintText: 'auth.register.form.otp.placeholder'.tr(),
                  hintStyle: GoogleFonts.dmSans(
                    color: palette.mutedText,
                    fontSize: 14,
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
              label: 'app.send'.tr(),
              onTap: _sendOtpPlaceholder,
            ),
            const SizedBox(width: 6),
            _buildSmallActionButton(
              palette,
              key: const Key('register-verify-otp'),
              label: 'app.verify'.tr(),
              onTap: _otpSent ? _verifyOtpPlaceholder : null,
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
                    ? const Color(0xFF6EE7B7)
                    : const Color(0xFFFCD34D),
                fontSize: 12,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildSmallActionButton(
    _AuthPalette palette, {
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
                color: onTap == null
                    ? palette.secondaryText
                    : const Color(0xFF05070A),
                fontSize: 12,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildThemeToggle(BuildContext context, _AuthPalette palette) {
    final mode = ref.watch(settingsProvider).themeMode;
    final isDark =
        mode == ThemeMode.dark ||
        (mode == ThemeMode.system &&
            MediaQuery.platformBrightnessOf(context) == Brightness.dark);

    return Tooltip(
      message: isDark ? 'Switch to light mode' : 'Switch to dark mode',
      child: InkWell(
        onTap: () => ref.read(settingsProvider.notifier).toggleTheme(),
        borderRadius: BorderRadius.circular(12),
        child: Container(
          width: 38,
          height: 38,
          decoration: BoxDecoration(
            color: palette.glassBackground,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: palette.cardBorder),
          ),
          child: Icon(
            isDark ? LucideIcons.sun : LucideIcons.moon,
            size: 18,
            color: palette.primaryText,
          ),
        ),
      ),
    );
  }

  Widget _buildLogoMark(_AuthPalette palette) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 34,
          height: 34,
          decoration: BoxDecoration(
            color: palette.brand,
            borderRadius: BorderRadius.circular(10),
          ),
          child: const Icon(
            LucideIcons.store,
            size: 18,
            color: Color(0xFF05070A),
          ),
        ),
        const SizedBox(width: 10),
        Text( 'app.swekly'.tr(),
          style: GoogleFonts.dmSans(
            color: palette.primaryText,
            fontSize: 18,
            fontWeight: FontWeight.w700,
            letterSpacing: -0.3,
          ),
        ),
      ],
    );
  }

  Widget _buildBadge(String label, _AuthPalette palette) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: palette.glassBackground,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: palette.cardBorder),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 6,
            height: 6,
            decoration: BoxDecoration(
              color: palette.brand,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 7),
          Text(
            label,
            style: GoogleFonts.dmSans(
              color: palette.secondaryText,
              fontSize: 11,
              fontWeight: FontWeight.w600,
              letterSpacing: 1.2,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPill(_AuthPalette palette, IconData icon, String label) {
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

  Widget _buildMetric(_AuthPalette palette, String value, String label) {
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

  Widget _buildInput(
    _AuthPalette palette, {
    required String label,
    required String hint,
    required TextEditingController controller,
    TextInputType? keyboardType,
    bool obscureText = false,
    String? Function(String?)? validator,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: GoogleFonts.dmSans(
            color: palette.secondaryText,
            fontSize: 12,
            fontWeight: FontWeight.w600,
            letterSpacing: 1.1,
          ),
        ),
        const SizedBox(height: 7),
        TextFormField(
          controller: controller,
          keyboardType: keyboardType,
          obscureText: obscureText,
          validator: validator,
          style: GoogleFonts.dmSans(
            color: palette.primaryText,
            fontSize: 14,
            fontWeight: FontWeight.w500,
          ),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: GoogleFonts.dmSans(
              color: palette.mutedText,
              fontSize: 14,
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
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: palette.brand, width: 1.3),
            ),
            errorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Color(0xFFEF4444)),
            ),
            focusedErrorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(
                color: Color(0xFFEF4444),
                width: 1.3,
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildSubmitButton(
    _AuthPalette palette, {
    required String label,
    required bool loading,
    required bool enabled,
    required VoidCallback? onTap,
    IconData? icon,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(13),
        child: Ink(
          height: 46,
          decoration: BoxDecoration(
            color: enabled
                ? palette.brand
                : palette.brand.withValues(alpha: 0.55),
            borderRadius: BorderRadius.circular(13),
            border: Border.all(color: palette.brand.withValues(alpha: 0.5)),
            boxShadow: [
              BoxShadow(
                color: palette.brand.withValues(alpha: 0.28),
                blurRadius: 26,
                spreadRadius: -8,
              ),
            ],
          ),
          child: Center(
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (loading)
                  const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Color(0xFF05070A),
                    ),
                  ),
                if (loading) const SizedBox(width: 8),
                Text(
                  label,
                  style: GoogleFonts.dmSans(
                    color: const Color(0xFF05070A),
                    fontWeight: FontWeight.w700,
                    fontSize: 14,
                  ),
                ),
                if (!loading && icon != null) ...[
                  const SizedBox(width: 8),
                  Icon(icon, size: 16, color: const Color(0xFF05070A)),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _AuthPalette {
  final Color pageBackground;
  final Gradient pageGradient;
  final Color blobPrimary;
  final Color blobSecondary;
  final Color cardBackground;
  final Color glassBackground;
  final Color cardBorder;
  final Color primaryText;
  final Color secondaryText;
  final Color mutedText;
  final Color inputBackground;
  final Color inputBorder;
  final Color brand;

  const _AuthPalette({
    required this.pageBackground,
    required this.pageGradient,
    required this.blobPrimary,
    required this.blobSecondary,
    required this.cardBackground,
    required this.glassBackground,
    required this.cardBorder,
    required this.primaryText,
    required this.secondaryText,
    required this.mutedText,
    required this.inputBackground,
    required this.inputBorder,
    required this.brand,
  });

  factory _AuthPalette.fromTheme({required bool isDark}) {
    if (isDark) {
      return _AuthPalette(
        pageBackground: const Color(0xFF060A14),
        pageGradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF050816), Color(0xFF0B1220), Color(0xFF080C16)],
        ),
        blobPrimary: const Color(0xFF16D5B3).withValues(alpha: 0.24),
        blobSecondary: const Color(0xFF3559FF).withValues(alpha: 0.2),
        cardBackground: const Color(0xD90F1424),
        glassBackground: const Color(0x14FFFFFF),
        cardBorder: const Color(0x1AFFFFFF),
        primaryText: const Color(0xFFE7ECEE),
        secondaryText: const Color(0xFF8A959C),
        mutedText: const Color(0xFF4F5A60),
        inputBackground: const Color(0x1AFFFFFF),
        inputBorder: const Color(0x26FFFFFF),
        brand: const Color(0xFFC6F432),
      );
    }

    return _AuthPalette(
      pageBackground: const Color(0xFFF2F7FF),
      pageGradient: const LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [Color(0xFFF7FAFF), Color(0xFFF0F5FD), Color(0xFFE9F0F8)],
      ),
      blobPrimary: const Color(0xFF84A60D).withValues(alpha: 0.15),
      blobSecondary: const Color(0xFF16D5B3).withValues(alpha: 0.13),
      cardBackground: const Color(0xF8FBFDFF),
      glassBackground: const Color(0xFFF2F6FB),
      cardBorder: const Color(0x1F0F172A),
      primaryText: const Color(0xFF0F172A),
      secondaryText: const Color(0xFF475569),
      mutedText: const Color(0xFF94A3B8),
      inputBackground: const Color(0xFFF3F7FB),
      inputBorder: const Color(0x240F172A),
      brand: const Color(0xFFC6F432),
    );
  }
}
