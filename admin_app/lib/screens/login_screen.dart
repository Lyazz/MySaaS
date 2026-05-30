import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../providers/auth_provider.dart';
import '../providers/settings_provider.dart';
import '../providers/workspace_provider.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  bool _isLoading = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();

    assert(() {
      _emailController.text = 'admin@test.com';
      _passwordController.text = 'password';
      return true;
    }());
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      await ref
          .read(authProvider.notifier)
          .login(_emailController.text.trim(), _passwordController.text);

      if (mounted) {
        context.go('/');
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _errorMessage = e.toString().replaceAll('Exception: ', '');
      });
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
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
      floatingActionButton: _HoverScale(
        child: FloatingActionButton.extended(
          onPressed: () => context.go('/activate?mode=offline'),
          backgroundColor: palette.glassBackground,
          icon: Icon(LucideIcons.wifiOff, color: palette.primaryText, size: 18),
          label: Text(
            'Offline Activation',
            style: GoogleFonts.dmSans(
              color: palette.primaryText,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
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
          _buildBadge('ADMIN CONTROL CENTER', palette),
          const SizedBox(height: 22),
          Text.rich(
            TextSpan(
              style: GoogleFonts.dmSans(
                fontSize: 44,
                fontWeight: FontWeight.w700,
                height: 1.08,
                letterSpacing: -1.5,
                color: palette.primaryText,
              ),
              children: [
                const TextSpan(text: 'Welcome back,\n'),
                TextSpan(
                  text: 'Builder.',
                  style: TextStyle(color: palette.brand),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'Your dashboard is ready. Continue managing orders, products, delivery, and analytics from one place.',
            style: GoogleFonts.dmSans(
              fontSize: 16,
              color: palette.secondaryText,
              height: 1.5,
            ),
          ),
          const SizedBox(height: 24),
          _HoverScale(
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
                          'Revenue Tracking',
                          style: GoogleFonts.dmSans(
                            color: palette.primaryText,
                            fontWeight: FontWeight.w600,
                            fontSize: 15,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Real-time insights into store performance.',
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
            '© 2026 Swekly Inc.',
            style: GoogleFonts.dmSans(
              color: palette.secondaryText,
              fontSize: 12,
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
                Text(
                  'Log in to your account',
                  style: GoogleFonts.dmSans(
                    fontSize: 34,
                    fontWeight: FontWeight.w700,
                    letterSpacing: -0.8,
                    color: palette.primaryText,
                  ),
                  textAlign: isDesktop ? TextAlign.left : TextAlign.center,
                ),

                const SizedBox(height: 22),

                Row(
                  children: [
                    Expanded(
                      child: _buildSocialButton(
                        palette,
                        icon: LucideIcons.chrome,
                        label: 'Google',
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _buildSocialButton(
                        palette,
                        icon: LucideIcons.facebook,
                        label: 'Facebook',
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _buildSocialButton(
                        palette,
                        icon: LucideIcons.apple,
                        label: 'Apple',
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
                        'OR CONTINUE WITH',
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
                _buildInput(
                  palette,
                  label: 'Email Address',
                  hint: 'name@company.com',
                  controller: _emailController,
                  keyboardType: TextInputType.emailAddress,
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return 'Please enter your email';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 14),
                _buildInput(
                  palette,
                  label: 'Password',
                  hint: '••••••••',
                  controller: _passwordController,
                  obscureText: true,
                  trailingLabel: 'Forgot password?',
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'Please enter your password';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 18),
                if (_errorMessage != null) ...[
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
                            _errorMessage!,
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
                  label: _isLoading ? 'Signing in...' : 'Sign in',
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
                      'Don\'t have an account? ',
                      style: GoogleFonts.dmSans(
                        color: palette.secondaryText,
                        fontSize: 14,
                      ),
                    ),
                    InkWell(
                      onTap: () => context.go('/register'),
                      child: Text(
                        'Start for free',
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
        Text(
          'Swekly',
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

  Widget _buildSocialButton(
    _AuthPalette palette, {
    required IconData icon,
    required String label,
  }) {
    return _HoverScale(
      child: Container(
        height: 40,
        decoration: BoxDecoration(
          color: palette.glassBackground,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: palette.cardBorder),
        ),
        child: Center(
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 16, color: palette.secondaryText),
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
        ),
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
    String? trailingLabel,
    String? Function(String?)? validator,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
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
            if (trailingLabel != null)
              Text(
                trailingLabel,
                style: GoogleFonts.dmSans(
                  color: palette.brand,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
          ],
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
    required VoidCallback? onTap,
    IconData? icon,
  }) {
    return _HoverScale(
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(13),
          child: Ink(
            height: 46,
            decoration: BoxDecoration(
              color: onTap == null
                  ? palette.brand.withValues(alpha: 0.55)
                  : palette.brand,
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

class _AnimatedBlobBackdrop extends StatefulWidget {
  final _AuthPalette palette;
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
  final _AuthPalette palette;
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

class _HoverScale extends StatefulWidget {
  final Widget child;
  const _HoverScale({required this.child});

  @override
  State<_HoverScale> createState() => _HoverScaleState();
}

class _HoverScaleState extends State<_HoverScale> {
  bool _isHovered = false;

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      onEnter: (_) => setState(() => _isHovered = true),
      onExit: (_) => setState(() => _isHovered = false),
      child: AnimatedScale(
        scale: _isHovered ? 1.03 : 1.0,
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeOutQuart,
        child: widget.child,
      ),
    );
  }
}
