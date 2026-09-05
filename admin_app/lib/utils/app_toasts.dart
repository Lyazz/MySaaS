import 'package:flutter/material.dart';
import 'package:toastification/toastification.dart';

enum AppToastType { info, success, warning, error }

class AppToasts {
  const AppToasts._();

  static void show(
    BuildContext context,
    String message, {
    AppToastType type = AppToastType.info,
    String? description,
    Duration duration = const Duration(seconds: 3),
    Widget? icon,
  }) {
    final isWide =
        MediaQuery.maybeOf(context)?.size.width != null &&
        MediaQuery.of(context).size.width > 800;
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    toastification.show(
      context: context,
      type: _toastificationType(type),
      style: ToastificationStyle.flat,
      title: Text(
        message,
        style: TextStyle(
          fontWeight: FontWeight.w600,
          color: isDark ? Colors.white : Colors.black87,
        ),
      ),
      description: description == null
          ? null
          : Text(
              description,
              style: TextStyle(color: isDark ? Colors.white70 : Colors.black54),
            ),
      alignment: isWide ? Alignment.topRight : Alignment.topCenter,
      autoCloseDuration: duration,
      icon: icon,
      showProgressBar: false,
      closeOnClick: true,
      dragToClose: true,
      backgroundColor: isDark
          ? const Color(0xFF1F2937)
          : theme.colorScheme.surface,
      borderRadius: BorderRadius.circular(12),
      borderSide: BorderSide(
        color: isDark ? const Color(0xFF374151) : const Color(0xFFE5E7EB),
      ),
    );
  }

  static void success(
    BuildContext context,
    String message, {
    Duration duration = const Duration(seconds: 3),
  }) {
    show(context, message, type: AppToastType.success, duration: duration);
  }

  static void error(
    BuildContext context,
    String message, {
    Duration duration = const Duration(seconds: 4),
  }) {
    show(context, message, type: AppToastType.error, duration: duration);
  }

  static ToastificationType _toastificationType(AppToastType type) {
    return switch (type) {
      AppToastType.info => ToastificationType.info,
      AppToastType.success => ToastificationType.success,
      AppToastType.warning => ToastificationType.warning,
      AppToastType.error => ToastificationType.error,
    };
  }
}
