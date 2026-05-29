import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../app_config.dart';
import '../bootstrap.dart';
import '../models/app_mode.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../services/app_storage.dart';
import '../services/activation_service.dart';
import '../services/sync_service.dart';
import '../services/tenant_mode_service.dart';
import '../widgets/buttons/app_button.dart';

class ActivationScreen extends ConsumerStatefulWidget {
  const ActivationScreen({super.key});

  @override
  ConsumerState<ActivationScreen> createState() => _ActivationScreenState();
}

class _ActivationScreenState extends ConsumerState<ActivationScreen> {
  final _payloadController = TextEditingController();
  bool _isActivating = false;
  String? _error;

  @override
  void dispose() {
    _payloadController.dispose();
    super.dispose();
  }

  Future<void> _activate() async {
    final raw = _payloadController.text.trim();
    if (raw.isEmpty) {
      setState(() => _error = 'Enter your activation key first.');
      return;
    }

    setState(() {
      _isActivating = true;
      _error = null;
    });

    try {
      final result = await ref
          .read(activationServiceProvider)
          .activateOnline(raw);
      await _applyActivation(result);

      if (!mounted) return;
    } catch (e) {
      setState(() => _error = e.toString().replaceAll('Exception: ', ''));
    } finally {
      if (mounted) {
        setState(() => _isActivating = false);
      }
    }
  }

  Future<void> _applyActivation(ActivationResult result) async {
    final payload = result.provisioning;
    final bootstrap = payload.toBootstrapConfig();
    final apiService = ref.read(apiProvider);

    await AppStorage.saveApiBaseUrl(payload.apiBaseUrl);
    await AppStorage.saveProvisioningState(
      mode: payload.mode,
      subscriptionTier: payload.subscriptionTier,
      tenantId: payload.tenantId,
      workspaceId: payload.workspaceId,
    );
    await AppStorage.clearAuthSession();
    await AppStorage.saveActivationToken(result.activationToken);

    ref.read(bootstrapProvider.notifier).replace(bootstrap);
    ref
        .read(authProvider.notifier)
        .applyProvisioning(
          mode: payload.mode,
          subscriptionTier: payload.subscriptionTier,
        );
    apiService.setBaseUrl(payload.apiBaseUrl);
    apiService.setToken(payload.authToken);
    TenantModeService().initialize(
      mode: payload.mode,
      tenantId: payload.tenantId,
      workspaceId: payload.workspaceId,
    );
    SyncService().initialize(apiService, mode: payload.mode);

    if (!mounted) return;
    if (payload.mode == AppMode.offlineOnly || payload.authToken != null) {
      context.go('/');
    } else {
      context.go('/login');
    }
  }

