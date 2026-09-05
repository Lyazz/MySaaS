class DeliveryCredentialField {
  final String key;
  final String label;
  final bool required;
  final bool secret;

  const DeliveryCredentialField({
    required this.key,
    required this.label,
    required this.required,
    required this.secret,
  });

  factory DeliveryCredentialField.fromJson(Map<String, dynamic> json) {
    return DeliveryCredentialField(
      key: json['key']?.toString() ?? '',
      label: json['label']?.toString() ?? '',
      required: json['required'] == true,
      secret: json['secret'] == true,
    );
  }
}

class DeliveryAccount {
  final bool isActive;
  final Map<String, dynamic> config;

  /// `true` per key means a secret value is stored server-side; the real
  /// value is never sent back to the client.
  final Map<String, bool> secrets;

  const DeliveryAccount({
    required this.isActive,
    this.config = const {},
    this.secrets = const {},
  });

  factory DeliveryAccount.fromJson(Map<String, dynamic> json) {
    final config = json['config'];
    final secrets = json['secrets'];
    return DeliveryAccount(
      isActive: json['isActive'] == true,
      config: config is Map ? Map<String, dynamic>.from(config) : const {},
      secrets: secrets is Map
          ? secrets.map((k, v) => MapEntry(k.toString(), v == true))
          : const {},
    );
  }
}

class DeliveryProvider {
  final String id;
  final String name;
  final String? description;
  final bool offered;
  final List<DeliveryCredentialField> credentialFields;
  final DeliveryAccount? account;

  DeliveryProvider({
    required this.id,
    required this.name,
    this.description,
    this.offered = false,
    this.credentialFields = const [],
    this.account,
  });

  bool get isActive => account?.isActive ?? false;

  factory DeliveryProvider.fromMap(Map<String, dynamic> map) {
    return DeliveryProvider(
      id: map['id']?.toString() ?? '',
      name: map['name']?.toString() ?? '',
      description: map['description']?.toString(),
      offered: map['offered'] == 1 || map['offered'] == true,
      credentialFields: const [],
      account: (map['isEnabled'] == 1 || map['isEnabled'] == true)
          ? const DeliveryAccount(isActive: true)
          : null,
    );
  }

  DeliveryProvider copyWith({
    bool? offered,
    List<DeliveryCredentialField>? credentialFields,
    DeliveryAccount? account,
    bool clearAccount = false,
  }) {
    return DeliveryProvider(
      id: id,
      name: name,
      description: description,
      offered: offered ?? this.offered,
      credentialFields: credentialFields ?? this.credentialFields,
      account: clearAccount ? null : (account ?? this.account),
    );
  }
}
