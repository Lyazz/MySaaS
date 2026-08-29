import 'package:uuid/uuid.dart';

class ReceiptLayout {
  final String id;
  final String name;

  // Header
  final bool showLogo;
  final String? cachedLogoUrl;
  final bool showStoreName;
  final String? storeNameOverride;
  final bool showStoreAddress;
  final String? storeAddressOverride;
  final bool showStorePhone;
  final String? storePhoneOverride;
  final bool showStoreEmail;
  final String? storeEmailOverride;

  // Keep legacy for backward compatibility, mapped to custom message
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

  const ReceiptLayout({
    required this.id,
    required this.name,
    this.showLogo = true,
    this.cachedLogoUrl,
    this.showStoreName = true,
    this.storeNameOverride,
    this.showStoreAddress = false,
    this.storeAddressOverride,
    this.showStorePhone = false,
    this.storePhoneOverride,
    this.showStoreEmail = false,
    this.storeEmailOverride,
    this.showHeader = true,
    this.headerText = '',
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
      'cachedLogoUrl': cachedLogoUrl,
      'showStoreName': showStoreName,
      'storeNameOverride': storeNameOverride,
      'showStoreAddress': showStoreAddress,
      'storeAddressOverride': storeAddressOverride,
      'showStorePhone': showStorePhone,
      'storePhoneOverride': storePhoneOverride,
      'showStoreEmail': showStoreEmail,
      'storeEmailOverride': storeEmailOverride,
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
      showLogo: map['showLogo'] == 1 || map['showLogo'] == true,
      cachedLogoUrl: map['cachedLogoUrl'],
      showStoreName:
          map['showStoreName'] == 1 ||
          map['showStoreName'] == true ||
          map['showStoreName'] == null,
      storeNameOverride: map['storeNameOverride'],
      showStoreAddress:
          map['showStoreAddress'] == 1 || map['showStoreAddress'] == true,
      storeAddressOverride: map['storeAddressOverride'],
      showStorePhone:
          map['showStorePhone'] == 1 || map['showStorePhone'] == true,
      storePhoneOverride: map['storePhoneOverride'],
      showStoreEmail:
          map['showStoreEmail'] == 1 || map['showStoreEmail'] == true,
      storeEmailOverride: map['storeEmailOverride'],
      showHeader: map['showHeader'] == 1 || map['showHeader'] == true,
      headerText: map['headerText'] ?? '',
      showDate: map['showDate'] == 1 || map['showDate'] == true,
      showOrderNumber:
          map['showOrderNumber'] == 1 || map['showOrderNumber'] == true,
      showCustomerInfo:
          map['showCustomerInfo'] == 1 || map['showCustomerInfo'] == true,
      showFooter: map['showFooter'] == 1 || map['showFooter'] == true,
      footerText: map['footerText'] ?? '',
      showTaxBreakdown:
          map['showTaxBreakdown'] == 1 || map['showTaxBreakdown'] == true,
    );
  }

  ReceiptLayout copyWith({
    String? id,
    String? name,
    bool? showLogo,
    String? cachedLogoUrl,
    bool? showStoreName,
    String? storeNameOverride,
    bool? showStoreAddress,
    String? storeAddressOverride,
    bool? showStorePhone,
    String? storePhoneOverride,
    bool? showStoreEmail,
    String? storeEmailOverride,
    bool? showHeader,
    String? headerText,
    bool? showDate,
    bool? showOrderNumber,
    bool? showCustomerInfo,
    bool? showFooter,
    String? footerText,
    bool? showTaxBreakdown,
  }) {
    return ReceiptLayout(
      id: id ?? this.id,
      name: name ?? this.name,
      showLogo: showLogo ?? this.showLogo,
      cachedLogoUrl: cachedLogoUrl ?? this.cachedLogoUrl,
      showStoreName: showStoreName ?? this.showStoreName,
      storeNameOverride: storeNameOverride ?? this.storeNameOverride,
      showStoreAddress: showStoreAddress ?? this.showStoreAddress,
      storeAddressOverride: storeAddressOverride ?? this.storeAddressOverride,
      showStorePhone: showStorePhone ?? this.showStorePhone,
      storePhoneOverride: storePhoneOverride ?? this.storePhoneOverride,
      showStoreEmail: showStoreEmail ?? this.showStoreEmail,
      storeEmailOverride: storeEmailOverride ?? this.storeEmailOverride,
      showHeader: showHeader ?? this.showHeader,
      headerText: headerText ?? this.headerText,
      showDate: showDate ?? this.showDate,
      showOrderNumber: showOrderNumber ?? this.showOrderNumber,
      showCustomerInfo: showCustomerInfo ?? this.showCustomerInfo,
      showFooter: showFooter ?? this.showFooter,
      footerText: footerText ?? this.footerText,
      showTaxBreakdown: showTaxBreakdown ?? this.showTaxBreakdown,
    );
  }
}