  Future<void> _showOfflineActivationDialog() async {
    try {
      final activationKey = _payloadController.text.trim();
      final requestCode = await ref
          .read(activationServiceProvider)
          .generateOfflineRequestCode(activationKey);

      if (!mounted) return;

      showDialog(
        context: context,
        builder: (dialogContext) {
          final offlineController = TextEditingController();
          return AlertDialog(
            title: const Text('Offline Activation'),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text(
                  'Use the activation key from the main form to generate this Request Code. In the tenant admin panel, open Devices > Offline Activation and paste it there.',
                ),
                const SizedBox(height: 8),
                SelectableText(
                  requestCode,
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: offlineController,
                  decoration: const InputDecoration(
                    labelText: 'Paste signed activation code here',
                  ),
                ),
              ],
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(dialogContext),
                child: const Text('Cancel'),
              ),
              ElevatedButton(
                onPressed: () async {
                  try {
                    final result = await ref
                        .read(activationServiceProvider)
                        .verifyOfflineActivationCode(
                          offlineController.text.trim(),
                        );
                    if (!dialogContext.mounted) return;
                    Navigator.pop(dialogContext);
                    await _applyActivation(result);
                  } catch (e) {
                    if (!dialogContext.mounted) return;
                    ScaffoldMessenger.of(
                      dialogContext,
                    ).showSnackBar(SnackBar(content: Text(e.toString())));
                  }
                },
                child: const Text('Verify'),
              ),
            ],
          );
        },
      );
    } catch (e) {
      setState(() => _error = e.toString().replaceAll('Exception: ', ''));
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final palette = _ActivationPalette.fromTheme(isDark: isDark);

    return Scaffold(
      backgroundColor: palette.pageBackground,
      body: Stack(
        fit: StackFit.expand,
        children: [
          Stack(
            fit: StackFit.expand,
            children: [
              DecoratedBox(
                decoration: BoxDecoration(gradient: palette.pageGradient),
              ),
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
          ),
          SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(24),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 760),
                  child: Container(
                    padding: const EdgeInsets.all(28),
                    decoration: BoxDecoration(
                      color: palette.cardBackground,
                      borderRadius: BorderRadius.circular(28),
                      border: Border.all(color: palette.cardBorder),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          width: 52,
                          height: 52,
                          decoration: BoxDecoration(
                            color: palette.brand.withValues(alpha: 0.14),
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: Icon(
                            LucideIcons.shieldCheck,
                            color: palette.brand,
                            size: 24,
                          ),
                        ),
                        const SizedBox(height: 18),
                        Text(
                          'Activate this device',
                          style: GoogleFonts.dmSans(
                            fontSize: 34,
                            fontWeight: FontWeight.w700,
                            letterSpacing: -0.9,
                            color: palette.primaryText,
                          ),
                        ),
                        const SizedBox(height: 10),
                        Text(
                          'Enter the tenant-issued activation key to bind this device permanently to one workspace. Online activation redeems it with the server; offline activation turns it into a request code for the admin panel.',
                          style: GoogleFonts.dmSans(
                            fontSize: 15,
                            height: 1.55,
                            color: palette.secondaryText,
                          ),
                        ),
                        const SizedBox(height: 20),
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: palette.glassBackground,
                            borderRadius: BorderRadius.circular(18),
                            border: Border.all(color: palette.cardBorder),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Trusted activation',
                                style: GoogleFonts.dmSans(
                                  color: palette.primaryText,
                                  fontWeight: FontWeight.w600,
                                  fontSize: 14,
                                ),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                'Activation uses `$defaultApiBaseUrl` and stores tenant/workspace binding from a server-signed activation token. No tenant IDs are entered manually on the device.',
                                style: GoogleFonts.dmSans(
                                  color: palette.secondaryText,
                                  fontSize: 13,
                                  height: 1.5,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 18),
                        TextField(
                          controller: _payloadController,
                          minLines: 1,
                          maxLines: 1,
                          style: GoogleFonts.dmSans(
                            color: palette.primaryText,
                            fontSize: 13,
                            height: 1.45,
                          ),
                          decoration: InputDecoration(
                            labelText: 'Activation key',
                            hintText: 'Paste the tenant-issued activation key',
                            errorText: _error,
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(18),
                            ),
                            alignLabelWithHint: true,
                          ),
                        ),
                        const SizedBox(height: 20),
                        Row(
                          children: [
                            Expanded(
                              child: AppButton.primary(
                                label: _isActivating
                                    ? 'Activating...'
                                    : 'Activate Device',
                                onPressed: _isActivating ? null : _activate,
                                icon: LucideIcons.lock,
                                fullWidth: true,
                              ),
                            ),
                            const SizedBox(width: 16),
                            Expanded(
                              child: AppButton.secondary(
                                label: 'Offline Activation',
                                onPressed: _showOfflineActivationDialog,
                                icon: LucideIcons.wifiOff,
                                fullWidth: true,
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
        ],
      ),
    );
  }

  Widget _buildBlob({required Color color}) {
    return Container(
      width: 420,
      height: 420,
      decoration: BoxDecoration(color: color, shape: BoxShape.circle),
    );
  }
}

class _ActivationPalette {
  final Color pageBackground;
  final Gradient pageGradient;
  final Color blobPrimary;
  final Color blobSecondary;
  final Color cardBackground;
  final Color glassBackground;
  final Color cardBorder;
  final Color primaryText;
  final Color secondaryText;
  final Color brand;

  const _ActivationPalette({
    required this.pageBackground,
    required this.pageGradient,
    required this.blobPrimary,
    required this.blobSecondary,
    required this.cardBackground,
    required this.glassBackground,
    required this.cardBorder,
    required this.primaryText,
    required this.secondaryText,
    required this.brand,
  });

  factory _ActivationPalette.fromTheme({required bool isDark}) {
    if (isDark) {
      return _ActivationPalette(
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
        brand: const Color(0xFFC6F432),
      );
    }

    return _ActivationPalette(
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
      brand: const Color(0xFFC6F432),
    );
  }
}
