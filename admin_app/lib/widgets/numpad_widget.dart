import 'package:flutter/material.dart';

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
    const crossAxisCount = 3;
    const rowCount = 5;
    const spacing = 8.0;
    const labelBottomPadding = 8.0;
    const labelHeight = 18.0;

    Widget placeholder() => const SizedBox.shrink();

    // Fixed 5x3 layout (15 slots) so it always fits without scrolling.
    final buttons = <Widget>[
      _buildButton('1', onTap: () => onNumberTap('1')),
      _buildButton('2', onTap: () => onNumberTap('2')),
      _buildButton('3', onTap: () => onNumberTap('3')),
      _buildButton('4', onTap: () => onNumberTap('4')),
      _buildButton('5', onTap: () => onNumberTap('5')),
      _buildButton('6', onTap: () => onNumberTap('6')),
      _buildButton('7', onTap: () => onNumberTap('7')),
      _buildButton('8', onTap: () => onNumberTap('8')),
      _buildButton('9', onTap: () => onNumberTap('9')),
      _buildButton(
        'C',
        color: Colors.red[50],
        textColor: Colors.red,
        onTap: onClear,
      ),
      _buildButton('0', onTap: () => onNumberTap('0')),
      _buildButton(
        '⌫',
        color: Colors.grey[200],
        textColor: Colors.black87,
        onTap: onBackspace ?? onClear,
      ),
      if (allowDecimal)
        _buildButton('.', onTap: () => onNumberTap('.'))
      else
        placeholder(),
      _buildButton('00', onTap: () => onNumberTap('00')),
      _buildButton(
        'Enter',
        color: Colors.teal,
        textColor: Colors.white,
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
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
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
    String text, {
    Color? color,
    Color? textColor,
    required VoidCallback onTap,
  }) {
    return Material(
      color: color ?? Colors.grey[100],
      borderRadius: BorderRadius.circular(8),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
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
                  color: textColor ?? Colors.black87,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
