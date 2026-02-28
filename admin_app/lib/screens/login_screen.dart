import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../providers/auth_provider.dart';
import '../providers/workspace_provider.dart';
import '../widgets/form/form_input.dart';
import '../widgets/buttons/app_button.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _workspaceController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isLoading = false;
  String? _errorMessage;

  // Colors from Tailwind config
  static const Color slate900 = Color(0xFF0F172A);
  static const Color slate500 = Color(0xFF64748B);
  static const Color slate400 = Color(0xFF94A3B8);
  static const Color slate200 = Color(0xFFE2E8F0);
  static const Color slate50 = Color(0xFFF8FAFC);

  static const Color teal600 = Color(0xFF0D9488);
  static const Color teal500 = Color(0xFF14B8A6);
  static const Color teal400 = Color(0xFF2DD4BF);
  static const Color emerald400 = Color(0xFF34D399);
  static const Color emerald500 = Color(0xFF10B981);

  static const Color violet600 = Color(0xFF7C3AED);

  @override
  void initState() {
    super.initState();

    final workspace = ref.read(workspaceProvider);
    _workspaceController.text = workspace.apiBaseUrl;

    assert(() {
      _emailController.text = 'admin@apple.com';
      _passwordController.text = 'password';
      return true;
    }());
  }

  @override
  void dispose() {
    _workspaceController.dispose();
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
          .read(workspaceProvider.notifier)
          .setWorkspaceUrl(_workspaceController.text);
      await ref
          .read(authProvider.notifier)
          .login(_emailController.text, _passwordController.text);
      if (mounted) {
        context.go('/');
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          // Debugging: Show actual error
          _errorMessage = e.toString().replaceAll('Exception: ', '');
        });
      }
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
    final isDesktop = MediaQuery.of(context).size.width >= 1024;

    return Scaffold(
      body: Row(
        children: [
          // Left Side - Design (Hidden on Mobile)
          if (isDesktop)
            Expanded(
              flex: 1,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  // Background Color
                  Container(color: slate900),

                  // Animated Background Blobs (Static approximation)
                  Positioned(
                    top: MediaQuery.of(context).size.height * 0.1,
                    left: MediaQuery.of(context).size.width * 0.05,
                    child: Container(
                      width: 400,
                      height: 400,
                      decoration: BoxDecoration(
                        color: teal600.withValues(alpha: 0.2),
                        shape: BoxShape.circle,
                      ),
                      child: BackdropFilter(
                        filter: ImageFilter.blur(sigmaX: 100, sigmaY: 100),
                        child: Container(color: Colors.transparent),
                      ),
                    ),
                  ),
                  Positioned(
                    bottom: MediaQuery.of(context).size.height * 0.1,
                    right: MediaQuery.of(context).size.width * 0.05,
                    child: Container(
                      width: 400,
                      height: 400,
                      decoration: BoxDecoration(
                        color: violet600.withValues(alpha: 0.2),
                        shape: BoxShape.circle,
                      ),
                      child: BackdropFilter(
                        filter: ImageFilter.blur(sigmaX: 100, sigmaY: 100),
                        child: Container(color: Colors.transparent),
                      ),
                    ),
                  ),
                  // Noise Texture Overlay (Optional, omitted for Flutter simplicity or use an image asset)

                  // Content
                  Padding(
                    padding: const EdgeInsets.all(48),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        RichText(
                          text: TextSpan(
                            style: GoogleFonts.outfit(
                              fontSize: 48,
                              fontWeight: FontWeight.bold,
                              height: 1.1,
                              color: Colors.white,
                            ),
                            children: [
                              const TextSpan(text: 'Welcome back,\n'),
                              WidgetSpan(
                                child: ShaderMask(
                                  shaderCallback: (bounds) =>
                                      const LinearGradient(
                                        colors: [teal400, emerald400],
                                      ).createShader(bounds),
                                  child: Text(
                                    'Builder.',
                                    style: GoogleFonts.outfit(
                                      fontSize: 48,
                                      fontWeight: FontWeight.bold,
                                      height: 1.1,
                                      color: Colors.white,
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 24),
                        Text(
                          'Your dashboard is ready. Continue managing your orders, products, and analytics from one central hub.',
                          style: GoogleFonts.outfit(
                            fontSize: 18,
                            color: slate400,
                            height: 1.5,
                          ),
                        ),
                        const SizedBox(height: 48),

                        // Feature Highlight Card
                        ClipRRect(
                          borderRadius: BorderRadius.circular(16),
                          child: BackdropFilter(
                            filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
                            child: Container(
                              padding: const EdgeInsets.all(24),
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.05),
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(
                                  color: Colors.white.withValues(alpha: 0.1),
                                ),
                              ),
                              child: Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.all(12),
                                    decoration: BoxDecoration(
                                      color: emerald500.withValues(
                                        alpha: 0.2,
                                      ), // Emerald-500/20
                                      shape: BoxShape.circle,
                                    ),
                                    child: const Icon(
                                      LucideIcons.trendingUp,
                                      color: emerald400,
                                      size: 24,
                                    ),
                                  ),
                                  const SizedBox(width: 16),
                                  Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        'Revenue Tracking',
                                        style: GoogleFonts.outfit(
                                          color: Colors.white,
                                          fontWeight: FontWeight.bold,
                                          fontSize: 16,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        'Real-time insights into your store\'s performance at a glance.',
                                        style: GoogleFonts.outfit(
                                          color: slate400,
                                          fontSize: 14,
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),

                        const Spacer(),
                        Text(
                          '© 2026 Swekly Inc.',
                          style: GoogleFonts.outfit(
                            fontSize: 12,
                            color: slate500,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

          // Right Side - Form
          Expanded(
            flex: 1,
            child: Scaffold(
              // Inner scaffold to handle resize resizeToAvoidBottomInset if needed
              backgroundColor: Colors.white,
              body: Center(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(32),
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(
                      maxWidth: 448,
                    ), // max-w-md approx 28rem = 448px
                    child: Form(
                      key: _formKey,
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Text(
                            'Log in to your account',
                            style: GoogleFonts.outfit(
                              fontSize: 30, // text-3xl
                              fontWeight: FontWeight.bold,
                              color: slate900,
                              letterSpacing: -0.025 * 30, // tracking-tight
                            ),
                            textAlign: isDesktop
                                ? TextAlign.left
                                : TextAlign.center,
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Access your tenant workspace.',
                            style: GoogleFonts.outfit(
                              fontSize: 16,
                              color: slate500,
                            ),
                            textAlign: isDesktop
                                ? TextAlign.left
                                : TextAlign.center,
                          ),
                          const SizedBox(height: 32),

                          // OAuth Buttons
                          Row(
                            children: [
                              Expanded(
                                child: _buildOAuthButton(LucideIcons.chrome),
                              ), // Google placeholder
                              const SizedBox(width: 12),
                              Expanded(
                                child: _buildOAuthButton(LucideIcons.apple),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: _buildOAuthButton(LucideIcons.facebook),
                              ),
                            ],
                          ),
                          const SizedBox(height: 24),

                          Row(
                            children: [
                              Expanded(child: Divider(color: slate200)),
                              Padding(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                ),
                                child: Text(
                                  'Or continue with',
                                  style: GoogleFonts.outfit(
                                    color: slate500,
                                    fontSize: 14,
                                  ),
                                ),
                              ),
                              Expanded(child: Divider(color: slate200)),
                            ],
                          ),
                          const SizedBox(height: 20),

                          // Workspace Field
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              FormInput(
                                label: 'Workspace URL',
                                controller: _workspaceController,
                                keyboardType: TextInputType.url,
                                hint: 'https://your-tenant.platform.com',
                                contentPadding: const EdgeInsets.symmetric(
                                  horizontal: 16,
                                  vertical: 12,
                                ),
                                validator: (value) {
                                  if (value == null || value.trim().isEmpty) {
                                    return 'Please enter your workspace URL';
                                  }
                                  return null;
                                },
                              ),
                              const SizedBox(height: 8),
                              Text(
                                'Tip: include http:// for localhost (e.g. http://apple.localhost:3000)',
                                style: GoogleFonts.outfit(
                                  color: slate500,
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),

                          // Email Field
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              FormInput(
                                label: 'Email Address',
                                controller: _emailController,
                                keyboardType: TextInputType.emailAddress,
                                hint: 'name@company.com',
                                contentPadding: const EdgeInsets.symmetric(
                                  horizontal: 16,
                                  vertical: 12,
                                ),
                                validator: (value) {
                                  if (value == null || value.isEmpty) {
                                    return 'Please enter your email';
                                  }
                                  return null;
                                },
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),

                          // Password Field
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    'Password',
                                    style: GoogleFonts.outfit(
                                      color: Colors.grey[700],
                                      fontWeight: FontWeight.w500,
                                      fontSize: 14,
                                    ),
                                  ),
                                  Text(
                                    'Forgot password?',
                                    style: GoogleFonts.outfit(
                                      color: teal600,
                                      fontWeight: FontWeight.w500,
                                      fontSize: 14,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 4),
                              FormInput(
                                label: 'Password',
                                showLabel: false,
                                controller: _passwordController,
                                obscureText: true,
                                hint: '••••••••',
                                contentPadding: const EdgeInsets.symmetric(
                                  horizontal: 16,
                                  vertical: 12,
                                ),
                                validator: (value) {
                                  if (value == null || value.isEmpty) {
                                    return 'Please enter your password';
                                  }
                                  return null;
                                },
                              ),
                            ],
                          ),
                          const SizedBox(height: 24),

                          if (_errorMessage != null)
                            Container(
                              padding: const EdgeInsets.all(16), // p-4
                              margin: const EdgeInsets.only(bottom: 24),
                              decoration: BoxDecoration(
                                color: const Color(0xFFFEF2F2), // red-50
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(
                                  color: const Color(0xFFFECACA),
                                ), // red-100
                              ),
                              child: Row(
                                children: [
                                  const Icon(
                                    LucideIcons.alertCircle,
                                    color: Color(0xFFEF4444), // red-500
                                    size: 20,
                                  ),
                                  const SizedBox(width: 12),
                                  Text(
                                    _errorMessage!,
                                    style: GoogleFonts.outfit(
                                      color: const Color(0xFFB91C1C), // red-700
                                      fontSize: 14,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                ],
                              ),
                            ),

                          // Login Button
                          SizedBox(
                            height: 48, // approximate py-3.5
                            child: AppButton.primary(
                              label: 'Sign in',
                              onPressed: _handleLogin,
                              loading: _isLoading,
                              fullWidth: true,
                            ),
                          ),
                          const SizedBox(height: 24),

                          Wrap(
                            alignment: WrapAlignment.center,
                            children: [
                              Text(
                                "Don't have an account? ",
                                style: GoogleFonts.outfit(
                                  color: slate500,
                                  fontSize: 14,
                                ),
                              ),
                              Text(
                                "Start for free",
                                style: GoogleFonts.outfit(
                                  color: teal600,
                                  fontWeight: FontWeight.w600,
                                  fontSize: 14,
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
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildOAuthButton(IconData icon) {
    return Container(
      height: 48, // py-2.5 (10px) + content approx
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: slate200),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () {},
          borderRadius: BorderRadius.circular(12),
          hoverColor: slate50,
          child: Center(child: Icon(icon, size: 20, color: slate900)),
        ),
      ),
    );
  }
}
