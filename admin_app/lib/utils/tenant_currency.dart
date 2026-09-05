import 'package:intl/intl.dart';
import 'package:intl/number_symbols.dart';
import 'package:intl/number_symbols_data.dart';

import '../models/store_settings.dart';

bool _dzdInitialized = false;
bool _eurInitialized = false;

void _initCustomDZD() {
  if (_dzdInitialized) return;
  numberFormatSymbols['custom_DZD'] = const NumberSymbols(
    NAME: 'custom_DZD',
    DECIMAL_SEP: '.',
    GROUP_SEP: ' ',
    PERCENT: '%',
    ZERO_DIGIT: '0',
    PLUS_SIGN: '+',
    MINUS_SIGN: '-',
    EXP_SYMBOL: 'E',
    PERMILL: '\u2030',
    INFINITY: '\u221E',
    NAN: 'NaN',
    DECIMAL_PATTERN: '#,##0.###',
    SCIENTIFIC_PATTERN: '#E0',
    PERCENT_PATTERN: '#,##0%',
    CURRENCY_PATTERN: '#,##0.00 \u00A4',
    DEF_CURRENCY_CODE: 'DZD',
  );
  _dzdInitialized = true;
}

void _initCustomEUR() {
  if (_eurInitialized) return;
  numberFormatSymbols['custom_EUR'] = const NumberSymbols(
    NAME: 'custom_EUR',
    DECIMAL_SEP: ',',
    GROUP_SEP: '.',
    PERCENT: '%',
    ZERO_DIGIT: '0',
    PLUS_SIGN: '+',
    MINUS_SIGN: '-',
    EXP_SYMBOL: 'E',
    PERMILL: '\u2030',
    INFINITY: '\u221E',
    NAN: 'NaN',
    DECIMAL_PATTERN: '#,##0.###',
    SCIENTIFIC_PATTERN: '#E0',
    PERCENT_PATTERN: '#,##0%',
    CURRENCY_PATTERN:
        '#,##0.00 \u00A4', // \u00A4 is the currency sign placeholder at the end
    DEF_CURRENCY_CODE: 'EUR',
  );
  _eurInitialized = true;
}

String tenantCurrencyCode(StoreSettings settings) {
  final value = settings.currencyCode.trim();
  return value.isEmpty ? 'DZD' : value;
}

String tenantCurrencyCountry(StoreSettings settings) {
  final value = settings.currencyCountry.trim();
  return value.isEmpty ? 'DZ' : value;
}

NumberFormat tenantCurrencyFormatter(StoreSettings settings) {
  final code = tenantCurrencyCode(settings);
  if (code.toUpperCase() == 'DZD') {
    _initCustomDZD();
    return NumberFormat.currency(locale: 'custom_DZD', name: 'DZD');
  } else if (code.toUpperCase() == 'EUR') {
    _initCustomEUR();
    return NumberFormat.currency(
      locale: 'custom_EUR',
      name: 'EUR',
      symbol: '€',
    );
  } else {
    final country = tenantCurrencyCountry(settings);
    return NumberFormat.simpleCurrency(name: code, locale: 'en_$country');
  }
}
