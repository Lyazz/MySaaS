import 'package:intl/intl.dart';
import 'package:intl/number_symbols.dart';
import 'package:intl/number_symbols_data.dart';

void main() {
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
  
  final format = NumberFormat.currency(locale: 'custom_DZD', name: 'DZD');
  print(format.format(129000.00));
}
