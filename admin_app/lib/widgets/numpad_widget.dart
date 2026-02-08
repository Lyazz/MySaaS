import 'package:flutter/material.dart';

class NumpadWidget extends StatelessWidget {
  final Function(String) onNumberTap;
  final VoidCallback onClear;
  final VoidCallback onEnter;
  final String label;

  const NumpadWidget({
    super.key,
    required this.onNumberTap,
    required this.onClear,
    required this.onEnter,
    this.label = 'Enter Quantity',
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Padding(
          padding: const EdgeInsets.only(bottom: 8.0),
          child: Text(
            label,
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
          ),
        ),
        GridView.count(
          shrinkWrap: true,
          crossAxisCount: 3,
          mainAxisSpacing: 8,
          crossAxisSpacing: 8,
          childAspectRatio: 1.5,
          physics: const NeverScrollableScrollPhysics(),
          children: [
            ...['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(
              (digit) => _buildButton(digit, onTap: () => onNumberTap(digit)),
            ),
            _buildButton(
              'C',
              color: Colors.red[50],
              textColor: Colors.red,
              onTap: onClear,
            ),
            _buildButton('0', onTap: () => onNumberTap('0')),
            _buildButton(
              'Enter',
              color: Colors.teal,
              textColor: Colors.white,
              onTap: onEnter,
            ),
          ],
        ),
      ],
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
    );
  }
}
