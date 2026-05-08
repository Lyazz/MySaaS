import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../theme/app_theme.dart';

class SmartCashSuggestions extends StatelessWidget {
  final double total;
  final ValueChanged<double> onAmountSelected;
  final NumberFormat currency;

  const SmartCashSuggestions({
    super.key,
    required this.total,
    required this.onAmountSelected,
    required this.currency,
  });

  List<double> _getSuggestions() {
    final suggestions = <double>{};
    // Always suggest exact amount first
    suggestions.add(total);

    // Check if currency is DZD (Algerian Dinar)
    // locale might be 'ar_DZ' or symbol 'DA' or 'DZD'
    final isDZD =
        currency.currencySymbol == 'DA' ||
        currency.currencySymbol == 'DZD' ||
        currency.locale.contains('DZ');

    if (isDZD) {
      // DZD Denominations: 200, 500, 1000, 2000.
      _addDzSuggestion(suggestions, 200);
      _addDzSuggestion(suggestions, 500);
      _addDzSuggestion(suggestions, 1000);
      _addDzSuggestion(suggestions, 2000);
    } else {
      // Standard "Classical" Currency Suggestions (e.g., USD, EUR)
      // Suggest next 1, 5, 10, 20, 50, 100 units based on magnitude
      _addStandardSuggestions(suggestions);
    }

    final sorted = suggestions.toList()..sort();
    return sorted.take(4).toList();
  }

  void _addDzSuggestion(Set<double> suggestions, double denomination) {
    if (total % denomination != 0) {
      final next = (total / denomination).ceil() * denomination;
      if (next > total) suggestions.add(next);
    }
  }

  void _addStandardSuggestions(Set<double> suggestions) {
    // Determine magnitude (power of 10)
    double magnitude = 1.0;
    while (magnitude <= total) {
      magnitude *= 10;
    }
    magnitude /= 10; // e.g., if total is 12.50, magnitude is 10.

    // If total is small < 10, magnitude is 1.
    if (magnitude < 1) magnitude = 1;

    // Suggest next multiples of typical bill values at this magnitude
    // e.g. for 12.50 (mag 10): next 20, 50, 100
    // e.g. for 125 (mag 100): next 200, 500, 1000

    final denominations = [1.0, 2.0, 5.0, 10.0, 20.0, 50.0, 100.0];

    for (final d in denominations) {
      final val = d * magnitude;
      if (val > total) {
        suggestions.add(val);
      } else {
        // Also try next multiple if val is smaller than total but same scale
        // e.g. total 45, val 20 -> next is 60? No, bills are fixed.
        // We want "Cash strings" like "I give you a 50".
        // So we just add the bill value itself? No, total + bill?
        // No, usually it's "Pay with 50 bill" for a 45 charge.
      }

      // Also checking 5*magnitude, 10*magnitude relative to total
      // Simpler approach:
      // Loop through common bill sizes scaled to magnitude
      // Check if (Bill > Total).
    }

    // Fallback: simple power of 10 logic like 10, 20, 50, 100
    final bases = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
    for (final base in bases) {
      if (base > total) {
        suggestions.add(base.toDouble());
        if (suggestions.length >= 5) break; // Limit
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final suggestions = _getSuggestions();
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: suggestions.map((amount) {
        final isExact = (amount - total).abs() < 0.01;
        return ActionChip(
          label: Text(
            isExact ? 'Exact' : currency.format(amount),
            style: TextStyle(
              fontWeight: isExact ? FontWeight.bold : FontWeight.w600,
              color: isExact ? AppColors.brandContrast : (isDark ? AppColors.textPrimary : const Color(0xFF0F172A)),
            ),
          ),
          backgroundColor: isExact
              ? AppColors.brand
              : (isDark ? AppColors.surface2 : Colors.white),
          side: isExact
              ? BorderSide.none
              : BorderSide(color: isDark ? AppColors.surfaceBorder : const Color(0xFFE2E8F0)),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
          ),
          onPressed: () => onAmountSelected(amount),
        );
      }).toList(),
    );
  }
}
