import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class NumpadWidget extends StatelessWidget {
  final Function(String) onNumberTap;
  final VoidCallback onClear;
  final VoidCallback? onBackspace;
  final VoidCallback onEnter;
  final String label;
  final bool allowDecimal;

  const NumpadWidget({
    super.key,
    required this.onNumberTap,
    required this.onClear,
    this.onBackspace,
    required this.onEnter,
    this.label = 'Enter Quantity',
    this.allowDecimal = false,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    const crossAxisCount = 3;
    const rowCount = 5;
    const spacing = 8.0;
    const labelBottomPadding = 8.0;
    const labelHeight = 18.0;

    Widget placeholder() => const SizedBox.shrink();

    final buttons = <Widget>[
      _buildButton(context, '1', isDark: isDark, onTap: () => onNumberTap('1')),
      _buildButton(context, '2', isDark: isDark, onTap: () => onNumberTap('2')),
      _buildButton(context, '3', isDark: isDark, onTap: () => onNumberTap('3')),
      _buildButton(context, '4', isDark: isDark, onTap: () => onNumberTap('4')),
      _buildButton(context, '5', isDark: isDark, onTap: () => onNumberTap('5')),
      _buildButton(context, '6', isDark: isDark, onTap: () => onNumberTap('6')),
      _buildButton(context, '7', isDark: isDark, onTap: () => onNumberTap('7')),
      _buildButton(context, '8', isDark: isDark, onTap: () => onNumberTap('8')),
      _buildButton(context, '9', isDark: isDark, onTap: () => onNumberTap('9')),
      _buildButton(
        context,
        'C',
        isDark: isDark,
        color: AppColors.redSurface,
        textColor: AppColors.redText,
        onTap: onClear,
      ),
      _buildButton(context, '0', isDark: isDark, onTap: () => onNumberTap('0')),
      _buildButton(context, '⌫', isDark: isDark, onTap: onBackspace ?? onClear),
      if (allowDecimal)
        _buildButton(
          context,
          '.',
          isDark: isDark,
          onTap: () => onNumberTap('.'),
        )
      else
        placeholder(),
      _buildButton(
        context,
        '00',
        isDark: isDark,
        onTap: () => onNumberTap('00'),
      ),
      _buildButton(
        context,
        'Enter',
        isDark: isDark,
        color: AppColors.brand,
        textColor: AppColors.brandContrast,
        onTap: onEnter,
      ),
    ];

    return LayoutBuilder(
      builder: (context, constraints) {
        final width = constraints.maxWidth;

        final availableHeight = constraints.hasBoundedHeight
            ? constraints.maxHeight
            : (labelHeight +
                  labelBottomPadding +
                  (rowCount * 64) +
                  ((rowCount - 1) * spacing));

        final gridHeight =
            (availableHeight - (labelHeight + labelBottomPadding)).clamp(
              0.0,
              double.infinity,
            );
        final tileWidth =
            (width - ((crossAxisCount - 1) * spacing)) / crossAxisCount;
        final tileHeight = (gridHeight - ((rowCount - 1) * spacing)) / rowCount;
        final safeTileHeight = tileHeight.isFinite && tileHeight > 0
            ? tileHeight
            : 64.0;
        final safeTileWidth = tileWidth.isFinite && tileWidth > 0
            ? tileWidth
            : 96.0;
        final ratio = safeTileWidth / safeTileHeight;

        return SizedBox(
          height: availableHeight,
          child: Column(
            children: [
              SizedBox(
                height: labelHeight,
                child: Align(
                  alignment: Alignment.center,
                  child: Text(
                    label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                      color: isDark
                          ? AppColors.textSecondary
                          : AppColors.lightTextSecondary,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: labelBottomPadding),
              SizedBox(
                height: gridHeight,
                child: GridView.count(
                  crossAxisCount: crossAxisCount,
                  mainAxisSpacing: spacing,
                  crossAxisSpacing: spacing,
                  childAspectRatio: ratio,
                  physics: const NeverScrollableScrollPhysics(),
                  children: buttons,
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildButton(
    BuildContext context,
    String text, {
    required bool isDark,
    Color? color,
    Color? textColor,
    required VoidCallback onTap,
  }) {
    final defaultBg = isDark ? AppColors.surface2 : AppColors.lightSurface2;
    final defaultText = isDark
        ? AppColors.textPrimary
        : AppColors.lightTextPrimary;
    final borderColor = isDark
        ? AppColors.surfaceBorder
        : AppColors.lightSurfaceBorder;

    return Material(
      color: color ?? defaultBg,
      borderRadius: BorderRadius.circular(8),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: Container(
          decoration: BoxDecoration(
            border: Border.all(
              color: color != null ? Colors.transparent : borderColor,
            ),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Center(
            child: FittedBox(
              fit: BoxFit.scaleDown,
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                child: Text(
                  text,
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: textColor ?? defaultText,
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
