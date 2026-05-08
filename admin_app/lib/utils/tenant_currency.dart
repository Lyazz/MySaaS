import 'package:intl/intl.dart';

import '../models/store_settings.dart';

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
  final country = tenantCurrencyCountry(settings);
  return NumberFormat.simpleCurrency(name: code, locale: 'en_$country');
}
