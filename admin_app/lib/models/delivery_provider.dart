class DeliveryProvider {
  final String id;
  final String name;
  final String? description; // Changed to nullable
  final bool isEnabled;

  DeliveryProvider({
    required this.id,
    required this.name,
    this.description, // Changed to optional
    this.isEnabled = true, // Changed default value
  });

  factory DeliveryProvider.fromMap(Map<String, dynamic> map) {
    return DeliveryProvider(
      id: map['id']?.toString() ?? '',
      name: map['name']?.toString() ?? '',
      description: map['description']?.toString(),
      isEnabled: map['isEnabled'] == 1 || map['isEnabled'] == true,
    );
  }

  DeliveryProvider copyWith({bool? isEnabled}) {
    return DeliveryProvider(
      id: id,
      name: name,
      description: description,
      isEnabled: isEnabled ?? this.isEnabled,
    );
  }
}
