import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';

class TableActionButton extends StatefulWidget {
  final IconData icon;
  final VoidCallback? onPressed;
  final bool isDanger;
  final bool isLoading;
  final String? tooltip;

  const TableActionButton({
    super.key,
    required this.icon,
    required this.onPressed,
    this.tooltip,
    this.isDanger = false,
    this.isLoading = false,
  });

  @override
  State<TableActionButton> createState() => _TableActionButtonState();
}

class _TableActionButtonState extends State<TableActionButton> {
  bool _isHovered = false;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isDisabled = widget.onPressed == null || widget.isLoading;

    // Normal styling
    Color bg = isDark ? AppColors.surface2 : AppColors.lightSurface2;
    Color border = isDark ? AppColors.surfaceBorder : AppColors.lightSurfaceBorder;
    Color iconColor = isDark ? AppColors.textSecondary : AppColors.lightTextSecondary;

    // Danger styling
    if (widget.isDanger) {
      bg = const Color.fromRGBO(239, 68, 68, 0.1);
      border = const Color.fromRGBO(239, 68, 68, 0.2);
      iconColor = const Color(0xFFF87171);
      if (_isHovered && !isDisabled) {
        bg = const Color.fromRGBO(239, 68, 68, 0.2);
        border = const Color.fromRGBO(239, 68, 68, 0.32);
        iconColor = const Color(0xFFFCA5A5);
      }
    } else {
      if (_isHovered && !isDisabled) {
        border = isDark ? AppColors.surfaceBorderHover : AppColors.lightSurfaceBorderHover;
        iconColor = isDark ? AppColors.textPrimary : AppColors.lightTextPrimary;
      }
    }

    Widget button = InkWell(
      onTap: widget.onPressed,
      borderRadius: BorderRadius.circular(8),
      hoverColor: Colors.transparent,
      splashColor: Colors.transparent,
      highlightColor: Colors.transparent,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        width: 32,
        height: 32,
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: border, width: 1),
        ),
        child: Center(
          child: widget.isLoading 
            ? SizedBox(
                width: 14, 
                height: 14, 
                child: CircularProgressIndicator(
                  strokeWidth: 2, 
                  color: iconColor,
                )
              )
            : Icon(
                widget.icon,
                size: 16,
                color: iconColor,
              ),
        ),
      ),
    );

    if (isDisabled) {
      button = Opacity(opacity: 0.4, child: button);
    }

    button = MouseRegion(
      onEnter: (_) => setState(() => _isHovered = true),
      onExit: (_) => setState(() => _isHovered = false),
      cursor: isDisabled ? SystemMouseCursors.basic : SystemMouseCursors.click,
      child: button,
    );

    if (widget.tooltip != null) {
      return Tooltip(
        message: widget.tooltip!,
        child: button,
      );
    }

    return button;
  }
}
