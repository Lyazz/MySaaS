class DeliveryProvider {
  final String id;
  final String name;
  final String? description;
  final bool offered;
  final bool isEnabled;

  DeliveryProvider({
    required this.id,
    required this.name,
    this.description,
    this.offered = false,
    this.isEnabled = true,
  });

  factory DeliveryProvider.fromMap(Map<String, dynamic> map) {
    return DeliveryProvider(
      id: map['id']?.toString() ?? '',
      name: map['name']?.toString() ?? '',
      description: map['description']?.toString(),
      offered: map['offered'] == 1 || map['offered'] == true,
      isEnabled: map['isEnabled'] == 1 || map['isEnabled'] == true,
    );
  }

  DeliveryProvider copyWith({bool? offered, bool? isEnabled}) {
    return DeliveryProvider(
      id: id,
      name: name,
      description: description,
      offered: offered ?? this.offered,
      isEnabled: isEnabled ?? this.isEnabled,
    );
  }
}
