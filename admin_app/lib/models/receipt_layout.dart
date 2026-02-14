import 'package:uuid/uuid.dart';

class ReceiptLayout {
  final String id;
  final String name;

  // Header
  final bool showLogo;
  final bool showHeader;
  final String headerText;

  // content
  final bool showDate;
  final bool showOrderNumber;
  final bool showCustomerInfo;

  // Footer
  final bool showFooter;
  final String footerText;
  final bool showTaxBreakdown;

  // Paper Settings (override profile if needed, or just layout specific?)
  // Keeping it simple for now, sticking to content.

  const ReceiptLayout({
    required this.id,
    required this.name,
    this.showLogo = true,
    this.showHeader = true,
    this.headerText = 'MySaaS Store',
    this.showDate = true,
    this.showOrderNumber = true,
    this.showCustomerInfo = true,
    this.showFooter = true,
    this.footerText = 'Thank you for your purchase!',
    this.showTaxBreakdown = true,
  });

  factory ReceiptLayout.standard() {
    return const ReceiptLayout(id: 'standard', name: 'Standard Layout');
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'name': name,
      'showLogo': showLogo,
      'showHeader': showHeader,
      'headerText': headerText,
      'showDate': showDate,
      'showOrderNumber': showOrderNumber,
      'showCustomerInfo': showCustomerInfo,
      'showFooter': showFooter,
      'footerText': footerText,
      'showTaxBreakdown': showTaxBreakdown,
    };
  }

  factory ReceiptLayout.fromMap(Map<String, dynamic> map) {
    return ReceiptLayout(
      id: map['id'] ?? const Uuid().v4(),
      name: map['name'] ?? 'Custom Layout',
      showLogo: map['showLogo'] ?? true,
      showHeader: map['showHeader'] ?? true,
      headerText: map['headerText'] ?? '',
      showDate: map['showDate'] ?? true,
      showOrderNumber: map['showOrderNumber'] ?? true,
      showCustomerInfo: map['showCustomerInfo'] ?? true,
      showFooter: map['showFooter'] ?? true,
      footerText: map['footerText'] ?? '',
      showTaxBreakdown: map['showTaxBreakdown'] ?? true,
    );
  }
}
