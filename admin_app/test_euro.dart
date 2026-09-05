import 'package:intl/intl.dart';

void main() {
  print(NumberFormat.simpleCurrency(name: 'EUR', locale: 'en_US').format(129000.00));
  print(NumberFormat.simpleCurrency(name: 'EUR', locale: 'en_FR').format(129000.00));
  print(NumberFormat.simpleCurrency(name: 'EUR', locale: 'fr_FR').format(129000.00));
}
